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

async function fetchUser(): Promise<SessionUser | null> {
  const { data, error } = await authClient.getSession();
  if (error) throw new Error(error.message ?? 'Could not read the session');
  return data ? { id: data.user.id, name: data.user.name, email: data.user.email } : null;
}

/**
 * Who is signed in. A failed read (offline, server down) with no earlier answer counts as signed
 * out, so the guard sends the user to the welcome screen (B-23 covers starting offline).
 */
export function useSession(): Session {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: sessionKey, queryFn: fetchUser });

  async function signOut() {
    await authClient.signOut();
    queryClient.setQueryData(sessionKey, null);
    // The next person on this device must not see this account's profile, cards or streak.
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== sessionKey[0] });
  }

  if (query.isPending) return { status: 'loading', user: null, signOut };
  return query.data
    ? { status: 'signed-in', user: query.data, signOut }
    : { status: 'signed-out', user: null, signOut };
}
