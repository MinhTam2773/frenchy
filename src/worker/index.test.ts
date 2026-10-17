import { exports } from 'cloudflare:workers';
import { expect, test } from 'vitest';

test('GET /api/health returns ok', async () => {
  const res = await exports.default.fetch('http://localhost/api/health');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test('unknown API routes get a 404 from the Worker', async () => {
  const res = await exports.default.fetch('http://localhost/api/nope');
  expect(res.status).toBe(404);
});
