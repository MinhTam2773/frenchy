/// <reference types="vite/client" />
import { Course, Deck, Grammar, GrammarNote, Text, type Chapter } from '../schemas';
import { allowedGrammarTags, routeChapters } from './route';
import type { ContentFiles } from './validate';

export { allowedGrammarTags, routeChapters } from './route';

/** Content files that load on demand: path relative to `content/` → import of its JSON. */
export type LazyContentFiles = Readonly<Record<string, () => Promise<unknown>>>;

const TEXT_FILE = /^chapters\/([^/]+)\/texts\/([^/]+)\.json$/;

/**
 * Typed access to a content tree. `files` are read synchronously (course, grammar, notes);
 * texts and decks may also sit in `lazyFiles`, which load the first time a chapter asks for them.
 * Throws (or rejects) if a file it reads is invalid.
 */
export function createContent(files: ContentFiles, lazyFiles: LazyContentFiles = {}) {
  let course: Course | undefined;
  let grammar: Grammar | undefined;
  const chapterTexts = new Map<string, Promise<Text[]>>();
  // The validator makes every text's file name its id, so ids are known before anything loads.
  const textChapter = new Map<string, string>();
  for (const file of [...Object.keys(files), ...Object.keys(lazyFiles)]) {
    const match = TEXT_FILE.exec(file);
    if (match) textChapter.set(match[2], match[1]);
  }

  function getCourse(): Course {
    return (course ??= Course.parse(files['course.json']));
  }

  function getGrammar(): Grammar {
    return (grammar ??= Grammar.parse(files['grammar.json']));
  }

  async function read(file: string): Promise<unknown> {
    return file in files ? files[file] : lazyFiles[file]?.();
  }

  function getChapterTextIds(chapterId: string): string[] {
    return [...textChapter]
      .filter(([, chapter]) => chapter === chapterId)
      .map(([id]) => id)
      .sort((a, b) => a.localeCompare(b));
  }

  function loadChapterTexts(chapterId: string): Promise<Text[]> {
    let texts = chapterTexts.get(chapterId);
    if (!texts) {
      texts = Promise.all(
        getChapterTextIds(chapterId).map(async (id) =>
          Text.parse(await read(`chapters/${chapterId}/texts/${id}.json`)),
        ),
      );
      // A failed load (offline, invalid file) is retried on the next call.
      texts.catch(() => chapterTexts.delete(chapterId));
      chapterTexts.set(chapterId, texts);
    }
    return texts;
  }

  return {
    getCourse,
    getGrammar,
    getChapter(chapterId: string): Chapter | undefined {
      return routeChapters(getCourse()).find((chapter) => chapter.id === chapterId);
    },
    /** Tags the chapter's texts may use: introduced by it or an earlier chapter in the route. */
    allowedGrammar(chapterId: string): string[] {
      return allowedGrammarTags(getCourse(), getGrammar(), chapterId);
    },
    /** Whether a text exists, without loading it. */
    hasText(id: string): boolean {
      return textChapter.has(id);
    },
    /** The ids of the chapter's texts in reading (id) order, without loading them. */
    getChapterTextIds,
    /** The chapter's texts in id order; none until T-14 writes `chapters/<id>/texts/<id>.json`. */
    loadChapterTexts,
    async loadText(id: string): Promise<Text | undefined> {
      const chapterId = textChapter.get(id);
      if (chapterId === undefined) return undefined;
      return (await loadChapterTexts(chapterId)).find((text) => text.id === id);
    },
    getNote(chapterId: string): GrammarNote | undefined {
      const raw = files[`chapters/${chapterId}/note.json`];
      return raw === undefined ? undefined : GrammarNote.parse(raw);
    },
    async loadDeck(chapterId: string): Promise<Deck | undefined> {
      const raw = await read(`chapters/${chapterId}/deck.json`);
      return raw === undefined ? undefined : Deck.parse(raw);
    },
  };
}

function relativeToContent<T>(glob: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(glob).map(([key, value]) => [
      key.slice(key.indexOf('content/') + 'content/'.length),
      value,
    ]),
  );
}

// G-70: only course, grammar and notes go in the main chunk; each text and deck is its own chunk.
const content = createContent(
  relativeToContent(
    import.meta.glob(
      ['../../../content/{course,grammar}.json', '../../../content/chapters/*/note.json'],
      { eager: true, import: 'default' },
    ),
  ),
  relativeToContent(
    import.meta.glob(
      ['../../../content/chapters/*/texts/*.json', '../../../content/chapters/*/deck.json'],
      { import: 'default' },
    ),
  ),
);

export const getCourse = content.getCourse;
export const getGrammar = content.getGrammar;
export const getChapter = content.getChapter;
export const allowedGrammar = content.allowedGrammar;
export const hasText = content.hasText;
export const getChapterTextIds = content.getChapterTextIds;
export const loadChapterTexts = content.loadChapterTexts;
export const loadText = content.loadText;
export const getNote = content.getNote;
export const loadDeck = content.loadDeck;
