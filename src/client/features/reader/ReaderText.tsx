import {
  memo,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import type { WordToken } from '@shared/schemas';
import { cx } from '@client/ui/cx';
import { isWord, type ReaderModel, type SentenceRange } from './model';

export const LONG_PRESS_MS = 500;
/** A touch that moves further than this before the long-press fires is a scroll. */
const SCROLL_SLOP_PX = 10;

type ReaderTextProps = {
  model: ReaderModel;
  selectedWord: number | null;
  range: SentenceRange | null;
  speaking: number | null;
  onPick: (index: number) => void;
  onShiftPick: (index: number) => void;
  /** While a long-press or drag is selecting: the anchor token and the token under the pointer. */
  onSelecting: (anchor: number, to: number) => void;
  onSelected: () => void;
};

type Gesture = {
  pointerId: number;
  pointerType: string;
  anchor: number;
  x: number;
  y: number;
  timer: ReturnType<typeof setTimeout>;
  selecting: boolean;
};

type TokenHandlers = {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onFocus: (event: FocusEvent<HTMLButtonElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
};

const indexOf = (el: Element) => Number((el as HTMLElement).dataset.token);

/** The paragraphs as word buttons. One tab stop; arrow keys move between words. */
export function ReaderText(props: ReaderTextProps) {
  const { model, selectedWord, range, speaking } = props;
  const article = useRef<HTMLElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [focused, setFocused] = useState<number | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  // Once a long-press is selecting, a moving finger extends the selection instead of scrolling.
  useEffect(() => {
    const el = article.current;
    if (!el) return;
    const onTouchMove = (event: TouchEvent) => {
      if (gesture.current?.selecting) event.preventDefault();
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  // Built once, so the memoized tokens never re-render for a new handler.
  const [handlers] = useState<TokenHandlers>(() => {
    const focusWord = (index: number) =>
      article.current?.querySelector<HTMLElement>(`[data-token="${index}"]`)?.focus();

    const tokenAtPoint = (x: number, y: number): number | null => {
      const hit = document.elementFromPoint?.(x, y)?.closest('[data-token]');
      return hit && article.current?.contains(hit) ? indexOf(hit) : null;
    };

    const select = (g: Gesture, to: number) => {
      g.selecting = true;
      suppressClick.current = true;
      latest.current.onSelecting(g.anchor, to);
    };

    const end = () => {
      const g = gesture.current;
      if (!g) return;
      clearTimeout(g.timer);
      gesture.current = null;
      if (g.selecting) latest.current.onSelected();
    };

    return {
      onClick: (event) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        const index = indexOf(event.currentTarget);
        if (event.shiftKey) latest.current.onShiftPick(index);
        else latest.current.onPick(index);
      },
      onKeyDown: (event) => {
        const { wordIndexes } = latest.current.model;
        const at = wordIndexes.indexOf(indexOf(event.currentTarget));
        const target = {
          ArrowRight: wordIndexes[at + 1],
          ArrowLeft: wordIndexes[at - 1],
          Home: wordIndexes[0],
          End: wordIndexes[wordIndexes.length - 1],
        }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        focusWord(target);
      },
      onFocus: (event) => setFocused(indexOf(event.currentTarget)),
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        end();
        // A long-press on touch fires no click, so the flag must not outlive its gesture.
        suppressClick.current = false;
        const anchor = indexOf(event.currentTarget);
        const g: Gesture = {
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          anchor,
          x: event.clientX,
          y: event.clientY,
          selecting: false,
          timer: setTimeout(() => select(g, anchor), LONG_PRESS_MS),
        };
        gesture.current = g;
        // Touch is captured implicitly; capture the mouse too so a drag reports its moves here.
        if (event.pointerType !== 'touch') event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: (event) => {
        const g = gesture.current;
        if (!g || g.pointerId !== event.pointerId) return;
        if (!g.selecting && g.pointerType === 'touch') {
          const moved = Math.hypot(event.clientX - g.x, event.clientY - g.y);
          if (moved > SCROLL_SLOP_PX) {
            clearTimeout(g.timer);
            gesture.current = null;
          }
          return;
        }
        const to = tokenAtPoint(event.clientX, event.clientY);
        if (to === null) return;
        // A mouse drag selects as soon as it reaches another word (desktop click-drag).
        if (g.selecting || to !== g.anchor) {
          clearTimeout(g.timer);
          select(g, to);
        }
      },
      onPointerUp: end,
      onPointerCancel: end,
      onContextMenu: (event) => event.preventDefault(),
    };
  });

  const tabbable = focused ?? selectedWord ?? model.wordIndexes[0];

  return (
    <article
      ref={article}
      lang="fr"
      aria-describedby="reader-hint"
      className="flex flex-col gap-3.5 px-[22px] pt-[18px] select-none [-webkit-touch-callout:none]"
    >
      {model.paragraphs.map((paragraph, p) => (
        <div key={p}>
          {paragraph.speaker && (
            <span className="block text-sm font-extrabold tracking-[0.06em] text-muted uppercase">
              {paragraph.speaker}
            </span>
          )}
          <p className="m-0 text-[21px] leading-[1.7] font-semibold text-ink">
            {paragraph.sentences.map((sentence, s) => (
              <span key={sentence.index}>
                {s > 0 && ' '}
                <span
                  className={cx(
                    'rounded-md py-0.5',
                    range && sentence.index >= range.from && sentence.index <= range.to
                      ? 'bg-primary-line'
                      : speaking === sentence.index && 'bg-primary-soft',
                  )}
                >
                  {sentence.tokens.map((token, i) => {
                    const index = sentence.start + i;
                    return isWord(token) ? (
                      <WordButton
                        key={index}
                        index={index}
                        token={token}
                        selected={selectedWord === index}
                        tabbable={tabbable === index}
                        handlers={handlers}
                      />
                    ) : (
                      <span key={index}>{token.t}</span>
                    );
                  })}
                </span>
              </span>
            ))}
          </p>
        </div>
      ))}
    </article>
  );
}

type WordButtonProps = {
  index: number;
  token: WordToken;
  selected: boolean;
  tabbable: boolean;
  handlers: TokenHandlers;
};

const WordButton = memo(function WordButton({
  index,
  token,
  selected,
  tabbable,
  handlers,
}: WordButtonProps) {
  return (
    <button
      type="button"
      data-token={index}
      tabIndex={tabbable ? 0 : -1}
      {...handlers}
      className={cx(
        'mx-[-1px] inline rounded-md border-0 px-px [font:inherit]',
        selected
          ? 'bg-primary text-white'
          : cx(
              '[color:inherit]',
              token.isNew
                ? 'bg-new-word shadow-[inset_0_-2px_0_var(--color-new-word-line)]'
                : 'bg-transparent',
            ),
      )}
    >
      {token.t}
      {token.isNew && (
        <span lang="en" className="sr-only">
          {' '}
          (new word)
        </span>
      )}
    </button>
  );
});
