import { CLOZE_BLANK } from '@shared/constants';
import type { Card } from '@shared/schemas';
import { tokenize, type TextToken } from '@shared/text';

/** A word or gap of a card's French text; `annotate()` takes these as they are. */
export interface CardToken extends TextToken {
  /** Part of the filled-in answer of a cloze, shown in green once revealed. */
  answer?: true;
  /** The blank of an unrevealed cloze. A gap: it is not a word to look up. */
  blank?: true;
}

type Segment = { text: string; answer?: true } | { blank: true };

export type Side = 'front' | 'back';

export const SIDE_LANG = {
  front: { sentence_meaning: 'fr', meaning_sentence: 'en', cloze: 'fr' },
  back: { sentence_meaning: 'en', meaning_sentence: 'fr', cloze: 'fr' },
} as const;

function tokensOf(segments: Segment[]): CardToken[] {
  return segments.flatMap((segment): CardToken[] => {
    if ('blank' in segment) {
      return [{ kind: 'gap', t: CLOZE_BLANK, start: 0, end: CLOZE_BLANK.length, blank: true }];
    }
    const tokens: CardToken[] = tokenize(segment.text);
    return segment.answer ? tokens.map((token) => ({ ...token, answer: true })) : tokens;
  });
}

/** The French on one side of the card as tokens, or null when that side is English. */
export function sideTokens(card: Card, side: Side, revealed: boolean): CardToken[] | null {
  if (SIDE_LANG[side][card.type] !== 'fr') return null;
  if (card.type === 'cloze' && side === 'front') {
    const [before, after] = card.front.split(CLOZE_BLANK);
    const filling: Segment = revealed
      ? { text: card.clozeAnswer ?? '', answer: true }
      : { blank: true };
    return tokensOf([{ text: before }, filling, { text: after }]);
  }
  return tokensOf([{ text: side === 'front' ? card.front : card.back }]);
}

/**
 * Whether the words of the front can be tapped. A front that is one word asks for that word's
 * meaning, which the sheet would hand over, so it stays plain until the answer is shown.
 */
export function frontTappable(card: Card, tokens: CardToken[], revealed: boolean): boolean {
  if (revealed || card.type === 'cloze') return true;
  return tokens.filter((token) => token.kind === 'word').length > 1;
}
