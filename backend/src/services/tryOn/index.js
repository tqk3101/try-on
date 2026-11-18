import { tryOnConfig } from '../../config/tryOn.js';
import { downloadObject, removeObject, signUrl, uploadObject } from '../storageService.js';
import { createJobRunner } from './jobRunner.js';
import { createProvider } from './providers/index.js';
import { createTryOnRepository } from './tryOnRepository.js';
import { createTryOnService } from './tryOnService.js';

// Wiring mặc định cho app thật. Test dùng createTryOnService/createJobRunner với mock.
const repo = createTryOnRepository();
const provider = createProvider(tryOnConfig);
const storage = {
  download: downloadObject,
  upload: uploadObject,
  remove: removeObject,
  sign: signUrl,
};
const runner = createJobRunner({ repo, storage, provider, config: tryOnConfig });

export const tryOnService = createTryOnService({
  repo,
  runner,
  provider,
  storage,
  config: tryOnConfig,
});
export { runner as tryOnRunner, provider as tryOnProvider };
