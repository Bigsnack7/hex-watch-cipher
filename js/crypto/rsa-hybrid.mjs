import {
  MAX_AES_CIPHERTEXT_BYTES, MAX_RSA_WRAPPED_BYTES, RSA_DIRECT_TAG, RSA_TAG,
  assertMessageSize, b64, concat, decodeToken, decoder, encoder, requireCrypto, subtle
} from './shared.mjs';
import { readPem, writePem } from './pem.mjs';

async function importRsaKey(text, format, label, usage, extractable = false) {
  requireCrypto();
  let key;
  try {
    key = await subtle.importKey(
      format,
      readPem(text, label),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      extractable,
      [usage]
    );
  } catch (error) {
    if (error.message === 'keytoolarge') throw error;
    throw new Error('keyformat');
  }
  if (key.algorithm.modulusLength < 2048) throw new Error('keyweak');
  if (key.algorithm.modulusLength > 8192) throw new Error('keylarge');
  return key;
}

export async function generateRsaKeyPair({ exportable = false, modulusLength = 2048 } = {}) {
  requireCrypto();
  if (![2048, 3072, 4096].includes(modulusLength)) throw new Error('keysize');
  const pair = await subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    exportable,
    ['encrypt', 'decrypt']
  );
  const generatedAt = new Date().toISOString();
  return {
    publicKey: writePem(await subtle.exportKey('spki', pair.publicKey), 'PUBLIC KEY'),
    privateKey: pair.privateKey,
    privatePem: exportable ? writePem(await subtle.exportKey('pkcs8', pair.privateKey), 'PRIVATE KEY') : null,
    generatedAt
  };
}

export async function fingerprintRsaPublicKey(pem) {
  requireCrypto();
  const publicKey = await importRsaKey(pem, 'spki', 'PUBLIC KEY', 'encrypt', true);
  const canonicalSpki = await subtle.exportKey('spki', publicKey);
  const digest = new Uint8Array(await subtle.digest('SHA-256', canonicalSpki));
  const hex = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return hex.match(/.{1,4}/g).join(' ');
}

function rsaOaepMaxPlaintextBytes(key) {
  if (!key || key.algorithm?.name !== 'RSA-OAEP' || key.algorithm.hash?.name !== 'SHA-256') {
    throw new Error('keyformat');
  }
  return key.algorithm.modulusLength / 8 - 2 * 32 - 2;
}

function validateRsaPrivateKey(key) {
  rsaOaepMaxPlaintextBytes(key);
  if (key.type !== 'private' || key.algorithm.modulusLength < 2048 ||
      key.algorithm.modulusLength > 8192 || !key.usages.includes('decrypt')) {
    throw new Error(key.algorithm.modulusLength < 2048 ? 'keyweak' : 'keyformat');
  }
  return key;
}

export async function encryptRsaDirect(text, pem) {
  requireCrypto();
  const publicKey = await importRsaKey(pem, 'spki', 'PUBLIC KEY', 'encrypt');
  const plaintext = encoder.encode(text);
  if (plaintext.length > rsaOaepMaxPlaintextBytes(publicKey)) throw new Error('rsasizelimit');
  const ciphertext = new Uint8Array(await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, plaintext));
  if (ciphertext.length > MAX_RSA_WRAPPED_BYTES) throw new Error('keylarge');
  return RSA_DIRECT_TAG + b64(ciphertext);
}

export async function decryptRsaDirect(token, pem) {
  requireCrypto();
  const ciphertext = decodeToken(token, RSA_DIRECT_TAG, MAX_RSA_WRAPPED_BYTES);
  const privateKey = validateRsaPrivateKey(
    typeof pem === 'string' ? await importRsaKey(pem, 'pkcs8', 'PRIVATE KEY', 'decrypt') : pem
  );
  if (ciphertext.length !== privateKey.algorithm.modulusLength / 8) throw new Error('format');
  return decoder.decode(await subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, ciphertext));
}

export async function encryptRsaHybrid(text, pem) {
  requireCrypto();
  assertMessageSize(text);
  const publicKey = await importRsaKey(pem, 'spki', 'PUBLIC KEY', 'encrypt');
  const rawKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);
  const wrappedKey = new Uint8Array(await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawKey));
  if (wrappedKey.length > MAX_RSA_WRAPPED_BYTES) throw new Error('keylarge');
  const ciphertext = new Uint8Array(await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(RSA_TAG) },
    aesKey,
    encoder.encode(text)
  ));
  const header = new Uint8Array([wrappedKey.length >>> 8, wrappedKey.length & 255]);
  return RSA_TAG + b64(concat(header, wrappedKey, iv, ciphertext));
}

export async function decryptRsaHybrid(token, pem) {
  requireCrypto();
  const raw = decodeToken(token, RSA_TAG, 2 + MAX_RSA_WRAPPED_BYTES + 12 + MAX_AES_CIPHERTEXT_BYTES);
  if (raw.length < 2) throw new Error('format');
  const wrappedLength = (raw[0] << 8) | raw[1];
  const ivOffset = 2 + wrappedLength;
  if (wrappedLength < 256 || wrappedLength > MAX_RSA_WRAPPED_BYTES || raw.length < ivOffset + 12 + 16) {
    throw new Error('format');
  }
  const privateKey = validateRsaPrivateKey(
    typeof pem === 'string' ? await importRsaKey(pem, 'pkcs8', 'PRIVATE KEY', 'decrypt') : pem
  );
  const rawKey = await subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, raw.slice(2, ivOffset));
  const aesKey = await subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const plaintext = decoder.decode(await subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(ivOffset, ivOffset + 12), additionalData: encoder.encode(RSA_TAG) },
    aesKey,
    raw.slice(ivOffset + 12)
  ));
  assertMessageSize(plaintext);
  return plaintext;
}
