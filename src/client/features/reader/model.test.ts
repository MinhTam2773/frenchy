import { describe, expect, test } from 'vitest';
import { leaMorningText } from '@shared/fixtures';
import { CardCreate } from '@shared/schemas';
import type { WordInfo } from '@shared/text';
import {
  buildReaderModel,
  clozeCard,
  passage,
  rangeBetween,
  sentenceCard,
  tokenAt,
  wordCard,
} from './model';

const model = buildReaderModel(leaMorningText);
const indexOfWord = (t: string) => model.wordIndexes.find((i) => tokenAt(model, i).t === t) ?? -1;

describe('reader model', () => {
  test('numbers every token and keeps sentence text verbatim', () => {
    expect(model.sentences.map((s) => s.text)).toEqual([
      'Léa habite à Lyon.',
      'Elle a un petit appartement et un chat.',
      'Le matin, elle mange une tartine et elle écoute la radio.',
      'Elle parle avec son voisin, Karim.',
      'Il aime le café, mais Léa préfère le thé.',
      'À huit heures, elle va au travail.',
    ]);
    expect(model.sentenceOf).toHaveLength(model.sentences.reduce((n, s) => n + s.tokens.length, 0));
    expect(tokenAt(model, model.wordIndexes[0]).t).toBe('Léa');
  });

  test('a range covers whole sentences in either direction', () => {
    const range = rangeBetween(model, indexOfWord('chat'), indexOfWord('habite'));
    expect(range).toEqual({ from: 0, to: 1 });
    const p = passage(model, range);
    expect(p.text).toBe('Léa habite à Lyon. Elle a un petit appartement et un chat.');
    expect(p.en).toBe('Léa lives in Lyon. She has a small apartment and a cat.');
    expect(p.tooLong).toBe(false);
  });

  test('cards pass the shared schema', () => {
    const range = { from: 4, to: 4 };
    const p = passage(model, range);
    const cloze = clozeCard(model, range, indexOfWord('préfère'), leaMorningText.id);
    expect(cloze.front).toBe('Il aime le café, mais Léa ___ le thé.');
    expect(() => CardCreate.parse(cloze)).not.toThrow();
    expect(() => CardCreate.parse(sentenceCard(p, leaMorningText.id))).not.toThrow();
  });

  test('a word card is lowercased (names keep their capital) and names its lemma', () => {
    const info: WordInfo = {
      source: 'content',
      word: 'Va',
      lemma: 'aller',
      pos: 'verb',
      glosses: ['goes'],
      form: 'il / elle · present · irregular',
      readings: [],
    };
    const card = wordCard(info, 'Va au travail.');
    expect(card).toMatchObject({
      front: 'va',
      back: 'goes',
      note: 'aller · il / elle · present · irregular',
    });
    expect(() => CardCreate.parse(card)).not.toThrow();
    expect(wordCard({ ...info, word: 'Karim', lemma: 'Karim', pos: 'name' }, 'x').front).toBe(
      'Karim',
    );
  });
});
