import { cx } from './cx';
import { Icon, type IconName } from './Icon';
import { Link } from './Link';

export type TabBarItem = { to: string; label: string; icon: IconName };

export const MAIN_TABS: readonly TabBarItem[] = [
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/path', label: 'Path', icon: 'path' },
  { to: '/practice', label: 'Practice', icon: 'cards' },
  { to: '/words', label: 'Words', icon: 'words' },
  { to: '/me', label: 'Me', icon: 'user' },
];

type TabBarProps = {
  /** The current location's pathname; a tab is current for its path and everything under it. */
  current: string;
  items?: readonly TabBarItem[];
  className?: string;
};

function isCurrent(current: string, to: string) {
  return current === to || current.startsWith(`${to}/`);
}

export function TabBar({ current, items = MAIN_TABS, className }: TabBarProps) {
  return (
    <nav
      aria-label="Main"
      className={cx(
        'flex min-h-[78px] items-start justify-around border-t-2 border-line bg-surface px-1.5 pt-2 pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      {items.map((item) => {
        const active = isCurrent(current, item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex w-[70px] flex-col items-center gap-0.5 text-xs font-extrabold no-underline',
              active ? 'text-primary' : 'text-muted',
            )}
          >
            <span
              className={cx(
                'flex h-[34px] w-[52px] items-center justify-center rounded-xl border-2',
                active ? 'border-primary-line bg-primary-soft' : 'border-transparent',
              )}
            >
              <Icon name={item.icon} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
