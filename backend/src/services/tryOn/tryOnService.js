import { HttpError } from '../../middlewares/httpError.js';
import { computeInputKey } from './inputKey.js';
import { RESULT_BUCKET, STALE_GRACE_MS } from './jobRunner.js';
import { ERROR_CODES, ERROR_MESSAGES } from './providerError.js';
import { getQuotaWindow } from './quotaWindow.js';

const INVALID_TOKEN = () => new HttpError(401, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ.');
const NOT_FOUND = () => new HttpError(404, 'TRY_ON_NOT_FOUND', 'Không tìm thấy kết quả thử đồ.');

const FIELD_MESSAGES = Object.freeze({
  avatar: 'Bạn cần tải ảnh toàn thân.',
  heightCm: 'Bạn cần nhập chiều cao.',
  weightKg: 'Bạn cần nhập cân nặng.',
});

/** Danh sách trường hồ sơ còn thiếu để thử đồ (rỗng = đủ). */
export function missingProfileFields(profile) {
  const fields = {};
  if (!profile.avatar_path) fields.avatar = FIELD_MESSAGES.avatar;
  if (profile.height_cm === null || profile.height_cm === undefined) {
    fields.heightCm = FIELD_MESSAGES.heightCm;
  }
  if (profile.weight_kg === null || profile.weight_kg === undefined) {
    fields.weightKg = FIELD_MESSAGES.weightKg;
  }
  return fields;
}

/**
 * Nghiệp vụ thử đồ (try-on-room.md mục 5-7). Mọi phụ thuộc inject được:
 *  - repo: tryOnRepository
 *  - runner: jobRunner ({ enqueue })
 *  - provider: provider adapter (name, model, promptVersion, usesMeasurements, isAvailable)
 *  - storage: { sign(bucket, path) -> url|null }
 *  - config: { dailyLimit, timeoutMs }
 *  - now: () => ms
 */
export function createTryOnService({ repo, runner, provider, storage, config, now = Date.now }) {
  const isStale = (row) =>
    ['pending', 'processing'].includes(row.status) &&
    now() - new Date(row.updated_at).getTime() > config.timeoutMs + STALE_GRACE_MS;

  /** Row pending/processing quá ngưỡng (server restart giữa chừng) -> failed/GENERATION_TIMEOUT. */
  async function settleIfStale(row) {
    if (!isStale(row)) return row;
    const completedAt = new Date(now()).toISOString();
    const updated = await repo.markFailed(row.id, {
      errorCode: ERROR_CODES.GENERATION_TIMEOUT,
      completedAt,
    });
    if (updated) {
      return {
        ...row,
        status: 'failed',
        error_code: ERROR_CODES.GENERATION_TIMEOUT,
        completed_at: completedAt,
      };
    }
    // Job vừa kết thúc/bị xoá giữa chừng: đọc lại trạng thái thật.
    return (await repo.findOwned(row.id, row.profile_id)) ?? null;
  }

  async function toTryOn(row) {
    const succeeded = row.status === 'succeeded';
    const failed = row.status === 'failed';
    return {
      id: row.id,
      productId: row.product_id,
      status: succeeded || failed ? row.status : 'processing',
      imageUrl: succeeded ? await storage.sign(RESULT_BUCKET, row.result_path) : null,
      error: failed
        ? {
            code: row.error_code,
            message: ERROR_MESSAGES[row.error_code] ?? ERROR_MESSAGES.GENERATION_FAILED,
          }
        : null,
      simulated: row.provider === 'stub',
      createdAt: row.created_at,
      completedAt: row.completed_at ?? null,
    };
  }

  async function getQuota(userId) {
    const window = getQuotaWindow(now());
    const used = await repo.countUsedSince(userId, window.startsAt);
    return {
      limit: config.dailyLimit,
      used,
      remaining: Math.max(0, config.dailyLimit - used),
      resetsAt: window.resetsAt,
    };
  }

  /** Row đang dùng được cho khoá cache (succeeded hoặc job còn sống); job treo bị đóng và bỏ qua. */
  async function findLive(userId, productId, inputKey) {
    const row = await repo.findReusable(userId, productId, inputKey);
    if (!row) return null;
    const settled = await settleIfStale(row);
    return settled && settled.status !== 'failed' ? settled : null;
  }

  return {
    getQuota,

    /**
     * POST /api/try-on. `productId` đã được validate là uuid.
     * Trả { statusCode: 200|202, tryOn, quota }.
     */
    async requestTryOn(userId, productId) {
      const product = await repo.findProduct(productId);
      if (!product) {
        throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Sản phẩm không tồn tại hoặc đã bị xoá.');
      }

      const profile = await repo.findProfile(userId);
      if (!profile) throw INVALID_TOKEN();
      const missing = missingProfileFields(profile);
      if (Object.keys(missing).length > 0) {
        throw new HttpError(
          409,
          'PROFILE_INCOMPLETE',
          'Hồ sơ chưa đủ thông tin để thử đồ.',
          missing,
        );
      }
      if (!profile.try_on_consent_at) {
        throw new HttpError(
          409,
          'TRY_ON_CONSENT_REQUIRED',
          'Bạn cần đồng ý xử lý ảnh toàn thân trước khi thử đồ.',
        );
      }
      if (!provider.isAvailable()) {
        throw new HttpError(
          503,
          'TRY_ON_UNAVAILABLE',
          'Dịch vụ thử đồ đang tạm gián đoạn. Vui lòng thử lại sau.',
        );
      }

      const inputKey = computeInputKey({
        provider,
        avatarPath: profile.avatar_path,
        productImagePath: product.image_path,
        heightCm: profile.height_cm,
        weightKg: profile.weight_kg,
      });

      // Cache hit / job cùng khoá đang chạy: 200, không tính hạn mức.
      const live = await findLive(userId, productId, inputKey);
      if (live) {
        return { statusCode: 200, tryOn: await toTryOn(live), quota: await getQuota(userId) };
      }

      const quota = await getQuota(userId);
      if (quota.used >= config.dailyLimit) {
        const error = new HttpError(
          429,
          'TRY_ON_QUOTA_EXCEEDED',
          'Bạn đã dùng hết lượt thử đồ hôm nay. Vui lòng quay lại vào ngày mai.',
        );
        error.retryAfterSeconds = getQuotaWindow(now()).secondsUntilReset;
        throw error;
      }

      const inserted = await repo.insertPending({
        profile_id: userId,
        product_id: productId,
        input_key: inputKey,
        avatar_path: profile.avatar_path,
        product_image_path: product.image_path,
        provider: provider.name,
        model: provider.model,
      });

      if (inserted.missing) {
        // FK hỏng: sản phẩm (hoặc user) bị xoá giữa chừng.
        throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Sản phẩm không tồn tại hoặc đã bị xoá.');
      }
      if (inserted.conflict) {
        // Request song song cùng khoá: đọc lại row đã có thay vì tạo job thứ hai.
        const existing = await findLive(userId, productId, inputKey);
        if (!existing) throw new Error('Xung đột try_on_results nhưng không đọc lại được row.');
        return { statusCode: 200, tryOn: await toTryOn(existing), quota: await getQuota(userId) };
      }

      runner.enqueue(inserted.row.id);
      return {
        statusCode: 202,
        tryOn: await toTryOn(inserted.row),
        quota: { ...quota, used: quota.used + 1, remaining: Math.max(0, quota.remaining - 1) },
      };
    },

    /** GET /api/try-on/:id: chỉ chủ sở hữu; không có/của người khác -> 404. */
    async getTryOn(userId, id) {
      const row = await repo.findOwned(id, userId);
      if (!row) throw NOT_FOUND();
      const settled = await settleIfStale(row);
      if (!settled) throw NOT_FOUND();
      return toTryOn(settled);
    },
  };
}
