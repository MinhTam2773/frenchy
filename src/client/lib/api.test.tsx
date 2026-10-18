import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { expect, test } from 'vitest';
import { cardStats, profile, reviewCards, wordCardCreate } from '@shared/fixtures';
import { server } from '@client/mocks/server';
import { api, ApiClientError } from './api';
import { createQueryClient, useProfile } from './query';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

test('a sample query returns the fixture profile through MSW', async () => {
  const { result } = renderHook(() => useProfile(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(profile);
});

test('every endpoint in the contract answers with data that matches its schema', async () => {
  // api.* parses each response with the shared schema, so a mock that drifts from it rejects here.
  await expect(api.health()).resolves.toEqual({ ok: true });
  await expect(api.cards.stats()).resolves.toEqual(cardStats);
  await expect(api.cards.due(2)).resolves.toEqual({ cards: reviewCards.slice(0, 2) });
  await expect(api.cards.create(wordCardCreate)).resolves.toMatchObject(wordCardCreate);
  await expect(api.cards.addStarterDeck('ch10')).resolves.toMatchObject({ added: 3 });
  const now = Date.now();
  await expect(
    api.reviews.create({
      id: '00000000-0000-4000-8000-0000000000a1',
      cardId: reviewCards[0].id,
      rating: 3,
      reviewedAt: now,
      durationMs: 1,
    }),
  ).resolves.toMatchObject({ id: reviewCards[0].id });
  await expect(api.words.put('préférer', 'known')).resolves.toEqual({
    lemma: 'préférer',
    status: 'known',
  });
  await expect(api.words.list()).resolves.toMatchObject({ words: expect.any(Array) });
  await expect(api.activity.ping(now)).resolves.toMatchObject({ minutes: expect.any(Number) });
  await expect(api.activity.readings()).resolves.toMatchObject({ readings: expect.any(Array) });
  await expect(api.activity.addReading({ textId: 'ch10-au-cafe', finishedAt: now })).resolves.toEqual(
    { textId: 'ch10-au-cafe', finishedAt: now },
  );
  await expect(api.streak()).resolves.toMatchObject({ today: expect.any(String) });
  await expect(api.ai.translate('Bonjour')).resolves.toHaveProperty('translation');
  await expect(api.ai.explain('Bonjour', 'ch10')).resolves.toHaveProperty('gloss');
});

test('patching the profile merges settings and keeps the change', async () => {
  const patched = await api.profile.patch({ dailyGoalMinutes: 30, settings: { rate: 1 } });
  expect(patched.dailyGoalMinutes).toBe(30);
  expect(patched.settings).toEqual({ ...profile.settings, rate: 1 });
  await expect(api.profile.get()).resolves.toEqual(patched);
});

test('an ApiError body becomes an ApiClientError with its code and issues', async () => {
  server.use(
    http.get('/api/profile', () =>
      HttpResponse.json(
        { error: { code: 'bad_request', message: 'Nope', issues: [{ path: 'a', message: 'b' }] } },
        { status: 400 },
      ),
    ),
  );
  const error = await api.profile.get().catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiClientError);
  expect(error).toMatchObject({
    code: 'bad_request',
    status: 400,
    message: 'Nope',
    issues: [{ path: 'a', message: 'b' }],
  });
});

test('a non-JSON error falls back to a code from the status', async () => {
  server.use(http.get('/api/profile', () => new HttpResponse('boom', { status: 401 })));
  await expect(api.profile.get()).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
});

test('a network failure becomes code "network"', async () => {
  server.use(http.get('/api/profile', () => HttpResponse.error()));
  await expect(api.profile.get()).rejects.toMatchObject({ code: 'network', status: 0 });
});

test('a response that breaks the schema becomes code "invalid_response"', async () => {
  server.use(http.get('/api/profile', () => HttpResponse.json({ wrong: true })));
  await expect(api.profile.get()).rejects.toMatchObject({ code: 'invalid_response' });
});

test.each([
  [500, 2],
  [404, 1],
])('a %i answer makes the query call the API %i time(s)', async (status, expectedCalls) => {
  let calls = 0;
  server.use(
    http.get('/api/profile', () => {
      calls += 1;
      return new HttpResponse(null, { status });
    }),
  );
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retryDelay: 0 } });
  const { result } = renderHook(() => useProfile(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(calls).toBe(expectedCalls);
});
