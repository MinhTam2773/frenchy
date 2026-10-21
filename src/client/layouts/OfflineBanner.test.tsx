import { act, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, test, vi } from 'vitest';
import { queueReview } from '@client/lib/offline';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';
import { reviewCards } from '@shared/fixtures';

function goOffline(offline: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(!offline);
  act(() => {
    window.dispatchEvent(new Event(offline ? 'offline' : 'online'));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

const OFFLINE = /You’re offline/;

test.each(['/today', '/streak', '/'])(
  '%s shows a banner while the device is offline',
  async (path) => {
    renderAt(path);
    await screen.findAllByRole('heading');
    expect(screen.queryByText(OFFLINE)).not.toBeInTheDocument();

    goOffline(true);
    expect(screen.getByText(OFFLINE)).toBeInTheDocument();

    goOffline(false);
    expect(screen.queryByText(OFFLINE)).not.toBeInTheDocument();
  },
);

test('counts the reviews waiting to sync, offline and online', async () => {
  server.use(http.post('/api/reviews', () => HttpResponse.error()));
  renderAt('/today');
  await screen.findAllByRole('heading');
  const review = { cardId: reviewCards[0].id, rating: 3 as const, durationMs: 1_000 };
  await act(() =>
    queueReview('user', { ...review, id: crypto.randomUUID(), reviewedAt: Date.now() }),
  );
  expect(screen.getByText('1 review waiting to sync.')).toBeInTheDocument();

  await act(() =>
    queueReview('user', { ...review, id: crypto.randomUUID(), reviewedAt: Date.now() }),
  );
  goOffline(true);
  expect(
    screen.getByText(
      'You’re offline. 2 reviews waiting to sync. Readings and settings need a connection to save.',
    ),
  ).toBeInTheDocument();
});
