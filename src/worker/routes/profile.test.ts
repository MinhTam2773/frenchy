import { describe, expect, test } from 'vitest';
import { ApiError, Profile } from '../../shared/schemas';
import { anonymous, newUser } from './sync-test-helpers';

describe('GET /api/profile', () => {
  test('returns the profile sign-up created', async () => {
    const user = await newUser();
    const res = await user.api('/profile');
    expect(res.status).toBe(200);
    expect(Profile.strict().parse(await res.json())).toEqual({
      currentChapterId: null,
      timeZone: 'UTC',
      dailyGoalMinutes: 30,
      settings: { voiceURI: null, rate: 0.8, playOnTap: true },
    });
  });

  test('needs a session', async () => {
    const res = await anonymous('/profile');
    expect(res.status).toBe(401);
    expect(ApiError.parse(await res.json()).error.code).toBe('unauthorized');
  });
});

describe('PATCH /api/profile', () => {
  test('changes only the given fields and merges settings key by key', async () => {
    const user = await newUser();
    const res = await user.api('/profile', {
      method: 'PATCH',
      body: { currentChapterId: 'ch10', timeZone: 'America/Toronto', settings: { rate: 0.7 } },
    });
    expect(res.status).toBe(200);
    const expected = {
      currentChapterId: 'ch10',
      timeZone: 'America/Toronto',
      dailyGoalMinutes: 30,
      settings: { voiceURI: null, rate: 0.7, playOnTap: true },
    };
    expect(Profile.strict().parse(await res.json())).toEqual(expected);
    expect(await (await user.api('/profile')).json()).toEqual(expected);
  });

  test('can clear the current chapter', async () => {
    const user = await newUser();
    await user.api('/profile', { method: 'PATCH', body: { currentChapterId: 'ch1' } });
    const res = await user.api('/profile', { method: 'PATCH', body: { currentChapterId: null } });
    expect(Profile.parse(await res.json()).currentChapterId).toBeNull();
  });

  test('refuses an invalid body with the issues', async () => {
    const user = await newUser();
    const res = await user.api('/profile', { method: 'PATCH', body: { dailyGoalMinutes: 20 } });
    expect(res.status).toBe(400);
    const { error } = ApiError.parse(await res.json());
    expect(error.code).toBe('bad_request');
    expect(error.issues?.map((issue) => issue.path)).toEqual(['dailyGoalMinutes']);
  });

  test('refuses a body that is not JSON', async () => {
    const user = await newUser();
    const res = await user.api('/profile', { method: 'PATCH', body: undefined });
    expect(res.status).toBe(400);
    expect(ApiError.parse(await res.json()).error.code).toBe('bad_request');
  });

  test('answers 404 for a chapter that is not in the course', async () => {
    const user = await newUser();
    // `ch99` has the right shape but no chapter in course.json.
    const res = await user.api('/profile', { method: 'PATCH', body: { currentChapterId: 'ch99' } });
    expect(res.status).toBe(404);
    expect(ApiError.parse(await res.json()).error.code).toBe('not_found');
  });

  test("one user's change never reaches another user's profile", async () => {
    const a = await newUser();
    const b = await newUser();
    await a.api('/profile', { method: 'PATCH', body: { dailyGoalMinutes: 60 } });
    expect(Profile.parse(await (await b.api('/profile')).json()).dailyGoalMinutes).toBe(30);
    expect(Profile.parse(await (await a.api('/profile')).json()).dailyGoalMinutes).toBe(60);
  });
});
