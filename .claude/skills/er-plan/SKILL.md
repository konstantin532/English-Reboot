---
name: er-plan
description: "English Reboot stage 2: turn the spec into a 10–15 line plan (what the student sees, files, tests, risks, load per day) and get the author's «ок». Use inside /er-evolve or when the author asks to plan an English Reboot change."
---

# /er-plan — how to build it

Core rules — `.claude/skills/er-evolve/SKILL.md`; read it first if invoked alone. Input: `/tmp/er/iter/spec.md` (or the author's task / the plan step).

Write `/tmp/er/iter/plan.md` (in Russian), **10–15 lines, no code**:
- what the student sees and does (one or two lines);
- files to change — found with `grep -n` / `er brief`, not by reading whole files; new app files go into `index.html` and the cache list of `sw.js`;
- tests: the success-criterion test first, then protective ones (honesty included); which E2E spec covers the UI;
- risks: does it touch the base (`DB_VERSION`), progress migration, FSRS, offline, TTS — name them; an irreversible step (rule 12a in `/er-build`) gets its own line «нужно отдельное подтверждение автора»;
- TODO honestly marked;
- **for content:** how many cards, which levels and topics, which connected-speech phenomenon, one new thing per card, frequency (SUBTLEX-US if in the repo, otherwise "not checked"), "recognize" or "say", **estimated new cards and reviews per day** (formula — PEDAGOGY §9): 15 minutes is a budget;
- the success criterion from the spec, word for word.

Slice it vertically: each step leaves the app working and tested; 1–4 steps per iteration. More than that — the plan is too big: cut it and leave the rest in the backlog.

Then:
- **«Вместе»** — show the plan to the author and wait for «ок» (not needed if the author set the task himself — then the plan is the first line of the report). A change the author asked for — rewrite the plan, show it again.
- **«Сам»** — the plan goes into the PR description; go on to `/er-build`.
