# LESSONS

One file per lesson, named by its ID exactly as written: `L-07.md`, `L-127.md` (no zero padding). This file holds the rules only; never put a lesson here.

Add a lesson whenever something surprised you, an assumption was wrong, you found a bug's root cause, you needed a non-obvious workaround, or the user corrected you. First check that no lesson covers it already: `grep -il '<keyword>' LESSONS/L-*.md`.

## Format

```
- `L-NN · YYYY-MM-DD · area · task` — **What happened.** → **Rule from now on.**

Status: active · Tags: <area>, <files, folders or tools it is about>
```

- **Line 1** is the whole lesson on one line, so `head -qn1 LESSONS/L-*.md` lists every lesson. Never edit it after it merges, except to fix a typo.
- **Status** is one of:
  - `active`
  - `superseded by L-NN`: a later lesson replaces the rule.
  - `obsolete (why)`: the code it describes is gone.
  - `duplicate of L-NN`

  Add `; see L-NN` to point at a related lesson.
- **Tags:** the area first, then the paths, globs or tools the lesson is about, comma-separated. The lead matches these against a task's `Owns` list.
- **Areas in use:** a11y, ai, auth, build, ci, client, content, db, design, e2e, lexicon, licensing, orchestration, pwa, security, srs, streak, testing, text, tooling, worker. Add a new one only when none fits.

## Numbering

- In a parallel wave, use only the L- numbers the lead reserved for your task (L-22). Reserved numbers nobody used stay unused.
- Otherwise, take the next number after the highest file (`ls LESSONS | sort -V | tail -1`).
- Never renumber and never delete. When a lesson stops being true, change its `Status` line. A correction is a new lesson whose status line the old one points at.

## Finding lessons

- `grep -l '<area, path or keyword>' LESSONS/L-*.md | xargs cat` prints the matching lessons whole.
- `grep -L 'Status: active' LESSONS/L-*.md` lists the lessons that no longer apply as written.
- Don't read the whole folder. The lead pastes the lessons a task needs into its brief.
