import { expect } from '@playwright/test';
import {
  addStarterDeck,
  finishOnboarding,
  gradeCards,
  newUser,
  reachTappableFront,
  signUp,
  test,
} from './helpers';

test('a review session runs to completion and leaves nothing due', async ({ page }, testInfo) => {
  await signUp(page, newUser(testInfo));
  await finishOnboarding(page);
  await addStarterDeck(page);

  await page.getByRole('link', { name: 'Start review' }).click();
  const progress = page.getByRole('progressbar', { name: 'Review progress' });
  await expect(page.getByRole('button', { name: 'Show answer' })).toBeVisible();

  // The grade buttons carry the next interval, e.g. "Good, 3d".
  await page.getByRole('button', { name: 'Show answer' }).click();
  for (const grade of ['Again', 'Hard', 'Good', 'Easy']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${grade},`) })).toBeVisible();
  }
  await page.getByRole('button', { name: /^Good,/ }).click();
  await expect(progress).toBeVisible();

  const rest = await gradeCards(page);
  const total = rest.length + 1;
  await expect(page.getByText(`${total}/${total}`)).toBeVisible();

  await page.getByRole('button', { name: 'See results' }).click();
  await expect(page.getByRole('heading', { name: 'Session complete!' })).toBeVisible();
  await expect(page.getByText('Cards', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Continue' }).click();

  // Today now says there is nothing left, and the server agrees after a reload.
  await expect(page).toHaveURL(/\/today$/);
  await page.reload();
  await expect(page.getByText('All caught up')).toBeVisible();
  await expect(page.getByRole('link', { name: '1 day streak' })).toBeVisible();
});

test('ending a review early still counts the graded cards', async ({ page }, testInfo) => {
  await signUp(page, newUser(testInfo));
  await finishOnboarding(page);
  await addStarterDeck(page);

  await page.getByRole('link', { name: 'Start review' }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: /^Good,/ }).click();
  await expect(page.getByText(/^1\/\d+$/)).toBeVisible();
  await page.getByRole('button', { name: 'End review' }).click();

  // The held last grade is posted on the way out (G-20), so the day counts.
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('link', { name: '1 day streak' })).toBeVisible();
});

test('tapping a word on a card shows its meaning and keeps the answer hidden', async ({
  page,
}, testInfo) => {
  await signUp(page, newUser(testInfo));
  await finishOnboarding(page);
  await addStarterDeck(page);
  await page.getByRole('link', { name: 'Start review' }).click();

  const words = await reachTappableFront(page);
  await words.first().click();
  const sheet = page.getByRole('region', { name: 'Word details' });
  await expect(sheet).toBeVisible();
  // The meaning arrives from the lexicon; nothing of the card's back is shown.
  await expect(sheet.getByRole('heading')).toBeVisible();
  await expect(sheet).not.toContainText('No translation yet');
  await expect(page.getByRole('button', { name: 'Show answer' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Good,/ })).toBeHidden();
  await expect(page.getByText(/^0\/\d+$/)).toBeVisible();

  // Not modal: focus stays on the word, Escape closes the sheet and the word keeps focus.
  await expect(words.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(words.first()).toBeFocused();

  // Revealing still works afterwards.
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.getByRole('button', { name: /^Good,/ })).toBeVisible();
});
