---
name: er-spec
description: "English Reboot stage 1 (Scout + Product): research competitors when due, score 3–5 candidates and choose one improvement for understanding and speaking American English, with a checkable success criterion. Use inside /er-evolve or when the author asks what to improve next in English Reboot."
---

# /er-spec — what to build and how we know it worked

Core rules (language, trust, modes, `er`) — `.claude/skills/er-evolve/SKILL.md`; read it first if this stage was invoked alone.

**Skip this stage** when the task is set: a step of an approved author's plan (the «следующий» line of `er start`; a step that contradicts the goal or the rules — ask the author, in «Сам» describe it in the PR) or a concrete task from the author. Then write only the success criterion into `/tmp/er/iter/spec.md` and go to `/er-plan`.

## 1. Research (Scout) — only if `er start` prints «РАЗВЕДКА … НУЖНА»

At most ~10 searches; products change — check, do not recall. For each competitor: what it does for understanding live speech and speaking, what we lack (by the code — `grep`, not memory), what we already do better. Short, with links — into a section «Разведка <дата>» (in Russian). The competitor list lives in the last «Разведка»; none — start from: Lingopie, Language Reactor and Trancy, LyricsTraining, Musixmatch, YouGlish, ELSA Speak, Speak and Praktika, Duolingo, FluentU, Pimsleur. 1–2 of the same searches — research on connected-speech perception and speaking (shadowing, decoding); each finding — a link and one line "what was shown and on whom". A competitor's idea — a principle, never its design or texts.

## 2. Choose one improvement (Product)

Read `docs/PEDAGOGY.md` once (it is the pedagogy source; reviewers use it too). 3–5 candidates from the backlog (`er brief --section Бэклог` only if the summary's 12 lines are not enough) and research — a table in `EVOLUTION.md`:

| Кандидат | Польза 0–3 | Уверенность 0,5–1 | Усилие 1–3 | Риск 0–2 | Офлайн и правила да/нет | Балл |

**Score = 2 × Value × Confidence − Effort − Risk**; "no" in compatibility — strike out.
- **Value:** 3 — the student speaks aloud more every day or decodes connected speech better by ear; 2 — the same, less often or in part of the lessons; 1 — indirect (a bug, confusion, untruth about progress); 0 — cosmetics.
- **Confidence** — who confirmed the value; never raise it for yourself: 1 — the author (a complaint, request, verdict by ear) or his metric export (`docs/metrics/`); 0.75 — research linked in the row that studied adults or teens learning a foreign language and measured listening or speaking (not satisfaction); 0.5 — a guess or "a competitor did it".
- **Effort:** 1 — a few files, no new screen; 2 — a new module or a big change; 3 — a new screen or the core and the base.
- **Risk:** 0 — does not touch the core, base, FSRS, offline or progress; 1 — one of them; 2 — several or students' progress. Until there is a load test, a content or schedule change gets Risk +1.

Highest score wins (into the journal — its full row and one line why not the runner-up); on a tie — lower risk, then an area not touched in the last two iterations. Backlog trifles with risk 0 — along the way, separate commits.
- **Main metric:** only the «МЕТРИКА АВТОРА» line of `er start`. No line — the choice is blind; say so in the report.
- **Against endless polishing:** the last three journal entries have Value ≤ 2 and the backlog holds a Value 3 candidate — propose the author a step-by-step plan for it instead of another trifle.

## Pedagogy rules (reasons, numbers, sources — `docs/PEDAGOGY.md`)

- **Honest bar.** 22 hours is not a CEFR level: promise no more than PEDAGOGY §1.
- **Listening — decoding, not meaning.** Value 3 for listening is decoding: short dictation, "how many words", missing function words, a phrase in full and spoken form. "What is the scene about" — Value 2 at most.
- **Speaking — from memory first.** Russian prompt → the student says it → hears the model → compares with own recording. Shadowing — after, not instead. Fluency: the same talk faster (4/3/2).
- **Pronunciation — what blocks understanding.** First: word stress, /ɪ–i/, /æ–ɛ/, /ʊ–u/, /ʌ–ɑ/, final voicing, /w–v/, can/can't; /θ ð/ later.
- **One new thing per card**; connected speech by frequency: weak forms → flap t → contractions → linking (didja) → h-dropping → rap forms last.
- **Recognize ≠ say.** Slang, rude words, AAVE — explained respectfully, for recognition; the student says neutral spoken American. No "recognize / say" field yet — never put them into phrases to say.
- **No pretending.** No pronunciation scores; feedback is the recording next to the model.
- **Missing data is said, not invented:** "frequency: not checked", "transfer not measured".

## Output

`/tmp/er/iter/spec.md` (in Russian, ≤ 15 lines): the improvement, its table row, what the student will notice, **success criterion** — a checkable statement plus the test that proves it (for a bug — the test that reproduces it). Then `/er-plan`.
