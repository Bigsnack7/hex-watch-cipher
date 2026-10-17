function csvCell(value) {
  const text = String(value ?? '');
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function serializeHashResultsCsv(results) {
  const rows=[['filename','size_bytes','algorithm','digest','expected_match','status']];
  for(const result of results){
    rows.push([
      result.filename,
      result.size,
      result.algorithm.toUpperCase(),
      result.digest,
      result.expectedMatch===null?'':result.expectedMatch?'MATCH':'MISMATCH',
      (result.status||'calculated').toUpperCase()
    ]);
  }
  return rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
