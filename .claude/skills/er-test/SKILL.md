---
name: er-test
description: "English Reboot stage 4: full quiet check of the branch — er finish / er wait for unit, E2E, audit, screenshots and the rule guard, «до → после» against the baseline, and a sample of cards for the author to check by ear. Use inside /er-evolve or when the author asks to test an English Reboot branch."
---

# /er-test — prove it works

Core rules — `.claude/skills/er-evolve/SKILL.md`; read it first if invoked alone.

1. Commit everything, then `er finish` and `er wait` (code 3 — call again; 4 — stuck, 2 — died: do what the output says; a manual run — with a note in the report). Do not run anything on port 8123 meanwhile.
2. Read only the summary:
   - **no fewer tests than before**, and the success-criterion test is green — by the «до → после» line; put the red line from `/tmp/er/iter/red.txt` and the green one side by side for the report;
   - flaky — into the backlog with the test name; E2E slower than the baseline by 1.5× with the same `nproc` — into the report;
   - **screenshots:** look only at the composites named in `/tmp/er-shots/diff/` (matching ones and «шум сглаживания» — no);
   - **guard:** fix every ✗ before the reviewers; «?» — resolve or leave to the reviewer; «[скилл]» — a change to agent instructions, see `/er-ship`.
3. Red — back to `/er-build` (logs — only by the paths in the summary, only what failed: `grep`, `tail`). Fixing a red here counts toward the stop rule.
4. **Cards changed** — a sample of 10–20 new or changed cards (random, fixed seed) for the author to check by ear: Claude does not hear sound. First — cards with connected-speech phenomena (gonna, flap t, didja): the synthesizer may read them clearly, and TTS voices differ on iOS, Android and Windows, so ask «как прозвучало и на каком устройстве/голосе» (better two voices). Mark a card «синтез читает чётко, в живой речи звучит так-то» only by the author's verdict.
5. Before pushing — a full `er test` on the committed tree, so `er ci` can compare the test count.

Green → `/er-review`.
