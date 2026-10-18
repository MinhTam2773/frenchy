import { expect } from '@playwright/test';
import {
  addStarterDeck,
  finishOnboarding,
  gradeAllCards,
  newUser,
  openReader,
  signUp,
  test,
} from './helpers';

// The whole MVP loop on a fresh account: sign up, onboarding, starter deck, review, reader, review
// the saved word, streak. T-26 walked this by hand; this keeps it from breaking.
test('sign up, review the starter deck, save a word while reading, review it, streak 1', async ({
  page,
}, testInfo) => {
  await signUp(page, newUser(testInfo));
  await finishOnboarding(page);

  // A new account has no streak yet.
  await expect(page.getByRole('link', { name: '0 day streak' })).toBeVisible();

  await addStarterDeck(page);
  await page.getByRole('link', { name: 'Start review' }).click();
  await expect(page.getByRole('button', { name: 'Show answer' })).toBeVisible();
  const first = await gradeAllCards(page);
  expect(first.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'See results' }).click();
  await expect(page.getByRole('heading', { name: 'Session complete!' })).toBeVisible();
  await page.getByRole('link', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('link', { name: '1 day streak' })).toBeVisible();

  // Read, tap a word, save it.
  await openReader(page);
  await page
    .locator('[data-token]', { hasText: /^voici/i })
    .first()
    .click();
  const panel = page.getByRole('region', { name: 'Word details' });
  await expect(panel.getByRole('heading', { name: /voici/i })).toBeVisible();
  await panel.getByRole('button', { name: 'Save word' }).click();
  await expect(panel.getByRole('button', { name: 'Saved to reviews' })).toBeVisible();
  await panel.getByRole('button', { name: 'Close word details' }).click();
  await page.getByRole('button', { name: 'Finish reading' }).click();
  await expect(page).toHaveURL(/\/today$/);

  // The saved card comes before starter cards under the daily new-card cap (L-106).
  await page.getByRole('link', { name: 'Start review' }).click();
  await expect(page.getByRole('button', { name: 'Show answer' })).toBeVisible();
  const second = await gradeAllCards(page);
  expect(second.some((text) => /voici/i.test(text))).toBe(true);
  await page.getByRole('button', { name: 'See results' }).click();
  await expect(page.getByRole('heading', { name: 'Session complete!' })).toBeVisible();

  // Still one practiced day, and the server agrees after a reload.
  await page.goto('/streak');
  await expect(page.getByRole('heading', { name: 'Streak' })).toBeVisible();
  await page.goto('/today');
  await expect(page.getByRole('link', { name: '1 day streak' })).toBeVisible();
});
