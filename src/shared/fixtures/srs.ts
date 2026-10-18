import type { Card, CardCreate, CardStats, DeckCard, ReviewInput } from '../schemas';
import { daysAgo, FIXTURE_NOW, minutesAgo } from './clock';
import { ch10Deck } from './content';

const [listenCard, clozeCard, catCard] = ch10Deck.cards;

function fromDeck(deckCard: DeckCard): CardCreate {
  const { type, front, back, clozeAnswer, hint, note } = deckCard;
  return {
    type,
    front,
    back,
    clozeAnswer,
    hint,
    note,
    source: { kind: 'starter', ref: deckCard.id },
  };
}

const fsrsNew = {
  due: daysAgo(1),
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  learningSteps: 0,
  reps: 0,
  lapses: 0,
  state: 'new',
  lastReview: null,
} as const;

/** The three cards of `Review.dc.html`, all due: one in review, one learning, one new. */
export const reviewCards: Card[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    ...fromDeck(listenCard),
    ...fsrsNew,
    due: minutesAgo(30),
    stability: 3.2,
    difficulty: 5.1,
    elapsedDays: 3,
    scheduledDays: 3,
    reps: 3,
    state: 'review',
    lastReview: daysAgo(3),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    ...fromDeck(clozeCard),
    ...fsrsNew,
    due: minutesAgo(5),
    stability: 0.4,
    difficulty: 6.4,
    learningSteps: 1,
    reps: 1,
    state: 'learning',
    lastReview: minutesAgo(15),
    createdAt: daysAgo(1),
    updatedAt: minutesAgo(15),
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    ...fromDeck(catCard),
    ...fsrsNew,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

/** `Practice.dc.html`: 18 due = 5 new + 4 learning + 9 review. */
export const cardStats: CardStats = {
  due: 18,
  new: 5,
  learning: 4,
  review: 9,
  nextDueAt: FIXTURE_NOW + 60 * 60_000,
};

export const allCaughtUpStats: CardStats = { ...cardStats, due: 0, new: 0, learning: 0, review: 0 };

export const reviewInput: ReviewInput = {
  id: '00000000-0000-4000-8000-0000000000a1',
  cardId: '00000000-0000-4000-8000-000000000001',
  rating: 3,
  reviewedAt: FIXTURE_NOW,
  durationMs: 6200,
};

/** "Save word" on *voisin* in the reader. */
export const wordCardCreate: CardCreate = {
  type: 'sentence_meaning',
  front: 'le voisin',
  back: 'the neighbor',
  source: { kind: 'word', ref: 'voisin' },
};
