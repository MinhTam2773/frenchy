import type { ReactNode, Ref } from 'react';
import { Icon } from '@client/ui';
import { CARD_TYPE_LABELS } from '@shared/constants';
import type { Card } from '@shared/schemas';
import { SIDE_LANG, type CardToken, type Side } from './cardWords';
import { WordText } from './WordText';

/** The French words of the card that open the word sheet (null: that side is English). */
export type CardWords = {
  front: CardToken[] | null;
  back: CardToken[] | null;
  frontTappable: boolean;
  picked: { side: Side; index: number } | null;
  onPick: (side: Side, index: number) => void;
};

type ReviewCardProps = {
  card: Card;
  revealed: boolean;
  /** Shows the play button; null when no French is on screen yet. */
  onPlay: (() => void) | null;
  /** The card is focused on reveal, so keyboard users land in the answer. */
  sectionRef: Ref<HTMLElement>;
  /** Right of the card-type chip (the undo button). */
  aside: ReactNode;
  words: CardWords;
};

export function ReviewCard({ card, revealed, onPlay, sectionRef, aside, words }: ReviewCardProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="flex h-[30px] items-center rounded-full bg-primary-soft px-3 text-[13px] font-extrabold tracking-[0.04em] text-primary uppercase">
          {CARD_TYPE_LABELS[card.type]}
        </span>
        {aside}
      </div>

      <section
        ref={sectionRef}
        tabIndex={-1}
        aria-live="polite"
        className="flex max-h-[470px] flex-1 flex-col gap-[18px] rounded-[26px] border-2 border-line bg-surface px-[22px] py-6 shadow-[0_6px_0_var(--color-line)] outline-none"
      >
        <div className="flex flex-1 flex-col justify-center gap-3.5">
          <Front card={card} words={words} />
          {card.hint && <p className="text-center text-[15px] font-bold text-muted">{card.hint}</p>}
          {onPlay && (
            <button
              type="button"
              aria-label="Play audio"
              onClick={onPlay}
              className="flex size-[52px] items-center justify-center self-center rounded-2xl border-2 border-primary-line bg-primary-soft text-primary"
            >
              <Icon name="volume-high" size={26} />
            </button>
          )}
        </div>

        {revealed && (
          <div className="flex flex-col items-center gap-2 border-t-2 border-dashed border-line pt-4 text-center">
            {words.back ? (
              <WordText
                side="back"
                tokens={words.back}
                lang="fr"
                className={BACK_CLASSES}
                picked={words.picked?.side === 'back' ? words.picked.index : null}
                onPick={(index) => words.onPick('back', index)}
              />
            ) : (
              <p lang={SIDE_LANG.back[card.type]} className={BACK_CLASSES}>
                {card.back}
              </p>
            )}
            {card.note && <p className="text-sm leading-[1.4] font-bold text-muted">{card.note}</p>}
          </div>
        )}
      </section>
    </>
  );
}

const BACK_CLASSES = 'text-[21px] leading-[1.35] font-extrabold';
const FRONT_CLASSES = 'text-center font-display text-[28px] leading-[1.3] font-semibold';

function Front({ card, words }: { card: Card; words: CardWords }) {
  if (!words.front || !words.frontTappable) {
    return (
      <p lang={SIDE_LANG.front[card.type]} className={FRONT_CLASSES}>
        {card.front}
      </p>
    );
  }
  return (
    <WordText
      side="front"
      tokens={words.front}
      lang="fr"
      className={FRONT_CLASSES}
      picked={words.picked?.side === 'front' ? words.picked.index : null}
      onPick={(index) => words.onPick('front', index)}
    />
  );
}
