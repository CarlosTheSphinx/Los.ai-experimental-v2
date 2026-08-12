import { defineConfig } from '@playwright/test';

const appUrl = process.env.APP_URL || 'http://localhost:5000';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: appUrl,
    headless: true,
  },
  reporter: 'html',
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: `${appUrl}/api/health`,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
