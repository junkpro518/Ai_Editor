import { defineConfig } from 'vitest/config';

// وحدات + عقود + تكامل على Node (بلا Electron). اختبارات Electron/WebCodecs في tests/e2e عبر Playwright.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/contract/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'out/**'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
