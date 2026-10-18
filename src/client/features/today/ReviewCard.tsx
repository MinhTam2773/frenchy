import type { CardStats } from '@shared/schemas';
import { Button, Card, Icon } from '@client/ui';
import { estimateReviewMinutes, formatDueIn } from './format';

const OVERLINE = 'text-[13px] font-extrabold tracking-[0.08em] uppercase';

function StepBadge() {
  return (
    <span
      aria-hidden="true"
      className="flex size-[26px] items-center justify-center rounded-full bg-surface text-sm font-extrabold text-primary"
    >
      1
    </span>
  );
}

function Body({ stats, now }: { stats: CardStats; now: number }) {
  if (stats.due > 0) {
    return (
      <>
        <p className="flex items-baseline gap-2.5">
          <span className="font-display text-5xl leading-none font-bold">{stats.due}</span>
          <span className="text-[17px] font-bold">
            {stats.due === 1 ? 'card' : 'cards'} due · about {estimateReviewMinutes(stats.due)} min
          </span>
        </p>
        <Button to="/review" variant="inverse" size="sm" fullWidth>
          Start review
        </Button>
      </>
    );
  }
  return (
    <p className="flex items-center gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
        <Icon name="check" size={26} />
      </span>
      <span className="flex flex-col">
        <span className="font-display text-[26px] leading-tight font-semibold">All caught up</span>
        <span className="text-[15px] font-bold">
          {stats.nextDueAt === null
            ? 'Add a chapter’s cards to start reviewing'
            : `Next card due ${formatDueIn(stats.nextDueAt, now)}`}
        </span>
      </span>
    </p>
  );
}

/** Step 1: the one thing to do first. */
export function ReviewCard({ stats, now }: { stats: CardStats; now: number }) {
  return (
    <Card tone="primary" className="relative overflow-hidden">
      <section aria-labelledby="today-review" className="flex flex-col gap-3.5 p-[18px]">
        <div
          aria-hidden="true"
          className="absolute -top-[30px] -right-[30px] size-[120px] rounded-full bg-surface/10"
        />
        <div className="flex items-center gap-2.5">
          <StepBadge />
          <h2 id="today-review" className={OVERLINE}>
            Review first
          </h2>
        </div>
        <Body stats={stats} now={now} />
      </section>
    </Card>
  );
}
