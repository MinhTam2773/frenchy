import { expect, test } from 'vitest';
import { chapterLabel, estimateReviewMinutes, formatDueIn, formatPdfPages, plural } from './format';

test.each([
  [0, 1],
  [1, 1],
  [5, 3],
  [18, 10],
  [20, 12],
  [60, 35],
])('%i cards take about %i min', (cards, minutes) => {
  expect(estimateReviewMinutes(cards)).toBe(minutes);
});

const NOW = 1_000_000_000_000;
const MIN = 60_000;

test.each([
  [-5 * MIN, 'soon'],
  [30_000, 'soon'],
  [MIN, 'in 1 min'],
  [25 * MIN + 1, 'in 26 min'],
  [60 * MIN, 'in 1 h'],
  [3 * 60 * MIN, 'in 3 h'],
  [24 * 60 * MIN, 'in 1 day'],
  [3 * 24 * 60 * MIN, 'in 3 days'],
])('a card due %i ms from now reads "%s"', (offset, text) => {
  expect(formatDueIn(NOW + offset, NOW)).toBe(text);
});

test('plural', () => {
  expect(plural(1, 'card')).toBe('1 card');
  expect(plural(0, 'card')).toBe('0 cards');
  expect(plural(2, 'day')).toBe('2 days');
});

test('chapter labels and page ranges', () => {
  expect(chapterLabel({ kind: 'grammar', number: '10' })).toBe('Ch 10');
  expect(chapterLabel({ kind: 'appendix', number: 'A' })).toBe('App. A');
  expect(formatPdfPages({ pdfStart: 185, pdfEnd: 196 })).toBe('PDF pp. 185–196');
  expect(formatPdfPages({ pdfStart: 12, pdfEnd: 12 })).toBe('PDF p. 12');
});
