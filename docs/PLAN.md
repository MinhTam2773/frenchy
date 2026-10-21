# Frenchy — Learning Plan & App Spec (draft v0.1)

## 1. Learner profile

| | |
|---|---|
| Level | Total beginner |
| Time | 30–60 min/day |
| Main resource | *Practice Makes Perfect: Complete French All-in-One* (McGraw-Hill, 2018) — kept **private**, not committed |
| Target | A2 in ~6 months, B1 in ~10 months |
| App audience | Me first, possibly others later → all in-app content must be **original** (book = syllabus order only) |

## 2. How to study

The book is a grammar + exercise reference. It does not give you listening, speaking, or vocabulary volume, so the app has to provide those.

### Daily loop (~45 min)

1. **Review (10 min)**: SRS flashcards in the app. Always first, never skipped.
2. **Book (15–20 min)**: one section of the current chapter, plus its exercises. Check against the answer key.
3. **Read and listen (10–15 min)**: the app's short texts for this chapter, with tap-to-translate. Save new words and sentences to SRS.
4. **Output (5–10 min)**: write 3–5 sentences using today's grammar, or talk to the AI tutor.

Weekly: re-do the exercises you got wrong, and spend one longer session of real French input (Easy French, InnerFrench, Français Authentique).

### Beginner route through the book

The book is ordered by topic, not by difficulty, so a beginner should **not** go 1 → 37. Suggested order:

**Stage 1 — Foundations (weeks 1–8, A1)**
- App. A Pronunciation (spread across the first weeks)
- Ch 1 Articles
- Ch 2 Basic gender endings
- Ch 12 *Être, avoir*, irregular verbs (être, avoir first; savoir/connaître, pouvoir/vouloir, devoir later in the stage). The chapter does **not** cover *aller* or *faire*, but the Ch 33 dialogues use them, so the app teaches both in Stage 1.
- Ch 10 Present tense of -er verbs
- Ch 4 Numbers
- Ch 7 Asking questions
- Ch 33 Conversation: Meeting people

**Stage 2 — Getting around (weeks 9–18, A1 → A2)**
- Ch 11 Present of -ir / -re verbs
- Ch 28 Adjectives
- Ch 6 Building sentences
- Ch 13 Immediate future / past (*aller* + inf., *venir de*)
- Ch 14 Pronominal verbs
- Ch 21 Prepositions
- Ch 15 Passé composé
- Ch 34 Conversation: Making plans
- Ch 3 More nouns & gender (in small doses throughout)

**Stage 3 — Telling stories (weeks 19–30, A2 → B1)**
- Ch 16 Imparfait & plus-que-parfait
- Ch 26 Pronouns
- Ch 27 Relative pronouns
- Ch 17 Future
- Ch 23 Imperative
- Ch 8 Exclamations & commands
- Ch 29 Adverbs
- Ch 18 Conditional
- Ch 5 Vocabulary themes
- Ch 9 Clauses
- Ch 36 Conversation: Asking for help

**Stage 4 — Nuance (weeks 31–42, B1+)**
- Ch 20 Subjunctive
- Ch 19 Could / should / would
- Ch 22 Infinitive
- Ch 24 Participle & gerund
- Ch 31 Confusing verbs
- Ch 30 Written French
- Ch 35 Current events
- Ch 32 Oddities
- Ch 25 Passé simple / passive / indirect speech
- Ch 37 Literature

App. C verb tables: use as a reference throughout. The app's conjugation drills follow the stage you are in.

### Finding chapters in the PDF
PDF page = printed page + 11 (printed p. 1 = PDF p. 12). Chapter start pages (PDF):

| Ch | PDF | Ch | PDF | Ch | PDF | Ch | PDF |
|---|---|---|---|---|---|---|---|
| 1 | 12 | 11 | 197 | 21 | 296 | 31 | 445 |
| 2 | 24 | 12 | 208 | 22 | 326 | 32 | 476 |
| 3 | 48 | 13 | 222 | 23 | 339 | 33 | 489 |
| 4 | 89 | 14 | 232 | 24 | 347 | 34 | 502 |
| 5 | 98 | 15 | 238 | 25 | 354 | 35 | 521 |
| 6 | 132 | 16 | 248 | 26 | 372 | 36 | 536 |
| 7 | 140 | 17 | 260 | 27 | 395 | 37 | 548 |
| 8 | 160 | 18 | 269 | 28 | 405 | App. A | 564 |
| 9 | 170 | 19 | 279 | 29 | 417 | App. C | 572 |
| 10 | 185 | 20 | 286 | 30 | 426 | Answer key | 622 |

The book's example sentences are not graded by difficulty (Ch 1 already uses the passé composé), so the app writes its own leveled texts. The extracted text layer drops the "fi", "fl" and "Th" ligatures and mixes up two-column French/English layouts, so use it only as a reference.

## 3. App vision

A phone-first web app (PWA) that sits next to the book. **Everything French in the app can be tapped.**

### Core interaction: tap-to-translate
- **Tap a word**: popover with translation, lemma, part of speech, gender (color-coded le/la), conjugation (if a verb form, e.g. *vais* → *aller*, 1st sg present), audio, and a **＋ Save** button.
- **Long-press or drag across words / a sentence**: full translation, a word-by-word gloss, and a short grammar note ("passé composé with *être* because…"), with **＋ Save sentence**.
- Works on every surface: reader, flashcards, tutor chat, drills.

### Features (by phase)

**MVP (Phase 1)**
1. **Auth + sync**: email or Google login; progress synced between phone and laptop.
2. **Course map**: the beginner route above as a path (stage → chapter). Mark the chapter you are on in the book.
3. **Reader**: per chapter, 3–5 short original texts and dialogues at the right level, using only grammar seen so far. TTS audio. Tap-to-translate.
4. **SRS flashcards**: FSRS scheduling (the algorithm used by modern Anki).
   - Card types: sentence → meaning, meaning → sentence, and cloze (Clozemaster-style).
   - Cards come from saved words and sentences, plus a starter deck per chapter.
5. **Daily screen**: "Due reviews · Today's chapter · Today's reading" plus a streak or time counter.

**Phase 2**
- **Conjugation drills**: typed and audio drills, by tense and verb group, unlocked by stage.
- **Known-word tracking** (LingQ-style): words are new → learning → known. The reader highlights unknown words, and the course map shows the vocabulary count.

**Phase 3**
- **AI tutor**: a text chat that only uses grammar up to your current chapter. It corrects your mistakes inline with explanations, and corrected sentences can go to SRS.
- **Speaking**: speech-to-text for answers, pronunciation feedback, and voice conversation mode (Speak/Praktika-style).
- **Import any text** (article, lyrics, subtitles) into the reader.

### Apps to study / borrow from

| App | What to borrow |
|---|---|
| Anki | FSRS scheduling, card templates |
| Clozemaster | Cloze-in-context drills |
| LingQ | Known-word tracking in a reader |
| Language Reactor | Dual subtitles, hover dictionary |
| Speak / Praktika | AI voice conversation flow |
| Busuu | Corrections on written exercises |

## 4. Technical design

Decided 2026-10-16: **Vite + React SPA (PWA) + Hono API, all on Cloudflare.**

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React + TypeScript + Tailwind, single-page app | App behind a login, no SEO need, so no SSR; fast taps |
| Routing / data | React Router (SPA mode) + TanStack Query | Client routes; caching and retry for API calls |
| PWA | `vite-plugin-pwa` (service worker + manifest) | Installable on every platform; offline later |
| API | Hono on Cloudflare Workers | Small router built for Workers |
| Hosting | One Worker serves the static SPA **and** `/api/*` (Cloudflare Vite plugin) | One project, one `npm run dev`, one `wrangler deploy` |
| DB | Cloudflare D1 (SQLite) + Drizzle ORM and migrations | Free tier, no pausing; typed queries |
| Auth | Better Auth (email + Google), sessions stored in D1 | Cloudflare has no consumer auth; runs on Workers |
| Files | Cloudflare R2 | Pre-generated TTS audio (later) |
| SRS | `ts-fsrs` through `src/shared/srs`: the client previews intervals, the server recomputes and stores the card | Open-source FSRS implementation; one scheduler for both sides |
| TTS | Browser Web Speech API (fr-FR) first; R2 audio later | Free, good enough for MVP |
| Dictionary | Pre-built offline lexicon (Wiktionary-derived data, CC BY-SA 4.0, verified in G-25; attribution on the Credits page, B-21) + lemmatizer, shipped as static JSON | Instant, free word taps |
| AI | **Provider-agnostic layer** (see below), called only from the Worker | Keys stay server-side; swap providers without code changes |
| Tests | Vitest; `@cloudflare/vitest-plugin` for the API (L-07) | Tests run in the real Workers runtime |

### Platforms
- **Now:** one PWA for iPhone, Android, Windows, Mac and Linux. On phones it is installed with "Add to Home Screen".
- Limits: no app-store listing. On iPhone, push notifications only work after the app is installed to the Home Screen, and iOS may clear local data for apps that haven't been opened in a while (the server copy is the source of truth).
- **Later, if needed:** wrap the same React app with **Capacitor** to get iOS and Android store apps with native notifications. The backend does not change.

### Architecture

```
 Phone / laptop browser (PWA)
 ┌──────────────────────────────────────────┐
 │ React SPA                                │
 │  - course map, reader, SRS, daily screen │
 │  - ts-fsrs interval preview              │
 │  - lexicon + lesson JSON (cached by SW)  │
 └───────────────┬──────────────────────────┘
                 │ HTTPS, same origin
 ┌───────────────▼──────────────────────────┐
 │ Cloudflare Worker                        │
 │  static assets ── SPA files              │
 │  Hono /api/*                             │
 │   /api/auth/*   Better Auth              │
 │   /api/profile  /api/cards  /api/reviews │
 │   /api/words    /api/activity            │
 │   /api/streak   /api/account             │
 │   /api/ai/*     translate, explain, chat │
 └──┬──────────────┬──────────────┬─────────┘
    │ D1           │ R2           │ fetch
    ▼              ▼              ▼
 users, cards,   TTS audio     AI providers
 reviews, cache  (later)       (Anthropic, OpenAI-compatible, …)
```

- **Static content** (lesson texts, starter decks, grammar notes, lexicon) is JSON in the repo, built into the SPA and cached by the service worker. It never touches D1.
- **User data** lives in D1. Every query is scoped by the session's user id through one helper, because D1 has no row-level security.
- **Reviews**: the client grades a card, previews the next intervals with `ts-fsrs` for the buttons, and posts the review. The server recomputes the card with the same scheduler, then stores the review and the new card state. For MVP the app needs a connection; offline review (queue in IndexedDB, sync later) is a follow-up.
- **Streak**: one row per user per day with activity. The streak and freeze are computed from those rows in the user's time zone.
- **Secrets** (AI keys, auth secret) are set with `wrangler secret put` and never sent to the client.

### Environments
| Env | How | Data |
|---|---|---|
| Local | `npm run dev` (Vite + local Worker via `workerd`) | Local D1 file; `cli-bridge` available |
| Production | `wrangler deploy` (later: deploy on push to `main`) | Production D1 + R2 |

### Repo layout
```
src/client/    React app
src/worker/    Hono API, auth, AI drivers
src/shared/    types and schemas shared by both
content/       generated + reviewed lesson JSON, lexicon
migrations/    Drizzle / D1 migrations
scripts/       content check, lexicon build, DB seed, dist security check
```

### AI strategy
- **Content generation at build time.** Chapter texts, starter decks and grammar notes are generated once, reviewed, and stored as static JSON in the repo. Zero runtime cost.
- **Runtime AI** covers sentence translation and explanation for arbitrary text, and the tutor. It goes through one interface that can point at:
  - any OpenAI-compatible endpoint (OpenRouter, Groq, Gemini, etc.)
  - the Anthropic API
  - a local model (Ollama)
  - Choice today is by env vars (`AI_TRANSLATE_PROVIDER`, `AI_EXPLAIN_PROVIDER`; `src/worker/ai/config.ts`); a settings page is B-13 and not built. Only the `anthropic`, `openai-compatible` and `mock` drivers exist so far. Translations are cached in the DB so each sentence costs at most once.
- Coding-agent subscriptions (Claude Code / Cursor / Codex) are for **building** the app and generating content, not for serving app users at runtime. Their terms and rate limits are not designed for that.

### Data model (sketch)
Static JSON in `content/` (not in the DB):
- `lexemes` (lemma, pos, gender, translations, forms)
- `texts` (chapter, title, body, translation, audio key)
- starter decks per chapter

D1 tables:
- `user`, `session`, `account`, `verification`, `rate_limit` (created by Better Auth)
- `profiles` (user id, current chapter, time zone, settings JSON)
- `cards` (user id, type sentence/meaning/cloze, front, back, source, FSRS state, due, updated_at)
- `reviews` (card id, user id, rating, reviewed_at) for stats
- `word_status` (user id, lemma, new/learning/known)
- `daily_activity` (user id, date, minutes, reviews, readings, freeze_used) for the streak. `freeze_used` is stored but not read: the streak derives freezes from the other columns (L-38)
- `activity_minutes` (user id, clock minute): one row per active minute, so a repeated ping adds a minute once
- `text_reads` (user id, text id, date, finished_at): one row per text per local day it was finished
- `translation_cache` (key, task, text, result, provider, created_at), shared across users
- `ai_usage` (user id, window start, requests): per-user AI requests per clock hour
- `ai_daily_usage` (UTC day, requests): provider calls per day for the whole app

## 5. Decisions

| Topic | Decision |
|---|---|
| Name | Frenchy |
| Look | Duolingo-like: bright, playful, rounded "chunky" buttons with a bottom shadow, a big friendly path map, bold colors, small celebratory animations. Own mascot and colors; no Duolingo assets or trademarks. |
| Gamification | Daily streak only (+ streak freeze). No XP, leagues or hearts. |
| Base language | English only |
| Stack | Vite + React PWA, Hono API, Cloudflare Workers + D1 + R2, Better Auth (see §4) |

### AI providers

The app talks to AI through one `AiProvider` interface: `translate()`, `explain()`, `chat()`. Each task is routed to a provider (by env today, see AI strategy), so providers can be mixed.

| Driver | How it works | Where it runs | Use for |
|---|---|---|---|
| `anthropic` | Anthropic API key | Local + deployed | Tutor (Sonnet-class), translations (Haiku-class) |
| `openai-compatible` | Any OpenAI-style endpoint + key: OpenAI, OpenRouter, Gemini, Groq, … | Local + deployed | Free-tier keys, cheap fast translations |
| `ollama` | Local model over HTTP | Local only | Offline / free experimentation |
| `cli-bridge` | Runs `claude -p` (Claude Code) or `codex exec` (Codex CLI) on **your own machine** with your subscription login | Local only (`npm run dev` on your laptop) | Personal tutor sessions, content generation |

Notes on `cli-bridge`:
- **Personal use only.** Subscriptions are licensed to you, not to other users of the app. The deployed app never uses this driver.
- **A small local Node server** (`scripts/cli-bridge`). Workers cannot start processes, so the local Worker calls this server over `http://localhost`, and only when a dev-only env var is set.
- **Slow.** Each call takes several seconds to start an agent. It works fine for the tutor and for batch content generation, but it is too slow for tap-to-translate.
- **Cursor** has no supported way to call it from another program, so it is not a driver. Use it to *build* the app instead.

Default routing:
- **Tap a word**: offline dictionary (no AI).
- **Translate or explain a sentence**: a fast, cheap model, then cached.
- **Tutor chat**: the strongest model available. When running locally, this can be the `cli-bridge`.
- **Lesson texts and starter decks**: generated ahead of time with Claude Code, reviewed, and committed as JSON. Zero runtime cost.
