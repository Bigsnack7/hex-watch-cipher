import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AES_TAG, SIGNED_MESSAGE_TAG, generateEcdsaKeyPair, fingerprintEcdsaPublicKey,
  signMessageToken, verifyMessageToken, isSignedMessageToken
} from '../js/crypto.mjs';
import { writePem } from '../js/crypto/pem.mjs';

test('ECDSA P-256 signatures verify the exact encrypted token and fingerprint', async () => {
  const pair = await generateEcdsaKeyPair();
  assert.equal(pair.privateKey.extractable, false);
  const token = `${AES_TAG}ciphertext`;
  const signed = await signMessageToken(token, pair.privateKey);
  assert.ok(isSignedMessageToken(signed));
  const result = await verifyMessageToken(signed, pair.publicKey);
  assert.equal(result.token, token);
  assert.equal(result.fingerprint, await fingerprintEcdsaPublicKey(pair.publicKey));
});

test('ECDSA signed-message verification rejects altered payloads and untrusted keys', async () => {
  const signer = await generateEcdsaKeyPair();
  const stranger = await generateEcdsaKeyPair();
  const signed = await signMessageToken(`${AES_TAG}original`, signer.privateKey);
  await assert.rejects(verifyMessageToken(signed, stranger.publicKey), error => error.message === 'signature');

  const alteredBytes = Buffer.from(signed.slice(SIGNED_MESSAGE_TAG.length), 'base64url');
  alteredBytes[9] = alteredBytes[9] === 0x41 ? 0x42 : 0x41;
  const altered = SIGNED_MESSAGE_TAG + alteredBytes.toString('base64url');
  await assert.rejects(verifyMessageToken(altered, signer.publicKey), error => error.message === 'signature');
});

test('ECDSA signed-message parser rejects malformed and unsupported envelopes', async () => {
  const pair = await generateEcdsaKeyPair();
  await assert.rejects(verifyMessageToken(`${SIGNED_MESSAGE_TAG}not*base64`, pair.publicKey));
  await assert.rejects(signMessageToken('not-an-encrypted-token', pair.privateKey), error => error.message === 'signformat');

  const unsupported = Buffer.from('Grumpy v2 legacy plaintext');
  const header = Buffer.alloc(5);
  header[0] = 1;
  header.writeUInt32BE(unsupported.length, 1);
  const token = SIGNED_MESSAGE_TAG + Buffer.concat([header, unsupported, Buffer.alloc(64)]).toString('base64url');
  await assert.rejects(verifyMessageToken(token, pair.publicKey), error => error.message === 'format');
});

test('ECDSA signing keys support deliberate private-key export and PEM import', async () => {
  const pair = await generateEcdsaKeyPair({ exportable: true });
  assert.equal(pair.privateKey.extractable, true);
  assert.match(pair.publicKey, /BEGIN PUBLIC KEY/);
  assert.match(pair.privatePem, /BEGIN PRIVATE KEY/);
  const importedPublic = await fingerprintEcdsaPublicKey(pair.publicKey);
  const signed = await signMessageToken(`${AES_TAG}pem-import`, pair.privatePem);
  assert.equal((await verifyMessageToken(signed, pair.publicKey)).fingerprint, importedPublic);
  await assert.rejects(signMessageToken(`${AES_TAG}x`, pair.publicKey), error => error.message === 'signingkeyformat');
});

test('ECDSA signing reports malformed private and public PEM as safe format errors', async () => {
  const pair = await generateEcdsaKeyPair();
  const signed = await signMessageToken(`${AES_TAG}valid-payload`, pair.privateKey);
  await assert.rejects(
    signMessageToken(`${AES_TAG}payload`, 'not a private key'),
    error => error.message === 'signingkeyformat'
  );
  await assert.rejects(
    verifyMessageToken(signed, 'not a public key'),
    error => error.message === 'signingkeyformat'
  );
});

test('ECDSA signed-message verification rejects invalid curves and malformed signatures', async () => {
  const p384 = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-384' },
    true,
    ['sign', 'verify']
  );
  const p384Public = writePem(await crypto.subtle.exportKey('spki', p384.publicKey), 'PUBLIC KEY');
  const p256 = await generateEcdsaKeyPair();
  const signed = await signMessageToken(`${AES_TAG}curve`, p256.privateKey);
  await assert.rejects(verifyMessageToken(signed, p384Public), error => error.message === 'signingkeyformat');

  const malformedBytes = Buffer.from(signed.slice(SIGNED_MESSAGE_TAG.length), 'base64url');
  const shortSignature = Buffer.concat([malformedBytes.subarray(0, malformedBytes.length - 64), Buffer.from([1, 2, 3])]);
  const malformedSignature = SIGNED_MESSAGE_TAG + shortSignature.toString('base64url');
  await assert.rejects(verifyMessageToken(malformedSignature, p256.publicKey), error => error.message === 'format');
});
