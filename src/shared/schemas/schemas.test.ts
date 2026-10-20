import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as f from '../fixtures';
import * as schemas from './index';

/** A deep copy of `value` with `change` applied, for "rejects a broken copy". */
function broken<T>(value: T, change: (copy: T) => void): T {
  const copy = structuredClone(value);
  change(copy);
  return copy;
}

const text = f.leaMorningText;
const firstSentence = text.paragraphs[0].sentences[0];
const firstWord = firstSentence.tokens[0];
const chapter = f.course.stages[0].chapters[4];
const deckCard = f.ch10Deck.cards[1];
const card = f.reviewCards[0];

type Case = { valid: unknown[]; invalid: unknown[] };

const cases: Record<string, Case> = {
  // common
  Uuid: { valid: [card.id], invalid: ['card-1', '00000000-0000-4000-8000-00000000001'] },
  EpochMs: { valid: [f.FIXTURE_NOW, 0], invalid: [-1, 1.5, '1700000000000'] },
  LocalDate: {
    valid: [f.FIXTURE_TODAY, '2028-02-29'],
    invalid: ['2026-02-30', '2026-10-17T00:00:00Z', '17/10/2026'],
  },
  TimeZone: { valid: [f.FIXTURE_TIME_ZONE, 'UTC', 'Europe/Paris'], invalid: ['Mars/Olympus', ''] },
  ChapterId: {
    valid: ['ch1', 'ch10', 'ch37', 'appA'],
    invalid: ['c10', 'ch0', 'ch100', 'appD', 'CH10'],
  },
  ContentId: { valid: [text.id, 'appA-sounds'], invalid: ['le-matin', 'ch10-Le-Matin', 'ch10-'] },
  GrammarTagId: {
    valid: ['er.present', 'numbers.0-100', 'questions.est-ce-que'],
    invalid: ['ER.present', 'er present', '.er'],
  },
  Lemma: { valid: ['aller', 'Léa'], invalid: ['', '   '] },
  Gender: { valid: ['m', 'f'], invalid: ['mf', 'n'] },
  PartOfSpeech: { valid: ['verb', 'contraction'], invalid: ['punct', 'Verb'] },

  // content
  ChapterSection: {
    valid: [chapter.sections[0]],
    invalid: [{ label: 'Section 1', pdfStart: 0, pdfEnd: 2 }],
  },
  Chapter: {
    valid: [chapter],
    invalid: [
      broken(chapter, (c) => {
        c.kind = 'story' as never;
      }),
      broken(chapter, (c) => {
        c.pdfEnd = c.pdfStart - 1;
      }),
      broken(chapter, (c) => {
        (c as Record<string, unknown>).titel = 'typo';
      }),
    ],
  },
  Stage: {
    valid: [f.course.stages[0]],
    invalid: [
      broken(f.course.stages[0], (s) => {
        s.chapters = [];
      }),
    ],
  },
  Course: { valid: [f.course], invalid: [{ stages: [] }] },
  GrammarTag: {
    valid: [f.grammar[0]],
    invalid: [{ id: 'er.present', label: 'x', chapterId: 'c10' }],
  },
  Grammar: { valid: [f.grammar], invalid: [[{ id: 'Er', label: 'x', chapterId: 'ch10' }]] },
  WordToken: {
    valid: [firstWord],
    invalid: [
      { t: 'Léa', pos: 'name', gloss: 'Léa' },
      { t: ',', lemma: ',', pos: 'noun', gloss: 'comma' },
    ],
  },
  GapToken: {
    valid: [{ t: ' ' }, { t: ', ' }, { t: '\u00a0!' }],
    invalid: [{ t: 'Léa' }, { t: '' }],
  },
  Token: { valid: [firstWord, { t: '. ' }], invalid: [{ t: 'Léa' }, { t: ' ', lemma: 'x' }] },
  Sentence: {
    valid: [firstSentence],
    invalid: [
      { tokens: [], en: 'Nothing' },
      broken(firstSentence, (s) => {
        s.en = '';
      }),
    ],
  },
  Paragraph: {
    valid: [text.paragraphs[0], f.cafeDialogueText.paragraphs[0]],
    invalid: [{ sentences: [] }],
  },
  Text: {
    valid: f.texts,
    invalid: [
      broken(text, (t) => {
        t.id = 'ch12-le-matin-de-lea';
      }),
      broken(text, (t) => {
        t.newWords.pop();
      }),
      broken(text, (t) => {
        t.kind = 'poem' as never;
      }),
    ],
  },
  DeckCard: {
    valid: f.ch10Deck.cards,
    invalid: [
      broken(deckCard, (c) => {
        c.back = 'Nous parlons anglais à la maison.';
      }),
      broken(deckCard, (c) => {
        c.front = 'Nous ___ français ___.';
      }),
      broken(deckCard, (c) => {
        delete c.clozeAnswer;
      }),
      broken(f.ch10Deck.cards[0], (c) => {
        c.clozeAnswer = 'radio';
      }),
    ],
  },
  Deck: {
    valid: [f.ch10Deck],
    invalid: [
      broken(f.ch10Deck, (d) => {
        d.chapterId = 'ch12';
      }),
    ],
  },
  PatternRow: {
    valid: [f.ch10Note.rows[0]],
    invalid: [{ label: 'nous', fr: 'parlons', ending: 'ez' }],
  },
  GrammarNote: {
    valid: [f.ch10Note],
    invalid: [
      broken(f.ch10Note, (n) => {
        n.rows = [];
      }),
    ],
  },

  // lexicon
  LexemeGender: { valid: ['m', 'f', 'mf'], invalid: ['n'] },
  Lexeme: {
    valid: f.lexemes,
    invalid: [
      broken(f.lexemes[1], (l) => {
        l.glosses = [];
      }),
      broken(f.lexemes[1], (l) => {
        l.rank = 0;
      }),
    ],
  },
  FormEntry: {
    valid: f.forms,
    invalid: [
      broken(f.forms[0], (e) => {
        e.person = 4 as never;
      }),
      { form: 'au', lemma: 'au', pos: 'contraction', parts: ['à'] },
    ],
  },

  // user
  DailyGoalMinutes: { valid: [15, 30, 45, 60], invalid: [20, '45'] },
  ProfileSettings: {
    valid: [f.profile.settings],
    invalid: [
      broken(f.profile.settings, (s) => {
        s.rate = 1.5;
      }),
      broken(f.profile.settings, (s) => {
        s.voiceURI = 'x'.repeat(501);
      }),
    ],
  },
  Profile: {
    valid: [f.profile, f.newProfile],
    invalid: [
      broken(f.profile, (p) => {
        p.timeZone = 'Toronto';
      }),
      broken(f.profile, (p) => {
        p.dailyGoalMinutes = 40 as never;
      }),
    ],
  },
  ProfilePatch: {
    valid: [{}, { dailyGoalMinutes: 30, settings: { rate: 0.9 } }, { currentChapterId: null }],
    invalid: [
      { settings: { rate: 0.2 } },
      { currentChapterId: 'chapter-10' },
      { settings: { voiceURI: 'x'.repeat(501) } },
    ],
  },

  // srs
  CardType: { valid: ['cloze'], invalid: ['word'] },
  CardState: { valid: ['relearning'], invalid: [1] },
  Rating: { valid: [1, 4], invalid: [0, 5, '3'] },
  CardSource: {
    valid: [card.source],
    invalid: [
      { kind: 'import', ref: 'x' },
      { kind: 'word', ref: '' },
    ],
  },
  Card: {
    valid: f.reviewCards,
    invalid: [
      broken(card, (c) => {
        c.state = 'done' as never;
      }),
      broken(card, (c) => {
        c.due = -5;
      }),
      broken(card, (c) => {
        c.type = 'cloze';
      }),
    ],
  },
  CardCreate: {
    valid: [f.wordCardCreate],
    invalid: [
      broken(f.wordCardCreate, (c) => {
        c.front = '';
      }),
    ],
  },
  ReviewInput: {
    valid: [f.reviewInput],
    invalid: [
      broken(f.reviewInput, (r) => {
        r.rating = 0 as never;
      }),
      broken(f.reviewInput, (r) => {
        r.id = 'r1';
      }),
    ],
  },
  DueCardsQuery: {
    valid: [{}, { limit: '20' }, { limit: 5 }],
    invalid: [{ limit: '0' }, { limit: '101' }, { limit: 'ten' }],
  },
  DueCardsResponse: {
    valid: [{ cards: f.reviewCards }, { cards: [] }],
    invalid: [{ cards: [{ id: card.id }] }],
  },
  CardStats: {
    valid: [f.cardStats, f.allCaughtUpStats],
    invalid: [
      broken(f.cardStats, (s) => {
        s.due = -1;
      }),
    ],
  },
  StarterDeckResult: { valid: [{ added: 24, total: 24 }], invalid: [{ added: 1.5, total: 24 }] },

  // words
  WordStatusValue: { valid: ['known'], invalid: ['saved'] },
  WordStatus: { valid: f.words, invalid: [{ lemma: '', status: 'new' }] },
  WordsResponse: { valid: [{ words: f.words }], invalid: [{ words: [{ lemma: 'chat' }] }] },
  WordStatusPut: { valid: [{ status: 'learning' }], invalid: [{ status: 'seen' }] },

  // activity
  DailyActivity: {
    valid: f.dailyActivity,
    invalid: [
      broken(f.dailyActivity[0], (d) => {
        d.date = '2026-10-32';
      }),
    ],
  },
  StreakSummary: {
    valid: [f.streak],
    invalid: [
      broken(f.streak, (s) => {
        s.freezesLeft = 3;
      }),
    ],
  },
  CalendarDay: { valid: f.streak.calendar, invalid: [{ date: f.FIXTURE_TODAY, status: 'today' }] },
  StreakResponse: {
    valid: [f.streak],
    invalid: [
      broken(f.streak, (s) => {
        s.today = 'today';
      }),
    ],
  },
  ActivityPing: { valid: [{ at: f.FIXTURE_NOW }], invalid: [{ at: 'now' }, {}] },
  Reading: { valid: f.readings, invalid: [{ textId: 'le-matin', finishedAt: f.FIXTURE_NOW }] },
  ReadingsResponse: {
    valid: [{ readings: f.readings }],
    invalid: [{ readings: [{ textId: text.id }] }],
  },

  // ai
  TranslateRequest: {
    valid: [f.translateRequest],
    invalid: [{ text: '  ' }, { text: 'a'.repeat(501) }],
  },
  TranslateResponse: { valid: [f.translateResponse], invalid: [{ translation: '' }] },
  ExplainRequest: {
    valid: [f.explainRequest],
    invalid: [
      broken(f.explainRequest, (r) => {
        r.chapterId = 'ten';
      }),
    ],
  },
  GlossPair: { valid: [f.explainResponse.gloss[0]], invalid: [{ fr: 'Il' }] },
  ExplainResponse: {
    valid: [f.explainResponse],
    invalid: [
      broken(f.explainResponse, (r) => {
        r.notes.push('A third note');
      }),
      broken(f.explainResponse, (r) => {
        r.gloss = [];
      }),
    ],
  },

  // api
  ApiErrorCode: { valid: ['rate_limited'], invalid: ['teapot'] },
  ApiError: {
    valid: [
      { error: { code: 'unauthorized', message: 'Sign in first' } },
      {
        error: {
          code: 'bad_request',
          message: 'Invalid body',
          issues: [{ path: 'rating', message: 'Expected 1–4' }],
        },
      },
    ],
    invalid: [{ error: { code: 'oops', message: 'x' } }, { message: 'flat' }],
  },
  AuthConfig: { valid: [{ google: false }], invalid: [{}, { google: 'yes' }] },

  // account
  AccountDeleteInput: {
    valid: [{ confirm: 'delete' }],
    invalid: [{}, { confirm: 'yes' }, { confirm: 'DELETE' }],
  },
  AccountDeleted: { valid: [{ deleted: true }], invalid: [{}, { deleted: false }] },
  AccountExport: {
    valid: [
      {
        exportedAt: 1_760_000_000_000,
        user: { id: 'u1', name: 'Léa', email: 'lea@example.com' },
        tables: { cards: [{ id: 'c1', userId: 'u1' }], word_status: [] },
      },
    ],
    invalid: [
      {},
      { exportedAt: 1, user: { id: '', name: 'Léa', email: 'a@b.c' }, tables: {} },
      { exportedAt: 1, user: { id: 'u1', name: 'Léa', email: 'a@b.c' }, tables: { cards: 'no' } },
    ],
  },
};

const exported = Object.entries(schemas as Record<string, unknown>).filter(
  (entry): entry is [string, z.ZodType] => entry[1] instanceof z.ZodType,
);

describe('shared schemas', () => {
  it('has a case for every exported schema', () => {
    expect(exported.map(([name]) => name).sort()).toEqual(Object.keys(cases).sort());
  });

  describe.each(exported)('%s', (name, schema) => {
    const { valid, invalid } = cases[name] ?? { valid: [], invalid: [] };

    it.each(valid.map((value, i) => [i, value]))('accepts valid #%i', (_, value) => {
      const result = schema.safeParse(value);
      expect(result.error?.issues ?? []).toEqual([]);
    });

    it.each(invalid.map((value, i) => [i, value]))('rejects broken #%i', (_, value) => {
      expect(schema.safeParse(value).success).toBe(false);
    });
  });
});

describe('fixtures', () => {
  it('Le matin de Léa rebuilds the mockup text from its tokens', () => {
    const paragraphs = text.paragraphs.map((p) =>
      p.sentences.map((s) => s.tokens.map((tok) => tok.t).join('')).join(' '),
    );
    expect(paragraphs).toEqual([
      'Léa habite à Lyon. Elle a un petit appartement et un chat.',
      'Le matin, elle mange une tartine et elle écoute la radio.',
      'Elle parle avec son voisin, Karim. Il aime le café, mais Léa préfère le thé.',
      'À huit heures, elle va au travail.',
    ]);
  });

  it('the review cards point at real deck cards', () => {
    const deckIds = f.ch10Deck.cards.map((c) => c.id);
    expect(f.reviewCards.map((c) => c.source.ref)).toEqual(deckIds);
  });

  it('card stats add up', () => {
    const { due, new: fresh, learning, review } = f.cardStats;
    expect(fresh + learning + review).toBe(due);
  });
});
