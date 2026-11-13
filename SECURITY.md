# Security policy

## Maintenance status

Public beta, maintained by one student, on a best-effort basis. There is no service-level promise and no bug bounty. The supported task is narrow: checking one Android accessibility bug report for missing sections in the browser, and reproducing the pilot study's numbers from the saved run.

## Reporting a vulnerability

Please report security problems privately, not in a public issue. If the **Security** tab of this repository shows **Report a vulnerability**, use it (GitHub private vulnerability reporting). If it doesn't, open an issue titled "Security contact request" with no details; the maintainer will open a draft GitHub security advisory and invite you to it, so the details stay private.

Include what you found, how to reproduce it, and what an attacker could do with it. Please don't send reports by email. Replies are best effort and can take a few days.

## Supported versions

Only the latest commit on `main` and the page it publishes (https://anirudh763.github.io/talkback-triage-pilot/) are supported.

## In scope

- The web app in `docs/` (built from `src/`): showing pasted or dataset text as anything other than text, getting around the Content Security Policy, the service worker caching or serving something it shouldn't, and pasted report text leaving the browser.
- The command-line scripts in `scripts/`, including how `run-triage.mjs` handles an API key.
- The GitHub Actions workflow in `.github/workflows/` (token permissions, pinned actions, untrusted input).

## Out of scope

- The content of the GitHub issues in `data/`. It is third-party text, kept as fetched for research.
- Answers from the AI model in `results/`.
- Problems in GitHub Pages, GitHub Actions, browsers or Node.js themselves; please report those to their owners.
- The Claude app runtime that hosts the study's AI triage.
