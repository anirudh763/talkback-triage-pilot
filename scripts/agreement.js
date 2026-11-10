#!/usr/bin/env node
// Agreement between people, and between people and the AI, from label files.
//
//   node scripts/agreement.js labels/rater-a.json labels/rater-b.json [--run <run id>]
//
// A label file is what the app's "Copy my labels" button gives you:
//   {"tool":"talkback-triage-pilot","version":2,"labels":{"WP-20770":{"impact":"blocks_task","evidence":"actionable"}, "WP-20770~no_steps":{...}}}
// Keys are a report id for the report as filed, or "<report id>~<version>" for a shortened copy.
// Each version is compared only with labels of that same version.
"use strict";
const fs = require("fs");
const path = require("path");
const { T, CONDITIONS, loadReports, loadRun, listRuns } = require("./lib.js");

const args = process.argv.slice(2);
const runArg = args.indexOf("--run") >= 0 ? args[args.indexOf("--run") + 1] : null;
const files = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--run");
if (!files.length) { console.error("Usage: node scripts/agreement.js <labels.json> [more labels.json] [--run <run id>]"); process.exit(1); }

const raters = files.map((f) => {
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  return { name: path.basename(f, ".json"), labels: d.labels || d };
});
const fmt = (k) => (k && k.n ? Math.round(k.po * 100) + "% agree, kappa " + k.k.toFixed(2) + " (n=" + k.n + ")" : "no shared labels");

// people vs people
for (let i = 0; i < raters.length; i++) for (let j = i + 1; j < raters.length; j++) {
  const a = raters[i], b = raters[j];
  const both = Object.keys(a.labels).filter((k) => b.labels[k]);
  console.log(a.name + " vs " + b.name + ": " + both.length + " shared labels");
  console.log("  enough to start reproducing: " + fmt(T.cohenKappa(both.map((k) => [a.labels[k].evidence, b.labels[k].evidence]))));
  console.log("  blocks the task (yes/no):    " + fmt(T.cohenKappa(both.map((k) => [a.labels[k].impact === "blocks_task", b.labels[k].impact === "blocks_task"]))));
  console.log("  task impact (4 levels):      " + fmt(T.cohenKappa(both.map((k) => [a.labels[k].impact, b.labels[k].impact]))));
  const dis = both.filter((k) => a.labels[k].evidence !== b.labels[k].evidence || a.labels[k].impact !== b.labels[k].impact);
  if (dis.length) console.log("  disagreements to discuss: " + dis.join(", "));
}

// reference label: the first two raters' shared answer, or the only rater's answer
const ref = {};
for (const key of new Set(raters.flatMap((r) => Object.keys(r.labels)))) {
  const vals = raters.map((r) => r.labels[key]).filter(Boolean);
  if (vals.length === 1) ref[key] = vals[0];
  else {
    const impact = vals[0].impact === vals[1].impact ? vals[0].impact : null;
    const evidence = vals[0].evidence === vals[1].evidence ? vals[0].evidence : null;
    if (impact || evidence) ref[key] = { impact, evidence };
  }
}

const id = runArg || listRuns().filter((x) => loadRun(x).meta.method === 2).pop();
if (!id) process.exit(0);
const run = loadRun(id);
const reports = loadReports();
console.log("\nAI (run " + id + ") and the checklist rule vs the people's labels of the same version:");
for (const c of CONDITIONS) {
  const ai = [], rule = [], blocks = [];
  for (const r of reports) {
    const g = ref[c === "full" ? r.id : r.id + "~" + c];
    if (!g) continue;
    const a = run.items[r.id] && run.items[r.id][c];
    if (a && !a.error && g.evidence) ai.push([a.evidence, g.evidence]);
    if (a && !a.error && g.impact) blocks.push([a.impact === "blocks_task", g.impact === "blocks_task"]);
    if (g.evidence && (c === "full" || T.applies(r, c))) {
      const has = T.check({ title: r.title, body: T.variant(r, c), labels: r.labels }).hasSteps;
      rule.push([has ? "actionable" : "needs_more_evidence", g.evidence]);
    }
  }
  if (!ai.length && !rule.length) continue;
  console.log("  " + T.CONDITIONS[c].label);
  console.log("    AI, enough to start reproducing:   " + fmt(T.cohenKappa(ai)));
  console.log("    Rule, enough to start reproducing: " + fmt(T.cohenKappa(rule)));
  console.log("    AI, blocks the task:               " + fmt(T.cohenKappa(blocks)));
}
