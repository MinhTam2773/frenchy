import { z } from 'zod';
import { WORD_STATUSES } from '../constants';
import { Lemma } from './common';

export const WordStatusValue = z.enum(WORD_STATUSES);
export type WordStatusValue = z.infer<typeof WordStatusValue>;

export const WordStatus = z.object({ lemma: Lemma, status: WordStatusValue });
export type WordStatus = z.infer<typeof WordStatus>;

export const WordsResponse = z.object({ words: z.array(WordStatus) });
export type WordsResponse = z.infer<typeof WordsResponse>;

/** `PUT /api/words/:lemma` body. */
export const WordStatusPut = z.object({ status: WordStatusValue });
export type WordStatusPut = z.infer<typeof WordStatusPut>;
