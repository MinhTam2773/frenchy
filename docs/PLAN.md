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
- Ch 12 *Être, avoir*, irregular verbs (only être, avoir, aller, faire at first)
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

## 4. Technical design (proposal)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + TypeScript + Tailwind, PWA | Phone-first, installable, one codebase |
| Auth + DB | Supabase (Postgres + Auth + row-level security) | Sync, multi-user ready |
| Hosting | Vercel | Simple deploys from GitHub |
| SRS | `ts-fsrs` | Open-source FSRS implementation |
| TTS | Browser Web Speech API (fr-FR) first; a better voice later | Free, good enough for MVP |
| Dictionary | Pre-built offline lexicon (Wiktionary-derived data; license to verify) + lemmatizer | Instant, free word taps |
| AI | **Provider-agnostic layer** (see below) | Swap providers without code changes |

### AI strategy
- **Content generation at build time.** Chapter texts, starter decks and grammar notes are generated once, reviewed, and stored as static JSON in the repo. Zero runtime cost.
- **Runtime AI** covers sentence translation and explanation for arbitrary text, and the tutor. It goes through one interface that can point at:
  - any OpenAI-compatible endpoint (OpenRouter, Groq, Gemini, etc.)
  - the Anthropic API
  - a local model (Ollama)
  - Choice via env vars or a settings page. Translations are cached in the DB so each sentence costs at most once.
- Coding-agent subscriptions (Claude Code / Cursor / Codex) are for **building** the app and generating content, not for serving app users at runtime. Their terms and rate limits are not designed for that.

### Data model (sketch)
- `profiles` (user, current chapter, settings)
- `lexemes` (lemma, pos, gender, translations, forms) — static
- `texts` (chapter, title, body, translation, audio) — static
- `cards` (user, front/back/cloze, source, FSRS state)
- `reviews` (card, rating, timestamp) — for stats
- `word_status` (user, lemma, new/learning/known)
- `translation_cache` (hash, text, result)

## 5. Decisions

| Topic | Decision |
|---|---|
| Name | Frenchy |
| Look | Duolingo-like: bright, playful, rounded "chunky" buttons with a bottom shadow, a big friendly path map, bold colors, small celebratory animations. Own mascot and colors; no Duolingo assets or trademarks. |
| Gamification | Daily streak only (+ streak freeze). No XP, leagues or hearts. |
| Base language | English only |

### AI providers

The app talks to AI through one `AiProvider` interface: `translate()`, `explain()`, `chat()`. Each task is routed to a provider in settings, so providers can be mixed.

| Driver | How it works | Where it runs | Use for |
|---|---|---|---|
| `anthropic` | Anthropic API key | Local + deployed | Tutor (Sonnet-class), translations (Haiku-class) |
| `openai-compatible` | Any OpenAI-style endpoint + key: OpenAI, OpenRouter, Gemini, Groq, … | Local + deployed | Free-tier keys, cheap fast translations |
| `ollama` | Local model over HTTP | Local only | Offline / free experimentation |
| `cli-bridge` | Runs `claude -p` (Claude Code) or `codex exec` (Codex CLI) on **your own machine** with your subscription login | Local only (`npm run dev` on your laptop) | Personal tutor sessions, content generation |

Notes on `cli-bridge`:
- **Personal use only.** Subscriptions are licensed to you, not to other users of the app. The deployed app never uses this driver.
- **Slow.** Each call takes several seconds to start an agent. It works fine for the tutor and for batch content generation, but it is too slow for tap-to-translate.
- **Cursor** has no supported way to call it from another program, so it is not a driver. Use it to *build* the app instead.

Default routing:
- **Tap a word**: offline dictionary (no AI).
- **Translate or explain a sentence**: a fast, cheap model, then cached.
- **Tutor chat**: the strongest model available. When running locally, this can be the `cli-bridge`.
- **Lesson texts and starter decks**: generated ahead of time with Claude Code, reviewed, and committed as JSON. Zero runtime cost.
