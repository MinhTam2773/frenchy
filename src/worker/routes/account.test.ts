import { env, exports } from 'cloudflare:workers';
import { getTableName } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { AccountDeleted, AccountExport, ApiError } from '../../shared/schemas';
import { USER_TABLES } from '../db';
import { anonymous, newUser, ORIGIN, type TestUser } from './sync-test-helpers';

const BETTER_AUTH_USER_TABLES = ['session', 'account'];

/** Every table in the migrated database that has a `user_id` column, whatever the schema says. */
async function tablesWithUserId(): Promise<string[]> {
  // D1 refuses `pragma_table_info()` and `PRAGMA table_info` here (SQLITE_AUTH), so read the DDL.
  const { results } = await env.DB.prepare(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' ORDER BY name",
  ).all<{ name: string; sql: string }>();
  return results.filter(({ sql }) => /\buser_id\b/.test(sql)).map(({ name }) => name);
}

async function countRows(table: string, userId: string): Promise<number> {
  const row = await env.DB.prepare(`SELECT count(*) AS n FROM "${table}" WHERE user_id = ?`)
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

async function countUsers(userId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT count(*) AS n FROM "user" WHERE id = ?')
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** At least one row in every user table: sign-up made the profile, the rest go through the API. */
async function fillAccount(user: TestUser): Promise<void> {
  const now = Date.now();
  const cardRes = await user.api('/cards', {
    method: 'POST',
    body: {
      type: 'sentence_meaning',
      front: `Nous parlons français ${crypto.randomUUID()}.`,
      back: 'We speak French.',
      source: { kind: 'word', ref: 'parler' },
    },
  });
  const card = (await cardRes.json()) as { id: string };
  const calls = [
    user.api('/reviews', {
      method: 'POST',
      body: {
        id: crypto.randomUUID(),
        cardId: card.id,
        rating: 3,
        reviewedAt: now - 5_000,
        durationMs: 4_000,
      },
    }),
    user.api('/words/parler', { method: 'PUT', body: { status: 'learning' } }),
    user.api('/activity/ping', { method: 'POST', body: { at: now - 5_000 } }),
    user.api('/activity/readings', {
      method: 'POST',
      body: { textId: 'ch10-la-journee-de-thomas', finishedAt: now - 5_000 },
    }),
  ];
  for (const res of await Promise.all(calls)) expect(res.status).toBeLessThan(300);
  await user.db.aiUsage.insert({ windowStart: now - (now % 3_600_000), requests: 2 });
}

const confirmDelete = { method: 'DELETE', body: { confirm: 'delete' } } as const;

describe('user tables', () => {
  test('export and delete cover every table that has a user_id column', async () => {
    const covered = [...USER_TABLES.map(getTableName), ...BETTER_AUTH_USER_TABLES].sort();
    expect(await tablesWithUserId()).toEqual(covered);
  });
});

describe('GET /api/account/export', () => {
  test('returns every row of the user in every user table, and nobody else’s', async () => {
    const user = await newUser();
    const other = await newUser();
    await fillAccount(user);
    await fillAccount(other);

    const res = await user.api('/account/export');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(
      /^attachment; filename="frenchy-export-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    const body = AccountExport.parse(await res.json());

    expect(body.user).toMatchObject({ id: user.id, name: 'Léa' });
    expect(Object.keys(body.tables).sort()).toEqual(USER_TABLES.map(getTableName).sort());
    for (const [table, rows] of Object.entries(body.tables)) {
      expect(rows.length, table).toBeGreaterThan(0);
      for (const row of rows) expect(row.userId, table).toBe(user.id);
    }
    expect(body.tables.cards?.[0]).toMatchObject({ back: 'We speak French.' });
  });

  test('does not include session tokens or password hashes', async () => {
    const user = await newUser();
    const text = await (await user.api('/account/export')).text();
    expect(text).not.toContain(user.cookie.split('=')[1]?.split('.')[0] ?? 'no-token');
    expect(text).not.toMatch(/password/i);
  });

  test('needs a session', async () => {
    const res = await anonymous('/account/export');
    expect(res.status).toBe(401);
    expect(ApiError.parse(await res.json()).error.code).toBe('unauthorized');
  });
});

describe('DELETE /api/account', () => {
  test('removes every row and session of the user and leaves other users alone', async () => {
    const user = await newUser();
    const other = await newUser();
    await fillAccount(user);
    await fillAccount(other);
    const tables = await tablesWithUserId();
    for (const table of tables) expect(await countRows(table, user.id), table).toBeGreaterThan(0);

    const res = await user.api('/account', confirmDelete);
    expect(res.status).toBe(200);
    expect(AccountDeleted.parse(await res.json())).toEqual({ deleted: true });

    for (const table of tables) expect(await countRows(table, user.id), table).toBe(0);
    expect(await countUsers(user.id)).toBe(0);

    for (const table of tables) expect(await countRows(table, other.id), table).toBeGreaterThan(0);
    expect(await countUsers(other.id)).toBe(1);
  });

  test('the old session stops working', async () => {
    const user = await newUser();
    expect((await user.api('/profile')).status).toBe(200);
    await user.api('/account', confirmDelete);
    expect((await user.api('/profile')).status).toBe(401);
    expect((await user.api('/account/export')).status).toBe(401);
  });

  test('the same email and password no longer sign in', async () => {
    const credentials = {
      email: `gone-${crypto.randomUUID()}@example.com`,
      password: 'correct-horse-battery',
    };
    const headers = { 'content-type': 'application/json', origin: ORIGIN };
    const signUp = await exports.default.fetch(`${ORIGIN}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { ...headers, 'cf-connecting-ip': '10.9.9.9' },
      body: JSON.stringify({ name: 'Léa', ...credentials }),
    });
    const cookie = (signUp.headers.getSetCookie()[0] ?? '').split(';')[0] ?? '';
    const del = await exports.default.fetch(`${ORIGIN}/api/account`, {
      method: 'DELETE',
      headers: { ...headers, cookie },
      body: JSON.stringify({ confirm: 'delete' }),
    });
    expect(del.status).toBe(200);

    const signIn = await exports.default.fetch(`${ORIGIN}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { ...headers, 'cf-connecting-ip': '10.9.9.10' },
      body: JSON.stringify(credentials),
    });
    expect(signIn.status).toBe(401);
  });

  test.each([
    ['no body', undefined],
    ['an empty object', {}],
    ['the wrong word', { confirm: 'yes' }],
    ['the wrong case', { confirm: 'DELETE' }],
  ])('refuses %s and keeps the account', async (_name, body) => {
    const user = await newUser();
    const res = await user.api('/account', { method: 'DELETE', body });
    expect(res.status).toBe(400);
    expect(ApiError.parse(await res.json()).error.code).toBe('bad_request');
    expect(await countUsers(user.id)).toBe(1);
    expect(await countRows('profiles', user.id)).toBe(1);
  });

  test('needs a session', async () => {
    const res = await anonymous('/account', confirmDelete);
    expect(res.status).toBe(401);
  });
});
