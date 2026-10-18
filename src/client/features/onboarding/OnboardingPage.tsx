import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { DAILY_GOAL_OPTIONS } from '@shared/constants';
import { getCourse, routeChapters } from '@shared/content';
import { TimeZone } from '@shared/schemas';
import { Button, Mascot, ProgressBar } from '@client/ui';
import { cx } from '@client/ui/cx';
import { api } from '@client/lib/api';
import { queryKeys } from '@client/lib/query';
import { ChapterPicker } from './ChapterPicker';

const course = getCourse();
// Appendices are reference material (G-23), so a new learner starts at the first real chapter.
const FIRST_CHAPTER = routeChapters(course).find((chapter) => chapter.kind !== 'appendix');

/** The device's time zone, so the streak's "today" matches the learner's day (T-13 notes). */
function deviceTimeZone() {
  const parsed = TimeZone.safeParse(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return parsed.success ? parsed.data : undefined;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [chapterId, setChapterId] = useState(FIRST_CHAPTER?.id ?? 'ch1');
  const [goal, setGoal] = useState<(typeof DAILY_GOAL_OPTIONS)[number]>(30);

  const save = useMutation({
    mutationFn: () =>
      api.profile.patch({
        currentChapterId: chapterId,
        dailyGoalMinutes: goal,
        timeZone: deviceTimeZone(),
      }),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      void navigate('/today', { replace: true });
    },
  });

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <div className="px-5 pt-[18px] pb-2">
        <ProgressBar value={2} max={2} size="lg" aria-label="Setup progress" />
      </div>

      <div className="flex items-end gap-2.5 px-5 pt-1 pb-3.5">
        <Mascot size={72} />
        <h1 className="flex-1 rounded-[16px_16px_16px_4px] border-2 border-line bg-surface px-3.5 py-2.5 text-base leading-[1.35] font-bold">
          Which chapter are you on in the book?
        </h1>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-6">
        <ChapterPicker course={course} selectedId={chapterId} onPick={setChapterId} />

        <section aria-labelledby="goal-title" className="flex flex-col gap-2">
          <h2
            id="goal-title"
            className="px-0.5 font-display text-[15px] font-semibold tracking-[0.06em] text-muted uppercase"
          >
            Daily goal
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {DAILY_GOAL_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={minutes === goal}
                onClick={() => setGoal(minutes)}
                className={cx(
                  'h-12 rounded-[14px] border-2 text-[15px] font-extrabold',
                  minutes === goal
                    ? 'border-gold bg-gold-soft text-gold-ink shadow-[0_3px_0_var(--color-gold)]'
                    : 'border-line bg-surface text-ink-2 shadow-[0_3px_0_var(--color-line)]',
                )}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2 border-t-2 border-line bg-surface px-5 pt-3.5 pb-7">
        {save.isError && (
          <p role="alert" className="text-center text-sm font-bold text-danger-ink">
            Could not save your choices. Try again.
          </p>
        )}
        <Button fullWidth disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Start learning'}
        </Button>
      </div>
    </div>
  );
}
