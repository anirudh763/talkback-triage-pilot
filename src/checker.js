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
    /^[ \t]*(?:#{1,6}[ \t]*)?\**app version:?\**:?[ \t]*(?:\n[ \t]*)*(v?\d+(?:\.\d+)*[a-z]?(?:-[\w.]+)?(?:[ \t]*\([0-9a-f]{6,}\))?)(?![\w.])/im,
    /\b((?:WPAndroid|JPAndroid|AntennaPod)(?:\s*\/\s*\w+)?(?:\s+version)?\s+v?\d+\.\d+[\w.-]*(?:\s*\(beta\))?)/i,
    /\b(JPAndroid\s+pr\d+-[0-9a-f]{6,})/i,
    /\b(develop\s*\([0-9a-f]{7,}\))/i,
    /\b(version\s+alpha-\d+)/i,
    /\b((?:app\s+)?(?:version|ver\.?|build)\s*[:#]?\s*v?\d+(?:\.\d+)+[\w.-]*)/i,
    /(?<![\w.])(v\d+\.\d+(?:\.\d+)?)\b/,
  ];
  // A version right after one of these names belongs to the screen reader, the OS or another component, not the app.
  const NOT_APP = /(?:talk ?back|screen ?reader|voice ?assistant|accessibility suite|braille ?back|android(?: os)?|\bos|sdk|api(?: level)?|one ?ui|miui|hyperos|color ?os|oxygen ?os|ios|chrome|webview|kernel|firmware|gradle|kotlin|java)\W*(?:app\W*)?$/i;
  const ANDROID = [
    /^[ \t]*#{1,6}[ \t]*android version[ \t]*\n+[ \t]*((?:android[ \t]*)?\d+(?:\.\d)?)/im,
    /\b(android\s*(?:os\s*)?(?:version\s*)?[:#*\s]*\d{1,2}(?:\.\d)?)\b/i,
    /\b((?:SDK|API)\s*(?:level\s*)?\d{2})\b/,
  ];
  const DEVICE = [
    /^[ \t]*#{1,6}[ \t]*device(?: model)?[ \t]*\n+[ \t]*(?![#*])([^\n]{2,40})/im,
    /^[ \t]*\**device(?: model)?:?\**:?[ \t]*(?![#\s])([^\n]{2,40})/im,
    /\b((?:google\s+)?pixel(?:\s+\d+\w*)?(?:\s+(?:pro|xl|a|fold))?|samsung(?:\s+galaxy)?(?:\s+[\w+]+){0,2}|galaxy\s+[\w+]+(?:\s+\d+)?|nokia\s*[\d.]+|(?:oneplus|xiaomi|redmi|poco|motorola|huawei|oppo|realme|xperia)\b(?:\s+(?:nord\s+|mi\s+|mate\s+)?[a-z]*\d+\w*(?:\s+(?:pro|plus|ultra|lite|max|mini|compact|5g)\b)*)?|moto\s?[a-z]\d*\b|nexus(?:\s*\d+\w*)?|honor\s+\d+\w*|lg g\d|emulator|simulator)\b/i,
  ];
  const EXPECTED = /\bexpected\b|\bshould\b/i;
  const ACTUAL = /\b(actual|current)\s+(behaviou?r|result)|\*\*result:?\*\*|\bactual\b|\binstead\b|\bobserved\b/i;
  const HEARD = /(announc\w*|says?|said|reads?( as)?|read aloud|spoken|prompts?)[^.\n]{0,40}["“'`][^"”'`\n]{1,80}["”'`]/i;
  // Where in the app, tried in order. Each pattern stays on one line ([ \t], not \s) so it can't join two lines.
  // "named" patterns accept a single quoted or Title Case name after a navigation verb: Go to "My Site",
  // Open Reader, the "Home" tab, from WordPress Media Picker. The others need at least two words.
  const SCREEN = "(?:screen|page|tab|dialog|menu|view|form|list|section|panel|sheet|bar|player|editor|picker|settings)";
  const NAV = "(?:go(?:es)? to|navigate to|switch to|open|opens|opening|select|tap(?: on)?|in|on|from|to)";
  const WHERE = [
    { re: /^[ \t]*(?:#{1,6}[ \t]*)?\**(?:screen|element|where|location)\**[ \t]*:\**[ \t]*([^\n]{2,60})/im },
    { re: new RegExp("\\b(" + NAV + "[ \\t]+the[ \\t]+(?:[`\"“']?[\\w-]+[`\"”']?[ \\t]+){1,3}" + SCREEN + ")\\b", "i") },
    { re: new RegExp("\\b" + NAV + "[ \\t]+(?:the[ \\t]+)?([\"“][^\"”\\n]{1,30}[\"”](?:[ \\t]+" + SCREEN + ")?)", "i"), named: true },
    { re: /\b((?:the[ \t]+)?[`"“'][^`"”'\n]{1,30}[`"”'][ \t]+(?:screen|page|tab|dialog|menu|view|button|field|link|checkbox|switch|toggle|slider|icon|item))\b/i },
    { re: /\b([\w-]+[ \t]*>[ \t]*[\w-]+(?:[ \t]*>[ \t]*[\w-]+)*)/ },
    { re: new RegExp("\\b(?:[Gg]o(?:es)? to|[Nn]avigate to|[Ss]witch to|[Oo]pen|[Ss]elect|[Tt]ap(?: on)?|in|on|from)[ \\t]+(?:the[ \\t]+)?((?:[A-Z][\\w-]*)(?:[ \\t]+[A-Z][\\w-]*){0,3}(?:[ \\t]+" + SCREEN + ")?)\\b"), named: true },
    { re: /\b((?:the[ \t]+)?[\w-]+(?:[ \t]+[\w-]+)?[ \t]+(?:button|field|checkbox|toggle|slider|icon|menu item|text box|dropdown))\b/i },
    { re: /\b((?:[A-Z][\w-]+[ \t]+){1,3}(?:screen|page|tab|dialog|menu|view|form|list|section))\b/ },
  ];
  // names that aren't screens: the screen reader, the platform, the app itself
  const NOT_A_SCREEN = /^(?:talk ?back|android(?: \w+)?|google|play store|github|wordpress(?: app)?|jetpack(?: app)?|antennapod|f-droid|accessibility scanner|the|a|an|i|it|this|when|then|settings app)$/i;
  const SR_SETTINGS = /\b(talk ?back\s*(?:version\s*v?\d+(?:\.\d+)*|v?\d+\.\d+(?:\.\d+)*)|speech rate|verbosity|explore by touch|reading controls|granularity|punctuation|braille\w*|android accessibility suite(?:\s*\d+(?:\.\d+)*)?|font size|large (?:system )?font|display size|magnification|high contrast|bold text|colou?r correction|select to speak|switch access|voice access)\b/i;

  const first = (list, text, ok) => {
    for (const r of list) { const m = text.match(r); if (!m) continue; const v = (m[1] || m[0]).trim(); if (!ok || ok(v)) return v; }
    return null;
  };
  // like first(), but tries every match of each pattern, not only the first one
  const firstOfAll = (list, text, ok) => {
    for (const r of list) for (const m of text.matchAll(new RegExp(r.source, r.flags.replace("g", "") + "g"))) { const v = (m[1] || m[0]).trim(); if (!ok || ok(v)) return v; }
    return null;
  };
  // "to the Post list screen" -> "Post list screen"; a bare "the button" names nothing and is rejected
  const LEAD = /^(?:(?:on|in|to|from|of|and|or|that|this|which|is|it|its|s|read|reads|open|opens|opening|go(?:es)? to|navigate to|switch to|select|tap(?: on)?|the|a|an)\s+)+/i;
  const cleanWhere = (v) => v.replace(LEAD, "").trim();
  const namesSomething = (v) => /\S+\s+\S+|>/.test(cleanWhere(v));
  const SR_CASE = (v) => (/^talk ?back$/i.test(v) ? "TalkBack" : v);
  const androidLabel = (v) => (v && /^\d/.test(v) ? "Android " + v : v);
  const clip = (s, n) => { s = String(s).replace(/\s+/g, " ").replace(/[*`#]+/g, "").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

  // The report as the rules should read it: HTML comments, unfilled template placeholders ("_No response_",
  // "[device]") and headings with nothing under them are removed, so an empty template section counts as absent.
  const PLACEHOLDER = /_No response_|\[(?:device(?: model)?|version|app version|android version|os version|model|steps?|screen|screenshot|link)\]/gi;
  const IS_HEAD = (x) => /^\s*#{1,6}\s/.test(x) || /^\s*\*\*[^*\n]+\*\*\s*:?\s*$/.test(x);
  function clean(body) {
    let out = body.replace(/<!--[\s\S]*?(?:-->|$)/g, "").replace(PLACEHOLDER, "");
    // repeat until nothing changes: removing an empty subsection can leave its parent heading empty
    for (let prev = null; prev !== out; ) { prev = out; out = dropEmptyHeadings(out); }
    return out.replace(/\n{3,}/g, "\n\n");
  }
  function dropEmptyHeadings(text) {
    const L = text.split("\n");
    const keep = [];
    for (let i = 0; i < L.length; i++) {
      // a heading that carries its own values ("##### Tested on Pixel 7, Android 14") is content, not a label
      const label = L[i].replace(/[#*:]/g, " ").trim();
      if (IS_HEAD(L[i]) && !/\d/.test(label) && label.split(/\s+/).length <= 6) {
        let j = i + 1;
        while (j < L.length && !IS_HEAD(L[j]) && !/[\w\d]/.test(L[j])) j++;
        // a heading followed only by blank or punctuation-only lines, then another heading or the end, is empty
        if (j >= L.length || IS_HEAD(L[j])) { const lvl = (L[i].match(/^\s*(#{1,6})\s/) || [])[1]; const nextLvl = j < L.length ? (L[j].match(/^\s*(#{1,6})\s/) || [])[1] : null;
          // keep a parent heading whose subsections follow ("## Environment" then "### Device")
          if (!(lvl && nextLvl && nextLvl.length > lvl.length)) continue; }
      }
      keep.push(L[i]);
    }
    return keep.join("\n");
  }
  // a device value names something: not only punctuation, a field label ("model:") or a placeholder ("[device]")
  const isDeviceValue = (v) => {
    const t = v.replace(/[*_#:`\[\]()<>.,;-]+/g, " ").trim();
    return /[a-z0-9]/i.test(t) && !/^(?:device|model|device model|phone|name|no response|n\/?a|none|unknown)$/i.test(t);
  };
  function appVersion(body) {
    for (const r of APP_VERSION) {
      for (const m of body.matchAll(new RegExp(r.source, r.flags.replace("g", "") + "g"))) {
        const v = (m[1] || m[0]).trim();
        // what comes before the version on the same line: "TalkBack app version: 15.1" belongs to TalkBack,
        // even with the words "app version"; "WordPress app version 24.3" and "App version: 42" are the app's
        const start = m.index + m[0].indexOf(m[1] || m[0]);
        const before = body.slice(Math.max(0, body.lastIndexOf("\n", start - 1) + 1, start - 40), start);
        if (!NOT_APP.test(before.replace(/\b(?:app\s+)?(?:version|ver\.?|build)\s*[:#]?\s*$/i, "").trim())) return v;
      }
    }
    return null;
  }

  // The lines of a report under a heading that matches `re`, up to the next heading.
  // Headings: "### Expected behavior", "**Expected behavior:**", "**Expected:** text on the same line".
  function section(body, re) {
    const L = body.split("\n");
    for (let i = 0; i < L.length; i++) {
      const line = L[i];
      const md = line.match(/^\s*#{1,6}\s*([^\n]+?)\s*:?\s*$/);
      const bold = line.match(/^\s*\*\*\s*([^*\n]+?)\s*:?\s*\*\*\s*:?\s*(.*)$/);
      const head = md ? [line, md[1], ""] : bold;
      if (!head || head[1].length > 40 || !re.test(head[1].trim())) continue;
      const out = [];
      if (head[2] && head[2].trim()) out.push(head[2].trim());
      for (let j = i + 1; j < L.length && !HEADING.test(L[j]) && !/^\s*\*\*[^*\n]+\*\*/.test(L[j]); j++) out.push(L[j]);
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
    const raw = String((report && report.body) || "");
    const body = clean(raw);   // what the rules read; the rewrite keeps the original text verbatim
    const all = title + "\n" + body;
    const c = T.check({ title, body, labels: [] });
    const items = [];
    const add = (key, name, status, found, hint, required) => items.push({ key, name, status, found: found ? clip(found, 70) : null, hint, required: required !== false });

    // 1. steps to reproduce
    const stepLines = steps(body);
    add("steps", "Steps to reproduce", c.hasSteps ? "present" : "notfound",
      c.hasSteps ? (stepLines.length ? stepLines.length + " steps" : "steps paragraph") : null,
      "Number each action from opening the app to seeing the problem.");

    // 2. screen-reader steps (TalkBack or another screen reader)
    const srName = SR_CASE((all.match(SR_NAME) || all.match(SR) || [null])[0]);
    const otherAT = all.match(OTHER_AT);
    if (!SR.test(all) && otherAT) {
      add("srSteps", "TalkBack or screen-reader steps", "na", "Report is about " + otherAT[0].toLowerCase() + ", not a screen reader", "Not needed for this report.", false);
    } else if (!SR.test(all)) {
      add("srSteps", "TalkBack or screen-reader steps", "optional", null,
        "No screen reader is mentioned. If you used one, say when it was turned on and which gestures you used.", false);
    } else {
      const stepText = stepLines.join("\n");
      const ok = c.tbSteps || (c.hasSteps && SR.test(stepText));
      add("srSteps", "TalkBack or screen-reader steps", ok ? "present" : c.hasSteps && srName ? "partial" : "notfound",
        ok ? srName || "screen reader" : c.hasSteps && srName ? srName + " is mentioned, but not in the steps" : null,
        "Say when the screen reader is turned on and which gestures you used: swipe right, double-tap, explore by touch.");
    }

    // 3. app version
    const appV = appVersion(body);
    add("appVersion", "App version", c.appVersion || appV ? "present" : "notfound", appV || (c.appVersion ? "found" : null),
      "Copy it from the app's Settings > About screen, e.g. 24.8 or 3.1.0.");

    // 4. device and Android version
    const andV = androidLabel(first(ANDROID, body)), dev = firstOfAll(DEVICE, body, isDeviceValue);
    add("device", "Device and Android version", andV && dev ? "present" : andV || dev ? "partial" : "notfound",
      [dev, andV].filter(Boolean).join(", ") || null,
      andV && !dev ? "Add the device model, e.g. Pixel 8." : dev && !andV ? "Add the Android version, e.g. Android 14." : "Add the device model and Android version, e.g. Pixel 8, Android 14.");

    // 5. expected vs actual
    const exp = c.expectedActual || EXPECTED.test(body), act = c.expectedActual || ACTUAL.test(body) || HEARD.test(body);
    add("expectedActual", "Expected vs. actual behavior", exp && act ? "present" : exp || act ? "partial" : "notfound",
      exp && act ? "both described" : exp ? "expected only" : act ? "actual only" : null,
      exp && !act ? "Say what happens now, and quote what TalkBack announces." : act && !exp ? "Say what should happen instead." : "Say what should happen and what happens now, quoting what TalkBack announces.");

    // 6. the screen or element
    let whereRaw = null;
    for (const w of WHERE) {
      whereRaw = firstOfAll([w.re], all, w.named ? (v) => !NOT_A_SCREEN.test(v.replace(/["“”]/g, "").trim()) : namesSomething);
      if (whereRaw) break;
    }
    const where = whereRaw ? cleanWhere(whereRaw) : null;
    add("where", "Screen or element", where ? "present" : "notfound", where,
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
      notFound: req.filter((x) => x.status === "notfound").length,
    };
    const tpl = template({ title, body, raw, items, stepLines, appV, andV, dev, srName });
    return { items, summary, template: tpl, text: tpl.map((s) => s.text).join("") };
  }

  // The rewritten report as a list of segments: {text} for content, {text, mark: "add"|"optional"} for placeholders.
  // Placeholders say what to add ("[ADD: ...]"), not that the detail is certainly absent: the rules can miss things.
  function template(x) {
    const by = Object.fromEntries(x.items.map((i) => [i.key, i]));
    const segs = [];
    const t = (s) => segs.push({ text: s });
    const miss = (s) => segs.push({ text: "[ADD: " + s + "]", mark: "add" });
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
    if (by.srSteps.status === "optional") { t("\n- Screen reader: "); opt("screen reader and its version, if you used one"); }
    else if (by.srSteps.status !== "na") { t("\n- Screen reader: "); val(x.srName, "screen reader and its version, e.g. TalkBack 15.0"); }
    t("\n- Screen-reader settings: ");
    if (by.srSettings.status === "present") t(by.srSettings.found); else opt("speech rate, verbosity, font or display size");

    t("\n\n### Where in the app\n");
    val(by.where.found, "screen and element, e.g. Post list > three-dot menu button");

    t("\n\n### Steps to reproduce\n");
    let n = 1;
    if (by.srSteps.status === "partial" || (by.srSteps.status === "notfound" && x.stepLines.length)) { t(n++ + ". "); miss("when TalkBack is turned on"); t("\n"); }
    if (x.stepLines.length) for (const s of x.stepLines) t(n++ + ". " + s + "\n");
    else if (by.steps.status === "present") t("(see the steps in the original report below)\n");
    else {
      if (by.srSteps.status === "notfound") { t("1. "); miss("turn on TalkBack"); t("\n"); n++; }
      t(n + ". "); miss("each action, including the gesture used (swipe right, double-tap)"); t("\n");
    }
    if (by.srSteps.status === "partial" || (by.srSteps.status === "notfound" && x.stepLines.length)) { t(n + ". "); miss("which gesture you used at each step"); t("\n"); }

    const expText = section(x.body, /^expected\b/i), actText = section(x.body, /^(actual|current|observed)\b/i);
    const ea = by.expectedActual.status;
    t("\n### Expected behavior\n");
    if (expText) t(expText); else if (ea === "present" || ea === "partial" && by.expectedActual.found === "expected only") t("(described in the original report below)"); else miss("what should happen, including what TalkBack should announce");
    t("\n\n### Actual behavior\n");
    if (actText) t(actText); else if (ea === "present" || ea === "partial" && by.expectedActual.found === "actual only") t("(described in the original report below)"); else miss("what happens instead, quoting what TalkBack announces");

    if (x.raw.trim()) t("\n\n### Original report\n" + x.raw.trim().split("\n").map((l) => (l.trim() ? "> " + l : ">")).join("\n") + "\n");
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
