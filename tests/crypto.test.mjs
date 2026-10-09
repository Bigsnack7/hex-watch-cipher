import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AES_TAG, CBC_TAG, RSA_TAG, MAX_MESSAGE_BYTES, MAX_TOKEN_CHARS, KDF_ITERATIONS,
  encryptAesGcm, decryptAesGcm, encryptCbcHmac, decryptCbcHmac,
  encryptRsaHybrid, decryptRsaHybrid, generateRsaKeyPair, fingerprintRsaPublicKey,
  encryptGrumpyV2, decryptGrumpyV2,
  FILE_TAG, LEGACY_MAX_FILE_BYTES, LEGACY_MAX_FILE_TOKEN_CHARS, MAX_FILE_BYTES,
  FILE_CHUNK_BYTES, MAX_ENCRYPTED_FILE_BYTES, encryptFileBytes, decryptFileToken,
  encryptFileStream, decryptFileStream
} from '../js/crypto.mjs';
import { writePem } from '../js/crypto/pem.mjs';
import * as legacyModule from '../js/crypto/legacy.mjs';

const password = 'correct-horse-battery-staple';

function tamper(token, prefix, byteIndex) {
  const bytes = Buffer.from(token.slice(prefix.length), 'base64url');
  bytes[byteIndex] ^= 1;
  return prefix + bytes.toString('base64url');
}

test('AES-GCM round-trips empty and Unicode messages and rejects tampering/wrong keys', async () => {
  for (const message of ['', 'Cipher text: 世界 🔐 e\u0301']) {
    const token = await encryptAesGcm(message, password);
    assert.ok(token.startsWith(AES_TAG));
    assert.equal(await decryptAesGcm(token, password), message);
    await assert.rejects(decryptAesGcm(token, `${password}!`));
    await assert.rejects(decryptAesGcm(tamper(token, AES_TAG, 28), password));
  }
});

test('AES-GCM rejects malformed and truncated ciphertext without returning plaintext', async () => {
  const token = await encryptAesGcm('Do not return unauthenticated plaintext.', password);
  const payload = Buffer.from(token.slice(AES_TAG.length), 'base64url');
  await assert.rejects(decryptAesGcm('CT1.not*base64', password), error => error.message === 'format');
  for (const length of [0, 27, 43, payload.length - 1]) {
    const truncated = AES_TAG + payload.subarray(0, length).toString('base64url');
    await assert.rejects(decryptAesGcm(truncated, password), `truncation to ${length} bytes must fail`);
  }
});

test('CBC-HMAC round-trips empty and Unicode messages and authenticates before decrypting', async () => {
  for (const message of ['', 'Cipher text: 世界 🔐 e\u0301']) {
    const token = await encryptCbcHmac(message, password);
    assert.ok(token.startsWith(CBC_TAG));
    assert.equal(await decryptCbcHmac(token, password), message);
    await assert.rejects(decryptCbcHmac(token, `${password}!`), /auth/);
    const bytes = Buffer.from(token.slice(CBC_TAG.length), 'base64url');
    await assert.rejects(decryptCbcHmac(tamper(token, CBC_TAG, bytes.length - 1), password), /auth/);
  }
});

test('CBC-HMAC rejects changes to ciphertext, IV, salt, and authentication tag', async () => {
  const plaintext = 'CBC integrity must reject every modified field.';
  const token = await encryptCbcHmac(plaintext, password);
  const payload = Buffer.from(token.slice(CBC_TAG.length), 'base64url');
  const tamperCases = [
    ['salt', 0],
    ['IV', 16],
    ['ciphertext', 32],
    ['authentication tag', payload.length - 1]
  ];
  for (const [field, offset] of tamperCases) {
    await assert.rejects(
      decryptCbcHmac(tamper(token, CBC_TAG, offset), password),
      error => error.message === 'auth',
      `modified ${field} must fail authentication without returning plaintext`
    );
  }
});

test('CBC-HMAC rejects truncated or structurally incomplete tokens before decryption', async () => {
  const token = await encryptCbcHmac('Never return a partial plaintext.', password);
  const payload = Buffer.from(token.slice(CBC_TAG.length), 'base64url');
  await assert.rejects(decryptCbcHmac('CBC1.not*base64', password), error => error.message === 'format');
  for (const length of [0, 64, 79, payload.length - 1]) {
    const truncated = CBC_TAG + payload.subarray(0, length).toString('base64url');
    await assert.rejects(
      decryptCbcHmac(truncated, password),
      error => error.message === 'format',
      `truncation to ${length} bytes must be rejected`
    );
  }
});

test('AES-GCM and CBC-HMAC normalize equivalent Unicode passphrases with NFKC', async () => {
  const composed = 'café-passphrase-long';
  const decomposed = 'cafe\u0301-passphrase-long';
  const aesToken = await encryptAesGcm('normalized AES', composed);
  const cbcToken = await encryptCbcHmac('normalized CBC', composed);
  assert.equal(await decryptAesGcm(aesToken, decomposed), 'normalized AES');
  assert.equal(await decryptCbcHmac(cbcToken, decomposed), 'normalized CBC');
});

test('AES-GCM rejects authenticated plaintext that is not valid UTF-8', async () => {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const aesKey = await globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: KDF_ITERATIONS },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ciphertext = new Uint8Array(await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('CT1') },
    aesKey,
    new Uint8Array([0xff])
  ));
  const token = AES_TAG + Buffer.concat([salt, iv, ciphertext]).toString('base64url');
  await assert.rejects(decryptAesGcm(token, password), TypeError);
});

test('RSA-OAEP hybrid encryption round-trips empty and Unicode messages and rejects tampering', async () => {
  const pair = await generateRsaKeyPair();
  assert.match(pair.publicKey, /BEGIN PUBLIC KEY/);
  assert.equal(pair.privateKey.extractable, false);
  assert.equal(pair.privatePem, null);
  const fingerprint = await fingerprintRsaPublicKey(pair.publicKey);
  assert.match(fingerprint, /^(?:[A-F0-9]{4} ){15}[A-F0-9]{4}$/);
  assert.equal(await fingerprintRsaPublicKey(pair.publicKey), fingerprint);
  const otherPair = await generateRsaKeyPair();
  assert.notEqual(await fingerprintRsaPublicKey(otherPair.publicKey), fingerprint);
  await assert.rejects(fingerprintRsaPublicKey('not an RSA public key'), /keyformat/);
  for (const message of ['', 'Cipher text: 世界 🔐 e\u0301']) {
    const token = await encryptRsaHybrid(message, pair.publicKey);
    assert.ok(token.startsWith(RSA_TAG));
    assert.equal(await decryptRsaHybrid(token, pair.privateKey), message);
    const bytes = Buffer.from(token.slice(RSA_TAG.length), 'base64url');
    await assert.rejects(decryptRsaHybrid(tamper(token, RSA_TAG, bytes.length - 1), pair.privateKey));
    await assert.rejects(decryptRsaHybrid(token, otherPair.privateKey));
  }
});

test('RSA hybrid rejects malformed and truncated tokens without returning plaintext', async () => {
  const pair = await generateRsaKeyPair();
  const token = await encryptRsaHybrid('Do not return unauthenticated plaintext.', pair.publicKey);
  const payload = Buffer.from(token.slice(RSA_TAG.length), 'base64url');
  await assert.rejects(decryptRsaHybrid('RSA1.not*base64', pair.privateKey), error => error.message === 'format');
  for (const length of [0, 1, 2, 2 + 256, payload.length - 1]) {
    const truncated = RSA_TAG + payload.subarray(0, length).toString('base64url');
    await assert.rejects(decryptRsaHybrid(truncated, pair.privateKey), `truncation to ${length} bytes must fail`);
  }
});

test('RSA key generation defaults to non-extractable and supports deliberate exportable backup', async () => {
  const protectedPair = await generateRsaKeyPair();
  assert.equal(protectedPair.privateKey.extractable, false);
  assert.equal(protectedPair.privatePem, null);
  assert.equal(protectedPair.privateKey.algorithm.name, 'RSA-OAEP');
  assert.equal(typeof protectedPair.generatedAt, 'string');
  const protectedToken = await encryptRsaHybrid('in-memory private key', protectedPair.publicKey);
  assert.equal(await decryptRsaHybrid(protectedToken, protectedPair.privateKey), 'in-memory private key');

  const exportablePair = await generateRsaKeyPair({ exportable: true });
  assert.equal(exportablePair.privateKey.extractable, true);
  assert.match(exportablePair.privatePem, /BEGIN PRIVATE KEY/);
  const backedUpToken = await encryptRsaHybrid('imported backup', exportablePair.publicKey);
  assert.equal(await decryptRsaHybrid(backedUpToken, exportablePair.privatePem), 'imported backup');
});

test('RSA import rejects malformed PEM and keys below the supported minimum', async () => {
  await assert.rejects(encryptRsaHybrid('test', 'not a PEM public key'), error => error.message === 'keyformat');
  await assert.rejects(
    encryptRsaHybrid('test', 'x'.repeat(20_001)),
    error => error.message === 'keytoolarge'
  );

  const validPair = await generateRsaKeyPair();
  const token = await encryptRsaHybrid('test', validPair.publicKey);
  await assert.rejects(
    decryptRsaHybrid(token, '-----BEGIN PRIVATE KEY-----\ninvalid\n-----END PRIVATE KEY-----'),
    error => error.message === 'keyformat'
  );

  const weakPair = await globalThis.crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 1024, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  );
  const weakPublic = writePem(await globalThis.crypto.subtle.exportKey('spki', weakPair.publicKey), 'PUBLIC KEY');
  const weakPrivate = writePem(await globalThis.crypto.subtle.exportKey('pkcs8', weakPair.privateKey), 'PRIVATE KEY');
  await assert.rejects(encryptRsaHybrid('test', weakPublic), error => error.message === 'keyweak');
  await assert.rejects(decryptRsaHybrid(token, weakPrivate), error => error.message === 'keyweak');
});

test('Grumpy v2 encryption preserves its legacy format and decrypts existing ciphertext', () => {
  const plaintext = 'Existing legacy message 42!';
  const ciphertext = 'Mrhbznkw ygyofq cdbtrcm 53!';
  assert.equal(encryptGrumpyV2(plaintext, 'legacy-passphrase'), ciphertext);
  assert.equal(decryptGrumpyV2(ciphertext, 'legacy-passphrase'), plaintext);
  for (const message of ['', 'Mixed CASE, digits 0123456789, and Unicode 世界 🔐']) {
    assert.equal(decryptGrumpyV2(encryptGrumpyV2(message, password), password), message);
  }
  assert.throws(() => encryptGrumpyV2('x'.repeat(MAX_MESSAGE_BYTES + 1), password), /toolarge/);
  assert.equal(typeof legacyModule.encryptGrumpyV2, 'function');
});

test('HWF1 file encryption round-trips binary data including the 1 MiB limit', async () => {
  const samples = [
    new Uint8Array(),
    Uint8Array.from({ length: 512 }, (_, index) => index % 256),
    new Uint8Array(LEGACY_MAX_FILE_BYTES).fill(0xa5)
  ];
  for (const plaintext of samples) {
    const token = await encryptFileBytes(plaintext, password);
    assert.ok(token.startsWith(FILE_TAG));
    assert.ok(token.length <= LEGACY_MAX_FILE_TOKEN_CHARS);
    assert.deepEqual(await decryptFileToken(token, password), plaintext);
  }
});

test('HWF1 authenticates its contents and rejects wrong keys, tampering, malformed and oversized inputs', async () => {
  const token = await encryptFileBytes(Uint8Array.from([0, 1, 2, 255]), password);
  const payload = Buffer.from(token.slice(FILE_TAG.length), 'base64url');
  await assert.rejects(decryptFileToken(token, `${password}!`));
  for (const offset of [0, 1, 17, 29, payload.length - 1]) {
    await assert.rejects(decryptFileToken(tamper(token, FILE_TAG, offset), password));
  }
  await assert.rejects(decryptFileToken(`${FILE_TAG}AB`, password), /format/);
  await assert.rejects(decryptFileToken(`${FILE_TAG}A=`, password), /format/);
  await assert.rejects(
    decryptFileToken(`${FILE_TAG}${'A'.repeat(LEGACY_MAX_FILE_TOKEN_CHARS)}`, password),
    /toolarge/
  );
  await assert.rejects(encryptFileBytes(new Uint8Array(LEGACY_MAX_FILE_BYTES + 1), password), /filetoolarge/);
});

test('HWF2 streams and authenticates binary files across chunk boundaries', async () => {
  const plaintext = Uint8Array.from(
    { length: FILE_CHUNK_BYTES + 37 },
    (_, index) => (index * 31) % 256
  );
  const encryptedParts = [];
  const progress = [];
  await encryptFileStream(
    new Blob([plaintext]),
    password,
    part => encryptedParts.push(part),
    (complete, total) => progress.push([complete, total])
  );
  const encrypted = new Blob(encryptedParts);
  assert.equal(encrypted.size, plaintext.length + 36 + 2 * 16);
  assert.ok(encrypted.size <= MAX_ENCRYPTED_FILE_BYTES);
  assert.deepEqual(progress.at(-1), [plaintext.length, plaintext.length]);

  const decryptedParts = [];
  await decryptFileStream(encrypted, password, part => decryptedParts.push(part));
  assert.deepEqual(new Uint8Array(await new Blob(decryptedParts).arrayBuffer()), plaintext);
});

test('HWF2 rejects wrong keys, tampering, truncation, and oversized files', async () => {
  const encryptedParts = [];
  const plaintext = new Uint8Array(FILE_CHUNK_BYTES + 31).fill(0x5a);
  await encryptFileStream(new Blob([plaintext]), password, part => encryptedParts.push(part));
  const encrypted = new Blob(encryptedParts);
  await assert.rejects(decryptFileStream(encrypted, `${password}!`, () => {}), /auth/);

  const tampered = new Uint8Array(await encrypted.arrayBuffer());
  const secondChunkStart = 36 + FILE_CHUNK_BYTES + 16;
  for (const offset of [4, 20, 35, 36, 40, secondChunkStart, tampered.length - 1]) {
    const changed = tampered.slice();
    changed[offset] ^= 1;
    await assert.rejects(
      decryptFileStream(new Blob([changed]), password, () => {}),
      error => error.message === 'auth' || error.message === 'format'
    );
  }
  await assert.rejects(
    decryptFileStream(encrypted.slice(0, encrypted.size - 1), password, () => {}),
    /format/
  );

  const oversizedHeader = new Uint8Array(36);
  oversizedHeader.set(new TextEncoder().encode('HWF2'));
  new DataView(oversizedHeader.buffer).setBigUint64(28, BigInt(MAX_FILE_BYTES) + 1n, false);
  const oversizedEncrypted = Object.create(Blob.prototype);
  Object.defineProperty(oversizedEncrypted, 'size', { value: 52 });
  oversizedEncrypted.slice = (start, end) => new Blob([oversizedHeader.slice(start, end)]);
  await assert.rejects(
    decryptFileStream(oversizedEncrypted, password, () => {}),
    /filetoolarge/
  );

  const oversized = Object.create(Blob.prototype);
  Object.defineProperty(oversized, 'size', { value: MAX_FILE_BYTES + 1 });
  await assert.rejects(encryptFileStream(oversized, password, () => {}), /filetoolarge/);
});

test('crypto rejects over-limit messages, oversized tokens, and malformed base64url before KDF work', async () => {
  const oversizedMessage = 'x'.repeat(MAX_MESSAGE_BYTES + 1);
  const oversizedUnicode = '🔐'.repeat(Math.ceil((MAX_MESSAGE_BYTES + 1) / 4));
  await assert.rejects(encryptAesGcm(oversizedMessage, password), /toolarge/);
  await assert.rejects(encryptAesGcm(oversizedUnicode, password), /toolarge/);
  await assert.rejects(encryptCbcHmac(oversizedMessage, password), /toolarge/);
  await assert.rejects(encryptRsaHybrid(oversizedMessage, 'not a key'), /toolarge/);
  await assert.rejects(encryptAesGcm('bounded key test', 'x'.repeat(4_097)), /keytoolarge/);
  await assert.rejects(decryptAesGcm(`${AES_TAG}${'A'.repeat(MAX_TOKEN_CHARS)}`, password), /toolarge/);
  await assert.rejects(decryptAesGcm(`${AES_TAG}AB`, password), /format/);
  await assert.rejects(decryptCbcHmac(`${CBC_TAG}A=`, password), /format/);
  await assert.rejects(decryptCbcHmac(`${CBC_TAG}${'A'.repeat(MAX_TOKEN_CHARS)}`, password), /toolarge/);
  await assert.rejects(decryptRsaHybrid(`${RSA_TAG}@@@`, 'not a key'), /format/);
  await assert.rejects(decryptRsaHybrid(`${RSA_TAG}${'A'.repeat(MAX_TOKEN_CHARS)}`, 'not a key'), /toolarge/);
});
