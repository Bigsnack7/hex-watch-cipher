import {
  AES_TAG, LEGACY_AES_V4_TAG, LEGACY_AES_V3_TAG, LEGACY_AES_V2_TAG, LEGACY_AES_TAG,
  CBC_TAG, LEGACY_CBC_V4_TAG, LEGACY_CBC_V3_TAG, LEGACY_CBC_V2_TAG, CBC_LEGACY_TAG,
  RSA_TAG, RSA_DIRECT_TAG, RSA_AES_TAG, LEGACY_RSA_AES_V5_TAG,
  LEGACY_RSA_AES_V4_TAG, LEGACY_RSA_AES_TAG,
  b64, concat, decoder, encoder, requireCrypto, subtle, unb64url
} from './shared.mjs';
import { readPem, writePem } from './pem.mjs';

export const SIGNED_MESSAGE_TAG = 'SIG1.';
export const MAX_SIGNED_MESSAGE_CHARS = 200_000;
const SIGNATURE_DOMAIN = encoder.encode('Hex Watch Cipher signed message v1');
const SIGNATURE_BYTES = 64;
const HEADER_BYTES = 5;
const SUPPORTED_TOKEN_TAGS = [
  AES_TAG, LEGACY_AES_V4_TAG, LEGACY_AES_V3_TAG, LEGACY_AES_V2_TAG, LEGACY_AES_TAG,
  CBC_TAG, LEGACY_CBC_V4_TAG, LEGACY_CBC_V3_TAG, LEGACY_CBC_V2_TAG, CBC_LEGACY_TAG,
  RSA_TAG, RSA_DIRECT_TAG, RSA_AES_TAG, LEGACY_RSA_AES_V5_TAG,
  LEGACY_RSA_AES_V4_TAG, LEGACY_RSA_AES_TAG
];

function isEncryptedToken(token) {
  if (typeof token !== 'string') return false;
  const tag = SUPPORTED_TOKEN_TAGS.find(candidate => token.startsWith(candidate));
  return Boolean(tag && token.length > tag.length);
}

function assertP256Key(key, type, usage) {
  if (
    !key || key.type !== type || key.algorithm?.name !== 'ECDSA' ||
    key.algorithm.namedCurve !== 'P-256' || !key.usages?.includes(usage)
  ) {
    throw new Error('keyformat');
  }
  return key;
}

async function importPrivateKey(value) {
  try {
    if (typeof value !== 'string') return assertP256Key(value, 'private', 'sign');
    return assertP256Key(await subtle.importKey(
      'pkcs8',
      readPem(value, 'PRIVATE KEY'),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    ), 'private', 'sign');
  } catch (error) {
    if (error.message === 'keytoolarge') throw error;
    throw new Error('signingkeyformat');
  }
}

async function importPublicKey(value) {
  try {
    if (typeof value !== 'string') return assertP256Key(value, 'public', 'verify');
    return assertP256Key(await subtle.importKey(
      'spki',
      readPem(value, 'PUBLIC KEY'),
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
    ), 'public', 'verify');
  } catch (error) {
    if (error.message === 'keytoolarge') throw error;
    throw new Error('signingkeyformat');
  }
}

export async function generateEcdsaKeyPair({ exportable = false } = {}) {
  requireCrypto();
  const pair = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    exportable,
    ['sign', 'verify']
  );
  return {
    publicKey: writePem(await subtle.exportKey('spki', pair.publicKey), 'PUBLIC KEY'),
    privateKey: pair.privateKey,
    privatePem: exportable
      ? writePem(await subtle.exportKey('pkcs8', pair.privateKey), 'PRIVATE KEY')
      : null,
    generatedAt: new Date().toISOString()
  };
}

export async function fingerprintEcdsaPublicKey(value) {
  requireCrypto();
  const key = await importPublicKey(value);
  let spki;
  try {
    spki = await subtle.exportKey('spki', key);
  } catch {
    // e.g. a caller-supplied non-extractable CryptoKey
    throw new Error('signingkeyformat');
  }
  const digest = new Uint8Array(await subtle.digest('SHA-256', spki));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0').toUpperCase())
    .join('')
    .match(/.{1,4}/g)
    .join(' ');
}

export async function signMessageToken(token, privateKeyValue) {
  requireCrypto();
  if (!isEncryptedToken(token) || token.length > MAX_SIGNED_MESSAGE_CHARS) {
    throw new Error(token?.length > MAX_SIGNED_MESSAGE_CHARS ? 'toolarge' : 'signformat');
  }
  const privateKey = await importPrivateKey(privateKeyValue);
  const tokenBytes = encoder.encode(token);
  const header = new Uint8Array(HEADER_BYTES);
  header[0] = 1;
  new DataView(header.buffer).setUint32(1, tokenBytes.length);
  const signedBytes = concat(SIGNATURE_DOMAIN, header, tokenBytes);
  const signature = new Uint8Array(await subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    signedBytes
  ));
  if (signature.length !== SIGNATURE_BYTES) throw new Error('signing');
  const envelope = concat(header, tokenBytes, signature);
  const signedToken = SIGNED_MESSAGE_TAG + b64(envelope);
  if (signedToken.length > MAX_SIGNED_MESSAGE_CHARS) throw new Error('toolarge');
  return signedToken;
}

export async function verifyMessageToken(signedToken, publicKeyValue) {
  requireCrypto();
  if (
    typeof signedToken !== 'string' ||
    signedToken.length > MAX_SIGNED_MESSAGE_CHARS ||
    !signedToken.startsWith(SIGNED_MESSAGE_TAG)
  ) throw new Error('format');

  const envelope = unb64url(signedToken.slice(SIGNED_MESSAGE_TAG.length));
  if (envelope.length < HEADER_BYTES + SIGNATURE_BYTES || envelope[0] !== 1) {
    throw new Error('format');
  }
  const tokenLength = new DataView(
    envelope.buffer,
    envelope.byteOffset,
    envelope.byteLength
  ).getUint32(1);
  if (
    tokenLength === 0 ||
    envelope.length !== HEADER_BYTES + tokenLength + SIGNATURE_BYTES
  ) throw new Error('format');

  const tokenBytes = envelope.subarray(HEADER_BYTES, HEADER_BYTES + tokenLength);
  let token;
  try {
    token = decoder.decode(tokenBytes);
  } catch {
    throw new Error('format');
  }
  if (!isEncryptedToken(token)) throw new Error('format');

  const publicKey = await importPublicKey(publicKeyValue);
  let valid;
  try {
    valid = await subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      envelope.subarray(HEADER_BYTES + tokenLength),
      concat(SIGNATURE_DOMAIN, envelope.subarray(0, HEADER_BYTES + tokenLength))
    );
  } catch {
    throw new Error('signature');
  }
  if (!valid) throw new Error('signature');
  return { token, fingerprint: await fingerprintEcdsaPublicKey(publicKey) };
}

export function isSignedMessageToken(value) {
  return typeof value === 'string' && value.startsWith(SIGNED_MESSAGE_TAG);
}
