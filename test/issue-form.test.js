// The ready-to-copy issue form (examples/accessibility-bug.yml) must parse, ask for exactly the checker's
// seven details (required where the checker requires them), and produce issues the checker reads as complete.
//   node test/issue-form.test.js        (needs js-yaml: npm ci)
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const C = require("../src/checker.js");

const file = path.join(__dirname, "..", "examples", "accessibility-bug.yml");
const form = yaml.load(fs.readFileSync(file, "utf8")); // throws if the YAML doesn't parse

// GitHub issue-form basics: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
assert.ok(form && typeof form.name === "string" && form.name && typeof form.description === "string" && form.description, "form has a name and a description");
assert.ok(Array.isArray(form.body) && form.body.length, "form has a body list");
const TYPES = ["markdown", "textarea", "input", "dropdown", "checkboxes"];
for (const f of form.body) assert.ok(TYPES.includes(f.type) && f.attributes, "every body item has a known type and attributes: " + JSON.stringify(f).slice(0, 80));
const fields = form.body.filter((f) => f.type !== "markdown");
const ids = fields.map((f) => f.id);
assert.strictEqual(new Set(ids).size, ids.length, "field ids are unique");
for (const f of fields) assert.ok(/^[A-Za-z0-9_-]+$/.test(f.id) && f.attributes.label, "field " + f.id + " has a valid id and a label");

// Each field id is a checker key; expected and actual behavior are two fields for the one checker detail.
const KEY = { expected: "expectedActual", actual: "expectedActual" };
const keyOf = (id) => KEY[id] || id;
const sample = { title: "Menu button has no label", body: "TalkBack: 1. Open the Post list screen\n2. Swipe right\nApp version: 24.8\nPixel 8, Android 14" };
const checkerKeys = C.analyze(sample).items.map((x) => x.key);
assert.strictEqual(checkerKeys.length, 7, "the checker has seven details");
assert.deepStrictEqual([...new Set(ids.map(keyOf))].sort(), [...checkerKeys].sort(), "form fields map one-to-one onto the checker's seven details");

// Required in the form exactly where the checker requires it for a screen-reader report.
const requiredKeys = new Set(fields.filter((f) => f.validations && f.validations.required === true).map((f) => keyOf(f.id)));
const checkerRequired = new Set(C.analyze(sample).items.filter((x) => x.required).map((x) => x.key));
assert.deepStrictEqual([...requiredKeys].sort(), [...checkerRequired].sort(), "required fields match the checker's required details");
for (const f of fields.filter((x) => keyOf(x.id) === "expectedActual")) assert.ok(f.validations && f.validations.required, f.id + " is required");

// An issue filed with the form, as GitHub renders it ("### <label>" then the answer), with the placeholders as
// answers: the checker finds all seven details.
const render = (answer) => fields.map((f) => "### " + f.attributes.label + "\n\n" + answer(f)).join("\n\n");
const filled = C.analyze({ title: "Post list menu button is unlabeled", body: render((f) => String(f.attributes.placeholder || "").trim()) });
const notPresent = filled.items.filter((x) => x.status !== "present").map((x) => x.key + ":" + x.status);
assert.deepStrictEqual(notPresent, [], "a filled form gives all seven details as found");
assert.strictEqual(filled.summary.present, filled.summary.required, "summary: every required detail found");

// Optional fields left empty render as "_No response_", which the checker must not count as content.
const blankOptional = C.analyze({ title: "x", body: render((f) => (f.validations && f.validations.required ? String(f.attributes.placeholder || "").trim() : "_No response_")) });
assert.strictEqual(blankOptional.items.find((x) => x.key === "srSettings").status, "optional", "an empty optional settings field reads as optional");
assert.strictEqual(blankOptional.summary.present, blankOptional.summary.required, "required details still all found");

console.log("issue form tests passed (" + fields.length + " fields, " + requiredKeys.size + " required details)");
