import { QueryClient, useQuery } from '@tanstack/react-query';
import { api, ApiClientError } from './api';

function isClientError(error: unknown) {
  return error instanceof ApiClientError && error.status >= 400 && error.status < 500;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A 4xx will not fix itself; the one retry is for a flaky network or a 5xx.
        retry: (failureCount, error) => failureCount < 1 && !isClientError(error),
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** One key per resource, so a mutation in one screen can invalidate what another screen shows. */
export const queryKeys = {
  profile: ['profile'] as const,
  cardStats: ['cards', 'stats'] as const,
  dueCards: ['cards', 'due'] as const,
  words: ['words'] as const,
  streak: ['streak'] as const,
  readings: ['activity', 'readings'] as const,
};

export function useProfile() {
  return useQuery({ queryKey: queryKeys.profile, queryFn: api.profile.get });
}
