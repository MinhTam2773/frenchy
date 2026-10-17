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

Copy `.dev.vars.example` to `.dev.vars` once later tasks need secrets.

## Develop

```sh
npm run dev
```

Opens Vite with the local Worker. The SPA is at `/` and the API is under `/api/*` (try `/api/health`).

## Check before a PR

```sh
npm run check
```

Runs lint, typecheck, tests (client in jsdom, worker in the Workers runtime) and the production build.

Other scripts: `npm test`, `npm run test:watch`, `npm run lint`, `npm run typecheck`, `npm run format`, `npm run preview`, and `npm run cf-typegen` (regenerates `worker-configuration.d.ts` after you change `wrangler.jsonc`).
