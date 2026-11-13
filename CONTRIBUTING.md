# Contributing

Thanks for helping. This is a small research pilot, so the most useful contributions are careful ones.

## Ways to help

- **Label reports.** Follow [LABELING.md](LABELING.md), then send your `labels/<name>.json` as a pull request or attach it to an issue.
- **Check the removal rules.** Read `results/pair_review.md`. If a shortened copy removed something it shouldn't have, or kept steps it should have removed, open an issue with the report id.
- **Rerun the triage** with another model (`scripts/run-triage.mjs`) and share the run folder.
- **Add another app's issues.** Open an issue first, so the selection rule can be agreed before data is added.

## Setting up

You need Node.js 18 or later. The scripts have no dependencies.

```bash
node scripts/check.js         # must end with "All shortened copies are clean."
node scripts/build.js         # rebuilds docs/index.html
```

The tests need the dev dependencies (Playwright, axe-core and js-yaml):

```bash
npm ci
npm test                       # unit tests, the issue form, the version check, then a rebuild
npx playwright install chromium
npm run test:e2e               # browser tests, including offline and no-JavaScript
```

If you change `src/icon.svg`, run `npm run icons` to render the PNG icons, then `node scripts/build.js`. If you release a new version, change `version` in `package.json` and add a dated `## x.y.z – YYYY-MM-DD` heading at the top of `CHANGELOG.md`; `test/version.test.js` checks they match, and the service worker's cache name follows the version.

## Before you open a pull request

- If you changed `src/`, `data/` or `results/`, run `node scripts/check.js`, then `node scripts/pair-review.js` and `node scripts/build.js`, and commit the regenerated `data/issues.json`, `results/pair_review.md` and `docs/index.html`. The CI check fails if they are out of date.
- Keep `src/core.js` free of interface code; the app and the scripts both use it.
- Changing the removal rules or the prompt changes the experiment. Say so in the pull request, and don't mix the results with earlier runs. New runs should get a new folder in `results/runs/`.
- Use plain language in the interface and the docs.

## Adding issues

Add them to a `data/raw_<app>.txt` file in the same format (see [DATA.md](DATA.md)), and register the app in `scripts/lib.js` and in the `APPS` list in `src/app.html`. Record the selection rule and the fetch date in DATA.md.

## Reporting a problem

For a security problem, follow [SECURITY.md](SECURITY.md) instead of opening a public issue. For anything else, open an issue. Say what you did, what you expected and what happened. Include the report id when it's about a specific report.
