import { env, exports } from 'cloudflare:workers';
import { createDb, scopedDb } from '../db';

// Test-only helpers for the T-22 route tests (not imported by the Worker).

const ORIGIN = 'https://frenchy.test';
const COOKIE_NAME = '__Secure-better-auth.session_token';

function randomIp(): string {
  const byte = () => Math.floor(Math.random() * 256);
  return `10.${byte()}.${byte()}.${byte()}`;
}

/** A signed-up user with a session, a `fetch` for `/api/*` and direct access to their rows. */
export async function newUser() {
  const ip = randomIp();
  const res = await exports.default.fetch(`${ORIGIN}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, 'cf-connecting-ip': ip },
    body: JSON.stringify({
      name: 'Léa',
      email: `learner-${crypto.randomUUID()}@example.com`,
      password: 'correct-horse-battery',
    }),
  });
  const setCookie = res.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!setCookie) throw new Error(`sign-up failed (status ${res.status})`);
  const cookie = setCookie.split(';')[0] ?? '';
  const { user } = (await res.json()) as { user: { id: string } };

  function api(path: string, init: { method?: string; body?: unknown } = {}) {
    return exports.default.fetch(`${ORIGIN}/api${path}`, {
      method: init.method ?? 'GET',
      headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  }

  return { id: user.id, api, db: scopedDb(createDb(env.DB), user.id) };
}
export type TestUser = Awaited<ReturnType<typeof newUser>>;

/** The same request with no session cookie. */
export function anonymous(path: string, init: { method?: string; body?: unknown } = {}) {
  return exports.default.fetch(`${ORIGIN}/api${path}`, {
    method: init.method ?? 'GET',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
