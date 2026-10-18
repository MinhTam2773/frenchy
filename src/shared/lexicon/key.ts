/** Every shard that exists on disk: one per base letter, plus `other` for anything else. */
export const SHARDS = [...'abcdefghijklmnopqrstuvwxyz', 'other'] as const;
export type ShardId = (typeof SHARDS)[number];

/** The lookup key for a surface form: NFC, lower case, typographic apostrophes folded to `'`. */
export function formKey(word: string): string {
  return word.normalize('NFC').trim().toLocaleLowerCase('fr').replace(/[’‘ʼ]/g, "'");
}

/** The shard a key lives in: its first letter without accents (*é* → e, *œ* → o). */
export function shardOf(key: string): ShardId {
  const first = key
    .charAt(0)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace('œ', 'o')
    .replace('æ', 'a');
  return /^[a-z]$/.test(first) ? (first as ShardId) : 'other';
}
