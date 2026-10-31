# Frenchy TODO

What is next and what needs the user. Every agent reads this before starting and updates its own task block while working (rules in `CLAUDE.md`).

- Elsewhere:
  - Finished tasks: `DONE.md`
  - Later tasks: `BACKLOG.md`
  - Lessons: `LESSONS/`, one file each
  - Gaps and risks: `KNOWNGAPS/`, one file each

  Grep those folders; don't read them end to end.
- Spec: `docs/PLAN.md` · Visual spec: `design/README.md` + `design/mockups/` · Live canvas: https://claude.ai/artifact/Hguy86o9nTJ88gJ1Rvvd37
- Sections: [Legend](#legend) · [Orchestration plan](#orchestration-plan) · [NEXT (MVP)](#next-mvp) · [Needs you](#needs-you)

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
1. `npm run check` is green (lint + typecheck + content check + test + build + the `dist/` secrets check).
2. TODO.md updated (steps ticked, status set); new lessons and gaps added to `LESSONS/` and `KNOWNGAPS/`.
3. PR to `main` merged with CI green.

---

## Orchestration plan

Tasks in the same **wave** have no dependencies on each other and own different files, so they can run **in parallel** (one subagent, worktree or cloud session per task). Start a wave when every task it depends on is merged. A task can start early as soon as its own deps are merged, without waiting for the whole previous wave.

**Dispatching a task:**
- **Brief:** the lead pastes the full text of the lessons and gaps that apply into the agent's brief. It finds them by grepping `LESSONS/` and `KNOWNGAPS/` for the task ID, its area and the paths in its `Owns` list (commands in each folder's `CLAUDE.md`).
- **Reserved numbers:** the lead reserves L-, G- and B- numbers for each parallel task (L-22).
- **Backlog tasks:** a backlog task's block moves from `BACKLOG.md` into NEXT when it is dispatched.

The waves so far are recorded in `DONE.md` → History.

**Next in line** (after Wave 7b): B-43, B-44 (more `content:check` rules), B-49 + B-50 (session), B-47 (after B-08), B-31.

**Hot files** (several tasks touch them; keep edits to small additive hunks and merge `main` before opening the PR): `package.json`, `vite.config.ts`, `src/worker/index.ts` (one route-mount line per feature), `src/client/routes.tsx`, `src/client/mocks/handlers/index.ts`, `.github/workflows/ci.yml`, `TODO.md`, `BACKLOG.md`.

**Progress:** DONE 49 · NEXT 1 (T-30 in progress) · BACKLOG 36 · open gaps 50 (9 with no owner)

---

## NEXT (MVP)

Goal: course map + reader + tap-to-translate + SRS + daily streak, with Stage 1 content, installable as a PWA and deployed on Cloudflare.

### Wave 7

#### T-30 · Deploy to Cloudflare
| Priority | Model · effort | Size | Depends on | Blocks | Wave |
|---|---|---|---|---|---|
| P0 | Opus 5.5 · Medium | M | T-02, T-12, T-24, T-26, T-29, B-21 + H-02, H-05, H-06 | MVP launch | 7 |

**Status:** in progress (waiting on the Google client secret and the user's sign-up smoke test) · **Claimed by:** Claude Code desktop session (with the user) · **Branch:** `task/T-30-deploy`
**User decisions (2026-10-30):** use the default for every open question under Needs you; Workers Paid approved and active (G-35); go-ahead to create Cloudflare resources given (H-05).
**Owns:** `wrangler.jsonc` (production ids), `.github/workflows/deploy.yml`, deploy section of `README.md`
**Goal:** Frenchy is live on Cloudflare and deploys on every push to `main`.
**Done when:** the production URL passes the smoke test and the deploy workflow runs green.

- [x] Get the user's explicit go-ahead before creating any Cloudflare resource (H-05); the user has run `wrangler login` (H-02)
- [x] Create the production D1 database (and an R2 bucket only if something uses it); put the ids in `wrangler.jsonc` (D1 `frenchy`, region WNAM; nothing uses R2, so the `AUDIO` binding is removed)
- [x] Apply migrations to production D1 (0000 to 0004)
- [ ] Set secrets with `wrangler secret put`: `BETTER_AUTH_SECRET`, Google OAuth (H-03), AI keys (H-04) (`BETTER_AUTH_SECRET` set, random, never printed. AI: Gemini through the `openai-compatible` driver, model `gemini-3.8-flash`, key pasted by the user. Google waits on the client secret)
- [ ] `wrangler deploy`; smoke test: `/api/health`, sign up, one review, reader word tap (deployed to https://frenchy.tamnguyen277353.workers.dev; `/api/health` 200, `/api/*` navigation returns JSON, `/`, `/course`, `sw.js`, manifest carry the four `_headers` (G-84), welcome screen renders with no console errors. Sign up, review and word tap wait on Workers Paid (G-35) and are for the user: agents don't create accounts on production)
- [x] Add the production redirect URI to the Google OAuth client (project `frenchy-513316`, client "Frenchy web"; the consent screen is in Testing with the user as the only test user, G-103, B-68)
- [ ] `deploy.yml` on push to `main` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets (H-06) (workflow written: runs after `ci` passes on a push to `main`; both secrets set 2026-10-31; first run happens when PR #62 merges)
- [x] README: how to deploy and how to roll back
- [x] Finish: `npm run check` green (1172/1173 in the full run; the one failure, ReaderPage "Finish reading", is the L-74 load flake and passes alone, 17/17)
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

### Wave 7b

Wave 7b is done (B-54, B-55, B-53, B-29, B-19, B-08, B-56 moved to `DONE.md`; PRs #51 to #57).

---

## Needs you

### Human gates

Agents can't do these. A task that needs one stays `blocked` until it's done.

| ID | What | Needed by | Status |
|---|---|---|---|
| H-01 | Make `main` the default branch on GitHub and require the `ci` check before merging. `main` is now the default branch (done); T-02 has landed, so the `ci` check can now be required | T-02 onward | open |
| H-02 | Install wrangler and run `wrangler login` once | T-30 | done (2026-10-30) |
| H-03 | Create a Google OAuth client (client id/secret, redirect URIs) | T-13 (optional locally), T-30 | done (2026-10-31; publishing it is B-68) |
| H-04 | Provide AI API keys (Anthropic and/or an OpenAI-compatible provider) | T-23 (real calls), T-30 | done (2026-10-31, Gemini) |
| H-05 | Approve creating Cloudflare resources (D1, R2, Worker) | T-30 | done (2026-10-30) |
| H-06 | Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to GitHub repo secrets | T-30 | done (2026-10-31) |
| H-07 | Confirm the streak rule (what counts as a practiced day; default in T-11) | T-11 (can proceed with the default) | open |
| H-08 | Decide whether to pay for a native-speaker content review | T-24 follow-up | open |
| H-09 | Pick an email provider for password reset | B-18 | open |

### Open questions

Decisions only the user can make. Agents use the default until one is answered. The full text is under the task named in brackets.

1. **Email sign-in needs Workers Paid (G-35).**
   - The problem: scrypt takes about 130 to 310 ms of CPU per sign-in, and the Free plan allows 10 ms.
   - Default: keep scrypt and deploy on Workers Paid.
   - Alternative on the Free plan: Google-only sign-in.
   - **Decided 2026-10-30:** Workers Paid, keep scrypt (the account is on Paid).
2. **AI daily cap.**
   - `AI_DAILY_LIMIT` is the number of provider calls per UTC day for the whole app. Default: 1,000.
   - Also set a monthly spend limit in the provider's console (H-04).
   - Needed before real keys go live in T-30. (QUESTION under T-29; B-27 in `DONE.md`.)
3. **Saved cards and the daily new-card cap.**
   - A word saved in the reader counts against `NEW_CARDS_PER_DAY` (10).
   - Should saved cards skip the cap? Default: no. (QUESTION under T-26 in `DONE.md`.)
4. **Where an archived lexicon dump may live (G-65).**
   - kaikki.org serves only its latest extract, and the dump can't be committed (rule 5).
   - Blocks B-30, which B-10 waits on.
5. **Write burst limit (B-40).**
   - For example, 120 writes per user per 60 s.
   - Needed before the app is shared publicly.
6. **Stage 1 grammar ceiling (G-57).**
   - Keep the strict ceiling (early texts read stiff), or loosen `content/grammar.json`.
   - Decide before Stage 2 content (B-10).
7. **Reviews kept offline for more than 24 h (G-102).**
   - The server refuses a review whose `reviewedAt` is over 24 h old (G-61).
   - Default (B-08): drop it, say so in the banner, and keep the card due.
   - Alternative: a 7-day window for reviews only; the grade is kept, but a late sync counts reviews on a past day and can change the streak calendar afterwards.
8. **Looking a word up on a review card (G-99).**
   - Tapping a word on the front shows its meaning, and the grade still counts in full.
   - Default (B-19): leave it to the learner. Alternative: cap the grade after a look-up (for example, no Easy).
9. **Save a word from the review sheet (B-66).**
   - Should the review word sheet offer "Save word" once the answer is shown? Default: no (B-66 waits on this).
