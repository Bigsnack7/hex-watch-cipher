export const HASH_FILE_MAX_BYTES = 256 * 1024 * 1024;

export function isHashFileSizeAllowed(size) {
  return Number.isSafeInteger(size) && size >= 0 && size <= HASH_FILE_MAX_BYTES;
}

const MD5_SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];
const MD5_CONSTANTS = Array.from(
  { length: 64 },
  (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) | 0
);
const HASH_ALGORITHMS = {
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha512: 'SHA-512'
};

function digestToHex(words) {
  return words
    .flatMap(word => [0, 8, 16, 24].map(shift => (word >>> shift) & 0xff))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function createMd5() {
  const words = new Uint32Array(16);
  const state = [0x67452301 | 0, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476 | 0];
  const pending = new Uint8Array(64);
  let pendingLength = 0;
  let lengthLow = 0;
  let lengthHigh = 0;
  let finalized = false;

  const processBlock = (bytes, offset) => {
    for (let index = 0; index < 16; index++) {
      const position = offset + index * 4;
      words[index] = bytes[position]
        | (bytes[position + 1] << 8)
        | (bytes[position + 2] << 16)
        | (bytes[position + 3] << 24);
    }

    let [a, b, c, d] = state;
    for (let index = 0; index < 64; index++) {
      let mixed;
      let wordIndex;
      if (index < 16) {
        mixed = (b & c) | (~b & d);
        wordIndex = index;
      } else if (index < 32) {
        mixed = (d & b) | (~d & c);
        wordIndex = (5 * index + 1) % 16;
      } else if (index < 48) {
        mixed = b ^ c ^ d;
        wordIndex = (3 * index + 5) % 16;
      } else {
        mixed = c ^ (b | ~d);
        wordIndex = (7 * index) % 16;
      }
      const sum = (a + mixed + MD5_CONSTANTS[index] + words[wordIndex]) | 0;
      const shift = MD5_SHIFTS[index];
      const rotated = (sum << shift) | (sum >>> (32 - shift));
      const previous = d;
      d = c;
      c = b;
      b = (b + rotated) | 0;
      a = previous;
    }
    state[0] = (state[0] + a) | 0;
    state[1] = (state[1] + b) | 0;
    state[2] = (state[2] + c) | 0;
    state[3] = (state[3] + d) | 0;
  };

  const hasher = {
    update(input) {
      if (finalized) throw new Error('md5-finalized');
      let bytes;
      if (input instanceof Uint8Array) bytes = input;
      else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
      else if (ArrayBuffer.isView(input)) {
        bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      } else {
        throw new TypeError('md5-input');
      }

      const previousLengthLow = lengthLow;
      lengthLow = (lengthLow + bytes.length) >>> 0;
      lengthHigh = (lengthHigh + Math.floor(bytes.length / 0x100000000)
        + (lengthLow < previousLengthLow ? 1 : 0)) >>> 0;

      let offset = 0;
      if (pendingLength) {
        const copied = Math.min(64 - pendingLength, bytes.length);
        pending.set(bytes.subarray(0, copied), pendingLength);
        pendingLength += copied;
        offset = copied;
        if (pendingLength === 64) {
          processBlock(pending, 0);
          pendingLength = 0;
        }
      }
      while (offset + 64 <= bytes.length) {
        processBlock(bytes, offset);
        offset += 64;
      }
      if (offset < bytes.length) {
        pending.set(bytes.subarray(offset), 0);
        pendingLength = bytes.length - offset;
      }
      return hasher;
    },
    digest() {
      if (finalized) throw new Error('md5-finalized');
      finalized = true;
      const bitLengthLow = (lengthLow << 3) >>> 0;
      const bitLengthHigh = ((lengthHigh << 3) | (lengthLow >>> 29)) >>> 0;
      const finalLength = pendingLength < 56 ? 64 : 128;
      const finalBlocks = new Uint8Array(finalLength);
      finalBlocks.set(pending.subarray(0, pendingLength));
      finalBlocks[pendingLength] = 0x80;
      for (let offset = 0; offset < 4; offset++) {
        finalBlocks[finalLength - 8 + offset] = (bitLengthLow >>> (offset * 8)) & 0xff;
        finalBlocks[finalLength - 4 + offset] = (bitLengthHigh >>> (offset * 8)) & 0xff;
      }
      for (let offset = 0; offset < finalLength; offset += 64) processBlock(finalBlocks, offset);
      return digestToHex(state);
    }
  };
  return hasher;
}

function md5(buffer) {
  return createMd5().update(buffer).digest();
}

export async function computeDigest(algorithm, buffer, cryptoProvider = globalThis.crypto) {
  if (algorithm === 'md5') return md5(buffer);
  const webCryptoAlgorithm = HASH_ALGORITHMS[algorithm];
  if (!webCryptoAlgorithm) throw new Error('unsupported-hash-algorithm');
  const digest = await cryptoProvider.subtle.digest(webCryptoAlgorithm, buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
