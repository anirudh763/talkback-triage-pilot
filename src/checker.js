/* Report completeness checker — heuristic pattern rules, not AI. No DOM, no network.
   Runs in the page (after core.js) and in Node for tests.
   It reuses the study's checklist (core.js check()) and adds rules for reports from any Android app.
   It does not change anything the study measures. */
(function (root) {
  "use strict";
  const T = typeof module !== "undefined" && module.exports ? require("./core.js") : root.TBT;

  const SR = /\b(talk ?back|screen ?readers?|screenreaders?|voice ?assistant|jieshuo|commentary screen reader)\b/i;
  const SR_NAME = /\b(talk ?back|voice ?assistant|jieshuo|commentary)\b/i;
  // assistive settings other than a screen reader; a report about one of these doesn't need screen-reader steps
  const OTHER_AT = /\b(font size|large (system )?font|display size|magnification|zoom in when holding|color contrast|colou?r correction|high contrast|bold text|touch target|switch access|voice access|d-?pad|keyboard navigation|headset button|mono (audio|output)|balance)\b/i;
  const STEP_LINE = /^\s*(\d+[.)]|[-*•])\s+\S/;
  const HEADING = /^\s*(#{1,6}\s+\S|\*\*[^*]+\*\*:?\s*$)/;

  const APP_VERSION = [
    /^\s*(?:#{1,6}\s*)?\**app version:?\**:?[ \t]*\n*[ \t]*(v?\d+(?:\.\d+)+(?:[ \t]*\([0-9a-f]{6,}\))?)/im,
    /\b((?:WPAndroid|JPAndroid|AntennaPod)(?:\s*\/\s*\w+)?(?:\s+version)?\s+v?\d+\.\d+[\w.-]*(?:\s*\(beta\))?)/i,
    /\b(JPAndroid\s+pr\d+-[0-9a-f]{6,})/i,
    /\b(develop\s*\([0-9a-f]{7,}\))/i,
    /\b(version\s+alpha-\d+)/i,
    /(?<!android\s)(?<!android os\s)\b((?:app\s+)?(?:version|ver\.?|build)\s*[:#]?\s*v?\d+(?:\.\d+)+[\w.-]*)/i,
    /(?<![\w.])(v\d+\.\d+(?:\.\d+)?)\b/,
  ];
  const ANDROID = [
    /^\s*#{1,6}\s*android version\s*\n+\s*((?:android\s*)?\d+(?:\.\d)?)/im,
    /\b(android\s*(?:os\s*)?(?:version\s*)?[:#*\s]*\d{1,2}(?:\.\d)?)\b/i,
    /\b((?:SDK|API)\s*(?:level\s*)?\d{2})\b/,
  ];
  const DEVICE = [
    /^\s*#{1,6}\s*device(?: model)?\s*\n+\s*([^\n]{2,40})/im,
    /^\s*\**device(?: model)?:?\**:?[ \t]*([^\n]{2,40})/im,
    /\b((?:google\s+)?pixel(?:\s+\d+\w*)?(?:\s+(?:pro|xl|a|fold))?|samsung(?:\s+galaxy)?(?:\s+[\w+]+){0,2}|galaxy\s+[\w+]+(?:\s+\d+)?|nokia\s*[\d.]+|(?:oneplus|xiaomi|redmi|poco|motorola|huawei|oppo|realme|xperia)\b(?:\s+\w*\d\w*)?|moto\s?[a-z]\d*\b|nexus(?:\s*\d+)?|honor\s+\d+\w*|lg g\d|emulator|simulator)\b/i,
  ];
  const EXPECTED = /\bexpected\b|\bshould\b/i;
  const ACTUAL = /\b(actual|current)\s+(behaviou?r|result)|\*\*result:?\*\*|\bactual\b|\binstead\b|\bobserved\b/i;
  const HEARD = /(announc\w*|says?|said|reads?( as)?|read aloud|spoken|prompts?)[^.\n]{0,40}["“'`][^"”'`\n]{1,80}["”'`]/i;
  const WHERE = [
    /^\s*(?:#{1,6}\s*)?\**(?:screen|element|where|location)\**\s*:\**[ \t]*([^\n]{2,60})/im,
    /\b((?:on|in|to|from|open|opens|opening)\s+the\s+(?:[`"“']?[\w-]+[`"”']?\s+){1,3}(?:screen|page|tab|dialog|menu|view|form|list|section|panel|sheet|bar|player|editor|picker|settings))\b/i,
    /\b((?:the\s+)?[`"“'][^`"”'\n]{1,30}[`"”']\s+(?:screen|page|tab|dialog|menu|view|button|field|link|checkbox|switch|toggle|slider|icon|item))\b/i,
    /\b([\w-]+\s*>\s*[\w-]+(?:\s*>\s*[\w-]+)*)/,
    /\b((?:the\s+)?[\w-]+(?:\s+[\w-]+)?\s+(?:button|field|checkbox|toggle|slider|icon|menu item|text box|dropdown))\b/i,
    /\b((?:[A-Z][\w-]+\s+){1,3}(?:screen|page|tab|dialog|menu|view|form|list|section))\b/,
  ];
  const SR_SETTINGS = /\b(talk ?back\s*(?:version\s*v?\d+(?:\.\d+)*|v?\d+\.\d+(?:\.\d+)*)|speech rate|verbosity|explore by touch|reading controls|granularity|punctuation|braille\w*|android accessibility suite(?:\s*\d+(?:\.\d+)*)?|font size|large (?:system )?font|display size|magnification|high contrast|bold text|colou?r correction|select to speak|switch access|voice access)\b/i;

  const first = (list, text, ok) => {
    for (const r of list) { const m = text.match(r); if (!m) continue; const v = (m[1] || m[0]).trim(); if (!ok || ok(v)) return v; }
    return null;
  };
  // "to the Post list screen" -> "Post list screen"; a bare "the button" names nothing and is rejected
  const LEAD = /^(?:(?:on|in|to|from|of|and|or|that|this|which|is|it|its|s|read|reads|open|opens|opening|the|a|an)\s+)+/i;
  const cleanWhere = (v) => v.replace(LEAD, "").trim();
  const namesSomething = (v) => /\S+\s+\S+|>/.test(cleanWhere(v));
  const SR_CASE = (v) => (/^talk ?back$/i.test(v) ? "TalkBack" : v);
  const androidLabel = (v) => (v && /^\d/.test(v) ? "Android " + v : v);
  const clip = (s, n) => { s = String(s).replace(/\s+/g, " ").replace(/[*`#]+/g, "").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

  // The lines of a report under a heading that matches `re`, up to the next heading.
  function section(body, re) {
    const L = body.split("\n");
    for (let i = 0; i < L.length; i++) {
      const line = L[i];
      const head = line.match(/^\s*(?:#{1,6}\s*|\*\*)\s*([^*:\n]+?)\s*:?\s*\**\s*:?\s*(.*)$/);
      if (!head || !re.test(head[1]) || head[1].length > 40) continue;
      if (!/^\s*(#{1,6}|\*\*)/.test(line)) continue;
      const out = [];
      if (head[2] && head[2].trim()) out.push(head[2].trim());
      for (let j = i + 1; j < L.length && !HEADING.test(L[j]); j++) out.push(L[j]);
      const text = out.join("\n").trim();
      if (text) return text;
    }
    return null;
  }

  // The reproduction steps as plain lines, without list markers.
  function steps(body) {
    const L = body.split("\n");
    const out = [];
    for (const [a, b] of T.stepBlocks(body)) {
      for (let j = a; j < b; j++) {
        const line = L[j];
        if (STEP_LINE.test(line)) out.push(line.replace(/^\s*(\d+[.)]|[-*•])\s+/, "").trim());
      }
    }
    return out;
  }

  function analyze(report) {
    const title = String((report && report.title) || "");
    const body = String((report && report.body) || "");
    const all = title + "\n" + body;
    const c = T.check({ title, body, labels: [] });
    const items = [];
    const add = (key, name, status, found, hint, required) => items.push({ key, name, status, found: found ? clip(found, 70) : null, hint, required: required !== false });

    // 1. steps to reproduce
    const stepLines = steps(body);
    add("steps", "Steps to reproduce", c.hasSteps ? "present" : "missing",
      c.hasSteps ? (stepLines.length ? stepLines.length + " steps" : "steps paragraph") : null,
      "Number each action from opening the app to seeing the problem.");

    // 2. screen-reader steps (TalkBack or another screen reader)
    const srName = SR_CASE((all.match(SR_NAME) || all.match(SR) || [null])[0]);
    const otherAT = all.match(OTHER_AT);
    if (!SR.test(all) && otherAT) {
      add("srSteps", "TalkBack or screen-reader steps", "na", "Report is about " + otherAT[0].toLowerCase() + ", not a screen reader", "Not needed for this report.", false);
    } else {
      const stepText = stepLines.join("\n");
      const ok = c.tbSteps || (c.hasSteps && SR.test(stepText));
      add("srSteps", "TalkBack or screen-reader steps", ok ? "present" : c.hasSteps && srName ? "partial" : "missing",
        ok ? srName || "screen reader" : c.hasSteps && srName ? srName + " is mentioned, but not in the steps" : null,
        "Say when the screen reader is turned on and which gestures you used: swipe right, double-tap, explore by touch.");
    }

    // 3. app version
    const appV = first(APP_VERSION, body);
    add("appVersion", "App version", c.appVersion || appV ? "present" : "missing", appV || (c.appVersion ? "found" : null),
      "Copy it from the app's Settings > About screen, e.g. 24.8 or 3.1.0.");

    // 4. device and Android version
    const andV = androidLabel(first(ANDROID, body)), dev = first(DEVICE, body);
    add("device", "Device and Android version", andV && dev ? "present" : andV || dev ? "partial" : "missing",
      [dev, andV].filter(Boolean).join(", ") || null,
      andV && !dev ? "Add the device model, e.g. Pixel 8." : dev && !andV ? "Add the Android version, e.g. Android 14." : "Add the device model and Android version, e.g. Pixel 8, Android 14.");

    // 5. expected vs actual
    const exp = c.expectedActual || EXPECTED.test(body), act = c.expectedActual || ACTUAL.test(body) || HEARD.test(body);
    add("expectedActual", "Expected vs. actual behavior", exp && act ? "present" : exp || act ? "partial" : "missing",
      exp && act ? "both described" : exp ? "expected only" : act ? "actual only" : null,
      exp && !act ? "Say what happens now, and quote what TalkBack announces." : act && !exp ? "Say what should happen instead." : "Say what should happen and what happens now, quoting what TalkBack announces.");

    // 6. the screen or element
    const whereRaw = first(WHERE, all, namesSomething);
    const where = whereRaw ? cleanWhere(whereRaw) : null;
    add("where", "Screen or element", where ? "present" : "missing", where,
      "Name the screen and the control, e.g. Post list > three-dot menu button.");

    // 7. screen-reader settings: optional, only when relevant
    const set = all.match(SR_SETTINGS);
    add("srSettings", "Screen-reader settings (if relevant)", set ? "present" : "optional", set ? set[0] : null,
      "Add the TalkBack version and any non-default settings, such as speech rate, verbosity or font size, if they could matter.", false);

    const req = items.filter((x) => x.required);
    const summary = {
      required: req.length,
      present: req.filter((x) => x.status === "present").length,
      partial: req.filter((x) => x.status === "partial").length,
      missing: req.filter((x) => x.status === "missing").length,
    };
    const tpl = template({ title, body, items, stepLines, appV, andV, dev, srName });
    return { items, summary, template: tpl, text: tpl.map((s) => s.text).join("") };
  }

  // The rewritten report as a list of segments: {text} for content, {text, mark: "missing"|"optional"} for placeholders.
  function template(x) {
    const by = Object.fromEntries(x.items.map((i) => [i.key, i]));
    const segs = [];
    const t = (s) => segs.push({ text: s });
    const miss = (s) => segs.push({ text: "[MISSING: " + s + "]", mark: "missing" });
    const opt = (s) => segs.push({ text: "[ADD IF RELEVANT: " + s + "]", mark: "optional" });
    const val = (v, missing) => (v ? t(v) : miss(missing));

    t("### Summary\n");
    val(x.title.trim(), "one-line summary of the problem");
    t("\n\n### Environment\n- App version: ");
    val(x.appV, "app version, from Settings > About");
    t("\n- Device: ");
    val(x.dev, "device model, e.g. Pixel 8");
    t("\n- Android version: ");
    val(x.andV, "Android version, e.g. Android 14");
    if (by.srSteps.status !== "na") { t("\n- Screen reader: "); val(x.srName, "screen reader and its version, e.g. TalkBack 15.0"); }
    t("\n- Screen-reader settings: ");
    if (by.srSettings.status === "present") t(by.srSettings.found); else opt("speech rate, verbosity, font or display size");

    t("\n\n### Where in the app\n");
    val(by.where.found, "screen and element, e.g. Post list > three-dot menu button");

    t("\n\n### Steps to reproduce\n");
    let n = 1;
    if (by.srSteps.status === "partial" || (by.srSteps.status === "missing" && x.stepLines.length)) { t(n++ + ". "); miss("when TalkBack is turned on"); t("\n"); }
    if (x.stepLines.length) for (const s of x.stepLines) t(n++ + ". " + s + "\n");
    else if (by.steps.status === "present") t("(see the steps in the original report below)\n");
    else {
      if (by.srSteps.status !== "na") { t("1. "); miss("turn on TalkBack"); t("\n"); n++; }
      t(n + ". "); miss("each action, including the gesture used (swipe right, double-tap)"); t("\n");
    }
    if (by.srSteps.status === "partial" || (by.srSteps.status === "missing" && x.stepLines.length)) { t(n + ". "); miss("which gesture you used at each step"); t("\n"); }

    const expText = section(x.body, /^expected\b/i), actText = section(x.body, /^(actual|current|observed)\b/i);
    const ea = by.expectedActual.status;
    t("\n### Expected behavior\n");
    if (expText) t(expText); else if (ea === "present" || ea === "partial" && by.expectedActual.found === "expected only") t("(described in the original report below)"); else miss("what should happen, including what TalkBack should announce");
    t("\n\n### Actual behavior\n");
    if (actText) t(actText); else if (ea === "present" || ea === "partial" && by.expectedActual.found === "actual only") t("(described in the original report below)"); else miss("what happens instead, quoting what TalkBack announces");

    if (x.body.trim()) t("\n\n### Original report\n" + x.body.trim().split("\n").map((l) => (l.trim() ? "> " + l : ">")).join("\n") + "\n");
    else t("\n");
    return segs;
  }

  // Shareable link state: the report text, encoded into the URL fragment (never sent to a server).
  const MAX_LINK_CHARS = 12000;
  function encodeState(title, body) {
    const s = JSON.stringify({ t: String(title || ""), b: String(body || "") });
    if (s.length > MAX_LINK_CHARS) return null;
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 4096) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 4096));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeState(code) {
    try {
      if (typeof code !== "string" || code.length > MAX_LINK_CHARS * 2 || !/^[A-Za-z0-9_-]*$/.test(code)) return null;
      const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
      const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
      const v = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (!v || typeof v !== "object" || typeof v.t !== "string" || typeof v.b !== "string") return null;
      return { title: v.t.slice(0, 500), body: v.b.slice(0, MAX_LINK_CHARS) };
    } catch (e) { return null; }
  }

  const api = { analyze, encodeState, decodeState, MAX_LINK_CHARS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TBC = api;
})(typeof window !== "undefined" ? window : globalThis);
