import type { Chapter, Course, Grammar } from '../schemas';

/** Every chapter in learning-route order, across stages. */
export function routeChapters(course: Course): Chapter[] {
  return course.stages.flatMap((stage) => stage.chapters);
}

/**
 * Grammar tags a text in `chapterId` may use: everything introduced by the chapters before it in
 * the route, plus its own. Throws for a chapter that is not in the course.
 */
export function allowedGrammarTags(course: Course, grammar: Grammar, chapterId: string): string[] {
  const route = routeChapters(course).map((chapter) => chapter.id);
  const position = route.indexOf(chapterId);
  if (position === -1) throw new Error(`Unknown chapter "${chapterId}"`);
  const reached = new Set(route.slice(0, position + 1));
  return grammar.filter((tag) => reached.has(tag.chapterId)).map((tag) => tag.id);
}
