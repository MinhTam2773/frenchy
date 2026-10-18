import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { StreakResponse } from '@shared/schemas';
import { api } from '@client/lib/api';
import { queryKeys } from '@client/lib/query';

export const PING_INTERVAL_MS = 60_000;

/**
 * Counts active minutes: while the page is visible, sends one ping per clock minute to
 * `POST /api/activity/ping` (the server also dedupes, so two open tabs don't double-count).
 * A hidden tab stops pinging; showing it again pings right away.
 */
export function useActiveMinutes(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let lastMinute = -1;
    let timer: ReturnType<typeof setInterval> | undefined;

    function ping() {
      const at = Date.now();
      const minute = Math.floor(at / PING_INTERVAL_MS);
      if (minute === lastMinute) return;
      lastMinute = minute;
      api.activity.ping(at).then(
        (day) =>
          // Keeps Today's progress bar current without refetching the whole streak.
          queryClient.setQueryData<StreakResponse>(queryKeys.streak, (old) =>
            old?.today === day.date ? { ...old, todayMinutes: day.minutes } : old,
          ),
        // A missed minute is not worth an error; the next tick tries again.
        () => undefined,
      );
    }

    function stop() {
      clearInterval(timer);
      timer = undefined;
    }

    function start() {
      stop();
      ping();
      timer = setInterval(ping, PING_INTERVAL_MS);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') start();
      else stop();
    }

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stop();
    };
  }, [enabled, queryClient]);
}
