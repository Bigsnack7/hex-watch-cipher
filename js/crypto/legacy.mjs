import { assertMessageSize, normalizeKey } from './shared.mjs';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FORWARD = 'CFTGPJKIWXLURNSVAQHMEZBYDO';
const REVERSE = [];
for (let index = 0; index < 26; index++) {
  REVERSE[FORWARD.charCodeAt(index) - 65] = ALPHABET[index];
}

function hash32(password) {
  let hash = 0;
  for (let index = 0; index < password.length; index++) {
    hash = (hash * 31 + password.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function legacyStream(password) {
  let state = hash32(password) || 1;
  return () => {
    // COMPATIBILITY: `>> 17` (arithmetic) differs from textbook xorshift32's `>>> 17`. Do NOT "fix"
    // it: it is part of the Grumpy v2 format and changing it would make every existing
    // ciphertext undecryptable (see tests/crypto.test.mjs, legacy vector).
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;
    state >>>= 0;
    return state % 26;
  };
}

export function encryptGrumpyV2(text, password) {
  assertMessageSize(text);
  normalizeKey(password);
  const next = legacyStream(password);
  let result = '';
  for (const character of text) {
    const code = character.charCodeAt(0);
    const upper = code >= 65 && code <= 90;
    const lower = code >= 97 && code <= 122;
    if (upper || lower) {
      const index = code - (upper ? 65 : 97);
      const shift = next();
      const output = (FORWARD.charCodeAt(index) - 65 + shift) % 26 + 65;
      result += String.fromCharCode(output + (upper ? 0 : 32));
    } else if (code >= 48 && code <= 57) {
      result += String.fromCharCode((code - 48 + 1) % 10 + 48);
    } else {
      result += character;
    }
  }
  return result;
}

export function decryptGrumpyV2(text, password) {
  assertMessageSize(text);
  normalizeKey(password);
  const next = legacyStream(password);
  let result = '';
  for (const character of text) {
    const code = character.charCodeAt(0);
    const upper = code >= 65 && code <= 90;
    const lower = code >= 97 && code <= 122;
    if (upper || lower) {
      const index = code - (upper ? 65 : 97);
      const shift = next();
      const output = REVERSE[(index - shift + 26) % 26];
      result += upper ? output : output.toLowerCase();
    } else if (code >= 48 && code <= 57) {
      result += (code - 48 + 9) % 10;
    } else {
      result += character;
    }
  }
  return result;
}
