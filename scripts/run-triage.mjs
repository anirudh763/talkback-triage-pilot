#!/usr/bin/env node
// Rerun the AI triage outside the web app, with your own Anthropic API key.
//
//   export ANTHROPIC_API_KEY=sk-ant-...
//   node scripts/run-triage.mjs --model claude-haiku-5-5
//
// Options
//   --model <id>          required. Any Anthropic model id, e.g. claude-haiku-5-5 or claude-sonnet-5-5
//   --conds <list>        versions to triage, comma separated (default: full,no_steps,no_version,neither)
//   --scope eligible|all  eligible = the reports that have something to remove (default), all = all 75
//   --limit <n>           only the first n reports (for a quick trial)
//   --concurrency <n>     calls at once (default 2)
//   --id <name>           run folder name (default: api-<timestamp>). Reuse a name to finish an interrupted run.
//
// Writes results/runs/<id>/meta.json and items/<report>.json in the same format the web app saves,
// so `node scripts/analyze.js <id>` reads it and `node scripts/build.js` shows it in the app.
// The prompt is the same one the app uses (src/core.js, prompt()). Shortened copies are only run
// when the checklist confirms they are clean (src/core.js, pairCheck()).
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const { T, CONDITIONS, APPS, rel, loadReports } = require("./lib.js");

function arg(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
}
const model = arg("model");
const conds = arg("conds", CONDITIONS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const scope = arg("scope", "eligible");
const limit = Number(arg("limit", 0)) || 0;
const concurrency = Math.max(1, Number(arg("concurrency", 2)) || 2);
const id = arg("id", "api-" + new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "").replace("T", "-"));
const key = process.env.ANTHROPIC_API_KEY;
const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");

if (!model) { console.error("Pass --model, e.g. --model claude-haiku-5-5"); process.exit(1); }
if (!key) { console.error("Set ANTHROPIC_API_KEY first (https://console.anthropic.com)."); process.exit(1); }
const bad = conds.filter((c) => !CONDITIONS.includes(c));
if (bad.length) { console.error("Unknown version(s): " + bad.join(", ") + ". Use: " + CONDITIONS.join(", ")); process.exit(1); }

// ---- plan: same rules as the web app ----
const reports = loadReports();
let pool = scope === "all" ? reports : reports.filter((r) => CONDITIONS.slice(1).some((c) => T.applies(r, c)));
if (limit) pool = pool.slice(0, limit);
const tasks = [];
for (const r of pool) for (const c of conds) if (c === "full" || (T.applies(r, c) && T.pairCheck(r, c).clean)) tasks.push({ r, c });

const dir = rel("results", "runs", id);
const itemsDir = path.join(dir, "items");
fs.mkdirSync(itemsDir, { recursive: true });
const metaPath = path.join(dir, "meta.json");
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")) :
  { created: new Date().toISOString(), method: 2, runner: "api", model, conds, scope, total: tasks.length, status: "running" };
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

const itemPath = (rid) => path.join(itemsDir, rid + ".json");
const readItem = (rid) => (fs.existsSync(itemPath(rid)) ? JSON.parse(fs.readFileSync(itemPath(rid), "utf8")).answers || {} : {});
const todo = tasks.filter(({ r, c }) => { const a = readItem(r.id)[c]; return !a || a.error; });
console.log("Run " + id + ": " + tasks.length + " calls planned, " + (tasks.length - todo.length) + " already done, " + todo.length + " to go. Model " + model + ".");

// ---- one call, with retries for rate limits and overload ----
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
async function triage(title, body, appName) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(base + "/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 700, messages: [{ role: "user", content: T.prompt(title, body, appName) }] }),
    });
    if (res.status === 429 || res.status === 529 || res.status >= 500) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || Math.min(60000, 2000 * 2 ** attempt);
      process.stdout.write("  (" + res.status + ", waiting " + Math.round(wait / 1000) + "s)\n");
      await sleep(wait);
      continue;
    }
    const j = await res.json();
    if (!res.ok) throw new Error("API error " + res.status + ": " + (j.error && j.error.message || JSON.stringify(j)));
    const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const a = T.parseAnswer(text);
    if (!a) return { error: "invalid_json", raw: text.slice(0, 500) };
    delete a.confidence;
    a.model = j.model || model;
    return a;
  }
  return { error: "rate_limited" };
}

// ---- run ----
let done = 0, failed = 0;
const queue = todo.slice();
async function worker() {
  while (queue.length) {
    const { r, c } = queue.shift();
    let a;
    try { a = await triage(r.title, T.variant(r, c), APPS[r.app].name); }
    catch (e) { console.error("\n" + e.message); process.exit(1); }
    const answers = Object.assign(readItem(r.id), { [c]: a });
    fs.writeFileSync(itemPath(r.id), JSON.stringify({ answers, at: new Date().toISOString() }, null, 1) + "\n");
    done++; if (a.error) failed++;
    process.stdout.write("\r  " + done + "/" + todo.length + " done" + (failed ? ", " + failed + " unreadable" : "") + "   ");
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
meta.status = failed ? "done-with-errors" : "done";
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
console.log("\nFinished. Next: node scripts/analyze.js " + id + "   (and node scripts/build.js to show it in the app)");
