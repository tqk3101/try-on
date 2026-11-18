import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'test/**/*.test.{js,jsx}'],
    // Không cần mạng: URL API giả; mọi fetch đều bị stub trong từng test.
    env: { VITE_API_URL: 'http://api.test/api' },
    restoreMocks: true,
    unstubGlobals: true,
  },
});
