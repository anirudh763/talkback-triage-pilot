// Service worker for the standalone page (GitHub Pages or any static server): keeps the page, its fonts and
// icons in a cache so the report checker works offline. Network first, so an online visit always gets the
// latest page; the cache is used only when the network fails. Same-origin GET requests only.
// scripts/build.js writes docs/sw.js from this file with the version from package.json.
"use strict";
const VERSION = "__VERSION__";
const CACHE = "talkback-triage-pilot-v" + VERSION;
const PREFIX = "talkback-triage-pilot-";
const SCOPE = new URL("./", self.location).href;
const FILES = ["./", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png",
  "atkinson-hyperlegible-latin-400-normal.woff2", "atkinson-hyperlegible-latin-700-normal.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(new URL(f, SCOPE).href, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  // Every page in scope is the one app page: store and serve it under the scope URL, ignoring ?query and #hash.
  const page = req.mode === "navigate";
  const key = page ? SCOPE : url.origin + url.pathname;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok && res.type === "basic" && (!page || url.pathname === new URL(SCOPE).pathname || url.pathname.endsWith("/index.html"))) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then((c) => c.put(key, copy)));
    }
    return res;
  }, () => caches.open(CACHE).then((c) => c.match(key)).then((hit) => hit || Response.error())));
});
