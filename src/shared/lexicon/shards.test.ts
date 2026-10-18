/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { FormEntry, Lexeme } from '../schemas';
import { formKey, shardOf, SHARDS } from './key';
import type { FormShard, LemmaShard } from './lookup';

const DIR = join(import.meta.dirname, '../../../content/lexicon');
const read = (name: string) => readFileSync(join(DIR, name));
const lemmaShards = SHARDS.map(
  (s) => [s, JSON.parse(read(`lemmas-${s}.json`).toString()) as LemmaShard] as const,
);
const formShards = SHARDS.map(
  (s) => [s, JSON.parse(read(`forms-${s}.json`).toString()) as FormShard] as const,
);

describe('content/lexicon shards', () => {
  it('has exactly one lemma and one form shard per shard id', () => {
    const expected = SHARDS.flatMap((s) => [`forms-${s}.json`, `lemmas-${s}.json`]).sort();
    expect(readdirSync(DIR).sort()).toEqual(expected);
  });

  it('fits the 2 MB gzip budget', () => {
    const gzipped = readdirSync(DIR).reduce((sum, name) => sum + gzipSync(read(name)).length, 0);
    expect(gzipped).toBeLessThanOrEqual(2 * 1024 * 1024);
  });

  it('holds valid lexemes, filed under the right shard', () => {
    for (const [shard, data] of lemmaShards) {
      for (const [lemma, lexemes] of Object.entries(data)) {
        expect(shardOf(formKey(lemma))).toBe(shard);
        expect(lexemes.length).toBeGreaterThan(0);
        for (const lexeme of lexemes) Lexeme.parse({ lemma, ...lexeme });
      }
    }
  });

  it('holds valid form entries under normalized keys, each pointing at a known lexeme', () => {
    const lexemes = new Set(
      lemmaShards.flatMap(([, data]) =>
        Object.entries(data).flatMap(([lemma, list]) => list.map((l) => `${lemma} ${l.pos}`)),
      ),
    );
    for (const [shard, data] of formShards) {
      for (const [form, readings] of Object.entries(data)) {
        expect(formKey(form)).toBe(form);
        expect(shardOf(form)).toBe(shard);
        expect(readings.length).toBeGreaterThan(0);
        for (const reading of readings) {
          FormEntry.parse({ form, ...reading });
          if (!lexemes.has(`${reading.lemma} ${reading.pos}`)) {
            expect.fail(`${form}: no lexeme ${reading.lemma} (${reading.pos})`);
          }
        }
      }
    }
  });
});
