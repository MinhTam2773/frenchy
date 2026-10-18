import type { ReactNode } from 'react';

type IconDef = { strokeWidth: number; filled?: boolean; paths: ReactNode };

// Paths copied from design/mockups. Stroke icons use the stroke width the mockups use.
const ICONS = {
  back: { strokeWidth: 2.4, paths: <path d="M15 6l-6 6 6 6" /> },
  forward: { strokeWidth: 2.6, paths: <path d="M9 6l6 6-6 6" /> },
  close: { strokeWidth: 2.4, paths: <path d="M6 6l12 12M18 6L6 18" /> },
  check: { strokeWidth: 3.2, paths: <path d="M5 12.5l4.5 4.5L19 7" /> },
  plus: { strokeWidth: 3, paths: <path d="M12 5v14M5 12h14" /> },
  lock: {
    strokeWidth: 2.4,
    paths: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  },
  book: {
    strokeWidth: 2.2,
    paths: (
      <>
        <path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z" />
        <path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" />
      </>
    ),
  },
  volume: {
    strokeWidth: 2.2,
    paths: (
      <>
        <path d="M4 9v6h4l5 4V5L8 9z" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      </>
    ),
  },
  'volume-high': {
    strokeWidth: 2.2,
    paths: (
      <>
        <path d="M4 9v6h4l5 4V5L8 9z" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7" />
        <path d="M19 6a8.5 8.5 0 0 1 0 12" />
      </>
    ),
  },
  play: { strokeWidth: 0, filled: true, paths: <path d="M8 5v14l11-7z" /> },
  pause: {
    strokeWidth: 0,
    filled: true,
    paths: (
      <>
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </>
    ),
  },
  star: {
    strokeWidth: 0,
    filled: true,
    paths: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  },
  flame: {
    strokeWidth: 0,
    filled: true,
    paths: (
      <path d="M12 2.5c.8 3.4 4.5 5.2 4.5 10a4.5 4.5 0 0 1-9 0c0-1.9.8-3.2 1.9-4.2.1 1.6.8 2.6 1.9 2.9-.2-3.6-.6-6 .7-8.7z" />
    ),
  },
  dots: {
    strokeWidth: 0,
    filled: true,
    paths: (
      <>
        <circle cx="12" cy="5" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="19" r="2" />
      </>
    ),
  },
  snowflake: { strokeWidth: 2.4, paths: <path d="M12 2v20M4.9 7l14.2 10M19.1 7L4.9 17" /> },
  clock: {
    strokeWidth: 2.4,
    paths: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  chat: { strokeWidth: 2.4, paths: <path d="M4 5h16v11H9l-5 4z" /> },
  'chat-lines': {
    strokeWidth: 2.2,
    paths: (
      <>
        <path d="M4 5h16v11H9l-5 4z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
  },
  pencil: {
    strokeWidth: 2.2,
    paths: (
      <>
        <path d="M4 20h4L19 9l-4-4L4 16z" />
        <path d="M13 7l4 4" />
      </>
    ),
  },
  mic: {
    strokeWidth: 2.2,
    paths: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
      </>
    ),
  },
  'file-plus': {
    strokeWidth: 2.2,
    paths: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5" />
        <path d="M12.5 11v6M9.5 14h6" />
      </>
    ),
  },
  'arrow-right': { strokeWidth: 2.6, paths: <path d="M5 12h14M13 6l6 6-6 6" /> },
  send: { strokeWidth: 2.3, paths: <path d="M4 12l16-8-6 16-3-7z" /> },
  search: {
    strokeWidth: 2.4,
    paths: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </>
    ),
  },
  mail: {
    strokeWidth: 2.2,
    paths: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </>
    ),
  },
  // Tab bar icons
  home: {
    strokeWidth: 2.3,
    paths: (
      <>
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h5v-6h4v6h5V10" />
      </>
    ),
  },
  path: {
    strokeWidth: 2.3,
    paths: (
      <>
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
      </>
    ),
  },
  cards: {
    strokeWidth: 2.3,
    paths: (
      <>
        <rect x="3" y="7" width="13" height="14" rx="3" />
        <path d="M8 3h10a3 3 0 0 1 3 3v11" />
      </>
    ),
  },
  words: {
    strokeWidth: 2.3,
    paths: (
      <>
        <path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
        <path d="M8 7h7M8 11h5" />
      </>
    ),
  },
  user: {
    strokeWidth: 2.3,
    paths: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

/** Decorative inline SVG; colour comes from `currentColor`. Name the control, not the icon. */
export function Icon({ name, size = 24, strokeWidth, className }: IconProps) {
  const icon: IconDef = ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={icon.filled ? 'currentColor' : 'none'}
      stroke={icon.filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth ?? icon.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {icon.paths}
    </svg>
  );
}

/** Two-tone flame from the Streak hero. */
export function FlameHero({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        className="fill-gold-pale"
        d="M12 2.5c.8 3.4 4.5 5.2 4.5 10a4.5 4.5 0 0 1-9 0c0-1.9.8-3.2 1.9-4.2.1 1.6.8 2.6 1.9 2.9-.2-3.6-.6-6 .7-8.7z"
      />
      <path
        className="fill-surface"
        d="M12 11c.4 1.6 2.2 2.5 2.2 4.6a2.2 2.2 0 0 1-4.4 0c0-1 .5-1.6 1-2 .1.8.4 1.2 1 1.3-.1-1.6-.3-2.8.2-3.9z"
      />
    </svg>
  );
}
