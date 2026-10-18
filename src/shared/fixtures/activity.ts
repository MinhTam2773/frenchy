import type { CalendarDay, DailyActivity, Reading, StreakResponse } from '../schemas';
import { daysAgo, FIXTURE_TODAY } from './clock';

// `Streak.dc.html`, October 2026: practiced Oct 1–2, missed 3–4, practiced 5–16 with a freeze on
// the 11th, today (17th) has 8 active minutes but no review or reading yet, so it doesn't count.
// The summary is copied from the mockup (best 21 comes from before October), not computed by T-11.

const practicedDays = [1, 2, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16];

function octoberDate(day: number): string {
  return `2026-10-${String(day).padStart(2, '0')}`;
}

export const dailyActivity: DailyActivity[] = [
  ...practicedDays.map((day) => ({
    date: octoberDate(day),
    minutes: 30 + (day % 4) * 5,
    reviews: 15 + (day % 5),
    readings: day % 3 === 0 ? 1 : 0,
    freezeUsed: false,
  })),
  { date: octoberDate(11), minutes: 0, reviews: 0, readings: 0, freezeUsed: true },
  { date: FIXTURE_TODAY, minutes: 8, reviews: 0, readings: 0, freezeUsed: false },
].sort((a, b) => a.date.localeCompare(b.date));

const calendar = Array.from({ length: 16 }, (_, i): CalendarDay => {
  const day = i + 1;
  const status = day === 11 ? 'freeze' : practicedDays.includes(day) ? 'practiced' : 'missed';
  return { date: octoberDate(day), status };
});

export const streak: StreakResponse = {
  current: 12,
  best: 21,
  freezesLeft: 2,
  todayDone: false,
  today: FIXTURE_TODAY,
  todayMinutes: 8,
  calendar,
};

/** A Ch 12 text (not in the fixtures). Ch 10's texts are unread, so Today offers "Le matin de Léa". */
export const readings: Reading[] = [{ textId: 'ch12-chez-moi', finishedAt: daysAgo(9) }];
