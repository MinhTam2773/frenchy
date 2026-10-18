import type { z } from 'zod';
import { MAX_NEW_WORDS_PER_TEXT } from '../constants';
import { Course, Deck, Grammar, GrammarNote, Text, type Chapter } from '../schemas';
import { allowedGrammarTags, routeChapters } from './route';

/**
 * The content tree as `path relative to content/` → parsed JSON, e.g. `course.json` or
 * `chapters/ch10/texts/ch10-au-cafe.json`. A value that is an `Error` stands for a file that is not
 * valid JSON. The loader (Vite glob) and `scripts/content/check.ts` (disk) build the same shape.
 */
export type ContentFiles = Readonly<Record<string, unknown>>;

export type Problem = { file: string; message: string };

type Add = (file: string, message: string) => void;

const TEXT_FILE = /^chapters\/([^/]+)\/texts\/([^/]+)\.json$/;
const CHAPTER_FILE = /^chapters\/([^/]+)\/(note|deck)\.json$/;

/** Returns every problem found; an empty list means the content is valid. */
export function validateContent(files: ContentFiles): Problem[] {
  const problems: Problem[] = [];
  const add: Add = (file, message) => problems.push({ file, message });

  const course = parse('course.json', Course, files['course.json'], add);
  const grammar = parse('grammar.json', Grammar, files['grammar.json'], add);
  if (course) checkCourse(course, add);
  if (course && grammar) checkGrammar(course, grammar, add);
  checkChapterFiles(files, course, grammar, add);
  return problems;
}

function parse<S extends z.ZodType>(
  file: string,
  schema: S,
  raw: unknown,
  add: Add,
  ignore: ReadonlySet<string> = new Set(),
): z.infer<S> | undefined {
  if (raw === undefined) {
    add(file, 'File is missing');
    return undefined;
  }
  if (raw instanceof Error) {
    add(file, `Not valid JSON: ${raw.message}`);
    return undefined;
  }
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    const where = issue.path.join('.');
    // Already reported in plain words; zod's version of it is noise.
    if ([...ignore].some((path) => where === path || where.startsWith(`${path}.`))) continue;
    add(file, where ? `${where}: ${issue.message}` : issue.message);
  }
  return undefined;
}

function checkCourse(course: Course, add: Add): void {
  const file = 'course.json';
  const seenStageIds = new Set<string>();
  const seenChapterIds = new Set<string>();
  const seenNumbers = new Set<string>();

  course.stages.forEach((stage, i) => {
    if (seenStageIds.has(stage.id)) add(file, `Duplicate stage id "${stage.id}"`);
    seenStageIds.add(stage.id);
    if (stage.id !== `stage${stage.number}` || stage.number !== i + 1) {
      add(file, `Stage ${i + 1} must have number ${i + 1} and id "stage${i + 1}"`);
    }
    if (stage.weekStart > stage.weekEnd) add(file, `${stage.id}: weeks end before they start`);
    const previous = course.stages[i - 1];
    const expectedStart = previous ? previous.weekEnd + 1 : 1;
    if (stage.weekStart !== expectedStart) {
      add(file, `${stage.id}: weeks must start at ${expectedStart}, not ${stage.weekStart}`);
    }
    for (const chapter of stage.chapters) {
      checkChapter(chapter, stage, add);
      if (seenChapterIds.has(chapter.id)) add(file, `Duplicate chapter id "${chapter.id}"`);
      seenChapterIds.add(chapter.id);
      if (seenNumbers.has(chapter.number)) {
        add(file, `${chapter.id}: book number "${chapter.number}" is used twice`);
      }
      seenNumbers.add(chapter.number);
    }
  });

  checkWeekOrder(course, add);
  checkPdfPages(routeChapters(course), add);
}

function checkChapter(chapter: Chapter, stage: Course['stages'][number], add: Add): void {
  const file = 'course.json';
  const isAppendixId = chapter.id.startsWith('app');
  const expectedId = `${isAppendixId ? 'app' : 'ch'}${chapter.number}`;
  if (chapter.id !== expectedId) {
    add(file, `${chapter.id}: id does not match book number "${chapter.number}" (${expectedId})`);
  }
  if ((chapter.kind === 'appendix') !== isAppendixId) {
    add(file, `${chapter.id}: only appendix ids (appX) may have kind "appendix"`);
  }
  if (chapter.weekStart < stage.weekStart || chapter.weekEnd > stage.weekEnd) {
    add(
      file,
      `${chapter.id}: weeks ${chapter.weekStart}-${chapter.weekEnd} fall outside ${stage.id} (${stage.weekStart}-${stage.weekEnd})`,
    );
  }
  let previousEnd = chapter.pdfStart - 1;
  for (const section of chapter.sections) {
    const label = `${chapter.id}: section "${section.label}"`;
    if (section.pdfStart > section.pdfEnd) add(file, `${label} ends before it starts`);
    if (section.pdfStart < chapter.pdfStart || section.pdfEnd > chapter.pdfEnd) {
      add(file, `${label} (PDF ${section.pdfStart}-${section.pdfEnd}) is outside the chapter`);
    }
    if (section.pdfStart <= previousEnd) add(file, `${label} overlaps the section before it`);
    previousEnd = section.pdfEnd;
  }
}

/** Appendices are spread over the stage, so only the real chapters must move forward. */
function checkWeekOrder(course: Course, add: Add): void {
  let last: Chapter | undefined;
  for (const chapter of routeChapters(course)) {
    if (chapter.kind === 'appendix') continue;
    if (last && chapter.weekEnd < last.weekEnd) {
      add(
        'course.json',
        `${chapter.id} ends in week ${chapter.weekEnd}, before ${last.id} (week ${last.weekEnd}) which comes first in the route`,
      );
    }
    last = chapter;
  }
}

/** A chapter ends on the page before the next book chapter starts, in book order. */
function checkPdfPages(chapters: Chapter[], add: Add): void {
  const byPage = [...chapters].sort((a, b) => a.pdfStart - b.pdfStart);
  for (let i = 1; i < byPage.length; i++) {
    const before = byPage[i - 1];
    const after = byPage[i];
    if (before.pdfEnd + 1 !== after.pdfStart) {
      add(
        'course.json',
        `${before.id} ends on PDF page ${before.pdfEnd} but ${after.id} starts on ${after.pdfStart} (a chapter ends on the page before the next one starts)`,
      );
    }
  }
}

function checkGrammar(course: Course, grammar: Grammar, add: Add): void {
  const file = 'grammar.json';
  const routeIndex = new Map(routeChapters(course).map((chapter, i) => [chapter.id, i]));
  const seen = new Set<string>();
  let lastIndex = -1;
  for (const tag of grammar) {
    if (seen.has(tag.id)) add(file, `Duplicate grammar tag "${tag.id}"`);
    seen.add(tag.id);
    const index = routeIndex.get(tag.chapterId);
    if (index === undefined) {
      add(file, `${tag.id}: chapter "${tag.chapterId}" is not in course.json`);
      continue;
    }
    if (index < lastIndex) {
      add(file, `${tag.id}: listed after a tag from a later chapter (tags must follow the route)`);
    }
    lastIndex = Math.max(lastIndex, index);
  }
}

function checkChapterFiles(
  files: ContentFiles,
  course: Course | undefined,
  grammar: Grammar | undefined,
  add: Add,
): void {
  const chapterIds = new Set(course ? routeChapters(course).map((chapter) => chapter.id) : []);
  const knownTags = grammar && new Set(grammar.map((tag) => tag.id));
  const textIds = new Set<string>();
  const decks: [file: string, folder: string, raw: unknown][] = [];

  for (const [file, raw] of Object.entries(files)) {
    if (!file.startsWith('chapters/')) continue;
    const text = TEXT_FILE.exec(file);
    const other = CHAPTER_FILE.exec(file);
    const folder = (text ?? other)?.[1];
    if (!folder) {
      add(
        file,
        'Unexpected file; expected chapters/<chapterId>/texts/<id>.json, note.json or deck.json',
      );
      continue;
    }
    if (course && !chapterIds.has(folder)) {
      add(file, `Folder "${folder}" is not a chapter in course.json`);
      continue;
    }

    if (text) {
      const allowed = course && grammar && new Set(allowedGrammarTags(course, grammar, folder));
      checkText(file, folder, text[2], raw, { allowed, known: knownTags }, add);
      textIds.add(text[2]);
    } else if (other?.[2] === 'note') {
      const note = parse(file, GrammarNote, raw, add);
      if (note && note.chapterId !== folder) {
        add(file, `chapterId "${note.chapterId}" does not match its folder "${folder}"`);
      }
    } else {
      decks.push([file, folder, raw]);
    }
  }

  // Decks last: their cards point at texts from any folder.
  for (const [file, folder, raw] of decks) {
    const deck = parse(file, Deck, raw, add);
    if (!deck) continue;
    if (deck.chapterId !== folder) {
      add(file, `chapterId "${deck.chapterId}" does not match its folder "${folder}"`);
    }
    const cardIds = new Set<string>();
    for (const card of deck.cards) {
      if (cardIds.has(card.id)) add(file, `Duplicate card id "${card.id}"`);
      cardIds.add(card.id);
      if (card.textId && !textIds.has(card.textId)) {
        add(file, `Card "${card.id}" points to text "${card.textId}", which does not exist`);
      }
    }
  }
}

function checkText(
  file: string,
  folder: string,
  basename: string,
  raw: unknown,
  tags: { allowed?: ReadonlySet<string>; known?: ReadonlySet<string> },
  add: Add,
): void {
  const lemmaless = findTokensWithoutLemma(raw);
  for (const { path, word } of lemmaless) add(file, `${path}: word token "${word}" has no lemma`);
  const text = parse(file, Text, raw, add, new Set(lemmaless.map((l) => l.path)));
  if (!text) return;

  if (text.chapterId !== folder) {
    add(file, `chapterId "${text.chapterId}" does not match its folder "${folder}"`);
  }
  if (basename !== text.id) add(file, `File name must be the text id: ${text.id}.json`);
  if (text.newWords.length > MAX_NEW_WORDS_PER_TEXT) {
    add(
      file,
      `Introduces ${text.newWords.length} new words; at most ${MAX_NEW_WORDS_PER_TEXT} per text`,
    );
  }
  for (const tag of text.grammarTags) {
    if (tags.known && !tags.known.has(tag)) add(file, `Unknown grammar tag "${tag}"`);
    else if (tags.allowed && !tags.allowed.has(tag)) {
      add(file, `Grammar tag "${tag}" is not allowed in ${folder} (it is introduced later)`);
    }
  }
}

/** A word token without a lemma matches neither token schema, so zod only says "Invalid input". */
function findTokensWithoutLemma(raw: unknown): { path: string; word: string }[] {
  const found: { path: string; word: string }[] = [];
  forEachToken(raw, (token, path) => {
    const t = token['t'];
    if (typeof t === 'string' && /[\p{L}\p{N}]/u.test(t) && !token['lemma']) {
      found.push({ path, word: t });
    }
  });
  return found;
}

function forEachToken(
  raw: unknown,
  visit: (token: Record<string, unknown>, path: string) => void,
): void {
  for (const [p, paragraph] of items(field(raw, 'paragraphs'))) {
    for (const [s, sentence] of items(field(paragraph, 'sentences'))) {
      for (const [k, token] of items(field(sentence, 'tokens'))) {
        if (isRecord(token)) visit(token, `paragraphs.${p}.sentences.${s}.tokens.${k}`);
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function field(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function items(value: unknown): [number, unknown][] {
  return Array.isArray(value) ? value.map((item, i): [number, unknown] => [i, item]) : [];
}
