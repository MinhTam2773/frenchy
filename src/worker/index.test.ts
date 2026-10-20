import { exports } from 'cloudflare:workers';
import { expect, test } from 'vitest';
import { ApiError } from '../shared/schemas';
import { app } from './index';
import { MAX_BODY_BYTES } from './middleware/body-limit';
import { newUser, ORIGIN } from './routes/sync-test-helpers';

/** Routes anyone may call. Every other route must answer 401 without a session (T-29). */
const PUBLIC_ROUTES = ['/api/health', '/api/auth/config', '/api/auth/*'];

test('GET /api/health returns ok', async () => {
  const res = await exports.default.fetch('http://localhost/api/health');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test('unknown API routes get a 404 from the Worker', async () => {
  const res = await exports.default.fetch('http://localhost/api/nope');
  expect(res.status).toBe(404);
});

test('every API route except the public ones needs a session', async () => {
  // Middleware shows up as method ALL; only real handlers are checked.
  const routes = app.routes.filter(
    ({ method, path }) => method !== 'ALL' && !PUBLIC_ROUTES.includes(path),
  );
  expect(routes.length).toBeGreaterThan(10);
  for (const { method, path } of routes) {
    const res = await exports.default.fetch(`https://frenchy.test${path.replace(/:\w+/g, 'x')}`, {
      method,
      headers: { 'content-type': 'application/json', origin: 'https://frenchy.test' },
      body: method === 'GET' ? undefined : '{}',
    });
    expect(res.status, `${method} ${path}`).toBe(401);
  }
});

test('a cross-site form-type write is refused even with a session cookie', async () => {
  const user = await newUser();
  // What a cross-site <form> could send if a browser ever attached the SameSite=Lax cookie.
  const post = (origin: string) =>
    exports.default.fetch(`${ORIGIN}/api/cards/starter/ch10`, {
      method: 'POST',
      headers: { cookie: user.cookie, origin, 'content-type': 'text/plain' },
    });
  expect((await post('https://evil.test')).status).toBe(403);
  expect((await post(ORIGIN)).status).toBe(200);
});

test('a body over the cap is refused with 413 in the error shape, before the route runs', async () => {
  const user = await newUser();
  const patch = (body: BodyInit) =>
    exports.default.fetch(`${ORIGIN}/api/profile`, {
      method: 'PATCH',
      headers: { cookie: user.cookie, origin: ORIGIN, 'content-type': 'application/json' },
      body,
      // @ts-expect-error `duplex` is required for a streamed body but missing from the DOM types
      duplex: 'half',
    });
  const big = JSON.stringify({ pad: 'x'.repeat(MAX_BODY_BYTES) });
  const res = await patch(big);
  expect(res.status).toBe(413);
  expect(ApiError.parse(await res.json()).error.code).toBe('bad_request');
  // A streamed body has no Content-Length, so the bytes are counted as they arrive.
  const stream = new Blob([big]).stream();
  expect((await patch(stream)).status).toBe(413);
  expect((await patch('{}')).status).toBe(200);
});
