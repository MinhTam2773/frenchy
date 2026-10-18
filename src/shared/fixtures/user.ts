import type { Profile } from '../schemas';
import { FIXTURE_TIME_ZONE } from './clock';

/** `Settings.dc.html`: Ch 10, 45 min a day, French voice at 0.8×, words play on tap. */
export const profile: Profile = {
  currentChapterId: 'ch10',
  timeZone: FIXTURE_TIME_ZONE,
  dailyGoalMinutes: 45,
  settings: { voiceURI: null, rate: 0.8, playOnTap: true },
};

/** A profile right after sign-up, before onboarding. */
export const newProfile: Profile = { ...profile, currentChapterId: null, dailyGoalMinutes: 30 };
