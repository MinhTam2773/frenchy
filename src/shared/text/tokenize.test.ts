import { describe, expect, it } from 'vitest';
import { texts } from '../fixtures';
import { GapToken, Sentence } from '../schemas';
import { tokenize } from './tokenize';

const NBSP = ' ';
const NNBSP = ' ';

/** Words as written, gaps in brackets: `L'homme ?` → `["L'", 'homme', '[ ?]']`. */
function show(text: string): string[] {
  return tokenize(text).map((token) => (token.kind === 'gap' ? `[${token.t}]` : token.t));
}

const cases: [name: string, input: string, expected: string[]][] = [
  ['plain words', 'Léa habite à Lyon.', ['Léa', '[ ]', 'habite', '[ ]', 'à', '[ ]', 'Lyon', '[.]']],
  ["elision with '", "l'homme", ["l'", 'homme']],
  ['elision with ’', 'l’homme', ['l’', 'homme']],
  ['elision with ʼ', 'lʼami', ['lʼ', 'ami']],
  ['capital elision', "L'été", ["L'", 'été']],
  [
    'every elided word',
    "d'eau j'ai m'appelle t'aime s'il n'est c'est qu'il",
    [
      ...["d'", 'eau', '[ ]', "j'", 'ai', '[ ]', "m'", 'appelle', '[ ]', "t'", 'aime', '[ ]'],
      ...["s'", 'il', '[ ]', "n'", 'est', '[ ]', "c'", 'est', '[ ]', "qu'", 'il'],
    ],
  ],
  [
    'jusqu’, lorsqu’, puisqu’',
    'jusqu’à lorsqu’il puisqu’elle',
    ['jusqu’', 'à', '[ ]', 'lorsqu’', 'il', '[ ]', 'puisqu’', 'elle'],
  ],
  ['two elisions in a row', "qu'aujourd'hui", ["qu'", "aujourd'hui"]],
  ['aujourd’hui stays whole', 'aujourd’hui', ['aujourd’hui']],
  ["aujourd'hui stays whole", "Aujourd'hui,", ["Aujourd'hui", '[,]']],
  [
    "quelqu'un and presqu'île stay whole",
    "quelqu'un presqu'île",
    ["quelqu'un", '[ ]', "presqu'île"],
  ],
  [
    'peut-être stays whole',
    'Il vient peut-être.',
    ['Il', '[ ]', 'vient', '[ ]', 'peut-être', '[.]'],
  ],
  [
    'hyphenated compounds stay whole',
    'grand-mère week-end vingt-deux lui-même',
    ['grand-mère', '[ ]', 'week-end', '[ ]', 'vingt-deux', '[ ]', 'lui-même'],
  ],
  [
    'single tokens from the content conventions',
    'rez-de-chaussée après-midi quatre-vingt-deux',
    ['rez-de-chaussée', '[ ]', 'après-midi', '[ ]', 'quatre-vingt-deux'],
  ],
  ['rendez-vous is not an inversion', 'un rendez-vous', ['un', '[ ]', 'rendez-vous']],
  ['c’est-à-dire stays whole', 'c’est-à-dire', ['c’est-à-dire']],
  [
    'est-ce que: three words, as in lessons',
    'Est-ce que tu viens',
    ['Est', '[-]', 'ce', '[ ]', 'que', '[ ]', 'tu', '[ ]', 'viens'],
  ],
  [
    "qu'est-ce que",
    "Qu'est-ce que c'est",
    ["Qu'", 'est', '[-]', 'ce', '[ ]', 'que', '[ ]', "c'", 'est'],
  ],
  ['est-ce qu’', 'est-ce qu’il', ['est', '[-]', 'ce', '[ ]', 'qu’', 'il']],
  ['inversion parles-tu', 'parles-tu', ['parles', '[-]', 'tu']],
  ['inversion with euphonic t', 'a-t-il', ['a', '[-]', 't', '[-]', 'il']],
  ['euphonic t before elle', 'Parle-t-elle', ['Parle', '[-]', 't', '[-]', 'elle']],
  ['imperative with two pronouns', 'donne-le-moi', ['donne', '[-]', 'le', '[-]', 'moi']],
  ['imperative with elided t’', 'Va-t’en !', ['Va', '[-]', 't’', 'en', '[ !]']],
  ['non-breaking hyphen', 'vas‑tu', ['vas', '[‑]', 'tu']],
  [
    'no-break space before ? ! : ;',
    `Ça va${NBSP}? Oui${NBSP}! Voici${NBSP}: pain${NNBSP};`,
    [
      'Ça',
      '[ ]',
      'va',
      `[${NBSP}? ]`,
      'Oui',
      `[${NBSP}! ]`,
      'Voici',
      `[${NBSP}: ]`,
      'pain',
      `[${NNBSP};]`,
    ],
  ],
  [
    'guillemets',
    `«${NBSP}Bonjour${NBSP}!${NBSP}», dit-il.`,
    [`[«${NBSP}]`, 'Bonjour', `[${NBSP}!${NBSP}», ]`, 'dit', '[-]', 'il', '[.]'],
  ],
  ['price with decimal comma', 'Ça fait 12,50 €.', ['Ça', '[ ]', 'fait', '[ ]', '12,50', '[ €.]']],
  ['time 8 h 30 is one token', 'à 8 h 30', ['à', '[ ]', '8 h 30']],
  ['time with no-break spaces', `8${NBSP}h${NBSP}30`, [`8${NBSP}h${NBSP}30`]],
  ['time 8h30 and 12 h', '8h30 ou 12 h.', ['8h30', '[ ]', 'ou', '[ ]', '12 h', '[.]']],
  ['digits before heures are a number', '8 heures', ['8', '[ ]', 'heures']],
  ['thousands with a no-break space', `1${NBSP}000 euros`, [`1${NBSP}000`, '[ ]', 'euros']],
  [
    'ordinals',
    'le 1er mai, le 2e étage',
    ['le', '[ ]', '1er', '[ ]', 'mai', '[, ]', 'le', '[ ]', '2e', '[ ]', 'étage'],
  ],
  [
    'titles keep their period',
    'M. Dupont et Mme Martin',
    ['M.', '[ ]', 'Dupont', '[ ]', 'et', '[ ]', 'Mme', '[ ]', 'Martin'],
  ],
  ['other abbreviations do not', 'etc.', ['etc', '[.]']],
  ['ellipsis', 'Je… je sais...', ['Je', '[… ]', 'je', '[ ]', 'sais', '[...]']],
  ['curly quote is not an apostrophe at a word edge', '‘oui’', ['[‘]', 'oui', '[’]']],
  ['decomposed accents stay in the word', 'café ', ['café', '[ ]']],
  ['empty text', '', []],
  ['only punctuation', ' — ', ['[ — ]']],
];

describe('tokenize', () => {
  it.each(cases)('%s', (_name, input, expected) => {
    expect(show(input)).toEqual(expected);
  });

  it.each(cases)('%s: offsets point into the input and gaps are valid gap tokens', (_n, input) => {
    const tokens = tokenize(input);
    expect(tokens.map((token) => token.t).join('')).toBe(input);
    for (const token of tokens) {
      expect(input.slice(token.start, token.end)).toBe(token.t);
      expect(GapToken.safeParse({ t: token.t }).success).toBe(token.kind === 'gap');
    }
  });

  it('splits lesson sentences exactly like their annotated tokens', () => {
    // Hand-annotated per scripts/content/prompts/text.md, plus the fixture texts.
    const annotated = Sentence.parse({
      tokens: [
        { t: "Qu'", lemma: 'que', pos: 'pronoun', gloss: 'what' },
        { t: 'est', lemma: 'être', pos: 'verb', gloss: 'is' },
        { t: '-' },
        { t: 'ce', lemma: 'ce', pos: 'pronoun', gloss: 'it' },
        { t: ' ' },
        { t: 'que', lemma: 'que', pos: 'conjunction', gloss: 'that' },
        { t: ' ' },
        { t: "l'", lemma: 'le', pos: 'article', gloss: 'the' },
        { t: 'ami', lemma: 'ami', pos: 'noun', gender: 'm', gloss: 'friend' },
        { t: ' ' },
        { t: 'de', lemma: 'de', pos: 'preposition', gloss: 'of' },
        { t: ' ' },
        { t: 'Léa', lemma: 'Léa', pos: 'name', gloss: 'Léa' },
        { t: ' ' },
        { t: 'mange', lemma: 'manger', pos: 'verb', gloss: 'eats' },
        { t: `${NBSP}?` },
      ],
      en: 'What does Léa’s friend eat?',
    });
    const sentences = [
      annotated,
      ...texts.flatMap((t) => t.paragraphs.flatMap((p) => p.sentences)),
    ];
    for (const { tokens } of sentences) {
      const ours = tokenize(tokens.map((token) => token.t).join(''));
      expect(ours.map(({ kind, t }) => ({ kind, t }))).toEqual(
        tokens.map((token) => ({ kind: 'lemma' in token ? 'word' : 'gap', t: token.t })),
      );
    }
  });
});
