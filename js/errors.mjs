export const DECRYPT_FAILURE_MESSAGE =
  'Unable to decrypt this message. Verify the key and token, then try again.';

const SAFE_ERROR_CODES = new Set([
  'auth', 'decrypt', 'format', 'keyformat', 'keylarge', 'keytoolarge', 'rsasizelimit',
  'keyweak', 'nocrypto', 'publickey', 'short', 'toolarge', 'filetoolarge'
]);

export function getUserErrorMessage(error, decrypting, messages) {
  if (decrypting) {
    if (error.message === 'nocrypto' || error.message === 'toolarge' || error.message === 'keytoolarge' ||
        error.message === 'filetoolarge') {
      return messages[error.message];
    }
    return DECRYPT_FAILURE_MESSAGE;
  }
  if (error.message === 'nocrypto' || error.message === 'toolarge' || error.message === 'keytoolarge' ||
      error.message === 'filetoolarge') {
    return messages[error.message];
  }
  if (error.message === 'short' || error.message === 'publickey' || error.message === 'keyformat' ||
      error.message === 'keyweak' || error.message === 'keylarge' || error.message === 'rsasizelimit') {
    return messages[error.message];
  }
  if (error.name === 'OperationError') return messages.auth;
  return messages.operation;
}

export function logCryptoFailure(error, decrypting) {
  if (globalThis.location?.hostname !== 'localhost' && globalThis.location?.hostname !== '127.0.0.1') {
    return;
  }
  console.debug('Hex Watch Cipher operation failed', {
    operation: decrypting ? 'decrypt' : 'encrypt',
    errorName: typeof error.name === 'string' ? error.name : 'Error',
    errorCode: SAFE_ERROR_CODES.has(error.message) ? error.message : 'unknown'
  });
}
