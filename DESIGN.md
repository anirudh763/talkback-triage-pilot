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


## November 15 interface revision

The owner requested compact application copy: no taglines, tutorial intros, numbered stage badges or repeated instructions. Report, Preview, Examples and Research keep their existing routes. Headings use the UI sans-serif face, and document-card shadows are removed. Contextual errors, privacy, field labels and Methods retain their meanings. Before/after copy and browser evidence are recorded in the November 15 concise-UI audit.

## November 15 audit workstation

This revision supersedes the older two-column writing-desk geometry: compact 48px desktop navigation, a contextual action row, then report input / required checks / live draft at 1.15 / .8 / 1 proportions. Panels use 12px gaps and padding. Below 75rem the workspace flows input → checks → draft, followed by matches and the full checklist. Enlarged text can grow the document; no fixed-height clipping. All features are free; commercial plan UI is removed. English-oriented recognition is disclosed beside input. Final required repair focuses Review draft, research navigation restores task focus, and export confirmation applies only to the current revision.

## Editorial entry and optional local profiles — November 15

The newest owner brief adds an editorial root landing while preserving compact tool screens. The landing uses the existing palette, a responsive 56px-scale headline, an authentic labelled four-preview showcase, native disclosure navigation and guest-first entry. Mobile navigation collapses to a native Menu disclosure rather than consuming the first screen. Automatic previews pause on hover/focus and explicit user pause; reduced motion disables autoplay. No prices, upsells or fake adoption metrics are shown.

Login/signup use visible labels and a split form/context layout. Saved-work controls remain reachable in both desktop and mobile workspaces. Report/checks/draft with explicit saved drafts; guest recovery stays separate from profile records. Browser-local profiles provide organization, not encryption, verified identity or server authorization. All tools remain free without signup.

## Flagship brief: two useful panes

The latest flagship brief supersedes the earlier three-column workstation: a report/editor column and one contextual review column containing checks, repairs and the draft. Below 75rem they follow document order. Primary review/export actions remain explicit; long reports and enlarged text may grow the page. Expanded importer and bot output wrap within the editor instead of expanding the page.

## CueReport direct routes — post-restart brief

The current user brief supersedes plum/emerald overrides: ivory #fbf9f5, deep indigo #30326e, terracotta #a13f2f, Newsreader headings and Inter controls. Locally bundled Google Fonts variable TTF files retain their OFL notices. The existing vanilla builder emits all assets and includes fonts in the integrity-checked offline manifest.

Direct `/` opens the report checker; `/ablation` compares real removed TalkBack lines and archived answers; `/statistics` exposes the existing exact McNemar and condition tables; `/system` reads the serving process endpoints. Legacy hash routes and the Pages landing remain available. Direct navigation hides duplicate product chrome; secondary report tools remain available in legacy screens. No model call, model comparison experiment, live checker metric, or study verdict is synthesized.

The November 16 privacy requirement supersedes report-text sharing: generated links contain unchanged public dataset IDs only. Legacy incoming text links import once and scrub the current address; private or edited reports use local copy/Markdown and bare validated GitHub handoff URLs. Automatic guest recovery is per-tab session storage; older device backups require explicit recovery. Only public dataset IDs appear in direct query strings. `/ablation?report=WP-20770` is shareable and tab independent. New route tests cover 320/768/1440, keyboard, history, refresh, tab isolation, error states and axe.

## November 16 interactive comparison

The root checker offers the verified WordPress #20770 original and existing no_steps variant as offline demos, with loading/completion/error states and a dismissible guide. `/ablation` preserves the current tab’s original or selected public report, renders original and modified text in two columns, runs PlatformChecks.analyze separately on both bodies and lists actual status changes or unchanged findings. The existing T.variant path determines removable TalkBack steps; other step formats may remain. Copy modified report is local. Archived answers stay in a disclosure and appear only for exact immutable public text; no provider response or actionability label is synthesized. The study core and research data are unchanged.


## November 16 navigation and local-work review

UI/UX Pro Max refined to Developer Tool / IDE, Minimalism & Swiss Style; keep this report product's ivory #fbf9f5, indigo #30326e, terracotta #a13f2f, Inter controls and Newsreader document headings rather than importing terminal typography/green. Four direct pages remain Report, Ablation, Statistics and System. Draft, Examples and research methods share Report tools only on direct routes; legacy navigation remains available. Local work consistently holds the existing local profile/save/backup/sync controls on every product page, preserving `.profile-tools`, IDs and explicit save/restore behavior. Existing App & help already organizes installation/offline tools. Utility Escape returns focus, and mobile traversal excludes hidden children of closed disclosures. No checker/study/data/provider changes. Add375/1024 viewport checks and backup-dialog focus/recovery to the existing direct-route suite.

## Canonical workspaces and owned persistence — November 16

The current brief supersedes the former direct-root checker: `/` and `/overview` open Overview. A 220px desktop sidebar contains Overview, Workbench, Reports and Settings; the existing contained mobile Menu presents the same four destinations. Ivory, indigo, terracotta, Inter and Newsreader remain. Workbench holds Report, Draft, Ablation and Examples contextual tools. Reports holds saved owned runs, exact existing statistics, labels and methods. Settings holds the real server session/account/snapshots, explicit browser draft import, local profile/encrypted/offline tools and optional sound cues. Existing meaningful hash routes and `/ablation`, `/statistics`, `/system` remain usable.

Explicit server saves retain actual report/check/comparison/evaluation evidence with app/checker/method/dataset versions. The server authorizes ownership; saved results remain labelled browser-computed. Legacy browser copies are never silently imported or deleted. New tab recovery keys use the real server principal; logout clears private memory and cancels or fences imports, evaluation replies, label writes and exports. A report that exceeds the 64 KiB UTF-8 server request bound remains in the editor with unsynced/export guidance. Reconnecting does not upload it.

Public fixture IDs remain shareable. Private report text and credentials are omitted from generated app URLs; copy/Markdown export or an owned server record carries private evidence. GitHub handoff opens a bare validated new-issue page after local preview; the user pastes the report explicitly.

Optional short sound cues require explicit activation each visit, use actual oscillator/gain output, and supplement mounted deduplicated text statuses. No typing or progress cues. The exact event and shortcut contract is in `AUDIO.md`; automated audio instrumentation is not a human listening or VoiceOver claim.
