import { configure, fireEvent, render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, test, vi } from 'vitest';
import {
  cafeDialogueText,
  ch10Deck,
  ch10Note,
  course,
  leaMorningText,
  profile,
} from '@shared/fixtures';
import { AppProviders } from '@client/App';
import { server } from '@client/mocks/server';
import { ChapterView, type ChapterViewProps } from './ChapterView';

// These render the whole app; give them room when CI or a busy machine is slow.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 15_000 });

const stage = course.stages[0];
const ch10 = stage?.chapters.find((chapter) => chapter.id === 'ch10');
if (!stage || !ch10) throw new Error('The fixture course needs stage 1 with Ch 10');

const withContent: ChapterViewProps = {
  chapter: ch10,
  stage,
  texts: [leaMorningText, cafeDialogueText],
  note: ch10Note,
  deck: ch10Deck,
};

function renderView(props: ChapterViewProps = withContent) {
  const router = createMemoryRouter([{ path: '/', element: <ChapterView {...props} /> }]);
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('pattern card', () => {
  test('shows the headword, the English gloss and the highlighted endings', async () => {
    renderView();
    expect(await screen.findByText('Pattern')).toBeInTheDocument();
    expect(screen.getByText('parler')).toBeInTheDocument();
    expect(screen.getByText(/to speak/)).toBeInTheDocument();
    expect(screen.getByText('je').nextElementSibling).toHaveTextContent('parle');
    expect(screen.getByText('ils / elles').nextElementSibling).toHaveTextContent('parlent');
    const endings = screen.getAllByText(/^(e|es|ons|ez|ent)$/, { selector: 'span' });
    expect(endings.map((e) => e.textContent)).toEqual(['e', 'es', 'e', 'ons', 'ez', 'ent']);
    expect(screen.getByText(ch10Note.tip)).toBeInTheDocument();
  });

  test('is absent when the chapter has no note', async () => {
    renderView({ ...withContent, note: undefined });
    await screen.findByText('Readings · 0 of 2 read');
    expect(screen.queryByText('Pattern')).not.toBeInTheDocument();
  });
});

describe('readings', () => {
  test('lists every text as a link to the reader with its kind, length and new words', async () => {
    renderView();
    const first = await screen.findByRole('link', { name: /Le matin de Léa/ });
    expect(first).toHaveAttribute('href', '/read/ch10-le-matin-de-lea');
    expect(first).toHaveTextContent(
      `Story · ${leaMorningText.minutes} min · ${leaMorningText.newWords.length} new words`,
    );
    const second = screen.getByRole('link', { name: /Au café/ });
    expect(second).toHaveAttribute('href', '/read/ch10-au-cafe');
    expect(second).toHaveTextContent(/Dialogue · \d+ min · \d+ new words?/);
  });

  test('every reading is open, none shows a lock', async () => {
    renderView();
    await screen.findByRole('link', { name: /Le matin de Léa/ });
    expect(screen.queryByText(/unlock/i)).not.toBeInTheDocument();
  });

  test('marks finished texts and counts them, highlighting the next unread one', async () => {
    server.use(
      http.get('/api/activity/readings', () =>
        HttpResponse.json({
          readings: [{ textId: leaMorningText.id, finishedAt: 1_700_000_000_000 }],
        }),
      ),
    );
    renderView();
    expect(await screen.findByText('Readings · 1 of 2 read')).toBeInTheDocument();
    const read = screen.getByRole('link', { name: /Le matin de Léa/ });
    const next = screen.getByRole('link', { name: /Au café/ });
    expect(read).toHaveTextContent('· read');
    expect(next).toHaveClass('border-primary');
    expect(read).not.toHaveClass('border-primary');
  });

  test('shows an empty state with no texts', async () => {
    renderView({ ...withContent, texts: [] });
    expect(await screen.findByText('No readings yet')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Readings' })).toBeInTheDocument();
  });
});

describe('starter deck', () => {
  test('adds the deck to the reviews through the starter-deck endpoint', async () => {
    renderView();
    const tile = await screen.findByRole('button', { name: 'Starter deck 3 cards Add to reviews' });
    fireEvent.click(tile);
    expect(await screen.findByRole('status')).toHaveTextContent('Added 3 to your reviews');
    expect(tile).toHaveAccessibleName('Starter deck 3 cards Added 3 to your reviews');
    expect(tile).toBeDisabled();
  });

  test('says so when the deck was already added', async () => {
    server.use(
      http.post('/api/cards/starter/:chapterId', () => HttpResponse.json({ added: 0, total: 3 })),
    );
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /Add to reviews/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Already in your reviews');
  });

  test('posts to the chapter being shown', async () => {
    let chapterId: string | readonly string[] | undefined;
    server.use(
      http.post('/api/cards/starter/:chapterId', ({ params }) => {
        chapterId = params.chapterId;
        return HttpResponse.json({ added: 3, total: 3 });
      }),
    );
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /Add to reviews/ }));
    await screen.findByText('Added 3 to your reviews', { selector: '[role="status"]' });
    expect(chapterId).toBe('ch10');
  });

  test('offers a retry when the call fails', async () => {
    server.use(
      http.post('/api/cards/starter/:chapterId', () =>
        HttpResponse.json({ error: { code: 'not_found', message: 'No deck' } }, { status: 404 }),
      ),
    );
    renderView();
    const tile = await screen.findByRole('button', { name: /Add to reviews/ });
    fireEvent.click(tile);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not add the deck');
    expect(tile).toBeEnabled();
  });

  test('is absent when the chapter has no deck', async () => {
    renderView({ ...withContent, deck: undefined });
    await screen.findByText('Readings · 0 of 2 read');
    expect(screen.queryByText('Starter deck')).not.toBeInTheDocument();
  });
});

describe('book sections', () => {
  test('are left out while the chapter has none (G-06)', async () => {
    renderView({ ...withContent, chapter: { ...ch10, sections: [] } });
    await screen.findByText('Readings · 0 of 2 read');
    expect(screen.queryByRole('list', { name: /Book sections/ })).not.toBeInTheDocument();
  });

  test('show one segment each, not done while the chapter is current', async () => {
    renderView();
    const strip = await screen.findByRole('list', { name: 'Book sections: 4' });
    expect(
      within(strip)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['§1', '§2', '§3', '§4']);
  });

  test('are all done once the learner has moved past the chapter', async () => {
    server.use(
      http.get('/api/profile', () => HttpResponse.json({ ...profile, currentChapterId: 'ch4' })),
    );
    renderView();
    const strip = await screen.findByRole('list', { name: 'Book sections: 4, all done' });
    expect(within(strip).getAllByRole('listitem')[0]).toHaveTextContent('§1 done');
  });
});

describe('header and actions', () => {
  test('shows the stage, level and PDF pages from the chapter', async () => {
    renderView();
    expect(await screen.findByText('Stage 1 · Chapter 10')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('Book: PDF p. 185–196')).toBeInTheDocument();
  });

  test('has no drill button until B-01', async () => {
    renderView();
    await screen.findByRole('button', { name: /Add to reviews/ });
    expect(screen.queryByRole('link', { name: /drill|conjugate/i })).not.toBeInTheDocument();
  });

  test('keeps the page usable when the profile fails to load', async () => {
    server.use(http.get('/api/profile', () => HttpResponse.json({}, { status: 404 })));
    renderView();
    expect(await screen.findByRole('button', { name: /Add to reviews/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Make this my current chapter' }),
    ).toBeInTheDocument();
  });
});
