import type { Chapter } from '@shared/schemas';
import { Icon, Link, type IconName } from '@client/ui';
import { cx } from '@client/ui/cx';
import { CURRENT_SIZE, NODE_SIZE, type NodeState } from './pathModel';

// The mockup's done node is a white check on gold (about 1.9:1). A check needs 3:1, so it is ink
// on gold instead (about 9:1). See L-18 / G-18.
const LOOKS: Record<NodeState, string> = {
  done: 'bg-gold text-ink shadow-[0_5px_0_var(--color-gold-shadow)]',
  current: 'bg-primary text-white shadow-[0_6px_0_var(--color-primary-shadow)]',
  locked: 'bg-line text-muted shadow-[0_5px_0_var(--color-switch-off)]',
  reference: 'border-2 border-primary-line bg-primary-soft text-primary shadow-chunk-primary-line',
};

function iconFor(chapter: Chapter, state: NodeState): { name: IconName; size: number } {
  if (state === 'current') return { name: 'star', size: 34 };
  if (chapter.kind === 'appendix') return { name: 'book', size: 28 };
  if (state === 'done') return { name: 'check', size: 30 };
  return chapter.kind === 'conversation' ? { name: 'chat', size: 28 } : { name: 'lock', size: 26 };
}

/** Screen-reader name: "Chapter 4, Numbers, locked". */
export function nodeLabel(chapter: Chapter, state: NodeState): string {
  const kind = chapter.kind === 'appendix' ? 'Appendix' : 'Chapter';
  return `${kind} ${chapter.number}, ${chapter.title}, ${state}`;
}

type PathNodeProps = {
  chapter: Chapter;
  state: NodeState;
  /** Centre of the node on the 390 px canvas. */
  x: number;
  y: number;
};

/** A chapter on the path. Every state is a link: locked chapters open read-only (G-07). */
export function PathNode({ chapter, state, x, y }: PathNodeProps) {
  const current = state === 'current';
  const size = current ? CURRENT_SIZE : NODE_SIZE;
  const icon = iconFor(chapter, state);
  return (
    // The wrapper centres the node on its point, so the link is free to move down when pressed.
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      style={{ left: `${(x / 390) * 100}%`, top: y }}
    >
      {current && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-primary-line"
        />
      )}
      <Link
        to={`/chapter/${chapter.id}`}
        aria-label={nodeLabel(chapter, state)}
        aria-current={current ? 'step' : undefined}
        style={{ width: size, height: size }}
        className={cx(
          'relative flex items-center justify-center no-underline',
          'transition-[transform,box-shadow] duration-75 motion-reduce:transition-none',
          'active:translate-y-[5px] active:shadow-none',
          chapter.kind === 'conversation' ? 'rounded-[20px]' : 'rounded-full',
          LOOKS[state],
        )}
      >
        <Icon name={icon.name} size={icon.size} />
      </Link>
    </div>
  );
}
