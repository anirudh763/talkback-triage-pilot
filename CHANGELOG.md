# Changelog

## Unreleased

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
