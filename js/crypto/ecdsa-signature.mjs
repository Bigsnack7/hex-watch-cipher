import { b64, concat, decoder, encoder, requireCrypto, subtle } from './shared.mjs';
import { readPem, writePem } from './pem.mjs';

export const SIGNED_MESSAGE_TAG = 'SIG1.';
export const MAX_SIGNED_MESSAGE_CHARS = 200_000;
const SIGNATURE_DOMAIN = encoder.encode('Hex Watch Cipher signed message v1');
const SIGNATURE_BYTES = 64;
const HEADER_BYTES = 5;
const SUPPORTED_TOKEN_TAGS = ['CT2.', 'CT1.', 'CBC1.', 'RSA1.', 'RSA2.', 'RSA3.'];

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
  if (typeof value !== 'string') return assertP256Key(value, 'private', 'sign');
  try {
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
  if (typeof value !== 'string') return assertP256Key(value, 'public', 'verify');
  try {
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

function decodeBase64Url(value) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error('format');
  }
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(
      atob(base64 + '='.repeat((4 - base64.length % 4) % 4)),
      character => character.charCodeAt(0)
    );
    if (b64(bytes) !== value) throw new Error('format');
    return bytes;
  } catch {
    throw new Error('format');
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
  const digest = new Uint8Array(await subtle.digest(
    'SHA-256',
    await subtle.exportKey('spki', key)
  ));
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

  const envelope = decodeBase64Url(signedToken.slice(SIGNED_MESSAGE_TAG.length));
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
  const valid = await subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    envelope.subarray(HEADER_BYTES + tokenLength),
    concat(SIGNATURE_DOMAIN, envelope.subarray(0, HEADER_BYTES + tokenLength))
  );
  if (!valid) throw new Error('signature');
  return { token, fingerprint: await fingerprintEcdsaPublicKey(publicKey) };
}

export function isSignedMessageToken(value) {
  return typeof value === 'string' && value.startsWith(SIGNED_MESSAGE_TAG);
}
