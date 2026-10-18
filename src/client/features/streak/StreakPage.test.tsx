import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';
import type { DailyActivity, StreakResponse } from '@shared/schemas';
import { addDays, computeStreak } from '@shared/streak';

const today = '2026-10-17';
const active = (date: string): DailyActivity => ({
  date,
  minutes: 5,
  reviews: 10,
  readings: 0,
  freezeUsed: false,
});

// Sep 28 - Oct 4 practiced (7 days earns a freeze), Oct 5 missed (freeze spent), Oct 6 - 16 practiced.
const practicedDays = [
  ...Array.from({ length: 7 }, (_, i) => addDays('2026-09-28', i)),
  ...Array.from({ length: 11 }, (_, i) => addDays('2026-10-06', i)),
];
const streak: StreakResponse = {
  ...computeStreak(practicedDays.map(active), today),
  today,
  todayMinutes: 0,
};

function serve(response: StreakResponse) {
  server.use(http.get('/api/streak', () => HttpResponse.json(response)));
}

test('shows current, best, the at-risk banner and the freeze count', async () => {
  serve(streak);
  renderAt('/streak');
  expect(await screen.findByText('day streak')).toBeInTheDocument();
  expect(screen.getByText('day streak').previousElementSibling).toHaveTextContent(
    String(streak.current),
  );
  expect(screen.getByText(`Best so far: ${streak.best} days`)).toBeInTheDocument();
  expect(screen.getByText('Do one review session today to keep it going.')).toBeInTheDocument();
  expect(screen.getByText(/^\d streak freezes?$|^No streak freezes$/)).toBeInTheDocument();
});

test('hides the banner once today is done', async () => {
  serve({ ...streak, todayDone: true });
  renderAt('/streak');
  await screen.findByText('day streak');
  expect(screen.queryByText(/Do one review session/)).not.toBeInTheDocument();
});

test('renders the calendar cell states for the current month', async () => {
  serve(streak);
  renderAt('/streak');
  expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'October 5, freeze used' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'October 6, practiced' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'October 17, today' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'October 18' })).toBeInTheDocument();
});

test('moves between the first active month and today, no further', async () => {
  serve(streak);
  renderAt('/streak');
  const next = await screen.findByRole('button', { name: 'Next month' });
  const previous = screen.getByRole('button', { name: 'Previous month' });
  expect(next).toBeDisabled();
  fireEvent.click(previous);
  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'September 28, practiced' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'September 27' })).toBeInTheDocument();
  expect(previous).toBeDisabled();
  fireEvent.click(next);
  expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
});

test('a new user (no calendar) sees today and no banner', async () => {
  serve({
    current: 0,
    best: 0,
    freezesLeft: 0,
    todayDone: false,
    today,
    todayMinutes: 0,
    calendar: [],
  });
  renderAt('/streak');
  expect(await screen.findByText('No streak freezes')).toBeInTheDocument();
  expect(screen.queryByText(/Do one review session/)).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'October 17, today' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
});

test('offers a retry when the streak fails to load', async () => {
  server.use(
    http.get('/api/streak', () =>
      HttpResponse.json({ error: { code: 'bad_request', message: 'x' } }, { status: 400 }),
    ),
  );
  renderAt('/streak');
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});
