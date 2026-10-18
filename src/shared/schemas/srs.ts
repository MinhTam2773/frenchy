import { z } from 'zod';
import { CARD_TYPES, CLOZE_BLANK, DUE_LIMIT, RATINGS } from '../constants';
import { EpochMs, Uuid } from './common';

export const CardType = z.enum(CARD_TYPES);
export type CardType = z.infer<typeof CardType>;

/** Same states as ts-fsrs, as strings so rows and JSON stay readable. */
export const CardState = z.enum(['new', 'learning', 'review', 'relearning']);
export type CardState = z.infer<typeof CardState>;

export const Rating = z.literal(RATINGS);
export type Rating = z.infer<typeof Rating>;

/**
 * What a card shows. `sentence_meaning`: French front, English back. `meaning_sentence`: English
 * front, French back. `cloze`: French front with one `___`, the full sentence as back.
 */
export const cardContentShape = {
  type: CardType,
  front: z.string().trim().min(1).max(500),
  back: z.string().trim().min(1).max(500),
  clozeAnswer: z.string().trim().min(1).max(80).optional(),
  /** Shown with the front (e.g. "parler · We speak French at home."). */
  hint: z.string().trim().min(1).max(200).optional(),
  /** Shown with the back (e.g. "nous takes the -ons ending."). */
  note: z.string().trim().min(1).max(300).optional(),
};

type CardContentFields = { type: CardType; front: string; back: string; clozeAnswer?: string };

/** A cloze has exactly one blank and an answer that turns the front into the back. */
export function checkCloze<T extends CardContentFields>(card: T, ctx: z.RefinementCtx<T>): void {
  if (card.type !== 'cloze') {
    if (card.clozeAnswer !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['clozeAnswer'],
        message: 'Only cloze cards have an answer',
      });
    }
    return;
  }
  if (card.front.split(CLOZE_BLANK).length !== 2) {
    ctx.addIssue({
      code: 'custom',
      path: ['front'],
      message: `A cloze front needs exactly one ${CLOZE_BLANK}`,
    });
    return;
  }
  if (card.clozeAnswer === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['clozeAnswer'],
      message: 'A cloze card needs an answer',
    });
    return;
  }
  if (card.front.replace(CLOZE_BLANK, card.clozeAnswer) !== card.back) {
    ctx.addIssue({
      code: 'custom',
      path: ['back'],
      message: 'Back must be the front with the blank filled in',
    });
  }
}

export const CardSource = z.object({
  kind: z.enum(['starter', 'text', 'word', 'tutor']),
  /** starter: deck card id · text: text id · word: lemma · tutor: message id. */
  ref: z.string().min(1).max(200),
});
export type CardSource = z.infer<typeof CardSource>;

/** ts-fsrs `Card` fields, camelCased, with dates as epoch ms. */
export const fsrsShape = {
  due: EpochMs,
  stability: z.number().nonnegative(),
  difficulty: z.number().nonnegative(),
  elapsedDays: z.int().nonnegative(),
  scheduledDays: z.int().nonnegative(),
  learningSteps: z.int().nonnegative(),
  reps: z.int().nonnegative(),
  lapses: z.int().nonnegative(),
  state: CardState,
  lastReview: EpochMs.nullable(),
};

export const Card = z
  .object({
    id: Uuid,
    ...cardContentShape,
    source: CardSource,
    ...fsrsShape,
    createdAt: EpochMs,
    updatedAt: EpochMs,
  })
  .superRefine(checkCloze);
export type Card = z.infer<typeof Card>;

/** `POST /api/cards`. The server assigns the id and a new FSRS state. */
export const CardCreate = z
  .object({ ...cardContentShape, source: CardSource })
  .superRefine(checkCloze);
export type CardCreate = z.infer<typeof CardCreate>;

/** `POST /api/reviews`. `id` is made by the client so a retried POST is applied once. */
export const ReviewInput = z.object({
  id: Uuid,
  cardId: Uuid,
  rating: Rating,
  reviewedAt: EpochMs,
  durationMs: z.int().nonnegative().max(3_600_000),
});
export type ReviewInput = z.infer<typeof ReviewInput>;

export const DueCardsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(DUE_LIMIT.max).default(DUE_LIMIT.default),
});
export type DueCardsQuery = z.infer<typeof DueCardsQuery>;

export const DueCardsResponse = z.object({ cards: z.array(Card) });
export type DueCardsResponse = z.infer<typeof DueCardsResponse>;

/** Due cards now, split by state (`learning` includes relearning). */
export const CardStats = z.object({
  due: z.int().nonnegative(),
  new: z.int().nonnegative(),
  learning: z.int().nonnegative(),
  review: z.int().nonnegative(),
  /** Earliest future due time, for "All caught up"; null when there are no cards. */
  nextDueAt: EpochMs.nullable(),
});
export type CardStats = z.infer<typeof CardStats>;

export const StarterDeckResult = z.object({
  added: z.int().nonnegative(),
  total: z.int().nonnegative(),
});
export type StarterDeckResult = z.infer<typeof StarterDeckResult>;
