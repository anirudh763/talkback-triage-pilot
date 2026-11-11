// Shared helpers for the command-line scripts. No dependencies beyond Node.js 18+.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const T = require(path.join(ROOT, "src", "core.js"));
const CONDITIONS = ["full", "no_steps", "no_version", "neither"];
const APPS = {
  WP: { name: "WordPress for Android", repo: "wordpress-mobile/WordPress-Android", file: "data/raw_wp.txt" },
  AP: { name: "AntennaPod", repo: "AntennaPod/AntennaPod", file: "data/raw_ap.txt" },
};

const rel = (...p) => path.join(ROOT, ...p);
const read = (p) => fs.readFileSync(rel(p), "utf8");

// Parse both raw dumps (the source of truth) into report objects.
function loadReports() {
  const out = [];
  for (const key of Object.keys(APPS)) out.push(...T.parseRaw(read(APPS[key].file), APPS[key].repo));
  return out;
}

// Read one saved run: results/runs/<id>/meta.json and items/<report>.json
function loadRun(id) {
  const dir = rel("results", "runs", id);
  if (!fs.existsSync(dir)) throw new Error("No run named " + id + " in results/runs/");
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const items = {};
  const itemsDir = path.join(dir, "items");
  if (fs.existsSync(itemsDir)) {
    for (const f of fs.readdirSync(itemsDir).filter((x) => x.endsWith(".json")).sort()) {
      const d = JSON.parse(fs.readFileSync(path.join(itemsDir, f), "utf8"));
      items[f.replace(/\.json$/, "")] = (d.data || d).answers || {};
    }
  }
  return { id, meta, items };
}

function listRuns() {
  const dir = rel("results", "runs");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => fs.existsSync(path.join(dir, x, "meta.json"))).sort() : [];
}

// The newest run made with the fixed removal rules (method 2), or undefined. Run names do not sort by date.
function latestRun() {
  const runs = listRuns().map(loadRun).filter((r) => r.meta.method === 2);
  runs.sort((a, b) => (b.meta.created || "").localeCompare(a.meta.created || ""));
  return runs.length ? runs[0].id : undefined;
}

module.exports = { ROOT, T, CONDITIONS, APPS, rel, read, loadReports, loadRun, listRuns, latestRun };
