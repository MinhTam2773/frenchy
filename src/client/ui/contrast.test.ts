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
  ['flame-ink', 'flame', 'Streak hero card, practiced calendar day'],
  ['flame-text', 'flame-soft', 'Streak at-risk note'],
  ['freeze-ink', 'freeze-soft', 'Streak freeze card'],
  ['gold-ink', 'gold-soft', 'offline banner'],
  ['danger-ink', 'surface', 'error text'],
  ['danger-ink', 'ground', 'error text on the screen background'],
  // Future calendar days (G-43): readable, not greyed out as if disabled.
  ['muted', 'surface', 'future and out-of-range calendar days'],
];

describe('kit text/background pairs', () => {
  test.each(PAIRS)('%s on %s (%s) is at least 4.5:1', (text, background) => {
    expect(contrastRatio(tokenHex(text), tokenHex(background))).toBeGreaterThanOrEqual(4.5);
  });
});

// Icons and other graphics need 3:1 (WCAG 1.4.11).
const GRAPHIC_PAIRS: ReadonlyArray<[string, string, string]> = [
  ['surface', 'freeze', 'snowflake on the freeze calendar day and card'],
  ['ink', 'gold', 'check on a done Path node (G-18)'],
  ['faint', 'surface', 'chevrons on list rows'],
];

describe('kit graphic/background pairs', () => {
  test.each(GRAPHIC_PAIRS)('%s on %s (%s) is at least 3:1', (graphic, background) => {
    expect(contrastRatio(tokenHex(graphic), tokenHex(background))).toBeGreaterThanOrEqual(3);
  });
});

/** The colour of `fg` laid over `bg` at `alpha` opacity, as #rrggbb. */
function blend(fg: string, bg: string, alpha: number): string {
  const part = (hex: string, shift: number) => (parseInt(hex.slice(1), 16) >> shift) & 255;
  const mixed = [16, 8, 0].map((shift) =>
    Math.round(part(fg, shift) * alpha + part(bg, shift) * (1 - alpha))
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${mixed.join('')}`;
}

describe('text on translucent tints', () => {
  test('Practice flashcard breakdown tiles (white/10 over primary) keep 4.5:1', () => {
    const tile = blend(tokenHex('surface'), tokenHex('primary'), 0.1);
    expect(contrastRatio(tokenHex('surface'), tile)).toBeGreaterThanOrEqual(4.5);
    // white/15 was the mockup's value: 4.2:1, which is why the build uses 10%.
    const mockupTile = blend(tokenHex('surface'), tokenHex('primary'), 0.15);
    expect(contrastRatio(tokenHex('surface'), mockupTile)).toBeLessThan(4.5);
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
