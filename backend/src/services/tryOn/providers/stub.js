import { ERROR_CODES, TryOnProviderError } from '../providerError.js';

const SLOW_CAP_MS = 10 * 60 * 1000;

/** Chờ `ms`, nhưng dừng ngay (reject GENERATION_TIMEOUT) khi signal bị huỷ. */
function waitUnlessAborted(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new TryOnProviderError(ERROR_CODES.GENERATION_TIMEOUT));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once: true });
  });
}

/**
 * Provider giả lập: trả lại chính ảnh toàn thân (simulated). Không gọi mạng, không tốn tiền.
 * TRY_ON_STUB_MODE: success | fail (GENERATION_FAILED) | slow (chờ tới khi bị timeout huỷ).
 */
export function createStubProvider({ mode = 'success', delayMs = 2000 } = {}) {
  return {
    name: 'stub',
    model: 'stub',
    promptVersion: 'stub',
    usesMeasurements: false,
    simulated: true,
    isAvailable: () => true,
    markUnavailable: () => {},
    async generate({ personImage, signal }) {
      if (mode === 'slow') {
        await waitUnlessAborted(SLOW_CAP_MS, signal);
        throw new TryOnProviderError(ERROR_CODES.GENERATION_TIMEOUT);
      }
      await waitUnlessAborted(delayMs, signal);
      if (mode === 'fail') throw new TryOnProviderError(ERROR_CODES.GENERATION_FAILED);
      return { buffer: personImage.buffer, contentType: personImage.contentType };
    },
  };
}
