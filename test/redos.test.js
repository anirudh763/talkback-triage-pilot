// Adversarial inputs must not stall the checker (regular-expression backtracking).
// Each case runs in its own process with a hard timeout, so a regression fails fast instead of hanging CI.
//   node test/redos.test.js
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const LIMIT_MS = 200;     // per input, measured inside the child around the call that the page makes
const KILL_MS = 10000;    // a stalled child is killed and counted as a failure

// Each case builds its input in the child and times only the checker call.
const CASES = {
  "\"Steps\" + 2,000 spaces + \"x\"": `C.analyze({ title: "", body: "Steps" + " ".repeat(2000) + "x" })`,
  "\"Steps\" + 2,000 spaces + \"x\" (study rules, core.check)": `T.check({ title: "", body: "Steps" + " ".repeat(2000) + "x", labels: [] })`,
  "64k paste: \"Steps\" + 200 spaces + \"x\" lines": `C.analyze({ title: "", body: ("Steps" + " ".repeat(200) + "x\\n").repeat(320).slice(0, 64000) })`,
  "64k paste: \"Steps\" + 64,000 spaces": `C.analyze({ title: "", body: "Steps" + " ".repeat(64000) })`,
  "64k paste: inline label + spaces + \"*\" runs": `C.analyze({ title: "", body: ("**Steps" + " ".repeat(300) + "*".repeat(300) + " ".repeat(300) + "x\\n").repeat(70).slice(0, 64000) })`,
  "share link (2,723 characters) opened with #check?text=": `(() => {
    const code = C.encodeState("t", "Steps" + " ".repeat(2011) + "x");
    if (("#check?text=" + code).length !== 2723) throw new Error("unexpected link length " + ("#check?text=" + code).length);
    C.analyze(C.decodeState(code));
  })()`,
};

let failures = 0;
for (const [name, expr] of Object.entries(CASES)) {
  const src = `const C = require(${JSON.stringify(path.join(__dirname, "../src/checker.js"))});
    const T = require(${JSON.stringify(path.join(__dirname, "../src/core.js"))});
    const t0 = process.hrtime.bigint(); ${expr}; const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    process.stdout.write(String(ms));`;
  const r = spawnSync(process.execPath, ["-e", src], { timeout: KILL_MS, encoding: "utf8" });
  const ms = r.error || r.status !== 0 ? null : parseFloat(r.stdout);
  const ok = ms !== null && ms < LIMIT_MS;
  if (!ok) failures++;
  console.log((ok ? "  ok   " : "  FAIL ") + name + ": " + (ms === null ? (r.error && r.error.code === "ETIMEDOUT" ? "still running after " + KILL_MS + " ms, killed" : "error " + (r.stderr || "").trim().split("\n").pop()) : ms.toFixed(1) + " ms") + " (limit " + LIMIT_MS + " ms)");
}
// The faster rules must accept exactly what the old regexes accepted. Compare them on short random text built
// from the pieces those regexes care about (short, so the old regexes stay fast).
const T = require("../src/core.js");
const C = require("../src/checker.js");
const OLD_STEPS_HEAD = /^\s*(#{1,6}\s*|\*\*)?\s*steps(\s+to\s+reproduce(\s+the\s+behaviou?r)?)?\s*:?\**\s*:?\s*$/i;
const OLD_INLINE = /^[ \t]*(?:#{1,6}[ \t]*)?\**[ \t]*steps(?:[ \t]+to[ \t]+reproduce)?[ \t]*:?\**[ \t]*:?[ \t]*\S[^\n]{40,}$/im;
const PIECES = [" ", " ", "  ", "\t", "\n", "\r", " ", " ", "#", "##", "#######", "*", "**", ":", "steps", "Steps", "STEPS", "step",
  " to ", "to", "reproduce", " the ", "behaviour", "behavior", "x", "Open the app and swipe right", "1.", "-", "ſteps"];
let seed = 20261113;
const rand = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const randomText = (maxPieces) => { let s = ""; for (let k = rand(maxPieces) + 1; k > 0; k--) s += PIECES[rand(PIECES.length)]; return s; };
// what may come before "steps" on a label line, so many random lines are near misses or matches
const LEAD = ["", " ", "\t", "#", "##", "*", "**", " ", "x"];
// what may follow it: separators, then text whose length lands on both sides of the 41-character rule
const TAIL = [" ", "\t", ":", "*", "**", " to reproduce", " to", "\u00a0", "\r", "x", ""];
const tail = () => { let s = ""; for (let k = rand(5); k > 0; k--) s += TAIL[rand(TAIL.length)]; return s; };
const lead = () => { let s = ""; for (let k = rand(4); k > 0; k--) s += LEAD[rand(LEAD.length)]; return s; };
let headSame = 0, headHits = 0, inlineSame = 0, inlineHits = 0;
const RUNS = 30000;
for (let n = 0; n < RUNS; n++) {
  // headings: a line with a likely "steps" core, and the same text joined into several lines (check() also
  // runs .replace on the joined block text)
  const line = (rand(3) ? lead() : randomText(4)) + (rand(4) ? "steps" : "") + randomText(5);
  const oldHit = OLD_STEPS_HEAD.test(line);
  if (oldHit === T.STEPS_HEAD.test(line) && line.replace(OLD_STEPS_HEAD, "") === line.replace(T.STEPS_HEAD, "")) headSame++;
  else if (headSame - n > -5) console.log("  FAIL heading mismatch on " + JSON.stringify(line));
  if (oldHit) headHits++;
  // inline steps: several lines, some long enough for the 41-character rule
  const body = Array.from({ length: rand(3) + 1 }, () => (rand(3) ? lead() : randomText(6)) + (rand(4) ? "Steps" : "") + tail() + (rand(3) ? "a b".repeat(rand(20)) : randomText(8))).join(rand(2) ? "\n" : "\r\n");
  const o = body.match(OLD_INLINE), m = C.inlineSteps(body);
  if ((o && o[0]) === (m && m[0])) inlineSame++;
  else if (inlineSame - n > -5) console.log("  FAIL inline mismatch on " + JSON.stringify(body) + ": " + JSON.stringify(o && o[0]) + " vs " + JSON.stringify(m && m[0]));
  if (o) inlineHits++;
}
const agree = headSame === RUNS && inlineSame === RUNS && headHits > 500 && inlineHits > 500;
if (!agree) failures++;
console.log((agree ? "  ok   " : "  FAIL ") + "old and new rules agree: headings " + headSame + "/" + RUNS + " (" + headHits + " matches), bodies " + inlineSame + "/" + RUNS + " (" + inlineHits + " inline matches)");
// the length guard only skips lines no real heading reaches
ok2(T.isStepsHead("## Steps to reproduce the behaviour:") && !T.isStepsHead("Steps" + " ".repeat(600)), "isStepsHead: real headings pass, lines over 500 characters are not tested");
function ok2(c, msg) { if (!c) failures++; console.log((c ? "  ok   " : "  FAIL ") + msg); }

if (failures) { console.error(failures + " check(s) failed"); process.exit(1); }
console.log("redos tests passed");
