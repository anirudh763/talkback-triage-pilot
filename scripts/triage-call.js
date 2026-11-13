// One triage call to the Anthropic Messages API, used by scripts/run-triage.mjs.
// Separate from the script so test/triage-call.test.js can run it against a stubbed fetch (no API key, no network).
"use strict";

const RETRY_STATUS = (s) => s === 429 || s === 529 || s >= 500;

// Returns the parsed answer, or { error, ... } for a failure that belongs to this one report (the run goes on and
// a later run retries it). Throws only for errors that would hit every report (bad key, unknown model, bad request).
async function triageCall(opts) {
  const { fetch, base, key, model, prompt, parseAnswer } = opts;
  const sleep = opts.sleep || ((ms) => new Promise((res) => setTimeout(res, ms)));
  const timeoutMs = opts.timeoutMs || 120000;
  const attempts = opts.attempts || 6;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let res;
    try {
      res = await fetch(base + "/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
        // a stalled connection fails this call instead of hanging the run
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      const timedOut = e && (e.name === "TimeoutError" || e.name === "AbortError");
      return { error: timedOut ? "timeout" : "network", message: String((e && e.message) || e).slice(0, 300) };
    }
    if (RETRY_STATUS(res.status)) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || Math.min(60000, 2000 * 2 ** attempt);
      if (opts.log) opts.log("  (" + res.status + ", waiting " + Math.round(wait / 1000) + "s)\n");
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      // error bodies are usually JSON, but a proxy can answer with HTML: read text, then try JSON
      const text = await res.text().catch(() => "");
      let msg = text.slice(0, 300);
      try { const j = JSON.parse(text); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) { /* keep the text */ }
      throw new Error("API error " + res.status + ": " + msg);
    }
    let j;
    try { j = await res.json(); } catch (e) { return { error: "invalid_response", message: String(e.message || e).slice(0, 300) }; }
    const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const a = parseAnswer(text);
    if (!a) return { error: "invalid_json", raw: text.slice(0, 500) };
    a.model = j.model || model;
    return a;
  }
  return { error: "rate_limited" };
}

module.exports = { triageCall };
