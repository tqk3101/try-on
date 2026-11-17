// Buffer ảnh tối thiểu (chỉ header hợp lệ) để test magic bytes và đọc kích thước, không cần file thật.

export function pngBuffer(width = 800, height = 1000) {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 'latin1');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

/** JPEG: SOI + (tuỳ chọn APP0 đệm) + SOF0 + EOI. */
export function jpegBuffer(width = 800, height = 1000, { padApp0 = false } = {}) {
  const parts = [Buffer.from([0xff, 0xd8])];
  if (padApp0) {
    parts.push(Buffer.from([0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(14, 0));
  }
  const sof = Buffer.alloc(19);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  parts.push(sof, Buffer.from([0xff, 0xd9]));
  return Buffer.concat(parts);
}
