import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';
import { allCaughtUpStats, cardStats } from '@shared/fixtures';

test('flashcards card shows due, new, learning and review counts and links to /review', async () => {
  renderAt('/practice');
  const link = await screen.findByRole('link', { name: /Flashcards/ });
  expect(link).toHaveAttribute('href', '/review');
  expect(await within(link).findByText(String(cardStats.due))).toBeInTheDocument();
  for (const [label, value] of [
    ['new', cardStats.new],
    ['learning', cardStats.learning],
    ['review', cardStats.review],
  ] as const) {
    expect(within(link).getByText(label).nextElementSibling).toHaveTextContent(String(value));
  }
});

test('says all caught up when nothing is due', async () => {
  server.use(http.get('/api/cards/stats', () => HttpResponse.json(allCaughtUpStats)));
  renderAt('/practice');
  expect(await screen.findByText('all caught up')).toBeInTheDocument();
});

test('drills, tutor, speaking and import are "Coming later", not links', async () => {
  renderAt('/practice');
  const heading = await screen.findByRole('heading', { name: 'Coming later' });
  const list = heading.nextElementSibling as HTMLElement;
  expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  for (const title of ['Conjugation drills', 'AI tutor', 'Speaking', 'Import a text']) {
    expect(within(list).getByText(title)).toBeInTheDocument();
  }
  expect(within(list).queryAllByRole('link')).toHaveLength(0);
});

test('the streak chip links to /streak', async () => {
  renderAt('/practice');
  expect(await screen.findByRole('link', { name: /day streak/ })).toHaveAttribute(
    'href',
    '/streak',
  );
});

test('offers a retry when the card counts fail to load', async () => {
  let fail = true;
  server.use(
    http.get('/api/cards/stats', () =>
      fail
        ? HttpResponse.json({ error: { code: 'internal', message: 'Down' } }, { status: 500 })
        : HttpResponse.json(cardStats),
    ),
  );
  renderAt('/practice');
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your flashcards.');
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('link', { name: /Flashcards/ })).toBeInTheDocument();
});
