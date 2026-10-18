import { describe, expect, it } from 'vitest';
import { splitSentences } from './sentences';

const NBSP = ' ';

const cases: [name: string, input: string, expected: string[]][] = [
  ['one sentence', 'Léa habite à Lyon.', ['Léa habite à Lyon.']],
  ['no final punctuation', 'Bonjour', ['Bonjour']],
  ['two sentences', 'Il pleut. Je reste.', ['Il pleut.', 'Je reste.']],
  [
    'question and exclamation with no-break spaces',
    `Ça va${NBSP}? Oui${NBSP}! Et toi${NBSP}?`,
    [`Ça va${NBSP}?`, `Oui${NBSP}!`, `Et toi${NBSP}?`],
  ],
  [
    'M. does not end a sentence',
    'M. Dupont arrive. Il sourit.',
    ['M. Dupont arrive.', 'Il sourit.'],
  ],
  ['Mme and Dr.', 'Mme Martin voit le Dr. Roux.', ['Mme Martin voit le Dr. Roux.']],
  ['an initial does not end a sentence', 'J. K. Rowling écrit.', ['J. K. Rowling écrit.']],
  [
    'etc. ends a sentence only before a capital',
    'Des pommes, des poires, etc. Ensuite, du pain, etc., et du lait.',
    ['Des pommes, des poires, etc.', 'Ensuite, du pain, etc., et du lait.'],
  ],
  ['ellipsis before lower case continues', 'Je… je ne sais pas.', ['Je… je ne sais pas.']],
  ['ellipsis before a capital ends', 'Il attend... Rien.', ['Il attend...', 'Rien.']],
  [
    'closing guillemets stay with the sentence',
    `«${NBSP}Bonjour${NBSP}!${NBSP}» Elle entre.`,
    [`«${NBSP}Bonjour${NBSP}!${NBSP}»`, 'Elle entre.'],
  ],
  [
    'a quote inside a sentence',
    `«${NBSP}Bonjour${NBSP}!${NBSP}» dit-elle.`,
    [`«${NBSP}Bonjour${NBSP}!${NBSP}» dit-elle.`],
  ],
  [
    'an opening guillemet starts a sentence',
    `Il dit. «${NBSP}oui${NBSP}»`,
    ['Il dit.', `«${NBSP}oui${NBSP}»`],
  ],
  ['dialogue dashes', 'Tu viens ? — Non.', ['Tu viens ?', '— Non.']],
  ['lower case after ? continues', 'Tu viens ? demande-t-il.', ['Tu viens ? demande-t-il.']],
  ['a blank line always ends one', 'Titre\n\nLe texte.', ['Titre', 'Le texte.']],
  ['a single line break does not', 'Il est\ntard.', ['Il est\ntard.']],
  ['decimal numbers', 'Ça coûte 12.50 euros. Merci.', ['Ça coûte 12.50 euros.', 'Merci.']],
  ['surrounding whitespace and empty text', '  Oui.  ', ['Oui.']],
  ['empty', '', []],
];

describe('splitSentences', () => {
  it.each(cases)('%s', (_name, input, expected) => {
    expect(splitSentences(input).map((s) => s.text)).toEqual(expected);
  });

  it('offsets point into the original text', () => {
    const text = '  M. Roux part.  Il revient ! ';
    for (const span of splitSentences(text)) {
      expect(text.slice(span.start, span.end)).toBe(span.text);
    }
  });
});
