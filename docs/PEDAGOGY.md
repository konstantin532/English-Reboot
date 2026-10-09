# English Reboot — pedagogy: how to judge value

Decision criteria for the english-reboot-evolve skill: the Product role (Value, Confidence), the Builder
(cards, exercises) and the pedagogue reviewer. The skill keeps one-line rules; this file holds the reasons,
the numbers and the sources. Read it once per iteration at step 3 (choice) and step 4 (plan).

Sources here are for checking. A source goes into the choice table only if it was opened in this iteration.
Where the project lacks data or a feature that a rule needs, the rule says so — never invent the missing part.

## 1. The honest bar

- 15 min × 90 days ≈ 22 hours. One CEFR level is usually planned at about 200 guided hours (Cambridge estimate).
- A2 vocabulary ≈ 1,500–2,500 words (Milton & Alexiou 2009). A film without support needs ~3,000 word families
  plus proper nouns for 95% coverage and ~6,000 for 98% (Webb & Rodgers 2009).
- Realistic in 90 days: a few hundred frequent spoken phrases said without a pause; recognizing connected
  speech in known words; following scenes with known vocabulary and own material with English subtitles.
- Promise students no more than that (rule 7). The product goal is the author's: report the gap to him once,
  in numbers, and record it in EVOLUTION.md — not every iteration.

## 2. Listening: decoding, not meaning

- Learners fail more often to recognize a known word in the stream than to understand the meaning (Field 2008).
- Value 3 for listening = decoding: short dictation, "how many words did you hear", missing function words,
  one phrase in full and in spoken form.
- "What is the scene about?" trains guessing from context, not listening — Value 2 at most.

## 3. Speaking: from memory first, then the model

- Order: Russian prompt → the student says it → hears the model → compares with own recording.
- Retrieval strengthens memory more than re-study (Karpicke & Roediger 2008 — shown on word pairs, not speech;
  the transfer to speaking is an inference).
- Shadowing — for rhythm and perception, after, not instead: it helped weaker listeners most and raised
  partial dictation within a month (Hamada 2016; Japanese university students, other groups not studied).
- Fluency grows from repeating the same talk with less time (4/3/2: Arevart & Nation 1991; de Jong & Perfetti
  2011) — in scenes and improvisation, repeat the same thing faster instead of a new topic every time.
- The unit is a ready phrase, not a word: the phrase stock drives perceived fluency (Boers et al. 2006).

## 4. Pronunciation: what blocks understanding, not accent

- Intelligibility, not accent (Munro & Derwing 1995); functional load (Munro & Derwing 2006).
- For Russian speakers first: word stress (hurts the listener most — Field 2005); vowels /ɪ–i/ (ship–sheep),
  /æ–ɛ/ (bad–bed), /ʊ–u/ (full–fool), /ʌ–ɑ/ (cut–cot); final voicing carried by vowel length (bed–bet; Russian
  devoices); /w–v/.
- Later: /θ ð/ (low load, "th as t/s" is understood), dark l, exact r.
- US listening trap number one: can /kən/ vs can't /kæn(ʔ)/ — vowel and stress differ, the t is often silent.

## 5. Connected speech: by frequency, one new thing per card

- Rough frequency order in conversation: weak forms of function words (to /tə/, and /ən/, for /fɚ/, them /əm/),
  flap t (water, got it), contractions (I'm, gonna, wanna), linking at word boundaries (did you → didja,
  got you → gotcha), h-dropping in pronouns (tell him → tellim), t-dropping after n (twenty → twenny),
  rap forms (Imma, ain't) — last.
- A new card has one new thing: a new word, or a new phenomenon, or a new construction; everything else is known.
- Frequency: SUBTLEX-US (US film and TV subtitles; Brysbaert & New 2009) — as a number in the plan. The repo has
  no SUBTLEX-US data yet (backlog): until it does, write "frequency: not checked", never a number from memory.

## 6. Several voices

- Training on several talkers barely changes the immediate result, but helps with new talkers and keeps the
  skill longer; little effect on pronunciation (meta-analysis Zhang, Cheng & Zhang 2021; wide intervals).
- Real speech is always a new talker, so listening exercises should use all available en-US device voices in
  turn. How many there are depends on the device — check in code and E2E, do not assume.

## 7. Recognize vs say — two different lists

- Slang, rude words, AAVE features (habitual be, ain't, double negation) are a real grammar and register:
  explain them respectfully, as a system, for recognition.
- The student says neutral spoken American English.
- A card should be marked "recognize" or "say", and a "recognize" card must not ask to say it aloud.
  The app has no such field yet (backlog): until it does, do not put slang, rude words or AAVE into phrases
  the student is asked to say.

## 8. Songs and films

- Songs — for ready phrases and rhythm, not a model of spoken pronunciation: singing stretches vowels and shifts
  stress; tell the student so.
- Order by speed and slang density: slow pop → sitcom → drama → rap.
- The student's own material: first with English subtitles, then without. English subtitles improve
  comprehension and word learning compared with none (meta-analysis Montero Perez, Van den Noortgate & Desmet
  2013); Russian subtitles help follow the plot but do not link sound to spelling.

## 9. Daily budget in numbers

- Day time = reviews × time per review + new cards × time per new card + exercises.
- Numbers come from an FSRS simulation and from step timings in E2E, not from memory. The load test is in the
  backlog; until it exists, a plan estimates new cards and reviews per day and says it is an estimate.
- Does not fit — fewer new cards, not faster reviews.
- Lower desired retention means fewer reviews but more forgetting: change it only with the load test and the
  author's consent.

## 10. Measure transfer, not memory

- Listening progress is measured on control phrases outside SRS: known words, practiced phenomena, but not in
  the student's cards. Accuracy on memorized cards shows memory, not listening.
- The app has no such measurement yet (backlog). Until it does, Value 3 cannot be shown on new phrases — score
  by the skill's Value scale and say "transfer not measured".

## 11. Feedback without pretending

- Neither the app nor Claude hears the student: no pronunciation scores (rule 7).
- Honest feedback is the student's own recording next to the model, replayed in turn.
- Cloud speech recognition breaks offline mode and rule 13.

## 12. Word markup colors: few, distinct, meaningful

Author, 2026-10-08: the palette must not look like one color in different shades. Rules
(`css/style.css`, block POS-PALETTE; guarded by `tests/palette.test.js`):

- **Distinct by eye.** Any two palette colors differ by ΔE2000 ≥ 20 in the light and in the dark theme, and every
  line is visible on the card background (ΔE2000 ≥ 25). Shades of one hue for different parts of speech are not allowed.
- **Few colors, chosen by meaning.** People reliably tell apart about 8–10 categorical colors, so color goes only to
  what the learner must notice: noun — blue (things), verb — red (action), irregular verb — orange double line
  ("warning: the form changes", all forms: take, takes, took, taken), adjective — green, adverb and phrasal-verb
  particle — purple (it sits next to the verb), pronoun — teal (stands for a noun), preposition — brown (the
  "coordinates" of an action: in, on, at). Helpers of the verb (modal — solid, auxiliary — dashed) share one dark
  line: they build questions and negatives. Articles, conjunctions, determiners, numbers and `to` — one gray dotted
  line: short glue words that should not pull the eye.
- **Line style carries meaning too**, so a learner with weak color vision still sees solid / double / dashed / dotted.
- **One meaning per visual signal.** Red belongs to verbs; the stressed syllable is bold on a neutral gray background, not red
  (yellow is taken by "surprise sounds").
- **Why "irregular".** The past of these verbs is not formed by the rule "+ed" but by a vowel or whole-word change
  (go → went). They are the oldest and most frequent verbs; frequent use kept the old forms alive, so films and songs
  are full of them. American forms only (get – got – gotten, dive – dove); British forms (got as a participle) may be
  mentioned for recognition, never taught to say (EVOLUTION.md, «Правила контента», 2026-10-09).
- **A legend is always one tap away** (Settings → markup layers): each color with its question (who? what? what
  to do? which?) and an example word.
