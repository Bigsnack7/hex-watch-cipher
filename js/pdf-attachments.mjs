import {
  PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFRawStream, PDFString
} from './vendor/pdf-lib.esm.min.js';

export const MAX_STEGO_PDF_BYTES = 32 * 1024 * 1024;
export const MAX_STEGO_PDF_OUTPUT_BYTES = 64 * 1024 * 1024;
export const STEGO_PDF_ATTACHMENT_NAME = 'hex-watch-cipher-payload.hwf5';
const LEGACY_STEGO_PDF_ATTACHMENT_NAMES = new Set([
  'hex-watch-cipher-payload.hwf4',
  'hex-watch-cipher-payload.hwf3',
  'hex-watch-cipher-payload.hwf2'
]);

const MAX_EMBEDDED_BYTES = 4 * 1024 * 1024 + 2048;
const MAX_NAME_TREE_DEPTH = 32;
const MAX_NAME_TREE_NODES = 4096;

function pdfName(value) {
  return PDFName.of(value);
}

async function loadPdf(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_STEGO_PDF_BYTES) {
    throw new Error('pdflimit');
  }
  try {
    return await PDFDocument.load(bytes);
  } catch (error) {
    if (/encrypt/i.test(String(error?.message))) throw new Error('pdfencrypted');
    throw new Error('pdfformat');
  }
}

function getAttachmentEntries(document) {
  const names = document.catalog.lookupMaybe(pdfName('Names'), PDFDict);
  const embeddedFiles = names?.lookupMaybe(pdfName('EmbeddedFiles'), PDFDict);
  if (!embeddedFiles) return [];

  const entries = [];
  let visited = 0;
  const visit = (node, depth) => {
    if (depth > MAX_NAME_TREE_DEPTH || ++visited > MAX_NAME_TREE_NODES) {
      throw new Error('pdfformat');
    }
    const namesArray = node.lookupMaybe(pdfName('Names'), PDFArray);
    if (namesArray) {
      if (namesArray.size() % 2 !== 0) throw new Error('pdfformat');
      for (let index = 0; index < namesArray.size(); index += 2) {
        const key = document.context.lookup(namesArray.get(index));
        const fileSpec = document.context.lookup(namesArray.get(index + 1), PDFDict);
        if (!(key instanceof PDFString || key instanceof PDFHexString) || !fileSpec) {
          throw new Error('pdfformat');
        }
        entries.push({ name: key.decodeText(), fileSpec });
      }
    }
    const kids = node.lookupMaybe(pdfName('Kids'), PDFArray);
    if (kids) {
      for (let index = 0; index < kids.size(); index++) {
        const child = document.context.lookup(kids.get(index), PDFDict);
        if (!child) throw new Error('pdfformat');
        visit(child, depth + 1);
      }
    }
  };
  visit(embeddedFiles, 0);
  return entries;
}

export async function attachEncryptedPayloadToPdf(pdfBytes, encryptedPayload) {
  if (!(encryptedPayload instanceof Uint8Array) || !encryptedPayload.length ||
      encryptedPayload.length > MAX_EMBEDDED_BYTES) {
    throw new Error('stegoformat');
  }
  const document = await loadPdf(pdfBytes);
  if (getAttachmentEntries(document).some(entry =>
    entry.name === STEGO_PDF_ATTACHMENT_NAME || LEGACY_STEGO_PDF_ATTACHMENT_NAMES.has(entry.name)
  )) {
    throw new Error('pdfattachmentexists');
  }
  document.attach(encryptedPayload, STEGO_PDF_ATTACHMENT_NAME, {
    mimeType: 'application/octet-stream',
    description: 'Encrypted Hex Watch Cipher payload',
    afRelationship: 'Data'
  });
  const output = await document.save();
  if (output.length > MAX_STEGO_PDF_OUTPUT_BYTES) throw new Error('pdfoutputlarge');
  return output;
}

async function decodeAttachmentStream(stream) {
  if (stream.dict.lookup(pdfName('Filter'))?.toString() !== '/FlateDecode') {
    throw new Error('pdfattachment');
  }
  const params = stream.dict.lookupMaybe(pdfName('Params'), PDFDict);
  const size = params?.lookupMaybe(pdfName('Size'), PDFNumber)?.asNumber();
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_EMBEDDED_BYTES) {
    throw new Error('pdfattachment');
  }
  if (typeof DecompressionStream !== 'function') throw new Error('pdfunsupported');

  let reader;
  try {
    reader = new Blob([stream.getContents()])
      .stream()
      .pipeThrough(new DecompressionStream('deflate'))
      .getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_EMBEDDED_BYTES || total > size) {
        await reader.cancel();
        throw new Error('pdfattachment');
      }
      chunks.push(value);
    }
    if (total !== size) throw new Error('pdfattachment');
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  } catch (error) {
    if (error.message === 'pdfattachment') throw error;
    throw new Error('pdfattachment');
  } finally {
    reader?.releaseLock();
  }
}

export async function extractEncryptedPayloadFromPdf(pdfBytes) {
  const document = await loadPdf(pdfBytes);
  const matches = getAttachmentEntries(document)
    .filter(entry =>
      entry.name === STEGO_PDF_ATTACHMENT_NAME || LEGACY_STEGO_PDF_ATTACHMENT_NAMES.has(entry.name)
    );
  if (matches.length !== 1) throw new Error('stegoformat');

  const embeddedFiles = matches[0].fileSpec.lookupMaybe(pdfName('EF'), PDFDict);
  const stream = embeddedFiles?.lookupMaybe(pdfName('F'), PDFRawStream);
  if (!(stream instanceof PDFRawStream)) throw new Error('pdfattachment');
  return decodeAttachmentStream(stream);
}
