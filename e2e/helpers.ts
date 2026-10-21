import { expect, test as base, type Page, type TestInfo } from '@playwright/test';

const octet = () => 1 + Math.floor(Math.random() * 254);

/**
 * `test` with a client IP of its own. The Worker allows 5 sign-ups per minute per client IP
 * (`AUTH_ATTEMPTS`), and every spec shares localhost; Cloudflare sets `cf-connecting-ip` in
 * production, and the dev Worker trusts the header as is. The limit itself stays on.
 */
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires the destructured first argument
  extraHTTPHeaders: async ({}, use) => {
    await use({ 'cf-connecting-ip': `10.${octet()}.${octet()}.${octet()}` });
  },
});

export type TestUser = { name: string; email: string; password: string };

/** A unique account per test: the Worker's D1 is shared by every spec of a run. */
export function newUser(testInfo: TestInfo): TestUser {
  const stamp = `${Date.now()}-${testInfo.project.name}-${Math.floor(Math.random() * 1e6)}`;
  return { name: 'E2E Learner', email: `e2e-${stamp}@example.com`, password: 'e2e-password-123' };
}

/** Sign up through the real form; lands on onboarding. */
export async function signUp(page: Page, user: TestUser) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Continue with email' }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole('heading', { name: 'Which chapter are you on in the book?' }),
  ).toBeVisible();
}

/** Keep the default chapter (Ch 1), pick the goal, and land on Today. */
export async function finishOnboarding(page: Page, goalMinutes = 30) {
  await page.getByRole('button', { name: `${goalMinutes} min`, exact: true }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
}

/** Add Chapter 1's starter deck from its chapter page, then come back to Today. */
export async function addStarterDeck(page: Page) {
  await page.goto('/chapter/ch1');
  await page.getByRole('button', { name: /Add to reviews/ }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /Added \d+ to your reviews/ }),
  ).toBeVisible();
  await page.goto('/today');
  await expect(page.getByRole('link', { name: 'Start review' })).toBeVisible();
}

/**
 * Grade cards Good until the "last card" screen, or until `max` cards if given (then the session is
 * ended early, which posts the held last grade). Returns the text of each revealed card.
 */
export async function gradeCards(page: Page, max = Infinity) {
  const showAnswer = page.getByRole('button', { name: 'Show answer' });
  const seeResults = page.getByRole('button', { name: 'See results' });
  const revealed: string[] = [];
  for (;;) {
    if (revealed.length >= max) {
      await page.getByRole('button', { name: 'End review' }).click();
      await expect(page).toHaveURL(/\/today$/);
      return revealed;
    }
    // Wait for a landmark first (L-108): the next card or the end screen, never a guess.
    await expect(showAnswer.or(seeResults)).toBeVisible();
    if (await seeResults.isVisible()) return revealed;
    await showAnswer.click();
    const good = page.getByRole('button', { name: /^Good,/ });
    await expect(good).toBeVisible();
    revealed.push(await page.locator('body').innerText());
    await good.click();
  }
}

/** Open the first text that Today offers, and wait until the reader has rendered. */
export async function openReader(page: Page) {
  await page.goto('/today');
  await page.locator('a[href^="/read/"]').first().click();
  await expect(page).toHaveURL(/\/read\//);
  await expect(page.getByRole('button', { name: 'Finish reading' })).toBeVisible();
}

/**
 * Grade cards until one whose front has French words you can tap (an English front has none), and
 * return those word buttons. The deck is shuffled by due time, so the first card is not a given.
 */
export async function reachTappableFront(page: Page) {
  const showAnswer = page.getByRole('button', { name: 'Show answer' });
  const words = page.locator('[data-word^="front-"]');
  for (let i = 0; i < 24; i++) {
    await expect(showAnswer).toBeVisible();
    if ((await words.count()) > 0) return words;
    await showAnswer.click();
    await page.getByRole('button', { name: /^Good,/ }).click();
  }
  throw new Error('No card with a tappable front in the deck');
}
