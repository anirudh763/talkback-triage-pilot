#!/usr/bin/env node
// Recompute a saved run's numbers from its raw answers.
//
//   node scripts/analyze.js               the latest clean run (method 2)
//   node scripts/analyze.js rmw9sfcx9     a specific run
//   node scripts/analyze.js --csv         also write results/<run>.csv
"use strict";
const fs = require("fs");
const { T, CONDITIONS, APPS, rel, loadReports, loadRun, latestRun } = require("./lib.js");

const args = process.argv.slice(2);
const wantCsv = args.includes("--csv");
const id = args.find((a) => !a.startsWith("--")) || latestRun();
if (!id) { console.error("No runs in results/runs/."); process.exit(1); }
const run = loadRun(id);
const reports = loadReports();
const results = {};
let errors = 0;
for (const rid in run.items) {
  results[rid] = {};
  for (const c in run.items[rid]) { if (run.items[rid][c].error) errors++; else results[rid][c] = run.items[rid][c]; }
}
const reps = reports.filter((r) => results[r.id]);
const pct = (x) => (x == null ? "-" : Math.round(x * 100) + "%");
const pv = (p) => (p < 0.001 ? "p < 0.001" : "p = " + p.toFixed(3));

console.log("Run " + id + (run.meta.method === 2 ? "" : "  (SUPERSEDED: made with the first removal rules)"));
console.log("  created " + run.meta.created + ", model setting: " + (run.meta.model || run.meta.tier) + ", reports: " + reps.length + ", answers: " + Object.values(results).reduce((s, x) => s + Object.keys(x).length, 0) + ", errors: " + errors);

function report(rs, title) {
  const S = T.summarize(rs, results, CONDITIONS);
  console.log("\n" + title);
  console.log("  version          n   needs-more-evidence  blocks-task  can't-tell  flags-missing-steps  flags-missing-version");
  for (const r of S.rows) console.log("  " + r.cond.padEnd(14) + String(r.n).padStart(3) + "   " + pct(r.needsEvidence).padStart(18) + "  " + pct(r.blocks).padStart(11) + "  " + pct(r.cannotTell).padStart(10) + "  " + pct(r.flagsSteps).padStart(19) + "  " + pct(r.flagsVersion).padStart(21));
  for (const [c, p] of Object.entries(S.paired)) {
    if (!p.n) continue;
    console.log("  " + c.padEnd(11) + " vs as filed: " + p.toNeeds + " of " + p.n + " switched to needs-more-evidence, " + p.toActionable + " the other way (exact McNemar " + pv(p.p) + "); task-impact answer changed on " + pct(p.impactFlip));
  }
}
report(reps, "Both apps");
for (const app of Object.keys(APPS)) report(reps.filter((r) => r.app === app), APPS[app].name);

// Manipulation check: does the model notice what was removed?
const hadSteps = reps.filter((r) => T.check(r).tbSteps && results[r.id].no_steps);
const hadVer = reps.filter((r) => T.check(r).appVersion && results[r.id].no_version);
const flagged = (rs, c, key) => rs.filter((r) => results[r.id][c] && results[r.id][c].missing.includes(key)).length;
console.log("\nNoticing what was removed:");
console.log("  TalkBack steps flagged missing: " + flagged(hadSteps, "full", "talkback_steps") + "/" + hadSteps.length + " as filed, " + flagged(hadSteps, "no_steps", "talkback_steps") + "/" + hadSteps.length + " after removal");
console.log("  App version flagged missing:    " + flagged(hadVer, "full", "app_version") + "/" + hadVer.length + " as filed, " + flagged(hadVer, "no_version", "app_version") + "/" + hadVer.length + " after removal");

if (wantCsv) {
  const esc = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ["run", "report", "app", "issue", "title", "state", "state_reason", "talkback_steps", "app_version", "os_device", "expected_actual", "what_said", "media", "condition", "pair_clean", "task_impact", "evidence", "missing", "reason", "ask_reporter"];
  const lines = [head.join(",")];
  for (const r of reps) {
    const c0 = T.check(r);
    for (const c of CONDITIONS) {
      const a = run.items[r.id] && run.items[r.id][c];
      if (!a || a.error) continue;
      lines.push([id, r.id, APPS[r.app].name, r.number, r.title, r.state, r.stateReason, +c0.tbSteps, +c0.appVersion, +c0.osDevice, +c0.expectedActual, +c0.heard, +c0.media, c, c === "full" ? 1 : +T.pairCheck(r, c).clean, a.impact, a.evidence, (a.missing || []).join(" "), a.reason, a.ask].map(esc).join(","));
    }
  }
  fs.writeFileSync(rel("results", id + ".csv"), lines.join("\n") + "\n");
  console.log("\nWrote results/" + id + ".csv");
}
