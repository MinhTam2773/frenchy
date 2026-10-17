# CLAUDE.md — Frenchy

Frenchy is a phone-first French learning PWA that sits next to the book *Practice Makes Perfect: Complete French All-in-One*: course map, reader with tap-to-translate, FSRS flashcards, daily streak. Stack: Vite + React SPA + Hono API on Cloudflare Workers, D1 + Drizzle, Better Auth.

| Read | For |
|---|---|
| `TODO.md` | What to do next, task steps, dependencies, gaps, **lessons** |
| `docs/PLAN.md` | Product spec, learning route, architecture, data model, AI strategy |
| `design/README.md` + `design/mockups/` | Visual spec, design tokens, screen index |
| `docs/HANDOFF.md` | Background on decisions so far |

## Always (non-negotiable)

1. **Read `TODO.md` first**, including KNOWN GAPS and LESSONS, before you touch anything. Work only on a task you have claimed (see "Working on a task").
2. **Keep `TODO.md` updated as you go.** Tick each step (`- [ ]` → `- [x]`) the moment it is done, in the same commit as the work. Update the task's `Status` and `Claimed by`. Move it to DONE when its PR merges and update the Progress line. Never tick a step you didn't verify.
3. **Log every new lesson** in TODO.md → LESSONS, in the format given there: anything that surprised you, an assumption that turned out wrong, a bug's root cause, a workaround that wasn't obvious, or a correction from the user. Check whether a lesson already covers it first. If a lesson changes how everyone should work, also update this file.
4. **Add what you discover.** New work you find goes into BACKLOG (or NEXT if it blocks the MVP) as a full task block. A new risk or open question goes into KNOWN GAPS. Don't silently widen your current task.
5. **Never commit the book** (PDF, extracted text, scans) or any secret (`.dev.vars`, API keys, tokens).
6. **Ask before anything outward-facing or hard to undo:** creating Cloudflare resources, deploying, pushing to `main` directly, deleting data, signing up for or paying for a service, sharing anything publicly.

## Behavior rules (after Andrej Karpathy)

These follow Andrej Karpathy's observations about how LLM coding agents go wrong: silent assumptions, overcomplicated code, and edits nobody asked for. They apply to every task.

### 1. Think before coding
- State your assumptions before you implement. If something is ambiguous, don't pick an interpretation silently: list the options and their trade-offs.
- If a simpler approach exists than the one asked for, say so. Push back when it's warranted.
- If you're confused, stop and name exactly what's unclear. Don't paper over it with plausible code.
- In a parallel run where nobody can answer right away: write a `QUESTION:` line under your task in TODO.md (and in KNOWN GAPS if it affects others). Continue only with a safe, reversible default, and say in the PR that you did.

### 2. Simplicity first
- Write the minimum code that solves the problem. No features beyond the task, no speculative "flexibility" or configuration, no abstractions for single-use code, no handling for impossible cases.
- If you wrote 200 lines and 50 would do, rewrite it. Ask yourself: would a senior engineer call this overcomplicated?
- Prefer the platform and libraries already chosen in PLAN §4 over new dependencies. Add a dependency only when it clearly earns its weight, and say why in the PR.

### 3. Surgical changes
- Touch only what the task needs. Every changed line should trace back to a step in your task.
- Don't "improve" nearby code, comments or formatting, and don't refactor what isn't broken. Match the existing style.
- Clean up only your own mess: remove imports, variables and files that *your* change made unused. If you notice unrelated dead code or a bug, add it to TODO.md instead of fixing it in passing.
- Stay inside your task's `Owns` list. If you must edit a file outside it, keep the hunk minimal and call it out in the PR.

### 4. Goal-driven execution
- Turn the task into checks you can verify before you start. The task's "Done when" line is the target; make it concrete with tests. "Add validation" means write tests for invalid input, then make them pass. "Fix the bug" means write a test that reproduces it, then make it pass.
- For multi-step work, follow the task's checkbox steps as the plan, verifying each one before ticking it.
- Loop until it's verified: run the checks, read the output, fix, run again. Report results honestly, including failures and anything you skipped.

## Working on a task (orchestration protocol)

Tasks are designed to run in parallel: one agent (subagent, worktree or cloud session) per task.

1. **Pick:** choose a task whose `Status` is `ready` (every task in `Depends on` is done, and no human gate is open). Prefer the lowest wave, then the highest priority. If you're told which task to do, check its deps anyway.
2. **Claim:** in a small first commit on your branch, set `Status: in progress` and `Claimed by: <session or agent name>`. Branch name: `task/T-NN-<slug>` from the latest `main`.
3. **Scope:** stay inside the task's `Owns` list. Hot files (listed in TODO.md) get small additive hunks only.
4. **Build:** follow the steps in order and tick each one as it's verified. The recommended model and effort in the task table is the default for whoever runs it.
5. **Finish:** run `npm run check`, merge the latest `main` into your branch (no rebasing or force-pushing shared branches), re-run checks, then open a PR to `main` titled `T-NN: <summary>` using the PR template. When the PR merges, the task moves to DONE.
6. **Unblock others:** after a merge, the lead re-checks which `blocked` tasks became `ready` and updates their status.

**Lead / orchestrator** (Opus 5.5 · High): dispatches every `ready` task in the current wave at once with its recommended model and effort, gives each agent its task ID and this file, reviews and merges PRs in dependency order, resolves conflicts in hot files, and keeps the Progress line and statuses in TODO.md current. Fan-out tasks (T-14, B-10, B-11) run one sub-agent per chapter, and each sub-agent owns exactly one chapter folder.

**Conflicts:** when two tasks need the same contract change, the change goes into `src/shared/schemas/` in one PR that updates both sides. In `TODO.md`, edit only your own task block, the Progress line, and append to LESSONS / KNOWN GAPS / BACKLOG.

## Commands

T-01 creates these. Until it merges, there is no app code.

| Command | Does |
|---|---|
| `npm run dev` | Vite + local Worker (workerd) with local D1 |
| `npm run check` | lint + typecheck + test + build. Must be green before every PR |
| `npm test` / `npm run test:watch` | Vitest (client in jsdom, worker in the Workers pool) |
| `npm run lint` / `npm run typecheck` / `npm run format` | Individual checks |
| `npm run content:check` | Validate everything in `content/` (T-07) |
| `npm run db:migrate:local` / `npm run db:seed:local` | Local D1 (T-06) |

## Architecture rules

- **Layout:** `src/client/` React app (`ui/` kit, `features/<feature>/` screens, `lib/`, `mocks/`), `src/worker/` Hono API (`routes/<feature>.ts`, `auth/`, `db/`, `ai/`), `src/shared/` zod schemas, fixtures and pure logic (SRS, streak, text), `content/` static lesson JSON and lexicon, `migrations/`, `scripts/`.
- **Contracts:** zod schemas in `src/shared/schemas/` are the single source of truth. Validate at every boundary (requests, responses, content files, AI output).
- **User data:** every database query goes through `scopedDb(db, userId)`. D1 has no row-level security, so a raw query in a route is a bug.
- **Static content** (texts, decks, grammar, lexicon) is JSON in the repo, bundled and cached by the service worker. It never goes in D1.
- **AI:** called only from the Worker through the `AiProvider` interface. Keys live only in Worker secrets, and the client never sees them. Cache translations. Before writing code that calls the Anthropic API, load the `claude-api` skill.
- **SRS:** `ts-fsrs` through `src/shared/srs`. The client previews intervals; the server recomputes and stores the real state.
- **Secrets:** `.dev.vars` locally (gitignored, `.dev.vars.example` lists the names), `wrangler secret put` in production.

## Code style

- TypeScript strict. No `any` and no non-null `!` without a comment saying why it's safe.
- Small components and functions, named for what they do. Colocate tests as `*.test.ts(x)`.
- Tailwind theme tokens only: no raw hex values in components (tokens are in `design/README.md`).
- Comments explain *why*, not *what*. Keep them rare.

## UI rules

- Match the mockups in `design/mockups/` (sizes, copy, states). Where the mockup and PLAN disagree, PLAN wins: flag it in the PR.
- Accessible by default: real `<button>` / `<a>` / `<input>` with `<label>`, `aria-label` on icon-only buttons, 4.5:1 text contrast, touch targets ≥ 44 px, visible focus, `lang="fr"` on French text, `prefers-reduced-motion` respected.
- The UI is in English. The only gamification is the streak (no XP, hearts or leagues).
- Original mascot and branding only: no Duolingo assets, names or trademarks.

## Content rules

- All French in the app is **original**. The book sets only the order of topics; never copy its sentences or exercises.
- Texts use only grammar allowed up to their chapter (`content/grammar.json`), carry per-token annotations, and must pass `npm run content:check`.
- Content is never self-approved: a different agent runs QA (T-24 pattern).

## Testing

- Vitest for logic and components; `@cloudflare/vitest-pool-workers` for API routes against local D1; Playwright for E2E (T-27).
- In cloud sessions, Playwright uses the preinstalled Chromium. Never run `playwright install`.
- A bug fix starts with a failing test that reproduces it.

## Git and PRs

- `main` is protected: every task merges through a PR with green CI. Never force-push `main`.
- Branches are `task/T-NN-<slug>`. Commit messages start with the task ID: `T-07: add content validator`.
- The PR body says what changed, how it was verified (paste the check output), which TODO steps were ticked, and any lessons logged.
