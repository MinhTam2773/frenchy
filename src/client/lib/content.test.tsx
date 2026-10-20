import { renderHook, waitFor } from '@testing-library/react';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { expect, test } from 'vitest';
import { getChapterTextIds } from '@shared/content';
import { useChapterTexts, useDeck, useText } from './content';
import { createQueryClient } from './query';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

test('loads a chapter’s texts, a text and a deck on demand', async () => {
  const texts = renderHook(() => useChapterTexts('ch10'), { wrapper }).result;
  const text = renderHook(() => useText('ch10-au-marche'), { wrapper }).result;
  const deck = renderHook(() => useDeck('ch10'), { wrapper }).result;
  await waitFor(() =>
    expect(texts.current.data?.map((t) => t.id)).toEqual(getChapterTextIds('ch10')),
  );
  await waitFor(() => expect(text.current.data?.title).toBeTruthy());
  await waitFor(() => expect(deck.current.data?.chapterId).toBe('ch10'));
});

test('an unknown text or deck is null, not a loading state', async () => {
  const text = renderHook(() => useText('ch10-nowhere'), { wrapper }).result;
  const deck = renderHook(() => useDeck('ch99'), { wrapper }).result;
  await waitFor(() => expect(text.current.data).toBeNull());
  await waitFor(() => expect(deck.current.data).toBeNull());
});

test('loads offline: the chunks come from the precache, not the API (L-147)', async () => {
  onlineManager.setOnline(false);
  try {
    const { result } = renderHook(() => useChapterTexts('ch10'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
  } finally {
    onlineManager.setOnline(true);
  }
});
