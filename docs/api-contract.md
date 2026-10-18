# API contract (MVP)

The zod schemas in `src/shared/schemas/` are the source of truth; this page maps them to routes. Import from `@shared/schemas`. Dummy data that fits every schema is in `@shared/fixtures` (for MSW handlers, seeds and tests).

To change the contract, edit the schema and both sides (client and worker) in one PR (CLAUDE.md, "Conflicts").

## Conventions

| Topic | Rule |
|---|---|
| Base path | Everything is under `/api`, same origin as the SPA. JSON in and out. |
| Auth | Session cookie from Better Auth (T-13). Every route below needs a signed-in user (`requireUser`) and answers `401 unauthorized` otherwise. Only `/api/health` and Better Auth's own `/api/auth/*` are public. |
| User scope | The user always comes from the session, never from the request. Every query goes through `scopedDb(db, userId)` (T-06). |
| Validation | The worker parses every body, query and path parameter with the schema named here and answers `400 bad_request` with `issues` on failure. Responses must match their schema too. |
| User data ids | UUID strings (`Uuid`). The server makes card ids; the client makes review ids so a retried POST is applied once. |
| Content ids | Chapter `ch10` / `appA` (`ChapterId`). Texts and deck cards `<chapterId>-<slug>`, e.g. `ch10-le-matin-de-lea` (`ContentId`). Grammar tags are dotted lowercase, e.g. `er.present` (`GrammarTagId`). |
| Instants | Integer milliseconds since the epoch, UTC (`EpochMs`). Same in D1 (`integer`). |
| Local days | `YYYY-MM-DD` in the profile's IANA time zone (`LocalDate`). Same in D1 (`text`). |
| Missing values | Optional fields are left out, never `null`. Only fields typed `.nullable()` use `null`: `Profile.currentChapterId`, `ProfileSettings.voiceURI`, `Card.lastReview`, `CardStats.nextDueAt`. |
| Lists | Wrapped in an object (`{ cards: [...] }`), so a field can be added later without breaking clients. |
| Status codes | `200` OK, `201` created, `400`, `401`, `404`, `429`, `502` (AI provider failed), `500`. |

### Errors

Every non-2xx answer from our routes has the `ApiError` body:

```json
{ "error": { "code": "bad_request", "message": "Invalid body", "issues": [{ "path": "rating", "message": "Expected 1–4" }] } }
```

| `code` | HTTP |
|---|---|
| `bad_request` | 400 |
| `unauthorized` | 401 |
| `not_found` | 404 |
| `rate_limited` | 429 |
| `upstream_error` | 502 |
| `internal` | 500 |

Better Auth's routes keep their own error format.

## Endpoints

| Method | Path | Request | Response | Owner |
|---|---|---|---|---|
| GET | `/api/health` | — | `{ ok: true }` (public) | T-01 |
| GET | `/api/auth/config` | — | `AuthConfig` (public) | T-13 |
| * | `/api/auth/*` | Better Auth | Better Auth | T-13 |
| GET | `/api/profile` | — | `Profile` | T-22 |
| PATCH | `/api/profile` | `ProfilePatch` | `Profile` | T-22 |
| GET | `/api/cards/due?limit=` | `DueCardsQuery` | `DueCardsResponse` | T-22 |
| GET | `/api/cards/stats` | — | `CardStats` | T-22 |
| POST | `/api/cards` | `CardCreate` | `Card` (201 new, 200 existing) | T-22 |
| POST | `/api/cards/starter/:chapterId` | path `ChapterId` | `StarterDeckResult` | T-22 |
| POST | `/api/reviews` | `ReviewInput` | `Card` | T-22 |
| GET | `/api/words` | — | `WordsResponse` | T-22 |
| PUT | `/api/words/:lemma` | path `Lemma`, body `WordStatusPut` | `WordStatus` | T-22 |
| POST | `/api/activity/ping` | `ActivityPing` | `DailyActivity` | T-22 |
| GET | `/api/activity/readings` | — | `ReadingsResponse` | T-22 |
| POST | `/api/activity/readings` | `Reading` | `Reading` | T-22 |
| GET | `/api/streak` | — | `StreakResponse` | T-22 |
| POST | `/api/ai/translate` | `TranslateRequest` | `TranslateResponse` | T-23 |
| POST | `/api/ai/explain` | `ExplainRequest` | `ExplainResponse` | T-23 |

### Auth

- `GET /api/auth/config` → `AuthConfig` `{ google }`: `true` only when the server has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The welcome screen hides "Continue with Google" otherwise.
- Everything else under `/api/auth/*` is Better Auth's (`/sign-up/email`, `/sign-in/email`, `/sign-in/social`, `/get-session`, `/sign-out`, ...); use `better-auth/react`'s client with the default base path. Passwords are at least 8 characters. Sign-in and sign-up allow 5 attempts per IP per minute, then answer `429`.
- The session is the `better-auth.session_token` cookie (`__Secure-better-auth.session_token` over https): httpOnly, `SameSite=Lax`, Secure on https. POSTs must come from the app's own origin or one in `BETTER_AUTH_TRUSTED_ORIGINS` (`403` otherwise).
- The first sign-in creates the `Profile` row (`currentChapterId: null`, 30 min goal, time zone from Cloudflare's guess or `UTC`).

### Profile

- `GET /api/profile` → `Profile`. T-13 creates the row on first sign-in, so it always exists; `currentChapterId` is `null` until onboarding. The user's name and email come from the Better Auth session.
- `PATCH /api/profile` with `ProfilePatch` → the whole updated `Profile`. Any subset of fields; `settings` merges key by key. The server checks that `currentChapterId` is a chapter in `course.json` (`404 not_found` otherwise).

### Cards and reviews

- `GET /api/cards/due?limit=20` → `{ cards: Card[] }`, most overdue first. `limit` is 1–100 (default 20, `DUE_LIMIT`). New cards count against `NEW_CARDS_PER_DAY` (10) per local day.
- `GET /api/cards/stats` → `CardStats`: how many cards are due now (`due`), split into `new`, `learning` (includes relearning) and `review`, with the same new-card cap as `/due`, so `due` is what a session would show. `nextDueAt` is the earliest future due time, or `null` with no cards.
- `POST /api/cards` with `CardCreate` → `Card`. Dedupes on `type` + `front`: an existing card comes back with `200`, a new one with `201`. The server sets the id and a new FSRS state (due now).
- `POST /api/cards/starter/:chapterId` → `{ added, total }`. Adds the chapter's `deck.json` cards with `source = { kind: 'starter', ref: <deck card id> }`. Idempotent: cards already added are skipped (`added: 0` the second time). `404` for an unknown chapter.
- `POST /api/reviews` with `ReviewInput` → the updated `Card`. The server recomputes the next state with T-10 (the client's preview is not trusted), updates the card, inserts the review and counts it in that day's `DailyActivity.reviews`, in one D1 batch. A repeated `id` returns the card without grading again. `404` for a card that isn't the user's.
- There is no undo route. The review screen's one-step undo (T-18) works by holding the last grade on the client and posting it when the next card is graded or the session ends (open question G-20).

Card content rules (checked by the schema):

| `type` | `front` | `back` |
|---|---|---|
| `sentence_meaning` | French | English |
| `meaning_sentence` | English | French |
| `cloze` | French with exactly one `___` (`CLOZE_BLANK`) | the front with `clozeAnswer` in the blank |

`hint` shows with the front, `note` with the back. `clozeAnswer` is only on cloze cards. FSRS fields mirror ts-fsrs 5 (`learningSteps` included; `elapsedDays` is deprecated there but still required by its `Card` type) with `state` as a string and dates as `EpochMs`.

### Words

- `GET /api/words` → `{ words: WordStatus[] }`. Words without a row are `new`.
- `PUT /api/words/:lemma` with `{ status }` → `WordStatus`. Upsert. The lemma is URL-encoded in the path (`/api/words/pr%C3%A9f%C3%A9rer`). "Save word" in the reader creates a card (`POST /api/cards`, `source.kind = 'word'`) and sets the word to `learning`.

### Activity and streak

- `POST /api/activity/ping` with `{ at }` → today's `DailyActivity`. The client sends one ping per active minute (T-16 `useActiveMinutes`); the server adds at most one minute per clock minute, so retries and two open tabs don't double-count.
- `POST /api/activity/readings` with `{ textId, finishedAt }` → `Reading`. "Finish reading" (T-25). Stores the first finish per text (later calls return it unchanged) and counts a reading in that day's `DailyActivity.readings` at most once per text per day. `404` for a text id that isn't in `content/`.
- `GET /api/activity/readings` → `{ readings: Reading[] }`, for "next unread text" (Today) and the readings list (Chapter).
- `GET /api/streak` → `StreakResponse`: the `StreakSummary` from T-11 over about the last 400 days, plus `today` (the server's local date for the profile's time zone), `todayMinutes`, and `calendar` (every day from the first active day to yesterday, plus today once it is practiced; statuses `practiced`, `freeze`, `missed`).

A day is practiced when it has at least one graded review or one finished reading (T-11 default, H-07). Minutes alone don't count.

### AI

- `POST /api/ai/translate` with `{ text }` (French, 1–500 chars, `MAX_AI_TEXT_LENGTH`) → `{ translation }` (English).
- `POST /api/ai/explain` with `{ sentence, chapterId }` → `{ translation, gloss: [{ fr, en }], notes }` (at most 2 notes). `ExplainResponse` is also the JSON the model must return; invalid output is retried once, then `502 upstream_error`.

Both are cached in `translation_cache` (key = hash of task + normalized text + level), rate-limited per user (`429 rate_limited`), and treat the text as data, never as instructions (T-23).

## Static content (not endpoints)

Course, grammar, texts, decks, notes and the lexicon are JSON in `content/`, bundled and cached by the service worker. Their schemas live in the same place: `Course`, `Grammar`, `Text`, `Deck`, `GrammarNote` (`content.ts`) and `Lexeme`, `FormEntry` (`lexicon.ts`). Content schemas are strict: unknown keys are errors.

A `Text` is `paragraphs → sentences → tokens`. Joining a sentence's token `t` values gives the sentence; sentences in a paragraph are joined by one space. A token is either a `WordToken` (`t`, `lemma`, `pos`, contextual `gloss`, optional `gender`, `form` line for the word sheet, `isNew`) or a `GapToken` (`{ t }` with only spaces and punctuation, e.g. `", "` or `" !"`). `newWords` must list exactly the lemmas of the `isNew` tokens.
