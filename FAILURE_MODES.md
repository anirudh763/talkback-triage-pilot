# CueReport failure modes and data handling

## Current static app

| Area | Failure or limit | User impact / handling |
|---|---|---|
| Rule checker | Pattern rules can miss unusual wording or match text that is not evidence. | Review the original report and draft; a complete checklist does not mean the issue is reproducible or correct. |
| Input size | Checks use at most 64,000 report characters. | The app marks truncation; copy or download the draft and check long source material before filing. |
| Local draft | Autosave stores title/body in browser local storage as readable text. Browser-profile access can expose it; browser storage can be blocked or full. | Do not enter passwords, tokens, or private details. Reset saved draft or erase both fields; empty fields clear the saved copy. Storage errors are shown. |
| Share URL | Pasted text can be encoded after `#` in a link. | The fragment is not sent to the app server, but anyone with the link can read it. Share only text intended for the recipient. |
| GitHub import | Only public issue URLs are supported. Network, rate-limit, malformed-response, timeout, or size failures can stop import. | The user initiates the call to `api.github.com`; it has a 10-second timeout and 256 KiB response cap. The report is not sent to CueReport. Retry or paste text manually. |
| GitHub issue draft | Following the public issue link transfers its query string to GitHub and the destination issue is public if submitted. | The plans link contains only a generic title. Do not put private reports or email addresses in public feedback. Review before submission. |
| Cached model results | One saved research run, quick setting; exact model version unavailable. | Results are exploratory and not accuracy evidence. They remain unchanged by UI or plan proposals. |
| Claude availability | Interactive calls work only in the Claude app runtime; CLI reruns need a user-supplied key and actual network access. | Elsewhere the app presents saved results. Missing engine, permission, rate-limit, or malformed response must not be represented as a fresh result. |
| Human labels | Independent labels are incomplete. | Do not claim agreement with people or validated triage performance. |
| Issue rights | The dataset contains public third-party issue text. | Public availability does not mean the text is owned by CueReport or licensed under the code licence. Preserve issue attribution and original context. |

## Proposed Phase 2 services (not deployed)

Step Functions, Bedrock, a human review queue, accounts, team permissions, database, and backend are proposals. They have no live availability or current operational telemetry. If implemented, likely failure cases include workflow retries creating duplicate comments, model/API throttling, stale prompt or model versions, queue backlog, reviewer edits being lost, cross-repository authorization errors, excess token usage, and accidental retention of sensitive issue text. Required controls include idempotency, bounded payloads and retries, per-repository authorization, audit records, deletion/retention rules, human approval, and a tested fallback to the deterministic checker.

No AWS outage, capacity, price, SLA, or certification claim can be made for an undeployed design. Do not describe a proposed control as operational.
