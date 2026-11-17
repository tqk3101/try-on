import { detectImageType, detectResultImageType } from '../../utils/image.js';
import { ERROR_CODES, TryOnProviderError } from './providerError.js';

export const AVATAR_BUCKET = 'avatars';
export const PRODUCT_BUCKET = 'products';
export const RESULT_BUCKET = 'try-on-results';
export const MAX_RESULT_BYTES = 10 * 1024 * 1024; // khớp giới hạn bucket try-on-results
/** Row pending/processing im lặng quá TIMEOUT + ngưỡng này bị coi là treo (restart giữa chừng). */
export const STALE_GRACE_MS = 30_000;

/** Reject GENERATION_TIMEOUT khi signal bị huỷ, kể cả khi provider bỏ qua signal. */
function rejectOnAbort(signal) {
  return new Promise((_, reject) => {
    const timeout = () => reject(new TryOnProviderError(ERROR_CODES.GENERATION_TIMEOUT));
    if (signal.aborted) return timeout();
    signal.addEventListener('abort', timeout, { once: true });
  });
}

/**
 * Chạy job thử đồ trong tiến trình Express (fire-and-forget), giới hạn đồng thời bằng semaphore.
 * Mọi phụ thuộc (repo, storage, provider, đồng hồ) được inject để test không cần DB/mạng.
 *
 * storage: { download(bucket, path) -> Buffer|null, upload(bucket, path, buffer, contentType),
 *            remove(bucket, path) }
 */
export function createJobRunner({
  repo,
  storage,
  provider,
  config,
  now = Date.now,
  logger = console,
}) {
  let active = 0;
  const waiters = [];
  const inflight = new Set();

  async function acquire() {
    if (active < config.maxConcurrency) {
      active += 1;
      return;
    }
    // Slot được chuyển giao trực tiếp cho người chờ nên `active` giữ nguyên.
    await new Promise((resolve) => waiters.push(resolve));
  }

  function release() {
    const next = waiters.shift();
    if (next) next();
    else active -= 1;
  }

  const failRow = (id, errorCode, providerJobId) =>
    repo.markFailed(id, {
      errorCode,
      providerJobId,
      completedAt: new Date(now()).toISOString(),
    });

  async function generate(row, signal) {
    const [personBuffer, garmentBuffer] = await Promise.all([
      storage.download(AVATAR_BUCKET, row.avatar_path),
      storage.download(PRODUCT_BUCKET, row.product_image_path),
    ]);
    // Thiếu object: ảnh vừa bị xoá/thay giữa lúc tạo job.
    if (!personBuffer || !garmentBuffer) throw new TryOnProviderError(ERROR_CODES.INPUT_REJECTED);
    const personType = detectImageType(personBuffer);
    const garmentType = detectImageType(garmentBuffer);
    if (!personType || !garmentType) throw new TryOnProviderError(ERROR_CODES.INPUT_REJECTED);

    const pending = provider.generate({
      personImage: { buffer: personBuffer, contentType: personType.contentType },
      garmentImage: { buffer: garmentBuffer, contentType: garmentType.contentType },
      signal,
    });
    pending.catch(() => {}); // tránh unhandled rejection khi đã thua cuộc đua timeout
    return Promise.race([pending, rejectOnAbort(signal)]);
  }

  async function execute(id) {
    const row = await repo.claimForProcessing(id);
    if (!row) return; // đã bị xoá / đã được xử lý
    const startedAt = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    let output;
    try {
      output = await generate(row, controller.signal);
    } catch (err) {
      const isProviderError = err instanceof TryOnProviderError;
      const code = isProviderError ? err.code : ERROR_CODES.GENERATION_FAILED;
      if (isProviderError && err.permanent) {
        provider.markUnavailable(`status ${err.status ?? 'n/a'}`);
      }
      // Chỉ log mã, status HTTP, finishReason, thời gian: không ảnh/base64/phản hồi thô/key.
      logger.warn(
        `[try-on] job ${id} failed code=${code} status=${err?.status ?? '-'} finishReason=${err?.finishReason ?? '-'} ms=${now() - startedAt}`,
      );
      await failRow(id, code, err?.providerJobId);
      return;
    } finally {
      clearTimeout(timer);
    }

    const type = output?.buffer ? detectResultImageType(output.buffer) : null;
    if (!type || output.buffer.length > MAX_RESULT_BYTES) {
      logger.warn(`[try-on] job ${id} failed code=GENERATION_FAILED reason=bad-result`);
      await failRow(id, ERROR_CODES.GENERATION_FAILED, output?.providerJobId);
      return;
    }

    // Đuôi file + contentType theo magic bytes, không tin mime provider khai.
    const resultPath = `${row.profile_id}/${row.product_id}/${id}.${type.ext}`;
    try {
      await storage.upload(RESULT_BUCKET, resultPath, output.buffer, type.contentType);
    } catch {
      logger.warn(`[try-on] job ${id} failed code=GENERATION_FAILED reason=upload`);
      await failRow(id, ERROR_CODES.GENERATION_FAILED, output.providerJobId);
      return;
    }

    let updated = false;
    try {
      updated = await repo.markSucceeded(id, {
        resultPath,
        providerJobId: output.providerJobId,
        completedAt: new Date(now()).toISOString(),
      });
    } catch (err) {
      logger.error(`[try-on] job ${id} cập nhật succeeded lỗi: ${err.message}`);
    }
    if (!updated) {
      // Row đã bị xoá (user đổi ảnh / SP bị xoá) hoặc UPDATE lỗi: không để object mồ côi.
      await storage.remove(RESULT_BUCKET, resultPath);
      await failRow(id, ERROR_CODES.GENERATION_FAILED).catch(() => {});
      return;
    }
    logger.info(`[try-on] job ${id} succeeded ms=${now() - startedAt}`);
  }

  async function run(id) {
    await acquire();
    try {
      await execute(id);
    } finally {
      release();
    }
  }

  return {
    /** Đưa job vào hàng đợi bộ nhớ; không chặn, lỗi bất ngờ chỉ log (row treo sẽ bị coi là timeout). */
    enqueue(id) {
      const task = run(id)
        .catch((err) => logger.error(`[try-on] job ${id} lỗi không mong đợi: ${err.message}`))
        .finally(() => inflight.delete(task));
      inflight.add(task);
    },
    /** Chờ mọi job đang chạy/đang đợi xong (dùng trong test). */
    async idle() {
      while (inflight.size > 0) await Promise.allSettled([...inflight]);
    },
    stats: () => ({ active, queued: waiters.length }),
  };
}
