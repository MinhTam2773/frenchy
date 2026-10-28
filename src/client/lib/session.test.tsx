import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setMockSignedIn } from '@client/mocks/handlers/auth';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';
import { createQueryClient } from './query';
import { clearRememberedUser, sessionKey, useSession } from './session';

const LEA = { id: '00000000-0000-4000-8000-0000000000f1', name: 'Léa', email: 'lea@example.com' };
const REMEMBERED_KEY = 'frenchy.user';

// The storage is shared by every test in this file, and each successful read writes to it.
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

function remember(user = LEA, savedAt = Date.now()) {
  localStorage.setItem(REMEMBERED_KEY, JSON.stringify({ ...user, savedAt }));
}

function readStored() {
  return JSON.parse(localStorage.getItem(REMEMBERED_KEY) ?? 'null') as Record<
    string,
    unknown
  > | null;
}

function failNetwork() {
  server.use(http.get('/api/auth/get-session', () => HttpResponse.error()));
}

function neverAnswer() {
  server.use(
    http.get('/api/auth/get-session', async () => {
      await delay('infinite');
      return HttpResponse.json(null);
    }),
  );
}

async function advanceTime(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

function driveAbortTimeoutWithFakeTimers() {
  let timeoutSignal: AbortSignal | undefined;
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    timeoutSignal = controller.signal;
    return timeoutSignal;
  });
  return () => timeoutSignal;
}

function renderSession({ retry }: { retry?: boolean } = {}) {
  const client = createQueryClient();
  if (retry !== undefined) client.setQueryDefaults(sessionKey, { retry });
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

test('a session that cannot be read, with nobody remembered, counts as signed out', async () => {
  failNetwork();
  const { result } = renderSession();
  // One retry, one second later, before it gives up.
  await waitFor(() => expect(result.current.status).toBe('signed-out'), { timeout: 4000 });
});

test('remembers only id, name and email after a successful read', async () => {
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-in'));
  expect(Object.keys(readStored() ?? {}).sort()).toEqual(['email', 'id', 'name', 'savedAt']);
});

test('offline start with a remembered user is signed in as that user', async () => {
  remember();
  failNetwork();
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-in'));
  expect(result.current.user).toEqual(LEA);
});

test('a hanging session read falls back to the remembered user after five seconds', async () => {
  vi.useFakeTimers();
  try {
    const getTimeoutSignal = driveAbortTimeoutWithFakeTimers();
    remember();
    neverAnswer();
    const { result } = renderSession();
    expect(result.current.status).toBe('loading');

    await advanceTime(0);
    expect(AbortSignal.timeout).toHaveBeenCalledWith(5000);
    act(() => vi.advanceTimersByTime(5000));
    expect(getTimeoutSignal()?.aborted).toBe(true);
    vi.useRealTimers();

    await waitFor(() => expect(result.current.status).toBe('signed-in'));
    expect(result.current.user).toEqual(LEA);
  } finally {
    vi.useRealTimers();
  }
});

test('a hanging session read with nobody remembered eventually counts as signed out', async () => {
  vi.useFakeTimers();
  try {
    const getTimeoutSignal = driveAbortTimeoutWithFakeTimers();
    neverAnswer();
    const { result } = renderSession({ retry: false });
    expect(result.current.status).toBe('loading');

    await advanceTime(0);
    expect(AbortSignal.timeout).toHaveBeenCalledWith(5000);
    act(() => vi.advanceTimersByTime(5000));
    expect(getTimeoutSignal()?.aborted).toBe(true);
    vi.useRealTimers();

    await waitFor(() => expect(result.current.status).toBe('signed-out'));
    expect(result.current.user).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

test('offline start with a remembered user still renders a protected screen', async () => {
  remember();
  failNetwork();
  renderAt('/me');
  expect(await screen.findByRole('button', { name: 'Sign out' })).toBeInTheDocument();
});

test('offline start without a remembered user goes to the welcome screen', async () => {
  failNetwork();
  renderAt('/me');
  expect(
    await screen.findByRole('heading', { name: 'frenchy' }, { timeout: 4000 }),
  ).toBeInTheDocument();
});

test('navigator.onLine === false counts as offline without asking the network', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  // The online mock would answer "Léa"; a different remembered name proves the network was not used.
  remember({ ...LEA, name: 'Remembered' });
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-in'));
  expect(result.current.user?.name).toBe('Remembered');
});

test('a browser that fired "offline" does not leave the session loading forever', async () => {
  remember();
  failNetwork();
  onlineManager.setOnline(false);
  try {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.status).toBe('signed-in'));
  } finally {
    onlineManager.setOnline(true);
  }
});

test('a 5xx keeps the remembered user, since the server being down is not a sign-out', async () => {
  remember();
  server.use(
    http.get('/api/auth/get-session', () =>
      HttpResponse.json({ message: 'boom' }, { status: 503 }),
    ),
  );
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-in'));
  expect(result.current.user).toEqual(LEA);
});

test('a 401 signs out and forgets the remembered user', async () => {
  remember();
  server.use(
    http.get('/api/auth/get-session', () => HttpResponse.json({ message: 'no' }, { status: 401 })),
  );
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-out'));
  expect(readStored()).toBeNull();
});

test('the server saying there is no session forgets the remembered user', async () => {
  remember();
  setMockSignedIn(false);
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-out'));
  expect(readStored()).toBeNull();
});

test('a different user signing in replaces the remembered one', async () => {
  remember({ id: 'someone-else', name: 'Marc', email: 'marc@example.com' });
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-in'));
  expect(readStored()).toMatchObject(LEA);
});

test('a remembered user older than the session lifetime is not used', async () => {
  remember(LEA, Date.now() - 8 * 24 * 60 * 60 * 1000);
  failNetwork();
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-out'), { timeout: 4000 });
  expect(readStored()).toBeNull();
});

test('clearRememberedUser forgets the user', () => {
  remember();
  clearRememberedUser();
  expect(readStored()).toBeNull();
});

test('unreadable storage never breaks the session', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-in'));
  expect(() => clearRememberedUser()).not.toThrow();
});

test('Sign out on Me ends the session and returns to the welcome screen', async () => {
  renderAt('/me');
  fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('heading', { name: 'frenchy' })).toBeInTheDocument();
  expect(readStored()).toBeNull();
  // The server session is gone too, not only the screen.
  const { result } = renderSession();
  await waitFor(() => expect(result.current.status).toBe('signed-out'));
});
