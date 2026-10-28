import { describe, expect, it } from 'vitest';
import { cafeDialogueText, ch10Deck, ch10Note, leaMorningText } from '../fixtures';
import type { Course, Deck, Grammar, Text, Token, WordToken } from '../schemas';
import { contentFiles } from './files';
import { validateContent, type ContentFiles } from './validate';

const CAFE = 'chapters/ch10/texts/ch10-au-cafe.json';

const grammar = contentFiles['grammar.json'] as Grammar;

const deck: Deck = {
  ...ch10Deck,
  cards: ch10Deck.cards.map((card) => ({ ...card, textId: card.textId && 'ch10-au-cafe' })),
};

// The real course and grammar, but none of the real texts: a rule that looks across texts (isNew)
// must not meet the lessons already written (L-75).
const good: ContentFiles = {
  'course.json': contentFiles['course.json'],
  'grammar.json': contentFiles['grammar.json'],
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

describe('validateContent typography', () => {
  const NB = '\u00a0';
  const where = `${CAFE}: paragraphs.0.sentences.0:`;
  const wordTemplate = cafeDialogueText.paragraphs[0].sentences[0].tokens[0] as WordToken;

  /** Edits the tokens of the first sentence ("Bonjour, Léa\u00a0!") and returns the problems. */
  function withTokens(change: (tokens: Token[]) => void): string[] {
    return problemsOf(withText((t) => change(t.paragraphs[0].sentences[0].tokens)));
  }

  /** Replaces the whole sentence: each part is a word (`true`) or a gap (`false`) with this text. */
  function replaceWith(...parts: [isWord: boolean, t: string][]): string[] {
    return withTokens((tokens) => {
      tokens.splice(
        0,
        tokens.length,
        ...parts.map(([isWord, t]): Token => (isWord ? { ...wordTemplate, t } : { t })),
      );
    });
  }

  it('accepts no-break spaces, « », clock times and stacked marks', () => {
    expect(
      replaceWith(
        [false, `«${NB}`],
        [true, 'Quoi'],
        [false, `${NB}?!${NB}»${NB}; `],
        [true, '8'],
        [false, ':'],
        [true, '30'],
        [false, `${NB}:`],
      ),
    ).toEqual([]);
  });

  it('rejects a space at the start or the end of a sentence', () => {
    expect(withTokens((tokens) => tokens.unshift({ t: ' ' }))).toEqual([
      `${where} " Bonjour, Léa${NB}!" starts or ends with a space`,
    ]);
    expect(withTokens((tokens) => tokens.push({ t: ' ' }))).toContain(
      `${where} "Bonjour, Léa${NB}! " starts or ends with a space`,
    );
  });

  it('rejects two spaces in a row', () => {
    const problems = withTokens((tokens) => {
      tokens[1] = { t: ',  ' };
    });
    expect(problems).toEqual([`${where} "Bonjour,  Léa${NB}!" has two spaces in a row`]);
  });

  it('rejects a plain space or no space before ? ! : ;', () => {
    for (const [gap, found] of [
      [' !', 'a plain space'],
      ['!', 'no space'],
      [' ?', 'a plain space'],
      [' :', 'a plain space'],
      [' ;', 'a plain space'],
    ]) {
      const problems = withTokens((tokens) => {
        tokens[3] = { t: gap };
      });
      expect(problems).toEqual([
        `${where} "Bonjour, Léa${gap}" has ${found} before "${gap.slice(-1)}"; use a no-break space (U+00A0)`,
      ]);
    }
  });

  it('rejects a plain space inside « »', () => {
    expect(replaceWith([false, '« '], [true, 'Oui'], [false, ' »'])).toEqual([
      `${where} "« Oui »" has a plain space after "«"; use a no-break space (U+00A0)`,
      `${where} "« Oui »" has a plain space before "»"; use a no-break space (U+00A0)`,
    ]);
  });

  it("rejects a gap token right after a word ending in an apostrophe (l' + ardoise)", () => {
    expect(replaceWith([true, "l'"], [false, ' '], [true, 'ardoise'])).toContain(
      `${where} gap token " " after "l'"; the next word follows it directly`,
    );
  });

  it('rejects a curly apostrophe in a token', () => {
    expect(replaceWith([true, 'l’'], [true, 'ardoise'])).toEqual([
      `${where} token "l’" has a curly apostrophe; use a straight ' (U+0027)`,
    ]);
  });

  it('names the sentence that is wrong', () => {
    const problems = problemsOf(
      withText((t) => {
        t.paragraphs[1].sentences[1].tokens.push({ t: ' ' });
      }),
    );
    expect(problems.some((problem) => problem.startsWith(`${CAFE}: paragraphs.1.sentences.1: `))).toBe(
      true,
    );
  });
});

/** A one-sentence text; `parts` are words (`[t, lemma, extra]`) and gaps (a plain string). */
type Part = string | [t: string, lemma: string, extra?: Partial<WordToken>];

function miniText(id: string, parts: Part[], chapterId = id.split('-')[0]): Text {
  const tokens = parts.map((part): Token => {
    if (typeof part === 'string') return { t: part };
    const [t, lemma, extra] = part;
    return { t, lemma, pos: 'noun', gloss: lemma, ...extra };
  });
  const newWords = tokens.flatMap((token) =>
    'isNew' in token && token.isNew ? [token.lemma] : [],
  );
  return {
    id,
    chapterId,
    title: id,
    kind: 'story',
    minutes: 1,
    paragraphs: [{ sentences: [{ tokens, en: 'x' }] }],
    newWords: [...new Set(newWords)],
    grammarTags: [],
  };
}

const textPath = (text: Text) => `chapters/${text.chapterId}/texts/${text.id}.json`;

function withTexts(...texts: Text[]): ContentFiles {
  return { ...good, ...Object.fromEntries(texts.map((text) => [textPath(text), text])) };
}

const NEW = { isNew: true } as const;

describe('validateContent token split vs tokenize()', () => {
  it('reports the file, sentence and both splits when lesson tokens differ', () => {
    const text = miniText('ch10-aaa', [
      ['a-t-il', 'avoir'],
      ' ',
      ['12', 'douze'],
      ',',
      ['50', 'cinquante'],
    ]);
    expect(problemsOf(withTexts(text))).toEqual([
      `${textPath(text)}: paragraphs.0.sentences.0: token split differs from tokenize() for "a-t-il 12,50"; lesson split: word("a-t-il") gap(" ") word("12") gap(",") word("50"); tokenize() split: word("a") gap("-") word("t") gap("-") word("il") gap(" ") word("12,50")`,
    ]);
  });
});

describe('validateContent isNew once per course', () => {
  const first = miniText('ch10-aaa', [['fraise', 'fraise', NEW]]);

  it('accepts a lemma that is new in one text and plain in the others', () => {
    const later = miniText('ch10-bbb', [['fraise', 'fraise']]);
    expect(problemsOf(withTexts(first, later))).toEqual([]);
  });

  it('rejects a lemma marked again in a later text of the same chapter, naming the earlier one', () => {
    const again = miniText('ch10-bbb', [['une', 'un'], ' ', ['fraise', 'fraise', NEW]]);
    expect(problemsOf(withTexts(first, again))).toEqual([
      `${textPath(again)}: paragraphs.0.sentences.0: "fraise" is marked isNew, but ch10-aaa comes first along the route and already marks it; mark it in one text only`,
    ]);
  });

  it('follows the route, not the alphabet, across chapters (ch12 comes before ch10)', () => {
    const ch10 = miniText('ch10-aaa', [['fraise', 'fraise', NEW]]);
    const ch12 = miniText('ch12-zzz', [['fraise', 'fraise', NEW]]);
    expect(problemsOf(withTexts(ch10, ch12))).toEqual([
      `${textPath(ch10)}: paragraphs.0.sentences.0: "fraise" is marked isNew, but ch12-zzz comes first along the route and already marks it; mark it in one text only`,
    ]);
  });

  it('reports a lemma once per text, even for a phrase marked on every word', () => {
    const phrase = (t: string) => [t, 'un peu', { ...NEW, pos: 'phrase' }] as Part;
    const a = miniText('ch10-aaa', [phrase('un'), ' ', phrase('peu')]);
    const b = miniText('ch10-bbb', [phrase('un'), ' ', phrase('peu')]);
    expect(problemsOf(withTexts(a, b))).toEqual([
      `${textPath(b)}: paragraphs.0.sentences.0: "un peu" is marked isNew, but ch10-aaa comes first along the route and already marks it; mark it in one text only`,
    ]);
  });
});

describe('validateContent phrase list', () => {
  const sentence = (...parts: Part[]) => problemsOf(withTexts(miniText('ch10-aaa', parts)));
  const where = `${textPath(miniText('ch10-aaa', []))}: paragraphs.0.sentences.0:`;
  const phrase = (t: string, lemma: string): Part => [t, lemma, { pos: 'phrase' }];

  it('accepts listed phrases with every word marked, even around "n\'y"', () => {
    expect(
      sentence(phrase('Il', 'il y a'), ' ', phrase('y', 'il y a'), ' ', phrase('a', 'il y a')),
    ).toEqual([]);
    expect(
      sentence(
        phrase('il', 'il y a'),
        ' ',
        ["n'", 'ne'],
        phrase('y', 'il y a'),
        ' ',
        phrase('a', 'il y a'),
        ' ',
        ['pas', 'pas'],
      ),
    ).toEqual([]);
  });

  it('rejects pos phrase on a lemma outside the closed list', () => {
    expect(sentence(phrase('ça', 'ça va'), ' ', phrase('va', 'ça va'))).toEqual([
      `${where} "ça va" has pos phrase but is not in the closed phrase list (src/shared/content/phrases.ts); annotate its words one by one, and a single word is never a phrase`,
    ]);
  });

  it('rejects a single word with pos phrase (voilà)', () => {
    expect(sentence(phrase('Voilà', 'voilà'))).toEqual([
      `${where} "voilà" has pos phrase but is not in the closed phrase list (src/shared/content/phrases.ts); annotate its words one by one, and a single word is never a phrase`,
    ]);
  });

  it('rejects a listed phrase with only some of its words marked', () => {
    expect(sentence(['Un', 'un'], ' ', phrase('peu', 'un peu'))).toEqual([
      `${where} "un peu" has 2 words but 1 token(s) carry it; every word of a phrase gets lemma "un peu" and pos phrase`,
    ]);
  });

  it('rejects a listed phrase annotated word by word', () => {
    expect(sentence(['Il', 'il'], ' ', ['y', 'y'], ' ', ['a', 'avoir'])).toEqual([
      `${where} "il y a" is a fixed phrase; give every word of it lemma "il y a" and pos phrase instead of annotating it word by word`,
    ]);
  });

  it("flags the longest phrase only: qu'est-ce que word by word is one problem", () => {
    expect(
      sentence(["Qu'", 'que'], ['est', 'être'], '-', ['ce', 'ce'], ' ', ['que', 'que']),
    ).toEqual([
      `${where} "qu'est-ce que" is a fixed phrase; give every word of it lemma "qu'est-ce que" and pos phrase instead of annotating it word by word`,
    ]);
  });

  it("leaves look-alikes alone (c'est ce que has no hyphen)", () => {
    expect(sentence(["C'", 'ce'], ['est', 'être'], ' ', ['ce', 'ce'], ' ', ['que', 'que'])).toEqual(
      [],
    );
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
