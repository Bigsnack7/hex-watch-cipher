import {
  AES_TAG, LEGACY_AES_TAG, CBC_TAG, RSA_TAG, RSA_DIRECT_TAG, RSA_AES_TAG, MAX_MESSAGE_BYTES,
  MAX_SIGNED_MESSAGE_CHARS, generateEcdsaKeyPair, fingerprintEcdsaPublicKey,
  signMessageToken, verifyMessageToken, isSignedMessageToken,
  encryptAesGcm, decryptAesGcm, encryptCbcHmac, decryptCbcHmac,
  encryptRsaHybrid, decryptRsaHybrid, encryptRsaDirect, decryptRsaDirect,
  encryptRsaThenAes, decryptRsaThenAes,
  generateRsaKeyPair, fingerprintRsaPublicKey,
  encryptGrumpyV2, decryptGrumpyV2,
  MAX_FILE_BYTES, FILE_MAGIC, MAX_ENCRYPTED_FILE_BYTES,
  LEGACY_MAX_FILE_TOKEN_CHARS, encryptFileStream, decryptFileStream, decryptFileToken
} from './crypto.mjs';
import { createAudioController } from './ui/audio.mjs';
import { createWorkspaceLock } from './ui/workspace-lock.mjs';
import { getUserErrorMessage, logCryptoFailure } from './errors.mjs';
import { countPassphraseCharacters, estimatePassphraseStrength, generatePassphrase } from './passphrase.mjs';
import { HASH_DIGEST_LENGTHS, digestMatches, normalizeExpectedDigest } from './hash-verification.mjs';
import { serializeHashResultsCsv } from './hash-results.mjs';
import { isHashFileSizeAllowed } from './hashing.mjs';
import { supportsAesGcmKeySize } from './aes-gcm-support.mjs';

(function(){
'use strict';
const $=id=>document.getElementById(id);
const inp=$('inp'),key=$('key'),out=$('out'),mode=$('mode'),status=$('status'),
  encB=$('encB'),decB=$('decB'),clrB=$('clrB'),copyB=$('copy'),
  rsaPublic=$('rsaPublic'),rsaPrivate=$('rsaPrivate'),card=$('card'),lockScreen=$('lockScreen'),
  fileInput=$('fileInput'),fileEncryptB=$('fileEncrypt'),fileDecryptB=$('fileDecrypt'),downloadTokenB=$('downloadToken'),
  hashInput=$('hashInput'),hashDropzone=$('hashDropzone'),hashSelected=$('hashSelected'),hashOutput=$('hashOutput'),
  expectedHash=$('expectedHash'),expectedHashAlgorithm=$('expectedHashAlgorithm'),
  keyStrengthMeter=$('keyStrengthMeter'),
  keyStrengthStatus=$('keyStrengthStatus'),keyLengthStatus=$('keyLengthStatus');
const aes192Option=$('aesKeySize').querySelector('option[value="192"]');
const aesKeySizeHint=$('aesKeySizeHint');
const defaultAesKeySizeHint=aesKeySizeHint.textContent;
aes192Option.disabled=true;
aesKeySizeHint.textContent='Checking whether this browser supports AES-192-GCM.';
const subtle=window.crypto&&crypto.subtle;
let locked=false,operationGeneration=0,operationBusy=false,hashGeneration=0;
let activeHashWorker=null,cancelActiveHash=null;
let legacyWarningAcknowledged=false,lastSelectedMode=mode.value;
let lastEncryptedToken=null;
let legacyMigrationText=null;
let latestHashResults=[];
let fingerprintTimer=null,fingerprintGeneration=0,signingFingerprintTimer=null,signingFingerprintGeneration=0;
let rsaPrivateCryptoKey=null;
let rsaGeneratedAt=null,rsaPrivateKeyState='none';
let ecdsaPrivateCryptoKey=null;
const operationControls=[
  encB,decB,clrB,copyB,downloadTokenB,key,inp,mode,$('aesKeySize'),$('eye'),
  $('passphraseLength'),$('generatePassphrase'),
  rsaPublic,rsaPrivate,$('rsaKeyMode'),$('rsaKeySize'),$('generateRsa'),
  $('copyPublic'),$('copyPrivate'),$('migrateLegacy'),fileInput,hashInput,$('exportHashResults'),
  $('signMessage'),$('signingKeyMode'),$('ecdsaPublicKey'),$('ecdsaPrivateKey'),
  $('generateEcdsa'),$('copyEcdsaPublic'),$('copyEcdsaPrivate'),$('verifySignature')
];
/* ================= UI logic ================= */
const EMPTY='Your result will appear here.';
const audio=createAudioController({isLocked:()=>locked});
const MSG={auth:'Authentication failed. Check the access key or verify that the message has not been altered.',
  operation:'Encryption failed. Check your input and try again.',
  decryptFailure:'Unable to decrypt this message. Verify the key and token, then try again.',
  fileDecryptFailure:'Unable to decrypt this file. Verify the access key and file, then try again.',
  fileio:'Could not read or write the file. Check the selected file, available storage, and file permissions, then try again.',
  signature:'Signature verification failed. Check the signer public key and confirm the message was not changed.',
  signing:'Could not create the digital signature. Check the signing key and try again.',
  format:'This is not a valid encrypted token.',nocrypto:'Web Crypto is unavailable. Open this page over HTTPS or from localhost.',
  short:'Use an access key with at least 10 characters for password-based encryption.',
  keyformat:'The RSA key is not valid PEM in the required format.',
  rsakeytoolarge:'RSA key text exceeds the 20,000-character processing limit.',
  keylarge:'RSA keys larger than 8192 bits are not supported.',
  signformat:'Only supported encrypted message tokens can be signed.',
  signingprivate:'Generate or import a private ECDSA signing key before signing.',
  signingpublic:'Paste the trusted ECDSA public key before verifying this signature.',
  signingkeyformat:'The ECDSA signing key is invalid. Use a P-256 SPKI public key or PKCS#8 private key in PEM format.',
  signingkeymismatch:'The private signing key does not match the displayed public signing key. Restore the matching key pair before signing.',
  signunsupported:'Legacy Grumpy v2 output cannot be signed as an encrypted message. Use a modern encryption method.',
  keytoolarge:'Access keys cannot exceed 4,096 UTF-8 bytes.',
  toolarge:'Messages are limited to 100,000 UTF-8 bytes; encrypted tokens are limited to 140,000 characters and signed tokens to 200,000.',
  filetoolarge:'Files are limited to 1 GiB. Legacy HWF1 encrypted files are limited to 1 MiB.',
  fileformat:'This file is not a supported HWF2 encrypted file.',
  keyweak:'RSA keys must be at least 2048 bits.',
  rsasizelimit:'RSA-first encryption supports only short messages. The limit depends on key size (190 UTF-8 bytes with RSA-2048); use AES-GCM + RSA-OAEP Hybrid for longer messages.',
  publickey:'Enter a valid RSA public key to encrypt this message.',
  privatekey:'Enter the matching RSA private key to decrypt this message.'};
function show(t,err){out.textContent=t;out.classList.toggle('err',!!err)}
function updateActionButtons(){
  const unavailable=locked||operationBusy;
  operationControls.forEach(control=>{
    control.disabled=unavailable||(control.id==='signMessage'&&mode.value==='legacy');
  });
  $('exportHashResults').disabled=unavailable||!latestHashResults.length;
  fileEncryptB.disabled=fileDecryptB.disabled=locked||operationBusy||!fileInput.files.length;
  downloadTokenB.disabled=locked||operationBusy||!lastEncryptedToken;
}
function formatHashFileSize(bytes){
  if(bytes<1024)return `${bytes} B`;
  const units=['KB','MB','GB','TB'];
  let size=bytes/1024,index=0;
  while(size>=1024&&index<units.length-1){size/=1024;index++}
  return `${size.toFixed(size<10?1:0)} ${units[index]}`;
}
function cancelHashWorker(){
  const cancel=cancelActiveHash;
  cancelActiveHash=null;
  activeHashWorker=null;
  if(cancel)cancel();
}
function computeFileHashes(file,algorithms){
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./hash-worker.mjs',import.meta.url),{type:'module'});
    activeHashWorker=worker;
    let settled=false;
    const finish=(handler,value)=>{
      if(settled)return;
      settled=true;
      if(activeHashWorker===worker){
        activeHashWorker=null;
        cancelActiveHash=null;
      }
      worker.terminate();
      handler(value);
    };
    cancelActiveHash=()=>finish(reject,new Error('hash-cancelled'));
    worker.addEventListener('message',event=>{
      if(event.data?.type==='read-error'){
        finish(reject,new Error('hash-read'));
      }else if(event.data?.type==='result'){
        finish(resolve,event.data);
      }else{
        finish(reject,new Error('hash-worker'));
      }
    },{once:true});
    worker.addEventListener('error',()=>finish(reject,new Error('hash-worker')),{once:true});
    worker.addEventListener('messageerror',()=>finish(reject,new Error('hash-worker')),{once:true});
    try{
      worker.postMessage({file,algorithms});
    }catch{
      finish(reject,new Error('hash-worker'));
    }
  });
}
const busy=(b,action='')=>{
  operationBusy=b;
  $('operationStatus').textContent=b?`${action}. Please wait.`:'';
  updatePassphraseStrength();
  updateActionButtons();
};
function setMessageDownload(token){
  lastEncryptedToken=token;
  updateActionButtons();
}
function invalidateMessageResult(){
  setMessageDownload(null);
  clearLegacyMigration();
  $('signatureStatus').textContent='';
  show(EMPTY);
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
function setHashMessage(text,isError=false){
  hashOutput.innerHTML='';
  const message=document.createElement('p');
  message.className=`hash-message${isError?' error':''}`;
  message.textContent=text;
  hashOutput.appendChild(message);
}
function updatePassphraseStrength(){
  const target=Number($('passphraseLength').value);
  const actual=countPassphraseCharacters(key.value);
  const difference=target-actual;
  const estimate=estimatePassphraseStrength(key.value,target);
  $('keyCheck-length').querySelector('span:last-child').textContent=`Exactly ${target} characters`;
  const checklist=estimate?.checks||{
    length:false,lowercase:false,uppercase:false,numbers:false,symbols:false
  };
  const lengthStatus=!key.value
    ?`Enter ${target} characters for new password-based encryption.`
    :difference===0
      ?`${actual}/${target} characters — selected length met.`
      :difference>0
        ?`${actual}/${target} characters — enter ${difference} more.`
        :`${actual}/${target} characters — remove ${Math.abs(difference)}.`;
  keyLengthStatus.textContent=lengthStatus;
  for(const [check,passed] of Object.entries(checklist)){
    const item=$(`keyCheck-${check}`);
    item.classList.toggle('is-met',passed);
    item.setAttribute('aria-label',`${item.dataset.label}: ${passed?'met':'not met'}`);
  }
  const score=estimate?.score||0;
  keyStrengthMeter.setAttribute('aria-valuetext',estimate?`${estimate.level} estimate, ${score} out of 100`:'No estimate');
  keyStrengthMeter.value=score;
  keyStrengthMeter.dataset.level=estimate?.level||'empty';
  keyStrengthStatus.className=`key-strength-status${estimate?` ${estimate.level}`:''}`;
  keyStrengthStatus.textContent=estimate
    ?`${estimate.level[0].toUpperCase()}${estimate.level.slice(1)} estimate · ${score}/100`
    :'Add an access key to see an estimate.';
  $('keyStrengthGuidance').textContent=estimate?.guidance
    ||'Use a long, unique passphrase. You can type one or generate it securely.';
}
function accessKeyLengthError(value){
  const target=Number($('passphraseLength').value);
  return `New password-based encryption requires exactly ${target} characters. Your access key has ${countPassphraseCharacters(value)}.`;
}
function clearHashWorkspace(){
  hashGeneration++;
  cancelHashWorker();
  hashInput.value='';
  hashSelected.textContent='No file chosen';
  expectedHash.value='';
  latestHashResults=[];
  $('exportHashResults').disabled=true;
  $('hashProgress').textContent='';
  hashOutput.replaceChildren();
}
function exportHashResults(){
  if(!latestHashResults.length)return;
  triggerDownload(new Blob([serializeHashResultsCsv(latestHashResults)],{
    type:'text/csv;charset=utf-8'
  }),'file-hash-results.csv');
  audio.announceHashExported();
}
async function handleHashFileSelect(fileList,announce=true){
  const generation=++hashGeneration;
  cancelHashWorker();
  const files=[...fileList || []];
  latestHashResults=[];
  $('exportHashResults').disabled=true;
  if(!files.length){
    hashSelected.textContent='No file chosen';
    $('hashProgress').textContent='';
    hashOutput.replaceChildren();
    setHashMessage('Choose a file to calculate its hash value.');
    if(announce)audio.announceStatus('hashFailed');
    return;
  }
  const expectedValue=expectedHash.value.trim();
  const expectedAlgorithm=expectedHashAlgorithm.value;
  let normalizedExpected=null;
  if(expectedValue){
    try{
      normalizedExpected=normalizeExpectedDigest(expectedValue,expectedAlgorithm);
    }catch{
      $('hashProgress').textContent='';
      hashOutput.replaceChildren();
      const expectedLength=HASH_DIGEST_LENGTHS[expectedAlgorithm];
      setHashMessage(`Enter a valid ${expectedAlgorithm.toUpperCase()} digest containing exactly ${expectedLength} hexadecimal characters.`,true);
      audio.announceInvalidExpectedHash(expectedAlgorithm,expectedLength);
      return;
    }
  }
  const algorithms=new Set([...document.querySelectorAll('input[name="hashAlgorithm"]:checked')].map(input=>input.value));
  if(normalizedExpected)algorithms.add(expectedAlgorithm);
  if(!algorithms.size){
    hashSelected.textContent=`${files.length} file${files.length > 1 ? 's' : ''} selected`;
    setHashMessage('Select at least one hash algorithm.', true);
    $('hashProgress').textContent='';
    if(announce)audio.announceStatus('hashFailed');
    return;
  }
  hashSelected.textContent=files.length === 1 ? files[0].name : `${files.length} files selected`;
  hashOutput.innerHTML='';
  latestHashResults=[];
  $('exportHashResults').disabled=true;
  $('hashProgress').textContent=`Preparing to calculate ${files.length} file${files.length===1?'':'s'}…`;
  if(announce)audio.announceStatus('hashSelected');
  let encounteredError=false;
  for(const [fileIndex,file] of files.entries()){
    $('hashProgress').textContent=`Calculating ${fileIndex+1} of ${files.length}: ${file.name}`;
    if(generation!==hashGeneration)return;
    let hashResults=null;
    let readFailed=false;
    if(isHashFileSizeAllowed(file.size)){
      try{
        hashResults=await computeFileHashes(file,[...algorithms]);
      }catch(error){
        if(generation!==hashGeneration)return;
        readFailed=error.message==='hash-read';
        if(!readFailed)hashResults={digests:Object.fromEntries([...algorithms].map(algorithm=>[algorithm,null]))};
      }
    }
    if(generation!==hashGeneration)return;
    if(readFailed){
      encounteredError=true;
      const item=document.createElement('article');
      item.className='hash-file-result';
      const title=document.createElement('h3');
      title.textContent=`${file.name} · ${formatHashFileSize(file.size)}`;
      const message=document.createElement('p');
      message.className='hash-message error';
      message.textContent='Could not read this file. Try a smaller file or check browser memory.';
      item.append(title,message);
      hashOutput.appendChild(item);
      latestHashResults.push({
        filename:file.name,size:file.size,algorithm:'',digest:'',expectedMatch:null,status:'read error'
      });
      continue;
    }
    if(generation!==hashGeneration)return;
    const item=document.createElement('article');
    item.className='hash-file-result';
    const title=document.createElement('h3');
    title.textContent=`${file.name} · ${formatHashFileSize(file.size)}`;
    const list=document.createElement('ul');
    list.className='hash-value-list';
    for(const algorithm of algorithms){
      const row=document.createElement('li');
      row.className='hash-value-row';
      const label=document.createElement('span');
      label.textContent=algorithm.toUpperCase();
      const value=document.createElement('code');
      value.textContent='Calculating…';
      const digestActions=document.createElement('div');
      digestActions.className='hash-digest-actions';
      const copyButton=document.createElement('button');
      copyButton.type='button';
      copyButton.className='hash-copy-button';
      copyButton.textContent='Copy';
      copyButton.disabled=true;
      const copyLabel=`Copy ${algorithm.toUpperCase()} digest for ${file.name}`;
      copyButton.setAttribute('aria-label',copyLabel);
      copyButton.addEventListener('click',async()=>{
        const copied=await copyText(value.textContent,value);
        copyButton.textContent=copied?'Copied':'Copy failed';
        copyButton.setAttribute('aria-label',copied
          ?`${algorithm.toUpperCase()} digest copied`
          :`Copy failed. ${algorithm.toUpperCase()} digest is selected for manual copying`);
        setTimeout(()=>{
          if(!copyButton.isConnected)return;
          copyButton.textContent='Copy';
          copyButton.setAttribute('aria-label',copyLabel);
        },1400);
        audio.announceHashDigestCopy(algorithm,copied);
      });
      digestActions.append(value,copyButton);
      row.append(label,digestActions);
      list.appendChild(row);
      const digest=hashResults?.digests[algorithm];
      if(digest){
        value.textContent=digest;
        copyButton.disabled=false;
        const result={filename:file.name,size:file.size,algorithm,digest,expectedMatch:null,status:'calculated'};
        if(normalizedExpected&&algorithm===expectedAlgorithm){
          const matches=digestMatches(digest,normalizedExpected);
          result.expectedMatch=matches;
          const verdict=document.createElement('span');
          verdict.className=`hash-verdict ${matches?'match':'mismatch'}`;
          verdict.setAttribute('role','status');
          verdict.textContent=`Expected ${expectedAlgorithm.toUpperCase()}: ${matches?'Match':'Mismatch'}`;
          row.appendChild(verdict);
        }
        latestHashResults.push(result);
      }else{
        encounteredError=true;
        value.textContent=!isHashFileSizeAllowed(file.size)
          ?'Exceeds 256 MiB hashing limit'
          :'Unavailable';
        copyButton.disabled=true;
        row.style.color='var(--danger)';
        latestHashResults.push({
          filename:file.name,size:file.size,algorithm,digest:'',expectedMatch:null,
          status:!isHashFileSizeAllowed(file.size)?'too large':'unavailable'
        });
      }
    }
    if(!isHashFileSizeAllowed(file.size)){
      const message=document.createElement('p');
      message.className='hash-message error';
      message.textContent='Hashing is limited to 256 MiB per file to reduce browser memory pressure.';
      item.append(title,message,list);
    }else{
      item.append(title,list);
    }
    hashOutput.appendChild(item);
  }
  $('exportHashResults').disabled=!latestHashResults.length;
  const successfulDigests=latestHashResults.filter(result=>result.status==='calculated').length;
  const errorRows=latestHashResults.length-successfulDigests;
  const expectedResults=latestHashResults.filter(result=>
    result.algorithm===expectedAlgorithm&&result.expectedMatch!==null
  );
  if(normalizedExpected){
    const matches=expectedResults.filter(result=>result.expectedMatch).length;
    const mismatches=expectedResults.length-matches;
    audio.announceHashVerification(expectedAlgorithm,matches,mismatches,files.length-expectedResults.length);
  }else if(announce){
    audio.announceStatus(encounteredError?'hashFailed':'hashCalculated');
  }
  $('hashProgress').textContent=encounteredError
    ?`Finished with read or calculation errors. ${successfulDigests} digest${successfulDigests===1?'':'s'} available; ${errorRows} error row${errorRows===1?'':'s'} recorded.`
    :`Calculated ${successfulDigests} digest${successfulDigests===1?'':'s'} for ${files.length} file${files.length===1?'':'s'}.`;
}
function refresh(){
  const selected=mode.value;
  const hybridMode=selected==='hybrid'||selected==='rsa-direct'||selected==='rsa-aes';
  const aesKeyBits=Number($('aesKeySize').value);
  const rsaKeyBits=Number($('rsaKeySize').value);
  const rsaMaxBytes=rsaKeyBits/8-66;
  const descriptions={
    aes:[`Authenticated AES-${aesKeyBits}-GCM with PBKDF2-SHA-256. Each message gets a random salt and IV.`,`AES-${aesKeyBits}-GCM · PBKDF2-SHA-256 · 600,000 iterations · Tamper detection`],
    cbc:['Compatibility option. AES-256-CBC uses a separate HMAC-SHA-256 key and verifies the authentication tag before decryption. Prefer AES-256-GCM for new messages.','AES-256-CBC with HMAC-SHA-256 · Encrypt-then-MAC · Compatibility'],
    'rsa-direct':[`Direct RSA-OAEP-SHA-256 encryption. With the selected generated RSA-${rsaKeyBits} key, messages are limited to ${rsaMaxBytes} UTF-8 bytes. Use AES-GCM + RSA-OAEP Hybrid for longer messages.`,`RSA-OAEP-SHA-256 · Direct encryption · ${rsaMaxBytes} UTF-8 bytes maximum with generated RSA-${rsaKeyBits}`],
    'rsa-aes':[`RSA-OAEP-SHA-256 encrypts the short message first; passphrase-derived AES-256-GCM then wraps that RSA ciphertext. Both the matching private key and access key are required. With the selected generated RSA-${rsaKeyBits} key, the message limit is ${rsaMaxBytes} UTF-8 bytes; pasted public keys have their own limit. Uses RSA3 format.`,`RSA-OAEP → AES-256-GCM · Dual-key envelope · RSA3 format · ${rsaMaxBytes} UTF-8 bytes with generated RSA-${rsaKeyBits}`],
    hybrid:['AES-256-GCM encrypts the message with a fresh random key; RSA-OAEP-SHA-256 wraps that key for the recipient. This standard hybrid method uses the RSA1 token format.','AES-256-GCM + RSA-OAEP-SHA-256 · Hybrid encryption · RSA1 format'],
    legacy:['WARNING: Grumpy v2 encryption and decryption are available only for legacy compatibility and testing. It is cryptographically insecure, provides no reliable confidentiality or tamper detection, and must never protect sensitive data. Use AES-256-GCM instead.','Grumpy v2 · Legacy encryption/decryption · INSECURE']
  };
  $('modeHint').textContent=descriptions[selected][0];
  $('rsaKeys').hidden=!hybridMode;
  $('aesKeySizeField').hidden=selected!=='aes';
  if(selected==='legacy'&&$('signMessage').checked){
    $('signMessage').checked=false;
    $('signatureStatus').textContent='Digital signatures are unavailable for insecure Grumpy v2 output.';
    audio.announceSignatureEvent('unsupported');
  }
  $('keyHint').textContent=selected==='rsa-aes'
    ?'RSA-first dual-key encryption uses this access key together with the recipient private key. New encryption requires exactly the selected access-key length; decryption does not. Maximum 4,096 UTF-8 bytes. The message is limited by the recipient RSA key size.'
    :hybridMode
    ?'RSA text encryption does not use this access key. It remains available for AES-256-GCM file encryption, which requires exactly the selected length when encrypting. Maximum 4,096 UTF-8 bytes.'
    :selected==='legacy'
    ?'WARNING: Grumpy v2 is cryptographically insecure and provides no reliable confidentiality or tamper detection. Use it only for legacy compatibility/testing, never sensitive messages. Enter a non-empty legacy key; this mode does not use AES/CBC NFKC normalization.'
    :'Choose a long, unique passphrase; a randomly generated one is preferable to a short or predictable password. New password-based encryption requires exactly the selected length; decryption does not. AES/CBC normalize passphrases with Unicode NFKC before deriving keys. Maximum 4,096 UTF-8 bytes.';
  status.className='info'+(selected==='legacy'||!subtle?' warn':'');
  status.textContent=!subtle?MSG.nocrypto:descriptions[selected][1];
  $('signMessage').disabled=locked||operationBusy||selected==='legacy';
  audio.setNarrationMode(selected);
  audio.setNarrationKeySize(aesKeyBits);
  audio.setNarrationRsaKeySize(rsaKeyBits);
  updateActionButtons();
}
function disableAes192(message){
  aes192Option.disabled=true;
  aes192Option.textContent='192 bits · 24-byte key · Unavailable in this browser';
  aesKeySizeHint.textContent=message;
  if($('aesKeySize').value==='192'){
    $('aesKeySize').value='256';
    invalidateMessageResult();
    refresh();
  }
}
async function detectAes192Support(){
  if(!subtle){
    disableAes192('Web Crypto is unavailable, so AES-192 support could not be checked.');
    return;
  }
  try{
    if(await supportsAesGcmKeySize(subtle,192)){
      aes192Option.disabled=false;
      aes192Option.textContent='192 bits · 24-byte key';
      aesKeySizeHint.textContent=defaultAesKeySizeHint;
      return;
    }
    disableAes192('This browser does not support AES-192-GCM. Choose AES-128 or AES-256. Existing AES-192 tokens may not decrypt in this browser.');
  }catch(error){
    logCryptoFailure(error,false);
    disableAes192('AES-192-GCM support could not be confirmed, so this option is disabled. Choose AES-128 or AES-256.');
  }
}
async function run(dec){
  if(locked||operationBusy)return;
  const raw=inp.value;
  clearLegacyMigration();
  setMessageDownload(null);
  $('signatureStatus').textContent='';
  if(!raw.trim())return show(EMPTY);
  if(raw.length>MAX_SIGNED_MESSAGE_CHARS){show(MSG.toolarge,true);audio.announceStatus('operationFailed');return}
  let value=raw.trim();
  const isToken=isSignedMessageToken(value)||value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_TAG)||value.startsWith(CBC_TAG)||value.startsWith(RSA_TAG)||value.startsWith(RSA_DIRECT_TAG)||value.startsWith(RSA_AES_TAG);
  if((!dec||!isToken)&&new TextEncoder().encode(raw).length>MAX_MESSAGE_BYTES){
    show(MSG.toolarge,true);audio.announceStatus('operationFailed');return
  }
  if(dec&&isSignedMessageToken(value)&&!$('ecdsaPublicKey').value.trim()){
    show(MSG.signingpublic,true);$('ecdsaPublicKey').focus();audio.announceStatus('operationFailed');return;
  }
  if(!dec&&$('signMessage').checked){
    if(mode.value==='legacy'){show(MSG.signunsupported,true);audio.announceStatus('operationFailed');return}
    if(!ecdsaPrivateCryptoKey&&!$('ecdsaPrivateKey').value.trim()){
      show(MSG.signingprivate,true);$('ecdsaPrivateKey').focus();audio.announceStatus('operationFailed');return;
    }
    if(!$('ecdsaPublicKey').value.trim()){
      show(MSG.signingpublic,true);$('ecdsaPublicKey').focus();audio.announceStatus('operationFailed');return;
    }
  }
  const pw=key.value;
  busy(true,dec?'Decrypting message':'Encrypting message');
  const generation=operationGeneration;
  const signedInput=isSignedMessageToken(value)&&dec;
  let verifiedSignature=null;
  try{
    if(!subtle)throw new Error('nocrypto');
    if(dec&&isSignedMessageToken(value)){
      verifiedSignature=await verifyMessageToken(value,$('ecdsaPublicKey').value.trim());
      value=verifiedSignature.token;
      $('signatureStatus').textContent=`Signature verified. Signer key fingerprint: ${verifiedSignature.fingerprint}. Identity is confirmed only if you trust this fingerprint.`;
    }else if(dec){
      $('signatureStatus').textContent='Unsigned message. The sender’s identity has not been verified.';
    }
    if(dec){
      if(value.startsWith(RSA_AES_TAG))mode.value='rsa-aes';
      else if(value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_TAG))mode.value='aes';
      else if(value.startsWith(CBC_TAG))mode.value='cbc';
      else if(value.startsWith(RSA_TAG))mode.value='hybrid';
      else if(value.startsWith(RSA_DIRECT_TAG))mode.value='rsa-direct';
      refresh();
    }
    const selected=mode.value;
    let r;
    if(dec){
      if(value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_TAG)||value.startsWith(CBC_TAG)){
        if(!pw){show('Enter your access key to continue.',1);key.focus();audio.announceStatus('operationFailed');return}
        r=value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_TAG)
          ?await decryptAesGcm(value,pw):await decryptCbcHmac(value,pw);
      }else if(value.startsWith(RSA_DIRECT_TAG)){
        const privateKey=rsaPrivateCryptoKey||rsaPrivate.value.trim();
        if(!privateKey){show(MSG.privatekey,1);rsaPrivate.focus();audio.announceStatus('operationFailed');return}
        r=await decryptRsaDirect(value,privateKey);
      }else if(value.startsWith(RSA_AES_TAG)){
        if(!pw){show('Enter the access key used to encrypt this message.',1);key.focus();audio.announceStatus('operationFailed');return}
        const privateKey=rsaPrivateCryptoKey||rsaPrivate.value.trim();
        if(!privateKey){show(MSG.privatekey,1);rsaPrivate.focus();audio.announceStatus('operationFailed');return}
        r=await decryptRsaThenAes(value,privateKey,pw);
      }else if(value.startsWith(RSA_TAG)){
        const privateKey=rsaPrivateCryptoKey||rsaPrivate.value.trim();
        if(!privateKey){show(MSG.privatekey,1);rsaPrivate.focus();audio.announceStatus('operationFailed');return}
        r=await decryptRsaHybrid(value,privateKey);
      }else if(selected==='legacy'){
        if(!pw){show('Enter your access key to continue.',1);key.focus();audio.announceStatus('operationFailed');return}
        r=decryptGrumpyV2(raw,pw);
      }else throw new Error('format');
    }else if(selected==='legacy'){
      if(!pw){show('Enter a legacy access key to continue.',true);key.focus();audio.announceStatus('operationFailed');return}
      r=encryptGrumpyV2(raw,pw);
    }else if(selected==='rsa-direct'){
      if(!rsaPublic.value.trim()){show(MSG.publickey,1);rsaPublic.focus();audio.announceStatus('operationFailed');return}
      r=await encryptRsaDirect(raw,rsaPublic.value);
    }else if(selected==='rsa-aes'){
      if(!rsaPublic.value.trim()){show(MSG.publickey,1);rsaPublic.focus();audio.announceStatus('operationFailed');return}
      if(!pw){show('Enter an access key for the AES-GCM layer.',1);key.focus();audio.announceStatus('operationFailed');return}
      if(countPassphraseCharacters(pw)!==Number($('passphraseLength').value)){
        show(accessKeyLengthError(pw),1);key.focus();audio.announceStatus('operationFailed');return
      }
      r=await encryptRsaThenAes(raw,rsaPublic.value,pw);
    }else if(selected==='hybrid'){
      if(!rsaPublic.value.trim()){show(MSG.publickey,1);rsaPublic.focus();audio.announceStatus('operationFailed');return}
      r=await encryptRsaHybrid(raw,rsaPublic.value);
    }else{
      if(!pw){show('Enter your access key to continue.',1);key.focus();audio.announceStatus('operationFailed');return}
      if(countPassphraseCharacters(pw)!==Number($('passphraseLength').value)){
        show(accessKeyLengthError(pw),1);key.focus();audio.announceStatus('operationFailed');return
      }
      r=selected==='cbc'
        ?await encryptCbcHmac(raw,pw)
        :await encryptAesGcm(raw,pw,Number($('aesKeySize').value));
    }
    if(!dec&&$('signMessage').checked){
      r=await signMessageToken(r,ecdsaPrivateCryptoKey||$('ecdsaPrivateKey').value.trim());
      try{
        verifiedSignature=await verifyMessageToken(r,$('ecdsaPublicKey').value.trim());
      }catch(error){
        if(error.message==='signature')throw new Error('signingkeymismatch');
        throw error;
      }
    }
    if(locked||generation!==operationGeneration)return;
    if(!dec)setMessageDownload(r);
    if(!dec&&$('signMessage').checked){
      $('signatureStatus').textContent=`Encrypted message signed. Signing-key fingerprint: ${verifiedSignature.fingerprint}. Recipients must compare this fingerprint through a trusted channel.`;
    }
    if(dec&&selected==='legacy'){
      legacyMigrationText=r;
      $('legacyMigration').hidden=false;
    }
    if(dec&&verifiedSignature){
      $('signatureStatus').textContent=`Signature verified and message decrypted. Signer key fingerprint: ${verifiedSignature.fingerprint}. Identity is confirmed only if you trust this fingerprint.`;
    }
    show(r);
    if(dec&&verifiedSignature)audio.announceSignatureEvent('decrypted');
    else if(dec)audio.announceSignatureEvent('unsigned');
    else if($('signMessage').checked)audio.announceSignatureEvent('signed');
    else audio.announceStatus(dec?'messageDecrypted':'messageEncrypted');
  }catch(e){
    if(locked||generation!==operationGeneration)return;
    setMessageDownload(null);
    if(e.message==='signingpublic')$('signatureStatus').textContent='';
    else if(e.message==='signingkeymismatch'){
      $('signatureStatus').textContent='Signing stopped. The private signing key does not match the displayed public key; no signed result was produced.';
    }
    else if(signedInput&&e.message==='signingkeyformat'){
      $('signatureStatus').textContent=MSG.signingkeyformat;
    }
    else if(signedInput){
      $('signatureStatus').textContent=verifiedSignature
        ?'Signature is valid, but the encrypted message could not be decrypted. Check the decryption key.'
        :'Signature verification failed. Check the signer public key and confirm the message was not changed.';
    }
    logCryptoFailure(e,dec);
    show(signedInput&&e.message==='signingkeyformat'
      ?MSG.signingkeyformat
      :getUserErrorMessage(e,dec,MSG),1);
    if(e.message==='signingkeymismatch')audio.announceSignatureEvent('keyMismatch');
    else if(signedInput&&verifiedSignature)audio.announceSignatureEvent('decryptionFailed');
    else if(signedInput&&!verifiedSignature){
      audio.announceSignatureEvent(e.message==='signingkeyformat'?'publicKeyInvalid':'failed');
    }
    else audio.announceStatus('operationFailed');
  }finally{busy(false)}
}
async function runFile(decrypting){
  if(locked||operationBusy)return;
  clearLegacyMigration();
  const file=fileInput.files[0];
  const fileStatus=$('fileStatus');
  if(!file){fileStatus.textContent='Choose a file to continue.';audio.announceStatus('fileFailed');return}
  const maxSize=decrypting?MAX_ENCRYPTED_FILE_BYTES:MAX_FILE_BYTES;
  if(file.size>maxSize){
    fileStatus.textContent=MSG.filetoolarge;
    fileStatus.classList.add('error');
    audio.announceStatus('fileFailed');
    return;
  }
  const password=key.value;
  if(!password){fileStatus.textContent='Enter your access key to continue.';key.focus();audio.announceStatus('fileFailed');return}
  if(decrypting&&password.length<10){fileStatus.textContent=MSG.short;key.focus();audio.announceStatus('fileFailed');return}
  if(!decrypting&&countPassphraseCharacters(password)!==Number($('passphraseLength').value)){
    fileStatus.textContent=accessKeyLengthError(password);
    fileStatus.classList.add('error');
    key.focus();
    audio.announceStatus('fileFailed');
    return;
  }
  fileStatus.textContent='';
  fileStatus.classList.remove('error');
  const suggestedName=decrypting?'decrypted-file.bin':'encrypted-file.hwf2';
  const useSavePicker=typeof window.showSaveFilePicker==='function'&&file.size>=64*1024*1024;
  let pickerPromise=null;
  if(useSavePicker){
    try{pickerPromise=window.showSaveFilePicker({suggestedName})}
    catch(error){
      if(error.name==='AbortError'){
        fileStatus.textContent='File save was cancelled.';
        audio.announceStatus('fileCancelled');
        return;
      }
      fileStatus.textContent='Could not open the save dialog. Check browser permissions and try again.';
      fileStatus.classList.add('error');
      audio.announceStatus('fileFailed');
      return;
    }
  }
  busy(true,decrypting?'Decrypting file':'Encrypting file');
  fileStatus.textContent=`${decrypting?'Decrypting':'Encrypting'} file. Please wait.`;
  const generation=operationGeneration;
  let writable=null;
  let committed=false;
  const parts=[];
  const writeOutputChunk=async chunk=>{
    if(!writable){
      parts.push(chunk);
      return;
    }
    try{await writable.write(chunk)}
    catch{throw new Error('fileio')}
  };
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
    if(pickerPromise){
      try{writable=await pickerPromise.then(handle=>handle.createWritable({keepExistingData:false}))}
      catch(error){
        if(error.name==='AbortError')throw error;
        throw new Error('fileio');
      }
    }
    if(decrypting){
      const prefix=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
      if(prefix==='HWF1.'){
        if(file.size>LEGACY_MAX_FILE_TOKEN_CHARS)throw new Error('filetoolarge');
        const plaintext=await decryptFileToken((await file.text()).trim(),password);
      if(locked||generation!==operationGeneration)throw new Error('cancelled');
        await writeOutputChunk(plaintext);
      }else{
        const magic=new Uint8Array(await file.slice(0,FILE_MAGIC.length).arrayBuffer());
        if(!FILE_MAGIC.every((byte,index)=>magic[index]===byte))throw new Error('fileformat');
        await decryptFileStream(file,password,async chunk=>{
          if(locked||generation!==operationGeneration)throw new Error('cancelled');
          if(chunk.length)await writeOutputChunk(chunk);
        },reportProgress);
      }
    }else{
      await encryptFileStream(file,password,async chunk=>{
        if(locked||generation!==operationGeneration)throw new Error('cancelled');
        await writeOutputChunk(chunk);
      },reportProgress);
    }
    if(locked||generation!==operationGeneration)throw new Error('cancelled');
    if(writable){
      try{await writable.close()}
      catch{throw new Error('fileio')}
      committed=true;
    }
    else triggerDownload(new Blob(parts,{type:'application/octet-stream'}),suggestedName);
    fileStatus.textContent=decrypting
      ?`Decrypted file saved as ${suggestedName}. The original filename and type are not recoverable.`
      :`Encrypted file saved as ${suggestedName}. The original filename and type are not included.`;
    audio.announceStatus(decrypting?'fileDecrypted':'fileEncrypted');
  }catch(error){
    const stale=locked||generation!==operationGeneration;
    let cleanupFailed=false;
    parts.length=0;
    if(writable&&!committed){
      try{await writable.abort()}
      catch(abortError){
        logCryptoFailure(abortError,true);
        cleanupFailed=true;
        if(!stale){
          fileStatus.textContent='The operation failed and the incomplete output could not be discarded. No output was reported as saved. Check the selected save location and remove any partial file before using it.';
          fileStatus.classList.add('error');
        }
      }
    }
    if(stale)return;
    if(error.name==='AbortError'&&!cleanupFailed){
      fileStatus.textContent='File save was cancelled.';
      audio.announceStatus('fileCancelled');
      return;
    }
    logCryptoFailure(error,decrypting);
    if(cleanupFailed){audio.announceStatus('fileOutputFailed');return}
    fileStatus.textContent=error.message==='fileformat'
      ?MSG.fileformat
      :getUserErrorMessage(error,decrypting,MSG,'file');
    fileStatus.classList.add('error');
    audio.announceStatus(error.message==='fileio'?'fileOutputFailed':'fileFailed');
  }finally{busy(false)}
}
function downloadMessageToken(){
  if(!lastEncryptedToken)return;
  triggerDownload(new Blob([lastEncryptedToken],{type:'text/plain;charset=utf-8'}),'encrypted-message.txt');
  setTimeout(()=>audio.announceStatus('tokenDownloaded'),0);
}
async function generateRsa(){
  if(locked||operationBusy)return;
  const hasCurrentKey=rsaPrivateCryptoKey||rsaPrivate.value.trim()||rsaPublic.value.trim();
  if(hasCurrentKey&&!confirm('Replace the current RSA key material? Messages encrypted to the current key will not decrypt with the new key. If its private key is non-extractable and not otherwise backed up, it cannot be recovered. Continue?'))return;
  invalidateMessageResult();
  busy(true,'Generating RSA key pair');
  const generation=operationGeneration;
  try{
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
    audio.announceStatus('rsaKeyGenerated');
  }catch(e){
    if(locked||generation!==operationGeneration)return;
    show(e.message==='nocrypto'?MSG.nocrypto:'Could not generate the RSA key pair. Check browser support and try again.',true);
    audio.announceStatus('rsaKeyFailed');
  }finally{busy(false)}
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
async function updateEcdsaFingerprint(){
  const generation=++signingFingerprintGeneration;
  const display=$('ecdsaFingerprint');
  try{
    const fingerprint=await fingerprintEcdsaPublicKey($('ecdsaPublicKey').value);
    if(locked||generation!==signingFingerprintGeneration)return null;
    display.textContent=fingerprint;
    return fingerprint;
  }catch{
    if(locked||generation!==signingFingerprintGeneration)return null;
    display.textContent=$('ecdsaPublicKey').value.trim()?'Invalid ECDSA P-256 public key':'Not calculated';
    return null;
  }
}
function scheduleEcdsaFingerprint(){
  if(locked)return;
  clearTimeout(signingFingerprintTimer);
  signingFingerprintGeneration++;
  if(!$('ecdsaPublicKey').value.trim()){
    $('ecdsaFingerprint').textContent='Not calculated';
    return;
  }
  signingFingerprintTimer=setTimeout(updateEcdsaFingerprint,250);
}
function updateSigningKeyModeHint(){
  $('signingKeyModeHint').textContent=$('signingKeyMode').value==='exportable'
    ?'The generated private key will be exportable PEM and visible below. Back it up securely; anyone with it can create messages that appear signed by this key.'
    :'The private key stays non-extractable in page memory. It is cleared when the workspace locks or the page closes. Generate an exportable key if you need a backup.';
}
async function generateEcdsa(){
  if(locked||operationBusy)return;
  if((ecdsaPrivateCryptoKey||$('ecdsaPrivateKey').value.trim()||$('ecdsaPublicKey').value.trim())&&
      !confirm('Replace the current ECDSA signing key? Any signed message will still require the old public key for verification. Continue?'))return;
  invalidateMessageResult();
  busy(true,'Generating ECDSA P-256 signing key pair');
  const generation=operationGeneration;
  try{
    if(!subtle)throw new Error('nocrypto');
    const exportable=$('signingKeyMode').value==='exportable';
    const pair=await generateEcdsaKeyPair({exportable});
    if(locked||generation!==operationGeneration)return;
    ecdsaPrivateCryptoKey=pair.privateKey;
    $('ecdsaPublicKey').value=pair.publicKey;
    $('ecdsaPrivateKey').value=pair.privatePem||'';
    $('copyEcdsaPrivate').hidden=!pair.privatePem;
    $('ecdsaBackupReminder').hidden=!exportable;
    await updateEcdsaFingerprint();
    if(locked||generation!==operationGeneration)return;
    show(exportable
      ?'ECDSA P-256 signing key pair generated. Store the private-key backup securely.'
      :'Non-extractable ECDSA signing key generated in memory. It will be lost on lock, page close, or reload.',false);
    audio.announceSignatureEvent(exportable?'keyGeneratedExportable':'keyGenerated');
  }catch(error){
    if(locked||generation!==operationGeneration)return;
    show(error.message==='nocrypto'?MSG.nocrypto:'Could not generate the ECDSA P-256 signing key. Check browser support and try again.',true);
    audio.announceSignatureEvent('keyGenerationFailed');
  }finally{busy(false)}
}
async function verifySignatureOnly(){
  if(locked||operationBusy)return;
  const token=inp.value.trim();
  if(!isSignedMessageToken(token)){
    $('signatureStatus').textContent='Paste a SIG1. signed encrypted message into the message field first.';
    audio.announceStatus('operationFailed');
    return;
  }
  if(!$('ecdsaPublicKey').value.trim()){
    $('signatureStatus').textContent=MSG.signingpublic;
    $('ecdsaPublicKey').focus();
    audio.announceStatus('operationFailed');
    return;
  }
  busy(true,'Verifying ECDSA P-256 signature');
  const generation=operationGeneration;
  try{
    const result=await verifyMessageToken(token,$('ecdsaPublicKey').value.trim());
    if(locked||generation!==operationGeneration)return;
    $('signatureStatus').textContent=`Signature verified. Signer key fingerprint: ${result.fingerprint}. Identity is confirmed only if you trust this fingerprint.`;
    show('Signature is valid. The payload remains encrypted and has not been decrypted.',false);
    audio.announceSignatureEvent('verified');
  }catch(error){
    if(locked||generation!==operationGeneration)return;
    logCryptoFailure(error,true);
    const invalidKey=error.message==='signingkeyformat';
    $('signatureStatus').textContent=invalidKey
      ?MSG.signingkeyformat
      :'Signature verification failed. Check the signer public key and confirm the message was not changed.';
    show(invalidKey?MSG.signingkeyformat:'Signature verification failed.',true);
    audio.announceSignatureEvent(invalidKey?'publicKeyInvalid':'failed');
  }finally{busy(false)}
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
async function copyKey(field,label,signatureEvent=null){
  const value=field.value.trim();
  if(!value){
    show(`No ${label} is available to copy.`,true);
    if(signatureEvent)audio.announceSignatureEvent('copyFailed');
    return;
  }
  const copied=await copyText(value,field);
  show(copied?`${label} copied to the clipboard.`:`Copy failed. The ${label} text is selected for manual copying.`,!copied);
  if(signatureEvent)audio.announceSignatureEvent(copied?signatureEvent:'copyFailed');
  else audio.announceStatus(copied?'keyCopied':'copyFailed');
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
  const copied=await copyText(t,out);
  flash(copied?'Copied!':'Copy failed');
  audio.announceStatus(copied?'outputCopied':'copyFailed');
}

function clearSensitiveWorkspace(){
  locked=true;
  operationGeneration++;
  fingerprintGeneration++;
  clearTimeout(fingerprintTimer);
  key.value='';
  updatePassphraseStrength();
  key.type='password';
  rsaPrivate.value='';
  rsaPrivateCryptoKey=null;
  ecdsaPrivateCryptoKey=null;
  rsaPrivateKeyState='cleared';
  updateRsaKeySummary();
  $('copyPrivate').hidden=true;
  $('rsaBackupReminder').hidden=true;
  $('ecdsaPrivateKey').value='';
  $('copyEcdsaPrivate').hidden=true;
  $('ecdsaBackupReminder').hidden=true;
  $('signMessage').checked=false;
  $('signatureStatus').textContent='';
  clearTimeout(signingFingerprintTimer);
  signingFingerprintGeneration++;
  inp.value='';
  fileInput.value='';
  $('fileStatus').textContent='';
  $('fileStatus').classList.remove('error');
  clearHashWorkspace();
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
clrB.addEventListener('click',()=>{inp.value='';fileInput.value='';$('fileStatus').textContent='';$('fileStatus').classList.remove('error');clearHashWorkspace();clearLegacyMigration();setMessageDownload(null);$('signatureStatus').textContent='';show(EMPTY);inp.focus();setTimeout(()=>audio.announceStatus('workspaceCleared'),0)});
copyB.addEventListener('click',copy);
downloadTokenB.addEventListener('click',downloadMessageToken);
fileEncryptB.addEventListener('click',()=>runFile(false));
fileDecryptB.addEventListener('click',()=>runFile(true));
fileInput.addEventListener('change',()=>{$('fileStatus').textContent='';$('fileStatus').classList.remove('error');updateActionButtons()});
hashInput.addEventListener('change',event=>handleHashFileSelect(event.target.files));
expectedHash.addEventListener('change',()=>{
  if(hashInput.files && hashInput.files.length)handleHashFileSelect(hashInput.files,false);
});
expectedHashAlgorithm.addEventListener('change',()=>{
  if(hashInput.files && hashInput.files.length)handleHashFileSelect(hashInput.files,false);
});
$('exportHashResults').addEventListener('click',exportHashResults);
for(const hashField of document.querySelectorAll('input[name="hashAlgorithm"]')){
  hashField.addEventListener('change',()=>{
    audio.announceHashAlgorithm(hashField.value,hashField.checked);
    if(hashInput.files && hashInput.files.length){
      handleHashFileSelect(hashInput.files,false);
    }
  });
}
hashDropzone.addEventListener('click',()=>hashInput.click());
hashDropzone.addEventListener('keydown',event=>{
  if(event.key==='Enter' || event.key===' '){
    event.preventDefault();
    hashInput.click();
  }
});
hashDropzone.addEventListener('dragover',event=>{
  event.preventDefault();
  hashDropzone.classList.add('dragging');
});
hashDropzone.addEventListener('dragleave',()=>hashDropzone.classList.remove('dragging'));
hashDropzone.addEventListener('drop',event=>{
  event.preventDefault();
  hashDropzone.classList.remove('dragging');
  if(event.dataTransfer?.files?.length){
    const transfer=new DataTransfer();
    for(const file of event.dataTransfer.files){
      transfer.items.add(file);
    }
    hashInput.files=transfer.files;
    handleHashFileSelect(hashInput.files);
  }
});
mode.addEventListener('change',()=>{
  if(mode.value==='legacy'&&!legacyWarningAcknowledged){
    const accepted=window.confirm(
      'Grumpy v2 is cryptographically insecure. It does not provide reliable confidentiality or tamper detection and must never protect sensitive information. Continue only for legacy compatibility or testing?'
    );
    if(!accepted){
      mode.value=lastSelectedMode;
      return;
    }
    legacyWarningAcknowledged=true;
  }
  lastSelectedMode=mode.value;
  invalidateMessageResult();
  refresh();
});
$('aesKeySize').addEventListener('change',()=>{invalidateMessageResult();refresh()});
$('rsaKeySize').addEventListener('change',()=>{invalidateMessageResult();refresh()});
$('generateRsa').addEventListener('click',generateRsa);
$('rsaPublic').addEventListener('input',()=>{invalidateMessageResult();scheduleRsaFingerprint()});
$('key').addEventListener('input',()=>{invalidateMessageResult();updatePassphraseStrength()});
$('key').addEventListener('blur',()=>audio.announcePassphraseResult());
$('passphraseLength').addEventListener('change',updatePassphraseStrength);
$('generatePassphrase').addEventListener('click',()=>{
  try{
    key.value=generatePassphrase(Number($('passphraseLength').value));
    invalidateMessageResult();
    updatePassphraseStrength();
    audio.announcePassphraseResult({generated:true});
    key.focus();
  }catch(error){
    keyStrengthStatus.className='key-strength-status error';
    keyStrengthStatus.textContent=error.message==='nocrypto'
      ?'Secure passphrase generation is unavailable. Open this page over HTTPS or localhost.'
      :'Could not generate a secure passphrase. Try again.';
    audio.announcePassphraseGenerationError();
  }
});
$('rsaKeyMode').addEventListener('change',updateRsaKeyModeHint);
$('signingKeyMode').addEventListener('change',()=>{
  updateSigningKeyModeHint();
  audio.announceSignatureEvent($('signingKeyMode').value==='exportable'
    ?'exportModeSelected':'memoryModeSelected');
});
$('generateEcdsa').addEventListener('click',generateEcdsa);
$('verifySignature').addEventListener('click',verifySignatureOnly);
$('ecdsaPublicKey').addEventListener('input',()=>{invalidateMessageResult();scheduleEcdsaFingerprint()});
$('ecdsaPublicKey').addEventListener('blur',async()=>{
  if(!$('ecdsaPublicKey').value.trim())return;
  audio.announceSignatureEvent(await updateEcdsaFingerprint()
    ?'publicKeyReady':'publicKeyInvalid');
});
$('ecdsaPrivateKey').addEventListener('input',()=>{
  invalidateMessageResult();
  ecdsaPrivateCryptoKey=null;
  $('ecdsaBackupReminder').hidden=true;
  $('copyEcdsaPrivate').hidden=!$('ecdsaPrivateKey').value.trim();
});
$('signMessage').addEventListener('change',()=>{
  invalidateMessageResult();
  audio.announceSignatureEvent($('signMessage').checked?'signingEnabled':'signingDisabled');
});
$('copyEcdsaPublic').addEventListener('click',()=>copyKey($('ecdsaPublicKey'),'public signing key','publicCopied'));
$('copyEcdsaPrivate').addEventListener('click',()=>copyKey($('ecdsaPrivateKey'),'private signing key','privateCopied'));
$('rsaPrivate').addEventListener('input',()=>{
  invalidateMessageResult();
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
  const show_=key.type==='password';
  key.type=show_?'text':'password';e.currentTarget.textContent=show_?'Hide':'Show';
  e.currentTarget.title=show_?'Hide access key':'Show access key';
  e.currentTarget.setAttribute('aria-pressed',show_);e.currentTarget.setAttribute('aria-label',show_?'Hide access key':'Show access key');
});
inp.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run(e.shiftKey)}
});
inp.addEventListener('input',invalidateMessageResult);
$('migrateLegacy').addEventListener('click',()=>{
  if(typeof legacyMigrationText!=='string')return;
  inp.value=legacyMigrationText;
  legacyMigrationText=null;
  $('migrateLegacy').hidden=true;
  mode.value='aes';
  key.value='';
  invalidateMessageResult();
  refresh();
  $('migrationStatus').textContent='Legacy plaintext is ready in the message field. Enter a new, strong access key, then select Encrypt message to protect it with AES-256-GCM.';
  $('migrationStatus').hidden=false;
  key.focus();
  audio.announceStatus('legacyMigrationPrepared');
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
void detectAes192Support();
})();
