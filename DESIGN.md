---
name: English Reboot
description: A 90-day road to spoken American English, signed like a US interstate.
colors:
  guide-green: "#006B3F"
  guide-green-deep: "#005632"
  sign-white: "#FFFFFF"
  sign-legend-soft: "#D4E8DD"
  gantry-charcoal: "#1A201D"
  gantry-panel: "#252D29"
  caution-yellow: "#FFCD00"
  caution-ink: "#141A17"
  concrete: "#ECEEEA"
  sheeting-white: "#FFFFFF"
  asphalt-ink: "#141A17"
  weathered-grey: "#56605B"
  joint-line: "#D8DDD8"
  joint-line-strong: "#BCC4BE"
  green-tint: "#EEF5F1"
  go-green: "#1F8A4C"
  stop-red: "#C8102E"
  amber-warning: "#D99A00"
  transcription-rust: "#B24A0A"
  night-road: "#0E1211"
  night-sheeting: "#171D1A"
  night-raised: "#1F2622"
  night-guide-green: "#0E7A4B"
  night-accent-text: "#55C98F"
  night-ink: "#EEF2EF"
  night-muted: "#A3ADA7"
  night-joint-line: "#27302B"
  night-transcription: "#FFA36B"
  amoled-black: "#000000"
typography:
  display:
    fontFamily: "Overpass, Inter, system-ui, sans-serif"
    fontSize: "clamp(40px, 5vw, 60px)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Overpass, Inter, system-ui, sans-serif"
    fontSize: "clamp(28px, 3.2vw, 38px)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Overpass, Inter, system-ui, sans-serif"
    fontSize: "17.5px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Overpass, Inter, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
    fontFeature: "tnum"
  label:
    fontFamily: "Overpass, Inter, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.08em"
  numeral:
    fontFamily: "Overpass Mono, Overpass, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0"
  milepost:
    fontFamily: "Overpass, Inter, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
  ipa:
    fontFamily: "Inter, Segoe UI, Lucida Sans Unicode, sans-serif"
    fontSize: "inherit"
    fontWeight: 400
    letterSpacing: "0"
rounded:
  plate: "4px"
  marker: "6px"
  control: "8px"
  tile: "10px"
  card: "14px"
  sign: "16px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "10px"
  md: "16px"
  lg: "18px"
  xl: "28px"
  sign-pad: "40px 44px 36px"
  content-pad: "36px 40px 104px"
components:
  button-primary:
    backgroundColor: "{colors.guide-green}"
    textColor: "{colors.sign-white}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "13px 22px 11px"
  button-primary-hover:
    backgroundColor: "{colors.guide-green-deep}"
    textColor: "{colors.sign-white}"
  button-exit:
    backgroundColor: "{colors.sign-white}"
    textColor: "{colors.guide-green}"
    rounded: "{rounded.control}"
    padding: "17px 26px 15px"
    width: "176px"
  button-ghost:
    backgroundColor: "{colors.sheeting-white}"
    textColor: "{colors.asphalt-ink}"
    rounded: "{rounded.control}"
  guide-sign:
    backgroundColor: "{colors.guide-green}"
    textColor: "{colors.sign-white}"
    rounded: "{rounded.sign}"
    padding: "{spacing.sign-pad}"
  section-sign:
    backgroundColor: "{colors.guide-green}"
    textColor: "{colors.sign-white}"
    typography: "{typography.headline}"
    rounded: "{rounded.sign}"
    padding: "22px 26px 20px"
  route-marker:
    textColor: "{colors.sign-white}"
    rounded: "{rounded.marker}"
    size: "26px"
  route-marker-large:
    textColor: "{colors.sign-white}"
    rounded: "9px"
    size: "44px"
  exit-tab:
    textColor: "{colors.sign-white}"
    typography: "{typography.label}"
    rounded: "5px"
    padding: "6px 8px 4px"
    width: "64px"
  mile-marker:
    backgroundColor: "{colors.guide-green}"
    textColor: "{colors.sign-white}"
    typography: "{typography.milepost}"
    rounded: "{rounded.tile}"
    padding: "18px 12px 16px"
  mile-marker-lead:
    backgroundColor: "{colors.gantry-charcoal}"
    textColor: "{colors.sign-white}"
  streak-plate:
    backgroundColor: "{colors.caution-yellow}"
    textColor: "{colors.caution-ink}"
    rounded: "{rounded.tile}"
    padding: "16px 26px 12px"
  supplemental-plate:
    backgroundColor: "{colors.sheeting-white}"
    textColor: "{colors.asphalt-ink}"
    rounded: "{rounded.card}"
  tile:
    backgroundColor: "{colors.sheeting-white}"
    textColor: "{colors.asphalt-ink}"
    rounded: "{rounded.tile}"
    padding: "15px 18px 13px"
  rail-nav:
    backgroundColor: "{colors.guide-green}"
    textColor: "{colors.sign-white}"
    rounded: "{rounded.sign}"
    width: "240px"
  rail-nav-active:
    backgroundColor: "{colors.sign-white}"
    textColor: "{colors.guide-green}"
    rounded: "{rounded.control}"
  gantry-header:
    backgroundColor: "{colors.gantry-charcoal}"
    textColor: "{colors.sign-white}"
    height: "60px"
  gantry-counters:
    backgroundColor: "{colors.gantry-panel}"
    textColor: "{colors.sign-white}"
    typography: "{typography.numeral}"
    rounded: "{rounded.control}"
    height: "34px"
  input-field:
    backgroundColor: "{colors.sheeting-white}"
    textColor: "{colors.asphalt-ink}"
    rounded: "{rounded.control}"
    padding: "9px 34px 8px 12px"
  segmented-control:
    backgroundColor: "{colors.sheeting-white}"
    textColor: "{colors.weathered-grey}"
    rounded: "{rounded.tile}"
    padding: "3px"
  segmented-control-active:
    backgroundColor: "{colors.guide-green}"
    textColor: "{colors.sign-white}"
    rounded: "7px"
  chip:
    textColor: "{colors.weathered-grey}"
    rounded: "{rounded.plate}"
    padding: "1px 7px 0"
---

# Design System: English Reboot

## Overview

**Creative North Star: "The Interstate"**

The course is a 90-day road, and the interface is signed the way a US interstate is signed. Every place the student must read or decide is a guide sign: a guide-green panel with rounded corners and a white inset border, heavy Overpass legends (the open-source descendant of the FHWA Highway Gothic alphabet), and nothing decorative that a highway engineer would not put on a sign. Above it all runs a dark asphalt gantry carrying the logo plate and the odometer counters; below it lies concrete grey ground where library content sits on white sheeting panels.

The system is legible first and confident second. Density is moderate: big signs at the top of each screen, then calm white tiles that never compete with the markup on example sentences (the product's signature, coloured by the separate part-of-speech palette). Sections keep their own colour and letter, drawn as square route markers with a white inset rule. Wayfinding vocabulary is literal, not ornamental: the lesson plan is a stack of EXIT tabs, today's numbers stand on mile-marker plates, and the main action is a white exit panel with an up-right arrow.

The world refuses two defaults: the grey-card Apple-settings look and the cream-serif editorial look. Yellow belongs to the caution channel only.

**Key Characteristics:**
- Guide-green sign panels with an inset white border and 16px sign corners.
- Asphalt-charcoal gantry header; concrete ground; white sheeting panels.
- Overpass 800 for sign legends, Overpass for UI, Overpass Mono for figures only.
- Section route markers in each section's own line colour.
- MUTCD caution yellow reserved for streak and warnings.
- Light, dark and AMOLED themes share one structure; only the road surface darkens.

## Colors

A disciplined highway palette: one green that does the talking, one charcoal for the overhead structure, concrete and white for the ground, and a yellow kept under lock.

### Primary
- **Guide Green** (`guide-green`): the colour of every sign panel: the Today sign, section header signs, the left rail, mile-marker plates, the onboarding sign, the primary button, active segmented control, studied calendar days. Also the accent for links, focus rings on white ground, progress fills and checked switches.
- **Guide Green Deep** (`guide-green-deep`): hover state of green buttons; never a surface on its own.
- **Sign White** (`sign-white`): legends and inset borders on green (inset rule drawn at 90–94% white opacity), and the fill of the exit panel button and the active rail row.
- **Sign Legend Soft** (`sign-legend-soft`): secondary text on green: coach line, rail group labels, mile-marker captions, version badge.

### Secondary
- **Gantry Charcoal** (`gantry-charcoal`): the header gantry, the lead mile-marker ("phrases aloud"), the first stat card on Progress, the success toast, and the route marker for Progress and Settings.
- **Gantry Panel** (`gantry-panel`): the counter housing inside the gantry and icon-button hover on it.

### Tertiary
- **Caution Yellow** (`caution-yellow`) with **Caution Ink** (`caution-ink`): the streak plate, the streak flame in the gantry, text selection, keyboard focus rings on green surfaces, the CEFR level letters on the onboarding sign, the tint behind context and warning notes, and partial-mastery heatmap cells.

### Neutral
- **Concrete** (`concrete`): page ground, the content strip under the header, example and dialogue wells.
- **Sheeting White** (`sheeting-white`): cards, tiles, inputs, ghost buttons, segmented-control housing.
- **Asphalt Ink** (`asphalt-ink`): body text.
- **Weathered Grey** (`weathered-grey`): muted text, chips, inactive segments.
- **Joint Line** (`joint-line`) and **Joint Line Strong** (`joint-line-strong`): tile borders; input, select and ghost-button strokes; the inner rule of supplemental plates.
- **Green Tint** (`green-tint`): hover fill on answer options, formula wells, mastered heatmap cells.
- **Status**: `go-green` success, `stop-red` danger, `amber-warning` warning text (becomes caution yellow in the dark themes).
- **Transcription Rust** (`transcription-rust`): Russian-letter transcription under example words.

### Dark and AMOLED
The night road keeps the same roles. `night-road` ground, `night-sheeting` cards, `night-raised` popovers, `night-guide-green` for signs (a step lighter so the panel still reads against dark ground), `night-accent-text` for links and focus, `night-ink` / `night-muted` text, `night-joint-line` borders, `night-transcription` for Russian transcription. The gantry drops to near-black (#080B0A). AMOLED swaps ground and gantry to `amoled-black` and cards to #0B0E0C; nothing else changes.

### Out of scope: the part-of-speech palette
The POS colours used for sentence markup live in the `POS-PALETTE:BEGIN/END` block of `css/style.css` and are governed by `tests/palette.test.js` (every pair ΔE2000 ≥ 20 in light and dark, dashed grey for function words, no red for stress). They are not part of this world's palette, are never re-tokened here, and the world must not borrow them for chrome. Section line colours (route markers) come from `TABS` in `js/app.js` and are likewise fixed content data, not world tokens.

### Named Rules
**The Caution Channel Rule.** Yellow means streak or warning. It appears on the streak plate, the streak flame, warning and context notes, attention states (partial mastery), selection and focus on green. It is never a decorative accent, never a button fill, never a heading colour.

**The One Green Rule.** There is one sign green per theme. Every panel that speaks with authority is that green with a white inset border; the system does not introduce a second brand hue.

## Typography

**Display Font:** Overpass 800 (with Inter, system-ui)
**Body Font:** Overpass 400–700 (with Inter, system-ui)
**Label/Mono Font:** Overpass Mono, loaded with a `unicode-range` limited to digits and `% + - / – −` so counts are tabular while words in the same run stay in Overpass. IPA is set in Inter, because Overpass lacks part of the IPA repertoire.

**Character:** a highway alphabet used heavy and tight for legends, plain and open for reading. All fonts are local woff files under `fonts/`.

### Hierarchy
- **Display** (800, clamp(40px, 5vw, 60px), 0.95, −0.03em): the Today sign title and the onboarding sign (up to 64px). Mobile: 44px.
- **Headline** (800, clamp(28px, 3.2vw, 38px), 1.05, −0.025em): section header signs. Mobile: 30px.
- **Title** (700, 17.5px, 1.25, −0.01em): tile fronts, word tokens in examples, primary button text (800, 15px).
- **Body** (400, 15.5px, 1.5, tabular figures): all reading text; the coach line on the Today sign is 18.5px in `sign-legend-soft`, max 44ch.
- **Label** (700, 11.5px, 0.08em, uppercase): mile-marker captions and the streak plate label only; rail group labels use 11px at 0.1em. EXIT tabs use 800, 12px, 0.06em.
- **Numeral** (Overpass Mono 700, 13px): gantry counters, stats bar figures, ring count, list summaries, level badges, calendar days.
- **Milepost** (800, 40px, −0.02em): the big figure on mile-marker plates (34px on mobile); stat cards use 34px, the streak plate 44px.

### Named Rules
**The Legend Rule.** Uppercase tracking is reserved for sign legends: EXIT tabs, mile-marker captions, the streak plate, rail group names and the logo plate. Body labels, captions and helper text stay in sentence case with zero tracking.

**The Figures-in-Mono Rule.** Counts and figures are set in Overpass Mono so they hold column; Cyrillic words are never set in a monospace face.

## Layout

A three-part highway: gantry across the top (60px, 56px on mobile), a fixed guide-sign rail on the left (264px column on desktop, the rail panel inset 12px from the edges), and a single content column capped at 960px with 36px/40px padding (28px/24px under 1100px, 20px/14px under 768px). Under 1100px the rail becomes an off-canvas green drawer opened from the gantry.

Each screen opens with one full-width sign (Today sign or section header sign), followed by content in a vertical rhythm of 18px between Today blocks and 10px grid gaps for tiles. Mile-marker plates sit four across under the Today sign (two across on mobile). The daily goal card sits pinned beneath the rail on desktop. The footer aligns to the content column.

Breakpoints: 1100px (rail to drawer), 768px (phone: stacked sign content, full-width exit button, 2-up mile markers, 3-up segmented control).

## Elevation & Depth

Depth is structural and quiet. White sheeting sits nearly flat on concrete with a 1px hairline shadow; green signs are the only things that cast a real shadow, because they are the things that stand up off the road. Hover lifts tiles by 2px into a soft drop. Most edges are drawn with inset box-shadows (the sign border technique) rather than outer strokes.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 2px rgba(20,26,23,.06), 0 1px 1px rgba(20,26,23,.03)`): resting cards, tiles, segmented control. Dark: a 1px white 3% ring.
- **Lift** (`box-shadow: 0 2px 4px rgba(20,26,23,.05), 0 14px 30px -12px rgba(20,26,23,.28)`): hovered tiles, toasts.
- **Sign** (`box-shadow: 0 2px 3px rgba(10,30,20,.12), 0 18px 36px -18px rgba(10,40,25,.45)`): every green guide sign and the rail.
- **Inset sign border** (`inset 0 0 0 8px <green>, inset 0 0 0 11px rgba(255,255,255,.94)`): the white rule inside a sign; thickness scales with the panel (2/3.5px on buttons and route markers, 5/6.5px on mile markers, 6/8px on section signs and the rail, 8/11px on the Today sign, 10/13px on onboarding).

### Named Rules
**The Only-Signs-Stand-Up Rule.** Green signs carry the Sign shadow; white panels never do. If a white panel needs presence, give it a supplemental inner rule, not a bigger shadow.

## Shapes

Rounded rectangles throughout, scaled to the object: 4px for chips and level badges, 5px for EXIT tabs, 6px for route markers (9px large), 8px for buttons, inputs and rail rows, 10px for tiles, mile markers, callouts and the streak plate, 14px for cards, modals and search, 16px for guide signs and the rail, 20px for the onboarding sign. Circles appear only for audio buttons and the goal ring. The recurring silhouette is the double edge: a coloured panel with a contrasting rule drawn inside its border. Strokes are 1px for sheeting and 1.5px for interactive controls.

## Components

### Guide Sign Panels
The world's primary surface. The **Today sign** is guide green with an 8px green band and a 3px white rule inside a 16px corner, 40/44/36px padding, Display title, soft-green coach line, the white exit button on the right, and the lesson plan below a translucent white rule. It enters with `er-sign-in`: a 0.9s rise of 10px and clip reveal on the road easing. **Section header signs** use the same build at a smaller rule (6/8px) with a large route marker, Headline title, and filters restyled as translucent white selects with a white chevron. The **onboarding sign** is the largest instance.

### Route Markers
Square section badges: 26px (44px on section signs, 34px in onboarding, 38px large on mobile), 6px corners, filled with the section's line colour, heavy 13px letter glyph in white (or the section's own ink), white inset rule at 2/3.5px. Progress and Settings use gantry charcoal. Markers do not rotate or animate.

### EXIT Tabs
Each lesson-plan row is prefixed by a CSS-counted `EXIT n` tab: 64px minimum width, 1.5px white inset outline, 800 12px Overpass at 0.06em on the green. Rows are separated by 1px translucent white rules.

### Mile-Marker Plates
Today's numbers under the sign: green plates with a 5px green band and 1.5px white rule, 10px corners, a 40px heavy figure and an uppercase caption in `sign-legend-soft`. The lead plate (phrases said aloud, the headline metric) is gantry charcoal so it reads first.

### Streak Plate
The only yellow surface: caution yellow with a 4px yellow band and 2px ink rule, 10px corners, 44px heavy number with an uppercase 13px label, centred on Progress.

### Supplemental Plates
Top-level white cards inside the content column carry a 5px white band and a 1.5px `joint-line-strong` rule, like the white supplemental plates bolted under a guide sign. Word detail and the phrase ladder use a green 2px rule instead, to tie them to the sign above. Nested cards drop back to the plain Sheet shadow.

### Buttons
- **Shape:** 8px corners (8px).
- **Primary:** guide green, white 800 15px text, 13/22/11px padding, with its own inset white rule at 55% opacity, so it reads as a small sign.
- **Hover / Focus:** hover deepens to `guide-green-deep` with a brighter rule; no lift. Focus is a 3px ring of the accent text colour at 70%, offset 2px; on green surfaces the ring is caution yellow.
- **Exit panel (Today, onboarding):** inverted: white panel, green text and a green inner rule, 18px heavy legend, 176px minimum width (full width on phones), masked up-right arrow that nudges 2px on hover while the panel rises 1px.
- **Ghost / Back:** white sheeting with a 1.5px strong joint-line stroke; hover darkens the stroke to ink.
- **Audio:** circular, green-soft fill, fills solid green on hover.

### Chips
Tag and category chips: 4px corners, translucent green-grey fill, 600 11.5px muted text. Level badges use Overpass Mono 700 11px.

### Cards / Containers
- **Corner Style:** 14px cards, 10px tiles.
- **Background:** sheeting white on concrete.
- **Shadow Strategy:** Sheet at rest, Lift on hover (tiles only); see Elevation & Depth.
- **Border:** 1px joint line; on hover the tile border takes the current section's line colour.
- **Internal Padding:** 15/18/13px on tiles.

### Inputs / Fields
- **Style:** sheeting white, 1.5px strong joint-line stroke, 8px corners, 700 14px text for selects.
- **Focus:** border turns guide green with a 4px green-soft halo; caret in accent green.
- **Segmented control:** white housing with 3px padding; the active segment is solid guide green with white text.
- **Answer options:** 1.5px stroke, hover to green stroke on green tint.

### Navigation
- **Rail:** on desktop, a guide sign of its own: green panel, 16px corners, 6/8px inset white rule, Sign shadow. Group names in 11px uppercase `sign-legend-soft`. Rows are white 600 14.5px with a route marker; hover is a 10% white wash; the active row is a white plate with green 800 text. Keyboard focus is a yellow ring. Under 1100px the same green panel slides in as a drawer.
- **Gantry header:** asphalt charcoal, 60px. The logo is a small green sign plate (800 15px uppercase, 1.5px white outline inset 4px) followed by the level range in Overpass Mono. Counters sit in a 34px charcoal housing with hairline dividers, in 13px Overpass Mono; icons in grey-green, the streak flame in caution yellow, and XP gets a muted ` XP` suffix.
- **Stats strip:** a concrete band under the gantry with muted 12.5px labels and mono figures.

### Toasts
8px corners, 700 14px. Success toasts are gantry charcoal with a white inset rule.

### Motion
One easing, the road curve `cubic-bezier(.16, 1, .3, 1)`, at 0.2–0.3s for state changes (tiles, rail rows, buttons) and 0.9s for the Today sign's entrance. Movement is small: 1–2px lifts and a 2px arrow nudge. `prefers-reduced-motion` removes the sign entrance and tile/button transitions.

## Do's and Don'ts

### Do:
- **Do** open every screen with exactly one green guide sign (Today sign or section header sign) and put supporting content on white sheeting below it.
- **Do** draw sign borders as an inset white rule inside the green (for example 8px band + 3px rule on the Today sign), scaled to the panel size.
- **Do** keep yellow for the streak, warnings and focus on green; use `caution-yellow` with `caution-ink` text.
- **Do** set every count in Overpass Mono and every sign legend in Overpass 800.
- **Do** render each section with its own route marker colour and letter from `TABS`.
- **Do** use the road easing `cubic-bezier(.16, 1, .3, 1)` and keep lifts to 2px or less.
- **Do** keep light, dark and AMOLED structurally identical; change only the token values.

### Don't:
- **Don't** use yellow as a decorative accent, a button fill or a heading colour.
- **Don't** add, edit or borrow part-of-speech colours from the POS-PALETTE block; that palette belongs to `tests/palette.test.js`, not to the world.
- **Don't** put the Sign shadow on white panels or invent a second sign green.
- **Don't** fall back to grey settings-style cards or cream backgrounds with serif headlines.
- **Don't** use uppercase tracked labels outside sign legends; no eyebrow or kicker text above headings.
- **Don't** set IPA in Overpass or Cyrillic words in Overpass Mono.
- **Don't** use emoji as icons; inline SVG icons only.
