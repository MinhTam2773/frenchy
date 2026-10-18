import { describe, expect, it } from 'vitest';
import type { FormEntry } from '../schemas';
import { describeForm } from './describe';

/** A finite verb form: `verb('parle', 'parler', 3, 'sg', 'present', 'indicative')`. */
function verb(
  form: string,
  lemma: string,
  person: 1 | 2 | 3,
  number: 'sg' | 'pl',
  tense: FormEntry['tense'],
  mood: FormEntry['mood'],
): FormEntry {
  return { form, lemma, pos: 'verb', person, number, tense, mood };
}

const cases: [entry: FormEntry, expected: string | undefined][] = [
  [verb('parle', 'parler', 3, 'sg', 'present', 'indicative'), 'il / elle · present · -er verb'],
  [verb('vais', 'aller', 1, 'sg', 'present', 'indicative'), 'je · present · irregular'],
  [verb('finissons', 'finir', 1, 'pl', 'present', 'indicative'), 'nous · present · -ir verb'],
  [
    verb('vendaient', 'vendre', 3, 'pl', 'imperfect', 'indicative'),
    'ils / elles · imperfect · -re verb',
  ],
  [
    verb('parles', 'parler', 2, 'sg', 'present', 'subjunctive'),
    'tu · present subjunctive · -er verb',
  ],
  [verb('parleriez', 'parler', 2, 'pl', 'present', 'conditional'), 'vous · conditional · -er verb'],
  [
    verb('parla', 'parler', 3, 'sg', 'simple_past', 'indicative'),
    'il / elle · simple past · -er verb',
  ],
  [verb('mange', 'manger', 2, 'sg', 'present', 'imperative'), 'tu · imperative · -er verb'],
  [{ form: 'parler', lemma: 'parler', pos: 'verb', mood: 'infinitive' }, 'infinitive · -er verb'],
  [
    {
      form: 'allées',
      lemma: 'aller',
      pos: 'verb',
      tense: 'past',
      mood: 'participle',
      gender: 'f',
      number: 'pl',
    },
    'past participle · feminine plural · irregular',
  ],
  [{ form: 'heures', lemma: 'heure', pos: 'noun', gender: 'f', number: 'pl' }, 'feminine plural'],
  [{ form: 'les', lemma: 'le', pos: 'article', number: 'pl' }, 'plural'],
  [{ form: "j'", lemma: 'je', pos: 'pronoun', person: 1, number: 'sg' }, '1st person singular'],
  [{ form: 'au', lemma: 'au', pos: 'contraction', parts: ['à', 'le'] }, 'à + le'],
  [{ form: 'à', lemma: 'à', pos: 'preposition' }, undefined],
];

describe('describeForm', () => {
  it.each(cases)('%o → %s', (entry, expected) => {
    expect(describeForm(entry)).toBe(expected);
  });
});
