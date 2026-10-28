import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { TTS_RATE } from '@shared/constants';
import { getChapter, getChapterTextIds } from '@shared/content';
import type { Text, WordsResponse } from '@shared/schemas';
import { annotate } from '@shared/text';
import { api } from '@client/lib/api';
import { useText } from '@client/lib/content';
import { queryKeys, useProfile } from '@client/lib/query';
import { Button, TopBar, WordPanel } from '@client/ui';
import { AudioBar, nextRate } from './AudioBar';
import {
  buildReaderModel,
  clozeCard,
  passage,
  rangeBetween,
  sentenceCard,
  tokenAt,
  wordCard,
  type SentenceRange,
} from './model';
import { ReaderText } from './ReaderText';
import { SentenceSheet } from './SentenceSheet';
import { useReadAloud } from './useReadAloud';

const TEXT_SIZE_STORAGE_KEY = 'frenchy.reader.textSize';
const TEXT_SIZES = [
  { name: 'Compact', pixels: 18 },
  { name: 'Default', pixels: 21 },
  { name: 'Large', pixels: 24 },
] as const;
const DEFAULT_TEXT_SIZE_INDEX = 1;

function readTextSizeIndex(): number {
  try {
    const saved = globalThis.localStorage?.getItem(TEXT_SIZE_STORAGE_KEY);
    const index = TEXT_SIZES.findIndex(({ name }) => name === saved);
    return index < 0 ? DEFAULT_TEXT_SIZE_INDEX : index;
  } catch {
    return DEFAULT_TEXT_SIZE_INDEX;
  }
}

function focusWord(index: number) {
  document.querySelector<HTMLElement>(`[data-token="${index}"]`)?.focus();
}

export function ReaderPage() {
  const { textId = '' } = useParams();
  const { data: text, isError, refetch } = useText(textId);
  if (isError) {
    return (
      <div className="flex min-h-dvh flex-col gap-4 bg-surface">
        <TopBar title="Reader" nav={{ icon: 'close', label: 'Close reader', to: '/today' }} />
        <div role="alert" className="flex flex-col items-start gap-3 px-4">
          <p className="font-bold">Couldn’t load this text.</p>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (text === undefined) {
    return (
      <div className="flex min-h-dvh flex-col gap-4 bg-surface">
        <TopBar title="Reader" nav={{ icon: 'close', label: 'Close reader', to: '/today' }} />
        <p role="status" className="px-4 text-muted">
          Loading text…
        </p>
      </div>
    );
  }
  if (text === null) {
    return (
      <div className="flex min-h-dvh flex-col gap-4 bg-surface">
        <TopBar
          title="Text not found"
          nav={{ icon: 'close', label: 'Close reader', to: '/today' }}
        />
        <div className="px-4">
          <Button to="/today">Back to Today</Button>
        </div>
      </div>
    );
  }
  return <Reader key={text.id} text={text} />;
}

/** A range being dragged out (`open: false`) or shown in the sentence sheet. */
type Selection = SentenceRange & { anchor: number; open: boolean };

function Reader({ text }: { text: Text }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useProfile().data;
  const words = useQuery({ queryKey: queryKeys.words, queryFn: api.words.list }).data;

  const model = useMemo(() => buildReaderModel(text), [text]);
  const [picked, setPicked] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [chosenRate, setChosenRate] = useState<number | null>(null);
  const [textSizeIndex, setTextSizeIndex] = useState(readTextSizeIndex);
  const rate = chosenRate ?? profile?.settings.rate ?? TTS_RATE.default;
  const textSize = TEXT_SIZES[textSizeIndex] ?? TEXT_SIZES[DEFAULT_TEXT_SIZE_INDEX];
  const nextTextSize = TEXT_SIZES[(textSizeIndex + 1) % TEXT_SIZES.length] ?? TEXT_SIZES[0];
  const sentenceTexts = useMemo(() => model.sentences.map((s) => s.text), [model]);
  const audio = useReadAloud(sentenceTexts, { rate, voiceURI: profile?.settings.voiceURI ?? null });

  const pickedToken = picked === null ? null : tokenAt(model, picked);
  const pickedSentence = picked === null ? null : model.sentences[model.sentenceOf[picked]];
  const info = useQuery({
    queryKey: ['reader', 'word', text.id, picked],
    // Lesson words resolve from their own annotation; lexicon shards load only for the others.
    queryFn: () =>
      picked !== null && pickedSentence
        ? annotate(pickedSentence.tokens, picked - pickedSentence.start)
        : Promise.reject(new Error('No word picked')),
    enabled: picked !== null,
    staleTime: Infinity,
  }).data;

  const saveWord = useMutation({
    mutationFn: async (card: ReturnType<typeof wordCard>) => {
      await api.cards.create(card);
      return api.words.put(card.source.ref, 'learning');
    },
    onSuccess: (word) => {
      queryClient.setQueryData<WordsResponse>(queryKeys.words, (old) =>
        old ? { words: [...old.words.filter((w) => w.lemma !== word.lemma), word] } : old,
      );
      void queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });

  const finish = useMutation({
    mutationFn: () => api.activity.addReading({ textId: text.id, finishedAt: Date.now() }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.readings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.streak }),
      ]);
      void navigate('/today');
    },
  });

  function pick(index: number) {
    setPicked(index);
    const token = tokenAt(model, index);
    if (profile?.settings.playOnTap && audio.supported) audio.say(token.t);
  }

  function cycleTextSize() {
    setTextSizeIndex((current) => {
      const next = (current + 1) % TEXT_SIZES.length;
      try {
        globalThis.localStorage?.setItem(TEXT_SIZE_STORAGE_KEY, TEXT_SIZES[next]?.name ?? '');
      } catch {
        // Blocked or full storage leaves the choice in memory for this visit.
      }
      return next;
    });
  }

  function openSentences(anchor: number, to: number) {
    setSelection({ ...rangeBetween(model, anchor, to), anchor, open: true });
  }

  function closePanel() {
    // The sheet is not modal, so focus goes back to the word it described.
    if (picked !== null) focusWord(picked);
    setPicked(null);
  }

  // Escape closes the word sheet; the sentence sheet (a dialog) handles its own Escape.
  useEffect(() => {
    if (picked === null || selection?.open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      focusWord(picked);
      setPicked(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [picked, selection?.open]);

  const chapter = getChapter(text.chapterId);
  const readingNumber = getChapterTextIds(text.chapterId).indexOf(text.id) + 1;
  const overline = [
    chapter && (chapter.kind === 'appendix' ? `App. ${chapter.number}` : `Ch ${chapter.number}`),
    readingNumber > 0 && `Reading ${readingNumber}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const shownPassage = selection ? passage(model, selection) : null;
  const lemma = info?.lemma;
  const wordStatus = words?.words.find((w) => w.lemma === lemma)?.status;
  const savingThis = saveWord.isPending && saveWord.variables.source.ref === lemma;
  const failedThis = saveWord.isError && saveWord.variables.source.ref === lemma;

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <TopBar
        title={text.title}
        titleLang="fr"
        overline={overline || undefined}
        align="center"
        nav={{ icon: 'close', label: 'Close reader', to: `/chapter/${text.chapterId}` }}
        end={
          <button
            type="button"
            aria-label={`Aa, text size: ${textSize.name}. Change to ${nextTextSize.name}`}
            onClick={cycleTextSize}
            className="size-11 shrink-0 rounded-xl font-display text-lg font-semibold text-muted hover:bg-chip"
          >
            Aa
          </button>
        }
      />
      {audio.supported && (
        <AudioBar
          playing={audio.playing}
          current={audio.current}
          completed={audio.completed}
          sentences={sentenceTexts}
          rate={rate}
          onToggle={audio.toggle}
          onRate={() => setChosenRate(nextRate(rate))}
        />
      )}
      <div className="flex-1 pb-6">
        <ReaderText
          model={model}
          textSize={textSize.pixels}
          selectedWord={picked}
          range={selection}
          speaking={audio.current}
          onPick={pick}
          onShiftPick={(index) => openSentences(picked ?? index, index)}
          onSelecting={(anchor, to) =>
            setSelection({ ...rangeBetween(model, anchor, to), anchor, open: false })
          }
          onSelected={() => setSelection((s) => s && { ...s, open: true })}
        />
        <p
          id="reader-hint"
          className="mx-[22px] mt-3.5 flex items-center gap-2 text-[13px] font-bold text-muted"
        >
          <span
            aria-hidden="true"
            className="size-3.5 rounded bg-new-word shadow-[inset_0_-2px_0_var(--color-new-word-line)]"
          />
          New word · tap any word · long-press a sentence
          <span className="sr-only">. Arrow keys move between words.</span>
        </p>
      </div>

      <p aria-live="polite" className="sr-only">
        {pickedToken && info && (
          <>
            <span lang="fr">{pickedToken.t}</span>: {info.glosses.join('; ')}
          </>
        )}
      </p>

      <div className="sticky bottom-0">
        {picked !== null && pickedToken && pickedSentence ? (
          <WordPanel
            info={info}
            word={pickedToken.t}
            saved={wordStatus === 'learning'}
            saving={savingThis}
            saveFailed={failedThis}
            canSpeak={audio.supported}
            onPlay={() => audio.say(pickedToken.t)}
            onSave={() => info && saveWord.mutate(wordCard(info, pickedSentence.text))}
            onSentence={() => openSentences(picked, picked)}
            onClose={closePanel}
          />
        ) : (
          <div className="border-t-2 border-line bg-surface px-5 pt-3.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            {finish.isError && (
              <p role="alert" className="m-0 mb-2 text-sm font-bold text-danger-ink">
                Couldn’t save your reading. Try again.
              </p>
            )}
            <Button fullWidth disabled={finish.isPending} onClick={() => finish.mutate()}>
              Finish reading
            </Button>
          </div>
        )}
      </div>

      <SentenceSheet
        open={selection?.open ?? false}
        passage={shownPassage}
        chapterId={text.chapterId}
        sentenceCard={shownPassage && sentenceCard(shownPassage, text.id)}
        // The anchor is always a word: only word buttons start a selection.
        clozeCard={selection && clozeCard(model, selection, selection.anchor, text.id)}
        canSpeak={audio.supported}
        say={audio.say}
        onClose={() => setSelection(null)}
      />
    </div>
  );
}
