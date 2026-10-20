import { bodyLimit } from 'hono/body-limit';
import { every } from 'hono/combine';
import { createMiddleware } from 'hono/factory';
import type { ApiError } from '../../shared/schemas';

/** The largest real body is a card (about 1.5 KB); this leaves room and stops a huge one early. */
export const MAX_BODY_BYTES = 64 * 1024;

/** Answers 413 in the contract's error shape before any route parses the body. */
const limitBody = bodyLimit({
  maxSize: MAX_BODY_BYTES,
  onError: (c) => {
    const body: ApiError = { error: { code: 'bad_request', message: 'Request body is too large' } };
    return c.json(body, 413);
  },
});

// `public/_headers` only reaches the static files; a Worker response (`/api/*`) never gets it (L-137).
const noSniff = createMiddleware(async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
});

/** Body cap and `nosniff` for every `/api/*` answer, including the 413 and 404 ones. */
export const hardenApi = every(noSniff, limitBody);
