import {
  AES_TAG, LEGACY_AES_TAG, CBC_TAG, RSA_TAG, RSA_DIRECT_TAG, MAX_MESSAGE_BYTES, MAX_TOKEN_CHARS,
  encryptAesGcm, decryptAesGcm, encryptCbcHmac, decryptCbcHmac,
  encryptRsaHybrid, decryptRsaHybrid, encryptRsaDirect, decryptRsaDirect,
  generateRsaKeyPair, fingerprintRsaPublicKey,
  encryptGrumpyV2, decryptGrumpyV2,
  MAX_FILE_BYTES, FILE_MAGIC, MAX_ENCRYPTED_FILE_BYTES,
  LEGACY_MAX_FILE_TOKEN_CHARS, encryptFileStream, decryptFileStream, decryptFileToken
} from './crypto.mjs';
import { createAudioController } from './ui/audio.mjs';
import { createWorkspaceLock } from './ui/workspace-lock.mjs';
import { getUserErrorMessage, logCryptoFailure } from './errors.mjs';

(function(){
'use strict';
const $=id=>document.getElementById(id);
const inp=$('inp'),key=$('key'),out=$('out'),mode=$('mode'),status=$('status'),
  encB=$('encB'),decB=$('decB'),clrB=$('clrB'),copyB=$('copy'),
  rsaPublic=$('rsaPublic'),rsaPrivate=$('rsaPrivate'),card=$('card'),lockScreen=$('lockScreen'),
  fileInput=$('fileInput'),fileEncryptB=$('fileEncrypt'),fileDecryptB=$('fileDecrypt'),downloadTokenB=$('downloadToken');
const subtle=window.crypto&&crypto.subtle;
let locked=false,operationGeneration=0,operationBusy=false;
let lastEncryptedToken=null;
let legacyMigrationText=null;
let fingerprintTimer=null,fingerprintGeneration=0;
let rsaPrivateCryptoKey=null;
let rsaGeneratedAt=null,rsaPrivateKeyState='none';
/* ================= UI logic ================= */
const EMPTY='Your result will appear here.';
const audio=createAudioController({isLocked:()=>locked});
const MSG={auth:'Authentication failed. Check the access key or verify that the message has not been altered.',
  operation:'Encryption failed. Check your input and try again.',
  format:'This is not a valid encrypted token.',nocrypto:'Web Crypto is unavailable. Open this page over HTTPS or from localhost.',
  short:'Use an access key with at least 10 characters for password-based encryption.',
  keyformat:'The RSA key is not valid PEM in the required format.',
  rsakeytoolarge:'RSA key text exceeds the 20,000-character processing limit.',
  keylarge:'RSA keys larger than 8192 bits are not supported.',
  keytoolarge:'Access keys cannot exceed 4,096 UTF-8 bytes.',
  toolarge:'Messages are limited to 100,000 UTF-8 bytes; encrypted tokens are limited to 140,000 characters.',
  filetoolarge:'Files are limited to 1 GiB. Legacy HWF1 encrypted files are limited to 1 MiB.',
  fileformat:'This file is not a supported HWF2 encrypted file.',
  keyweak:'RSA keys must be at least 2048 bits.',
  rsasizelimit:'Direct RSA only supports short messages. The limit depends on key size (190 UTF-8 bytes with RSA-2048); use hybrid RSA for longer messages.',
  publickey:'Enter a valid RSA public key to encrypt this message.',
  privatekey:'Enter the matching RSA private key to decrypt this message.'};
function show(t,err){out.textContent=t;out.classList.toggle('err',!!err)}
function updateActionButtons(){
  encB.disabled=locked||operationBusy;
  decB.disabled=clrB.disabled=locked||operationBusy;
  fileEncryptB.disabled=fileDecryptB.disabled=locked||operationBusy||!fileInput.files.length;
  fileInput.disabled=locked||operationBusy;
  downloadTokenB.disabled=locked||operationBusy||!lastEncryptedToken;
}
const busy=(b,action='')=>{
  operationBusy=b;
  $('operationStatus').textContent=b?`${action}. Please wait.`:'';
  updateActionButtons();
};
function setMessageDownload(token){
  lastEncryptedToken=token;
  updateActionButtons();
}
function clearLegacyMigration(){
  legacyMigrationText=null;
  $('legacyMigration').hidden=true;
  $('migrationStatus').hidden=true;
  $('migrationStatus').textContent='';
}
function triggerDownload(blob,filename){
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(()=>anchor.remove(),0);
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
function refresh(){
  const selected=mode.value;
  const hybridMode=selected==='rsa'||selected==='hybrid'||selected==='rsa-direct';
  const aesKeyBits=Number($('aesKeySize').value);
  const descriptions={
    aes:[`Authenticated AES-${aesKeyBits}-GCM with PBKDF2-SHA-256. Each message gets a random salt and IV.`,`AES-${aesKeyBits}-GCM · PBKDF2-SHA-256 · 600,000 iterations · Tamper detection`],
    cbc:['Compatibility option. AES-256-CBC uses a separate HMAC-SHA-256 key and verifies the authentication tag before decryption. Prefer AES-256-GCM for new messages.','AES-256-CBC + HMAC-SHA-256 · Compatibility only · Encrypt-then-MAC'],
    'rsa-direct':['Direct RSA-OAEP-SHA-256 encryption. The default 2048-bit key supports messages up to 190 UTF-8 bytes. Use hybrid RSA for longer messages.','Direct RSA-OAEP-SHA-256 · 190 UTF-8 bytes maximum with RSA-2048 · Short messages only'],
    rsa:['Hybrid encryption: RSA-OAEP-SHA-256 protects a random AES-256-GCM key. Generate a pair or paste a recipient public key.','RSA-OAEP-SHA-256 · Minimum 2048-bit keys · AES-256-GCM'],
    hybrid:['Hybrid encryption: a random AES-256-GCM key encrypts the message; RSA-OAEP-SHA-256 wraps that key for the recipient. Uses the compatible RSA1 token format.','Hybrid AES-256-GCM + RSA-OAEP-SHA-256 · Minimum 2048-bit keys · RSA1 compatible'],
    legacy:['WARNING: Grumpy v2 encryption and decryption are available only for legacy compatibility and testing. It is cryptographically insecure, provides no reliable confidentiality or tamper detection, and must never protect sensitive data. Use AES-256-GCM instead.','Grumpy v2 · Legacy encryption/decryption · INSECURE']
  };
  $('modeHint').textContent=descriptions[selected][0];
  $('rsaKeys').hidden=!hybridMode;
  $('aesKeySizeField').hidden=selected!=='aes';
  $('keyHint').textContent=hybridMode
    ?'RSA text encryption does not use this access key. It remains available for AES-256-GCM file encryption and password-based text modes. Use a long, unique passphrase; at least 10 characters and maximum 4,096 UTF-8 bytes.'
    :selected==='legacy'
    ?'WARNING: Grumpy v2 is cryptographically insecure and provides no reliable confidentiality or tamper detection. Use it only for legacy compatibility/testing, never sensitive messages. Enter a non-empty legacy key; this mode does not use AES/CBC NFKC normalization.'
    :'Choose a long, unique passphrase; a randomly generated one is preferable to a short or predictable password. AES/CBC normalize passphrases with Unicode NFKC before deriving keys. At least 10 characters; maximum 4,096 UTF-8 bytes.';
  status.className='info'+(selected==='legacy'||!subtle?' warn':'');
  status.textContent=!subtle?MSG.nocrypto:descriptions[selected][1];
  audio.setNarrationMode(selected);
  audio.setNarrationKeySize(aesKeyBits);
  audio.setNarrationRsaKeySize(Number($('rsaKeySize').value));
  updateActionButtons();
}
async function run(dec){
  const raw=inp.value;
  clearLegacyMigration();
  setMessageDownload(null);
  if(!raw.trim())return show(EMPTY);
  if(raw.length>MAX_TOKEN_CHARS)return show(MSG.toolarge,true);
  const value=raw.trim();
  const isToken=value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_TAG)||value.startsWith(CBC_TAG)||value.startsWith(RSA_TAG)||value.startsWith(RSA_DIRECT_TAG);
  if((!dec||!isToken)&&new TextEncoder().encode(raw).length>MAX_MESSAGE_BYTES)return show(MSG.toolarge,true);
  if(dec){
    if(value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_TAG))mode.value='aes';
    else if(value.startsWith(CBC_TAG))mode.value='cbc';
    else if(value.startsWith(RSA_TAG))mode.value='rsa';
    else if(value.startsWith(RSA_DIRECT_TAG))mode.value='rsa-direct';
    refresh();
  }
  const pw=key.value,selected=mode.value;
  busy(true,dec?'Decrypting message':'Encrypting message');
  const generation=operationGeneration;
  try{
    if(!subtle)throw new Error('nocrypto');
    let r;
    if(dec){
      if(value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_TAG)||value.startsWith(CBC_TAG)){
        if(!pw){show('Enter your access key to continue.',1);key.focus();return}
        r=value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_TAG)
          ?await decryptAesGcm(value,pw):await decryptCbcHmac(value,pw);
      }else if(value.startsWith(RSA_DIRECT_TAG)){
        const privateKey=rsaPrivateCryptoKey||rsaPrivate.value.trim();
        if(!privateKey){show(MSG.privatekey,1);rsaPrivate.focus();return}
        r=await decryptRsaDirect(value,privateKey);
      }else if(value.startsWith(RSA_TAG)){
        const privateKey=rsaPrivateCryptoKey||rsaPrivate.value.trim();
        if(!privateKey){show(MSG.privatekey,1);rsaPrivate.focus();return}
        r=await decryptRsaHybrid(value,privateKey);
      }else if(selected==='legacy'){
        if(!pw){show('Enter your access key to continue.',1);key.focus();return}
        r=decryptGrumpyV2(raw,pw);
      }else throw new Error('format');
    }else if(selected==='legacy'){
      if(!pw){show('Enter a legacy access key to continue.',true);key.focus();return}
      r=encryptGrumpyV2(raw,pw);
    }else if(selected==='rsa-direct'){
      if(!rsaPublic.value.trim()){show(MSG.publickey,1);rsaPublic.focus();return}
      r=await encryptRsaDirect(raw,rsaPublic.value);
    }else if(selected==='rsa'||selected==='hybrid'){
      if(!rsaPublic.value.trim()){show(MSG.publickey,1);rsaPublic.focus();return}
      r=await encryptRsaHybrid(raw,rsaPublic.value);
    }else{
      if(!pw){show('Enter your access key to continue.',1);key.focus();return}
      if(pw.length<10)throw new Error('short');
      r=selected==='cbc'
        ?await encryptCbcHmac(raw,pw)
        :await encryptAesGcm(raw,pw,Number($('aesKeySize').value));
    }
    if(locked||generation!==operationGeneration)return;
    if(!dec)setMessageDownload(r);
    if(dec&&selected==='legacy'){
      legacyMigrationText=r;
      $('legacyMigration').hidden=false;
    }
    audio.play(dec?'decrypt':'encrypt');show(r);
  }catch(e){
    if(locked||generation!==operationGeneration)return;
    setMessageDownload(null);
    logCryptoFailure(e,dec);
    show(getUserErrorMessage(e,dec,MSG),1);
  }finally{busy(false)}
}
async function runFile(decrypting){
  clearLegacyMigration();
  const file=fileInput.files[0];
  const fileStatus=$('fileStatus');
  if(!file){fileStatus.textContent='Choose a file to continue.';return}
  const maxSize=decrypting?MAX_ENCRYPTED_FILE_BYTES:MAX_FILE_BYTES;
  if(file.size>maxSize){
    fileStatus.textContent=MSG.filetoolarge;
    fileStatus.classList.add('error');
    return;
  }
  const password=key.value;
  if(!password){fileStatus.textContent='Enter your access key to continue.';key.focus();return}
  if(password.length<10){fileStatus.textContent=MSG.short;key.focus();return}
  fileStatus.textContent='';
  fileStatus.classList.remove('error');
  const suggestedName=decrypting?'decrypted-file.bin':'encrypted-file.hwf2';
  const useSavePicker=typeof window.showSaveFilePicker==='function'&&file.size>=64*1024*1024;
  let pickerPromise=null;
  if(useSavePicker){
    try{pickerPromise=window.showSaveFilePicker({suggestedName})}
    catch(error){fileStatus.textContent='Could not open the save dialog. Check browser permissions and try again.';fileStatus.classList.add('error');return}
  }
  busy(true,decrypting?'Decrypting file':'Encrypting file');
  fileStatus.textContent=`${decrypting?'Decrypting':'Encrypting'} file. Please wait.`;
  const generation=operationGeneration;
  let writable=null;
  let committed=false;
  const parts=[];
  let lastProgress=-1;
  const reportProgress=(complete,total)=>{
    if(locked||generation!==operationGeneration)throw new Error('cancelled');
    const percent=total?Math.floor(complete*100/total):100;
    const step=Math.floor(percent/5);
    if(step!==lastProgress){
      lastProgress=step;
      fileStatus.textContent=`${decrypting?'Decrypting':'Encrypting'} file: ${percent}%`;
    }
  };
  try{
    if(!subtle)throw new Error('nocrypto');
    if(pickerPromise)writable=await pickerPromise.then(handle=>handle.createWritable());
    if(decrypting){
      const prefix=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
      if(prefix==='HWF1.'){
        if(file.size>LEGACY_MAX_FILE_TOKEN_CHARS)throw new Error('filetoolarge');
        const plaintext=await decryptFileToken((await file.text()).trim(),password);
      if(locked||generation!==operationGeneration)throw new Error('cancelled');
        if(writable)await writable.write(plaintext);
        else parts.push(plaintext);
      }else{
        const magic=new Uint8Array(await file.slice(0,FILE_MAGIC.length).arrayBuffer());
        if(!FILE_MAGIC.every((byte,index)=>magic[index]===byte))throw new Error('fileformat');
        await decryptFileStream(file,password,async chunk=>{
          if(locked||generation!==operationGeneration)throw new Error('cancelled');
          if(writable)await writable.write(chunk);
          else if(chunk.length)parts.push(chunk);
        },reportProgress);
      }
    }else{
      await encryptFileStream(file,password,async chunk=>{
        if(locked||generation!==operationGeneration)throw new Error('cancelled');
        if(writable)await writable.write(chunk);
        else parts.push(chunk);
      },reportProgress);
    }
    if(locked||generation!==operationGeneration)throw new Error('cancelled');
    if(writable){await writable.close();committed=true}
    else triggerDownload(new Blob(parts,{type:'application/octet-stream'}),suggestedName);
    fileStatus.textContent=decrypting
      ?`Decrypted file saved as ${suggestedName}. The original filename and type are not recoverable.`
      :`Encrypted file saved as ${suggestedName}. The original filename and type are not included.`;
  }catch(error){
    const stale=locked||generation!==operationGeneration;
    let cleanupFailed=false;
    if(writable&&!committed){
      try{await writable.abort()}
      catch(abortError){
        logCryptoFailure(abortError,true);
        cleanupFailed=true;
        if(!stale){
          fileStatus.textContent='The operation failed and the incomplete output could not be removed. Check the selected save location and delete any partial file.';
          fileStatus.classList.add('error');
        }
      }
    }
    if(stale)return;
    if(error.name==='AbortError'&&!cleanupFailed){
      fileStatus.textContent='File save was cancelled.';
      return;
    }
    logCryptoFailure(error,decrypting);
    if(cleanupFailed)return;
    fileStatus.textContent=error.message==='fileformat'?MSG.fileformat:getUserErrorMessage(error,decrypting,MSG);
    fileStatus.classList.add('error');
  }finally{busy(false)}
}
function downloadMessageToken(){
  if(!lastEncryptedToken)return;
  triggerDownload(new Blob([lastEncryptedToken],{type:'text/plain;charset=utf-8'}),'encrypted-message.txt');
}
async function generateRsa(){
  const button=$('generateRsa');button.disabled=true;
  const generation=operationGeneration;
  try{
    const hasCurrentKey=rsaPrivateCryptoKey||rsaPrivate.value.trim()||rsaPublic.value.trim();
    if(hasCurrentKey&&!confirm('Replace the current RSA key material? Messages encrypted to the current key will not decrypt with the new key. If its private key is non-extractable and not otherwise backed up, it cannot be recovered. Continue?'))return;
    if(!subtle)throw new Error('nocrypto');
    const exportable=$('rsaKeyMode').value==='exportable';
    const pair=await generateRsaKeyPair({exportable,modulusLength:Number($('rsaKeySize').value)});
    if(locked||generation!==operationGeneration)return;
    rsaPrivateCryptoKey=pair.privateKey;
    rsaGeneratedAt=pair.generatedAt;
    rsaPrivateKeyState=exportable?'generated-exportable':'generated-nonextractable';
    rsaPublic.value=pair.publicKey;
    rsaPrivate.value=pair.privatePem||'';
    updateRsaKeySummary();
    $('copyPrivate').hidden=!pair.privatePem;
    $('rsaBackupReminder').hidden=!exportable;
    await updateRsaFingerprint();
    if(locked||generation!==operationGeneration)return;
    show(exportable
      ?'Exportable RSA key pair generated. Store the private-key backup securely before relying on this key.'
      :'Non-extractable RSA key pair generated in memory. It cannot be backed up by this app and will be lost on lock, page close, or reload.',false);
  }catch(e){
    if(locked||generation!==operationGeneration)return;
    show(e.message==='nocrypto'?MSG.nocrypto:'Could not generate the RSA key pair. Check browser support and try again.',true);
  }finally{button.disabled=locked}
}
function updateRsaKeySummary(){
  const created=rsaGeneratedAt?new Date(rsaGeneratedAt).toLocaleString():'Not recorded';
  const generatedBits=rsaPrivateCryptoKey?.algorithm?.modulusLength;
  const state={
    none:'No private key loaded',
    'generated-nonextractable':`Generated RSA-${generatedBits}, non-extractable · memory only`,
    'generated-exportable':`Generated RSA-${generatedBits}, exportable · backup required`,
    imported:'Imported private key · creation date unknown',
    cleared:'Private key cleared by privacy lock'
  }[rsaPrivateKeyState];
  $('rsaKeySummary').textContent=`Created: ${created} · ${state}`;
}
function updateRsaKeyModeHint(){
  const exportable=$('rsaKeyMode').value==='exportable';
  $('rsaKeyModeHint').textContent=exportable
    ?'The private key will be exportable PEM and visible in this page. Store it securely before using this key; anyone who obtains it can decrypt messages addressed to it.'
    :'The private key stays as a non-extractable CryptoKey in this page’s memory. It is cleared on lock, page close, or reload and cannot be backed up by this app. If lost, messages encrypted to this key cannot be recovered.';
}
async function updateRsaFingerprint(){
  const generation=++fingerprintGeneration;
  const display=$('rsaFingerprint'),message=$('fingerprintStatus');
  display.textContent='Calculating…';
  message.classList.remove('error');
  try{
    const fingerprint=await fingerprintRsaPublicKey(rsaPublic.value);
    if(locked||generation!==fingerprintGeneration)return;
    display.textContent=fingerprint;
    message.setAttribute('aria-label',`SHA-256 public-key fingerprint: ${fingerprint}`);
  }catch(error){
    if(locked||generation!==fingerprintGeneration)return;
    display.textContent=rsaPublic.value.trim()?'Invalid RSA public key':'Not calculated';
    message.classList.add('error');
    message.setAttribute('aria-label','Could not calculate public-key fingerprint. Check that the public key is valid RSA SPKI PEM.');
  }
}
function scheduleRsaFingerprint(){
  if(locked)return;
  clearTimeout(fingerprintTimer);
  fingerprintGeneration++;
  if(!rsaPublic.value.trim()){
    $('rsaFingerprint').textContent='Not calculated';
    $('fingerprintStatus').classList.remove('error');
    return;
  }
  $('rsaFingerprint').textContent='Waiting for key input…';
  fingerprintTimer=setTimeout(()=>updateRsaFingerprint(),300);
}
async function copyKey(field,label){
  const value=field.value.trim();
  if(!value){show(`No ${label} is available to copy.`,true);return}
  const copied=await copyText(value,field);
  show(copied?`${label} copied to the clipboard.`:`Copy failed. The ${label} text is selected for manual copying.`,!copied);
}
let copyFeedbackTimer=null;
function flash(t){
  clearTimeout(copyFeedbackTimer);
  copyB.textContent=t;
  copyFeedbackTimer=setTimeout(()=>{copyB.textContent='Copy output'},1400);
}
function selectText(target){
  target.focus();
  if(typeof target.select==='function'){
    target.select();
    return;
  }
  const selection=window.getSelection();
  if(!selection)return;
  const range=document.createRange();
  range.selectNodeContents(target);
  selection.removeAllRanges();
  selection.addRange(range);
}
async function copyText(text,target){
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch{}
  const fallback=document.createElement('textarea');
  fallback.value=text;
  fallback.className='clipboard-fallback';
  document.body.appendChild(fallback);
  fallback.select();
  let copied=false;
  try{copied=document.execCommand('copy')}catch{}
  fallback.remove();
  if(!copied)selectText(target);
  return copied;
}
async function copy(){
  const t=out.textContent;
  if(!t||t===EMPTY||out.classList.contains('err'))return;
  audio.play('blip');
  const copied=await copyText(t,out);
  flash(copied?'Copied!':'Copy failed');
}

function clearSensitiveWorkspace(){
  locked=true;
  operationGeneration++;
  fingerprintGeneration++;
  clearTimeout(fingerprintTimer);
  key.value='';
  key.type='password';
  rsaPrivate.value='';
  rsaPrivateCryptoKey=null;
  rsaPrivateKeyState='cleared';
  updateRsaKeySummary();
  $('copyPrivate').hidden=true;
  $('rsaBackupReminder').hidden=true;
  inp.value='';
  fileInput.value='';
  $('fileStatus').textContent='';
  $('fileStatus').classList.remove('error');
  clearLegacyMigration();
  setMessageDownload(null);
  show(EMPTY);
  copyB.textContent='Copy output';
  $('eye').textContent='Show';
  $('eye').setAttribute('aria-pressed','false');
  $('eye').setAttribute('aria-label','Show access key');
  $('eye').title='Show access key';
  audio.reset();
}

/* ================= Wiring ================= */
encB.addEventListener('click',()=>run(false));
decB.addEventListener('click',()=>run(true));
clrB.addEventListener('click',()=>{audio.play('blip');inp.value='';fileInput.value='';$('fileStatus').textContent='';$('fileStatus').classList.remove('error');clearLegacyMigration();setMessageDownload(null);show(EMPTY);inp.focus()});
copyB.addEventListener('click',copy);
downloadTokenB.addEventListener('click',downloadMessageToken);
fileEncryptB.addEventListener('click',()=>runFile(false));
fileDecryptB.addEventListener('click',()=>runFile(true));
fileInput.addEventListener('change',()=>{$('fileStatus').textContent='';$('fileStatus').classList.remove('error');updateActionButtons()});
mode.addEventListener('change',()=>{clearLegacyMigration();show(EMPTY);refresh()});
$('aesKeySize').addEventListener('change',()=>{clearLegacyMigration();show(EMPTY);refresh()});
$('generateRsa').addEventListener('click',generateRsa);
$('rsaPublic').addEventListener('input',scheduleRsaFingerprint);
$('rsaKeyMode').addEventListener('change',updateRsaKeyModeHint);
$('rsaPrivate').addEventListener('input',()=>{
  rsaPrivateCryptoKey=null;
  rsaGeneratedAt=null;
  if(rsaPrivate.value.trim()){
    rsaPrivateKeyState='imported';
    $('rsaBackupReminder').hidden=true;
  }else rsaPrivateKeyState='none';
  updateRsaKeySummary();
  $('copyPrivate').hidden=!rsaPrivate.value.trim();
});
$('copyPublic').addEventListener('click',()=>copyKey(rsaPublic,'public key'));
$('copyPrivate').addEventListener('click',()=>copyKey(rsaPrivate,'private key'));
$('eye').addEventListener('click',e=>{
  audio.play('click');const show_=key.type==='password';
  key.type=show_?'text':'password';e.currentTarget.textContent=show_?'Hide':'Show';
  e.currentTarget.title=show_?'Hide access key':'Show access key';
  e.currentTarget.setAttribute('aria-pressed',show_);e.currentTarget.setAttribute('aria-label',show_?'Hide access key':'Show access key');
});
inp.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run(e.shiftKey)}
});
inp.addEventListener('input',()=>{clearLegacyMigration();if(!inp.value.trim())show(EMPTY)});
$('migrateLegacy').addEventListener('click',()=>{
  if(typeof legacyMigrationText!=='string')return;
  inp.value=legacyMigrationText;
  legacyMigrationText=null;
  $('migrateLegacy').hidden=true;
  mode.value='aes';
  key.value='';
  setMessageDownload(null);
  refresh();
  $('migrationStatus').textContent='Legacy plaintext is ready in the message field. Enter a new, strong access key, then select Encrypt message to protect it with AES-256-GCM.';
  $('migrationStatus').hidden=false;
  key.focus();
});

createWorkspaceLock({
  card,
  lockScreen,
  resumeButton:$('resumeB'),
  lockMessage:$('lockMessage'),
  onLock:clearSensitiveWorkspace,
  onResume(){
    locked=false;
    refresh();
    inp.focus();
  }
});
refresh();
})();
