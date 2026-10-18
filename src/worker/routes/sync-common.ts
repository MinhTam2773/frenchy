import type { Context } from 'hono';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';
import {
  Card,
  CLIENT_INSTANT_MESSAGE,
  clampClientInstant,
  Profile,
  type ApiError,
  type ApiErrorCode,
} from '../../shared/schemas';
import { createDb, scopedDb, type ScopedDb, type schema } from '../db';
import { requireUser, type UserEnv } from '../middleware/session';

// Shared by the T-22 sync routes (profile, cards, reviews, words, activity).

/** Thrown inside a route; `onApiError` turns it into the contract's `ApiError` body. */
export class ApiFailure extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ApiErrorCode,
    message: string,
    readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new ApiFailure(404, 'not_found', `${what} not found`);

function onApiError(err: Error, c: Context): Response {
  if (err instanceof ApiFailure) {
    const body: ApiError = { error: { code: err.code, message: err.message } };
    if (err.issues) body.error.issues = err.issues;
    return c.json(body, err.status);
  }
  console.error(err);
  const body: ApiError = { error: { code: 'internal', message: 'Something went wrong' } };
  return c.json(body, 500);
}

/** A sub-app where every route needs a signed-in user and errors use the contract's shape. */
export function syncRouter() {
  return new Hono<UserEnv>().use(requireUser).onError(onApiError);
}

/** The signed-in user's data; the only way these routes reach D1. */
export function userDb(c: Context<UserEnv>): ScopedDb {
  return scopedDb(createDb(c.env.DB), c.var.user.id);
}

/** Parses request input with a contract schema, or throws `400 bad_request` with the issues. */
export function parseInput<S extends z.ZodType>(
  schema: S,
  value: unknown,
  what: string,
): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new ApiFailure(
    400,
    'bad_request',
    `Invalid ${what}`,
    result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  );
}

export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ApiFailure(400, 'bad_request', 'Body must be JSON');
  }
}

/** Responses are checked against their schema too (docs/api-contract.md, "Validation"). */
export function respond<S extends z.ZodType>(
  c: Context,
  schema: S,
  data: z.input<S>,
  status: ContentfulStatusCode = 200,
) {
  return c.json(schema.parse(data) as object, status);
}

/**
 * A client-reported instant, clamped to the server's `now`. Far past or future values are
 * refused: they would be stored as a day of activity years away and stretch the streak calendar.
 */
export function clientInstant(at: number, now: number, field: string): number {
  const clamped = clampClientInstant(at, now);
  if (clamped === null) {
    throw new ApiFailure(400, 'bad_request', 'Invalid body', [
      { path: field, message: CLIENT_INSTANT_MESSAGE },
    ]);
  }
  return clamped;
}

export async function loadProfile(db: ScopedDb): Promise<Profile> {
  const row = await db.profiles.select().get();
  if (!row) throw notFound('Profile');
  // `Profile` is not strict, so this also drops the row's `userId` and timestamps.
  return Profile.parse(row);
}

type CardRow = typeof schema.cards.$inferSelect;

/** D1 row → contract `Card`. `Card` is not strict, so the row's extra columns are dropped. */
export function toCard(row: CardRow): Card {
  return Card.parse({
    ...row,
    source: { kind: row.sourceKind, ref: row.sourceRef },
    clozeAnswer: row.clozeAnswer ?? undefined,
    hint: row.hint ?? undefined,
    note: row.note ?? undefined,
  });
}

/** Contract card fields → D1 columns. */
export function toCardRow({ source, ...card }: Card) {
  return { ...card, sourceKind: source.kind, sourceRef: source.ref };
}
