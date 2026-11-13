// scripts/triage-call.js against a stubbed fetch: no API key and no network.
//   node test/triage-call.test.js
"use strict";
const assert = require("assert");
const { triageCall } = require("../scripts/triage-call.js");
const T = require("../src/core.js");

const ANSWER = JSON.stringify({ task_impact: "slows_task", evidence: "actionable", missing: [], reason: "r", ask_reporter: "" });
const json = (status, body, headers) => ({ status, ok: status >= 200 && status < 300, headers: { get: (k) => (headers || {})[k] || null },
  json: async () => JSON.parse(typeof body === "string" ? body : JSON.stringify(body)), text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
const call = (fetch, extra) => triageCall(Object.assign({ fetch, base: "https://api.test", key: "k", model: "m", prompt: "p", parseAnswer: T.parseAnswer, sleep: async () => {} }, extra));

// If a stub leaves a promise pending with nothing keeping Node alive, the process would exit quietly with code 0.
let finished = false;
process.on("exit", () => { if (!finished) { console.error("triage-call tests did not finish"); process.exitCode = 1; } });

(async () => {
  // a good answer; the request carries a timeout signal
  let seen = null;
  let a = await call(async (url, init) => { seen = init; return json(200, { model: "m-1", content: [{ type: "text", text: ANSWER }] }); });
  assert.strictEqual(a.impact, "slows_task");
  assert.strictEqual(a.model, "m-1");
  assert.ok(seen.signal instanceof AbortSignal, "fetch gets an AbortSignal");

  // a network error is this report's error, not an exception that ends the run
  a = await call(async () => { throw new TypeError("fetch failed"); });
  assert.deepStrictEqual([a.error, a.message], ["network", "fetch failed"]);

  // a request that never answers is cut off by the timeout
  const t0 = Date.now();
  // (AbortSignal.timeout's timer doesn't keep Node alive; a real request's socket does, so hold the process open here)
  const hold = setTimeout(() => {}, 5000);
  a = await call((url, init) => new Promise((res, rej) => init.signal.addEventListener("abort", () => rej(init.signal.reason))), { timeoutMs: 50 });
  clearTimeout(hold);
  assert.strictEqual(a.error, "timeout");
  assert.ok(Date.now() - t0 < 2000, "the timeout ends the call");

  // a non-OK answer is checked before its body is parsed: an HTML error page gives a clear error, not a JSON SyntaxError
  await assert.rejects(call(async () => json(401, "<html>Unauthorized</html>")), (e) => /^API error 401: <html>Unauthorized<\/html>$/.test(e.message));
  await assert.rejects(call(async () => json(400, { error: { message: "model: not found" } })), (e) => e.message === "API error 400: model: not found");

  // overload and rate limits are retried
  let n = 0;
  a = await call(async () => (++n < 3 ? json(n === 1 ? 529 : 429, {}, { "retry-after": "1" }) : json(200, { content: [{ type: "text", text: ANSWER }] })));
  assert.strictEqual(n, 3);
  assert.strictEqual(a.evidence, "actionable");
  a = await call(async () => json(503, {}), { attempts: 2 });
  assert.strictEqual(a.error, "rate_limited");

  // an OK answer that is not JSON, or JSON that is not an answer, is this report's error
  a = await call(async () => json(200, "not json"));
  assert.strictEqual(a.error, "invalid_response");
  a = await call(async () => json(200, { content: [{ type: "text", text: "Sorry." }] }));
  assert.strictEqual(a.error, "invalid_json");

  finished = true;
  console.log("triage-call tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
