import { describe, expect, it } from 'vitest';
import { dailyActivity, FIXTURE_TODAY } from '../fixtures';
import { StreakResponse } from '../schemas';
import type { DailyActivity } from '../schemas';
import { computeStreak } from './compute';
import { addDays, localDateOf } from './dates';

const START = '2026-09-01';
const day = (n: number): string => addDays(START, n);

function row(date: string, reviews = 1, readings = 0, minutes = 10): DailyActivity {
  return { date, reviews, readings, minutes, freezeUsed: false };
}

/** Counted days at the given offsets from START. */
function practiced(...offsets: number[]): DailyActivity[] {
  return offsets.map((n) => row(day(n)));
}

/** Counted days from offset `from` up to and including `to`. */
function range(from: number, to: number): DailyActivity[] {
  return practiced(...Array.from({ length: to - from + 1 }, (_, i) => from + i));
}

const statuses = (result: ReturnType<typeof computeStreak>): string[] =>
  result.calendar.map((d) => d.status);

describe('computeStreak: basics', () => {
  it('is all zero with no rows', () => {
    expect(computeStreak([], day(5))).toEqual({
      current: 0,
      best: 0,
      freezesLeft: 0,
      todayDone: false,
      calendar: [],
    });
  });

  it('counts a simple run that includes today', () => {
    const result = computeStreak(range(0, 4), day(4));
    expect(result).toMatchObject({ current: 5, best: 5, freezesLeft: 0, todayDone: true });
    expect(statuses(result)).toEqual(Array(5).fill('practiced'));
    expect(result.calendar[0]).toEqual({ date: day(0), status: 'practiced' });
  });

  it('keeps the streak when today is not done yet, and the calendar stops at yesterday', () => {
    const result = computeStreak(range(0, 4), day(5));
    expect(result).toMatchObject({ current: 5, best: 5, todayDone: false });
    expect(result.calendar.at(-1)?.date).toBe(day(4));
  });

  it('does not count minutes alone', () => {
    const rows = [...range(0, 2), row(day(3), 0, 0, 45)];
    const result = computeStreak(rows, day(3));
    expect(result).toMatchObject({ current: 3, todayDone: false });
  });

  it('counts a finished reading without any review', () => {
    const result = computeStreak([row(day(0), 0, 1)], day(0));
    expect(result).toMatchObject({ current: 1, todayDone: true });
  });

  it('is zero when the only activity is long ago and nothing is held', () => {
    const result = computeStreak(range(0, 2), day(10));
    expect(result).toMatchObject({ current: 0, best: 3, freezesLeft: 0, todayDone: false });
    expect(statuses(result)).toEqual([
      'practiced',
      'practiced',
      'practiced',
      ...Array(7).fill('missed'),
    ]);
  });

  it('ignores row order, merges duplicate dates and skips future dates', () => {
    const rows = [row(day(2)), row(day(0)), row(day(1), 0, 0, 5), row(day(1)), row(day(9))];
    const result = computeStreak(rows, day(2));
    expect(result).toMatchObject({ current: 3, best: 3, todayDone: true });
    expect(result.calendar).toHaveLength(3);
  });

  it('is deterministic and does not change its input', () => {
    const rows = [...range(0, 8), ...range(10, 12)];
    const copy = structuredClone(rows);
    expect(computeStreak(rows, day(13))).toEqual(computeStreak(rows, day(13)));
    expect(rows).toEqual(copy);
  });
});

describe('computeStreak: gaps without a freeze', () => {
  it('ends the run on a missed day and starts again at 1', () => {
    const result = computeStreak([...range(0, 2), ...range(4, 5)], day(5));
    expect(result).toMatchObject({ current: 2, best: 3, freezesLeft: 0 });
    expect(statuses(result)).toEqual([
      'practiced',
      'practiced',
      'practiced',
      'missed',
      'practiced',
      'practiced',
    ]);
  });

  it('breaks the streak when yesterday was missed and nothing is held', () => {
    const result = computeStreak(range(0, 2), day(4));
    expect(result.current).toBe(0);
    expect(result.todayDone).toBe(false);
  });

  it('ignores freezeUsed on the row: the freeze is derived, not stored', () => {
    const rows = [...range(0, 2), { ...row(day(3), 0, 0, 0), freezeUsed: true }, ...range(4, 4)];
    const result = computeStreak(rows, day(4));
    expect(result.calendar[3]).toEqual({ date: day(3), status: 'missed' });
    expect(result.current).toBe(1);
  });
});

describe('computeStreak: freezes', () => {
  it('earns a freeze on the 7th counted day in a row', () => {
    expect(computeStreak(range(0, 5), day(5)).freezesLeft).toBe(0);
    expect(computeStreak(range(0, 6), day(6)).freezesLeft).toBe(1);
  });

  it('spends the freeze on a missed day, and the run goes on without that day adding to it', () => {
    const result = computeStreak([...range(0, 6), ...range(8, 8)], day(8));
    expect(result).toMatchObject({ current: 8, best: 8, freezesLeft: 0, todayDone: true });
    expect(result.calendar[7]).toEqual({ date: day(7), status: 'freeze' });
  });

  it('shows a freeze already spent on yesterday while today is still open', () => {
    const result = computeStreak(range(0, 6), day(8));
    expect(result).toMatchObject({ current: 7, freezesLeft: 0, todayDone: false });
    expect(result.calendar.at(-1)).toEqual({ date: day(7), status: 'freeze' });
  });

  it('holds at most 2: the third freeze is not banked', () => {
    expect(computeStreak(range(0, 13), day(13)).freezesLeft).toBe(2);
    expect(computeStreak(range(0, 20), day(20)).freezesLeft).toBe(2);
    expect(computeStreak(range(0, 27), day(27)).freezesLeft).toBe(2);
  });

  it('survives two missed days with two freezes and breaks on the third', () => {
    const survives = computeStreak([...range(0, 13), ...range(16, 16)], day(16));
    expect(survives).toMatchObject({ current: 15, freezesLeft: 0 });
    expect(statuses(survives).slice(14, 16)).toEqual(['freeze', 'freeze']);

    const breaks = computeStreak([...range(0, 13), ...range(17, 17)], day(17));
    expect(breaks).toMatchObject({ current: 1, best: 14, freezesLeft: 0 });
    expect(statuses(breaks).slice(14, 17)).toEqual(['freeze', 'freeze', 'missed']);
  });

  it('keeps earning after a freeze is spent: progress is the run, not a counter that resets', () => {
    // Days 0-6 earn one (spent on day 7), days 8-13 are the run's 7th..13th counted days.
    const rows = [...range(0, 6), ...range(8, 14)];
    const result = computeStreak(rows, day(14));
    expect(result).toMatchObject({ current: 14, freezesLeft: 1 });
  });

  it('starts from zero freezes after a break', () => {
    const rows = [...range(0, 13), ...range(17, 22)];
    const result = computeStreak(rows, day(22));
    expect(result).toMatchObject({ current: 6, best: 14, freezesLeft: 0 });
    expect(computeStreak([...rows, ...range(23, 23)], day(23))).toMatchObject({
      current: 7,
      freezesLeft: 1,
    });
  });

  it('keeps a held freeze when today is open and yesterday was done', () => {
    const result = computeStreak(range(0, 6), day(7));
    expect(result).toMatchObject({ current: 7, freezesLeft: 1, todayDone: false });
  });
});

describe('computeStreak: time zones and DST', () => {
  const TORONTO = 'America/Toronto';

  /** Rows built the way the server does: the local date of the instant of each practice. */
  function rowsFrom(instants: string[], timeZone: string): DailyActivity[] {
    return instants.map((iso) => row(localDateOf(Date.parse(iso), timeZone)));
  }

  it('keeps a run unbroken across the March spring-forward day in Toronto', () => {
    // Practice at 21:00 local on Mar 6, 7, 8 and 9: 02:00Z, 02:00Z, then 01:00Z once on EDT.
    const rows = rowsFrom(
      [
        '2026-03-07T02:00:00Z',
        '2026-03-08T02:00:00Z',
        '2026-03-09T01:00:00Z',
        '2026-03-10T01:00:00Z',
      ],
      TORONTO,
    );
    expect(rows.map((r) => r.date)).toEqual([
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
    ]);
    const today = localDateOf(Date.parse('2026-03-10T15:00:00Z'), TORONTO);
    expect(computeStreak(rows, today)).toMatchObject({ current: 4, todayDone: false });
  });

  it('keeps a run unbroken across the November fall-back day in Toronto', () => {
    // 21:00 local on Oct 31 (EDT, 01:00Z), then Nov 1, 2 and 3 (EST, 02:00Z).
    const rows = rowsFrom(
      [
        '2026-11-01T01:00:00Z',
        '2026-11-02T02:00:00Z',
        '2026-11-03T02:00:00Z',
        '2026-11-04T02:00:00Z',
      ],
      TORONTO,
    );
    expect(rows.map((r) => r.date)).toEqual([
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ]);
    const today = localDateOf(Date.parse('2026-11-04T15:00:00Z'), TORONTO);
    expect(computeStreak(rows, today)).toMatchObject({ current: 4, todayDone: false });
  });

  it('files practice just before local midnight under the local day, not the UTC day', () => {
    // 23:30 EDT on Mar 8 is already Mar 9 in UTC.
    const lateNight = rowsFrom(['2026-03-09T03:30:00Z'], TORONTO);
    expect(lateNight[0].date).toBe('2026-03-08');
    const next = row('2026-03-09');
    const today = localDateOf(Date.parse('2026-03-09T16:00:00Z'), TORONTO);
    expect(computeStreak([...lateNight, next], today)).toMatchObject({
      current: 2,
      todayDone: true,
    });
  });

  it('counts the 25-hour fall-back day once, even with two practices on it', () => {
    const rows = rowsFrom(['2026-11-01T04:30:00Z', '2026-11-02T04:30:00Z'], TORONTO);
    expect(rows.map((r) => r.date)).toEqual(['2026-11-01', '2026-11-01']);
    expect(computeStreak(rows, '2026-11-01')).toMatchObject({ current: 1, todayDone: true });
  });

  it('after moving west, the repeated local date is counted once', () => {
    // Two evenings in Tokyo, then Oct 13 twice: 18:00 JST in Tokyo and 16:00 EDT after flying home.
    const rows = [
      ...rowsFrom(
        ['2026-10-11T12:00:00Z', '2026-10-12T12:00:00Z', '2026-10-13T09:00:00Z'],
        'Asia/Tokyo',
      ),
      ...rowsFrom(['2026-10-13T20:00:00Z'], TORONTO),
    ];
    expect(rows.map((r) => r.date)).toEqual([
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-13',
    ]);
    expect(computeStreak(rows, '2026-10-13')).toMatchObject({
      current: 3,
      best: 3,
      todayDone: true,
    });
  });

  it('after moving east, a skipped local date is a missed day: it breaks the run unless a freeze is held', () => {
    // Toronto evenings of Oct 11 and 12, then 05:00 JST on Oct 14: Oct 13 never existed as a practice day.
    const toronto = rowsFrom(['2026-10-12T02:00:00Z', '2026-10-13T02:00:00Z'], TORONTO);
    const tokyo = rowsFrom(['2026-10-13T20:00:00Z'], 'Asia/Tokyo');
    expect([...toronto, ...tokyo].map((r) => r.date)).toEqual([
      '2026-10-11',
      '2026-10-12',
      '2026-10-14',
    ]);

    const noFreeze = computeStreak([...toronto, ...tokyo], '2026-10-14');
    expect(noFreeze.calendar.at(-2)).toEqual({ date: '2026-10-13', status: 'missed' });
    expect(noFreeze.current).toBe(1);

    const earlier = Array.from({ length: 6 }, (_, i) => row(addDays('2026-10-05', i)));
    const withFreeze = computeStreak([...earlier, ...toronto, ...tokyo], '2026-10-14');
    expect(withFreeze.calendar.at(-2)).toEqual({ date: '2026-10-13', status: 'freeze' });
    expect(withFreeze).toMatchObject({ current: 9, freezesLeft: 0 });
  });

  it('evaluates "today" in the user\'s current zone', () => {
    const rows = range(0, 3);
    const instant = Date.parse(`${day(4)}T03:30:00Z`);
    // 23:30 the evening before in Toronto: day(3) is still today, so the streak is intact and done.
    expect(computeStreak(rows, localDateOf(instant, TORONTO))).toMatchObject({
      current: 4,
      todayDone: true,
    });
    // Same instant in Tokyo is already day(4) and nothing is logged for it yet.
    expect(computeStreak(rows, localDateOf(instant, 'Asia/Tokyo'))).toMatchObject({
      current: 4,
      todayDone: false,
    });
  });
});

describe('computeStreak: contract', () => {
  it('follows the rule, not the mockup: October fixture rows give a streak of 5, not 12 (L-20)', () => {
    const result = computeStreak(dailyActivity, FIXTURE_TODAY);
    expect(result).toMatchObject({ current: 5, best: 6, freezesLeft: 0, todayDone: false });
    const missed = result.calendar.filter((d) => d.status === 'missed').map((d) => d.date);
    expect(missed).toEqual(['2026-10-03', '2026-10-04', '2026-10-11']);
    expect(result.calendar.at(-1)).toEqual({ date: '2026-10-16', status: 'practiced' });
  });

  it('fits StreakResponse once the server adds today and todayMinutes', () => {
    const result = computeStreak(dailyActivity, FIXTURE_TODAY);
    const todayMinutes = dailyActivity.find((r) => r.date === FIXTURE_TODAY)?.minutes ?? 0;
    expect(
      StreakResponse.safeParse({ ...result, today: FIXTURE_TODAY, todayMinutes }).success,
    ).toBe(true);
  });

  it('handles about two years of daily rows', () => {
    const rows = range(0, 729);
    const result = computeStreak(rows, day(729));
    expect(result).toMatchObject({ current: 730, best: 730, freezesLeft: 2 });
    expect(result.calendar).toHaveLength(730);
  });
});
