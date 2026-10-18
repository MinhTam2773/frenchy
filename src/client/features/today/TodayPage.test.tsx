import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, test, vi } from 'vitest';
import { getChapterTexts } from '@shared/content';
import {
  allCaughtUpStats,
  cafeDialogueText,
  leaMorningText,
  newProfile,
  readings,
  streak,
} from '@shared/fixtures';
import { apiError } from '@client/mocks/handlers/base';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';

// content/ has no lesson texts until T-14 lands, so the texts come from fixtures.
vi.mock('@shared/content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/content')>()),
  getChapterTexts: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getChapterTexts).mockReturnValue([leaMorningText, cafeDialogueText]);
});

async function renderToday() {
  renderAt('/today');
  await screen.findByRole('heading', { name: /Bonjour/ }, { timeout: 5000 });
}

const HOUR = 3_600_000;

test('shows the fixture day like the mockup', async () => {
  await renderToday();

  expect(screen.getByRole('link', { name: '12 day streak' })).toHaveAttribute('href', '/streak');
  expect(screen.getByRole('link', { name: '2 streak freezes' })).toHaveAttribute('href', '/streak');
  expect(screen.getByRole('progressbar', { name: 'Minutes today' })).toHaveAttribute(
    'aria-valuenow',
    '8',
  );
  expect(screen.getByText('8 / 45 min')).toBeInTheDocument();

  const review = screen.getByRole('region', { name: 'Review first' });
  expect(within(review).getByText('18')).toBeInTheDocument();
  expect(within(review).getByText('cards due · about 10 min')).toBeInTheDocument();
  expect(within(review).getByRole('link', { name: 'Start review' })).toHaveAttribute(
    'href',
    '/review',
  );
});

test('lives in the tab layout with Today as the current tab', async () => {
  await renderToday();
  expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
});

test('the book card links to the current chapter', async () => {
  await renderToday();
  const book = screen.getByRole('link', { name: /Present tense of -er verbs/ });
  expect(book).toHaveAttribute('href', '/chapter/ch10');
  expect(book).toHaveTextContent('2 · Book · Ch 10');
  expect(book).toHaveTextContent('PDF pp. 185–196');
});

test('the reading card offers the next unread text of the chapter', async () => {
  await renderToday();
  const reading = screen.getByRole('link', { name: /Le matin de Léa/ });
  expect(reading).toHaveAttribute('href', `/read/${leaMorningText.id}`);
  expect(reading).toHaveTextContent(`2 min · ${leaMorningText.newWords.length} new words`);
});

test('the reading card skips a text that is already finished', async () => {
  server.use(
    http.get('/api/activity/readings', () =>
      HttpResponse.json({
        readings: [...readings, { textId: leaMorningText.id, finishedAt: 1 }],
      }),
    ),
  );
  await renderToday();
  expect(screen.getByRole('link', { name: /Au café/ })).toHaveAttribute(
    'href',
    `/read/${cafeDialogueText.id}`,
  );
});

test('the reading card says when every text is read', async () => {
  server.use(
    http.get('/api/activity/readings', () =>
      HttpResponse.json({
        readings: [leaMorningText, cafeDialogueText].map((text) => ({
          textId: text.id,
          finishedAt: 1,
        })),
      }),
    ),
  );
  await renderToday();
  expect(screen.getByRole('link', { name: /All texts read/ })).toHaveAttribute(
    'href',
    '/chapter/ch10',
  );
});

test('the reading card copes with a chapter that has no texts yet', async () => {
  vi.mocked(getChapterTexts).mockReturnValue([]);
  await renderToday();
  expect(screen.getByText('Texts are on their way')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Texts are on their way/ })).not.toBeInTheDocument();
});

test('the output card is a prompt without a link', async () => {
  await renderToday();
  expect(screen.getByText('Write 3–5 sentences')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Write 3–5 sentences/ })).not.toBeInTheDocument();
});

test('with nothing due it says all caught up and when the next card comes', async () => {
  server.use(
    http.get('/api/cards/stats', () =>
      HttpResponse.json({ ...allCaughtUpStats, nextDueAt: Date.now() + 3 * HOUR + 60_000 }),
    ),
  );
  await renderToday();
  const review = screen.getByRole('region', { name: 'Review first' });
  expect(await within(review).findByText('All caught up')).toBeInTheDocument();
  expect(within(review).getByText('Next card due in 3 h')).toBeInTheDocument();
  expect(within(review).queryByRole('link', { name: 'Start review' })).not.toBeInTheDocument();
});

test('with no cards at all it asks the learner to add some', async () => {
  server.use(
    http.get('/api/cards/stats', () => HttpResponse.json({ ...allCaughtUpStats, nextDueAt: null })),
  );
  await renderToday();
  expect(await screen.findByText('All caught up')).toBeInTheDocument();
  expect(screen.getByText('Add a chapter’s cards to start reviewing')).toBeInTheDocument();
});

test('one due card reads in the singular', async () => {
  server.use(
    http.get('/api/cards/stats', () => HttpResponse.json({ ...allCaughtUpStats, due: 1, new: 1 })),
  );
  await renderToday();
  expect(await screen.findByText('card due · about 1 min')).toBeInTheDocument();
});

test('warns when the streak is at risk', async () => {
  await renderToday(); // fixture: 12-day streak, nothing counted yet today
  expect(
    screen.getByText('Review a card or finish a reading today to keep your 12-day streak.'),
  ).toBeInTheDocument();
});

test.each([
  ['today is already counted', { ...streak, todayDone: true }],
  ['there is no streak to lose', { ...streak, current: 0 }],
])('no streak warning when %s', async (_, response) => {
  server.use(http.get('/api/streak', () => HttpResponse.json(response)));
  await renderToday();
  expect(screen.queryByText(/to keep your/)).not.toBeInTheDocument();
});

test('shows how far the daily goal is', async () => {
  // The page pings on mount and the mock ping answers 8 minutes, so make both agree.
  server.use(
    http.get('/api/streak', () => HttpResponse.json({ ...streak, todayMinutes: 45 })),
    http.post('/api/activity/ping', () =>
      HttpResponse.json({
        date: streak.today,
        minutes: 45,
        reviews: 0,
        readings: 0,
        freezeUsed: false,
      }),
    ),
  );
  await renderToday();
  expect(await screen.findByText('45 / 45 min')).toBeInTheDocument();
});

test('without a current chapter it sends the learner to onboarding', async () => {
  server.use(http.get('/api/profile', () => HttpResponse.json(newProfile)));
  renderAt('/today');
  expect(
    await screen.findByRole('heading', { name: 'Which chapter are you on in the book?' }),
  ).toBeInTheDocument();
});

test('a failed load shows an error with a way to retry', async () => {
  let failing = true;
  server.use(
    http.get('/api/cards/stats', () =>
      failing ? apiError('not_found', 'Nope', 404) : HttpResponse.json(allCaughtUpStats),
    ),
  );
  renderAt('/today');
  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load today’s plan.');

  failing = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('All caught up')).toBeInTheDocument();
});
