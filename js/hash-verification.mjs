export const HASH_DIGEST_LENGTHS = Object.freeze({
  md5: 32,
  sha1: 40,
  sha256: 64,
  sha512: 128
});

export function normalizeExpectedDigest(value, algorithm) {
  const expectedLength = HASH_DIGEST_LENGTHS[algorithm];
  const digest = value.trim();
  if (!expectedLength || !new RegExp(`^[0-9a-fA-F]{${expectedLength}}$`).test(digest)) {
    throw new Error('invalid-expected-digest');
  }
  return digest.toLowerCase();
}

export function digestMatches(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string' || actual.length !== expected.length) {
    return false;
  }
  actual = actual.toLowerCase();
  expected = expected.toLowerCase();
  let difference = 0;
  for (let index = 0; index < actual.length; index++) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}
