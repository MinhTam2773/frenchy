import { useEffect, useMemo, useState } from 'react';
import { IconButton, ProgressBar } from '@client/ui';

export const RATES = [0.6, 0.8, 1] as const;
const WORDS_PER_MINUTE = 180;
const WORD = /[\p{L}\p{N}]+/gu;

/** The next speed in the cycle; a profile rate between steps moves to the next step up. */
export function nextRate(rate: number): number {
  return RATES.find((r) => r > rate + 1e-9) ?? RATES[0];
}

type AudioBarProps = {
  playing: boolean;
  current: number | null;
  completed: number;
  sentences: readonly string[];
  rate: number;
  onToggle: () => void;
  onRate: () => void;
};

function sentenceSeconds(sentence: string, rate: number): number {
  const words = sentence.match(WORD)?.length ?? 0;
  return (words * 60) / (WORDS_PER_MINUTE * rate);
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function AudioBar({
  playing,
  current,
  completed,
  sentences,
  rate,
  onToggle,
  onRate,
}: AudioBarProps) {
  const durations = useMemo(
    () => sentences.map((text) => sentenceSeconds(text, rate)),
    [sentences, rate],
  );
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  const [timer, setTimer] = useState<{ sentence: number; elapsedMs: number } | null>(null);

  useEffect(() => {
    if (!playing || current === null) return;
    const startedAt = Date.now();
    const interval = setInterval(
      () => setTimer({ sentence: current, elapsedMs: Date.now() - startedAt }),
      250,
    );
    return () => clearInterval(interval);
  }, [current, playing]);

  const finished = durations
    .slice(0, current ?? completed)
    .reduce((sum, duration) => sum + duration, 0);
  const within =
    current === null || timer?.sentence !== current
      ? 0
      : Math.min(timer.elapsedMs / 1000, durations[current] ?? 0);
  const elapsed = Math.min(total, finished + within);
  const elapsedLabel = formatTime(elapsed);
  const totalLabel = formatTime(Math.ceil(total));

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
        value={elapsed}
        max={Math.max(total, 1)}
        size="sm"
        aria-label="Audio progress"
        className="flex-1"
      />
      <span
        aria-label={`Audio time elapsed ${elapsedLabel} of ${totalLabel}`}
        className="whitespace-nowrap text-[13px] font-extrabold text-muted"
      >
        {elapsedLabel} / {totalLabel}
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
