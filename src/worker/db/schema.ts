import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
// Relative imports: drizzle-kit loads this file without the tsconfig path aliases.
import { CARD_TYPES, WORD_STATUSES } from '../../shared/constants';
import type { ProfileSettings } from '../../shared/schemas';

// Instants are integer ms UTC, local days are `YYYY-MM-DD` text (docs/api-contract.md).
// `user_id` holds Better Auth's `user.id`; T-13 owns that table, so there is no foreign key yet.

const CARD_STATES = ['new', 'learning', 'review', 'relearning'] as const;
const CARD_SOURCE_KINDS = ['starter', 'text', 'word', 'tutor'] as const;

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  currentChapterId: text('current_chapter_id'),
  timeZone: text('time_zone').notNull(),
  dailyGoalMinutes: integer('daily_goal_minutes').notNull(),
  settings: text('settings', { mode: 'json' }).$type<ProfileSettings>().notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const cards = sqliteTable(
  'cards',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    type: text('type', { enum: CARD_TYPES }).notNull(),
    front: text('front').notNull(),
    back: text('back').notNull(),
    clozeAnswer: text('cloze_answer'),
    hint: text('hint'),
    note: text('note'),
    sourceKind: text('source_kind', { enum: CARD_SOURCE_KINDS }).notNull(),
    sourceRef: text('source_ref').notNull(),
    due: integer('due').notNull(),
    stability: real('stability').notNull(),
    difficulty: real('difficulty').notNull(),
    elapsedDays: integer('elapsed_days').notNull(),
    scheduledDays: integer('scheduled_days').notNull(),
    learningSteps: integer('learning_steps').notNull(),
    reps: integer('reps').notNull(),
    lapses: integer('lapses').notNull(),
    state: text('state', { enum: CARD_STATES }).notNull(),
    lastReview: integer('last_review'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('cards_user_due_idx').on(t.userId, t.due),
    // `POST /api/cards` dedupes on type + front.
    uniqueIndex('cards_user_type_front_uq').on(t.userId, t.type, t.front),
  ],
);

export const reviews = sqliteTable(
  'reviews',
  {
    /**
     * Made by the client, so a retried or replayed POST is applied once. Unique per user, not
     * globally: another user's id can't collide (G-79).
     */
    id: text('id').notNull(),
    userId: text('user_id').notNull(),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    reviewedAt: integer('reviewed_at').notNull(),
    durationMs: integer('duration_ms').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index('reviews_user_reviewed_at_idx').on(t.userId, t.reviewedAt),
  ],
);

export const wordStatus = sqliteTable(
  'word_status',
  {
    userId: text('user_id').notNull(),
    lemma: text('lemma').notNull(),
    status: text('status', { enum: WORD_STATUSES }).notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lemma] })],
);

export const dailyActivity = sqliteTable(
  'daily_activity',
  {
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    minutes: integer('minutes').notNull().default(0),
    reviews: integer('reviews').notNull().default(0),
    readings: integer('readings').notNull().default(0),
    freezeUsed: integer('freeze_used', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);

/**
 * One row per clock minute with activity. `POST /api/activity/ping` inserts with
 * `onConflictDoNothing` and adds a minute to `daily_activity` only when a row was inserted.
 */
export const activityMinutes = sqliteTable(
  'activity_minutes',
  {
    userId: text('user_id').notNull(),
    /** Epoch ms at the start of the clock minute (`at - at % 60_000`). */
    minute: integer('minute').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.minute] })],
);

/**
 * One row per text per local day it was finished: the key makes a reading count once per text
 * per day, and the earliest `finished_at` per text is the user's first finish.
 */
export const textReads = sqliteTable(
  'text_reads',
  {
    userId: text('user_id').notNull(),
    textId: text('text_id').notNull(),
    date: text('date').notNull(),
    finishedAt: integer('finished_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.textId, t.date] })],
);

/** Shared across users: the AI result for a text doesn't depend on who asked. */
export const translationCache = sqliteTable('translation_cache', {
  /** Hash of task + normalized text + level (T-23). */
  key: text('key').primaryKey(),
  task: text('task').notNull(),
  text: text('text').notNull(),
  result: text('result', { mode: 'json' }).notNull(),
  provider: text('provider').notNull(),
  createdAt: integer('created_at').notNull(),
});

/**
 * Per-user AI requests per clock hour (T-23 rate limit, G-21). A fixed window: the route adds one
 * per provider call and deletes the user's older windows in the same batch.
 */
export const aiUsage = sqliteTable(
  'ai_usage',
  {
    userId: text('user_id').notNull(),
    /** Epoch ms at the start of the clock hour. */
    windowStart: integer('window_start').notNull(),
    requests: integer('requests').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.windowStart] })],
);

/** Shared across users: provider calls per UTC day for the whole app (T-29 daily cap, G-10). */
export const aiDailyUsage = sqliteTable('ai_daily_usage', {
  /** `YYYY-MM-DD` in UTC. */
  day: text('day').primaryKey(),
  requests: integer('requests').notNull(),
});
