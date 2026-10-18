// `npm run content:check [-- --root <dir>]`: validates course.json, grammar.json and every
// chapter folder under content/. Lexicon files are not part of it (T-08 checks those).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Course, Deck } from '../../src/shared/schemas';
import { validateContent, type ContentFiles } from '../../src/shared/content/validate';

const rootFlag = process.argv.indexOf('--root');
const root =
  rootFlag === -1 ? join(import.meta.dirname, '../../content') : process.argv[rootFlag + 1];
if (!root) {
  console.error('--root needs a directory');
  process.exit(2);
}

const files = readContentFiles(root);
const problems = validateContent(files);

if (problems.length > 0) {
  for (const { file, message } of problems) console.error(`${file}: ${message}`);
  const fileCount = new Set(problems.map((problem) => problem.file)).size;
  console.error(`\ncontent:check found ${problems.length} problem(s) in ${fileCount} file(s)`);
  process.exit(1);
}
console.log(summary(files));

function readContentFiles(dir: string): ContentFiles {
  const found: Record<string, unknown> = {};
  for (const name of ['course.json', 'grammar.json']) readJson(found, dir, name);
  for (const name of listFiles(join(dir, 'chapters'), 'chapters')) {
    if (name.endsWith('.json')) readJson(found, dir, name);
    else found[name] = null; // flagged by the validator as an unexpected file
  }
  return found;
}

function listFiles(dir: string, relative: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) =>
      entry.isDirectory()
        ? listFiles(join(dir, entry.name), `${relative}/${entry.name}`)
        : [`${relative}/${entry.name}`],
    );
}

/** A missing file stays out of the map; unreadable JSON goes in as an Error for the validator. */
function readJson(into: Record<string, unknown>, dir: string, name: string): void {
  let text: string;
  try {
    text = readFileSync(join(dir, name), 'utf8');
  } catch {
    return;
  }
  try {
    into[name] = JSON.parse(text);
  } catch (error) {
    into[name] = error instanceof Error ? error : new Error(String(error));
  }
}

function summary(content: ContentFiles): string {
  const chapters = Course.parse(content['course.json']).stages.flatMap((stage) => stage.chapters);
  const names = Object.keys(content);
  const texts = names.filter((name) => name.includes('/texts/')).length;
  const cards = names
    .filter((name) => name.endsWith('/deck.json'))
    .reduce((sum, name) => sum + Deck.parse(content[name]).cards.length, 0);
  const tags = (content['grammar.json'] as unknown[]).length;
  return `content:check OK: ${chapters.length} chapters, ${tags} grammar tags, ${texts} texts, ${cards} deck cards`;
}
