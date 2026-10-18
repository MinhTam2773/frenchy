import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { setMockSignedIn } from '@client/mocks/handlers/auth';
import { renderAt } from '@client/mocks/renderAt';

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
