import { describe, expect, test } from 'vitest';
import { ApiError, WordStatus, WordsResponse } from '../../shared/schemas';
import { anonymous, newUser, type TestUser } from './sync-test-helpers';

async function words(user: TestUser): Promise<WordStatus[]> {
  const res = await user.api('/words');
  expect(res.status).toBe(200);
  return WordsResponse.parse(await res.json()).words;
}

function put(user: TestUser, path: string, body: unknown) {
  return user.api(`/words/${path}`, { method: 'PUT', body });
}

describe('/api/words', () => {
  test('starts empty (every word is new) and upserts a status by URL-encoded lemma', async () => {
    const user = await newUser();
    expect(await words(user)).toEqual([]);

    const res = await put(user, encodeURIComponent('préférer'), { status: 'learning' });
    expect(res.status).toBe(200);
    expect(WordStatus.parse(await res.json())).toEqual({ lemma: 'préférer', status: 'learning' });

    await put(user, encodeURIComponent('préférer'), { status: 'known' });
    expect(await words(user)).toEqual([{ lemma: 'préférer', status: 'known' }]);
  });

  test('refuses an unknown status', async () => {
    const user = await newUser();
    const res = await put(user, 'parler', { status: 'mastered' });
    expect(res.status).toBe(400);
    expect(ApiError.parse(await res.json()).error.issues?.[0]?.path).toBe('status');
  });

  test('needs a session', async () => {
    expect((await anonymous('/words')).status).toBe(401);
    expect(
      (await anonymous('/words/parler', { method: 'PUT', body: { status: 'known' } })).status,
    ).toBe(401);
  });

  test("one user's word statuses are invisible to another user", async () => {
    const a = await newUser();
    const b = await newUser();
    await put(a, 'chat', { status: 'known' });
    await put(b, 'chat', { status: 'learning' });
    expect(await words(a)).toEqual([{ lemma: 'chat', status: 'known' }]);
    expect(await words(b)).toEqual([{ lemma: 'chat', status: 'learning' }]);
  });
});
