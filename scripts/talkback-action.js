#!/usr/bin/env node
"use strict";

const fs = require("fs");
const T = require("../src/checker.js");

const MAX_EVENT_BYTES = 1024 * 1024;
const path = process.env.GITHUB_EVENT_PATH;
if (!path) throw new Error("GITHUB_EVENT_PATH is required");
const size = fs.statSync(path).size;
if (size > MAX_EVENT_BYTES) throw new Error("GitHub event payload exceeds 1 MiB");
const event = JSON.parse(fs.readFileSync(path, "utf8"));
if (!event.issue || !Number.isSafeInteger(event.issue.number) || event.issue.number < 1 || typeof event.issue.title !== "string") {
  throw new Error("This workflow requires a GitHub issue event");
}
const issue = event.issue;
const body = typeof issue.body === "string" ? issue.body : "";
const withinCheckerLimit = issue.title.length <= 1000 && body.length <= T.MAX_INPUT;
const analysis = withinCheckerLimit ? T.analyze({ title: issue.title, body }) : null;
const missing = analysis ? analysis.items.filter((x) => x.required && (x.status === "partial" || x.status === "notfound")).map((x) => x.key) : [];
const composerState = withinCheckerLimit ? T.encodeState(issue.title, body) : null;
const output = {
  number: issue.number,
  checked: !!analysis,
  missing,
  composer: composerState ? "https://anirudh763.github.io/talkback-triage-pilot/#/check?text=" + composerState : "",
};
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,
  "number=" + output.number + "\nchecked=" + output.checked + "\nmissing=" + output.missing.join(",") + "\ncomposer=" + output.composer + "\n");
if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = !analysis ? "Skipped: issue title or body exceeds the checker's input limit."
    : missing.length ? "Required details to review: " + missing.join(", ") + "."
    : "No required report details were marked missing by the deterministic checker.";
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "### TalkBack report check\n\nIssue #" + issue.number + " — " + summary + "\n\nThis is a completeness check, not a reproduction or impact verdict.\n");
}
// Do not print or persist the issue title or body in workflow logs.
console.log(JSON.stringify({ issue: issue.number, checked: output.checked, missing: output.missing, composerAvailable: !!output.composer }));
