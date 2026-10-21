# KNOWNGAPS

One file per gap, risk or open question, named by its ID exactly as written: `G-07.md`, `G-79.md`. This file holds the rules only; never put a gap here.

- Human gates (H-NN), and questions only the user can answer, go under **Needs you** in `TODO.md`.
- New work you find goes into `BACKLOG.md` as a task block, not here.

Add a gap when you find a risk, a limit or an open question that outlives your task. If the user has to decide it, also add a line under Needs you.

## Format

```
G-NN · open · area · owner: B-NN · tags: <files or folders> — One-line summary

| ID | Gap / risk | Impact | Owner task |
|---|---|---|---|
| G-NN | What is missing or risky | What goes wrong because of it | Task that should close it, or `later` |
```

**Line 1** is the gap's index line, so `head -qn1 KNOWNGAPS/G-*.md` lists every gap. Its fields:

- **Status:**
  - `open`
  - `resolved`
  - `decided`: a default was chosen and accepted.
  - `superseded by G-NN`
- **Area:** as in `LESSONS/CLAUDE.md`.
- **owner:** the task that should close the gap now.
  - `later` if nobody plans to.
  - `user` if it waits on a decision from the user.
  - `none` if no task holds it yet. Then add a backlog task, or tell the lead.
- **tags:** the paths or globs the gap is about.

The table row below line 1 is the gap itself.

## Closing a gap

Close it in place. Never delete or renumber a file.

1. Set the status on line 1 to `resolved` (or `decided`, or `superseded by G-NN`).
2. Set the owner on line 1 to `none`.
3. Append to the row's last cell: `**Resolved (B-NN, PR #NN):** what changed`. Keep the original text.

## Numbering

- In a parallel wave, use only the G- numbers the lead reserved for your task (L-22).
- Otherwise, take the next number after the highest file (`ls KNOWNGAPS | sort -V | tail -1`).

## Finding gaps

- `head -qn1 KNOWNGAPS/G-*.md | grep ' · open · '` lists the open gaps.
- `grep -l 'owner: B-08' KNOWNGAPS/G-*.md | xargs cat` prints one task's gaps whole.
- `grep -l '<path or keyword>' KNOWNGAPS/G-*.md` finds gaps by file or topic.
- Don't read the whole folder. The lead pastes the gaps a task needs into its brief.
