import type { MouseEventHandler, ReactNode } from 'react';
import { cx } from './cx';
import { IconButton } from './IconButton';

type TopBarNav = {
  icon: 'back' | 'close';
  /** Accessible name of the button, e.g. "Back" or "Close reader". */
  label: string;
} & (
  | { to: string; onClick?: undefined }
  | { onClick: MouseEventHandler<HTMLButtonElement>; to?: undefined }
);

type TopBarProps = {
  title: string;
  /** Small uppercase line above the title (the reader's "Ch 10 · Reading 1"). */
  overline?: string;
  nav?: TopBarNav;
  /** Right slot: actions, chips. */
  end?: ReactNode;
  align?: 'start' | 'center';
  className?: string;
};

export function TopBar({ title, overline, nav, end, align = 'start', className }: TopBarProps) {
  const centered = align === 'center';
  return (
    <header className={cx('flex items-center gap-2 px-4 pt-3.5 pb-1', className)}>
      {nav &&
        (nav.to !== undefined ? (
          <IconButton icon={nav.icon} aria-label={nav.label} to={nav.to} />
        ) : (
          <IconButton icon={nav.icon} aria-label={nav.label} onClick={nav.onClick} />
        ))}
      <div className={cx('flex min-w-0 flex-1 flex-col', centered && 'items-center text-center')}>
        {overline && (
          <span className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">
            {overline}
          </span>
        )}
        <h1
          className={cx(
            'truncate',
            overline ? 'text-base font-extrabold' : 'font-display text-[22px] font-semibold',
          )}
        >
          {title}
        </h1>
      </div>
      {end ?? (centered && nav ? <span className="size-11 shrink-0" aria-hidden="true" /> : null)}
    </header>
  );
}
