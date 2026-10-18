import type { LocalDate } from '../schemas';

const MS_PER_DAY = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The calendar date at instant `epochMs` in an IANA time zone, e.g. `2026-03-08`. */
export function localDateOf(epochMs: number, timeZone: string): LocalDate {
  const parts = formatterFor(timeZone).formatToParts(epochMs);
  const pick = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

function toUtcDay(date: LocalDate): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** Pure calendar arithmetic (done in UTC), so a 23 or 25 hour DST day is still one day. */
export function addDays(date: LocalDate, days: number): LocalDate {
  return new Date(toUtcDay(date) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / MS_PER_DAY);
}
