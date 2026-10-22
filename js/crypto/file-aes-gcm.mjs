import {
  decodeToken, encoder, normalizeKey, requireCrypto, subtle, KDF_ITERATIONS,
  STRONG_KDF_ITERATIONS, b64
} from './shared.mjs';
import { deriveArgon2idKey, LEGACY_ARGON2ID_PARAMETERS } from './argon2id.mjs';

export const FILE_TAG = 'HWF4.';
export const LEGACY_FILE_V3_TAG = 'HWF3.';
export const LEGACY_FILE_TAG = 'HWF2.';
export const OLDEST_FILE_TAG = 'HWF1.';
export const LEGACY_MAX_FILE_BYTES = 1_048_576;
export const LEGACY_MAX_FILE_TOKEN_CHARS = 1_400_000;
export const MAX_FILE_BYTES = 1_073_741_824;
export const FILE_CHUNK_BYTES = 4_194_304;
export const FILE_HEADER_BYTES = 36;
export const FILE_TAG_BYTES = 16;
export const FILE_MAGIC = encoder.encode('HWF5');
export const LEGACY_FILE_V4_MAGIC = encoder.encode('HWF4');
export const LEGACY_FILE_V3_MAGIC = encoder.encode('HWF3');
export const LEGACY_FILE_MAGIC = encoder.encode('HWF2');
export const MAX_FILE_CHUNKS = Math.ceil(MAX_FILE_BYTES / FILE_CHUNK_BYTES);
export const MAX_ENCRYPTED_FILE_BYTES =
  FILE_HEADER_BYTES + MAX_FILE_BYTES + MAX_FILE_CHUNKS * FILE_TAG_BYTES;

const LEGACY_VERSION = 1;
const LEGACY_HEADER_BYTES = 29;
const LEGACY_TAG_BYTES = 16;
const LEGACY_FILE_TOKEN_AAD = encoder.encode('HWF1:1');
const FILE_TOKEN_AAD = encoder.encode('HWF2:1');
const LEGACY_ARGON_FILE_TOKEN_AAD = encoder.encode('HWF3:1');
const ARGON_FILE_TOKEN_AAD = encoder.encode('HWF4:1');

async function deriveFileKey(password, salt, iterations = KDF_ITERATIONS) {
  const base = await subtle.importKey('raw', normalizeKey(password), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function getChunkCount(size) {
  return Math.max(1, Math.ceil(size / FILE_CHUNK_BYTES));
}

function makeNonce(prefix, index) {
  const nonce = new Uint8Array(12);
  nonce.set(prefix);
  new DataView(nonce.buffer).setUint32(8, index, false);
  return nonce;
}

function makeChunkAad(header, index) {
  const aad = new Uint8Array(header.length + 4);
  aad.set(header);
  new DataView(aad.buffer).setUint32(header.length, index, false);
  return aad;
}

function createHeader(size, salt, noncePrefix) {
  const header = new Uint8Array(FILE_HEADER_BYTES);
  header.set(FILE_MAGIC, 0);
  header.set(salt, 4);
  header.set(noncePrefix, 20);
  new DataView(header.buffer).setBigUint64(28, BigInt(size), false);
  return header;
}

export async function encryptFileStream(file, password, writeChunk, onProgress = () => {}) {
  requireCrypto();
  if (!(file instanceof Blob) || typeof writeChunk !== 'function') throw new Error('format');
  if (!Number.isSafeInteger(file.size) || file.size > MAX_FILE_BYTES) throw new Error('filetoolarge');

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const noncePrefix = globalThis.crypto.getRandomValues(new Uint8Array(8));
  const header = createHeader(file.size, salt, noncePrefix);
  const key = await subtle.importKey(
    'raw',
    await deriveArgon2idKey(password, salt),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const chunkCount = getChunkCount(file.size);
  await writeChunk(header);
  onProgress(0, file.size);

  for (let index = 0, offset = 0; index < chunkCount; index++) {
    const chunkSize = Math.min(FILE_CHUNK_BYTES, file.size - offset);
    const plaintext = new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer());
    if (plaintext.length !== chunkSize) throw new Error('fileio');
    const encrypted = new Uint8Array(await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: makeNonce(noncePrefix, index),
        additionalData: makeChunkAad(header, index)
      },
      key,
      plaintext
    ));
    await writeChunk(encrypted);
    offset += chunkSize;
    onProgress(offset, file.size);
  }
}

export async function decryptFileStream(file, password, writeChunk, onProgress = () => {}) {
  requireCrypto();
  if (!(file instanceof Blob) || typeof writeChunk !== 'function') throw new Error('format');
  if (!Number.isSafeInteger(file.size) || file.size < FILE_HEADER_BYTES + FILE_TAG_BYTES ||
      file.size > MAX_ENCRYPTED_FILE_BYTES) throw new Error('format');

  const header = new Uint8Array(await file.slice(0, FILE_HEADER_BYTES).arrayBuffer());
  const isCurrentFormat = FILE_MAGIC.every((byte, index) => header[index] === byte);
  const isLegacyV4Format = LEGACY_FILE_V4_MAGIC.every((byte, index) => header[index] === byte);
  const isLegacyV3Format = LEGACY_FILE_V3_MAGIC.every((byte, index) => header[index] === byte);
  const isLegacyFormat = LEGACY_FILE_MAGIC.every((byte, index) => header[index] === byte);
  if (header.length !== FILE_HEADER_BYTES ||
      (!isCurrentFormat && !isLegacyV4Format && !isLegacyV3Format && !isLegacyFormat)) {
    throw new Error('format');
  }
  const dataView = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const bigintSize = dataView.getBigUint64(28, false);
  if (bigintSize > BigInt(MAX_FILE_BYTES)) throw new Error('filetoolarge');
  const plaintextSize = Number(bigintSize);
  const chunkCount = getChunkCount(plaintextSize);
  const expectedSize = FILE_HEADER_BYTES + plaintextSize + chunkCount * FILE_TAG_BYTES;
  if (file.size !== expectedSize) throw new Error('format');

  const salt = header.slice(4, 20);
  const noncePrefix = header.slice(20, 28);
  const key = isCurrentFormat || isLegacyV4Format
    ? await subtle.importKey(
      'raw',
      await deriveArgon2idKey(
        password,
        salt,
        32,
        isLegacyV4Format ? LEGACY_ARGON2ID_PARAMETERS : undefined
      ),
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )
    : await deriveFileKey(
      password,
      salt,
      isLegacyV3Format ? STRONG_KDF_ITERATIONS : KDF_ITERATIONS
    );
  onProgress(0, plaintextSize);

  for (let index = 0, offset = 0; index < chunkCount; index++) {
    const plaintextLength = Math.min(FILE_CHUNK_BYTES, plaintextSize - offset);
    const encryptedLength = plaintextLength + FILE_TAG_BYTES;
    const start = FILE_HEADER_BYTES + offset + index * FILE_TAG_BYTES;
    const ciphertext = new Uint8Array(await file.slice(start, start + encryptedLength).arrayBuffer());
    let plaintext;
    try {
      plaintext = new Uint8Array(await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: makeNonce(noncePrefix, index),
          additionalData: makeChunkAad(header, index)
        },
        key,
        ciphertext
      ));
    } catch {
      throw new Error('auth');
    }
    if (plaintext.length !== plaintextLength) throw new Error('auth');
    await writeChunk(plaintext);
    offset += plaintextLength;
    onProgress(offset, plaintextSize);
  }
}

export async function encryptFileBytes(bytes, password) {
  requireCrypto();
  if (!(bytes instanceof Uint8Array)) throw new Error('format');
  if (bytes.length > LEGACY_MAX_FILE_BYTES) throw new Error('filetoolarge');
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: ARGON_FILE_TOKEN_AAD },
    await subtle.importKey(
      'raw',
      await deriveArgon2idKey(password, salt),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    ),
    bytes
  ));
  const payload = new Uint8Array(LEGACY_HEADER_BYTES + ciphertext.length);
  payload[0] = LEGACY_VERSION;
  payload.set(salt, 1);
  payload.set(iv, 17);
  payload.set(ciphertext, LEGACY_HEADER_BYTES);
  const token = FILE_TAG + b64(payload);
  if (token.length > LEGACY_MAX_FILE_TOKEN_CHARS) throw new Error('filetoolarge');
  return token;
}

export async function decryptFileToken(token, password) {
  requireCrypto();
  if (typeof token !== 'string') throw new Error('format');
  const isCurrentFormat = token.startsWith(FILE_TAG);
  const isLegacyV3Format = !isCurrentFormat && token.startsWith(LEGACY_FILE_V3_TAG);
  const isLegacyV2Format = !isCurrentFormat && !isLegacyV3Format &&
    token.startsWith(LEGACY_FILE_TAG);
  const tag = isCurrentFormat
    ? FILE_TAG
    : isLegacyV3Format ? LEGACY_FILE_V3_TAG
      : isLegacyV2Format ? LEGACY_FILE_TAG : OLDEST_FILE_TAG;
  const raw = decodeToken(
    token,
    tag,
    LEGACY_HEADER_BYTES + LEGACY_MAX_FILE_BYTES + LEGACY_TAG_BYTES,
    LEGACY_MAX_FILE_TOKEN_CHARS
  );
  if (raw.length < LEGACY_HEADER_BYTES + LEGACY_TAG_BYTES || raw[0] !== LEGACY_VERSION) {
    throw new Error('format');
  }
  const key = isCurrentFormat || isLegacyV3Format
    ? await subtle.importKey(
      'raw',
      await deriveArgon2idKey(
        password,
        raw.slice(1, 17),
        32,
        isLegacyV3Format ? LEGACY_ARGON2ID_PARAMETERS : undefined
      ),
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )
    : await deriveFileKey(
      password,
      raw.slice(1, 17),
      isLegacyV2Format ? STRONG_KDF_ITERATIONS : KDF_ITERATIONS
    );
  const additionalData = isCurrentFormat
    ? ARGON_FILE_TOKEN_AAD
    : isLegacyV3Format
      ? LEGACY_ARGON_FILE_TOKEN_AAD
      : isLegacyV2Format ? FILE_TOKEN_AAD : LEGACY_FILE_TOKEN_AAD;
  let plaintext;
  try {
    plaintext = new Uint8Array(await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: raw.slice(17, 29),
        additionalData
      },
      key,
      raw.slice(LEGACY_HEADER_BYTES)
    ));
  } catch {
    throw new Error('auth');
  }
  if (plaintext.length > LEGACY_MAX_FILE_BYTES) throw new Error('filetoolarge');
  return plaintext;
}
