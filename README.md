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

> **Live demo:** [Open Hex Watch Cipher](https://aecfe6fc.hexwatch.pages.dev)

> **Security note:** This is a temporary Cloudflare Pages deployment. Use HTTPS on an origin you trust. Client-side encryption cannot protect secrets from compromised devices, malicious browser extensions, compromised application code, or a compromised hosting origin.

---

## Table of Contents

- [Features at a Glance](#features-at-a-glance)
- [Encryption Methods](#encryption-methods)
- [Key Management](#key-management)
- [File Encryption and Integrity Verification](#file-encryption-and-integrity-verification)
- [Encrypted Payload Embedding](#encrypted-payload-embedding)
- [Digital Signatures](#digital-signatures)
- [Privacy and Security](#privacy-and-security)
- [Running Locally](#running-locally)
- [Testing](#testing)
- [Technical Limits](#technical-limits)
- [Documentation](#documentation)
- [Security Scope](#security-scope)
- [Author](#author)

---

## Features at a Glance

| Feature | Description |
|---|---|
| Message encryption | AES-GCM, AES-CBC + HMAC compatibility mode, and RSA-OAEP-based encryption workflows |
| File encryption | Chunked AES-256-GCM encryption for files up to 1 GiB |
| Hybrid encryption | AES-GCM combined with RSA-OAEP for recipient-based encryption |
| Digital signatures | ECDSA P-256 signatures for supported encrypted message tokens |
| File integrity | MD5, SHA-1, SHA-256, and SHA-512 digest calculation and comparison |
| Encrypted payload embedding | Carry encrypted payloads in PNG images, PDFs, audio, video, and other supported files |
| Key management | RSA encryption keys, ECDSA signing keys, public-key fingerprints, and optional PEM backups |
| Passphrase generation | Cryptographically random passphrase generation and a basic quality estimate |
| Workspace privacy | Inactivity-based clearing of sensitive interface state |
| Multilingual narration | Optional browser speech synthesis in English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, and French |
| Automated testing | Tests covering cryptographic formats, tampering, hashing, PDF attachments, and application behavior |

---

## Encryption Methods

Hex Watch Cipher supports several encryption formats for different use cases.

| Method | Token format | Purpose |
|---|---|---|
| AES-GCM | `CT2.` | Recommended for new passphrase-protected messages |
| AES-CBC + HMAC | `CBC2.` | Authenticated compatibility mode; also decrypts `CBC1.` |
| RSA-OAEP + AES-GCM | `RSA1.` | Hybrid encryption for ordinary-length messages sent to a recipient |
| RSA-OAEP + AES-GCM | `RSA3.` | Dual-key workflow requiring a recipient's RSA private key and a shared access key |
| Direct RSA-OAEP | `RSA2.` | Very short messages only |
| Legacy Grumpy v2 | Legacy format | Compatibility and testing only; not suitable for sensitive information |

### Cryptographic implementation

- AES-GCM provides authenticated encryption.
- RSA-OAEP wraps a randomly generated AES key in the hybrid encryption workflow.
- Password-based AES and RSA3 key derivation use PBKDF2-HMAC-SHA-256 with 600,000 iterations and a random salt.
- CBC compatibility tokens use encrypt-then-MAC authentication.
- New CBC2 tokens use HKDF-SHA-256 for key separation after PBKDF2-based derivation.
- Older `CT1.` message tokens and `HWF1.` file formats remain supported for compatibility.

**Recommendation:** Use AES-GCM for new passphrase-protected messages or RSA hybrid encryption when sending messages to a recipient. Avoid legacy Grumpy v2 for sensitive information.

---

## Key Management

The application provides tools for generating and managing cryptographic keys and access phrases.

### Access keys

- Supports selected lengths of 16, 20, 24, 32, 40, or 64 Unicode code points for new password-based message and file encryption.
- Uses browser cryptographic randomness for generated passphrases.
- Applies a maximum of 4,096 UTF-8 bytes to access keys.
- Uses a separate workspace access key for encrypted payload embedding.
- Does not save generated passphrases for later recovery.

### RSA and ECDSA keys

- Generate RSA encryption keys and ECDSA P-256 signing keys.
- Inspect public-key fingerprints.
- Keep generated private keys non-extractable and in page memory by default.
- Export PEM backups when explicitly requested during key generation.

Private-key backups must be protected carefully. A valid signature proves possession of the corresponding signing key; it does not independently prove the real-world identity of the sender.

---

## File Encryption and Integrity Verification

### File encryption

The file-encryption workspace uses chunked AES-256-GCM encryption.

- Supports new file encryption up to **1 GiB**.
- Processes files in authenticated 4 MiB chunks.
- Uses the `HWF2` format for new encrypted files.
- Retains decryption support for older `HWF1` files up to 1 MiB.
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
| PDF | Adds an encrypted HWF2 attachment while retaining the PDF pages | Attachment visibility depends on the PDF viewer; rewriting can invalidate digital signatures |
| Audio and video | Appends encrypted bytes and an extraction footer to a copy | Trailing data may affect playback or compatibility |
| Other supported files | Appends encrypted payload data to a copy | This is not concealment and may affect file compatibility |

### Payload handling

- Supports plaintext payloads up to 4 MiB.
- Supports a single file or a collection of files and folders.
- Packages multiple files into an uncompressed ZIP archive.
- Supports up to 1,000 files in a collection.
- Requires the exact generated carrier and the correct workspace access key for extraction.
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

Hex Watch Cipher is a static browser application and does not require a build step to run.

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

Keep the following directories and files in place:

```text
.
├── index.html
├── css/
├── js/
│   └── vendor/
│       └── pdf-lib.esm.min.js
├── assets/
├── docs/
├── _headers
└── README.md
```

This is an illustrative overview; retain the actual files and directories present in the repository.

Web Crypto generally requires HTTPS or localhost. Directly opening the application through a `file://` URL may not work.

### Cloudflare Pages deployment

The repository includes a root `_headers` file for configuring HTTP response headers.

After deploying a reviewed commit:

1. Confirm that the deployment serves the correct application files.
2. Verify the actual HTTPS response headers.
3. Check the Content Security Policy and other security headers.
4. Test encryption, decryption, file handling, and payload extraction in the deployed browser environment.

---

## Testing

The application does not require Node.js to run, but Node.js is used for automated testing.

From the repository root:

```bash
npm ci
node --test
```

The test suite covers:

- Cryptographic formats and malformed input.
- Tampered ciphertext and decryption failures.
- Key import and export.
- PDF attachment round-tripping.
- AES-GCM browser capability detection.
- Passphrase estimation.
- File hashing.
- Error handling.
- Narration and interface wiring.
- Local-processing behavior.
- Workspace privacy locking.

Automated tests provide evidence of expected behavior but are not an independent cryptographic audit. The documented browser workflows should also be tested.

---

## Technical Limits

| Item | Limit |
|---|---|
| Plaintext message | 100,000 UTF-8 bytes |
| Encrypted text token | 140,000 characters |
| Signed `SIG1.` token | 200,000 characters |
| RSA/ECDSA PEM input | 20,000 characters |
| New encrypted file | 1 GiB |
| File hashing | 256 MiB per file |
| Legacy `HWF1` decryption | 1 MiB |
| Embedded plaintext payload | 4 MiB |
| PDF input for embedding | 32 MiB |
| Rewritten PDF output | 64 MiB |
| PNG/JPEG input for embedding | 16 megapixels, 16,384 pixels per side, and 32 MiB |
| Other non-PDF carrier files | Up to 1 GiB |
| File collections | Up to 1,000 files |

RSA direct-encryption limits depend on the key size and message's UTF-8 byte length. Direct RSA encryption is intended for very short messages.

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
- Live Demo: [Hex Watch Cipher](https://aecfe6fc.hexwatch.pages.dev)

---

<p align="center">
  <strong>Hex Watch Cipher</strong>
  <br />
  Practical cryptography. Local processing. Transparent security boundaries.
</p>
