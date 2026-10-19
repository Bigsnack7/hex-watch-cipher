<p align="center">
  <img src="assets/hex-watch.svg" alt="Hex Watch Cipher logo" width="88" />
</p>

<h1 align="center">Hex Watch Cipher</h1>

> **What it is:** A browser-based workspace for encrypting messages and files, and checking file digests.<br>
> **What it demonstrates:** Practical cryptography with the Web Crypto API, accessible interface design, and secure client-side engineering.<br>
> **Key design decisions:** Keep sensitive operations on-device, use authenticated encryption by default, avoid a backend and runtime dependencies, and clearly mark legacy or limited methods.

<p align="center">
  <img alt="No backend" src="https://img.shields.io/badge/backend-none-brightgreen.svg" />
  <img alt="No dependencies" src="https://img.shields.io/badge/dependencies-none-brightgreen.svg" />
  <img alt="Web Crypto API" src="https://img.shields.io/badge/crypto-Web%20Crypto%20API-orange.svg" />
</p>

## At a glance

- **Encrypt text locally:** AES-GCM for passphrase-based messages, RSA-OAEP hybrid for recipients, plus clearly limited compatibility modes.
- **Protect files:** Chunked AES-256-GCM file encryption supports files up to 1 GiB.
- **Check file integrity:** Calculate and compare local MD5, SHA-1, SHA-256, or SHA-512 digests; export results as CSV.
- **Verify signed messages:** Optionally sign encrypted tokens with ECDSA P-256 and verify a signature before decryption.
- **Manage keys deliberately:** Generate RSA encryption and ECDSA signing keys, inspect public-key fingerprints, and choose non-extractable memory-only keys or explicit PEM backups.
- **Get usable guidance:** Generate passphrases, enforce a selected length for new password-based encryption, view an estimate (not an audit), and optionally hear multilingual narration.
- **Handle legacy data:** Decrypt supported older formats and migrate Grumpy v2 messages. Grumpy v2 is insecure and is for compatibility only.

> [!CAUTION]
> Use AES-GCM for new passphrase-protected messages or verified RSA hybrid encryption for a recipient. Direct RSA is only for very short messages. Never use Grumpy v2 to protect sensitive information. Client-side encryption cannot protect data from a compromised device, browser, application code, or hosting origin.

## Try it locally

No package install, build step, or application backend is needed. Web Crypto generally requires `localhost` or HTTPS; directly opening the page as a `file://` URL may not work.

```sh
python -m http.server 8000
```

Open <http://localhost:8000/>.

The application page is `index.html`. Keep its sibling `css/`, `js/`, and `assets/` directories in place when serving or deploying it. Cloudflare Pages deployments should include the root [`_headers`](_headers) file; it configures the security response headers, including `frame-ancestors`, which a CSP meta tag cannot enforce. Deploy a reviewed commit and verify the actual HTTPS response headers after publication.

## Choose an encryption method

| Method | Output | Key material | Recommended use |
| --- | --- | --- | --- |
| **AES-GCM · Passphrase-based** | `CT2.` | Long, unique access key | Recommended for new passphrase-protected messages. Supports 128-, 192-, or 256-bit derived AES keys when the browser's Web Crypto implementation supports the selected size; 256-bit is selected by default. |
| **AES-CBC + HMAC · Compatibility** | `CBC1.` | Long, unique access key | For compatibility. Encrypt-then-MAC authenticates the ciphertext; prefer AES-GCM for new messages. |
| **AES-GCM + RSA-OAEP · Hybrid** | `RSA1.` | Recipient's RSA public key | Recommended for sending ordinary-length messages to a recipient. AES-GCM encrypts the message and RSA-OAEP wraps a fresh AES key. |
| **RSA-OAEP + AES-GCM · Dual-key** | `RSA3.` | Recipient RSA public key and access key | Short messages requiring both the recipient's private key and a shared passphrase. It remains limited by RSA's short-message capacity. |
| **RSA-OAEP · Direct** | `RSA2.` | Recipient's RSA public key | Very short messages only; the limit depends on RSA key size and UTF-8 bytes. |
| **Grumpy v2 · Legacy only** | Legacy text | Legacy key | Selecting it requires confirmation. Compatibility and testing only; it provides no reliable confidentiality or tamper detection. Never use it for sensitive data. |

The app also decrypts older `CT1.` AES-GCM and `HWF1.` file formats. Signed message envelopes use `SIG1.` around supported encrypted message tokens; file encryption is not signed.

## Access keys and key sizes

For new AES-GCM, CBC-HMAC, RSA3, and file encryption, the access key must exactly match the selected length: 16, 20, 24, 32, 40, or 64 Unicode code points. The default is 24. The key is limited to 4,096 UTF-8 bytes. Decryption does not use the currently selected length, so old content can still be opened with its original key. RSA-only text encryption and Grumpy v2 are not subject to the selected access-key length.

**Generate secure passphrase** uses browser cryptographic randomness with rejection sampling to create a value with lowercase, uppercase, number, and symbol characters. Generated values are not saved or recoverable by the app. Store them securely before relying on them.

The live quality meter considers length, variety, repeated runs, and common sequences. It is a guide, not a password audit: it cannot detect reuse, breaches, personal information, or all predictable choices. Character groups are guidance and are not required by the encryption operation; selected length is enforced. Prefer a long, unique generated passphrase.

AES-GCM key-size options are the size of the derived AES key, not the passphrase length. The app checks browser support for AES-192-GCM and disables that option when Web Crypto does not support it; decryption of an existing AES-192 token may therefore require a different browser. Password-based AES and RSA3 derive keys with PBKDF2-HMAC-SHA-256 using 600,000 iterations and a random salt. AES-GCM uses authenticated encryption; a wrong key or modified token must not produce plaintext.

## Limits at a glance

| Item | Limit or behavior |
| --- | --- |
| Plaintext message | 100,000 UTF-8 bytes |
| Encrypted text token | 140,000 characters |
| Signed `SIG1.` token | 200,000 characters |
| RSA/ECDSA PEM key input | 20,000 characters |
| Access key for new password-based encryption | Exactly the selected supported length; maximum 4,096 UTF-8 bytes |
| New file encryption | 1 GiB plaintext maximum, processed in 4 MiB chunks |
| File hashing | 256 MiB per file; hashing runs in a Worker; SHA digests require full-file memory and MD5 is incremental |
| Legacy HWF1 file decryption | 1 MiB plaintext maximum |
| Direct RSA and RSA3 | Short-message capacity depends on RSA modulus size and UTF-8 byte length |

Direct RSA/RSA3 generated-key limits are 190 bytes for RSA-2048, 318 bytes for RSA-3072, and 446 bytes for RSA-4096. Imported key limits are based on the actual key, not the generated-key size selector. See the guide's [limits and behavior](docs/PROJECT_GUIDE.md#limits-and-behavior) section for all details.

## Digital signatures

Open **Digital signatures** to generate or paste ECDSA P-256 signing keys. Generated private keys are non-extractable and held in page memory by default. Choose **Exportable PEM** before generating a key only when a user-managed backup is needed; the private key becomes visible and must be kept secret. The setting applies to newly generated keys, not keys already in memory.

When **Sign encrypted output** is enabled, the app signs only the ciphertext token—the exact serialized encrypted message and its format data, not plaintext—with ECDSA P-256 / SHA-256 and wraps it in `SIG1.`. Before releasing the signed output, the app verifies it against the displayed public key. If the signing private key and displayed public key do not match, the app refuses the output and disables its download.

Recipients can choose **Verify signature only** to validate a token without decrypting it, or decrypt a signed token; signature verification happens first. The app distinguishes invalid public-key format, invalid signature, valid signature with decryption failure, and successful signed decryption. Compare the complete SHA-256 public-key fingerprint through a separate trusted channel: a valid signature proves possession of a key, not the identity of its owner. Signatures provide no replay protection—a valid signed token can be resent—and do not prevent key theft or encrypt by themselves.

## File encryption and hash checks

File encryption is separate from text-method selection. It always uses the access key and chunked AES-256-GCM, processing 4 MiB authenticated chunks. New files up to 1 GiB use HWF2. Earlier HWF1 files up to 1 MiB remain decryptable. Original filenames and MIME types are not included. Browsers with the File System Access save picker can save large files incrementally; other browsers may need substantial memory to prepare a download. Save-picker output is staged in a fresh transactional file and committed only after the complete operation succeeds. Failed operations abort the staged output; if the browser cannot abort it, the UI warns that any partial file must be removed and not used. Without the picker, output is held in memory and the download is created only after success.

The hash workbench reads selected files in the browser and supports:

| Digest | Purpose |
| --- | --- |
| MD5, SHA-1 | Compatibility only; not collision-resistant and not suitable for security-sensitive verification. |
| SHA-256, SHA-512 | Recommended for integrity comparisons, provided the expected digest comes from a trusted source. |

Select files by picker or drag and drop. Hashing runs in a same-origin Web Worker to keep the interface responsive. MD5 is incremental and processed in 4 MiB chunks; when it is the only selected algorithm, the Worker reads file slices instead of loading the entire file. Web Crypto SHA digests require the complete file in memory. Hashing is limited to 256 MiB per file to reduce memory pressure for SHA calculations. This hashing limit is separate from the 1 GiB file-encryption limit. MD5 runs in the Worker for compatibility but is not suitable for security-sensitive verification. Enter an expected digest to see **Match** or **Mismatch**; its algorithm is calculated even if that algorithm's output checkbox is off. A match only means the values are equal—it does not authenticate the source of the expected digest. Copy individual results or export the current report as CSV. Hashing does not encrypt, upload, or change a file.

## Workspace, narration, and privacy

Only one cryptographic operation runs at a time. Relevant controls are disabled while an operation is pending. Editing message/key inputs or changing relevant methods and key sizes invalidates stale message output and its download. **Clear** removes current message and result data, selected files, hash results, and file status, but does not clear the active access key or loaded keys.

The optional browser speech-synthesis feature supports English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, and French. It provides selected-method, control, operation, hash, and signature guidance; it does not read messages, keys, or decrypted output aloud. Voice availability depends on the browser and operating system.

The workspace lock clears sensitive fields after five minutes of tracked inactivity and during page lifecycle lock handling. It retains the RSA public key but clears private keys and other sensitive state. The lock has no password, is not an authentication boundary, and cannot guarantee secure erasure. It is distinct from **Clear** and does not delete files already downloaded.

The app does not intentionally send messages, files, access keys, or private keys to an application backend or save them in browser storage. Authenticated decrypt failures use a generic message- or file-specific failure so wrong keys and tampering are not distinguished; actionable file I/O and signature failures are reported separately. The browser still downloads the site code from its hosting origin; compromised application code, a browser extension, malware, or an unlocked device can access data before encryption or after decryption. Use HTTPS on an origin you trust.

## Tests

Requires Node.js. Run from the repository root; Node discovers the suite automatically on Windows, macOS, and Linux.

```sh
node --test
```

The built-in Node test runner has no package dependency. Tests cover the cryptographic formats, malformed and tampered input, key import/export, AES-GCM browser capability detection, passphrase estimation, hashing, safe error handling, narration and UI wiring, local-processing policy, and privacy locking. The suite is not an independent cryptographic audit; also run the browser workflows documented in the project guide.

## Detailed documentation

The [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md) contains the full technical and operational guide, including:

- [Encryption methods, formats, and passphrase handling](docs/PROJECT_GUIDE.md#encryption-methods)
- [RSA keys and fingerprints](docs/PROJECT_GUIDE.md#rsa-keys-and-fingerprints)
- [ECDSA digital signatures, matching-key checks, and verification outcomes](docs/PROJECT_GUIDE.md#digital-signatures-for-encrypted-messages)
- [File encryption](docs/PROJECT_GUIDE.md#file-encryption) and [file hash verification](docs/PROJECT_GUIDE.md#file-hash-calculator)
- [Recommended workflows, limits, and privacy behavior](docs/PROJECT_GUIDE.md#recommended-workflows)
- [Accessibility and narration](docs/PROJECT_GUIDE.md#narration)
- [Setup, deployment, and Cloudflare Pages](docs/PROJECT_GUIDE.md#run-and-deploy)
- [Automated tests and browser smoke-test checklist](docs/PROJECT_GUIDE.md#tests)
- [Troubleshooting](docs/PROJECT_GUIDE.md#troubleshooting)
- [Architecture and implementation overview](docs/PROJECT_GUIDE.md#implementation-overview)
- [Security model and recommended HTTP headers](docs/PROJECT_GUIDE.md#security-model-and-limitations)

## Security scope

This is a local encryption utility, not a secure messaging platform. Encryption does not provide forward secrecy, key recovery, or remote key backup. A signature identifies a signing key; compare its fingerprint through a trusted channel to associate it with a sender. The lock is only for reducing casual viewing. Review the [security model and limitations](docs/PROJECT_GUIDE.md#security-model-and-limitations) before using it with sensitive data.

## Author

**Oludemi Joshua** · [GitHub](https://github.com/Bigsnack7) · [LinkedIn](https://www.linkedin.com/in/oludemi-joshua-b6b59141b)
