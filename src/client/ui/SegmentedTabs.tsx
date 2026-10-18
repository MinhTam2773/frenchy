import { useRef, type KeyboardEvent } from 'react';
import { cx } from './cx';

type Tab<Id extends string> = { id: Id; label: string };

type SegmentedTabsProps<Id extends string> = {
  tabs: readonly Tab<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  'aria-label': string;
  className?: string;
};

export function SegmentedTabs<Id extends string>({
  tabs,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: SegmentedTabsProps<Id>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  // Roving tabindex: arrows move between tabs, only the selected one is in the Tab order.
  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    const next = tabs[target];
    if (next) {
      onChange(next.id);
      buttons.current[target]?.focus();
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx('flex gap-1 rounded-btn-sm bg-chip p-1', className)}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              'h-11 min-w-0 flex-1 rounded-[10px] px-2 text-sm font-extrabold',
              selected
                ? 'bg-surface text-ink shadow-[0_2px_0_var(--color-line-strong)]'
                : 'text-muted',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
