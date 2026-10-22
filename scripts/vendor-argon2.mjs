import { copyFile } from 'node:fs/promises';

await copyFile(
  new URL('../node_modules/hash-wasm/dist/argon2.umd.min.js', import.meta.url),
  new URL('../js/vendor/hash-wasm-argon2.umd.min.js', import.meta.url)
);
await copyFile(
  new URL('../node_modules/hash-wasm/LICENSE', import.meta.url),
  new URL('../js/vendor/hash-wasm-argon2.LICENSE', import.meta.url)
);
