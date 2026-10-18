import type { Reading, Text } from '@shared/schemas';

export type ReadingPick =
  | { kind: 'next'; text: Text }
  /** The chapter has texts and every one is finished. */
  | { kind: 'all-read' }
  /** The chapter has no texts yet (content is still being written). */
  | { kind: 'none' };

/** The first text, in the order given, that the user has not finished. */
export function nextUnreadText(texts: readonly Text[], readings: readonly Reading[]): ReadingPick {
  if (texts.length === 0) return { kind: 'none' };
  const finished = new Set(readings.map((reading) => reading.textId));
  const text = texts.find((candidate) => !finished.has(candidate.id));
  return text ? { kind: 'next', text } : { kind: 'all-read' };
}
