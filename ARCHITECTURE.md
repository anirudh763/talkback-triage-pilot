# CueReport architecture and Phase 2 proposal

## Running system

CueReport is a static browser application served from GitHub Pages. `scripts/build.js` combines the HTML/CSS/JavaScript in `src/` with repository data and cached results into `docs/index.html`. There is no CueReport API, account system, database, hosted queue, or deployed AWS service.

The browser runs the deterministic report checker in `src/checker.js`. Its seven composer rows are steps, screen-reader steps when relevant, app version, device/Android version, expected versus actual behavior, screen or element, and optional screen-reader settings. The separate research ablation checklist has six measured features; these counts must not be conflated.

The public study dataset contains 75 GitHub issues. The current clean cached run contains 53 eligible reports and 187 model answers. These are saved study artifacts, not a live model service or a measurement of accuracy. The cached model setting is recorded as “quick”; the exact model version was not exposed by that runtime. Human labels remain incomplete.

The browser can import a public GitHub issue only after a user action. It calls `api.github.com` directly, without CueReport credentials, times out after 10 seconds, and limits the response to 256 KiB. The imported title and body remain in the browser. Draft autosave uses local storage as readable text. A user can also create a GitHub issue draft; clicking the link sends the URL and prefilled content to GitHub, where the user reviews and submits it.

Live Claude access in the page exists only when the page runs in the Claude app runtime. The command-line runner can use a user-supplied API key. Neither is part of a deployed CueReport backend; the cached research results remain available without either engine.

## Phase 2 proposal (not deployed)

The proposed QA workflow is:

```text
Public GitHub issue
        │ user-selected, bounded import
        ▼
CueReport report composer ── deterministic completeness check
        │                                  │
        │ optional future request          └── local draft / public issue draft
        ▼
AWS Step Functions (proposed orchestration)
        │
        ├── Amazon Bedrock (proposed model adapter)
        └── Human review queue (proposed; approve, edit, or reject)
```

The diagram describes a design direction only. Step Functions, Bedrock, the queue, persistence, user authentication, team permissions, audit events, and a backend API are not implemented or deployed. No report is currently sent to AWS. Any future model result must remain visibly separate from deterministic completeness findings and require a human decision before public feedback is posted.

### Proposed integration boundaries

- GitHub issue text is untrusted input. A future backend would need authenticated authorization, request-size limits, per-repository access checks, idempotency, rate controls, and explicit data retention before accepting it.
- Model prompts and versions must be pinned and recorded for each run. A cached result cannot be relabelled as a fresh inference.
- Human reviewers must be able to edit or reject a suggestion. The system must not invent confidence or treat completeness as correctness.
- Credentials belong in a backend secret store. The static app must not receive AWS credentials or retain a BYOK secret in local storage, URLs, logs, or analytics.
- Public comments, labels, or issue creation require a separate user action and explicit repository permissions. A private report must not be sent to a public issue form by default.

## Constraints

The current service is a report-preparation aid, not triage automation. It has no service-level agreement, response-time guarantee, security certification, or measured accuracy claim. Existing third-party issue text remains subject to its authors' rights and GitHub context; the code's MIT licence does not relicense those reports.
