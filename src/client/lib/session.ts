import { createAuthClient } from 'better-auth/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type SessionUser = { id: string; name: string; email: string };

export type Session = {
  status: 'loading' | 'signed-in' | 'signed-out';
  user: SessionUser | null;
  signOut: () => Promise<void>;
};

/** Talks to the Worker's `/api/auth/*` (Better Auth). Absolute so jsdom tests can fetch it too. */
export const authClient = createAuthClient({
  baseURL: globalThis.location?.origin,
  // Better Auth keeps the `fetch` it saw at creation, which is before MSW patches it in tests
  // and in `npm run dev`. Looking `fetch` up on every call keeps the mocks in the path.
  fetchOptions: { customFetchImpl: (input, init) => fetch(input, init) },
});

/** The session lives in the TanStack Query cache, so each app (and each test) starts clean. */
export const sessionKey = ['session'] as const;

const REMEMBERED_KEY = 'frenchy.user';
/** Better Auth's default session lifetime (7 days; `createAuth` doesn't override it). */
const REMEMBERED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type Remembered = SessionUser & { savedAt: number };

function readRemembered(): SessionUser | null {
  try {
    const raw = globalThis.localStorage?.getItem(REMEMBERED_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Remembered> | null;
    if (
      typeof saved?.id !== 'string' ||
      typeof saved.name !== 'string' ||
      typeof saved.email !== 'string' ||
      typeof saved.savedAt !== 'number' ||
      Date.now() - saved.savedAt > REMEMBERED_MAX_AGE_MS
    ) {
      clearRememberedUser();
      return null;
    }
    return { id: saved.id, name: saved.name, email: saved.email };
  } catch {
    return null;
  }
}

function rememberUser(user: SessionUser) {
  try {
    const saved: Remembered = { ...user, savedAt: Date.now() };
    globalThis.localStorage?.setItem(REMEMBERED_KEY, JSON.stringify(saved));
  } catch {
    // Private mode or full storage: the app just can't start offline signed in.
  }
}

/**
 * Forget who was signed in on this device. Call it on every sign-out path (B-16's account deletion
 * too), or the next offline start would open the previous account's screens.
 */
export function clearRememberedUser() {
  try {
    globalThis.localStorage?.removeItem(REMEMBERED_KEY);
  } catch {
    // Nothing to clear if storage is unreadable.
  }
}

/**
 * Only a 401 (or the server answering "no session") proves the user is signed out. When the read
 * can't be completed (no network, or a 5xx/other HTTP error) the remembered user stands in, so an
 * installed PWA opened offline keeps its screens. With nobody remembered, the error surfaces and
 * the guard treats the user as signed out.
 */
async function fetchUser(): Promise<SessionUser | null> {
  let result: Awaited<ReturnType<typeof authClient.getSession>>;
  try {
    if (globalThis.navigator?.onLine === false) throw new TypeError('offline');
    result = await authClient.getSession();
  } catch (networkError) {
    const remembered = readRemembered();
    if (remembered) return remembered;
    throw networkError;
  }
  const { data, error } = result;
  if (error) {
    if (error.status === 401) {
      clearRememberedUser();
      return null;
    }
    const remembered = readRemembered();
    if (remembered) return remembered;
    throw new Error(error.message ?? 'Could not read the session');
  }
  if (!data) {
    clearRememberedUser();
    return null;
  }
  // Writing over the old entry also covers a different user signing in on this device.
  const user = { id: data.user.id, name: data.user.name, email: data.user.email };
  rememberUser(user);
  return user;
}

/**
 * Who is signed in. A failed read with no remembered user counts as signed out, so the guard
 * sends the user to the welcome screen.
 */
export function useSession(): Session {
  const queryClient = useQueryClient();
  // 'always': the default pauses a query while the browser reports offline, so an offline start
  // would sit on 'loading' forever (once the browser has fired an "offline" event) instead of
  // reaching the remembered-user fallback.
  const query = useQuery({ queryKey: sessionKey, queryFn: fetchUser, networkMode: 'always' });

  async function signOut() {
    await authClient.signOut();
    clearRememberedUser();
    queryClient.setQueryData(sessionKey, null);
    // The next person on this device must not see this account's profile, cards or streak.
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== sessionKey[0] });
  }

  if (query.isPending) return { status: 'loading', user: null, signOut };
  return query.data
    ? { status: 'signed-in', user: query.data, signOut }
    : { status: 'signed-out', user: null, signOut };
}
