import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import {
  attachEncryptedPayloadToPdf, extractEncryptedPayloadFromPdf,
  MAX_STEGO_PDF_BYTES, STEGO_PDF_ATTACHMENT_NAME
} from '../js/pdf-attachments.mjs';

test('PDF attachment round-trips bytes while preserving a normally readable document', async () => {
  const source = await PDFDocument.create();
  source.addPage([612, 792]);
  const sourceBytes = await source.save();
  const encryptedPayload = Uint8Array.from({ length: 4096 }, (_, index) => (index * 37) % 256);

  const output = await attachEncryptedPayloadToPdf(sourceBytes, encryptedPayload);
  const reopened = await PDFDocument.load(output);
  const names = reopened.catalog.lookup(PDFName.of('Names'), PDFDict);
  const embeddedFiles = names.lookup(PDFName.of('EmbeddedFiles'), PDFDict);
  const attachmentNames = embeddedFiles.lookup(PDFName.of('Names'), PDFArray);

  assert.equal(output[0], 0x25);
  assert.equal(reopened.getPages().length, 1);
  assert.equal(attachmentNames.get(0).decodeText(), STEGO_PDF_ATTACHMENT_NAME);
  assert.deepEqual(await extractEncryptedPayloadFromPdf(output), encryptedPayload);
});

test('PDF attachment helpers reject invalid, ambiguous, and oversized carriers', async () => {
  await assert.rejects(
    attachEncryptedPayloadToPdf(new Uint8Array([1, 2, 3]), Uint8Array.of(1)),
    /pdfformat/
  );
  await assert.rejects(
    extractEncryptedPayloadFromPdf(new Uint8Array([1, 2, 3])),
    /pdfformat/
  );
  await assert.rejects(
    attachEncryptedPayloadToPdf(new Uint8Array(MAX_STEGO_PDF_BYTES + 1), Uint8Array.of(1)),
    /pdflimit/
  );
  await assert.rejects(
    extractEncryptedPayloadFromPdf(await (await PDFDocument.create()).save()),
    /stegoformat/
  );

  const source = await PDFDocument.create();
  source.addPage();
  source.attach(Uint8Array.of(1), STEGO_PDF_ATTACHMENT_NAME, {
    mimeType: 'application/octet-stream'
  });
  const sourceWithAttachment = await source.save();
  await assert.rejects(
    attachEncryptedPayloadToPdf(sourceWithAttachment, Uint8Array.of(2)),
    /pdfattachmentexists/
  );
});
