// Warms the dev server once: Vite's first visit to each lazy route re-optimizes dependencies and
// reloads the page, which would make the first spec flaky. Visit every route before the specs run.
import { chromium, type FullConfig } from '@playwright/test';

const ROUTES = [
  '/today',
  '/path',
  '/practice',
  '/me',
  '/streak',
  '/chapter/ch1',
  '/read/ch1-ardoise-du-cafe',
  '/review',
  '/review/done',
];

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error('playwright.config.ts must set use.baseURL');
  const browser = await chromium.launch({
    executablePath: process.env.E2E_CHROMIUM_PATH || undefined,
  });
  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const signUp = await page.request.post('/api/auth/sign-up/email', {
      headers: { origin: baseURL },
      data: {
        name: 'Warmup',
        email: `warmup-${Date.now()}@example.com`,
        password: 'e2e-password-123',
      },
    });
    if (!signUp.ok()) throw new Error(`warm-up sign-up failed: ${signUp.status()}`);
    for (const path of ROUTES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }
  } finally {
    await browser.close();
  }
}
