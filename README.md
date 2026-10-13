<p align="center">
  <img src="assets/hex-watch.svg" alt="Hex Watch Cipher logo" width="96" />
</p>

<h1 align="center">Hex Watch Cipher</h1>

<p align="center">
  A static, dependency-free browser workspace for encrypting and decrypting text and files on your own device.
</p>

<p align="center">
  <img alt="No backend" src="https://img.shields.io/badge/backend-none-brightgreen.svg" />
  <img alt="No dependencies" src="https://img.shields.io/badge/dependencies-none-brightgreen.svg" />
  <img alt="Web Crypto API" src="https://img.shields.io/badge/crypto-Web%20Crypto%20API-orange.svg" />
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="#recommended-workflows">Workflows</a> ·
  <a href="#security-model-and-limitations">Security Model</a> ·
  <a href="#run-and-deploy">Deploy</a>
</p>

---

Hex Watch Cipher is a static, client-side application for encrypting and decrypting messages and files. It offers password-based AES encryption, RSA public-key encryption, chunked file encryption, legacy-format compatibility, multilingual narration, optional interface sounds, and a privacy lock. It produces encrypted data for you to share through a separate channel; it is not a messaging service.

Modern encryption and decryption run in the browser through the Web Crypto API; **Grumpy v2** is a separate JavaScript cipher retained only for legacy compatibility. There is no application backend, account system, remote key storage, or recovery service. The app does not verify who you are communicating with.

> [!CAUTION]
> **Use AES-GCM for new password-protected messages, or verified RSA hybrid encryption when encrypting to a recipient's public key.** Direct RSA is suitable only for very short messages. The legacy Grumpy v2 cipher is insecure and must not be used to protect sensitive information. Browser-side encryption cannot protect data from a compromised device, browser, application code, or hosting origin.

## Contents

- [Features](#features)
- [Encryption methods](#encryption-methods)
- [Text encryption details](#text-encryption-details)
- [RSA keys and fingerprints](#rsa-keys-and-fingerprints)
- [File encryption](#file-encryption)
- [Narration and sound](#narration-and-sound)
- [Recommended workflows](#recommended-workflows)
- [Quick start](#quick-start)
- [Browser support and accessibility](#browser-support-and-accessibility)
- [Limits and behavior](#limits-and-behavior)
- [Privacy and workspace lock](#privacy-and-workspace-lock)
- [Run and deploy](#run-and-deploy)
- [Tests](#tests)
- [Troubleshooting](#troubleshooting)
- [Project layout](#project-layout)
- [Security model and limitations](#security-model-and-limitations)
- [Recommended HTTP security headers](#recommended-http-security-headers)
- [Author](#author)

## Features

- Encrypt and decrypt text locally using AES-GCM, authenticated AES-CBC compatibility mode, RSA hybrid encryption, or direct RSA for short messages.
- Select a 128-, 192-, or 256-bit derived key for AES-GCM.
- Generate 2048-, 3072-, or 4096-bit RSA-OAEP key pairs, import and export RSA PEM keys, and compare SHA-256 public-key fingerprints.
- Encrypt files with chunked AES-256-GCM, including files up to 1 GiB; decrypt earlier HWF1 files up to 1 MiB.
- Copy results and RSA PEM keys; download encrypted text tokens; and use supported browser save-file pickers for large file operations.
- Hear narration in English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, or French; voice availability depends on the browser's installed speech voices.
- Get narration for the selected encryption method, key sizes, focused controls, operation outcomes, validation failures, and the legacy migration handoff. Message contents, keys, and decrypted output are never read aloud.
- Automatically clear sensitive workspace fields after five minutes of inactivity or on a `pagehide` event. The lock requires no password and is designed only to reduce casual viewing.
- Prevent overlapping crypto operations and lock the related inputs while work is pending, so keys, methods, and source data cannot change mid-operation.
- Responsive interface with keyboard shortcuts, operation status, file progress, and screen-reader status announcements.

## Encryption methods

| Method in the app | Token / file format | Key material | Use |
| --- | --- | --- | --- |
| **AES-GCM · Passphrase-based (Recommended)** | `CT2.` | Passphrase | Recommended for new password-protected text. Authenticated encryption detects a wrong passphrase or modified token. |
| **AES-CBC + HMAC · Compatibility** | `CBC1.` | Passphrase | For compatibility with CBC workflows. The HMAC is verified before decryption. Prefer AES-GCM for new messages. |
| **AES-GCM + RSA-OAEP · Hybrid (Recommended)** | `RSA1.` | Recipient's RSA public key | For encrypting messages to a recipient without first sharing a passphrase. AES-GCM encrypts the message; RSA-OAEP wraps a fresh message key. |
| **RSA-OAEP + AES-GCM · Dual-key (short messages)** | `RSA3.` | Recipient's RSA public key and shared passphrase | RSA-OAEP encrypts the short message first; PBKDF2-derived AES-GCM then encrypts the RSA ciphertext. Decryption requires both the matching private key and the same passphrase. |
| **RSA-OAEP · Direct encryption (short messages)** | `RSA2.` | Recipient's RSA public key | Direct RSA-OAEP encryption for very short text only. Use AES-GCM + RSA-OAEP Hybrid for longer messages. |
| **Grumpy v2 · Legacy only (Insecure)** | Legacy text | Non-empty legacy key | Compatibility and testing only. Does not provide reliable confidentiality or tamper detection. |

The menu presents one option for each distinct construction; it no longer has duplicate RSA Hybrid entries. The app continues to decrypt older `RSA1.` tokens. RSA encryption does not sign messages.

**There is no AES-ECB option.** ECB reveals repeated plaintext patterns and is inappropriate for protecting messages. The AES-CBC compatibility option is not an unauthenticated AES mode: it uses encrypt-then-MAC with HMAC-SHA-256.

## Text encryption details

### AES-GCM

The AES-GCM selector offers **128, 192, and 256 bits**; 256 bits is the default and recommended option. These values describe the derived AES key, **not** the number of passphrase characters. The app normalizes passphrases with Unicode NFKC and derives the selected AES key using PBKDF2-HMAC-SHA-256 with 600,000 iterations and a fresh random 16-byte salt. Each message also gets a fresh random 12-byte IV.

New messages use the `CT2.` token format. The token records the selected key size, and the format and key size are authenticated as additional data. Decryption reads the size from the token automatically. Older `CT1.` AES-256-GCM tokens remain decryptable. Web Crypto authenticates the ciphertext before any plaintext is returned.

### AES-CBC with HMAC

The `CBC1.` compatibility format derives separate AES-256-CBC and HMAC-SHA-256 keys from the normalized passphrase. A fresh random salt and IV are used. The HMAC covers the format identifier, salt, IV, and ciphertext, and the app verifies it before attempting CBC decryption. AES-GCM remains the preferred choice for new messages.

### AES-GCM + RSA-OAEP Hybrid

RSA Hybrid uses a fresh random 256-bit AES key and 12-byte IV for each message. AES-256-GCM encrypts the message, then RSA-OAEP with SHA-256 wraps the temporary AES key using the recipient's public key. The `RSA1.` token contains the wrapped key, IV, and authenticated ciphertext. The matching RSA private key is required to unwrap the AES key and decrypt.

### RSA-first dual-key envelope

The `RSA3.` option uses the reverse data order and requires two independent pieces of key material. RSA-OAEP with SHA-256 encrypts the message first; passphrase-derived AES-256-GCM then encrypts the RSA ciphertext. A fresh 16-byte salt and 12-byte IV are used for the AES layer, and `RSA3` is authenticated as additional data. The passphrase is normalized with Unicode NFKC and processed with PBKDF2-HMAC-SHA-256 (600,000 iterations). Because the authenticated token lets an attacker test passphrase guesses offline, use a high-entropy passphrase.

Encryption requires the recipient's SPKI public key and a shared access-key passphrase; decryption requires both the matching PKCS#8/private key and the same passphrase. The RSA-first step means the original message remains limited by RSA-OAEP's short-message maximum: 190 UTF-8 bytes for RSA-2048, 318 for RSA-3072, or 446 for RSA-4096. Imported RSA keys up to 8192 bits are also accepted. Use `RSA1.` AES-GCM + RSA-OAEP Hybrid for ordinary-length messages. This format adds a passphrase gate; it does not strengthen RSA itself, authenticate the sender, or remove the need to protect both secrets.

### Direct RSA

The `RSA2.` method encrypts the message itself with RSA-OAEP and SHA-256, without AES. Its plaintext limit is the RSA modulus size in bytes minus 66 bytes for OAEP padding. For the selectable generated-key sizes, the maximum plaintext is:

| RSA key size | Direct RSA maximum |
| ---: | ---: |
| 2048 bits | 190 UTF-8 bytes |
| 3072 bits | 318 UTF-8 bytes |
| 4096 bits | 446 UTF-8 bytes |

Limits are measured in UTF-8 **bytes**, not characters — multi-byte characters use more than one byte. The app checks the encoded length and rejects messages over the selected public key's limit. Both direct RSA and RSA-first dual-key encryption are for short content; use AES-GCM + RSA-OAEP Hybrid for longer messages.

### Legacy Grumpy v2

Grumpy v2 is exposed only for old-format compatibility and testing. It does not use the modern authenticated token formats and does not provide reliable confidentiality or tamper detection. Use it only to read or reproduce legacy data; do not use it to protect new or sensitive information. After decrypting an old message, use the migration action to move the plaintext into the message field and re-encrypt it with AES-GCM and a new passphrase.

## RSA keys and fingerprints

When an RSA method is selected, the key controls appear. The generated-key size selector offers **2048, 3072, or 4096 bits**, with 2048 bits selected by default. Larger keys can take longer to generate and use. This selector only applies to key pairs generated in the app; pasted or imported keys keep their own size. Imported RSA keys must be at least 2048 bits and no more than 8192 bits.

Generated keys use RSA-OAEP with SHA-256. Public keys are displayed as SPKI `PUBLIC KEY` PEM; exportable private keys use PKCS#8 `PRIVATE KEY` PEM.

- By default, a generated private key is non-extractable and held only in page memory. It cannot be exported or recovered by the app and is lost when the workspace locks or the page closes/reloads.
- **Exportable PEM** allows a deliberate, user-managed private-key backup. The private key becomes visible in the page. Anyone who obtains it can decrypt messages addressed to it; store it securely and never share it.
- Paste a recipient's SPKI public key to encrypt for them. Paste the matching PKCS#8 private key to decrypt, or use a generated in-memory key.
- The displayed SHA-256 fingerprint is calculated from the canonical SPKI public-key encoding. Compare the complete fingerprint with the intended recipient using a separate trusted channel. A matching fingerprint proves the key copies are identical, not who owns the key.
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

Narration is optional and uses the browser's built-in speech synthesis. Select a narration language in the header and turn narration on. It follows the selected method and AES/RSA key sizes, explains focused controls, and announces message and file operation outcomes, validation failures, and legacy-migration instructions without reading message contents, keys, or decrypted output aloud. With narration enabled, selecting an RSA key size announces the chosen 2048-, 3072-, or 4096-bit size; the RSA method and key-generation guidance also reflect that selection. If speech playback fails, narration switches off and displays an error.

Available guide languages are **English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, and French**. Spoken voice availability and pronunciation depend on voices installed in the browser or operating system; a browser may synthesize speech with its default voice when a matching voice is unavailable. Sound effects are optional and controlled separately. Both features run locally; message content and keys are not sent to a speech service.

## Recommended workflows

### Password-protected message

1. Choose **AES-GCM · Passphrase-based (Recommended)** and select the desired derived-key size (256 bits is the default).
2. Enter a long, unique passphrase and the message, then select **Encrypt message**.
3. Share the complete `CT2.` token and passphrase separately. The passphrase is not included in the token.
4. To decrypt, paste the complete token and enter the same passphrase. `CT2.` and compatible older `CT1.` tokens are detected automatically; authenticated decryption rejects a wrong passphrase or altered token.

### Encrypting to an RSA recipient

1. The recipient creates an RSA key pair. The default private key is non-extractable and remains in that page's memory; to keep a user-managed backup, select exportable PEM before generating the pair and store the resulting private key securely.
2. The recipient shares the SPKI public key. The sender pastes it into the public-key field and compares its complete SHA-256 fingerprint with the recipient through a separate trusted channel.
3. The sender selects **AES-GCM + RSA-OAEP · Hybrid (Recommended)**, enters the message, and encrypts. Share the `RSA1.` token with the recipient; never send the private key.
4. The recipient pastes the token and uses the matching in-memory key or imports the matching PKCS#8 private-key PEM. RSA encryption does not authenticate the sender or sign the message.

For short messages where both RSA possession and a shared passphrase should be required, select **RSA-OAEP + AES-GCM · Dual-key**. The sender encrypts the message first with RSA-OAEP, then encrypts that RSA ciphertext with a passphrase-derived AES-GCM key. Share the `RSA3.` token and passphrase separately. The recipient needs both the matching private key and the passphrase. The RSA key size sets the short-message limit; this is not a longer-message alternative to the standard hybrid method.

For short messages where only the recipient private key is needed, **RSA-OAEP · Direct encryption** creates an `RSA2.` token, subject to the key-size-specific UTF-8 byte limit above.

### File

1. Select a file and enter a long access-key passphrase (at least 10 characters).
2. Select **Encrypt and download file** or **Decrypt and download file**. File operations always use chunked AES-256-GCM and the access key, regardless of the selected text method.
3. Share the encrypted file and access key separately. Decrypted files are sensitive. The app does not preserve the original filename or MIME type.

### Migrate an old Grumpy v2 message

1. Select **Grumpy v2 · Legacy only (Insecure)**, enter the legacy key, and decrypt the old ciphertext.
2. Select **Prepare AES-256-GCM migration**. The app puts the decrypted text back into the message field, selects AES-GCM, clears the old key, and asks for a new strong access key.
3. Encrypt the message to create a modern authenticated token. Re-encryption does not make any old ciphertext copies secure.

## Quick start

1. Open the app in a modern browser from `localhost` or an HTTPS origin.
2. Select an encryption method.
3. For AES-GCM, optionally choose 128, 192, or 256 bits — this sets the derived AES key size, not passphrase length. For AES-CBC + HMAC, use a long passphrase. For an RSA method, paste and verify a recipient public-key fingerprint, or generate a key pair (choose the generated RSA key size before generating). RSA3 dual-key encryption also requires a shared access-key passphrase.
4. Enter the message and select **Encrypt message**. The result is a token with a method-specific prefix. Share the encrypted token and the required passphrase or key instructions through appropriate, separate channels.
5. To decrypt, paste the complete token and provide the matching passphrase or private key. The app recognizes `CT2.`, older `CT1.`, `CBC1.`, `RSA1.`, `RSA2.`, and `RSA3.` text tokens and selects the corresponding method automatically. `RSA3.` decryption requires both the passphrase and the matching RSA private key.
6. Use the file controls to encrypt or decrypt a file with the access key — file operations always use AES-256-GCM.

Grumpy v2 messages do not use the modern token prefixes. Select the legacy method to decrypt old-format text. After successful decryption, **Prepare AES-256-GCM migration** moves the plaintext into the message field and clears the old access key. Enter a new strong passphrase and encrypt to create a modern `CT2.` token. This does not make the old ciphertext or its copies secure — remove or replace them where practical.

**Keyboard shortcuts**

| Shortcut | Action |
| --- | --- |
| `Ctrl` / `⌘` + `Enter` | Encrypt the message |
| `Ctrl` / `⌘` + `Shift` + `Enter` | Decrypt the message |

### Pending operations and clearing data

Message encryption/decryption, file encryption/decryption, and RSA key generation run as one operation at a time. While an operation is pending, the app disables the related controls—including keys, method and key-size selectors, source text, file selection, and key actions—so the inputs cannot change underneath it. Repeated clicks or keyboard shortcuts do not start another operation. File progress and operation status remain visible to assistive technology.

Use **Clear** when you want to remove the current message, result, selected file, and file status while continuing to use the current passphrase or RSA key. It does not cancel a pending operation, erase passphrases or private keys, remove a downloaded file, or securely wipe browser memory. The privacy lock clears sensitive fields and private-key material, invalidates pending UI results, and requires an explicit fresh-workspace resume. Do not rely on it as authentication or guaranteed secure erasure.

## Browser support and accessibility

Use a modern browser with the Web Crypto API. Browsers generally expose cryptographic APIs only in a secure context, such as `localhost` or HTTPS; direct `file://` use may not work. Speech synthesis, Web Audio sound effects, and the File System Access save picker are optional browser features. If the save picker is unavailable, downloads use a browser-generated Blob and may need substantial memory for large files.

The interface labels its controls, exposes operation, file, output, fingerprint, and lock updates through live status regions, and supports `Ctrl`/`⌘` + `Enter` to encrypt and `Ctrl`/`⌘` + `Shift` + `Enter` to decrypt. Narration is a separate convenience feature and does not replace screen-reader support or the visible status messages.

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

Inputs are validated before cryptographic processing where practical. User-facing failures do not expose arbitrary cryptographic implementation details. Text and file failures are announced through narration only when narration is enabled; the visible status remains available regardless. Web Crypto operations such as PBKDF2 cannot always be cancelled once started, although the workspace lock invalidates pending UI operations and clears sensitive data.

## Privacy and workspace lock

The app does not intentionally transmit message contents, files, passphrases, or private keys to an application server. It does not persist them in `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. Cryptographic operations use the browser's Web Crypto API. A deployed website still supplies the HTML, scripts, styles, and images — a compromised hosting origin can deliver code that reads data before encryption or after decryption.

After five minutes without a tracked interaction, or when a page-lifecycle `pagehide` event occurs, the workspace locks. Sensitive message and result fields, passphrases, and private keys are cleared; narration and sound effects stop; controls are disabled until the user explicitly resumes with a fresh workspace. The RSA public key is retained. Switching tabs alone does not necessarily trigger the lock. The lock has no password, is not an authentication boundary, and cannot guarantee secure erasure from browser memory.

Text-token downloads contain only the encrypted token, never the passphrase or private key. Check that output is encrypted before downloading or sharing it; downloading legacy ciphertext or ciphertext made with a weak passphrase does not make it safe.

## Run and deploy

### Run locally

No package installation, build step, or application backend is required. Use a modern browser with Web Crypto support. Web Crypto generally requires a secure context, such as `localhost` or HTTPS; opening `index.html` directly from disk may not work.

With Python installed, start a static server in the project directory:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000/>. Any static HTTP server that serves the project files from their existing relative paths will work.

The project has no `package.json`, runtime package installation, bundler, build step, database, or application server. Node.js is needed only if you want to run the automated tests.

### Static hosting

The app can be deployed as static files. Upload `index.html` at the site root together with the `css/`, `js/`, and `assets/` directories. Do not upload a nested project folder in a way that places the page one directory below the site root. Serve the site over HTTPS from an origin you trust.

For a manual Cloudflare Pages direct upload, create a Pages project, upload the static site assets with `index.html` at the root, deploy, then test the published site and its browser console. Manual uploads do not automatically publish later local changes; upload the updated files again after each change. Treat the deployed site as public and never put secrets or private keys in its files.

The page includes a restrictive CSP meta policy. Some protections, especially `frame-ancestors`, must be delivered as HTTP response headers; see [Recommended HTTP security headers](#recommended-http-security-headers).

## Tests

The project uses Node.js's built-in test runner and has no test-framework dependency. From the project directory, run:

```powershell
node --test tests\crypto.test.mjs tests\errors.test.mjs tests\session-lock.test.mjs tests\security-config.test.mjs tests\workspace-lock-ui.test.mjs tests\audio-guide.test.mjs
```

The suite covers AES-GCM key sizes and legacy tokens, CBC-HMAC, direct RSA, standard AES-GCM + RSA-OAEP hybrid encryption, RSA-first dual-key encryption, RSA key generation and validation, Grumpy v2 compatibility, HWF1/HWF2 file encryption, tampering and malformed inputs, safe error behavior, local-processing policies, UI wiring, narration, and workspace locking. Passing tests establish expected behavior for tested cases; they are not a substitute for browser testing or an independent cryptographic audit.

### Browser smoke-test checklist

Use a current browser on `localhost` or HTTPS. Keep any sample keys and passphrases temporary and do not use production secrets for testing.

1. Encrypt and decrypt an empty message and a Unicode message with AES-GCM. Confirm the `CT2.` token decrypts with the same passphrase and that a wrong passphrase, modified token, and malformed token fail without displaying plaintext.
2. Generate an RSA key pair and confirm the displayed SHA-256 fingerprint. For exportable keys, export and re-import the public/private PEM pair and confirm the fingerprint is unchanged. Test an RSA1 hybrid round trip and RSA3 dual-key round trip; verify RSA3 fails with a wrong passphrase or mismatched private key.
3. Encrypt and decrypt empty, small, and multi-chunk files. Compare the original and recovered bytes; also try a wrong passphrase and a modified or truncated encrypted file.
4. Start a password-based or RSA operation and verify relevant inputs and actions remain disabled while it is pending and become available afterward. Trigger the privacy lock during work, if practical, and confirm stale results are not restored when the workspace resumes.
5. Verify the keyboard shortcuts, visible status messages, narration controls if supported, and that selecting **Clear** removes message/file/output data without clearing the active key material.

### Troubleshooting

- **Web Crypto is unavailable:** open the app from `localhost` or an HTTPS origin in a supported browser.
- **A password-based operation rejects the key:** check that it is the same passphrase used for encryption, and that it meets the minimum and maximum limits. For authenticated formats, a wrong key and a modified token both cause decryption to fail.
- **RSA decryption fails:** confirm that the token format matches the operation and that the private key belongs to the public key used for encryption. Compare public-key fingerprints out of band before encrypting.
- **Narration is silent:** check that narration is on, browser speech is allowed, and a speech voice is available. Playback failures switch narration off and show a status message.
- **Large-file saving uses substantial memory:** this can occur in browsers without the Save File picker; use a browser that supports incremental file saving where available.
- **A workspace is locked:** select **Continue with a fresh workspace**. Cleared passphrases and private keys must be entered or imported again; non-extractable private keys cannot be recovered after clearing.

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
    rsa-hybrid.mjs             Direct, hybrid, and RSA3 dual-key RSA-OAEP modes
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

Serve the app over HTTPS from a trusted origin. The page includes a CSP meta policy, but configure response headers at the host as well. In particular, `frame-ancestors` only works in a CSP response header, not in a meta element.

Example response headers:

```text
Content-Security-Policy: default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; media-src 'none'; connect-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
```

Keep scripts, styles, images, and fonts same-origin. Review the privacy and CSP impact before adding inline code, remote dependencies, or third-party assets. After deployment, inspect the actual response headers and Network panel in your browser. Initial same-origin asset requests are expected; encrypt/decrypt operations themselves should not initiate network requests.

For Cloudflare Pages, response headers can be configured in a plain-text `_headers` file at the uploaded site's root. If deploying through Pages Functions or a Worker, configure headers in that runtime instead. Verify the published HTML response contains the intended headers.

## Author

**Oludemi Joshua**

[GitHub](https://github.com/Bigsnack7) · [LinkedIn](https://www.linkedin.com/in/oludemi-joshua-b6b59141b)

Built as part of a cybersecurity portfolio focused on applied cryptography, Blue Team practices, and secure engineering.
