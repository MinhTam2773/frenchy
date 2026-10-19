import { expect } from '@playwright/test';
import { finishOnboarding, newUser, signUp, test } from './helpers';

test('settings changes persist across a reload and a new sign-in', async ({ page }, testInfo) => {
  const user = newUser(testInfo);
  await signUp(page, user);
  await finishOnboarding(page, 30);

  await page.goto('/me');
  await expect(page.getByRole('heading', { name: 'Me', exact: true })).toBeVisible();
  const goal45 = page.getByRole('radio', { name: '45 min' });
  await expect(page.getByRole('radio', { name: '30 min' })).toBeChecked();

  // Daily goal
  await goal45.click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Synced to your account' }),
  ).toBeVisible();
  await expect(goal45).toBeChecked();

  // Book chapter, through the sheet
  await page.getByRole('button', { name: /Book chapter/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Choose your book chapter' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: /^Ch 2 ·/ }).click();
  await expect(sheet).toBeHidden();
  const chapterRow = page.getByRole('button', { name: /Book chapter/ });
  await expect(chapterRow).toContainText('Ch 2');
  await expect(
    page.getByRole('status').filter({ hasText: 'Synced to your account' }),
  ).toBeVisible();

  // A toggle
  const playOnTap = page.getByRole('switch', { name: 'Play words when tapped' });
  const before = await playOnTap.getAttribute('aria-checked');
  await playOnTap.click();
  await expect(playOnTap).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
  await expect(
    page.getByRole('status').filter({ hasText: 'Synced to your account' }),
  ).toBeVisible();

  // Reload: everything comes back from the server
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Me', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: '45 min' })).toBeChecked();
  await expect(page.getByRole('button', { name: /Book chapter/ })).toContainText('Ch 2');
  await expect(page.getByRole('switch', { name: 'Play words when tapped' })).toHaveAttribute(
    'aria-checked',
    before === 'true' ? 'false' : 'true',
  );

  // And on a fresh sign-in (nothing leans on this browser's state)
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/($|sign-in)/);
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await page.goto('/me');
  await expect(page.getByRole('radio', { name: '45 min' })).toBeChecked();
  await expect(page.getByRole('button', { name: /Book chapter/ })).toContainText('Ch 2');
});
