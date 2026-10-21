import { expect, test } from 'vitest';
import { reviewCards } from '@shared/fixtures';
import { frontTappable, sideTokens } from './cardWords';

const [sentence, cloze, meaning] = reviewCards;

const words = (tokens: ReturnType<typeof sideTokens>) =>
  (tokens ?? []).filter((t) => t.kind === 'word').map((t) => t.t);

test('only the French side of a card has tokens', () => {
  expect(words(sideTokens(sentence, 'front', false))).toEqual(['Elle', 'écoute', 'la', 'radio']);
  expect(sideTokens(sentence, 'back', true)).toBeNull();
  expect(sideTokens(meaning, 'front', false)).toBeNull();
  expect(words(sideTokens(meaning, 'back', true))).toEqual([
    'J’',
    'ai',
    'un',
    'chat',
    'et',
    'un',
    'petit',
    'appartement',
  ]);
});

test('an unrevealed cloze keeps its blank as a gap, a revealed one has the answer as words', () => {
  const hidden = sideTokens(cloze, 'front', false) ?? [];
  expect(hidden.filter((t) => t.blank)).toHaveLength(1);
  expect(hidden.find((t) => t.blank)?.kind).toBe('gap');
  expect(words(hidden)).toEqual(['Nous', 'français', 'à', 'la', 'maison']);

  const shown = sideTokens(cloze, 'front', true) ?? [];
  expect(shown.some((t) => t.blank)).toBe(false);
  expect(shown.filter((t) => t.answer).map((t) => t.t)).toEqual(['parlons']);
  expect(shown.map((t) => t.t).join('')).toBe(cloze.back);
});

test('a front that is a single word is not tappable until the answer is shown', () => {
  const word = { ...sentence, front: 'boire', back: 'to drink' };
  const tokens = sideTokens(word, 'front', false) ?? [];
  expect(frontTappable(word, tokens, false)).toBe(false);
  expect(frontTappable(word, tokens, true)).toBe(true);
  expect(frontTappable(sentence, sideTokens(sentence, 'front', false) ?? [], false)).toBe(true);
  expect(frontTappable(cloze, sideTokens(cloze, 'front', false) ?? [], false)).toBe(true);
});
