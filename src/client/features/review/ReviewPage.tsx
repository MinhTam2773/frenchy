import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@client/lib/api';
import { queryKeys } from '@client/lib/query';
import { Button, Mascot } from '@client/ui';
import { DUE_LIMIT, NEW_CARDS_PER_DAY } from '@shared/constants';
import { ReviewSession } from './ReviewSession';
import { capNewCards } from './session';

export function ReviewPage() {
  // The session works on the list it started with, so a refetch must not swap cards mid-way, and
  // leaving the screen drops the list so the next visit asks the server again.
  const due = useQuery({
    queryKey: [...queryKeys.dueCards, { limit: DUE_LIMIT.default }],
    queryFn: () => api.cards.due(DUE_LIMIT.default),
    staleTime: Infinity,
    gcTime: 0,
  });
  // Kept loaded so the session can tell what the streak was before it (ReviewDone says "Up from").
  useQuery({ queryKey: queryKeys.streak, queryFn: api.streak });

  if (due.isPending) {
    return (
      <p role="status" className="p-5 text-center font-bold text-muted">
        Loading your cards…
      </p>
    );
  }
  if (due.isError) {
    return (
      <Message title="Couldn’t load your cards" body="Check your connection and try again.">
        <Button size="lg" fullWidth onClick={() => void due.refetch()}>
          Try again
        </Button>
        <Button variant="secondary" size="lg" fullWidth to="/today">
          Back to Today
        </Button>
      </Message>
    );
  }

  const cards = capNewCards(due.data.cards, NEW_CARDS_PER_DAY);
  if (cards.length === 0) {
    return (
      <Message title="You’re all caught up" body="No cards are due right now.">
        <Button size="lg" fullWidth to="/today">
          Back to Today
        </Button>
      </Message>
    );
  }
  return <ReviewSession cards={cards} />;
}

function Message({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <Mascot size={150} />
        <h1 className="font-display text-[26px] font-semibold">{title}</h1>
        <p className="text-base font-semibold text-muted">{body}</p>
      </div>
      <div className="flex flex-col gap-2 px-5 pt-[18px] pb-[30px]">{children}</div>
    </div>
  );
}
