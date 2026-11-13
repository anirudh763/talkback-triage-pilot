---
version: 2
name: talkback-triage-pilot
system: root-approved light-first system, round 4 (2026-11-13)
dial: ENERGY 1 / RHYTHM 2 / MOTION 1
theme: light by default (also when the OS prefers dark); dark only through the labelled "Dark theme" toggle, remembered in localStorage
colors:   # src/ui.css :root (light) and :root[data-theme="dark"]
  canvas:        { light: "#f7f8fa", dark: "#0f1720", use: "page background" }
  bg:            { light: "#ffffff", dark: "#16202a", use: "surface: boxes, header, inputs, tables" }
  rail:          { light: "#f0f3f5", dark: "#131c25", use: "left rail and Menu sheet" }
  fg:            { light: "#152536", dark: "#e7edf2", use: "ink" }
  fg-muted:      { light: "#4b5e6f", dark: "#a9b7c4", use: "secondary text" }
  border-strong: { light: "#748694", dark: "#8696a4", use: "input and button boundary" }
  border:        { light: "#dce2e8", dark: "#2d3b48", use: "dividers and box outlines" }
  accent:        { light: "#006b5e", dark: "#5fd0be", use: "TalkBack primary: links, primary button, current nav item, matched-span underline" }
  accent-subtle: { light: "#e3f1ee", dark: "#14302c", use: "matched span fill, found tag fill, selected row" }
  ok:            { light: "#12633c", dark: "#72d49e", use: "Found (always with icon and word)" }
  warn:          { light: "#925400", dark: "#e9ba62", use: "Incomplete, changed (always with a word)" }
  bad:           { light: "#b42318", dark: "#ff998a", use: "Not found, errors (always with a word)" }
  mark-add:      { light: "#8f1d14 on #fbe4e1", dark: "#ffb0a6 on #3c1618", use: "[ADD: ...] in the draft (also bold)" }
contrast:   # WCAG ratios computed from the hex values above (light / dark)
  - { pair: fg on bg, light: 15.56, dark: 13.97 }
  - { pair: fg-muted on canvas, light: 6.31, dark: 8.81 }
  - { pair: fg-muted on rail, light: 6.02, dark: 8.40 }
  - { pair: accent on bg, light: 6.43, dark: 8.83 }
  - { pair: accent on rail, light: 5.77, dark: 9.22 }
  - { pair: button text on accent, light: 6.43, dark: 9.18 }
  - { pair: fg on accent-subtle, light: 13.40, dark: 11.95 }
  - { pair: ok / warn / bad on bg, light: "7.30 / 6.02 / 6.57", dark: "9.12 / 9.15 / 7.99" }
  - { pair: mark-add, light: 7.34, dark: 9.10 }
  - { pair: border-strong on bg (non-text, need 3:1), light: 3.76, dark: 5.42 }
type: Atkinson Hyperlegible 400/700 (bundled, SIL OFL 1.1). Body and UI 16px/1.5, H1 30px/1.2 (26px under 600px). System monospace 14px only for code (inline code, fenced code in the preview).
spacing: 4 / 8 / 16 / 24 / 32
controls: 44px minimum target, 7px radius, 1px boundary
---
# talkback-triage-pilot design

## Overview
A report-preparation tool for Android accessibility bug reports. Its signature is the **report composer** on Check: the editor beside a plain Markdown preview of the issue body. Text the checker matched is highlighted in place; each detail it did not find is a gap prompt where the reporter adds it in their own words. Nothing is filled in automatically. The draft is reviewed, copied or downloaded on its own screen. The study (results, labels, methods) sits under Learn.

## Layout
- Desktop (1000px and wider): 216px left rail (text wordmark, one-line purpose, a "Work" group: Check a report, Draft, Examples; a "Learn" group: Research; theme toggle, version and source link at the foot) + a white location header (breadcrumb "TalkBack Triage / Screen", "← Back" on Draft) + workspace with a 32px gutter, content max 1100px.
- Under 1000px: no permanent rail; a labelled Menu button in the header opens the rail as a modal sheet (focus kept inside, Escape / Close menu / the scrim close it and return focus to Menu). 24px gutter, 16px under 600px.
- Check: editor | live preview side by side from 1180px, stacked below; the "All details" checklist follows.
- Wide tables scroll inside their own named, focusable region; the page never scrolls sideways at 320px (tested).

## Routes
`#/check` (default), `#/draft`, `#/examples`, `#/research`, `#/research/labels`, `#/research/methods`; anything else shows Not found. Each route sets the document title ("Screen – TalkBack Triage"), marks the rail item with `aria-current="page"` and moves focus to the H1 (tabindex -1, no focus ring on the heading itself). Old links (`#check?report=`, `#check?text=`, `#pilot`, `#label`, `#about`) are mapped with `history.replaceState`. Screen state that can be shared lives in the query part (`?report=`, `?text=`, `?app=&gap=&q=`); the report text also lives in sessionStorage for the tab.

## Components
- Buttons: `.btn` 44px, 1px `border-strong`, `.btn.primary` filled with the accent. One primary action per screen (Check: Review draft; Draft: Copy draft; Not found: Go to Check a report).
- Matched span: `mark.hit`, accent-subtle fill plus a 2px accent underline, so it reads without colour; screen readers hear "(matched: <detail>)".
- Gap prompt: dashed box with a 3px left edge (bad for Not found, warn for Incomplete), label + state word, hint with an example, a field, "Add to report". An empty Add shows an error in text, tied with `aria-describedby`, sets `aria-invalid` and focuses the field. After Add the report is re-checked and the result is announced in a status region.
- Optional details are folded in a `<details>` ("Optional details (n)").
- Checklist rows: icon + word + colour + the matched text.
- Detail tags (Examples, study tables): found is solid with an accent border and fill; not found is dashed, struck through and muted.

## Motion
Only state-change feedback: 120ms button colour and the pilot progress bar (`transform: scaleX`), both inside `prefers-reduced-motion: no-preference`.

## Do and don't
- Do keep light as the default; never reintroduce a `prefers-color-scheme` switch.
- Do keep the report's own text: gap prompts append the reporter's words; the app never writes an answer.
- Don't add logos, illustrations, testimonials, stats that are not computed from the loaded data, gradients or big shadows.
- Don't use monospace for report text.

## Known gaps
- `style-src` keeps `'unsafe-inline'` (CSS is inlined by the build; bar cells use a static `style` width). Scripts stay hash-only.
- The preview renders headings, lists, quotes, fenced code and `**bold**`; other Markdown (links, tables, images) is shown as plain text.
- A highlight appears only where the matched text can be placed exactly in the report; a few details (for example "steps paragraph") are found but not highlighted.
- Checks are automated (axe-core, Playwright). A manual screen-reader pass has not been run.
