// Starts `vite dev` (real Worker, no mocks) on a brand-new local D1 so every E2E run begins empty.
// The database lives in a temp dir (via the Cloudflare plugin's persistState, see vite.config.ts),
// so the developer's own .wrangler/state is never touched. Needs no Cloudflare login.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = process.env.E2E_PORT ?? '5273';
const persistDir = mkdtempSync(join(tmpdir(), 'frenchy-e2e-'));
const bin = (name: string) => join('node_modules', '.bin', name);

execFileSync(
  bin('wrangler'),
  ['d1', 'migrations', 'apply', 'frenchy', '--local', '--persist-to', persistDir],
  { stdio: 'inherit' },
);

const server = spawn(bin('vite'), ['dev', '--port', port, '--strictPort'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    E2E_PERSIST_DIR: persistDir,
    // Throwaway values. Wrangler reads process.env into the Worker's bindings with this flag.
    CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true',
    BETTER_AUTH_SECRET: 'e2e-only-better-auth-secret-0123456789abcdef',
    AI_TRANSLATE_PROVIDER: 'mock',
    AI_EXPLAIN_PROVIDER: 'mock',
  },
});

function stop() {
  server.kill('SIGTERM');
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => {
  rmSync(persistDir, { recursive: true, force: true });
  process.exit(code ?? 0);
});
