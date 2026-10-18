import { cx } from './cx';
import { Icon, type IconName } from './Icon';
import { Pressable, type PressableProps } from './Pressable';

export type IconButtonVariant = 'ghost' | 'soft' | 'solid';

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'text-muted hover:bg-chip',
  soft: 'border-2 border-primary-line bg-primary-soft text-primary',
  solid:
    'bg-primary text-white shadow-chunk-primary-sm transition-[transform,box-shadow] duration-75 motion-reduce:transition-none active:translate-y-[3px] active:shadow-none',
};

export type IconButtonProps = PressableProps & {
  icon: IconName;
  /** Required: an icon alone has no accessible name. */
  'aria-label': string;
  variant?: IconButtonVariant;
  iconSize?: number;
  children?: never;
};

export function IconButton({
  icon,
  variant = 'ghost',
  iconSize = 24,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <Pressable
      {...rest}
      className={cx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-xl',
        VARIANTS[variant],
        className,
      )}
    >
      <Icon name={icon} size={iconSize} />
    </Pressable>
  );
}
