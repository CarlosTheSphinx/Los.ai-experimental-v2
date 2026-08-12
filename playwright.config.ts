import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:5000',
    headless: true,
  },
  reporter: 'html',
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5000/api/health',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
