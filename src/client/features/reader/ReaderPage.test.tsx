import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';
import { explainResponse, leaMorningText, reviewCards } from '@shared/fixtures';
import { CardCreate, Reading, WordStatusPut } from '@shared/schemas';
import { LONG_PRESS_MS } from './ReaderText';

// Whole-app renders; a busy machine needs the room (L-74).
vi.setConfig({ testTimeout: 30_000 });

// The fixture text is the Reader mockup's "Le matin de Léa", so these tests don't move when the
// real lesson texts are edited (L-75).
vi.mock('@shared/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/content')>();
  const { texts: fixtureTexts } = await import('@shared/fixtures');
  return {
    ...actual,
    getText: (id: string) => fixtureTexts.find((t) => t.id === id),
    getChapterTexts: (chapterId: string) => fixtureTexts.filter((t) => t.chapterId === chapterId),
  };
});

const tts = vi.hoisted(() => ({ speak: vi.fn(() => Promise.resolve()), stop: vi.fn() }));
vi.mock('@client/lib/tts/useTts', () => ({
  useTts: () => ({ ...tts, speaking: false, supported: true, voices: [] }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const PATH = `/read/${leaMorningText.id}`;

async function openReader() {
  renderAt(PATH);
  await screen.findByRole('heading', { name: 'Le matin de Léa' });
  return screen.getByRole('article');
}

/** The word buttons whose text is exactly `word` (some words occur twice). */
const words = (article: HTMLElement, word: string) =>
  within(article).getAllByRole('button', { name: new RegExp(`^${word}(\\s*\\(new word\\))?$`) });
const word = (article: HTMLElement, w: string) => words(article, w)[0];

function recordCards() {
  const posted: CardCreate[] = [];
  server.use(
    http.post('/api/cards', async ({ request }) => {
      const card = CardCreate.parse(await request.json());
      posted.push(card);
      return HttpResponse.json(
        { ...reviewCards[2], ...card, id: crypto.randomUUID() },
        { status: 201 },
      );
    }),
  );
  return posted;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('reader', () => {
  test('shows the header, the text as word buttons and the finish bar', async () => {
    const article = await openReader();
    expect(screen.getByText('Ch 10 · Reading 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Close reader' })).toHaveAttribute(
      'href',
      '/chapter/ch10',
    );
    expect(article).toHaveAttribute('lang', 'fr');
    expect(word(article, 'tartine')).toHaveAccessibleName(/^tartine\s*\(new word\)$/);
    expect(screen.getByRole('button', { name: 'Finish reading' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  test('tapping a word shows its sheet, and tapping another word switches it', async () => {
    const article = await openReader();
    fireEvent.click(word(article, 'va'));
    const sheet = await screen.findByRole('region', { name: 'Word details' });
    expect(within(sheet).getByRole('heading', { name: 'va' })).toBeInTheDocument();
    expect(await within(sheet).findByText('verb')).toBeInTheDocument();
    expect(within(sheet).getByText('aller')).toBeInTheDocument();
    expect(within(sheet).getByText('goes')).toBeInTheDocument();
    expect(within(sheet).getByText('il / elle · present · irregular')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finish reading' })).not.toBeInTheDocument();
    // Not modal: the text stays usable, so one tap switches words.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(word(article, 'voisin'));
    expect(await within(sheet).findByRole('heading', { name: 'voisin' })).toBeInTheDocument();
    expect(await within(sheet).findByText('le · masculine')).toBeInTheDocument();
    expect(within(sheet).getByText('New')).toBeInTheDocument();
    expect(within(sheet).getByText('neighbor')).toBeInTheDocument();
  });

  test('"Save word" creates a word card and sets the word to learning', async () => {
    const posted = recordCards();
    const puts: { lemma: string; status: string }[] = [];
    server.use(
      http.put('/api/words/:lemma', async ({ params, request }) => {
        const { status } = WordStatusPut.parse(await request.json());
        puts.push({ lemma: String(params.lemma), status });
        return HttpResponse.json({ lemma: params.lemma, status });
      }),
    );
    const article = await openReader();
    fireEvent.click(word(article, 'voisin'));
    const sheet = await screen.findByRole('region', { name: 'Word details' });
    fireEvent.click(await within(sheet).findByRole('button', { name: 'Save word' }));
    expect(
      await within(sheet).findByRole('button', { name: 'Saved to reviews' }),
    ).toBeInTheDocument();
    expect(posted).toEqual([
      expect.objectContaining({
        type: 'sentence_meaning',
        front: 'voisin',
        back: 'neighbor',
        hint: 'Elle parle avec son voisin, Karim.',
        source: { kind: 'word', ref: 'voisin' },
      }),
    ]);
    expect(puts).toEqual([{ lemma: 'voisin', status: 'learning' }]);
  });

  test('a word already learning shows as saved', async () => {
    const article = await openReader();
    fireEvent.click(word(article, 'écoute'));
    const sheet = await screen.findByRole('region', { name: 'Word details' });
    expect(
      await within(sheet).findByRole('button', { name: 'Saved to reviews' }),
    ).toBeInTheDocument();
  });

  test('a failed save says so', async () => {
    server.use(http.post('/api/cards', () => HttpResponse.json({}, { status: 500 })));
    const article = await openReader();
    fireEvent.click(word(article, 'tartine'));
    const sheet = await screen.findByRole('region', { name: 'Word details' });
    fireEvent.click(await within(sheet).findByRole('button', { name: 'Save word' }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Couldn’t save');
  });

  test('long-press selects the sentence and opens the sentence sheet', async () => {
    const article = await openReader();
    const target = word(article, 'café');
    fireEvent.pointerDown(target, { button: 0, pointerId: 1, pointerType: 'touch' });
    await wait(LONG_PRESS_MS + 100);
    fireEvent.pointerUp(target, { pointerId: 1, pointerType: 'touch' });
    // The click that follows a long-press must not pick the word.
    fireEvent.click(target);
    const sheet = await screen.findByRole('dialog', { name: 'Sentence translation' });
    expect(within(sheet).getByText(explainResponse.translation)).toBeInTheDocument();
    expect(
      within(sheet).getByText('Il aime le café, mais Léa préfère le thé.', { selector: 'p' }),
    ).toBeInTheDocument();
    const gloss = within(sheet).getByRole('list');
    expect(within(gloss).getAllByRole('listitem')).toHaveLength(9);
    expect(await within(sheet).findByText(explainResponse.notes[0])).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Word details' })).not.toBeInTheDocument();
  });

  test('a short tap does not open the sentence sheet', async () => {
    const article = await openReader();
    const target = word(article, 'café');
    fireEvent.pointerDown(target, { button: 0, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(target, { pointerId: 1, pointerType: 'touch' });
    fireEvent.click(target);
    await screen.findByRole('region', { name: 'Word details' });
    await wait(LONG_PRESS_MS + 100);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('saving a sentence posts a sentence card, and a cloze hides the pressed word', async () => {
    const posted = recordCards();
    const article = await openReader();
    fireEvent.click(word(article, 'préfère'));
    const panel = await screen.findByRole('region', { name: 'Word details' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Sentence' }));
    const sheet = await screen.findByRole('dialog', { name: 'Sentence translation' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save sentence' }));
    await within(sheet).findByRole('button', { name: 'Sentence saved' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save as cloze (hide “préfère”)' }));
    await within(sheet).findByRole('button', { name: 'Cloze saved' });
    expect(posted).toEqual([
      {
        type: 'sentence_meaning',
        front: 'Il aime le café, mais Léa préfère le thé.',
        back: 'He likes coffee, but Léa prefers tea.',
        source: { kind: 'text', ref: leaMorningText.id },
      },
      {
        type: 'cloze',
        front: 'Il aime le café, mais Léa ___ le thé.',
        back: 'Il aime le café, mais Léa préfère le thé.',
        clozeAnswer: 'préfère',
        hint: 'He likes coffee, but Léa prefers tea.',
        source: { kind: 'text', ref: leaMorningText.id },
      },
    ]);
  });

  test('Shift+click selects every sentence between two words', async () => {
    const article = await openReader();
    fireEvent.click(word(article, 'Léa'));
    fireEvent.click(word(article, 'chat'), { shiftKey: true });
    const sheet = await screen.findByRole('dialog', { name: 'Sentence translation' });
    expect(
      within(sheet).getByText('Léa lives in Lyon. She has a small apartment and a cat.'),
    ).toBeInTheDocument();
  });

  test('a mouse drag across words selects their sentences', async () => {
    const article = await openReader();
    const from = word(article, 'matin');
    const to = word(article, 'Karim');
    const elementFromPoint = vi.fn(() => to);
    document.elementFromPoint = elementFromPoint;
    fireEvent.pointerDown(from, { button: 0, pointerId: 2, pointerType: 'mouse' });
    fireEvent.pointerMove(from, { pointerId: 2, pointerType: 'mouse', clientX: 5, clientY: 5 });
    fireEvent.pointerUp(from, { pointerId: 2, pointerType: 'mouse' });
    fireEvent.click(from);
    const sheet = await screen.findByRole('dialog', { name: 'Sentence translation' });
    expect(
      within(sheet).getByText(
        `${leaMorningText.paragraphs[1].sentences[0].en} ${leaMorningText.paragraphs[2].sentences[0].en}`,
      ),
    ).toBeInTheDocument();
    expect(elementFromPoint).toHaveBeenCalledWith(5, 5);
  });

  test('works with the keyboard: one tab stop, arrows move, Escape closes and keeps focus', async () => {
    const article = await openReader();
    const buttons = within(article).getAllByRole('button');
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    const first = word(article, 'Léa');
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const second = word(article, 'habite');
    expect(second).toHaveFocus();
    expect(second.tabIndex).toBe(0);
    fireEvent.keyDown(second, { key: 'End' });
    expect(word(article, 'travail')).toHaveFocus();
    // Enter on a focused <button> is a click.
    fireEvent.click(word(article, 'travail'));
    const sheet = await screen.findByRole('region', { name: 'Word details' });
    expect(word(article, 'travail')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(sheet).not.toBeInTheDocument();
    expect(word(article, 'travail')).toHaveFocus();
  });

  test('plays the text sentence by sentence at the profile speed, and the speed cycles', async () => {
    await openReader();
    const speed = await screen.findByRole('button', { name: 'Playback speed 0.8×' });
    fireEvent.click(screen.getByRole('button', { name: 'Play audio' }));
    await waitFor(() => expect(tts.speak).toHaveBeenCalledTimes(6));
    expect(tts.speak).toHaveBeenNthCalledWith(1, 'Léa habite à Lyon.', {
      rate: 0.8,
      voiceURI: undefined,
    });
    expect(tts.speak).toHaveBeenLastCalledWith('À huit heures, elle va au travail.', {
      rate: 0.8,
      voiceURI: undefined,
    });
    fireEvent.click(speed);
    expect(screen.getByRole('button', { name: 'Playback speed 1×' })).toBeInTheDocument();
  });

  test('the word sheet plays the word', async () => {
    const article = await openReader();
    fireEvent.click(word(article, 'heures'));
    const sheet = await screen.findByRole('region', { name: 'Word details' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Play pronunciation' }));
    expect(tts.speak).toHaveBeenCalledWith('heures', { rate: 0.8, voiceURI: undefined });
  });

  test('"Finish reading" records the reading and returns to Today', async () => {
    const posted: Reading[] = [];
    server.use(
      http.post('/api/activity/readings', async ({ request }) => {
        const reading = Reading.parse(await request.json());
        posted.push(reading);
        return HttpResponse.json(reading);
      }),
    );
    await openReader();
    fireEvent.click(screen.getByRole('button', { name: 'Finish reading' }));
    expect(await screen.findByRole('heading', { name: /Bonjour/ })).toBeInTheDocument();
    expect(posted).toEqual([{ textId: leaMorningText.id, finishedAt: expect.any(Number) }]);
  });

  test('an unknown text says so', async () => {
    renderAt('/read/ch10-nope');
    expect(await screen.findByRole('heading', { name: 'Text not found' })).toBeInTheDocument();
  });
});
