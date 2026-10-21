const MAGIC = new Uint8Array([0x48, 0x57, 0x53, 0x31]);
const HEADER_BYTES = 8;
const APPENDED_PAYLOAD_MAGIC = new Uint8Array([0x48, 0x57, 0x41, 0x50, 0x50, 0x4e, 0x44, 0x31]);
const APPENDED_PAYLOAD_FOOTER_BYTES = 12;

export const MAX_STEGO_PIXELS = 16_000_000;
export const MAX_STEGO_DIMENSION = 16_384;
export const MAX_STEGO_PAYLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_STEGO_EMBEDDED_BYTES = MAX_STEGO_PAYLOAD_BYTES + 2048;

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

export function readCarrierDimensions(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error('image');
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length >= 24 && pngSignature.every((byte, index) => bytes[index] === byte) &&
      bytes[12] === 0x49 && bytes[13] === 0x48 &&
      bytes[14] === 0x44 && bytes[15] === 0x52) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { format: 'png', width: view.getUint32(16, false), height: view.getUint32(20, false) };
  }

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('image');

  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('image');
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) throw new Error('image');
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) throw new Error('image');
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (segmentLength < 7) throw new Error('image');
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return { format: 'jpeg', width, height };
    }
    offset += segmentLength;
  }
  throw new Error('image');
}

export function carrierDimensionsMatch(format, width, height, bitmapWidth, bitmapHeight) {
  return (bitmapWidth === width && bitmapHeight === height) ||
    (format === 'jpeg' && bitmapWidth === height && bitmapHeight === width);
}

export function createAppendedPayloadFooter(payloadLength) {
  if (!Number.isSafeInteger(payloadLength) || payloadLength <= 0 || payloadLength > 0xffffffff) {
    throw new Error('capacity');
  }
  const footer = new Uint8Array(APPENDED_PAYLOAD_FOOTER_BYTES);
  new DataView(footer.buffer).setUint32(0, payloadLength, false);
  footer.set(APPENDED_PAYLOAD_MAGIC, 4);
  return footer;
}

export async function extractAppendedPayload(file) {
  if (!(file instanceof Blob) || file.size < APPENDED_PAYLOAD_FOOTER_BYTES) {
    throw new Error('stegoformat');
  }
  const footer = new Uint8Array(await file.slice(-APPENDED_PAYLOAD_FOOTER_BYTES).arrayBuffer());
  if (!APPENDED_PAYLOAD_MAGIC.every((byte, index) => footer[index + 4] === byte)) {
    throw new Error('stegoformat');
  }
  const payloadLength = new DataView(footer.buffer, footer.byteOffset, footer.byteLength).getUint32(0, false);
  const payloadStart = file.size - APPENDED_PAYLOAD_FOOTER_BYTES - payloadLength;
  if (!payloadLength || payloadLength > MAX_STEGO_EMBEDDED_BYTES || payloadStart < 0) {
    throw new Error('stegoformat');
  }
  return new Uint8Array(await file.slice(payloadStart, file.size - APPENDED_PAYLOAD_FOOTER_BYTES).arrayBuffer());
}

function opaquePixelCount(pixels) {
  let count = 0;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if (pixels[offset] === 255) count++;
  }
  return count;
}

function capacityForOpaquePixels(count) {
  return Math.max(0, Math.floor((count * 3 - HEADER_BYTES * 8) / 8));
}

export function getStegoCapacity(pixelsOrCount) {
  if (pixelsOrCount instanceof Uint8ClampedArray) {
    if (pixelsOrCount.length % 4 !== 0) throw new Error('pixels');
    return capacityForOpaquePixels(opaquePixelCount(pixelsOrCount));
  }
  if (!Number.isSafeInteger(pixelsOrCount) || pixelsOrCount < 0) throw new Error('pixels');
  return capacityForOpaquePixels(pixelsOrCount);
}

function createChannelReader(pixels) {
  let pixelIndex = 0,channel = 0;
  return () => {
    while (pixelIndex < pixels.length / 4 && pixels[pixelIndex * 4 + 3] !== 255) {
      pixelIndex++;
      channel = 0;
    }
    if (pixelIndex >= pixels.length / 4) throw new Error('stegoformat');
    const index = pixelIndex * 4 + channel;
    channel++;
    if (channel === 3) {
      pixelIndex++;
      channel = 0;
    }
    return index;
  };
}

export function embedPayload(pixels, payload) {
  if (!(pixels instanceof Uint8ClampedArray) || pixels.length % 4 !== 0 ||
      !(payload instanceof Uint8Array)) throw new Error('format');
  if (payload.length > 0xffffffff) throw new Error('capacity');
  const capacity = getStegoCapacity(pixels);
  if (payload.length > capacity) throw new Error('capacity');

  const header = new Uint8Array(HEADER_BYTES);
  header.set(MAGIC);
  new DataView(header.buffer).setUint32(4, payload.length, false);
  const bytes = new Uint8Array(HEADER_BYTES + payload.length);
  bytes.set(header);
  bytes.set(payload, HEADER_BYTES);

  const nextChannelIndex=createChannelReader(pixels);
  for (const byte of bytes) {
    for (let shift = 7; shift >= 0; shift--) {
      const channelIndex = nextChannelIndex();
      const bit = (byte >> shift) & 1;
      pixels[channelIndex] = (pixels[channelIndex] & 0xfe) | bit;
    }
  }
  return pixels;
}

export function extractPayload(pixels) {
  if (!(pixels instanceof Uint8ClampedArray) || pixels.length % 4 !== 0) {
    throw new Error('format');
  }
  const channelCount = opaquePixelCount(pixels) * 3;
  if (channelCount < HEADER_BYTES * 8) throw new Error('stegoformat');

  const nextChannelIndex=createChannelReader(pixels);
  const readBytes = length => {
    const bytes = new Uint8Array(length);
    for (let byteIndex = 0; byteIndex < length; byteIndex++) {
      let value = 0;
      for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
        const channelIndex = nextChannelIndex();
        value = (value << 1) | (pixels[channelIndex] & 1);
      }
      bytes[byteIndex] = value;
    }
    return bytes;
  };

  const header = readBytes(HEADER_BYTES);
  if (!MAGIC.every((byte, index) => header[index] === byte)) throw new Error('stegoformat');
  const payloadLength = new DataView(header.buffer).getUint32(4, false);
  if (payloadLength > MAX_STEGO_EMBEDDED_BYTES ||
      payloadLength > getStegoCapacity(pixels)) throw new Error('stegoformat');
  return readBytes(payloadLength);
}
