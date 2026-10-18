import { z } from 'zod';
import {
  ApiError,
  AuthConfig,
  Card,
  CardStats,
  DailyActivity,
  DueCardsResponse,
  ExplainResponse,
  Profile,
  Reading,
  ReadingsResponse,
  StarterDeckResult,
  StreakResponse,
  TranslateResponse,
  WordStatus,
  WordsResponse,
  type ApiErrorCode,
  type CardCreate,
  type ProfilePatch,
  type ReviewInput,
} from '@shared/schemas';

/** Every failed call rejects with this: our `ApiError` body, a network failure or a bad response. */
export class ApiClientError extends Error {
  constructor(
    readonly code: ApiErrorCode | 'network' | 'invalid_response',
    message: string,
    /** HTTP status; 0 when the request never got an answer. */
    readonly status: number,
    readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Absolute so the same code runs in the browser and in jsdom tests (fetch needs a full URL there).
const base = globalThis.location?.origin ?? '';

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  400: 'bad_request',
  401: 'unauthorized',
  404: 'not_found',
  429: 'rate_limited',
  502: 'upstream_error',
};

async function failure(res: Response): Promise<ApiClientError> {
  const parsed = ApiError.safeParse(await res.json().catch(() => null));
  if (parsed.success) {
    const { code, message, issues } = parsed.data.error;
    return new ApiClientError(code, message, res.status, issues);
  }
  return new ApiClientError(CODE_BY_STATUS[res.status] ?? 'internal', res.statusText, res.status);
}

/** Await a response, return its JSON checked against `schema`, or throw `ApiClientError`. */
export async function readJson<S extends z.ZodType>(
  response: Promise<Response>,
  schema: S,
): Promise<z.output<S>> {
  let res: Response;
  try {
    res = await response;
  } catch {
    throw new ApiClientError('network', 'Could not reach the server', 0);
  }
  if (!res.ok) throw await failure(res);
  const parsed = schema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiClientError('invalid_response', 'Unexpected response', res.status);
  }
  return parsed.data;
}

type Init = { method?: 'POST' | 'PUT' | 'PATCH'; body?: unknown };

function call<S extends z.ZodType>(path: string, schema: S, { method, body }: Init = {}) {
  const init: RequestInit =
    body === undefined
      ? { method }
      : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
  return readJson(fetch(`${base}/api${path}`, init), schema);
}

const Health = z.object({ ok: z.literal(true) });

/**
 * One typed function per endpoint in `docs/api-contract.md`; inputs and outputs are the shared
 * schemas. This is not `hc<AppType>`: the app tsconfig can't load the Worker's types (`Env`, D1),
 * and AppType only lists the routes mounted so far (see L-32).
 */
export const api = {
  health: () => call('/health', Health),
  auth: {
    config: () => call('/auth/config', AuthConfig),
  },
  profile: {
    get: () => call('/profile', Profile),
    patch: (patch: ProfilePatch) => call('/profile', Profile, { method: 'PATCH', body: patch }),
  },
  cards: {
    due: (limit?: number) =>
      call(`/cards/due${limit === undefined ? '' : `?limit=${limit}`}`, DueCardsResponse),
    stats: () => call('/cards/stats', CardStats),
    create: (card: CardCreate) => call('/cards', Card, { method: 'POST', body: card }),
    addStarterDeck: (chapterId: string) =>
      call(`/cards/starter/${chapterId}`, StarterDeckResult, { method: 'POST' }),
  },
  reviews: {
    create: (review: ReviewInput) => call('/reviews', Card, { method: 'POST', body: review }),
  },
  words: {
    list: () => call('/words', WordsResponse),
    put: (lemma: string, status: WordStatus['status']) =>
      call(`/words/${encodeURIComponent(lemma)}`, WordStatus, { method: 'PUT', body: { status } }),
  },
  activity: {
    ping: (at: number) => call('/activity/ping', DailyActivity, { method: 'POST', body: { at } }),
    readings: () => call('/activity/readings', ReadingsResponse),
    addReading: (reading: Reading) =>
      call('/activity/readings', Reading, { method: 'POST', body: reading }),
  },
  streak: () => call('/streak', StreakResponse),
  ai: {
    translate: (text: string) =>
      call('/ai/translate', TranslateResponse, { method: 'POST', body: { text } }),
    explain: (sentence: string, chapterId: string) =>
      call('/ai/explain', ExplainResponse, { method: 'POST', body: { sentence, chapterId } }),
  },
};
