// Guards for the GitHub Actions workflows: least-privilege token, actions pinned to commit SHAs,
// no pull_request_target, and no untrusted event text (issue or PR titles, bodies) inside run: scripts.
//   node test/workflow.test.js
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const dir = path.join(__dirname, "..", ".github", "workflows");
const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
assert.ok(files.length, "no workflows found");
for (const f of files) {
  const y = fs.readFileSync(path.join(dir, f), "utf8");
  assert.ok(/^permissions:\s*\n\s+contents:\s*read\s*$/m.test(y), f + ": set a top-level read-only token (permissions: contents: read)");
  assert.ok(!/pull_request_target/.test(y), f + ": pull_request_target runs untrusted code with secrets");
  for (const m of y.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)) assert.ok(/@[0-9a-f]{40}$/.test(m[1]), f + ": pin " + m[1] + " to a full commit SHA");
  assert.ok(!/\$\{\{\s*github\.(event|head_ref)/.test(y), f + ": don't put event text into run: scripts");
  assert.ok(!/npm install\b/.test(y), f + ": use npm ci with the committed lockfile");
}
const triage = fs.readFileSync(path.join(dir, "talkback-triage.yml"), "utf8");
const triageYaml = yaml.load(triage);
assert.ok(triageYaml.on.issues && triageYaml.on.workflow_call.inputs.source_ref.required, "workflow parses and reusable callers must pass the reviewed source SHA");
assert.ok(/post_comment:[\s\S]*?default:\s*false/.test(triage) && /apply_label:[\s\S]*?default:\s*false/.test(triage), "comments and labels are off unless a reusable-workflow caller opts in");
assert.ok(/optional-feedback:[\s\S]*?permissions:\s*\n\s+issues:\s*write/.test(triage), "issue write permission is scoped to the explicit feedback job");
assert.ok(/run: node scripts\/talkback-action\.js/.test(triage), "the issue event runs the local deterministic checker directly");
console.log("workflow tests passed (" + files.length + " file)");
