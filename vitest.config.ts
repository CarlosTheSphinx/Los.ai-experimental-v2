import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // Use forks pool to isolate process.env between test files; prevents ECONNRESET
    // flakiness in supertest HTTP tests when vitest runs files in parallel threads.
    pool: 'forks',
    // Run DB-free unit tests only. Tests that import server/db.ts (directly or
    // transitively) need DATABASE_URL and are excluded from `npm test`.
    include: ['server/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/*.integration.test.ts',
      'server/utils/__tests__/auditControls.test.ts',
      'server/utils/__tests__/auditReportGenerator.test.ts',
      'server/utils/__tests__/webhooks.test.ts',
      'server/utils/__tests__/apiKeys.test.ts',
    ],
    env: {
      // Deterministic 32-byte AES-256 key for unit tests only
      PII_ENCRYPTION_KEY: '0'.repeat(64),
    },
  },
});
