import type { FormEntry } from '../schemas';

const SUBJECTS: Record<string, string> = {
  '1sg': 'je',
  '2sg': 'tu',
  '3sg': 'il / elle',
  '1pl': 'nous',
  '2pl': 'vous',
  '3pl': 'ils / elles',
};
const ORDINALS = { 1: '1st', 2: '2nd', 3: '3rd' } as const;
const TENSES: Record<NonNullable<FormEntry['tense']>, string> = {
  present: 'present',
  imperfect: 'imperfect',
  future: 'future',
  simple_past: 'simple past',
  past: 'past',
};
const GENDERS = { m: 'masculine', f: 'feminine' } as const;
const NUMBERS = { sg: 'singular', pl: 'plural' } as const;

/** Verbs that don't follow their ending's pattern; the word sheet says "irregular" for them. */
const IRREGULAR = new Set([
  'être',
  'avoir',
  'aller',
  'faire',
  'pouvoir',
  'vouloir',
  'savoir',
  'devoir',
  'venir',
  'tenir',
  'prendre',
  'mettre',
  'dire',
  'voir',
  'connaître',
  'boire',
  'croire',
  'écrire',
  'lire',
  'vivre',
  'recevoir',
  'falloir',
  'pleuvoir',
]);

/**
 * The form line of the word sheet: *parle* (3sg present) → "il / elle · present · -er verb",
 * *heures* → "feminine plural", *au* → "à + le". `undefined` when there is nothing to say.
 */
export function describeForm(entry: FormEntry): string | undefined {
  if (entry.parts) return entry.parts.join(' + ');
  const parts = entry.pos === 'verb' ? verbParts(entry) : otherParts(entry);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function verbParts(entry: FormEntry): string[] {
  const parts: string[] = [];
  const subject = entry.person && SUBJECTS[`${entry.person}${entry.number ?? 'sg'}`];
  if (subject) parts.push(subject);
  const tenseMood = tenseMoodLabel(entry);
  if (tenseMood) parts.push(tenseMood);
  const agreement = genderNumber(entry);
  if (entry.mood === 'participle' && agreement) parts.push(agreement);
  parts.push(verbGroup(entry.lemma));
  return parts;
}

function tenseMoodLabel({ tense, mood }: FormEntry): string | undefined {
  const tenseLabel = tense && TENSES[tense];
  switch (mood) {
    case 'subjunctive':
      return `${tenseLabel ?? 'present'} subjunctive`;
    case 'conditional':
    case 'imperative':
    case 'infinitive':
      return mood;
    case 'participle':
      return tenseLabel ? `${tenseLabel} participle` : 'participle';
    default:
      return tenseLabel;
  }
}

function verbGroup(lemma: string): string {
  if (IRREGULAR.has(lemma)) return 'irregular';
  const ending = /(er|ir|re)$/.exec(lemma)?.[1];
  return ending ? `-${ending} verb` : 'verb';
}

function otherParts(entry: FormEntry): string[] {
  if (entry.person) {
    const person = `${ORDINALS[entry.person]} person`;
    return [entry.number ? `${person} ${NUMBERS[entry.number]}` : person];
  }
  const label = genderNumber(entry);
  return label ? [label] : [];
}

/** "feminine plural", "masculine", "plural", or "" when neither is known. */
function genderNumber({ gender, number }: FormEntry): string {
  return [gender && GENDERS[gender], number && NUMBERS[number]].filter(Boolean).join(' ');
}
