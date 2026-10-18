import { screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { expect, test } from 'vitest';
import { setMockSignedIn } from '@client/mocks/handlers/auth';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';

test('a signed-in user sees a protected screen', async () => {
  renderAt('/today');
  // Today loads four queries, so give a loaded CI machine more than the default 1 s.
  expect(
    await screen.findByRole('heading', { name: /Bonjour/ }, { timeout: 5000 }),
  ).toBeInTheDocument();
});

test.each(['/today', '/onboarding', '/review', '/me'])(
  'a signed-out user on %s is sent to the welcome screen',
  async (path) => {
    setMockSignedIn(false);
    renderAt(path);
    expect(await screen.findByRole('heading', { name: 'frenchy' })).toBeInTheDocument();
  },
);

test.each(['/streak', '/practice'])('%s counts toward today’s minutes (G-38)', async (path) => {
  const pings: unknown[] = [];
  server.use(
    http.post('/api/activity/ping', async ({ request }) => {
      pings.push(await request.json());
    }),
  );
  renderAt(path);
  await waitFor(() => expect(pings).toHaveLength(1));
});

test('a signed-out visitor does not ping', async () => {
  let pings = 0;
  server.use(
    http.post('/api/activity/ping', () => {
      pings += 1;
    }),
  );
  setMockSignedIn(false);
  renderAt('/streak');
  await screen.findByRole('heading', { name: 'frenchy' });
  expect(pings).toBe(0);
});
