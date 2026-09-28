import { defineConfig, devices } from '@playwright/test';

/**
 * For e2e/document-viewer.spec.ts, which drives the loading tab through its harness page.
 * Separate from playwright.config.ts because the dev server runs over https with a self-signed
 * certificate, and these tests must not run in parallel (they count popups on one context).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'document-viewer.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: 'https://localhost:3000',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
