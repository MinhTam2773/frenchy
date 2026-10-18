import { routeChapters } from '@shared/content';
import type { Chapter, Course, Stage } from '@shared/schemas';

/** Appendices are reference material (G-23): never done, never locked, never counted as a step. */
export type NodeState = 'done' | 'current' | 'locked' | 'reference';

export type PathNodeModel = { chapter: Chapter; state: NodeState };

function isStep(chapter: Chapter) {
  return chapter.kind !== 'appendix';
}

/** The current chapter's place in the route. With no (or an unknown) id, the first real chapter. */
export function currentIndex(route: Chapter[], currentChapterId: string | null): number {
  const found = route.findIndex((chapter) => chapter.id === currentChapterId);
  return found !== -1 ? found : Math.max(0, route.findIndex(isStep));
}

function stateAt(chapter: Chapter, index: number, current: number): NodeState {
  if (index === current) return 'current';
  if (!isStep(chapter)) return 'reference';
  return index < current ? 'done' : 'locked';
}

/** State of one chapter, for screens that are not the map. */
export function chapterState(
  course: Course,
  chapterId: string,
  currentChapterId: string | null,
): NodeState {
  const route = routeChapters(course);
  const index = route.findIndex((chapter) => chapter.id === chapterId);
  const chapter = route[index];
  return chapter ? stateAt(chapter, index, currentIndex(route, currentChapterId)) : 'locked';
}

export function stageNodes(
  course: Course,
  stage: Stage,
  currentChapterId: string | null,
): PathNodeModel[] {
  const route = routeChapters(course);
  const current = currentIndex(route, currentChapterId);
  return stage.chapters.map((chapter) => ({
    chapter,
    state: stateAt(chapter, route.indexOf(chapter), current),
  }));
}

export function stageProgress(nodes: PathNodeModel[]) {
  return {
    done: nodes.filter((node) => node.state === 'done').length,
    total: nodes.filter((node) => isStep(node.chapter)).length,
  };
}

/** The stage that holds the current chapter. */
export function stageOfCurrent(course: Course, currentChapterId: string | null): Stage | undefined {
  const route = routeChapters(course);
  const chapter = route[currentIndex(route, currentChapterId)];
  return course.stages.find((stage) => stage.chapters.some((c) => c === chapter));
}

// The winding path is drawn on the mockup's 390 px canvas and scaled sideways with the column.
export const CANVAS_WIDTH = 390;
export const NODE_SIZE = 64;
export const CURRENT_SIZE = 76;
const CENTER_X = 195;
const FIRST_Y = 36;
const STEP_Y = 68;
/** Extra room above and below the bigger current node. */
const CURRENT_PAD = 4;
const BOTTOM_PAD = 70;
const SWING = [0, 50, 80, 50, 0, -50, -80, -50];

export type NodePoint = { x: number; y: number; side: 'left' | 'right' };

/**
 * Centre of each node. `side` is where its label goes: the path swings right of centre with the
 * label on its left, and the other way round when it swings left.
 */
export function layoutPath(count: number, currentLocal: number) {
  const points: NodePoint[] = [];
  let y = FIRST_Y;
  for (let i = 0; i < count; i++) {
    if (i > 0) y += STEP_Y + (i === currentLocal || i - 1 === currentLocal ? CURRENT_PAD : 0);
    const swing = SWING[i % SWING.length] ?? 0;
    points.push({ x: CENTER_X + swing, y, side: swing > 0 ? 'left' : 'right' });
  }
  return { points, height: y + BOTTOM_PAD };
}

/** Rough width of a 14 px bold label, to keep the mascot off it. */
export const labelWidth = (text: string) => text.length * 7.6;

const MASCOT_RIGHT_EDGE = 108;

/**
 * Where the mascot sits: on the free left side of a node that swings right, one to four rows
 * before the current node (nearest to two rows before), where the label ends clear of it.
 * Undefined when the current node is not on this stage or nothing fits.
 */
export function mascotIndex(
  points: NodePoint[],
  currentLocal: number,
  labelWidths: number[],
): number | undefined {
  const target = currentLocal - 2;
  let best: number | undefined;
  for (let i = Math.max(0, currentLocal - 4); i < currentLocal; i++) {
    const point = points[i];
    if (!point || point.side !== 'left') continue;
    const labelStart = point.x - NODE_SIZE / 2 - 12 - (labelWidths[i] ?? 0);
    if (labelStart < MASCOT_RIGHT_EDGE) continue;
    if (best === undefined || Math.abs(i - target) < Math.abs(best - target)) best = i;
  }
  return best;
}
