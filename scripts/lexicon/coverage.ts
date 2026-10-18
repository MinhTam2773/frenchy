/**
 * Lexicon coverage of the lesson texts: a word token counts as found when looking up its surface
 * form returns a reading with the token's annotated lemma. Lists every miss. Run with
 * `npm run lexicon:coverage`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FormShard } from '../../src/shared/lexicon/lookup';
import { formKey, shardOf, type ShardId } from '../../src/shared/lexicon/key';
import { contentWords } from './content';

const ROOT = join(import.meta.dirname, '../..');
const shards = new Map<ShardId, FormShard>();

function readingsOf(word: string) {
  const key = formKey(word);
  const shard = shardOf(key);
  if (!shards.has(shard)) {
    const path = join(ROOT, `content/lexicon/forms-${shard}.json`);
    shards.set(shard, JSON.parse(readFileSync(path, 'utf8')) as FormShard);
  }
  const forms = shards.get(shard) ?? {};
  return Object.hasOwn(forms, key) ? forms[key] : [];
}

const words = contentWords(join(ROOT, 'content'));
const misses: string[] = [];
let phraseTokens = 0;
for (const { t, lemma, pos, file } of words) {
  const readings = readingsOf(t);
  // No single form can carry a multi-word lemma (il y a), so a phrase token counts when the
  // lexicon knows its word, which is what a lookup can show for it.
  if (pos === 'phrase') phraseTokens++;
  if (pos === 'phrase' ? readings.length > 0 : readings.some((r) => r.lemma === lemma)) continue;
  const got =
    readings.length > 0
      ? `lexicon has ${[...new Set(readings.map((r) => r.lemma))].join(', ')}`
      : 'unknown form';
  misses.push(`${file}: "${t}" (${lemma}): ${got}`);
}

const found = words.length - misses.length;
const percent = words.length > 0 ? ((100 * found) / words.length).toFixed(1) : '100.0';
console.log(
  `Lexicon coverage: ${found}/${words.length} word tokens in content/ (${percent}%; ` +
    `${phraseTokens} phrase tokens counted by their word)`,
);
for (const miss of misses) console.log(`  miss ${miss}`);
