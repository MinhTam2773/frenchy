/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { contrastRatio } from './contrast';

// Vitest blanks CSS imports (even ?raw), so read the theme straight from disk.
const styles = readFileSync(join(import.meta.dirname, '../styles.css'), 'utf8');

function tokenHex(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})\\s*;`, 'i').exec(styles);
  if (!match?.[1]) throw new Error(`No --color-${name} token in styles.css`);
  return match[1];
}

// [text, background, where the kit uses the pair]. Small text needs 4.5:1 (WCAG AA).
const PAIRS: ReadonlyArray<[string, string, string]> = [
  ['surface', 'primary', 'primary Button'],
  ['surface', 'success', 'success Button'],
  ['surface', 'danger', 'danger Button'],
  ['surface', 'warn', 'warn Button'],
  ['surface', 'primary', 'primary Card, solid IconButton'],
  ['primary', 'surface', 'ghost and inverse Button, active TabBar label'],
  ['primary', 'primary-soft', 'soft IconButton'],
  ['ink', 'surface', 'body text, secondary Button, selected SegmentedTabs'],
  ['ink', 'ground', 'body text on the screen background'],
  ['ink-2', 'surface', 'secondary text'],
  ['ink-2', 'chip', 'neutral Chip'],
  ['muted', 'surface', 'inactive TabBar label, TopBar overline'],
  ['muted', 'ground', 'secondary text on the screen background'],
  ['muted', 'chip', 'unselected SegmentedTabs, disabled Button'],
  ['masc', 'primary-soft', 'masc Chip'],
  ['fem', 'fem-soft', 'fem Chip'],
  ['new-word-ink', 'new-word', 'new Chip'],
  ['danger-ink', 'danger-soft', 'status Chip: new'],
  ['new-word-ink', 'gold-soft', 'status Chip: learning'],
  ['success-ink', 'success-soft', 'status Chip: known'],
  ['flame-text', 'surface', 'StreakChip'],
  ['freeze-ink', 'surface', 'StreakChip (freeze)'],
];

describe('kit text/background pairs', () => {
  test.each(PAIRS)('%s on %s (%s) is at least 4.5:1', (text, background) => {
    expect(contrastRatio(tokenHex(text), tokenHex(background))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contrastRatio', () => {
  test('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  test('catches the failures behind lesson L-04', () => {
    expect(contrastRatio('#ffffff', '#ff7a1a')).toBeLessThan(4.5);
    expect(contrastRatio('#ffffff', '#178a4c')).toBeLessThan(4.5);
  });
});
