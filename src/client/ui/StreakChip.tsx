import { cx } from './cx';
import { Icon } from './Icon';
import { Link } from './Link';

type StreakChipProps = {
  kind?: 'streak' | 'freeze';
  count: number;
  /** Makes the chip a link (the Today header sends both chips to /streak). */
  to?: string;
  'aria-label'?: string;
  className?: string;
};

export function StreakChip({
  kind = 'streak',
  count,
  to,
  className,
  'aria-label': ariaLabel,
}: StreakChipProps) {
  const isStreak = kind === 'streak';
  const label =
    ariaLabel ??
    (isStreak ? `${count} day streak` : `${count} streak ${count === 1 ? 'freeze' : 'freezes'}`);
  const classes = cx(
    'inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-line bg-surface px-3 text-[17px] font-extrabold no-underline',
    isStreak ? 'text-flame-text' : 'text-freeze-ink',
    className,
  );
  const content = (
    <>
      <Icon
        name={isStreak ? 'flame' : 'snowflake'}
        size={isStreak ? 22 : 20}
        className={isStreak ? 'text-flame' : 'text-freeze'}
      />
      {count}
    </>
  );
  return to === undefined ? (
    <span role="img" aria-label={label} className={classes}>
      {content}
    </span>
  ) : (
    <Link to={to} aria-label={label} className={classes}>
      {content}
    </Link>
  );
}
