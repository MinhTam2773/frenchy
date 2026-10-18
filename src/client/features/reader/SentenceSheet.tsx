import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { TTS_RATE } from '@shared/constants';
import type { CardCreate, ExplainResponse } from '@shared/schemas';
import { api } from '@client/lib/api';
import { BottomSheet, Button, Icon, IconButton } from '@client/ui';
import { cx } from '@client/ui/cx';
import type { Passage } from './model';

type SentenceSheetProps = {
  open: boolean;
  passage: Passage | null;
  chapterId: string;
  sentenceCard: CardCreate | null;
  /** Null when no word of the passage is picked to blank. */
  clozeCard: CardCreate | null;
  canSpeak: boolean;
  say: (text: string, rate?: number) => void;
  onClose: () => void;
};

/** Long-press sheet: a modal dialog with a scrim, as drawn (`Sentence.dc.html`). */
export function SentenceSheet(props: SentenceSheetProps) {
  return (
    <BottomSheet open={props.open} onClose={props.onClose} label="Sentence translation">
      {props.passage && <SentenceDetails {...props} passage={props.passage} />}
    </BottomSheet>
  );
}

function SentenceDetails({
  passage,
  chapterId,
  sentenceCard,
  clozeCard,
  canSpeak,
  say,
  onClose,
}: SentenceSheetProps & { passage: Passage }) {
  // Lesson texts carry their translation and glosses; only the grammar note needs the AI.
  const explain = useQuery({
    queryKey: ['ai', 'explain', chapterId, passage.text],
    queryFn: () => api.ai.explain(passage.text, chapterId),
    enabled: !passage.tooLong,
    staleTime: Infinity,
  });

  return (
    <div className="-mx-5 flex max-h-[75dvh] flex-col gap-3.5 overflow-y-auto px-5">
      <div className="flex items-start gap-2.5">
        <p lang="fr" className="m-0 flex-1 font-display text-[23px] leading-[1.3] font-semibold">
          {passage.text}
        </p>
        <IconButton icon="close" aria-label="Close" onClick={onClose} />
      </div>
      {canSpeak && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => say(passage.text)}
            className="flex h-11 items-center gap-1.5 rounded-xl border-2 border-primary-line bg-primary-soft px-3 text-sm font-extrabold text-primary"
          >
            <Icon name="volume" size={18} />
            Listen
          </button>
          <button
            type="button"
            onClick={() => say(passage.text, TTS_RATE.min)}
            className="flex h-11 items-center rounded-xl border-2 border-line bg-surface px-3 text-sm font-extrabold text-ink-2"
          >
            Slow
          </button>
        </div>
      )}
      <p className="m-0 text-lg leading-[1.4] font-bold">{passage.en}</p>

      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-sm font-semibold tracking-[0.06em] text-muted uppercase">
          Word by word
        </h2>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {passage.words.map((word, i) => (
            <li
              key={i}
              className={cx(
                'flex flex-col items-center rounded-xl border-2 px-2.5 py-1.5',
                word.isNew ? 'border-new-word-line bg-new-word' : 'border-line bg-ground',
              )}
            >
              <span lang="fr" className="text-base font-extrabold">
                {word.t}
              </span>
              <span
                className={cx('text-xs font-bold', word.isNew ? 'text-new-word-ink' : 'text-muted')}
              >
                {word.gloss}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <GrammarNote explain={explain} tooLong={passage.tooLong} />

      {passage.tooLong ? (
        <p className="m-0 text-sm font-bold text-muted">
          Select a shorter passage to save it as a card.
        </p>
      ) : (
        <div className="flex flex-col gap-2 pb-1">
          {sentenceCard && (
            <SaveCardButton card={sentenceCard} label="Save sentence" savedLabel="Sentence saved" />
          )}
          {clozeCard && (
            <SaveCardButton
              card={clozeCard}
              label={`Save as cloze (hide “${clozeCard.clozeAnswer}”)`}
              savedLabel="Cloze saved"
              variant="secondary"
            />
          )}
          {explain.data && (
            <span className="self-center text-xs font-bold text-muted">
              Explained by AI · saved for next time
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function GrammarNote({
  explain,
  tooLong,
}: {
  explain: UseQueryResult<ExplainResponse>;
  tooLong: boolean;
}) {
  if (tooLong) return null;
  const notes = explain.data?.notes ?? [];
  if (explain.isSuccess && notes.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border-2 border-gold-pale bg-gold-soft px-3.5 py-3">
      <span className="text-xs font-extrabold tracking-[0.08em] text-gold-ink uppercase">
        Grammar note
      </span>
      {explain.isPending && (
        <p className="m-0 text-sm font-semibold text-ink-2">Loading the grammar note…</p>
      )}
      {explain.isError && (
        <p className="m-0 text-sm font-semibold text-ink-2">
          The grammar note isn’t available right now.
        </p>
      )}
      {notes.map((note) => (
        <p key={note} className="m-0 text-sm leading-[1.45] font-semibold text-ink">
          {note}
        </p>
      ))}
    </div>
  );
}

function SaveCardButton({
  card,
  label,
  savedLabel,
  variant = 'primary',
}: {
  card: CardCreate;
  label: string;
  savedLabel: string;
  variant?: 'primary' | 'secondary';
}) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () => api.cards.create(card),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });
  return (
    <>
      {save.isError && (
        <p role="alert" className="m-0 text-sm font-bold text-danger-ink">
          Couldn’t save. Try again.
        </p>
      )}
      <Button
        size="sm"
        variant={save.isSuccess ? 'success' : variant}
        fullWidth
        disabled={save.isPending}
        aria-disabled={save.isSuccess || undefined}
        onClick={save.isSuccess ? undefined : () => save.mutate()}
      >
        <Icon name={save.isSuccess ? 'check' : 'plus'} size={20} strokeWidth={3} />
        {save.isSuccess ? savedLabel : save.isPending ? 'Saving…' : label}
      </Button>
    </>
  );
}
