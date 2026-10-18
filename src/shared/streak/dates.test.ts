import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, localDateOf } from './dates';

const TORONTO = 'America/Toronto';

describe('localDateOf', () => {
  it('uses the time zone, not UTC', () => {
    const instant = Date.parse('2026-10-18T03:30:00Z');
    expect(localDateOf(instant, 'UTC')).toBe('2026-10-18');
    expect(localDateOf(instant, TORONTO)).toBe('2026-10-17');
    expect(localDateOf(instant, 'Asia/Tokyo')).toBe('2026-10-18');
  });

  it('switches days at local midnight on both sides of the spring-forward day (23 h)', () => {
    // Toronto jumps 02:00 EST -> 03:00 EDT on 2026-03-08, so that local day lasts 23 hours.
    expect(localDateOf(Date.parse('2026-03-08T04:59:59Z'), TORONTO)).toBe('2026-03-07');
    expect(localDateOf(Date.parse('2026-03-08T05:00:00Z'), TORONTO)).toBe('2026-03-08');
    expect(localDateOf(Date.parse('2026-03-09T03:59:59Z'), TORONTO)).toBe('2026-03-08');
    expect(localDateOf(Date.parse('2026-03-09T04:00:00Z'), TORONTO)).toBe('2026-03-09');
  });

  it('switches days at local midnight on both sides of the fall-back day (25 h)', () => {
    // Toronto repeats 01:00-02:00 on 2026-11-01, so that local day lasts 25 hours.
    expect(localDateOf(Date.parse('2026-11-01T03:59:59Z'), TORONTO)).toBe('2026-10-31');
    expect(localDateOf(Date.parse('2026-11-01T04:00:00Z'), TORONTO)).toBe('2026-11-01');
    expect(localDateOf(Date.parse('2026-11-02T04:59:59Z'), TORONTO)).toBe('2026-11-01');
    expect(localDateOf(Date.parse('2026-11-02T05:00:00Z'), TORONTO)).toBe('2026-11-02');
  });

  it('handles a zone with a half-hour offset', () => {
    expect(localDateOf(Date.parse('2026-10-17T18:29:00Z'), 'Asia/Kolkata')).toBe('2026-10-17');
    expect(localDateOf(Date.parse('2026-10-17T18:30:00Z'), 'Asia/Kolkata')).toBe('2026-10-18');
  });
});

describe('addDays and daysBetween', () => {
  it('moves across month, year and leap-day boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-10-17', 0)).toBe('2026-10-17');
  });

  it('counts one day over a DST change', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
    expect(daysBetween('2026-10-25', '2026-11-08')).toBe(14);
  });

  it('is negative when the second date is earlier', () => {
    expect(daysBetween('2026-10-17', '2026-10-10')).toBe(-7);
    expect(daysBetween('2026-10-17', '2026-10-17')).toBe(0);
  });
});
