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
const subtle=window.crypto&&crypto.subtle;
let locked=false,operationGeneration=0,operationBusy=false,hashGeneration=0;
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
function bytesToHex(bytes){
  return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('').toLowerCase();
}
function md5Bytes(buffer){
  const input=new Uint8Array(buffer);
  const words=[];
  for(let i=0;i<input.length;i+=4){
    words.push(
      ((input[i] || 0) & 0xff) |
      (((input[i + 1] || 0) & 0xff) << 8) |
      (((input[i + 2] || 0) & 0xff) << 16) |
      (((input[i + 3] || 0) & 0xff) << 24)
    );
  }
  const bitLength=input.length * 8;
  words[bitLength >>> 5] |= 0x80 << (bitLength % 32);
  words[(((bitLength + 64) >>> 9) << 4) + 14] = bitLength;

  let a=1732584193;
  let b=-271733879;
  let c=-1732584194;
  let d=271733878;
  const FF=(aa,bb_,cc_,dd_,x,s,t)=>{
    const n=(aa + ((bb_ & cc_) | (~bb_ & dd_)) + (x >>> 0) + t) | 0;
    return (((n << s) | (n >>> (32 - s))) + bb_) | 0;
  };
  const GG=(aa,bb_,cc_,dd_,x,s,t)=>{
    const n=(aa + ((bb_ & dd_) | (cc_ & ~dd_)) + (x >>> 0) + t) | 0;
    return (((n << s) | (n >>> (32 - s))) + bb_) | 0;
  };
  const HH=(aa,bb_,cc_,dd_,x,s,t)=>{
    const n=(aa + (bb_ ^ cc_ ^ dd_) + (x >>> 0) + t) | 0;
    return (((n << s) | (n >>> (32 - s))) + bb_) | 0;
  };
  const II=(aa,bb_,cc_,dd_,x,s,t)=>{
    const n=(aa + (cc_ ^ (bb_ | ~dd_)) + (x >>> 0) + t) | 0;
    return (((n << s) | (n >>> (32 - s))) + bb_) | 0;
  };

  for(let i=0;i<words.length;i += 16){
    const aa=a,bb_=b,cc_=c,dd_=d;
    a=FF(a,b,c,d,words[i+0],7,-680876936);
    d=FF(d,a,b,c,words[i+1],12,-389564586);
    c=FF(c,d,a,b,words[i+2],17,606105819);
    b=FF(b,c,d,a,words[i+3],22,-1044525330);
    a=FF(a,b,c,d,words[i+4],7,-176418897);
    d=FF(d,a,b,c,words[i+5],12,1200080426);
    c=FF(c,d,a,b,words[i+6],17,-1473231341);
    b=FF(b,c,d,a,words[i+7],22,-45705983);
    a=FF(a,b,c,d,words[i+8],7,1770035416);
    d=FF(d,a,b,c,words[i+9],12,-1958414417);
    c=FF(c,d,a,b,words[i+10],17,-42063);
    b=FF(b,c,d,a,words[i+11],22,-1990404162);
    a=FF(a,b,c,d,words[i+12],7,1804603682);
    d=FF(d,a,b,c,words[i+13],12,-40341101);
    c=FF(c,d,a,b,words[i+14],17,-1502002290);
    b=FF(b,c,d,a,words[i+15],22,1236535329);

    a=GG(a,b,c,d,words[i+1],5,-165796510);
    d=GG(d,a,b,c,words[i+6],9,-1069501632);
    c=GG(c,d,a,b,words[i+11],14,643717713);
    b=GG(b,c,d,a,words[i+0],20,-373897302);
    a=GG(a,b,c,d,words[i+5],5,-701558691);
    d=GG(d,a,b,c,words[i+10],9,38016083);
    c=GG(c,d,a,b,words[i+15],14,-660478335);
    b=GG(b,c,d,a,words[i+4],20,-405537848);
    a=GG(a,b,c,d,words[i+9],5,568446438);
    d=GG(d,a,b,c,words[i+14],9,-1019803690);
    c=GG(c,d,a,b,words[i+3],14,-187363961);
    b=GG(b,c,d,a,words[i+8],20,1163531501);
    a=GG(a,b,c,d,words[i+13],5,-1444681467);
    d=GG(d,a,b,c,words[i+2],9,-51403784);
    c=GG(c,d,a,b,words[i+7],14,1735328473);
    b=GG(b,c,d,a,words[i+12],20,-1926607734);

    a=HH(a,b,c,d,words[i+5],4,-378558);
    d=HH(d,a,b,c,words[i+8],11,-2022574463);
    c=HH(c,d,a,b,words[i+11],16,1839030562);
    b=HH(b,c,d,a,words[i+14],23,-35309556);
    a=HH(a,b,c,d,words[i+1],4,-1530992060);
    d=HH(d,a,b,c,words[i+4],11,1272893353);
    c=HH(c,d,a,b,words[i+7],16,-155497632);
    b=HH(b,c,d,a,words[i+10],23,-1094730640);
    a=HH(a,b,c,d,words[i+13],4,681279174);
    d=HH(d,a,b,c,words[i+0],11,-358537222);
    c=HH(c,d,a,b,words[i+3],16,-722521979);
    b=HH(b,c,d,a,words[i+6],23,76029189);
    a=HH(a,b,c,d,words[i+9],4,-640364487);
    d=HH(d,a,b,c,words[i+12],11,-421815835);
    c=HH(c,d,a,b,words[i+15],16,530742520);
    b=HH(b,c,d,a,words[i+2],23,-995338651);

    a=II(a,b,c,d,words[i+0],6,-198630844);
    d=II(d,a,b,c,words[i+7],10,1126891415);
    c=II(c,d,a,b,words[i+14],15,-1416354905);
    b=II(b,c,d,a,words[i+5],21,-57434055);
    a=II(a,b,c,d,words[i+12],6,1700485571);
    d=II(d,a,b,c,words[i+3],10,-1894986606);
    c=II(c,d,a,b,words[i+10],15,-1051523);
    b=II(b,c,d,a,words[i+1],21,-2054922799);
    a=II(a,b,c,d,words[i+8],6,1873313359);
    d=II(d,a,b,c,words[i+15],10,-30611744);
    c=II(c,d,a,b,words[i+6],15,-1560198380);
    b=II(b,c,d,a,words[i+13],21,1309151649);
    a=II(a,b,c,d,words[i+4],6,-145523070);
    d=II(d,a,b,c,words[i+11],10,-1120210379);
    c=II(c,d,a,b,words[i+2],15,718787259);
    b=II(b,c,d,a,words[i+9],21,-343485551);

    a=(a + aa) | 0;
    b=(b + bb_) | 0;
    c=(c + cc_) | 0;
    d=(d + dd_) | 0;
  }

  const digestBytes=new Uint8Array(16);
  const out=[a >>> 0, b >>> 0, c >>> 0, d >>> 0];
  for(let i=0;i<4;i++){
    for(let j=0;j<4;j++){
      digestBytes[i * 4 + j] = (out[i] >>> (j * 8)) & 0xff;
    }
  }
  return digestBytes;
}
async function computeFileHash(algorithm,buffer){
  switch(algorithm){
    case 'md5':
      return bytesToHex(md5Bytes(buffer));
    case 'sha1':
      return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-1',buffer)));
    case 'sha256':
      return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)));
    case 'sha512':
      return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-512',buffer)));
    default:
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }
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
    let fileBuffer;
    try{fileBuffer=await file.arrayBuffer()}
    catch{
      encounteredError=true;
      if(generation!==hashGeneration)return;
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
      try{
        const digest=await computeFileHash(algorithm,fileBuffer);
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
        if(generation!==hashGeneration)return;
      }catch(error){
        if(generation!==hashGeneration)return;
        encounteredError=true;
        value.textContent='Unavailable';
        copyButton.disabled=true;
        row.style.color='var(--danger)';
        latestHashResults.push({
          filename:file.name,size:file.size,algorithm,digest:'',expectedMatch:null,status:'unavailable'
        });
      }
    }
    item.appendChild(title);
    item.appendChild(list);
    hashOutput.appendChild(item);
    fileBuffer=null;
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
    catch(error){fileStatus.textContent='Could not open the save dialog. Check browser permissions and try again.';fileStatus.classList.add('error');audio.announceStatus('fileFailed');return}
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
    audio.announceStatus(decrypting?'fileDecrypted':'fileEncrypted');
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
      audio.announceStatus('fileCancelled');
      return;
    }
    logCryptoFailure(error,decrypting);
    if(cleanupFailed){audio.announceStatus('fileFailed');return}
    fileStatus.textContent=error.message==='fileformat'?MSG.fileformat:getUserErrorMessage(error,decrypting,MSG);
    fileStatus.classList.add('error');
    audio.announceStatus('fileFailed');
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
mode.addEventListener('change',()=>{invalidateMessageResult();refresh()});
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
})();
