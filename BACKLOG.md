# Frenchy BACKLOG

Phase 2 and 3 and later work. A backlog task moves to NEXT when its deps are done and the user agrees on priority.

#### B-01 · Conjugation drills (Phase 2)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | Opus 5.5 · Medium | M | T-26, T-08 | — |

**Status:** ready (deps done; Phase 2) · **Owns:** `src/client/features/drills/**`, `src/shared/drills/**`, `content/verbs.json`
**Goal:** `Drills.dc.html`: typed and audio conjugation drills by tense and verb group, unlocked by stage.
**Done when:** a drill session works end to end, accent-only mistakes are flagged as "almost", and tests pass.

- [ ] `content/verbs.json`: the verb set per stage from `grammar.json`, with conjugations generated from lexicon forms and checked by a QA pass
- [ ] Drill engine: pick prompts weighted toward recent mistakes; compare answers as exact, accent-only mistake ("almost", show the difference), or wrong
- [ ] Typed drill UI with accent keys (é è ê à ç ô) and feedback panel per the mockup
- [ ] Audio drill: hear the form, type it
- [ ] Optionally turn missed forms into cloze cards
- [ ] Show the drill button on the chapter page (T-17) and the Practice tile
- [ ] Tests: engine selection, accent-tolerant compare, UI flow
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-02 · Known-word tracking and My words (Phase 2)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | Opus 5.5 · Medium | M | T-22, T-25 | B-07 |

**Status:** ready (deps done; Phase 2) · **Owns:** `src/client/features/words/**`, `src/worker/routes/words.ts` (extend), reader highlight changes
**Goal:** LingQ-style new → learning → known, visible in the reader and in `Words.dc.html`.
**Done when:** statuses update from reading and reviewing, the reader highlights unknown words, and the Words screen filters and searches.

- [ ] Rules: new on first encounter; learning when saved or a card exists; known when the card's stability ≥ 21 days or the user marks it known; manual override
- [ ] Batch status upsert endpoint
- [ ] Reader: highlight new and learning words differently; "Mark as known" in the word sheet
- [ ] Words screen per the mockup: totals bar, search, All / New / Learning / Known tabs, list with gender colors
- [ ] Known-word count on the Path and Chapter screens
- [ ] Tests: status transitions, filters
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-03 · AI tutor text chat (Phase 3)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | Opus 5.5 · High | L | T-23, T-07, T-26 | B-06 |

**Status:** ready (deps done; Phase 3) · **Owns:** `src/client/features/tutor/**`, `src/worker/routes/tutor.ts`, `src/worker/ai/prompts/tutor.ts`, migration for `tutor_messages`
**Goal:** `Tutor.dc.html`: a chat that only uses grammar up to the learner's chapter and corrects mistakes inline.
**Done when:** a chat streams replies, corrections render as in the mockup, a correction can be saved to SRS, and daily cost caps hold.

- [ ] Load the `claude-api` skill first
- [ ] `POST /api/tutor/chat` streaming (SSE) through `AiProvider.chat()`
- [ ] System prompt built from `allowedGrammar(currentChapter)`; replies stay inside it
- [ ] Structured corrections (original, corrected, short explanation) parsed and validated
- [ ] UI: bubbles with translation lines, correction cards, "Save to reviews", text input + mic placeholder
- [ ] `tutor_messages` table with retention limit; conversation reset
- [ ] Per-user daily token cap
- [ ] Tests with the mock driver
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-04 · `cli-bridge` driver (local, personal use only)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · High | M | T-23 | — |

**Status:** ready (deps done) · **Owns:** `scripts/cli-bridge/**`, `src/worker/ai/drivers/cli-bridge.ts`
**Goal:** Use your own Claude Code / Codex subscription for the tutor and content generation when running locally (PLAN §5).
**Done when:** with `DEV_CLI_BRIDGE_URL` set locally, the tutor works through the bridge, and a production build can't enable it.

- [ ] Local Node server bound to localhost with a random token; endpoints for translate, explain and chat that run `claude -p` or `codex exec` with JSON output
- [ ] Timeouts, one request at a time, clear errors when the CLI isn't logged in
- [ ] Worker driver enabled only when `DEV_CLI_BRIDGE_URL` is set and the environment is development; a test asserts it can't load in production
- [ ] README section with the personal-use warning
- [ ] Tests with a fake CLI
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-05 · Ollama driver (local)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | T-23 | — |

**Status:** ready (deps done) · **Owns:** `src/worker/ai/drivers/ollama.ts`
**Goal:** Free offline experiments with a local model.
**Done when:** with `OLLAMA_URL` set locally, translate and explain work through Ollama.

- [ ] Driver using Ollama's HTTP API; model from env
- [ ] JSON-mode prompts reused from T-23; zod validation
- [ ] Dev-only, like B-04
- [ ] Tests with a mocked HTTP server
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-06 · Speaking: speech-to-text, pronunciation, voice mode (Phase 3)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Opus 5.5 · Extra (research), then Opus 5.5 · High (build) | L | B-03 | — |

**Status:** blocked (B-03) · **Owns:** `docs/speaking-research.md`, `src/client/features/speaking/**`, related worker routes
**Goal:** Answer by voice, get pronunciation feedback, and hold a voice conversation (Speak / Praktika style).
**Done when:** the research doc has a decision the user approved, and answering a review card by voice works on iPhone and Android Chrome.

- [ ] Research: Web Speech recognition support (Safari, Chrome, Firefox, Android), server STT options and cost, pronunciation scoring approaches; write `docs/speaking-research.md` with a recommendation
- [ ] User approves the approach (and any paid service)
- [ ] Voice answers in review and drills
- [ ] Pronunciation feedback for single sentences
- [ ] Voice conversation mode on top of the tutor with TTS replies
- [ ] Tests for the parts that can be tested without a microphone
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-07 · Import any text into the reader (Phase 3)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Opus 5.5 · Medium | M | T-15, T-23, T-25, B-02 | — |

**Status:** blocked (B-02) · **Owns:** `src/client/features/import/**`, `src/worker/routes/import.ts`, migration for `user_texts`
**Goal:** Paste text, a URL, lyrics or subtitles (.srt / .vtt) and read it with tap-to-translate.
**Done when:** all four input types import and open in the reader, with unknown words falling back to cached AI translation.

- [ ] Paste and subtitle file import (strip timestamps)
- [ ] URL import through the Worker with SSRF protection (block private IPs, size and time limits) and readable-text extraction
- [ ] `user_texts` table, list and delete
- [ ] Reader uses lexicon lookup, then cached AI translation for unknown words
- [ ] Tests: parsers, SSRF guard
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-09 · Pre-generated TTS audio in R2
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Opus 5.5 · Medium | M | T-24, T-30 + user approval of a TTS provider and cost | — |

**Status:** blocked (T-30 + the user picks a TTS provider) · **Owns:** `scripts/audio/**`, audio fields in content JSON, player in `src/client/features/reader/audio/**`
**Goal:** Natural audio for lesson texts on every device, independent of browser voices (G-03).
**Done when:** Stage 1 texts play R2 audio with sentence highlighting, falling back to Web Speech.

- [ ] Compare TTS providers (fr-FR quality, price, right to redistribute audio); user picks one
- [ ] Script generates per-sentence audio + timestamps and uploads to R2
- [ ] Audio keys stored in the text JSON
- [ ] Player with sentence highlighting; fallback to T-05
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-10 · Stage 2 content (fan-out per chapter)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | Opus 5.5 · High per chapter + Opus 5.5 · Extra QA | L | T-24 | B-11 |

**Status:** ready (T-24 is done; B-29 and B-30 should land first) · **Owns:** `content/chapters/<chapterId>/**` per chapter, `docs/content-qa.md`
**Goal:** Stage 2 "Getting around" (A1 → A2) lessons using the T-14 pipeline.
**Done when:** every Stage 2 chapter passes `content:check` and an independent QA pass.

- [ ] Extend `grammar.json` for Stage 2 if needed
- [ ] One sub-agent per chapter:
  - [ ] Ch 11 · Present of -ir / -re verbs
  - [ ] Ch 28 · Adjectives
  - [ ] Ch 6 · Building sentences
  - [ ] Ch 13 · Immediate future / past (*aller* + infinitive, *venir de*)
  - [ ] Ch 14 · Pronominal verbs
  - [ ] Ch 21 · Prepositions
  - [ ] Ch 15 · Passé composé
  - [ ] Ch 34 · Conversation: making plans
  - [ ] Ch 3 · More nouns and gender
- [ ] Independent QA pass (as in T-24) with findings in `docs/content-qa.md`
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR(s) to `main` merged with CI green

#### B-11 · Stage 3 and 4 content (fan-out per chapter)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Opus 5.5 · High per chapter + Opus 5.5 · Extra QA | L | B-10 | — |

**Status:** blocked (B-10) · **Owns:** `content/chapters/<chapterId>/**` per chapter
**Goal:** Stage 3 "Telling stories" (A2 → B1) and Stage 4 "Nuance" (B1+) lessons.
**Done when:** every chapter below passes `content:check` and QA.

- [ ] Stage 3: Ch 16 Imparfait & plus-que-parfait · Ch 26 Pronouns · Ch 27 Relative pronouns · Ch 17 Future · Ch 23 Imperative · Ch 8 Exclamations & commands · Ch 29 Adverbs · Ch 18 Conditional · Ch 5 Vocabulary themes · Ch 9 Clauses · Ch 36 Asking for help
- [ ] Stage 4: Ch 20 Subjunctive · Ch 19 Could / should / would · Ch 22 Infinitive · Ch 24 Participle & gerund · Ch 31 Confusing verbs · Ch 30 Written French · Ch 35 Current events · Ch 32 Oddities · Ch 25 Passé simple / passive / indirect speech · Ch 37 Literature
- [ ] Independent QA pass per stage
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR(s) to `main` merged with CI green

#### B-12 · Daily reminders (web push)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Opus 5.5 · Medium | M | T-30, T-12 | — |

**Status:** blocked (T-30) · **Owns:** `src/worker/push/**`, `src/client/features/settings/reminders/**`, Cron Trigger config
**Goal:** "8:00 pm, if you haven't practiced" reminders from the Settings mockup.
**Done when:** a subscribed device gets one reminder at the chosen local time only on days without activity.

- [ ] Web Push with VAPID keys (secrets); subscription storage table
- [ ] Cron Trigger every 15 min that sends due reminders in each user's time zone
- [ ] Settings toggle and time picker; explain the iPhone "install first" requirement (G-04)
- [ ] Tests for the scheduling logic
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-13 · AI provider settings page
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · High | S | T-23, T-20 | — |

**Status:** ready (deps done) · **Owns:** `src/client/features/settings/ai/**`, settings fields in the profile
**Goal:** Choose which provider handles translation and the tutor from the app (PLAN §5), not only through env vars.
**Done when:** changing a provider in Settings changes which driver serves the next request.

- [ ] Settings section per the mockup (task → provider)
- [ ] Only providers configured on the server are offered; keys never reach the client
- [ ] Worker reads the user's choice and falls back to the env default
- [ ] Tests
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-14 · Book exercise mistake log and weekly redo
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | T-17, T-22 | — |

**Status:** ready (deps done) · **Owns:** `src/client/features/chapter/mistakes/**`, a `book_mistakes` table
**Goal:** PLAN's weekly routine: note which book exercises went wrong and get them back once a week.
**Done when:** a logged exercise shows up in a weekly "Redo these" card on Today.

- [ ] "Log a mistake" on the chapter page (exercise number + note)
- [ ] Weekly "Redo these" card on Today; mark as redone
- [ ] Tests
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-15 · Stats screen
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | T-22 | — |

**Status:** ready (deps done) · **Owns:** `src/client/features/stats/**`, `GET /api/stats`
**Goal:** Reviews per day, retention, minutes and words learned over time.
**Done when:** the screen shows the last 30 days from real data.

- [ ] Load the `dataviz` skill before drawing charts
- [ ] `/api/stats` aggregates from reviews and daily activity
- [ ] Screen with charts for reviews per day, retention and minutes
- [ ] Tests for the aggregation
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-17 · App store apps with Capacitor (only if needed)
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Opus 5.5 · Medium | L | T-30 | — |

**Status:** blocked (T-30 + the user confirms it is needed) · **Owns:** `capacitor.config.ts`, `ios/`, `android/`
**Goal:** Wrap the same React app as iOS and Android store apps with native notifications (PLAN §4 Platforms).
**Done when:** debug builds run on a simulator and emulator against production.

- [ ] User confirms it's needed (store accounts cost money)
- [ ] Add Capacitor; configure the server URL / bundled assets
- [ ] Native push plugin replacing web push on devices
- [ ] Simulator and emulator runs
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-18 · Password reset and email verification
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | Opus 5.5 · Medium | S | T-13, T-21 + H-09 | — |

**Status:** blocked (H-09: email provider) · **Owns:** email driver in `src/worker/auth/email.ts`, reset screens in `src/client/features/auth/**`
**Goal:** Close G-08 so email users can recover their accounts.
**Done when:** a reset email arrives and the new password works.

- [ ] User picks an email provider (H-09)
- [ ] Better Auth reset and verification hooks sending through it
- [ ] "Forgot password?" flow and screens
- [ ] Tests with a mock email driver
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-20 · Self-host fonts for offline use
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Haiku 5.5 | S | T-12 | — |

**Status:** ready (deps done) · **Owns:** `public/fonts/**`, font CSS
**Goal:** Fredoka and Nunito load with no network.
**Done when:** the app renders with the right fonts in airplane mode after the first visit.

- [ ] Add the WOFF2 files (check the OFL license notice) and `@font-face` rules; remove the Google Fonts link
- [ ] Precache them in the service worker
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-24 · Show/hide password on the email forms
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | T-21 | — |

**Status:** ready (deps done) · **Owns:** `src/client/features/auth/**`
**Goal:** Typing a password on a phone without seeing it is error-prone; add a toggle.
**Done when:** a labelled button flips the field between `password` and `text`, and a test covers it.

- [ ] Add the toggle (`aria-pressed`, 44 px target) to the password field
- [ ] Test it
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-31 · Reader text settings ("Aa") and audio time

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | T-25 | — |

**Status:** ready · **Owns:** `src/client/features/reader/**`
**Goal:** The Reader mockup's "Aa" button (text size) and the elapsed-time label of the audio bar, which T-25 left out for lack of a spec.
**Done when:** a text-size choice persists per device and the audio bar shows elapsed / total time (estimated from sentence lengths and rate).

- [ ] Decide sizes (and whether it belongs in profile settings) and the time estimate
- [ ] Build and test both
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-30 · Lexicon rebuild hygiene: pinned dumps, no vulgar glosses, coverage in CI

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P1 | Opus 5.5 · Medium | S | T-08 | B-10, B-11 (helps), T-30 |

**Status:** blocked (T-08 is done; needs the user to decide where an archived dump may live, G-65) · **Owns:** `scripts/lexicon/**`, `content/lexicon/**`, `docs/LICENSES.md`, one job line in `.github/workflows/ci.yml` (hot file)
**Goal:** A content task can rebuild the lexicon and get only the changes its content causes, the glosses are fit for learners, and stale shards fail CI (G-65, G-66, G-67).
**Done when:** a rebuild with an unchanged dump reproduces the shards byte for byte, a different dump fails loudly, and CI fails when coverage drops below 98 %.

- [ ] Record each raw dump's size, Last-Modified and sha256 in `build.ts` and fail on a mismatch; ask the user where an archived copy of the 2026-10-03 kaikki extract may live (it is not committed, rule 5)
- [ ] Skip senses tagged `vulgar`, `slang`, `offensive` or `derogatory` from the three glosses (*nœud* lists a vulgar sense today), and re-check the content's glosses after the rebuild
- [ ] `npm run lexicon:coverage -- --min 98` exits non-zero below the threshold; add it to CI
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-35 · E2E against the production build (service worker, offline)

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | Sonnet 5.5 · High | M | T-27, T-30 | — |

**Status:** blocked (T-30) · **Owns:** `e2e/**`, `playwright.config.ts`, the e2e job in `.github/workflows/ci.yml`
**Goal:** The E2E suite also runs against `vite build` + `vite preview` (G-74), so the service worker, the precache and the offline banner are exercised, not only `vite dev`.
**Done when:** a `preview` project (or a second job) runs the happy path against the built app on a fresh D1, plus one offline check (load Today, go offline, reload, the shell still opens).

- [ ] `e2e/server.ts` option to start `vite build && vite preview` (the Cloudflare plugin's `persistState` applies there too; check)
- [ ] Offline spec: `context.setOffline(true)` after the first visit; shell loads from the precache, `OfflineBanner` shows
- [ ] Decide whether it replaces the dev-server run in CI or runs next to it (dev is faster to start)
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-37 · Mark French words inside English strings with `lang="fr"`

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · High | M | T-28 | — |

**Status:** ready · **Owns:** `src/client/ui`, the screens that show chapter titles and grammar notes, `src/shared/schemas` (note and title markup)
**Goal:** French terms inside English prose (chapter titles, grammar tips, button labels) are read with a French voice (G-75).
**Done when:** a chapter title like "Passé composé" and a tip that quotes *je parle* render the French part in `<span lang="fr">`, from markup in the content (for example `*...*` or a `fr` run list), validated by `content:check`; axe and a test show the tags.

- [ ] Choose the markup (a tiny inline syntax in the JSON strings, or `{ text, fr }` runs) and add it to the schemas
- [ ] A `RichText` component in the kit that turns the markup into `lang="fr"` spans
- [ ] Use it for chapter titles, notes, tips and the cloze button label
- [ ] `content:check` rejects unbalanced markup
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-36 · E2E smoke for the seeded demo account

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | T-27 | — |

**Status:** ready · **Owns:** `e2e/**`, `scripts/db/seed.ts` (accept a persist dir)
**Goal:** The demo login from `db:seed:local` (L-107) keeps working, and its numbers match what the server computes (G-71).
**Done when:** a spec signs in as `demo@frenchy.local` on the run's fresh D1 and checks Today, Streak and Review against the seed.

- [ ] `scripts/db/seed.ts` and `getPlatformProxy({ persist })` take `E2E_PERSIST_DIR`; `e2e/server.ts` seeds after migrating
- [ ] Spec: sign in as the demo user; assert the streak the server computes (5 days, best 6, G-71), cards due, and the Review session
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-38 · Screen-reader and device accessibility pass (VoiceOver, TalkBack, iOS Safari)

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 | human + Sonnet 5.5 · Medium | S | T-28, T-30 | — |

**Status:** blocked (needs a person with a phone, and the deployed app) · **Owns:** a11y fixes in `src/client/**`
**Goal:** The screens work with a real screen reader and on real phones, which axe and Chromium cannot prove (G-76).
**Done when:** the daily loop (sign in, Today, read a text and tap a word, review a card, Streak) is walked with VoiceOver and with TalkBack and the findings are fixed or logged.

- [ ] Walk the loop with VoiceOver (iPhone, Safari) and TalkBack (Android, Chrome); note anything unannounced, announced twice or unreachable
- [ ] Check the reader's word sheet live region and the sentence sheet's focus on both
- [ ] Check Dynamic Type / large font sizes on iOS and Android font scale
- [ ] Fix or log each finding
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-40 · Burst rate limit on API writes

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 (before sharing the app publicly) | Opus 5.5 · Medium | S | T-29, T-30 (`wrangler.jsonc`) + the user agrees on limits | — |

**Status:** blocked (limits to agree with the user; the binding goes in `wrangler.jsonc`, T-30's file) · **Owns:** `src/worker/routes/sync-common.ts`, a `ratelimits` binding in `wrangler.jsonc`, tests
**Goal:** Close G-77 (T-29 S-03): one account can't use up D1's daily writes or grow storage without bound.
**Done when:** past the limit, one user's writes get 429 `rate_limited` with `Retry-After` while other users are unaffected, proven in the workers pool.

- [ ] Decide the limit with the user (e.g. 120 writes per user per 60 s; a review session is about one write every few seconds)
- [ ] Workers Rate Limiting binding (period 60 s, key = user id; L-89) applied to unsafe methods in `syncRouter()`
- [ ] At T-30, optionally a Cloudflare rate-limiting rule on `/api/*` per IP
- [ ] Decide whether to cap stored cards and reviews per user
- [ ] Tests
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-43 · `content:check` compares lesson tokens with `tokenize()`

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | B-22 | — |

**Status:** ready · **Owns:** `src/shared/content/validate.ts`, its tests
**Goal:** Close G-82: a text whose tokens split differently from `tokenize()` (titles, times, numbers, the euphonic *t*) fails `content:check`, not a T-15 test with a name content agents don't expect.
**Done when:** `content:check` names the file, sentence and the two splits when they differ, and all Stage 1 texts pass.

- [ ] Run `tokenize()` on each sentence's joined text and compare token by token (word vs gap, and `t`)
- [ ] Decide whether `splitSentences()` differences (G-55) are reported or ignored (lessons only need the token split)
- [ ] Tests
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-44 · More typography rules in `content:check`

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | B-22 | — |

**Status:** ready · **Owns:** `src/shared/content/validate.ts`, its tests
**Goal:** Close G-83: the slips B-22 doesn't catch (a space before `,` or `.`, no space after `,`, three dots instead of `…`, straight `"` quotes).
**Done when:** each rule has a failing and a passing test and the Stage 1 content passes (or the real slips are fixed, typography only).

- [ ] Agree the rules against `text.md` (count how many Stage 1 sentences each would flag before adding it)
- [ ] Decide how `…` meets `? !` (*Euh… ?* versus *Euh…?*) and write it into `text.md`
- [ ] Implement and test
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-49 · A 401 from any API call ends the session and forgets the remembered user

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | B-23 | — |

**Status:** ready (B-23 is done) · **Owns:** `src/client/lib/api.ts`, `src/client/lib/query.ts`, `src/client/lib/session.ts`
**Goal:** Close G-88 (second half): today only the session read clears the remembered user, so a session that expires or is revoked while the app is open leaves the user on screens whose calls all answer 401 until the next reload.
**Done when:** a test where a protected call answers 401 clears the remembered user, sets the session query to signed out and lands on the welcome screen.

- [ ] On `ApiClientError` with `status === 401`, call `clearRememberedUser()` and set the session query data to `null` (one place, e.g. the query client's `QueryCache` `onError`)
- [ ] Test it; check it does not fire for the sign-in form's own wrong-password answer (Better Auth, not `api.ts`)
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-50 · Give up on a hanging session read after a few seconds

| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | B-23 | — |

**Status:** ready (B-23 is done) · **Owns:** `src/client/lib/session.ts`
**Goal:** Close G-89: on a connection that is "up" but not answering (lie-fi, captive portal), `fetch` can wait a very long time, so the guard renders nothing instead of using the remembered user.
**Done when:** a test where `/api/auth/get-session` never answers resolves to the remembered user after the timeout (fake timers), and to signed out with nobody remembered.

- [ ] Pass `AbortSignal.timeout(~5000)` to `authClient.getSession` and treat the abort as a network failure
- [ ] Test it with a handler that never responds
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-47 · Clear device-local data on sign-out and account deletion
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P2 (with B-08 / B-23) | Sonnet 5.5 · Medium | S | B-08, B-23, B-16 | — |

**Status:** blocked (B-08 adds the rest of the local data; B-23 is done) · **Owns:** `src/client/lib/session.ts` (`signOut`), `src/client/lib/offline/**` (a `clearLocalData()`)
**Goal:** Signing out, or deleting the account (B-16), leaves nothing of the account on the device: no remembered user (B-23), no queued reviews or cached cards in IndexedDB (B-08).
**Done when:** after `signOut()` (which the deletion flow calls) a test finds no remembered user and an empty offline store.

- [ ] One `clearLocalData()` that B-08 and B-23 each register their stores with (or that clears them by name), called from `useSession().signOut`
- [ ] Decide for queued reviews that are not synced yet: drop them on deletion, keep them on a plain sign-out (the next sign-in of the same user can still send them)
- [ ] Tests: sign-out clears the remembered user; account deletion clears the queue too
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-48 · Delete Better Auth `verification` rows with the account
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | B-18, B-16 | — |

**Status:** blocked (B-18 starts creating `verification` rows) · **Owns:** `deleteAccount` in `src/worker/db/index.ts`, test in `src/worker/routes/account.test.ts`
**Goal:** Reset and verification tokens do not outlive the account (G-86).
**Done when:** a test creates a verification row for the user's email, deletes the account, and finds no row.

- [ ] Check how Better Auth keys `verification.identifier` for each flow B-18 enables (the email, or a prefix plus the email)
- [ ] Add that delete to the `deleteAccount` batch, by the user's email
- [ ] Test: the row is gone after `DELETE /api/account`, another user's row stays
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green

#### B-57 · Run `prettier --check .` in `npm run check`
| Priority | Model · effort | Size | Depends on | Blocks |
|---|---|---|---|---|
| P3 | Sonnet 5.5 · Medium | S | B-54 | — |

**Status:** blocked (B-54 merges first, so the check starts green) · **Owns:** the `check` script in `package.json` (hot file, one line)
**Goal:** Prettier drift cannot come back unnoticed: `npm run check` fails when a file Prettier should format is not clean (L-161, L-34).
**Done when:** `npm run check` runs `prettier --check .`, and a deliberately misformatted file makes it fail.

- [ ] Add `prettier --check .` to the `check` script (not to `lint`, per the lead's decision on B-54)
- [ ] Decide with the lead whether Markdown joins the check (`*.md` is in `.prettierignore`, see G-91)
- [ ] Finish: `npm run check` green
- [ ] Finish: TODO.md updated (steps ticked, status, lessons)
- [ ] Finish: PR to `main` merged with CI green
