# Hex Watch Cipher

Hex Watch Cipher is a browser-based tool for encrypting and decrypting messages and files on your own device. It combines password-based authenticated encryption, RSA public-key hybrid encryption, large-file encryption, and compatibility with an older legacy cipher in a dark purple workspace.

The application has no account system, application backend, cloud key storage, or recovery service. It uses the browser's native Web Crypto API and keeps cryptographic operations in the page.

> [!WARNING]
> **Encryption does not make a compromised device, browser, or hosting environment safe.** Use AES-256-GCM for new password-based messages, or verified RSA hybrid encryption when you need public-key encryption. Direct RSA is only for very short messages; use hybrid RSA for longer messages. Grumpy v2 encryption/decryption is available for legacy compatibility and testing only; it is cryptographically insecure and must never protect sensitive information. Choose a strong, unique passphrase and protect any exported private-key backup.

## Contents

- [What the project does](#what-the-project-does)
- [Encryption methods](#encryption-methods)
- [Encrypt and decrypt files](#encrypt-and-decrypt-files)
- [RSA keys and fingerprints](#rsa-keys-and-fingerprints)
- [Downloads, privacy, and workspace lock](#downloads-privacy-and-workspace-lock)
- [Usage](#usage)
- [Run locally](#run-locally)
- [Temporary Cloudflare Pages upload](#temporary-cloudflare-pages-upload)
- [Tests](#tests)
- [Project structure](#project-structure)
- [Security model and limitations](#security-model-and-limitations)
- [Deployment headers](#deployment-headers)

## What the project does

Hex Watch Cipher helps you protect a message or file before you share it through a separate channel. It produces a portable encrypted token or file locally in the browser. Depending on the chosen method, the recipient needs the same passphrase or the private key corresponding to the public key used for encryption.

The app is a local encryption workspace, not a messaging service. It does not send messages, manage contacts, verify identities for you, synchronize keys, or provide password or key recovery. You are responsible for safely exchanging passphrases, verifying public-key fingerprints, and storing any key backups.

## Encryption methods

| Method | Token format | Key input | Recommended use |
| --- | --- | --- | --- |
| **AES-GCM (128, 192, or 256-bit key)** | `CT2.` | A passphrase | Default choice for new password-based messages. 256-bit is recommended; authenticated encryption detects modification. Older `CT1.` AES-256-GCM tokens remain decryptable. |
| **AES-256-CBC + HMAC-SHA-256** | `CBC1.` | A passphrase | Compatibility with CBC-based workflows. Prefer AES-GCM for new messages. The HMAC is verified before decryption. |
| **RSA-OAEP direct (short messages only)** | `RSA2.` | Recipient's RSA public key | Encrypting a short message directly with RSA. Maximum size depends on the key: 190 UTF-8 bytes with 2048 bits, 318 with 3072 bits, or 446 with 4096 bits. Use hybrid RSA for longer messages. |
| **RSA-OAEP + AES-256-GCM hybrid** | `RSA1.` | Recipient's RSA public key | Encrypting a message for a recipient without sharing a message passphrase first. |
| **Grumpy v2** | Legacy text | A non-empty key | Encrypting/decrypting in the old format for compatibility/testing only. Insecure and unsuitable for protecting information. |

Direct RSA and hybrid RSA are separate methods. Direct RSA encrypts the entire short message with RSA-OAEP and uses `RSA2.` tokens. The hybrid method uses AES-GCM for the message and RSA-OAEP to protect its AES key, and uses `RSA1.` tokens. Prefer hybrid RSA for longer messages.

### AES-GCM (recommended password-based method)

Choose a 128-, 192-, or 256-bit AES-GCM key; 256 bits is recommended. The app normalizes the passphrase with Unicode NFKC, then derives the selected key size with PBKDF2-HMAC-SHA-256 using 600,000 iterations and a fresh, random 16-byte salt. The passphrase itself is not the AES key, so do not try to enter exactly 16, 24, or 32 characters. Character count does not reliably equal bytes, especially for Unicode, and short passwords remain vulnerable to guessing regardless of the AES key size. Each message uses a fresh random 12-byte IV. New `CT2.` tokens record the key size and authenticate it with the format identifier; decryption selects the recorded size automatically. Older `CT1.` tokens are still decrypted using their original AES-256-GCM format. Web Crypto checks the GCM authentication tag and rejects modified data or an incorrect passphrase without returning plaintext.

AES-GCM is the default because it provides confidentiality and integrity in one widely supported authenticated-encryption mode. It avoids having to compose encryption with a separate MAC, as required by the CBC compatibility mode. Random IVs make collisions extremely unlikely at the app's bounded usage, but randomness is not a mathematical uniqueness guarantee.

### AES-CBC with HMAC (compatibility mode)

The `CBC1.` mode derives separate AES and HMAC keys from the normalized passphrase and salt. It encrypts with AES-256-CBC and authenticates the format identifier, salt, IV, and ciphertext with HMAC-SHA-256. The app verifies the HMAC before attempting CBC decryption. Use this only when CBC compatibility is needed; AES-GCM is the preferred choice for new messages.

### RSA hybrid encryption

RSA is not used to encrypt the whole message. For every message, the app generates a random 256-bit AES key and a random 12-byte IV. AES-256-GCM encrypts the message, then RSA-OAEP with SHA-256 encrypts (wraps) the temporary AES key using the recipient's public key. The `RSA1.` token contains the wrapped-key length, wrapped key, IV, and authenticated ciphertext. The matching RSA private key unwraps the AES key and decrypts the message.

RSA keys must be 2048–8192 bits. Select **2048**, **3072**, or **4096 bits** under **RSA key size for generated keys** before generating a pair. The selected size applies to both direct and hybrid RSA key pairs generated in the app. 2048 bits is the recommended default for compatibility; larger keys increase key-generation and operation time. Pasted or imported keys keep their own size. Public keys use SPKI `PUBLIC KEY` PEM; private keys use PKCS#8 `PRIVATE KEY` PEM. Before encrypting, compare the displayed SHA-256 public-key fingerprint with the recipient using a separate trusted channel. A matching fingerprint shows that two key copies are identical; it does not prove the owner's identity.

### Direct RSA encryption (short messages only)

The direct RSA option encrypts the message itself with RSA-OAEP and SHA-256 and produces an `RSA2.` token. RSA-OAEP has a strict plaintext limit: the maximum is the RSA modulus size in bytes minus 66 bytes for SHA-256 padding. This gives limits of **190 UTF-8 bytes** with a 2048-bit key, **318 bytes** with a 3072-bit key, and **446 bytes** with a 4096-bit key (limits are bytes, not characters). The app checks the encoded message size before encryption and rejects messages that exceed the selected key's limit. Use the hybrid RSA method for longer messages.

### Legacy Grumpy v2

Grumpy v2 encryption and decryption are provided for compatibility with the old format and testing. Its key-derived stream has a very small effective key space, its output is deterministic for the same message and key, some characters pass through unchanged, and ciphertext is not authenticated. It therefore does not provide reliable confidentiality or tamper detection. A wrong key or altered ciphertext can produce plausible-looking but incorrect output without an error. The app permits creating legacy ciphertext, but clearly marks the method insecure. Never use it for new or sensitive information; choose AES-256-GCM instead. This mode accepts any non-empty key for compatibility and does not apply the modern password minimum.

After successfully decrypting a Grumpy v2 message, choose **Prepare AES-256-GCM migration** to move the recovered plaintext into the message field and select AES-GCM. The app clears the legacy access key; enter a new, strong access key and select **Encrypt message** to create a modern authenticated `CT2.` token. This is an explicit migration, not an in-place conversion: the old ciphertext and any copies remain insecure, so replace or securely remove them where practical. Verify the new token by decrypting it with the new access key before relying on it.

### Passphrase and text limits

- Minimum passphrase length for password-based encryption: **10 characters**. This minimum does not measure strength; use a long, unique, preferably randomly generated passphrase.
- Maximum passphrase size: **4,096 UTF-8 bytes**.
- Maximum plaintext message: **100,000 UTF-8 bytes**.
- Maximum encoded message token: **140,000 characters**.
- Maximum RSA PEM input: **20,000 characters**.
- Cryptographic formats and PBKDF2 work factors are fixed by the implementation; a token cannot select an arbitrary algorithm or KDF cost.

## Encrypt and decrypt files

File operations always use chunked AES-256-GCM and the **Access key**, regardless of the selected text method. New files use the binary `HWF2` format and support up to **1 GiB of plaintext**. The file is processed in 4 MiB chunks. Each chunk is authenticated; its nonce combines a random per-file prefix with a unique chunk counter, and its authentication data includes the file header and chunk index. The header stores a random salt, nonce prefix, and plaintext byte length. The encrypted file size is visible.

The app also decrypts files made with the earlier `HWF1.` format, which supports plaintext up to **1 MiB**. Original filenames and MIME types are not stored:

- Encrypted file: `encrypted-file.hwf2`
- Decrypted file: `decrypted-file.bin`

Where supported, the File System Access API writes large outputs incrementally. Other browsers fall back to preparing a Blob download and may require substantial memory. If a streamed decryption fails, the app attempts to abort the output; browser behavior can still leave an incomplete file if an abort fails. Treat downloaded plaintext files as sensitive.

## RSA keys and fingerprints

Select an RSA method to show the key controls.

- Choose **2048**, **3072**, or **4096 bits** in **RSA key size for generated keys**, then select **Generate selected-size RSA key pair**. This setting applies to generated keys only. 2048 bits is recommended for compatibility; larger sizes can take longer to generate and use.
- By default, the private key is non-extractable and stays in page memory. The app cannot export or recover it. It is cleared when the privacy lock activates, the page is navigated away from or unloaded, or the page is reloaded.
- **Exportable PEM** is an explicit alternative for a user-managed backup. The private PEM becomes visible in the page and can be copied. Anyone with it can decrypt messages addressed to that key; store it securely and never share it.
- Existing PKCS#8 private keys can be imported by pasting their PEM into the private-key field. Public keys can be pasted in SPKI PEM format.
- A SHA-256 fingerprint is calculated from the canonical SPKI encoding of the current public key. Verify it with the intended recipient over a separate trusted channel before encrypting.
- Replacing existing RSA key material prompts for confirmation. The app does not retain old private keys, rotate keys automatically, or re-encrypt previous messages.

The public key is not secret and is retained after a privacy lock. Private keys are not persisted in browser storage.

## Downloads, privacy, and workspace lock

After successful text encryption, **Download .txt** saves only the encrypted token as `encrypted-message.txt`; it does not include a passphrase or private key. Check that the result is encrypted before sharing or downloading it. Ciphertext from weak passphrases or the insecure legacy format is not made safe by downloading it.

The app does not intentionally transmit messages, files, passphrases, or private keys to an application server and does not store them in localStorage, sessionStorage, IndexedDB, or cookies. Browser Web Crypto performs the cryptographic operations. Loading the app from a website still requires downloading its same-origin page, scripts, styles, and images; compromised hosting can serve code that exposes data before encryption or after decryption.

Optional narration uses the browser's built-in speech synthesis to explain the selected method and controls. When narration is enabled, changing the RSA key-size selector announces the selected 2048-, 3072-, or 4096-bit size; the RSA method and key-generation guidance also reflect the selected size. Choose English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, or French from the narration-language menu; voice availability and pronunciation depend on the speech voices installed in the browser or operating system. Narration and optional sound effects run locally and do not send message contents or keys to a speech service. Audio features can be disabled with their controls.

After five minutes of inactivity, or when the page is being navigated away from or unloaded, the privacy lock clears access keys, private keys, messages, and results, stops narration and sound effects, and disables the workspace until the user continues with a fresh workspace. The RSA public key is retained. Switching to another tab alone does not trigger the page-lifecycle lock. The lock has no password and is not an authentication boundary; clearing JavaScript fields cannot guarantee secure erasure from browser memory.

## Usage

1. Open the app in a modern browser from `localhost` or an HTTPS origin.
2. Select an encryption method. AES-GCM is the default for passphrase-based messages. Choose 128, 192, or 256 bits in the AES-GCM key-size menu; 256 bits is recommended. This controls the derived AES key, not the number of passphrase characters.
3. For AES-GCM or CBC-HMAC, enter a long, unique access key. For direct RSA or RSA hybrid, paste and verify the recipient's public-key fingerprint instead. To generate your own RSA key pair, select its size (2048, 3072, or 4096 bits) before generating it; pasted/imported keys are unaffected. Direct RSA is limited to short messages; the access key is still used for files.
4. Enter a message and select **Encrypt message**. Share the resulting token and the required passphrase or private-key instructions through appropriate separate channels.
5. To decrypt, paste the complete token into the message field, provide the matching passphrase or private key, and select **Decrypt message**.
6. For legacy compatibility or testing, Grumpy v2 mode can encrypt a message or decrypt old ciphertext using a non-empty key. This cipher is insecure and does not report a wrong key or modified text reliably; never use it for sensitive messages. To migrate old text, decrypt it first, choose **Prepare AES-256-GCM migration**, enter a new, strong access key, and encrypt the recovered text. Do not reuse a weak legacy key.
7. Use the file controls to encrypt or decrypt a file with the access key. File encryption is always chunked AES-GCM.

The message field supports **Ctrl/⌘ + Enter** to encrypt and **Ctrl/⌘ + Shift + Enter** to decrypt. **Clear** clears the current message, result, and selected file; it does not delete downloaded files.

## Run locally

Use a modern browser with Web Crypto support. Web Crypto is generally available in secure contexts, including `localhost` and HTTPS. Opening the HTML directly from disk may not provide the required browser APIs.

No dependency installation or application backend is required. For example, with Python installed, run this command from the project folder:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000/>. You can also serve the static files with another local HTTP server.

## Temporary Cloudflare Pages upload

The project has been tested and temporarily hosted as a static site on Cloudflare Pages using its direct-upload workflow. This method does not require Git or a build step:

1. Sign in to the Cloudflare dashboard at <https://dash.cloudflare.com/>.
2. Open **Workers & Pages**, select **Create**, choose **Pages**, then choose **Upload assets**.
3. Enter a Pages project name. Cloudflare uses it for the site's `*.pages.dev` address.
4. Drag and drop the project folder containing `index.html`, `css/`, `js/`, and `assets/`. Ensure `index.html` is at the top level of the uploaded site—not inside an extra nested `CRYPT/` directory.
5. Select **Deploy** and wait for Cloudflare to finish publishing the static assets.
6. Open the provided Pages URL and test the page, encryption/decryption, and browser console. For later changes with direct upload, upload the updated site again.

This is a temporary/manual deployment workflow; it does not automatically publish later local changes. Treat the Pages URL as a public website: do not add secrets or private keys to the uploaded files. Browser-side encryption protects data only if the code delivered by the hosting origin is trustworthy.

## Tests

Tests use Node.js's built-in test runner; no test framework installation is required. Run the complete suite from the project folder:

```powershell
node --test tests\crypto.test.mjs tests\errors.test.mjs tests\session-lock.test.mjs tests\security-config.test.mjs tests\workspace-lock-ui.test.mjs tests\audio-guide.test.mjs
```

The regression tests cover AES-GCM, CBC-HMAC, direct and hybrid RSA, Grumpy v2 legacy-format encryption/decryption compatibility, HWF1/HWF2 file encryption, tampering, wrong keys, malformed and truncated tokens, RSA key validation and generation, safe error behavior, local-processing policy, UI wiring, narration, and the inactivity lock. Passing tests are not a substitute for an independent cryptographic security audit or testing in the browsers and devices where you intend to use the app.

The current automated regression suite contains 37 tests. In addition to this suite, the app has been exercised in a browser and temporarily published through Cloudflare Pages direct upload. These checks are useful validation, not a formal security audit or a guarantee that every browser and deployment configuration is defect-free.

## Project structure

```text
index.html
  Application markup, CSP meta policy, and icon declarations
css/
  styles.css                  Dark purple theme, responsive layout, focus states
js/
  app.js                      UI wiring, encryption flow, downloads, file handling
  crypto.mjs                  Compatibility re-export for crypto functions
  errors.mjs                  User-facing error handling and safe diagnostics
  session-lock.mjs            Testable inactivity timer
  crypto/
    aes-gcm.mjs               AES-GCM text encryption with 128-, 192-, and 256-bit derived keys
    aes-cbc-hmac.mjs          AES-CBC with encrypt-then-MAC authentication
    file-aes-gcm.mjs           Chunked HWF2 and legacy HWF1 file formats
    rsa-hybrid.mjs             Direct and hybrid RSA-OAEP encryption and key management
    legacy.mjs                 Grumpy v2 legacy-format encryption/decryption
    pem.mjs                    RSA PEM parsing and formatting
    shared.mjs                 Encoding, limits, KDF parameters, token helpers
  ui/
    audio.mjs                  Sound effects and narration
    workspace-lock.mjs         Privacy lock and page lifecycle behavior
assets/
  hex-watch.svg                Scalable app and favicon mark
  hex-watch-project.png        PNG favicon, touch icon, and project image
tests/
  *.test.mjs                   Crypto, UI, security-policy, and lifecycle tests
README.md
  Project documentation and security guidance
```

## Security model and limitations

Hex Watch Cipher helps protect encrypted token contents from someone who obtains a token but does not have the required passphrase or private key, assuming correct Web Crypto behavior, sound randomness, and an uncompromised browser and device. It is not a complete secure communications system.

- **Endpoint and code integrity:** Malware, a malicious extension, an unlocked device, compromised hosting, or modified application code may expose plaintext and keys.
- **Passphrase guessing:** PBKDF2 increases the cost of guesses but cannot compensate for a weak or reused passphrase. The 10-character minimum is not a strength score.
- **Metadata:** Token prefixes, formats, and approximate message/file sizes are visible.
- **Identity and secrecy properties:** Password encryption does not establish who created a message. RSA hybrid encryption does not sign messages. The app provides no forward secrecy, contact verification service, recovery service, or automatic key archival.
- **Key loss:** Losing a passphrase or a non-extractable private key can make messages unrecoverable. Exported private keys require secure user-managed backups.
- **Privacy lock:** It is intended to reduce casual viewing, not authenticate users or securely erase browser memory.
- **Legacy cipher:** Grumpy v2 encryption/decryption is available for compatibility/testing but is insecure and must not be used for sensitive data.
- **Operation duration:** Input sizes are bounded, but Web Crypto operations such as PBKDF2 cannot be reliably cancelled once started; the app does not promise a hard operation timeout.
- **Independent review:** Automated tests validate expected behavior, not the absence of every implementation or cryptographic defect. This project has not been independently audited.

## Deployment headers

For public hosting, serve the application over HTTPS from a trusted origin. The HTML includes a restrictive CSP meta policy, but response headers should also be configured by the host. In particular, `frame-ancestors` is effective only as an HTTP response header, not in a meta CSP. Send and verify headers such as:

```text
Content-Security-Policy: default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; media-src 'none'; connect-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
```

Keep scripts, styles, images, and fonts same-origin. Do not add inline scripts/styles, third-party assets, or remote dependencies without reviewing the CSP and privacy impact. After deployment, inspect the actual response headers and Network panel in browser developer tools. Initial same-origin asset requests are expected; encrypt/decrypt operations themselves should not initiate network requests.

For Cloudflare Pages static direct uploads, response headers can be configured with a plain-text `_headers` file placed in the uploaded site's root, then included in the upload. Cloudflare applies these rules to static asset responses; if using Pages Functions or a Worker later, configure headers in that runtime instead. Confirm the published HTML response actually includes the intended headers after deployment.
