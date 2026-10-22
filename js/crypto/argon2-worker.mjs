import { deriveArgon2idBytes } from './argon2id-core.mjs';

self.onmessage = async event => {
  const { password, salt, outputLength, parameters } = event.data || {};
  try {
    const key = await deriveArgon2idBytes(password, salt, outputLength, parameters);
    const transferredKey = key.slice();
    self.postMessage({ key: transferredKey.buffer }, [transferredKey.buffer]);
  } catch {
    self.postMessage({ error: 'kdf' });
  }
};
