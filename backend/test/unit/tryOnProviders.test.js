import { describe, expect, it, vi } from 'vitest';
import { GeminiNotConfiguredError } from '../../src/services/geminiImageService.js';
import { ERROR_CODES, TryOnProviderError } from '../../src/services/tryOn/providerError.js';
import {
  PROMPT_VERSION,
  TRY_ON_PROMPT,
  createGeminiProvider,
  mapGeminiError,
  pickGeminiImage,
} from '../../src/services/tryOn/providers/gemini.js';
import { createProvider } from '../../src/services/tryOn/providers/index.js';
import { createStubProvider } from '../../src/services/tryOn/providers/stub.js';
import { pngBuffer } from '../helpers/images.js';

const apiError = (status, message = 'x') => Object.assign(new Error(message), { status });

describe('mapGeminiError (ánh xạ lỗi Gemini -> mã job)', () => {
  it.each([
    ['404 model bị gỡ', apiError(404), 'PROVIDER_UNAVAILABLE', true],
    ['401 key sai', apiError(401), 'PROVIDER_UNAVAILABLE', true],
    ['403 không có quyền', apiError(403), 'PROVIDER_UNAVAILABLE', true],
    ['400 API_KEY_INVALID', apiError(400, 'API_KEY_INVALID'), 'PROVIDER_UNAVAILABLE', true],
    ['400 ảnh đầu vào không hợp lệ', apiError(400, 'bad image'), 'INPUT_REJECTED', false],
    ['429 quá tải', apiError(429), 'PROVIDER_UNAVAILABLE', false],
    ['500', apiError(500), 'PROVIDER_UNAVAILABLE', false],
    ['503', apiError(503), 'PROVIDER_UNAVAILABLE', false],
    ['418 mã lạ', apiError(418), 'GENERATION_FAILED', false],
    ['lỗi không rõ', new Error('?'), 'GENERATION_FAILED', false],
    [
      'ECONNRESET',
      Object.assign(new Error('x'), { code: 'ECONNRESET' }),
      'PROVIDER_UNAVAILABLE',
      false,
    ],
    [
      'cause ENOTFOUND',
      Object.assign(new Error('x'), { cause: { code: 'ENOTFOUND' } }),
      'PROVIDER_UNAVAILABLE',
      false,
    ],
    ['TypeError fetch failed', new TypeError('fetch failed'), 'PROVIDER_UNAVAILABLE', false],
  ])('%s', (_label, err, code, permanent) => {
    const mapped = mapGeminiError(err);
    expect(mapped).toBeInstanceOf(TryOnProviderError);
    expect(mapped.code).toBe(code);
    expect(mapped.permanent).toBe(permanent);
  });

  it('thiếu GEMINI_API_KEY -> PROVIDER_UNAVAILABLE permanent', () => {
    const mapped = mapGeminiError(new GeminiNotConfiguredError());
    expect(mapped).toMatchObject({ code: 'PROVIDER_UNAVAILABLE', permanent: true });
  });

  it('abort (signal đã huỷ hoặc AbortError) -> GENERATION_TIMEOUT', () => {
    const controller = new AbortController();
    controller.abort();
    expect(mapGeminiError(new Error('x'), controller.signal).code).toBe('GENERATION_TIMEOUT');
    const abort = Object.assign(new Error('x'), { name: 'AbortError' });
    expect(mapGeminiError(abort).code).toBe('GENERATION_TIMEOUT');
    expect(mapGeminiError(Object.assign(new Error('x'), { cause: abort })).code).toBe(
      'GENERATION_TIMEOUT',
    );
  });

  it('giữ nguyên TryOnProviderError; không đưa message gốc của SDK vào kết quả', () => {
    const own = new TryOnProviderError(ERROR_CODES.INPUT_REJECTED);
    expect(mapGeminiError(own)).toBe(own);
    const mapped = mapGeminiError(apiError(500, 'RAW RESPONSE with user data'));
    expect(mapped.message).toBe('PROVIDER_UNAVAILABLE');
    expect(JSON.stringify({ m: mapped.message, c: mapped.code })).not.toContain('RAW RESPONSE');
  });
});

describe('pickGeminiImage', () => {
  const image = { buffer: pngBuffer(), mimeType: 'image/png' };

  it('lấy ảnh đầu tiên kèm providerJobId (responseId)', () => {
    const { image: picked, error } = pickGeminiImage({
      images: [image, { buffer: Buffer.from('2'), mimeType: 'image/png' }],
      responseId: 'r1',
    });
    expect(error).toBeUndefined();
    expect(picked).toEqual({ buffer: image.buffer, contentType: 'image/png', providerJobId: 'r1' });
  });

  it('blockReason -> INPUT_REJECTED', () => {
    expect(pickGeminiImage({ images: [], blockReason: 'PROHIBITED_CONTENT' }).error.code).toBe(
      'INPUT_REJECTED',
    );
  });

  it.each([
    'SAFETY',
    'PROHIBITED_CONTENT',
    'SPII',
    'BLOCKLIST',
    'IMAGE_SAFETY',
    'IMAGE_PROHIBITED_CONTENT',
  ])('không có ảnh + finishReason an toàn %s -> INPUT_REJECTED', (finishReason) => {
    const { error } = pickGeminiImage({ images: [], finishReason });
    expect(error.code).toBe('INPUT_REJECTED');
  });

  it('không có ảnh vì lý do khác -> GENERATION_FAILED', () => {
    expect(pickGeminiImage({ images: [], finishReason: 'STOP' }).error.code).toBe(
      'GENERATION_FAILED',
    );
    expect(pickGeminiImage({}).error.code).toBe('GENERATION_FAILED');
  });
});

describe('createGeminiProvider (editImage được mock, không gọi API thật)', () => {
  const personImage = { buffer: Buffer.from('person'), contentType: 'image/png' };
  const garmentImage = { buffer: Buffer.from('garment'), contentType: 'image/jpeg' };

  it('metadata: name gemini, simulated=false, promptVersion hiện hành', () => {
    const provider = createGeminiProvider({ model: 'm1', isConfigured: () => true });
    expect(provider).toMatchObject({
      name: 'gemini',
      model: 'm1',
      promptVersion: PROMPT_VERSION,
      simulated: false,
      usesMeasurements: false,
    });
  });

  it('gọi editImage với prompt cố định, ảnh người TRƯỚC ảnh sản phẩm, model và signal; không có dữ liệu người dùng trong prompt', async () => {
    const editImage = vi.fn(async () => ({
      images: [{ buffer: pngBuffer(), mimeType: 'image/png' }],
      responseId: 'r1',
    }));
    const provider = createGeminiProvider({ model: 'm1', editImage, isConfigured: () => true });
    const signal = new AbortController().signal;

    const out = await provider.generate({ personImage, garmentImage, signal });

    expect(out).toMatchObject({ contentType: 'image/png', providerJobId: 'r1' });
    expect(editImage).toHaveBeenCalledWith({
      prompt: TRY_ON_PROMPT,
      images: [
        { buffer: personImage.buffer, mimeType: 'image/png' },
        { buffer: garmentImage.buffer, mimeType: 'image/jpeg' },
      ],
      model: 'm1',
      abortSignal: signal,
    });
  });

  it('lỗi từ editImage được ánh xạ; kết quả bị chặn -> INPUT_REJECTED', async () => {
    const failing = createGeminiProvider({
      editImage: vi.fn().mockRejectedValue(apiError(404)),
      isConfigured: () => true,
    });
    await expect(failing.generate({ personImage, garmentImage })).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      permanent: true,
    });

    const blocked = createGeminiProvider({
      editImage: vi.fn(async () => ({ images: [], blockReason: 'SAFETY' })),
      isConfigured: () => true,
    });
    await expect(blocked.generate({ personImage, garmentImage })).rejects.toMatchObject({
      code: 'INPUT_REJECTED',
    });
  });

  it('isAvailable phụ thuộc cấu hình key; markUnavailable idempotent, log không chứa key', () => {
    const logger = { error: vi.fn() };
    let configured = true;
    const provider = createGeminiProvider({
      model: 'm1',
      isConfigured: () => configured,
      logger,
    });
    expect(provider.isAvailable()).toBe(true);
    provider.markUnavailable('status 404');
    provider.markUnavailable('status 404');
    expect(provider.isAvailable()).toBe(false);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toContain('m1');

    configured = false;
    expect(createGeminiProvider({ isConfigured: () => false }).isAvailable()).toBe(false);
  });
});

describe('createProvider', () => {
  it('stub là mặc định, truyền mode và delay', () => {
    const provider = createProvider({ provider: 'stub', stubMode: 'fail', stubDelayMs: 1 });
    expect(provider).toMatchObject({ name: 'stub', simulated: true });
  });

  it('gemini: dùng model từ config', () => {
    const provider = createProvider({ provider: 'gemini', geminiModel: 'gemini-x' });
    expect(provider).toMatchObject({ name: 'gemini', model: 'gemini-x' });
  });
});

describe('stub provider', () => {
  const personImage = { buffer: pngBuffer(), contentType: 'image/png' };

  it('success trả lại ảnh toàn thân', async () => {
    const out = await createStubProvider({ mode: 'success', delayMs: 1 }).generate({ personImage });
    expect(out.buffer).toBe(personImage.buffer);
  });

  it('fail -> GENERATION_FAILED', async () => {
    await expect(
      createStubProvider({ mode: 'fail', delayMs: 1 }).generate({ personImage }),
    ).rejects.toMatchObject({ code: 'GENERATION_FAILED' });
  });

  it('slow chờ tới khi signal huỷ rồi GENERATION_TIMEOUT; signal đã huỷ trước đó cũng vậy', async () => {
    const controller = new AbortController();
    const pending = createStubProvider({ mode: 'slow' }).generate({
      personImage,
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'GENERATION_TIMEOUT' });

    await expect(
      createStubProvider({ mode: 'success', delayMs: 1000 }).generate({
        personImage,
        signal: AbortSignal.abort(),
      }),
    ).rejects.toMatchObject({ code: 'GENERATION_TIMEOUT' });
  });

  it('luôn khả dụng', () => {
    expect(createStubProvider().isAvailable()).toBe(true);
  });
});
