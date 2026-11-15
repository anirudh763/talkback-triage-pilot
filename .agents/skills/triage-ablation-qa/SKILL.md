---
name: triage-ablation-qa
description: Verify Accessibility report preparation and cached/live model evaluation with reproducible real-engine edge cases and browser evidence.
---

# Domain acceptance

Use the exact repository engine, published fixtures and existing tests. Add reproducible cases for the following; record pass/fail/untested, versions and evidence for each.

1. Complete report: show actual cached/live schema-validated triage or explicitly labelled deterministic completeness rules; no fabricated reproducibility/accuracy claim.
2. TalkBack-step ablation: exact removed text and matching archived report/prompt/model version; recompute13/32 only if the actual frozen results establish it.
3. Missing environment/OS metadata: actionable missing-field guidance, no invented device/version.
4. 50 KiB logcat input: visible size/truncation consent and token-budget guard, no silent data loss or unbounded request.
5. Missing/invalid BYOK key: clear error and explicit cached-example fallback; never pretend a new live result or persist/expose credentials.
6. Human-label CSV/JSON export: correct report versions, deterministic escaping, validated label schema and import/export roundtrip.
7. Axe/keyboard/focus at 320/768/1440, exact text diff semantics, loading/empty/error/success and stale/cancel states. No claim of AAA certification or human screen-reader testing from automation.

Run the relevant native/Python/Node/browser checks and inspect 320/768/1440 UI states. Zero errors/leaks means none observed in the named finite run, not a universal guarantee. Preserve meaningful assertion strength; diagnose platform/toolchain differences rather than skipping failing cases. No secrets or user payloads in reports.
