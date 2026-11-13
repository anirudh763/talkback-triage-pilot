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
assert.ok(sw.includes('const VERSION = "' + version + '";'), "docs/sw.js carries version " + version + " (run node scripts/build.js)");
assert.ok(fs.readFileSync(path.join(root, "src", "sw.js"), "utf8").includes('const VERSION = "__VERSION__";'), "src/sw.js takes the version from the build");
console.log("version tests passed (" + version + ")");
