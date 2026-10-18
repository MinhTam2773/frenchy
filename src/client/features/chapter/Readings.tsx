import type { Text } from '@shared/schemas';
import { Icon, Link } from '@client/ui';
import { cx } from '@client/ui/cx';

function meta(text: Text) {
  const kind = text.kind === 'story' ? 'Story' : 'Dialogue';
  const words = text.newWords.length;
  return `${kind} · ${text.minutes} min · ${words} new ${words === 1 ? 'word' : 'words'}`;
}

type ReadingsProps = {
  texts: Text[];
  /** Ids of the texts the user has finished. */
  finished: ReadonlySet<string>;
};

/** The chapter's lesson texts. All of them are open (G-07); the first unread one is highlighted. */
export function Readings({ texts, finished }: ReadingsProps) {
  const next = texts.find((text) => !finished.has(text.id));
  const readCount = texts.filter((text) => finished.has(text.id)).length;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="mx-1 mt-1 font-display text-[15px] font-semibold tracking-[0.06em] text-muted uppercase">
        Readings{texts.length > 0 && ` · ${readCount} of ${texts.length} read`}
      </h2>
      {texts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-switch-off bg-chip px-3 py-2.5 text-muted">
          <span className="flex size-10 items-center justify-center rounded-xl bg-line">
            <Icon name="book" size={20} />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-extrabold">No readings yet</span>
            <span className="text-[13px] font-bold">They are on the way for this chapter.</span>
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {texts.map((text, i) => {
            const isNext = text === next;
            const isRead = finished.has(text.id);
            return (
              <li key={text.id}>
                <Link
                  to={`/read/${text.id}`}
                  className={cx(
                    'flex items-center gap-3 rounded-2xl border-2 bg-surface px-3 py-2.5 text-ink no-underline',
                    isNext
                      ? 'border-primary shadow-[0_3px_0_var(--color-primary)]'
                      : 'border-line shadow-[0_3px_0_var(--color-line)]',
                  )}
                >
                  <span
                    className={cx(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl font-display font-bold',
                      isNext && 'bg-primary text-white',
                      isRead && 'bg-success-soft text-success-ink',
                      !isNext && !isRead && 'bg-chip text-ink-2',
                    )}
                  >
                    {isRead ? <Icon name="check" size={20} /> : i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span lang="fr" className="text-base font-extrabold">
                      {text.title}
                    </span>
                    <span className="text-[13px] font-bold text-muted">
                      {meta(text)}
                      {isRead && ' · read'}
                    </span>
                  </span>
                  <Icon
                    name="forward"
                    size={20}
                    className={isNext ? 'text-primary' : 'text-faint'}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
