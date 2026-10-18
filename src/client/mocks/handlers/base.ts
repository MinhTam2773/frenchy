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
  translateResponse,
  words as wordsFixture,
} from '@shared/fixtures';
import {
  CardCreate,
  ProfilePatch,
  Reading,
  ReviewInput,
  WordStatusPut,
  type ApiErrorCode,
  type Card,
  type Profile,
  type WordStatus,
} from '@shared/schemas';

// Fixture-backed handlers for every endpoint in docs/api-contract.md, so any screen can run with
// no feature handler at all. A screen's own handler file wins when it matches the same path.

let profile: Profile = profileFixture;
let words: WordStatus[] = wordsFixture;
let readings = readingsFixture;

/** Put the writable mock state back to the fixtures (tests call this between cases). */
export function resetMockState() {
  profile = profileFixture;
  words = wordsFixture;
  readings = readingsFixture;
}

export function apiError(code: ApiErrorCode, message: string, status: number) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

const badBody = () => apiError('bad_request', 'Invalid body', 400);

export const handlers: RequestHandler[] = [
  http.get('/api/health', () => HttpResponse.json({ ok: true })),

  http.get('/api/profile', () => HttpResponse.json(profile)),
  http.patch('/api/profile', async ({ request }) => {
    const patch = ProfilePatch.safeParse(await request.json());
    if (!patch.success) return badBody();
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
    if (!input.success) return badBody();
    // A new card keeps the FSRS state of the fixture's new card.
    const card: Card = { ...reviewCards[2], ...input.data, id: crypto.randomUUID() };
    return HttpResponse.json(card, { status: 201 });
  }),
  http.post('/api/cards/starter/:chapterId', () =>
    HttpResponse.json({ added: ch10Deck.cards.length, total: ch10Deck.cards.length }),
  ),
  http.post('/api/reviews', async ({ request }) => {
    const input = ReviewInput.safeParse(await request.json());
    if (!input.success) return badBody();
    const card = reviewCards.find((c) => c.id === input.data.cardId);
    return card ? HttpResponse.json(card) : apiError('not_found', 'Card not found', 404);
  }),

  http.get('/api/words', () => HttpResponse.json({ words })),
  http.put('/api/words/:lemma', async ({ params, request }) => {
    const body = WordStatusPut.safeParse(await request.json());
    if (!body.success) return badBody();
    const word: WordStatus = { lemma: String(params.lemma), status: body.data.status };
    words = [...words.filter((w) => w.lemma !== word.lemma), word];
    return HttpResponse.json(word);
  }),

  http.post('/api/activity/ping', () =>
    HttpResponse.json(dailyActivity.find((day) => day.date === FIXTURE_TODAY) ?? dailyActivity[0]),
  ),
  http.get('/api/activity/readings', () => HttpResponse.json({ readings })),
  http.post('/api/activity/readings', async ({ request }) => {
    const input = Reading.safeParse(await request.json());
    if (!input.success) return badBody();
    // First finish per text wins, like the server.
    const existing = readings.find((r) => r.textId === input.data.textId);
    if (!existing) readings = [...readings, input.data];
    return HttpResponse.json(existing ?? input.data);
  }),
  http.get('/api/streak', () => HttpResponse.json(streak)),

  http.post('/api/ai/translate', () => HttpResponse.json(translateResponse)),
  http.post('/api/ai/explain', () => HttpResponse.json(explainResponse)),
];
