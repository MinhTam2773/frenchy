import type { FormEntry, Lexeme } from '../schemas';

export const lexemes: Lexeme[] = [
  { lemma: 'le', pos: 'article', gender: 'm', glosses: ['the'], rank: 1 },
  { lemma: 'aller', pos: 'verb', glosses: ['to go'], rank: 30 },
  { lemma: 'heure', pos: 'noun', gender: 'f', glosses: ['hour', 'o’clock', 'time'], rank: 120 },
  { lemma: 'préférer', pos: 'verb', glosses: ['to prefer'], rank: 610 },
  { lemma: 'élève', pos: 'noun', gender: 'mf', glosses: ['pupil', 'student'], rank: 1450 },
];

/** The T-08 test cases: vais, préfère, heures, l', au. */
export const forms: FormEntry[] = [
  {
    form: 'vais',
    lemma: 'aller',
    pos: 'verb',
    person: 1,
    number: 'sg',
    tense: 'present',
    mood: 'indicative',
  },
  {
    form: 'préfère',
    lemma: 'préférer',
    pos: 'verb',
    person: 1,
    number: 'sg',
    tense: 'present',
    mood: 'indicative',
  },
  {
    form: 'préfère',
    lemma: 'préférer',
    pos: 'verb',
    person: 3,
    number: 'sg',
    tense: 'present',
    mood: 'indicative',
  },
  { form: 'heures', lemma: 'heure', pos: 'noun', number: 'pl', gender: 'f' },
  { form: 'l’', lemma: 'le', pos: 'article', number: 'sg', gender: 'm' },
  { form: 'l’', lemma: 'le', pos: 'article', number: 'sg', gender: 'f' },
  { form: 'au', lemma: 'au', pos: 'contraction', parts: ['à', 'le'] },
];
