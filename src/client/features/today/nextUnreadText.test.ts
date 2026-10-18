import { expect, test } from 'vitest';
import { cafeDialogueText, leaMorningText } from '@shared/fixtures';
import { nextUnreadText } from './nextUnreadText';

const texts = [leaMorningText, cafeDialogueText];
const read = (textId: string) => ({ textId, finishedAt: 1 });

test('offers the first unread text', () => {
  expect(nextUnreadText(texts, [])).toEqual({ kind: 'next', text: leaMorningText });
});

test('skips texts that are finished', () => {
  expect(nextUnreadText(texts, [read(leaMorningText.id)])).toEqual({
    kind: 'next',
    text: cafeDialogueText,
  });
});

test('ignores readings of other chapters', () => {
  expect(nextUnreadText(texts, [read('ch12-chez-moi')])).toEqual({
    kind: 'next',
    text: leaMorningText,
  });
});

test('says so when every text is read', () => {
  expect(
    nextUnreadText(
      texts,
      texts.map((text) => read(text.id)),
    ),
  ).toEqual({ kind: 'all-read' });
});

test('says so when the chapter has no texts', () => {
  expect(nextUnreadText([], [])).toEqual({ kind: 'none' });
});
