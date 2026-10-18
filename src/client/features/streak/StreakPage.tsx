import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@client/lib/api';
import { queryKeys } from '@client/lib/query';
import { Button, FlameHero, Icon, IconButton, TopBar } from '@client/ui';
import { cx } from '@client/ui/cx';
import { buildMonth, monthIndexOf, monthTitle, type DayCell } from './calendar';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const CELL_LOOK: Record<DayCell['state'], string> = {
  practiced: 'bg-flame text-flame-ink',
  freeze: 'bg-freeze text-white',
  today: 'border-2 border-flame bg-surface text-flame-text',
  missed: 'bg-chip text-muted',
  future: 'text-faint',
  none: 'text-faint',
};

function CalendarCell({ cell }: { cell: DayCell }) {
  return (
    <div
      role="img"
      aria-label={cell.label}
      className={cx(
        'flex h-[38px] items-center justify-center rounded-[10px] text-sm font-extrabold',
        CELL_LOOK[cell.state],
        cell.isToday && cell.state !== 'today' && 'border-2 border-flame-text',
      )}
    >
      {cell.state === 'freeze' ? <Icon name="snowflake" size={16} strokeWidth={2.8} /> : cell.day}
    </div>
  );
}

function LegendItem({ swatch, children }: { swatch: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cx('size-3 rounded-[4px]', swatch)} aria-hidden="true" />
      {children}
    </span>
  );
}

export function StreakPage() {
  const streak = useQuery({ queryKey: queryKeys.streak, queryFn: api.streak });
  // Months away from today's month (0 = this month).
  const [shift, setShift] = useState(0);

  const data = streak.data;
  if (!data) {
    return (
      <>
        <TopBar title="Streak" nav={{ icon: 'back', label: 'Back', to: '/today' }} />
        <div className="px-4 pt-4">
          {streak.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="font-bold text-ink-2">Couldn't load your streak.</p>
              <Button size="sm" variant="secondary" onClick={() => void streak.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <p className="font-bold text-muted">Loading…</p>
          )}
        </div>
      </>
    );
  }

  const thisMonth = monthIndexOf(data.today);
  const firstMonth = data.calendar[0] ? monthIndexOf(data.calendar[0].date) : thisMonth;
  const shown = thisMonth + shift;
  const grid = buildMonth(shown, data);
  const atRisk = !data.todayDone && data.current > 0;

  return (
    <>
      <TopBar title="Streak" nav={{ icon: 'back', label: 'Back', to: '/today' }} />

      <section className="relative mx-4 mt-1.5 flex items-center gap-3.5 overflow-hidden rounded-[24px] bg-flame p-[18px] text-flame-ink shadow-[0_5px_0_var(--color-flame-shadow)]">
        <div
          aria-hidden="true"
          className="absolute -right-6 -bottom-10 size-[140px] rounded-full bg-white/12"
        />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="font-display text-[56px] leading-none font-bold">{data.current}</span>
          <span className="text-lg font-extrabold">day streak</span>
          <span className="text-sm font-bold">
            Best so far: {data.best} {data.best === 1 ? 'day' : 'days'}
          </span>
        </div>
        <FlameHero />
      </section>

      {atRisk && (
        <div className="mx-4 mt-3.5 flex items-center gap-2.5 rounded-[14px] border-2 border-flame-line bg-flame-soft px-3.5 py-2.5">
          <Icon name="clock" size={20} className="shrink-0 text-flame-text" />
          <p className="flex-1 text-sm font-bold text-flame-text">
            Do one review session today to keep it going.
          </p>
        </div>
      )}

      <section
        aria-labelledby="streak-month"
        className="mx-4 mt-3.5 flex flex-col gap-2.5 rounded-card border-2 border-line bg-surface px-3.5 pt-3.5 pb-3"
      >
        <div className="flex items-center justify-between">
          <h2 id="streak-month" className="text-[17px] font-extrabold">
            {monthTitle(shown)}
          </h2>
          <div className="flex gap-1">
            <IconButton
              icon="back"
              aria-label="Previous month"
              iconSize={18}
              disabled={shown <= firstMonth}
              onClick={() => setShift((s) => s - 1)}
              className="border-2 border-line disabled:opacity-40"
            />
            <IconButton
              icon="forward"
              aria-label="Next month"
              iconSize={18}
              disabled={shown >= thisMonth}
              onClick={() => setShift((s) => s + 1)}
              className="border-2 border-line disabled:opacity-40"
            />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold text-muted"
        >
          {WEEKDAYS.map((letter, i) => (
            <span key={i}>{letter}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell, i) =>
            cell ? <CalendarCell key={cell.date} cell={cell} /> : <div key={`pad-${i}`} />,
          )}
        </div>
        <div className="flex flex-wrap gap-3 pt-0.5 text-xs font-bold text-muted">
          <LegendItem swatch="bg-flame">Practiced</LegendItem>
          <LegendItem swatch="bg-freeze">Freeze used</LegendItem>
          <LegendItem swatch="border-2 border-flame">Today</LegendItem>
        </div>
      </section>

      <section className="mx-4 mt-3.5 mb-6 flex items-center gap-3.5 rounded-card border-2 border-freeze-line bg-freeze-soft p-3.5">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-freeze text-white">
          <Icon name="snowflake" size={28} />
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <h2 className="text-[17px] font-extrabold text-freeze-ink">
            {data.freezesLeft === 0
              ? 'No streak freezes'
              : `${data.freezesLeft} streak ${data.freezesLeft === 1 ? 'freeze' : 'freezes'}`}
          </h2>
          <p className="text-sm leading-snug font-bold text-freeze-ink">
            A freeze covers a day you miss. You earn one every 7 days, up to 2.
          </p>
        </div>
      </section>
    </>
  );
}
