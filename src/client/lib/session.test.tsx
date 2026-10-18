import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { expect, test } from 'vitest';
import { setMockSignedIn } from '@client/mocks/handlers/auth';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';
import { createQueryClient } from './query';
import { useSession } from './session';

function renderSession() {
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSession(), { wrapper });
}

test('reads the signed-in user from the session endpoint', async () => {
  const { result } = renderSession();
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('signed-in'));
  expect(result.current.user).toEqual({
    id: '00000000-0000-4000-8000-0000000000f1',
    name: 'Léa',
    email: 'lea@example.com',
  });
});

test('no session means signed out', async () => {
  setMockSignedIn(false);
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-out'));
  expect(result.current.user).toBeNull();
});

test('a session that cannot be read counts as signed out', async () => {
  server.use(http.get('/api/auth/get-session', () => HttpResponse.error()));
  const { result } = renderSession();
  // One retry, one second later, before it gives up.
  await waitFor(() => expect(result.current.status).toBe('signed-out'), { timeout: 4000 });
});

test('Sign out on Me ends the session and returns to the welcome screen', async () => {
  renderAt('/me');
  fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('heading', { name: 'frenchy' })).toBeInTheDocument();
  // The server session is gone too, not only the screen.
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-out'));
});
