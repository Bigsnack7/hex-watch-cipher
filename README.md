<p align="center">
  <img src="assets/hex-watch.svg" alt="Hex Watch Cipher logo" width="88" />
</p>

<h1 align="center">Hex Watch Cipher</h1>

<p align="center">
  <strong>A Browser-Based Encryption & File Security Workspace</strong>
</p>

<p align="center">
  Built with the Web Crypto API to demonstrate practical cryptography, secure client-side engineering, and file integrity verification.
</p>

<p align="center">
  <a href="https://aecfe6fc.hexwatch.pages.dev">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-Try_Hex_Watch_Cipher-7C3AED?style=for-the-badge" alt="Try the live demo" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/Bigsnack7/hex-watch-cipher">Source Code</a>
  ·
  <a href="docs/PROJECT_GUIDE.md">Project Guide</a>
  ·
  <a href="https://github.com/Bigsnack7">GitHub Profile</a>
</p>

<p align="center">
  <img alt="Application backend" src="https://img.shields.io/badge/Application%20Backend-None-brightgreen.svg" />
  <img alt="Cryptography" src="https://img.shields.io/badge/Cryptography-Web%20Crypto%20API-orange.svg" />
  <img alt="PDF support" src="https://img.shields.io/badge/PDF%20Support-Bundled%20pdf--lib-blue.svg" />
  <img alt="Platform" src="https://img.shields.io/badge/Platform-Web%20Browser-4285F4.svg" />
</p>

---

## Overview

**Hex Watch Cipher** is a browser-based encryption and file-security application designed to explore practical cryptography, secure data handling, and client-side security engineering.

The application allows users to encrypt messages and files, verify file digests, generate and manage cryptographic keys, sign encrypted messages, and carry encrypted payloads inside supported media and document formats.

The application performs its cryptographic operations locally in the browser without intentionally sending messages, files, access keys, or private keys to an application backend.

### Design principles

- **Client-side processing:** Sensitive operations are performed in the browser.
- **Authenticated encryption:** AES-GCM is the recommended default for new passphrase-protected messages and file encryption.
- **Explicit security boundaries:** Legacy methods, compatibility limitations, and security trade-offs are documented.
- **Local runtime dependencies:** PDF support uses a bundled `pdf-lib` library rather than fetching a third-party library at runtime.
- **Practical security engineering:** The project includes automated tests, input validation, error handling, key-management workflows, and privacy-conscious interface behavior.

> **Live demo:** [Open Hex Watch Cipher](https://144a526b.hex-watch-cipher.pages.dev)

> **Security note:** This is a temporary Cloudflare Pages deployment. Use HTTPS on an origin you trust. Client-side encryption cannot protect secrets from compromised devices, malicious browser extensions, compromised application code, or a compromised hosting origin.

---

## Table of Contents

- [Features at a Glance](#features-at-a-glance)
- [Encryption Methods](#encryption-methods)
- [Quick Start](#quick-start)
- [Key Management](#key-management)
- [File Encryption and Integrity Verification](#file-encryption-and-integrity-verification)
- [Encrypted Payload Embedding](#encrypted-payload-embedding)
- [Digital Signatures](#digital-signatures)
- [Privacy and Security](#privacy-and-security)
- [Running Locally](#running-locally)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Technical Limits](#technical-limits)
- [Documentation](#documentation)
- [Security Scope](#security-scope)
- [Author](#author)

---

## Features at a Glance

| Feature | Description |
|---|---|
| Message encryption | AES-GCM, authenticated AES-CBC + HMAC compatibility mode, and RSA-OAEP encryption workflows |
| File encryption | Chunked AES-256-GCM encryption for files up to 1 GiB, with progress reporting |
| Hybrid encryption | AES-GCM combined with RSA-OAEP for recipient-based encryption |
| Digital signatures | ECDSA P-256 signatures for supported encrypted message tokens |
| File integrity | MD5, SHA-1, SHA-256, and SHA-512 digest calculation and comparison |
| Encrypted payload embedding | Carry encrypted text, files, or collections in PNG images, PDFs, audio, video, and other files |
| Key management | RSA encryption keys, ECDSA signing keys, SHA-256 public-key fingerprints, and optional PEM backups |
| Passphrase generation | Cryptographically random passphrases and a heuristic quality estimate |
| Workspace privacy | Five-minute inactivity lock that clears sensitive workspace state |
| Multilingual narration | Optional browser speech synthesis in English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, and French |
| Accessibility | Responsive interface, keyboard shortcuts, visible focus, and assistive-technology status updates |
| Automated testing | Node.js built-in test suite for crypto formats, tampering, hashing, attachments, and UI behavior |

---

## Encryption Methods

Hex Watch Cipher supports several encryption formats for different use cases.

| Method | Token format | Purpose |
|---|---|---|
| AES-GCM | `CT5.` (decrypts `CT4.` through `CT1.`) | Recommended for new passphrase-protected messages |
| AES-CBC + HMAC | `CBC5.` (decrypts `CBC4.` through `CBC1.`) | Authenticated compatibility mode; prefer AES-GCM for new messages |
| RSA-OAEP + AES-GCM | `RSA1.` | Hybrid encryption for ordinary-length messages sent to a recipient |
| RSA-OAEP + AES-GCM | `RSA6.` (decrypts `RSA5.` through `RSA3.`) | Dual-key workflow for short messages; requires a recipient private key and shared passphrase |
| Direct RSA-OAEP | `RSA2.` | Very short messages only |
| ECDSA signature envelope | `SIG1.` | Optional signature wrapping a supported encrypted message token |
| Legacy Grumpy v2 | Legacy format | Decryption/migration only; insecure and unsuitable for sensitive information |

### Cryptographic implementation

- AES-GCM provides authenticated encryption; each new passphrase-based message uses a random salt and IV.
- New `CT5.`, `CBC5.`, `RSA6.`, and file-encryption formats derive keys with Argon2id (128 MiB, three passes, one lane). The parameters are fixed by the format rather than chosen by token input.
- New CBC5 tokens use HKDF-SHA-256 to derive separate AES-256-CBC and HMAC-SHA-256 keys; the HMAC is verified before decryption.
- RSA hybrid encryption uses RSA-OAEP with SHA-256 to wrap a fresh AES-256-GCM key.
- AES-GCM offers 128-, 192-, and 256-bit derived keys; browser capability detection disables AES-192 when support cannot be confirmed.
- Older message and file formats remain supported for compatibility, including earlier PBKDF2-based and Argon2id-based versions.
- New file encryption authenticates each 4 MiB chunk. File and media payload encryption always use AES-256-GCM, independently of the selected message method.

**Recommendation:** Use AES-GCM for new passphrase-protected messages or RSA1 hybrid encryption when sending messages to a recipient. Avoid Grumpy v2 for sensitive information.

---

## Quick Start

1. Open the app from `localhost` or a trusted HTTPS site.
2. For a private message, leave **AES-GCM · Passphrase-based** selected, generate a long access key, enter a message, and choose **Encrypt message**. Share the token and access key separately.
3. To decrypt, paste the complete token, enter the matching key, and choose **Decrypt message**. Supported token prefixes select their decryption method automatically.
4. For recipient encryption, verify the recipient's RSA public-key fingerprint over a separate trusted channel, then use **AES-GCM + RSA-OAEP · Hybrid**. The recipient needs the matching private key.
5. Use the file controls to encrypt/decrypt files, the hash workbench to compare digests, or the media/file payload workspace to embed and recover encrypted payloads.

| Shortcut | Action |
|---|---|
| `Ctrl` / `⌘` + `Enter` | Encrypt the message |
| `Ctrl` / `⌘` + `Shift` + `Enter` | Decrypt the message |

Use the [Project Guide](docs/PROJECT_GUIDE.md) for detailed workflows, browser smoke tests, troubleshooting, and security limitations.

---

## Key Management

The application provides tools for generating and managing cryptographic keys and access phrases.

### Access keys

- Supports selected lengths of 16, 20, 24, 32, 40, or 64 Unicode code points for new password-based message and file encryption. RSA-only message encryption does not use this setting.
- Uses browser cryptographic randomness for generated passphrases.
- Applies a maximum of 4,096 UTF-8 bytes to access keys.
- Uses a separate key for the media/file payload workspace; manually entered keys must be at least 10 Unicode code points.
- Does not save generated passphrases for later recovery.
- Shows a heuristic quality estimate; this is not a password audit or a security guarantee.

### RSA and ECDSA keys

- Generate 2048-, 3072-, or 4096-bit RSA encryption keys and ECDSA P-256 signing keys.
- Inspect public-key fingerprints.
- Keep generated private keys non-extractable and in page memory by default.
- Export PEM backups only when explicitly requested during key generation. Imported RSA keys may be up to 8192 bits.

Private-key backups must be protected carefully. A valid signature proves possession of the corresponding signing key; it does not independently prove the real-world identity of the sender.

---

## File Encryption and Integrity Verification

### File encryption

The file-encryption workspace uses chunked AES-256-GCM encryption.

- Supports new file encryption up to **1 GiB**.
- Processes files in authenticated 4 MiB chunks.
- Uses a chunked `HWF5` binary header for new files (the compact token form uses the `HWF4.` prefix).
- Retains decryption support for older file formats; the oldest `HWF1` format is limited to 1 MiB.
- Avoids including original filenames and MIME types in the encrypted file format.
- Supports incremental saving through the File System Access API where available.

### File hashing

The hash workbench supports:

| Algorithm | Intended use |
|---|---|
| MD5 | Compatibility checks only |
| SHA-1 | Compatibility checks only |
| SHA-256 | Recommended for integrity comparisons |
| SHA-512 | Recommended for integrity comparisons |

Additional capabilities include:

- File selection and drag-and-drop.
- Expected-digest comparison with Match or Mismatch results.
- CSV export of digest reports.
- Background hashing using a same-origin Web Worker.
- Incremental MD5 processing to reduce memory use.

**Important:** A matching digest establishes equality between the calculated and expected values. It does not establish authenticity unless the expected digest comes from a trusted source.

---

## Encrypted Payload Embedding

The Media & File Payload Workspace carries encrypted payloads in supported files.

Payloads use authenticated AES-256-GCM encryption and a dedicated workspace access key.

| Carrier | Implementation | Important limitation |
|---|---|---|
| PNG | Embeds encrypted bytes in RGB least-significant bits of fully opaque pixels | Fragile concealment; image transformations may destroy the payload |
| JPEG | Converts the image to PNG before pixel embedding | Extraction requires the generated PNG |
| PDF | Adds an encrypted file attachment while retaining the PDF pages | Attachment visibility depends on the PDF viewer; rewriting can invalidate digital signatures |
| Audio and video | Appends encrypted bytes and an extraction footer to a copy | Trailing data may affect playback or compatibility |
| Other supported files | Appends encrypted payload data to a copy | This is not concealment and may affect file compatibility |

### Payload handling

- Supports plaintext payloads up to 4 MiB.
- Supports a single file or a collection of files and folders.
- Packages multiple files into an uncompressed ZIP archive.
- Supports up to 1,000 files in a collection.
- Requires the unchanged generated carrier and the correct workspace access key for extraction.
- Processes payloads locally without intentionally uploading carriers or payloads.

**Important distinction:** Embedding encrypted data in a file does not automatically make that data undetectable. PNG pixel embedding is a form of fragile concealment; PDF attachments and appended data are different mechanisms.

Opening a PDF does not automatically execute an attached `.bat` or `.exe` file. The application must explicitly extract and decrypt its encrypted payload before the original file can be saved.

---

## Digital Signatures

Hex Watch Cipher supports ECDSA P-256 digital signatures for supported encrypted message tokens.

Capabilities include:

- Generate or import ECDSA signing keys.
- Sign encrypted output using ECDSA P-256 and SHA-256.
- Wrap signed encrypted tokens in the `SIG1.` format.
- Verify signatures before decrypting signed messages.
- Verify a signature without decrypting the message.
- Check that the signing private key matches the displayed public key before releasing signed output.

Recipients should compare the complete SHA-256 public-key fingerprint through a separate trusted channel.

Digital signatures do not encrypt messages by themselves, provide replay protection, or prevent private-key theft.

---

## Privacy and Security

Privacy and clear security boundaries are central design considerations.

### Local processing

The application does not intentionally send messages, files, access keys, or private keys to an application backend or save them in browser storage.

### Workspace lock

The workspace lock clears sensitive fields after five minutes of tracked inactivity and during supported page lifecycle lock handling.

The lock is intended to reduce casual viewing. It is not an authentication boundary and cannot guarantee secure erasure.

### Error handling

Authenticated decryption failures use generic errors so incorrect keys and modified ciphertext are not distinguished. File I/O and signature failures can provide separate actionable errors.

### Security limitations

- Compromised devices and browsers can expose information before encryption or after decryption.
- Malicious browser extensions or compromised application code may access sensitive data.
- The workspace lock is not a substitute for device security.
- Digital signatures do not establish sender identity without trusted key verification.
- File hashes do not authenticate their source.
- The project has not been independently cryptographically audited.

Use HTTPS on an origin you trust and review the application's security model before processing sensitive information.

---

## Running Locally

Hex Watch Cipher is a static browser application. It does not require Node.js, an npm install, a bundler, or a build step to run; all browser runtime dependencies are included in the repository.

### Requirements

- A modern web browser with Web Crypto API support.
- Python for the simple local HTTP server.
- The project's original directory structure.

### Start the application

From the repository root, run:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000/
```

The application entry point is `index.html`.

Web Crypto generally requires HTTPS or localhost. Directly opening the application through a `file://` URL may not work.

## Deployment

The repository includes a root `_headers` file for Cloudflare Pages response headers. For Git integration, use the repository root, select **None** as the framework preset, set the build command to `exit 0`, and set the build output directory to `.`. For Direct Upload, include `index.html`, `_headers`, and the `css/`, `js/`, and `assets/` directories at the site root.

After deploying a reviewed commit, verify that the deployment corresponds to that commit, serves the expected files, and returns the intended HTTPS response headers. Check the browser console and Network panel for missing assets or CSP errors, then smoke-test encryption, decryption, file handling, and payload extraction. Never put secrets or private keys in the deployment.

The meta Content Security Policy cannot set `frame-ancestors`; configure that directive as an HTTP response header. See [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) and the [Direct Upload guide](https://developers.cloudflare.com/pages/get-started/direct-upload/).

---

## Testing

The application does not require Node.js to run, but Node.js is used for automated testing.

From the repository root:

```bash
npm ci
node --test
```

The suite covers:

- Current and legacy AES-GCM, CBC-HMAC, RSA, file-encryption, and signature formats.
- Malformed input, tampered ciphertext, wrong keys, key import/export, and Argon2id parameters.
- AES-GCM browser capability detection, passphrase generation/estimation, and file-hash behavior.
- PNG and appended-carrier framing, ZIP archives, and PDF attachment round-tripping.
- Error handling, CSP/local-processing policies, UI wiring, narration, and workspace locking.

Automated tests provide evidence of expected behavior but are not an independent cryptographic audit. The documented browser workflows should also be tested.

To regenerate the locally served Argon2id WebAssembly bundle from the pinned `hash-wasm` dependency, run:

```bash
npm run vendor:argon2
```

Review and test generated vendor changes before committing them. The browser uses the checked-in vendor asset at runtime and does not fetch packages from npm.

---

## Project Structure

```text
.
├── index.html                 App markup, controls, and CSP meta policy
├── css/
│   └── styles.css              Responsive styling and accessible states
├── js/
│   ├── app.js                  UI wiring and browser workflows
│   ├── crypto.mjs              Message-crypto facade
│   ├── crypto/                 AES, RSA, ECDSA, file crypto, and Argon2id
│   ├── ui/                     Narration and workspace-lock UI
│   ├── vendor/                 Locally served PDF and Argon2id bundles/licenses
│   └── *.mjs                   Hashing, payloads, errors, and other features
├── assets/                     Logo and application artwork
├── docs/
│   └── PROJECT_GUIDE.md        Detailed usage, architecture, and security guide
├── scripts/
│   └── vendor-argon2.mjs       Rebuilds the local Argon2id vendor bundle
├── tests/                      Node.js built-in test suite
├── _headers                    Cloudflare Pages response headers
├── package.json                Test and vendor-generation dependencies/scripts
└── README.md
```

The browser loads local same-origin assets. Modern cryptographic operations use the Web Crypto API; Argon2id runs through a locally bundled WebAssembly implementation in a same-origin worker. PDF attachments use the locally bundled `pdf-lib` library.

---

## Technical Limits

| Item | Limit |
|---|---|
| Plaintext message | 100,000 UTF-8 bytes |
| Encrypted text token | 140,000 characters |
| Signed `SIG1.` token | 200,000 characters |
| RSA/ECDSA PEM input | 20,000 characters |
| New passphrase-protected message/file key | Exactly the selected 16, 20, 24, 32, 40, or 64 Unicode code points; max 4,096 UTF-8 bytes |
| Media/file payload workspace key | At least 10 Unicode code points; max 4,096 UTF-8 bytes |
| New encrypted file | 1 GiB |
| File hashing | 256 MiB per file |
| Oldest `HWF1` file decryption | 1 MiB |
| Embedded plaintext payload | 4 MiB |
| PDF input for embedding | 32 MiB |
| Rewritten PDF output | 64 MiB |
| PNG/JPEG input for embedding | 16 megapixels, 16,384 pixels per side, and 32 MiB |
| Other non-PDF carrier files | 1 GiB |
| File collections | Up to 1,000 files |

RSA direct-encryption limits depend on the key size and message's UTF-8 byte length: 190 bytes for RSA-2048, 318 bytes for RSA-3072, and 446 bytes for RSA-4096. Direct RSA and RSA6 dual-key encryption are intended only for very short messages; use RSA1 hybrid encryption for longer messages.

---

## Documentation

The full project guide contains additional implementation details, operational guidance, troubleshooting information, and the security model.

**[Read the Full Project Guide](docs/PROJECT_GUIDE.md)**

Topics include:

- Encryption methods and passphrase handling.
- RSA keys and public-key fingerprints.
- Digital signatures and verification.
- File encryption and hash verification.
- Media and document payload embedding.
- Recommended workflows and limits.
- Accessibility and narration.
- Cloudflare Pages deployment.
- Automated tests and browser smoke tests.
- Architecture and implementation.
- Security model and HTTP response headers.

---

## Security Scope

Hex Watch Cipher is a **local encryption utility, not a secure messaging platform**.

It does not provide forward secrecy, key recovery, or remote key backup. Its security depends on the integrity of the application code, hosting origin, browser, device, and key-handling practices.

Review the [Security Model and Limitations](docs/PROJECT_GUIDE.md#security-model-and-limitations) before using the application with sensitive information.

---

## Author

**Oludemi Joshua**

- GitHub: [Bigsnack7](https://github.com/Bigsnack7)
- LinkedIn: [Oludemi Joshua](https://www.linkedin.com/in/oludemi-joshua-b6b59141b)
- Live Demo: [Hex Watch Cipher](https://144a526b.hex-watch-cipher.pages.dev)
---

<p align="center">
  <strong>Hex Watch Cipher</strong>
  <br />
  Practical cryptography. Local processing. Transparent security boundaries.
</p>
