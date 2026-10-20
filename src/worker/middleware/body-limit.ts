import { bodyLimit } from 'hono/body-limit';
import type { ApiError } from '../../shared/schemas';

/** The largest real body is a card (about 1.5 KB); this leaves room and stops a huge one early. */
export const MAX_BODY_BYTES = 64 * 1024;

/** Answers 413 in the contract's error shape before any route parses the body. */
export const limitBody = bodyLimit({
  maxSize: MAX_BODY_BYTES,
  onError: (c) => {
    const body: ApiError = { error: { code: 'bad_request', message: 'Request body is too large' } };
    return c.json(body, 413);
  },
});
