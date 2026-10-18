import { http, HttpResponse, type RequestHandler } from 'msw';
import { newProfile } from '@shared/fixtures';

// Mock of Better Auth's endpoints. It starts signed in as Léa so every other screen's tests
// and `npm run dev` open on a real screen; sign out (or `setMockSignedIn(false)`) to see the welcome flow.

const LEA = { id: '00000000-0000-4000-8000-0000000000f1', name: 'Léa', email: 'lea@example.com' };
/** Sign in with this password to see the "wrong password" error. */
export const WRONG_PASSWORD = 'wrong-password';

let user: typeof LEA | null = LEA;
/** True from sign-up until the profile is first saved: the new account has not been onboarded. */
let notOnboarded = false;

export function setMockSignedIn(signedIn: boolean) {
  user = signedIn ? LEA : null;
  notOnboarded = false;
}

/** Back to the start state; the shared test setup calls this between cases. */
export function resetAuthMock() {
  setMockSignedIn(true);
}

function authError(status: number, code: string, message: string) {
  return HttpResponse.json({ code, message }, { status });
}

function sessionBody() {
  if (!user) return null;
  const now = new Date().toISOString();
  return {
    session: {
      id: 'mock-session',
      userId: user.id,
      token: 'mock-token',
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    },
    user: { ...user, emailVerified: false, image: null, createdAt: now, updatedAt: now },
  };
}

function authSuccess() {
  return HttpResponse.json({ token: 'mock-token', user });
}

export const handlers: RequestHandler[] = [
  http.get('/api/auth/config', () => HttpResponse.json({ google: true })),
  http.get('/api/auth/get-session', () => HttpResponse.json(sessionBody())),

  http.post('/api/auth/sign-up/email', async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string };
    if (body.email === LEA.email) {
      return authError(
        422,
        'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
        'User already exists. Use another email.',
      );
    }
    user = { id: crypto.randomUUID(), name: body.name, email: body.email };
    notOnboarded = true;
    return authSuccess();
  }),
  http.post('/api/auth/sign-in/email', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === WRONG_PASSWORD) {
      return authError(401, 'INVALID_EMAIL_OR_PASSWORD', 'Invalid email or password');
    }
    user = { ...LEA, email: body.email };
    notOnboarded = false;
    return authSuccess();
  }),
  // The real endpoint answers with Google's URL; here the account just appears (no redirect).
  http.post('/api/auth/sign-in/social', () => {
    user = LEA;
    notOnboarded = false;
    return HttpResponse.json({ url: '/', redirect: false });
  }),
  http.post('/api/auth/sign-out', () => {
    user = null;
    return HttpResponse.json({ success: true });
  }),

  // A fresh account has the blank profile until it is saved. Everything else falls through to
  // `base.ts` (L-56), which keeps the writable profile.
  http.get('/api/profile', () => (notOnboarded ? HttpResponse.json(newProfile) : undefined)),
  http.patch('/api/profile', () => {
    notOnboarded = false;
    return undefined;
  }),
];
