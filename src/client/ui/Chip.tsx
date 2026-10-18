import type { ReactNode } from 'react';
import { cx } from './cx';

export type ChipStatus = 'new' | 'learning' | 'known';

type ChipProps = (
  | { variant?: 'neutral' | 'masc' | 'fem' | 'new'; status?: undefined }
  | { variant: 'status'; status: ChipStatus }
) & { className?: string; children?: ReactNode };

const VARIANTS = {
  neutral: 'bg-chip text-ink-2',
  masc: 'bg-primary-soft text-masc',
  fem: 'bg-fem-soft text-fem',
  new: 'bg-new-word text-new-word-ink',
} as const;

// Word-list status pills (My words). "New" is the pink one in the mockup.
const STATUSES: Record<ChipStatus, { label: string; classes: string }> = {
  new: { label: 'New', classes: 'bg-danger-soft text-danger-ink' },
  learning: { label: 'Learning', classes: 'bg-gold-soft text-new-word-ink' },
  known: { label: 'Known', classes: 'bg-success-soft text-success-ink' },
};

export function Chip(props: ChipProps) {
  const status = props.variant === 'status' ? STATUSES[props.status] : undefined;
  const look =
    props.variant === 'status'
      ? STATUSES[props.status].classes
      : VARIANTS[props.variant ?? 'neutral'];
  return (
    <span
      className={cx(
        'inline-flex h-7 items-center rounded-full px-2.5 text-[13px] font-extrabold whitespace-nowrap',
        look,
        props.className,
      )}
    >
      {props.children ?? status?.label}
    </span>
  );
}
