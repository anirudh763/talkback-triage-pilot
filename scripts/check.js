#!/usr/bin/env node
// Parse the raw GitHub issue dumps, run the checklist on every report, and confirm that every
// shortened copy removed only its target detail. Writes data/issues.json.
//
//   node scripts/check.js            print a table of the checklist flags
//   node scripts/check.js --quiet    only print the totals
//
// Exits with code 1 if any shortened copy lost a detail it should have kept.
"use strict";
const fs = require("fs");
const { T, CONDITIONS, rel, loadReports } = require("./lib.js");

const quiet = process.argv.includes("--quiet");
const reports = loadReports();
fs.writeFileSync(rel("data", "issues.json"), JSON.stringify(reports, null, 1) + "\n");

const flags = ["tbSteps", "appVersion", "osDevice", "expectedActual", "heard", "media"];
const count = (app, k) => reports.filter((r) => (!app || r.app === app) && T.check(r)[k]).length;
console.log("Reports: " + reports.length + " (WordPress " + reports.filter((r) => r.app === "WP").length + ", AntennaPod " + reports.filter((r) => r.app === "AP").length + ")");
console.log("\nHow often each detail appears:");
for (const k of flags) console.log("  " + k.padEnd(15) + " WP " + String(count("WP", k)).padStart(2) + "   AP " + String(count("AP", k)).padStart(2) + "   all " + String(count(null, k)).padStart(2));

if (!quiet) {
  console.log("\nid         TB VER DEV E/A SAID MEDIA  title");
  for (const r of reports) {
    const c = T.check(r);
    const m = (b) => (b ? " Y " : " . ");
    console.log(r.id.padEnd(10) + m(c.tbSteps) + m(c.appVersion) + m(c.osDevice) + m(c.expectedActual) + " " + m(c.heard) + "  " + m(c.media) + "  " + r.title.slice(0, 60));
  }
}

let dirty = 0;
console.log("\nShortened copies:");
for (const cond of CONDITIONS.slice(1)) {
  const applies = reports.filter((r) => T.applies(r, cond));
  const bad = applies.filter((r) => !T.pairCheck(r, cond).clean);
  dirty += bad.length;
  console.log("  " + cond.padEnd(11) + applies.length + " copies, " + (applies.length - bad.length) + " clean" + (bad.length ? "  NOT CLEAN: " + bad.map((r) => r.id + " " + JSON.stringify(T.pairCheck(r, cond))).join("; ") : ""));
}
if (dirty) { console.error("\n" + dirty + " shortened copies lost a detail they should have kept."); process.exit(1); }
console.log("\nAll shortened copies are clean.");
