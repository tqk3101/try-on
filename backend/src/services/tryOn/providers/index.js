import { getGeminiImageModel } from '../../geminiImageService.js';
import { createGeminiProvider } from './gemini.js';
import { createStubProvider } from './stub.js';

/**
 * Chọn provider theo cấu hình (config/tryOn.js). Interface chung:
 * { name, model, promptVersion, usesMeasurements, simulated, isAvailable(), markUnavailable(reason),
 *   generate({ personImage, garmentImage, signal }) -> { buffer, contentType, providerJobId? } }
 * personImage/garmentImage: { buffer, contentType }. Lỗi ném ra là TryOnProviderError.
 */
export function createProvider(config, overrides = {}) {
  if (config.provider === 'gemini') {
    return createGeminiProvider({
      model: config.geminiModel || getGeminiImageModel(),
      ...overrides,
    });
  }
  return createStubProvider({ mode: config.stubMode, delayMs: config.stubDelayMs });
}
