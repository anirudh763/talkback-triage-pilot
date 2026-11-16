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

## Public import resource boundary

GitHub import requires a readable response stream. The app cancels after 256 KiB of received bytes (or 10 seconds); browsers without streaming support must paste the issue text instead. The cap bounds app accumulation, not the browser/network stack's own buffering. Report text is never sent to analytics.

## Optional local profiles (unreleased local implementation)

Browser-local profiles use Web Crypto PBKDF2-HMAC-SHA-256 with independent 16-byte salts and 600,000 iterations, with algorithm/version/workfactor recorded. Parameters follow the [OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Web Locks coordinate profile and saved-record writes. Unsupported crypto/locks/storage produce an explicit error; guest tools remain available.

An unlocked profile exists in memory only and locks on reload. Saved work is not encrypted. App-prefixed storage keys organize profiles but do not protect against other scripts on the same GitHub Pages origin. There is no cloud sync, email verification, server credential, SSO or password recovery. Do not save confidential reports on a shared browser. Explicit saved drafts are bounded to ten entries, 128 KiB each and 256 KiB total, in addition to the existing title/report caps. Guest drafts are not automatically imported into profiles. Profile work is saved only through Save work; legacy guest recovery remains separate.

Logout clears input, import state and export feedback, invalidates pending profile operations and broadcasts logout to other tabs. Intentionally saved entries remain available at later login and can be explicitly deleted. Corrupt/unsupported records produce actionable errors; resetting a corrupt profile registry uses browser site-data settings and removes its local profiles.
