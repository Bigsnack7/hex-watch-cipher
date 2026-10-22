import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AES_TAG, LEGACY_AES_V4_TAG, LEGACY_AES_V3_TAG, LEGACY_AES_V2_TAG, LEGACY_AES_TAG, AES_KEY_SIZES,
  ARGON2ID_ITERATIONS, ARGON2ID_MEMORY_KIB, ARGON2ID_PARALLELISM, LEGACY_ARGON2ID_MEMORY_KIB,
  CBC_TAG, LEGACY_CBC_V4_TAG, LEGACY_CBC_V3_TAG, LEGACY_CBC_V2_TAG, CBC_LEGACY_TAG,
  RSA_TAG, RSA_DIRECT_TAG, RSA_AES_TAG, LEGACY_RSA_AES_V5_TAG,
  LEGACY_RSA_AES_V4_TAG, LEGACY_RSA_AES_TAG,
  MAX_MESSAGE_BYTES, MAX_TOKEN_CHARS, KDF_ITERATIONS, AES_KDF_ITERATIONS, STRONG_KDF_ITERATIONS,
  encryptAesGcm, decryptAesGcm, encryptCbcHmac, decryptCbcHmac,
  encryptRsaHybrid, decryptRsaHybrid, encryptRsaDirect, decryptRsaDirect,
  encryptRsaThenAes, decryptRsaThenAes,
  generateRsaKeyPair, fingerprintRsaPublicKey,
  generateEcdsaKeyPair, signMessageToken, verifyMessageToken,
  encryptGrumpyV2, decryptGrumpyV2,
  FILE_TAG, LEGACY_FILE_V3_TAG, LEGACY_FILE_TAG, OLDEST_FILE_TAG, LEGACY_MAX_FILE_BYTES,
  LEGACY_MAX_FILE_TOKEN_CHARS, MAX_FILE_BYTES,
  FILE_CHUNK_BYTES, MAX_ENCRYPTED_FILE_BYTES, FILE_MAGIC, LEGACY_FILE_V4_MAGIC,
  LEGACY_FILE_V3_MAGIC, encryptFileBytes, decryptFileToken,
  encryptFileStream, decryptFileStream
} from '../js/crypto.mjs';
import { writePem } from '../js/crypto/pem.mjs';
import {
  deriveArgon2idKey, ARGON2ID_PARAMETERS, LEGACY_ARGON2ID_PARAMETERS
} from '../js/crypto/argon2id.mjs';
import * as legacyModule from '../js/crypto/legacy.mjs';
import { getUserErrorMessage } from '../js/errors.mjs';

const password = 'correct-horse-battery-staple';

function tamper(token, prefix, byteIndex) {
  const bytes = Buffer.from(token.slice(prefix.length), 'base64url');
  bytes[byteIndex] ^= 1;
  return prefix + bytes.toString('base64url');
}

async function createCbc1Fixture(text, passphrase) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']
  );
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: KDF_ITERATIONS },
    base,
    512
  ));
  const [encryptionKey, macKey] = await Promise.all([
    crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-CBC', false, ['encrypt']),
    crypto.subtle.importKey('raw', bits.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  ]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv }, encryptionKey, encoder.encode(text)
  ));
  const body = Buffer.concat([salt, iv, ciphertext]);
  const signature = await crypto.subtle.sign(
    'HMAC',
    macKey,
    Buffer.concat([encoder.encode(CBC_LEGACY_TAG), body])
  );
  return `${CBC_LEGACY_TAG}${Buffer.concat([body, new Uint8Array(signature)]).toString('base64url')}`;
}

async function createCbc2Fixture(text, passphrase) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']
  );
  const master = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: KDF_ITERATIONS },
    base,
    256
  );
  const hkdfKey = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveKey']);
  const [encryptionKey, authenticationKey] = await Promise.all([
    crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: encoder.encode('Hex Watch Cipher CBC2 AES-256-CBC key v1')
      },
      hkdfKey,
      { name: 'AES-CBC', length: 256 },
      false,
      ['encrypt']
    ),
    crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: encoder.encode('Hex Watch Cipher CBC2 HMAC-SHA-256 key v1')
      },
      hkdfKey,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      false,
      ['sign']
    )
  ]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv }, encryptionKey, encoder.encode(text)
  ));
  const body = Buffer.concat([salt, iv, ciphertext]);
  const signature = await crypto.subtle.sign(
    'HMAC', authenticationKey, Buffer.concat([encoder.encode(LEGACY_CBC_V2_TAG), body])
  );
  return `${LEGACY_CBC_V2_TAG}${Buffer.concat([body, new Uint8Array(signature)]).toString('base64url')}`;
}

async function createRsa3Fixture(text, publicKey, passphrase) {
  const encoder = new TextEncoder();
  const rsaKey = await crypto.subtle.importKey(
    'spki',
    Buffer.from(publicKey.replace(/-----(?:BEGIN|END) PUBLIC KEY-----|\s/g, ''), 'base64'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
  const rsaCiphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' }, rsaKey, encoder.encode(text)
  ));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: KDF_ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode('RSA3:1') },
    key,
    rsaCiphertext
  ));
  return `${LEGACY_RSA_AES_TAG}${Buffer.concat([
    Buffer.from([1]), salt, iv, ciphertext
  ]).toString('base64url')}`;
}

async function createHwfBinaryFixture(plaintext, passphrase, magic = 'HWF2', iterations = KDF_ITERATIONS) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const noncePrefix = crypto.getRandomValues(new Uint8Array(8));
  const header = new Uint8Array(36);
  header.set(encoder.encode(magic));
  header.set(salt, 4);
  header.set(noncePrefix, 20);
  new DataView(header.buffer).setBigUint64(28, BigInt(plaintext.length), false);
  const base = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const nonce = new Uint8Array(12);
  nonce.set(noncePrefix);
  const aad = new Uint8Array(header.length + 4);
  aad.set(header);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: aad },
    key,
    plaintext
  );
  return new Blob([header, ciphertext]);
}

async function createHwfTokenFixture(
  plaintext, passphrase, tag = OLDEST_FILE_TAG, aad = 'HWF1:1', iterations = KDF_ITERATIONS
) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(aad) },
    key,
    plaintext
  ));
  return `${tag}${Buffer.concat([
    Buffer.from([1]), salt, iv, ciphertext
  ]).toString('base64url')}`;
}

async function createHwfTokenArgonFixture(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    'raw',
    await deriveArgon2idKey(passphrase, salt, 32, LEGACY_ARGON2ID_PARAMETERS),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('HWF3:1') },
    key,
    plaintext
  ));
  return `${LEGACY_FILE_V3_TAG}${Buffer.concat([
    Buffer.from([1]), salt, iv, ciphertext
  ]).toString('base64url')}`;
}

async function createHwfBinaryArgonFixture(plaintext, passphrase) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const noncePrefix = crypto.getRandomValues(new Uint8Array(8));
  const header = new Uint8Array(36);
  header.set(encoder.encode('HWF4'));
  header.set(salt, 4);
  header.set(noncePrefix, 20);
  new DataView(header.buffer).setBigUint64(28, BigInt(plaintext.length), false);
  const key = await crypto.subtle.importKey(
    'raw',
    await deriveArgon2idKey(passphrase, salt, 32, LEGACY_ARGON2ID_PARAMETERS),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const nonce = new Uint8Array(12);
  nonce.set(noncePrefix);
  const aad = new Uint8Array(header.length + 4);
  aad.set(header);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: aad },
    key,
    plaintext
  );
  return new Blob([header, ciphertext]);
}

async function createAesPbkdfFixture(
  text,
  passphrase,
  keyBits = 256,
  version = 'CT2',
  tag = LEGACY_AES_V2_TAG,
  iterations = KDF_ITERATIONS
) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: keyBits },
    false,
    ['encrypt']
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(`${version}:${keyBits}`) },
    key,
    encoder.encode(text)
  ));
  const payload = new Uint8Array(29 + ciphertext.length);
  payload[0] = keyBits / 8;
  payload.set(salt, 1);
  payload.set(iv, 17);
  payload.set(ciphertext, 29);
  return `${tag}${Buffer.from(payload).toString('base64url')}`;
}

async function createAesArgonFixture(text, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    'raw',
    await deriveArgon2idKey(passphrase, salt, 32, LEGACY_ARGON2ID_PARAMETERS),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('CT4:256') },
    key,
    new TextEncoder().encode(text)
  ));
  return `${LEGACY_AES_V4_TAG}${Buffer.concat([
    Buffer.from([32]), salt, iv, ciphertext
  ]).toString('base64url')}`;
}

async function createCbc3Fixture(text, passphrase) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']
  );
  const master = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: STRONG_KDF_ITERATIONS },
    base,
    256
  );
  const hkdfKey = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveKey']);
  const [encryptionKey, macKey] = await Promise.all([
    crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: encoder.encode('Hex Watch Cipher CBC3 AES-256-CBC key v1')
      },
      hkdfKey,
      { name: 'AES-CBC', length: 256 },
      false,
      ['encrypt']
    ),
    crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: encoder.encode('Hex Watch Cipher CBC3 HMAC-SHA-256 key v1')
      },
      hkdfKey,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      false,
      ['sign']
    )
  ]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv }, encryptionKey, encoder.encode(text)
  ));
  const body = Buffer.concat([salt, iv, ciphertext]);
  const tag = await crypto.subtle.sign(
    'HMAC', macKey, Buffer.concat([Buffer.from(LEGACY_CBC_V3_TAG), body])
  );
  return `${LEGACY_CBC_V3_TAG}${Buffer.concat([body, new Uint8Array(tag)]).toString('base64url')}`;
}

async function createCbc4Fixture(text, passphrase) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const master = await deriveArgon2idKey(passphrase, salt, 32, LEGACY_ARGON2ID_PARAMETERS);
  const hkdfKey = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveKey']);
  const [encryptionKey, macKey] = await Promise.all([
    crypto.subtle.deriveKey({
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: encoder.encode('Hex Watch Cipher CBC4 AES-256-CBC key v1')
    }, hkdfKey, { name: 'AES-CBC', length: 256 }, false, ['encrypt']),
    crypto.subtle.deriveKey({
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: encoder.encode('Hex Watch Cipher CBC4 HMAC-SHA-256 key v1')
    }, hkdfKey, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign'])
  ]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv }, encryptionKey, encoder.encode(text)
  ));
  const body = Buffer.concat([salt, iv, ciphertext]);
  const tag = await crypto.subtle.sign(
    'HMAC', macKey, Buffer.concat([Buffer.from(LEGACY_CBC_V4_TAG), body])
  );
  return `${LEGACY_CBC_V4_TAG}${Buffer.concat([body, new Uint8Array(tag)]).toString('base64url')}`;
}

async function createRsa4Fixture(text, publicKey, passphrase) {
  const encoder = new TextEncoder();
  const rsaKey = await crypto.subtle.importKey(
    'spki',
    Buffer.from(publicKey.replace(/-----(?:BEGIN|END) PUBLIC KEY-----|\s/g, ''), 'base64'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
  const rsaCiphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' }, rsaKey, encoder.encode(text)
  ));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: STRONG_KDF_ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode('RSA4:1') },
    key,
    rsaCiphertext
  );
  return `${LEGACY_RSA_AES_V4_TAG}${Buffer.concat([
    Buffer.from([1]), salt, iv, new Uint8Array(ciphertext)
  ]).toString('base64url')}`;
}

async function createRsa5Fixture(text, publicKey, passphrase) {
  const encoder = new TextEncoder();
  const rsaKey = await crypto.subtle.importKey(
    'spki',
    Buffer.from(publicKey.replace(/-----(?:BEGIN|END) PUBLIC KEY-----|\s/g, ''), 'base64'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
  const rsaCiphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' }, rsaKey, encoder.encode(text)
  ));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    'raw',
    await deriveArgon2idKey(passphrase, salt, 32, LEGACY_ARGON2ID_PARAMETERS),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode('RSA5:1') },
    key,
    rsaCiphertext
  );
  return `${LEGACY_RSA_AES_V5_TAG}${Buffer.concat([
    Buffer.from([1]), salt, iv, new Uint8Array(ciphertext)
  ]).toString('base64url')}`;
}

test('AES-GCM round-trips empty and Unicode messages and rejects tampering/wrong keys', async () => {
  for (const message of ['', 'Cipher text: 世界 🔐 e\u0301']) {
    const token = await encryptAesGcm(message, password);
    assert.ok(token.startsWith(AES_TAG));
    assert.equal(await decryptAesGcm(token, password), message);
    await assert.rejects(decryptAesGcm(token, `${password}!`), error => error.message === 'auth');
    await assert.rejects(decryptAesGcm(tamper(token, AES_TAG, 28), password), error => error.message === 'auth');
  }
});

test('Argon2id matches an independent reference vector and uses fixed memory-hard settings', async () => {
  assert.equal(ARGON2ID_MEMORY_KIB, 131_072);
  assert.equal(ARGON2ID_ITERATIONS, 3);
  assert.equal(ARGON2ID_PARALLELISM, 1);
  assert.equal(LEGACY_ARGON2ID_MEMORY_KIB, 65_536);
  assert.equal(ARGON2ID_PARAMETERS.memorySize, 131_072);
  assert.equal(LEGACY_ARGON2ID_PARAMETERS.memorySize, 65_536);
  const salt = Uint8Array.from({ length: 16 }, (_, index) => index);
  const legacyOutput = await deriveArgon2idKey(
    'known test passphrase',
    salt,
    32,
    LEGACY_ARGON2ID_PARAMETERS
  );
  assert.equal(
    Buffer.from(legacyOutput).toString('hex'),
    '2c7435ac01a12a7c3f74c2d9c6363252382276cd897369d10a55724807732145'
  );
  const output = await deriveArgon2idKey('known test passphrase', salt);
  assert.equal(
    Buffer.from(output).toString('hex'),
    '844083f61421d7c2a45c9960bf50ab5b4b57088681c3ce0263b7c7aa9e884801'
  );
  assert.notDeepEqual(output, legacyOutput);
});

test('AES-GCM emits CT5 with stronger Argon2id and decrypts older formats', async () => {
  assert.equal(AES_TAG, 'CT5.');
  assert.equal(AES_KDF_ITERATIONS, 2_000_000);
  const argonToken = await encryptAesGcm('New CT5 message 🔐', password);
  assert.equal(await decryptAesGcm(argonToken, password), 'New CT5 message 🔐');

  for (const [version, tag, iterations] of [
    ['CT3', LEGACY_AES_V3_TAG, AES_KDF_ITERATIONS],
    ['CT2', LEGACY_AES_V2_TAG, KDF_ITERATIONS]
  ]) {
    const legacyToken = await createAesPbkdfFixture(
      `Existing ${version} message 🔐`, password, 256, version, tag, iterations
    );
    assert.ok(legacyToken.startsWith(`${version}.`));
    assert.equal(await decryptAesGcm(legacyToken, password), `Existing ${version} message 🔐`);
    await assert.rejects(decryptAesGcm(legacyToken, `${password}!`), error => error.message === 'auth');
  }
  const oldAesToken = await createAesArgonFixture('Existing CT4 message', password);
  assert.equal(await decryptAesGcm(oldAesToken, password), 'Existing CT4 message');
});

test('AES-GCM rejects malformed and truncated ciphertext without returning plaintext', async () => {
  const token = await encryptAesGcm('Do not return unauthenticated plaintext.', password);
  const payload = Buffer.from(token.slice(AES_TAG.length), 'base64url');
  await assert.rejects(decryptAesGcm('CT2.not*base64', password), error => error.message === 'format');
  for (const length of [0, 1, 28, 44, payload.length - 1]) {
    const truncated = AES_TAG + payload.subarray(0, length).toString('base64url');
    await assert.rejects(decryptAesGcm(truncated, password), `truncation to ${length} bytes must fail`);
  }
  const truncatedCiphertext = AES_TAG + payload.subarray(0, -1).toString('base64url');
  await assert.rejects(decryptAesGcm(truncatedCiphertext, password), error => error.message === 'auth');
  await assert.rejects(decryptAesGcm('CT1.not*base64', password), error => error.message === 'format');
});

test('AES-GCM supports 128-, 192-, and 256-bit derived keys recorded in CT5 tokens', async () => {
  assert.deepEqual(AES_KEY_SIZES, [128, 192, 256]);
  for (const keyBits of AES_KEY_SIZES) {
    const message = `AES-${keyBits} round trip`;
    const token = await encryptAesGcm(message, password, keyBits);
    assert.ok(token.startsWith('CT5.'));
    const payload = Buffer.from(token.slice(AES_TAG.length), 'base64url');
    assert.equal(payload[0], keyBits / 8);
    assert.equal(await decryptAesGcm(token, password), message);
  }
  const token = await encryptAesGcm('Key size is authenticated.', password, 256);
  await assert.rejects(decryptAesGcm(tamper(token, AES_TAG, 0), password));
  await assert.rejects(encryptAesGcm('Invalid key size', password, 64), error => error.message === 'aeskeysize');
});

test('CBC-HMAC round-trips empty and Unicode messages and authenticates before decrypting', async () => {
  for (const message of ['', 'Cipher text: 世界 🔐 e\u0301']) {
    const token = await encryptCbcHmac(message, password);
    assert.ok(token.startsWith(CBC_TAG));
    assert.equal(CBC_TAG, 'CBC5.');
    assert.equal(await decryptCbcHmac(token, password), message);
    await assert.rejects(decryptCbcHmac(token, `${password}!`), /auth/);
    const bytes = Buffer.from(token.slice(CBC_TAG.length), 'base64url');
    await assert.rejects(decryptCbcHmac(tamper(token, CBC_TAG, bytes.length - 1), password), /auth/);
  }
});

test('CBC5 tokens use stronger Argon2id and HKDF-separated encryption and authentication keys', async () => {
  const plaintext = 'CBC5 key schedule';
  const token = await encryptCbcHmac(plaintext, password);
  const raw = Buffer.from(token.slice(CBC_TAG.length), 'base64url');
  const salt = raw.subarray(0, 16);
  const iv = raw.subarray(16, 32);
  const master = await deriveArgon2idKey(password, salt);
  const hkdfKey = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveKey']);
  const [encryptionKey, authenticationKey] = await Promise.all([
    crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: new TextEncoder().encode('Hex Watch Cipher CBC5 AES-256-CBC key v1')
      },
      hkdfKey,
      { name: 'AES-CBC', length: 256 },
      false,
      ['decrypt']
    ),
    crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: new TextEncoder().encode('Hex Watch Cipher CBC5 HMAC-SHA-256 key v1')
      },
      hkdfKey,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      false,
      ['verify']
    )
  ]);
  assert.equal(await crypto.subtle.verify(
    'HMAC',
    authenticationKey,
    raw.subarray(-32),
    Buffer.concat([Buffer.from(CBC_TAG), raw.subarray(0, -32)])
  ), true);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    encryptionKey,
    raw.subarray(32, -32)
  );
  assert.equal(new TextDecoder().decode(decrypted), plaintext);
});

test('CBC-HMAC keeps CBC3, CBC2, and CBC1 tokens decryptable with their original KDFs', async () => {
  const cbc3Token = await createCbc3Fixture('CBC3 compatibility message 🔐', password);
  const cbc2Token = await createCbc2Fixture('CBC2 compatibility message 🔐', password);
  const cbc1Token = await createCbc1Fixture('CBC1 compatibility message 🔐', password);
  assert.equal(await decryptCbcHmac(cbc3Token, password), 'CBC3 compatibility message 🔐');
  assert.equal(await decryptCbcHmac(cbc2Token, password), 'CBC2 compatibility message 🔐');
  assert.equal(await decryptCbcHmac(cbc1Token, password), 'CBC1 compatibility message 🔐');
  await assert.rejects(decryptCbcHmac(cbc2Token, `${password}!`), error => error.message === 'auth');
});

test('CBC-HMAC keeps CBC4 Argon2id tokens decryptable with their original parameters', async () => {
  const token = await createCbc4Fixture('CBC4 compatibility message', password);
  assert.equal(await decryptCbcHmac(token, password), 'CBC4 compatibility message');
});

test('CBC-HMAC keeps CBC1 tokens decryptable with the legacy derivation', async () => {
  const token = await createCbc1Fixture('CBC1 compatibility message 🔐', password);
  assert.ok(token.startsWith(CBC_LEGACY_TAG));
  assert.equal(await decryptCbcHmac(token, password), 'CBC1 compatibility message 🔐');
  await assert.rejects(decryptCbcHmac(token, `${password}!`), error => error.message === 'auth');
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
  await assert.rejects(decryptCbcHmac(`${CBC_TAG}not*base64`, password), error => error.message === 'format');
  await assert.rejects(decryptCbcHmac(`${LEGACY_CBC_V2_TAG}not*base64`, password), error => error.message === 'format');
  await assert.rejects(decryptCbcHmac(`${CBC_LEGACY_TAG}not*base64`, password), error => error.message === 'format');
  for (const length of [0, 64, 79, payload.length - 1]) {
    const truncated = CBC_TAG + payload.subarray(0, length).toString('base64url');
    await assert.rejects(
      decryptCbcHmac(truncated, password),
      error => error.message === 'format',
      `truncation to ${length} bytes must be rejected`
    );
  }
});

test('ECDSA signatures support CBC5, CBC4, CBC3, CBC2, and legacy CBC1 message tokens', async () => {
  const pair = await generateEcdsaKeyPair();
  const cbc5Token = await encryptCbcHmac('signed CBC5', password);
  const cbc4Token = await createCbc4Fixture('signed CBC4', password);
  const cbc3Token = await createCbc3Fixture('signed CBC3', password);
  const cbc2Token = await createCbc2Fixture('signed CBC2', password);
  const cbc1Token = await createCbc1Fixture('signed CBC1', password);
  assert.equal((await verifyMessageToken(await signMessageToken(cbc5Token, pair.privateKey), pair.publicKey)).token, cbc5Token);
  assert.equal((await verifyMessageToken(await signMessageToken(cbc4Token, pair.privateKey), pair.publicKey)).token, cbc4Token);
  assert.equal((await verifyMessageToken(await signMessageToken(cbc3Token, pair.privateKey), pair.publicKey)).token, cbc3Token);
  assert.equal((await verifyMessageToken(await signMessageToken(cbc2Token, pair.privateKey), pair.publicKey)).token, cbc2Token);
  assert.equal((await verifyMessageToken(await signMessageToken(cbc1Token, pair.privateKey), pair.publicKey)).token, cbc1Token);
});

test('RSA6 uses stronger Argon2id and keeps RSA5, RSA4, and RSA3 tokens decryptable', async () => {
  const pair = await generateRsaKeyPair();
  const oldRsa5Token = await createRsa5Fixture('Existing RSA5 message', pair.publicKey, password);
  const oldRsa4Token = await createRsa4Fixture('Existing RSA4 message', pair.publicKey, password);
  const oldRsa3Token = await createRsa3Fixture('Existing RSA3 message', pair.publicKey, password);
  assert.equal(await decryptRsaThenAes(oldRsa5Token, pair.privateKey, password), 'Existing RSA5 message');
  assert.equal(await decryptRsaThenAes(oldRsa4Token, pair.privateKey, password), 'Existing RSA4 message');
  assert.equal(await decryptRsaThenAes(oldRsa3Token, pair.privateKey, password), 'Existing RSA3 message');
  const newToken = await encryptRsaThenAes('New RSA6 message', pair.publicKey, password);
  assert.ok(newToken.startsWith('RSA6.'));
  assert.equal(await decryptRsaThenAes(newToken, pair.privateKey, password), 'New RSA6 message');
});

test('AES-GCM and CBC-HMAC normalize equivalent Unicode passphrases with NFKC', async () => {
  const composed = 'café-passphrase-long';
  const decomposed = 'cafe\u0301-passphrase-long';
  const aesToken = await encryptAesGcm('normalized AES', composed);
  const cbcToken = await encryptCbcHmac('normalized CBC', composed);
  const pair = await generateRsaKeyPair();
  const rsaAesToken = await encryptRsaThenAes('normalized RSA6', pair.publicKey, composed);
  assert.equal(await decryptAesGcm(aesToken, decomposed), 'normalized AES');
  assert.equal(await decryptCbcHmac(cbcToken, decomposed), 'normalized CBC');
  assert.equal(await decryptRsaThenAes(rsaAesToken, pair.privateKey, decomposed), 'normalized RSA6');
});

test('AES-GCM keeps decrypting legacy CT1 tokens and rejects authenticated invalid UTF-8', async () => {
  const legacySalt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const legacyIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const legacyBaseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const legacyAesKey = await globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: legacySalt, iterations: KDF_ITERATIONS },
    legacyBaseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const legacyCiphertext = new Uint8Array(await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: legacyIv, additionalData: new TextEncoder().encode('CT1') },
    legacyAesKey,
    new TextEncoder().encode('Legacy CT1 message')
  ));
  const legacyToken = LEGACY_AES_TAG + Buffer.concat([legacySalt, legacyIv, legacyCiphertext]).toString('base64url');
  assert.equal(await decryptAesGcm(legacyToken, password), 'Legacy CT1 message');
  let wrongPassphraseMessage;
  try {
    await decryptAesGcm(legacyToken, `${password}!`);
  } catch (error) {
    wrongPassphraseMessage = getUserErrorMessage(error, true, {
      decryptFailure: 'Unable to decrypt this message. Verify the key and token, then try again.'
    });
  }
  assert.equal(
    wrongPassphraseMessage,
    'Unable to decrypt this message. Verify the key and token, then try again.'
  );

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
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('CT2:256') },
    aesKey,
    new Uint8Array([0xff])
  ));
  const token = LEGACY_AES_V2_TAG +
    Buffer.concat([Buffer.from([32]), salt, iv, ciphertext]).toString('base64url');
  await assert.rejects(decryptAesGcm(token, password), error => error.message === 'auth');
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
    await assert.rejects(decryptRsaHybrid(tamper(token, RSA_TAG, bytes.length - 1), pair.privateKey), error => error.message === 'auth');
    await assert.rejects(decryptRsaHybrid(token, otherPair.privateKey), error => error.message === 'auth');
  }
});

test('direct RSA-OAEP encrypts only short messages and round-trips with the matching private key', async () => {
  const pair = await generateRsaKeyPair({ modulusLength: 2048 });
  for (const message of ['', 'Short RSA 🔐']) {
    const token = await encryptRsaDirect(message, pair.publicKey);
    assert.ok(token.startsWith(RSA_DIRECT_TAG));
    assert.equal(await decryptRsaDirect(token, pair.privateKey), message);
  }

  const boundaryMessage = 'x'.repeat(190);
  const boundaryToken = await encryptRsaDirect(boundaryMessage, pair.publicKey);
  assert.equal(await decryptRsaDirect(boundaryToken, pair.privateKey), boundaryMessage);
  const multibyteBoundary = '🔐'.repeat(47);
  assert.equal(new TextEncoder().encode(multibyteBoundary).length, 188);
  const multibyteToken = await encryptRsaDirect(multibyteBoundary, pair.publicKey);
  assert.equal(await decryptRsaDirect(multibyteToken, pair.privateKey), multibyteBoundary);
  await assert.rejects(
    encryptRsaDirect(`${multibyteBoundary}🔐`, pair.publicKey),
    error => error.message === 'rsasizelimit'
  );

  const otherPair = await generateRsaKeyPair({ modulusLength: 2048 });
  await assert.rejects(decryptRsaDirect(boundaryToken, otherPair.privateKey), error => error.message === 'auth');
  await assert.rejects(decryptRsaDirect(tamper(boundaryToken, RSA_DIRECT_TAG, 0), pair.privateKey), error => error.message === 'auth');
});

test('RSA6 dual-key encryption requires both keys and enforces the RSA message limit', async () => {
  const pair = await generateRsaKeyPair({ modulusLength: 2048 });
  const otherPair = await generateRsaKeyPair({ modulusLength: 2048 });
  for (const message of ['', 'Short RSA then AES 🔐']) {
    const token = await encryptRsaThenAes(message, pair.publicKey, password);
    assert.ok(token.startsWith(RSA_AES_TAG));
    assert.equal(RSA_AES_TAG, 'RSA6.');
    assert.equal(await decryptRsaThenAes(token, pair.privateKey, password), message);
    await assert.rejects(decryptRsaThenAes(token, pair.privateKey, `${password}!`), error => error.message === 'auth');
    await assert.rejects(decryptRsaThenAes(token, otherPair.privateKey, password), error => error.message === 'auth');
  }

  const boundaryMessage = 'x'.repeat(190);
  const boundaryToken = await encryptRsaThenAes(boundaryMessage, pair.publicKey, password);
  assert.equal(await decryptRsaThenAes(boundaryToken, pair.privateKey, password), boundaryMessage);
  await assert.rejects(
    encryptRsaThenAes(`${boundaryMessage}x`, pair.publicKey, password),
    error => error.message === 'rsasizelimit'
  );
});

test('RSA6 dual-key format rejects malformed, truncated, and modified tokens', async () => {
  const pair = await generateRsaKeyPair();
  const token = await encryptRsaThenAes('Authenticate every RSA6 layer.', pair.publicKey, password);
  const payload = Buffer.from(token.slice(RSA_AES_TAG.length), 'base64url');
  await assert.rejects(decryptRsaThenAes('RSA6.not*base64', pair.privateKey, password), error => error.message === 'format');
  for (const length of [0, 1, 28, 29 + 256 + 15, payload.length - 1]) {
    const truncated = RSA_AES_TAG + payload.subarray(0, length).toString('base64url');
    await assert.rejects(
      decryptRsaThenAes(truncated, pair.privateKey, password),
      `truncation to ${length} bytes must fail`
    );
  }
  for (const offset of [0, 1, 17, 29, payload.length - 1]) {
    await assert.rejects(
      decryptRsaThenAes(tamper(token, RSA_AES_TAG, offset), pair.privateKey, password),
      error => error.message === (offset === 0 ? 'format' : 'auth'),
      `modified field at ${offset} must fail without releasing plaintext`
    );
  }
  const unsupportedVersion = Buffer.from(payload);
  unsupportedVersion[0] = 2;
  await assert.rejects(
    decryptRsaThenAes(`${RSA_AES_TAG}${unsupportedVersion.toString('base64url')}`, pair.privateKey, password),
    error => error.message === 'format'
  );
});

test('direct RSA-OAEP rejects malformed, truncated, and oversized payloads', async () => {
  const pair = await generateRsaKeyPair();
  const token = await encryptRsaDirect('Short direct RSA message', pair.publicKey);
  await assert.rejects(decryptRsaDirect('RSA2.not*base64', pair.privateKey), error => error.message === 'format');
  await assert.rejects(decryptRsaDirect(
    RSA_DIRECT_TAG + Buffer.from(token.slice(RSA_DIRECT_TAG.length), 'base64url').subarray(0, 255).toString('base64url'),
    pair.privateKey
  ), error => error.message === 'format');
  await assert.rejects(decryptRsaDirect(`${RSA_DIRECT_TAG}${'A'.repeat(1400)}`, pair.privateKey),
    error => error.message === 'toolarge');
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
  assert.equal(protectedPair.privateKey.algorithm.modulusLength, 3072);
  assert.equal(typeof protectedPair.generatedAt, 'string');
  const protectedToken = await encryptRsaHybrid('in-memory private key', protectedPair.publicKey);
  assert.equal(await decryptRsaHybrid(protectedToken, protectedPair.privateKey), 'in-memory private key');

  const exportablePair = await generateRsaKeyPair({ exportable: true });
  assert.equal(exportablePair.privateKey.extractable, true);
  assert.match(exportablePair.privatePem, /BEGIN PRIVATE KEY/);
  const backedUpToken = await encryptRsaHybrid('imported backup', exportablePair.publicKey);
  assert.equal(await decryptRsaHybrid(backedUpToken, exportablePair.privatePem), 'imported backup');
});

test('RSA key generation supports the selectable secure key sizes only', async () => {
  for (const modulusLength of [2048, 3072, 4096]) {
    const pair = await generateRsaKeyPair({ modulusLength });
    assert.equal(pair.privateKey.algorithm.modulusLength, modulusLength);
    assert.equal(pair.publicKey.includes('BEGIN PUBLIC KEY'), true);
  }
  await assert.rejects(
    generateRsaKeyPair({ modulusLength: 1024 }),
    error => error.message === 'keysize'
  );
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

test('Grumpy v2 is decrypt-only and reads existing legacy ciphertext', () => {
  const plaintext = 'Existing legacy message 42!';
  const ciphertext = 'Mrhbznkw ygyofq cdbtrcm 53!';
  assert.equal(decryptGrumpyV2(ciphertext, 'legacy-passphrase'), plaintext);
  assert.throws(() => encryptGrumpyV2(plaintext, 'legacy-passphrase'), error => error.message === 'legacydisabled');
  assert.equal(typeof legacyModule.encryptGrumpyV2, 'function');
});

test('HWF4 Argon2id file tokens round-trip binary data including the 1 MiB limit', async () => {
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

test('HWF4 file tokens authenticate their contents and reject malformed or oversized inputs', async () => {
  const token = await encryptFileBytes(Uint8Array.from([0, 1, 2, 255]), password);
  const payload = Buffer.from(token.slice(FILE_TAG.length), 'base64url');
  await assert.rejects(decryptFileToken(token, `${password}!`), error => error.message === 'auth');
  for (const offset of [0, 1, 17, 29, payload.length - 1]) {
    await assert.rejects(
      decryptFileToken(tamper(token, FILE_TAG, offset), password),
      error => error.message === (offset === 0 ? 'format' : 'auth')
    );
  }
  await assert.rejects(decryptFileToken(`${FILE_TAG}AB`, password), /format/);
  await assert.rejects(decryptFileToken(`${FILE_TAG}A=`, password), /format/);
  await assert.rejects(
    decryptFileToken(`${FILE_TAG}${'A'.repeat(LEGACY_MAX_FILE_TOKEN_CHARS)}`, password),
    /toolarge/
  );
  await assert.rejects(encryptFileBytes(new Uint8Array(LEGACY_MAX_FILE_BYTES + 1), password), /filetoolarge/);
});

test('HWF4 file-token decryption retains HWF3, HWF2, and HWF1 compatibility', async () => {
  const plaintext = Uint8Array.from([0, 1, 2, 255]);
  const oldHwf3 = await createHwfTokenArgonFixture(plaintext, password);
  const oldHwf2 = await createHwfTokenFixture(
    plaintext, password, LEGACY_FILE_TAG, 'HWF2:1', STRONG_KDF_ITERATIONS
  );
  const oldHwf1 = await createHwfTokenFixture(plaintext, password);
  assert.deepEqual(await decryptFileToken(oldHwf3, password), plaintext);
  assert.deepEqual(await decryptFileToken(oldHwf2, password), plaintext);
  assert.deepEqual(await decryptFileToken(oldHwf1, password), plaintext);
});

test('HWF5 streams and authenticates binary files across chunk boundaries', async () => {
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
  assert.deepEqual(
    new Uint8Array(await encrypted.slice(0, 4).arrayBuffer()),
    new TextEncoder().encode('HWF5')
  );
  assert.equal(encrypted.size, plaintext.length + 36 + 2 * 16);
  assert.ok(encrypted.size <= MAX_ENCRYPTED_FILE_BYTES);
  assert.deepEqual(progress.at(-1), [plaintext.length, plaintext.length]);

  const decryptedParts = [];
  await decryptFileStream(encrypted, password, part => decryptedParts.push(part));
  assert.deepEqual(new Uint8Array(await new Blob(decryptedParts).arrayBuffer()), plaintext);
});

test('HWF5 decrypts existing HWF4, HWF3, and HWF2 files with their original KDFs', async () => {
  const plaintext = new TextEncoder().encode('Existing legacy HWF content');
  const legacyHwf4 = await createHwfBinaryArgonFixture(plaintext, password);
  const legacyHwf3 = await createHwfBinaryFixture(plaintext, password, 'HWF3', STRONG_KDF_ITERATIONS);
  const legacyHwf2 = await createHwfBinaryFixture(plaintext, password);
  for (const legacy of [legacyHwf4, legacyHwf3, legacyHwf2]) {
    const decryptedParts = [];
    await decryptFileStream(legacy, password, chunk => decryptedParts.push(chunk));
    assert.deepEqual(new Uint8Array(await new Blob(decryptedParts).arrayBuffer()), plaintext);
  }
});

test('HWF5 rejects wrong keys, tampering, truncation, and oversized files', async () => {
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
  oversizedHeader.set(new TextEncoder().encode('HWF5'));
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

test('HWF5 rejects swapped authenticated chunks', async () => {
  const plaintext = new Uint8Array(FILE_CHUNK_BYTES * 2).fill(0x5a);
  const encryptedParts = [];
  await encryptFileStream(new Blob([plaintext]), password, part => encryptedParts.push(part));
  const encrypted = new Uint8Array(await new Blob(encryptedParts).arrayBuffer());
  const firstChunkStart = 36;
  const chunkLength = FILE_CHUNK_BYTES + 16;
  const firstChunk = encrypted.slice(firstChunkStart, firstChunkStart + chunkLength);
  const secondChunkStart = firstChunkStart + chunkLength;
  encrypted.copyWithin(firstChunkStart, secondChunkStart, secondChunkStart + chunkLength);
  encrypted.set(firstChunk, secondChunkStart);

  await assert.rejects(
    decryptFileStream(new Blob([encrypted]), password, () => {}),
    error => error.message === 'auth'
  );
});

test('HWF5 rejects a flipped bit in the authenticated header size field', async () => {
  const encryptedParts = [];
  await encryptFileStream(new Blob([new Uint8Array(128).fill(0x5a)]), password, part => encryptedParts.push(part));
  const encrypted = new Uint8Array(await new Blob(encryptedParts).arrayBuffer());
  encrypted[35] ^= 1;

  await assert.rejects(
    decryptFileStream(new Blob([encrypted]), password, () => {}),
    error => error.message === 'format'
  );
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
