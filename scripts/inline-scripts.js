#!/usr/bin/env node
// Write the inline <script> blocks of src/app.html (the page's own code, not the bundled checker) to one .js
// file, so a JavaScript scanner such as semgrep can read them:  node scripts/inline-scripts.js <out.js>
"use strict";
const fs = require("fs");
const { rel } = require("./lib.js");
const out = process.argv[2];
if (!out) { console.error("usage: node scripts/inline-scripts.js <out.js>"); process.exit(2); }
const html = fs.readFileSync(rel("src", "app.html"), "utf8");
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((c) => !c.includes("/*CORE*/"));
fs.writeFileSync(out, blocks.join("\n;\n"));
console.log("Wrote " + blocks.length + " inline script block(s) to " + out);
