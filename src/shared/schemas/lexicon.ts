import { z } from 'zod';
import { Lemma, PartOfSpeech } from './common';

/** `mf` is for nouns used with either article (*un/une élève*). */
export const LexemeGender = z.enum(['m', 'f', 'mf']);

export const Lexeme = z.strictObject({
  lemma: Lemma,
  pos: PartOfSpeech,
  gender: LexemeGender.optional(),
  glosses: z.array(z.string().min(1)).min(1).max(3),
  /** 1 = most frequent. */
  rank: z.int().min(1),
});
export type Lexeme = z.infer<typeof Lexeme>;

/** One reading of an inflected form, e.g. *vais* → aller, 1st person singular present indicative. */
export const FormEntry = z.strictObject({
  form: z.string().min(1),
  lemma: Lemma,
  pos: PartOfSpeech,
  person: z.literal([1, 2, 3]).optional(),
  number: z.enum(['sg', 'pl']).optional(),
  gender: z.enum(['m', 'f']).optional(),
  tense: z.enum(['present', 'imperfect', 'future', 'simple_past', 'past']).optional(),
  mood: z
    .enum(['indicative', 'subjunctive', 'conditional', 'imperative', 'infinitive', 'participle'])
    .optional(),
  /** Contractions: *au* → `['à', 'le']`. */
  parts: z.array(Lemma).min(2).optional(),
});
export type FormEntry = z.infer<typeof FormEntry>;
