---
name: er-review
description: "English Reboot stage 5: two independent reviewers with a clean context — code reviewer always, pedagogue reviewer when card text, IPA or word markup changed — using the prompts er review prepares; blockers fixed and rechecked once. Use inside /er-evolve or when the author asks to review an English Reboot branch."
---

# /er-review — two clean pairs of eyes

Core rules — `.claude/skills/er-evolve/SKILL.md`; read it first if invoked alone. `er finish` already built the package; after later fixes — `er review` again (base: the branch of an open PR underneath, otherwise `main`; manually — `--base <ref>` or `ER_BASE`).

- **Code reviewer** — always, prompt `/tmp/er/review/prompt-code.md`. **Pedagogue reviewer** — when card text, IPA or the word-markup engine changed (`er review` says whether needed), prompt `/tmp/er/review/prompt-pedagogue.md`.
- Each is a **separate subagent with a clean context** (it did not see how the work was done). Both needed — start them at once, in one message; pass the prompt file content as is (paths are inside — give reviewers paths, not texts).
- A reviewer answers "blocker / important / minor" with file:line (or card id), or "no issues" — in English. Save each answer as is to `/tmp/er/review/answer-<code|pedagogue>-<N>.md` right away: it survives context compaction.
- Fix blockers (back to `/er-build` rules) and send the fix diff to **the same** reviewer (SendMessage — context kept) for one recheck. A blocker remains — do not merge and do not call the PR ready: describe the dispute in the report (in «Сам» — PR marked «блокер ревизора не снят»), the author decides. "Important" and "minor" — fix, or list as unfixed in the report.
- Each subagent costs tens of thousands of tokens: start no other subagents. Cannot start one — check yourself by the same prompts and write «ревизия без чистого контекста» in the report.
- A remark that the skills themselves caused (an instruction was missing or wrong) — note it for a lesson in `/er-ship`.

Done → `/er-ship`.
