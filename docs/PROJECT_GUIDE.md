<p align="center">
  <img src="../assets/hex-watch.svg" alt="Hex Watch Cipher logo" width="96" />
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

Hex Watch Cipher is a static, client-side security workspace for protecting text and files, checking file digests, and learning what the selected cryptographic options mean. It combines password-based encryption, recipient-oriented RSA encryption, chunked file encryption, legacy-message migration, optional multilingual narration, and a privacy lock in one responsive browser interface.

The app creates encrypted output for the user to transfer through a separate channel; it is not a messaging service. Modern encryption, decryption, and optional signing run in the browser through the Web Crypto API; **Grumpy v2** is a separate JavaScript cipher retained only for legacy compatibility. There is no application backend, account system, remote key storage, or recovery service. The app can verify a signature against a supplied public key but cannot independently establish who controls that key.

> [!CAUTION]
> **Use AES-GCM for new password-protected messages, or verified RSA hybrid encryption when encrypting to a recipient's public key.** Direct RSA is suitable only for very short messages. The legacy Grumpy v2 cipher is insecure and must not be used to protect sensitive information. Browser-side encryption cannot protect data from a compromised device, browser, application code, or hosting origin.

## Contents

- [Features](#features)
- [Encryption methods](#encryption-methods)
- [Text encryption details](#text-encryption-details)
- [AES-GCM key-size support](#aes-gcm-key-size-support)
- [RSA keys and fingerprints](#rsa-keys-and-fingerprints)
- [Digital signatures for encrypted messages](#digital-signatures-for-encrypted-messages)
- [File encryption](#file-encryption)
- [Image and media payload embedding](#image-and-media-payload-embedding)
- [File hash calculator](#file-hash-calculator)
- [Narration](#narration)
- [Recommended workflows](#recommended-workflows)
- [Quick start](#quick-start)
- [Browser support and accessibility](#browser-support-and-accessibility)
- [Limits and behavior](#limits-and-behavior)
- [Privacy and workspace lock](#privacy-and-workspace-lock)
- [Run and deploy](#run-and-deploy)
- [Tests](#tests)
- [Troubleshooting](#troubleshooting)
- [Project layout](#project-layout)
- [Implementation overview](#implementation-overview)
- [Security model and limitations](#security-model-and-limitations)
- [Recommended HTTP security headers](#recommended-http-security-headers)
- [Author](#author)

## Features

### Text protection and key management

- Encrypt and decrypt text with password-based AES-GCM, authenticated AES-CBC compatibility mode, RSA-OAEP hybrid encryption, direct RSA for short messages, or the RSA-first dual-key envelope.
- Generate 16-, 20-, 24-, 32-, 40-, or 64-character passphrases with the browser's cryptographic random-number generator. Generated values are checked against the same meter and returned only when that heuristic scores them 100. The meter gives a score and actionable suggestions based on selected length, character variety, repeated patterns/runs, and common sequences. It is only a rough estimate, not a password audit: character groups are not a requirement, and it cannot detect breached, reused, or personal passphrases. Generated values are not stored and must be saved securely by the user.
- Choose 128-, 192-, or 256-bit derived AES-GCM keys when supported by the browser's Web Crypto implementation. The app checks AES-192 support and disables that option if unavailable; decryption of existing AES-192 tokens may require a different browser. New tokens record the selected key size; older `CT1.` AES-256-GCM tokens remain supported.
- Generate 2048-, 3072-, or 4096-bit RSA-OAEP key pairs, import and export supported RSA PEM keys, and compare SHA-256 fingerprints of public keys.
- Optionally sign encrypted message tokens with ECDSA P-256 / SHA-256, and verify signatures independently or automatically before decryption. Signing checks the newly produced signature against the displayed public key before releasing the signed token, so a mismatched private/public pair cannot produce a misleading result. Narration reports signature, key-generation, and verification outcomes without reading key material aloud.
- Keep generated RSA private keys non-extractable in page memory by default, or explicitly choose exportable PEM when a user-managed backup is required.
- Copy results and public/private PEM keys when available, and download encrypted text tokens without including the passphrase or private key.
- Migrate decrypted Grumpy v2 text into the AES-GCM workflow. The legacy cipher is marked insecure and is not suitable for protecting new or sensitive content.

### File protection and integrity checking

- Encrypt files up to 1 GiB using 4 MiB chunks of authenticated AES-256-GCM; decrypt supported HWF1 legacy files up to 1 MiB.
- Carry encrypted text and files in a media/file payload workspace: PNG pixels provide fragile concealment, while video, audio, and other files receive an appended encrypted block that is not concealed.
- Preserve a single payload file in its original format; package multiple files or a folder as an uncompressed ZIP so paths can be recovered together.
- Use a separate file hash calculator for one or more local files. Select algorithms from MD5, SHA-1, SHA-256, and SHA-512, then compare the resulting digests with values obtained from a trusted source.
- Select files through the browser picker or drag-and-drop for hashing. File encryption and hashing remain separate operations.
- Report file progress and use the browser Save File picker for supported large-file operations; other browsers may need substantial memory to prepare downloads.

### Guidance, accessibility, and workspace behavior

- Hear optional narration in English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, or French. Available voices and pronunciation depend on the browser and operating system.
- Receive contextual narration for method and key-size changes, media-workspace mode, carrier and capacity changes, shared/separate key selection, operation outcomes, errors, and legacy migration. Message contents, keys, and decrypted output are never read aloud.
- Automatically clear sensitive workspace fields after five minutes of inactivity or on a `pagehide` event. This no-password privacy lock is intended to reduce casual viewing, not to authenticate users or guarantee secure erasure.
- Prevent overlapping cryptographic operations and disable relevant inputs while an operation is pending, so the active method, keys, and source data cannot change mid-operation.
- Use a responsive interface with visible keyboard focus, keyboard shortcuts, progress and operation status, and screen-reader status announcements.

## Encryption methods

| Method in the app | Token / file format | Key material | Use |
| --- | --- | --- | --- |
| **AES-GCM · Passphrase-based (Recommended)** | `CT2.` | Passphrase | Recommended for new password-protected text. Authenticated encryption detects a wrong passphrase or modified token. |
| **AES-CBC + HMAC · Compatibility** | `CBC1.` | Passphrase | For compatibility with CBC workflows. The HMAC is verified before decryption. Prefer AES-GCM for new messages. |
| **AES-GCM + RSA-OAEP · Hybrid (Recommended)** | `RSA1.` | Recipient's RSA public key | For encrypting messages to a recipient without first sharing a passphrase. AES-GCM encrypts the message; RSA-OAEP wraps a fresh message key. |
| **RSA-OAEP + AES-GCM · Dual-key (short messages)** | `RSA3.` | Recipient's RSA public key and shared passphrase | RSA-OAEP encrypts the short message first; PBKDF2-derived AES-GCM then encrypts the RSA ciphertext. Decryption requires both the matching private key and the same passphrase. |
| **RSA-OAEP · Direct encryption (short messages)** | `RSA2.` | Recipient's RSA public key | Direct RSA-OAEP encryption for very short text only. Use AES-GCM + RSA-OAEP Hybrid for longer messages. |
| **Grumpy v2 · Legacy only (Insecure)** | Legacy text | Non-empty legacy key | Encrypt/decrypt compatibility and testing only. Does not provide reliable confidentiality or tamper detection. |

The menu presents one option for each distinct construction; it no longer has duplicate RSA Hybrid entries. The app continues to decrypt older `RSA1.` tokens. Encryption methods do not sign messages by themselves; optional ECDSA signatures wrap supported encrypted tokens in the `SIG1.` format.

**There is no AES-ECB option.** ECB reveals repeated plaintext patterns and is inappropriate for protecting messages. The AES-CBC compatibility option is not an unauthenticated AES mode: it uses encrypt-then-MAC with HMAC-SHA-256.

## Text encryption details

### Passphrase generator and strength estimate

Select one of the supported access-key lengths: **16, 20, 24, 32, 40, or 64 Unicode code points** (24 by default). This setting applies to both generated and manually entered access keys used for new AES-GCM, CBC-HMAC, RSA3, and file encryption. The app blocks those operations unless the key has exactly the selected number of Unicode code points and is no more than 4,096 UTF-8 bytes. Decryption is not constrained by the current selection. RSA-only message encryption and legacy Grumpy v2 compatibility are not governed by this setting.

Select **Generate secure passphrase** to create a value with the required length. The app uses the browser's cryptographic random-number generator and rejection sampling, and guarantees lowercase, uppercase, numeric, and symbol characters. Generation requires Web Crypto in a secure context such as HTTPS or `localhost`. The generated passphrase fills the access-key field but is not saved, copied, or recoverable; store it securely before relying on it.

The access-key guidance checklist reports selected-length, lowercase, uppercase, number, and symbol requirements as you type. A separate smoothly updating quality meter considers progress toward the selected length, character variety, repeated runs, and common sequences. Naturally occurring duplicate characters are not penalized by themselves, so a generated passphrase meeting its length and character-group requirements can reach a full score. This remains a heuristic: it cannot recognize reused passwords, personal information, most keyboard patterns, or how a manually entered value was chosen, and is not a password audit or security guarantee. Prefer a long, unique generated value. The length setting gates new encryption; it does not change encryption algorithms or key derivation.

### AES-GCM

The AES-GCM selector offers **128, 192, and 256 bits** when supported by the browser; 256 bits is the default and recommended option. These values describe the derived AES key, **not** the number of passphrase characters. The app normalizes passphrases with Unicode NFKC and derives the selected AES key using PBKDF2-HMAC-SHA-256 with 600,000 iterations and a fresh random 16-byte salt. Each message also gets a fresh random 12-byte IV.

New messages use the `CT2.` token format. The token records the selected key size, and the format tag and key size are included as additional authenticated data (AAD), so decryption authenticates that metadata along with the ciphertext. The key size selects the derived key. Decryption reads the size from the token automatically. Older `CT1.` AES-256-GCM tokens remain decryptable. Web Crypto authenticates the ciphertext before any plaintext is returned.

### AES-GCM key-size support

Before enabling AES-192, the app asks the browser's Web Crypto API to generate a non-extractable AES-GCM key of that size. If Web Crypto reports the algorithm as unsupported, AES-192 stays disabled and the nearby hint explains why; AES-128 and AES-256 remain available. If support cannot be confirmed, the app fails closed and leaves AES-192 disabled.

Web Crypto support is browser-dependent. Chromium tested with this project rejects AES-192-GCM key generation with an `OperationError`, so the UI disables the option there rather than allowing encryption to fail later with a misleading authentication error. Other browser versions may differ. New `CT2.` tokens record their AES key size; if a browser does not support the recorded size, decrypt that token in a browser that does. Node.js test support does not guarantee support in a target browser.

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

Grumpy v2 encryption and decryption are exposed for old-format compatibility and testing. Selecting it displays a confirmation that must be accepted before the mode activates. Its weak key-derived stream, deterministic output, unchanged characters, and lack of authentication mean it does not provide reliable confidentiality or tamper detection; a wrong key or altered ciphertext may produce plausible-looking incorrect output without an error. Use it only to read or reproduce legacy data or for testing; do not use it to protect new or sensitive information. After decrypting an old message, use the migration action to move the plaintext into the message field and re-encrypt it with AES-GCM and a new passphrase.

## RSA keys and fingerprints

When an RSA method is selected, the key controls appear. The generated-key size selector offers **2048, 3072, or 4096 bits**, with 2048 bits selected by default. Larger keys can take longer to generate and use. This selector only applies to key pairs generated in the app; pasted or imported keys keep their own size. Imported RSA keys must be at least 2048 bits and no more than 8192 bits.

Generated keys use RSA-OAEP with SHA-256. Public keys are displayed as SPKI `PUBLIC KEY` PEM; exportable private keys use PKCS#8 `PRIVATE KEY` PEM.

- By default, a generated private key is non-extractable and held only in page memory. It cannot be exported or recovered by the app and is lost when the workspace locks or the page closes/reloads.
- **Exportable PEM** allows a deliberate, user-managed private-key backup. The private key becomes visible in the page. Anyone who obtains it can decrypt messages addressed to it; store it securely and never share it.
- Paste a recipient's SPKI public key to encrypt for them. Paste the matching PKCS#8 private key to decrypt, or use a generated in-memory key.
- The displayed SHA-256 fingerprint is calculated from the canonical SPKI public-key encoding. Compare the complete fingerprint with the intended recipient using a separate trusted channel. A matching fingerprint proves the key copies are identical, not who owns the key.
- Replacing current RSA key material requires confirmation. The app does not retain old private keys, rotate keys automatically, or re-encrypt prior messages.

RSA encryption does not authenticate the sender, prove a public key's identity by itself, or provide forward secrecy. Optional ECDSA signatures are described below. Fingerprint verification and private-key backup are the user's responsibility.

## Digital signatures for encrypted messages

Enable **Sign encrypted output** to wrap a newly encrypted message token in a `SIG1.` envelope signed with ECDSA P-256 and SHA-256. The signature covers only the ciphertext token—the exact serialized encrypted token and its format data—with a versioned application-specific context; it does not cover plaintext, alter the underlying encryption format, or apply to files or Grumpy v2. Signed envelopes can wrap `CT2.`, `CT1.`, `CBC1.`, `RSA1.`, `RSA2.`, and `RSA3.` text tokens. Older unsigned tokens and all existing encryption formats remain unchanged.

To sign, generate an ECDSA P-256 key pair or paste a PKCS#8 private signing key. Generated private keys are non-extractable and kept only in page memory by default; they are cleared when the workspace locks or the page closes. Choose **Exportable PEM** before generating if you need a user-managed backup. The private key is then visible in the page and must be stored securely. The export setting applies when generating the next key; it does not make an existing non-extractable key exportable. A lost non-extractable signing key cannot be recovered.

Before releasing a newly signed token, the app verifies the signature against the SPKI public key currently displayed. If verification fails because the private key does not match, the operation stops: the signed token is not placed in the output and its download is disabled.

To verify, paste the signer's SPKI public key, enter the `SIG1.` message, and either choose **Verify signature only** or decrypt it. Signature-only verification confirms the signature without decrypting the payload. Decryption verifies the signature before processing the inner token. Successful verification reports the signer's SHA-256 public-key fingerprint; successful signed decryption reports both verification and decryption. A malformed public key, invalid signature, and a valid signature whose inner ciphertext cannot be decrypted have separate status and narration. In the last case, the app confirms the signature but does not expose plaintext.

**A valid signature proves that the matching private key signed this exact encrypted token; it does not identify the person who controls that key.** Compare the full public-key fingerprint with the claimed sender through a separate trusted channel. A signature is not a replacement for encryption, and an unsigned message does not authenticate its sender. Signatures provide no replay protection: a valid signed token can be resent. Narration can describe key-generation, signing, verification, mismatch, and failure outcomes but never reads the key contents aloud. Back up and distribute keys securely. Signatures do not prevent key theft or denial of service.

## File encryption

File operations always use the **Access key** and chunked AES-256-GCM, regardless of the selected text method or AES text key-size setting.

- New encrypted files use the binary `HWF2` format and support up to **1 GiB** of plaintext.
- Files are processed in **4 MiB chunks**. Every chunk is authenticated. The file header and chunk index are included in authenticated data, and a per-file nonce prefix is combined with a chunk counter.
- The HWF2 header contains a random salt, nonce prefix, and plaintext length. The encrypted file's approximate size is visible.
- Files from the earlier `HWF1.` format remain decryptable up to **1 MiB** of plaintext.
- Original filenames and MIME types are not stored. The default download names are `encrypted-file.hwf2` and `decrypted-file.bin`.
- Progress is reported during chunked operations. Where supported, files of 64 MiB or larger are saved incrementally using the browser's Save File picker. Other browsers prepare a Blob download and may require substantial memory.
- New file encryption requires the access key to contain exactly the selected number of Unicode code points: 16, 20, 24, 32, 40, or 64. Decryption does not enforce the current selected length, so existing files remain usable with their original key. Use a long, unique passphrase — a length check or strength estimate is not a security guarantee.

For Save File picker operations, output is written to a fresh transactional stream (`keepExistingData: false`) and committed only after all chunks authenticate and the stream closes successfully. If decryption or writing fails, the app aborts the stream; it does not report a partial file as saved. If the browser or filesystem rejects the abort, the UI explicitly warns that output could not be discarded and instructs the user to remove any partial file rather than use it. In browsers without the picker, chunks remain in memory and the download is created only after the complete operation succeeds. Treat decrypted output as sensitive.

## Image and media payload embedding

The **Media & file payload workspace** encrypts one selected payload source—text, one file, multiple files, or a folder—with authenticated AES-256-GCM. By default it uses the main **Access key**, so the workspace can be used without configuring another key. The optional **Use a separate access key for this workspace** setting provides an independent key, its own selected-length requirement, quality estimate, and secure passphrase generator. New payload encryption enforces the selected length; extraction uses the entered key and does not enforce the current length setting. Select the same key source and enter the same key value used for embedding. The separate key is not persisted and is cleared, along with its enabled setting, by **Clear** and by the privacy lock.

PNG images use red, green, and blue least-significant-bit embedding in fully opaque pixels. JPEG input is decoded and converted to a new PNG because lossy JPEG encoding would destroy hidden bits. The generated PNG is the carrier output for extraction; the source JPEG is not modified.

For video, audio, and other non-PNG/JPEG carrier files, the encrypted block is appended to a copy of the original carrier with a footer so this app can locate it during extraction. Appending is not steganographic concealment: the added bytes increase the file size and may affect compatibility or playback. The original carrier is not changed. The downloaded output name adds `.hidden` before the original extension; select that exact, unchanged output for extraction. Do not convert or edit it after embedding; compatibility is format-dependent, so test a copy.

Choose exactly one payload source at a time: enter text, choose one or more files, or choose a folder. The text area and file collection are alternatives; do not fill both. Text is recovered as `hidden-message.txt`. Use **Choose folder** to include the directory's relative paths. A single file is carried in its original format and recovered with its filename. ZIP packaging is used only for multiple files or a folder, to preserve the collection as one payload; the archive is downloaded for you to open and is not automatically unpacked. The archive builder rejects duplicate and unsafe paths.

Plaintext payloads are limited to 4 MiB and collections to 1,000 files. PNG/JPEG image carriers are limited to 16 megapixels, 16,384 pixels per side, and 32 MiB; other carrier files are limited to 1 GiB. Image capacity is calculated from fully opaque pixels before encryption. The estimated encrypted size includes framing and encryption overhead, which means the usable text/file payload can be smaller than the displayed capacity. Capacity is checked before encryption. Processing stays in browser memory; the application does not upload the carrier or payload.

PNG pixel embedding is fragile, not a robust watermark or a claim of undetectability. The generated PNG must remain unchanged for extraction; resizing, editing, screenshots, conversion, or recompression may destroy embedded bits. For appended carriers, the encrypted payload is not concealed and carrier compatibility is not guaranteed. AES-GCM protects payload contents but does not authenticate who created them.

## File hash calculator

The file hash calculator is a separate integrity-checking tool; **hashing does not encrypt a file**. It reads selected files in the browser and displays the requested digest values without intentionally uploading the files. Add one or more files by dropping them onto the file-check area or by using **Choose files**. Select or clear any of the MD5, SHA-1, SHA-256, and SHA-512 options; all four are selected by default. Changing the selected algorithms recalculates the current selection.

| Algorithm | Digest size | Guidance |
| --- | ---: | --- |
| MD5 | 128 bits | Kept for compatibility with older systems. It is not collision-resistant and must not be used for security-sensitive integrity checks. |
| SHA-1 | 160 bits | Kept for compatibility. It is not collision-resistant and must not be used for security-sensitive integrity checks. |
| SHA-256 | 256 bits | Recommended general-purpose choice for comparing file integrity. |
| SHA-512 | 512 bits | Strong general-purpose option that produces a longer digest. |

A matching digest is useful only when the expected digest comes from a source you trust. If an attacker can replace both a file and its published digest, comparing them does not establish authenticity. These hashes are unkeyed: they do not prove who created a file, and they do not replace a digital signature or a message authentication code.

The calculator uses the File API and Web Crypto API for SHA-1/SHA-256/SHA-512; its MD5 implementation is included for compatibility and processes file chunks incrementally. Hashing runs in a same-origin Web Worker so CPU-heavy digest work does not block the page interface. MD5-only calculations read file slices incrementally without loading the complete file; when a SHA digest is also selected, MD5 consumes chunks from the buffer already needed by Web Crypto. Web Crypto SHA digests require the complete file in memory, so hashing is limited to 256 MiB per file to reduce browser memory pressure for those algorithms. This ceiling is separate from the 1 GiB file-encryption limit. Hashing and file encryption are independent: the hash calculator does not change, encrypt, upload, or download the selected files.

To calculate a file's digest without comparing it, leave **Expected digest** blank and read or copy the digest shown in the results. Each digest has a **Copy** control. For a file you created, save the digest separately as a baseline and compare it with a later calculation to detect changes. To verify a published digest, choose its algorithm and paste the complete hexadecimal value into **Expected digest**. The calculator validates its character set and exact digest length before calculating, then displays **Match** or **Mismatch** for each selected file. The expected algorithm is calculated even if its checkbox is cleared. Editing the digest or algorithm recalculates the selected files; clearing the workspace or locking it removes the entered expected digest. A match only confirms equality with the supplied value—it cannot establish that the value itself came from an authentic source.

### Result export

Use **Export results CSV** after a calculation to download a local report with filename, byte size, algorithm, digest, expected-digest result, and calculation status. Read or digest failures remain visible for their files and are included in the report instead of replacing or silently omitting other batch results. The report is generated in the browser and is not uploaded. Filename values are escaped to reduce spreadsheet-formula execution risk. Clearing or changing the selected files or expected digest refreshes the current result set before it can be exported.

## Narration

Narration is optional and uses the browser's built-in speech synthesis. Select a narration language in the header and turn narration on. Turning it on does not start speech. After that, clicking a control or starting an operation can trigger guidance; selecting a new method, key size, hash algorithm, or narration language announces the new choice, while simply opening a dropdown or focusing a control stays quiet. In the media/file payload workspace, narration explains the selected carrier and its capacity, hide/extract mode, shared/separate key choice, and success or error outcomes. It does not speak passphrase contents or announce each progress update, avoiding exposure and unnecessary chatter. Spoken guidance uses concise sentences, normal pitch, and a measured pace. The app prefers a voice matching the selected language and region; Nigerian Pidgin can use an available English voice. When no suitable voice is installed, the browser chooses a voice for the requested language, so pronunciation and quality may vary by browser and operating system. Narration does not repeat guides.

Guidance is available in English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, and French. It explains the selected method, key sizes, controls, common tasks, and file-hash algorithms. The AES key-size guide explains the difference between the derived key and access-key length, and why a longer derived key does not replace a strong access key. The RSA key-size guide explains public and private keys and the effect of RSA size on work and short-message limits. For direct RSA and RSA-first dual-key messages, the displayed limit is based on the selected size for newly generated keys; pasted or imported keys use their own modulus size and limit. Narration also announces message, file, and file-check results, errors, and legacy-message migration steps without reading message contents, keys, or decrypted output aloud. Legacy Grumpy v2 encryption completion is explicitly identified as unsafe and advises re-encrypting with AES-GCM. Important limits and key-safety warnings are included. If speech playback fails, narration switches off and displays an error.

Available guide languages are **English, Yoruba, Igbo, Hausa, Nigerian Pidgin, Spanish, and French**. Spoken voice availability and pronunciation depend on voices installed in the browser or operating system; a browser may synthesize speech with its default voice when a matching voice is unavailable. Narration runs locally; message content and keys are not sent to a speech service.

## Recommended workflows

### Embedding and recovering a media/file payload

1. Select **Embed a payload** and choose one carrier. Use PNG for pixel-level concealment; JPEG input produces a PNG output. For video, audio, or another file, the app appends encrypted data rather than concealing it.
2. Choose exactly one payload source: enter text, select one file, or select multiple files/a folder. A single file is kept in its original format. Multiple files and folders are ZIP-packaged to preserve them as one downloadable collection.
3. Keep the default shared Access key, or enable the separate workspace key and set its length. Enter or generate the key and save it securely; keys are not recoverable by the app.
4. Check the capacity estimate and warnings, then encrypt and embed. Use a copy of the carrier. Keep the generated output unchanged.
5. To recover the payload, choose **Extract a payload**, select the generated output (the PNG for image carriers), and enter the same key source/value. The recovered single file or ZIP downloads locally; open ZIPs yourself.

For non-image carriers, the appended encrypted block is visible in the file size, is not steganographic concealment, and can affect file compatibility. Never assume that a carrier will remain playable or that the payload will survive editing or conversion.

### Password-protected message

1. Choose **AES-GCM · Passphrase-based (Recommended)** and select the desired derived-key size (256 bits is the default).
2. Enter a long, unique passphrase and the message. To authenticate the sender, open **Digital signatures**, generate or import an ECDSA P-256 signing key, and enable **Sign encrypted output**.
3. Select **Encrypt message**. Share the resulting `SIG1.` token, the passphrase, and the public signing key through appropriate channels. Share the passphrase separately from the token; compare the full signing-key fingerprint with the recipient through a trusted channel.
4. To decrypt, paste the complete token, enter the same passphrase, and supply the trusted signing public key. Signed tokens are verified before decryption; unsigned `CT2.` and compatible older `CT1.` tokens are detected automatically but do not authenticate their sender.

### Encrypting to an RSA recipient

1. The recipient creates an RSA key pair. The default private key is non-extractable and remains in that page's memory; to keep a user-managed backup, select exportable PEM before generating the pair and store the resulting private key securely.
2. The recipient shares the SPKI public key. The sender pastes it into the public-key field and compares its complete SHA-256 fingerprint with the recipient through a separate trusted channel.
3. The sender selects **AES-GCM + RSA-OAEP · Hybrid (Recommended)**, enters the message, and encrypts. Share the `RSA1.` token with the recipient; never send the private key.
4. The recipient pastes the token and uses the matching in-memory key or imports the matching PKCS#8 private-key PEM. RSA encryption alone does not authenticate the sender; optionally sign the encrypted token with ECDSA and have the recipient verify it using a trusted signing-key fingerprint.

For short messages where both RSA possession and a shared passphrase should be required, select **RSA-OAEP + AES-GCM · Dual-key**. The sender encrypts the message first with RSA-OAEP, then encrypts that RSA ciphertext with a passphrase-derived AES-GCM key. Share the `RSA3.` token and passphrase separately. The recipient needs both the matching private key and the passphrase. The RSA key size sets the short-message limit; this is not a longer-message alternative to the standard hybrid method.

For short messages where only the recipient private key is needed, **RSA-OAEP · Direct encryption** creates an `RSA2.` token, subject to the key-size-specific UTF-8 byte limit above.

### File

1. Select the required access-key length, then enter a key with exactly that many Unicode characters. New file encryption enforces this length; decryption does not.
2. Select **Encrypt and download file** or **Decrypt and download file**. File operations always use chunked AES-256-GCM and the access key, regardless of the selected text method.
3. Share the encrypted file and access key separately. Decrypted files are sensitive. The app does not preserve the original filename or MIME type.

### Migrate an old Grumpy v2 message

1. Select **Grumpy v2 · Legacy only (Insecure)**, enter the legacy key, and decrypt the old ciphertext.
2. Select **Prepare AES-256-GCM migration**. The app puts the decrypted text back into the message field, selects AES-GCM, clears the old key, and asks for a new strong access key.
3. Encrypt the message to create a modern authenticated token. Re-encryption does not make any old ciphertext copies secure.

## Quick start

1. Open the app in a modern browser from `localhost` or an HTTPS origin.
2. Select an encryption method.
3. For AES-GCM, choose an enabled 128-, 192-, or 256-bit option — this sets the derived AES key size, not passphrase length. AES-192 is enabled only when the browser's Web Crypto API confirms support. For AES-CBC + HMAC, use a long passphrase. For an RSA method, paste and verify a recipient public-key fingerprint, or generate a key pair (choose the generated RSA key size before generating). RSA3 dual-key encryption also requires a shared access-key passphrase.
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

Use **Clear** when you want to remove the current message, result, selected encryption/hash/payload files and carrier, hash results, and file status while continuing to use the main Access key or loaded RSA/ECDSA keys. It also clears the optional media-workspace key and disables that separate-key option. Clearing the hash panel invalidates any in-progress calculation so it cannot repopulate results afterward. Editing the message or access key, changing an encryption method or key size, or editing RSA key material clears the displayed message result and disables its download action. This prevents a result encrypted with previous inputs from appearing current. Clear does not cancel a pending encryption operation, erase the main Access key or private keys, remove a downloaded file, or securely wipe browser memory. The privacy lock clears sensitive fields, all active access keys and private keys, selected files and hash results, invalidates pending UI and hash results, and requires an explicit fresh-workspace resume. Do not rely on it as authentication or guaranteed secure erasure.

## Browser support and accessibility

Use a modern browser with the Web Crypto API. Browsers generally expose cryptographic APIs only in a secure context, such as `localhost` or HTTPS; direct `file://` use may not work. AES-192-GCM is not implemented by every browser's Web Crypto API: startup capability detection disables the choice where unsupported or when support cannot be confirmed. Existing tokens that require AES-192 must be decrypted in a compatible browser. Speech synthesis and the File System Access save picker are optional browser features. If the save picker is unavailable, downloads use a browser-generated Blob and may need substantial memory for large files. Hashing uses the browser's file-reading APIs; the SHA digest algorithms also require Web Crypto.

The responsive interface uses the logo's violet and near-black palette, with a two-column desktop workspace that collapses for smaller screens. Controls have visible keyboard focus, labels, and status messages. Operation, file, output, fingerprint, and lock updates are exposed through live status regions. The app supports `Ctrl`/`⌘` + `Enter` to encrypt and `Ctrl`/`⌘` + `Shift` + `Enter` to decrypt. Narration is a separate convenience feature and does not replace screen-reader support or the visible status messages.

## Limits and behavior

| Input | Limit |
| --- | ---: |
| Plaintext message | 100,000 UTF-8 bytes |
| Encrypted text token | 140,000 characters |
| Signed text token (`SIG1.` envelope) | 200,000 characters |
| New password-based encryption access key | Exactly the selected 16, 20, 24, 32, 40, or 64 Unicode code points; at most 4,096 UTF-8 bytes |
| RSA or ECDSA PEM key input | 20,000 characters |
| New file plaintext | 1 GiB |
| Embedded payload plaintext | 4 MiB; text, one original-format file, or multiple files/folder packaged as an uncompressed ZIP |
| Source carrier image | JPEG or PNG; 16 megapixels; each side at most 16,384 pixels; 32 MiB |
| Carrier output | PNG for image carriers; other files have an encrypted block appended; select the exact output for extraction |
| Files in a collection or folder ZIP | 1,000 |
| File hashing | 256 MiB per file; SHA digests require full-file memory, MD5 is incremental; calculation runs in a Web Worker |
| Earlier HWF1 file plaintext | 1 MiB |

Direct RSA has an additional key-dependent plaintext limit, described above. The application uses fixed token formats, algorithms, and KDF work factors — token data cannot choose an arbitrary algorithm or PBKDF2 iteration count.

Inputs are validated before cryptographic processing where practical. Authenticated decryption failures use one generic message for text and a separate generic message for files, so wrong keys, malformed authenticated content, and tampering are not distinguished in user-facing messages. Actionable conditions such as unavailable Web Crypto, size limits, invalid signatures, and file read/write failures retain their own messages; a file write failure is never described as a key failure. Text and file failures are announced through narration only when narration is enabled; the visible status remains available regardless. Web Crypto operations such as PBKDF2 cannot always be cancelled once started, although the workspace lock invalidates pending UI operations and clears sensitive data.

## Privacy and workspace lock

The app does not intentionally transmit message contents, files, passphrases, or private keys to an application server. It does not persist them in `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. The optional separate media-workspace key is cleared by **Clear** and by the privacy lock; the main Access key is retained by **Clear** but cleared by the lock. Cryptographic operations use the browser's Web Crypto API. A deployed website still supplies the HTML, scripts, styles, and images — a compromised hosting origin can deliver code that reads data before encryption or after decryption.

After five minutes without a tracked interaction, or when a page-lifecycle `pagehide` event occurs, the workspace locks. Sensitive message and result fields, passphrases, private keys, selected files, and hash results are cleared; narration stops; in-progress UI/hash results are invalidated; controls are disabled until the user explicitly resumes with a fresh workspace. The RSA public key is retained. Switching tabs alone does not necessarily trigger the lock. The lock has no password, is not an authentication boundary, and cannot guarantee secure erasure from browser memory.

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

For Cloudflare Pages with Git integration, use the repository root as the root directory, select **None** as the framework preset, use `exit 0` as the build command, and set the build output directory to `.`. The project has no compile step; this setting publishes the root `index.html`, `_headers`, and its `css/`, `js/`, and `assets/` dependencies. Do not use `docs/` as the build output directory. Deploy the exact reviewed commit to production and verify the Pages deployment identifies that commit before promotion.

For dashboard **Direct Upload**, create a Direct Upload project and upload the application files with `index.html` at the top level. Include `css/`, `js/`, and `assets/`; do not upload only a nested project directory or only the documentation folder. A Direct Upload project cannot later be converted to Git integration, so choose Git integration if automatic deployments from repository pushes are required. Manual uploads must be repeated after local files change.

After deployment, test the published HTTPS site and inspect the browser console and Network panel for missing files or CSP errors. Treat deployed files as public; never put secrets or private keys in the site. See Cloudflare's [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) and [Direct Upload guide](https://developers.cloudflare.com/pages/get-started/direct-upload/) for current platform details.

The page includes a restrictive CSP meta policy. The root [`_headers`](../_headers) file configures the corresponding Cloudflare Pages response headers, including `frame-ancestors 'none'`, which meta CSP cannot enforce. For Direct Upload, include `_headers` at the uploaded site's root. If deploying through Pages Functions or a Worker, configure the headers in that runtime instead. After deployment, inspect the actual HTML response headers and confirm they match `_headers`. Keep assets same-origin; if external assets are introduced, reassess CSP and use Subresource Integrity where supported.

## Tests

The project uses Node.js's built-in test runner and has no test-framework dependency. From the project directory, run:

```sh
node --test
```

Run this from the repository root. Node.js automatically discovers the test files, so the command works across Windows, macOS, and Linux without shell-specific path separators or wildcard expansion.

The suite covers AES-GCM key sizes and browser capability detection, legacy tokens, CBC-HMAC, direct RSA, standard AES-GCM + RSA-OAEP hybrid encryption, RSA-first dual-key encryption, RSA and ECDSA key generation/import/validation, signed-token creation and verification, passphrase generation and estimation, file-hash comparison and CSV export, Grumpy v2 compatibility, HWF1/HWF2 file encryption, PNG pixel embedding/extraction, ZIP creation and CRC handling, tampering and malformed inputs, safe error behavior, local-processing policies, UI wiring, narration, and workspace locking. File-format tests include truncated ciphertext, swapped authenticated chunks, and a modified HWF2 header length. Passing tests establish expected behavior for tested cases; they are not a substitute for browser testing or an independent cryptographic audit.

### Browser smoke-test checklist

Use a current browser on `localhost` or HTTPS. Keep any sample keys and passphrases temporary and do not use production secrets for testing.

1. Check the AES-GCM key-size selector after startup. In a browser that does not support AES-192-GCM, confirm the option is disabled with an explanatory hint; in a compatible browser, confirm it becomes selectable. In either case, test AES-128 and AES-256 message encryption/decryption, then encrypt/decrypt an empty message and a Unicode message with AES-GCM (`CT2.`) and CBC-HMAC (`CBC1.`). Confirm each token decrypts with the correct passphrase and that a wrong passphrase, modified token, and malformed token fail without displaying plaintext.
2. Generate an RSA key pair and confirm the displayed SHA-256 fingerprint. For exportable keys, export and re-import the public/private PEM pair and confirm the fingerprint is unchanged. Test RSA1 hybrid, RSA2 direct, and RSA3 dual-key round trips. Confirm RSA2 and RSA3 enforce the selected key's short-message byte limit, and that RSA3 fails with a wrong passphrase or mismatched private key.
3. Encrypt and decrypt empty, small, and multi-chunk files. Compare the original and recovered bytes; also try a wrong passphrase and a modified or truncated encrypted file. For a large file saved through the Save File picker, tamper with a later encrypted chunk after earlier chunks have authenticated; confirm the operation fails, no success result is reported, and the uncommitted output is aborted. If cleanup itself fails, confirm the UI explicitly says not to use the partial file and to remove it. Without the picker, confirm a failed operation does not trigger a download.
4. Hide a short Unicode text and a small binary file in a PNG, then extract each with the same access key and compare bytes. Confirm a wrong key, non-carrier PNG, or modified hidden image does not produce a download. Verify that resizing or re-encoding the output is documented as unsupported.
5. Select one file and confirm it is recovered in its original format. Select multiple files, a folder, or both and confirm extraction downloads a ZIP with contents and relative paths intact. Check that choosing text alongside files is rejected without clearing either selection, and an over-capacity payload produces a clear error without a download.
6. Generate passphrases at several lengths, confirm they populate the access-key box and the rough strength estimate updates, and check that repeated or short inputs are not described as strong. The generated value must not appear in browser storage.
7. Hash a small known file with MD5, SHA-256, and SHA-512 and compare with known reference digests. Enter the correct expected digest and confirm **Match**, then change one digit and confirm **Mismatch**. Also check invalid digest length/characters, and confirm the expected algorithm is calculated even when its checkbox is cleared. Prefer trusted expected digests and SHA-256 or SHA-512. If practical, hash a file near the 256 MiB limit with MD5 only and confirm progress remains responsive; do not expect SHA hashing to stream because Web Crypto requires the complete file buffer.
8. Generate an exportable ECDSA P-256 key pair for a deliberate signing-key backup, sign an encrypted sample message, and confirm it produces a `SIG1.` token. Verify it with the public key, change the token or use another public key and confirm verification fails, then decrypt the valid signed token and confirm signature verification happens before decryption. Compare the complete public-key fingerprint through a separate trusted channel. Substitute a different valid P-256 public key and confirm signing is refused, the error explains the mismatch, no signed result is output, and download remains disabled. Also try malformed public-key PEM for both verify-only and signed decryption, plus a valid signature with an incorrect decryption key; confirm each produces a distinct, accurate status.
9. Select Grumpy v2 only to check legacy compatibility; if testing encryption, confirm the output can be decrypted with the same key and that the UI warns the result is unsafe. Confirm the migration action moves successfully decrypted text back to the message field so it can be protected with AES-GCM.
10. Start a password-based, RSA, ECDSA, or steganography operation and verify relevant inputs and actions remain disabled while it is pending and become available afterward. Confirm editing the message or key, changing the method or key size, or changing RSA/ECDSA key material clears the previous output and disables its download action. Trigger the privacy lock during work, if practical, and confirm stale results are not restored when the workspace resumes.
11. Verify the keyboard shortcuts and visible status messages. If speech synthesis is supported, confirm enabling narration and opening dropdowns stay quiet, changing the narration language, encryption method, AES/RSA key size, or hash algorithm announces the new selection, and the payload workspace announces carrier/mode/key-source changes and operation outcomes without speaking key contents. Confirm legacy encryption completion warns that Grumpy v2 is unsafe and the direct-RSA message limit matches the selected generated-key size. Selecting **Clear** should remove message, file, payload, and hash selections/results, clear the separate media-workspace key and disable its option, while retaining the main Access key and loaded RSA/ECDSA keys.

### Troubleshooting

- **Web Crypto is unavailable:** open the app from `localhost` or an HTTPS origin in a supported browser.
- **AES-192 is disabled:** this browser's Web Crypto API rejected or could not confirm AES-192-GCM support. Use AES-128 or AES-256 for new messages, or open an existing AES-192 token in a browser that supports that key size. AES-192 encryption is covered by Node tests, but that does not establish browser support.
- **A password-based operation rejects the key:** check that it is the same passphrase used for encryption, and that it meets the minimum and maximum limits. For authenticated formats, a wrong key and a modified token both cause decryption to fail.
- **Authenticated decryption fails:** AES-GCM, CBC-HMAC, RSA, and HWF1/HWF2 file authentication failures use the same internal `auth` error code. User-facing failures are generic and contextual (message versus file); they do not say whether the key was wrong or authenticated data was altered. Malformed format and actionable size-limit errors remain distinct internally but are not exposed as key-oracle details in the UI. Grumpy v2 is unauthenticated and cannot reliably detect an incorrect key.
- **File decryption reports a save/write failure:** this is an output I/O problem, not evidence of an incorrect key. Check available disk space and permissions, choose another save location if available, and retry. Cancelling the save picker is reported separately.
- **RSA decryption fails:** confirm that the token format matches the operation and that the private key belongs to the public key used for encryption. Compare public-key fingerprints out of band before encrypting.
- **Narration is silent:** check that narration is on, browser speech is allowed, and a speech voice is available. Playback failures switch narration off and show a status message.
- **Large-file saving uses substantial memory:** this can occur in browsers without the Save File picker; use a browser that supports incremental file saving where available.
- **A workspace is locked:** select **Continue with a fresh workspace**. Cleared passphrases and private keys must be entered or imported again; non-extractable private keys cannot be recovered after clearing.

## Project layout

```text
index.html                     Application markup and CSP meta policy
css/
  styles.css                   Responsive violet enterprise theme, focus and status styling
js/
  app.js                       UI wiring, operations, downloads, and lock integration
  aes-gcm-support.mjs           Runtime AES-GCM key-size capability detection
  crypto.mjs                   Crypto API re-exports
  errors.mjs                   User-facing errors and safe diagnostics
  passphrase.mjs               Passphrase generation and strength estimate
  hashing.mjs                  Worker-safe MD5 and Web Crypto digest implementation, plus hash-size limit
  steganography.mjs            PNG RGB least-significant-bit payload framing
  stego-archive.mjs            Dependency-free ZIP Store archive builder for folders
  hash-worker.mjs              Off-main-thread file reading and digest calculation
  hash-results.mjs             Hash CSV serialization and spreadsheet-safety handling
  hash-verification.mjs        Expected-digest validation and comparison
  session-lock.mjs             Testable inactivity timer
  crypto/
    aes-gcm.mjs                AES-GCM text encryption and CT1 compatibility
    aes-cbc-hmac.mjs           CBC compatibility with encrypt-then-MAC
    file-aes-gcm.mjs           Chunked HWF2 and legacy HWF1 file formats
    rsa-hybrid.mjs             Direct, hybrid, and RSA3 dual-key RSA-OAEP modes
    ecdsa-signature.mjs        ECDSA P-256 signed-message envelope and fingerprints
    legacy.mjs                 Grumpy v2 compatibility cipher
    pem.mjs                    RSA and ECDSA PEM parsing and formatting
    shared.mjs                 Encodings, limits, KDF settings, and token helpers
  ui/
    audio.mjs                  Narration and language guides
    workspace-lock.mjs         Inactivity and page-lifecycle privacy lock
assets/
  hex-watch.svg                SVG logo and favicon
  hex-watch-project.png        PNG app icon
tests/
  aes-gcm-support.test.mjs     Web Crypto key-size capability detection
  audio-guide.test.mjs         Narration behavior and language guides
  crypto.test.mjs              AES, RSA, file, and legacy crypto tests
  ecdsa-signature.test.mjs     Signed-token and ECDSA key tests
  passphrase-hash.test.mjs     Passphrase and file-hash tests
  errors.test.mjs              Error mapping and safe diagnostics
  security-config.test.mjs     CSP, local-processing, and UI policy tests
  session-lock.test.mjs        Inactivity timer tests
  workspace-lock-ui.test.mjs   Workspace lock integration tests
```

## Implementation overview

Hex Watch Cipher is a static web application: the browser loads `index.html`, its local stylesheet, the JavaScript modules, and the local logo assets. The application does not require a runtime package manager, build step, database, API server, or account service. The browser's Web Crypto API provides the modern encryption primitives; `js/crypto/legacy.mjs` is intentionally isolated as an insecure compatibility implementation for old Grumpy v2 messages.

- `index.html` defines the workspace, controls, accessible status regions, and restrictive Content Security Policy meta policy.
- `css/styles.css` contains the responsive layout, brand-aligned violet appearance, interaction states, and reduced-motion support.
- `js/app.js` connects controls to encryption, decryption, file operations, hashing, narration, downloads, and privacy locking.
- `js/steganography.mjs` handles PNG pixel payloads and appended-carrier framing; `js/stego-archive.mjs` packages multi-file and folder payloads into ZIP archives.
- `js/crypto/` contains focused AES, RSA, ECDSA-signature, file-encryption, and legacy implementations plus shared format, encoding, and input-limit helpers. `js/passphrase.mjs` and the hash modules provide non-cryptographic generation guidance, digest comparison, and safe report export.
- `js/ui/` contains narration and workspace-lock behavior; the lock timer is separately testable in `js/session-lock.mjs`.
- `tests/` uses Node.js's built-in test runner to cover crypto formats, malformed inputs, signature/key pairing, passphrase and hash behavior, user-facing errors, security policy, UI behavior, narration, and the workspace lock.

Keep security-sensitive behavior in the relevant modules rather than adding inline scripts or remote dependencies. Any change to token formats, algorithms, key derivation, authenticated data, or file framing should update the related tests and documentation together. Run the automated suite and perform browser smoke tests after changes; tests do not establish that a design is secure or independently audited.

## Security model and limitations

Hex Watch Cipher can protect encrypted text and file contents from someone who has only the token or encrypted file, provided the cryptography, randomness, browser, device, and delivered application code are trustworthy. It is not a complete secure communications system.

- **Endpoint and code integrity** — Malware, a malicious browser extension, an unlocked device, compromised hosting, or modified application code can expose plaintext or keys.
- **Passphrase guessing** — PBKDF2 makes guesses more expensive but cannot rescue a weak or reused passphrase. Meeting the selected length and passing the strength checklist is not a strength guarantee.
- **Metadata** — Token prefixes, formats, and approximate message or file sizes remain visible.
- **Hash limitations** — MD5 and SHA-1 are provided only for compatibility and are collision-broken. For security-sensitive file comparisons, use SHA-256 or SHA-512 and obtain the expected digest through a trusted channel.
- **Identity and signatures** — Unsigned password and RSA encryption do not establish who created a message. Optional ECDSA P-256 signatures authenticate possession of a signing key for a specific encrypted token, but do not identify its owner unless its fingerprint is verified through a trusted channel. Signatures provide no replay protection and do not prevent key theft.
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
Content-Security-Policy: default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; media-src 'none'; connect-src 'none'; frame-src 'none'; worker-src 'self'; manifest-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
```

Keep scripts, styles, images, and fonts same-origin. Review the privacy and CSP impact before adding inline code, remote dependencies, or third-party assets. After deployment, inspect the actual response headers and Network panel in your browser. Initial same-origin asset requests are expected; encrypt/decrypt operations themselves should not initiate network requests.

For Cloudflare Pages, the repository includes a plain-text [`_headers`](../_headers) file at the uploaded site's root. If deploying through Pages Functions or a Worker, configure headers in that runtime instead. Verify the published HTML response contains the intended headers and that its deployment corresponds to the reviewed commit.

## Author

**Oludemi Joshua**

[GitHub](https://github.com/Bigsnack7) · [LinkedIn](https://www.linkedin.com/in/oludemi-joshua-b6b59141b)

Built as part of a cybersecurity portfolio focused on applied cryptography, Blue Team practices, and secure engineering.
