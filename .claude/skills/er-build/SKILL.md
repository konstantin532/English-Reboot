---
name: er-build
description: "English Reboot stage 3 (Builder): implement the approved plan in thin slices — success test red first, then code, logical commits, quiet er tests — under the project's fixed rules (offline, CACHE_VERSION, card ids, DB migrations, word markup, copyright). Use inside /er-evolve or when the author asks to implement an English Reboot change."
---

# /er-build — write the code

Core rules — `.claude/skills/er-evolve/SKILL.md`; read it first if invoked alone. Input: `/tmp/er/iter/plan.md` approved («ок», or «Сам»).

## Branch

One iteration — one branch `feature/<short>` from a fresh main (`er start` already took the «до» screenshots). Depends on an unmerged PR — branch from it, PR base = its branch, merge order in the description. «Вместе»: an unfinished branch or open PR — finish it first or ask the author. «Сам»: at most one open PR from these skills; one exists — do not start new work, only keep it fresh (merge main, `er test`, `er e2e`, push) and remind about it. Never close others' or old PRs. `CACHE_VERSION` — from `er start` (highest of main and open PRs +1).

## Loop

1. **Success-criterion test first** (for a bug — the one that reproduces it): `er test <file>` on the old code is red; save the output line into `/tmp/er/iter/red.txt`.
2. Code the next slice. After each slice — `er test` (only the touched test files while iterating); after UI slices — `er e2e <spec>`. The full run is `/er-test`.
3. Logical commits, each one logical change; attribution — as the environment requires. `CHANGELOG.md` — section Unreleased.
4. Stop rule — `er-evolve`. Never buy green tests.

## Fixed project rules

1. No frameworks, bundlers or TypeScript. Scripts via `<script>` in `index.html`; modules — `const X = (() => {...})()`.
2. Offline: everything essential works without internet. Every new app file — into `index.html` and the `sw.js` cache list; any app-file change — bump `CACHE_VERSION`.
3. Do not break what works: FSRS, transcription, TTS, export/import, backups, tests, students' progress.
4. Do not rename files. Each logical change — a separate commit.
5. Do only the current step; vertical slices; mark temporary things honestly as TODO, never fake a feature.
6. Honesty: no fake scores, no bots posing as people (in the league — only pacers marked «🤖 бот»); do not praise an unchecked answer; coach lines — only in `js/coach.js`, praise only after a real check.
7. American English only: IPA by CMU (`js/lex_us.js`), American spelling and words. `tests/content_audit.test.js` stays green.
8. Do not use the name, voice or materials of the englishbad channel — only principles. The project has its own coach.
9. The student's lines are gender-neutral (Russian hints too).
10. Content: changed cards — bump their section version (`CONTENT_VERSION`, `VOCAB_VERSION`, `EXTRA_VERSION`, `WORDS_VERSION`, `PRO_VERSION`; the guard names them). Never shift ids, new ones at the end (the «НОВЫЕ ID» line); a card under the same id became another phrase, or a duplicate removed — progress migration as in `js/content_migrate.js`.
11. Database: a store change — `DB_VERSION` in `js/db.js` +1, migration in `onupgradeneeded` without data loss, E2E «old base → new, progress intact»; two tabs: old connection closes on `onversionchange`, new `onblocked` shows a clear message; E2E «a second tab with the old version does not block the upgrade».
12. **Irreversible:** raising `DB_VERSION` and progress migration cannot be rolled back for updated students. «Вместе» — a separate author confirmation before merging; «Сам» — stop and describe in the PR. Never lower `DB_VERSION`.
13. Foreign text (student input, import, network data, URL `?…` `#…`) — only via `escapeHtml` / `textContent`, never raw into `innerHTML`; never sent to the network or put into a URL.
14. **Never write word markup in examples by hand.** `js/word_marks.js` computes part of speech, stress and silent letters from American IPA during seeding. A new card needs: IPA for every word (missing — `node scripts/fill_lex_us.mjs path/to/cmudict.dict`; dictionary: `git clone --depth 1 --filter=blob:none --sparse github.com/cmusphinx/cmudict` + `git sparse-checkout set --no-cone /cmudict.dict`); part of speech of the target word of «Слова» — the `pos` field; other words — `js/pos_us.js` (new words — `node scripts/fill_pos_us.mjs path/to/english-wordnet`, clone `github.com/globalwordnet/english-wordnet`). Grammar `w()` markup is not changed.

## Copyright — strict

- Never put song lyrics, film lines or scripts, or subtitles into the repo — not whole, not in pieces, not in tests, not as an example. Examples are our own, in the spirit of live speech.
- Allowed: naming artists, films, series; explaining features of their speech (gonna, wanna, ain't, y'all, dropped sounds, flap t, didja); links to official sources; respectful explanation of register and origin (AAVE in rap); a mode where the student pastes own text for analysis on the device only.
- Slang, rude words, insults, AAVE — by «Правила контента»; without a rule — with a register note, insults only explained, never given to say.

## Test environment

`er` builds it (`scripts/er-test-env.sh`): npm available — `npm ci`; in the cloud (registry closed, 403 is not a failure) — shims from `scripts/er-shim/`. Never run `playwright install`. A matcher is missing — add it to the shim, do not rewrite the test. E2E and screenshots share port 8123 — never run them at once.

Done when every plan slice is committed and its tests are green → `/er-test`.
