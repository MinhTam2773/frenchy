import { z } from 'zod';
import { DAILY_GOAL_OPTIONS, TTS_RATE } from '../constants';
import { ChapterId, TimeZone } from './common';

export const DailyGoalMinutes = z.literal(DAILY_GOAL_OPTIONS);

export const ProfileSettings = z.object({
  /** `SpeechSynthesisVoice.voiceURI`; null picks the best fr-FR voice on the device. */
  voiceURI: z.string().min(1).nullable(),
  rate: z.number().min(TTS_RATE.min).max(TTS_RATE.max),
  playOnTap: z.boolean(),
});
export type ProfileSettings = z.infer<typeof ProfileSettings>;

/** The user's name and email come from the Better Auth session, not from here. */
export const Profile = z.object({
  /** Null until onboarding picks a chapter. */
  currentChapterId: ChapterId.nullable(),
  timeZone: TimeZone,
  dailyGoalMinutes: DailyGoalMinutes,
  settings: ProfileSettings,
});
export type Profile = z.infer<typeof Profile>;

/** `PATCH /api/profile`: any subset; `settings` merges key by key. */
export const ProfilePatch = z.object({
  currentChapterId: ChapterId.nullable().optional(),
  timeZone: TimeZone.optional(),
  dailyGoalMinutes: DailyGoalMinutes.optional(),
  settings: ProfileSettings.partial().optional(),
});
export type ProfilePatch = z.infer<typeof ProfilePatch>;
