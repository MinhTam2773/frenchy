import { beforeAll, describe, expect, it } from 'vitest';
import { lookupForm, lookupLemma } from '../lexicon/lookup';
import type { Token } from '../schemas';
import { annotate, type WordInfo } from './annotate';
import { tokenize } from './tokenize';

/** Annotates the `nth` (0-based) word token whose text is `word` in `sentence`. */
async function wordIn(sentence: string, word: string, nth = 0): Promise<WordInfo> {
  const tokens = tokenize(sentence);
  const indexes = tokens.flatMap((token, i) => (token.t === word ? [i] : []));
  const index = indexes[nth];
  if (index === undefined) throw new Error(`"${word}" #${nth} is not in "${sentence}"`);
  return annotate(tokens, index);
}

describe('annotate', () => {
  // A shard is a 1-2 MB JSON module; the first import can take several seconds under a busy run.
  beforeAll(async () => {
    await Promise.all([...'acdefijlmpqtux'].flatMap((l) => [lookupForm(l), lookupLemma(l)]));
  }, 120_000);

  it('uses the lesson annotation first', async () => {
    const tokens: Token[] = [
      { t: 'Elle', lemma: 'elle', pos: 'pronoun', gloss: 'she' },
      { t: ' ' },
      {
        t: 'a',
        lemma: 'avoir',
        pos: 'verb',
        gloss: 'has',
        form: 'il / elle · present',
        isNew: true,
      },
    ];
    expect(await annotate(tokens, 2)).toEqual({
      source: 'content',
      word: 'a',
      lemma: 'avoir',
      pos: 'verb',
      gender: undefined,
      glosses: ['has'],
      form: 'il / elle · present',
      isNew: true,
      readings: [],
    });
  });

  it('falls back to the lexicon with glosses and a form line', async () => {
    const info = await wordIn('Il a un chat.', 'a');
    expect(info).toMatchObject({
      source: 'lexicon',
      lemma: 'avoir',
      pos: 'verb',
      form: 'il / elle · present · irregular',
    });
    expect(info.glosses[0]).toMatch(/to have/);
    expect(info.readings.map((r) => r.lemma)).toContain('a');
  });

  it('reports unknown words', async () => {
    expect(await wordIn('Le xqzw.', 'xqzw')).toEqual({
      source: 'unknown',
      word: 'xqzw',
      lemma: 'xqzw',
      glosses: [],
      readings: [],
    });
  });

  it('refuses a gap token', async () => {
    await expect(annotate(tokenize('a b'), 1)).rejects.toThrow(RangeError);
  });

  const contextCases: [
    name: string,
    sentence: string,
    word: string,
    expected: Partial<WordInfo>,
  ][] = [
    ['a after a subject is avoir', 'Elle a faim.', 'a', { lemma: 'avoir', pos: 'verb' }],
    ['sentence-initial A is à', 'A Paris, il pleut.', 'A', { lemma: 'à', pos: 'preposition' }],
    ['A-t-il is avoir', 'A-t-il faim ?', 'A', { lemma: 'avoir', pos: 'verb' }],
    ['à is à', 'Il va à Paris.', 'à', { lemma: 'à', pos: 'preposition' }],
    ['est after a name is être', 'Paul est grand.', 'est', { lemma: 'être', pos: 'verb' }],
    ["est after c' is être", "C'est bon.", 'est', { lemma: 'être', pos: 'verb' }],
    ["est after the article l' is the noun", "Il habite à l'est.", 'est', { pos: 'noun' }],
    ["est after the pronoun l' is être", "Il l'est.", 'est', { lemma: 'être', pos: 'verb' }],
    ['porte after an article is the noun', 'La porte est rouge.', 'porte', { lemma: 'porte' }],
    [
      'porte after a subject is the verb',
      'Elle porte une robe.',
      'porte',
      { lemma: 'porter', form: 'il / elle · present · -er verb' },
    ],
    [
      'object pronouns between subject and verb',
      'Il la porte.',
      'porte',
      { lemma: 'porter', pos: 'verb' },
    ],
    [
      'ne and object pronouns after je',
      'Je ne la porte pas.',
      'porte',
      { lemma: 'porter', form: 'je · present · -er verb' },
    ],
    [
      'the subject picks the person',
      'Il parle vite.',
      'parle',
      { form: 'il / elle · present · -er verb' },
    ],
    ['inversion parles-tu', 'Parles-tu français ?', 'Parles', { form: 'tu · present · -er verb' }],
    ['inversion with -t-', 'Parle-t-il ?', 'Parle', { form: 'il / elle · present · -er verb' }],
    ['subject pronoun', 'Parles-tu ?', 'tu', { lemma: 'tu', pos: 'pronoun' }],
    ['euphonic t', 'A-t-il faim ?', 't', { source: 'rule', lemma: 't' }],
    [
      'M. is monsieur',
      'M. Dupont arrive.',
      'M.',
      { lemma: 'monsieur', form: 'abbreviation of monsieur' },
    ],
    ['Mme is madame', 'Mme Roux arrive.', 'Mme', { lemma: 'madame', gender: 'f' }],
    ['elision', "J'aime le thé.", "J'", { lemma: 'je', pos: 'pronoun' }],
    ['typographic l’', 'l’homme', 'l’', { lemma: 'le', pos: 'article' }],
    ['contraction', 'Il va au marché.', 'au', { lemma: 'au', form: 'à + le' }],
    [
      "aujourd'hui",
      "Aujourd'hui, il pleut.",
      "Aujourd'hui",
      { lemma: "aujourd'hui", pos: 'adverb' },
    ],
    ['peut-être', 'Il vient peut-être.', 'peut-être', { lemma: 'peut-être', pos: 'adverb' }],
    [
      'est-ce que is a phrase',
      'Est-ce que tu viens ?',
      'Est',
      { lemma: 'être', phrase: { text: 'est-ce que', gloss: expect.any(String) as string } },
    ],
    [
      'every word of est-ce que gets the phrase',
      "Est-ce qu'il vient ?",
      "qu'",
      { phrase: { text: 'est-ce que', gloss: expect.any(String) as string } },
    ],
    [
      "qu'est-ce que is what",
      "Qu'est-ce que tu manges ?",
      'ce',
      { phrase: { text: "qu'est-ce que", gloss: 'what (asks a question)' } },
    ],
    ['est alone is no phrase', 'Il est là.', 'est', { phrase: undefined }],
    ['price', 'Ça fait 12,50 €.', '12,50', { source: 'rule', pos: 'number', glosses: ['12.50'] }],
    ['thousands', '1 000 euros', '1 000', { glosses: ['1,000'] }],
    ['time', 'à 8 h 30', '8 h 30', { source: 'rule', glosses: ['8:30'], form: 'time of day' }],
    ['hour only', 'à 12h', '12h', { glosses: ['12:00'] }],
    ['ordinal', 'le 1er mai', '1er', { glosses: ['1st'], form: 'ordinal number' }],
    ['ordinal 11e', 'le 11e étage', '11e', { glosses: ['11th'] }],
  ];

  it.each(contextCases)('%s', async (_name, sentence, word, expected) => {
    expect(await wordIn(sentence, word)).toMatchObject(expected);
  });

  it('keeps the other readings, best first', async () => {
    const info = await wordIn('La porte est rouge.', 'porte');
    expect(info.readings[0]).toMatchObject({ lemma: 'porte', pos: 'noun' });
    expect(info.readings.some((r) => r.lemma === 'porter')).toBe(true);
  });

  it('does not look past the end of the previous sentence for a subject', async () => {
    expect(await wordIn('Il dort. La porte est rouge.', 'porte')).toMatchObject({ lemma: 'porte' });
  });
});
