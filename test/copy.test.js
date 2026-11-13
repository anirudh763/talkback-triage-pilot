// Guards the wording of the report checker: it finds missing sections; it must not claim that a report
// with every section is reproducible or ready to act on, and it must describe the sample honestly.
//   node test/copy.test.js
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "src", "app.html"), "utf8");
const check = html.slice(html.indexOf('<section class="screen" id="check"'), html.indexOf("<!-- ============ EXAMPLES"));
assert.ok(check.length > 2000, "found the Check and Draft screens in src/app.html");
const text = check.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const readme = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
const checkerReadme = readme.slice(readme.indexOf("## Report checker"));

const OVERCLAIM = /\b(reproducible|ready to (fix|act)|actionable|needs to reproduce it|developer needs to reproduce|guarantee)/i;
assert.ok(!OVERCLAIM.test(text.replace(/can still be impossible to reproduce/g, "")), "checker page overclaims: " + (text.match(OVERCLAIM) || [])[0]);
assert.ok(/finds missing sections only/i.test(text), "checker page says it finds missing sections only");
assert.ok(/Report preparation, rules not AI/.test(text), "Check says it is report preparation, by rules, not AI");
assert.ok(!/\b(certif|verified reproduc|triage accuracy of)/i.test(text), "Check and Draft don't claim certified reproducibility or AI triage accuracy");
assert.ok(/Nothing is filled in for you/.test(text), "Draft says gaps are not filled in for the reporter");
assert.ok(/github\.com\/AntennaPod\/AntennaPod\/issues\/6598/.test(check), "checker page links the AntennaPod #6598 example");
assert.ok(/finds missing sections only/i.test(checkerReadme) && /issues\/6598/.test(checkerReadme), "README checker section says the same");
assert.ok(!/details a developer needs to reproduce/i.test(readme), "README no longer says the checker finds what is needed to reproduce");
assert.ok(/no user validation/i.test(checkerReadme), "README says there is no user validation");
assert.ok(/not only bug reports/.test(readme) && /issues\/8145/.test(readme), "README describes the sample as accessibility issues, citing AntennaPod #8145");
console.log("copy tests passed");
