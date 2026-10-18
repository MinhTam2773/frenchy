import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/client/**/*.test.{ts,tsx}', 'src/shared/**/*.test.ts'],
          setupFiles: ['./src/client/test-setup.ts'],
        },
      },
      {
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: './wrangler.jsonc' },
            miniflare: { bindings: { TEST_MIGRATIONS: await readD1Migrations('./migrations') } },
          })),
        ],
        test: {
          name: 'worker',
          include: ['src/worker/**/*.test.ts'],
          setupFiles: ['./src/worker/db/test-setup.ts'],
        },
      },
    ],
  },
});
