import type { ReactNode, Ref } from 'react';
import { Icon } from '@client/ui';
import { CARD_TYPE_LABELS, CLOZE_BLANK } from '@shared/constants';
import type { Card } from '@shared/schemas';

const FRONT_LANG = { sentence_meaning: 'fr', meaning_sentence: 'en', cloze: 'fr' } as const;
const BACK_LANG = { sentence_meaning: 'en', meaning_sentence: 'fr', cloze: 'fr' } as const;

type ReviewCardProps = {
  card: Card;
  revealed: boolean;
  /** Shows the play button; null when no French is on screen yet. */
  onPlay: (() => void) | null;
  /** The card is focused on reveal, so keyboard users land in the answer. */
  sectionRef: Ref<HTMLElement>;
  /** Right of the card-type chip (the undo button). */
  aside: ReactNode;
};

export function ReviewCard({ card, revealed, onPlay, sectionRef, aside }: ReviewCardProps) {
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
          <Front card={card} revealed={revealed} />
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
            <p lang={BACK_LANG[card.type]} className="text-[21px] leading-[1.35] font-extrabold">
              {card.back}
            </p>
            {card.note && <p className="text-sm leading-[1.4] font-bold text-muted">{card.note}</p>}
          </div>
        )}
      </section>
    </>
  );
}

function Front({ card, revealed }: { card: Card; revealed: boolean }) {
  const classes = 'text-center font-display text-[28px] leading-[1.3] font-semibold';
  const lang = FRONT_LANG[card.type];
  if (card.type !== 'cloze') {
    return (
      <p lang={lang} className={classes}>
        {card.front}
      </p>
    );
  }
  const [before, after] = card.front.split(CLOZE_BLANK);
  return (
    <p lang={lang} className={classes}>
      {before}
      {revealed ? (
        <span className="border-b-[3px] border-success text-success">{card.clozeAnswer}</span>
      ) : (
        <>
          <span aria-hidden="true" className="text-faint">
            ______
          </span>
          <span className="sr-only">blank</span>
        </>
      )}
      {after}
    </p>
  );
}
