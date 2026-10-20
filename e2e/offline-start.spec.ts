import { expect } from '@playwright/test';
import { finishOnboarding, newUser, signUp, test } from './helpers';

// `vite dev` has no service worker (G-74), so the page itself still loads on reload; what this
// proves is the app's side of an offline start: the session read fails and the user stays put.
test('a reload with no answer from the API keeps the signed-in user on Today', async ({
  page,
}, testInfo) => {
  await signUp(page, newUser(testInfo));
  await finishOnboarding(page);

  await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
  await page.reload();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('link', { name: 'Me' })).toBeVisible();
});

test('a reload after the server says there is no session goes to the welcome screen', async ({
  page,
}, testInfo) => {
  await signUp(page, newUser(testInfo));
  await finishOnboarding(page);

  await page.context().clearCookies();
  await page.reload();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'frenchy' })).toBeVisible();
});
