import { expect } from '@playwright/test';
import { addStarterDeck, finishOnboarding, gradeCards, newUser, signUp, test } from './helpers';

/** How many cards the app has saved on the device for an offline session (B-08). */
function savedDueCards() {
  return new Promise<number>((resolve) => {
    const open = indexedDB.open('frenchy-offline');
    open.onerror = () => resolve(0);
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains('dueCards')) return resolve(0);
      const all = db.transaction('dueCards').objectStore('dueCards').getAll();
      all.onsuccess = () =>
        resolve((all.result as { cards: unknown[] }[]).reduce((n, e) => n + e.cards.length, 0));
      all.onerror = () => resolve(0);
    };
  });
}

// No service worker on `vite dev` (G-74, L-150): the page itself still loads, and the API is
// cut with route aborts. What this proves is the app's side: cards come from IndexedDB, grades
// queue there, and they reach the server once it answers again.
test('a session with no connection syncs when the app is opened online again', async ({
  page,
}, testInfo) => {
  await signUp(page, newUser(testInfo));
  await finishOnboarding(page);
  await addStarterDeck(page);
  await expect.poll(() => page.evaluate(savedDueCards)).toBeGreaterThan(0);

  await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
  await page.goto('/review');
  await gradeCards(page, 3);
  await expect(page.getByText('3 reviews waiting to sync.')).toBeVisible();

  await page.unrouteAll();
  await page.reload();
  await expect(page.getByText(/waiting to sync/)).toBeHidden();
  await expect(page.getByRole('link', { name: '1 day streak' })).toBeVisible();
});
