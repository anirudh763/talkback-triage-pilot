---
version: 3
name: talkback-triage-pilot
system: independent writing-desk identity, owner-approved 2026-11-13
dial: ENERGY 2 / RHYTHM 3 / MOTION 1
theme: light by default even when the OS prefers dark; dark only through the labelled, remembered Dark theme toggle
---
# TalkBack writing desk

TalkBack prepares Android accessibility reports. The report is the main document; the checker is a set of review notes beside it. This composition deliberately replaces the former shared 216px left rail. It is an editorial workspace, with compact horizontal route tabs and a quiet ivory canvas.

## Identity and purpose

- Ivory `#FFF9EF` canvas and warm `#FFFDF8` document sheets give the editable report a clear physical boundary. The sheet uses a square 2px corner and a 3px bottom edge; other controls use a restrained 5px radius.
- Plum `#592B86` identifies navigation, matched passages, focus and the single primary action. Rose `#F8E9ED` separates required review notes from the report's own words. Amber still means incomplete, and green still means found; every state also has a word and/or icon.
- Georgia document headings, issue titles and reading-view headings establish the editorial voice. System sans controls keep application chrome compact. Locally bundled Atkinson Hyperlegible 400/700 is used for report body text, the reading view and draft; code alone uses system monospace. No remote font or new visual asset is loaded.
- Structural whitespace separates the main sheet from its review margin. Required gap fields remain expanded and editable.

## Palette

| Token | Light | Dark |
|---|---|---|
| canvas / rail | `#FFF9EF` | `#211B26` |
| document / control | `#FFFDF8` | `#2C2432` |
| ink | `#302737` | `#F5EDF5` |
| secondary ink | `#66586B` | `#C5B6C9` |
| strong boundary | `#8E7B91` | `#A58EAC` |
| divider | `#E2D7DB` | `#514356` |
| plum / on-plum | `#592B86` / `#FFFFFF` | `#D4AFF4` / `#2C153D` |
| matched passage | `#EEE4F4` | `#45314F` |
| found | `#326146` | `#A0D4AD` |
| incomplete | `#855006` | `#F0C579` |
| not found | `#9B354E` | `#F1A7B9` |
| note background | `#F8E9ED` | `#492936` |

## Composition and reflow

- From 1000px: a full-width top navigation bar contains the wordmark, Check a report / Draft / Examples / Research tabs and the theme button. The current route has a plum underline. A small breadcrumb row sits below it; Draft retains its Back link. Workspace width is capped at 1344px including gutters, centered on wide screens.
- Check uses a dominant document column and a 348px review margin, separated by 36px. The sheet has the original title and report fields, sample/clear/share tools, source attribution, dataset picker and privacy text. A second document sheet renders live Markdown and underlines matched passages. The review margin shows the measured summary and each required gap with its visible label, status, example, field and Add to report action.
- From 700–1099px: the review margin is 240–280px, the gap is 20px, sheet padding is 20px and heading actions stack. At 768px this preserves an editable sheet beside readable notes.
- Under 700px: the document and passage review come first, followed by the expanded review notes. Sheet padding is 16px; tools wrap and no content is clipped to imitate a desktop sheet. The normal single-line title input can scroll its own text while being edited.
- Under 1000px: the existing labelled Menu button opens navigation as a modal sheet. Focus remains inside, Escape / Close menu / scrim closes it, and focus returns to Menu. The phone header shows the product breadcrumb; the H1 supplies the current screen name. Scroll padding reserves room for focus.
- Draft is a 920px report sheet with copy/download actions. Examples and Research retain their real tables and qualifications. Wide tables scroll only inside their named, focusable region, with captions within the visible region. No page horizontal scroll at 320px.
- The footer on every route keeps the generated version, GitHub source, licensing and report attribution available. Mobile navigation also retains its source link.

## Routes and state

`#/check` (default), `#/draft`, `#/examples`, `#/research`, `#/research/labels`, `#/research/methods`; unknown routes show Not found. Existing screen IDs, route titles, H1 focus, `aria-current`, Back/Forward behavior, deep links, frozen-link detachment on edits and session storage remain unchanged. Legacy `#check?report=`, `#check?text=`, `#pilot`, `#label` and `#about` still normalize with history replacement.

## Controls and feedback

Controls remain native and have 44px minimum action height, visible labels and focus. Check's Review draft action sits beside the H1 at desktop widths and below it on phones, so it is available without scrolling. Draft's primary action is Copy draft. The existing source links, dataset filtering, sample cycling, share link warnings and clear behavior remain functional.

Matched passages use a tinted fill plus a 2px underline and screen-reader detail text. Gap notes use a labelled state and a top boundary; color alone never communicates the result. An empty Add identifies the field with `aria-invalid` / `aria-describedby`, shows a textual error and focuses it. A successful Add appends the reporter's own words, rechecks the whole report, announces the result and moves focus to the next gap. Only optional details remain folded. Nothing is filled in automatically.

The original report-preparation qualification and AntennaPod #6598 evidence remain visible below All details. Study AI-assistance and exploratory-result disclosures remain unchanged. The static checker has immediate updates; existing study run progress, failures and retry behavior remain intact.

Motion is limited to 120ms button feedback and the existing progress transform, under `prefers-reduced-motion: no-preference`. Dark theme is a deliberate alternate plum/rose palette and is never selected from OS preference.

## Validation and limits

Use `npm test`, then the full existing `npm run test:e2e` suite: study flows, checker, offline, no-JavaScript, routes, keyboard focus, Menu, Back/Forward, shared edits, zoom/reflow and axe in light/dark. Layout assertions now check top navigation instead of a 216px rail and ivory instead of the former gray canvas. Behavior assertions remain intact. Generate `docs/` through `scripts/build.js`; do not edit the generated page directly.

Known limits remain: the Markdown preview supports headings, lists, quotes, fenced code and bold, not every GitHub Markdown feature; exact matched-text placement can omit a highlight; style CSP remains inline for the generated build. Automated browser/axe checks are not a manual screen-reader pass. The existing install icons retain their original artwork. No checker core, study data, saved results or AI triage behavior belongs to this visual change.
