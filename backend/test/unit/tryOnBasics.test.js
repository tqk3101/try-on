import { describe, expect, it } from 'vitest';
import { readTryOnConfig } from '../../src/config/tryOn.js';
import { computeInputKey } from '../../src/services/tryOn/inputKey.js';
import { getQuotaWindow } from '../../src/services/tryOn/quotaWindow.js';
import { detectResultImageType } from '../../src/utils/image.js';
import { pngBuffer } from '../helpers/images.js';

describe('computeInputKey (khoá cache)', () => {
  const provider = {
    name: 'gemini',
    model: 'm1',
    promptVersion: 'p2',
    usesMeasurements: false,
  };
  const base = {
    provider,
    avatarPath: 'u/avatar-1.png',
    productImagePath: 'p/flatlay-1.png',
    heightCm: 165,
    weightKg: 52,
  };

  it('ổn định: cùng đầu vào -> cùng khoá (sha256 hex)', () => {
    expect(computeInputKey(base)).toBe(computeInputKey({ ...base }));
    expect(computeInputKey(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([
    ['provider', { provider: { ...provider, name: 'stub' } }],
    ['model', { provider: { ...provider, model: 'm2' } }],
    ['promptVersion', { provider: { ...provider, promptVersion: 'p3' } }],
    ['ảnh toàn thân', { avatarPath: 'u/avatar-2.png' }],
    ['ảnh sản phẩm', { productImagePath: 'p/flatlay-2.png' }],
  ])('đổi %s -> khoá mới', (_label, override) => {
    expect(computeInputKey({ ...base, ...override })).not.toBe(computeInputKey(base));
  });

  it('số đo chỉ ảnh hưởng khoá khi provider dùng số đo', () => {
    expect(computeInputKey({ ...base, heightCm: 170 })).toBe(computeInputKey(base));
    const withMeasures = { ...base, provider: { ...provider, usesMeasurements: true } };
    expect(computeInputKey({ ...withMeasures, heightCm: 170 })).not.toBe(
      computeInputKey(withMeasures),
    );
    expect(computeInputKey({ ...withMeasures, weightKg: 60 })).not.toBe(
      computeInputKey(withMeasures),
    );
  });

  it('không nhập nhằng ranh giới giữa các trường', () => {
    const a = computeInputKey({ ...base, avatarPath: 'ab', productImagePath: 'c' });
    const b = computeInputKey({ ...base, avatarPath: 'a', productImagePath: 'bc' });
    expect(a).not.toBe(b);
  });
});

describe('getQuotaWindow (ngày theo giờ Việt Nam UTC+7)', () => {
  // 00:00 giờ VN ngày 18/11/2026 = 17:00 UTC ngày 17/11/2026
  const dayStart = Date.parse('2026-11-17T17:00:00.000Z');

  it('giữa ngày VN: cửa sổ [00:00 VN, 00:00 VN hôm sau)', () => {
    const w = getQuotaWindow(Date.parse('2026-11-18T05:00:00.000Z')); // 12:00 VN
    expect(w.startsAt).toBe('2026-11-17T17:00:00.000Z');
    expect(w.resetsAt).toBe('2026-11-18T17:00:00.000Z');
    expect(w.secondsUntilReset).toBe(12 * 3600);
  });

  it('23:59:59 VN vẫn thuộc ngày cũ; 00:00:00 VN sang ngày mới', () => {
    const before = getQuotaWindow(dayStart - 1000);
    expect(before.startsAt).toBe('2026-11-16T17:00:00.000Z');
    expect(before.resetsAt).toBe('2026-11-17T17:00:00.000Z');
    expect(before.secondsUntilReset).toBe(1);

    const at = getQuotaWindow(dayStart);
    expect(at.startsAt).toBe('2026-11-17T17:00:00.000Z');
    expect(at.secondsUntilReset).toBe(24 * 3600);
  });

  it('một ngày UTC khác ngày VN: 20:00 UTC đã là ngày hôm sau ở VN', () => {
    const w = getQuotaWindow(Date.parse('2026-11-17T20:00:00.000Z')); // 03:00 VN 18/11
    expect(w.startsAt).toBe('2026-11-17T17:00:00.000Z');
  });

  it('secondsUntilReset luôn >= 1', () => {
    expect(getQuotaWindow(dayStart + 24 * 3600 * 1000 - 1).secondsUntilReset).toBe(1);
  });
});

describe('readTryOnConfig', () => {
  it('mặc định: provider stub, success, hạn mức 30, timeout 90s, đồng thời 3', () => {
    expect(readTryOnConfig({})).toMatchObject({
      provider: 'stub',
      stubMode: 'success',
      dailyLimit: 30,
      timeoutMs: 90_000,
      maxConcurrency: 3,
      geminiApiKey: '',
    });
  });

  it('đọc giá trị từ nguồn env, chuẩn hoá hoa/thường', () => {
    const config = readTryOnConfig({
      TRY_ON_PROVIDER: ' Gemini ',
      TRY_ON_STUB_MODE: 'SLOW',
      TRY_ON_DAILY_LIMIT: '5',
      GEMINI_API_KEY: ' k ',
    });
    expect(config).toMatchObject({
      provider: 'gemini',
      stubMode: 'slow',
      dailyLimit: 5,
      geminiApiKey: 'k',
    });
  });

  it('giá trị sai -> ném lỗi rõ ràng', () => {
    expect(() => readTryOnConfig({ TRY_ON_PROVIDER: 'openai' })).toThrow(/TRY_ON_PROVIDER/);
    expect(() => readTryOnConfig({ TRY_ON_STUB_MODE: 'x' })).toThrow(/TRY_ON_STUB_MODE/);
    for (const bad of ['0', '-1', '1.5', 'abc']) {
      expect(() => readTryOnConfig({ TRY_ON_DAILY_LIMIT: bad })).toThrow(/TRY_ON_DAILY_LIMIT/);
    }
  });
});

describe('detectResultImageType (kết quả thử đồ, có WebP)', () => {
  it('nhận PNG/JPEG như detectImageType', () => {
    expect(detectResultImageType(pngBuffer())).toMatchObject({ ext: 'png' });
  });

  it('nhận WebP (RIFF....WEBP), từ chối RIFF khác và buffer ngắn', () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
    expect(detectResultImageType(webp)).toEqual({ ext: 'webp', contentType: 'image/webp' });
    const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt ')]);
    expect(detectResultImageType(wav)).toBeNull();
    expect(detectResultImageType(Buffer.from('RIFF'))).toBeNull();
  });
});
