import test from 'node:test';
import assert from 'node:assert/strict';
import { DECRYPT_FAILURE_MESSAGE, getUserErrorMessage, logCryptoFailure } from '../js/errors.mjs';

const messages = {
  auth: 'Authentication failed.',
  keytoolarge: 'Key too large.',
  nocrypto: 'Crypto unavailable.',
  operation: 'Encryption failed.',
  rsasizelimit: 'Direct RSA message is too long.',
  signingkeyformat: 'Invalid signing key.',
  signingkeymismatch: 'Signing keys do not match.',
  short: 'Key too short.',
  toolarge: 'Input too large.',
  filetoolarge: 'File too large.'
};

test('decryption errors share one public message except actionable local input failures', () => {
  for (const error of [
    new Error('auth'),
    new Error('format'),
    new Error('keyformat'),
    new TypeError('Invalid UTF-8'),
    Object.assign(new Error('OperationError'), { name: 'OperationError' })
  ]) {
    assert.equal(getUserErrorMessage(error, true, messages), DECRYPT_FAILURE_MESSAGE);
  }
  assert.equal(getUserErrorMessage(new Error('toolarge'), true, messages), messages.toolarge);
  assert.equal(getUserErrorMessage(new Error('filetoolarge'), true, messages), messages.filetoolarge);
  assert.equal(getUserErrorMessage(new Error('nocrypto'), true, messages), messages.nocrypto);
});

test('encryption errors never reveal arbitrary implementation details', () => {
  assert.equal(
    getUserErrorMessage(new Error('sensitive plaintext must not appear'), false, messages),
    messages.operation
  );
  assert.equal(
    getUserErrorMessage(Object.assign(new Error('OperationError'), { name: 'OperationError' }), false, messages),
    messages.auth
  );
  assert.equal(getUserErrorMessage(new Error('rsasizelimit'), false, messages), messages.rsasizelimit);
  assert.equal(getUserErrorMessage(new Error('signingkeyformat'), false, messages), messages.signingkeyformat);
  assert.equal(getUserErrorMessage(new Error('signingkeymismatch'), false, messages), messages.signingkeymismatch);
  assert.equal(getUserErrorMessage(new Error('signingkeymismatch'), true, messages), DECRYPT_FAILURE_MESSAGE);
});

test('development diagnostics include only allowlisted error codes and omit secret details', () => {
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const originalDebug = console.debug;
  const logged = [];
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { hostname: 'localhost' } });
  console.debug = (...args) => logged.push(args);
  try {
    logCryptoFailure(new Error('private key content'), true);
    logCryptoFailure(new Error('format'), true);
  } finally {
    console.debug = originalDebug;
    if (previousLocation) Object.defineProperty(globalThis, 'location', previousLocation);
    else delete globalThis.location;
  }
  assert.equal(logged.length, 2);
  assert.equal(logged[0][1].errorCode, 'unknown');
  assert.equal(logged[1][1].errorCode, 'format');
  assert.equal(JSON.stringify(logged).includes('private key content'), false);
});
