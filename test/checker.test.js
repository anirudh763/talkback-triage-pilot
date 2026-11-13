// Unit checks for the report completeness checker (src/checker.js) and the page builder's data embedding.
//   node test/checker.test.js
"use strict";
const assert = require("assert");
const C = require("../src/checker.js");
const { safeJson, loadReports } = require("../scripts/lib.js");

const status = (a, key) => a.items.find((i) => i.key === key).status;
const found = (a, key) => a.items.find((i) => i.key === key).found;

// a complete report: every required item is present and the template has no MISSING placeholders
const full = C.analyze({
  title: "Back button reads as \"Button\" on the Post list screen",
  body: [
    "### Expected behavior", "TalkBack announces \"Navigate up\".", "",
    "### Actual behavior", "TalkBack announces \"Button\".", "",
    "### Steps to reproduce", "1. Turn on TalkBack", "2. Open the Post list screen", "3. Swipe right until the back button is focused", "",
    "App version: 24.8", "Device: Pixel 8", "Android 14", "TalkBack 15.0, speech rate 2x",
  ].join("\n"),
});
assert.deepStrictEqual(full.items.map((i) => [i.key, i.status]), [
  ["steps", "present"], ["srSteps", "present"], ["appVersion", "present"], ["device", "present"],
  ["expectedActual", "present"], ["where", "present"], ["srSettings", "present"],
]);
assert.strictEqual(found(full, "appVersion"), "24.8");
assert.strictEqual(found(full, "device"), "Pixel 8, Android 14");
assert.deepStrictEqual(full.summary, { required: 6, present: 6, partial: 0, missing: 0 });
assert.ok(!full.text.includes("[MISSING:"), "complete report should have no MISSING placeholder");
assert.ok(full.text.includes("TalkBack announces \"Button\"."), "actual behaviour is carried into the template");

// an incomplete report: what's missing is marked missing and becomes a placeholder
const thin = C.analyze({ title: "Icons have no names", body: "When hovering the icons, TalkBack should say their name." });
assert.strictEqual(status(thin, "steps"), "missing");
assert.strictEqual(status(thin, "appVersion"), "missing");
assert.strictEqual(status(thin, "device"), "missing");
assert.strictEqual(status(thin, "expectedActual"), "partial"); // "should" without what happens now
assert.strictEqual(status(thin, "srSettings"), "optional");    // optional items never count as missing
assert.ok(thin.text.includes("- App version: [MISSING: app version"));
assert.ok(thin.text.includes("[MISSING: what happens instead"));
assert.ok(thin.text.includes("### Original report\n> When hovering"), "original text is kept, quoted");
assert.ok(thin.template.some((s) => s.mark === "missing") && thin.template.some((s) => s.mark === "optional"));
assert.strictEqual(thin.template.map((s) => s.text).join(""), thin.text);

// a device without an Android version is partial, and "Android version 12.1" is not an app version
const part = C.analyze({ title: "x", body: "Tested on a Pixel 7. Android version 12.1" });
assert.strictEqual(status(part, "appVersion"), "missing");
assert.strictEqual(status(part, "device"), "present");
assert.strictEqual(status(C.analyze({ title: "x", body: "Seen on Pixel 7" }), "device"), "partial");
// "opportunities" is not an Oppo phone
assert.strictEqual(status(C.analyze({ title: "x", body: "There are opportunities to improve this." }), "device"), "missing");

// a report about font size doesn't need screen-reader steps
const font = C.analyze({ title: "Title cut off with large system font", body: "1. Set font size to max\n2. Open a podcast" });
assert.strictEqual(status(font, "srSteps"), "na");
assert.strictEqual(font.summary.required, 5);

// steps without a screen reader in them: partial, and the template asks when TalkBack was turned on
const nosr = C.analyze({ title: "TalkBack skips the play button", body: "1. Open the app\n2. Go to the Episodes screen" });
assert.strictEqual(status(nosr, "srSteps"), "partial");
assert.ok(nosr.text.includes("1. [MISSING: when TalkBack is turned on]\n2. Open the app"));

// every report in the dataset gets a result and a template, and the built-in samples are really incomplete
const reports = loadReports();
for (const r of reports) { const a = C.analyze(r); assert.strictEqual(a.items.length, 7); assert.ok(a.text.startsWith("### Summary")); }
for (const id of ["WP-21127", "AP-3563", "WP-19452"]) {
  const r = reports.find((x) => x.id === id);
  assert.ok(r, id + " is in the dataset");
  assert.ok(C.analyze(r).summary.missing >= 1, id + " should have at least one missing item");
}

// pasted HTML is plain text in the result: it is carried through unchanged, never interpreted
const html = C.analyze({ title: "<img src=x onerror=alert(1)>", body: "<script>alert(1)</script>" });
assert.ok(html.text.includes("<img src=x onerror=alert(1)>") && html.text.includes("> <script>alert(1)</script>"));

// shareable link state round-trips any text, and rejects anything that isn't a valid code
const s = { title: "Ünïcode ✓ \"quotes\"", body: "1. Line one\n2. <b>two</b> ".repeat(50) };
const code = C.encodeState(s.title, s.body);
assert.ok(/^[A-Za-z0-9_-]+$/.test(code), "link code is URL-safe");
assert.deepStrictEqual(C.decodeState(code), s);
assert.strictEqual(C.decodeState("not base64!"), null);
assert.strictEqual(C.decodeState(Buffer.from('{"t":1,"b":"x"}').toString("base64url")), null);
assert.strictEqual(C.decodeState(Buffer.from("[]").toString("base64url")), null);
assert.strictEqual(C.encodeState("t", "x".repeat(C.MAX_LINK_CHARS + 1)), null, "too long for a link");

// the page builder's JSON embedding can't end or confuse the <script> element it sits in
const nasty = [{ body: "</script><script>alert(1)</script> <!-- <script> -->" }];
const emb = safeJson(nasty);
assert.ok(!emb.includes("<"), "no raw < in embedded JSON");
assert.deepStrictEqual(JSON.parse(emb), nasty);

console.log("checker tests passed");
