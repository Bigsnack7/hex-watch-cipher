const SAFE_ERROR_CODES = new Set([
  'auth', 'decrypt', 'format', 'fileformat', 'fileio', 'filetoolarge', 'kdf',
  'keyformat', 'keylarge', 'keysize', 'keytoolarge', 'keyweak', 'nocrypto',
  'publickey', 'rsasizelimit', 'short', 'signature', 'signformat',
  'signing', 'signingkeyformat', 'signingkeymismatch', 'signingprivate',
  'signingpublic', 'signunsupported', 'toolarge', 'aeskeysize', 'cancelled'
]);

export function getUserErrorMessage(error, decrypting, messages, context = 'message') {
  if (error.message === 'fileio' || error.message === 'signature' || error.message === 'signing') {
    return messages[error.message];
  }
  if (decrypting) {
    if (error.message === 'nocrypto' || error.message === 'toolarge' || error.message === 'keytoolarge' ||
        error.message === 'filetoolarge') {
      return messages[error.message];
    }
    return context === 'file' ? messages.fileDecryptFailure : messages.decryptFailure;
  }
  if (error.message === 'nocrypto' || error.message === 'toolarge' || error.message === 'keytoolarge' ||
      error.message === 'filetoolarge') {
    return messages[error.message];
  }
  if (error.message === 'short' || error.message === 'publickey' || error.message === 'keyformat' ||
      error.message === 'keyweak' || error.message === 'keylarge' || error.message === 'rsasizelimit' ||
      error.message === 'signformat' || error.message === 'signunsupported' ||
      error.message === 'signingprivate' || error.message === 'signingpublic' ||
      error.message === 'signingkeyformat' || error.message === 'signingkeymismatch') {
    return messages[error.message];
  }
  if (error.name === 'OperationError') return messages.auth;
  return messages.operation;
}

export function logCryptoFailure(error, decrypting) {
  if (globalThis.self !== globalThis.top ||
      (globalThis.location?.hostname !== 'localhost' && globalThis.location?.hostname !== '127.0.0.1')) {
    return;
  }
  console.debug('Hex Watch Cipher operation failed', {
    operation: decrypting ? 'decrypt' : 'encrypt',
    errorName: typeof error.name === 'string' ? error.name : 'Error',
    errorCode: SAFE_ERROR_CODES.has(error.message) ? error.message : 'unknown'
  });
}
