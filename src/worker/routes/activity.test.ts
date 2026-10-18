import { describe, expect, test } from 'vitest';
import {
  ApiError,
  DailyActivity,
  Reading,
  ReadingsResponse,
  StreakResponse,
} from '../../shared/schemas';
import { addDays, computeStreak, localDateOf } from '../../shared/streak';
import { newUser, type TestUser } from './sync-test-helpers';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const TEXT_ID = 'ch10-au-marche';
const OTHER_TEXT_ID = 'ch10-la-journee-de-thomas';

/** The start of the current clock minute, plus a few seconds, so `+ MINUTE` is the next one. */
function thisMinute(): number {
  const now = Date.now();
  return now - (now % MINUTE) - MINUTE + 5_000;
}

async function ping(user: TestUser, at: number) {
  const res = await user.api('/activity/ping', { method: 'POST', body: { at } });
  return { status: res.status, body: (await res.json()) as unknown };
}

async function streak(user: TestUser): Promise<StreakResponse> {
  const res = await user.api('/streak');
  expect(res.status).toBe(200);
  return StreakResponse.parse(await res.json());
}

function finish(user: TestUser, textId: string, finishedAt = Date.now()) {
  return user.api('/activity/readings', { method: 'POST', body: { textId, finishedAt } });
}

async function readings(user: TestUser): Promise<Reading[]> {
  const res = await user.api('/activity/readings');
  expect(res.status).toBe(200);
  return ReadingsResponse.parse(await res.json()).readings;
}

describe('POST /api/activity/ping', () => {
  test('adds at most one minute per clock minute', async () => {
    const user = await newUser();
    const at = thisMinute();
    const today = localDateOf(at, 'UTC');
    const first = await ping(user, at);
    expect(first.status).toBe(200);
    expect(DailyActivity.parse(first.body)).toEqual({
      date: today,
      minutes: 1,
      reviews: 0,
      readings: 0,
      freezeUsed: false,
    });
    // A retry and a second tab in the same minute.
    expect(DailyActivity.parse((await ping(user, at + 10_000)).body).minutes).toBe(1);
    expect(DailyActivity.parse((await ping(user, at)).body).minutes).toBe(1);
    expect(DailyActivity.parse((await ping(user, at + MINUTE)).body).minutes).toBe(2);
  });

  test('refuses a time far in the past or future', async () => {
    const user = await newUser();
    for (const at of [Date.now() - 2 * DAY, Date.now() + DAY]) {
      const { status, body } = await ping(user, at);
      expect(status).toBe(400);
      expect(ApiError.parse(body).error.issues?.[0]?.path).toBe('at');
    }
  });

  test("one user's minutes don't count for another user in the same minute", async () => {
    const a = await newUser();
    const b = await newUser();
    const at = thisMinute();
    await ping(a, at);
    expect(DailyActivity.parse((await ping(b, at)).body).minutes).toBe(1);
    expect(DailyActivity.parse((await ping(a, at + MINUTE)).body).minutes).toBe(2);
  });
});

describe('/api/activity/readings', () => {
  test('keeps the first finish per text and counts a text once per day', async () => {
    const user = await newUser();
    const firstAt = Date.now() - 2 * MINUTE;
    const res = await finish(user, TEXT_ID, firstAt);
    expect(res.status).toBe(200);
    expect(Reading.parse(await res.json())).toEqual({ textId: TEXT_ID, finishedAt: firstAt });

    const again = await finish(user, TEXT_ID);
    expect(Reading.parse(await again.json())).toEqual({ textId: TEXT_ID, finishedAt: firstAt });
    await finish(user, OTHER_TEXT_ID);

    const [day] = await user.db.dailyActivity.select();
    expect(day?.readings).toBe(2);
    expect(await readings(user)).toEqual([
      { textId: TEXT_ID, finishedAt: firstAt },
      { textId: OTHER_TEXT_ID, finishedAt: expect.any(Number) },
    ]);
  });

  test('answers 404 for a text that is not in content/ and 400 for a bad id', async () => {
    const user = await newUser();
    const missing = await finish(user, 'ch10-no-such-text');
    expect(missing.status).toBe(404);
    expect(ApiError.parse(await missing.json()).error.code).toBe('not_found');
    expect((await finish(user, 'Au marché')).status).toBe(400);
    expect(await readings(user)).toEqual([]);
  });

  test("one user's readings are invisible to another user", async () => {
    const a = await newUser();
    const b = await newUser();
    await finish(a, TEXT_ID);
    expect(await readings(b)).toEqual([]);
    const res = await finish(b, TEXT_ID, Date.now() - MINUTE);
    expect(Reading.parse(await res.json()).finishedAt).toBeLessThan(Date.now());
    expect(await readings(a)).toHaveLength(1);
  });
});

describe('GET /api/streak', () => {
  test('a new user has no streak and an empty calendar', async () => {
    const user = await newUser();
    expect(await streak(user)).toEqual({
      current: 0,
      best: 0,
      freezesLeft: 0,
      todayDone: false,
      today: localDateOf(Date.now(), 'UTC'),
      todayMinutes: 0,
      calendar: [],
    });
  });

  test('uses every activity row, not a recent window (G-31), in the profile time zone', async () => {
    const user = await newUser();
    const timeZone = 'America/Toronto';
    await user.api('/profile', { method: 'PATCH', body: { timeZone } });
    const today = localDateOf(Date.now(), timeZone);
    // 450 practiced days up to yesterday, with one missed day (spends a freeze) 430 days ago,
    // and 12 minutes today with nothing graded yet.
    const rows: DailyActivity[] = [];
    for (let ago = 450; ago >= 1; ago--) {
      if (ago === 430) continue;
      rows.push({
        date: addDays(today, -ago),
        minutes: 5,
        reviews: 3,
        readings: 0,
        freezeUsed: false,
      });
    }
    rows.push({ date: today, minutes: 12, reviews: 0, readings: 0, freezeUsed: false });
    // One statement per row (L-23); `freezeUsed` is never read back.
    for (let i = 0; i < rows.length; i += 50) {
      const [first, ...rest] = rows
        .slice(i, i + 50)
        .map((row) => user.db.dailyActivity.insert(row));
      if (first) await user.db.batch([first, ...rest]);
    }

    const result = await streak(user);
    const { calendar, ...summary } = computeStreak(rows, today);
    expect(result).toEqual({ ...summary, today, todayMinutes: 12, calendar });
    expect(result).toMatchObject({ current: 449, best: 449, freezesLeft: 2, todayDone: false });
    expect(calendar).toHaveLength(450);
    expect(calendar.find((day) => day.date === addDays(today, -430))?.status).toBe('freeze');
  });

  test('a graded review today marks the day done', async () => {
    const user = await newUser();
    const card = await (
      await user.api('/cards', {
        method: 'POST',
        body: {
          type: 'sentence_meaning',
          front: 'Tu chantes bien.',
          back: 'You sing well.',
          source: { kind: 'word', ref: 'chanter' },
        },
      })
    ).json();
    await user.api('/reviews', {
      method: 'POST',
      body: {
        id: crypto.randomUUID(),
        cardId: (card as { id: string }).id,
        rating: 3,
        reviewedAt: Date.now(),
        durationMs: 2_000,
      },
    });
    const today = localDateOf(Date.now(), 'UTC');
    expect(await streak(user)).toMatchObject({
      current: 1,
      todayDone: true,
      calendar: [{ date: today, status: 'practiced' }],
    });
  });

  test("never counts another user's days", async () => {
    const a = await newUser();
    const b = await newUser();
    await finish(a, TEXT_ID);
    expect((await streak(a)).current).toBe(1);
    expect(await streak(b)).toMatchObject({ current: 0, calendar: [] });
  });
});
