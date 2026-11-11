// Unit checks for the numbers the results depend on: the answer parser and the statistics.
//   node test/core.test.js
"use strict";
const assert = require("assert");
const T = require("../src/core.js");
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + " is not " + b);

// exact two-sided McNemar test, against values worked out by hand
near(T.mcnemar(0, 5), 2 / 32);
near(T.mcnemar(1, 9), 22 / 1024);
near(T.mcnemar(3, 3), 1);
near(T.mcnemar(0, 0), 1);

// Cohen's kappa for the table [[20, 5], [10, 15]]: observed 0.7, by chance 0.5, kappa 0.4
const pairs = [];
for (const [a, b, n] of [["y", "y", 20], ["y", "n", 5], ["n", "y", 10], ["n", "n", 15]]) for (let i = 0; i < n; i++) pairs.push([a, b]);
near(T.cohenKappa(pairs).k, 0.4);
near(T.cohenKappa(pairs).po, 0.7);
assert.strictEqual(T.cohenKappa([]), null);

// the answer parser reads plain and fenced JSON
const good = { task_impact: "blocks_task", evidence: "actionable", missing: ["app_version", "not_a_key"], reason: "r", ask_reporter: "q" };
const want = { impact: "blocks_task", evidence: "actionable", missing: ["app_version"], reason: "r", ask: "q" };
assert.deepStrictEqual(T.parseAnswer(JSON.stringify(good)), want);
assert.deepStrictEqual(T.parseAnswer("Here you go:\n```json\n" + JSON.stringify(good) + "\n```"), want);
// and never guesses a category for an answer that is not on the list
assert.strictEqual(T.parseAnswer(JSON.stringify({ ...good, evidence: "not_actionable" })), null);
assert.strictEqual(T.parseAnswer(JSON.stringify({ ...good, task_impact: "Blocks task" })), null);
assert.strictEqual(T.parseAnswer("I cannot answer that."), null);

// the prompt sends at most MAX_BODY characters of the report
assert.ok(!T.prompt("t", "x".repeat(T.MAX_BODY) + "TAIL", "App").includes("TAIL"));

console.log("core tests passed");
