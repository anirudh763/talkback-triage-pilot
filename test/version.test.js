// The version in the code (package.json, and the offline cache name in docs/sw.js) matches the newest
// release heading in CHANGELOG.md ("## 0.2.0 – 2026-11-13").   node test/version.test.js
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const version = require("../package.json").version;
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
const top = changelog.match(/^## (\S+)/m);
assert.ok(top, "CHANGELOG.md has a release heading");
assert.ok(/^\d+\.\d+\.\d+$/.test(top[1]), "the top CHANGELOG heading is a released version, not \"" + top[1] + "\"");
assert.strictEqual(top[1], version, "package.json version " + version + " matches the top CHANGELOG version " + top[1]);
assert.ok(new RegExp("^## " + version.replace(/\./g, "\\.") + " – \\d{4}-\\d{2}-\\d{2}$", "m").test(changelog), "the top CHANGELOG heading has a date");
assert.strictEqual(changelog.match(new RegExp("^## " + version.replace(/\./g, "\\.") + "\\b", "gm")).length, 1, "version " + version + " has one CHANGELOG heading");
const sw = fs.readFileSync(path.join(root, "docs", "sw.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "docs", "offline-manifest.json"), "utf8"));
assert.strictEqual(manifest.appVersion, version, "offline metadata carries the package release");
assert.match(manifest.version, /^[a-f0-9]{16}$/, "cache identity is a content-derived build digest");
assert.ok(sw.includes('const BUILD = ' + JSON.stringify(manifest) + ';'), "worker embeds the exact generated public manifest");
assert.ok(fs.readFileSync(path.join(root, "src", "sw.js"), "utf8").includes('const BUILD = __CONFIG__;'), "worker template receives generated metadata");
for (const file of manifest.files) {
 const digest = require("node:crypto").createHash("sha256").update(fs.readFileSync(path.join(root, "docs", file.path))).digest("hex");
 assert.strictEqual(digest, file.sha256, "offline asset matches generated digest: " + file.path);
}
console.log("version tests passed (" + version + ", " + manifest.version + ")");
