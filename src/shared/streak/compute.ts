import type { CalendarDay, DailyActivity, LocalDate, StreakSummary } from '../schemas';
import { addDays, daysBetween } from './dates';

/** One freeze is earned each time a run reaches a multiple of this many counted days. */
export const FREEZE_EARN_EVERY = 7;
export const MAX_FREEZES = 2;

export type StreakResult = StreakSummary & { calendar: CalendarDay[] };

/** A day counts when at least one card was graded or one text finished. Minutes alone don't. */
export function isCountedDay(row: Pick<DailyActivity, 'reviews' | 'readings'>): boolean {
  return row.reviews > 0 || row.readings > 0;
}

/**
 * Turns activity rows into the streak, derived only from `reviews` and `readings`.
 * `freezeUsed` is ignored: a freeze is spent on any missed day while one is held, so it is
 * an output (the calendar's `freeze` days), never an input.
 *
 * Rules (default until H-07 confirms):
 * - Days up to yesterday are final. A missed day spends a held freeze (the run goes on) or, with
 *   none held, ends the run. Today never breaks anything: until it is counted the streak shows
 *   the run as of yesterday.
 * - `current` is the counted days in the run; a freeze day keeps the run alive but adds nothing.
 * - Every 7th counted day of a run earns a freeze, at most 2 held. A broken run starts again at 0
 *   and holds none, because a run can only break with no freeze left.
 * - The calendar starts at the first counted day and ends at yesterday, or today once counted.
 *
 * Rows may come in any order. Duplicate dates are merged, dates after `today` are ignored, and
 * dates are taken as stored, so a time zone change only changes which date is "today".
 * Freezes depend on the whole run, so pass every row, not a recent window.
 */
export function computeStreak(rows: readonly DailyActivity[], today: LocalDate): StreakResult {
  const counted = new Set<LocalDate>();
  for (const row of rows) {
    if (row.date <= today && isCountedDay(row)) counted.add(row.date);
  }

  const calendar: CalendarDay[] = [];
  if (counted.size === 0) {
    return { current: 0, best: 0, freezesLeft: 0, todayDone: false, calendar };
  }

  const first = [...counted].reduce((a, b) => (a < b ? a : b));
  const todayDone = counted.has(today);
  const lastDay = todayDone ? today : addDays(today, -1);

  let run = 0;
  let best = 0;
  let freezes = 0;
  for (let i = 0, n = daysBetween(first, lastDay); i <= n; i++) {
    const date = addDays(first, i);
    if (counted.has(date)) {
      run += 1;
      best = Math.max(best, run);
      if (run % FREEZE_EARN_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
      calendar.push({ date, status: 'practiced' });
    } else if (freezes > 0) {
      freezes -= 1;
      calendar.push({ date, status: 'freeze' });
    } else {
      run = 0;
      calendar.push({ date, status: 'missed' });
    }
  }

  return { current: run, best, freezesLeft: freezes, todayDone, calendar };
}
