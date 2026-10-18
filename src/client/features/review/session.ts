import { z } from 'zod';
import { CLOZE_BLANK } from '@shared/constants';
import type { Card, Rating, ReviewInput } from '@shared/schemas';

const MAX_DURATION_MS = 3_600_000; // ReviewInput.durationMs

/** The server caps new cards too; this keeps a stale or mocked list in line. */
export function capNewCards(cards: Card[], maxNew: number): Card[] {
  let seen = 0;
  return cards.filter((card) => card.state !== 'new' || ++seen <= maxNew);
}

export interface Result {
  card: Card;
  review: ReviewInput;
  shownAt: number;
  revealedAt: number;
}

export interface SessionState {
  cards: Card[];
  /** The card on screen; equals `cards.length` once the last one is graded. */
  index: number;
  /** When the card appeared; the answer time is measured from here. */
  shownAt: number;
  /**
   * When the answer was revealed. The grade labels are previewed at this instant and the review is
   * posted with it as `reviewedAt`, so the server grades at the same `now` (G-29).
   */
  revealedAt: number | null;
  results: Result[];
  /** One step only: true after a grade, false again after an undo. */
  undoable: boolean;
}

export type SessionAction =
  | { type: 'reveal'; at: number }
  | { type: 'grade'; rating: Rating; at: number; id: string }
  | { type: 'undo' };

export function startSession(cards: Card[], at: number): SessionState {
  return { cards, index: 0, shownAt: at, revealedAt: null, results: [], undoable: false };
}

export function currentCard(state: SessionState): Card | undefined {
  return state.cards[state.index];
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  const card = currentCard(state);
  switch (action.type) {
    case 'reveal':
      return card && state.revealedAt === null ? { ...state, revealedAt: action.at } : state;
    case 'grade': {
      if (!card || state.revealedAt === null) return state;
      const review: ReviewInput = {
        id: action.id,
        cardId: card.id,
        rating: action.rating,
        reviewedAt: state.revealedAt,
        durationMs: Math.min(MAX_DURATION_MS, Math.max(0, action.at - state.shownAt)),
      };
      const result: Result = { card, review, shownAt: state.shownAt, revealedAt: state.revealedAt };
      return {
        ...state,
        index: state.index + 1,
        shownAt: action.at,
        revealedAt: null,
        results: [...state.results, result],
        undoable: true,
      };
    }
    case 'undo': {
      const last = state.results.at(-1);
      if (!state.undoable || !last) return state;
      return {
        ...state,
        index: state.index - 1,
        shownAt: last.shownAt,
        revealedAt: last.revealedAt,
        results: state.results.slice(0, -1),
        undoable: false,
      };
    }
  }
}

export const SessionStats = z.object({
  cards: z.int().nonnegative(),
  /** Good and Easy. */
  correct: z.int().nonnegative(),
  durationMs: z.int().nonnegative(),
  /** The streak before this session, to say "Up from N". Absent when it could not be read. */
  streakBefore: z.object({ current: z.int().nonnegative(), todayDone: z.boolean() }).optional(),
});
export type SessionStats = z.infer<typeof SessionStats>;

export function computeStats(results: Result[]): SessionStats {
  return {
    cards: results.length,
    correct: results.filter(({ review }) => review.rating >= 3).length,
    durationMs: results.reduce((sum, { review }) => sum + review.durationMs, 0),
  };
}

/** Share of Good + Easy among the graded cards, as a whole percent. 0 for an empty session. */
export function correctPercent({ cards, correct }: SessionStats): number {
  return cards === 0 ? 0 : Math.round((correct / cards) * 100);
}

/** "45s", "11m", "1h 5m". */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const rest = minutes % 60;
  return rest === 0 ? `${minutes / 60}h` : `${Math.floor(minutes / 60)}h ${rest}m`;
}

/**
 * The French the play button reads, or null when none is on screen yet. A cloze reads a comma for
 * the blank until the answer is shown, so the audio does not give it away.
 */
export function frenchToSpeak(card: Card, revealed: boolean): string | null {
  switch (card.type) {
    case 'sentence_meaning':
      return card.front;
    case 'meaning_sentence':
      return revealed ? card.back : null;
    case 'cloze':
      return revealed ? card.back : card.front.replace(CLOZE_BLANK, ',');
  }
}
