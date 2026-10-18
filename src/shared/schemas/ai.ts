import { z } from 'zod';
import { MAX_AI_TEXT_LENGTH } from '../constants';
import { ChapterId } from './common';

const FrenchText = z.string().trim().min(1).max(MAX_AI_TEXT_LENGTH);

/** French → English. */
export const TranslateRequest = z.object({ text: FrenchText });
export type TranslateRequest = z.infer<typeof TranslateRequest>;

export const TranslateResponse = z.object({ translation: z.string().min(1) });
export type TranslateResponse = z.infer<typeof TranslateResponse>;

/** `chapterId` pitches the explanation at the grammar the learner has seen. */
export const ExplainRequest = z.object({ sentence: FrenchText, chapterId: ChapterId });
export type ExplainRequest = z.infer<typeof ExplainRequest>;

export const GlossPair = z.object({ fr: z.string().min(1), en: z.string().min(1) });
export type GlossPair = z.infer<typeof GlossPair>;

/** Also the shape the model must return as JSON (validated, one retry). */
export const ExplainResponse = z.object({
  translation: z.string().min(1),
  gloss: z.array(GlossPair).min(1),
  notes: z.array(z.string().min(1)).max(2),
});
export type ExplainResponse = z.infer<typeof ExplainResponse>;
