import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi, type MockInstance } from 'vitest';
import { FIXTURE_NOW, FIXTURE_TODAY, streak } from '@shared/fixtures';
import { api } from '@client/lib/api';
import { queryKeys } from '@client/lib/query';
import { PING_INTERVAL_MS, useActiveMinutes } from './useActiveMinutes';

const today = { date: FIXTURE_TODAY, minutes: 8, reviews: 0, readings: 0, freezeUsed: false };

let ping: MockInstance<typeof api.activity.ping>;
let queryClient: QueryClient;

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

function mount(enabled = true) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useActiveMinutes(enabled), { wrapper });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(FIXTURE_NOW);
  setVisibility('visible');
  ping = vi.spyOn(api.activity, 'ping').mockResolvedValue(today);
  queryClient = new QueryClient();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('pings when the page opens, then once a minute', () => {
  mount();
  expect(ping).toHaveBeenCalledTimes(1);
  expect(ping).toHaveBeenLastCalledWith(FIXTURE_NOW);

  vi.advanceTimersByTime(PING_INTERVAL_MS);
  expect(ping).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(PING_INTERVAL_MS);
  expect(ping).toHaveBeenCalledTimes(3);
});

test('stops while the page is hidden and pings again when it is shown', () => {
  mount();
  setVisibility('hidden');
  vi.advanceTimersByTime(PING_INTERVAL_MS * 3);
  expect(ping).toHaveBeenCalledTimes(1);

  setVisibility('visible');
  expect(ping).toHaveBeenCalledTimes(2);
});

test('does not ping twice in the same clock minute', () => {
  mount();
  setVisibility('hidden');
  setVisibility('visible');
  setVisibility('hidden');
  setVisibility('visible');
  expect(ping).toHaveBeenCalledTimes(1);
});

test('stops on unmount and does nothing when disabled', () => {
  const { unmount } = mount();
  unmount();
  vi.advanceTimersByTime(PING_INTERVAL_MS * 2);
  expect(ping).toHaveBeenCalledTimes(1);

  mount(false);
  expect(ping).toHaveBeenCalledTimes(1);
});

test("updates today's minutes in the cached streak", async () => {
  queryClient.setQueryData(queryKeys.streak, streak);
  ping.mockResolvedValue({ ...today, minutes: 9 });
  mount();
  await vi.waitFor(() =>
    expect(queryClient.getQueryData(queryKeys.streak)).toMatchObject({ todayMinutes: 9 }),
  );
});

test('a failed ping is ignored', async () => {
  ping.mockRejectedValue(new Error('offline'));
  mount();
  await vi.advanceTimersByTimeAsync(PING_INTERVAL_MS);
  expect(ping).toHaveBeenCalledTimes(2);
});
