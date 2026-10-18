import { expect } from '@playwright/test';
import { finishOnboarding, newUser, openReader, signUp, test } from './helpers';

test.describe('reader', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await signUp(page, newUser(testInfo));
    await finishOnboarding(page);
    await openReader(page);
  });

  test('tapping a word opens its details, tapping another switches, close returns to Finish', async ({
    page,
  }) => {
    const words = page.locator('[data-token]');
    await expect(words.first()).toBeVisible();
    expect(await words.count()).toBeGreaterThan(5);

    await words.nth(0).click();
    const panel = page.getByRole('region', { name: 'Word details' });
    await expect(panel).toBeVisible();
    const firstWord = (await panel.getByRole('heading').first().innerText()).trim();
    expect(firstWord.length).toBeGreaterThan(0);
    await expect(panel.getByRole('button', { name: 'Save word' })).toBeEnabled();
    // The sheet replaces the Finish button while a word is open.
    await expect(page.getByRole('button', { name: 'Finish reading' })).toBeHidden();

    await words.nth(3).click();
    await expect(panel).toBeVisible();

    await panel.getByRole('button', { name: 'Close word details' }).click();
    await expect(panel).toBeHidden();
    await expect(page.getByRole('button', { name: 'Finish reading' })).toBeVisible();
  });

  test('saving a word marks it saved and survives a second tap', async ({ page }) => {
    await page
      .locator('[data-token]', { hasText: /^voici/i })
      .first()
      .click();
    const panel = page.getByRole('region', { name: 'Word details' });
    await panel.getByRole('button', { name: 'Save word' }).click();
    await expect(panel.getByRole('button', { name: 'Saved to reviews' })).toBeVisible();

    // Another word and back: the saved state comes from the server's word status.
    await page.locator('[data-token]').nth(0).click();
    await page
      .locator('[data-token]', { hasText: /^voici/i })
      .first()
      .click();
    await expect(panel.getByRole('button', { name: 'Saved to reviews' })).toBeVisible();
  });

  test('finishing the reading returns to Today with the next step', async ({ page }) => {
    await page.getByRole('button', { name: 'Finish reading' }).click();
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
  });
});
