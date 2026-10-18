import { useState } from 'react';
import { Navigate } from 'react-router';
import type { Chapter } from '@shared/schemas';
import { Button, ProgressBar, StreakChip } from '@client/ui';
import { ReviewCard } from './ReviewCard';
import { BookCard, OutputCard, ReadingCard } from './StepCards';
import { useToday, type TodayData } from './useToday';

function Header({ streak }: { streak?: TodayData['streak'] }) {
  return (
    <header className="flex items-center justify-between px-5 pt-4 pb-1.5">
      <span className="font-display text-[26px] font-bold text-primary">frenchy</span>
      {streak && (
        <div className="flex gap-2">
          <StreakChip count={streak.current} to="/streak" />
          <StreakChip kind="freeze" count={streak.freezesLeft} to="/streak" />
        </div>
      )}
    </header>
  );
}

function Greeting({ streak, goal }: { streak: TodayData['streak']; goal: number }) {
  const atRisk = streak.current > 0 && !streak.todayDone;
  return (
    <section className="flex flex-col gap-2 px-5 pt-2 pb-3">
      <h1 lang="fr" className="font-display text-3xl leading-[1.1] font-semibold">
        Bonjour&nbsp;!
      </h1>
      <div className="flex items-center gap-2.5">
        <ProgressBar
          value={streak.todayMinutes}
          max={goal}
          tone="gold"
          aria-label="Minutes today"
          className="flex-1"
        />
        <span className="text-sm font-extrabold text-ink-2">
          {streak.todayMinutes} / {goal} min
        </span>
      </div>
      {atRisk && (
        <p className="text-sm font-bold text-flame-text">
          Review a card or finish a reading today to keep your {streak.current}-day streak.
        </p>
      )}
    </section>
  );
}

function Plan({ data, chapter, now }: { data: TodayData; chapter: Chapter; now: number }) {
  const { stats, reading } = data;
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <ReviewCard stats={stats} now={now} />
      <BookCard chapter={chapter} />
      <ReadingCard chapter={chapter} reading={reading} />
      <OutputCard />
    </div>
  );
}

export function TodayPage() {
  const today = useToday();
  // Fixed at mount so "Next card due in 3 h" doesn't change on every render.
  const [now] = useState(Date.now);

  if (today.status === 'loading') {
    return (
      <>
        <Header />
        <p role="status" className="px-5 pt-4 text-muted">
          Loading today…
        </p>
      </>
    );
  }
  if (today.status === 'error') {
    return (
      <>
        <Header />
        <div role="alert" className="flex flex-col items-start gap-3 px-5 pt-4">
          <p className="font-bold">Couldn’t load today’s plan.</p>
          <Button variant="secondary" size="sm" onClick={today.retry}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  const { data } = today;
  const { chapter } = data;
  // No chapter yet means onboarding hasn't run.
  if (!chapter) return <Navigate to="/onboarding" replace />;
  return (
    <>
      <Header streak={data.streak} />
      <Greeting streak={data.streak} goal={data.profile.dailyGoalMinutes} />
      <Plan data={data} chapter={chapter} now={now} />
    </>
  );
}
