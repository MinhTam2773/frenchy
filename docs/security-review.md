# Security review (T-29)

A review of the MVP before anything is public: the Worker API (`src/worker/**`), Better Auth, the AI layer, the build output and the client bundle, as merged on `main` after T-26 (PR #36). It was done by an agent that didn't write the code under review. Every P0 and P1 finding is fixed on the branch `task/T-29-security`. The rest are listed with their owner task, or as accepted with the reason.

## How it was checked

- **Code reading:** every route, middleware and helper under `src/worker/`, the shared request schemas, the auth setup, the AI prompts, drivers, cache and limits, `vite.config.ts`, `wrangler.jsonc`, the CI workflow and `.gitignore`. The Better Auth 1.7.10, Hono 4.13 and Cloudflare Vite plugin 1.64 sources in `node_modules` were read wherever a default mattered (origin check, account linking, error responses, the `.dev.vars` copy).
- **Reproductions:** a build with a canary `.dev.vars` (fake values) to show G-72; a throwaway workers-pool test for the `reviews.id` collision (S-12); `vite dev` and `vite preview` against a local D1, with `curl`, for the CSRF and preview behaviour.
- **Build output:** `dist/` searched for secret names, key-shaped strings and the canary values; `npm audit`; git history searched for committed env files and key patterns (none).
- **Tests added:** `npm run check:dist`, the route guard and CSRF tests in `src/worker/index.test.ts`, the daily-cap tests in `src/worker/routes/ai.test.ts`, and two schema cases. A bug fix started with a failing test or check (output in the PR).

## Severity

| Level | Meaning | Rule |
|---|---|---|
| P0 | Secrets, another user's data or an account exposed | Fixed in this PR |
| P1 | Likely abuse with real cost or impact at launch | Fixed in this PR |
| P2 | Hardening or a misconfiguration that could bite at launch | Owner task, before the app is shared publicly |
| P3 | Low impact, or defence in depth | Fixed when cheap, otherwise accepted or later |

## Findings

| ID | Sev. | Finding | Status |
|---|---|---|---|
| S-01 | P0 | Every `vite build` copied the local secrets into `dist/frenchy/.dev.vars` (G-72) | **Fixed** |
| S-02 | P1 | No app-wide cap on AI provider calls; every new account gets its own 60 per hour (G-10) | **Fixed** (cap size: QUESTION) |
| S-03 | P2 | API writes have no burst limit, so one account can use up D1's daily writes or grow storage without bound | Open: B-40, G-77 |
| S-04 | P2 | An unset AI provider var silently serves `[mock]` answers in production (G-63) | Open: T-30 |
| S-05 | Launch blocker (license) | The CC BY-SA attribution for the lexicon is not shown in the app (G-25) | Open: B-21, before T-30 |
| S-06 | Decision | Password hashing (scrypt) needs more CPU than the Workers Free plan allows (G-35) | QUESTION; default: keep scrypt |
| S-07 | P3 | App routes had no origin check, only the `SameSite=Lax` cookie | **Fixed** |
| S-08 | P3 | `settings.voiceURI` was the one unbounded string a client could store | **Fixed** |
| S-09 | P3 | Nothing failed when a new route forgot `requireUser` | **Fixed** (guard test) |
| S-10 | P3 | No security headers on the app (CSP, framing, nosniff, referrer) and no request body cap | Open: B-39, G-78 |
| S-11 | P3 | The shared translation cache keeps every submitted text forever, and a cache hit shows that someone sent that exact text before (G-64) | Accepted for MVP; B-07, B-16 |
| S-12 | P3 | `reviews.id` is a global primary key chosen by the client: reusing another user's id is a 500 | Accepted; G-79 |
| S-13 | P3 | No email verification, so anyone can register any address | Open: B-18 (G-08) |
| S-14 | P3 | Sign-up says when an email is already registered (422) | Accepted |
| S-15 | P3 | Password policy is 8 to 128 characters with no breached-password check | Accepted; later |
| S-16 | P3 | `BETTER_AUTH_URL` unset means the base URL comes from the request | Open: T-30 sets it |
| S-17 | P3 | User tables have no foreign key to `user.id` (G-36) | Open: B-16 |
| S-18 | P3 | Client instants are trusted within 24 h back and 5 min ahead (G-61) | Accepted |
| S-19 | P3 | `npm audit`: 4 moderate, all in drizzle-kit's esbuild chain | Accepted (dev tool, not shipped) |

### S-01 · P0 · Local secrets in every build (G-72) · fixed

- **Evidence:** `@cloudflare/vite-plugin` 1.64 (`dist/index.mjs`, `output-config` plugin) emits `.dev.vars` into the Worker's output folder in `generateBundle`, so `vite preview` has the secrets. It takes them from `.dev.vars`, or `.env` / `.env.local` when there is no `.dev.vars`, or all of `process.env` when `CLOUDFLARE_INCLUDE_PROCESS_ENV=true`. With a canary `.dev.vars`, `npm run build` wrote `dist/frenchy/.dev.vars` with both values (`npm run check:dist` output in the PR).
- **Impact:** `wrangler deploy` doesn't upload that file, but anything that archives or uploads `dist/` (a CI artifact, a static host, a zip sent for debugging) would ship `BETTER_AUTH_SECRET` (session signing) and the AI keys.
- **Fix:** `vite.config.ts:17-32`. A `keep-local-secrets-out-of-dist` plugin (`enforce: 'post'`) deletes `.dev.vars` from every bundle before it is written. For `vite preview` only, it loads the root `.dev.vars` into `process.env` and sets `CLOUDFLARE_INCLUDE_PROCESS_ENV`, so preview still has the secrets (checked: sign-up works in `vite preview`).
- **Proof that stays:** `scripts/security/check-dist.ts` (`npm run check:dist`, now part of `npm run check`) fails on any `.dev.vars*` / `.env*` file in `dist/`, and on any value of a `*SECRET*`, `*KEY*`, `*TOKEN*` or `*PASSWORD*` entry of the local env files found in any file under `dist/`. CI writes a canary `.dev.vars` before `npm run build` and runs the check after it, so a regression fails every PR.
- **Also:** `.gitignore` now covers `.env`, `.env.*` and `.dev.vars.*` (keeping `.dev.vars.example`), because wrangler reads secrets from those too.

### S-02 · P1 · No app-wide AI spend cap (G-10) · fixed

- **Evidence:** `src/worker/ai/rate-limit.ts` (T-23) limited each user to 60 provider calls per clock hour. Sign-up needs no verification and allows 5 attempts per IP per minute, so a script with a few IPs gets hundreds of accounts an hour, each with its own 60 calls, each call up to `max_tokens` 8,000 (`src/worker/ai/drivers.ts:11`).
- **Fix (B-27's scope):** `ai_daily_usage` (`migrations/0003_ai_daily_usage.sql`, `aiDailyUsageDb` in `src/worker/db/index.ts`) counts provider calls per UTC day for the whole app. Past `AI_DAILY_LIMIT` (a Worker var, default 1,000; `dailyLimit()`), every cache miss gets `429 rate_limited` with `Retry-After` until the next UTC day, while cache hits are still served. One warning is logged at 80 %. The per-user hourly limit is checked first (`src/worker/routes/ai.ts:69-83`), so a user who is already limited can't use up everyone's allowance. Tests: `ai.test.ts` → "daily cap for the whole app".
- **Bound:** at most `AI_DAILY_LIMIT` × (500 input characters + 8,000 output tokens) per day. Also set a monthly spend limit in the provider's console when the keys are created (H-04).
- **QUESTION** under T-29: the cap's number.

### S-03 · P2 · No burst limit on API writes · open (B-40, G-77)

- **Evidence:** only `/api/auth/sign-*` (Better Auth, per IP) and `/api/ai/*` (per user) are rate-limited. `POST /api/reviews` writes 3 rows per call (`src/worker/routes/reviews.ts:48-61`), `POST /api/cards` one row per new front (`cards.ts:117`), `POST /api/activity/ping` up to 2 rows for each of the 1,440 minutes in its 24 h window (`activity.ts:39`).
- **Impact:** availability and cost, not data. A single account scripting reviews can use up the Free plan's daily D1 write allowance, after which every learner's writes fail until the next day; on the Paid plan it costs money and grows storage.
- **Fix (B-40):** a per-user burst limit on writes with the Workers Rate Limiting binding (L-89: the binding suits short bursts), plus a Cloudflare rate-limiting rule on `/api/*` at T-30. It needs a `wrangler.jsonc` binding (T-30's file) and limits the user agrees with, so it isn't done here.

### S-04 · P2 · Unset AI provider means mock answers in production (G-63) · open (T-30)

- **Evidence:** `src/worker/ai/config.ts:27` falls back to `mock` when `AI_TRANSLATE_PROVIDER` / `AI_EXPLAIN_PROVIDER` are unset, and `ai.test.ts` pins that behaviour.
- **Decision:** not changed here. The Worker has no reliable "this is production" signal today, and making `mock` explicit-only would break every existing local `.dev.vars` (the user's included) and the E2E runs T-27 is building in parallel, for a misconfiguration T-30 already has a step for. **T-30 must** set both vars with the keys, and its smoke test must call `/api/ai/explain` and fail on an answer that starts with `[mock]`. If wanted later: make unset a `500 AI is not configured` and put `AI_*_PROVIDER=mock` in `.dev.vars.example` and the test bindings.

### S-05 · Launch blocker (license) · lexicon attribution not shown (G-25) · open (B-21)

- **Evidence:** no text from `docs/LICENSES.md` appears in `src/client/**` or `dist/client`, while the 54 lexicon shards ship as public JS chunks (`dist/client/assets/forms-*.js`, `lemmas-*.js`).
- **Verdict:** not a security defect, but a blocker for any deploy other people can open: CC BY-SA 4.0 requires visible attribution when the data is distributed. B-21 (P1, "needed before T-30") covers it, but T-30's `Depends on` doesn't list B-21. The lead should add it (and B-40 if S-03 is to be fixed before sharing).

### S-06 · Decision · scrypt CPU vs the Workers Free plan (G-35)

- **Evidence:** Better Auth hashes with scrypt (N=16384, r=16, p=1), about 130 to 310 ms of CPU per sign-up or sign-in in local workerd (T-13); the Free plan allows 10 ms per request.
- **Security view:** keep these parameters. Cheaper hashing makes a leaked `account` table much easier to crack offline, and the sign-in rate limit (5 per IP per minute) already bounds the CPU an attacker can make us spend. The recommendation is the Workers Paid plan. **QUESTION** under T-29 (same decision as the open QUESTION under T-13).

### S-07 · P3 · No origin check on app routes · fixed

- **Evidence:** Better Auth checks `Origin` on its own cookie-bearing writes (`better-auth/dist/api/middlewares/origin-check.mjs`), but `/api/profile`, `/api/cards`, `/api/reviews`, `/api/words`, `/api/activity` and `/api/ai` relied on the `SameSite=Lax` cookie alone. `readJson` parses the body whatever the content type, so a cross-site `<form enctype="text/plain">` could post JSON-looking text if a browser ever attached the cookie (old browsers, a SameSite bug).
- **Fix:** Hono's `csrf()` on `/api` (`src/worker/index.ts:16`). An unsafe request with a form-type content type (or none) must carry `Sec-Fetch-Site: same-origin` or our own `Origin`; JSON writes already need a CORS preflight, and no route sends CORS headers. Test: `index.test.ts` → "a cross-site form-type write is refused even with a session cookie". Checked in `vite dev`: the body-less same-origin `POST /api/cards/starter/:id` still answers 200, with or without `Sec-Fetch-Site`.

### S-08 · P3 · Unbounded `settings.voiceURI` · fixed

`ProfileSettings.voiceURI` had no maximum (`src/shared/schemas/user.ts:9`), so a client could store a string of any size in its profile row. Now at most 500 characters; two schema cases in `schemas.test.ts`. Every other body, query and path field already had a bound, an enum or a pattern.

### S-09 · P3 · No guard for routes without a session · fixed

The 401 test in `sync-common.test.ts` lists endpoints by hand, so a new route that forgot `requireUser` would pass. `index.test.ts` → "every API route except the public ones needs a session" walks `app.routes` and expects 401 from every handler except `PUBLIC_ROUTES` (`/api/health`, `/api/auth/config`, `/api/auth/*`).

### S-10 · P3 · No security headers or body cap · open (B-39, G-78)

- The static app is served with no `Content-Security-Policy`, `X-Frame-Options` / `frame-ancestors`, `X-Content-Type-Options` or `Referrer-Policy`. No XSS sink was found (React escapes everything, no `dangerouslySetInnerHTML`, `innerHTML` or `eval`), and no screen has a one-click destructive action worth framing, so this is defence in depth.
- Request bodies are parsed whole before validation, with no size cap (the largest real body is a card, about 1.5 KB).
- **Fix (B-39):** a `public/_headers` file and Hono's `bodyLimit` on `/api`. It is not done here because a CSP needs a check in `vite preview` and E2E (Google Fonts, the service worker, the manifest), and `vite dev` doesn't apply `_headers`.

### S-11 · P3 · Shared translation cache (G-64) · accepted for MVP

- **Evidence:** `translation_cache` stores the normalized text and the answer for every cache miss, for every user, with no expiry (`src/worker/ai/cache.ts:43-50`). A hit is free and fast, so a user can test whether someone sent an exact text before.
- **Why accepted:** in the MVP the client sends only lesson sentences (public content). Nobody else can read a row without sending the same text, and an answer can't be poisoned for others: the key is the hash of the exact text plus the chapter, so injected instructions change the key.
- **Before B-07 (import):** imported text needs a per-user cache or no stored text, and a TTL. B-16 (account deletion) can't remove these rows because they hold no user id.

### S-12 · P3 · Client-chosen global `reviews.id` · accepted (G-79)

`reviews.id` is the table's primary key (`src/worker/db/schema.ts:67`) and the client picks it (`ReviewInput.id`). When user B posts a review with an id user A already used, `alreadyApplied` finds nothing for B, the insert conflicts and B gets a 500 (reproduced). Nothing of A's is shown or changed, and ids are random UUIDs, so this is self-inflicted. A composite key `(user_id, id)` would fix it; it needs a table rebuild, so it waits for B-08 (offline reviews), which reworks review ids anyway.

### S-13 to S-18 · P3 · auth and data details

- **S-13 no email verification (B-18, G-08):** anyone can sign up with someone else's address. Better Auth 1.7 refuses to link a Google login to an unverified local account (`requireLocalEmailVerified` defaults to true, `better-auth/dist/oauth2/link-account.mjs`), so there is no account pre-hijacking; the owner of the address just can't use Google for it either until B-18 verifies emails.
- **S-14 email enumeration:** sign-up answers 422 for a known email (`auth.test.ts:106`). Normal for a consumer app and rate-limited to 5 per IP per minute; accepted.
- **S-15 password policy:** 8 to 128 characters (`src/worker/auth/index.ts:42`, Better Auth's default maximum). A breached-password check (Better Auth's Have I Been Pwned plugin) would send a hash prefix to an outside service: a later choice for the user.
- **S-16 base URL:** `baseURL` falls back to the request's origin (`src/worker/auth/index.ts:39`). Cloudflare routes by host, so the host can't be forged, but T-30 should set `BETTER_AUTH_URL` so the OAuth callback and trusted origin don't depend on which hostname (custom domain or `workers.dev`) a request used.
- **S-17 no foreign keys (G-36):** no route deletes users today and Better Auth's `delete-user` endpoint is off by default. B-16 must delete every user table through `scopedDb` (or add the foreign keys) together with the sessions and accounts.
- **S-18 client instants (G-61):** reviews, pings and readings accept a client time from 24 h back to 5 min ahead (`CLIENT_INSTANT_WINDOW`). A learner can only reshape their own streak; accepted.

### S-19 · P3 · `npm audit` · accepted

4 moderate findings, all one chain: `drizzle-kit` → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` → `esbuild` 0.18 (GHSA-67mh-4wv8-2f99, a CORS issue in esbuild's dev server). drizzle-kit is a CLI (devDependency, and an optional peer of Better Auth); none of it is in the Worker or the client bundle (checked in `dist/`). `npm audit fix --force` would downgrade drizzle-kit to 0.18, so it waits for drizzle-kit to drop `@esbuild-kit`.

## Checked, no finding

- **User scoping:** every route reaches user rows only through `userDb(c)` / `scopedDb(db, c.var.user.id)`; `src/worker/routes/ai.ts` uses the raw `Db` only for the shared `translationCacheDb` and the new `aiDailyUsageDb`. `scopedTable` ANDs the user filter into every select, update and delete and fills `user_id` on insert; request bodies are parsed by non-passthrough zod objects, so a `userId` field is dropped. The T-22 tests prove cross-user isolation per endpoint.
- **Session cookie:** `better-auth.session_token` is `HttpOnly; SameSite=Lax`, `Secure` with the `__Secure-` prefix over https (T-13 tests), 7-day `Max-Age` refreshed once a day, revoked on sign-out.
- **Auth abuse:** 5 sign-in and 5 sign-up attempts per IP per minute, stored in D1, with the IP from `cf-connecting-ip`, which Cloudflare overwrites (`src/worker/auth/index.ts:22,45-51`). A forged cookie is a 401. Better Auth's CORS answers only its trusted origins, and our routes send no CORS headers.
- **Errors:** our routers answer a generic `internal` body (`sync-common.ts`, `routes/ai.ts`), Better Auth an empty 500, Hono plain `Internal Server Error`; details go only to the log. 400 bodies list zod issues for the caller's own input.
- **AI:** learner text goes in as a JSON string field with a rule never to follow instructions inside it (`src/worker/ai/prompts.ts:27`); input is at most 500 characters (`MAX_AI_TEXT_LENGTH`); explain output must parse as `ExplainResponse` (one retry, else 502); keys live only in Worker secrets and the drivers have a 20 s timeout. The client renders AI text as text.
- **Client bundle:** no secret values or key-shaped strings in `dist/client` (the only matches for `BETTER_AUTH` are Better Auth's own `process.env` getters, empty in a browser); no source maps; only `VITE_USE_MOCKS` is read from `import.meta.env`. The service worker never caches `/api/*` (network-only), so no user data stays on a shared device after sign-out.
- **Repo:** no env or key file in git history; the demo seed (`demo@frenchy.local`) runs only against the local D1 (`getPlatformProxy`, no remote bindings); CI has `permissions: contents: read` and uses only GitHub's own actions.
- **Worker size (G-62, G-70):** `dist/frenchy/index.js` is 2.46 MB raw, 478 KB gzipped, under the 3 MB limit; B-33 shrinks it.

## Before T-30

1. Answer the two QUESTIONs under T-29 (daily AI cap, Workers Paid for scrypt).
2. Land B-21 (attribution); add it to T-30's `Depends on`.
3. In T-30: set `BETTER_AUTH_URL`, both `AI_*_PROVIDER` vars and the keys; smoke-test `/api/ai/explain` for a non-`[mock]` answer; set a provider spend limit; never upload `dist/` as an artifact (`npm run check:dist` guards it anyway).
4. Before sharing the link widely: B-40 (write burst limit) and B-39 (headers, body cap).
