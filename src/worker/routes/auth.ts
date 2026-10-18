import { Hono } from 'hono';
import type { AuthConfig } from '../../shared/schemas';
import { createAuth, googleProvider, type AuthEnv } from '../auth';

// `/config` is ours (registered first); every other path goes to Better Auth.
export const auth = new Hono<{ Bindings: AuthEnv }>()
  .get('/config', (c) =>
    c.json({ google: googleProvider(c.env) !== undefined } satisfies AuthConfig),
  )
  .on(['GET', 'POST'], '/*', (c) => createAuth(c.env, c.req.raw).handler(c.req.raw));
