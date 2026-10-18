import { FIXTURE_NOW, FIXTURE_TODAY } from '../../shared/fixtures/clock';
import { ch10Deck, texts } from '../../shared/fixtures/content';
import { dailyActivity, readings } from '../../shared/fixtures/activity';
import { profile } from '../../shared/fixtures/user';
import { wordCardCreate } from '../../shared/fixtures/srs';
import { words } from '../../shared/fixtures/words';
import type { Card, CardCreate, DailyActivity, Profile, WordStatus } from '../../shared/schemas';
import { hashPassword } from 'better-auth/crypto';
import { account, user as authUser } from '../auth/schema';
import { scopedDb, type Db } from './index';

// Relative imports so `scripts/db/seed.ts` runs under tsx without the tsconfig path aliases.

export const DEMO_USER_ID = 'demo-user';

/** Sign in locally with these after `npm run db:seed:local` (T-26). Never seeded in production. */
export const DEMO_LOGIN = { name: 'Léa', email: 'demo@frenchy.local', password: 'frenchy-demo' };

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export interface DemoData {
  profile: Profile;
  cards: Card[];
  words: WordStatus[];
  activity: DailyActivity[];
  readings: { textId: string; date: string; finishedAt: number }[];
}

/** The mockups' demo user (profile on Ch 10, 18 due cards, 12-day streak with one freeze), moved to `now`. */
export function buildDemoData(now: number): DemoData {
  const today = localDate(now, profile.timeZone);
  const dayShift = (Date.parse(today) - Date.parse(FIXTURE_TODAY)) / DAY;
  return {
    profile,
    cards: demoCards(now),
    words,
    activity: dailyActivity.map((row) => ({ ...row, date: addDays(row.date, dayShift) })),
    readings: readings.map(({ textId, finishedAt }) => {
      const at = finishedAt + (now - FIXTURE_NOW);
      return { textId, date: localDate(at, profile.timeZone), finishedAt: at };
    }),
  };
}

/** Replaces everything the demo user has with fresh demo data, in one batch. */
export async function seedDemo(db: Db, now = Date.now()): Promise<DemoData> {
  const data = buildDemoData(now);
  const user = scopedDb(db, DEMO_USER_ID);
  const password = await hashPassword(DEMO_LOGIN.password);
  await user.batch([
    // A Better Auth user with an email + password account, so the app can sign in as the demo.
    db
      .insert(authUser)
      .values({ id: DEMO_USER_ID, name: DEMO_LOGIN.name, email: DEMO_LOGIN.email })
      .onConflictDoNothing(),
    db
      .insert(account)
      .values({
        id: `${DEMO_USER_ID}-credential`,
        accountId: DEMO_USER_ID,
        providerId: 'credential',
        userId: DEMO_USER_ID,
        password,
      })
      .onConflictDoUpdate({ target: account.id, set: { password } }),
    user.reviews.delete(),
    user.cards.delete(),
    user.profiles.delete(),
    user.wordStatus.delete(),
    user.dailyActivity.delete(),
    user.activityMinutes.delete(),
    user.textReads.delete(),
    user.profiles.insert({ ...data.profile, createdAt: now, updatedAt: now }),
    // One statement per row: D1 allows at most 100 bound parameters per statement.
    ...data.cards.map((card) => user.cards.insert(cardRow(card))),
    ...data.words.map((word) => user.wordStatus.insert({ ...word, updatedAt: now })),
    ...data.activity.map((day) => user.dailyActivity.insert(day)),
    user.textReads.insert(data.readings),
  ]);
  return data;
}

// `Practice.dc.html`: 18 due = 9 review + 4 learning + 5 new.
const DUE_STATES = [
  ...Array<'review'>(9).fill('review'),
  ...Array<'learning'>(4).fill('learning'),
  ...Array<'new'>(5).fill('new'),
];

function demoCards(now: number): Card[] {
  const sentences = texts.flatMap((text) =>
    text.paragraphs.flatMap((paragraph) =>
      paragraph.sentences.map((sentence) => ({
        fr: sentence.tokens.map((token) => token.t).join(''),
        en: sentence.en,
        ref: text.id,
      })),
    ),
  );
  const contents: CardCreate[] = [
    ...ch10Deck.cards.map(({ id, type, front, back, clozeAnswer, hint, note }) => ({
      type,
      front,
      back,
      clozeAnswer,
      hint,
      note,
      source: { kind: 'starter' as const, ref: id },
    })),
    wordCardCreate,
    ...sentences.map(({ fr, en, ref }) => ({
      type: 'sentence_meaning' as const,
      front: fr,
      back: en,
      source: { kind: 'text' as const, ref },
    })),
    ...sentences.map(({ fr, en, ref }) => ({
      type: 'meaning_sentence' as const,
      front: en,
      back: fr,
      source: { kind: 'text' as const, ref },
    })),
  ];
  return DUE_STATES.map((state, i) => {
    const content = contents[i];
    if (!content) throw new Error(`Demo seed needs ${DUE_STATES.length} cards`);
    return {
      id: crypto.randomUUID(),
      ...content,
      ...fsrsFor(state, now),
      due: now - (i + 1) * MINUTE,
    };
  });
}

function fsrsFor(state: 'review' | 'learning' | 'new', now: number) {
  const base = {
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state,
    lastReview: null,
    createdAt: now - 10 * DAY,
    updatedAt: now - 10 * DAY,
  };
  if (state === 'review') {
    const lastReview = now - 3 * DAY;
    return {
      ...base,
      stability: 3.2,
      difficulty: 5.1,
      elapsedDays: 3,
      scheduledDays: 3,
      reps: 3,
      lastReview,
      updatedAt: lastReview,
    };
  }
  if (state === 'learning') {
    const lastReview = now - 15 * MINUTE;
    return {
      ...base,
      stability: 0.4,
      difficulty: 6.4,
      learningSteps: 1,
      reps: 1,
      lastReview,
      updatedAt: lastReview,
    };
  }
  return base;
}

function cardRow({ source, ...card }: Card) {
  return { ...card, sourceKind: source.kind, sourceRef: source.ref };
}

function localDate(at: number, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(at);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);
}
