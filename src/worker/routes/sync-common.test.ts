import { env } from 'cloudflare:workers';
import { describe, expect, test, vi } from 'vitest';
import { ApiError } from '../../shared/schemas';
import { syncRouter } from './sync-common';
import { anonymous, newUser, ORIGIN } from './sync-test-helpers';

const ENDPOINTS = [
  ['GET', '/profile'],
  ['PATCH', '/profile'],
  ['GET', '/cards/due'],
  ['GET', '/cards/stats'],
  ['POST', '/cards'],
  ['POST', '/cards/starter/ch10'],
  ['POST', '/reviews'],
  ['GET', '/words'],
  ['PUT', '/words/parler'],
  ['POST', '/activity/ping'],
  ['GET', '/activity/readings'],
  ['POST', '/activity/readings'],
  ['GET', '/streak'],
  ['GET', '/account/export'],
  ['DELETE', '/account'],
] as const;

describe('every sync endpoint', () => {
  test.each(ENDPOINTS)('%s %s needs a session and answers with ApiError', async (method, path) => {
    const res = await anonymous(path, { method, body: method === 'GET' ? undefined : {} });
    expect(res.status).toBe(401);
    expect(ApiError.parse(await res.json()).error.code).toBe('unauthorized');
  });

  test('a missing profile is a 404, not a crash', async () => {
    const user = await newUser();
    await user.db.profiles.delete();
    const res = await user.api('/streak');
    expect(res.status).toBe(404);
    expect(ApiError.parse(await res.json()).error.code).toBe('not_found');
  });
});

test('an unexpected error is a 500 with the same error shape', async () => {
  const user = await newUser();
  const app = syncRouter().get('/boom', () => {
    throw new Error('boom');
  });
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const res = await app.request(`${ORIGIN}/boom`, { headers: { cookie: user.cookie } }, env);
  expect(res.status).toBe(500);
  expect(ApiError.parse(await res.json()).error).toEqual({
    code: 'internal',
    message: 'Something went wrong',
  });
  expect(error).toHaveBeenCalled();
  error.mockRestore();
});
