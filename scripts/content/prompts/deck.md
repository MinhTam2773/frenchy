# Brief: Stage 1 grammar note and starter deck (T-14)

Alongside the texts (see `text.md`), each chapter folder gets a pattern card and a starter deck. The same rules apply: original French, grammar ceiling, natural and correct, `npm run content:check` green.

## `content/chapters/<chapterId>/note.json`

The pattern card on the chapter page (see `design/mockups/Chapter.dc.html`). Schema: `GrammarNote` in `src/shared/schemas/content.ts`.

```json
{
  "chapterId": "ch10",
  "title": "parler",
  "subtitle": "to speak",
  "rows": [
    { "label": "je", "fr": "je parle", "ending": "e" },
    { "label": "nous", "fr": "nous parlons", "ending": "ons" }
  ],
  "tip": "The je, tu, il and ils forms all sound the same: only nous and vous change the sound."
}
```

- 3–8 rows showing the chapter's core pattern (a conjugation, article forms, gender endings, numbers, question forms, key phrases). `ending` (optional) must be a suffix of `fr`.
- `tip`: one short, practical English sentence a learner will remember.

## `content/chapters/<chapterId>/deck.json`

Schema: `Deck` (`{ chapterId, cards: DeckCard[] }`).

- **20–30 cards** per chapter (appA: 12–20), mixing the three types roughly evenly:
  - `sentence_meaning`: French `front`, English `back`.
  - `meaning_sentence`: English `front`, French `back`.
  - `cloze`: French `front` with exactly one `___`, `clozeAnswer` the missing word(s), and `back` = the front with the blank filled in (character for character).
- Card `id`: `<chapterId>-<slug>`, unique in the deck (e.g. `ch10-nous-parlons`).
- Prefer sentences taken from (or close to) your chapter's texts, and set `textId` to that text's id when they are.
- A cloze must have **one unambiguous answer**: the sentence must force it (subject, gender, number). Add a `hint` (shown with the front, e.g. the infinitive "parler") when the answer would otherwise be guessable in more than one way.
- Optional `note` (shown with the back): one short line explaining the point, e.g. "nous takes -ons."
- No duplicate fronts. Fronts and backs ≤ 500 characters (keep them short: one sentence).
- Use only grammar allowed for the chapter, like the texts.
