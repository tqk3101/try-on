import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeInputKey } from '../../src/services/tryOn/inputKey.js';
import { STALE_GRACE_MS } from '../../src/services/tryOn/jobRunner.js';
import { ERROR_MESSAGES } from '../../src/services/tryOn/providerError.js';
import { createTryOnService, missingProfileFields } from '../../src/services/tryOn/tryOnService.js';
import { createMemoryTryOnRepo } from '../helpers/memoryTryOnRepo.js';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '33333333-3333-4333-8333-333333333333';
const PRODUCT = '55555555-5555-4555-8555-555555555555';
// 05:00 UTC = 12:00 giờ VN ngày 18/11/2026
const NOW = Date.parse('2026-11-18T05:00:00.000Z');

const provider = {
  name: 'stub',
  model: 'stub',
  promptVersion: 'stub',
  usesMeasurements: false,
  isAvailable: () => true,
};

const fullProfile = {
  avatar_path: `${USER}/avatar-1.png`,
  height_cm: '165.0',
  weight_kg: '52.0',
  try_on_consent_at: '2026-11-01T00:00:00Z',
};

function setup({ profile = fullProfile, config = {}, providerOverride = {}, clock = NOW } = {}) {
  let nowMs = clock;
  const repo = createMemoryTryOnRepo({
    products: [{ id: PRODUCT, image_path: `${PRODUCT}/flatlay-1.png` }],
    profiles: profile ? { [USER]: profile } : {},
    now: () => new Date(nowMs).toISOString(),
  });
  const runner = { enqueue: vi.fn() };
  const storage = { sign: vi.fn(async (bucket, path) => `https://signed.test/${bucket}/${path}`) };
  const svc = createTryOnService({
    repo,
    runner,
    provider: { ...provider, ...providerOverride },
    storage,
    config: { dailyLimit: 3, timeoutMs: 90_000, ...config },
    now: () => nowMs,
  });
  return { repo, runner, storage, svc, advance: (ms) => (nowMs += ms) };
}

const reject = async (promise) =>
  promise.then(
    () => null,
    (err) => err,
  );

describe('missingProfileFields', () => {
  it('liệt kê đúng các trường thiếu; 0 là giá trị hợp lệ', () => {
    expect(
      missingProfileFields({ avatar_path: null, height_cm: null, weight_kg: undefined }),
    ).toEqual({
      avatar: expect.any(String),
      heightCm: expect.any(String),
      weightKg: expect.any(String),
    });
    expect(missingProfileFields(fullProfile)).toEqual({});
    expect(missingProfileFields({ avatar_path: 'a', height_cm: 0, weight_kg: 0 })).toEqual({});
  });
});

describe('requestTryOn: điều kiện đầu vào', () => {
  it('404 PRODUCT_NOT_FOUND khi sản phẩm không tồn tại', async () => {
    const { svc } = setup();
    const err = await reject(svc.requestTryOn(USER, '99999999-9999-4999-8999-999999999999'));
    expect(err).toMatchObject({ status: 404, code: 'PRODUCT_NOT_FOUND' });
  });

  it('401 INVALID_TOKEN khi user không còn tồn tại', async () => {
    const { svc } = setup({ profile: null });
    expect(await reject(svc.requestTryOn(USER, PRODUCT))).toMatchObject({
      status: 401,
      code: 'INVALID_TOKEN',
    });
  });

  it('409 PROFILE_INCOMPLETE kèm fields khi thiếu ảnh/số đo; không tạo job', async () => {
    const { svc, repo, runner } = setup({
      profile: { ...fullProfile, avatar_path: null, weight_kg: null },
    });
    const err = await reject(svc.requestTryOn(USER, PRODUCT));
    expect(err).toMatchObject({ status: 409, code: 'PROFILE_INCOMPLETE' });
    expect(Object.keys(err.fields).sort()).toEqual(['avatar', 'weightKg']);
    expect(repo.rows).toHaveLength(0);
    expect(runner.enqueue).not.toHaveBeenCalled();
  });

  it('409 TRY_ON_CONSENT_REQUIRED khi chưa đồng ý xử lý ảnh', async () => {
    const { svc, repo } = setup({ profile: { ...fullProfile, try_on_consent_at: null } });
    expect(await reject(svc.requestTryOn(USER, PRODUCT))).toMatchObject({
      status: 409,
      code: 'TRY_ON_CONSENT_REQUIRED',
    });
    expect(repo.rows).toHaveLength(0);
  });

  it('hồ sơ thiếu được báo trước consent', async () => {
    const { svc } = setup({
      profile: { ...fullProfile, avatar_path: null, try_on_consent_at: null },
    });
    expect(await reject(svc.requestTryOn(USER, PRODUCT))).toMatchObject({
      code: 'PROFILE_INCOMPLETE',
    });
  });

  it('503 TRY_ON_UNAVAILABLE khi provider không khả dụng; không tính hạn mức, không tạo row', async () => {
    const { svc, repo } = setup({ providerOverride: { isAvailable: () => false } });
    expect(await reject(svc.requestTryOn(USER, PRODUCT))).toMatchObject({
      status: 503,
      code: 'TRY_ON_UNAVAILABLE',
    });
    expect(repo.rows).toHaveLength(0);
  });
});

describe('requestTryOn: luồng chính, cache và hạn mức', () => {
  let ctx;
  beforeEach(() => {
    ctx = setup();
  });

  it('lần đầu: 202, row pending (status client = processing), enqueue đúng 1 job, used + 1', async () => {
    const { svc, repo, runner } = ctx;
    const result = await svc.requestTryOn(USER, PRODUCT);

    expect(result.statusCode).toBe(202);
    expect(result.tryOn).toMatchObject({
      productId: PRODUCT,
      status: 'processing',
      imageUrl: null,
      error: null,
      simulated: true,
    });
    expect(result.quota).toEqual({
      limit: 3,
      used: 1,
      remaining: 2,
      resetsAt: '2026-11-18T17:00:00.000Z',
    });
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({
      profile_id: USER,
      product_id: PRODUCT,
      avatar_path: fullProfile.avatar_path,
      product_image_path: `${PRODUCT}/flatlay-1.png`,
      provider: 'stub',
    });
    expect(repo.rows[0].input_key).toBe(
      computeInputKey({
        provider,
        avatarPath: fullProfile.avatar_path,
        productImagePath: `${PRODUCT}/flatlay-1.png`,
      }),
    );
    expect(runner.enqueue).toHaveBeenCalledExactlyOnceWith(result.tryOn.id);
  });

  it('cache hit khi job đang chạy: 200 cùng id, không tạo row/job mới, không tăng used', async () => {
    const first = await ctx.svc.requestTryOn(USER, PRODUCT);
    const second = await ctx.svc.requestTryOn(USER, PRODUCT);
    expect(second.statusCode).toBe(200);
    expect(second.tryOn.id).toBe(first.tryOn.id);
    expect(second.quota.used).toBe(1);
    expect(ctx.repo.rows).toHaveLength(1);
    expect(ctx.runner.enqueue).toHaveBeenCalledTimes(1);
  });

  it('cache hit khi đã succeeded: 200 kèm imageUrl đã ký, không tăng used', async () => {
    const first = await ctx.svc.requestTryOn(USER, PRODUCT);
    const row = ctx.repo.rows[0];
    await ctx.repo.claimForProcessing(row.id);
    await ctx.repo.markSucceeded(row.id, {
      resultPath: `${USER}/${PRODUCT}/${row.id}.png`,
      completedAt: '2026-11-18T05:00:03.000Z',
    });

    const again = await ctx.svc.requestTryOn(USER, PRODUCT);
    expect(again.statusCode).toBe(200);
    expect(again.tryOn).toMatchObject({
      id: first.tryOn.id,
      status: 'succeeded',
      imageUrl: `https://signed.test/try-on-results/${USER}/${PRODUCT}/${row.id}.png`,
    });
    expect(again.quota.used).toBe(1);
    expect(ctx.runner.enqueue).toHaveBeenCalledTimes(1);
  });

  it('cache hit không bị chặn dù đã hết hạn mức', async () => {
    const { svc } = setup({ config: { dailyLimit: 1 } });
    await svc.requestTryOn(USER, PRODUCT);
    const again = await svc.requestTryOn(USER, PRODUCT);
    expect(again.statusCode).toBe(200);
  });

  it('job failed không được tái dùng: POST lại tạo job mới và job failed không tính hạn mức', async () => {
    const first = await ctx.svc.requestTryOn(USER, PRODUCT);
    const id = first.tryOn.id;
    await ctx.repo.markFailed(id, { errorCode: 'GENERATION_FAILED', completedAt: 'x' });

    expect((await ctx.svc.getQuota(USER)).used).toBe(0);
    const retry = await ctx.svc.requestTryOn(USER, PRODUCT);
    expect(retry.statusCode).toBe(202);
    expect(retry.tryOn.id).not.toBe(id);
    expect(ctx.runner.enqueue).toHaveBeenCalledTimes(2);
  });

  it('đổi ảnh toàn thân hoặc ảnh sản phẩm -> khoá mới -> tạo job mới', async () => {
    const first = await ctx.svc.requestTryOn(USER, PRODUCT);
    ctx.repo.profiles.set(USER, { ...fullProfile, avatar_path: `${USER}/avatar-2.png` });
    const second = await ctx.svc.requestTryOn(USER, PRODUCT);
    expect(second.statusCode).toBe(202);
    expect(second.tryOn.id).not.toBe(first.tryOn.id);

    ctx.repo.products.set(PRODUCT, { id: PRODUCT, image_path: `${PRODUCT}/flatlay-2.png` });
    const third = await ctx.svc.requestTryOn(USER, PRODUCT);
    expect(third.statusCode).toBe(202);
  });

  it('429 TRY_ON_QUOTA_EXCEEDED khi hết hạn mức, Retry-After = giây tới 00:00 giờ VN; không tạo job', async () => {
    const { svc, repo, runner } = setup({ config: { dailyLimit: 1 } });
    const other = '66666666-6666-4666-8666-666666666666';
    repo.products.set(other, { id: other, image_path: `${other}/flatlay-1.png` });
    await svc.requestTryOn(USER, PRODUCT);

    const err = await reject(svc.requestTryOn(USER, other));
    expect(err).toMatchObject({ status: 429, code: 'TRY_ON_QUOTA_EXCEEDED' });
    expect(err.retryAfterSeconds).toBe(12 * 3600);
    expect(repo.rows).toHaveLength(1);
    expect(runner.enqueue).toHaveBeenCalledTimes(1);
  });

  it('hạn mức tính theo ngày giờ VN: job lúc 23:59 VN không tính cho ngày mới', async () => {
    const { svc, repo, advance } = setup({
      clock: Date.parse('2026-11-18T16:59:00.000Z'), // 23:59 VN
      config: { dailyLimit: 1 },
    });
    const other = '66666666-6666-4666-8666-666666666666';
    repo.products.set(other, { id: other, image_path: `${other}/flatlay-1.png` });
    await svc.requestTryOn(USER, PRODUCT);
    expect((await svc.getQuota(USER)).remaining).toBe(0);

    advance(2 * 60 * 1000); // 00:01 VN ngày hôm sau
    const quota = await svc.getQuota(USER);
    expect(quota).toMatchObject({ used: 0, remaining: 1, resetsAt: '2026-11-19T17:00:00.000Z' });
    const next = await svc.requestTryOn(USER, other);
    expect(next.statusCode).toBe(202);
  });

  it('2 POST song song cùng sản phẩm -> đúng 1 row và 1 job (unique index một phần)', async () => {
    const results = await Promise.all([
      ctx.svc.requestTryOn(USER, PRODUCT),
      ctx.svc.requestTryOn(USER, PRODUCT),
    ]);
    expect(ctx.repo.rows).toHaveLength(1);
    expect(ctx.runner.enqueue).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 202]);
    expect(results[0].tryOn.id).toBe(results[1].tryOn.id);
    expect(results.map((r) => r.quota.used)).toEqual([1, 1]);
  });

  it('insert vi phạm FK (sản phẩm bị xoá giữa chừng) -> 404 PRODUCT_NOT_FOUND', async () => {
    ctx.repo.insertPending.mockResolvedValueOnce({ missing: true });
    expect(await reject(ctx.svc.requestTryOn(USER, PRODUCT))).toMatchObject({
      status: 404,
      code: 'PRODUCT_NOT_FOUND',
    });
    expect(ctx.runner.enqueue).not.toHaveBeenCalled();
  });

  it('xung đột nhưng không đọc lại được row -> lỗi nội bộ (500), không tạo job', async () => {
    ctx.repo.insertPending.mockResolvedValueOnce({ conflict: true });
    const err = await reject(ctx.svc.requestTryOn(USER, PRODUCT));
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBeUndefined();
    expect(ctx.runner.enqueue).not.toHaveBeenCalled();
  });
});

describe('chuyển trạng thái và GET', () => {
  it('pending/processing đều hiển thị là processing; failed kèm thông điệp tiếng Việt theo mã', async () => {
    const { svc, repo } = setup();
    const { tryOn } = await svc.requestTryOn(USER, PRODUCT);
    await repo.claimForProcessing(tryOn.id);
    expect((await svc.getTryOn(USER, tryOn.id)).status).toBe('processing');

    await repo.markFailed(tryOn.id, { errorCode: 'INPUT_REJECTED', completedAt: 'x' });
    const failed = await svc.getTryOn(USER, tryOn.id);
    expect(failed).toMatchObject({
      status: 'failed',
      imageUrl: null,
      error: { code: 'INPUT_REJECTED', message: ERROR_MESSAGES.INPUT_REJECTED },
    });
  });

  it('mã lỗi lạ -> thông điệp GENERATION_FAILED mặc định', async () => {
    const { svc, repo } = setup();
    const { tryOn } = await svc.requestTryOn(USER, PRODUCT);
    await repo.markFailed(tryOn.id, { errorCode: 'WHATEVER', completedAt: 'x' });
    expect((await svc.getTryOn(USER, tryOn.id)).error.message).toBe(
      ERROR_MESSAGES.GENERATION_FAILED,
    );
  });

  it('simulated=false khi provider thật (gemini)', async () => {
    const { svc } = setup({ providerOverride: { name: 'gemini', model: 'm', promptVersion: 'p' } });
    const { tryOn } = await svc.requestTryOn(USER, PRODUCT);
    expect(tryOn.simulated).toBe(false);
  });

  it('GET id của user khác hoặc id không có -> 404 TRY_ON_NOT_FOUND', async () => {
    const { svc } = setup();
    const { tryOn } = await svc.requestTryOn(USER, PRODUCT);
    expect(await reject(svc.getTryOn(OTHER, tryOn.id))).toMatchObject({
      status: 404,
      code: 'TRY_ON_NOT_FOUND',
    });
    expect(await reject(svc.getTryOn(USER, '99999999-9999-4999-8999-999999999999'))).toMatchObject({
      status: 404,
    });
  });

  it('job treo (server restart) quá timeout + ngưỡng -> GET trả failed/GENERATION_TIMEOUT và đóng row', async () => {
    const { svc, repo, advance } = setup({ config: { timeoutMs: 10_000 } });
    const { tryOn } = await svc.requestTryOn(USER, PRODUCT);

    advance(10_000 + STALE_GRACE_MS - 1);
    expect((await svc.getTryOn(USER, tryOn.id)).status).toBe('processing');

    advance(2);
    const settled = await svc.getTryOn(USER, tryOn.id);
    expect(settled).toMatchObject({ status: 'failed', error: { code: 'GENERATION_TIMEOUT' } });
    expect(repo.rows[0]).toMatchObject({ status: 'failed', error_code: 'GENERATION_TIMEOUT' });
  });

  it('POST khi row cùng khoá bị treo: row treo bị đóng và tạo job mới', async () => {
    const { svc, repo, runner, advance } = setup({ config: { timeoutMs: 10_000 } });
    const first = await svc.requestTryOn(USER, PRODUCT);
    advance(10_000 + STALE_GRACE_MS + 1000);

    const again = await svc.requestTryOn(USER, PRODUCT);
    expect(again.statusCode).toBe(202);
    expect(again.tryOn.id).not.toBe(first.tryOn.id);
    expect(repo.rows.find((r) => r.id === first.tryOn.id).status).toBe('failed');
    expect(runner.enqueue).toHaveBeenCalledTimes(2);
  });

  it('row succeeded không bị coi là treo dù cũ', async () => {
    const { svc, repo, advance } = setup({ config: { timeoutMs: 10_000 } });
    const { tryOn } = await svc.requestTryOn(USER, PRODUCT);
    await repo.claimForProcessing(tryOn.id);
    await repo.markSucceeded(tryOn.id, { resultPath: 'a/b/c.png', completedAt: 'x' });
    advance(24 * 3600 * 1000);
    expect((await svc.getTryOn(USER, tryOn.id)).status).toBe('succeeded');
  });
});
