# Proposed README changes (for the conductor to merge)

Replace the opening of README.md, from the title down to the first `---`, with the text below. Keep everything after it, including the "AI use" line at the end. Add the "Check a report" section before "Why this matters", and the two rows to the "What is in this repository" table.

---

# TalkBack Triage Pilot

**Check an Android accessibility bug report for the details a developer needs to reproduce it.** Paste a report and see, item by item, whether it has steps to reproduce, TalkBack or screen-reader steps, the app version, the device and Android version, expected vs. actual behavior, and the screen or element. Each detail is marked Found, Incomplete, Not found, Optional or Not needed. You get back a rewritten report where the details still to add are marked `[ADD: ...]`, ready to copy into the issue.

It is a heuristic completeness check (pattern rules, not AI). It runs entirely in your browser and sends nothing anywhere.

**Open it:** https://anirudh763.github.io/talkback-triage-pilot/ and press **Try a sample report** to see it on a real, incomplete issue from WordPress for Android or AntennaPod.

![The report checker on a real WordPress for Android issue: three details not found, and the rewritten report with placeholders](docs/screenshots/checker.png)

The same repository holds a small **exploratory study**: do TalkBack reproduction steps and the app version change how an AI triages these reports? It uses 75 real accessibility issues from two open-source Android apps. **Status: exploratory.** One AI run, no human labels yet. See [Results so far](#results-so-far) and [Limitations](#limitations). The checker does not use the AI and makes no claim about improving AI triage.

---

## Check a report

| Detail | What counts | If it's not found, the template asks for |
|---|---|---|
| Steps to reproduce | A numbered or bulleted list, or a "Steps" section | each action, including the gesture used |
| TalkBack or screen-reader steps | The steps say when TalkBack (or another screen reader) is on | when TalkBack is turned on, which gesture at each step |
| App version | `App version: 3.1.0`, `JPAndroid 24.8`, `v2.3.1`, `build 5.4` | the app version, from Settings > About |
| Device and Android version | `Pixel 8`, `Samsung Galaxy S10`, `Android 14`, `API 34` (one of the two is "incomplete") | the device model and Android version |
| Expected vs. actual behavior | Both described; a quoted announcement counts as "actual" | what should happen, what happens now |
| Screen or element | `the Post list screen`, `"Visit" icon`, `Settings > Accessibility` | the screen and the control |
| Screen-reader settings (optional) | `TalkBack 15.0`, speech rate, verbosity, font size | only if they could matter |

A report about font size, contrast, touch targets or another non-screen-reader setting is not asked for screen-reader steps; when no screen reader is mentioned at all, screen-reader steps are optional.

The rules are in `src/checker.js`. They reuse the study's checklist (`check()` in `src/core.js`) and add rules for reports from other apps. They are pattern matching: they can miss a detail written in an unusual way, or count a phrase that only looks like one. `node test/checker.test.js` shows what they catch.

**Share a check:** a dataset report has its own link (`#check?report=WP-21127`). For pasted text, **Copy link to this check** puts the whole report text into the link, after the `#`. Browsers don't send that part to the server, but anyone you give the link to can read the report, so don't share links to reports with private details.

**Sends nothing:** the page's Content Security Policy allows it to load only its own files and blocks requests to any other site (`connect-src 'self'`); the browser test checks that a request to another site is refused.

**Accessibility:** the site passes automated axe-core checks with 0 violations on every tab in light and dark mode, works at 320px wide, and its tabs are keyboard operable (arrow keys). It has not yet been tested by hand with a screen reader.

## Rows to add to "What is in this repository"

| Path | What it is |
|---|---|
| `src/checker.js` | The report checker's rules and the rewritten-report template. No user interface, no network. |
| `src/ui.css`, `src/app.css` | The shared base styles and the app's own styles; `scripts/build.js` inlines them into `docs/index.html`. |
| `test/checker.test.js`, `test/checker.e2e.js`, `test/workflow.test.js` | Checker unit tests; browser test of the checker plus the axe-core and 320px gates (`npm run test:e2e`); workflow guards. |
| `docs/screenshots/` | Screenshots for this README (`npm run screenshots`). |

## Line to change in "Quick start"

Replace "The checklist, the saved results and labelling all work offline." with "The report checker, the saved results and labelling all work offline."

## Security line (add under "Citing, licence and credits")

- **Security:** checked with `npm audit` (0 vulnerabilities) and a manual review of every place the page shows pasted or dataset text and of the CI workflow; no high-severity findings. Hardened: a Content Security Policy that allows only the page's own scripts (by hash) and no outside requests; data embedded in the page escapes every `<`; the CI workflow uses a read-only token and actions pinned to commit SHAs; pasted text is only ever shown as text (tested).
