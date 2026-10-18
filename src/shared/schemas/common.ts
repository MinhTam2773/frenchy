import { z } from 'zod';

/** Ids of user data rows (cards, reviews). */
export const Uuid = z.uuid();

/** A UTC instant as integer milliseconds since the epoch. */
export const EpochMs = z.int().nonnegative();

/** A calendar date in the user's time zone, `YYYY-MM-DD`. */
export const LocalDate = z.iso.date();
export type LocalDate = z.infer<typeof LocalDate>;

export const TimeZone = z.string().refine(isTimeZone, 'Not an IANA time zone');

/** `ch10`, `ch33` or `appA`. */
export const ChapterId = z.string().regex(/^(?:ch[1-9]\d?|app[A-C])$/, 'Expected chNN or appX');
export type ChapterId = z.infer<typeof ChapterId>;

/** `<chapterId>-<slug>`, e.g. `ch10-le-matin-de-lea`. Same shape for deck card ids. */
export const ContentId = z
  .string()
  .regex(/^(?:ch[1-9]\d?|app[A-C])-[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected <chapterId>-<slug>');

/** Dotted lowercase, e.g. `er.present`, `numbers.0-100`. */
export const GrammarTagId = z
  .string()
  .regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/, 'Expected dotted lowercase, e.g. er.present');

export const Lemma = z.string().trim().min(1).max(80);

export const Gender = z.enum(['m', 'f']);

export const PartOfSpeech = z.enum([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'article',
  'determiner',
  'possessive',
  'preposition',
  'conjunction',
  'contraction',
  'number',
  'interjection',
  'name',
  'phrase',
]);
export type PartOfSpeech = z.infer<typeof PartOfSpeech>;

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Content id belongs to the chapter, e.g. `ch10-…` under `ch10`. */
export function belongsToChapter(id: string, chapterId: string): boolean {
  return id.startsWith(`${chapterId}-`);
}
