import type { ChapterSection } from '@shared/schemas';
import { cx } from '@client/ui/cx';

type SectionProgressProps = {
  sections: ChapterSection[];
  /** Every section of a finished chapter is done; nothing records progress inside the others yet. */
  allDone: boolean;
};

/** The strip of book sections under the title. Renders nothing while a chapter has no sections (G-06). */
export function SectionProgress({ sections, allDone }: SectionProgressProps) {
  if (sections.length === 0) return null;
  return (
    <ul
      aria-label={`Book sections: ${sections.length}${allDone ? ', all done' : ''}`}
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
    >
      {sections.map((section, i) => (
        <li key={section.label} className="flex flex-col gap-1.5">
          <div className={cx('h-2.5 rounded-full', allDone ? 'bg-gold' : 'bg-line')} />
          <span
            className={cx(
              'text-xs',
              allDone ? 'font-extrabold text-gold-ink' : 'font-bold text-muted',
            )}
          >
            §{i + 1}
            {allDone && ' done'}
          </span>
        </li>
      ))}
    </ul>
  );
}
