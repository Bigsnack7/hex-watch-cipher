import {
  AES_AAD, AES_TAG, MAX_AES_CIPHERTEXT_BYTES, assertMessageSize, b64, decodeToken,
  decoder, encoder, normalizeKey, requireCrypto, subtle, KDF_ITERATIONS
} from './shared.mjs';

async function deriveAesKey(password, salt) {
  const base = await subtle.importKey('raw', normalizeKey(password), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: KDF_ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptAesGcm(text, password) {
  requireCrypto();
  assertMessageSize(text);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: AES_AAD },
    await deriveAesKey(password, salt),
    encoder.encode(text)
  ));
  const payload = new Uint8Array(28 + ciphertext.length);
  payload.set(salt);
  payload.set(iv, 16);
  payload.set(ciphertext, 28);
  return AES_TAG + b64(payload);
}

export async function decryptAesGcm(token, password) {
  requireCrypto();
  const raw = decodeToken(token, AES_TAG, 28 + MAX_AES_CIPHERTEXT_BYTES);
  if (raw.length < 44) throw new Error('format');
  const plaintext = decoder.decode(await subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(16, 28), additionalData: AES_AAD },
    await deriveAesKey(password, raw.slice(0, 16)),
    raw.slice(28)
  ));
  assertMessageSize(plaintext);
  return plaintext;
}
