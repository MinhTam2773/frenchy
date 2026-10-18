import { expect } from '@playwright/test';
import { addStarterDeck, finishOnboarding, gradeCards, newUser, signUp, test } from './helpers';

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
