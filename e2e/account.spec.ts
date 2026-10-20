import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { finishOnboarding, newUser, signUp, test } from './helpers';

test('a learner can download their data, then delete the account for good', async ({
  page,
}, testInfo) => {
  const user = newUser(testInfo);
  await signUp(page, user);
  await finishOnboarding(page, 30);
  await page.goto('/me');
  await expect(page.getByRole('button', { name: /Download my data/ })).toBeVisible();

  // Export: a JSON file with this account's rows
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download my data/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^frenchy-export-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(await readFile(await file.path(), 'utf8')) as {
    user: { email: string };
    tables: { profiles: { dailyGoalMinutes: number }[] };
  };
  expect(exported.user.email).toBe(user.email);
  expect(exported.tables.profiles).toHaveLength(1);
  expect(exported.tables.profiles[0]?.dailyGoalMinutes).toBe(30);

  // Delete: the sheet asks for the word first
  await page.getByRole('button', { name: 'Delete account' }).click();
  const sheet = page.getByRole('dialog', { name: 'Delete your account' });
  const confirm = sheet.getByRole('button', { name: 'Delete account' });
  await expect(confirm).toBeDisabled();
  await sheet.getByLabel(/Type .delete. to confirm/).fill('delete');
  await confirm.click();

  // Signed out, on the welcome screen
  await expect(page.getByRole('heading', { name: 'frenchy' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue with email' })).toBeVisible();
  await page.goto('/today');
  await expect(page.getByRole('link', { name: 'Continue with email' })).toBeVisible();

  // The same email and password no longer sign in
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('That email and password do not match.');
});
