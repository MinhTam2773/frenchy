# Session handoff notes

Context for continuing this project in a new session (local or cloud). Read with `docs/PLAN.md`.

## Where we are
- Requirements gathered, learning plan + app spec written (`docs/PLAN.md`). **No app code yet.**
- Waiting on the user to pick a **tech stack** before building the MVP.

## Source book (private)
- *Practice Makes Perfect: Complete French All-in-One* (McGraw-Hill 2018), 657-page PDF with a text layer (no OCR needed).
- **Not committed** (`.gitignore` excludes `*.pdf` and `book/`). Put the PDF in `book/` locally; the user has the download link.
- Copyright: personal use only. In-app content must be original; the book only sets the syllabus order.

## User decisions so far
- Total beginner, 30–60 min/day, English UI only.
- Wants: tap/drag-to-translate everywhere, sentence SRS, conjugation drills, AI tutor + speaking, reading/listening tracker.
- Phone-first, login + sync, may share with others later.
- Duolingo-like look (original mascot and branding), **streaks only** (no XP).
- MVP = course map + reader + tap-to-translate + SRS + daily streak, Stage 1 content (ch 1, 2, 12, 10, 4, 7, 33).
- AI: provider-agnostic adapter. The user has free API keys and wants to wire **Claude Code / Codex** subscriptions via a local `cli-bridge` (personal use only, too slow for tap-translate). Cursor has no programmatic interface.

## Open decision: tech stack
Options presented (backend/hosting):
- **A.** Vercel + Supabase (original proposal; fastest; both connected)
- **B.** Cloudflare Pages/Workers + D1 + R2 (cheap, one vendor; auth extra)
- **C.** Firebase (great offline sync; NoSQL)
- **D.** Convex (reactive TS backend + auth)
- **E.** Self-hosted PocketBase (cheap, full control)
- **F.** Local-first (InstantDB / PowerSync / Triplit / Jazz)

Frontend options:
- Next.js
- SvelteKit
- Expo (React Native + web)
- Vite + React PWA

Recommendations given:
- **Easiest:** A.
- **Real phone app + offline + streak notifications:** Expo + Convex or Supabase.
- **Cheapest and most control:** PocketBase on a home machine + Tailscale. This also lets the phone use the Claude Code / Codex subscription tutor through the laptop, for personal use.

## Next steps
1. User picks a stack.
2. Before creating any cloud project (Supabase / Vercel / etc.), confirm with the user.
3. Scaffold the MVP and generate Stage 1 content as reviewed JSON.
