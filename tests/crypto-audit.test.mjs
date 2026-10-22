import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptAesGcm, decryptAesGcm, encryptCbcHmac, decryptCbcHmac,
  encryptRsaThenAes, decryptRsaThenAes, generateRsaKeyPair,
  generateEcdsaKeyPair, signMessageToken, verifyMessageToken, fingerprintEcdsaPublicKey,
  AES_TAG, encryptGrumpyV2
} from '../js/crypto.mjs';
import { writePem } from '../js/crypto/pem.mjs';

const password = 'correct-horse-battery-staple';

test('a leading U+FEFF survives AES-GCM and CBC-HMAC round trips', async () => {
  const message = '﻿starts with a byte-order mark';
  assert.equal(await decryptAesGcm(await encryptAesGcm(message, password), password), message);
  assert.equal(await decryptCbcHmac(await encryptCbcHmac(message, password), password), message);
});

test('empty or non-string passphrases are rejected by the library', async () => {
  await assert.rejects(encryptAesGcm('x', ''), error => error.message === 'short');
  await assert.rejects(encryptCbcHmac('x', ''), error => error.message === 'short');
  await assert.rejects(encryptAesGcm('x', undefined), error => error.message === 'short');
  assert.throws(() => encryptGrumpyV2('x', ''), error => error.message === 'legacydisabled');
});

test('an over-long passphrase on decrypt reports keytoolarge instead of a fake auth failure', async () => {
  const token = await encryptAesGcm('x', password);
  await assert.rejects(decryptAesGcm(token, 'x'.repeat(5000)), error => error.message === 'keytoolarge');
});

test('non-string tokens are format errors, not TypeErrors', async () => {
  for (const bad of [undefined, null, 42, {}]) {
    await assert.rejects(decryptAesGcm(bad, password), error => error.message === 'format');
  }
});

test('ECDSA rejects wrongly-typed CryptoKey inputs with signingkeyformat', async () => {
  const rsa = await generateRsaKeyPair();
  const ecdsa = await generateEcdsaKeyPair();
  const signed = await signMessageToken(`${AES_TAG}payload`, ecdsa.privateKey);
  await assert.rejects(signMessageToken(`${AES_TAG}payload`, rsa.privateKey), e => e.message === 'signingkeyformat');
  await assert.rejects(signMessageToken(`${AES_TAG}payload`, ecdsa.publicKey), e => e.message === 'signingkeyformat');
  await assert.rejects(verifyMessageToken(signed, rsa.privateKey), e => e.message === 'signingkeyformat');
  await assert.rejects(verifyMessageToken(signed, undefined), e => e.message === 'signingkeyformat');
});

test('ECDSA fingerprint reports a non-extractable public key as signingkeyformat', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
  const locked = await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  await assert.rejects(fingerprintEcdsaPublicKey(locked), e => e.message === 'signingkeyformat');
});

test('RSA6 rejects a wrong-size or malformed private key before running Argon2id', async () => {
  const pair = await generateRsaKeyPair({ modulusLength: 2048 });
  const larger = await generateRsaKeyPair({ modulusLength: 3072 });
  const token = await encryptRsaThenAes('hello', pair.publicKey, password);
  let started = performance.now();
  await assert.rejects(decryptRsaThenAes(token, 'garbage', password), e => e.message === 'keyformat');
  await assert.rejects(decryptRsaThenAes(token, larger.privateKey, password), e => e.message === 'format');
  // Argon2id is deliberately expensive; malformed keys must be rejected before derivation.
  assert.ok(performance.now() - started < 250, 'early key checks should not derive a key');
  assert.equal(await decryptRsaThenAes(token, pair.privateKey, password), 'hello');
});

test('writePem tolerates empty input instead of throwing a TypeError', () => {
  assert.equal(writePem(new ArrayBuffer(0), 'PUBLIC KEY'), '-----BEGIN PUBLIC KEY-----\n\n-----END PUBLIC KEY-----');
});
