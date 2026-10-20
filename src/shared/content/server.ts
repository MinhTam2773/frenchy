/// <reference types="vite/client" />
import { Course, Deck, type Chapter } from '../schemas';
import { routeChapters } from './route';

// The Worker's view of content/: the course, the starter decks and which texts exist. Text bodies
// stay out of the Worker bundle (G-70): `import: 'id'` keeps only each text's id export.
const course = Course.parse(
  import.meta.glob('../../../content/course.json', { eager: true, import: 'default' })[
    '../../../content/course.json'
  ],
);
const decks = new Map(
  Object.values(
    import.meta.glob('../../../content/chapters/*/deck.json', { eager: true, import: 'default' }),
  ).map((raw) => {
    const deck = Deck.parse(raw);
    return [deck.chapterId, deck];
  }),
);
const textIds = new Set(
  Object.values(
    import.meta.glob<string>('../../../content/chapters/*/texts/*.json', {
      eager: true,
      import: 'id',
    }),
  ),
);

export function getChapter(chapterId: string): Chapter | undefined {
  return routeChapters(course).find((chapter) => chapter.id === chapterId);
}

export function getDeck(chapterId: string): Deck | undefined {
  return decks.get(chapterId);
}

export function hasText(id: string): boolean {
  return textIds.has(id);
}
