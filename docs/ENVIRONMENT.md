# Environment configuration

The static TalkBack checker does not load `.env` files or read environment variables at runtime. The separate local `scripts/run-triage.mjs` CLI recognizes `ANTHROPIC_API_KEY` and optional `ANTHROPIC_BASE_URL`; the API key is a secret and must remain local. The root example keeps it blank/commented. The optional public-issue importer calls only `api.github.com` after a user submits a public issue URL; it omits credentials, rejects redirects and bounds responses to 256 KiB with a 10-second timeout. Rules and cached study results run locally without model calls. A live Claude run is available only in a supported Claude artifact environment; this static deployment does not turn a local `.env` key into browser configuration.

An optional local n8n instance is separate; see [integrations/n8n/.env.example](../integrations/n8n/.env.example). This configuration does not create or enable a workflow.
