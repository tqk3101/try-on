import { defineConfig } from 'vitest/config';

// Test không cần mạng/DB thật: env giả được đặt trước khi import config/env.js,
// còn Supabase/Gemini luôn bị mock trong từng file test (test/helpers/fakeSupabase.js).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    setupFiles: ['./test/setup.js'],
    env: {
      NODE_ENV: 'test',
      CLIENT_URL: 'http://localhost:5173',
      JWT_SECRET: 'test-secret-not-for-production',
      JWT_EXPIRES_IN: '1h',
      SUPABASE_URL: 'http://127.0.0.1:1',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      // Thử đồ: stub nhanh, không dùng Gemini thật (không đặt GEMINI_API_KEY).
      TRY_ON_PROVIDER: 'stub',
      TRY_ON_STUB_MODE: 'success',
      TRY_ON_STUB_DELAY_MS: '5',
      TRY_ON_DAILY_LIMIT: '30',
    },
    restoreMocks: true,
  },
});
