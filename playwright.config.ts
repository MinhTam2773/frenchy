import { defineConfig } from '@playwright/test';

const port = process.env.E2E_PORT ?? '5273';
const baseURL = `http://localhost:${port}`;

// Browsers: CI runs `npx playwright install --with-deps chromium`. Cloud sessions use the preinstalled
// Chromium through PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers (never run `playwright install` there).
// If its revision ever stops matching the installed @playwright/test, point E2E_CHROMIUM_PATH at a binary.
const executablePath = process.env.E2E_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  // Specs make their own users on one shared dev server; one worker keeps a slow box from timing out.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: 'phone',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npx tsx e2e/server.ts',
    url: `${baseURL}/api/health`,
    // Starting vite + workerd + migrations takes minutes on a loaded machine.
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { E2E_PORT: port },
  },
});
