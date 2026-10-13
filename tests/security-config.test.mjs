import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    return entry.isDirectory()
      ? collectJavaScriptFiles(url)
      : /\.(?:js|mjs)$/.test(entry.name) ? [url] : [];
  }));
  return nested.flat();
}

test('page uses same-origin scripts and styles with no inline executable blocks or style attributes', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /script-src 'self'/);
  assert.match(html, /script-src-attr 'none'/);
  assert.match(html, /style-src 'self'/);
  assert.match(html, /style-src-attr 'none'/);
  assert.match(html, /img-src 'self'/);
  assert.match(html, /font-src 'self'/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /frame-src 'none'/);
  assert.match(html, /worker-src 'none'/);
  assert.match(html, /manifest-src 'none'/);
  assert.doesNotMatch(html, /unsafe-inline/);
  assert.doesNotMatch(html, /<script\s*>/i);
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  assert.match(html, /<script type="module" src="js\/app\.js"><\/script>/);
  assert.match(html, /href="css\/styles\.css"/);
  assert.match(html, /Local encryption, no application backend required/);
  assert.match(html, /does not intentionally transmit message contents, file contents, or cryptographic keys to a server/);
  assert.match(html, /browser extension/);
  assert.match(html, /compromised hosting environment/);
  assert.match(html, /id="operationStatus" class="sr-only" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /id="out" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /id="lockMessage" role="alert" aria-live="assertive"/);
  assert.match(html, /id="fileInput" type="file"/);
  assert.match(html, /up to 1 GiB/i);
  assert.match(html, /id="fileEncrypt"/);
  assert.match(html, /id="fileDecrypt"/);
  assert.match(html, /id="downloadToken" disabled/);
  assert.match(html, /Original filenames and types are not stored/i);
  assert.match(html, /<select id="aesKeySize">[\s\S]*?value="128">128 bits · 16-byte key[\s\S]*?value="192">192 bits · 24-byte key[\s\S]*?value="256" selected>256 bits · 32-byte key · Recommended/);
  assert.match(html, /id="aesKeySizeHint"/);
  assert.match(html, /<option value="aes">AES-GCM · Passphrase-based \(Recommended\)<\/option>/);
  assert.match(html, /<option value="cbc">AES-CBC \+ HMAC · Compatibility<\/option>/);
  assert.match(html, /<option value="rsa-direct">RSA-OAEP · Direct encryption \(short messages\)<\/option>/);
  assert.match(html, /<option value="rsa-aes">RSA-OAEP \+ AES-GCM · Dual-key \(short messages\)<\/option>/);
  assert.match(html, /<option value="hybrid">AES-GCM \+ RSA-OAEP · Hybrid \(Recommended\)<\/option>/);
  assert.doesNotMatch(html, /<option value="rsa">/);
  assert.match(html, /<option value="legacy">Grumpy v2 · Legacy only \(Insecure\)<\/option>/);
  assert.match(html, /<select id="rsaKeySize">[\s\S]*?value="2048" selected>2048 bits · Recommended[\s\S]*?value="3072">3072 bits[\s\S]*?value="4096">4096 bits/);
  assert.match(html, /id="rsaKeySizeHint">This applies only to keys generated here/);
  assert.match(html, /id="generateRsa">Generate selected-size RSA key pair/);
  assert.match(html, /id="legacyMigration" hidden/);
  assert.match(html, /id="migrationStatus" role="status" aria-live="polite"/);
  assert.match(html, /id="migrateLegacy">Prepare AES-256-GCM migration<\/button>/);
  const styles = await readFile(new URL('css/styles.css', root), 'utf8');
  assert.match(styles, /\.migration\[hidden\],\.migration \[hidden\]\{display:none\}/);
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="assets\/hex-watch\.svg" sizes="any">/);
  assert.match(html, /<link rel="icon" type="image\/png" sizes="512x512" href="assets\/hex-watch-project\.png">/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="512x512" href="assets\/hex-watch-project\.png">/);
  const favicon = await readFile(new URL('assets/hex-watch.svg', root), 'utf8');
  assert.match(favicon, /viewBox="0 0 64 64"/);
  assert.match(favicon, /<title id="title">Hex Watch Cipher<\/title>/);
  const projectIcon = await readFile(new URL('assets/hex-watch-project.png', root));
  assert.equal(projectIcon.readUInt32BE(16), 512);
  assert.equal(projectIcon.readUInt32BE(20), 512);
  const app = await readFile(new URL('js/app.js', root), 'utf8');
  assert.match(app, /const operationControls=\[[\s\S]*?fileInput\s*\]/);
  assert.match(app, /const unavailable=locked\|\|operationBusy;\s*operationControls\.forEach\(control=>\{control\.disabled=unavailable\}\)/);
  assert.match(app, /async function run\(dec\)\{\s*if\(locked\|\|operationBusy\)return;/);
  assert.match(app, /async function runFile\(decrypting\)\{\s*if\(locked\|\|operationBusy\)return;/);
  assert.match(app, /async function generateRsa\(\)\{\s*if\(locked\|\|operationBusy\)return;/);
  assert.match(app, /busy\(true,'Generating RSA key pair'\)/);
  assert.match(app, /selected==='hybrid'\|\|selected==='rsa-direct'\|\|selected==='rsa-aes'/);
  assert.match(app, /value\.startsWith\(LEGACY_AES_TAG\)/);
  assert.match(app, /encryptAesGcm\(raw,pw,Number\(\$\('aesKeySize'\)\.value\)\)/);
  assert.match(app, /selected==='rsa-direct'/);
  assert.match(app, /generateRsaKeyPair\(\{exportable,modulusLength:Number\(\$\('rsaKeySize'\)\.value\)\}\)/);
  assert.match(app, /value\.startsWith\(RSA_DIRECT_TAG\)/);
  assert.match(app, /value\.startsWith\(RSA_AES_TAG\)/);
  assert.match(app, /if\(value\.startsWith\(RSA_AES_TAG\)\)mode\.value='rsa-aes'/);
  assert.match(app, /encryptRsaThenAes\(raw,rsaPublic\.value,pw\)/);
  assert.match(app, /decryptRsaThenAes\(value,privateKey,pw\)/);
  assert.match(app, /RSA1 token format/);
  assert.match(app, /audio\.setNarrationMode\(selected\)/);
  assert.match(app, /audio\.announceStatus\(dec\?'messageDecrypted':'messageEncrypted'\)/);
  assert.match(app, /audio\.announceStatus\(decrypting\?'fileDecrypted':'fileEncrypted'\)/);
  assert.match(app, /audio\.announceStatus\('rsaKeyGenerated'\)/);
  assert.match(app, /if\(!file\).*?audio\.announceStatus\('fileFailed'\)/);
  assert.match(app, /if\(!pw\).*?audio\.announceStatus\('operationFailed'\)/);
  assert.match(app, /audio\.announceStatus\('legacyMigrationPrepared'\)/);
  assert.match(app, /anchor\.download=filename;[\s\S]*?anchor\.click\(\);[\s\S]*?setTimeout\(\(\)=>anchor\.remove\(\),0\)/);
  assert.match(app, /triggerDownload\(new Blob\(\[lastEncryptedToken\],\{type:'text\/plain;charset=utf-8'\}\),'encrypted-message\.txt'\)/);
  assert.match(app, /else if\(selected==='legacy'\)\s*\{\s*if\(!pw\).*?r=encryptGrumpyV2\(raw,pw\);/s);
  assert.match(app, /if\(dec&&selected==='legacy'\)\s*\{\s*legacyMigrationText=r;/);
  assert.match(app, /mode\.value='aes';\s*key\.value='';/);
  assert.match(app, /onLock:clearSensitiveWorkspace/);
  assert.match(app, /function clearSensitiveWorkspace\(\)\{[\s\S]*?clearLegacyMigration\(\);/);
  assert.match(app, /function clearLegacyMigration\(\)/);
  assert.match(app, /inp\.addEventListener\('input',\(\)=>\{clearLegacyMigration\(\)/);
  const legacy = await readFile(new URL('js/crypto/legacy.mjs', root), 'utf8');
  assert.match(legacy, /export function encryptGrumpyV2/);
  assert.match(legacy, /export function decryptGrumpyV2/);
  const cryptoEntry = await readFile(new URL('js/crypto.mjs', root), 'utf8');
  assert.match(cryptoEntry, /export \{ encryptGrumpyV2, decryptGrumpyV2 \}/);
  const readme = await readFile(new URL('README.md', root), 'utf8');
  assert.match(readme, /frame-ancestors 'none'/);
  assert.match(readme, /X-Content-Type-Options: nosniff/);
  assert.match(readme, /Referrer-Policy: no-referrer/);
  assert.match(readme, /X-Frame-Options: DENY/);
  assert.match(readme, /inspect the actual response headers and Network panel/i);
  const fileCrypto = await readFile(new URL('js/crypto/file-aes-gcm.mjs', root), 'utf8');
  assert.match(fileCrypto, /FILE_MAGIC = encoder\.encode\('HWF2'\)/);
  assert.match(fileCrypto, /MAX_FILE_BYTES = 1_073_741_824/);
  assert.match(fileCrypto, /FILE_CHUNK_BYTES = 4_194_304/);
  assert.match(fileCrypto, /export async function encryptFileStream/);
  assert.match(fileCrypto, /export async function decryptFileStream/);
  assert.match(app, /showSaveFilePicker/);
  assert.match(app, /MAX_ENCRYPTED_FILE_BYTES/);
});

test('application scripts do not send data remotely or persist it in browser storage', async () => {
  const files = await collectJavaScriptFiles(new URL('js/', root));
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\b/,
      `${file.pathname} must not add network transmission APIs`);
    assert.doesNotMatch(source, /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bdocument\.cookie\b/,
      `${file.pathname} must not add persistent browser storage`);
    assert.doesNotMatch(source, /\bconsole\.(?:log|info|warn|error|trace)\s*\(/,
      `${file.pathname} must not add unrestricted console logging`);
  }
});

test('reload starts with cleared sensitive fields and no persisted crypto state', async () => {
  const app = await readFile(new URL('js/app.js', root), 'utf8');
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /<input type="password" id="key"[^>]*>/);
  assert.doesNotMatch(html.match(/<input type="password" id="key"[^>]*>/)?.[0] || '', /\svalue=/);
  assert.match(html, /<textarea id="inp"[^>]*><\/textarea>/);
  assert.match(html, /<textarea id="rsaPrivate"[^>]*><\/textarea>/);
  assert.match(html, /id="out"[^>]*>Your result will appear here\.<\/div>/);
  assert.doesNotMatch(app, /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bdocument\.cookie\b/);
});

test('ambient audio controls and playback code are fully removed', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const audio = await readFile(new URL('js/ui/audio.mjs', root), 'utf8');
  const readme = await readFile(new URL('README.md', root), 'utf8');
  assert.doesNotMatch(html, /Ambient|ambient|musB/);
  assert.doesNotMatch(audio, /ambient|startAmbient|stopAmbient|musB/);
  assert.doesNotMatch(readme, /ambient audio|ambient sound/i);
  assert.match(html, /id="voxB"/);
  assert.match(html, /id="sfxB"/);
  assert.match(audio, /toggle\(\$\('sfxB'\)/);
});
