# Changelog

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

**Scripts and project files**
- New command-line scripts: `check`, `show-copy`, `pair-review`, `analyze`, `agreement`, `build`, and `run-triage.mjs` for rerunning with an API key.
- The web app is published with GitHub Pages from `docs/`, with the clean run built in.
- Added open-source project files: licence, data card, citation, contributing guide, code of conduct, CI.

## 0.1.0 – 2026-11-09

- First version of the app: checklist, AI triage, a four-version comparison, labelling, and 75 issues from two apps.
- First exploratory run `rmw9qhkle`. Its removal rules sometimes also cut device, version, a recording reference or a workaround, so its results can't isolate the effect of TalkBack steps.
