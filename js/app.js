import {
  AES_TAG, LEGACY_AES_V4_TAG, LEGACY_AES_V3_TAG, LEGACY_AES_V2_TAG, LEGACY_AES_TAG,
  CBC_TAG, LEGACY_CBC_V4_TAG, LEGACY_CBC_V3_TAG, LEGACY_CBC_V2_TAG, CBC_LEGACY_TAG,
  RSA_TAG, RSA_DIRECT_TAG, RSA_AES_TAG, LEGACY_RSA_AES_V5_TAG,
  LEGACY_RSA_AES_V4_TAG, LEGACY_RSA_AES_TAG,
  MAX_MESSAGE_BYTES,
  MAX_SIGNED_MESSAGE_CHARS, generateEcdsaKeyPair, fingerprintEcdsaPublicKey,
  signMessageToken, verifyMessageToken, isSignedMessageToken,
  encryptAesGcm, decryptAesGcm, encryptCbcHmac, decryptCbcHmac,
  encryptRsaHybrid, decryptRsaHybrid, encryptRsaDirect, decryptRsaDirect,
  encryptRsaThenAes, decryptRsaThenAes,
  generateRsaKeyPair, fingerprintRsaPublicKey,
  decryptGrumpyV2,
  MAX_FILE_BYTES, FILE_TAG, LEGACY_FILE_TAG, OLDEST_FILE_TAG,
  FILE_MAGIC, LEGACY_FILE_V3_MAGIC, LEGACY_FILE_MAGIC,
  LEGACY_FILE_V3_TAG, LEGACY_FILE_V4_MAGIC,
  FILE_HEADER_BYTES, FILE_TAG_BYTES, FILE_CHUNK_BYTES, MAX_ENCRYPTED_FILE_BYTES,
  LEGACY_MAX_FILE_TOKEN_CHARS, encryptFileStream, decryptFileStream, decryptFileToken
} from './crypto.mjs';
import {
  embedPayload, extractPayload, getStegoCapacity, readCarrierDimensions, MAX_STEGO_PIXELS,
  MAX_STEGO_DIMENSION, MAX_STEGO_PAYLOAD_BYTES, MAX_STEGO_EMBEDDED_BYTES,
  carrierDimensionsMatch, createAppendedPayloadFooter, extractAppendedPayload
} from './steganography.mjs';
import {
  attachEncryptedPayloadToPdf, extractEncryptedPayloadFromPdf, MAX_STEGO_PDF_BYTES
} from './pdf-attachments.mjs';
import { buildZipArchive } from './stego-archive.mjs';
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
  stegoCarrier=$('stegoCarrier'),stegoText=$('stegoText'),stegoFiles=$('stegoFiles'),
  stegoFolder=$('stegoFolder'),stegoHideB=$('stegoHide'),stegoExtractB=$('stegoExtract'),
  stegoChooseFilesB=$('stegoChooseFiles'),stegoChooseFolderB=$('stegoChooseFolder'),
  stegoClearFilesB=$('stegoClearFiles'),stegoFilePicker=$('stegoFilePicker'),
  stegoDropzone=$('stegoDropzone'),
  stegoModeHideB=$('stegoModeHide'),stegoModeExtractB=$('stegoModeExtract'),
  stegoAccessKey=$('stegoAccessKey'),
  stegoPassphraseLength=$('stegoPassphraseLength'),stegoGeneratePassphraseB=$('stegoGeneratePassphrase'),
  stegoKeyStrengthMeter=$('stegoKeyStrengthMeter'),stegoKeyStrengthStatus=$('stegoKeyStrengthStatus'),
  stegoKeyLengthStatus=$('stegoKeyLengthStatus'),
  hashInput=$('hashInput'),hashDropzone=$('hashDropzone'),hashSelected=$('hashSelected'),hashOutput=$('hashOutput'),
  expectedHash=$('expectedHash'),expectedHashAlgorithm=$('expectedHashAlgorithm'),
  keyStrengthMeter=$('keyStrengthMeter'),
  keyStrengthStatus=$('keyStrengthStatus'),keyLengthStatus=$('keyLengthStatus');
const aes192Option=$('aesKeySize').querySelector('option[value="192"]');
const aesKeySizeHint=$('aesKeySizeHint');
const defaultAesKeySizeHint=aesKeySizeHint.textContent;
const MAX_STEGO_IMAGE_BYTES=32*1024*1024;
const MAX_STEGO_CARRIER_BYTES=MAX_FILE_BYTES+MAX_STEGO_EMBEDDED_BYTES+12;
aes192Option.disabled=true;
aesKeySizeHint.textContent='Checking whether this browser supports AES-192-GCM.';
const subtle=window.crypto&&crypto.subtle;
let locked=false,operationGeneration=0,operationBusy=false,hashGeneration=0,stegoSelectionGeneration=0;
let stegoMode='hide',stegoCarrierCapacity=null,stegoCarrierFormat=null;
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
  $('generateEcdsa'),$('copyEcdsaPublic'),$('copyEcdsaPrivate'),$('verifySignature'),
  stegoCarrier,stegoText,stegoFiles,stegoFolder,stegoChooseFilesB,stegoChooseFolderB,
  stegoClearFilesB,stegoHideB,stegoExtractB,stegoModeHideB,stegoModeExtractB,
  stegoAccessKey,stegoPassphraseLength,stegoGeneratePassphraseB,$('stegoAccessKeyEye')
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
  fileformat:'This file is not a supported encrypted file.',
  stegoformat:'This carrier does not contain a valid Hex Watch encrypted payload.',
  stegocapacity:'The encrypted payload does not fit in this PNG. Choose a larger PNG image or a smaller payload.',
  stegofile:'Choose exactly one payload source and keep the payload within the 4 MiB limit.',
  stegoimage:'Choose a valid JPEG or PNG image no larger than 16 megapixels, 16,384 pixels on either side, or 32 MiB.',
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
  const validPayload=estimateStegoPayload().valid;
  const validCarrier=Boolean(stegoCarrier.files.length&&stegoCarrierCapacity!==null);
  const stegoKey=getStegoKeySettings();
  const stegoKeyLength=countPassphraseCharacters(stegoKey.value);
  const validStegoKey=stegoKeyLength>=10;
  stegoHideB.disabled=unavailable||stegoMode!=='hide'||!validCarrier||!validPayload||!validStegoKey;
  stegoExtractB.disabled=unavailable||stegoMode!=='extract'||!validCarrier||!validStegoKey||
    (stegoCarrierFormat!=='png'&&stegoCarrierFormat!=='file'&&stegoCarrierFormat!=='pdf');
  stegoModeHideB.disabled=unavailable;
  stegoModeExtractB.disabled=unavailable;
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
  $('migrateLegacy').hidden=false;
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
function updateStegoPassphraseStrength(){
  const target=Number(stegoPassphraseLength.value);
  const accessKey=stegoAccessKey.value;
  const actual=countPassphraseCharacters(accessKey);
  const estimate=estimatePassphraseStrength(accessKey,target);
  const lengthCheck=$('stegoKeyCheck-length');
  lengthCheck.dataset.label='Generator target';
  lengthCheck.querySelector('span:last-child').textContent=`Generator target: ${target} characters`;
  const checklist=estimate?.checks||{
    length:false,lowercase:false,uppercase:false,numbers:false,symbols:false
  };
  stegoKeyLengthStatus.textContent=`${actual} key characters. Generator target: ${target}. Minimum: 10.`;
  for(const [check,passed] of Object.entries(checklist)){
    const item=$(`stegoKeyCheck-${check}`);
    item.classList.toggle('is-met',passed);
    item.setAttribute('aria-label',`${item.dataset.label}: ${passed?'met':'not met'}`);
  }
  const score=estimate?.score||0;
  stegoKeyStrengthMeter.setAttribute('aria-valuetext',estimate?`${estimate.level} estimate, ${score} out of 100`:'No estimate');
  stegoKeyStrengthMeter.value=score;
  stegoKeyStrengthMeter.dataset.level=estimate?.level||'empty';
  stegoKeyStrengthStatus.className=`key-strength-status${estimate?` ${estimate.level}`:''}`;
  stegoKeyStrengthStatus.textContent=estimate
    ?`${estimate.level[0].toUpperCase()}${estimate.level.slice(1)} estimate · ${score}/100`
    :'Add an access key to see an estimate.';
  $('stegoKeyStrengthGuidance').textContent=estimate?.guidance
    ||'Use a long, unique passphrase. You can type one or generate it securely.';
  updateActionButtons();
}
function getStegoKeySettings(){
  return {
    value:stegoAccessKey.value,
    input:stegoAccessKey
  };
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
  lastSelectedMode=selected;
  const hybridMode=selected==='hybrid'||selected==='rsa-direct'||selected==='rsa-aes';
  const aesKeyBits=Number($('aesKeySize').value);
  const rsaKeyBits=Number($('rsaKeySize').value);
  const rsaMaxBytes=rsaKeyBits/8-66;
  const descriptions={
    aes:[`Authenticated AES-${aesKeyBits}-GCM with Argon2id using 128 MiB of memory and 3 passes. Each message gets a random salt and IV.`,`AES-${aesKeyBits}-GCM · Argon2id · 128 MiB · 3 passes · Tamper detection`],
    cbc:['Compatibility option. AES-256-CBC uses a separate HMAC-SHA-256 key and verifies the authentication tag before decryption. New CBC5 tokens use Argon2id with 128 MiB of memory and 3 passes. Prefer AES-256-GCM for new messages.','AES-256-CBC with HMAC-SHA-256 · Argon2id · 128 MiB · Compatibility'],
    'rsa-direct':[`Direct RSA-OAEP-SHA-256 encryption. With the selected generated RSA-${rsaKeyBits} key, messages are limited to ${rsaMaxBytes} UTF-8 bytes. Use AES-GCM + RSA-OAEP Hybrid for longer messages.`,`RSA-OAEP-SHA-256 · Direct encryption · ${rsaMaxBytes} UTF-8 bytes maximum with generated RSA-${rsaKeyBits}`],
    'rsa-aes':[`RSA-OAEP-SHA-256 encrypts the short message first; passphrase-derived AES-256-GCM then wraps that RSA ciphertext. Both the matching private key and access key are required. With the selected generated RSA-${rsaKeyBits} key, the message limit is ${rsaMaxBytes} UTF-8 bytes; pasted public keys have their own limit. New messages use RSA6 format; RSA5, RSA4, and RSA3 remain decryptable.`,`RSA-OAEP → AES-256-GCM · Dual-key envelope · RSA6 format · ${rsaMaxBytes} UTF-8 bytes with generated RSA-${rsaKeyBits}`],
    hybrid:['AES-256-GCM encrypts the message with a fresh random key; RSA-OAEP-SHA-256 wraps that key for the recipient. This standard hybrid method uses the RSA1 token format.','AES-256-GCM + RSA-OAEP-SHA-256 · Hybrid encryption · RSA1 format'],
    legacy:['Grumpy v2 is an insecure legacy format available only to decrypt and migrate old messages. New encryption is disabled. Use AES-256-GCM instead.','Grumpy v2 · Legacy decryption only · INSECURE']
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
    ?'RSA-first dual-key encryption uses this access key together with the recipient private key. New encryption uses RSA6 with Argon2id (128 MiB, 3 passes); decryption also supports RSA5, RSA4, and RSA3. New encryption requires exactly the selected access-key length; decryption does not. Maximum 4,096 UTF-8 bytes. The message is limited by the recipient RSA key size.'
    :hybridMode
    ?'RSA text encryption does not use this access key. It remains available for AES-256-GCM file encryption, which requires exactly the selected length when encrypting. Maximum 4,096 UTF-8 bytes.'
    :selected==='legacy'
    ?'Grumpy v2 is cryptographically insecure and available only to decrypt and migrate old messages. New encryption is disabled. Enter the original non-empty legacy key; this mode does not use AES/CBC NFKC normalization.'
    :'Choose a long, unique passphrase; a randomly generated one is preferable to a short or predictable password. New password-based encryption uses Argon2id (128 MiB, 3 passes) and requires exactly the selected length; decryption does not. AES/CBC normalize passphrases with Unicode NFKC before deriving keys. Maximum 4,096 UTF-8 bytes.';
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
  const isToken=isSignedMessageToken(value)||value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_V4_TAG)||value.startsWith(LEGACY_AES_V3_TAG)||value.startsWith(LEGACY_AES_V2_TAG)||value.startsWith(LEGACY_AES_TAG)||value.startsWith(CBC_TAG)||value.startsWith(LEGACY_CBC_V4_TAG)||value.startsWith(LEGACY_CBC_V3_TAG)||value.startsWith(LEGACY_CBC_V2_TAG)||value.startsWith(CBC_LEGACY_TAG)||value.startsWith(RSA_TAG)||value.startsWith(RSA_DIRECT_TAG)||value.startsWith(RSA_AES_TAG)||value.startsWith(LEGACY_RSA_AES_V5_TAG)||value.startsWith(LEGACY_RSA_AES_V4_TAG)||value.startsWith(LEGACY_RSA_AES_TAG);
  if((!dec||!isToken)&&new TextEncoder().encode(raw).length>MAX_MESSAGE_BYTES){
    show(MSG.toolarge,true);audio.announceStatus('operationFailed');return
  }
  if(!dec&&mode.value==='legacy'){
    show('Grumpy v2 is insecure and is available only to decrypt and migrate existing messages.',true);
    audio.announceStatus('operationFailed');
    return;
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
      if(value.startsWith(RSA_AES_TAG)||value.startsWith(LEGACY_RSA_AES_V5_TAG)||value.startsWith(LEGACY_RSA_AES_V4_TAG)||value.startsWith(LEGACY_RSA_AES_TAG))mode.value='rsa-aes';
      else if(value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_V4_TAG)||value.startsWith(LEGACY_AES_V3_TAG)||value.startsWith(LEGACY_AES_V2_TAG)||value.startsWith(LEGACY_AES_TAG))mode.value='aes';
      else if(value.startsWith(CBC_TAG)||value.startsWith(LEGACY_CBC_V4_TAG)||value.startsWith(LEGACY_CBC_V3_TAG)||value.startsWith(LEGACY_CBC_V2_TAG)||value.startsWith(CBC_LEGACY_TAG))mode.value='cbc';
      else if(value.startsWith(RSA_TAG))mode.value='hybrid';
      else if(value.startsWith(RSA_DIRECT_TAG))mode.value='rsa-direct';
      refresh();
    }
    const selected=mode.value;
    let r;
    if(dec){
      if(value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_V4_TAG)||value.startsWith(LEGACY_AES_V3_TAG)||value.startsWith(LEGACY_AES_V2_TAG)||value.startsWith(LEGACY_AES_TAG)||value.startsWith(CBC_TAG)||value.startsWith(LEGACY_CBC_V4_TAG)||value.startsWith(LEGACY_CBC_V3_TAG)||value.startsWith(LEGACY_CBC_V2_TAG)||value.startsWith(CBC_LEGACY_TAG)){
        if(!pw){show('Enter your access key to continue.',1);key.focus();audio.announceStatus('operationFailed');return}
        r=value.startsWith(AES_TAG)||value.startsWith(LEGACY_AES_V4_TAG)||value.startsWith(LEGACY_AES_V3_TAG)||value.startsWith(LEGACY_AES_V2_TAG)||value.startsWith(LEGACY_AES_TAG)
          ?await decryptAesGcm(value,pw):await decryptCbcHmac(value,pw);
      }else if(value.startsWith(RSA_DIRECT_TAG)){
        const privateKey=rsaPrivateCryptoKey||rsaPrivate.value.trim();
        if(!privateKey){show(MSG.privatekey,1);rsaPrivate.focus();audio.announceStatus('operationFailed');return}
        r=await decryptRsaDirect(value,privateKey);
      }else if(value.startsWith(RSA_AES_TAG)||value.startsWith(LEGACY_RSA_AES_V5_TAG)||value.startsWith(LEGACY_RSA_AES_V4_TAG)||value.startsWith(LEGACY_RSA_AES_TAG)){
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
  if(decrypting&&countPassphraseCharacters(password)<10){fileStatus.textContent=MSG.short;key.focus();audio.announceStatus('fileFailed');return}
  if(!decrypting&&countPassphraseCharacters(password)!==Number($('passphraseLength').value)){
    fileStatus.textContent=accessKeyLengthError(password);
    fileStatus.classList.add('error');
    key.focus();
    audio.announceStatus('fileFailed');
    return;
  }
  fileStatus.textContent='';
  fileStatus.classList.remove('error');
  const suggestedName=decrypting?'decrypted-file.bin':'encrypted-file.hwf5';
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
      if(prefix===FILE_TAG||prefix===LEGACY_FILE_V3_TAG||prefix===LEGACY_FILE_TAG||prefix===OLDEST_FILE_TAG){
        if(file.size>LEGACY_MAX_FILE_TOKEN_CHARS)throw new Error('filetoolarge');
        const plaintext=await decryptFileToken((await file.text()).trim(),password);
      if(locked||generation!==operationGeneration)throw new Error('cancelled');
        await writeOutputChunk(plaintext);
      }else{
        const magic=new Uint8Array(await file.slice(0,FILE_MAGIC.length).arrayBuffer());
        if(!FILE_MAGIC.every((byte,index)=>magic[index]===byte)&&
           !LEGACY_FILE_V4_MAGIC.every((byte,index)=>magic[index]===byte)&&
           !LEGACY_FILE_V3_MAGIC.every((byte,index)=>magic[index]===byte)&&
           !LEGACY_FILE_MAGIC.every((byte,index)=>magic[index]===byte))throw new Error('fileformat');
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
function setStegoStatus(message,isError=false,narrationEvent='',narrationDetail=''){
  const status=$('stegoStatus');
  status.textContent=message;
  status.classList.toggle('error',isError);
  if(narrationEvent)audio.announceStegoStatus(narrationEvent,narrationDetail);
}
async function getStegoCarrier(file){
  if(!(file instanceof Blob)||file.size>MAX_STEGO_CARRIER_BYTES)throw new Error('carrierlimit');
  const header=new Uint8Array(await file.slice(0,1024*1024).arrayBuffer());
  const pngSignature=[137,80,78,71,13,10,26,10];
  const isPng=header.length>=8&&pngSignature.every((byte,index)=>header[index]===byte);
  const isJpeg=header.length>=2&&header[0]===0xff&&header[1]===0xd8;
  const pdfHeader=[0x25,0x50,0x44,0x46,0x2d];
  const hasPdfHeader=header.subarray(0,1024).some((byte,index)=>
    pdfHeader.every((value,offset)=>header[index+offset]===value)
  );
  const isPdf=hasPdfHeader||file.type==='application/pdf'||/\.pdf$/i.test(file.name);
  if(isPdf){
    if(file.size>MAX_STEGO_PDF_BYTES)throw new Error('pdflimit');
    return {bitmap:null,format:'pdf'};
  }
  if(!isPng&&!isJpeg)return {bitmap:null,format:'file'};
  if(file.size>MAX_STEGO_IMAGE_BYTES)throw new Error('image');
  const {width,height,format}=readCarrierDimensions(header);
  if(!width||!height||width>MAX_STEGO_DIMENSION||height>MAX_STEGO_DIMENSION||
      width*height>MAX_STEGO_PIXELS)throw new Error('image');
  if(typeof createImageBitmap!=='function')throw new Error('image');
  const bitmap=await createImageBitmap(file);
  if(!carrierDimensionsMatch(format,width,height,bitmap.width,bitmap.height)||
      bitmap.width>MAX_STEGO_DIMENSION||
      bitmap.height>MAX_STEGO_DIMENSION||bitmap.width*bitmap.height>MAX_STEGO_PIXELS){
    bitmap.close();
    throw new Error('image');
  }
  return {bitmap,format};
}
function getStegoCarrierKind(carrier){
  if(carrier.type.startsWith('video/'))return 'VIDEO';
  if(carrier.type.startsWith('audio/'))return 'AUDIO';
  const extension=carrier.name.split('.').pop();
  return extension&&extension!==carrier.name?extension.toUpperCase():'FILE';
}
function getStegoCarrierOutputName(name){
  const safe=safeStegoFilename(name);
  const extensionIndex=safe.lastIndexOf('.');
  if(extensionIndex<=0)return `${safe}.hidden`;
  return `${safe.slice(0,extensionIndex)}.hidden${safe.slice(extensionIndex)}`;
}
function updateStegoExtractHint(format){
  $('stegoExtractHint').textContent=format==='file'
    ?'Select the unchanged carrier output created by this tool. Its encrypted payload is appended to the original file. Enter the same access key used to embed it.'
    :format==='pdf'
      ?'Select the unchanged PDF output created by this tool. Its encrypted payload is attached inside the PDF. Enter the same access key used to embed it.'
    :'Select the unchanged PNG output created by this tool. Enter the same access key used to embed the payload.';
}
async function updateStegoCapacity(){
  const generation=++stegoSelectionGeneration;
  const carrier=stegoCarrier.files[0];
  if(!carrier){
    stegoCarrierCapacity=null;
    stegoCarrierFormat=null;
    $('stegoDropzone').classList.remove('has-file');
    $('stegoDropzone').setAttribute('aria-label','Choose or drop an image, video, audio recording, PDF, document, or other carrier file');
    $('stegoPickerName').textContent='Choose an image, video, audio recording, PDF, document, or other file';
    $('stegoPickerHint').textContent='PNG and JPEG images use pixels; PDFs keep their format with an encrypted attachment. Other files use appended data.';
    $('stegoPickerAction').textContent='Browse files';
    $('stegoCarrierStatus').textContent='No carrier selected. Capacity is calculated after you choose a file.';
    $('stegoCapacityValue').textContent='—';
    $('stegoCapacityBar').value=0;
    stegoHideB.textContent='Encrypt and embed payload';
    audio.announceStegoStatus('carrierRemoved');
    updateStegoPayloadSummary();
    return;
  }
  stegoCarrierCapacity=null;
  stegoCarrierFormat=null;
  $('stegoCapacityValue').textContent='Checking…';
  $('stegoCapacityBar').value=0;
  $('stegoDropzone').classList.add('has-file');
  $('stegoDropzone').setAttribute('aria-label',`Change carrier file. Current file: ${carrier.name}`);
  $('stegoPickerName').textContent=carrier.name;
  $('stegoPickerHint').textContent='Checking file type and carrier limits…';
  $('stegoPickerAction').textContent='Change file';
  $('stegoCarrierStatus').textContent=`${carrier.name} · Checking carrier and capacity…`;
  $('stegoCarrierStatus').classList.remove('error');
  updateActionButtons();
  let bitmap=null,canvas=null,format='png';
  try{
    ({bitmap,format}=await getStegoCarrier(carrier));
    if(format==='pdf'){
      if(generation!==stegoSelectionGeneration||locked)return;
      stegoCarrierCapacity=MAX_STEGO_EMBEDDED_BYTES;
      stegoCarrierFormat=format;
      updateStegoExtractHint(format);
      $('stegoPickerHint').textContent='PDF carrier · Encrypted attachment';
      $('stegoCapacityValue').textContent='Up to 4 MiB';
      $('stegoCapacityBar').value=MAX_STEGO_PAYLOAD_BYTES;
      $('stegoCarrierStatus').textContent=
        `${carrier.name} · PDF ready. Pages stay intact; attachment visibility depends on the PDF viewer.`;
      stegoHideB.textContent='Encrypt and attach payload';
      audio.announceStegoStatus('pdfCarrierReady');
      updateStegoPayloadSummary();
      return;
    }
    if(format==='file'){
      if(generation!==stegoSelectionGeneration||locked)return;
      stegoCarrierCapacity=MAX_STEGO_EMBEDDED_BYTES;
      stegoCarrierFormat=format;
      updateStegoExtractHint(format);
      const kind=getStegoCarrierKind(carrier);
      $('stegoPickerHint').textContent=`${kind} carrier · Appended payload`;
      $('stegoCapacityValue').textContent='Up to 4 MiB';
      $('stegoCapacityBar').value=MAX_STEGO_PAYLOAD_BYTES;
      $('stegoCarrierStatus').textContent=
        `${carrier.name} · ${kind} ready. Original stays unchanged; encrypted data will be appended.`;
      stegoHideB.textContent='Encrypt and append payload';
      audio.announceStegoStatus('carrierAppendReady');
      updateStegoPayloadSummary();
      return;
    }
    canvas=document.createElement('canvas');
    canvas.width=bitmap.width;
    canvas.height=bitmap.height;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if(!context)throw new Error('image');
    context.drawImage(bitmap,0,0);
    const capacity=getStegoCapacity(context.getImageData(0,0,bitmap.width,bitmap.height).data);
    if(generation!==stegoSelectionGeneration||locked)return;
    stegoCarrierCapacity=capacity;
    stegoCarrierFormat=format;
    updateStegoExtractHint(format);
    $('stegoPickerName').textContent=carrier.name;
    $('stegoPickerHint').textContent=format==='jpeg'
      ?'JPEG image · Converted to PNG for pixel embedding.'
      :'PNG image · Payload embedded in image pixels.';
    $('stegoCapacityValue').textContent=formatHashFileSize(capacity);
    $('stegoCapacityBar').value=Math.min(MAX_STEGO_PAYLOAD_BYTES,capacity);
    $('stegoCarrierStatus').textContent=`${carrier.name} · ${bitmap.width} × ${bitmap.height} · ${format.toUpperCase()}${format==='jpeg'?' source (converted to PNG on output)':''}`;
    stegoHideB.textContent='Encrypt and hide payload';
  }catch(error){
    if(generation!==stegoSelectionGeneration||locked)return;
    stegoCarrierCapacity=null;
    stegoCarrierFormat=null;
    $('stegoPickerName').textContent=carrier.name;
    $('stegoCapacityValue').textContent='Unavailable';
    $('stegoCapacityBar').value=0;
    $('stegoPickerHint').textContent='Could not use this carrier. Choose another file and try again.';
    $('stegoCarrierStatus').textContent=error.message==='image'
      ?MSG.stegoimage
      :error.message==='carrierlimit'
        ?'Carrier files must be 1 GiB or smaller.'
      :error.message==='pdflimit'
        ?'PDF carriers must be 32 MiB or smaller because they are rewritten locally to add a standard PDF attachment.'
      :'Could not inspect this carrier file. Choose another file and try again.';
    stegoHideB.textContent='Encrypt and embed payload';
    $('stegoCarrierStatus').classList.add('error');
    audio.announceStegoStatus('carrierInvalid');
  }finally{
    if(bitmap)bitmap.close();
    if(canvas){canvas.width=0;canvas.height=0}
  }
  if(stegoCarrierCapacity!==null){
    $('stegoCarrierStatus').classList.remove('error');
    if(stegoMode==='extract'&&stegoCarrierFormat==='jpeg'){
      setStegoStatus('JPEG is accepted as a source image for hiding. To extract, select the PNG output created by this tool.');
      audio.announceStegoStatus('jpegExtractUnavailable');
    }else{
      audio.announceStegoStatus(
        'imageCarrierReady',
        `${stegoCarrierFormat.toUpperCase()} image selected. Estimated pixel payload capacity: ${formatHashFileSize(stegoCarrierCapacity)}.`
      );
    }
  }
  updateStegoPayloadSummary();
}
function setStegoMode(nextMode,announce=false){
  stegoMode=nextMode;
  const hiding=nextMode==='hide';
  $('stegoModeHide').setAttribute('aria-pressed',String(hiding));
  $('stegoModeExtract').setAttribute('aria-pressed',String(!hiding));
  $('stegoPayloadSection').hidden=!hiding;
  $('stegoExtractHint').hidden=hiding;
  stegoHideB.hidden=!hiding;
  stegoExtractB.hidden=hiding;
  updateStegoExtractHint(stegoCarrierFormat);
  if(!hiding&&stegoCarrierFormat==='jpeg'){
    setStegoStatus('JPEG is accepted as a source image for hiding. To extract, select the PNG output created by this tool.');
  }else setStegoStatus('');
  updateActionButtons();
  if(announce)audio.announceStegoStatus(hiding?'embedMode':'extractMode');
}
function estimateStegoPayload(){
  const fileSelection=[...stegoFiles.files],folderSelection=[...stegoFolder.files];
  const files=[...fileSelection,...folderSelection];
  const hasText=Boolean(stegoText.value);
  const sourceCount=Number(hasText)+Number(files.length>0);
  if(sourceCount===0)return {valid:false,reason:'Choose a payload source.',estimate:null};
  if(sourceCount!==1)return {valid:false,reason:'Choose exactly one payload source.',estimate:null};

  let payloadBytes=new TextEncoder().encode(stegoText.value).length;
  let metadataBytes=new TextEncoder().encode('hidden-message.txt').length;
  const isArchive=folderSelection.length>0||files.length>1;
  if(files.length){
    payloadBytes=files.reduce((total,file)=>total+file.size,0);
    metadataBytes=new TextEncoder().encode(isArchive?'hidden-files.zip':safeStegoFilename(files[0].name)).length;
    if(isArchive){
      payloadBytes+=22;
      for(const file of files){
        const path=file.webkitRelativePath||file.name;
        payloadBytes+=76+2*new TextEncoder().encode(path).length;
      }
    }
  }
  if(payloadBytes>MAX_STEGO_PAYLOAD_BYTES)return {valid:false,reason:'Payload exceeds the 4 MiB maximum.',estimate:null};
  const wrappedBytes=6+metadataBytes+payloadBytes;
  const encryptedBytes=FILE_HEADER_BYTES+wrappedBytes+
    Math.max(1,Math.ceil(wrappedBytes/FILE_CHUNK_BYTES))*FILE_TAG_BYTES;
  if(files.length>1000)return {valid:false,reason:'Choose no more than 1,000 files.',estimate:encryptedBytes};
  if(stegoCarrierCapacity!==null&&encryptedBytes>stegoCarrierCapacity){
    return {valid:false,reason:'This payload is too large for the selected image. Choose a larger carrier or a smaller payload.',estimate:encryptedBytes};
  }
  return {valid:true,reason:'',estimate:encryptedBytes};
}
function updateStegoPayloadSummary(){
  const fileSelection=[...stegoFiles.files],folderSelection=[...stegoFolder.files];
  const files=[...fileSelection,...folderSelection];
  const textBytes=new TextEncoder().encode(stegoText.value).length;
  const estimate=estimateStegoPayload();
  const payload=$('stegoPayloadStatus');
  $('stegoClearFiles').hidden=files.length===0;
  if(!files.length){
    $('stegoFileSelectionSummary').textContent='No files or folder added';
  }else{
    const fileBytes=files.reduce((total,file)=>total+file.size,0);
    const selectionKind=folderSelection.length&&fileSelection.length
      ?'mixed collection'
      :folderSelection.length?'folder'
      :fileSelection.length>1?'collection'
      :safeStegoFilename(files[0].name);
    $('stegoFileSelectionSummary').textContent=
      `${files.length} ${files.length===1?'file':'files'} · ${formatHashFileSize(fileBytes)} · ${selectionKind}`;
  }
  if(!stegoText.value&&!files.length){
    payload.textContent='Add a text message or a file collection. Maximum payload size is 4 MiB.';
    payload.classList.remove('error');
  }else if(!estimate.valid){
    payload.textContent=estimate.reason;
    payload.classList.add('error');
  }else if(stegoText.value){
    payload.textContent=`Text · ${formatHashFileSize(textBytes)} · about ${formatHashFileSize(estimate.estimate)} carrier space needed`;
    payload.classList.remove('error');
  }else if(files.length){
    const size=files.reduce((total,file)=>total+file.size,0);
    const isArchive=folderSelection.length>0||files.length>1;
    payload.textContent=isArchive
      ?`Collection · ${formatHashFileSize(size)} source files · bundled as hidden-files.zip · about ${formatHashFileSize(estimate.estimate)} carrier space needed`
      :`Single file · kept in its original format · recovered as ${safeStegoFilename(files[0].name)} · about ${formatHashFileSize(estimate.estimate)} carrier space needed`;
    payload.classList.remove('error');
  }else{
    payload.textContent='Add a text message or a file collection. Maximum payload size is 4 MiB.';
    payload.classList.remove('error');
  }
  updateActionButtons();
}
function safeStegoFilename(value){
  const basename=String(value||'').replace(/\\/g,'/').split('/').pop()||'hidden-file.bin';
  const safe=basename.replace(/[<>:"|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/g,'').slice(0,150);
  return safe||'hidden-file.bin';
}
async function getStegoPayload(){
  const text=stegoText.value;
  const files=[...stegoFiles.files];
  const folderFiles=[...stegoFolder.files];
  const selected=[...files,...folderFiles];
  const sourceCount=Number(Boolean(text))+Number(selected.length>0);
  if(sourceCount!==1)throw new Error('stegopayload');
  if(text){
    const bytes=new TextEncoder().encode(text);
    return {bytes,name:'hidden-message.txt'};
  }
  if(selected.length>1000||selected.reduce((total,file)=>total+file.size,0)>MAX_STEGO_PAYLOAD_BYTES){
    throw new Error('stegopayload');
  }
  let payload,name;
  if(folderFiles.length||files.length>1){
    payload=await buildZipArchive(selected);
    name='hidden-files.zip';
  }else{
    payload=selected[0];
    name=safeStegoFilename(payload.name);
  }
  if(payload.size>MAX_STEGO_PAYLOAD_BYTES)throw new Error('stegopayload');
  return {bytes:new Uint8Array(await payload.arrayBuffer()),name};
}
function wrapStegoPayload(bytes,name){
  const nameBytes=new TextEncoder().encode(safeStegoFilename(name));
  if(nameBytes.length>1024||bytes.length>MAX_STEGO_PAYLOAD_BYTES)throw new Error('stegopayload');
  const wrapped=new Uint8Array(6+nameBytes.length+bytes.length);
  wrapped.set([0x48,0x57,0x50,0x31]);
  new DataView(wrapped.buffer).setUint16(4,nameBytes.length,false);
  wrapped.set(nameBytes,6);
  wrapped.set(bytes,6+nameBytes.length);
  return wrapped;
}
function unwrapStegoPayload(bytes){
  const magic=[0x48,0x57,0x50,0x31];
  if(bytes.length<6||!magic.every((byte,index)=>bytes[index]===byte))throw new Error('stegoformat');
  const nameLength=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint16(4,false);
  if(!nameLength||nameLength>1024||6+nameLength>bytes.length)throw new Error('stegoformat');
  let name;
  try{name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(6,6+nameLength))}
  catch{throw new Error('stegoformat')}
  return {name:safeStegoFilename(name),bytes:bytes.subarray(6+nameLength)};
}
function combineStegoChunks(chunks,total,maxBytes){
  if(total>maxBytes)throw new Error('filetoolarge');
  const result=new Uint8Array(total);
  let offset=0;
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length}
  return result;
}
async function runStego(extracting){
  if(locked||operationBusy)return;
  const carrier=stegoCarrier.files[0],password=key.value;
  if(!carrier){setStegoStatus('Choose a carrier file to continue.',true,'carrierRequired');return}
  const {value:stegoPassword,input:stegoPasswordInput}=getStegoKeySettings();
  if(!stegoPassword){
    setStegoStatus('Enter your access key to continue.',true,'keyRequired');
    stegoPasswordInput.focus();
    return;
  }
  if(extracting&&countPassphraseCharacters(stegoPassword)<10){
    setStegoStatus(
      MSG.short,true,'keyTooShort',
      `${countPassphraseCharacters(stegoPassword)} characters entered.`
    );
    stegoPasswordInput.focus();
    return;
  }
  busy(true,extracting?'Extracting hidden payload':'Encrypting payload and embedding it in the carrier');
  const generation=operationGeneration;
  let bitmap=null,canvas=null,chunks=[],carrierFormat='png';
  try{
    if(!subtle)throw new Error('nocrypto');
    ({bitmap,format:carrierFormat}=await getStegoCarrier(carrier));
    if(extracting&&carrierFormat!=='png'&&carrierFormat!=='file'&&carrierFormat!=='pdf')throw new Error('stegoformat');
    if(locked||generation!==operationGeneration)throw new Error('cancelled');
    let context=null,imageData=null;
    if(carrierFormat==='png'||carrierFormat==='jpeg'){
      canvas=document.createElement('canvas');
      canvas.width=bitmap.width;
      canvas.height=bitmap.height;
      context=canvas.getContext('2d',{willReadFrequently:true});
      if(!context)throw new Error('image');
      context.drawImage(bitmap,0,0);
      imageData=context.getImageData(0,0,bitmap.width,bitmap.height);
    }
    let total=0;
    const collect=async chunk=>{
      if(locked||generation!==operationGeneration)throw new Error('cancelled');
      total+=chunk.length;
      if(total>MAX_STEGO_EMBEDDED_BYTES)throw new Error('filetoolarge');
      chunks.push(chunk.slice());
    };
    let lastProgress=-1;
    const reportProgress=(complete,amount)=>{
      if(locked||generation!==operationGeneration)throw new Error('cancelled');
      const percent=amount?Math.floor(complete*100/amount):100;
      if(Math.floor(percent/10)!==lastProgress){
        lastProgress=Math.floor(percent/10);
        setStegoStatus(`${extracting?'Decrypting':'Encrypting'} hidden payload: ${percent}%`);
      }
    };
    if(extracting){
      const encrypted=carrierFormat==='file'
        ?await extractAppendedPayload(carrier)
        :carrierFormat==='pdf'
          ?await extractEncryptedPayloadFromPdf(new Uint8Array(await carrier.arrayBuffer()))
          :extractPayload(imageData.data);
      if(encrypted.length>MAX_STEGO_EMBEDDED_BYTES)throw new Error('stegoformat');
      await decryptFileStream(new Blob([encrypted]),stegoPassword,collect,reportProgress);
      const recovered=unwrapStegoPayload(combineStegoChunks(chunks,total,MAX_STEGO_PAYLOAD_BYTES+1026));
      if(recovered.bytes.length>MAX_STEGO_PAYLOAD_BYTES)throw new Error('stegoformat');
      if(locked||generation!==operationGeneration)return;
      triggerDownload(new Blob([recovered.bytes],{type:'application/octet-stream'}),recovered.name);
      setStegoStatus(recovered.name.toLowerCase().endsWith('.zip')
        ?`Hidden ZIP recovered as ${recovered.name}. Open it to access its contents.`
        :`Hidden payload extracted and decrypted as ${recovered.name}.`,false,'extracted');
    }else{
      const source=await getStegoPayload();
      const wrapped=wrapStegoPayload(source.bytes,source.name);
      const chunkCount=Math.max(1,Math.ceil(wrapped.length/FILE_CHUNK_BYTES));
      const encryptedLength=FILE_HEADER_BYTES+wrapped.length+chunkCount*FILE_TAG_BYTES;
      if((carrierFormat==='png'||carrierFormat==='jpeg')&&encryptedLength>getStegoCapacity(imageData.data))throw new Error('capacity');
      await encryptFileStream(new Blob([wrapped]),stegoPassword,collect,reportProgress);
      const encrypted=combineStegoChunks(chunks,total,MAX_STEGO_EMBEDDED_BYTES);
      if(carrierFormat==='file'){
        const footer=createAppendedPayloadFooter(encrypted.length);
        const output=new Blob([carrier,encrypted,footer],{type:carrier.type||'application/octet-stream'});
        if(locked||generation!==operationGeneration)return;
        const outputName=getStegoCarrierOutputName(carrier.name);
        triggerDownload(output,outputName);
        setStegoStatus(`Encrypted payload appended to ${outputName}. The original ${getStegoCarrierKind(carrier)} file was not changed. Appended data is not concealed and may affect compatibility.`,false,'appended');
      }else if(carrierFormat==='pdf'){
        const pdfBytes=new Uint8Array(await carrier.arrayBuffer());
        const outputBytes=await attachEncryptedPayloadToPdf(pdfBytes,encrypted);
        if(locked||generation!==operationGeneration)return;
        const outputName=getStegoCarrierOutputName(carrier.name);
        triggerDownload(new Blob([outputBytes],{type:'application/pdf'}),outputName);
        setStegoStatus(`Encrypted payload attached inside ${outputName}. The PDF pages remain intact; attachments are not supported by every PDF viewer. The original PDF was not changed.`,false,'pdfAttached');
      }else{
        embedPayload(imageData.data,encrypted);
        context.putImageData(imageData,0,0);
        const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
        if(!png)throw new Error('image');
        if(png.size>MAX_STEGO_IMAGE_BYTES)throw new Error('stegooutputlarge');
        if(locked||generation!==operationGeneration)return;
        triggerDownload(png,'hidden-payload.png');
        setStegoStatus(`Encrypted ${source.name} hidden in hidden-payload.png.${carrierFormat==='jpeg'?' The JPEG carrier was converted to PNG.':''} The original image was not changed.`,false,'embedded');
      }
    }
  }catch(error){
    if(locked||generation!==operationGeneration)return;
    logCryptoFailure(error,extracting);
    const message={
      capacity:MSG.stegocapacity,
      image:MSG.stegoimage,
      carrierlimit:'Carrier files must be 1 GiB or smaller.',
      pdflimit:'PDF carriers must be 32 MiB or smaller because they are rewritten locally to add a standard PDF attachment.',
      pdfencrypted:'This PDF is encrypted or password-protected. Remove its protection before using it as a carrier.',
      pdfformat:'This PDF could not be read or rewritten safely. Check that it is a valid, unencrypted PDF.',
      pdfattachment:'The PDF attachment is malformed or exceeds the supported payload size.',
      pdfattachmentexists:'This PDF already contains a Hex Watch Cipher payload attachment. Extract it or choose another PDF before embedding.',
      pdfunsupported:'This browser cannot safely read the compressed PDF attachment. Use a current browser with DecompressionStream support.',
      pdfoutputlarge:'The rewritten PDF would exceed the 64 MiB output limit. Choose a smaller PDF carrier.',
      stegooutputlarge:'The resulting PNG would be larger than 32 MiB and cannot be downloaded. Choose a smaller or more compressible carrier image.',
      stegoformat:extracting&&carrierFormat==='jpeg'
        ?'Extraction requires the PNG output created when the payload was hidden. JPEG is accepted only as a source image.'
        :MSG.stegoformat,
      stegopayload:MSG.stegofile,
      archivefiles:'Choose between 1 and 1,000 files to archive.',
      archivepath:'The folder contains a duplicate or unsafe file path and cannot be packaged.',
      cancelled:'The operation was cancelled.'
    }[error.message]||getUserErrorMessage(error,extracting,MSG,'file');
    setStegoStatus(message,true,'operationFailed');
  }finally{
    if(bitmap)bitmap.close();
    if(canvas){canvas.width=0;canvas.height=0}
    chunks=[];
    busy(false);
  }
}
function clearStegoWorkspace(){
  stegoSelectionGeneration++;
  stegoCarrier.value='';
  stegoAccessKey.value='';
  stegoAccessKey.type='password';
  $('stegoAccessKeyEye').textContent='Show';
  $('stegoAccessKeyEye').title='Show media access key';
  $('stegoAccessKeyEye').setAttribute('aria-label','Show media access key');
  $('stegoAccessKeyEye').setAttribute('aria-pressed','false');
  updateStegoPassphraseStrength();
  stegoText.value='';
  stegoFiles.value='';
  stegoFolder.value='';
  stegoCarrierCapacity=null;
  $('stegoDropzone').classList.remove('has-file');
  $('stegoDropzone').setAttribute('aria-label','Choose or drop an image, video, audio recording, PDF, document, or other carrier file');
  $('stegoPickerName').textContent='Choose an image, video, audio recording, PDF, document, or other file';
  $('stegoPickerHint').textContent='PNG and JPEG images use pixels; PDFs keep their format with an encrypted attachment. Other files use appended data.';
  $('stegoPickerAction').textContent='Browse files';
  $('stegoCarrierStatus').textContent='No carrier selected. Capacity is calculated after you choose a file.';
  $('stegoCarrierStatus').classList.remove('error');
  $('stegoCapacityValue').textContent='—';
  $('stegoCapacityBar').value=0;
  stegoCarrierFormat=null;
  stegoHideB.textContent='Encrypt and embed payload';
  $('stegoFileSelectionSummary').textContent='No files or folder added';
  $('stegoClearFiles').hidden=true;
  $('stegoPayloadStatus').textContent='Add a text message or a file collection. Maximum payload size is 4 MiB.';
  $('stegoPayloadStatus').classList.remove('error');
  setStegoMode('hide');
  setStegoStatus('');
  updateActionButtons();
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
  clearStegoWorkspace();
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
clrB.addEventListener('click',()=>{inp.value='';fileInput.value='';$('fileStatus').textContent='';$('fileStatus').classList.remove('error');clearStegoWorkspace();clearHashWorkspace();clearLegacyMigration();setMessageDownload(null);$('signatureStatus').textContent='';show(EMPTY);inp.focus();setTimeout(()=>audio.announceStatus('workspaceCleared'),0)});
copyB.addEventListener('click',copy);
downloadTokenB.addEventListener('click',downloadMessageToken);
fileEncryptB.addEventListener('click',()=>runFile(false));
fileDecryptB.addEventListener('click',()=>runFile(true));
fileInput.addEventListener('change',()=>{$('fileStatus').textContent='';$('fileStatus').classList.remove('error');updateActionButtons()});
stegoHideB.addEventListener('click',()=>runStego(false));
stegoExtractB.addEventListener('click',()=>runStego(true));
stegoModeHideB.addEventListener('click',()=>setStegoMode('hide',true));
stegoModeExtractB.addEventListener('click',()=>setStegoMode('extract',true));
stegoAccessKey.addEventListener('input',updateStegoPassphraseStrength);
stegoPassphraseLength.addEventListener('change',updateStegoPassphraseStrength);
stegoAccessKey.addEventListener('blur',()=>audio.announcePassphraseResult({
  keyId:'stegoAccessKey',
  lengthId:'stegoPassphraseLength'
}));
stegoGeneratePassphraseB.addEventListener('click',()=>{
  try{
    stegoAccessKey.value=generatePassphrase(Number(stegoPassphraseLength.value));
    updateStegoPassphraseStrength();
    audio.announcePassphraseResult({
      generated:true,
      keyId:'stegoAccessKey',
      lengthId:'stegoPassphraseLength'
    });
    stegoAccessKey.focus();
  }catch(error){
    stegoKeyStrengthStatus.className='key-strength-status error';
    stegoKeyStrengthStatus.textContent=error.message==='nocrypto'
      ?'Secure passphrase generation is unavailable. Open this page over HTTPS or localhost.'
      :'Could not generate a secure passphrase. Try again.';
    audio.announcePassphraseGenerationError();
  }
});
$('stegoAccessKeyEye').addEventListener('click',event=>{
  const show_=stegoAccessKey.type==='password';
  stegoAccessKey.type=show_?'text':'password';
  event.currentTarget.textContent=show_?'Hide':'Show';
  event.currentTarget.title=show_?'Hide media access key':'Show media access key';
  event.currentTarget.setAttribute('aria-pressed',String(show_));
  event.currentTarget.setAttribute('aria-label',show_?'Hide media access key':'Show media access key');
});
stegoChooseFilesB.addEventListener('click',()=>stegoFiles.click());
stegoChooseFolderB.addEventListener('click',()=>stegoFolder.click());
stegoClearFilesB.addEventListener('click',()=>{
  stegoFiles.value='';
  stegoFolder.value='';
  updateStegoPayloadSummary();
});
stegoFilePicker.addEventListener('dragover',event=>{
  event.preventDefault();
  stegoFilePicker.classList.add('dragging');
});
stegoFilePicker.addEventListener('dragleave',event=>{
  if(!stegoFilePicker.contains(event.relatedTarget))stegoFilePicker.classList.remove('dragging');
});
stegoFilePicker.addEventListener('drop',event=>{
  event.preventDefault();
  stegoFilePicker.classList.remove('dragging');
  if(locked||operationBusy)return;
  const transfer=event.dataTransfer;
  if(!transfer)return;
  const includesDirectory=[...transfer.items].some(item=>{
    const entry=typeof item.webkitGetAsEntry==='function'?item.webkitGetAsEntry():null;
    return Boolean(entry?.isDirectory);
  });
  if(includesDirectory){
    setStegoStatus('Use Choose folder to add a directory and preserve its folder structure.',true,'folderRequired');
    return;
  }
  if(!transfer.files.length)return;
  const combined=new DataTransfer();
  for(const file of stegoFiles.files)combined.items.add(file);
  for(const file of transfer.files)combined.items.add(file);
  if(combined.files.length>1000){
    setStegoStatus('A payload collection can contain no more than 1,000 files.',true,'tooManyPayloadFiles');
    return;
  }
  stegoFiles.files=combined.files;
  setStegoStatus('');
  updateStegoPayloadSummary();
});
stegoCarrier.addEventListener('change',()=>{
  setStegoStatus('');
  $('stegoCarrierStatus').classList.remove('error');
  void updateStegoCapacity();
});
for(const input of [stegoText,stegoFiles,stegoFolder]){
  input.addEventListener(input===stegoText?'input':'change',()=>{
    setStegoStatus('');
    updateStegoPayloadSummary();
  });
}
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
hashDropzone.addEventListener('click',event=>{
  if(locked||operationBusy||event.target===hashInput)return;
  hashInput.click();
});
hashDropzone.addEventListener('keydown',event=>{
  if(event.key==='Enter' || event.key===' '){
    event.preventDefault();
    if(locked||operationBusy)return;
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
  if(locked||operationBusy)return;
  if(event.dataTransfer?.files?.length){
    const transfer=new DataTransfer();
    for(const file of event.dataTransfer.files){
      transfer.items.add(file);
    }
    hashInput.files=transfer.files;
    handleHashFileSelect(hashInput.files);
  }
});
stegoDropzone.addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' '){
    event.preventDefault();
    if(locked||operationBusy)return;
    stegoCarrier.click();
  }
});
stegoDropzone.addEventListener('dragover',event=>{
  event.preventDefault();
  stegoDropzone.classList.add('dragging');
});
stegoDropzone.addEventListener('dragleave',event=>{
  if(!stegoDropzone.contains(event.relatedTarget))stegoDropzone.classList.remove('dragging');
});
stegoDropzone.addEventListener('drop',event=>{
  event.preventDefault();
  stegoDropzone.classList.remove('dragging');
  if(locked||operationBusy)return;
  const files=event.dataTransfer?.files;
  if(!files?.length)return;
  if(files.length!==1){
    setStegoStatus('Choose one carrier image at a time.',true,'oneCarrierRequired');
    return;
  }
  const transfer=new DataTransfer();
  transfer.items.add(files[0]);
  stegoCarrier.files=transfer.files;
  stegoCarrier.dispatchEvent(new Event('change',{bubbles:true}));
});
mode.addEventListener('change',()=>{
  if(mode.value==='legacy'&&!legacyWarningAcknowledged){
    const accepted=window.confirm(
      'Grumpy v2 is cryptographically insecure and can only decrypt and migrate old messages. New encryption is disabled. Continue to legacy decryption?'
    );
    if(!accepted){
      mode.value=lastSelectedMode;
      refresh();
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
$('key').addEventListener('input',()=>{invalidateMessageResult();updatePassphraseStrength();updateActionButtons()});
$('key').addEventListener('blur',()=>audio.announcePassphraseResult());
$('passphraseLength').addEventListener('change',()=>{updatePassphraseStrength();updateActionButtons()});
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
  const migrated=legacyMigrationText;
  mode.value='aes';
  key.value='';
  inp.value=migrated;
  invalidateMessageResult();
  refresh();
  updatePassphraseStrength();
  $('legacyMigration').hidden=false;
  $('migrateLegacy').hidden=true;
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
setStegoMode('hide');
updateStegoPayloadSummary();
void detectAes192Support();
})();
