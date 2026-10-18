import { cx } from './cx';

export type ProgressTone = 'primary' | 'gold' | 'success';
export type ProgressSize = 'sm' | 'md' | 'lg';

type ProgressBarProps = {
  value: number;
  max: number;
  /** Required: the bar has no visible text of its own. */
  'aria-label': string;
  tone?: ProgressTone;
  size?: ProgressSize;
  className?: string;
};

const TONES: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  gold: 'bg-gold',
  // Review session bar: thicker, with a darker bottom edge like the mockup.
  success: 'bg-success shadow-[inset_0_-4px_0_rgb(0_0_0/0.15)]',
};

const SIZES: Record<ProgressSize, string> = { sm: 'h-2', md: 'h-3', lg: 'h-4' };

export function ProgressBar({
  value,
  max,
  tone = 'primary',
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={ariaLabel}
      className={cx('overflow-hidden rounded-full bg-line', SIZES[size], className)}
    >
      <div className={cx('h-full rounded-full', TONES[tone])} style={{ width: `${percent}%` }} />
    </div>
  );
}
