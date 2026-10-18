import { cx } from './cx';
import { Pressable, type PressableProps } from './Pressable';

export type ButtonVariant =
  'primary' | 'secondary' | 'success' | 'danger' | 'warn' | 'ghost' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-chunk-primary',
  secondary: 'border-2 border-line bg-surface text-ink shadow-chunk-line',
  success: 'bg-success text-white shadow-chunk-success',
  danger: 'bg-danger text-white shadow-chunk-danger',
  warn: 'bg-warn text-white shadow-chunk-warn',
  // For use on a primary-coloured card (the Today review card).
  inverse: 'bg-surface text-primary shadow-chunk-primary-line focus-visible:outline-surface',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-[50px] rounded-btn-sm px-4 text-[15px]',
  md: 'h-[54px] rounded-btn px-5 text-base',
  lg: 'h-14 rounded-btn px-5 text-base',
};

export type ButtonProps = PressableProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  ...rest
}: ButtonProps) {
  return (
    <Pressable
      {...rest}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2.5 font-extrabold tracking-[0.05em] uppercase no-underline',
        'transition-[transform,box-shadow] duration-75 motion-reduce:transition-none',
        variant !== 'ghost' && 'active:translate-y-1 active:shadow-none',
        'disabled:pointer-events-none disabled:bg-chip disabled:text-muted disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
    />
  );
}
