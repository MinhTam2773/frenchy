import { z } from 'zod';
import {
  belongsToChapter,
  ChapterId,
  ContentId,
  Gender,
  GrammarTagId,
  Lemma,
  PartOfSpeech,
} from './common';
import { cardContentShape, checkCloze } from './srs';

// Content files are strict so a typo in a field name fails `content:check` instead of vanishing.

const PdfPage = z.int().min(1);
const Week = z.int().min(1).max(60);

export const ChapterSection = z.strictObject({
  label: z.string().min(1),
  pdfStart: PdfPage,
  pdfEnd: PdfPage,
});
export type ChapterSection = z.infer<typeof ChapterSection>;

export const Chapter = z
  .strictObject({
    id: ChapterId,
    /** As printed in the book: `"10"`, or `"A"` for an appendix. */
    number: z.string().regex(/^(?:[1-9]\d?|[A-C])$/),
    title: z.string().min(1),
    /** For the path map and settings, e.g. "-er verbs". */
    shortTitle: z.string().min(1).max(24),
    kind: z.enum(['appendix', 'grammar', 'conversation']),
    pdfStart: PdfPage,
    pdfEnd: PdfPage,
    weekStart: Week,
    weekEnd: Week,
    sections: z.array(ChapterSection),
  })
  .refine(
    (ch) => ch.pdfStart <= ch.pdfEnd && ch.weekStart <= ch.weekEnd,
    'Ranges must not end before they start',
  );
export type Chapter = z.infer<typeof Chapter>;

export const Stage = z.strictObject({
  id: z.string().regex(/^stage[1-9]$/),
  number: z.int().min(1),
  title: z.string().min(1),
  /** CEFR range shown on the stage banner, e.g. "A1" or "A1–A2". */
  level: z.string().min(1),
  weekStart: Week,
  weekEnd: Week,
  /** In beginner route order. */
  chapters: z.array(Chapter).min(1),
});
export type Stage = z.infer<typeof Stage>;

/** `content/course.json`. Stage and chapter order is the learning route. */
export const Course = z.strictObject({ stages: z.array(Stage).min(1) });
export type Course = z.infer<typeof Course>;

export const GrammarTag = z.strictObject({
  id: GrammarTagId,
  label: z.string().min(1),
  /** The chapter that introduces it. */
  chapterId: ChapterId,
});
export type GrammarTag = z.infer<typeof GrammarTag>;

/** `content/grammar.json`, in the order the tags are introduced. */
export const Grammar = z.array(GrammarTag);
export type Grammar = z.infer<typeof Grammar>;

/** A word the reader can tap. `form` is the line shown in the word sheet. */
export const WordToken = z.strictObject({
  t: z.string().regex(/[\p{L}\p{N}]/u, 'A word token needs a letter or digit'),
  lemma: Lemma,
  pos: PartOfSpeech,
  gender: Gender.optional(),
  /** Translation in this context, e.g. "goes" for *va*. */
  gloss: z.string().min(1),
  form: z.string().min(1).optional(),
  isNew: z.literal(true).optional(),
});
export type WordToken = z.infer<typeof WordToken>;

/** Spaces and punctuation between words, kept verbatim. */
export const GapToken = z.strictObject({
  t: z.string().regex(/^[^\p{L}\p{N}]+$/u, 'A gap token holds only spaces and punctuation'),
});
export type GapToken = z.infer<typeof GapToken>;

export const Token = z.union([WordToken, GapToken]);
export type Token = z.infer<typeof Token>;

/** Joining every token's `t` gives the sentence text. */
export const Sentence = z.strictObject({
  tokens: z.array(Token).min(1),
  en: z.string().min(1),
});
export type Sentence = z.infer<typeof Sentence>;

/** Sentences in a paragraph are joined by one space. `speaker` is for dialogues. */
export const Paragraph = z.strictObject({
  speaker: z.string().min(1).optional(),
  sentences: z.array(Sentence).min(1),
});
export type Paragraph = z.infer<typeof Paragraph>;

export const Text = z
  .strictObject({
    id: ContentId,
    chapterId: ChapterId,
    title: z.string().min(1),
    kind: z.enum(['story', 'dialogue']),
    minutes: z.int().min(1).max(30),
    paragraphs: z.array(Paragraph).min(1),
    /** Lemmas of the tokens marked `isNew`. */
    newWords: z.array(Lemma),
    grammarTags: z.array(GrammarTagId),
  })
  .refine((text) => belongsToChapter(text.id, text.chapterId), {
    path: ['id'],
    message: 'Text id must start with its chapterId',
  })
  .refine((text) => sameSet(text.newWords, newWordLemmas(text.paragraphs)), {
    path: ['newWords'],
    message: 'newWords must list exactly the lemmas of the tokens marked isNew',
  });
export type Text = z.infer<typeof Text>;

export const DeckCard = z
  .strictObject({
    id: ContentId,
    ...cardContentShape,
    /** The text the sentence comes from, if any. */
    textId: ContentId.optional(),
  })
  .superRefine(checkCloze);
export type DeckCard = z.infer<typeof DeckCard>;

/** `content/chapters/<chapterId>/deck.json`. */
export const Deck = z
  .strictObject({ chapterId: ChapterId, cards: z.array(DeckCard).min(1) })
  .refine((deck) => deck.cards.every((card) => belongsToChapter(card.id, deck.chapterId)), {
    path: ['cards'],
    message: 'Deck card ids must start with the deck chapterId',
  });
export type Deck = z.infer<typeof Deck>;

/** One row of a pattern table; `ending` is the suffix of `fr` to highlight. */
export const PatternRow = z
  .strictObject({
    label: z.string().min(1),
    fr: z.string().min(1),
    ending: z.string().min(1).optional(),
  })
  .refine((row) => row.ending === undefined || row.fr.endsWith(row.ending), {
    path: ['ending'],
    message: 'ending must be a suffix of fr',
  });
export type PatternRow = z.infer<typeof PatternRow>;

/** `content/chapters/<chapterId>/note.json`: the pattern card on the chapter page. */
export const GrammarNote = z.strictObject({
  chapterId: ChapterId,
  /** French headword, e.g. "parler". */
  title: z.string().min(1),
  /** English, e.g. "to speak". */
  subtitle: z.string().min(1).optional(),
  rows: z.array(PatternRow).min(1),
  tip: z.string().min(1),
});
export type GrammarNote = z.infer<typeof GrammarNote>;

function newWordLemmas(paragraphs: Paragraph[]): string[] {
  return paragraphs.flatMap((p) =>
    p.sentences.flatMap((s) =>
      s.tokens.flatMap((tok) => ('isNew' in tok && tok.isNew ? [tok.lemma] : [])),
    ),
  );
}

function sameSet(a: string[], b: string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((x) => right.has(x));
}
