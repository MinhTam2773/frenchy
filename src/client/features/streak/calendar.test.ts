import type { DailyActivity } from '@shared/schemas';
import { computeStreak } from '@shared/streak';
import { expect, test } from 'vitest';
import { buildMonth, monthIndexOf, monthTitle } from './calendar';

const active = (date: string): DailyActivity => ({
  date,
  minutes: 5,
  reviews: 10,
  readings: 0,
  freezeUsed: false,
});
const octoberDate = (d: number) => `2026-10-${String(d).padStart(2, '0')}`;

// Oct 1-7 practiced (earns a freeze), Oct 8 missed (freeze spent), 9-12 practiced, 13-14 missed
// (no freeze left, the run ends), 15 practiced; today (the 16th) not done yet.
const today = '2026-10-16';
const rows = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 15].map((d) => active(octoberDate(d)));
const result = computeStreak(rows, today);
const october = buildMonth(monthIndexOf(today), { today, calendar: result.calendar });
const cell = (d: number) => october.find((c) => c?.day === d);

test('uses the server calendar for practiced, freeze and missed days', () => {
  expect(cell(1)?.state).toBe('practiced');
  expect(cell(8)?.state).toBe('freeze');
  expect(cell(13)?.state).toBe('missed');
  expect(cell(8)?.label).toBe('October 8, freeze used');
  expect(cell(13)?.label).toBe('October 13, missed');
});

test('today and later are decided on the client', () => {
  expect(cell(16)).toMatchObject({ state: 'today', isToday: true, label: 'October 16, today' });
  expect(cell(17)).toMatchObject({ state: 'future', label: 'October 17' });
});

test('a practiced today keeps its fill and is still marked as today', () => {
  const done = computeStreak([...rows, active(today)], today);
  const grid = buildMonth(monthIndexOf(today), { today, calendar: done.calendar });
  expect(grid.find((c) => c?.day === 16)).toMatchObject({
    state: 'practiced',
    isToday: true,
    label: 'October 16, today, practiced',
  });
});

test('days before the first active day have no status', () => {
  const september = buildMonth(monthIndexOf('2026-09-01'), { today, calendar: result.calendar });
  expect(september.every((c) => c === null || c.state === 'none')).toBe(true);
});

test('weeks start on Monday: Oct 1 2026 is a Thursday', () => {
  expect(october.slice(0, 3)).toEqual([null, null, null]);
  expect(october[3]?.day).toBe(1);
  expect(october.filter(Boolean)).toHaveLength(31);
});

test('month titles', () => {
  expect(monthTitle(monthIndexOf('2026-10-16'))).toBe('October 2026');
  expect(monthTitle(monthIndexOf('2027-01-02'))).toBe('January 2027');
});
