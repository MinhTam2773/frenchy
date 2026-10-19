import { expect } from '@playwright/test';
import {
  addStarterDeck,
  finishOnboarding,
  gradeCards,
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
  // Nine of the ten new cards allowed per day, so one slot is left for the saved word below.
  const first = await gradeCards(page, 9);
  expect(first).toHaveLength(9);
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

  // One new-card slot is left: the saved word takes it, not a starter card (L-106).
  await page.getByRole('link', { name: 'Start review' }).click();
  await expect(page.getByRole('button', { name: 'Show answer' })).toBeVisible();
  const second = await gradeCards(page);
  expect(second).toHaveLength(1);
  expect(second[0]).toMatch(/voici/i);
  await page.getByRole('button', { name: 'See results' }).click();
  await expect(page.getByRole('heading', { name: 'Session complete!' })).toBeVisible();

  // Still one practiced day, and the server agrees after a reload.
  await page.goto('/streak');
  await expect(page.getByRole('heading', { name: 'Streak', exact: true })).toBeVisible();
  await page.goto('/today');
  await expect(page.getByRole('link', { name: '1 day streak' })).toBeVisible();
});
