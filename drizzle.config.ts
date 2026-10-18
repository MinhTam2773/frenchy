import { defineConfig } from 'drizzle-kit';

// Generates SQL into `migrations/`, which wrangler applies (`npm run db:migrate:local`).
export default defineConfig({
  dialect: 'sqlite',
  schema: ['./src/worker/db/schema.ts', './src/worker/auth/schema.ts'],
  out: './migrations',
});
