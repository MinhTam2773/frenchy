# Frenchy

A phone-first French learning PWA that sits next to the book *Practice Makes Perfect: Complete French All-in-One*. Vite + React SPA and a Hono API, served by one Cloudflare Worker.

Spec: `docs/PLAN.md` · Tasks: `TODO.md` · Agent rules: `CLAUDE.md`

## Prerequisites

- Node.js LTS (22 or newer) and npm
- git

You don't need a Cloudflare account to run the app locally. Wrangler runs the Worker and D1 on your machine.

## Setup

```sh
npm install
```

Copy `.dev.vars.example` to `.dev.vars` and set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). Then create the local database:

```sh
npm run db:migrate:local
npm run db:seed:local   # optional: a demo account, demo@frenchy.local / frenchy-demo
```

## Develop

```sh
npm run dev
```

Opens Vite with the local Worker and local D1, no mocks. The SPA is at `/` and the API is under `/api/*` (try `/api/health`). `VITE_USE_MOCKS=true npm run dev` serves fixture data from MSW instead.

## Check before a PR

```sh
npm run check
```

Runs lint, typecheck, tests (client in jsdom, worker in the Workers runtime) and the production build.

Other scripts: `npm test`, `npm run test:watch`, `npm run lint`, `npm run typecheck`, `npm run format`, `npm run preview`, and `npm run cf-typegen` (regenerates `worker-configuration.d.ts` after you change `wrangler.jsonc`).

## Deploy

Production is the Worker `frenchy` at https://frenchy.tamnguyen277353.workers.dev with the D1 database `frenchy` (id in `wrangler.jsonc`). Email sign-in needs the Workers Paid plan: scrypt takes far more than the Free plan's 10 ms of CPU.

Every push to `main` deploys itself: once `ci` passes, `.github/workflows/deploy.yml` builds, applies new migrations, runs `wrangler deploy` and checks `/api/health`. It needs the repo secrets `CLOUDFLARE_API_TOKEN` (Workers Scripts and D1 edit) and `CLOUDFLARE_ACCOUNT_ID`.

By hand, after `npx wrangler login`:

```sh
npm run build
npx wrangler d1 migrations apply frenchy --remote
npx wrangler deploy
```

Secrets and settings live only in Cloudflare: `npx wrangler secret put <NAME>` (names in `.dev.vars.example`). Production uses Gemini through the OpenAI-compatible driver: both `AI_*_PROVIDER` are `openai-compatible`, `OPENAI_COMPATIBLE_BASE_URL` is `https://generativelanguage.googleapis.com/v1beta/openai`, `OPENAI_COMPATIBLE_MODEL` is `gemini-3.8-flash`, and the key comes from Google AI Studio. Google sign-in uses the OAuth client in Google Cloud project `frenchy-513316` (redirect URI `/api/auth/callback/google`).

### Roll back

- **Code:** `npx wrangler rollback` returns to the previous version (`npx wrangler deployments list` shows them). Then revert the commit on `main`, or the next push deploys it again.
- **Data:** migrations only go forward. To undo a bad one, write a new migration. To restore the database to an earlier minute (up to 30 days back), use D1 Time Travel: `npx wrangler d1 time-travel restore frenchy --timestamp=<unix seconds or RFC 3339>`.
