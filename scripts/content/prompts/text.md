# Brief: Stage 1 lesson texts (T-14)

You write the reading texts for **one** Stage 1 chapter of Frenchy. The learner reads them next to the book *Practice Makes Perfect: Complete French All-in-One*, after doing that chapter.

## Non-negotiable

1. **Original French only.** The book sets the topic order. Never copy, translate back or paraphrase its sentences, dialogues, names or exercises. Invent your own people, places and situations.
2. **Grammar ceiling.** Use only grammar whose tag is introduced in your chapter or an earlier one on the route (`allowedGrammar(chapterId)` in `src/shared/content`, data in `content/grammar.json`). Stage 1 route: `appA → ch1 → ch2 → ch12 → ch10 → ch4 → ch7 → ch33`. If a sentence needs a later structure (passé composé, futur proche, reflexive verbs, -ir/-re verbs other than the irregulars in ch12, object pronouns, adjective agreement beyond the basics), rewrite it.
3. **Natural and correct.** Everyday A1 French as people actually say it: correct gender, agreement, elision (*l'*, *j'*, *qu'*), contractions (*au*, *du*, *des*), and French punctuation spacing (a no-break space U+00A0 before `? ! : ;` and inside `« »`).
4. **`npm run content:check` must pass.** It is the contract; the schema is `Text` in `src/shared/schemas/content.ts`.

## Per chapter

| Chapter | Texts | Words per text | Notes |
|---|---|---|---|
| `appA` Pronunciation | 3 | 15–50 | Greetings, short exchanges and word lists that show one sound each (nasal vowels, *u* vs *ou*, silent final letters, liaison). No verbs beyond fixed greetings (*Ça va ?*, *Je m'appelle…* as a fixed phrase only). |
| `ch1` Articles | 3–4 | 25–70 | No verb chapter yet (L-26): labels, lists, signs, a shop window, a menu, a fridge note. Only *c'est*, *ce sont*, *voici*, *voilà* as fixed phrases. Show le/la/l'/les, un/une/des, du/de la/des, au/aux. |
| `ch2` Gender | 3–4 | 25–70 | Same limits as ch1. Nouns grouped so the endings (-tion, -age, -ette, -ment…) are visible. |
| `ch12` Être, avoir… | 4–5 | 60–110 | Subject pronouns, *être*, *avoir*, *aller*, *faire*, *savoir/connaître*, *pouvoir/vouloir*, *devoir* in the present, *ne… pas*, basic adjectives (masculine/feminine of common ones). |
| `ch10` -er verbs | 4–5 | 70–120 | Regular -er verbs and spelling-change verbs (*manger*, *commencer*, *préférer*, *acheter*, *appeler*), basic prepositions. |
| `ch4` Numbers | 3–4 | 60–110 | Prices, ages, phone numbers, addresses, times (*il est huit heures et demie*), ordinals. Write numbers as words in running text; digits are fine for clock times and prices if the token is annotated. |
| `ch7` Questions | 4 | 60–110 | Intonation, *est-ce que*, question words, simple inversion (*Où vas-tu ?*). Mix stories and dialogues. |
| `ch33` Meeting people | 4–5 dialogues | 70–120 | Introductions, where you're from, what you do, likes. Only Stage 1 grammar. |

Mix `story` and `dialogue` kinds (ch33 is all dialogues). Dialogues put each turn in its own paragraph with a `speaker` (a first name).

## File format

One file per text: `content/chapters/<chapterId>/texts/<textId>.json`, where `textId` = `<chapterId>-<slug>` (e.g. `ch10-au-marche`) and the file name equals the id.

```jsonc
{
  "id": "ch10-au-marche",
  "chapterId": "ch10",
  "title": "Au marché",            // French title
  "kind": "story",                  // or "dialogue"
  "minutes": 3,                     // reading time, 1–30
  "paragraphs": [
    { "sentences": [
      { "tokens": [
          { "t": "Léa", "lemma": "Léa", "pos": "name", "gloss": "Léa" },
          { "t": " " },
          { "t": "achète", "lemma": "acheter", "pos": "verb", "gloss": "buys", "form": "il / elle · present · -er verb (è)", "isNew": true },
          { "t": " " },
          { "t": "des", "lemma": "un", "pos": "article", "gloss": "some" },
          { "t": " " },
          { "t": "pommes", "lemma": "pomme", "pos": "noun", "gender": "f", "gloss": "apples", "form": "feminine plural" },
          { "t": "." }
        ],
        "en": "Léa buys some apples." }
    ] }
  ],
  "newWords": ["acheter"],
  "grammarTags": ["er.present", "er.spelling-changes", "articles.indefinite"]
}
```

Rules for tokens:
- Joining every token's `t` must give the exact sentence. Sentences in a paragraph are joined by one space, so don't put leading or trailing spaces in a sentence.
- **Word tokens** (anything with a letter or digit) need `lemma`, `pos` (see `PartOfSpeech` in `src/shared/schemas/common.ts`), and a contextual English `gloss` ("goes", not "to go"). Add `gender` (`m`/`f`) on nouns, and `form` on inflected words (verbs: person · tense · group; nouns/adjectives: gender and number).
- Elisions are their own word token: `l'` (lemma `le` or `la` per the noun), `j'` (lemma `je`), `n'`, `d'`, `qu'`, `c'`. The apostrophe stays inside the elided token (`"t": "l'"`), and the next word follows with no gap token.
- Articles follow the T-08 lexicon: indefinite *des* → lemma `un` (pos `article`); partitive *du* / *de la* → lemma `du` / `de` (pos `article`).
- Contractions: `au` → lemma `au`, pos `contraction`, gloss "to the" / "at the"; same for `aux`, `du`, `des` (when it means *de + le* / *de + les*).
- Hyphenated inversion (`vas-tu`) is two word tokens with a `-` gap token between them; `est-ce que` is three word tokens (`est`, `ce`, `que`) with gaps, all tagged `questions.est-ce-que` in the text.
- **Gap tokens** hold only spaces and punctuation, including the no-break space before `? ! : ;`.
- `isNew: true` on at most **8** key words per text (the vocabulary the text teaches). `newWords` lists exactly their lemmas.
- `grammarTags` lists the tags the text practises; every one must be allowed for the chapter.
- `en` is a natural English translation of the whole sentence.

## Before you finish

- `npm run content:check` is green.
- Read every text once more as a French teacher: is anything unnatural, ahead of the grammar ceiling, or wrongly glossed? Fix it.
- You do not approve your own content. T-24 (a different agent) reviews it; list anything you are unsure about in your report.

## Conventions decided after the first round (lead, 2026-10-18)

- **Apostrophe:** straight `'` in French tokens and cards (the tokenizer accepts `’` too).
- **Articles:** definite *le/la/l'/les* → lemma `le` (gender on the token). Indefinite *des* → `un`. Partitive *du* → `du`, *de la* / *de l'* → `de` + `le`. *du/des/au/aux* meaning de/à + le/les → pos `contraction`.
- **Fixed multi-word phrases** (*s'il vous plaît*, *au revoir*, *il y a*, *d'accord*, *bonne journée*): every token carries the whole phrase as `lemma`, pos `phrase`, and the phrase meaning in `form`; `gloss` is that word's part.
- **Single tokens:** *aujourd'hui*, *rez-de-chaussée*, *après-midi* and hyphenated numbers (*quatre-vingt-deux*).
- **Grammar-ceiling readings for Stage 1** (QA confirms; see G-57): *et* may join nouns, adjectives and short clauses; *à* with places is fine from ch10 (and inside *aller à* in ch12); infinitives after *pouvoir/vouloir/devoir/savoir* are fine in ch12; questions wait for ch7 except *Ça va ?*; possessives, demonstratives, stressed pronouns and *mais* wait for their chapters.
