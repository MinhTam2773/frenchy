import { exports } from 'cloudflare:workers';
import { expect, test } from 'vitest';
import { app } from './index';

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
