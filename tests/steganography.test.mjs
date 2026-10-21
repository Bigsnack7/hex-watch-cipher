import test from 'node:test';
import assert from 'node:assert/strict';
import {
  embedPayload, extractPayload, getStegoCapacity, MAX_STEGO_PAYLOAD_BYTES,
  MAX_STEGO_EMBEDDED_BYTES, readCarrierDimensions,
  carrierDimensionsMatch, createAppendedPayloadFooter, extractAppendedPayload
} from '../js/steganography.mjs';
import { buildZipArchive, crc32 } from '../js/stego-archive.mjs';

test('PNG pixel payload round-trips binary data without changing alpha', () => {
  const pixels = new Uint8ClampedArray(100 * 4);
  for (let index = 0; index < pixels.length; index++) pixels[index] = index % 256;
  for (let offset = 3; offset < pixels.length; offset += 4) pixels[offset] = 255;
  const alpha = pixels.filter((_, index) => index % 4 === 3);
  const payload = Uint8Array.from([0, 1, 127, 128, 254, 255]);

  embedPayload(pixels, payload);

  assert.deepEqual(extractPayload(pixels), payload);
  assert.deepEqual(
    pixels.filter((_, index) => index % 4 === 3),
    alpha
  );
});

test('PNG pixel payload rejects insufficient capacity and malformed carriers', () => {
  assert.equal(getStegoCapacity(100), 29);
  assert.throws(
    () => embedPayload(new Uint8ClampedArray(8 * 4), Uint8Array.of(1)),
    /capacity/
  );
  assert.throws(() => extractPayload(new Uint8ClampedArray(8 * 4)), /stegoformat/);
  assert.throws(() => extractPayload(new Uint8ClampedArray(100 * 4)), /stegoformat/);

  const pixels = new Uint8ClampedArray(100 * 4);
  for (let offset = 3; offset < pixels.length; offset += 4) pixels[offset] = 255;
  embedPayload(pixels, Uint8Array.of(1));
  pixels[0] ^= 1;
  assert.throws(() => extractPayload(pixels), /stegoformat/);
  assert.equal(MAX_STEGO_PAYLOAD_BYTES, 4 * 1024 * 1024);
  assert.equal(MAX_STEGO_EMBEDDED_BYTES, MAX_STEGO_PAYLOAD_BYTES + 2048);
});

test('PNG payload uses only fully opaque pixels for stable capacity', () => {
  const pixels = new Uint8ClampedArray(100 * 4);
  for (let offset = 3; offset < pixels.length; offset += 4) {
    pixels[offset] = offset / 4 < 40 ? 255 : 0;
  }
  assert.equal(getStegoCapacity(pixels), 7);
  embedPayload(pixels, Uint8Array.of(0x42));
  assert.deepEqual(extractPayload(pixels), Uint8Array.of(0x42));
  assert.equal(getStegoCapacity(pixels), 7);
});

test('carrier dimension reader recognizes JPEG and PNG headers without trusting file extensions', () => {
  const jpeg = Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x11, 0x22,
    0xff, 0xc0, 0x00, 0x08, 0x08, 0x00, 0x20, 0x00, 0x30, 0x03
  ]);
  assert.deepEqual(readCarrierDimensions(jpeg), { format: 'jpeg', width: 48, height: 32 });
  const png = new Uint8Array(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  png.set([73, 72, 68, 82], 12);
  new DataView(png.buffer).setUint32(16, 640, false);
  new DataView(png.buffer).setUint32(20, 480, false);
  assert.deepEqual(readCarrierDimensions(png), { format: 'png', width: 640, height: 480 });
  assert.throws(() => readCarrierDimensions(jpeg.subarray(0, 10)), /image/);
  assert.throws(() => readCarrierDimensions(new Uint8Array([1, 2, 3, 4])), /image/);
});

test('carrier dimensions allow browser-applied JPEG orientation but reject mismatches', () => {
  assert.equal(carrierDimensionsMatch('png', 100, 50, 100, 50), true);
  assert.equal(carrierDimensionsMatch('jpeg', 100, 50, 100, 50), true);
  assert.equal(carrierDimensionsMatch('jpeg', 100, 50, 50, 100), true);
  assert.equal(carrierDimensionsMatch('png', 100, 50, 50, 100), false);
  assert.equal(carrierDimensionsMatch('jpeg', 100, 50, 60, 100), false);
});

test('appended carrier payload round-trips without changing the original carrier bytes', async () => {
  const original = new Blob(['video or audio bytes']);
  const payload = Uint8Array.from([0, 1, 127, 128, 255]);
  const carrier = new Blob([original, payload, createAppendedPayloadFooter(payload.length)]);

  assert.deepEqual(await extractAppendedPayload(carrier), payload);
  assert.equal(
    await carrier.slice(0, original.size).text(),
    await original.text()
  );
  await assert.rejects(extractAppendedPayload(original), /stegoformat/);
  await assert.rejects(
    extractAppendedPayload(new Blob([original, Uint8Array.of(1, 2, 3)])),
    /stegoformat/
  );
  const invalidFooter = new Uint8Array(12);
  new DataView(invalidFooter.buffer).setUint32(0, MAX_STEGO_EMBEDDED_BYTES + 1, false);
  invalidFooter.set([0x48, 0x57, 0x41, 0x50, 0x50, 0x4e, 0x44, 0x31], 4);
  await assert.rejects(
    extractAppendedPayload(new Blob([invalidFooter])),
    /stegoformat/
  );
  assert.throws(() => createAppendedPayloadFooter(0), /capacity/);
});

test('ZIP archive writer creates a UTF-8 store archive with valid CRC and safe paths', async () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const first = Object.assign(new Blob([new Uint8Array([0, 1, 2])]), { name: 'one.txt' });
  const second = Object.assign(new Blob(['hello']), { name: 'two.txt' });
  const archive = new Uint8Array(await (await buildZipArchive([first, second])).arrayBuffer());
  const view = new DataView(archive.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(archive.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(archive.length - 12, true), 2);
  assert.equal(view.getUint16(6, true) & 0x0800, 0x0800);
  assert.equal(new TextDecoder().decode(archive).includes('one.txt'), true);
  assert.equal(new TextDecoder().decode(archive).includes('two.txt'), true);
  await assert.rejects(
    buildZipArchive([Object.assign(new Blob(['unsafe']), { name: '../secret.txt' })]),
    /archivepath/
  );
  await assert.rejects(
    buildZipArchive([
      Object.assign(new Blob(['file']), { name: 'file', webkitRelativePath: 'Folder/file' }),
      Object.assign(new Blob(['nested']), { name: 'nested', webkitRelativePath: 'folder/file/child' })
    ]),
    /archivepath/
  );
  await assert.rejects(
    buildZipArchive([Object.assign(new Blob(['absolute']), { name: 'absolute', webkitRelativePath: 'C:/secret.txt' })]),
    /archivepath/
  );
});
