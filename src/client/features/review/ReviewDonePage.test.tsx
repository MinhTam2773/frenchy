import { configure, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { AppProviders } from '@client/App';
import { resetReviewMock } from '@client/mocks/handlers/review';
import { server } from '@client/mocks/server';
import { routes } from '@client/routes';
import { getChapter, loadChapterTexts } from '@shared/content';
import { allCaughtUpStats, streak } from '@shared/fixtures';
import type { Text } from '@shared/schemas';
import type { SessionStats } from './session';

// Each test drives a whole screen through jsdom; CI machines under load need the room.
vi.setConfig({ testTimeout: 30_000 });
configure({ asyncUtilTimeout: 5000 });

// No lesson texts exist until T-14, so "Up next" is steered from here.
vi.mock('@shared/content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/content')>()),
  loadChapterTexts: vi.fn(async () => []),
}));

// "Très bien." sits in its own lang="fr" span, so match the whole paragraph's text.
const paragraph = (text: string) => (_: string, el: Element | null) =>
  el?.tagName === 'P' && el.textContent === text;

const stats: SessionStats = { cards: 18, correct: 16, durationMs: 11 * 60_000 };

function renderDone(state?: unknown) {
  const router = createMemoryRouter(routes, {
    initialEntries: [{ pathname: '/review/done', state }],
  });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

beforeEach(() => {
  resetReviewMock();
  vi.mocked(loadChapterTexts).mockResolvedValue([]);
});

test('shows cards, correct share and time for the session', async () => {
  renderDone(stats);
  expect(await screen.findByRole('heading', { name: 'Session complete!' })).toBeInTheDocument();
  expect(screen.getByText('Cards').nextSibling).toHaveTextContent('18');
  expect(screen.getByText('Correct').nextSibling).toHaveTextContent('89%');
  expect(screen.getByText('Time').nextSibling).toHaveTextContent('11m');
  expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/today');
  expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
});

test('says how many cards are still due, once the count is fresh', async () => {
  renderDone(stats);
  expect(
    await screen.findByText(paragraph('Très bien. 18 more cards are due right now.')),
  ).toBeInTheDocument();
});

test('says when everything is done', async () => {
  server.use(http.get('/api/cards/stats', () => HttpResponse.json(allCaughtUpStats)));
  renderDone(stats);
  expect(
    await screen.findByText(paragraph('Très bien. You’re all caught up.')),
  ).toBeInTheDocument();
});

test('shows the streak and where it was before this session', async () => {
  server.use(
    http.get('/api/streak', () => HttpResponse.json({ ...streak, current: 13, todayDone: true })),
  );
  renderDone({ ...stats, streakBefore: { current: 12, todayDone: false } });
  expect(await screen.findByText('13-day streak')).toBeInTheDocument();
  expect(screen.getByText('Today counts. Up from 12.')).toBeInTheDocument();
});

test('does not claim a rise when today already counted', async () => {
  server.use(
    http.get('/api/streak', () => HttpResponse.json({ ...streak, current: 12, todayDone: true })),
  );
  renderDone({ ...stats, streakBefore: { current: 12, todayDone: true } });
  expect(await screen.findByText('12-day streak')).toBeInTheDocument();
  expect(screen.getByText('Today counts.')).toBeInTheDocument();
});

test('points to the next unread text of the current chapter', async () => {
  const text = (id: string, title: string) => ({ id, title }) as Text;
  // Fixture readings include ch12 only, so the first Ch 10 text is next; reading it moves on.
  vi.mocked(loadChapterTexts).mockResolvedValue([
    text('ch10-le-matin-de-lea', 'Le matin de Léa'),
    text('ch10-au-cafe', 'Au café'),
  ]);
  renderDone(stats);
  const link = await screen.findByRole('link', { name: /Up next/ });
  expect(link).toHaveTextContent('Read: Le matin de Léa');
  expect(link).toHaveAttribute('href', '/read/ch10-le-matin-de-lea');
});

test('skips texts that were already read', async () => {
  const text = (id: string, title: string) => ({ id, title }) as Text;
  vi.mocked(loadChapterTexts).mockResolvedValue([
    text('ch10-le-matin-de-lea', 'Le matin de Léa'),
    text('ch10-au-cafe', 'Au café'),
  ]);
  server.use(
    http.get('/api/activity/readings', () =>
      HttpResponse.json({ readings: [{ textId: 'ch10-le-matin-de-lea', finishedAt: 1 }] }),
    ),
  );
  renderDone(stats);
  const link = await screen.findByRole('link', { name: /Up next/ });
  expect(link).toHaveAttribute('href', '/read/ch10-au-cafe');
});

test('falls back to the chapter page when it has no unread text', async () => {
  renderDone(stats);
  const link = await screen.findByRole('link', { name: /Up next/ });
  const chapter = getChapter('ch10');
  expect(link).toHaveTextContent(`Chapter ${chapter?.number}: ${chapter?.title}`);
  expect(link).toHaveAttribute('href', '/chapter/ch10');
});

test('goes back to Today when opened without a finished session', async () => {
  const router = renderDone(undefined);
  await vi.waitFor(() => expect(router.state.location.pathname).toBe('/today'));
  expect(screen.queryByRole('heading', { name: 'Session complete!' })).not.toBeInTheDocument();
});

test('goes back to Today when the state is not a session summary', async () => {
  const router = renderDone({ cards: 'many' });
  await vi.waitFor(() => expect(router.state.location.pathname).toBe('/today'));
});
