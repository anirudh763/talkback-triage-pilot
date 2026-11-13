---
version: 1
name: talkback-triage-pilot
extends: ui.css            # src/ui.css, the shared base; only what this app adds or overrides is listed
dial: ENERGY 1 / RHYTHM 1 / MOTION 1
colors:
  # Shared tokens used here (values from src/ui.css:7-17)
  bg:            { light: "#ffffff", dark: "#0d1117", use: "page, boxes, tables, verdict cards", src: "ui.css:7,15" }
  bg-subtle:     { light: "#f6f8fa", dark: "#151b23", use: "header, box headers, notices, report viewer", src: "ui.css:7,15" }
  bg-inset:      { light: "#eef1f4", dark: "#010409", use: "button hover/active, bar tracks, inline code", src: "ui.css:7,15" }
  fg:            { light: "#1f2328", dark: "#e6edf3", use: "body text", src: "ui.css:7,15" }
  fg-muted:      { light: "#59636e", dark: "#9198a1", use: "secondary text, not-found tags, inactive tabs", src: "ui.css:7,15" }
  border:        { light: "#d1d9e0", dark: "#3d444d", use: "decorative dividers and box outlines only", src: "ui.css:8,16" }
  border-strong: { light: "#818b98", dark: "#656c76", use: "input borders, not-found tag border, step numbers", src: "ui.css:8,16" }
  accent:        { light: "#0b57d0", dark: "#4493f8", use: "links, primary button, selected tab, found tags, bars", src: "ui.css:8,16" }
  accent-fg:     { light: "#ffffff", dark: "#0d1117", use: "text on the primary button", src: "ui.css:8,16" }
  accent-subtle: { light: "#e8f0fe", dark: "#121d2f", use: "found-tag fill, selected table row", src: "ui.css:8,16" }
  ok:            { light: "#1a7f37", dark: "#3fb950", use: "checklist Found, Minor label (always with icon or word)", src: "ui.css:9,17" }
  warn:          { light: "#9a6700", dark: "#d29922", use: "checklist Partly found, Slows / Needs more evidence, changed", src: "ui.css:9,17" }
  bad:           { light: "#cf222e", dark: "#f85149", use: "checklist Not found, Blocks the task, error status", src: "ui.css:9,17" }
  bad-subtle:    { light: "#ffebe9", dark: "#25171c", use: "background of struck-through removed lines", src: "ui.css:9,17" }
  # App tokens (src/app.css)
  removed-bg:    { light: "var(--bad-subtle)", dark: "var(--bad-subtle)", use: "removed line in the report viewer", src: "app.css:5" }
  removed-ink:   { light: "var(--bad)", dark: "var(--bad)", use: "removed line text (also struck through)", src: "app.css:5" }
  mark-add-bg:   { light: "#ffebe9", dark: "#3c1618", use: "[ADD: ...] placeholder in the rewritten report", src: "app.css:6,9" }
  mark-add-fg:   { light: "#a40e26", dark: "#ffa198", use: "[ADD: ...] placeholder text (also bold)", src: "app.css:6,9" }
  mark-opt-bg:   { light: "#eef1f4", dark: "#212830", use: "[optional ...] placeholder", src: "app.css:6,9" }
  mark-opt-fg:   { light: "#424a53", dark: "#c9d1d9", use: "[optional ...] placeholder text", src: "app.css:6,9" }
contrast:   # WCAG relative luminance, computed from the hex values above
  - { fg: fg, bg: bg, light: 15.80, dark: 16.02, need: 4.5 }
  - { fg: fg, bg: bg-subtle, light: 14.84, dark: 14.65, need: 4.5 }
  - { fg: fg, bg: bg-inset, light: 13.93, dark: 17.38, need: 4.5 }
  - { fg: fg-muted, bg: bg, light: 6.11, dark: 6.50, need: 4.5 }
  - { fg: fg-muted, bg: bg-subtle, light: 5.74, dark: 5.94, need: 4.5 }
  - { fg: accent, bg: bg, light: 6.39, dark: 6.11, need: 4.5 }
  - { fg: accent, bg: bg-subtle, light: 6.00, dark: 5.59, need: 4.5 }       # header "Source on GitHub"
  - { fg: accent-fg, bg: accent, light: 6.39, dark: 6.11, need: 4.5 }       # primary button
  - { fg: accent-fg, bg: "accent at brightness(.92)", light: 7.20, dark: 5.24, need: 4.5 }  # primary hover, sRGB multiply
  - { fg: accent-fg, bg: "accent at brightness(.85)", light: 8.00, dark: 4.55, need: 4.5 }  # primary active (tightest pair)
  - { fg: fg, bg: accent-subtle, light: 13.79, dark: 14.30, need: 4.5 }     # found tag, selected row
  - { fg: ok, bg: bg, light: 5.08, dark: 7.45, need: 4.5 }
  - { fg: warn, bg: bg, light: 4.87, dark: 7.50, need: 4.5 }
  - { fg: bad, bg: bg, light: 5.36, dark: 5.65, need: 4.5 }
  - { fg: removed-ink, bg: removed-bg, light: 4.67, dark: 5.14, need: 4.5 }
  - { fg: mark-add-fg, bg: mark-add-bg, light: 6.86, dark: 8.18, need: 4.5 }
  - { fg: mark-opt-fg, bg: mark-opt-bg, light: 7.93, dark: 9.64, need: 4.5 }
  - { fg: accent, bg: accent-subtle, light: 5.57, dark: 5.45, need: 3 }     # found-tag border
  - { fg: border-strong, bg: bg, light: 3.45, dark: 3.57, need: 3 }         # inputs, not-found tag border
  - { fg: border-strong, bg: bg-subtle, light: 3.24, dark: 3.26, need: 3 }
  - { fg: focus (accent), bg: bg, light: 6.39, dark: 6.11, need: 3 }
typography:
  ui:   { family: "Atkinson Hyperlegible", root: "93.75% (15px at the default 16px)", lineHeight: 1.5, src: "ui.css:4-5,11,19" }
  mono: { family: "ui-monospace,SFMono-Regular,Menlo,Consolas,Liberation Mono,monospace", use: "report text, rewritten report, report viewer, detail tags (TB, VER), inline code" }
  scale: { h1: 1rem (header product name), h2: 1.35rem, h3: 1rem, box-header-h3: .9375rem, body: 1rem, small: .875rem, label: .8125rem, min: ".8rem (12px, detail tags)" }
  coarse-pointer: "text inputs, textarea and select are 16px (app.css:55)"
spacing: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 56]   # px actually used in app.css
rounded: { xs: "3px (placeholder marks), 4px (bars, inline code)", md: "6px (--radius: boxes, buttons, inputs, notices)", label: "2em (ui.css .label only)" }
elevation: { page: flat, boxes: "1px border, no shadow", dialog: "none (the app has no dialog)" }
motion:
  default: none
  allowed:
    - { name: ".btn background/border", duration: 120ms, easing: ease, iterations: 1, reduce: off, src: "ui.css:40" }
    - { name: ".progress > i transform", duration: 200ms, easing: linear, iterations: 1, reduce: off, src: "app.css:142" }
components:
  app-header:   { base: "ui.css:35-38 + app.css:24-29", parts: "h1.name, tablist nav, a.repo", states: [focus-visible] }
  tab:          { base: "app.css:31-33", radius: none, minTarget: "auto x 44", states: [hover, selected (2px accent underline + fg), focus-visible] }
  btn:          { base: "ui.css:23-27", radius: md, minTarget: "auto x 32", states: [hover, active, focus-visible, disabled] }
  btn.link:     { base: "app.css:57", minTarget: "auto x 24", states: [focus-visible], use: "Details in the per-report table" }
  input:        { base: "app.css:51-55", radius: md, minTarget: "auto x 32", states: [focus-visible] }
  box:          { base: "ui.css:31-32 + app.css:39-47", radius: md, use: "checker panes and every study panel" }
  lint-list:    { base: "app.css:80-93", states: [present (check icon + Found), notfound (x icon + Not found), partial, optional, na], note: "state = icon + word + colour" }
  rewritten-report: { base: "app.css:95-98", note: "[ADD] marks bold + tinted; text itself says ADD" }
  label:        { base: "ui.css:29-30 + app.css:107-109", radius: label, variants: [ok, warn, bad, accent (app), plain], use: "verdict impact/evidence, GitHub outcome, labelled count" }
  detail-tag:   { base: ".chips .label, app.css:132-137", radius: label, states: [on (solid accent border, filled), off (dashed border-strong, struck through, muted)] }
  table:        { base: "ui.css:33-34 + app.css:119-128", wrapper: ".tablewrap: focusable region, scrolls sideways", caption: true, numeric: "tabular-nums, right-aligned" }
  verdict:      { base: "app.css:106", radius: md }
  notice:       { base: "app.css:115", radius: md, note: "1px border, no stripe" }
  progress:     { base: "app.css:140-142", note: "aria-hidden; the count is in the role=status line" }
  steps:        { base: "app.css:143-146", note: "numbered because How the study works is a real sequence" }
  noscript:     { base: "app.css:152-153", radius: md }
---

# talkback-triage-pilot design

## Overview
The first screen is the report checker with a real sample already checked (WordPress-Android #21127). The focal point is the right pane: "Sections in this report", one row per detail with an icon, the word Found / Not found / Partly found, and the matching text. The other three tabs hold the study: pilot results (two tables), hand labelling, and the method. It is a developer tool, so the chrome is a gray header, 1px borders and dense tables; identity comes from Atkinson Hyperlegible and the one blue accent.

## Colors
Every colour is a ui.css token except four placeholder-mark colours. The theme follows the OS (`prefers-color-scheme`); there is no toggle. Dark values are their own tonal set, not an inversion.
- `removed-bg` / `removed-ink` alias `bad-subtle` / `bad` so the report viewer can name what it shows (a removed line). Removed lines are also struck through and start with visually hidden "Removed:".
- `mark-add-*` and `mark-opt-*` exist because the rewritten report needs two placeholder strengths inside monospace text: "[ADD: ...]" (bold, red tint) and "[optional ...]" (normal weight, gray tint). The words ADD and optional carry the meaning; colour only groups them.
- ok / warn / bad appear only with an icon or a word next to them.

## Typography
Atkinson Hyperlegible 400 and 700 (bundled, SIL OFL 1.1, `src/atkinson-hyperlegible-OFL.txt`). Root size 93.75%, so a larger browser default font size applies. Monospace only for report text and the detail codes (TB, VER, DEV, E/A, SAID, MEDIA). The smallest text is 12px (detail tags). Report text, the rewritten report and the report viewer are .875rem (about 13px); on touch devices form fields are 16px so iOS does not zoom.

## Layout
- One column, max 1240px, 16px side gutter (safe-area aware).
- Checker: two-pane split (report | results) above 900px, stacked below.
- Header: product name, tabs, source link; under 760px the tabs take their own row.
- Wide tables scroll sideways inside a focusable `role="region"` with a name; the page never scrolls sideways at 320px (tested).
- No sticky elements.

## Elevation and shapes
Flat. Boxes, notices and verdict cards are 1px `border` with the 6px radius; no shadows, gradients, glass or coloured stripes. Pills (2em radius) are used only by ui.css `.label` for status and counts.

## Motion
Off by default. Two transitions, both one-shot and both inside `prefers-reduced-motion: no-preference`: button background/border colour (120ms) and the pilot run's progress bar, which scales with `transform: scaleX(var(--p))` (200ms linear) instead of animating width. ui.css also switches all transitions off under `reduce`.

## Components
- Tabs: ARIA tablist, arrow keys move, URL hash follows the tab. Selected tab has a 2px accent underline and full-strength text.
- Buttons: ui.css `.btn` (32px). Hover and active use `bg-inset`; the primary button darkens with `brightness(.92)` on hover and `.85` when pressed (4.55:1 in dark, the tightest pair). ui.css also styles `.btn[aria-pressed="true"]`; this app has no toggle buttons, so it is unused here. Disabled is 55% opacity with a not-allowed cursor.
- Checklist rows: icon + word + colour + the matched text.
- Labels (`.label`): impact (Blocks the task = bad, Slows the task = warn, Minor = ok, Can't tell = plain) and evidence (Enough to start reproducing = accent, Needs more evidence = warn). The word is always the label's text.
- Detail tags in "Every report in this run": a found tag is solid with an accent border and fill; a not-found tag is dashed, struck through and muted. The caption explains this and spells out the codes; each tag also has visually hidden "<detail> found / not found" text and a `title`.
- Tables: `<caption>`, `scope="col"`, tabular numbers, right-aligned numeric cells.

## States
- Empty checker: "Nothing to check yet" in the summary and "Paste a report" in the source line; focus goes to the report box after Clear.
- Broken share link: "couldn't be read" in the source line.
- Pilot outside the Claude app: run controls hidden, a notice says how to rerun with an API key.
- Run errors: the status line names the failure and offers "Finish this run".
- No JavaScript: a bordered notice explains that the checker needs scripts and links to the README.
- Status text is set once per change through a single `role="status"` region and stays until replaced.

## Do and don't
- Do keep found / not-found visible without colour (dashed + struck-through), and keep the checklist's icon + word.
- Do use ui.css `.box`, `.label`, `.sr-only` rather than app copies.
- Don't put the "rules, not AI" disclosure back inside a sentence as a pill; it is its own bold line.
- Don't animate width or height; scale with transform.

## Known gaps
- `style-src` keeps `'unsafe-inline'`: the build inlines CSS into `<style>` blocks (scripts stay hash-only), and the bar cells in the coverage and results tables still set `width` through a `style` attribute (static, not animated).
- `src/ui.css` is a byte-for-byte copy of the shared base as of 2026-11-13 (with the cross-app audit fixes). Change it only by copying the shared file again.
- The primary button's pressed state in dark mode is 4.55:1, just above 4.5.
- `border-strong` on `bg-subtle` is 3.24:1 light / 3.26:1 dark: it passes 3:1 but has little margin. Inputs sit on `bg` (3.45 / 3.57).
- Contrast for the primary button's hover and active states is computed by multiplying sRGB channels; the browser's filter result may differ slightly.
- Checks are automated (axe-core, Playwright). A manual screen-reader pass has not been run.
