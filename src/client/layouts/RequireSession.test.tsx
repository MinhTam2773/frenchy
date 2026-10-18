import { act, renderHook, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { resetStubSession, useSession } from '@client/lib/session';
import { renderAt } from '@client/mocks/renderAt';

afterEach(resetStubSession);

test('a signed-in user sees a protected screen', async () => {
  renderAt('/today');
  expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
});

test.each(['/today', '/onboarding', '/review', '/me'])(
  'a signed-out user on %s is sent to the welcome screen',
  async (path) => {
    const { result } = renderHook(() => useSession());
    await act(() => result.current.signOut());
    renderAt(path);
    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
  },
);
