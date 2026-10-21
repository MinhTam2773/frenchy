import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@client/lib/api';
import { queryKeys } from '@client/lib/query';

type StarterDeckTileProps = { chapterId: string; cardCount: number };

/** "Add to reviews": puts the chapter's starter deck into the user's cards. Safe to press twice. */
export function StarterDeckTile({ chapterId, cardCount }: StarterDeckTileProps) {
  const queryClient = useQueryClient();
  const add = useMutation({
    mutationFn: () => api.cards.addStarterDeck(chapterId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cardStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dueCards }),
      ]),
  });

  let action = 'Add to reviews';
  if (add.isPending) action = 'Adding…';
  let result = '';
  if (add.isSuccess) {
    result =
      add.data.added > 0 ? `Added ${add.data.added} to your reviews` : 'Already in your reviews';
    action = result;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={add.isPending || add.isSuccess}
        onClick={() => add.mutate()}
        className="flex min-h-[88px] w-full flex-col items-start gap-1 rounded-[18px] border-2 border-gold bg-gold-soft px-3.5 py-3 text-left text-ink shadow-[0_4px_0_var(--color-gold)] transition-[transform,box-shadow] duration-75 enabled:active:translate-y-1 enabled:active:shadow-none motion-reduce:transition-none"
      >
        <span className="text-xs font-extrabold tracking-[0.08em] text-gold-ink uppercase">
          Starter deck
        </span>{' '}
        <span className="text-base font-extrabold">
          {cardCount} {cardCount === 1 ? 'card' : 'cards'}
        </span>{' '}
        <span className="text-[13px] font-bold text-gold-ink">{action}</span>
      </button>
      {/* Outside the button so it is announced; the button's own name carries the action (G-73). */}
      <span role="status" className="sr-only">
        {result}
      </span>
      {add.isError && (
        <p role="alert" className="text-sm font-bold text-danger-ink">
          Could not add the deck. Try again.
        </p>
      )}
    </div>
  );
}
