import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { countPassphraseCharacters, estimatePassphraseStrength, generatePassphrase } from '../js/passphrase.mjs';
import { HASH_DIGEST_LENGTHS, digestMatches, normalizeExpectedDigest } from '../js/hash-verification.mjs';
import { serializeHashResultsCsv } from '../js/hash-results.mjs';

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
