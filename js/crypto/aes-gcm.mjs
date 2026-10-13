import {
  AES_TAG, AES_KEY_SIZES, LEGACY_AES_AAD, LEGACY_AES_TAG, MAX_AES_CIPHERTEXT_BYTES,
  assertMessageSize, b64, decodeToken, decoder, encoder, normalizeKey, requireCrypto,
  subtle, KDF_ITERATIONS
} from './shared.mjs';

const AES_KEY_BYTES = new Map([[16, 128], [24, 192], [32, 256]]);

export async function deriveAesKey(password, salt, keyBits) {
  const base = await subtle.importKey('raw', normalizeKey(password), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: KDF_ITERATIONS },
    base,
    { name: 'AES-GCM', length: keyBits },
    false,
    ['encrypt', 'decrypt']
  );
}

function parseVersion2Token(token) {
  const raw = decodeToken(token, AES_TAG, 1 + 28 + MAX_AES_CIPHERTEXT_BYTES);
  if (raw.length < 45) throw new Error('format');
  const keyBits = AES_KEY_BYTES.get(raw[0]);
  if (!AES_KEY_SIZES.includes(keyBits)) throw new Error('format');
  return { raw, keyBits };
}

export async function encryptAesGcm(text, password, keyBits = 256) {
  requireCrypto();
  assertMessageSize(text);
  if (!AES_KEY_SIZES.includes(keyBits)) throw new Error('aeskeysize');
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aad = encoder.encode(`CT2:${keyBits}`);
  const ciphertext = new Uint8Array(await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    await deriveAesKey(password, salt, keyBits),
    encoder.encode(text)
  ));
  const payload = new Uint8Array(29 + ciphertext.length);
  payload[0] = keyBits / 8;
  payload.set(salt, 1);
  payload.set(iv, 17);
  payload.set(ciphertext, 29);
  return AES_TAG + b64(payload);
}

export async function decryptAesGcm(token, password) {
  requireCrypto();
  let raw;
  let plaintextBytes;
  if (token.startsWith(AES_TAG)) {
    const parsed = parseVersion2Token(token);
    raw = parsed.raw;
    plaintextBytes = await subtle.decrypt(
      { name: 'AES-GCM', iv: raw.slice(17, 29), additionalData: encoder.encode(`CT2:${parsed.keyBits}`) },
      await deriveAesKey(password, raw.slice(1, 17), parsed.keyBits),
      raw.slice(29)
    );
  } else {
    raw = decodeToken(token, LEGACY_AES_TAG, 28 + MAX_AES_CIPHERTEXT_BYTES);
    if (raw.length < 44) throw new Error('format');
    plaintextBytes = await subtle.decrypt(
      { name: 'AES-GCM', iv: raw.slice(16, 28), additionalData: LEGACY_AES_AAD },
      await deriveAesKey(password, raw.slice(0, 16), 256),
      raw.slice(28)
    );
  }
  const plaintext = decoder.decode(plaintextBytes);
  assertMessageSize(plaintext);
  return plaintext;
}
