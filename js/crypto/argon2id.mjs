import {
  ARGON2ID_PARAMETERS, deriveArgon2idBytes, LEGACY_ARGON2ID_PARAMETERS
} from './argon2id-core.mjs';
import { normalizeKey, requireCrypto } from './shared.mjs';

export {
  ARGON2ID_ITERATIONS, ARGON2ID_MEMORY_KIB, ARGON2ID_PARALLELISM,
  ARGON2ID_PARAMETERS, LEGACY_ARGON2ID_ITERATIONS, LEGACY_ARGON2ID_MEMORY_KIB,
  LEGACY_ARGON2ID_PARAMETERS
} from './argon2id-core.mjs';

function deriveInWorker(password, salt, outputLength, parameters) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL('./argon2-worker.mjs', import.meta.url), { type: 'module' });
    } catch {
      reject(new Error('kdf'));
      return;
    }

    const finish = (error, key) => {
      worker.terminate();
      if (error) reject(error);
      else resolve(key);
    };
    worker.onmessage = event => {
      const bytes = event.data?.key;
      if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== outputLength) {
        finish(new Error('kdf'));
        return;
      }
      finish(null, new Uint8Array(bytes));
    };
    worker.onerror = event => {
      event.preventDefault();
      finish(new Error('kdf'));
    };
    worker.onmessageerror = () => finish(new Error('kdf'));

    try {
      worker.postMessage(
        { password, salt, outputLength, parameters },
        [password.buffer]
      );
    } catch {
      finish(new Error('kdf'));
    }
  });
}

export async function deriveArgon2idKey(
  password, salt, outputLength = 32, parameters = ARGON2ID_PARAMETERS
) {
  requireCrypto();
  const normalizedPassword = normalizeKey(password);
  if (!(salt instanceof Uint8Array) || salt.length !== 16 ||
      ![16, 24, 32].includes(outputLength)) {
    normalizedPassword.fill(0);
    throw new Error('format');
  }
  if (typeof Worker === 'function') {
    return deriveInWorker(normalizedPassword, salt, outputLength, parameters);
  }
  return deriveArgon2idBytes(normalizedPassword, salt, outputLength, parameters);
}
