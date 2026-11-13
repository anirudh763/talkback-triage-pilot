# Changelog

## 0.2.0 – 2026-11-13

0.2.0 was never tagged before this date, so this entry covers every change since 0.1.0, newest first.

### Fix: slow input and the API runner

- Two regular expressions backtracked badly on runs of spaces or stars. The Steps heading rule is in `src/core.js`, and the rule for steps written on the label's own line is in `src/checker.js`. "Steps" + 2,000 spaces + "x" took about 8 s to check, and a 2,723-character share link blocked the tab for about 3.6 s. Both rules now run in linear time and accept exactly the same text. The heading rule takes each run of spaces or stars once. The inline rule finds the first character after "steps" and measures from there. Heading lines over 500 characters are no longer tested. The study's classifications are unchanged: the checker snapshot and every `results/` file are byte-identical.
- `test/redos.test.js`: six adversarial inputs (including a 64k paste and a 2,723-character share link) must each finish in under 200 ms. It also checks that the old and new rules agree on 30,000 random headings and 30,000 random bodies.
- `scripts/run-triage.mjs`: each API call has a timeout (`AbortSignal.timeout`, 120 s). A network error or timeout is saved as that report's error, and a rerun with the same `--id` retries it; before, it ended the run. A failed answer is checked with `res.ok` before its body is parsed, so an HTML error page now gives "API error 401: ..." instead of a JSON parse error. The call is in `scripts/triage-call.js`, and `test/triage-call.test.js` tests it with a stubbed `fetch`.

### Design standard

The checker's rules, scoring, `data/` and `results/` are unchanged.

- `DESIGN.md` at the repository root lists the app's tokens with light and dark values, measured contrast ratios, motion and components.
- In "Every report in this run", a detail that was not found is now a dashed, struck-through tag, so found and not found differ without colour; the caption explains the tags and spells out TB, VER, DEV, E/A, SAID and MEDIA.
- App copies of shared components are gone: `.badge` (and its dot), `.chip`, `.pill` and `.honest` are ui.css `.label`, `.sr` is `.sr-only`, `.card` is `.box`. Unused colour aliases were removed.
- "Heuristic completeness check (rules, not AI)" is its own line instead of a pill inside a sentence.
- Report text, the rewritten report and the report viewer are .875rem; form fields are 16px on touch devices so iOS does not zoom.
- Notices and the no-JavaScript message lost their coloured left stripe.
- The pilot's progress bar scales with a transform instead of animating its width.
- `src/ui.css` is the updated shared base, copied unchanged: root size 93.75% (a larger browser default font now applies), buttons get a pressed state and primary buttons a hover state, colour transitions only when reduced motion is off, `.app-header .repo` and `.btn[aria-pressed="true"]` are shared.
- Tests: `test/checker.e2e.js` checks that found and not-found tags differ by more than colour (light and dark); `test/e2e.js` checks the finished progress bar is a full transform with no width transition.

### Usability: install, offline and a ready-made issue form

The checker's rules (`src/checker.js`), `src/core.js`, `data/` and `results/` are unchanged.

- The page can be installed and works offline: a web app manifest, an original SVG icon with 192 and 512 px PNGs rendered from it (`scripts/icons.js`), and a service worker (`docs/sw.js`) with a relative scope and a versioned cache name (`talkback-triage-pilot-v0.2.0`). It fetches from the network first and uses the cache only when the network fails. It is not registered inside the Claude app or from `file://`. The Content Security Policy now allows the page's own worker and manifest (`worker-src 'self'`, `manifest-src 'self'`) and still blocks other sites.
- A `<noscript>` message says the page needs JavaScript and links to the README.
- `examples/accessibility-bug.yml`: a GitHub issue form to copy into another repository. Its fields are the checker's seven details, required where the checker requires them.
- The README leads with the report checker and says that the labelling workflow has not been tried by a human labeller yet.
- `SECURITY.md`: how to report a vulnerability and what is in scope.
- New tests: `test/offline.e2e.js` (manifest, icons, worker scope and cache name, then the checker loads and analyzes a sample with the network off), `test/noscript.e2e.js` (JavaScript off, 1280 and 375 px, light and dark), `test/issue-form.test.js` (the form parses, its fields map to the checker's keys, a filled form is read as complete) and `test/version.test.js` (package.json, the worker's cache name and this file agree). axe-core now runs at 1280 and 375 px.
- `js-yaml` 4.3.2 is a dev dependency, used only by the issue-form test.

### Fixes after a second review

The study's data, saved runs and `results/` are unchanged.

- Checker: empty template sections, HTML comments and placeholders (`_No response_`, `[device]`) no longer count as content. `### Expected behavior` with nothing under it was "both described", and an empty `### Device model` section took the next heading as the device.
- Checker: a TalkBack, Android, One UI, Chrome or other component version is never taken as the app version, and an explicit integer release (`App version: 42`) now counts.
- Pilot runs: unreadable or refused AI replies are counted as failed calls, not as answers. A run with failures is shown as incomplete, and Finish this run stays available to retry them. Before, a run where every call failed showed "106 of 106 calls answered" and hid the button.
- Cohen's kappa is undefined, not 1, when every label is in one category (chance agreement is 1). The app and `scripts/agreement.js` show "undefined (all labels in one category)" next to the observed agreement.
- The app and README call the clean-copy check automated and name two known cases where it misses a change in meaning (WordPress-Android #21127, AntennaPod #8145).
- The README has a Report checker section, and the font licence (SIL OFL 1.1) is in `src/` and `docs/`.
- Browser tests: failed and refused AI replies (all and some), an API failure, keyboard-only use, 200% zoom and empty or broken input.

### Report checker as the front page

The study's data, saved runs, `results/` and analysis outputs are unchanged.

- "Check a report" is now the first thing on the site: paste a report on the left; on the right, a checklist of seven details a developer needs (steps, TalkBack or screen-reader steps, app version, device and Android version, expected vs. actual, the screen or element, and screen-reader settings when relevant), each marked in text and with an icon, then a rewritten report with placeholders and a Copy button.
- "Try a sample report" steps through three real, incomplete reports from the dataset (WordPress-Android #21127, AntennaPod #3563, WordPress-Android #19452).
- The checker is labelled "heuristic completeness check (rules, not AI)". It runs in the browser and makes no network calls. Its rules are in `src/checker.js`; they reuse the study's checklist (`check()` in `src/core.js`, unchanged) and add rules for reports from other apps.
- Links are shareable: `#check?report=WP-21127` opens a dataset report, and "Copy link to this check" puts pasted text in the URL fragment (`#check?text=...`), which browsers don't send to a server.
- The study's tabs keep their wording. The AI triage card appears only when the page runs inside the Claude app.
- New look based on a shared base stylesheet (`src/ui.css`): system-style type in Atkinson Hyperlegible served from `docs/` (no Google Fonts), 1px borders, light and dark from the system setting.
- New tests: `test/checker.test.js` (rules, template, link encoding, safe data embedding), `test/workflow.test.js`, and `test/checker.e2e.js` (sample, template, copy, URL state, pasted HTML stays inert, axe-core in light and dark on every tab, no page scroll at 320px and 390px, 24px targets, no requests off the page's origin).

### Checker fixes after review

- Expected and actual behaviour are now copied into the rewritten report under their own headings. Before, a heading like `### Expected behavior` was never recognised (0 of 26 dataset reports with that heading); now 26 of 26.
- Fewer false "not found": a quoted or Title Case screen after Go to / Open / Select / Tap / in / on counts as "Screen or element" (WP-17092, WP-11115, WP-11077, WP-6072), and reports that never mention a screen reader get screen-reader steps as Optional, with no demand for TalkBack in the rewrite (AP-8084, AP-7139). Over the 75 dataset reports, required items not found went from 185 to 171.
- Full device and version names: `Nexus 6P`, `OnePlus 9 Pro`, `3.3.2f`.
- The status reads "Not found", not "Missing", and placeholders read `[ADD: ...]`, because the rules can miss a detail that is there.
- The pilot's run controls are hidden outside the Claude app, with a note; the tabs wrap instead of being cut off on narrow screens; the page warns that a link to pasted text carries the whole report.
- A Content Security Policy allows only the page's own inline scripts (by hash) and files, and blocks requests to other sites.

### Security and CI

- The data embedded in `docs/index.html` now escapes every `<`, so issue text such as `</script>` or `<!--` can't end or change the `<script>` element it sits in (before, only `</` was escaped).
- The workflow runs with a read-only token (`permissions: contents: read`), doesn't keep the checkout credentials, and pins `actions/checkout` and `actions/setup-node` to commit SHAs.
- `package-lock.json` is committed and CI uses `npm ci`. `npm audit`: 0 vulnerabilities.

### Earlier audit fixes

Changes from a code audit. The saved runs and their numbers are unchanged.

- An AI answer whose value is not on the list (for example `"not_actionable"`) is now recorded as an unreadable reply and left out. Before, it was counted as "needs more evidence" or "can't tell".
- New `test/core.test.js` checks the answer parser, the exact McNemar test and Cohen's kappa against hand-worked values. CI runs it.
- The browser test now fails when it finds an error, and CI runs it.
- `analyze.js` and `agreement.js` pick the same default run: the newest clean run by date.
- `run-triage.mjs` refuses to finish a run with a different model than it was started with.
- The app says so when a pilot run's answers could not be saved with the page.
- "Check a report" says so when a report is longer than the 6,000 characters sent to the AI.
- Imported raters whose names have no Latin letters or digits no longer overwrite each other.
- Removed the leftover confidence field from new answers, and duplicate and unreachable patterns from the removal rules. `results/pair_review.md` is unchanged.

### Changes after an outside review of the first run (2026-11-10)

**Removal rules**
- "TalkBack steps removed" now drops only the action steps. It keeps observed-behaviour steps, anything TalkBack said, recordings, notes, workarounds and "Tested on" lines.
- "Version removed" keeps "first occurred" notes and drops only the app version, Android version, device and app source.
- Each shortened copy is checked by `pairCheck()` and used only if nothing else the checklist measures changed. All 134 copies pass.
- New `results/pair_review.md` lists every removed line.

**Run and prompt**
- New clean run `rmw9sfcx9`. Run `rmw9qhkle` is kept but marked superseded.
- The AI prompt's evidence question now matches the human rubric: "Could a developer start reproducing this issue with the information here?"
- Self-reported confidence was removed from the prompt and the interface.

**Labelling**
- Labels are keyed by report and version, and each version is scored only against labels of the same version.
- A 5-report starter set and a written rubric ([LABELING.md](LABELING.md)).
- A checklist-rule baseline is scored alongside the AI.
- Labels are always saved in the browser too, so a guest's labels survive a reload and can be copied.
- If the browser blocks automatic copying, "Copy my labels" shows the labels selected in a box to copy by hand.

**Scripts and project files**
- New command-line scripts: `check`, `show-copy`, `pair-review`, `analyze`, `agreement`, `build`, and `run-triage.mjs` for rerunning with an API key.
- The web app is published with GitHub Pages from `docs/`, with the clean run built in.
- Added open-source project files: licence, data card, citation, contributing guide, code of conduct, CI.

## 0.1.0 – 2026-11-09

- First version of the app: checklist, AI triage, a four-version comparison, labelling, and 75 issues from two apps.
- First exploratory run `rmw9qhkle`. Its removal rules sometimes also cut device, version, a recording reference or a workaround, so its results can't isolate the effect of TalkBack steps.
