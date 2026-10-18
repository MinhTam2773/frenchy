import { createMiddleware } from 'hono/factory';
import type { ApiError } from '../../shared/schemas';
import { createAuth, type AuthEnv, type AuthSession, type AuthUser } from '../auth';

/** Hono env for routes behind `requireUser`. */
export interface UserEnv {
  Bindings: AuthEnv;
  Variables: { user: AuthUser; session: AuthSession['session'] };
}

/** Sets `c.var.user` and `c.var.session` from the session cookie, or answers 401. */
export const requireUser = createMiddleware<UserEnv>(async (c, next) => {
  const result = await createAuth(c.env, c.req.raw).api.getSession({
    headers: c.req.raw.headers,
  });
  if (!result) {
    const body: ApiError = { error: { code: 'unauthorized', message: 'Sign in to continue' } };
    return c.json(body, 401);
  }
  c.set('user', result.user);
  c.set('session', result.session);
  await next();
});
