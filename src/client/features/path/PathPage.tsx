import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCourse } from '@shared/content';
import { api } from '@client/lib/api';
import { queryKeys, useProfile } from '@client/lib/query';
import { Button, StreakChip } from '@client/ui';
import { StageBanner } from './StageBanner';
import { StagePath } from './StagePath';
import { stageNodes, stageOfCurrent } from './pathModel';

export function PathPage() {
  const profile = useProfile();
  const streak = useQuery({ queryKey: queryKeys.streak, queryFn: api.streak });
  const [chosenStageId, setChosenStageId] = useState<string>();

  const course = getCourse();
  const currentChapterId = profile.data ? profile.data.currentChapterId : null;
  const stage =
    course.stages.find((s) => s.id === chosenStageId) ?? stageOfCurrent(course, currentChapterId);

  return (
    <div className="min-h-full bg-surface pb-6">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="font-display text-[26px] font-semibold">Your path</h1>
        {streak.data && <StreakChip count={streak.data.current} to="/streak" />}
      </header>

      {profile.isPending && (
        <p role="status" className="px-5 pt-4 text-muted">
          Loading your path…
        </p>
      )}
      {profile.isError && (
        <div role="alert" className="flex flex-col items-start gap-3 px-5 pt-4">
          <p className="font-bold">Could not load your path.</p>
          <Button size="sm" variant="secondary" onClick={() => void profile.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {profile.isSuccess && stage && (
        <>
          <StageBanner
            course={course}
            stage={stage}
            currentChapterId={currentChapterId}
            onChoose={setChosenStageId}
          />
          <div className="pt-6">
            <StagePath nodes={stageNodes(course, stage, currentChapterId)} />
          </div>
        </>
      )}
    </div>
  );
}
