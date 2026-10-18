import { getChapter } from '../../shared/content';
import { Profile, ProfilePatch } from '../../shared/schemas';
import {
  loadProfile,
  notFound,
  parseInput,
  readJson,
  respond,
  syncRouter,
  userDb,
} from './sync-common';

export const profile = syncRouter()
  .get('/', async (c) => respond(c, Profile, await loadProfile(userDb(c))))
  .patch('/', async (c) => {
    const patch = parseInput(ProfilePatch, await readJson(c), 'body');
    if (patch.currentChapterId && !getChapter(patch.currentChapterId)) throw notFound('Chapter');

    const db = userDb(c);
    const current = await loadProfile(db);
    const { settings, ...fields } = patch;
    const next: Profile = { ...current, ...fields, settings: { ...current.settings, ...settings } };
    await db.profiles.update({ ...next, updatedAt: Date.now() });
    return respond(c, Profile, next);
  });
