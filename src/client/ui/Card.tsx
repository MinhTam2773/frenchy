import type { ReactNode } from 'react';
import { cx } from './cx';
import { Link } from './Link';

export type CardTone = 'plain' | 'primary';

type CardProps = {
  tone?: CardTone;
  /** Makes the whole card a link. */
  to?: string;
  className?: string;
  children: ReactNode;
};

const TONES: Record<CardTone, string> = {
  plain: 'rounded-card border-2 border-line bg-surface text-ink shadow-chunk-line',
  primary: 'rounded-[22px] bg-primary text-white shadow-chunk-hero',
};

export function Card({ tone = 'plain', to, className, children }: CardProps) {
  const classes = cx('block no-underline', TONES[tone], className);
  return to === undefined ? (
    <div className={classes}>{children}</div>
  ) : (
    <Link to={to} className={classes}>
      {children}
    </Link>
  );
}
