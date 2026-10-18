import { IconButton, ProgressBar } from '@client/ui';

export const RATES = [0.6, 0.8, 1] as const;

/** The next speed in the cycle; a profile rate between steps moves to the next step up. */
export function nextRate(rate: number): number {
  return RATES.find((r) => r > rate + 1e-9) ?? RATES[0];
}

type AudioBarProps = {
  playing: boolean;
  /** Sentences read so far, for the progress bar. */
  done: number;
  total: number;
  rate: number;
  onToggle: () => void;
  onRate: () => void;
};

export function AudioBar({ playing, done, total, rate, onToggle, onRate }: AudioBarProps) {
  return (
    <div className="mx-4 mt-1 flex items-center gap-3 rounded-2xl border-2 border-line bg-ground py-2 pr-3 pl-2">
      <IconButton
        icon={playing ? 'pause' : 'play'}
        variant="solid"
        iconSize={20}
        aria-label={playing ? 'Pause audio' : 'Play audio'}
        onClick={onToggle}
      />
      <ProgressBar
        value={done}
        max={total}
        size="sm"
        aria-label="Audio progress"
        className="flex-1"
      />
      <span className="text-[13px] font-extrabold text-muted">
        {done}/{total}
      </span>
      <button
        type="button"
        aria-label={`Playback speed ${rate}×`}
        onClick={onRate}
        className="flex h-11 min-w-11 items-center justify-center rounded-[10px] border-2 border-line bg-surface px-2 text-[13px] font-extrabold text-ink-2"
      >
        {rate}×
      </button>
    </div>
  );
}
