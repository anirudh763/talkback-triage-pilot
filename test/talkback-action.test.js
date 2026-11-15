// The in-repository workflow helper must use the real checker, bound payloads and keep issue text out of logs.
"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "talkback-action-"));
const eventPath = path.join(dir, "event.json"), outputPath = path.join(dir, "output"), summaryPath = path.join(dir, "summary");
function run(issue) {
  fs.writeFileSync(eventPath, JSON.stringify({ issue }));
  fs.rmSync(outputPath, { force: true }); fs.rmSync(summaryPath, { force: true });
  return spawnSync(process.execPath, [path.join(root, "scripts/talkback-action.js")], {
    encoding: "utf8", env: Object.assign({}, process.env, { GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: outputPath, GITHUB_STEP_SUMMARY: summaryPath }),
  });
}
try {
  const hostile = "$(touch " + path.join(dir, "executed") + ")\n<script>alert(1)</script>";
  const result = run({ number: 12, title: "TalkBack label issue", body: "TalkBack used.\n" + hostile });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(!fs.existsSync(path.join(dir, "executed")), "issue text never reaches a shell");
  assert.ok(!result.stdout.includes(hostile) && !fs.readFileSync(summaryPath, "utf8").includes(hostile), "issue text is absent from logs and summaries");
  const output = fs.readFileSync(outputPath, "utf8");
  assert.match(output, /^number=12$/m);
  assert.match(output, /^checked=true$/m);
  assert.match(output, /^missing=.*$/m);
  assert.match(output, /^composer=https:\/\/anirudh763\.github\.io\/talkback-triage-pilot\/#\/check\?text=/m);
  const large = run({ number: 13, title: "Oversized", body: "x".repeat(64001) });
  assert.strictEqual(large.status, 0, large.stderr);
  assert.match(fs.readFileSync(outputPath, "utf8"), /^checked=false\nmissing=\ncomposer=$/m);
  console.log("TalkBack action tests passed (hostile issue text, bounded body)");
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
