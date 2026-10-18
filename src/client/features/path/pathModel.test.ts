import { describe, expect, test } from 'vitest';
import { getCourse } from '@shared/content';
import {
  chapterState,
  labelWidth,
  layoutPath,
  mascotIndex,
  stageNodes,
  stageOfCurrent,
  stageProgress,
} from './pathModel';

const course = getCourse();
const [stage1, stage2, stage3, stage4] = course.stages;
if (!stage1 || !stage2 || !stage3 || !stage4) throw new Error('course.json needs four stages');

const states = (stageId: string, current: string | null) =>
  stageNodes(course, course.stages.find((s) => s.id === stageId) ?? stage1, current).map(
    (node) => `${node.chapter.id}:${node.state}`,
  );

describe('node states', () => {
  test('before the current chapter is done, after it is locked, an appendix is a reference', () => {
    expect(states('stage1', 'ch10')).toEqual([
      'appA:reference',
      'ch1:done',
      'ch2:done',
      'ch12:done',
      'ch10:current',
      'ch4:locked',
      'ch7:locked',
      'ch33:locked',
    ]);
  });

  test('a later stage is all locked and an earlier one all done', () => {
    expect(states('stage2', 'ch10').every((s) => s.endsWith(':locked'))).toBe(true);
    expect(
      states('stage1', 'ch28')
        .filter((s) => !s.startsWith('appA'))
        .every((s) => s.endsWith(':done')),
    ).toBe(true);
  });

  test('a conversation chapter follows the same rule', () => {
    expect(states('stage1', 'ch33').at(-1)).toBe('ch33:current');
    expect(states('stage1', 'ch7').at(-1)).toBe('ch33:locked');
  });

  test('with no current chapter the first real chapter is current, not the appendix', () => {
    expect(states('stage1', null).slice(0, 3)).toEqual([
      'appA:reference',
      'ch1:current',
      'ch2:locked',
    ]);
  });

  test('an unknown current chapter is treated like none', () => {
    expect(states('stage1', 'ch99')[1]).toBe('ch1:current');
  });

  test('an appendix can be the current chapter', () => {
    expect(states('stage1', 'appA')[0]).toBe('appA:current');
    expect(states('stage1', 'appA')[1]).toBe('ch1:locked');
  });

  test('the last stage ends with the verb tables as a reference', () => {
    expect(states('stage4', 'ch10').at(-1)).toBe('appC:reference');
  });

  test('chapterState agrees with the map', () => {
    expect(chapterState(course, 'ch12', 'ch10')).toBe('done');
    expect(chapterState(course, 'ch10', 'ch10')).toBe('current');
    expect(chapterState(course, 'ch4', 'ch10')).toBe('locked');
    expect(chapterState(course, 'appC', 'ch10')).toBe('reference');
    expect(chapterState(course, 'nope', 'ch10')).toBe('locked');
  });
});

describe('progress', () => {
  test('counts done chapters, leaving the appendix out of the total', () => {
    expect(stageProgress(stageNodes(course, stage1, 'ch10'))).toEqual({ done: 3, total: 7 });
    expect(stageProgress(stageNodes(course, stage2, 'ch10'))).toEqual({ done: 0, total: 9 });
    expect(stageProgress(stageNodes(course, stage4, 'ch10'))).toEqual({ done: 0, total: 10 });
  });

  test('the current chapter is not done yet', () => {
    expect(stageProgress(stageNodes(course, stage1, 'ch33')).done).toBe(6);
  });

  test('finds the stage of the current chapter', () => {
    expect(stageOfCurrent(course, 'ch10')).toBe(stage1);
    expect(stageOfCurrent(course, 'ch28')).toBe(stage2);
    expect(stageOfCurrent(course, 'appC')).toBe(stage4);
    expect(stageOfCurrent(course, null)).toBe(stage1);
  });
});

describe('layout', () => {
  test('reproduces the mockup positions for the Ch 10 path', () => {
    const { points, height } = layoutPath(8, 4);
    expect(points.map((p) => [p.x, p.y])).toEqual([
      [195, 36],
      [245, 104],
      [275, 172],
      [245, 240],
      [195, 312],
      [145, 384],
      [115, 452],
      [145, 520],
    ]);
    expect(height).toBe(590);
  });

  test('labels sit on the left of a node that swings right, and on the right otherwise', () => {
    const { points } = layoutPath(8, 4);
    expect(points.map((p) => p.side)).toEqual([
      'right',
      'left',
      'left',
      'left',
      'right',
      'right',
      'right',
      'right',
    ]);
  });

  test('a stage without the current chapter has even spacing', () => {
    const { points } = layoutPath(3, -1);
    expect(points.map((p) => p.y)).toEqual([36, 104, 172]);
  });

  test('the mascot sits two rows before the current node when that label is short', () => {
    const { points } = layoutPath(8, 4);
    const short = points.map(() => labelWidth('Ch 2 · Gender'));
    expect(mascotIndex(points, 4, short)).toBe(2);
  });

  test('the mascot skips a row whose label would run under it', () => {
    const { points } = layoutPath(8, 4);
    const widths = points.map(() => labelWidth('Ch 13 · Near future and past'));
    expect(mascotIndex(points, 4, widths)).toBeUndefined();
    widths[1] = labelWidth('Ch 1');
    expect(mascotIndex(points, 4, widths)).toBe(1);
  });

  test('there is no mascot on a stage without the current node', () => {
    const { points } = layoutPath(8, -1);
    expect(
      mascotIndex(
        points,
        -1,
        points.map(() => 0),
      ),
    ).toBeUndefined();
  });
});
