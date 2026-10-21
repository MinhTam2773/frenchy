import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WordPanel } from '@client/ui';
import type { Card } from '@shared/schemas';
import { annotate } from '@shared/text';
import { frontTappable, sideTokens, type Side } from './cardWords';
import { ReviewCard } from './ReviewCard';

type ReviewStageProps = {
  card: Card;
  revealed: boolean;
  onPlay: (() => void) | null;
  /** Speaks one French word; null when the browser can't. */
  onSpeak: ((text: string) => void) | null;
  sectionRef: Ref<HTMLElement>;
  aside: ReactNode;
};

/** A word whose sheet is open. `revealed` is when it was tapped: the tokens change on reveal. */
type Picked = { side: Side; index: number; revealed: boolean };

function focusWord(side: Side, index: number) {
  document.querySelector<HTMLElement>(`[data-word="${side}-${index}"]`)?.focus();
}

/**
 * The card plus its word sheet. Give it `key={card.id}` so a new card starts with no sheet open.
 * Tapping a word looks up that word only: it never reveals the answer or grades (L-55).
 */
export function ReviewStage({
  card,
  revealed,
  onPlay,
  onSpeak,
  sectionRef,
  aside,
}: ReviewStageProps) {
  const [tapped, setTapped] = useState<Picked | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  // Revealing a cloze swaps its blank for the answer, so a sheet opened before it is dropped.
  const picked = tapped?.revealed === revealed ? tapped : null;

  const tokens = useMemo(
    () => ({
      front: sideTokens(card, 'front', revealed),
      back: sideTokens(card, 'back', revealed),
    }),
    [card, revealed],
  );
  const word = picked && tokens[picked.side]?.[picked.index];
  const lookup = useQuery({
    queryKey: ['review', 'word', card.id, revealed, picked?.side, picked?.index],
    queryFn: () => {
      const list = picked && tokens[picked.side];
      return list && picked ? annotate(list, picked.index) : Promise.reject(new Error('No word'));
    },
    enabled: picked !== null,
    staleTime: Infinity,
    // Answered from the lexicon shards the service worker has cached, so the browser's idea of
    // being online must not pause it (L-147).
    networkMode: 'always',
    retry: false,
  });

  function close() {
    // The sheet is not modal, so focus goes back to the word it described.
    if (picked) focusWord(picked.side, picked.index);
    setTapped(null);
  }

  useEffect(() => {
    if (!picked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      focusWord(picked.side, picked.index);
      setTapped(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [picked]);

  // The sheet sits below the card; on a short phone it can open off screen.
  useEffect(() => {
    if (picked) sheet.current?.scrollIntoView?.({ block: 'nearest' });
  }, [picked]);

  const front = tokens.front;
  return (
    <>
      <div className="flex flex-1 flex-col gap-3.5 px-5 pt-2">
        <ReviewCard
          card={card}
          revealed={revealed}
          onPlay={onPlay}
          sectionRef={sectionRef}
          aside={aside}
          words={{
            front,
            back: tokens.back,
            frontTappable: front !== null && frontTappable(card, front, revealed),
            picked: picked && { side: picked.side, index: picked.index },
            onPick: (side, index) => setTapped({ side, index, revealed }),
          }}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {word && lookup.data && (
          <>
            <span lang="fr">{word.t}</span>: {lookup.data.glosses.join('; ')}
          </>
        )}
      </p>
      {word && (
        <div ref={sheet}>
          <WordPanel
            info={lookup.data}
            word={word.t}
            lookupFailed={lookup.isError}
            canSpeak={onSpeak !== null}
            onPlay={() => onSpeak?.(word.t)}
            onClose={close}
          />
        </div>
      )}
    </>
  );
}
