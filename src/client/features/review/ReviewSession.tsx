import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTts } from '@client/lib/tts/useTts';
import { queryKeys, useProfile } from '@client/lib/query';
import { Button, IconButton, Mascot, ProgressBar } from '@client/ui';
import { GRADE_LABELS, RATINGS } from '@shared/constants';
import type { Card, Rating, StreakResponse } from '@shared/schemas';
import { previewIntervals } from '@shared/srs';
import { ReviewCard } from './ReviewCard';
import {
  computeStats,
  currentCard,
  frenchToSpeak,
  sessionReducer,
  startSession,
  type SessionState,
} from './session';
import { useReviewPosts } from './useReviewPosts';

const GRADE_STYLES: Record<Rating, string> = {
  1: 'bg-danger shadow-chunk-danger',
  2: 'bg-warn shadow-chunk-warn',
  3: 'bg-success shadow-chunk-success',
  4: 'bg-primary shadow-chunk-primary',
};

/** Space reveals, 1 to 4 grade. Typing in a field never counts, and Space on a button stays a click. */
function isTypingTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable]');
}

export function ReviewSession({ cards, userId }: { cards: Card[]; userId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const { speak, stop, supported } = useTts();
  const { hold, discard, post, settled } = useReviewPosts(userId);
  const [state, dispatch] = useReducer(sessionReducer, cards, (list) =>
    startSession(list, Date.now()),
  );
  const [saving, setSaving] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const card = currentCard(state);
  const revealed = state.revealedAt !== null;
  const total = state.cards.length;

  // Labels come from the same `now` the review is posted with (G-29).
  const labels = useMemo(
    () => (card && state.revealedAt !== null ? previewIntervals(card, state.revealedAt) : null),
    [card, state.revealedAt],
  );

  /** The last grade is held back for undo; it is posted when the next card is graded or here. */
  const postHeldGrade = useCallback(
    (from: SessionState) => {
      const held = from.results.at(-1);
      if (from.undoable && held) post(held.review);
    },
    [post],
  );

  // The held grade is also kept on the device, so closing the tab doesn't lose it (G-20).
  const held = state.undoable ? state.results.at(-1)?.review : undefined;
  useEffect(() => {
    if (held) hold(held);
  }, [held, hold]);

  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  // Leaving by any route (back button, tab bar, X) must not drop the held grade.
  useEffect(
    () => () => {
      postHeldGrade(latest.current);
    },
    [postHeldGrade],
  );

  const reveal = useCallback(() => {
    dispatch({ type: 'reveal', at: Date.now() });
    cardRef.current?.focus();
  }, []);

  const grade = useCallback(
    (rating: Rating) => {
      if (state.revealedAt === null || saving) return;
      postHeldGrade(state);
      stop();
      dispatch({ type: 'grade', rating, at: Date.now(), id: crypto.randomUUID() });
    },
    [state, saving, postHeldGrade, stop],
  );

  const undo = useCallback(() => {
    stop();
    if (held) discard(held.id);
    dispatch({ type: 'undo' });
  }, [stop, held, discard]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === ' ' && card && !revealed) {
        if (event.target instanceof Element && event.target.closest('button, a')) return;
        event.preventDefault();
        reveal();
      } else if (revealed && ['1', '2', '3', '4'].includes(event.key)) {
        grade(Number(event.key) as Rating);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [card, revealed, reveal, grade]);

  function refreshCounts() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.cardStats }),
      // Not refetched here: this screen's own list must stay the one the session started with.
      queryClient.invalidateQueries({ queryKey: queryKeys.dueCards, refetchType: 'none' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.streak }),
    ]);
  }

  function endEarly() {
    postHeldGrade(state);
    void settled().then(refreshCounts);
    void navigate('/today');
  }

  async function seeResults() {
    setSaving(true);
    postHeldGrade(state);
    await settled();
    // Read before the refresh: the cached streak is still the one from before this session.
    const before = queryClient.getQueryData<StreakResponse>(queryKeys.streak);
    await refreshCounts();
    const streakBefore = before && { current: before.current, todayDone: before.todayDone };
    await navigate('/review/done', {
      replace: true,
      state: { ...computeStats(state.results), streakBefore },
    });
  }

  const french = card ? frenchToSpeak(card, revealed) : null;
  const onPlay =
    supported && french
      ? () =>
          void speak(french, {
            rate: profile.data?.settings.rate,
            voiceURI: profile.data?.settings.voiceURI ?? undefined,
          })
      : null;

  const undoButton = (
    <button
      type="button"
      onClick={undo}
      className="-my-3.5 h-11 rounded-xl px-3 text-sm font-extrabold tracking-[0.05em] text-primary uppercase hover:bg-primary-soft"
    >
      Undo
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-2">
        <IconButton icon="close" aria-label="End review" onClick={endEarly} />
        <ProgressBar
          value={state.results.length}
          max={total}
          tone="success"
          size="lg"
          aria-label="Review progress"
          className="flex-1"
        />
        <span className="min-w-11 text-right text-sm font-extrabold text-muted">
          {state.results.length}/{total}
        </span>
      </div>

      {card ? (
        <>
          <h1 className="sr-only">Review</h1>
          <div className="flex flex-1 flex-col gap-3.5 px-5 pt-2">
            <ReviewCard
              card={card}
              revealed={revealed}
              onPlay={onPlay}
              sectionRef={cardRef}
              aside={state.undoable ? undoButton : null}
            />
          </div>
          <div className="px-5 pt-[18px] pb-[30px]">
            {labels ? (
              <div className="grid grid-cols-4 gap-2">
                {RATINGS.map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    aria-label={`${GRADE_LABELS[rating]}, ${labels[rating]}`}
                    aria-keyshortcuts={String(rating)}
                    onClick={() => grade(rating)}
                    className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-btn-sm text-white transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-none motion-reduce:transition-none ${GRADE_STYLES[rating]}`}
                  >
                    <span className="text-[15px] font-extrabold">{GRADE_LABELS[rating]}</span>{' '}
                    <span className="text-xs font-bold">{labels[rating]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <Button size="lg" fullWidth aria-keyshortcuts="Space" onClick={reveal}>
                Show answer
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <Mascot size={150} />
            <h1 className="font-display text-[26px] font-semibold">That was the last card</h1>
            <p className="text-base font-semibold text-muted">Nice work. Let’s see how it went.</p>
          </div>
          <div className="flex flex-col gap-2 px-5 pt-[18px] pb-[30px]">
            <Button size="lg" fullWidth disabled={saving} onClick={() => void seeResults()}>
              See results
            </Button>
            {state.undoable && (
              <Button variant="ghost" size="lg" fullWidth disabled={saving} onClick={undo}>
                Undo last answer
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
