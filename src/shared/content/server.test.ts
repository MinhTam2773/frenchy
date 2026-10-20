import { describe, expect, it } from 'vitest';
import { getChapterTextIds, getCourse, loadDeck, routeChapters } from './index';
import { getChapter, getDeck, hasText } from './server';

describe("the Worker's content", () => {
  it('agrees with the app on chapters, decks and text ids', async () => {
    for (const chapter of routeChapters(getCourse())) {
      expect(getChapter(chapter.id)).toEqual(chapter);
      expect(getDeck(chapter.id)).toEqual(await loadDeck(chapter.id));
      for (const id of getChapterTextIds(chapter.id)) expect(hasText(id)).toBe(true);
    }
  });

  it('knows nothing that is not in content/', () => {
    expect(getChapter('ch99')).toBeUndefined();
    expect(getDeck('ch99')).toBeUndefined();
    expect(hasText('ch10-nowhere')).toBe(false);
  });
});
