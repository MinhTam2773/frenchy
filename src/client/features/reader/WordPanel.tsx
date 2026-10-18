import type { WordInfo } from '@shared/text';
import { Button, Chip, Icon, IconButton } from '@client/ui';

type WordPanelProps = {
  /** Undefined while the annotation loads. */
  info: WordInfo | undefined;
  word: string;
  saved: boolean;
  saving: boolean;
  saveFailed: boolean;
  canSpeak: boolean;
  onPlay: () => void;
  onSave: () => void;
  onSentence: () => void;
  onClose: () => void;
};

const GENDER_CHIPS = {
  m: { variant: 'masc', label: 'le · masculine' },
  f: { variant: 'fem', label: 'la · feminine' },
} as const;

/**
 * The tap-a-word sheet. Not a modal dialog (G-17): the text above stays tappable, so tapping
 * another word just switches the sheet, and focus stays on the word that was picked.
 */
export function WordPanel(props: WordPanelProps) {
  const { info, word, saved, saving, saveFailed } = props;
  const gender = info?.gender === 'm' || info?.gender === 'f' ? GENDER_CHIPS[info.gender] : null;
  const showLemma =
    info &&
    info.pos !== 'name' &&
    info.lemma.toLocaleLowerCase('fr') !== word.toLocaleLowerCase('fr');

  return (
    <section
      aria-label="Word details"
      className="flex flex-col gap-2.5 rounded-t-sheet border-t-2 border-line bg-surface px-5 pt-2.5 pb-[max(1.625rem,env(safe-area-inset-bottom))] shadow-sheet"
    >
      <div aria-hidden="true" className="h-[5px] w-11 self-center rounded-full bg-line-strong" />
      <div className="flex items-center gap-2.5">
        <h2 lang="fr" className="font-display text-[32px] leading-none font-semibold">
          {word}
        </h2>
        {props.canSpeak && (
          <IconButton
            icon="volume"
            variant="soft"
            iconSize={20}
            aria-label="Play pronunciation"
            onClick={props.onPlay}
          />
        )}
        <span className="flex-1" />
        <IconButton icon="close" aria-label="Close word details" onClick={props.onClose} />
      </div>
      {info && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {info.pos && <Chip>{info.pos}</Chip>}
            {showLemma && (
              <Chip>
                from{' '}
                <span lang="fr" className="ml-1 text-ink">
                  {info.lemma}
                </span>
              </Chip>
            )}
            {gender && <Chip variant={gender.variant}>{gender.label}</Chip>}
            {info.isNew && <Chip variant="new">New</Chip>}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xl font-extrabold">
              {info.glosses.length > 0 ? info.glosses.join('; ') : 'No translation yet'}
            </span>
            {info.form && <span className="text-sm font-bold text-muted">{info.form}</span>}
            {info.phrase && (
              <span className="text-sm font-bold text-muted">
                Part of <span lang="fr">{info.phrase.text}</span>: {info.phrase.gloss}
              </span>
            )}
          </div>
        </>
      )}
      {saveFailed && (
        <p role="alert" className="m-0 text-sm font-bold text-danger-ink">
          Couldn’t save. Try again.
        </p>
      )}
      <div className="flex gap-2.5 pt-1">
        <Button
          size="sm"
          variant={saved ? 'success' : 'primary'}
          className="flex-1"
          disabled={!info || info.glosses.length === 0 || saving}
          aria-disabled={saved || undefined}
          onClick={saved ? undefined : props.onSave}
        >
          <Icon name={saved ? 'check' : 'plus'} size={20} strokeWidth={3} />
          {saved ? 'Saved to reviews' : saving ? 'Saving…' : 'Save word'}
        </Button>
        <Button size="sm" variant="secondary" onClick={props.onSentence}>
          Sentence
        </Button>
      </div>
    </section>
  );
}
