# Frenchy

A phone-first French learning PWA that sits next to the book *Practice Makes Perfect: Complete French All-in-One*. Vite + React SPA and a Hono API, served by one Cloudflare Worker.

Spec: `docs/PLAN.md` · Tasks: `TODO.md` · Agent rules: `CLAUDE.md`

## Prerequisites

- Node.js LTS (22 or newer) and npm
- git

You don't need a Cloudflare account to run the app locally. Wrangler runs the Worker, D1 and R2 on your machine.

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
