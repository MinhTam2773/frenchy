import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { TTS_RATE } from '../../shared/constants';
import { TimeZone, type Profile } from '../../shared/schemas';
import { createDb, scopedDb, type Db } from '../db';
import * as authSchema from './schema';

/** Worker secrets and vars for auth. `wrangler types` can't see secrets, so they are typed here. */
export type AuthEnv = Env & {
  BETTER_AUTH_SECRET?: string;
  /** Public origin, e.g. `https://frenchy.example`. Unset: taken from the request. */
  BETTER_AUTH_URL?: string;
  /** Extra origins allowed to call `/api/auth/*`, comma-separated. */
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

export const MIN_PASSWORD_LENGTH = 8;

/** Sign-in and sign-up attempts allowed per client IP and path in each window. */
export const AUTH_ATTEMPTS = { window: 60, max: 5 } as const;

/** Google sign-in is on only when both values are set (H-03). */
export function googleProvider(env: AuthEnv) {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = env;
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

/** One Better Auth instance per request: bindings and secrets only exist on `env`. */
export function createAuth(env: AuthEnv, request: Request) {
  if (!env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is not set');
  const db = createDb(env.DB);
  const google = googleProvider(env);

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    // Without a base URL Better Auth can't tell https at startup and drops the Secure flag.
    baseURL: env.BETTER_AUTH_URL || new URL(request.url).origin,
    trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((origin) => origin.trim()),
    database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),
    emailAndPassword: { enabled: true, minPasswordLength: MIN_PASSWORD_LENGTH },
    socialProviders: google ? { google } : {},
    // Memory storage would reset with every per-request instance, so attempts live in D1.
    rateLimit: {
      enabled: true,
      storage: 'database',
      customRules: { '/sign-in/*': AUTH_ATTEMPTS, '/sign-up/*': AUTH_ATTEMPTS },
    },
    // Cloudflare sets this header and overwrites any value the client sends.
    advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
    // Cookies are httpOnly and SameSite=Lax by default, and Secure whenever the origin is https.
    databaseHooks: {
      session: {
        create: { after: (session) => ensureProfile(db, session.userId, timeZoneOf(request)) },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;
export type AuthUser = AuthSession['user'];

/** First sign-in (email or Google) makes the profile that onboarding then fills in. */
async function ensureProfile(db: Db, userId: string, timeZone: string): Promise<void> {
  const profile: Profile = {
    currentChapterId: null,
    timeZone,
    dailyGoalMinutes: 30,
    settings: { voiceURI: null, rate: TTS_RATE.default, playOnTap: true },
  };
  const now = Date.now();
  await scopedDb(db, userId)
    .profiles.insert({ ...profile, createdAt: now, updatedAt: now })
    .onConflictDoNothing();
}

/** Cloudflare's guess from the client IP; onboarding can change it. */
function timeZoneOf(request: Request): string {
  const parsed = TimeZone.safeParse(request.cf?.timezone);
  return parsed.success ? parsed.data : 'UTC';
}
