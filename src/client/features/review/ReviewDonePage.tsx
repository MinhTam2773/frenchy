import { useQuery } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router';
import { nextUnreadText } from '@client/features/today/nextUnreadText';
import { api } from '@client/lib/api';
import { queryKeys, useProfile } from '@client/lib/query';
import { Button, Icon, Link, Mascot } from '@client/ui';
import { getChapter, getChapterTexts } from '@shared/content';
import type { StreakResponse } from '@shared/schemas';
import { correctPercent, formatDuration, SessionStats } from './session';

/** Confetti: fixed spots, decorative only. */
const CONFETTI = [
  'top-[70px] left-10 size-3.5 rounded bg-gold rotate-[20deg]',
  'top-[120px] left-[300px] size-3 rounded-full bg-fem-dot',
  'top-[210px] left-[70px] size-2.5 rounded-full bg-primary',
  'top-[60px] left-[220px] h-[18px] w-2.5 rounded bg-success -rotate-[25deg]',
  'top-[230px] left-80 h-2 w-4 rounded bg-gold rotate-[35deg]',
  'top-40 left-6 h-4 w-2 rounded bg-fem-dot rotate-[40deg]',
];

export function ReviewDonePage() {
  const location = useLocation();
  // The numbers arrive in the navigation state; a reload or a pasted link has none.
  const parsed = SessionStats.safeParse(location.state);
  if (!parsed.success) return <Navigate to="/today" replace />;
  return <SessionComplete stats={parsed.data} />;
}

function SessionComplete({ stats }: { stats: SessionStats }) {
  const cardStats = useQuery({
    queryKey: queryKeys.cardStats,
    queryFn: api.cards.stats,
    refetchOnMount: 'always',
  });
  const streak = useQuery({ queryKey: queryKeys.streak, queryFn: api.streak });

  // Not while refetching: the cached count is from before the session.
  const left = cardStats.isFetching ? undefined : cardStats.data?.due;
  const subtitle =
    left === undefined
      ? ''
      : left > 0
        ? ` ${left} more ${left === 1 ? 'card is' : 'cards are'} due right now.`
        : ' You’re all caught up.';

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-surface">
      {CONFETTI.map((position) => (
        <div key={position} aria-hidden="true" className={`absolute ${position}`} />
      ))}

      <div className="flex flex-1 flex-col items-center gap-[18px] px-6 pt-[72px]">
        <Mascot mood="cheer" size={190} label="Mascot cheering" />
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="font-display text-[32px] leading-[1.1] font-semibold">
            Session complete!
          </h1>
          <p className="text-[17px] font-bold text-muted">
            <span lang="fr">Très bien.</span>
            {subtitle}
          </p>
        </div>

        {streak.data && <StreakNote streak={streak.data} before={stats.streakBefore} />}

        <div className="grid w-full grid-cols-3 gap-2.5">
          <Stat label="Cards" value={String(stats.cards)} tone="primary" />
          <Stat label="Correct" value={`${correctPercent(stats)}%`} tone="success" />
          <Stat label="Time" value={formatDuration(stats.durationMs)} tone="warn" />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 pt-[18px] pb-[30px]">
        <UpNext />
        <Button size="lg" fullWidth to="/today">
          Continue
        </Button>
      </div>
    </div>
  );
}

function StreakNote({
  streak,
  before,
}: {
  streak: StreakResponse;
  before: SessionStats['streakBefore'];
}) {
  const up = before && !before.todayDone && streak.todayDone && streak.current > before.current;
  const note = !streak.todayDone
    ? 'Come back tomorrow to keep it going.'
    : up
      ? `Today counts. Up from ${before.current}.`
      : 'Today counts.';
  return (
    <div className="flex items-center gap-3 rounded-[18px] border-2 border-flame-line bg-flame-soft px-[18px] py-3">
      <Icon name="flame" size={40} className="text-flame" />
      <div className="flex flex-col">
        <span className="font-display text-2xl leading-[1.1] font-bold text-flame-text">
          {streak.current}-day streak
        </span>
        <span className="text-sm font-bold text-flame-ink">{note}</span>
      </div>
    </div>
  );
}

const STAT_TONES = {
  primary: { box: 'border-primary-line', head: 'bg-primary' },
  success: { box: 'border-success-line', head: 'bg-success' },
  warn: { box: 'border-gold-pale', head: 'bg-warn' },
} as const;

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof STAT_TONES;
}) {
  const { box, head } = STAT_TONES[tone];
  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border-2 ${box}`}>
      <span
        className={`py-[5px] text-center text-xs font-extrabold tracking-[0.06em] text-white uppercase ${head}`}
      >
        {label}
      </span>
      <span className="py-2.5 text-center font-display text-[26px] font-bold">{value}</span>
    </div>
  );
}

/** The next unread text of the current chapter; the chapter page when it has none yet. */
function UpNext() {
  const profile = useProfile();
  const readings = useQuery({ queryKey: queryKeys.readings, queryFn: api.activity.readings });
  const chapterId = profile.data?.currentChapterId;
  if (!chapterId || !readings.data) return null;

  // Same rule as Today's reading card (G-42).
  const pick = nextUnreadText(getChapterTexts(chapterId), readings.data.readings);
  const text = pick.kind === 'next' ? pick.text : undefined;
  const chapter = getChapter(chapterId);
  const target = text
    ? {
        to: `/read/${text.id}`,
        title: (
          <>
            Read: <span lang="fr">{text.title}</span>
          </>
        ),
      }
    : chapter && {
        to: `/chapter/${chapterId}`,
        title: `Chapter ${chapter.number}: ${chapter.title}`,
      };
  if (!target) return null;

  return (
    <Link
      to={target.to}
      className="flex items-center gap-3 rounded-2xl border-2 border-line bg-ground px-3.5 py-3 text-ink no-underline"
    >
      <span className="flex flex-1 flex-col">
        <span className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">
          Up next
        </span>
        <span className="text-base font-extrabold">{target.title}</span>
      </span>
      <Icon name="forward" size={20} className="text-primary" />
    </Link>
  );
}
