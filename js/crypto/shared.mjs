export const encoder = new TextEncoder();
// ignoreBOM: true keeps a leading U+FEFF in decrypted text. The default silently strips it,
// so a message that starts with a BOM would not round-trip.
export const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
export const subtle = globalThis.crypto?.subtle;

export const AES_TAG = 'CT5.';
export const LEGACY_AES_V4_TAG = 'CT4.';
export const LEGACY_AES_V3_TAG = 'CT3.';
export const LEGACY_AES_V2_TAG = 'CT2.';
export const LEGACY_AES_TAG = 'CT1.';
export const CBC_TAG = 'CBC5.';
export const LEGACY_CBC_V4_TAG = 'CBC4.';
export const LEGACY_CBC_V3_TAG = 'CBC3.';
export const LEGACY_CBC_V2_TAG = 'CBC2.';
export const CBC_LEGACY_TAG = 'CBC1.';
export const RSA_TAG = 'RSA1.';
export const RSA_DIRECT_TAG = 'RSA2.';
export const RSA_AES_TAG = 'RSA6.';
export const LEGACY_RSA_AES_V5_TAG = 'RSA5.';
export const LEGACY_RSA_AES_V4_TAG = 'RSA4.';
export const LEGACY_RSA_AES_TAG = 'RSA3.';
export const MAX_MESSAGE_BYTES = 100_000;
export const MAX_TOKEN_CHARS = 140_000;
export const MAX_RSA_KEY_CHARS = 20_000;
export const MAX_KEY_BYTES = 4_096;
export const KDF_ITERATIONS = 600_000;
export const STRONG_KDF_ITERATIONS = 2_000_000;
export const AES_KDF_ITERATIONS = STRONG_KDF_ITERATIONS;
export const LEGACY_AES_AAD = encoder.encode('CT1');
export const AES_KEY_SIZES = Object.freeze([128, 192, 256]);
export const MAX_RSA_WRAPPED_BYTES = 1_024;
export const MAX_AES_CIPHERTEXT_BYTES = MAX_MESSAGE_BYTES + 16;
export const MAX_CBC_CIPHERTEXT_BYTES = Math.ceil((MAX_MESSAGE_BYTES + 1) / 16) * 16;

export function requireCrypto() {
  if (!subtle) throw new Error('nocrypto');
}

export function assertMessageSize(text) {
  if (encoder.encode(text).length > MAX_MESSAGE_BYTES) throw new Error('toolarge');
}

export function normalizeKey(password) {
  // An empty or non-string passphrase would derive a key from nothing; reject it at the library level.
  if (typeof password !== 'string' || password.length === 0) throw new Error('short');
  const normalized = password.normalize('NFKC');
  if (encoder.encode(normalized).length > MAX_KEY_BYTES) throw new Error('keytoolarge');
  return encoder.encode(normalized);
}

export function b64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32_768));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function unb64url(value) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error('format');
  }
  try {
    const standard = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(standard + '='.repeat((4 - standard.length % 4) % 4));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    if (b64(bytes) !== value) throw new Error('format');
    return bytes;
  } catch {
    throw new Error('format');
  }
}

export function decodeToken(token, prefix, maxBytes, maxTokenChars = MAX_TOKEN_CHARS) {
  if (typeof token !== 'string') throw new Error('format');
  if (token.length > maxTokenChars) throw new Error('toolarge');
  if (!token.startsWith(prefix)) throw new Error('format');
  const bytes = unb64url(token.slice(prefix.length));
  if (bytes.length > maxBytes) throw new Error('toolarge');
  return bytes;
}

export function concat(...parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
