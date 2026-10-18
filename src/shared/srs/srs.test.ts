import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { RATINGS } from '../constants';
import { FIXTURE_NOW, reviewCards } from '../fixtures';
import { fsrsShape } from '../schemas';
import {
  FSRS_CONFIG,
  createScheduler,
  formatInterval,
  fromTsCard,
  grade,
  newCard,
  previewIntervals,
  toTsCard,
  type FsrsState,
} from '.';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const FsrsFields = z.object(fsrsShape);

// Fuzz off: the schedule depends only on the card, the rating and the clock.
const exact = createScheduler({ enableFuzz: false });

/** A new card learned today and reviewed on time twice more (Good, Good, Good). */
function matureCard(): FsrsState {
  let card = newCard(FIXTURE_NOW);
  for (let i = 0; i < 3; i++) card = grade(card, 3, card.due, exact).card;
  return card;
}

describe('formatInterval', () => {
  it.each([
    [0, '1m'],
    [30_000, '1m'],
    [MINUTE, '1m'],
    [6 * MINUTE, '6m'],
    [59 * MINUTE, '59m'],
    [60 * MINUTE, '1h'],
    [5 * 60 * MINUTE, '5h'],
    [DAY, '1d'],
    [4 * DAY, '4d'],
    [29 * DAY, '29d'],
    [30 * DAY, '1mo'],
    [90 * DAY, '3mo'],
    [364 * DAY, '1y'],
    [365 * DAY, '1y'],
    [548 * DAY, '1.5y'],
  ])('%d ms -> %s', (ms, label) => {
    expect(formatInterval(ms)).toBe(label);
  });
});

describe('newCard', () => {
  it('is new, due now and valid against the shared FSRS fields', () => {
    const card = newCard(FIXTURE_NOW);
    expect(card).toMatchObject({ state: 'new', due: FIXTURE_NOW, reps: 0, lapses: 0 });
    expect(card.lastReview).toBeNull();
    expect(() => FsrsFields.parse(card)).not.toThrow();
  });
});

describe('mapping to and from ts-fsrs', () => {
  it('round-trips every fixture card', () => {
    for (const { due, stability, difficulty, elapsedDays, scheduledDays, ...rest } of reviewCards) {
      const fsrs: FsrsState = {
        due,
        stability,
        difficulty,
        elapsedDays,
        scheduledDays,
        learningSteps: rest.learningSteps,
        reps: rest.reps,
        lapses: rest.lapses,
        state: rest.state,
        lastReview: rest.lastReview,
      };
      expect(fromTsCard(toTsCard(fsrs))).toEqual(fsrs);
    }
  });

  it('uses Dates for ts-fsrs and leaves lastReview unset for a null', () => {
    const ts = toTsCard(newCard(FIXTURE_NOW));
    expect(ts.due).toEqual(new Date(FIXTURE_NOW));
    expect(ts.last_review).toBeUndefined();
  });
});

describe('previewIntervals', () => {
  it('labels a new card with the learning steps, then a day count for Easy', () => {
    expect(previewIntervals(newCard(FIXTURE_NOW), FIXTURE_NOW, exact)).toEqual({
      1: '1m',
      2: '6m',
      3: '10m',
      4: '8d',
    });
  });

  it('gives one label for each rating and never shrinks from Hard to Easy', () => {
    const card = matureCard();
    const labels = previewIntervals(card, card.due, exact);
    expect(Object.keys(labels).map(Number)).toEqual([...RATINGS]);
    const waits = [2, 3, 4].map(
      (rating) => grade(card, rating as 2 | 3 | 4, card.due, exact).card.due,
    );
    expect(waits).toEqual([...waits].sort((a, b) => a - b));
  });

  it('works for every fixture card and uses the production scheduler by default', () => {
    for (const card of reviewCards) {
      const labels = previewIntervals(card, FIXTURE_NOW);
      for (const rating of RATINGS) expect(labels[rating]).toMatch(/^\d+(\.\d)?(m|h|d|mo|y)$/);
    }
  });

  it('matches what grade() then schedules', () => {
    const card = matureCard();
    const labels = previewIntervals(card, card.due, exact);
    for (const rating of RATINGS) {
      const next = grade(card, rating, card.due, exact).card;
      expect(labels[rating]).toBe(formatInterval(next.due - card.due));
    }
  });
});

describe('grade', () => {
  it('puts a new card on Good in the future, in learning', () => {
    const { card, log } = grade(newCard(FIXTURE_NOW), 3, FIXTURE_NOW, exact);
    expect(card.state).toBe('learning');
    expect(card.due).toBe(FIXTURE_NOW + 10 * MINUTE);
    expect(card.reps).toBe(1);
    expect(card.lastReview).toBe(FIXTURE_NOW);
    expect(log).toMatchObject({ rating: 3, state: 'new', reviewedAt: FIXTURE_NOW });
  });

  it('graduates to review after the learning steps', () => {
    const card = matureCard();
    expect(card.state).toBe('review');
    expect(card.due).toBeGreaterThan(card.lastReview ?? 0);
    expect(card.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it('Again on a review card lowers stability, counts a lapse and relearns', () => {
    const before = matureCard();
    const { card, log } = grade(before, 1, before.due, exact);
    expect(card.stability).toBeLessThan(before.stability);
    expect(card.lapses).toBe(before.lapses + 1);
    expect(card.state).toBe('relearning');
    expect(card.due).toBe(before.due + 10 * MINUTE);
    expect(log.state).toBe('review');
  });

  it('Good on time raises stability', () => {
    const before = matureCard();
    expect(grade(before, 3, before.due, exact).card.stability).toBeGreaterThan(before.stability);
  });

  it('is deterministic under a fixed clock with fuzz off, and does not change its input', () => {
    const before = matureCard();
    const copy = { ...before };
    const a = grade(before, 3, before.due, exact);
    const b = grade(before, 3, before.due, createScheduler({ enableFuzz: false }));
    expect(a).toEqual(b);
    expect(before).toEqual(copy);
  });

  it('is repeatable with fuzz on too, so the server can recompute the same state', () => {
    const before = matureCard();
    const a = grade(before, 3, before.due);
    expect(grade(before, 3, before.due)).toEqual(a);
  });

  it('caps Hard at the maximum; Good and Easy may pass it by 1 and 2 days (L-35)', () => {
    const long: FsrsState = { ...matureCard(), stability: 10_000, scheduledDays: 300, reps: 20 };
    const days = ([2, 3, 4] as const).map(
      (r) => grade(long, r, long.due, exact).card.scheduledDays,
    );
    expect(days).toEqual([
      FSRS_CONFIG.maximumInterval,
      FSRS_CONFIG.maximumInterval + 1,
      FSRS_CONFIG.maximumInterval + 2,
    ]);
  });

  it('returns state that passes the shared schema, including through JSON', () => {
    const { card } = grade(matureCard(), 2, FIXTURE_NOW + 3 * DAY, exact);
    expect(FsrsFields.parse(JSON.parse(JSON.stringify(card)))).toEqual(card);
  });
});
