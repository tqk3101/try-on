import { describe, expect, it } from 'vitest';
import { detectImageType, readImageSize } from '../../src/utils/image.js';
import { jpegBuffer, pngBuffer } from '../helpers/images.js';

const PNG = { ext: 'png', contentType: 'image/png' };
const JPG = { ext: 'jpg', contentType: 'image/jpeg' };

describe('detectImageType (magic bytes)', () => {
  it('nhận PNG và JPEG', () => {
    expect(detectImageType(pngBuffer())).toEqual(PNG);
    expect(detectImageType(jpegBuffer())).toEqual(JPG);
  });

  it('từ chối GIF, WebP, văn bản, buffer rỗng/ngắn', () => {
    expect(detectImageType(Buffer.from('GIF89a......'))).toBeNull();
    expect(detectImageType(Buffer.from('RIFF....WEBPVP8 '))).toBeNull();
    expect(detectImageType(Buffer.from('<?php echo 1;'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});

describe('readImageSize', () => {
  it('đọc kích thước PNG (IHDR)', () => {
    expect(readImageSize(pngBuffer(640, 480), PNG)).toEqual({ width: 640, height: 480 });
  });

  it('đọc kích thước JPEG (SOF0), kể cả sau segment APP0', () => {
    expect(readImageSize(jpegBuffer(1200, 1600), JPG)).toEqual({ width: 1200, height: 1600 });
    expect(readImageSize(jpegBuffer(300, 500, { padApp0: true }), JPG)).toEqual({
      width: 300,
      height: 500,
    });
  });

  it('PNG thiếu IHDR / quá ngắn -> null', () => {
    const noIhdr = pngBuffer();
    noIhdr.write('XXXX', 12, 'latin1');
    expect(readImageSize(noIhdr, PNG)).toBeNull();
    expect(readImageSize(pngBuffer().subarray(0, 20), PNG)).toBeNull();
  });

  it('JPEG hỏng (không có SOF, gặp EOI, byte lạ) -> null, không ném', () => {
    expect(readImageSize(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), JPG)).toBeNull();
    expect(readImageSize(Buffer.from([0xff, 0xd8, 0x00, 0x00, 0x00]), JPG)).toBeNull();
    expect(readImageSize(Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11]), JPG)).toBeNull();
  });

  it('kích thước 0 -> null', () => {
    expect(readImageSize(pngBuffer(0, 100), PNG)).toBeNull();
  });
});
