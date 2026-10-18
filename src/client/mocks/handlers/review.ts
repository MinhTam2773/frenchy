import { http, HttpResponse, type RequestHandler } from 'msw';
import { reviewCards, streak } from '@shared/fixtures';
import { ReviewInput, type Card } from '@shared/schemas';
import { apiError, badBody, gradeReview } from './base';

// A review session that behaves like the server for one page load: a graded card leaves the due
// list, the card is regraded at `reviewedAt` like the real route (G-29, G-61), a repeated
// review id is applied once, and today counts toward the streak once anything is graded.

const reviewed = new Map<string, Card>();
const byReviewId = new Map<string, Card>();

/** Tests call this between cases (the shared setup only resets the base handlers). */
export function resetReviewMock() {
  reviewed.clear();
  byReviewId.clear();
}

export const handlers: RequestHandler[] = [
  http.get('/api/cards/due', ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 20);
    const cards = reviewCards.filter((card) => !reviewed.has(card.id)).slice(0, limit);
    return HttpResponse.json({ cards });
  }),

  http.post('/api/reviews', async ({ request }) => {
    const input = ReviewInput.safeParse(await request.json());
    if (!input.success) return badBody(input.error);
    const again = byReviewId.get(input.data.id);
    if (again) return HttpResponse.json(again);
    const card = reviewCards.find((c) => c.id === input.data.cardId);
    if (!card) return apiError('not_found', 'Card not found', 404);

    const updated = gradeReview(card, input.data);
    if (updated instanceof Response) return updated;
    reviewed.set(card.id, updated);
    byReviewId.set(input.data.id, updated);
    return HttpResponse.json(updated);
  }),

  // Falls through to the fixture until something is graded.
  http.get('/api/streak', () => {
    if (reviewed.size === 0 || streak.todayDone) return;
    return HttpResponse.json({ ...streak, current: streak.current + 1, todayDone: true });
  }),
];
