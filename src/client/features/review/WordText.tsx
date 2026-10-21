import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '@client/ui/cx';
import type { CardToken, Side } from './cardWords';

type WordTextProps = {
  side: Side;
  tokens: CardToken[];
  lang: string;
  className: string;
  /** Index into `tokens` of the word whose sheet is open. */
  picked: number | null;
  onPick: (index: number) => void;
};

/** One side of a review card as word buttons. One tab stop; arrow keys move between words (L-101). */
export function WordText({ side, tokens, lang, className, picked, onPick }: WordTextProps) {
  const root = useRef<HTMLParagraphElement>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const wordIndexes = useMemo(
    () => tokens.flatMap((token, i) => (token.kind === 'word' ? [i] : [])),
    [tokens],
  );
  const stop =
    [focused, picked].find((i) => i !== null && wordIndexes.includes(i)) ?? wordIndexes[0];

  function focusWord(index: number) {
    root.current?.querySelector<HTMLElement>(`[data-word="${side}-${index}"]`)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const at = wordIndexes.indexOf(index);
    const target = {
      ArrowRight: wordIndexes[at + 1],
      ArrowLeft: wordIndexes[at - 1],
      Home: wordIndexes[0],
      End: wordIndexes[wordIndexes.length - 1],
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    focusWord(target);
  }

  return (
    <p ref={root} lang={lang} className={className}>
      {tokens.map((token, i) => {
        if (token.blank) {
          return (
            <span key={i}>
              <span aria-hidden="true" className="text-faint">
                ______
              </span>
              <span className="sr-only">blank</span>
            </span>
          );
        }
        if (token.kind === 'gap') return <span key={i}>{token.t}</span>;
        return (
          <button
            key={i}
            type="button"
            data-word={`${side}-${i}`}
            tabIndex={stop === i ? 0 : -1}
            onClick={() => onPick(i)}
            onKeyDown={(event) => onKeyDown(event, i)}
            onFocus={() => setFocused(i)}
            className={cx(
              'mx-[-1px] inline rounded-md border-0 px-px [font:inherit]',
              picked === i
                ? 'bg-primary text-white'
                : cx(
                    'bg-transparent',
                    token.answer
                      ? 'text-success shadow-[inset_0_-3px_0_var(--color-success)]'
                      : '[color:inherit]',
                  ),
            )}
          >
            {token.t}
          </button>
        );
      })}
    </p>
  );
}
