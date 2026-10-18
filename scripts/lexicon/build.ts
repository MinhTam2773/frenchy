/**
 * Builds `content/lexicon/{lemmas,forms}-<shard>.json` from two raw dumps that are never committed
 * (`raw/` is gitignored; set LEXICON_RAW_DIR to read them from elsewhere):
 *
 *   raw/kaikki-French.jsonl  https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl
 *   raw/Lexique383.tsv       https://www.lexique.org/databases/Lexique383/Lexique383.tsv
 *
 * Glosses, genders and inflection tables come from Wiktionary (via kaikki.org), frequency ranks
 * from Lexique 3.83. Licenses and attribution: docs/LICENSES.md. Run with `npm run lexicon:build`.
 */
import {
  createReadStream,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { gzipSync } from 'node:zlib';
import type { FormShard, LemmaShard } from '../../src/shared/lexicon/lookup.ts';
import { formKey, shardOf, SHARDS, type ShardId } from '../../src/shared/lexicon/key.ts';
import type { PartOfSpeech } from '../../src/shared/schemas/common.ts';
import type { FormEntry, Lexeme } from '../../src/shared/schemas/lexicon.ts';
import { contentWords } from './content.ts';

const ROOT = join(import.meta.dirname, '../..');
const RAW = process.env.LEXICON_RAW_DIR ?? join(import.meta.dirname, 'raw');
const OUT = join(ROOT, 'content/lexicon');
const TOP_LEXEMES = 10_000;
const BUDGET_GZIP_BYTES = 2 * 1024 * 1024;

const lp = (lemma: string, pos: string) => `${lemma}\t${pos}`;

type Reading = Omit<FormEntry, 'form' | 'lemma' | 'pos'>;
type LexemeGender = NonNullable<Lexeme['gender']>;

interface KaikkiForm {
  form: string;
  tags?: string[];
  source?: string;
}
interface KaikkiSense {
  glosses?: string[];
  tags?: string[];
  form_of?: unknown[];
}
interface KaikkiEntry {
  word: string;
  pos: string;
  senses?: KaikkiSense[];
  forms?: KaikkiForm[];
}

/** One lexeme while building: kaikki entries with the same lemma, part of speech and gender merged. */
interface Lex {
  lemma: string;
  pos: PartOfSpeech;
  gender?: LexemeGender;
  pluralOnly: boolean;
  glosses: string[];
  forms: KaikkiForm[];
  /** Contractions only. */
  parts?: string[];
  number?: 'sg' | 'pl';
}

const KAIKKI_POS: Record<string, PartOfSpeech> = {
  noun: 'noun',
  verb: 'verb',
  adj: 'adjective',
  adv: 'adverb',
  particle: 'adverb', // ne
  pron: 'pronoun',
  det: 'determiner', // or possessive, see posOf()
  article: 'article',
  prep: 'preposition',
  postp: 'preposition',
  conj: 'conjunction',
  num: 'number',
  intj: 'interjection',
  name: 'name',
  phrase: 'phrase',
  prep_phrase: 'phrase',
};

const LEXIQUE_POS: Record<string, PartOfSpeech> = {
  NOM: 'noun',
  VER: 'verb',
  AUX: 'verb',
  ADJ: 'adjective',
  ADV: 'adverb',
  PRE: 'preposition',
  CON: 'conjunction',
  ONO: 'interjection',
  'ART:def': 'article',
  'ART:ind': 'article',
  'PRO:per': 'pronoun',
  'PRO:dem': 'pronoun',
  'PRO:ind': 'pronoun',
  'PRO:int': 'pronoun',
  'PRO:pos': 'pronoun',
  'PRO:rel': 'pronoun',
  'ADJ:pos': 'possessive',
  'ADJ:dem': 'determiner',
  'ADJ:ind': 'determiner',
  'ADJ:int': 'determiner',
  'ADJ:num': 'number',
};

/** Wiktionary and Lexique split these classes differently (*tout*, *au*), so ranks match across them. */
const FUNCTION_CLASSES = new Set<PartOfSpeech>([
  'adjective',
  'article',
  'contraction',
  'determiner',
  'number',
  'possessive',
  'pronoun',
]);

/** Closed class, written by hand: Wiktionary's glosses for these are descriptions, not translations. */
const CONTRACTIONS: Pick<Lex, 'lemma' | 'parts' | 'number' | 'glosses'>[] = [
  { lemma: 'au', parts: ['à', 'le'], glosses: ['to the', 'at the', 'in the'] },
  { lemma: 'aux', parts: ['à', 'le'], number: 'pl', glosses: ['to the', 'at the', 'in the'] },
  { lemma: 'du', parts: ['de', 'le'], glosses: ['of the', 'from the'] },
  { lemma: 'des', parts: ['de', 'le'], number: 'pl', glosses: ['of the', 'from the'] },
];

/** Same reason: Wiktionary's glosses for these frequent function words describe usage. */
const GLOSS_OVERRIDES: Record<string, string[]> = {
  [lp('du', 'article')]: ['some', 'any'],
  [lp('de', 'article')]: ['any (after a negation)', 'some (before an adjective)'],
  [lp('pas', 'adverb')]: ['not'],
  [lp('en', 'pronoun')]: ['of it, of them', 'some, any', 'from there'],
  [lp('que', 'pronoun')]: ['what', 'that, which, whom'],
};

/** Lexique files the conjunction *que* under its pronoun readings. */
const FREQUENCY_ALIASES: Record<string, string> = {
  [lp('que', 'conjunction')]: lp('que', 'pronoun'),
};

/** Wiktionary tags only some possessive determiners as possessive (*ses*, *mes* aren't). */
const POSSESSIVES = new Set(
  'mon ton son ma ta sa mes tes ses notre votre leur nos vos leurs'.split(' '),
);

type ElisionReading = Reading & { lemma: string; pos: PartOfSpeech };

/** Elided forms are their own tokens (T-15 splits *l'homme*); Wiktionary lists them as alt-of entries. */
const ELISIONS: Record<string, ElisionReading[]> = {
  "l'": [
    { lemma: 'le', pos: 'article', number: 'sg', gender: 'm' },
    { lemma: 'le', pos: 'article', number: 'sg', gender: 'f' },
    { lemma: 'le', pos: 'pronoun', person: 3, number: 'sg', gender: 'm' },
    { lemma: 'la', pos: 'pronoun', person: 3, number: 'sg', gender: 'f' },
  ],
  "j'": [{ lemma: 'je', pos: 'pronoun', person: 1, number: 'sg' }],
  "m'": [{ lemma: 'me', pos: 'pronoun', person: 1, number: 'sg' }],
  "t'": [{ lemma: 'te', pos: 'pronoun', person: 2, number: 'sg' }],
  "s'": [
    { lemma: 'se', pos: 'pronoun', person: 3 },
    { lemma: 'si', pos: 'conjunction' },
  ],
  "n'": [{ lemma: 'ne', pos: 'adverb' }],
  "c'": [{ lemma: 'ce', pos: 'pronoun' }],
  "d'": [
    { lemma: 'de', pos: 'preposition' },
    { lemma: 'de', pos: 'article' },
  ],
  "qu'": [
    { lemma: 'que', pos: 'conjunction' },
    { lemma: 'que', pos: 'pronoun' },
  ],
  "jusqu'": [{ lemma: 'jusque', pos: 'preposition' }],
  "lorsqu'": [{ lemma: 'lorsque', pos: 'conjunction' }],
  "puisqu'": [{ lemma: 'puisque', pos: 'conjunction' }],
  "quoiqu'": [{ lemma: 'quoique', pos: 'conjunction' }],
};

const SKIPPED_SENSE_TAGS = new Set(['form-of', 'alt-of', 'obsolete', 'archaic', 'dated', 'rare']);
const MAX_GLOSS_LENGTH = 60;

/** Inflection-table tags we can express in a FormEntry; a form with any other tag is skipped. */
const FORM_TAGS = new Set([
  'first-person',
  'second-person',
  'third-person',
  'singular',
  'plural',
  'masculine',
  'feminine',
  'before-vowel',
  'present',
  'imperfect',
  'future',
  'historic',
  'past',
  'indicative',
  'subjunctive',
  'conditional',
  'imperative',
  'infinitive',
  'participle',
  'gerund',
]);

/** Lexique 3.83 lemma frequency (mean of films and books, per million words) by lemma + our pos. */
function readFrequencies(path: string): Map<string, number> {
  const [header, ...rows] = readFileSync(path, 'utf8').split('\n');
  const col = header.split('\t');
  const [lemme, cgram, films, livres] = ['lemme', 'cgram', 'freqlemfilms2', 'freqlemlivres'].map(
    (name) => col.indexOf(name),
  );
  const byCgram = new Map<string, number>();
  for (const row of rows) {
    const cells = row.split('\t');
    const pos = LEXIQUE_POS[cells[cgram]];
    if (!pos) continue;
    const key = lp(cells[lemme], cells[cgram]);
    const freq = (Number(cells[films]) + Number(cells[livres])) / 2;
    byCgram.set(key, Math.max(byCgram.get(key) ?? 0, freq));
  }
  const freq = new Map<string, number>();
  for (const [key, value] of byCgram) {
    const [lemma, code] = key.split('\t');
    const target = lp(lemma, LEXIQUE_POS[code]);
    freq.set(target, (freq.get(target) ?? 0) + value);
  }
  return freq;
}

function posOf(entry: KaikkiEntry): PartOfSpeech | undefined {
  const pos = KAIKKI_POS[entry.pos];
  return pos === 'determiner' && POSSESSIVES.has(entry.word) ? 'possessive' : pos;
}

function keptSenses(entry: KaikkiEntry): KaikkiSense[] {
  return (entry.senses ?? []).filter(
    (sense) => !sense.form_of && !sense.tags?.some((tag) => SKIPPED_SENSE_TAGS.has(tag)),
  );
}

/** A long gloss usually carries its translation before a usage note: "he (third-person …)". */
function shorten(gloss: string): string {
  if (gloss.length <= MAX_GLOSS_LENGTH) return gloss;
  return gloss
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/;\s*see usage notes.*$/i, '')
    .trim();
}

/** Up to three short glosses; nested senses keep only the innermost gloss. */
function glossesOf(senses: KaikkiSense[]): string[] {
  const all = [...new Set(senses.map((sense) => shorten(sense.glosses?.at(-1)?.trim() ?? '')))];
  const nonEmpty = all.filter(Boolean);
  const short = nonEmpty.filter((gloss) => gloss.length <= MAX_GLOSS_LENGTH);
  return (short.length > 0 ? short : nonEmpty).slice(0, 3);
}

const GENDERED = new Set<PartOfSpeech>([
  'noun',
  'name',
  'article',
  'determiner',
  'possessive',
  'pronoun',
]);

function genderOf(senses: KaikkiSense[], pos: PartOfSpeech): LexemeGender | undefined {
  if (!GENDERED.has(pos)) return undefined;
  const tags = new Set(senses.flatMap((sense) => sense.tags ?? []));
  const m = tags.has('masculine');
  const f = tags.has('feminine');
  if (m && f) return pos === 'noun' || pos === 'name' ? 'mf' : undefined;
  if (m) return 'm';
  if (f) return 'f';
  return undefined;
}

const PERSONS: Record<string, 1 | 2 | 3> = {
  'first-person': 1,
  'second-person': 2,
  'third-person': 3,
};

/** Maps one inflection-table cell's tags, or `null` if it can't be expressed exactly. */
function readingOf(tags: string[]): Reading | null {
  if (!tags.every((tag) => FORM_TAGS.has(tag))) return null;
  const has = (tag: string) => tags.includes(tag);
  const persons = tags.filter((tag) => tag in PERSONS);
  if (persons.length > 1) return null;
  const reading: Reading = {};
  if (persons.length === 1) reading.person = PERSONS[persons[0]];
  if (has('singular') !== has('plural')) reading.number = has('plural') ? 'pl' : 'sg';
  if (has('masculine') !== has('feminine')) reading.gender = has('feminine') ? 'f' : 'm';
  if (has('historic') && has('past')) reading.tense = 'simple_past';
  else if (has('past')) reading.tense = 'past';
  else if (has('present') || has('conditional')) reading.tense = 'present';
  else if (has('imperfect')) reading.tense = 'imperfect';
  else if (has('future')) reading.tense = 'future';
  if (has('participle') || has('gerund')) reading.mood = 'participle';
  else if (has('infinitive')) reading.mood = 'infinitive';
  else if (has('imperative')) reading.mood = 'imperative';
  else if (has('subjunctive')) reading.mood = 'subjunctive';
  else if (has('conditional')) reading.mood = 'conditional';
  else if (has('indicative')) reading.mood = 'indicative';
  return reading;
}

/** Key order follows the FormEntry schema so the JSON reads the same everywhere. */
function ordered(reading: Reading): Reading {
  const { person, number, gender, tense, mood, parts } = reading;
  return Object.fromEntries(
    Object.entries({ person, number, gender, tense, mood, parts }).filter(
      ([, v]) => v !== undefined,
    ),
  );
}

/** The readings a lexeme gives its own lemma and each of its inflected forms. */
function readingsOf(
  lex: Lex,
  isOtherLexeme: (form: string, pos: PartOfSpeech) => boolean,
  pastParticipleForms: Map<string, KaikkiForm[]>,
): [string, Reading][] {
  const out: [string, Reading][] = [];
  const add = (form: string, reading: Reading | null) => {
    if (!reading || /\s/.test(form)) return;
    if (form !== lex.lemma && isOtherLexeme(form, lex.pos)) return;
    out.push([form, ordered(reading)]);
  };
  const table = lex.pos === 'name' ? [] : lex.forms;
  const hasFeminine = table.some((f) => f.tags?.includes('feminine'));
  const hasPlural = table.some((f) => f.tags?.includes('plural'));
  const fixedGender = lex.gender === 'm' || lex.gender === 'f' ? lex.gender : undefined;

  switch (lex.pos) {
    case 'verb':
      add(lex.lemma, { mood: 'infinitive' });
      for (const { form, tags = [], source } of table) {
        if (source !== 'conjugation') continue;
        const reading = readingOf(tags);
        add(form, reading);
        if (reading?.mood !== 'participle' || reading.tense !== 'past') continue;
        for (const agreed of pastParticipleForms.get(form) ?? []) {
          const agreement = readingOf(agreed.tags ?? []);
          if (agreement && !agreement.mood && !agreement.person) {
            add(agreed.form, {
              number: agreement.number ?? 'sg',
              gender: agreement.gender,
              tense: 'past',
              mood: 'participle',
            });
          }
        }
      }
      break;
    case 'noun':
      add(lex.lemma, { number: lex.pluralOnly ? 'pl' : 'sg', gender: fixedGender });
      for (const { form, tags = [] } of table) {
        if (tags.length === 1 && tags[0] === 'plural')
          add(form, { number: 'pl', gender: fixedGender });
      }
      break;
    case 'contraction':
      add(lex.lemma, { number: lex.number, parts: lex.parts });
      break;
    default:
      if (!FUNCTION_CLASSES.has(lex.pos)) {
        add(lex.lemma, {});
        break;
      }
      add(lex.lemma, {
        number: hasPlural ? 'sg' : undefined,
        gender: hasFeminine ? 'm' : fixedGender,
      });
      for (const { form, tags = [] } of table) {
        const reading = readingOf(tags);
        if (!reading || reading.person || reading.tense || reading.mood) continue;
        if (!reading.gender && !reading.number) continue;
        add(form, { number: reading.number ?? 'sg', gender: reading.gender });
      }
  }
  const seen = new Set<string>();
  return out.filter(([form, reading]) => {
    const id = `${form}\t${JSON.stringify(reading)}`;
    return !seen.has(id) && seen.add(id);
  });
}

async function readKaikki(path: string, wanted: Set<string>) {
  const lexemes = new Map<string, Lex>();
  const pastParticipleForms = new Map<string, KaikkiForm[]>();
  const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of lines) {
    const entry = JSON.parse(line) as KaikkiEntry;
    const pos = posOf(entry);
    if (!pos) continue;
    const isPastParticiple = entry.senses?.some(
      (sense) => sense.form_of && sense.tags?.includes('participle') && sense.tags.includes('past'),
    );
    if (pos === 'verb' && isPastParticiple && entry.forms) {
      pastParticipleForms.set(entry.word, [
        ...(pastParticipleForms.get(entry.word) ?? []),
        ...entry.forms,
      ]);
    }
    // Elided forms (s', t') come from ELISIONS instead.
    if (!wanted.has(entry.word) || entry.word.endsWith("'")) continue;
    const senses = keptSenses(entry);
    const glosses = GLOSS_OVERRIDES[lp(entry.word, pos)] ?? glossesOf(senses);
    if (glosses.length === 0) continue;
    const gender = genderOf(senses, pos);
    // Only nouns split by gender (*le livre* book, *la livre* pound); other entries merge.
    const key = `${lp(entry.word, pos)}\t${pos === 'noun' || pos === 'name' ? (gender ?? '') : ''}`;
    const known = lexemes.get(key);
    const pluralOnly = senses.some((sense) => sense.tags?.includes('plural-only'));
    if (known) {
      known.glosses = [...new Set([...known.glosses, ...glosses])].slice(0, 3);
      known.forms.push(...(entry.forms ?? []));
      known.pluralOnly ||= pluralOnly;
    } else {
      lexemes.set(key, {
        lemma: entry.word,
        pos,
        gender,
        pluralOnly,
        glosses,
        forms: entry.forms ?? [],
      });
    }
  }
  return { lexemes: [...lexemes.values()], pastParticipleForms };
}

function writeShard(path: string, data: Record<string, unknown>): Buffer {
  const lines = Object.keys(data)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${JSON.stringify(data[key])}`);
  const text = lines.length > 0 ? `{\n${lines.join(',\n')}\n}\n` : '{}\n';
  writeFileSync(path, text);
  return Buffer.from(text);
}

async function main() {
  const frequencies = readFrequencies(join(RAW, 'Lexique383.tsv'));
  const familyFrequency = new Map<string, number>();
  for (const [key, value] of frequencies) {
    const [lemma, pos] = key.split('\t');
    if (FUNCTION_CLASSES.has(pos as PartOfSpeech)) {
      familyFrequency.set(lemma, Math.max(familyFrequency.get(lemma) ?? 0, value));
    }
  }
  const frequencyOf = (lemma: string, pos: PartOfSpeech) =>
    frequencies.get(FREQUENCY_ALIASES[lp(lemma, pos)] ?? lp(lemma, pos)) ??
    (FUNCTION_CLASSES.has(pos) ? familyFrequency.get(lemma) : undefined) ??
    0;

  const content = contentWords(join(ROOT, 'content'));
  const elisionTargets = Object.values(ELISIONS).flat();
  const wanted = new Set([
    ...[...frequencies.keys()].map((key) => key.split('\t')[0]),
    ...content.map((word) => word.lemma),
    ...elisionTargets.map((reading) => reading.lemma),
  ]);

  const kaikki = await readKaikki(join(RAW, 'kaikki-French.jsonl'), wanted);
  const all: Lex[] = [
    ...kaikki.lexemes,
    ...CONTRACTIONS.map((c) => ({
      ...c,
      pos: 'contraction' as const,
      pluralOnly: false,
      forms: [],
    })),
  ];
  const lexemeIds = new Set(all.map((lex) => lp(lex.lemma, lex.pos)));

  const ranked = [...lexemeIds]
    .map((id) => {
      const [lemma, pos] = id.split('\t');
      return { id, frequency: frequencyOf(lemma, pos as PartOfSpeech) };
    })
    .filter(({ frequency }) => frequency > 0)
    .sort((a, b) => b.frequency - a.frequency || (a.id < b.id ? -1 : 1));
  const rankOf = new Map(ranked.map(({ id }, index) => [id, index + 1]));
  const unranked = ranked.length + 1;

  const keep = new Set(ranked.slice(0, TOP_LEXEMES).map(({ id }) => id));
  for (const c of CONTRACTIONS) keep.add(lp(c.lemma, 'contraction'));
  for (const { lemma, pos } of elisionTargets) {
    if (!lexemeIds.has(lp(lemma, pos)))
      throw new Error(`Elision target missing: ${lemma} (${pos})`);
    keep.add(lp(lemma, pos));
  }
  for (const { lemma, pos } of content) {
    const sameLemma = [...lexemeIds].filter((id) => id.startsWith(`${lemma}\t`));
    const exact = sameLemma.filter((id) => id === lp(lemma, pos));
    for (const id of exact.length > 0 ? exact : sameLemma) keep.add(id);
  }

  const kept = all.filter((lex) => keep.has(lp(lex.lemma, lex.pos)));
  const rank = (lex: Pick<Lex, 'lemma' | 'pos'>) => rankOf.get(lp(lex.lemma, lex.pos)) ?? unranked;
  const isOtherLexeme = (form: string, pos: PartOfSpeech) => lexemeIds.has(lp(form, pos));

  const lemmaShards = Object.fromEntries(SHARDS.map((s) => [s, {}])) as Record<ShardId, LemmaShard>;
  const formShards = Object.fromEntries(SHARDS.map((s) => [s, {}])) as Record<ShardId, FormShard>;
  const formReadings = new Map<
    string,
    { rank: number; order: number; entry: Omit<FormEntry, 'form'> }[]
  >();
  let order = 0;
  const addReading = (form: string, entry: Omit<FormEntry, 'form'>, lexRank: number) => {
    const key = formKey(form);
    const list = formReadings.get(key) ?? [];
    if (list.some((r) => JSON.stringify(r.entry) === JSON.stringify(entry))) return;
    list.push({ rank: lexRank, order: order++, entry });
    formReadings.set(key, list);
  };

  for (const lex of kept.sort((a, b) => rank(a) - rank(b))) {
    (lemmaShards[shardOf(formKey(lex.lemma))][lex.lemma] ??= []).push({
      pos: lex.pos,
      ...(lex.gender && { gender: lex.gender }),
      glosses: lex.glosses,
      rank: rank(lex),
    });
    for (const [form, reading] of readingsOf(lex, isOtherLexeme, kaikki.pastParticipleForms)) {
      addReading(form, { lemma: lex.lemma, pos: lex.pos, ...reading }, rank(lex));
    }
  }
  for (const [form, readings] of Object.entries(ELISIONS)) {
    for (const { lemma, pos, ...reading } of readings) {
      addReading(form, { lemma, pos, ...ordered(reading) }, rank({ lemma, pos }));
    }
  }
  for (const [key, list] of formReadings) {
    list.sort((a, b) => a.rank - b.rank || a.order - b.order);
    formShards[shardOf(key)][key] = list.map((r) => r.entry);
  }

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  let raw = 0;
  let gzip = 0;
  for (const shard of SHARDS) {
    for (const [name, data] of [
      [`lemmas-${shard}.json`, lemmaShards[shard]],
      [`forms-${shard}.json`, formShards[shard]],
    ] as const) {
      const bytes = writeShard(join(OUT, name), data);
      raw += bytes.length;
      gzip += gzipSync(bytes).length;
    }
  }
  const readings = [...formReadings.values()].reduce((sum, list) => sum + list.length, 0);
  console.log(
    `${kept.length} lexemes (${keep.size} lemma+pos, ${content.length} content tokens), ` +
      `${formReadings.size} forms, ${readings} readings, ${readdirSync(OUT).length} files`,
  );
  console.log(`size: ${(raw / 1e6).toFixed(2)} MB raw, ${(gzip / 1e6).toFixed(2)} MB gzipped`);
  if (gzip > BUDGET_GZIP_BYTES) throw new Error(`Over the ${BUDGET_GZIP_BYTES} byte gzip budget`);
}

await main();
