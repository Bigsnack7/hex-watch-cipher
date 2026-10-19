import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { countPassphraseCharacters, estimatePassphraseStrength, generatePassphrase } from '../js/passphrase.mjs';
import { HASH_DIGEST_LENGTHS, digestMatches, normalizeExpectedDigest } from '../js/hash-verification.mjs';
import { computeDigest, createMd5, HASH_FILE_MAX_BYTES, isHashFileSizeAllowed } from '../js/hashing.mjs';
import { serializeHashResultsCsv } from '../js/hash-results.mjs';

test('file hashing computes standard MD5 vectors without main-thread coupling', async () => {
  assert.equal(HASH_FILE_MAX_BYTES, 256 * 1024 * 1024);
  assert.equal(isHashFileSizeAllowed(0), true);
  assert.equal(isHashFileSizeAllowed(HASH_FILE_MAX_BYTES), true);
  assert.equal(isHashFileSizeAllowed(HASH_FILE_MAX_BYTES + 1), false);
  assert.equal(isHashFileSizeAllowed(-1), false);
  assert.equal(isHashFileSizeAllowed(Number.POSITIVE_INFINITY), false);
  assert.equal(await computeDigest('md5', new Uint8Array()), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.equal(await computeDigest('md5', new TextEncoder().encode('abc')), '900150983cd24fb0d6963f7d28e17f72');
  assert.equal(
    await computeDigest('md5', new TextEncoder().encode('The quick brown fox jumps over the lazy dog')),
    '9e107d9d372bb6826bd81d3542a419d6'
  );
});

test('MD5 digest matches reference values across padding and block boundaries', async () => {
  for (const length of [1, 55, 56, 63, 64, 65, 127, 128, 129, 4096]) {
    const input = Uint8Array.from({ length }, (_, index) => index % 251);
    const expected = createHash('md5').update(input).digest('hex');
    assert.equal(await computeDigest('md5', input), expected, `input length ${length}`);

    const incremental = createMd5();
    for (let offset = 0; offset < input.length; offset += 17) {
      incremental.update(input.subarray(offset, offset + 17));
    }
    assert.equal(incremental.digest(), expected, `incremental input length ${length}`);
  }
});

test('incremental MD5 accepts empty chunks and typed-array views', () => {
  const source = Uint8Array.from({ length: 513 }, (_, index) => index % 251);
  const expected = createHash('md5').update(source).digest('hex');
  const incremental = createMd5();
  incremental.update(new Uint8Array());
  incremental.update(new DataView(source.buffer, 0, 111));
  incremental.update(source.subarray(111));
  assert.equal(incremental.digest(), expected);
  assert.throws(() => incremental.update(source), { message: 'md5-finalized' });
  assert.throws(() => incremental.digest(), { message: 'md5-finalized' });
});

test('file hashing supports Web Crypto digests and rejects unsupported algorithms', async () => {
  const input = new TextEncoder().encode('abc');
  assert.equal(await computeDigest('sha1', input), 'a9993e364706816aba3e25717850c26c9cd0d89d');
  assert.equal(await computeDigest('sha256', input), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(
    await computeDigest('sha512', input),
    'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f'
  );
  await assert.rejects(computeDigest('sha384', input), { message: 'unsupported-hash-algorithm' });
});

test('passphrase generator produces cryptographically sourced mixed-character values at supported lengths', () => {
  for (const length of [16, 24, 32, 64]) {
    const value = generatePassphrase(length);
    const estimate = estimatePassphraseStrength(value, length);
    assert.equal(value.length, length);
    assert.match(value, /[a-z]/);
    assert.match(value, /[A-Z]/);
    assert.match(value, /[2-9]/);
    assert.match(value, /[!@#$%^&*()\-_=+\[\]{}:,.?]/);
    assert.doesNotMatch(value, /[0O1Il]/);
    assert.equal(estimate.score, 100);
    assert.equal(estimate.checks.length, true);
  }
});

test('strength meter connects accessible markup, live updates, generated keys, and purple strong styling', async () => {
  const [html, app, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../js/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../css/styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /<progress id="keyStrengthMeter" class="strength-track" aria-labelledby="keyStrengthLabel" aria-valuetext="No estimate" max="100" value="0"/);
  assert.match(html, /id="keyStrengthGuidance"/);
  assert.match(app, /keyStrengthMeter\.value=score;/);
  assert.ok(app.includes("keyStrengthMeter.setAttribute('aria-valuetext',estimate?`${estimate.level} estimate, ${score} out of 100`:'No estimate');"));
  assert.match(app, /\$\('key'\)\.addEventListener\('input'.*updatePassphraseStrength\(\)/);
  assert.match(app, /\$\('key'\)\.addEventListener\('blur',\(\)=>audio\.announcePassphraseResult\(\)\)/);
  assert.match(app, /\$\('passphraseLength'\)\.addEventListener\('change',updatePassphraseStrength\)/);
  assert.match(app, /key\.value=generatePassphrase\(Number\(\$\('passphraseLength'\)\.value\)\);[\s\S]*?updatePassphraseStrength\(\)/);
  assert.match(app, /audio\.announcePassphraseResult\(\{generated:true\}\)/);
  assert.match(app, /audio\.announcePassphraseGenerationError\(\)/);
  assert.match(app, /\$\('keyStrengthGuidance'\)\.textContent=estimate\?\.guidance/);
  assert.match(styles, /\.strength-track\[data-level="strong"\]::?-webkit-progress-value/);
  assert.match(styles, /\.strength-track\[data-level="strong"\]::-moz-progress-bar/);
  assert.match(styles, /#8151dc.*#a56bf2.*#c18aff/);
});

test('passphrase generator validates configuration and cryptographic randomness', () => {
  for (const length of [0, 15, 65, 24.5, NaN]) {
    assert.throws(() => generatePassphrase(length), { message: 'passphrase-length' });
  }
  assert.throws(() => generatePassphrase(24, {}), { message: 'nocrypto' });
});

test('strength estimate identifies empty, repeated, and longer varied access keys', () => {
  assert.equal(estimatePassphraseStrength(''), null);
  assert.equal(estimatePassphraseStrength('aaaaaaaaaaaaaaaa').level, 'weak');
  assert.ok(estimatePassphraseStrength('copper-forest-7!').score > 50);
  const generated = estimatePassphraseStrength(generatePassphrase(24), 24);
  assert.equal(generated.level, 'strong');
  assert.equal(generated.score, 100);
  assert.equal(generated.checks.length, true);
  assert.ok(
    estimatePassphraseStrength('aB3!'.repeat(6), 24).score
      > estimatePassphraseStrength('aaaaaaaabbbb1234qwer!AAAA', 24).score,
    'repetitions and common sequences should lower the quality estimate'
  );
});

test('strength estimate reports selected-length and character-group guidance', () => {
  const estimate = estimatePassphraseStrength('aB3!'.repeat(6), 24);
  assert.deepEqual(estimate.checks, {
    length: true,
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true
  });
  assert.equal(estimatePassphraseStrength('aB3!', 24).checks.length, false);
  assert.match(estimatePassphraseStrength('aB3!', 8).guidance, /Add 4 more characters/);
  assert.match(estimatePassphraseStrength('abc!defg', 8).guidance, /add .* for more character variety/);
  assert.match(
    estimatePassphraseStrength('aB3!'.repeat(6), 24).guidance,
    /avoid repeating a character pattern/
  );
  assert.match(
    estimatePassphraseStrength('abcdef12ABC!@xyz', 16).guidance,
    /avoid predictable sequences/
  );
  assert.match(
    estimatePassphraseStrength(generatePassphrase(24), 24).guidance,
    /cannot detect reuse or personal information/
  );
});

test('passphrase length enforcement counts Unicode code points exactly', () => {
  assert.equal(countPassphraseCharacters('a'.repeat(24)), 24);
  assert.equal(countPassphraseCharacters('a'.repeat(23)), 23);
  assert.equal(countPassphraseCharacters('a'.repeat(25)), 25);
  assert.equal(countPassphraseCharacters('a'.repeat(23) + '😀'), 24);
});

test('expected digest normalization validates algorithm-specific hex length and case', () => {
  assert.deepEqual(HASH_DIGEST_LENGTHS, { md5: 32, sha1: 40, sha256: 64, sha512: 128 });
  assert.equal(normalizeExpectedDigest(` ${'A'.repeat(32)} `, 'md5'), 'a'.repeat(32));
  assert.equal(normalizeExpectedDigest('A'.repeat(40), 'sha1'), 'a'.repeat(40));
  assert.equal(normalizeExpectedDigest('F'.repeat(64), 'sha256'), 'f'.repeat(64));
  assert.equal(normalizeExpectedDigest('b'.repeat(128), 'sha512'), 'b'.repeat(128));
  for (const [value, algorithm] of [
    ['', 'sha256'],
    ['z'.repeat(64), 'sha256'],
    ['a'.repeat(63), 'sha256'],
    ['c'.repeat(96), 'sha384'],
    ['a'.repeat(64), 'unsupported']
  ]) {
    assert.throws(() => normalizeExpectedDigest(value, algorithm), {
      message: 'invalid-expected-digest'
    });
  }
});

test('digest comparison ignores letter case and rejects differences', () => {
  assert.equal(digestMatches('A1b2', 'a1B2'), true);
  assert.equal(digestMatches('a1b2', 'a1b3'), false);
  assert.equal(digestMatches('a1b2', 'a1b'), false);
  assert.equal(digestMatches(null, 'a1b2'), false);
});

test('hash results CSV quotes values and neutralizes spreadsheet formulas in filenames', () => {
  const csv = serializeHashResultsCsv([{
    filename: '=HYPERLINK("https://example.invalid")',
    size: 12,
    algorithm: 'sha256',
    digest: 'a'.repeat(64),
    expectedMatch: true,
    status: 'calculated'
  }]);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.invalid""\)"/);
  assert.match(csv, /"MATCH","CALCULATED"$/);
  assert.doesNotMatch(csv, /ioc_match|manifest_match/i);
});

test('hash results CSV preserves read and digest failures in the report', () => {
  const csv = serializeHashResultsCsv([
    { filename: 'unreadable.bin', size: 12, algorithm: '', digest: '', expectedMatch: null, status: 'read error' },
    { filename: 'digest-error.bin', size: 24, algorithm: 'sha256', digest: '', expectedMatch: null, status: 'unavailable' }
  ]);
  assert.match(csv, /"unreadable\.bin","12","","","","READ ERROR"/);
  assert.match(csv, /"digest-error\.bin","24","SHA256","","","UNAVAILABLE"/);
});
