import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';
import {
  ExplainRequest,
  ExplainResponse,
  TranslateRequest,
  TranslateResponse,
  type ApiError,
  type ApiErrorCode,
} from '../../shared/schemas';
import { cached } from '../ai/cache';
import { providerFor, type AiSettings, type AiTask } from '../ai/config';
import { learnerLevel } from '../ai/prompts';
import { consumeAiRequest } from '../ai/rate-limit';
import { AiConfigError, AiUpstreamError, type AiProvider } from '../ai/types';
import { createDb, scopedDb } from '../db';
import { requireUser, type UserEnv } from '../middleware/session';

type AiEnv = { Bindings: UserEnv['Bindings'] & AiSettings; Variables: UserEnv['Variables'] };
type ResolveProvider = (env: AiSettings, task: AiTask) => AiProvider;

class RateLimited extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('rate limited');
  }
}

function fail(
  c: Context,
  status: ContentfulStatusCode,
  code: ApiErrorCode,
  message: string,
  issues?: z.core.$ZodIssue[],
) {
  const body: ApiError = {
    error: {
      code,
      message,
      ...(issues && {
        issues: issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      }),
    },
  };
  return c.json(body, status);
}

/** `resolve` is swappable so tests can count and script provider calls. */
export function aiRoutes(resolve: ResolveProvider = providerFor) {
  /**
   * Cached result, or one rate-limited provider call. Cache hits are free and don't count:
   * the limit exists to cap provider spend (G-10).
   */
  async function run<T>(
    c: Context<AiEnv>,
    task: AiTask,
    text: string,
    level: string,
    schema: z.ZodType<T>,
    call: (provider: AiProvider) => Promise<T>,
  ): Promise<T> {
    const db = createDb(c.env.DB);
    return cached(db, { task, text, level, schema }, async () => {
      const limit = await consumeAiRequest(scopedDb(db, c.var.user.id), Date.now());
      if (!limit.ok) throw new RateLimited(limit.retryAfterSeconds);
      const provider = resolve(c.env, task);
      return { result: await call(provider), provider: provider.name };
    });
  }

  return new Hono<AiEnv>()
    .use(requireUser)
    .post('/translate', async (c) => {
      const body = TranslateRequest.safeParse(await c.req.json().catch(() => undefined));
      if (!body.success) return fail(c, 400, 'bad_request', 'Invalid request', body.error.issues);
      const { text } = body.data;
      const result = await run(c, 'translate', text, '', TranslateResponse, (provider) =>
        provider.translate(text),
      );
      return c.json(result satisfies TranslateResponse);
    })
    .post('/explain', async (c) => {
      const body = ExplainRequest.safeParse(await c.req.json().catch(() => undefined));
      if (!body.success) return fail(c, 400, 'bad_request', 'Invalid request', body.error.issues);
      const { sentence, chapterId } = body.data;
      if (!learnerLevel(chapterId)) {
        return fail(c, 400, 'bad_request', `Unknown chapter "${chapterId}"`);
      }
      const result = await run(c, 'explain', sentence, chapterId, ExplainResponse, (provider) =>
        provider.explain(sentence, chapterId),
      );
      return c.json(result satisfies ExplainResponse);
    })
    .onError((error, c) => {
      if (error instanceof RateLimited) {
        c.header('retry-after', String(error.retryAfterSeconds));
        return fail(c, 429, 'rate_limited', 'Too many AI requests this hour; try again later');
      }
      if (error instanceof AiUpstreamError) {
        console.error(error);
        return fail(c, 502, 'upstream_error', 'The AI provider failed; try again');
      }
      console.error(error);
      const message = error instanceof AiConfigError ? 'AI is not configured' : 'Internal error';
      return fail(c, 500, 'internal', message);
    });
}

export const ai = aiRoutes();
