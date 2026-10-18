import { env, exports } from 'cloudflare:workers';
import { Hono } from 'hono';
import { describe, expect, test } from 'vitest';
import { ApiError, AuthConfig, Profile } from '../../shared/schemas';
import { createDb, scopedDb } from '../db';
import { app } from '../index';
import { requireUser, type UserEnv } from '../middleware/session';
import { AUTH_ATTEMPTS, MIN_PASSWORD_LENGTH } from './index';

const ORIGIN = 'https://frenchy.test';
const PASSWORD = 'correct-horse-battery';
const COOKIE_NAME = '__Secure-better-auth.session_token';

/** Each test gets its own client IP, so the per-IP rate limit doesn't leak between tests. */
function newClient() {
  const byte = () => Math.floor(Math.random() * 256);
  return {
    ip: `10.${byte()}.${byte()}.${byte()}`,
    email: `learner-${crypto.randomUUID()}@example.com`,
  };
}
type Client = ReturnType<typeof newClient>;

function headers(client: Client, cookie?: string, origin = ORIGIN): Headers {
  const result = new Headers({
    'content-type': 'application/json',
    origin,
    'cf-connecting-ip': client.ip,
  });
  if (cookie) result.set('cookie', cookie);
  return result;
}

function post(client: Client, path: string, body: unknown, cookie?: string) {
  return exports.default.fetch(`${ORIGIN}/api/auth${path}`, {
    method: 'POST',
    headers: headers(client, cookie),
    body: JSON.stringify(body),
  });
}

function signUp(client: Client, password = PASSWORD) {
  return post(client, '/sign-up/email', { name: 'Léa', email: client.email, password });
}

function signIn(client: Client, password = PASSWORD) {
  return post(client, '/sign-in/email', { email: client.email, password });
}

/** `name=value` of the session cookie, ready for a `cookie` header. */
function sessionCookie(res: Response): string {
  const setCookie = res.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!setCookie) throw new Error(`no session cookie (status ${res.status})`);
  return setCookie.split(';')[0] ?? '';
}

async function getSession(client: Client, cookie: string) {
  const res = await exports.default.fetch(`${ORIGIN}/api/auth/get-session`, {
    headers: headers(client, cookie),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as { user: { id: string; email: string } } | null;
}

// A stand-in for T-22's routes: anything behind `requireUser`.
const protectedApp = new Hono<UserEnv>()
  .use(requireUser)
  .get('/me', (c) => c.json({ id: c.var.user.id, email: c.var.user.email }));

function getMe(client: Client, cookie?: string) {
  return protectedApp.request(`${ORIGIN}/me`, { headers: headers(client, cookie) }, env);
}

async function profileOf(userId: string) {
  return scopedDb(createDb(env.DB), userId).profiles.select().get();
}

describe('sign up', () => {
  test('creates the user, a session cookie and an empty profile', async () => {
    const client = newClient();
    const res = await signUp(client);
    expect(res.status).toBe(200);
    const { user } = (await res.json()) as { user: { id: string; email: string } };
    expect(user.email).toBe(client.email);

    const setCookie = res.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE_NAME}=`));
    expect(setCookie).toMatch(/; HttpOnly/i);
    expect(setCookie).toMatch(/; Secure/i);
    expect(setCookie).toMatch(/; SameSite=Lax/i);

    const profile = await profileOf(user.id);
    expect(profile).toBeDefined();
    expect(Profile.parse(profile)).toMatchObject({ currentChapterId: null, timeZone: 'UTC' });
  });

  test(`rejects a password shorter than ${MIN_PASSWORD_LENGTH} characters`, async () => {
    const client = newClient();
    const res = await signUp(client, 'a'.repeat(MIN_PASSWORD_LENGTH - 1));
    expect(res.status).toBe(400);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  test('rejects an email that is already registered', async () => {
    const client = newClient();
    expect((await signUp(client)).status).toBe(200);
    expect((await signUp({ ...client, ip: newClient().ip })).status).toBe(422);
  });
});

describe('sign in and session', () => {
  test('the right password gives a session that reads back the user', async () => {
    const client = newClient();
    await signUp(client);
    const res = await signIn(client);
    expect(res.status).toBe(200);
    const session = await getSession(client, sessionCookie(res));
    expect(session?.user.email).toBe(client.email);
  });

  test('a wrong password is refused without a cookie', async () => {
    const client = newClient();
    await signUp(client);
    const res = await signIn(client, 'wrong-password-123');
    expect(res.status).toBe(401);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  test('a later sign-in keeps the profile onboarding filled in', async () => {
    const client = newClient();
    const signUpRes = await signUp(client);
    const { user } = (await signUpRes.json()) as { user: { id: string } };
    await scopedDb(createDb(env.DB), user.id).profiles.update({ currentChapterId: 'ch10' });

    expect((await signIn(client)).status).toBe(200);
    expect((await profileOf(user.id))?.currentChapterId).toBe('ch10');
  });

  test(`sign-in attempts are limited to ${AUTH_ATTEMPTS.max} per IP per window`, async () => {
    const client = newClient();
    for (let i = 0; i < AUTH_ATTEMPTS.max; i++) {
      expect((await signIn(client, 'wrong-password-123')).status).toBe(401);
    }
    expect((await signIn(client)).status).toBe(429);
    // Another IP is not affected.
    expect((await signIn({ ...client, ip: newClient().ip }, 'wrong-password-123')).status).toBe(
      401,
    );
  });
});

describe('requireUser', () => {
  test('answers 401 in the shared error shape without a session', async () => {
    const res = await getMe(newClient());
    expect(res.status).toBe(401);
    expect(ApiError.parse(await res.json()).error.code).toBe('unauthorized');
  });

  test('answers 401 for a forged session cookie', async () => {
    const res = await getMe(newClient(), `${COOKIE_NAME}=forged.value`);
    expect(res.status).toBe(401);
  });

  test('sets c.var.user from the session cookie', async () => {
    const client = newClient();
    const res = await signUp(client);
    const { user } = (await res.json()) as { user: { id: string } };
    const me = await getMe(client, sessionCookie(res));
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({ id: user.id, email: client.email });
  });
});

describe('sign out', () => {
  test('ends the session', async () => {
    const client = newClient();
    const cookie = sessionCookie(await signUp(client));
    expect((await getMe(client, cookie)).status).toBe(200);

    const res = await post(client, '/sign-out', {}, cookie);
    expect(res.status).toBe(200);
    expect(await getSession(client, cookie)).toBeNull();
    expect((await getMe(client, cookie)).status).toBe(401);
  });
});

describe('origins', () => {
  test('refuses a sign-in from an origin that is not trusted', async () => {
    const client = newClient();
    const res = await exports.default.fetch(`${ORIGIN}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: headers(client, undefined, 'https://evil.example'),
      body: JSON.stringify({ email: client.email, password: PASSWORD }),
    });
    expect(res.status).toBe(403);
  });

  test('accepts an origin listed in BETTER_AUTH_TRUSTED_ORIGINS', async () => {
    const client = newClient();
    const res = await app.request(
      `${ORIGIN}/api/auth/sign-up/email`,
      {
        method: 'POST',
        headers: headers(client, undefined, 'https://preview.frenchy.test'),
        body: JSON.stringify({ name: 'Léa', email: client.email, password: PASSWORD }),
      },
      { ...env, BETTER_AUTH_TRUSTED_ORIGINS: 'https://other.test, https://preview.frenchy.test' },
    );
    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/config', () => {
  async function config(google: { id: string; secret: string }) {
    const res = await app.request(
      `${ORIGIN}/api/auth/config`,
      {},
      {
        ...env,
        GOOGLE_CLIENT_ID: google.id,
        GOOGLE_CLIENT_SECRET: google.secret,
      },
    );
    expect(res.status).toBe(200);
    return AuthConfig.parse(await res.json());
  }

  test('says Google is on only when both id and secret are set', async () => {
    expect(await config({ id: 'client-id', secret: 'client-secret' })).toEqual({ google: true });
    expect(await config({ id: 'client-id', secret: '' })).toEqual({ google: false });
    expect(await config({ id: '', secret: '' })).toEqual({ google: false });
  });
});

describe('Google sign-in', () => {
  function startGoogle(google: { id: string; secret: string }) {
    return app.request(
      `${ORIGIN}/api/auth/sign-in/social`,
      {
        method: 'POST',
        headers: headers(newClient()),
        body: JSON.stringify({ provider: 'google', callbackURL: '/today' }),
      },
      { ...env, GOOGLE_CLIENT_ID: google.id, GOOGLE_CLIENT_SECRET: google.secret },
    );
  }

  test('sends the user to Google with our callback when configured', async () => {
    const res = await startGoogle({ id: 'client-id', secret: 'client-secret' });
    expect(res.status).toBe(200);
    const { url } = (await res.json()) as { url: string };
    const google = new URL(url);
    expect(google.origin).toBe('https://accounts.google.com');
    expect(google.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/auth/callback/google`);
  });

  test('is refused when not configured', async () => {
    const res = await startGoogle({ id: '', secret: '' });
    expect(res.status).toBe(404);
  });
});
