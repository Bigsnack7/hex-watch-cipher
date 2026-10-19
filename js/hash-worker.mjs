import { computeDigest, createMd5 } from './hashing.mjs';

const HASH_CHUNK_BYTES = 4 * 1024 * 1024;

self.addEventListener('message', async event => {
  const { file, algorithms } = event.data;
  const digests = {};
  const webCryptoAlgorithms = algorithms.filter(algorithm => algorithm !== 'md5');
  let buffer = null;
  if (webCryptoAlgorithms.length) {
    try {
      buffer = await file.arrayBuffer();
    } catch {
      self.postMessage({ type: 'read-error' });
      return;
    }
    for (const algorithm of webCryptoAlgorithms) {
      try {
        digests[algorithm] = await computeDigest(algorithm, buffer);
      } catch {
        digests[algorithm] = null;
      }
    }
  }

  if (algorithms.includes('md5')) {
    const md5 = createMd5();
    if (buffer) {
      const bytes = new Uint8Array(buffer);
      for (let offset = 0; offset < bytes.length; offset += HASH_CHUNK_BYTES) {
        md5.update(bytes.subarray(offset, offset + HASH_CHUNK_BYTES));
      }
    } else {
      for (let offset = 0; offset < file.size; offset += HASH_CHUNK_BYTES) {
        let chunk;
        try {
          chunk = await file.slice(offset, offset + HASH_CHUNK_BYTES).arrayBuffer();
        } catch {
          self.postMessage({ type: 'read-error' });
          return;
        }
        md5.update(new Uint8Array(chunk));
      }
    }
    digests.md5 = md5.digest();
  }
  self.postMessage({ type: 'result', digests });
});
