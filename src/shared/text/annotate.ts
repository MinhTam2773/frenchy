import { formKey } from '../lexicon/key';
import { lookupForm, lookupLemma } from '../lexicon/lookup';
import type { FormEntry, Lexeme, PartOfSpeech, Token } from '../schemas';
import { describeForm } from './describe';
import { isWordText, type TextToken } from './tokenize';

/** What the word sheet shows for one tapped word. */
export interface WordInfo {
  /** `content`: the lesson's own annotation. `rule`: numbers, times, the euphonic *t*. */
  source: 'content' | 'lexicon' | 'rule' | 'unknown';
  /** The word as written. */
  word: string;
  /** For `unknown`, the word's lookup key. */
  lemma: string;
  pos?: PartOfSpeech;
  gender?: Lexeme['gender'];
  /** The lesson's gloss in context, or the lexeme's glosses; `[]` when unknown. */
  glosses: string[];
  /** The form line, e.g. "il / elle · present · -er verb". */
  form?: string;
  isNew?: true;
  /** Set when the word is part of a fixed phrase, e.g. *est-ce que*. */
  phrase?: { text: string; gloss: string };
  /** Every lexicon reading, best first (`[]` unless `source` is `lexicon`). */
  readings: FormEntry[];
}

/** Lesson tokens and `tokenize()` output can be mixed; lesson word tokens carry a `lemma`. */
export type AnyToken = Token | TextToken;

/**
 * Annotates `tokens[index]` (a word): the lesson annotation if it has one; else lexicon readings
 * ranked by simple context rules; else `unknown`. Pass the word's sentence (or more) as `tokens`.
 */
export async function annotate(tokens: readonly AnyToken[], index: number): Promise<WordInfo> {
  const token = tokens[index];
  if (!isWordText(token.t)) throw new RangeError(`Token ${index} is not a word: "${token.t}"`);
  if ('lemma' in token) {
    return {
      source: 'content',
      word: token.t,
      lemma: token.lemma,
      pos: token.pos,
      gender: token.gender,
      glosses: [token.gloss],
      form: token.form,
      isNew: token.isNew,
      readings: [],
    };
  }
  return byRule(tokens, index) ?? (await fromLexicon(tokens, index));
}

const SPACE = /^\s+$/;
const HYPHEN = /^[-‐‑]$/;

type Subject = { person: 1 | 2 | 3; number: 'sg' | 'pl' };
const SUBJECTS: Record<string, Subject> = {
  je: { person: 1, number: 'sg' },
  "j'": { person: 1, number: 'sg' },
  tu: { person: 2, number: 'sg' },
  il: { person: 3, number: 'sg' },
  elle: { person: 3, number: 'sg' },
  on: { person: 3, number: 'sg' },
  "c'": { person: 3, number: 'sg' },
  ça: { person: 3, number: 'sg' },
  cela: { person: 3, number: 'sg' },
  nous: { person: 1, number: 'pl' },
  vous: { person: 2, number: 'pl' },
  ils: { person: 3, number: 'pl' },
  elles: { person: 3, number: 'pl' },
};
/** Words that can sit between a subject pronoun and its verb (*je ne le vois pas*). */
const BETWEEN_SUBJECT_AND_VERB = new Set([
  'ne',
  "n'",
  'me',
  "m'",
  'te',
  "t'",
  'se',
  "s'",
  'le',
  'la',
  'les',
  "l'",
  'lui',
  'leur',
  'y',
  'en',
  'nous',
  'vous',
]);
const DETERMINERS = new Set([
  'le',
  'la',
  'les',
  "l'",
  'un',
  'une',
  'des',
  'du',
  'au',
  'aux',
  'mon',
  'ma',
  'mes',
  'ton',
  'ta',
  'tes',
  'son',
  'sa',
  'ses',
  'notre',
  'nos',
  'votre',
  'vos',
  'leur',
  'leurs',
  'ce',
  'cet',
  'cette',
  'ces',
]);
/** Abbreviations → the word to look up (case matters: *M.* is monsieur, *m* is a metre). */
const ABBREVIATIONS: Record<string, string> = {
  'M.': 'monsieur',
  'MM.': 'messieurs',
  Mme: 'madame',
  'Mme.': 'madame',
  Mlle: 'mademoiselle',
  'Mlle.': 'mademoiselle',
  Dr: 'docteur',
  'Dr.': 'docteur',
};

type Pattern = readonly (readonly string[])[];
const QUE = ['que', "qu'"];
const PHRASES: { pattern: Pattern; text: string; gloss: string }[] = [
  {
    pattern: [["qu'"], ['est'], ['-'], ['ce'], [' '], QUE],
    text: "qu'est-ce que",
    gloss: 'what (asks a question)',
  },
  {
    pattern: [['est'], ['-'], ['ce'], [' '], QUE],
    text: 'est-ce que',
    gloss: 'turns a sentence into a yes/no question (no word-for-word translation)',
  },
];

/** Comparable text: words by lookup key, gaps as `' '`, `'-'` or verbatim. */
function keyOf(token: AnyToken): string {
  if (isWordText(token.t)) return formKey(token.t);
  if (SPACE.test(token.t)) return ' ';
  return HYPHEN.test(token.t) ? '-' : token.t;
}

function byRule(tokens: readonly AnyToken[], index: number): WordInfo | undefined {
  const word = tokens[index].t;
  const rule = (lemma: string, gloss: string, form: string, pos?: PartOfSpeech): WordInfo => ({
    source: 'rule',
    word,
    lemma,
    pos,
    glosses: [gloss],
    form,
    readings: [],
  });
  const time = /^(\d{1,2})\s?h\s?(\d{2})?$/u.exec(word);
  if (time) return rule(word, `${time[1]}:${time[2] ?? '00'}`, 'time of day', 'number');
  const ordinal = /^(\d+)(?:er|re|e|ème|eme)$/u.exec(word);
  if (ordinal) return rule(word, englishOrdinal(ordinal[1]), 'ordinal number', 'number');
  if (/^\d+(?:\s\d{3})*(?:[.,]\d+)?$/u.test(word)) {
    return rule(word, word.replace(/,(\d+)$/u, '.$1').replace(/\s/gu, ','), 'number', 'number');
  }
  const before = tokens[index - 1];
  const after = tokens[index + 1];
  if (formKey(word) === 't' && before && after && keyOf(before) === '-' && keyOf(after) === '-') {
    return rule('t', '(no meaning: added between two vowel sounds)', 'euphonic t, as in a-t-il');
  }
  return undefined;
}

function englishOrdinal(digits: string): string {
  const n = Number(digits);
  const suffix =
    n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${digits}${suffix}`;
}

async function fromLexicon(tokens: readonly AnyToken[], index: number): Promise<WordInfo> {
  const word = tokens[index].t;
  const abbreviation = Object.hasOwn(ABBREVIATIONS, word) ? ABBREVIATIONS[word] : undefined;
  let readings = await lookupForm(abbreviation ?? word);
  const next = tokens.at(index + 1);
  if (word === 'A' && isSentenceStart(tokens, index) && (!next || keyOf(next) !== '-')) {
    // Capitals often drop their accent: a sentence can't open with the verb *a*, so it is *À*.
    readings = [...(await lookupForm('à')), ...readings];
  }
  if (readings.length === 0) {
    return { source: 'unknown', word, lemma: formKey(word), glosses: [], readings: [] };
  }
  readings = rank(readings, tokens, index);
  const [best] = readings;
  const lexemes = await lookupLemma(best.lemma);
  const lexeme =
    lexemes.find((l) => l.pos === best.pos && (!best.gender || l.gender === best.gender)) ??
    lexemes.find((l) => l.pos === best.pos);
  return {
    source: 'lexicon',
    word,
    lemma: best.lemma,
    pos: best.pos,
    gender: best.gender ?? lexeme?.gender,
    glosses: lexeme?.glosses ?? [],
    form: abbreviation ? `abbreviation of ${abbreviation}` : describeForm(best),
    phrase: findPhrase(tokens, index),
    readings,
  };
}

/** Stable sort by context score, so ties keep the lexicon's frequency order. */
function rank(readings: FormEntry[], tokens: readonly AnyToken[], index: number): FormEntry[] {
  const subject = findSubject(tokens, index);
  const previous = previousWord(tokens, index);
  const afterDeterminer = !subject && previous !== undefined && DETERMINERS.has(keyOf(previous));
  const score = (r: FormEntry): number => {
    if (subject) {
      const finite = r.pos === 'verb' && r.person !== undefined ? 1 : 0;
      const agrees = r.person === subject.person && r.number === subject.number ? 2 : 0;
      return finite + agrees;
    }
    if (afterDeterminer) return r.pos === 'noun' ? 2 : r.pos === 'adjective' ? 1 : 0;
    return 0;
  };
  return readings
    .map((reading, order) => ({ reading, order, score: score(reading) }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ reading }) => reading);
}

/** The subject pronoun of the word if it is a verb: after it (*parles-tu*) or before it. */
function findSubject(tokens: readonly AnyToken[], index: number): Subject | undefined {
  const keys = tokens.slice(index + 1, index + 5).map(keyOf);
  const inverted = keys[0] === '-' && (keys[1] === 't' && keys[2] === '-' ? keys[3] : keys[1]);
  if (inverted && Object.hasOwn(SUBJECTS, inverted)) return SUBJECTS[inverted];

  let leftmostSkipped: string | undefined;
  for (let i = index - 1; i >= 0; i--) {
    const key = keyOf(tokens[i]);
    if (!isWordText(tokens[i].t)) {
      if (/[.!?…]/u.test(key)) break;
      continue;
    }
    if (Object.hasOwn(SUBJECTS, key) && !BETWEEN_SUBJECT_AND_VERB.has(key)) return SUBJECTS[key];
    if (!BETWEEN_SUBJECT_AND_VERB.has(key)) return undefined;
    leftmostSkipped = key;
  }
  // Sentence-initial *nous* / *vous* before the verb is the subject (*nous nous levons*).
  return leftmostSkipped === 'nous' || leftmostSkipped === 'vous'
    ? SUBJECTS[leftmostSkipped]
    : undefined;
}

function previousWord(tokens: readonly AnyToken[], index: number): AnyToken | undefined {
  for (let i = index - 1; i >= 0; i--) {
    if (isWordText(tokens[i].t)) return tokens[i];
    if (!SPACE.test(tokens[i].t)) return undefined;
  }
  return undefined;
}

function isSentenceStart(tokens: readonly AnyToken[], index: number): boolean {
  for (let i = index - 1; i >= 0; i--) {
    if (isWordText(tokens[i].t)) return false;
    if (/[.!?…]/u.test(tokens[i].t)) return true;
  }
  return true;
}

function findPhrase(tokens: readonly AnyToken[], index: number): WordInfo['phrase'] {
  for (const { pattern, text, gloss } of PHRASES) {
    for (let offset = 0; offset < pattern.length; offset++) {
      const from = index - offset;
      if (from < 0 || from + pattern.length > tokens.length) continue;
      if (pattern.every((alternatives, i) => alternatives.includes(keyOf(tokens[from + i])))) {
        return { text, gloss };
      }
    }
  }
  return undefined;
}
