<p align="center">
  <img src="assets/hex-watch.svg" alt="Hex Watch Cipher logo" width="96" />
</p>

<h1 align="center">Hex Watch Cipher</h1>

<p align="center">
  A static, browser-based workspace for encrypting and decrypting text and files — entirely on your own device.
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  <img alt="No backend" src="https://img.shields.io/badge/backend-none-brightgreen.svg" />
  <img alt="No dependencies" src="https://img.shields.io/badge/dependencies-none-brightgreen.svg" />
  <img alt="Web Crypto API" src="https://img.shields.io/badge/crypto-Web%20Crypto%20API-orange.svg" />
  <img alt="Status" src="https://img.shields.io/badge/status-active-success.svg" />
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="#security-model-and-limitations">Security Model</a> ·
  <a href="#run-and-deploy">Deploy</a> ·
  <!-- Replace with your published Cloudflare Pages URL once the site is live -->
  <a href="#">Live Demo</a>
</p>

---

Hex Watch Cipher offers password-based AES encryption, RSA public-key encryption, chunked file encryption, legacy-format compatibility, multilingual narration, and a privacy lock — all running client-side. It was built as a hands-on cybersecurity project to demonstrate applied cryptography and secure front-end engineering practices.

Modern encryption and decryption run in the browser through the Web Crypto API; **Grumpy v2** is a separate legacy JavaScript cipher retained only for backward compatibility. There is no application backend, account system, remote key storage, or recovery service. This is a utility for producing encrypted data to share through a separate channel — it is **not** a messaging service, and it does not verify who you are communicating with.

> [!CAUTION]
> **Use AES-GCM for new password-protected messages, or verified RSA hybrid encryption when encrypting to a recipient's public key.** Direct RSA is suitable only for very short messages. The legacy Grumpy v2 cipher is insecure and must not be used to protect sensitive information. Browser-side encryption cannot protect data from a compromised device, browser, application code, or hosting origin.

## Contents

- [Features](#features)
- [Encryption methods](#encryption-methods)
- [Text encryption details](#text-encryption-details)
- [RSA keys and fingerprints](#rsa-keys-and-fingerprints)
- [File encryption](#file-encryption)
- [Narration and sound](#narration-and-sound)
- [Quick start](#quick-start)
- [Limits and behavior](#limits-and-behavior)
- [Privacy and workspace lock](#privacy-and-workspace-lock)
- [Run and deploy](#run-and-deploy)
- [Tests](#tests)
- [Project layout](#project-layout)
- [Security model and limitations](#security-model-and-limitations)
- [Recommended HTTP security headers](#recommended-http-security-headers)
- [License](#license)
- [Author](#author)

## Features

- Encrypt and decrypt text locally using AES-GCM, authenticated AES-CBC compatibility mode, RSA hybrid encryption, or direct RSA for short messages.
- Select a 128-, 192-, or 256-bit derived key for AES-GCM.
- Generate 2048-, 3072-, or 4096-bit RSA-OAEP key pairs, import and export RSA PEM keys, and compare SHA-256 public-key fingerprints.
- Encrypt files with chunked AES-256-GCM, including files up to 1 GiB; decrypt earlier HWF1 files up to 1 MiB.
- Copy results, download encrypted text tokens, and use supported browser save-file pickers for large file operations.
- Hear narration in English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, or French — voice availability depends on the browser's installed speech voices.
- Automatically clear sensitive workspace fields after inactivity or when the page is hidden by a page-lifecycle event.
- Responsive interface with keyboard shortcuts, operation status, progress updates, and accessible status announcements.

## Encryption methods

| Method in the app | Token / file format | Key material | Use |
| --- | --- | --- | --- |
| **AES-GCM · Password-based** | `CT2.` | Passphrase | Recommended for new password-protected text. Authenticated encryption detects a wrong passphrase or modified token. |
| **AES-CBC + HMAC · Compatibility** | `CBC1.` | Passphrase | For compatibility with CBC workflows. The HMAC is verified before decryption. Prefer AES-GCM for new messages. |
| **RSA Hybrid** | `RSA1.` | Recipient's RSA public key | For encrypting messages to a recipient without first sharing a passphrase. AES-GCM encrypts the message; RSA-OAEP wraps the message key. |
| **RSA · Short messages only** | `RSA2.` | Recipient's RSA public key | Direct RSA-OAEP encryption for very short text only. Use RSA Hybrid for longer messages. |
| **Grumpy v2 · Legacy (insecure)** | Legacy text | Non-empty legacy key | Compatibility and testing only. Does not provide reliable confidentiality or tamper detection. |

The two RSA Hybrid options shown in the method menu use the same hybrid-encryption implementation and `RSA1.` format; the "RSA1-compatible" label is retained for compatibility with the earlier selector. Neither RSA method signs messages.

**There is no AES-ECB option.** ECB reveals repeated plaintext patterns and is inappropriate for protecting messages. The AES-CBC compatibility option is not an unauthenticated mode: it uses encrypt-then-MAC with HMAC-SHA-256.

## Text encryption details

### AES-GCM

The AES-GCM selector offers **128, 192, and 256 bits**; 256 bits is the default and recommended option. These values describe the derived AES key, **not** the number of passphrase characters. The app normalizes passphrases with Unicode NFKC and derives the selected AES key using PBKDF2-HMAC-SHA-256 with 600,000 iterations and a fresh random 16-byte salt. Each message also gets a fresh random 12-byte IV.

New messages use the `CT2.` token format. The token records the selected key size, and the format and key size are authenticated as additional data. Decryption reads the size from the token automatically. Older `CT1.` AES-256-GCM tokens remain decryptable. Web Crypto authenticates the ciphertext before any plaintext is returned.

### AES-CBC with HMAC

The `CBC1.` compatibility format derives separate AES-256-CBC and HMAC-SHA-256 keys from the normalized passphrase. A fresh random salt and IV are used. The HMAC covers the format identifier, salt, IV, and ciphertext, and the app verifies it before attempting CBC decryption. AES-GCM remains the preferred choice for new messages.

### RSA Hybrid

RSA Hybrid uses a fresh random 256-bit AES key and 12-byte IV for each message. AES-256-GCM encrypts the message, then RSA-OAEP with SHA-256 wraps the temporary AES key using the recipient's public key. The `RSA1.` token contains the wrapped key, IV, and authenticated ciphertext. The matching RSA private key is required to unwrap the AES key and decrypt.

### Direct RSA

The `RSA2.` method encrypts the message itself with RSA-OAEP and SHA-256, without AES. Its plaintext limit is the RSA modulus size in bytes minus 66 bytes for OAEP padding. For the selectable generated-key sizes, the maximum plaintext is:

| RSA key size | Direct RSA maximum |
| ---: | ---: |
| 2048 bits | 190 UTF-8 bytes |
| 3072 bits | 318 UTF-8 bytes |
| 4096 bits | 446 UTF-8 bytes |

Limits are measured in UTF-8 **bytes**, not characters — multi-byte characters use more than one byte. The app checks the encoded length and rejects messages over the selected public key's limit. Use RSA Hybrid for longer content.

## RSA keys and fingerprints

When an RSA method is selected, the key controls appear. The generated-key size selector offers **2048, 3072, or 4096 bits**, with 2048 bits selected by default. Larger keys can take longer to generate and use. This selector only applies to key pairs generated in the app; pasted or imported keys keep their own size. Imported RSA keys must be at least 2048 bits and no more than 8192 bits.

Generated keys use RSA-OAEP with SHA-256. Public keys are displayed as SPKI `PUBLIC KEY` PEM; exportable private keys use PKCS#8 `PRIVATE KEY` PEM.

- By default, a generated private key is non-extractable and held only in page memory. It cannot be exported or recovered by the app, and it is lost when the workspace locks or the page closes/reloads.
- **Exportable PEM** allows a deliberate, user-managed private-key backup. The private key becomes visible in the page. Anyone who obtains it can decrypt messages addressed to it — store it securely and never share it.
- Paste a recipient's SPKI public key to encrypt for them. Paste the matching PKCS#8 private key to decrypt, or use a generated in-memory key.
- The displayed SHA-256 fingerprint is calculated from the canonical SPKI public-key encoding. Compare the complete fingerprint with the intended recipient over a separate trusted channel. A matching fingerprint proves the key copies are identical, not who owns the key.
- Replacing current RSA key material requires confirmation. The app does not retain old private keys, rotate keys automatically, or re-encrypt prior messages.

RSA encryption does not authenticate the sender, prove a public key's identity by itself, or provide forward secrecy. Fingerprint verification and private-key backup are the user's responsibility.

## File encryption

File operations always use the **Access key** and chunked AES-256-GCM, regardless of the selected text method or AES text key-size setting.

- New encrypted files use the binary `HWF2` format and support up to **1 GiB** of plaintext.
- Files are processed in **4 MiB chunks**. Every chunk is authenticated. The file header and chunk index are included in authenticated data, and a per-file nonce prefix is combined with a chunk counter.
- The HWF2 header contains a random salt, nonce prefix, and plaintext length. The encrypted file's approximate size is visible.
- Files from the earlier `HWF1.` format remain decryptable up to **1 MiB** of plaintext.
- Original filenames and MIME types are not stored. The default download names are `encrypted-file.hwf2` and `decrypted-file.bin`.
- Progress is reported during chunked operations. Where supported, files of 64 MiB or larger are saved incrementally using the browser's Save File picker. Other browsers prepare a Blob download and may require substantial memory.
- The file passphrase must be at least 10 characters. Use a long, unique passphrase — a minimum length is not a strength guarantee.

If streamed output fails, the app attempts to abort the incomplete save. Browser or filesystem behavior can still leave a partial file if aborting fails. Treat decrypted downloads as sensitive.

## Narration and sound

Narration is optional and uses the browser's built-in speech synthesis. Select a narration language in the header and turn narration on; it explains the selected method and relevant controls. With narration enabled, selecting an RSA key size announces the chosen 2048-, 3072-, or 4096-bit size, and the RSA method and key-generation guidance reflect that selection.

Available guide languages are **English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, and French**. Spoken voice availability and pronunciation depend on voices installed in the browser or operating system — if the browser has no usable speech voice, narration may be unavailable. Sound effects are optional and controlled separately. These features run locally; message content and keys are never sent to a speech service.

## Quick start

1. Open the app in a modern browser from `localhost` or an HTTPS origin.
2. Select an encryption method.
3. For AES-GCM, optionally choose 128, 192, or 256 bits — this sets the derived AES key size, not passphrase length. For AES-CBC + HMAC, use a long passphrase. For either RSA method, paste and verify a recipient public-key fingerprint, or generate a key pair (choose the generated RSA key size before generating).
4. Enter the message and select **Encrypt message**. The result is a token with a method-specific prefix. Share the encrypted token and the required passphrase or key instructions through appropriate, separate channels.
5. To decrypt, paste the complete token and provide the matching passphrase or private key. The app recognizes `CT2.`, older `CT1.`, `CBC1.`, `RSA1.`, and `RSA2.` text tokens and selects the corresponding method automatically.
6. Use the file controls to encrypt or decrypt a file with the access key — file operations always use AES-256-GCM.

Grumpy v2 messages do not use the modern token prefixes. Select the legacy method to decrypt old-format text. After successful decryption, **Prepare AES-256-GCM migration** moves the plaintext into the message field and clears the old access key. Enter a new strong passphrase and encrypt to create a modern `CT2.` token. This does not make the old ciphertext or its copies secure — remove or replace them where practical.

**Keyboard shortcuts**

| Shortcut | Action |
| --- | --- |
| `Ctrl` / `⌘` + `Enter` | Encrypt the message |
| `Ctrl` / `⌘` + `Shift` + `Enter` | Decrypt the message |

**Clear** clears the current message, result, and selected file from the workspace; it does not delete files already downloaded.

## Limits and behavior

| Input | Limit |
| --- | ---: |
| Plaintext message | 100,000 UTF-8 bytes |
| Encoded text token | 140,000 characters |
| Passphrase for password-based encryption | At least 10 characters; at most 4,096 normalized UTF-8 bytes |
| RSA PEM input | 20,000 characters |
| New file plaintext | 1 GiB |
| Earlier HWF1 file plaintext | 1 MiB |

Direct RSA has an additional key-dependent plaintext limit, described above. The application uses fixed token formats, algorithms, and KDF work factors — token data cannot choose an arbitrary algorithm or PBKDF2 iteration count.

## Privacy and workspace lock

The app does not intentionally transmit message contents, files, passphrases, or private keys to an application server. It does not persist them in `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. Cryptographic operations use the browser's Web Crypto API. A deployed website still supplies the HTML, scripts, styles, and images — a compromised hosting origin can deliver code that reads data before encryption or after decryption.

After five minutes of inactivity, or when a page-lifecycle `pagehide` event occurs, the workspace locks. Sensitive message and result fields, passphrases, and private keys are cleared; narration and sound effects stop; controls are disabled until the user resumes with a fresh workspace. The RSA public key is retained. Switching tabs alone does not necessarily trigger the lock. The lock has no password, is not an authentication boundary, and cannot guarantee secure erasure from browser memory.

Text-token downloads contain only the encrypted token — never the passphrase or private key. Check that output is encrypted before downloading or sharing it; downloading legacy ciphertext or ciphertext made with a weak passphrase does not make it safe.

## Run and deploy

### Run locally

No package installation, build step, or application backend is required — just a modern browser with Web Crypto support. Web Crypto generally requires a secure context, such as `localhost` or HTTPS; opening `index.html` directly from disk may not work.

With Python installed, start a static server in the project directory:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000/>. Any static HTTP server that serves the project files from their existing relative paths will work.

### Static hosting

The app can be deployed as static files. Upload `index.html` at the site root together with the `css/`, `js/`, and `assets/` directories — do not upload a nested project folder in a way that places the page one directory below the site root. Serve the site over HTTPS from an origin you trust.

For a manual Cloudflare Pages direct upload: create a Pages project, upload the static site assets with `index.html` at the root, deploy, then test the published site and its browser console. Manual uploads do not automatically publish later local changes — upload the updated files again after each change. Treat the deployed site as public and never put secrets or private keys in its files.

The page includes a restrictive CSP meta policy. Some protections, especially `frame-ancestors`, must be delivered as HTTP response headers — see [Recommended HTTP security headers](#recommended-http-security-headers).

## Tests

The project uses Node.js's built-in test runner and has no test-framework dependency. From the project directory, run:

```powershell
node --test tests\crypto.test.mjs tests\errors.test.mjs tests\session-lock.test.mjs tests\security-config.test.mjs tests\workspace-lock-ui.test.mjs tests\audio-guide.test.mjs
```

The suite covers AES-GCM key sizes and legacy tokens, CBC-HMAC, direct and hybrid RSA, RSA key generation and validation, Grumpy v2 compatibility, HWF1/HWF2 file encryption, tampering and malformed inputs, safe error behavior, local-processing policies, UI wiring, narration, and workspace locking. Passing tests establish expected behavior for tested cases; they are not a substitute for browser testing or an independent cryptographic audit.

## Project layout

```text
index.html                     Application markup and CSP meta policy
css/
  styles.css                   Responsive interface, theme, focus and status styling
js/
  app.js                       UI wiring, operations, downloads, and lock integration
  crypto.mjs                   Crypto API re-exports
  errors.mjs                   User-facing errors and safe diagnostics
  session-lock.mjs             Testable inactivity timer
  crypto/
    aes-gcm.mjs                AES-GCM text encryption and CT1 compatibility
    aes-cbc-hmac.mjs           CBC compatibility with encrypt-then-MAC
    file-aes-gcm.mjs           Chunked HWF2 and legacy HWF1 file formats
    rsa-hybrid.mjs             Direct/hybrid RSA-OAEP, PEM keys, and fingerprints
    legacy.mjs                 Grumpy v2 compatibility cipher
    pem.mjs                    RSA PEM parsing and formatting
    shared.mjs                 Encodings, limits, KDF settings, and token helpers
  ui/
    audio.mjs                  Narration, language guides, and sound effects
    workspace-lock.mjs         Inactivity and page-lifecycle privacy lock
assets/
  hex-watch.svg                SVG logo and favicon
  hex-watch-project.png        PNG app icon
tests/
  audio-guide.test.mjs         Narration behavior and language guides
  crypto.test.mjs              Text, RSA, file, and legacy crypto tests
  errors.test.mjs              Error mapping and safe diagnostics
  security-config.test.mjs     CSP, local-processing, and UI policy tests
  session-lock.test.mjs        Inactivity timer tests
  workspace-lock-ui.test.mjs   Workspace lock integration tests
```

## Security model and limitations

Hex Watch Cipher can protect encrypted text and file contents from someone who has only the token or encrypted file, provided the cryptography, randomness, browser, device, and delivered application code are trustworthy. It is not a complete secure communications system.

- **Endpoint and code integrity** — Malware, a malicious browser extension, an unlocked device, compromised hosting, or modified application code can expose plaintext or keys.
- **Passphrase guessing** — PBKDF2 makes guesses more expensive but cannot rescue a weak or reused passphrase. The 10-character minimum is not a strength score.
- **Metadata** — Token prefixes, formats, and approximate message or file sizes remain visible.
- **Identity and signatures** — Password encryption does not establish who created a message. RSA hybrid encryption does not sign messages; verify public-key fingerprints independently.
- **Forward secrecy** — The app does not provide forward secrecy, key rotation, automatic key archival, or key recovery.
- **Key loss** — A lost passphrase or non-extractable private key can make data unrecoverable. Exportable private-key backups require secure, user-managed storage.
- **Privacy lock** — The lock reduces casual exposure but is not authentication and does not securely erase browser memory.
- **Legacy mode** — Grumpy v2 is insecure and must not be used for sensitive information.
- **Availability** — Input sizes are bounded, but Web Crypto operations such as PBKDF2 cannot be reliably cancelled once started. The app does not guarantee a hard operation timeout.
- **Audit status** — Automated tests validate expected behavior, not the absence of all defects. This project has not been independently audited.

## Recommended HTTP security headers

Serve the app over HTTPS from a trusted origin. The page includes a CSP meta policy, but response headers should also be configured at the host — in particular, `frame-ancestors` only works in a CSP response header, not in a meta element.

Example response headers:

```text
Content-Security-Policy: default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; media-src 'none'; connect-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
```

Keep scripts, styles, images, and fonts same-origin. Review the privacy and CSP impact before adding inline code, remote dependencies, or third-party assets. After deployment, inspect the actual response headers and the browser Network panel — initial same-origin asset requests are expected, but encrypt/decrypt operations themselves should not initiate network requests.

For Cloudflare Pages, response headers can be configured in a plain-text `_headers` file at the uploaded site's root. If deploying through Pages Functions or a Worker, configure headers in that runtime instead. Verify the published HTML response contains the intended headers.

## License

This project is released under the [MIT License](LICENSE). 

## Author

**Oludemi Joshua**
[GitHub](https://github.com/Bigsnack7) · [LinkedIn](https://www.linkedin.com/in/oludemi-joshua-b6b59141b)

Built as part of a cybersecurity portfolio focused on applied cryptography, Blue Team practices, and secure engineering.
