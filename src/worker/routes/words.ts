import { Lemma, WordStatus, WordStatusPut, WordsResponse } from '../../shared/schemas';
import { schema } from '../db';
import { parseInput, readJson, respond, syncRouter, userDb } from './sync-common';

const { wordStatus } = schema;

export const wordsRoute = syncRouter()
  .get('/', async (c) => {
    const rows = await userDb(c).wordStatus.select();
    return respond(c, WordsResponse, {
      words: rows.map(({ lemma, status }) => ({ lemma, status })),
    });
  })
  .put('/:lemma', async (c) => {
    // Hono has already decoded the path parameter (`pr%C3%A9f%C3%A9rer` → `préférer`).
    const lemma = parseInput(Lemma, c.req.param('lemma'), 'lemma');
    const { status } = parseInput(WordStatusPut, await readJson(c), 'body');
    const updatedAt = Date.now();
    await userDb(c)
      .wordStatus.insert({ lemma, status, updatedAt })
      .onConflictDoUpdate({
        target: [wordStatus.userId, wordStatus.lemma],
        set: { status, updatedAt },
      });
    return respond(c, WordStatus, { lemma, status });
  });
