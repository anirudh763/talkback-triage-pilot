#!/usr/bin/env node
// Build the single-file web app: src/app.html + src/core.js + data + saved runs -> docs/index.html
// docs/ is what GitHub Pages serves.
"use strict";
const fs = require("fs");
const { rel, loadReports, loadRun, listRuns } = require("./lib.js");

const core = fs.readFileSync(rel("src", "core.js"), "utf8");
const tpl = fs.readFileSync(rel("src", "app.html"), "utf8");
const reports = loadReports();

// Only runs made with the fixed removal rules (method 2) are shown in the app.
const archive = {};
for (const id of listRuns()) {
  const run = loadRun(id);
  if (run.meta.method !== 2) continue;
  const meta = Object.assign({}, run.meta);
  delete meta.by;
  archive[id] = { meta, items: run.items };
}

const json = (o) => JSON.stringify(o).replace(/<\//g, "<\\/");
const page = tpl
  .replace("/*CORE*/", () => core.replace(/<\/script/g, "<\\/script"))
  .replace("/*DATA*/", () => json(reports))
  .replace("/*ARCHIVE*/", () => json(archive));

// The template has no <html>/<head>/<body>: wrap it so it is a complete page on GitHub Pages.
const doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="description" content="Checks Android accessibility bug reports for TalkBack reproduction steps and the app version, and measures how an AI\'s triage changes when those details are removed.">\n' +
  "<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n" + page + "\n</body>\n</html>\n";
fs.mkdirSync(rel("docs"), { recursive: true });
fs.writeFileSync(rel("docs", "index.html"), doc);
fs.writeFileSync(rel("docs", ".nojekyll"), "");
console.log("Wrote docs/index.html (" + Math.round(doc.length / 1024) + " KB, " + reports.length + " reports, " + Object.keys(archive).length + " saved run(s))");
