import { cx } from './cx';

export type MascotMood = 'happy' | 'cheer';

type MascotProps = {
  mood?: MascotMood;
  /** Width in px; the height keeps the 140x110 aspect. */
  size?: number;
  /** Set to announce the mascot as an image; otherwise it is decorative. */
  label?: string;
  className?: string;
};

/** The snail. Original artwork, drawn from the mockups. */
export function Mascot({ mood = 'happy', size = 140, label, className }: MascotProps) {
  const cheer = mood === 'cheer';
  return (
    <svg
      width={size}
      height={(size * 110) / 140}
      viewBox="0 0 140 110"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx('overflow-visible', className)}
    >
      <ellipse
        cx="72"
        cy="102"
        rx="58"
        ry="5"
        className={cheer ? 'fill-line' : 'fill-primary-pale'}
      />
      <rect x="14" y="74" width="118" height="24" rx="12" className="fill-snail" />
      <g className="stroke-snail" strokeWidth="5" strokeLinecap="round">
        <line x1="112" y1="50" x2={cheer ? 100 : 104} y2={cheer ? 22 : 26} />
        <line x1="124" y1="50" x2={cheer ? 136 : 132} y2={cheer ? 22 : 26} />
      </g>
      <circle cx="118" cy="62" r="18" className="fill-snail" />
      <g className="fill-surface stroke-ink" strokeWidth="2">
        <circle cx={cheer ? 100 : 104} cy={cheer ? 20 : 24} r="7" />
        <circle cx={cheer ? 136 : 132} cy={cheer ? 20 : 24} r="7" />
      </g>
      {cheer ? (
        <>
          <g className="stroke-ink" fill="none" strokeWidth="2.5" strokeLinecap="round">
            <path d="M96 21 q4 -4 8 0" />
            <path d="M132 21 q4 -4 8 0" />
          </g>
          <circle cx="109" cy="66" r="3.5" className="fill-blush" />
          <path
            d="M112 66 q8 10 16 0 z"
            className="fill-ink stroke-ink"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle cx="105" cy="25" r="3.2" className="fill-ink" />
          <circle cx="133" cy="25" r="3.2" className="fill-ink" />
          <circle cx="110" cy="66" r="3.5" className="fill-blush" />
          <path
            d="M114 68 q6 6 12 0"
            className="stroke-ink"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}
      <circle cx="62" cy="56" r="34" className="fill-primary" />
      <path
        d="M62 56 m-4 0 a4 4 0 1 1 8 0 a10 10 0 1 1 -20 0 a16 16 0 1 1 32 0 a22 22 0 1 1 -44 0"
        className="stroke-surface"
        fill="none"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
