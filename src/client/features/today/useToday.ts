import { useQuery } from '@tanstack/react-query';
import { getChapter, getChapterTexts } from '@shared/content';
import type { CardStats, Chapter, Profile, StreakResponse } from '@shared/schemas';
import { api } from '@client/lib/api';
import { queryKeys, useProfile } from '@client/lib/query';
import { nextUnreadText, type ReadingPick } from './nextUnreadText';

export type TodayData = {
  profile: Profile;
  /** Undefined until onboarding picks a chapter. */
  chapter: Chapter | undefined;
  stats: CardStats;
  streak: StreakResponse;
  reading: ReadingPick;
};

export type TodayState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: TodayData };

/** Everything the Today screen shows, from the profile, card stats, streak and readings. */
export function useToday(): TodayState {
  const profile = useProfile();
  const stats = useQuery({ queryKey: queryKeys.cardStats, queryFn: api.cards.stats });
  const streak = useQuery({ queryKey: queryKeys.streak, queryFn: api.streak });
  const readings = useQuery({ queryKey: queryKeys.readings, queryFn: api.activity.readings });

  const queries = [profile, stats, streak, readings];
  if (queries.some((query) => query.isError)) {
    return {
      status: 'error',
      retry: () => {
        for (const query of queries) if (query.isError) void query.refetch();
      },
    };
  }
  if (!profile.data || !stats.data || !streak.data || !readings.data) return { status: 'loading' };

  const chapter =
    profile.data.currentChapterId === null ? undefined : getChapter(profile.data.currentChapterId);
  return {
    status: 'ready',
    data: {
      profile: profile.data,
      chapter,
      stats: stats.data,
      streak: streak.data,
      reading: nextUnreadText(chapter ? getChapterTexts(chapter.id) : [], readings.data.readings),
    },
  };
}
