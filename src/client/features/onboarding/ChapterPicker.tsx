import { useState } from 'react';
import type { Chapter, Course, Stage } from '@shared/schemas';
import { Icon } from '@client/ui';
import { cx } from '@client/ui/cx';

type ChapterPickerProps = {
  course: Course;
  selectedId: string;
  onPick: (chapterId: string) => void;
};

function ChapterRow({
  chapter,
  selected,
  onPick,
}: {
  chapter: Chapter;
  selected: boolean;
  onPick: () => void;
}) {
  const kind = chapter.kind === 'appendix' ? 'Appendix' : 'Chapter';
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onPick}
        className={cx(
          'flex min-h-12 w-full items-center gap-3 rounded-[14px] border-2 py-1.5 pr-3.5 pl-2 text-ink',
          selected
            ? 'border-primary bg-primary-soft shadow-[0_3px_0_var(--color-primary)]'
            : 'border-line bg-surface shadow-[0_3px_0_var(--color-line)]',
        )}
      >
        <span className="sr-only">{`${kind} ${chapter.number}: ${chapter.title}`}</span>
        <span
          aria-hidden="true"
          className={cx(
            'flex h-[34px] min-w-[34px] items-center justify-center rounded-[10px] px-1.5 font-display text-[15px] font-bold',
            selected ? 'bg-primary text-white' : 'bg-chip text-ink-2',
          )}
        >
          {chapter.number}
        </span>
        <span aria-hidden="true" className="flex-1 text-left text-[15px] font-bold">
          {chapter.title}
        </span>
        {selected && <Icon name="check" size={22} className="text-primary" />}
      </button>
    </li>
  );
}

function StageList({
  stage,
  selectedId,
  onPick,
}: { stage: Stage } & Pick<ChapterPickerProps, 'selectedId' | 'onPick'>) {
  return (
    <section aria-labelledby={`${stage.id}-title`} className="flex flex-col gap-[7px]">
      <div className="flex items-baseline justify-between px-0.5 pb-0.5">
        <h2
          id={`${stage.id}-title`}
          className="font-display text-[15px] font-semibold tracking-[0.06em] text-muted uppercase"
        >
          {`Stage ${stage.number} · ${stage.title}`}
        </h2>
        <span className="text-[13px] font-bold text-muted">
          {stage.number === 1 ? 'Book order, beginner route' : stage.level}
        </span>
      </div>
      <ul className="flex flex-col gap-[7px]">
        {stage.chapters.map((chapter) => (
          <ChapterRow
            key={chapter.id}
            chapter={chapter}
            selected={chapter.id === selectedId}
            onPick={() => onPick(chapter.id)}
          />
        ))}
      </ul>
    </section>
  );
}

/** Stage 1 first, as in the mockup; later stages for a learner already further into the book. */
export function ChapterPicker({ course, selectedId, onPick }: ChapterPickerProps) {
  const [first, ...later] = course.stages;
  const [showLater, setShowLater] = useState(false);
  if (!first) return null;
  return (
    <div className="flex flex-col gap-4">
      <StageList stage={first} selectedId={selectedId} onPick={onPick} />
      {showLater ? (
        later.map((stage) => (
          <StageList key={stage.id} stage={stage} selectedId={selectedId} onPick={onPick} />
        ))
      ) : (
        <button
          type="button"
          onClick={() => setShowLater(true)}
          className="min-h-11 self-center px-3 text-[15px] font-extrabold text-primary hover:text-primary-shadow"
        >
          Show later stages
        </button>
      )}
    </div>
  );
}
