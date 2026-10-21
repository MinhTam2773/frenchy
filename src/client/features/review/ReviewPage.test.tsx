import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { apiError } from '@client/mocks/handlers/base';
import { resetReviewMock } from '@client/mocks/handlers/review';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';
import { GRADE_LABELS, RATINGS } from '@shared/constants';
import { FIXTURE_NOW, reviewCards } from '@shared/fixtures';
import { ReviewInput, type Card } from '@shared/schemas';
import { previewIntervals } from '@shared/srs';

// Each test drives a whole screen through jsdom; CI machines under load need the room.
vi.setConfig({ testTimeout: 30_000 });
configure({ asyncUtilTimeout: 5000 });

const tts = vi.hoisted(() => ({ speak: vi.fn(() => Promise.resolve()), stop: vi.fn() }));
vi.mock('@client/lib/tts/useTts', () => ({
  useTts: () => ({ ...tts, speaking: false, supported: true, voices: [] }),
}));

const [sentence, cloze, meaning] = reviewCards;

beforeEach(() => {
  // Only Date: the preview `now` is then exact, and timers (MSW, waitFor) stay real.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXTURE_NOW);
  resetReviewMock();
});

afterEach(async () => {
  // Leaving the screen posts the held grade; let it land before the next test resets the mock.
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 30));
  resetReviewMock();
  vi.useRealTimers();
  vi.clearAllMocks();
});

/** Answers POST /api/reviews like the mock server does, and keeps what the screen sent. */
function recordReviews(status = 200) {
  const posted: ReviewInput[] = [];
  server.use(
    http.post('/api/reviews', async ({ request }) => {
      const review = ReviewInput.parse(await request.json());
      posted.push(review);
      if (status !== 200) return apiError('not_found', 'Card not found', status);
      return HttpResponse.json(reviewCards.find((c) => c.id === review.cardId));
    }),
  );
  return posted;
}

/**
 * French text is a row of word buttons, so `getByText` can't see it whole. This matches the
 * paragraph by its full text instead.
 */
const para = (text: string | RegExp) => (_: string, element: Element | null) =>
  element?.tagName === 'P' &&
  (typeof text === 'string' ? element.textContent === text : text.test(element.textContent ?? ''));

const showAnswer = () => fireEvent.click(screen.getByRole('button', { name: 'Show answer' }));
const grade = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

async function answerAll(rating: (typeof RATINGS)[number]) {
  for (const card of reviewCards) {
    await screen.findByText(para(card.type === 'cloze' ? /^Nous/ : card.front));
    showAnswer();
    grade(new RegExp(`^${GRADE_LABELS[rating]},`));
  }
}

test('completes a session end to end and shows the results', async () => {
  renderAt('/review');
  expect(await screen.findByText(para(sentence.front))).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'Review progress' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  expect(screen.getByText('0/3')).toBeInTheDocument();

  await answerAll(3);
  expect(
    await screen.findByRole('heading', { name: 'That was the last card' }),
  ).toBeInTheDocument();
  expect(screen.getByText('3/3')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'See results' }));
  expect(await screen.findByRole('heading', { name: 'Session complete!' })).toBeInTheDocument();
  expect(screen.getByText('Cards').nextSibling).toHaveTextContent('3');
  expect(screen.getByText('Correct').nextSibling).toHaveTextContent('100%');
  // The mock server counts today once something was graded.
  expect(await screen.findByText('13-day streak')).toBeInTheDocument();
  expect(screen.getByText('Today counts. Up from 12.')).toBeInTheDocument();
});

test('labels the grade buttons with the FSRS preview for each card', async () => {
  renderAt('/review');
  for (const card of reviewCards) {
    await screen.findByText(para(card.type === 'cloze' ? /^Nous/ : card.front));
    expect(screen.queryByRole('button', { name: /^Good,/ })).not.toBeInTheDocument();
    showAnswer();
    const labels = previewIntervals(card, FIXTURE_NOW);
    for (const rating of RATINGS) {
      expect(
        screen.getByRole('button', { name: `${GRADE_LABELS[rating]}, ${labels[rating]}` }),
      ).toBeInTheDocument();
    }
    grade(/^Good,/);
  }
});

test('posts each review with the preview time, and holds the last grade until the next one', async () => {
  const posted = recordReviews();
  renderAt('/review');
  await screen.findByText(para(sentence.front));
  showAnswer();
  grade(/^Good,/);
  await screen.findByText(para(/^Nous/));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(posted).toHaveLength(0);

  showAnswer();
  grade(/^Hard,/);
  await waitFor(() => expect(posted).toHaveLength(1));
  expect(posted[0]).toMatchObject({ cardId: sentence.id, rating: 3, reviewedAt: FIXTURE_NOW });
  await screen.findByText(meaning.front);

  showAnswer();
  grade(/^Easy,/);
  await screen.findByRole('heading', { name: 'That was the last card' });
  await waitFor(() => expect(posted).toHaveLength(2));

  fireEvent.click(screen.getByRole('button', { name: 'See results' }));
  await screen.findByRole('heading', { name: 'Session complete!' });
  expect(posted.map((r) => [r.cardId, r.rating])).toEqual([
    [sentence.id, 3],
    [cloze.id, 2],
    [meaning.id, 4],
  ]);
  expect(new Set(posted.map((r) => r.id)).size).toBe(3);
  expect(screen.getByText('Correct').nextSibling).toHaveTextContent('67%');
});

test('undo brings the card back with its answer and the undone grade is never posted', async () => {
  const posted = recordReviews();
  renderAt('/review');
  await screen.findByText(para(sentence.front));
  expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();

  showAnswer();
  grade(/^Again,/);
  await screen.findByText(para(/^Nous/));
  expect(screen.getByText('1/3')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(await screen.findByText(para(sentence.front))).toBeInTheDocument();
  expect(screen.getByText('0/3')).toBeInTheDocument();
  expect(screen.getByText(sentence.back)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();

  grade(/^Easy,/);
  await screen.findByText(para(/^Nous/));
  showAnswer();
  grade(/^Good,/);
  await screen.findByText(meaning.front);
  showAnswer();
  grade(/^Good,/);
  fireEvent.click(await screen.findByRole('button', { name: 'See results' }));
  await screen.findByRole('heading', { name: 'Session complete!' });

  expect(posted.map((r) => [r.cardId, r.rating])).toEqual([
    [sentence.id, 4],
    [cloze.id, 3],
    [meaning.id, 3],
  ]);
});

test('can undo the last card from the end-of-session screen', async () => {
  const posted = recordReviews();
  renderAt('/review');
  await answerAll(3);
  fireEvent.click(await screen.findByRole('button', { name: 'Undo last answer' }));
  expect(await screen.findByText(para(meaning.back))).toBeInTheDocument();
  expect(screen.getByText('2/3')).toBeInTheDocument();
  grade(/^Again,/);
  fireEvent.click(await screen.findByRole('button', { name: 'See results' }));
  await screen.findByRole('heading', { name: 'Session complete!' });
  expect(posted.at(-1)).toMatchObject({ cardId: meaning.id, rating: 1 });
  expect(posted).toHaveLength(3);
  expect(screen.getByText('Correct').nextSibling).toHaveTextContent('67%');
});

test('Space reveals and 1 to 4 grade, only once the answer is showing', async () => {
  const posted = recordReviews();
  renderAt('/review');
  await screen.findByText(para(sentence.front));

  fireEvent.keyDown(document.body, { key: '3' });
  expect(screen.queryByText(sentence.back)).not.toBeInTheDocument();
  expect(screen.getByText('0/3')).toBeInTheDocument();

  fireEvent.keyDown(document.body, { key: ' ' });
  expect(screen.getByText(sentence.back)).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: '2' });
  await screen.findByText(para(/^Nous/));
  expect(screen.getByText('1/3')).toBeInTheDocument();

  fireEvent.keyDown(document.body, { key: ' ', ctrlKey: true });
  expect(screen.queryByText(para(cloze.back))).not.toBeInTheDocument();

  fireEvent.keyDown(document.body, { key: ' ' });
  fireEvent.keyDown(document.body, { key: '4' });
  await waitFor(() => expect(posted).toHaveLength(1));
  expect(posted[0]).toMatchObject({ cardId: sentence.id, rating: 2 });
});

test('stops listening for keys when the screen is left', async () => {
  const posted = recordReviews();
  const { unmount } = renderAt('/review');
  await screen.findByText(para(sentence.front));
  unmount();
  fireEvent.keyDown(document.body, { key: ' ' });
  fireEvent.keyDown(document.body, { key: '3' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(posted).toHaveLength(0);
});

test('shows a cloze with a blank, then the answer in the blank', async () => {
  renderAt('/review');
  await screen.findByText(para(sentence.front));
  showAnswer();
  grade(/^Good,/);

  const front = await screen.findByText(para(/^Nous/));
  expect(front).toHaveAttribute('lang', 'fr');
  expect(within(front).getByText('blank')).toBeInTheDocument();
  expect(screen.getByText(cloze.hint ?? '')).toBeInTheDocument();
  expect(screen.getByText('Cloze')).toBeInTheDocument();

  showAnswer();
  expect(within(front).getByText('parlons')).toBeInTheDocument();
  expect(within(front).queryByText('blank')).not.toBeInTheDocument();
  // The filled-in front and the back both read as the whole sentence.
  const sentences = screen.getAllByText(para(cloze.back));
  expect(sentences).toHaveLength(2);
  sentences.forEach((p) => expect(p).toHaveAttribute('lang', 'fr'));
  expect(screen.getByText(cloze.note ?? '')).toBeInTheDocument();
});

test('an English front has no audio until the French answer is shown', async () => {
  renderAt('/review');
  await screen.findByText(para(sentence.front));
  showAnswer();
  grade(/^Good,/);
  await screen.findByText(para(/^Nous/));
  showAnswer();
  grade(/^Good,/);

  const front = await screen.findByText(meaning.front);
  expect(front).toHaveAttribute('lang', 'en');
  expect(screen.getByText('Meaning → sentence')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Play audio' })).not.toBeInTheDocument();
  showAnswer();
  fireEvent.click(screen.getByRole('button', { name: 'Play audio' }));
  expect(tts.speak).toHaveBeenCalledWith(meaning.back, expect.anything());
});

test('the play button reads the French sentence', async () => {
  renderAt('/review');
  await screen.findByText(para(sentence.front));
  fireEvent.click(screen.getByRole('button', { name: 'Play audio' }));
  expect(tts.speak).toHaveBeenCalledWith(sentence.front, expect.anything());
});

test('asks for one session of cards and keeps to the new-card limit', async () => {
  const asked: (string | null)[] = [];
  const newCards: Card[] = Array.from({ length: 12 }, (_, i) => ({
    ...meaning,
    id: `00000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`,
  }));
  server.use(
    http.get('/api/cards/due', ({ request }) => {
      asked.push(new URL(request.url).searchParams.get('limit'));
      return HttpResponse.json({ cards: newCards });
    }),
  );
  renderAt('/review');
  expect(await screen.findByText('0/10')).toBeInTheDocument();
  expect(asked).toEqual(['20']);
});

test('says so when nothing is due', async () => {
  server.use(http.get('/api/cards/due', () => HttpResponse.json({ cards: [] })));
  renderAt('/review');
  expect(await screen.findByRole('heading', { name: 'You’re all caught up' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Today' })).toHaveAttribute('href', '/today');
});

test('offers a retry when the cards cannot be loaded', async () => {
  server.use(http.get('/api/cards/due', () => apiError('bad_request', 'Nope', 400)));
  renderAt('/review');
  expect(
    await screen.findByRole('heading', { name: 'Couldn’t load your cards' }),
  ).toBeInTheDocument();

  server.resetHandlers();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText(para(sentence.front))).toBeInTheDocument();
});

test('warns when an answer could not be saved, and keeps going', async () => {
  recordReviews(404);
  renderAt('/review');
  await screen.findByText(para(sentence.front));
  showAnswer();
  grade(/^Good,/);
  await screen.findByText(para(/^Nous/));
  showAnswer();
  grade(/^Good,/);

  // Not `findByRole('status')`: the layout's offline banner is a status region too.
  expect(await screen.findByText(/One answer couldn’t be saved/)).toHaveAttribute('role', 'status');
  expect(await screen.findByText(meaning.front)).toBeInTheDocument();
});

test('ending early posts the held grade and leaves the review', async () => {
  const posted = recordReviews();
  renderAt('/review');
  await screen.findByText(para(sentence.front));
  showAnswer();
  grade(/^Good,/);
  await screen.findByText(para(/^Nous/));

  fireEvent.click(screen.getByRole('button', { name: 'End review' }));
  await waitFor(() => expect(posted).toHaveLength(1));
  expect(posted[0]).toMatchObject({ cardId: sentence.id, rating: 3 });
  await waitFor(() =>
    expect(screen.queryByRole('progressbar', { name: 'Review progress' })).not.toBeInTheDocument(),
  );
});
