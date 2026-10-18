/// <reference types="vite/client" />
import { Course, Deck, Grammar, GrammarNote, Text, type Chapter } from '../schemas';
import { allowedGrammarTags, routeChapters } from './route';
import type { ContentFiles } from './validate';

export { allowedGrammarTags, routeChapters } from './route';

const TEXT_FILE = /^chapters\/([^/]+)\/texts\/[^/]+\.json$/;

/** Typed, lazily parsed access to a content tree. Throws if a file it reads is invalid. */
export function createContent(files: ContentFiles) {
  let course: Course | undefined;
  let grammar: Grammar | undefined;
  let texts: Map<string, Text> | undefined;

  function getCourse(): Course {
    return (course ??= Course.parse(files['course.json']));
  }

  function getGrammar(): Grammar {
    return (grammar ??= Grammar.parse(files['grammar.json']));
  }

  function loadTexts(): Map<string, Text> {
    if (!texts) {
      const parsed = Object.entries(files)
        .filter(([file]) => TEXT_FILE.test(file))
        .map(([, raw]) => Text.parse(raw))
        .sort((a, b) => a.id.localeCompare(b.id));
      texts = new Map(parsed.map((text) => [text.id, text]));
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
    /** Zero texts until T-14 writes `content/chapters/<chapterId>/texts/<id>.json`. */
    getText(id: string): Text | undefined {
      return loadTexts().get(id);
    },
    getChapterTexts(chapterId: string): Text[] {
      return [...loadTexts().values()].filter((text) => text.chapterId === chapterId);
    },
    getNote(chapterId: string): GrammarNote | undefined {
      const raw = files[`chapters/${chapterId}/note.json`];
      return raw === undefined ? undefined : GrammarNote.parse(raw);
    },
    getDeck(chapterId: string): Deck | undefined {
      const raw = files[`chapters/${chapterId}/deck.json`];
      return raw === undefined ? undefined : Deck.parse(raw);
    },
  };
}

/** Everything under `content/` that `content:check` validates; the lexicon is not part of it. */
export const contentFiles: ContentFiles = Object.fromEntries(
  Object.entries(
    import.meta.glob(
      ['../../../content/{course,grammar}.json', '../../../content/chapters/**/*.json'],
      {
        eager: true,
        import: 'default',
      },
    ),
  ).map(([key, value]) => [key.slice(key.indexOf('content/') + 'content/'.length), value]),
);

const content = createContent(contentFiles);

export const getCourse = content.getCourse;
export const getGrammar = content.getGrammar;
export const getChapter = content.getChapter;
export const allowedGrammar = content.allowedGrammar;
export const getText = content.getText;
export const getChapterTexts = content.getChapterTexts;
export const getNote = content.getNote;
export const getDeck = content.getDeck;
