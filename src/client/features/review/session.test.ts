import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, reviewCards } from '@shared/fixtures';
import type { Card, Rating } from '@shared/schemas';
import {
  capNewCards,
  computeStats,
  correctPercent,
  currentCard,
  formatDuration,
  frenchToSpeak,
  sessionReducer,
  startSession,
  type SessionState,
} from './session';

const [review, cloze, fresh] = reviewCards;
const T0 = FIXTURE_NOW;

function graded(
  state: SessionState,
  rating: Rating,
  revealAt: number,
  gradeAt: number,
  id: string,
) {
  const revealed = sessionReducer(state, { type: 'reveal', at: revealAt });
  return sessionReducer(revealed, { type: 'grade', rating, at: gradeAt, id });
}

describe('capNewCards', () => {
  const newCards: Card[] = [1, 2, 3, 4].map((n) => ({
    ...fresh,
    id: `00000000-0000-4000-8000-00000000010${n}`,
  }));

  it('keeps the first N new cards and every other card, in order', () => {
    const list = [newCards[0], review, newCards[1], newCards[2], cloze, newCards[3]];
    expect(capNewCards(list, 2)).toEqual([newCards[0], review, newCards[1], cloze]);
  });

  it('leaves a short list alone', () => {
    expect(capNewCards(reviewCards, 10)).toEqual(reviewCards);
  });
});

describe('sessionReducer', () => {
  const start = startSession(reviewCards, T0);

  it('reveals once and keeps the first reveal time', () => {
    const once = sessionReducer(start, { type: 'reveal', at: T0 + 2000 });
    expect(once.revealedAt).toBe(T0 + 2000);
    expect(sessionReducer(once, { type: 'reveal', at: T0 + 9000 }).revealedAt).toBe(T0 + 2000);
  });

  it('ignores a grade before the answer is shown', () => {
    const state = sessionReducer(start, { type: 'grade', rating: 3, at: T0 + 1000, id: 'x' });
    expect(state).toBe(start);
  });

  it('grades at the reveal time, measures the answer time, and moves on', () => {
    const next = graded(start, 3, T0 + 2000, T0 + 5000, '00000000-0000-4000-8000-0000000000a1');
    expect(next.index).toBe(1);
    expect(currentCard(next)).toBe(cloze);
    expect(next.revealedAt).toBeNull();
    expect(next.shownAt).toBe(T0 + 5000);
    expect(next.undoable).toBe(true);
    expect(next.results[0].review).toEqual({
      id: '00000000-0000-4000-8000-0000000000a1',
      cardId: review.id,
      rating: 3,
      reviewedAt: T0 + 2000,
      durationMs: 5000,
    });
  });

  it('caps the answer time at the contract maximum', () => {
    const next = graded(start, 1, T0, T0 + 2 * 3_600_000, 'a');
    expect(next.results[0].review.durationMs).toBe(3_600_000);
  });

  it('finishes after the last card', () => {
    let state = start;
    for (const [i, rating] of ([3, 2, 4] as const).entries()) {
      state = graded(state, rating, T0 + i * 10_000, T0 + i * 10_000 + 1000, `id-${i}`);
    }
    expect(currentCard(state)).toBeUndefined();
    expect(state.results).toHaveLength(3);
  });

  it('undoes the last grade: same card, answer still shown, result dropped', () => {
    const next = graded(start, 1, T0 + 2000, T0 + 4000, 'a');
    const back = sessionReducer(next, { type: 'undo' });
    expect(currentCard(back)).toBe(review);
    expect(back.revealedAt).toBe(T0 + 2000);
    expect(back.shownAt).toBe(T0);
    expect(back.results).toEqual([]);
    expect(back.undoable).toBe(false);
  });

  it('allows one step of undo only', () => {
    const second = graded(
      graded(start, 3, T0 + 1000, T0 + 2000, 'a'),
      3,
      T0 + 3000,
      T0 + 4000,
      'b',
    );
    const once = sessionReducer(second, { type: 'undo' });
    expect(once.results.map((r) => r.review.id)).toEqual(['a']);
    expect(sessionReducer(once, { type: 'undo' })).toBe(once);
  });

  it('has nothing to undo at the start', () => {
    expect(sessionReducer(start, { type: 'undo' })).toBe(start);
  });
});

describe('stats', () => {
  /** One card after another, each answered `durationMs` after it appeared. */
  const results = (ratings: Rating[], durationMs = 1000) =>
    ratings.reduce<SessionState>(
      (state, rating, i) =>
        graded(state, rating, state.shownAt, state.shownAt + durationMs, `id-${i}`),
      startSession(
        ratings.map(() => review),
        T0,
      ),
    ).results;

  it('counts Good and Easy as correct, Again and Hard as not', () => {
    const stats = computeStats(results([1, 2, 3, 4, 3, 1]));
    expect(stats).toMatchObject({ cards: 6, correct: 3 });
    expect(correctPercent(stats)).toBe(50);
    expect(correctPercent(computeStats(results([3, 4, 1])))).toBe(67);
  });

  it('matches the mockup: 16 of 18 is 89%', () => {
    expect(correctPercent({ cards: 18, correct: 16, durationMs: 0 })).toBe(89);
  });

  it('adds up the answer times', () => {
    expect(computeStats(results([3, 3, 3], 4000)).durationMs).toBe(12_000);
  });

  it('is zero for an empty session', () => {
    const stats = computeStats([]);
    expect(stats).toEqual({ cards: 0, correct: 0, durationMs: 0 });
    expect(correctPercent(stats)).toBe(0);
  });

  it('formats the time as seconds, minutes, then hours', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45_400)).toBe('45s');
    expect(formatDuration(11 * 60_000)).toBe('11m');
    expect(formatDuration(89_000)).toBe('1m');
    expect(formatDuration(60 * 60_000)).toBe('1h');
    expect(formatDuration(65 * 60_000)).toBe('1h 5m');
  });
});

describe('frenchToSpeak', () => {
  it('reads the French sentence on a sentence card', () => {
    expect(frenchToSpeak(review, false)).toBe(review.front);
  });

  it('reads a cloze with a pause for the blank, then the full sentence once revealed', () => {
    expect(frenchToSpeak(cloze, false)).toBe('Nous , français à la maison.');
    expect(frenchToSpeak(cloze, true)).toBe(cloze.back);
  });

  it('has no French to read on an English front', () => {
    expect(frenchToSpeak(fresh, false)).toBeNull();
    expect(frenchToSpeak(fresh, true)).toBe(fresh.back);
  });
});
