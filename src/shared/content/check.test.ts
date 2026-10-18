/// <reference types="node" />
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Runs the real CLI, as `npm run content:check` and CI do.
function contentCheck(...args: string[]) {
  const root = join(import.meta.dirname, '../../..');
  const tsx = join(root, 'node_modules/tsx/dist/cli.mjs');
  const result = spawnSync(process.execPath, [tsx, 'scripts/content/check.ts', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

describe('content:check', () => {
  it('passes on the real content', () => {
    const { code, out } = contentCheck();
    expect(out).toMatch(/^content:check OK: 39 chapters, \d+ grammar tags/);
    expect(code).toBe(0);
  }, 30_000);

  it('fails on the bad fixtures and names each problem and file', () => {
    const { code, err } = contentCheck('--root', 'src/shared/content/fixtures/bad');
    expect(code).toBe(1);
    expect(err.split('\n').filter(Boolean)).toEqual([
      'course.json: ch1 ends on PDF page 23 but ch2 starts on 30 (a chapter ends on the page before the next one starts)',
      'chapters/ch1/notes.txt: Unexpected file; expected chapters/<chapterId>/texts/<id>.json, note.json or deck.json',
      'chapters/ch1/texts/ch1-bonjour.json: paragraphs.0.sentences.0.tokens.0: word token "Bonjour" has no lemma',
      'chapters/ch1/texts/ch1-salut.json: Grammar tag "etre.present" is not allowed in ch1 (it is introduced later)',
      'content:check found 4 problem(s) in 4 file(s)',
    ]);
  }, 30_000);
});
