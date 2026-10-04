import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  retries: 2,
  use: {
    baseURL: 'http://localhost:8123',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure', // после падения — trace.zip в test-results/ (удобно разбирать)
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    port: 8123,
    reuseExistingServer: true,
    timeout: 15000,
  },
});
