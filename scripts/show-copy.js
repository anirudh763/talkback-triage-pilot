#!/usr/bin/env node
// Print a report as filed and its shortened copies, so you can see exactly what was removed.
//
//   node scripts/show-copy.js WP-20770            all versions
//   node scripts/show-copy.js WP-20770 no_steps   one version
"use strict";
const { T, CONDITIONS, loadReports } = require("./lib.js");

const [id, only] = process.argv.slice(2);
const r = loadReports().find((x) => x.id === id);
if (!r) { console.error("Usage: node scripts/show-copy.js <report id, e.g. WP-20770> [" + CONDITIONS.join("|") + "]"); process.exit(1); }
for (const c of only ? [only] : CONDITIONS) {
  const label = T.CONDITIONS[c] ? T.CONDITIONS[c].label : c;
  if (c !== "full" && !T.applies(r, c)) { console.log("=== " + label + ": not applicable (nothing to remove)\n"); continue; }
  const pc = c === "full" ? null : T.pairCheck(r, c);
  console.log("=== " + label + (pc ? (pc.clean ? " (clean)" : " (NOT CLEAN " + JSON.stringify(pc) + ")") : ""));
  console.log(c === "full" ? r.body : T.variant(r, c));
  console.log();
}
