import * as argon2Bundle from '../vendor/hash-wasm-argon2.umd.min.js';

export const ARGON2ID_MEMORY_KIB = 131_072;
export const ARGON2ID_ITERATIONS = 3;
export const ARGON2ID_PARALLELISM = 1;
export const LEGACY_ARGON2ID_MEMORY_KIB = 65_536;
export const LEGACY_ARGON2ID_ITERATIONS = 3;
export const ARGON2ID_PARAMETERS = Object.freeze({
  memorySize: ARGON2ID_MEMORY_KIB,
  iterations: ARGON2ID_ITERATIONS,
  parallelism: ARGON2ID_PARALLELISM
});
export const LEGACY_ARGON2ID_PARAMETERS = Object.freeze({
  memorySize: LEGACY_ARGON2ID_MEMORY_KIB,
  iterations: LEGACY_ARGON2ID_ITERATIONS,
  parallelism: ARGON2ID_PARALLELISM
});

const hashwasm = globalThis.hashwasm ?? argon2Bundle.default;

export async function deriveArgon2idBytes(
  password, salt, outputLength, parameters = ARGON2ID_PARAMETERS
) {
  if (!(password instanceof Uint8Array) || !(salt instanceof Uint8Array) ||
      salt.length !== 16 || ![16, 24, 32].includes(outputLength) ||
      ![ARGON2ID_PARAMETERS, LEGACY_ARGON2ID_PARAMETERS].some(allowed =>
        parameters?.memorySize === allowed.memorySize &&
        parameters?.iterations === allowed.iterations &&
        parameters?.parallelism === allowed.parallelism
      )) {
    password?.fill?.(0);
    throw new Error('format');
  }

  try {
    const result = await hashwasm.argon2id({
      password,
      salt,
      ...parameters,
      hashLength: outputLength,
      outputType: 'binary'
    });
    if (!(result instanceof Uint8Array) || result.length !== outputLength) {
      throw new Error('kdf');
    }
    return result;
  } catch {
    throw new Error('kdf');
  } finally {
    password.fill(0);
  }
}
