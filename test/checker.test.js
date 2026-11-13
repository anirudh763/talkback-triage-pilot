// Unit checks for the report completeness checker (src/checker.js) and the page builder's data embedding.
//   node test/checker.test.js
"use strict";
const assert = require("assert");
const C = require("../src/checker.js");
const { safeJson, loadReports } = require("../scripts/lib.js");

const status = (a, key) => a.items.find((i) => i.key === key).status;
const found = (a, key) => a.items.find((i) => i.key === key).found;

// a complete report: every required item is present and the template has no [ADD: ...] placeholders
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
assert.deepStrictEqual(full.summary, { required: 6, present: 6, partial: 0, notFound: 0 });
assert.ok(!full.text.includes("[ADD:"), "complete report should have no [ADD: ...] placeholder");
// the Expected and Actual sections are copied into the rewrite under their own headings
// (not only present in the quoted original at the end)
assert.ok(full.text.includes("### Expected behavior\nTalkBack announces \"Navigate up\".\n\n### Actual behavior\nTalkBack announces \"Button\".\n"), "expected/actual copied under their headings");
// the same for bold headings with text on the same line, and AntennaPod's "Current behaviour"
const bold = C.analyze({ title: "x", body: "**Expected:** It says \"Play\".\n**Actual behaviour:** It says \"Button\"." });
assert.ok(bold.text.includes("### Expected behavior\nIt says \"Play\".\n\n### Actual behavior\nIt says \"Button\".\n"), bold.text);

// an incomplete report: what isn't found is marked "notfound" and becomes an [ADD: ...] placeholder
const thin = C.analyze({ title: "Icons have no names", body: "When hovering the icons, TalkBack should say their name." });
assert.strictEqual(status(thin, "steps"), "notfound");
assert.strictEqual(status(thin, "appVersion"), "notfound");
assert.strictEqual(status(thin, "device"), "notfound");
assert.strictEqual(status(thin, "expectedActual"), "partial"); // "should" without what happens now
assert.strictEqual(status(thin, "srSettings"), "optional");    // optional items never count as missing
assert.ok(thin.text.includes("- App version: [ADD: app version"));
assert.ok(thin.text.includes("[ADD: what happens instead"));
assert.ok(thin.text.includes("### Original report\n> When hovering"), "original text is kept, quoted");
assert.ok(thin.template.some((s) => s.mark === "add") && thin.template.some((s) => s.mark === "optional"));
assert.strictEqual(thin.template.map((s) => s.text).join(""), thin.text);

// a device without an Android version is partial, and "Android version 12.1" is not an app version
const part = C.analyze({ title: "x", body: "Tested on a Pixel 7. Android version 12.1" });
assert.strictEqual(status(part, "appVersion"), "notfound");
assert.strictEqual(status(part, "device"), "present");
assert.strictEqual(status(C.analyze({ title: "x", body: "Seen on Pixel 7" }), "device"), "partial");
// "opportunities" is not an Oppo phone
assert.strictEqual(status(C.analyze({ title: "x", body: "There are opportunities to improve this." }), "device"), "notfound");

// a report about font size doesn't need screen-reader steps
const font = C.analyze({ title: "Title cut off with large system font", body: "1. Set font size to max\n2. Open a podcast" });
assert.strictEqual(status(font, "srSteps"), "na");
assert.strictEqual(font.summary.required, 5);

// steps without a screen reader in them: partial, and the template asks when TalkBack was turned on
const nosr = C.analyze({ title: "TalkBack skips the play button", body: "1. Open the app\n2. Go to the Episodes screen" });
assert.strictEqual(status(nosr, "srSteps"), "partial");
assert.ok(nosr.text.includes("1. [ADD: when TalkBack is turned on]\n2. Open the app"));

// every report in the dataset gets a result and a template, and the built-in samples are really incomplete
const reports = loadReports();
for (const r of reports) { const a = C.analyze(r); assert.strictEqual(a.items.length, 7); assert.ok(a.text.startsWith("### Summary")); }
for (const id of ["WP-21127", "AP-3563", "WP-19452"]) {
  const r = reports.find((x) => x.id === id);
  assert.ok(r, id + " is in the dataset");
  assert.ok(C.analyze(r).summary.notFound >= 1, id + " should have at least one item not found");
}

// Real reports that earlier versions of the rules got wrong. Expected statuses were read off each report by hand.
const R = (id) => reports.find((x) => x.id === id);
const expect = (id, want) => { const a = C.analyze(R(id)); for (const k in want) assert.strictEqual(status(a, k), want[k], id + " " + k + ": " + JSON.stringify(a.items.find((i) => i.key === k))); return a; };
// The screen is named: Activity log / the "Home" tab; Go to "My Site"; WordPress Media Picker; Open Reader.
expect("WP-17092", { where: "present", steps: "present", srSteps: "present", expectedActual: "present" });
expect("WP-11115", { where: "present" });
expect("WP-11077", { where: "present" });
expect("WP-6072", { where: "present", device: "partial" });
assert.strictEqual(found(C.analyze(R("WP-11115")), "where"), "\"My Site\"");
// No screen reader anywhere in the report: screen-reader steps are optional, and the rewrite doesn't demand one.
for (const id of ["AP-8084", "AP-7139"]) {
  const a = expect(id, { srSteps: "optional" });
  assert.ok(a.text.includes("- Screen reader: [ADD IF RELEVANT:"), id + " asks for a screen reader only if relevant");
  assert.ok(!/\[ADD: (turn on TalkBack|when TalkBack|screen reader)/.test(a.text), id + " doesn't demand TalkBack");
}
// Full device and version names are kept.
assert.strictEqual(found(C.analyze(R("WP-6072")), "device"), "Nexus 6P");
assert.strictEqual(found(C.analyze(R("AP-7139")), "appVersion"), "3.3.2f");
assert.strictEqual(found(C.analyze({ title: "x", body: "Tested on a OnePlus 9 Pro, Android 13" }), "device"), "OnePlus 9 Pro, Android 13");
assert.strictEqual(found(C.analyze({ title: "x", body: "Device: Pixel 7a\nAndroid 14" }), "device"), "Pixel 7a, Android 14");
assert.strictEqual(found(C.analyze(R("AP-6598")), "appVersion"), "3.1.0 (91d5238f0)");
// Complete reports stay complete.
for (const id of ["WP-20770", "WP-20363", "WP-18698", "AP-6692", "AP-6598"]) assert.strictEqual(C.analyze(R(id)).summary.notFound, 0, id);
// The screen-name rule doesn't take the screen reader or the app for a screen.
assert.strictEqual(status(C.analyze({ title: "x", body: "Open TalkBack and go to WordPress." }), "where"), "notfound");

// Empty template sections, HTML comments and placeholders are not content (review 2, item 1).
const emptyEA = C.analyze({ title: "x", body: "### Expected behavior\n\n### Actual behavior\n" });
assert.strictEqual(status(emptyEA, "expectedActual"), "notfound", "empty Expected/Actual headings are not a description");
const emptyDev = C.analyze({ title: "x", body: "### Device model\n\n### Android version\nAndroid 14" });
assert.strictEqual(status(emptyDev, "device"), "partial", "an empty Device section must not capture the next heading");
assert.strictEqual(found(emptyDev, "device"), "Android 14");
const form = C.analyze({ title: "x", body: [
  "### App version", "", "_No response_", "", "### Device model", "<!-- e.g. Pixel 8 -->", "", "### Android version", "", "### Steps to reproduce", "<!-- 1. ... -->", "",
  "### Expected behavior", "<!-- what should happen -->", "### Actual behavior", "", "##### Tested on [device], Android [version]"].join("\n") });
for (const k of ["appVersion", "device", "steps", "expectedActual"]) assert.strictEqual(status(form, k), "notfound", "unfilled issue form: " + k);
assert.ok(form.text.includes("### Expected behavior\n[ADD:"), "an empty Expected section is not copied as content");
const filled = C.analyze({ title: "x", body: "### Expected behavior\nIt reads \"Play\".\n\n### Actual behavior\n<!-- comment -->\nIt reads \"Button\"." });
assert.strictEqual(status(filled, "expectedActual"), "present");

// The app version is never the screen reader's or the OS's version; explicit integer releases count (review 2, item 2).
const srv = C.analyze({ title: "x", body: "TalkBack version 15.1\nAndroid 14\nDevice: Pixel 8" });
assert.strictEqual(status(srv, "appVersion"), "notfound", "TalkBack version is not the app version: " + found(srv, "appVersion"));
for (const b of ["TalkBack v15.1", "Android Accessibility Suite version 14.2", "One UI version 6.1", "Chrome version 120.0.6099", "Android OS version 13.1", "Screen reader version 2.3"])
  assert.strictEqual(status(C.analyze({ title: "x", body: b }), "appVersion"), "notfound", b);
assert.strictEqual(found(C.analyze({ title: "x", body: "App version: 42" }), "appVersion"), "42");
assert.strictEqual(found(C.analyze({ title: "x", body: "### App version\n\n1024" }), "appVersion"), "1024");
assert.strictEqual(found(C.analyze({ title: "x", body: "**App version**: 7" }), "appVersion"), "7");
assert.strictEqual(found(C.analyze({ title: "x", body: "TalkBack 15.1, app version 3.2.0" }), "appVersion"), "app version 3.2.0");

// A bare field label or placeholder is not a device; a version named for a component is never the app's (review 3).
for (const b of ["Device model:", "Device: [device]", "Device:", "**Device:** _No response_"]) {
  const a = C.analyze({ title: "x", body: b });
  assert.strictEqual(status(a, "device"), "notfound", JSON.stringify(b) + " -> " + JSON.stringify(found(a, "device")));
}
for (const b of ["TalkBack app version: 15.1", "Android Accessibility Suite app version: 15.1", "Chrome app version 120.0.6099"]) {
  const a = C.analyze({ title: "x", body: b });
  assert.strictEqual(status(a, "appVersion"), "notfound", JSON.stringify(b) + " -> " + JSON.stringify(found(a, "appVersion")));
}
assert.strictEqual(status(C.analyze({ title: "x", body: "App version: 42" }), "appVersion"), "present");
assert.strictEqual(status(C.analyze({ title: "x", body: "WordPress app version 24.3" }), "appVersion"), "present");
assert.strictEqual(found(C.analyze({ title: "x", body: "Device: Pixel 8" }), "device"), "Pixel 8");

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
