import { useQuery } from '@tanstack/react-query';
import { loadChapterTexts, loadDeck, loadText } from '@shared/content';

// Lesson texts and decks are static chunks loaded on demand (G-70): never stale, and a failed load
// (offline before the chunk was cached) is retried like any query.
const STATIC = { staleTime: Infinity, gcTime: Infinity } as const;

export function useChapterTexts(chapterId: string | null | undefined) {
  return useQuery({
    queryKey: ['content', 'texts', chapterId],
    queryFn: () => loadChapterTexts(chapterId ?? ''),
    enabled: Boolean(chapterId),
    ...STATIC,
  });
}

export function useText(textId: string) {
  return useQuery({
    queryKey: ['content', 'text', textId],
    // `null`, not `undefined`: TanStack Query rejects an undefined result.
    queryFn: async () => (await loadText(textId)) ?? null,
    ...STATIC,
  });
}

export function useDeck(chapterId: string) {
  return useQuery({
    queryKey: ['content', 'deck', chapterId],
    queryFn: async () => (await loadDeck(chapterId)) ?? null,
    ...STATIC,
  });
}
