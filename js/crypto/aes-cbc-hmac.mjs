import {
  CBC_TAG, CBC_LEGACY_TAG, MAX_CBC_CIPHERTEXT_BYTES, assertMessageSize, b64, concat, decodeToken,
  decoder, encoder, normalizeKey, requireCrypto, subtle, KDF_ITERATIONS
} from './shared.mjs';

const CBC2_ENCRYPTION_INFO = encoder.encode('Hex Watch Cipher CBC2 AES-256-CBC key v1');
const CBC2_AUTHENTICATION_INFO = encoder.encode('Hex Watch Cipher CBC2 HMAC-SHA-256 key v1');

async function deriveLegacyCbcKeys(password, salt) {
  const base = await subtle.importKey('raw', normalizeKey(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: KDF_ITERATIONS },
    base,
    512
  ));
  return Promise.all([
    subtle.importKey('raw', bits.slice(0, 32), 'AES-CBC', false, ['encrypt', 'decrypt']),
    subtle.importKey('raw', bits.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  ]);
}

async function deriveCbc2Keys(password, salt) {
  const base = await subtle.importKey('raw', normalizeKey(password), 'PBKDF2', false, ['deriveBits']);
  const master = new Uint8Array(await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: KDF_ITERATIONS },
    base,
    256
  ));
  const hkdfKey = await subtle.importKey('raw', master, 'HKDF', false, ['deriveKey']);
  master.fill(0);
  return Promise.all([
    subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: CBC2_ENCRYPTION_INFO },
      hkdfKey,
      { name: 'AES-CBC', length: 256 },
      false,
      ['encrypt', 'decrypt']
    ),
    subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: CBC2_AUTHENTICATION_INFO },
      hkdfKey,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      false,
      ['sign', 'verify']
    )
  ]);
}

export async function encryptCbcHmac(text, password) {
  requireCrypto();
  assertMessageSize(text);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const [encryptionKey, macKey] = await deriveCbc2Keys(password, salt);
  const ciphertext = new Uint8Array(await subtle.encrypt(
    { name: 'AES-CBC', iv },
    encryptionKey,
    encoder.encode(text)
  ));
  const body = concat(salt, iv, ciphertext);
  const tag = new Uint8Array(await subtle.sign('HMAC', macKey, concat(encoder.encode(CBC_TAG), body)));
  return CBC_TAG + b64(concat(body, tag));
}

export async function decryptCbcHmac(token, password) {
  requireCrypto();
  const legacy = token.startsWith(CBC_LEGACY_TAG);
  const formatTag = legacy ? CBC_LEGACY_TAG : CBC_TAG;
  const raw = decodeToken(token, formatTag, 64 + MAX_CBC_CIPHERTEXT_BYTES);
  if (raw.length < 80 || (raw.length - 96) % 16 !== 0) throw new Error('format');
  const body = raw.slice(0, -32);
  const tag = raw.slice(-32);
  const [encryptionKey, macKey] = await (legacy ? deriveLegacyCbcKeys : deriveCbc2Keys)(
    password,
    raw.slice(0, 16)
  );
  let authenticated;
  try {
    authenticated = await subtle.verify('HMAC', macKey, tag, concat(encoder.encode(formatTag), body));
  } catch {
    throw new Error('auth');
  }
  if (!authenticated) {
    throw new Error('auth');
  }
  let plaintext;
  try {
    plaintext = decoder.decode(await subtle.decrypt(
      { name: 'AES-CBC', iv: raw.slice(16, 32) },
      encryptionKey,
      raw.slice(32, -32)
    ));
  } catch {
    throw new Error('auth');
  }
  assertMessageSize(plaintext);
  return plaintext;
}
