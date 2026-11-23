import { env } from './config/env.js';
import app from './app.js';
import { tryOnProvider } from './services/tryOn/index.js';

app.listen(env.port, () => {
  console.log(`API đang chạy tại http://localhost:${env.port}/api`);
  // Best-effort, không chặn khởi động: chỉ provider `gemini` có verifyModel (try-on-room.md mục 2.2).
  Promise.resolve(tryOnProvider.verifyModel?.()).catch(() => {});
});
