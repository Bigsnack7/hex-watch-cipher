const encoder = new TextEncoder();
const MAX_ARCHIVE_FILES = 1000;

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function safeArchivePath(path) {
  const raw=String(path).replace(/\\/g, '/');
  if(raw.startsWith('/')||/^[a-zA-Z]:/.test(raw)||/[\u0000-\u001f]/.test(raw))throw new Error('archivepath');
  const segments = raw.split('/')
    .filter(segment => segment && segment !== '.');
  if (!segments.length || segments.includes('..')) throw new Error('archivepath');
  const name = segments.join('/');
  if (encoder.encode(name).length > 0xffff) throw new Error('archivepath');
  return name;
}

function write16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function write32(view, offset, value) {
  view.setUint32(offset, value, true);
}

export async function buildZipArchive(files) {
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_ARCHIVE_FILES) {
    throw new Error('archivefiles');
  }
  const entries = [];
  const names = new Set();
  const normalizedNames = new Set();
  let localOffset = 0;

  for (const file of files) {
    if (!(file instanceof Blob) || typeof file.name !== 'string') throw new Error('format');
    const name = safeArchivePath(file.webkitRelativePath || file.name);
    const normalizedName=name.normalize('NFC').toLowerCase();
    const pathSegments=normalizedName.split('/');
    const hasFileAncestor=pathSegments.slice(0,-1)
      .some((_,index)=>normalizedNames.has(pathSegments.slice(0,index+1).join('/')));
    const hasFileDescendant=[...normalizedNames].some(existing=>existing.startsWith(`${normalizedName}/`));
    if(names.has(name)||normalizedNames.has(normalizedName)||hasFileAncestor||hasFileDescendant){
      throw new Error('archivepath');
    }
    names.add(name);
    normalizedNames.add(normalizedName);
    const nameBytes = encoder.encode(name);
    const data = new Uint8Array(await file.arrayBuffer());
    if (data.length > 0xffffffff) throw new Error('filetoolarge');
    const checksum = crc32(data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    write32(localView, 0, 0x04034b50);
    write16(localView, 4, 20);
    write16(localView, 6, 0x0800);
    write16(localView, 8, 0);
    write16(localView, 10, 0);
    write16(localView, 12, 33);
    write32(localView, 14, checksum);
    write32(localView, 18, data.length);
    write32(localView, 22, data.length);
    write16(localView, 26, nameBytes.length);
    write16(localView, 28, 0);
    localHeader.set(nameBytes, 30);
    entries.push({ nameBytes, data, checksum, localHeader, offset: localOffset });
    localOffset += localHeader.length + data.length;
  }

  if (localOffset > 0xffffffff) throw new Error('filetoolarge');
  const centralOffset = localOffset;
  const centralHeaders = entries.map(({ nameBytes, data, checksum, offset }) => {
    const header = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(header.buffer);
    write32(view, 0, 0x02014b50);
    write16(view, 4, 20);
    write16(view, 6, 20);
    write16(view, 8, 0x0800);
    write16(view, 10, 0);
    write16(view, 12, 0);
    write16(view, 14, 33);
    write32(view, 16, checksum);
    write32(view, 20, data.length);
    write32(view, 24, data.length);
    write16(view, 28, nameBytes.length);
    write16(view, 30, 0);
    write16(view, 32, 0);
    write16(view, 34, 0);
    write16(view, 36, 0);
    write32(view, 38, 0);
    write32(view, 42, offset);
    header.set(nameBytes, 46);
    return header;
  });
  const centralSize = centralHeaders.reduce((total, header) => total + header.length, 0);
  if (centralOffset + centralSize > 0xffffffff) throw new Error('filetoolarge');
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50);
  write16(endView, 4, 0);
  write16(endView, 6, 0);
  write16(endView, 8, entries.length);
  write16(endView, 10, entries.length);
  write32(endView, 12, centralSize);
  write32(endView, 16, centralOffset);
  write16(endView, 20, 0);

  return new Blob([
    ...entries.flatMap(entry => [entry.localHeader, entry.data]),
    ...centralHeaders,
    end
  ], { type: 'application/zip' });
}
