import { useQuery } from '@tanstack/react-query';
import { api } from '@client/lib/api';
import { queryKeys } from '@client/lib/query';
import { Card, Icon, StreakChip, type IconName } from '@client/ui';

const COMING_LATER: { icon: IconName; title: string; hint: string }[] = [
  { icon: 'pencil', title: 'Conjugation drills', hint: 'Present tense · parler, aimer, manger' },
  { icon: 'chat-lines', title: 'AI tutor', hint: 'Chat using the grammar you have learned' },
  { icon: 'mic', title: 'Speaking', hint: 'Pronunciation feedback, voice chat' },
  { icon: 'file-plus', title: 'Import a text', hint: 'Articles, lyrics, subtitles' },
];

function FlashcardsCard() {
  const stats = useQuery({ queryKey: queryKeys.cardStats, queryFn: api.cards.stats });
  const counts = stats.data;
  const breakdown = [
    { label: 'new', value: counts?.new },
    { label: 'learning', value: counts?.learning },
    { label: 'review', value: counts?.review },
  ];
  return (
    <Card tone="primary" to="/review" className="flex flex-col gap-3 p-[18px]">
      <span className="text-[13px] font-extrabold tracking-[0.08em] uppercase">Flashcards</span>
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[44px] leading-none font-bold">
          {counts?.due ?? '–'}
        </span>
        <span className="text-[17px] font-bold">
          {counts?.due === 0 ? 'all caught up' : counts?.due === 1 ? 'card due' : 'cards due'}
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {breakdown.map(({ label, value }) => (
          <div key={label} className="flex flex-col-reverse rounded-xl bg-white/15 px-2.5 py-2">
            <dt className="text-xs font-bold">{label}</dt>
            <dd className="text-lg font-extrabold">{value ?? '–'}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function PracticePage() {
  const streak = useQuery({ queryKey: queryKeys.streak, queryFn: api.streak });
  return (
    <>
      <header className="flex items-center justify-between px-5 pt-4 pb-2.5">
        <h1 className="font-display text-[26px] font-semibold">Practice</h1>
        {streak.data && <StreakChip count={streak.data.current} to="/streak" />}
      </header>

      <div className="flex flex-col gap-3 px-4 pb-6">
        <FlashcardsCard />

        <h2 className="mx-1 mt-1.5 font-display text-[15px] font-semibold tracking-[0.06em] text-muted uppercase">
          Coming later
        </h2>
        <ul className="flex flex-col gap-3">
          {COMING_LATER.map(({ icon, title, hint }) => (
            <li
              key={title}
              className="flex items-center gap-3 rounded-[18px] border-2 border-dashed border-switch-off bg-chip px-3.5 py-3 text-muted"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-line">
                <Icon name={icon} />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-base font-extrabold text-ink-2">{title}</span>
                <span className="text-[13px] font-bold">{hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
