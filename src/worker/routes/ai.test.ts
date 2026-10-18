import { env, exports } from 'cloudflare:workers';
import { beforeAll, describe, expect, test } from 'vitest';
import { explainResponse } from '../../shared/fixtures';
import { ApiError, ExplainResponse, TranslateResponse } from '../../shared/schemas';
import { cacheKey } from '../ai/cache';
import { createProvider } from '../ai/provider';
import { AI_REQUESTS_PER_HOUR } from '../ai/rate-limit';
import type { Completion, TextModel } from '../ai/types';
import { createDb, scopedDb, translationCacheDb } from '../db';
import { aiRoutes } from './ai';

const ORIGIN = 'https://frenchy.test';
const db = createDb(env.DB);

/** A fresh signed-up user: their session cookie and id. */
async function signedInUser() {
  const byte = () => Math.floor(Math.random() * 256);
  const res = await exports.default.fetch(`${ORIGIN}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      'cf-connecting-ip': `10.${byte()}.${byte()}.${byte()}`,
    },
    body: JSON.stringify({
      name: 'Léa',
      email: `learner-${crypto.randomUUID()}@example.com`,
      password: 'correct-horse-battery',
    }),
  });
  const cookie = res.headers.getSetCookie()[0]?.split(';')[0];
  const { user } = (await res.json()) as { user: { id: string } };
  if (!cookie) throw new Error(`sign-up failed (status ${res.status})`);
  return { cookie, id: user.id };
}

/** Counts provider calls; answers like the mock unless given replies. */
function countingModel(...replies: string[]): TextModel & { calls: Completion[] } {
  const calls: Completion[] = [];
  return {
    name: 'counting',
    calls,
    async complete(request) {
      calls.push(request);
      return replies[calls.length - 1] ?? JSON.stringify(explainResponse);
    },
  };
}

function appWith(model: TextModel) {
  const provider = createProvider(model);
  return aiRoutes(() => provider);
}

function post(app: ReturnType<typeof aiRoutes>, path: string, body: unknown, cookie?: string) {
  const headers = new Headers({ 'content-type': 'application/json', origin: ORIGIN });
  if (cookie) headers.set('cookie', cookie);
  return app.request(
    `${ORIGIN}${path}`,
    { method: 'POST', headers, body: JSON.stringify(body) },
    env,
  );
}

/** A sentence no other test (or earlier run) has cached. */
function freshSentence(): string {
  return `Léa aime le thé ${crypto.randomUUID().slice(0, 8)}.`;
}

let user: Awaited<ReturnType<typeof signedInUser>>;
beforeAll(async () => {
  user = await signedInUser();
});

describe('POST /api/ai/*', () => {
  test('needs a session', async () => {
    const res = await post(appWith(countingModel()), '/translate', { text: 'Bonjour' });
    expect(res.status).toBe(401);
  });

  test('rejects an invalid body and an unknown chapter with the error shape', async () => {
    const app = appWith(countingModel());
    const empty = await post(app, '/translate', { text: '   ' }, user.cookie);
    expect(empty.status).toBe(400);
    expect(ApiError.parse(await empty.json()).error.issues?.[0]?.path).toBe('text');
    const unknown = await post(
      app,
      '/explain',
      { sentence: 'Bonjour.', chapterId: 'ch99' },
      user.cookie,
    );
    expect(unknown.status).toBe(400);
    expect(ApiError.parse(await unknown.json()).error.code).toBe('bad_request');
  });

  test('the mounted route uses the mock driver when no provider is configured', async () => {
    const text = freshSentence();
    const res = await exports.default.fetch(`${ORIGIN}/api/ai/translate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN, cookie: user.cookie },
      body: JSON.stringify({ text }),
    });
    expect(res.status).toBe(200);
    expect(TranslateResponse.parse(await res.json()).translation).toBe(`[mock] ${text}`);
  });
});

describe('translation cache', () => {
  test('a cache hit skips the provider, also for spacing and apostrophe variants', async () => {
    const model = countingModel('He likes tea.');
    const app = appWith(model);
    const text = `L'ami ${freshSentence()}`;

    const first = await post(app, '/translate', { text }, user.cookie);
    expect(await first.json()).toEqual({ translation: 'He likes tea.' });
    const variant = `  ${text.replace("L'ami", 'L’ami').replace(' ', '   ')} `;
    const second = await post(app, '/translate', { text: variant }, user.cookie);
    expect(await second.json()).toEqual({ translation: 'He likes tea.' });
    expect(model.calls).toHaveLength(1);

    const row = await translationCacheDb(db).get(await cacheKey('translate', text, ''));
    expect(row).toMatchObject({ task: 'translate', provider: 'counting' });
  });

  test('explanations are cached per chapter, separately from translations', async () => {
    const model = countingModel();
    const app = appWith(model);
    const sentence = freshSentence();
    for (const chapterId of ['ch10', 'ch10', 'ch12']) {
      const res = await post(app, '/explain', { sentence, chapterId }, user.cookie);
      expect(ExplainResponse.parse(await res.json())).toEqual(explainResponse);
    }
    await post(app, '/translate', { text: sentence }, user.cookie);
    expect(model.calls).toHaveLength(3);
  });

  test('invalid JSON twice is a 502 and caches nothing; once is retried and served', async () => {
    const sentence = freshSentence();
    const broken = appWith(countingModel('not json', '{"still": "not it"}'));
    const res = await post(broken, '/explain', { sentence, chapterId: 'ch10' }, user.cookie);
    expect(res.status).toBe(502);
    expect(ApiError.parse(await res.json()).error.code).toBe('upstream_error');
    expect(await translationCacheDb(db).get(await cacheKey('explain', sentence, 'ch10'))).toBe(
      undefined,
    );

    const model = countingModel('not json', JSON.stringify(explainResponse));
    const retried = await post(
      appWith(model),
      '/explain',
      { sentence, chapterId: 'ch10' },
      user.cookie,
    );
    expect(retried.status).toBe(200);
    expect(model.calls).toHaveLength(2);
  });
});

describe('rate limit', () => {
  test(`allows ${AI_REQUESTS_PER_HOUR} provider calls per hour, then 429 with Retry-After`, async () => {
    const { cookie, id } = await signedInUser();
    const model = countingModel('Hello.');
    const app = appWith(model);
    const cachedText = freshSentence();
    expect((await post(app, '/translate', { text: cachedText }, cookie)).status).toBe(200);

    // Fill the rest of this hour's allowance directly, as 59 more calls would have.
    const now = Date.now();
    const windowStart = now - (now % 3_600_000);
    await scopedDb(db, id).aiUsage.update({ requests: AI_REQUESTS_PER_HOUR });
    const limited = await post(app, '/translate', { text: freshSentence() }, cookie);
    expect(limited.status).toBe(429);
    expect(ApiError.parse(await limited.json()).error.code).toBe('rate_limited');
    const retryAfter = Number(limited.headers.get('retry-after'));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(3600);
    expect(model.calls).toHaveLength(1);

    // Cache hits cost nothing, so they are still served.
    expect((await post(app, '/translate', { text: cachedText }, cookie)).status).toBe(200);

    // Other users have their own allowance.
    expect((await post(app, '/translate', { text: freshSentence() }, user.cookie)).status).toBe(
      200,
    );
    const [row] = await scopedDb(db, id).aiUsage.select();
    expect(row).toMatchObject({ windowStart, requests: AI_REQUESTS_PER_HOUR + 1 });
  });

  test('a new hour starts a new window and drops the old one', async () => {
    const { cookie, id } = await signedInUser();
    const scoped = scopedDb(db, id);
    const lastHour = Date.now() - 3_600_000;
    await scoped.aiUsage.insert({
      windowStart: lastHour - (lastHour % 3_600_000),
      requests: AI_REQUESTS_PER_HOUR + 5,
    });
    const res = await post(
      appWith(countingModel('Hi.')),
      '/translate',
      { text: freshSentence() },
      cookie,
    );
    expect(res.status).toBe(200);
    const rows = await scoped.aiUsage.select();
    expect(rows.map((row) => row.requests)).toEqual([1]);
    expect(rows[0]?.windowStart).toBeGreaterThan(lastHour - 3_600_000);
  });
});
