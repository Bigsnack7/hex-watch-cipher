import { MAX_RSA_KEY_CHARS } from './shared.mjs';

export function readPem(text, label) {
  if (text.length > MAX_RSA_KEY_CHARS) throw new Error('keytoolarge');
  const match = text.trim().match(new RegExp(`^-----BEGIN ${label}-----([\\s\\S]+)-----END ${label}-----$`));
  if (!match) throw new Error('keyformat');
  const encoded = match[1].replace(/\s+/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error('keyformat');
  }
  try {
    const binary = atob(encoded);
    if (btoa(binary) !== encoded) throw new Error('keyformat');
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  } catch {
    throw new Error('keyformat');
  }
}

export function writePem(data, label) {
  let binary = '';
  const bytes = new Uint8Array(data);
  for (let i = 0; i < bytes.length; i += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32_768));
  }
  const encoded = btoa(binary);
  return `-----BEGIN ${label}-----\n${encoded.match(/.{1,64}/g).join('\n')}\n-----END ${label}-----`;
}
