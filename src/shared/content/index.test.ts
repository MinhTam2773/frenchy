import { describe, expect, it } from 'vitest';
import { cafeDialogueText, ch10Deck, ch10Note } from '../fixtures';
import {
  allowedGrammar,
  contentFiles,
  createContent,
  getChapter,
  getChapterTexts,
  getCourse,
  getDeck,
  getGrammar,
  getNote,
  getText,
} from './index';

// PLAN §2, "Beginner route through the book".
const ROUTE = {
  stage1: ['appA', 'ch1', 'ch2', 'ch12', 'ch10', 'ch4', 'ch7', 'ch33'],
  stage2: ['ch11', 'ch28', 'ch6', 'ch13', 'ch14', 'ch21', 'ch15', 'ch34', 'ch3'],
  stage3: ['ch16', 'ch26', 'ch27', 'ch17', 'ch23', 'ch8', 'ch29', 'ch18', 'ch5', 'ch9', 'ch36'],
  stage4: ['ch20', 'ch19', 'ch22', 'ch24', 'ch31', 'ch30', 'ch35', 'ch32', 'ch25', 'ch37', 'appC'],
};

// PLAN §2, "Finding chapters in the PDF" (chapter number or appendix → start page).
// prettier-ignore
const PDF_START: Record<string, number> = {
  ch1: 12, ch2: 24, ch3: 48, ch4: 89, ch5: 98, ch6: 132, ch7: 140, ch8: 160, ch9: 170,
  ch10: 185, ch11: 197, ch12: 208, ch13: 222, ch14: 232, ch15: 238, ch16: 248, ch17: 260,
  ch18: 269, ch19: 279, ch20: 286, ch21: 296, ch22: 326, ch23: 339, ch24: 347, ch25: 354,
  ch26: 372, ch27: 395, ch28: 405, ch29: 417, ch30: 426, ch31: 445, ch32: 476, ch33: 489,
  ch34: 502, ch35: 521, ch36: 536, ch37: 548, appA: 564, appC: 572,
};

describe('course.json', () => {
  it('has the four stages in the PLAN route order', () => {
    const route = Object.fromEntries(
      getCourse().stages.map((stage) => [stage.id, stage.chapters.map((chapter) => chapter.id)]),
    );
    expect(route).toEqual(ROUTE);
  });

  it('starts every chapter on the PLAN PDF page', () => {
    const starts = Object.fromEntries(
      getCourse().stages.flatMap((stage) => stage.chapters.map((ch) => [ch.id, ch.pdfStart])),
    );
    expect(starts).toEqual(PDF_START);
    expect(getChapter('ch12')).toMatchObject({ pdfStart: 208, pdfEnd: 221 });
  });

  it('leaves sections empty until the book is available (G-06)', () => {
    const sections = getCourse().stages.flatMap((s) => s.chapters.flatMap((ch) => ch.sections));
    expect(sections).toEqual([]);
  });

  it('knows no chapter called ch99', () => {
    expect(getChapter('ch99')).toBeUndefined();
  });
});

describe('allowedGrammar', () => {
  it('teaches aller and faire in Stage 1, before the -er chapter (L-02)', () => {
    const ch12 = allowedGrammar('ch12');
    expect(ch12).toEqual(expect.arrayContaining(['etre.present', 'avoir.present']));
    expect(ch12).toEqual(expect.arrayContaining(['aller.present', 'faire.present']));
  });

  it('grows along the route and keeps later grammar out', () => {
    expect(allowedGrammar('appA')).toEqual(['sounds.basic', 'phrases.greetings']);
    expect(allowedGrammar('ch1')).toContain('articles.definite');
    expect(allowedGrammar('ch1')).not.toContain('etre.present');
    expect(allowedGrammar('ch10')).toContain('er.present');
    expect(allowedGrammar('ch10')).not.toContain('numbers.0-100');
    expect(allowedGrammar('ch7')).toContain('numbers.0-100');
    expect(allowedGrammar('ch7')).toContain('questions.est-ce-que');
    expect(allowedGrammar('ch33')).not.toContain('passe-compose.avoir');
  });

  it('follows the route, not the book order (ch12 comes before ch10)', () => {
    expect(allowedGrammar('ch12')).not.toContain('er.present');
    expect(allowedGrammar('ch11')).toContain('er.present');
  });

  it('allows everything by the end of the route', () => {
    expect(allowedGrammar('appC')).toHaveLength(getGrammar().length);
  });

  it('throws for an unknown chapter', () => {
    expect(() => allowedGrammar('ch99')).toThrow('Unknown chapter "ch99"');
  });
});

describe('texts, notes and decks', () => {
  it('works with no texts yet', () => {
    expect(getText('ch10-au-cafe')).toBeUndefined();
    expect(getChapterTexts('ch10')).toEqual([]);
    expect(getNote('ch10')).toBeUndefined();
    expect(getDeck('ch10')).toBeUndefined();
    expect(Object.keys(contentFiles).filter((file) => file.includes('/texts/'))).toEqual([]);
  });

  it('finds content in the layout T-14 writes', () => {
    const content = createContent({
      ...contentFiles,
      'chapters/ch10/texts/ch10-au-cafe.json': cafeDialogueText,
      'chapters/ch10/note.json': ch10Note,
      'chapters/ch10/deck.json': ch10Deck,
    });
    expect(content.getText('ch10-au-cafe')?.title).toBe('Au café');
    expect(content.getText('ch10-nowhere')).toBeUndefined();
    expect(content.getChapterTexts('ch10').map((text) => text.id)).toEqual(['ch10-au-cafe']);
    expect(content.getChapterTexts('ch4')).toEqual([]);
    expect(content.getNote('ch10')?.title).toBe('parler');
    expect(content.getDeck('ch10')?.cards).toHaveLength(3);
  });

  it('refuses a text that breaks the schema', () => {
    const content = createContent({
      ...contentFiles,
      'chapters/ch10/texts/ch10-bad.json': { id: 'ch10-bad' },
    });
    expect(() => content.getText('ch10-bad')).toThrow();
  });
});
