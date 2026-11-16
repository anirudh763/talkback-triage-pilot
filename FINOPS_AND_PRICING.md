# CueReport FinOps and proposed pricing

## Current cost boundary

The current demo is a static site with an in-browser deterministic checker and cached research files. It has no provisioned AWS resources or live CueReport model service; current AWS service spend for the demo is $0. The GitHub Pages hosting arrangement is outside this repository's metered cost data, so this is not a total project-cost statement.

Claude access is available only in the Claude app runtime or through the separate CLI runner when its user supplies an API key. Those calls are not included in CueReport hosting spend. Existing cached results do not incur a new model call.

## Free product and optional team interest

All implemented templates, checks, imports, drafts, reports, local profiles, encrypted backups and reference sync remain free. No checkout, subscription or paid gate exists. Optional early-access capture needs an owner-configured endpoint and actual acknowledgement; a local draft is not enrollment. No team bot or hosted cloud service is implied. Earlier price suggestions were unvalidated planning hypotheses, not offers or forecasts.

The optional Supabase connector ships unconfigured. Its future provider bill and any external form endpoint are separate from static hosting and model inference. No resources were provisioned for this implementation.

## Unknowns before any hosted pilot

AWS cost cannot be estimated responsibly without region, model, prompt and response token distributions, concurrency, retention, workflow duration, storage design, and expected review volume. A future budget should separately measure:

- model input/output tokens and retries per reviewed issue;
- Step Functions state transitions and execution duration;
- queue and database storage, reads/writes, backups, and retention;
- logging, metrics, alerting, and redaction volume;
- GitHub API limits and any webhook/API hosting;
- human review minutes, operational support, and incident handling.

A rough unit-cost model should be built from measured usage after a bounded trial:

```text
cost per reviewed issue = model tokens + workflow executions + storage/observability
                          + human review + support allocation
```

No cost values for those proposed services are asserted here. Pricing cannot be compared with cost until the billing basis, workload, taxes, support, and margin assumptions are decided. Do not provision paid services under the current static-demo authorization.

## Service commitments and rights

There is no SLA, uptime promise, compliance certification, security certification, or accuracy guarantee. The code is MIT licensed; that does not change the rights or terms for third-party GitHub issue text in the dataset.
