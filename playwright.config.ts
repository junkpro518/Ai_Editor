import { defineConfig } from '@playwright/test';

// Playwright-Electron: الاختبارات تشغّل التطبيق المبني (out/) بنفسها عبر _electron.launch.
// على Linux بلا شاشة: xvfb-run -a pnpm test:e2e
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'out/playwright-report' }]],
  outputDir: 'out/playwright-results',
  use: { trace: 'retain-on-failure' },
});
