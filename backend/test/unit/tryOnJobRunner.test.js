import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_RESULT_BYTES,
  RESULT_BUCKET,
  createJobRunner,
} from '../../src/services/tryOn/jobRunner.js';
import { ERROR_CODES, TryOnProviderError } from '../../src/services/tryOn/providerError.js';
import { createStubProvider } from '../../src/services/tryOn/providers/stub.js';
import { createMemoryTryOnRepo } from '../helpers/memoryTryOnRepo.js';
import { jpegBuffer, pngBuffer } from '../helpers/images.js';

const USER = '11111111-1111-4111-8111-111111111111';
const PRODUCT = '55555555-5555-4555-8555-555555555555';

const silentLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

async function setup({ provider, config = {}, storage: storageOverride = {} } = {}) {
  const repo = createMemoryTryOnRepo({ products: [{ id: PRODUCT, image_path: 'p.png' }] });
  const { row } = await repo.insertPending({
    profile_id: USER,
    product_id: PRODUCT,
    input_key: 'k',
    avatar_path: `${USER}/avatar-1.png`,
    product_image_path: `${PRODUCT}/flatlay-1.png`,
    provider: 'stub',
    model: 'stub',
  });
  const storage = {
    download: vi.fn(async (bucket) => (bucket === 'avatars' ? pngBuffer() : jpegBuffer())),
    upload: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    ...storageOverride,
  };
  const logger = silentLogger();
  const prov = provider ?? {
    generate: vi.fn(async ({ personImage }) => ({
      buffer: personImage.buffer,
      contentType: personImage.contentType,
      providerJobId: 'resp-1',
    })),
    markUnavailable: vi.fn(),
  };
  const runner = createJobRunner({
    repo,
    storage,
    provider: prov,
    config: { timeoutMs: 1000, maxConcurrency: 3, ...config },
    logger,
  });
  return { repo, row, storage, provider: prov, runner, logger };
}

const dbRow = (repo, id) => repo.rows.find((r) => r.id === id);

describe('jobRunner: đường thành công', () => {
  it('pending -> processing -> succeeded; upload {profile}/{product}/{id}.{ext} theo magic bytes', async () => {
    const { runner, repo, row, storage, provider } = await setup();
    runner.enqueue(row.id);
    await runner.idle();

    const done = dbRow(repo, row.id);
    expect(done).toMatchObject({
      status: 'succeeded',
      result_path: `${USER}/${PRODUCT}/${row.id}.png`,
      provider_job_id: 'resp-1',
    });
    expect(storage.upload).toHaveBeenCalledWith(
      RESULT_BUCKET,
      `${USER}/${PRODUCT}/${row.id}.png`,
      expect.any(Buffer),
      'image/png',
    );
    // ảnh vào provider: người trước, sản phẩm sau; contentType theo magic bytes
    const input = provider.generate.mock.calls[0][0];
    expect(input.personImage.contentType).toBe('image/png');
    expect(input.garmentImage.contentType).toBe('image/jpeg');
    expect(input.signal).toBeInstanceOf(AbortSignal);
  });

  it('kết quả WebP được chấp nhận (bucket cho phép), đuôi file theo nội dung chứ không theo mime provider khai', async () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
    const provider = {
      generate: vi.fn(async () => ({ buffer: webp, contentType: 'image/png' })),
      markUnavailable: vi.fn(),
    };
    const { runner, repo, row, storage } = await setup({ provider });
    runner.enqueue(row.id);
    await runner.idle();
    expect(dbRow(repo, row.id).result_path).toMatch(/\.webp$/);
    expect(storage.upload.mock.calls[0][3]).toBe('image/webp');
  });

  it('stub provider mode success trả lại chính ảnh toàn thân (simulated)', async () => {
    const stub = createStubProvider({ mode: 'success', delayMs: 5 });
    const { runner, repo, row } = await setup({ provider: stub });
    runner.enqueue(row.id);
    await runner.idle();
    expect(dbRow(repo, row.id).status).toBe('succeeded');
  });
});

describe('jobRunner: lỗi', () => {
  it('stub mode fail -> failed/GENERATION_FAILED', async () => {
    const stub = createStubProvider({ mode: 'fail', delayMs: 5 });
    const { runner, repo, row, storage } = await setup({ provider: stub });
    runner.enqueue(row.id);
    await runner.idle();
    expect(dbRow(repo, row.id)).toMatchObject({
      status: 'failed',
      error_code: 'GENERATION_FAILED',
    });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('stub mode slow: vượt timeout -> failed/GENERATION_TIMEOUT (provider tôn trọng signal)', async () => {
    const stub = createStubProvider({ mode: 'slow' });
    const { runner, repo, row } = await setup({ provider: stub, config: { timeoutMs: 40 } });
    runner.enqueue(row.id);
    await runner.idle();
    expect(dbRow(repo, row.id)).toMatchObject({
      status: 'failed',
      error_code: 'GENERATION_TIMEOUT',
    });
  });

  it('provider bỏ qua signal và treo mãi vẫn bị timeout', async () => {
    const provider = { generate: vi.fn(() => new Promise(() => {})), markUnavailable: vi.fn() };
    const { runner, repo, row } = await setup({ provider, config: { timeoutMs: 40 } });
    runner.enqueue(row.id);
    await runner.idle();
    expect(dbRow(repo, row.id).error_code).toBe('GENERATION_TIMEOUT');
  });

  it('giữ nguyên mã của TryOnProviderError và providerJobId', async () => {
    const provider = {
      generate: vi.fn(async () => {
        throw new TryOnProviderError(ERROR_CODES.INPUT_REJECTED, { providerJobId: 'r9' });
      }),
      markUnavailable: vi.fn(),
    };
    const { runner, repo, row } = await setup({ provider });
    runner.enqueue(row.id);
    await runner.idle();
    expect(dbRow(repo, row.id)).toMatchObject({
      status: 'failed',
      error_code: 'INPUT_REJECTED',
      provider_job_id: 'r9',
    });
    expect(provider.markUnavailable).not.toHaveBeenCalled();
  });

  it('lỗi permanent -> markUnavailable (các POST sau sẽ 503)', async () => {
    const provider = {
      generate: vi.fn(async () => {
        throw new TryOnProviderError(ERROR_CODES.PROVIDER_UNAVAILABLE, { permanent: true });
      }),
      markUnavailable: vi.fn(),
    };
    const { runner, repo, row } = await setup({ provider });
    runner.enqueue(row.id);
    await runner.idle();
    expect(provider.markUnavailable).toHaveBeenCalledTimes(1);
    expect(dbRow(repo, row.id).error_code).toBe('PROVIDER_UNAVAILABLE');
  });

  it('lỗi lạ (không phải TryOnProviderError) -> GENERATION_FAILED', async () => {
    const provider = {
      generate: vi.fn(async () => {
        throw new Error('boom');
      }),
      markUnavailable: vi.fn(),
    };
    const { runner, repo, row } = await setup({ provider });
    runner.enqueue(row.id);
    await runner.idle();
    expect(dbRow(repo, row.id).error_code).toBe('GENERATION_FAILED');
  });

  it('thiếu object đầu vào (ảnh vừa bị xoá/thay) -> INPUT_REJECTED, không gọi provider', async () => {
    const { runner, repo, row, provider } = await setup({
      storage: { download: vi.fn(async () => null) },
    });
    runner.enqueue(row.id);
    await runner.idle();
    expect(dbRow(repo, row.id).error_code).toBe('INPUT_REJECTED');
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it('đầu vào không phải ảnh JPG/PNG -> INPUT_REJECTED', async () => {
    const { runner, repo, row, provider } = await setup({
      storage: { download: vi.fn(async () => Buffer.from('not an image')) },
    });
    runner.enqueue(row.id);
    await runner.idle();
    expect(dbRow(repo, row.id).error_code).toBe('INPUT_REJECTED');
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it('kết quả không phải ảnh hoặc quá 10MB -> GENERATION_FAILED, không upload', async () => {
    for (const buffer of [
      Buffer.from('garbage'),
      null,
      Buffer.concat([pngBuffer(), Buffer.alloc(MAX_RESULT_BYTES)]),
    ]) {
      const provider = { generate: vi.fn(async () => ({ buffer })), markUnavailable: vi.fn() };
      const { runner, repo, row, storage } = await setup({ provider });
      runner.enqueue(row.id);
      await runner.idle();
      expect(dbRow(repo, row.id).error_code).toBe('GENERATION_FAILED');
      expect(storage.upload).not.toHaveBeenCalled();
    }
  });

  it('upload kết quả lỗi -> failed/GENERATION_FAILED', async () => {
    const { runner, repo, row } = await setup({
      storage: {
        upload: vi.fn(async () => {
          throw new Error('storage down');
        }),
      },
    });
    runner.enqueue(row.id);
    await runner.idle();
    expect(dbRow(repo, row.id).error_code).toBe('GENERATION_FAILED');
  });

  it('row bị xoá giữa chừng (user đổi ảnh / xoá SP): xoá object vừa upload, không để mồ côi', async () => {
    const { runner, repo, row, storage } = await setup();
    repo.markSucceeded.mockResolvedValueOnce(false);
    runner.enqueue(row.id);
    await runner.idle();
    expect(storage.remove).toHaveBeenCalledWith(RESULT_BUCKET, `${USER}/${PRODUCT}/${row.id}.png`);
  });

  it('claim thất bại (row đã bị xoá/đã xử lý) -> không làm gì', async () => {
    const { runner, repo, row, storage, provider } = await setup();
    repo.rows.length = 0;
    runner.enqueue(row.id);
    await runner.idle();
    expect(storage.download).not.toHaveBeenCalled();
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it('log chỉ chứa mã/thời gian: không lộ ảnh, base64, key', async () => {
    const provider = {
      generate: vi.fn(async () => {
        const err = new TryOnProviderError(ERROR_CODES.GENERATION_FAILED, {
          cause: new Error('SECRET-KEY-123 base64=='),
        });
        err.status = 500;
        throw err;
      }),
      markUnavailable: vi.fn(),
    };
    const { runner, row, logger } = await setup({ provider });
    runner.enqueue(row.id);
    await runner.idle();
    const logged = JSON.stringify([...logger.warn.mock.calls, ...logger.error.mock.calls]);
    expect(logged).toContain('GENERATION_FAILED');
    expect(logged).not.toMatch(/SECRET-KEY|base64/);
  });

  it('log in finishReason và status của TryOnProviderError; không ghi chúng vào row', async () => {
    const provider = {
      generate: vi.fn(async () => {
        throw new TryOnProviderError(ERROR_CODES.INPUT_REJECTED, {
          status: 400,
          finishReason: 'IMAGE_SAFETY',
          cause: new Error('SECRET-KEY-123 base64=='),
        });
      }),
      markUnavailable: vi.fn(),
    };
    const { runner, repo, row, logger } = await setup({ provider });
    runner.enqueue(row.id);
    await runner.idle();
    const logged = logger.warn.mock.calls.map(([line]) => line).join(' | ');
    expect(logged).toContain('code=INPUT_REJECTED');
    expect(logged).toContain('status=400');
    expect(logged).toContain('finishReason=IMAGE_SAFETY');
    expect(logged).not.toMatch(/SECRET-KEY|base64/);
    const saved = JSON.stringify(dbRow(repo, row.id));
    expect(saved).not.toContain('IMAGE_SAFETY');
  });

  it('không có finishReason thì log in dấu "-"', async () => {
    const provider = {
      generate: vi.fn(async () => {
        throw new TryOnProviderError(ERROR_CODES.GENERATION_FAILED);
      }),
      markUnavailable: vi.fn(),
    };
    const { runner, row, logger } = await setup({ provider });
    runner.enqueue(row.id);
    await runner.idle();
    expect(logger.warn.mock.calls[0][0]).toContain('finishReason=-');
  });
});

describe('jobRunner: đồng thời', () => {
  let active;
  let maxActive;

  beforeEach(() => {
    active = 0;
    maxActive = 0;
  });

  it('không chạy quá TRY_ON_MAX_CONCURRENCY job cùng lúc; mọi job đều xong', async () => {
    const provider = {
      generate: vi.fn(async ({ personImage }) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 15));
        active -= 1;
        return { buffer: personImage.buffer };
      }),
      markUnavailable: vi.fn(),
    };
    const ctx = await setup({ provider, config: { maxConcurrency: 2 } });
    const ids = [ctx.row.id];
    for (let i = 0; i < 4; i += 1) {
      const { row } = await ctx.repo.insertPending({
        profile_id: USER,
        product_id: PRODUCT,
        input_key: `k${i}`,
        avatar_path: 'a',
        product_image_path: 'b',
        provider: 'stub',
        model: 'stub',
      });
      ids.push(row.id);
    }
    ids.forEach((id) => ctx.runner.enqueue(id));
    expect(ctx.runner.stats().queued).toBeGreaterThan(0);
    await ctx.runner.idle();

    expect(maxActive).toBe(2);
    expect(ctx.repo.rows.every((r) => r.status === 'succeeded')).toBe(true);
    expect(ctx.runner.stats()).toEqual({ active: 0, queued: 0 });
  });

  it('một job lỗi không làm kẹt slot: job sau vẫn chạy', async () => {
    let call = 0;
    const provider = {
      generate: vi.fn(async ({ personImage }) => {
        call += 1;
        if (call === 1) throw new Error('boom');
        return { buffer: personImage.buffer };
      }),
      markUnavailable: vi.fn(),
    };
    const ctx = await setup({ provider, config: { maxConcurrency: 1 } });
    const { row: second } = await ctx.repo.insertPending({
      profile_id: USER,
      product_id: PRODUCT,
      input_key: 'other',
      avatar_path: 'a',
      product_image_path: 'b',
      provider: 'stub',
      model: 'stub',
    });
    ctx.runner.enqueue(ctx.row.id);
    ctx.runner.enqueue(second.id);
    await ctx.runner.idle();
    expect(dbRow(ctx.repo, ctx.row.id).status).toBe('failed');
    expect(dbRow(ctx.repo, second.id).status).toBe('succeeded');
  });
});
