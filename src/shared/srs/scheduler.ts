import {
  createEmptyCard,
  fsrs,
  Rating as TsRating,
  State as TsState,
  type Card as TsCard,
  type FSRS,
  type Grade,
} from 'ts-fsrs';
import { RATINGS } from '../constants';
import type { Card, Rating } from '../schemas';
import { toFsrsParameters } from './config';
import { formatInterval } from './format';

/** The FSRS fields of the shared `Card` (what is stored in D1 and sent to the client). */
export type FsrsState = Pick<
  Card,
  | 'due'
  | 'stability'
  | 'difficulty'
  | 'elapsedDays'
  | 'scheduledDays'
  | 'learningSteps'
  | 'reps'
  | 'lapses'
  | 'state'
  | 'lastReview'
>;

/**
 * One review as ts-fsrs logs it, in the app's shape. `state` is from before the grade. `due` is
 * ts-fsrs's own: the previous review time, or the due time of a card that was new.
 */
export interface ReviewLogEntry {
  rating: Rating;
  state: Card['state'];
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reviewedAt: number;
}

export interface GradeResult {
  card: FsrsState;
  log: ReviewLogEntry;
}

export type Scheduler = FSRS;

export function createScheduler(options: { enableFuzz?: boolean } = {}): Scheduler {
  return fsrs(toFsrsParameters(options));
}

const productionScheduler = createScheduler();

const STATE_TO_TS = {
  new: TsState.New,
  learning: TsState.Learning,
  review: TsState.Review,
  relearning: TsState.Relearning,
} as const satisfies Record<Card['state'], TsState>;

const STATE_FROM_TS = {
  [TsState.New]: 'new',
  [TsState.Learning]: 'learning',
  [TsState.Review]: 'review',
  [TsState.Relearning]: 'relearning',
} as const satisfies Record<TsState, Card['state']>;

const TS_GRADES = {
  1: TsRating.Again,
  2: TsRating.Hard,
  3: TsRating.Good,
  4: TsRating.Easy,
} as const satisfies Record<Rating, Grade>;

export function toTsCard(card: FsrsState): TsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_TO_TS[card.state],
    last_review: card.lastReview === null ? undefined : new Date(card.lastReview),
  };
}

export function fromTsCard(card: TsCard): FsrsState {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_FROM_TS[card.state],
    lastReview: card.last_review ? card.last_review.getTime() : null,
  };
}

/** A card that has never been reviewed; due right away. */
export function newCard(now: number): FsrsState {
  return fromTsCard(createEmptyCard(now));
}

/** The wait after each rating as grade-button labels, e.g. `{ 1: '1m', 2: '6m', 3: '10m', 4: '4d' }`. */
export function previewIntervals(
  card: FsrsState,
  now: number,
  scheduler: Scheduler = productionScheduler,
): Record<Rating, string> {
  const preview = scheduler.repeat(toTsCard(card), now);
  const labels = {} as Record<Rating, string>;
  for (const rating of RATINGS) {
    labels[rating] = formatInterval(preview[TS_GRADES[rating]].card.due.getTime() - now);
  }
  return labels;
}

/** The next state and the review log for one grade. The server's result is the one that is stored. */
export function grade(
  card: FsrsState,
  rating: Rating,
  now: number,
  scheduler: Scheduler = productionScheduler,
): GradeResult {
  const { card: next, log } = scheduler.next(toTsCard(card), now, TS_GRADES[rating]);
  return {
    card: fromTsCard(next),
    log: {
      rating,
      state: STATE_FROM_TS[log.state],
      due: log.due.getTime(),
      stability: log.stability,
      difficulty: log.difficulty,
      elapsedDays: log.elapsed_days,
      scheduledDays: log.scheduled_days,
      learningSteps: log.learning_steps,
      reviewedAt: log.review.getTime(),
    },
  };
}
