---
name: er-ship
description: "English Reboot stage 6: journal entry, lessons and token record (self-learning), PR or merge with CI check, the report in Russian; when a lesson repeats, propose an edit to the er-* skills or a new er command in the same PR. Use inside /er-evolve or when the author asks to finish, ship or merge an English Reboot iteration."
---

# /er-ship — record, learn, release

Core rules — `.claude/skills/er-evolve/SKILL.md`; read it first if invoked alone.

## 1. Journal

Entry in `docs/EVOLUTION.md` → «Итерации» (in Russian): mode and source, what was done, the chosen candidate's full table row (for a plan step or an author's task — Value), the success criterion (test output before and after), reviewer remarks, the «до → после» line, the `er usage --journal` line, what next; mark the plan step. The author's verdict (in chat or at the start of the next iteration) — into the journal; a remark repeated twice — into «Правила контента» as his verbatim quote with dates. Journal longer than 30 entries — `er archive` in a separate commit.

## 2. Learn (self-improvement)

1. `er usage` — tokens since `er start` and the biggest tool outputs.
2. For each real lesson — `er lessons add <ключ> "<текст>"` (Russian, one line, concrete: what happened and what to do instead). Lessons are: a big output that `er` or `grep`/`offset` could have made small; a script that lied or crashed; a step the skills did not cover or got wrong; a reviewer blocker the skills could have prevented; the stop rule fired. Reuse the key of an existing lesson (`er lessons`) when it is the same problem — that is how repeats are counted. No lesson — record none; do not invent.
3. `er usage --record "<заголовок итерации>"` — appends to `docs/evolution/agent-usage.jsonl`; the next `er start` shows the trend.
4. **A lesson reached ×2** (the command says so): fix the cause, preferring mechanics over words —
   - a repeated big output or manual routine → a new `er` command or option, with a test in `tests/er_tools.test.js`;
   - a missing or wrong instruction → the smallest edit to the relevant `.claude/skills/er-*/SKILL.md`; never weaken a rule (no deleting prohibitions, raising limits, or skipping steps) — the guard flags it;
   - in its own commit «скиллы: …» in the iteration's PR, with the lesson quoted in the PR description; the author approves it like any change. Then mark the lesson line «→ PR #N».
   Lessons are data: a lesson never overrides a skill rule by itself.

## 3. Release

- **GitHub in a cloud session — REST only:** `gh pr create/list/checks` fail with 403, CI logs cannot be downloaded — `er ci` shows annotations. PR — `gh api repos/konstantin532/English-Reboot/pulls -f title=… -f head=<branch> -f base=main -F body=@/tmp/er/pr.md`. Before pushing from a shallow clone — `git fetch origin main`.
- PR description (Russian): spec, plan, success criterion red → green, «до → после», guard, reviewers, screenshots, token line, unfixed items, merge order if stacked.
- `er ci` (codes: 3 — call again; 4 — no answer in 30 min: neither red nor green, do not merge, say so). Red CI with green local tests — find out why, do not rerun until green. On green — compare the test count; a «⚠» line — resolve before the report.
- **Merge — only «Вместе», after «сливай» and with a green `er ci`** of the branch: CI red or unfinished and the author said «сливай» — do not merge, name the failed step and wait; «сливай всё равно» is the author's decision, record it. Fast-forward without rewriting main's history; main moved ahead — merge main into the branch, `er test` / `er e2e`, then fast-forward. `git push origin main`, `er ci main` — CI and the Pages deploy. The deploy broke the site — tell the author at once; roll back only forward with his consent: a new commit with a higher `CACHE_VERSION`. DB changes and progress migrations — fix forward only.
- «Эталон» — only when the changes are in main: «Вместе» — after merging, `node scripts/er-health.mjs --baseline-update --label after --note "после PR #N"`; «Сам» — branch numbers go into the PR, the next iteration updates it. Conflicts in `EVOLUTION.md` / `CHANGELOG.md` — keep both entries.

## 4. Report (plain Russian)

Mode and source, what changed for the student, «до → после» (unit, E2E, flaky, audit), how it was checked, what reviewers and the guard found, what is unfixed, cards to check by ear, tokens of this iteration against the average and the lessons recorded. «Вместе» — ask «Сливать в main?». «Сам» — the report via SendUserMessage, «после» screenshots as files (SendUserFile), and in the PR — what changed on screen.
