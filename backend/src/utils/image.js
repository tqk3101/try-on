const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Nhận diện loại ảnh bằng magic bytes (không tin mimetype/tên file client gửi). */
export function detectImageType(buffer) {
  if (buffer.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  if (buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    return { ext: 'png', contentType: 'image/png' };
  }
  return null;
}

function readPngSize(buffer) {
  // Chữ ký 8 byte, rồi chunk IHDR: length(4) 'IHDR'(4) width(4) height(4).
  if (buffer.length < 24 || buffer.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// SOF0..SOF15 trừ DHT (C4), JPG (C8), DAC (CC): các marker chứa kích thước khung ảnh.
const isSofMarker = (marker) =>
  marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

function readJpegSize(buffer) {
  let offset = 2; // bỏ SOI (FF D8)
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    if (marker === 0xff) {
      offset += 1; // byte đệm 0xFF
      continue;
    }
    // Marker không có độ dài: TEM (01), RSTn (D0..D7), SOI/EOI.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      if (marker === 0xd9) return null; // EOI mà chưa gặp SOF
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (isSofMarker(marker)) {
      // Segment: length(2) precision(1) height(2) width(2)
      if (offset + 9 > buffer.length) return null;
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

/**
 * Đọc chiều rộng/cao (px) từ header PNG (IHDR) hoặc JPEG (SOF), không giải mã ảnh.
 * `type` là kết quả của detectImageType. Trả null nếu header hỏng / không đọc được.
 * Chỉ dùng để chặn ảnh nhỏ: kiểm tra cả hai cạnh nên không phụ thuộc EXIF orientation.
 */
export function readImageSize(buffer, type) {
  try {
    const size = type.ext === 'png' ? readPngSize(buffer) : readJpegSize(buffer);
    if (!size || !(size.width > 0) || !(size.height > 0)) return null;
    return size;
  } catch {
    return null;
  }
}
