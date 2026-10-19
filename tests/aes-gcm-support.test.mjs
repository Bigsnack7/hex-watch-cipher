import test from 'node:test';
import assert from 'node:assert/strict';
import { supportsAesGcmKeySize } from '../js/aes-gcm-support.mjs';

test('AES-GCM key-size detection probes the requested browser capability', async () => {
  const requested = [];
  const subtle = {
    async generateKey(algorithm, extractable, usages) {
      requested.push({ algorithm, extractable, usages });
    }
  };
  assert.equal(await supportsAesGcmKeySize(subtle, 192), true);
  assert.deepEqual(requested, [{
    algorithm: { name: 'AES-GCM', length: 192 },
    extractable: false,
    usages: ['encrypt', 'decrypt']
  }]);
});

test('AES-GCM key-size detection reports browser-declared unsupported algorithms', async () => {
  for (const name of ['OperationError', 'NotSupportedError']) {
    const subtle = { async generateKey() { throw Object.assign(new Error(name), { name }); } };
    assert.equal(await supportsAesGcmKeySize(subtle, 192), false);
  }
  assert.equal(await supportsAesGcmKeySize(null, 192), false);
});

test('AES-GCM key-size detection does not hide unexpected probe failures', async () => {
  const subtle = { async generateKey() { throw new Error('unexpected probe failure'); } };
  await assert.rejects(supportsAesGcmKeySize(subtle, 192), /unexpected probe failure/);
});
