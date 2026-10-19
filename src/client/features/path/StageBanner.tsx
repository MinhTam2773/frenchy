import { useState } from 'react';
import type { Course, Stage } from '@shared/schemas';
import { BottomSheet, Icon } from '@client/ui';
import { cx } from '@client/ui/cx';
import { stageNodes, stageProgress } from './pathModel';

function stageOverline(stage: Stage) {
  return `Stage ${stage.number} · ${stage.level} · weeks ${stage.weekStart}–${stage.weekEnd}`;
}

function progressText(done: number, total: number) {
  return `${done} of ${total} chapters done`;
}

type StageBannerProps = {
  course: Course;
  stage: Stage;
  currentChapterId: string | null;
  onChoose: (stageId: string) => void;
};

/** The blue banner: which stage is on the map, and the book button that switches stage. */
export function StageBanner({ course, stage, currentChapterId, onChoose }: StageBannerProps) {
  const [open, setOpen] = useState(false);
  const { done, total } = stageProgress(stageNodes(course, stage, currentChapterId));
  return (
    <>
      <section
        aria-label="Stage"
        className="mx-4 mt-1 flex items-center gap-3 rounded-[22px] bg-primary px-4 py-3.5 text-white shadow-chunk-hero"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 wrap-anywhere">
          <span className="text-xs font-extrabold tracking-[0.08em] uppercase">
            {stageOverline(stage)}
          </span>
          <h2 className="font-display text-2xl leading-[1.15] font-semibold">{stage.title}</h2>
          <span className="text-sm font-bold">{progressText(done, total)}</span>
        </div>
        <button
          type="button"
          aria-label="Choose stage"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="flex size-12 shrink-0 items-center justify-center rounded-[14px] border-2 border-white/45 bg-white/12 text-white outline-offset-2 focus-visible:outline-white"
        >
          <Icon name="book" />
        </button>
      </section>

      <BottomSheet open={open} onClose={() => setOpen(false)} label="Choose stage">
        <h2 className="font-display text-xl font-semibold">Choose a stage</h2>
        <ul className="flex flex-col gap-2">
          {course.stages.map((option) => {
            const progress = stageProgress(stageNodes(course, option, currentChapterId));
            const selected = option.id === stage.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => {
                    onChoose(option.id);
                    setOpen(false);
                  }}
                  className={cx(
                    'flex min-h-14 w-full flex-col items-start rounded-card border-2 px-4 py-2 text-left',
                    selected ? 'border-primary bg-primary-soft' : 'border-line bg-surface',
                  )}
                >
                  <span className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">
                    {stageOverline(option)}
                  </span>
                  <span className="text-base font-extrabold">{option.title}</span>
                  <span className="text-[13px] font-bold text-muted">
                    {progressText(progress.done, progress.total)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}
