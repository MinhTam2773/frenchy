# Frenchy TODO

The single source of truth for what is done, what is next, and what we learned. Every agent reads this before starting and updates it while working (rules in `CLAUDE.md`).

- Spec: `docs/PLAN.md` · Visual spec: `design/README.md` + `design/mockups/` · Live canvas: https://claude.ai/artifact/Hguy86o9nTJ88gJ1Rvvd37
- Sections: [Legend](#legend) · [Orchestration plan](#orchestration-plan) · [DONE](#done) · [NEXT (MVP)](#next-mvp) · [BACKLOG](#backlog) · [KNOWN GAPS](#known-gaps) · [LESSONS](#lessons)

---

## Legend

**Status:** `ready` (all deps done, can start) · `blocked` (waiting on deps or a human) · `in progress` · `in review` (PR open) · `done`

**Priority:** `P0` MVP critical path · `P1` needed for MVP launch · `P2` next phase · `P3` later / nice to have

**Size (agent time, rough):** `S` < 1 h · `M` 1–3 h · `L` 3–6 h · anything bigger gets split

**Model · effort** (recommended for the agent that does the task):

| Pick | Use for |
|---|---|
| Haiku 5.5 | Mechanical edits, renames, doc touch-ups |
| Sonnet 5.5 · Medium | Small, fully specified UI or glue code |
| Sonnet 5.5 · High | Normal feature work with a clear spec: screens, tests, CI, pure logic |
| Opus 5.5 · Medium | Multi-file wiring and integration where the design is settled |
| Opus 5.5 · High | Contract-setting or design-heavy work others depend on; tricky logic; French content |
| Opus 5.5 · Extra | Reviews where a miss is costly (security, content QA), open-ended research |
| Opus 5.5 · Max | Not assigned; use only if an Extra run fails twice |

The **lead / orchestrator** session runs on Opus 5.5 · High.

**Task block format:** every task has an ID, a meta table, `Owns` (files the task may create or change), a goal, a "done when", and checkbox steps. Tick a step (`- [x]`) the moment it is done, in the same commit as the work.

**Finish steps** (the last three steps of every task):
1. `npm run check` is green (lint + typecheck + test + build).
2. TODO.md updated: steps ticked, status set, new lessons logged.
3. PR to `main` merged with CI green.

---

## Orchestration plan

Tasks in the same **wave** have no dependencies on each other and own different files, so they can run **in parallel** (one subagent, worktree or cloud session per task). Start a wave when every task it depends on is merged. A task can start early as soon as its own deps are merged, without waiting for the whole previous wave.

**Hot files** (several tasks touch them; keep edits to small additive hunks and merge `main` before opening the PR): `package.json`, `vite.config.ts`, `src/worker/index.ts` (one route-mount line per feature), `src/client/routes.tsx`, `src/client/mocks/handlers/index.ts`, `.github/workflows/ci.yml`, `TODO.md`.

**Progress:** DONE 42 · NEXT 1 (T-30 blocked on human gates H-02 to H-06) · BACKLOG 35

---

## NEXT (MVP)

Goal: course map + reader + tap-to-translate + SRS + daily streak, with Stage 1 content, installable as a PWA and deployed on Cloudflare.

### Wave 7

#### T-30 · Deploy to Cloudflare
| Priority | Model · effort | Size | Depends on | Blocks | Wave |
|---|---|---|---|---|---|
| P0 | Opus 5.5 · Medium | M | T-02, T-12, T-24, T-26, T-29, B-21 + H-02, H-05, H-06 | MVP launch | 7 |

**Status:** blocked (human gates H-02 to H-06; B-21 is done, PR #42) · **Claimed by:** — · **Branch:** `task/T-30-deploy`
**Owns:** `wrangler.jsonc` (production ids), `.github/workflows/deploy.yml`, deploy section of `README.md`
**Goal:** Frenchy is live on Cloudflare and deploys on every push to `main`.
**Done when:** the production URL passes the smoke test and the deploy workflow runs green.

- [ ] Get the user's explicit go-ahead before creating any Cloudflare resource (H-05); the user has run `wrangler login` (H-02)
- [ ] Create the production D1 database (and an R2 bucket only if something uses it); put the ids in `wrangler.jsonc`
- [ ] Apply migrations to production D1
- [ ] Set secrets with `wrangler secret put`: `BETTER_AUTH_SECRET`, Google OAuth (H-03), AI keys (H-04)
- [ ] `wrangler deploy`; smoke test: `/api/health`, sign up, one review, reader word tap
- [ ] Add the production redirect URI to the Google OAuth client
- [ ] `deploy.yml` on push to `main` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets (H-06)
- [ ] README: how to deploy and how to roll back
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

---

## KNOWN GAPS

### Needs you (human gates)

Agents can't do these. A task that needs one stays `blocked` until it's done.

| ID | What | Needed by | Status |
|---|---|---|---|
| H-01 | Make `main` the default branch on GitHub and require the `ci` check before merging. `main` is now the default branch (done); T-02 has landed, so the `ci` check can now be required | T-02 onward | open |
| H-02 | Install wrangler and run `wrangler login` once | T-30 | open |
| H-03 | Create a Google OAuth client (client id/secret, redirect URIs) | T-13 (optional locally), T-30 | open |
| H-04 | Provide AI API keys (Anthropic and/or an OpenAI-compatible provider) | T-23 (real calls), T-30 | open |
| H-05 | Approve creating Cloudflare resources (D1, R2, Worker) | T-30 | open |
| H-06 | Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to GitHub repo secrets | T-30 | open |
| H-07 | Confirm the streak rule (what counts as a practiced day; default in T-11) | T-11 (can proceed with the default) | open |
| H-08 | Decide whether to pay for a native-speaker content review | T-24 follow-up | open |
| H-09 | Pick an email provider for password reset | B-18 | open |
