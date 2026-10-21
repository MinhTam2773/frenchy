# Session handoff notes

Context for continuing this project in a new session (local or cloud). Read with `docs/PLAN.md`.

> **Snapshot from 2026-10-16, before T-01.** Lines such as "No app code yet" and "Start with T-01" were true then and are not now. For the current state read `TODO.md`, `DONE.md` and `docs/PLAN.md`; `cli-bridge` below is a plan and is not built.

## Where we are
- Requirements gathered, learning plan + app spec written (`docs/PLAN.md`). **No app code yet.**
- **Tech stack decided** (2026-10-16): Vite + React PWA + Hono API on Cloudflare Workers, D1 + Drizzle, R2, Better Auth. Architecture is in `docs/PLAN.md` §4.
- Book Stage 1 chapters (1, 2, 12, 10, 4, 7, 33, App. A) have been read. Chapter page map is in `docs/PLAN.md` §2.

## Source book (private)
- *Practice Makes Perfect: Complete French All-in-One* (McGraw-Hill 2018), 657-page PDF with a text layer (no OCR needed).
- **Not committed** (`.gitignore` excludes `*.pdf` and `book/`). Put the PDF in `book/` locally; the user has the download link.
- Extract text with `pdftotext -enc UTF-8 -layout` (without `-enc UTF-8`, accents break on Windows) into `book/book.txt`. Ligatures (fi, fl, Th) are lost in the text layer.
- Copyright: personal use only. In-app content must be original; the book only sets the syllabus order.

## User decisions so far
- Total beginner, 30–60 min/day, English UI only.
- Wants: tap/drag-to-translate everywhere, sentence SRS, conjugation drills, AI tutor + speaking, reading/listening tracker.
- Phone-first, login + sync, may share with others later.
- Duolingo-like look (original mascot and branding), **streaks only** (no XP).
- MVP = course map + reader + tap-to-translate + SRS + daily streak, Stage 1 content (ch 1, 2, 12, 10, 4, 7, 33).
- AI: provider-agnostic adapter. The user has free API keys and wants to wire **Claude Code / Codex** subscriptions via a local `cli-bridge` (personal use only, too slow for tap-translate). Cursor has no programmatic interface.

## Tech stack decision
- The user wanted to try **Cloudflare** for the backend (picked over Vercel + Supabase, Firebase, Convex, PocketBase and local-first options).
- Frontend: **Vite + React SPA**. SSR isn't needed for an app behind a login. React was picked over SvelteKit so that **Capacitor** can later wrap it into iOS/Android store apps. Next.js was rejected because on Cloudflare it only runs through the OpenNext adapter.
- Cross-platform: a PWA works everywhere now; Capacitor is the path to store apps later.
- Tradeoffs accepted: D1 has no row-level security (scope every query by user id), Better Auth is added because Cloudflare has no consumer auth, and `cli-bridge` stays a local Node server.

## Next steps
Moved to `TODO.md` (tasks, dependencies, waves, model/effort) and `CLAUDE.md` (working rules). Mockups are in `design/mockups/`, explained in `design/README.md`. Start with T-01.
