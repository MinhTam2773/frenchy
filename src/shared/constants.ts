export const CARD_TYPES = ['sentence_meaning', 'meaning_sentence', 'cloze'] as const;

export const CARD_TYPE_LABELS = {
  sentence_meaning: 'Sentence → meaning',
  meaning_sentence: 'Meaning → sentence',
  cloze: 'Cloze',
} as const satisfies Record<(typeof CARD_TYPES)[number], string>;

/** The one blank a cloze card's `front` must contain. */
export const CLOZE_BLANK = '___';

/** FSRS ratings: 1 Again, 2 Hard, 3 Good, 4 Easy (same numbers as ts-fsrs). */
export const RATINGS = [1, 2, 3, 4] as const;

export const GRADE_LABELS = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
} as const satisfies Record<(typeof RATINGS)[number], string>;

export const WORD_STATUSES = ['new', 'learning', 'known'] as const;

export const DAILY_GOAL_OPTIONS = [15, 30, 45, 60] as const;

export const TTS_RATE = { min: 0.6, max: 1, default: 0.8 } as const;

/** `GET /api/cards/due?limit=` bounds. */
export const DUE_LIMIT = { default: 20, max: 100 } as const;

/** New cards introduced per local day, applied by the server to `due` and `stats`. */
export const NEW_CARDS_PER_DAY = 10;

/** Most new words a lesson text may introduce (checked by `content:check`). */
export const MAX_NEW_WORDS_PER_TEXT = 8;

/** Longest text the AI endpoints accept, to cap cost per request. */
export const MAX_AI_TEXT_LENGTH = 500;
