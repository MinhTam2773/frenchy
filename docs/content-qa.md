# Stage 1 content QA (T-24)

An independent review of the Stage 1 lesson content written by T-14 (PRs #20 and #27): 34 texts, 8 grammar notes and 197 deck cards in `content/chapters/{appA,ch1,ch2,ch12,ch10,ch4,ch7,ch33}`. The reviewer did not write any of it. Every finding below has been fixed on the branch `task/T-24-content-qa` unless it is listed under "Accepted as is" or "For a native speaker".

## How it was checked

- **Every sentence read in full**, with its translation and every token annotation (lemma, pos, gender, form, gloss, isNew), plus every grammar note and deck card. The checks: grammar ceiling, natural French, gender, agreement, elision, contractions, translation, annotations, cloze answers and duplicates.
- **Scripted checks across chapters** (scratch scripts, not committed): `isNew` along the route order, questions before ch7, *Madame* / *Monsieur* capitals, the same phrase annotated two ways, one lemma under several parts of speech, typography (spaces, no-break spaces, apostrophes, gaps after an elision) and duplicate card fronts. The typography checks that B-22 will add found nothing.
- **Tools:** `npm run content:check`, `npm run lexicon:coverage`, and the content round-trip tests in `src/shared/text/` (`tokenize()` and `splitSentences()` against every lesson).
- **Lexicon:** rebuilt with `npm run lexicon:build` from the same raw dumps T-08 used (kaikki.org French extract of 2026-10-03, Lexique 3.83). The first rebuild, with the build script unchanged, gave the same shards plus the content's lemmas.

## Decisions

These settle the two questions L-78 handed to T-24 and the cases where the content was inconsistent. The brief `scripts/content/prompts/text.md` now states them.

| Decision | Why |
|---|---|
| **`isNew` means new to the course.** A lemma is marked in one text only: the first along the route (chapter order in `course.json`, then text id order, which is the order `getChapterTexts` lists) that marks it. A word may appear unmarked earlier, for example *être* in *c'est* before ch12. Every token of a new phrase is marked. | The reader highlights `isNew` words as new. 44 marks repeated a word an earlier text had already taught (*fraise* was new four times), so a learner on the route saw familiar words flagged as new. |
| **Fixed phrases are a closed list:** *s'il vous plaît*, *au revoir*, *il y a*, *d'accord*, *bonne journée* (the lead's five), plus *est-ce que*, *qu'est-ce que*, *à tout à l'heure*, *un peu*, *merci beaucoup*, *pas de problème*, *avec plaisir*, *pourquoi pas*. In *il n'y a pas*, `ne` and `pas` stay words. *ça va*, *bon voyage*, *bon courage*, *avoir faim* and the like stay word by word, with the expression in `form`. A single word is never pos `phrase`. | Wiktionary has an entry for almost every formula, so "it has a dictionary entry" can't be the rule. The list holds the formulas Stage 1 already treated as phrases somewhere; the others agree or conjugate (*bonne nuit*, *ça va bien*). ch12 had *il y a* word by word, and *un peu*, *merci beaucoup* and *pas de problème* were split both ways. |
| **The brief's *est-ce que* line** now says the three tokens are fixed-phrase tokens (lemma `est-ce que`, pos `phrase`). | It still described three ordinary tokens after the phrase convention was adopted (L-78). All ch7 and ch33 content already followed the convention. |
| **Grammar ceiling (G-57):** the lead's reading holds. The one addition is that *Et toi ?* goes with *Ça va ?* as part of the greeting exchange. Any other question before ch7 is rewritten. | The ch2 dialogue asked three questions by intonation. |
| **Lemmas follow the lexicon** for feminine nouns: *infirmière* is its own lemma, while *boulangère* and *professeure* take *boulanger* and *professeur* (Wiktionary lists them as forms of those words). *elles* is its own lemma, like *ils*. | Coverage needs the lemma to match a lexicon reading, and so do word statuses later (B-02). |
| ***madame* / *monsieur* + name take a small letter inside a sentence** (*Je connais madame Roux*). They keep a capital at the start of a sentence. | French typography rule; ch1 already wrote *madame Lemoine*, while ch10 and ch12 used capitals. |
| **US English** for translations and glosses, matching the UI (*color*, *center*). | The content mixed *Mum* / *Mom*, *neighbourhood* / *neighborhood* and *programme*. Floors stay *ground floor* / *first floor*, the French count, because the ch4 deck note explains it. |
| **Phone numbers use a range reserved for fiction** (04 65 71 xx xx). | The ch4 dialogue read out a realistic, dialable landline. |

## Findings and fixes

### Cross-chapter

| Finding | Location | Fix |
|---|---|---|
| 44 `isNew` marks on words an earlier text had already marked | 21 texts in ch1 to ch33 | Marks removed. 22 words that are central to their text and appear there for the first time in the course gained a mark: *baguette*, *table*, *faire*, *matin*, *après-midi*, *parler*, *manger*, *vingt*, *dix*, *avril*, *sœur*, *arriver*, *où*, *question*, *demander*, *qu'est-ce que*, *est-ce que*, *pourquoi*, *midi*, *train*, *pratique*, *espagnol*. Every text still has 4 to 8 new words. |
| *il y a* annotated word by word (8 times), unlike everywhere else | ch12 (4 texts) | Phrase lemma |
| *un peu* (2), *merci beaucoup* (1), *pas de problème* (2), *à tout à l'heure* (1) word by word, while other texts had them as phrases | ch12, appA, ch10 | Phrase lemma; appA keeps its sound notes in `form` |
| *voici* / *voilà* tagged pos `phrase` (7 tokens) | ch12-la-famille-martin, ch4 (2 texts), ch7-a-l-office-de-tourisme | pos `preposition`, as in the lexicon and every other text |
| *Madame* / *Monsieur* capitalized inside a sentence (4 times) | ch12-le-quartier (text and deck), ch10-le-soir-chez-les-moreau | Small letter |
| UK spellings in translations and glosses | appA, ch2, ch4, ch7 | *Mom*, *neighborhood*, *program*, *flavor*, *five-story*, *harbor*, *butcher shop*, *bookstore*, *candy*, *soccer ball* |

### By chapter

| Finding | Location | Fix |
|---|---|---|
| Title *Rue ou roue ?* and the cloze *Rue ou ___ ?* are questions before ch7 | appA-rue-ou-roue, deck `appA-rue-ou-roue` | Title *Rue ou roue*; the cloze uses the text's own line *Rue, ___.* |
| *entrée* glossed "starter": in US English an entrée is the main course | ch1-ardoise-du-cafe | Gloss "appetizers", and the `form` notes the false friend |
| *boulangère* had its own lemma | ch1-la-vitrine | Lemma *boulanger* (gender f) |
| Three questions by intonation in a ch2 dialogue (*Et les chaussures ?*, *Le manteau et le chapeau ?*, *Et le billet ?*) | ch2-la-valise | *Maintenant, les chaussures.* / *Ensuite, le manteau et le chapeau.* / *Et le billet !* |
| Deck notes say "-age is a masculine ending" and "-eau is a masculine ending", but *la plage*, *la page*, *l'image*, *l'eau* and *la peau* are common A1 words | ch2 deck: `ch2-cloze-un-garage`, `ch2-cloze-un-gateau`, `ch2-manteau-chapeau`, `ch2-patinage-cyclisme`, `ch2-la-table-mise` | "usually masculine" plus the exceptions |
| `bien` in *J'aime bien* glossed "really": *aimer bien* is softer than *aimer* | ch10-le-cours-de-chant | Gloss "quite"; `form` explains |
| Realistic phone number *04 70 22 15 81* | ch4-vite-emma, deck `ch4-le-numero-de-mamie` | *zéro quatre, soixante-cinq, soixante et onze, vingt-deux, quatre-vingt-un* (04 65 71 22 81), which now also practises *soixante et onze* from the chapter note |
| *elles* with lemma *elle* | ch4-a-la-boulangerie | Lemma *elles* |
| Curly apostrophe in French inside a card note (*d’*) | deck `ch4-pas-d-ascenseur` | Straight `'` |
| *Super ! Merci, Sophie.* stored as one sentence | ch7-le-premier-jour | Two sentences, as `splitSentences()` and the other dialogues split them (G-55) |
| The cloze answer *qu* is part of a word (*Est-ce ___'elle*) | deck `ch7-est-ce-qu-elle-est-bonne` | Blanks the whole elided token: *Est-ce ___elle*, answer *qu'*, the way ch1 blanks *l'* |
| *C'est la première fois ici ?* sounds off: a speaker would say *ta première fois*, but possessives aren't allowed yet | ch33-au-cafe-des-langues, deck `ch33-c-est-la-premiere-fois-ici` | *Première fois ici ?*, the spoken short form |
| *Oui. Je ne joue pas le soir !* reads abruptly without *mais* (not allowed yet) | ch33-la-nouvelle-voisine | *Je joue le matin, pas le soir !* The ne … pas card stays in the deck. |
| Title *Le premier jour* repeats ch7's title | ch33-le-premier-jour | *Bienvenue dans l'équipe* (the id is unchanged) |
| *infirmière* had lemma *infirmier* | ch33-au-cafe-des-langues | Lemma *infirmière* |
| The front "Do you speak English?" also appears in ch7's deck, and T-22's `POST /api/cards` dedupes on type + front | deck `ch33-vous-parlez-anglais` | "Do you speak Spanish?" → *Est-ce que vous parlez espagnol ?* |

## Lexicon (G-58) and coverage

Coverage was **87.8 %** (2184 of 2487 word tokens). It is now **99.2 %** (2469 of 2488). The 19 misses left are first names and surnames that Wiktionary doesn't list as French names (Malik, Amina, Nora, Karim, Benali, Lina, Awa, Tom). Lesson tokens carry their own annotation, so the reader shows them correctly.

| Cause | Fix (in `scripts/lexicon/`, out of T-24's Owns) |
|---|---|
| The shards were built before T-14 wrote any content, so the build's "keep every lemma the content uses" rule had nothing to keep: names, *bonsoir*, *persil*, *natation*, hyphenated numbers, *après-midi* and phrase lemmas were all missing | Rebuilt from the same dumps. |
| **No word with œ was in the lexicon** (*cœur*, *sœur*, *œil*, *œuf*, *bœuf*, *vœu*…). Lexique 3.83 spells œ as *oe* (*coeur*), so none of them got a frequency and all fell out of the top 10,000. G-58 suspected a key-normalization bug, but `formKey()` and `shardOf()` were fine | `readFrequencies()` also stores the œ spelling. *cœur* is now rank 282, *sœur* 470. |
| *où* is an adverb in Wiktionary but a pronoun in Lexique, so it had no frequency; *bonsoir* is an interjection versus a noun | `FREQUENCY_ALIASES`; *où* is now rank 35. |
| Wiktionary files most feminine nouns (*boulangère*, *professeure*, *vendeuse*, *actrice*) as "form of" entries, which the build skips | A masculine noun's `feminine` table form becomes a feminine singular form of it. |
| Learner-hostile glosses: *voici* → "ago", *voilà* → "it has been, ago", *il y a* → "ago" as the first or only gloss; usage-note text in *ce* ("see § Usage notes") and *en*; "Indicates the continuous aspect" for *après*; *œil* → "glyph, rendering of a single character" | `GLOSS_OVERRIDES` (also G-56) |
| A phrase token (*il y a*) can never match a single form, so `lexicon:coverage` counted all 171 as misses | `coverage.ts` counts a phrase token as found when the lexicon knows its word, and prints how many tokens that covers. |

## Accepted as is

| Item | Why |
|---|---|
| *Ça va ? Et toi ?* before ch7 | Fixed greeting exchange (`phrases.greetings`) |
| *Tu t'appelles comment ?* and *je m'appelle* use a reflexive verb | Taught as fixed phrases by `phrases.introductions` (ch33) |
| Floors: *premier étage* = "first floor", above the "ground floor" | The French count; the deck note `ch4-au-quatrieme-etage` explains it |
| A sentence practised twice, as a production card and as a cloze (`ch1-coin-des-enfants`, `ch2-gateau-au-chocolat`, `ch4-ca-fait`, `ch4-nous-sommes`) | Different skills (sibling cards); the fronts differ |
| Stiff lines forced by the ceiling, for example *Hugo est un ami.* (no *son ami*), and statement-only, name-heavy texts in ch1 to ch10 | G-57: the ceiling is a product decision; the French is correct |
| *Le billet… Euh… Ah, voilà le billet !* is one sentence in the content, while `splitSentences()` splits it | A hesitant single utterance; the remaining G-55 difference is the splitter's heuristic, not a content error |
| *J'habite à Roubaix. Je ne connais pas Lille.* (Roubaix borders Lille) | Plausible for someone new in the area, and not a language error |

## For a native speaker (G-02)

The reviewer is an AI. These are the judgment calls a native speaker should confirm:

1. *Première fois ici ?* (ch33-au-cafe-des-langues) as the natural short question, and *Je joue le matin, pas le soir !* (ch33-la-nouvelle-voisine) as the reassurance.
2. *Et le billet !* as a reminder (ch2-la-valise), and *Maintenant, les chaussures.* / *Ensuite, le manteau et le chapeau.* as packing lines.
3. *C'est cadeau !* (ch1-au-marche), colloquial for "it's on the house".
4. *laver la vaisselle* (ch10-le-soir-chez-les-moreau) where *faire la vaisselle* is more usual.
5. The menu lines with articles (*Les entrées : la soupe du jour, l'œuf mayonnaise.*, ch1-ardoise-du-cafe); a real menu drops them.
6. *rigoler* (ch7, ch10) as the register for a narrator, rather than *rire*.
7. *Malik est un ami du quartier.* and *Hugo est un ami.* as the possessive-free way to introduce a friend.
8. The 04 65 71 range: confirm it is still ARCEP's range reserved for fiction before launch.

## Verification

```
npm run content:check    → content:check OK: 39 chapters, 98 grammar tags, 34 texts, 197 deck cards
npm run lexicon:coverage → Lexicon coverage: 2469/2488 word tokens in content/ (99.2%; 171 phrase tokens counted by their word)
npm run lexicon:build    → 10188 lexemes (10084 lemma+pos, 2488 content tokens), 97906 forms, 128953 readings, 54 files
                           size: 14.18 MB raw, 1.05 MB gzipped
npx vitest run src/shared/lexicon src/shared/text src/shared/content → all pass
```
