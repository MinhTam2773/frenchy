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

**Progress:** DONE 43 · NEXT 8 (Wave 7b: 7 in progress; T-30 blocked on human gates H-02 to H-06) · BACKLOG 31 · open gaps 48 (9 with no owner)

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

### Wave 7b

Seven `ready` tasks (L-77), owning different files. Merge order: B-54 (formatting only, first), B-29, B-55, B-53, B-19, B-08, B-56 (docs last, so they describe the merged code). Held back: B-43/B-44 (same file as B-29), B-49/B-50 (same file as each other), B-31 (reader, with B-19), B-47 (after B-08), B-10 (after B-29 and B-30), tasks behind a user decision, T-30 or Phase 2/3 priority.

| Task | L- | G- | B- |
|---|---|---|---|
| B-54 | L-162 to L-166 | G-91, G-92 | B-57, B-58 |
| B-29 | L-167 to L-171 | G-93, G-94 | B-59, B-60 |
| B-55 | L-172 to L-176 | G-95, G-96 | B-61, B-62 |
| B-53 | L-177 to L-181 | G-97, G-98 | B-63, B-64 |
| B-19 | L-182 to L-186 | G-99, G-100 | B-65, B-66 |
| B-08 | L-187 to L-191 | G-101, G-102 | B-67, B-68 |
| B-56 | L-192 to L-196 | G-103, G-104 | B-69, B-70 |
| lead | L-197 on | G-105 on | B-71 on |

#### B-54 · Prettier pass over files that drifted
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Haiku 5.5 | S | — | — |

**Status:** in review ([PR #51](https://github.com/MinhTam2773/frenchy/pull/51)) · **Claimed by:** Wave 7b agent (acd8767d) · **Branch:** task/B-54-prettier · **Owns:** the nine files below, `.prettierignore`
**Goal:** `npx prettier --check .` is clean, so an agent can run Prettier on its own files without reformatting someone else's (L-34, L-161).
**Done when:** `npx prettier --check .` reports no files, and the diff is formatting only.

- [x] `npx prettier --write` on `src/client/features/settings/CreditsPage.tsx`, `src/client/layouts/OfflineBanner.test.tsx`, `src/client/lib/api.test.tsx`, `src/client/lib/tts/speech.ts`, `src/client/lib/tts/useTts.test.tsx`, `src/client/lib/tts/useTts.ts`, `src/client/mocks/handlers/base.test.ts`, `src/client/ui/Button.tsx`, `src/worker/routes/cards.test.ts`
- [x] Add the generated files to `.prettierignore`: `migrations/meta/`, `public/mockServiceWorker.js`
- [x] Ask the lead whether `npm run lint` should also run `prettier --check .` (lead: separate task B-57)
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status), new lessons and gaps in `LESSONS/` and `KNOWNGAPS/`
- [ ] Finish: PR to `main` merged with CI green

#### B-29 · `content:check` enforces course-wide `isNew` and the phrase list

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P1 | Sonnet 5.5 · High | S | B-22 (same file) | B-10, B-11 (helps) |

**Status:** ready (B-22 is done) · **Owns:** `src/shared/content/validate.ts`, its tests
**Goal:** Stage 2 to 4 content follows T-24's decisions without a QA pass having to find them by hand (L-94, L-95, G-67).
**Done when:** `content:check` names the file and sentence for each case below, and Stage 1 passes.

- [ ] A lemma is `isNew` in at most one text, the first along the route (chapter order in `course.json`, then text id order), and the message names the earlier text
- [ ] A token with pos `phrase` uses a lemma from the closed list in `scripts/content/prompts/text.md` (move the list into a constant the brief points to), and has more than one word in the phrase
- [ ] A listed phrase (*il y a*, *s'il vous plaît*…) is never annotated word by word
- [ ] Tests with a tree built by `createContent` (L-75), one per rule
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-55 · `npm run check` runs `content:check`
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | Sonnet 5.5 · Medium | S | — | — |

**Status:** in review (https://github.com/MinhTam2773/frenchy/pull/52) · **Claimed by:** Wave 7b agent (B-55) · **Branch:** task/B-55-check-content · **Owns:** the `check` script in `package.json` (hot file), the `content:check` step in `.github/workflows/ci.yml` (hot file), the `npm run check` row in `CLAUDE.md`
**Goal:** A green `npm run check` means CI's checks pass too. Today CI runs `content:check` as its own step and the local check skips it, so a broken content file shows up only in CI.
**Done when:** `npm run check` fails on a broken content file, and CI runs `content:check` once.

- [x] Add `npm run content:check` to the `check` script, after `typecheck`
- [x] Kept the separate CI step (decided: CI cannot run `npm run check` as one step because it writes a canary `.dev.vars` before the build; the step is already once, between typecheck and test, so no double run)
- [x] Add `content:check` to the `npm run check` row in `CLAUDE.md`
- [x] Finish: `npm run check` green (also proved red on a broken course.json, reverted)
- [ ] Finish: TODO.md updated (steps ticked, status), new lessons and gaps in `LESSONS/` and `KNOWNGAPS/`
- [ ] Finish: PR to `main` merged with CI green

#### B-53 · Starter-deck button names its action
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | T-28 | — |

**Status:** in review (PR #53: https://github.com/MinhTam2773/frenchy/pull/53) · **Claimed by:** Wave 7b agent (B-53) · **Branch:** `task/B-53-starter-deck-name` · **Owns:** `src/client/features/chapter/StarterDeckTile.tsx`, its test, the starter-deck locators in `e2e/helpers.ts` and `e2e/a11y.spec.ts`
**Goal:** Close G-73: a screen-reader user hears what the starter-deck button does, not just "Starter deck 24 cards".
**Done when:** the button's accessible name carries the action (then the result), the status stays a live region outside the button, and the tests and E2E helpers find the button by that name.

- [x] Put the action text in the button's name, keeping visible label and name in step (WCAG 2.5.3, L-116), and move the `role="status"` out of the button
- [x] Update the E2E locators that match `/Starter deck/` (L-114)
- [x] Test: the name before and after adding; the status is announced
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status), new lessons and gaps in `LESSONS/` and `KNOWNGAPS/`
- [ ] Finish: PR to `main` merged with CI green

#### B-19 · Tap-to-translate inside review cards
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | Sonnet 5.5 · High | S | T-18, T-25 | — |

**Status:** in review ([PR #56](https://github.com/MinhTam2773/frenchy/pull/56)) · **Claimed by:** Wave 7b agent (B-19) · **Branch:** `task/B-19-review-word-sheet` · **Owns:** shared word-sheet component extraction, review card renderer changes
**Goal:** PLAN says tap-to-translate works on every surface; MVP covers only the reader.
**Done when:** French words on review cards open the same word sheet as the reader.

- [x] Move the word sheet into a shared component used by reader and review (`src/client/ui/WordPanel.tsx`, exported from the kit; Save word, Sentence and a lookup-failed message are optional)
- [x] Tokenize card text with T-15; tap opens the sheet without revealing the answer early (`tokenize()` + `annotate()` through `ReviewStage`; a one-word front stays plain until the reveal, L-184)
- [x] Tests (`WordPanel.test.tsx`, `cardWords.test.ts`, `ReviewPage.test.tsx`, `a11y.test.tsx`; `e2e/review.spec.ts`, `e2e/a11y.spec.ts`)
- [x] Finish: `npm run check` green (73 files, 1,142 tests; `precache 55 entries (1049.97 KiB)`), `main` merged
- [x] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-08 · Offline reviews
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | Opus 5.5 · High | M | T-26, T-12 | — |

**Status:** ready (deps done) · **Owns:** `src/client/lib/offline/**`, review sync changes in `src/worker/routes/reviews.ts`
**Goal:** Review on the subway: queue reviews offline and sync later without losing or double-counting any.
**Done when:** a session done offline syncs correctly on reconnect, with tests for duplicates and out-of-order replays.

- [ ] IndexedDB store for due cards and pending reviews
- [ ] Each review gets an idempotency key; the server ignores repeats
- [ ] Server replays queued reviews in `reviewed_at` order
- [ ] Offline banner and pending-count indicator
- [ ] Tests: offline → online sync, duplicates, ordering
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-56 · Refresh the docs that disagree with the code
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | Sonnet 5.5 · High | S | — | — |

**Status:** ready · **Owns:** `docs/PLAN.md`, `docs/HANDOFF.md`, `docs/api-contract.md`, `docs/LICENSES.md`, `docs/security-review.md`, `design/README.md`
**Goal:** The docs agents read agree with the code (found in the 2026-10-20 context audit). `CLAUDE.md` says PLAN wins over the mockups, so a stale PLAN misleads.
**Done when:** every item below is fixed, and nothing else in those files changes.

- [ ] `docs/PLAN.md` §4:
  - tests use `@cloudflare/vitest-plugin` (L-07);
  - the client previews intervals and the server recomputes and stores the card (T-22), not "the client computes the next due date";
  - the diagram's `/api/sync` becomes the real routes (`profile`, `cards`, `reviews`, `words`, `activity`, `streak`, `account`);
  - the dictionary license is verified (G-25, B-21);
  - the data model adds `activity_minutes`, `text_reads`, `ai_usage`, `ai_daily_usage` and `rate_limit`, and notes that `freeze_used` is not read (L-38);
  - the repo layout is no longer "planned";
  - AI routing is by env today (B-13)
- [ ] `docs/HANDOFF.md`: mark it as the 2026-10-16 snapshot from before T-01 ("No app code yet", "Start with T-01"), or fold what is still useful into PLAN §5 (ask the lead)
- [ ] `docs/api-contract.md`:
  - `/api/streak` uses every row, not "about the last 400 days" (G-31);
  - G-20 is decided, not an open question;
  - account deletion also leaves `rate_limit` and `verification` (G-86);
  - list the 403 from `csrf()` (L-122)
- [ ] `docs/LICENSES.md`:
  - the credits screen exists (B-21);
  - "What we changed" adds T-24's `GLOSS_OVERRIDES`, the œ/oe frequency join, `FREQUENCY_ALIASES` and the feminine-noun forms (CC BY-SA asks for changes to be described)
- [ ] `docs/security-review.md`: a dated status note at the top (S-05 fixed by B-21, S-10 by B-39, S-17 by B-16; "Before T-30" items 2 and 4 partly done; Worker size after B-33), leaving the T-29 report as written
- [ ] `design/README.md`:
  - screen index task IDs (T-08b → T-21, T-15 → T-16, T-16 → T-17, T-17b → T-25);
  - the MVP tab bar has 4 tabs (G-28);
  - targets are 44 px where the mockup draws less (L-18);
  - "lesson L-04 in TODO.md" becomes `LESSONS/L-04.md`
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status), new lessons and gaps in `LESSONS/` and `KNOWNGAPS/`
- [ ] Finish: PR to `main` merged with CI green

---

## Needs you

### Human gates

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

### Open questions

Decisions only the user can make. Agents use the default until one is answered. The full text is under the task named in brackets.

1. **Email sign-in needs Workers Paid (G-35).**
   - The problem: scrypt takes about 130 to 310 ms of CPU per sign-in, and the Free plan allows 10 ms.
   - Default: keep scrypt and deploy on Workers Paid.
   - Alternative on the Free plan: Google-only sign-in.
   - Blocks T-30. (QUESTIONs under T-13 and T-29 in `DONE.md`.)
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
