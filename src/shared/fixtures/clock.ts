/** The mockups' "now": Saturday 2026-10-17, 08:30 in Toronto (EDT, UTC−4). */
export const FIXTURE_NOW = Date.UTC(2026, 9, 17, 12, 30);
export const FIXTURE_TODAY = '2026-10-17';
export const FIXTURE_TIME_ZONE = 'America/Toronto';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export function minutesAgo(n: number): number {
  return FIXTURE_NOW - n * MINUTE;
}

export function daysAgo(n: number): number {
  return FIXTURE_NOW - n * DAY;
}
