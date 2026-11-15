# CueReport decisions

This log distinguishes current behavior from Phase 2 proposals. A proposal is not authorization to deploy a service or spend money.

| Decision | State | Reason |
|---|---|---|
| Keep the live checker static and usable offline. | Current | The checker, 75 public examples, and cached research results run in the browser; there is no app backend. |
| Keep checker output deterministic and label it as completeness guidance. | Current | Seven composer details indicate what the rules find, not reproducibility, impact, correctness, or triage accuracy. |
| Keep the six-feature research ablation checklist separate from the seven-row composer. | Current | The instruments answer different questions and use different feature definitions. |
| Keep the saved clean study run unchanged. | Current | It represents 53 eligible reports and 187 answers from one cached run; a new model result would be a separate run. |
| Show Claude actions only where the actual Claude engine is present. | Current | Interactive page calls require the Claude app runtime; the CLI runner supports a user-supplied API key. Other contexts show cached results. |
| Use direct bounded public GitHub issue import. | Current | User-initiated request to `api.github.com`, 10-second timeout, 256 KiB response cap, no CueReport credentials. |
| Store drafts locally as readable text with a reset action and disclosure. | Current | Drafts survive reload without a server. Users should not enter secrets or private details. |
| Offer a public GitHub issue draft for plan feedback. | Current UI | The user follows a public link and chooses whether to submit. No email capture or report submission is performed by CueReport. |
| Price Indie at $29/month and QA Team at $149/month. | Proposed | Included usage, tax, support, margins, and willingness to pay are not validated. Do not present these as purchasable plans. |
| Use Step Functions, Bedrock, and a human review queue. | Proposed | Architecture direction only; no resources or integrations are deployed. It needs data-retention, authorization, cost, and operational review first. |
| Allow model suggestions to post automatically. | Not adopted | Public changes need human review and an explicit user action; current app has no team service or posting backend. |

## Evidence boundary

The current clean cached run is 53 reports / 187 answers, with the “quick” model setting and no exact model version from the original runtime. It does not establish model accuracy, confidence calibration, production readiness, or a new 13/32 outcome. Human-label work remains incomplete. Historical output may be discussed only with its saved run and prompt/model context; the superseded run is not a replacement for the current results.
