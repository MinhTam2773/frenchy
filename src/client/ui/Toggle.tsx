import { cx } from './cx';

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Required: the switch has no visible text of its own. */
  'aria-label': string;
  disabled?: boolean;
};

export function Toggle({ checked, onChange, disabled, 'aria-label': ariaLabel }: ToggleProps) {
  return (
    // The button is 44px tall for touch; the 52x32 track from the mockup sits inside it.
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-[52px] shrink-0 items-center rounded-full disabled:opacity-50"
    >
      <span
        className={cx(
          'flex h-8 w-full rounded-full p-[3px] transition-colors motion-reduce:transition-none',
          checked ? 'justify-end bg-primary' : 'justify-start bg-switch-off',
        )}
      >
        <span className="size-[26px] rounded-full bg-surface shadow-[0_2px_0_rgb(0_0_0/0.15)]" />
      </span>
    </button>
  );
}
