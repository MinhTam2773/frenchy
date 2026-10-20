import { http, HttpResponse, type RequestHandler } from 'msw';
import {
  cardStats,
  ch10Deck,
  dailyActivity,
  explainResponse,
  FIXTURE_TODAY,
  profile as profileFixture,
  readings as readingsFixture,
  reviewCards,
  streak,
  texts as fixtureTexts,
  translateResponse,
  words as wordsFixture,
} from '@shared/fixtures';
import { getChapter, hasText, loadDeck } from '@shared/content';
import {
  ActivityPing,
  CardCreate,
  clampClientInstant,
  CLIENT_INSTANT_MESSAGE,
  ProfilePatch,
  Reading,
  ReviewInput,
  WordStatusPut,
  type ApiError,
  type ApiErrorCode,
  type Card,
  type Profile,
  type WordStatus,
} from '@shared/schemas';
import { grade } from '@shared/srs';
import type { z } from 'zod';

// Fixture-backed handlers for every endpoint in docs/api-contract.md, so any screen can run with
// no feature handler at all. A screen's own handler file wins when it matches the same path.
// They follow the real routes' rules (dedupe, 404s, the G-61 window, `issues` on 400), except
// that a ping always answers the fixture's minutes so page tests don't depend on the clock.

let profile: Profile = profileFixture;
let words: WordStatus[] = wordsFixture;
let readings = readingsFixture;
let createdCards: Card[] = [];
let startedDecks = new Set<string>();

/** Put the writable mock state back to the fixtures (tests call this between cases). */
export function resetMockState() {
  profile = profileFixture;
  words = wordsFixture;
  readings = readingsFixture;
  createdCards = [];
  startedDecks = new Set();
}

type Issues = NonNullable<ApiError['error']['issues']>;

export function apiError(code: ApiErrorCode, message: string, status: number, issues?: Issues) {
  return HttpResponse.json({ error: { code, message, issues } }, { status });
}

/** `400 bad_request` with the zod issues, like the worker's `parseInput`. */
export const badBody = (error: z.ZodError) =>
  apiError(
    'bad_request',
    'Invalid body',
    400,
    error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  );

/** The G-61 window on a client instant: the clamped instant, or the server's `400`. */
export function clientInstant(at: number, field: string): number | Response {
  return (
    clampClientInstant(at, Date.now()) ??
    apiError('bad_request', 'Invalid body', 400, [{ path: field, message: CLIENT_INSTANT_MESSAGE }])
  );
}

/** Grades like `POST /api/reviews`: inside the window, never before the card's last review. */
export function gradeReview(card: Card, input: ReviewInput): Card | Response {
  const at = clientInstant(input.reviewedAt, 'reviewedAt');
  if (at instanceof Response) return at;
  const when = Math.max(at, card.lastReview ?? 0);
  return { ...card, ...grade(card, input.rating, when).card, updatedAt: when };
}

export const handlers: RequestHandler[] = [
  http.get('/api/health', () => HttpResponse.json({ ok: true })),

  http.get('/api/profile', () => HttpResponse.json(profile)),
  http.patch('/api/profile', async ({ request }) => {
    const patch = ProfilePatch.safeParse(await request.json());
    if (!patch.success) return badBody(patch.error);
    const chapterId = patch.data.currentChapterId;
    if (chapterId && !getChapter(chapterId)) return apiError('not_found', 'Chapter not found', 404);
    const { settings, ...rest } = patch.data;
    profile = { ...profile, ...rest, settings: { ...profile.settings, ...settings } };
    return HttpResponse.json(profile);
  }),

  http.get('/api/cards/due', ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 20);
    return HttpResponse.json({ cards: reviewCards.slice(0, limit) });
  }),
  http.get('/api/cards/stats', () => HttpResponse.json(cardStats)),
  http.post('/api/cards', async ({ request }) => {
    const input = CardCreate.safeParse(await request.json());
    if (!input.success) return badBody(input.error);
    // Same type + front: the existing card comes back with 200.
    const { type, front } = input.data;
    const existing = [...reviewCards, ...createdCards].find(
      (c) => c.type === type && c.front === front,
    );
    if (existing) return HttpResponse.json(existing);
    // A new card keeps the FSRS state of the fixture's new card.
    const card: Card = { ...reviewCards[2], ...input.data, id: crypto.randomUUID() };
    createdCards = [...createdCards, card];
    return HttpResponse.json(card, { status: 201 });
  }),
  http.post('/api/cards/starter/:chapterId', async ({ params }) => {
    const chapterId = String(params.chapterId);
    if (!getChapter(chapterId)) return apiError('not_found', 'Chapter not found', 404);
    // The fixture chapter keeps the fixture deck, so its screens and this answer agree.
    const deck = chapterId === ch10Deck.chapterId ? ch10Deck : await loadDeck(chapterId);
    const total = deck?.cards.length ?? 0;
    const added = startedDecks.has(chapterId) ? 0 : total;
    startedDecks.add(chapterId);
    return HttpResponse.json({ added, total });
  }),
  http.post('/api/reviews', async ({ request }) => {
    const input = ReviewInput.safeParse(await request.json());
    if (!input.success) return badBody(input.error);
    const card = reviewCards.find((c) => c.id === input.data.cardId);
    if (!card) return apiError('not_found', 'Card not found', 404);
    const graded = gradeReview(card, input.data);
    return graded instanceof Response ? graded : HttpResponse.json(graded);
  }),

  http.get('/api/words', () => HttpResponse.json({ words })),
  http.put('/api/words/:lemma', async ({ params, request }) => {
    const body = WordStatusPut.safeParse(await request.json());
    if (!body.success) return badBody(body.error);
    const word: WordStatus = { lemma: String(params.lemma), status: body.data.status };
    words = [...words.filter((w) => w.lemma !== word.lemma), word];
    return HttpResponse.json(word);
  }),

  http.post('/api/activity/ping', async ({ request }) => {
    const input = ActivityPing.safeParse(await request.json());
    if (!input.success) return badBody(input.error);
    const at = clientInstant(input.data.at, 'at');
    if (at instanceof Response) return at;
    return HttpResponse.json(
      dailyActivity.find((day) => day.date === FIXTURE_TODAY) ?? dailyActivity[0],
    );
  }),
  http.get('/api/activity/readings', () => HttpResponse.json({ readings })),
  http.post('/api/activity/readings', async ({ request }) => {
    const input = Reading.safeParse(await request.json());
    if (!input.success) return badBody(input.error);
    const { textId } = input.data;
    if (!hasText(textId) && !fixtureTexts.some((t) => t.id === textId)) {
      return apiError('not_found', 'Text not found', 404);
    }
    const finishedAt = clientInstant(input.data.finishedAt, 'finishedAt');
    if (finishedAt instanceof Response) return finishedAt;
    // First finish per text wins, like the server.
    const existing = readings.find((r) => r.textId === input.data.textId);
    const reading = existing ?? { ...input.data, finishedAt };
    if (!existing) readings = [...readings, reading];
    return HttpResponse.json(reading);
  }),
  http.get('/api/streak', () => HttpResponse.json(streak)),

  http.post('/api/ai/translate', () => HttpResponse.json(translateResponse)),
  http.post('/api/ai/explain', () => HttpResponse.json(explainResponse)),
];
