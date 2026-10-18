import { z } from 'zod';

export const ApiErrorCode = z.enum([
  'bad_request',
  'unauthorized',
  'not_found',
  'rate_limited',
  'upstream_error',
  'internal',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

/** The one error body every `/api/*` route returns (except Better Auth's own routes). */
export const ApiError = z.object({
  error: z.object({
    code: ApiErrorCode,
    message: z.string().min(1),
    /** Validation failures: which field and why. */
    issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

/** `GET /api/auth/config` (public): which sign-in methods the server has turned on. */
export const AuthConfig = z.object({ google: z.boolean() });
export type AuthConfig = z.infer<typeof AuthConfig>;
