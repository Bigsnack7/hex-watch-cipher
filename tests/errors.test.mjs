import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserErrorMessage, logCryptoFailure } from '../js/errors.mjs';

const messages = {
  auth: 'Authentication failed.',
  decryptFailure: 'Localized message-decryption failure.',
  fileDecryptFailure: 'Localized file-decryption failure.',
  fileio: 'Localized file read/write failure.',
  keytoolarge: 'Key too large.',
  nocrypto: 'Crypto unavailable.',
  operation: 'Encryption failed.',
  rsasizelimit: 'Direct RSA message is too long.',
  signature: 'Signature verification failed.',
  signing: 'Could not create signature.',
  signingkeyformat: 'Invalid signing key.',
  signingkeymismatch: 'Signing keys do not match.',
  short: 'Key too short.',
  toolarge: 'Input too large.',
  filetoolarge: 'File too large.'
};

test('decryption errors use localized context-specific failures except actionable input failures', () => {
  for (const error of [
    new Error('auth'),
    new Error('format'),
    new Error('keyformat'),
    new TypeError('Invalid UTF-8'),
    Object.assign(new Error('OperationError'), { name: 'OperationError' })
  ]) {
    assert.equal(getUserErrorMessage(error, true, messages), messages.decryptFailure);
  }
  assert.equal(getUserErrorMessage(new Error('format'), true, messages, 'file'), messages.fileDecryptFailure);
  assert.equal(getUserErrorMessage(new Error('toolarge'), true, messages), messages.toolarge);
  assert.equal(getUserErrorMessage(new Error('filetoolarge'), true, messages), messages.filetoolarge);
  assert.equal(getUserErrorMessage(new Error('nocrypto'), true, messages), messages.nocrypto);
  assert.equal(getUserErrorMessage(new Error('fileio'), true, messages, 'file'), messages.fileio);
  assert.equal(getUserErrorMessage(new Error('fileio'), false, messages), messages.fileio);
  assert.doesNotMatch(getUserErrorMessage(new Error('fileio'), true, messages, 'file'), /verify the key/i);
  assert.equal(getUserErrorMessage(new Error('signature'), true, messages), messages.signature);
  assert.equal(getUserErrorMessage(new Error('signature'), true, messages, 'file'), messages.signature);
  assert.equal(getUserErrorMessage(new Error('signing'), false, messages), messages.signing);
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
  assert.equal(getUserErrorMessage(new Error('signingkeymismatch'), true, messages), messages.decryptFailure);
});

test('development diagnostics include only allowlisted error codes and omit secret details', () => {
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const previousSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  const previousTop = Object.getOwnPropertyDescriptor(globalThis, 'top');
  const originalDebug = console.debug;
  const logged = [];
  const windowObject = {};
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { hostname: 'localhost' } });
  Object.defineProperty(globalThis, 'self', { configurable: true, value: windowObject });
  Object.defineProperty(globalThis, 'top', { configurable: true, value: windowObject });
  console.debug = (...args) => logged.push(args);
  try {
    logCryptoFailure(new Error('private key content'), true);
    logCryptoFailure(new Error('format'), true);
    logCryptoFailure(new Error('fileio'), true);
    logCryptoFailure(new Error('fileformat'), true);
    logCryptoFailure(new Error('signature'), true);
  } finally {
    console.debug = originalDebug;
    if (previousLocation) Object.defineProperty(globalThis, 'location', previousLocation);
    else delete globalThis.location;
    if (previousSelf) Object.defineProperty(globalThis, 'self', previousSelf);
    else delete globalThis.self;
    if (previousTop) Object.defineProperty(globalThis, 'top', previousTop);
    else delete globalThis.top;
  }
  assert.equal(logged.length, 5);
  assert.equal(logged[0][1].errorCode, 'unknown');
  assert.equal(logged[1][1].errorCode, 'format');
  assert.equal(logged[2][1].errorCode, 'fileio');
  assert.equal(logged[3][1].errorCode, 'fileformat');
  assert.equal(logged[4][1].errorCode, 'signature');
  assert.equal(JSON.stringify(logged).includes('private key content'), false);
});

test('development diagnostics are disabled for embedded pages', () => {
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const previousSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  const previousTop = Object.getOwnPropertyDescriptor(globalThis, 'top');
  const originalDebug = console.debug;
  const logged = [];
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { hostname: 'localhost' } });
  Object.defineProperty(globalThis, 'self', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'top', { configurable: true, value: {} });
  console.debug = (...args) => logged.push(args);
  try {
    logCryptoFailure(new Error('format'), true);
  } finally {
    console.debug = originalDebug;
    if (previousLocation) Object.defineProperty(globalThis, 'location', previousLocation);
    else delete globalThis.location;
    if (previousSelf) Object.defineProperty(globalThis, 'self', previousSelf);
    else delete globalThis.self;
    if (previousTop) Object.defineProperty(globalThis, 'top', previousTop);
    else delete globalThis.top;
  }
  assert.equal(logged.length, 0);
});
