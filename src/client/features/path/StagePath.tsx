import type { Chapter } from '@shared/schemas';
import { Mascot } from '@client/ui';
import { cx } from '@client/ui/cx';
import { PathNode } from './PathNode';
import {
  CANVAS_WIDTH,
  CURRENT_SIZE,
  NODE_SIZE,
  labelWidth,
  layoutPath,
  mascotIndex,
  type NodePoint,
  type PathNodeModel,
} from './pathModel';

const GAP = 12;
const EDGE = 16;
const BUBBLE_WIDTH = 124;

const percent = (px: number) => `${(px / CANVAS_WIDTH) * 100}%`;

/** Pins a box beside a node: on the node's left (ending at the node) or on its right. */
function beside({ x, side }: NodePoint, half: number, gap: number) {
  return side === 'left'
    ? { left: EDGE, right: percent(CANVAS_WIDTH - (x - half - gap)), textAlign: 'right' as const }
    : { left: percent(x + half + gap), right: EDGE };
}

function labelText(chapter: Chapter) {
  return `${chapter.kind === 'appendix' ? 'App.' : 'Ch'} ${chapter.number} · ${chapter.shortTitle}`;
}

function caption(chapter: Chapter) {
  if (chapter.kind === 'conversation') return 'Conversation';
  return chapter.kind === 'appendix' ? 'Reference' : undefined;
}

function NodeLabel({ node, point }: { node: PathNodeModel; point: NodePoint }) {
  const { chapter, state } = node;
  const note = caption(chapter);
  return (
    <span
      aria-hidden="true"
      style={{ top: point.y, ...beside(point, NODE_SIZE / 2, GAP) }}
      className={cx(
        'absolute flex -translate-y-1/2 flex-col text-sm leading-tight',
        state === 'done' ? 'font-extrabold text-ink-2' : 'font-bold text-muted',
      )}
    >
      {labelText(chapter)}
      {note && (
        <span className="text-xs font-extrabold tracking-[0.06em] text-muted uppercase">
          {note}
        </span>
      )}
    </span>
  );
}

function YouAreHere({ node, point }: { node: PathNodeModel; point: NodePoint }) {
  const { left, right } = beside(point, CURRENT_SIZE / 2, 21);
  // Fixed width, so pin only the edge that touches the node.
  const edge = point.side === 'left' ? { right } : { left };
  return (
    <div
      aria-hidden="true"
      style={{ top: point.y, width: BUBBLE_WIDTH, ...edge }}
      className="absolute -translate-y-1/2 rounded-[14px] border-2 border-line bg-surface px-2.5 py-2 shadow-[0_3px_0_var(--color-line)]"
    >
      <div className="text-xs font-extrabold tracking-[0.08em] text-primary uppercase">
        You&rsquo;re here
      </div>
      <div className="text-sm leading-tight font-extrabold">{labelText(node.chapter)}</div>
    </div>
  );
}

type StagePathProps = { nodes: PathNodeModel[] };

/** One stage as a winding path. Fixed 390 px design, stretched sideways to the column. */
export function StagePath({ nodes }: StagePathProps) {
  const currentLocal = nodes.findIndex((node) => node.state === 'current');
  const { points, height } = layoutPath(nodes.length, currentLocal);

  // Gold up to the current node; a stage already finished is gold all the way, one ahead is dotted.
  const finished = currentLocal === -1 && nodes.some((node) => node.state === 'done');
  const solidEnd = finished ? nodes.length - 1 : currentLocal;
  const line = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((p) => `${p.x},${p.y}`)
      .join(' ');

  const mascotAt = mascotIndex(
    points,
    currentLocal,
    nodes.map((node) => labelWidth(labelText(node.chapter))),
  );
  const mascotPoint = mascotAt === undefined ? undefined : points[mascotAt];

  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: CANVAS_WIDTH, height }}>
      <svg
        viewBox={`0 0 ${CANVAS_WIDTH} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 size-full"
      >
        {solidEnd >= 1 && (
          <polyline
            points={line(0, solidEnd)}
            fill="none"
            className="stroke-gold-pale"
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {solidEnd < nodes.length - 1 && (
          <polyline
            points={line(Math.max(solidEnd, 0), nodes.length - 1)}
            fill="none"
            className="stroke-line"
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2 20"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {mascotPoint && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-3 max-[359px]:hidden"
          style={{ top: mascotPoint.y - 34 }}
        >
          <Mascot size={88} />
        </div>
      )}

      {nodes.map((node, i) => {
        const point = points[i];
        if (!point) return null;
        return (
          <div key={node.chapter.id}>
            <PathNode chapter={node.chapter} state={node.state} x={point.x} y={point.y} />
            {node.state === 'current' ? (
              <YouAreHere node={node} point={point} />
            ) : (
              <NodeLabel node={node} point={point} />
            )}
          </div>
        );
      })}
    </div>
  );
}
