# Frenchy design spec

The mockups are the visual spec for the MVP and later phases. Build screens to match them.

- **Live canvas (clickable):** https://claude.ai/artifact/Hguy86o9nTJ88gJ1Rvvd37 (private to the owner; open it to click through)
- **Source in repo:** `design/mockups/*.dc.html`, one file per screen, 390×844 phone frames. They are "Design Component" files: plain HTML with inline styles plus a small logic class. They need the canvas runtime (`support.js`) to render, so **read the markup for exact sizes, colors and copy** rather than opening them in a browser.
- All data in the mockups is dummy data. All French text is original.

## Screen index

| Mockup file | Screen | Phase | TODO task |
|---|---|---|---|
| `Main.dc.html` | Welcome / sign in | MVP | T-08b |
| `Onboarding.dc.html` | Where are you in the book + daily goal | MVP | T-08b |
| `Today.dc.html` | Daily screen (review first, book, read, output) | MVP | T-15 |
| `Path.dc.html` | Course map (stage → chapters) | MVP | T-16 |
| `Chapter.dc.html` | Chapter detail (book sections, pattern, readings, deck) | MVP | T-16 |
| `Reader.dc.html` | Reader + tap-a-word sheet (interactive) | MVP | T-17b |
| `Sentence.dc.html` | Long-press sentence sheet (translation, gloss, grammar note) | MVP | T-17b |
| `Practice.dc.html` | Practice hub | MVP | T-19 |
| `Review.dc.html` | SRS review, 3 card types, 4 grades (interactive) | MVP | T-18 |
| `ReviewDone.dc.html` | Session complete | MVP | T-18 |
| `Streak.dc.html` | Streak calendar + freezes | MVP | T-19 |
| `Settings.dc.html` | Me / settings | MVP (subset) | T-20 |
| `Words.dc.html` | My words: new / learning / known | Phase 2 | B-02 |
| `Drills.dc.html` | Typed conjugation drill (interactive) | Phase 2 | B-01 |
| `Tutor.dc.html` | AI tutor chat with inline corrections | Phase 3 | B-03 |

## Design tokens

Use these as Tailwind theme tokens (T-03). Never hard-code hex values in components.

### Color

| Token | Hex | Use |
|---|---|---|
| `primary` | `#2B59F0` | Main buttons, active tab, current chapter, links |
| `primary-shadow` | `#1A3CB8` | Bottom shadow under primary buttons, link hover |
| `primary-soft` | `#EEF3FF` | Soft blue surfaces, active tab pill |
| `primary-line` | `#C9D6FF` | Soft blue borders |
| `ink` | `#1B2140` | Body text |
| `ink-2` | `#3A4266` | Secondary strong text |
| `muted` | `#5A6285` | Secondary text, inactive tabs (passes 4.5:1 on white) |
| `faint` | `#8A91B0` | Chevrons and decoration only, never text |
| `line` | `#E3E7F5` | Borders, neutral button shadow |
| `surface` | `#FFFFFF` | Cards |
| `ground` | `#F6F8FF` | Screen background |
| `chip` | `#F1F3FA` | Neutral chips, locked states |
| `gold` | `#FFB020` | Done chapters, daily progress, goal selection (shadow `#C98300`) |
| `gold-soft` | `#FFF4DC` | Yellow surfaces (text on it: `#8A5300` or darker) |
| `new-word` | `#FFF0C7` + underline `#F2B322` | New-word highlight in the reader |
| `flame` | `#FF7A1A` | Streak flame. Text on it must be dark `#3B1600` |
| `freeze` | `#2A8BD0` | Streak freeze |
| `masc` | text `#2048C8` on `#EEF3FF` | Masculine gender (le) |
| `fem` | text `#B0244B` on `#FDE8EE`, dot `#E8436A` | Feminine gender (la) |
| `success` | `#13804A` (shadow `#0C5C34`), soft `#E4F6EC` | Correct, Good grade, Known |
| `danger` | `#D6335B` (shadow `#A5213F`), soft `#FDE8EE` | Wrong, Again grade, sign out |
| `warn` | `#9A5B00` (shadow `#6E4100`) | Hard grade |

Contrast rule: white text only on `primary`, `success`, `danger`, `warn`, `freeze`. Bright fills (`gold`, `flame`, `#178A4C`-style mid greens) fail WCAG AA with white text (see lesson L-04 in `TODO.md`).

### Type

- **Display:** Fredoka 600/700 (headings, big numbers, wordmark `frenchy` in lowercase).
- **Body:** Nunito 400/600/700/800. UI labels are 700–800.
- **Overlines:** 12–13px, 800, uppercase, letter-spacing 0.08em, `muted`.
- Reader text: 21px / line-height 1.7 / weight 600.
- Load both from Google Fonts (or self-host later for offline).

### Shape and depth

- **Chunky buttons:** radius 14–16px, height 50–56px, uppercase 800 text with 0.05em tracking, and a solid bottom shadow `0 4px 0 <shadow color>` (no blur). On press: move down 4px and drop the shadow.
- **Cards:** white, 2px `line` border, radius 20–22px, shadow `0 4px 0 #E3E7F5`.
- **Chips:** height 28–30px, fully rounded.
- **Bottom sheets:** radius 28px on top, drag handle 44×5px.
- **Tab bar:** 78px, 5 tabs (Today, Path, Practice, Words, Me). The active tab has a soft-blue pill behind its icon.
- **Icons:** inline stroke SVG, 2.2–2.4 stroke width, round caps. No emoji.
- **Touch targets:** at least 44×44px.

### Mascot

An original snail: blue shell (`#2B59F0`) with a white spiral, orange body (`#FFB84D`), eye stalks. The SVG is in every mockup (for example `Main.dc.html`). Turn it into a `<Mascot mood="happy|cheer" />` component. No Duolingo assets, names or trademarks.

### Copy rules

- The UI is in English. French strings get `lang="fr"`.
- Short, friendly copy: "Review first", "Save word", "Start learning".
- The only gamification is the streak (no XP, hearts or leagues).
