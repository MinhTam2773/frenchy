import { describe, expect, it } from 'vitest';
import { cafeDialogueText, ch10Deck, ch10Note, leaMorningText } from '../fixtures';
import type { Course, Deck, Grammar, Text } from '../schemas';
import { contentFiles } from './index';
import { validateContent, type ContentFiles } from './validate';

const CAFE = 'chapters/ch10/texts/ch10-au-cafe.json';

const grammar = contentFiles['grammar.json'] as Grammar;

const deck: Deck = {
  ...ch10Deck,
  cards: ch10Deck.cards.map((card) => ({ ...card, textId: card.textId && 'ch10-au-cafe' })),
};

const good: ContentFiles = {
  ...contentFiles,
  [CAFE]: cafeDialogueText,
  'chapters/ch10/note.json': ch10Note,
  'chapters/ch10/deck.json': deck,
};

/** `good` with `change` applied to a deep copy of one file (or `files` itself when no path). */
function withFile<T>(path: string, change: (copy: T) => void): ContentFiles {
  const copy = structuredClone(good[path]) as T;
  change(copy);
  return { ...good, [path]: copy };
}

function withCourse(change: (copy: Course) => void): ContentFiles {
  return withFile('course.json', change);
}

function withText(change: (copy: Text) => void): ContentFiles {
  return withFile(CAFE, change);
}

function chapterIn(copy: Course, id: string) {
  const found = copy.stages.flatMap((stage) => stage.chapters).find((ch) => ch.id === id);
  if (!found) throw new Error(`No chapter ${id}`);
  return found;
}

/** Marks the first `count` distinct lemmas as new, so `newWords` stays consistent. */
function markNew(text: Text, count: number): void {
  const lemmas = new Set<string>();
  for (const paragraph of text.paragraphs) {
    for (const sentence of paragraph.sentences) {
      for (const token of sentence.tokens) {
        if (!('lemma' in token)) continue;
        if (lemmas.size < count || lemmas.has(token.lemma)) {
          lemmas.add(token.lemma);
          token.isNew = true;
        } else delete token.isNew;
      }
    }
  }
  text.newWords = [...lemmas];
}

function problemsOf(files: ContentFiles): string[] {
  return validateContent(files).map((p) => `${p.file}: ${p.message}`);
}

describe('validateContent accepts', () => {
  it('the real content tree', () => {
    expect(problemsOf(contentFiles)).toEqual([]);
  });

  it('a chapter with a text, a note and a deck', () => {
    expect(problemsOf(good)).toEqual([]);
  });
});

describe('validateContent course.json', () => {
  it('reports a missing file', () => {
    const rest = Object.fromEntries(
      Object.entries(good).filter(([file]) => file !== 'course.json'),
    );
    expect(problemsOf(rest)).toContain('course.json: File is missing');
  });

  it('reports a file that is not JSON', () => {
    const problems = problemsOf({ ...good, 'grammar.json': new SyntaxError('Unexpected token') });
    expect(problems).toContain('grammar.json: Not valid JSON: Unexpected token');
  });

  it('names a typo in a field', () => {
    const problems = problemsOf(
      withCourse((c) => {
        (c.stages[0].chapters[1] as Record<string, unknown>).titel = 'typo';
      }),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^course\.json: stages\.0\.chapters\.1:.*titel/);
  });

  it('reports a duplicate chapter id', () => {
    const problems = problemsOf(
      withCourse((c) => {
        c.stages[1].chapters.push(structuredClone(chapterIn(c, 'ch1')));
      }),
    );
    expect(problems).toContain('course.json: Duplicate chapter id "ch1"');
  });

  it('reports a gap between chapter PDF ranges', () => {
    const problems = problemsOf(
      withCourse((c) => {
        chapterIn(c, 'ch2').pdfEnd = 40;
      }),
    );
    expect(problems).toEqual([
      'course.json: ch2 ends on PDF page 40 but ch3 starts on 48 (a chapter ends on the page before the next one starts)',
    ]);
  });

  it('reports overlapping PDF ranges', () => {
    const problems = problemsOf(
      withCourse((c) => {
        chapterIn(c, 'ch1').pdfEnd = 30;
      }),
    );
    expect(problems).toEqual([
      'course.json: ch1 ends on PDF page 30 but ch2 starts on 24 (a chapter ends on the page before the next one starts)',
    ]);
  });

  it('reports chapters out of route order by week', () => {
    const problems = problemsOf(
      withCourse((c) => {
        const chapters = c.stages[0].chapters;
        [chapters[1], chapters[2]] = [chapters[2], chapters[1]];
      }),
    );
    expect(problems).toContain(
      'course.json: ch1 ends in week 1, before ch2 (week 2) which comes first in the route',
    );
  });

  it('reports chapter weeks outside their stage', () => {
    const problems = problemsOf(
      withCourse((c) => {
        chapterIn(c, 'ch7').weekEnd = 9;
      }),
    );
    expect(problems).toContain('course.json: ch7: weeks 7-9 fall outside stage1 (1-8)');
  });

  it('reports a gap between stages', () => {
    const problems = problemsOf(
      withCourse((c) => {
        c.stages[1].weekStart = 10;
      }),
    );
    expect(problems).toContain('course.json: stage2: weeks must start at 9, not 10');
  });

  it('reports a chapter id that does not match its book number', () => {
    const problems = problemsOf(
      withCourse((c) => {
        chapterIn(c, 'ch4').number = '5';
      }),
    );
    expect(problems).toContain('course.json: ch4: id does not match book number "5" (ch5)');
  });

  it('reports a section outside its chapter', () => {
    const problems = problemsOf(
      withCourse((c) => {
        chapterIn(c, 'ch1').sections = [{ label: 'Section 1', pdfStart: 12, pdfEnd: 30 }];
      }),
    );
    expect(problems).toEqual([
      'course.json: ch1: section "Section 1" (PDF 12-30) is outside the chapter',
    ]);
  });
});

describe('validateContent grammar.json', () => {
  it('reports a duplicate tag', () => {
    const problems = problemsOf({ ...good, 'grammar.json': [...grammar, grammar[0]] });
    expect(problems).toContain('grammar.json: Duplicate grammar tag "sounds.basic"');
  });

  it('reports a tag for a chapter that is not in the course', () => {
    const extra = { id: 'x.y', label: 'X', chapterId: 'ch99' };
    const problems = problemsOf({ ...good, 'grammar.json': [...grammar, extra] });
    expect(problems).toEqual(['grammar.json: x.y: chapter "ch99" is not in course.json']);
  });

  it('reports a tag listed after a tag from a later chapter', () => {
    const early = { id: 'early.tag', label: 'Early', chapterId: 'ch1' };
    const problems = problemsOf({ ...good, 'grammar.json': [...grammar, early] });
    expect(problems).toEqual([
      'grammar.json: early.tag: listed after a tag from a later chapter (tags must follow the route)',
    ]);
  });
});

describe('validateContent texts', () => {
  it('rejects grammar introduced in a later chapter', () => {
    const lea = 'chapters/ch10/texts/ch10-le-matin-de-lea.json';
    expect(problemsOf({ ...good, [lea]: leaMorningText })).toEqual([
      `${lea}: Grammar tag "numbers.0-100" is not allowed in ch10 (it is introduced later)`,
    ]);
  });

  it('rejects an unknown grammar tag', () => {
    const problems = problemsOf(
      withText((t) => {
        t.grammarTags.push('er.imaginary');
      }),
    );
    expect(problems).toEqual([`${CAFE}: Unknown grammar tag "er.imaginary"`]);
  });

  it('rejects more than 8 new words', () => {
    const problems = problemsOf(withText((t) => markNew(t, 9)));
    expect(problems).toEqual([`${CAFE}: Introduces 9 new words; at most 8 per text`]);
    expect(problemsOf(withText((t) => markNew(t, 8)))).toEqual([]);
  });

  it('names a word token without a lemma', () => {
    const problems = problemsOf(
      withText((t) => {
        const word = t.paragraphs[0].sentences[0].tokens[0];
        delete (word as { lemma?: string }).lemma;
      }),
    );
    expect(problems).toEqual([
      `${CAFE}: paragraphs.0.sentences.0.tokens.0: word token "Bonjour" has no lemma`,
    ]);
  });

  it('names a sentence without a translation', () => {
    const problems = problemsOf(
      withText((t) => {
        delete (t.paragraphs[1].sentences[0] as { en?: string }).en;
      }),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(`${CAFE}: paragraphs.1.sentences.0.en:`);
  });

  it('rejects a text whose chapterId is not its folder', () => {
    const files = {
      ...good,
      'chapters/ch4/texts/ch10-au-cafe.json': cafeDialogueText,
    };
    expect(problemsOf(files)).toContain(
      'chapters/ch4/texts/ch10-au-cafe.json: chapterId "ch10" does not match its folder "ch4"',
    );
  });

  it('rejects a file name that is not the text id', () => {
    const { [CAFE]: text, ...rest } = good;
    const files = { ...rest, 'chapters/ch10/texts/cafe.json': text };
    expect(problemsOf(files)).toContain(
      'chapters/ch10/texts/cafe.json: File name must be the text id: ch10-au-cafe.json',
    );
  });

  it('rejects files in the wrong place', () => {
    const problems = problemsOf({
      ...good,
      'chapters/ch10/text/oops.json': {},
      'chapters/ch10/readme.md': null,
      'chapters/ch99/note.json': {},
    });
    expect(problems).toEqual([
      'chapters/ch10/text/oops.json: Unexpected file; expected chapters/<chapterId>/texts/<id>.json, note.json or deck.json',
      'chapters/ch10/readme.md: Unexpected file; expected chapters/<chapterId>/texts/<id>.json, note.json or deck.json',
      'chapters/ch99/note.json: Folder "ch99" is not a chapter in course.json',
    ]);
  });
});

describe('validateContent notes and decks', () => {
  it('rejects a note for another chapter', () => {
    const problems = problemsOf(
      withFile<typeof ch10Note>('chapters/ch10/note.json', (n) => {
        n.chapterId = 'ch4';
      }),
    );
    expect(problems).toEqual([
      'chapters/ch10/note.json: chapterId "ch4" does not match its folder "ch10"',
    ]);
  });

  it('rejects a card that points to a missing text', () => {
    const problems = problemsOf(
      withFile<Deck>('chapters/ch10/deck.json', (d) => {
        d.cards[0].textId = 'ch10-nowhere';
      }),
    );
    expect(problems).toEqual([
      'chapters/ch10/deck.json: Card "ch10-elle-ecoute-la-radio" points to text "ch10-nowhere", which does not exist',
    ]);
  });

  it('accepts a card that points to a text in another chapter', () => {
    const files = {
      ...good,
      'chapters/ch1/deck.json': {
        chapterId: 'ch1',
        cards: [{ ...deck.cards[0], id: 'ch1-card', textId: 'ch10-au-cafe' }],
      },
    };
    expect(problemsOf(files)).toEqual([]);
  });

  it('rejects a duplicate card id', () => {
    const files = {
      ...good,
      'chapters/ch1/deck.json': {
        chapterId: 'ch1',
        cards: [
          { ...deck.cards[0], id: 'ch1-card' },
          { ...deck.cards[1], id: 'ch1-card' },
        ],
      },
    };
    expect(problemsOf(files)).toEqual(['chapters/ch1/deck.json: Duplicate card id "ch1-card"']);
  });

  it('rejects a deck for another chapter', () => {
    const problems = problemsOf(
      withFile<Deck>('chapters/ch10/deck.json', (d) => {
        d.chapterId = 'ch4';
        d.cards.forEach((card, i) => (card.id = `ch4-card-${i}`));
      }),
    );
    expect(problems).toEqual([
      'chapters/ch10/deck.json: chapterId "ch4" does not match its folder "ch10"',
    ]);
  });
});
