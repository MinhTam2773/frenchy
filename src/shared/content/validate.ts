import type { z } from 'zod';
import { MAX_NEW_WORDS_PER_TEXT } from '../constants';
import { Course, Deck, Grammar, GrammarNote, Text, type Chapter, type Sentence } from '../schemas';
import { tokenize } from '../text/tokenize';
import { PHRASES } from './phrases';
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
  const texts: ParsedText[] = [];

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
      const parsed = checkText(file, folder, text[2], raw, { allowed, known: knownTags }, add);
      if (parsed) texts.push({ file, folder, text: parsed });
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

  if (course) checkNewWords(course, texts, add);

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
): Text | undefined {
  const lemmaless = findTokensWithoutLemma(raw);
  for (const { path, word } of lemmaless) add(file, `${path}: word token "${word}" has no lemma`);
  const text = parse(file, Text, raw, add, new Set(lemmaless.map((l) => l.path)));
  if (!text) return undefined;

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
  text.paragraphs.forEach((paragraph, p) => {
    paragraph.sentences.forEach((sentence, s) => {
      const split = tokenSplitProblem(sentence);
      const messages = [
        ...(split ? [split] : []),
        ...typographyProblems(sentence),
        ...phraseProblems(sentence),
      ];
      for (const message of messages) {
        add(file, `paragraphs.${p}.sentences.${s}: ${message}`);
      }
    });
  });
  return text;
}

type ParsedText = { file: string; folder: string; text: Text };

type SplitToken = { kind: 'word' | 'gap'; t: string };

function tokenSplitProblem(sentence: Sentence): string | undefined {
  const text = sentence.tokens.map((token) => token.t).join('');
  const lesson = sentence.tokens.map((token): SplitToken => ({
    kind: 'lemma' in token ? 'word' : 'gap',
    t: token.t,
  }));
  const expected = tokenize(text).map((token): SplitToken => ({ kind: token.kind, t: token.t }));
  if (sameSplit(lesson, expected)) return undefined;
  return `token split differs from tokenize() for "${text}"; lesson split: ${showSplit(lesson)}; tokenize() split: ${showSplit(expected)}`;
}

function sameSplit(a: readonly SplitToken[], b: readonly SplitToken[]): boolean {
  return (
    a.length === b.length && a.every((token, i) => token.kind === b[i].kind && token.t === b[i].t)
  );
}

function showSplit(tokens: readonly SplitToken[]): string {
  return tokens.map((token) => `${token.kind}(${JSON.stringify(token.t)})`).join(' ');
}

/**
 * `isNew` means new to the course (L-94): a lemma is marked in one text only, the first along the
 * route (chapter order in course.json, then text id order within a chapter).
 */
function checkNewWords(course: Course, texts: ParsedText[], add: Add): void {
  const chapterOrder = new Map(routeChapters(course).map((chapter, i) => [chapter.id, i]));
  const route = [...texts].sort(
    (a, b) =>
      (chapterOrder.get(a.folder) ?? 0) - (chapterOrder.get(b.folder) ?? 0) ||
      (a.text.id < b.text.id ? -1 : a.text.id > b.text.id ? 1 : 0),
  );
  const firstMarked = new Map<string, string>();
  for (const { file, text } of route) {
    const here = new Set<string>();
    text.paragraphs.forEach((paragraph, p) => {
      paragraph.sentences.forEach((sentence, s) => {
        for (const token of sentence.tokens) {
          if (!('lemma' in token) || !token.isNew || here.has(token.lemma)) continue;
          here.add(token.lemma);
          const earlier = firstMarked.get(token.lemma);
          if (earlier === undefined) firstMarked.set(token.lemma, text.id);
          else {
            add(
              file,
              `paragraphs.${p}.sentences.${s}: "${token.lemma}" is marked isNew, but ${earlier} comes first along the route and already marks it; mark it in one text only`,
            );
          }
        }
      });
    });
  }
}

/** Each phrase as the sequence of token texts `tokenize` gives it, longest first so *qu'est-ce que* wins. */
const PHRASE_TOKENS = PHRASES.map((phrase) => {
  const tokens = tokenize(phrase);
  return {
    phrase,
    parts: tokens.map((token) => token.t),
    words: tokens.filter((token) => token.kind === 'word').length,
  };
}).sort((a, b) => b.parts.length - a.parts.length);

/** The closed phrase list (T-24, L-95): pos `phrase` only for a listed phrase, on all of its words. */
function phraseProblems({ tokens }: Sentence): string[] {
  const problems: string[] = [];

  const carried = new Map<string, number>();
  for (const token of tokens) {
    if ('pos' in token && token.pos === 'phrase') {
      carried.set(token.lemma, (carried.get(token.lemma) ?? 0) + 1);
    }
  }
  for (const [lemma, count] of carried) {
    const listed = PHRASE_TOKENS.find((entry) => entry.phrase === lemma);
    if (!listed) {
      problems.push(
        `"${lemma}" has pos phrase but is not in the closed phrase list (src/shared/content/phrases.ts); annotate its words one by one, and a single word is never a phrase`,
      );
    } else if (count % listed.words !== 0) {
      problems.push(
        `"${lemma}" has ${listed.words} words but ${count} token(s) carry it; every word of a phrase gets lemma "${lemma}" and pos phrase`,
      );
    }
  }

  const covered = new Set<number>();
  for (const { phrase, parts } of PHRASE_TOKENS) {
    for (let start = 0; start + parts.length <= tokens.length; start++) {
      const window = tokens.slice(start, start + parts.length);
      if (window.some((_, k) => covered.has(start + k))) continue;
      if (!window.every((token, k) => token.t.toLowerCase() === parts[k])) continue;
      window.forEach((_, k) => covered.add(start + k));
      if (!window.some((token) => 'pos' in token && token.pos === 'phrase')) {
        problems.push(
          `"${phrase}" is a fixed phrase; give every word of it lemma "${phrase}" and pos phrase instead of annotating it word by word`,
        );
      }
    }
  }
  return problems;
}

const CURLY_APOSTROPHE = /[’‘ʼ]/u;
const NO_BREAK_SPACE = /[\u00a0\u202F]/u;

/** Typography slips that `text.md` forbids (L-76), one message each. */
function typographyProblems({ tokens }: Sentence): string[] {
  const problems: string[] = [];
  tokens.forEach((token, i) => {
    if (CURLY_APOSTROPHE.test(token.t)) {
      problems.push(`token "${token.t}" has a curly apostrophe; use a straight ' (U+0027)`);
    }
    const next = tokens[i + 1];
    if ('lemma' in token && next && !('lemma' in next) && /['’‘ʼ]$/u.test(token.t)) {
      problems.push(`gap token "${next.t}" after "${token.t}"; the next word follows it directly`);
    }
  });

  const text = tokens.map((token) => token.t).join('');
  if (/^\s|\s$/u.test(text)) problems.push(`"${text}" starts or ends with a space`);
  if (/\s{2,}/u.test(text)) problems.push(`"${text}" has two spaces in a row`);

  for (const { 0: mark, index } of text.matchAll(/[?!:;«»]/gu)) {
    const before = text.charAt(index - 1);
    const after = text.charAt(index + 1);
    // Stacked marks (?!) and clock times (8:30) take no space; a mark that opens the sentence has nothing before it.
    if (index === 0 && mark !== '«') continue;
    if ('?!'.includes(mark) && '?!'.includes(before)) continue;
    if (mark === ':' && /\d/u.test(before) && /\d/u.test(after)) continue;
    const side = mark === '«' ? after : before;
    if (NO_BREAK_SPACE.test(side)) continue;
    const found = side === ' ' ? 'a plain space' : 'no space';
    problems.push(
      `"${text}" has ${found} ${mark === '«' ? 'after' : 'before'} "${mark}"; use a no-break space (U+00A0)`,
    );
  }
  return problems;
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
