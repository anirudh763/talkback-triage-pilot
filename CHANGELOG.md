# Changelog

## Unreleased

### Report checker as the front page

The study's data, saved runs, `results/` and analysis outputs are unchanged.

- "Check a report" is now the first thing on the site: paste a report on the left; on the right, a checklist of seven details a developer needs (steps, TalkBack or screen-reader steps, app version, device and Android version, expected vs. actual, the screen or element, and screen-reader settings when relevant), each marked Found, Incomplete, Missing, Optional or Not needed in text and with an icon, then a rewritten report with `[MISSING: ...]` placeholders and a Copy button.
- "Try a sample report" steps through three real, incomplete reports from the dataset (WordPress-Android #21127, AntennaPod #3563, WordPress-Android #19452).
- The checker is labelled "heuristic completeness check (rules, not AI)". It runs in the browser and makes no network calls. Its rules are in `src/checker.js`; they reuse the study's checklist (`check()` in `src/core.js`, unchanged) and add rules for reports from other apps.
- Links are shareable: `#check?report=WP-21127` opens a dataset report, and "Copy link to this check" puts pasted text in the URL fragment (`#check?text=...`), which browsers don't send to a server.
- The study's tabs keep their wording. The AI triage card appears only when the page runs inside the Claude app.
- New look based on a shared base stylesheet (`src/ui.css`): system-style type in Atkinson Hyperlegible served from `docs/` (no Google Fonts), 1px borders, light and dark from the system setting.
- New tests: `test/checker.test.js` (rules, template, link encoding, safe data embedding), `test/workflow.test.js`, and `test/checker.e2e.js` (sample, template, copy, URL state, pasted HTML stays inert, axe-core in light and dark on every tab, no page scroll at 320px and 390px, 24px targets, no requests off the page's origin).

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

## 0.2.0 – 2026-11-10

Changes made after an outside review of the first run.

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
