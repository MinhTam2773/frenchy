import { useSyncExternalStore } from 'react';

export type SessionUser = { id: string; name: string; email: string };

export type Session = {
  status: 'loading' | 'signed-in' | 'signed-out';
  user: SessionUser | null;
  signOut: () => Promise<void>;
};

// STUB until T-21 swaps in the Better Auth client. Keep the `useSession()` shape so screens don't change.
const mockUser: SessionUser = {
  id: '00000000-0000-4000-8000-0000000000f1',
  name: 'Léa',
  email: 'lea@example.com',
};

let signedIn = true;
const listeners = new Set<() => void>();

function setSignedIn(next: boolean) {
  signedIn = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const signedInSession: Session = {
  status: 'signed-in',
  user: mockUser,
  signOut: async () => setSignedIn(false),
};
const signedOutSession: Session = {
  status: 'signed-out',
  user: null,
  signOut: async () => {},
};

export function useSession(): Session {
  return useSyncExternalStore(subscribe, () => (signedIn ? signedInSession : signedOutSession));
}

/** Stub only: sign the mock user back in (the stub forgets nothing else). */
export function resetStubSession() {
  setSignedIn(true);
}
