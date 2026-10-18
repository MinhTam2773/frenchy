import type { FormEntry, Lexeme } from '../schemas';
import { formKey, shardOf, type ShardId } from './key';

/** `content/lexicon/lemmas-<shard>.json`: lemma → its lexemes (one per part of speech or gender). */
export type LemmaShard = Record<string, Omit<Lexeme, 'lemma'>[]>;
/** `content/lexicon/forms-<shard>.json`: form key → readings, most frequent lexeme first. */
export type FormShard = Record<string, Omit<FormEntry, 'form'>[]>;

const lemmaShards = new Map<ShardId, Promise<LemmaShard>>();
const formShards = new Map<ShardId, Promise<FormShard>>();

// Template-literal imports let Vite split one chunk per shard; every shard id has a file (build.ts).
function loadLemmas(shard: ShardId): Promise<LemmaShard> {
  let shardData = lemmaShards.get(shard);
  if (!shardData) {
    shardData = import(`../../../content/lexicon/lemmas-${shard}.json`).then(
      (m: { default: LemmaShard }) => m.default,
    );
    lemmaShards.set(shard, shardData);
  }
  return shardData;
}

function loadForms(shard: ShardId): Promise<FormShard> {
  let shardData = formShards.get(shard);
  if (!shardData) {
    shardData = import(`../../../content/lexicon/forms-${shard}.json`).then(
      (m: { default: FormShard }) => m.default,
    );
    formShards.set(shard, shardData);
  }
  return shardData;
}

/**
 * Every reading of a surface form (*vais* → aller, 1sg present indicative), most frequent lexeme
 * first. Case and apostrophe style don't matter. Loads only the form's shard. `[]` if unknown.
 */
export async function lookupForm(form: string): Promise<FormEntry[]> {
  const key = formKey(form);
  if (!key) return [];
  const shard = await loadForms(shardOf(key));
  return (Object.hasOwn(shard, key) ? shard[key] : []).map((reading) => ({
    form: key,
    ...reading,
  }));
}

/** The lexemes (glosses, gender, rank) for an exact lemma, as `FormEntry.lemma` names it. */
export async function lookupLemma(lemma: string): Promise<Lexeme[]> {
  const shard = await loadLemmas(shardOf(formKey(lemma)));
  return (Object.hasOwn(shard, lemma) ? shard[lemma] : []).map((lexeme) => ({ lemma, ...lexeme }));
}
