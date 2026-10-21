# Third-party data licenses

Frenchy's code and its original lesson content are the project's own. This file lists the third-party **data** the app ships and what its licenses require. Add an entry here before shipping any new third-party data.

## Lexicon (`content/lexicon/*.json`)

The offline dictionary (word taps, form → lemma lookup) is built by `scripts/lexicon/build.ts` (T-08) from two sources. Both are share-alike, so **the generated lexicon files are licensed CC BY-SA 4.0** as a whole. That covers only those data files, not the app code that loads them: the code reads the shards as separate data, it is not a derivative of them.

### 1. Wiktionary, via kaikki.org (glosses, part of speech, gender, inflection tables)

- **Source:** English Wiktionary, French entries, as machine-readable JSON from kaikki.org: <https://kaikki.org/dictionary/French/> (file `kaikki.org-dictionary-French.jsonl`, the extract dated 2026-10-03).
- **Extraction tool:** wiktextract by Tatu Ylonen: <https://github.com/tatuylonen/wiktextract>.
- **License:** Wiktionary text is dual-licensed under the [Creative Commons Attribution-ShareAlike 4.0 License (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/) and the [GNU Free Documentation License (GFDL)](https://www.gnu.org/copyleft/fdl.html). kaikki.org redistributes it under the same terms. We use it under **CC BY-SA 4.0**.
- **What we changed:** kept only entries for the ~10,000 most frequent French lemmas (plus any lemma used in `content/`), up to 3 shortened English glosses per entry, and the single-word inflected forms from the inflection tables; re-encoded as JSON shards. A handful of glosses for function words (*au*, *aux*, *du*, *des*, *de*, *pas*, *en*, *que*) are written by hand in `scripts/lexicon/build.ts`, as are the elided forms (*l'*, *j'*, *qu'* …). T-24 added more hand-written glosses (`GLOSS_OVERRIDES`: *du*, *de*, *pas*, *en*, *que*, *voici*, *voilà*, *il y a*, *ce*, *après*, *œil*) where Wiktionary's gloss describes usage instead of translating. It also added the feminine forms of masculine nouns (*boulangère*), which Wiktionary lists as form-of entries in the noun's table, as extra forms of that noun.
- **Attribution text** (shown on the app's Credits page, `/credits`, linked from Me; B-21):

  > Dictionary data from [Wiktionary](https://en.wiktionary.org/) contributors, extracted by [kaikki.org](https://kaikki.org/) (wiktextract, Tatu Ylonen), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Modified.

- **Citation** requested by kaikki.org: Tatu Ylonen. 2022. *Wiktextract: Wiktionary as Machine-Readable Structured Data.* Proceedings of the 13th Conference on Language Resources and Evaluation (LREC), pp. 1317–1325, Marseille.

### 2. Lexique 3.83 (word frequency ranks)

- **Source:** Lexique 3.83, <http://www.lexique.org/> (file `Lexique383.tsv`, released 2019-06-04).
- **Authors:** Boris New and Christophe Pallier, with Ronald Peereman, Sophie Dufour, Christian Lachaud and others.
- **License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (stated in `README-Lexique.md` next to the file).
- **What we use:** only the lemma frequencies (`freqlemfilms2`, `freqlemlivres`, averaged) to rank lemmas and to order the readings of a form. The `rank` field in `lemmas-*.json` is derived from it. Two changes: Lexique spells *œ* as *oe* (*coeur*), so a Wiktionary lemma such as *cœur* takes the rank of its *oe* spelling; and `FREQUENCY_ALIASES` gives *que* and *où* (conjunction, adverb) the rank Lexique files under their pronoun readings, and *bonsoir* (interjection) the rank of its noun reading.
- **Attribution text:**

  > Word frequencies from [Lexique 3.83](http://www.lexique.org/) (Boris New, Christophe Pallier et al.), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

- **Citation:** New, B., Pallier, C., Brysbaert, M., Ferrand, L. (2004). Lexique 2: A New French Lexical Database. *Behavior Research Methods, Instruments, & Computers*, 36(3), 516–524.

### What the licenses require from us

1. **Attribution:** show both attribution texts above somewhere users can find them (credits screen), and keep this file in the repo.
2. **Share-alike:** anyone who receives the lexicon files may reuse them under CC BY-SA 4.0. Don't put extra restrictions on `content/lexicon/` (for example, don't claim it is proprietary).
3. **Mark changes:** the attribution says "Modified"; this file describes what was changed.
4. **No raw dumps in git:** the source dumps stay in the gitignored `scripts/lexicon/raw/`. Only the generated shards are committed.
