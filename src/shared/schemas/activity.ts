import { z } from 'zod';
import { ContentId, EpochMs, LocalDate } from './common';

const Count = z.int().nonnegative();

/** One row per user per local day with any activity. */
export const DailyActivity = z.object({
  date: LocalDate,
  minutes: Count,
  reviews: Count,
  readings: Count,
  freezeUsed: z.boolean(),
});
export type DailyActivity = z.infer<typeof DailyActivity>;

export const StreakSummary = z.object({
  current: Count,
  best: Count,
  freezesLeft: z.int().min(0).max(2),
  todayDone: z.boolean(),
});
export type StreakSummary = z.infer<typeof StreakSummary>;

export const CalendarDay = z.object({
  date: LocalDate,
  status: z.enum(['practiced', 'freeze', 'missed']),
});
export type CalendarDay = z.infer<typeof CalendarDay>;

/**
 * `GET /api/streak`. `calendar` has every day from the first active day to yesterday, plus
 * today once it is practiced. Dates outside it have no status (not started yet, or future).
 */
export const StreakResponse = StreakSummary.extend({
  today: LocalDate,
  todayMinutes: Count,
  calendar: z.array(CalendarDay),
});
export type StreakResponse = z.infer<typeof StreakResponse>;

/** `POST /api/activity/ping`: the user was active during the minute that contains `at`. */
export const ActivityPing = z.object({ at: EpochMs });
export type ActivityPing = z.infer<typeof ActivityPing>;

/** A lesson text the user finished (first time only). */
export const Reading = z.object({ textId: ContentId, finishedAt: EpochMs });
export type Reading = z.infer<typeof Reading>;

export const ReadingsResponse = z.object({ readings: z.array(Reading) });
export type ReadingsResponse = z.infer<typeof ReadingsResponse>;
