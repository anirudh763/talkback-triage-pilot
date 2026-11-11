/* TalkBack Triage Pilot — core logic (no DOM). Runs in the page and in Node for tests. */
(function (root) {
  "use strict";

  // ---------- parsing the raw issue dump ----------
  function parseRaw(txt, source) {
    const out = [];
    const blocks = txt.split(/^@@@ /m).filter((b) => b.trim());
    for (const b of blocks) {
      const nl = b.indexOf("\n");
      const head = b.slice(0, nl);
      const rest = b.slice(nl + 1);
      const nl2 = rest.indexOf("\n");
      const title = (nl2 < 0 ? rest : rest.slice(0, nl2)).trim();
      const body = nl2 < 0 ? "" : rest.slice(nl2 + 1).trim();
      const f = head.split("|").map((x) => x.trim());
      const [app, num] = f[0].split("#");
      const [state, reason] = f[1].split("/");
      out.push({
        id: app + "-" + num,
        app,
        number: Number(num),
        title,
        body,
        state,
        stateReason: reason || null,
        created: f[2] || null,
        closed: f[3] || null,
        labels: f[4] ? f[4].split(";").filter(Boolean) : [],
        comments: Number(f[5] || 0),
        author: f[6] || "",
        source: source || null,
      });
    }
    return out;
  }

  // ---------- the checker ----------
  const TB = /\b(talk ?back|screen ?readers?|screenreaders?)\b/i;
  const GESTURE = /\b(swip\w*|double[- ]?tap\w*|focus\w*|explore by touch|read from top|four fingers|hover\w*|announc\w*|read aloud|reads?\b|spoken|selection)\b/i;
  const STEP_LINE = /^\s*(\d+[.)]|[-*•])\s+\S/;
  const STEPS_HEAD = /^\s*(#{1,6}\s*|\*\*)?\s*steps(\s+to\s+reproduce(\s+the\s+behaviou?r)?)?\s*:?\**\s*:?\s*$/i;
  const HEAD = /^\s*(#{1,6}\s+\S|\*\*[^*]+\*\*:?\s*$)/;

  const APP_VERSION = [
    /#{1,6}\s*app version\s*\n+\s*v?\d+(\.\d+)+/i,
    /\*\*app version:?\*\*:?\s*v?\d+(\.\d+)+/i,
    /\b(WPAndroid|JPAndroid|AntennaPod)(\s*\/\s*\w+)?(\s+version)?\s+v?\d+\.\d+/i,
    /\bJPAndroid\s+pr\d+-[0-9a-f]{6,}/i,
    /\bdevelop\s*\(([0-9a-f]{7,})\)/i,
    /\bversion\s+alpha-\d+/i,
  ];
  const OS_DEVICE = [
    /\bandroid\s*(version)?\s*[:#*\s]*\d{1,2}(\.\d)?\b/i,
    /#{1,6}\s*android version\s*\n+\s*(android\s*)?\d+/i,
    /\b(SDK|API)\s*\d{2}\b/,
    /\b(pixel|galaxy|samsung|nokia|oneplus|xiaomi|moto\s?x|nexus|huawei|xperia|lg g\d|emulator|simulator)\b/i,
  ];
  const HEARD = /(announc\w*|says?|said|reads?( as)?|read aloud|spoken|prompts?|report[s]? (this|it) as)[^.\n]{0,40}["“'][^"”'\n]{1,80}["”']/i;
  const EXPECTED = /\bexpected\b/i;
  const ACTUAL = /\b(actual|current)\s+(behaviou?r|result)|\*\*result:?\*\*|\bactual behavior\b/i;
  const MEDIA = /\[(image|video)\]|\brecording\b|screen ?shot|screencast|\.mp4\b/i;

  function lines(body) { return body.split("\n"); }

  // Find the line range of each "steps" block: an explicit Steps heading and the
  // list / sentences under it, or an unheaded run of 2+ numbered lines.
  function stepBlocks(body) {
    const L = lines(body);
    const blocks = [];
    for (let i = 0; i < L.length; i++) {
      if (STEPS_HEAD.test(L[i])) {
        let j = i + 1;
        while (j < L.length && !(HEAD.test(L[j]) && !STEP_LINE.test(L[j]))) {
          if (/^\s*(\*\*result|#{1,6}\s|<sup>|\[image\]|\[video\]|\*\*expected|\*\*current)/i.test(L[j])) break;
          j++;
        }
        blocks.push([i, j]);
        i = j - 1;
      }
    }
    // unheaded numbered lists (2+ consecutive numbered lines)
    for (let i = 0; i < L.length; i++) {
      if (blocks.some(([a, b]) => i >= a && i < b)) continue;
      if (/^\s*\d+[.)]\s+\S/.test(L[i])) {
        let j = i;
        while (j < L.length && (/^\s*\d+[.)]\s+\S/.test(L[j]) || (!L[j].trim() && /^\s*\d+[.)]\s/.test(L[j + 1] || "")))) j++;
        const count = L.slice(i, j).filter((x) => /^\s*\d+[.)]\s/.test(x)).length;
        if (count >= 2) {
          // keep it only if it reads like steps, not like expected/actual lists
          const prev = L.slice(Math.max(0, i - 3), i).join(" ");
          if (!/(expected|actual|current) behaviou?r/i.test(prev)) blocks.push([i, j]);
        }
        i = j;
      }
    }
    return blocks.sort((a, b) => a[0] - b[0]);
  }

  function check(report) {
    const title = report.title || "";
    const body = report.body || "";
    const all = title + "\n" + body;
    const L = lines(body);
    const blocks = stepBlocks(body);
    const tbMentionEarly = TB.test(all);
    const stepText = blocks.map(([a, b]) => L.slice(a, b).join("\n")).join("\n");
    const stepCount = stepText.split("\n").filter((x) => STEP_LINE.test(x)).length;
    const hasSteps = blocks.length > 0 && (stepCount >= 2 || stepText.replace(STEPS_HEAD, "").trim().length > 40);
    // TalkBack steps: the steps say how the screen reader is used (turned on, gestures, what is heard)
    const tbSteps = hasSteps && tbMentionEarly && (TB.test(stepText) || GESTURE.test(stepText.replace(STEPS_HEAD, "")) || blocks.some(([a]) => TB.test(L.slice(Math.max(0, a - 2), a + 1).join(" "))));
    const appVersion = APP_VERSION.some((r) => r.test(body));
    const osDevice = OS_DEVICE.some((r) => r.test(body));
    const heard = HEARD.test(all);
    const expectedActual = EXPECTED.test(body) && ACTUAL.test(body);
    const media = MEDIA.test(body);
    const tbMention = TB.test(all);
    const isFeature = report.labels && report.labels.some((l) => /enhancement|feature request|task/i.test(l)) || /\baudit\b/i.test(title);
    const fields = { tbSteps, appVersion, osDevice, expectedActual, heard, media };
    const score = Object.values(fields).filter(Boolean).length;
    return { ...fields, tbMention, hasSteps, stepCount, isFeature, score, kind: isFeature ? "feature" : "bug" };
  }

  // ---------- the ablation: remove TalkBack steps and/or version info ----------
  // A line inside a steps block is KEPT when it also carries another detail the checker
  // measures (what TalkBack said, a recording, version/device, expected/actual, a result,
  // a workaround or note). Removing steps must not remove those.
  function carriesOther(line) {
    return HEARD.test(line) || /\[(image|video)\]|\brecording\b|screen ?shot/i.test(line) ||
      APP_VERSION.some((r) => r.test(line)) || OS_DEVICE.some((r) => r.test(line)) ||
      /\bexpected\b|\b(actual|current)\s+(behaviou?r|result)/i.test(line) || /^\s*\*\*result/i.test(line) ||
      /\bworkaround\b|^\s*(>\s*)?(\[!note\]|note:)/i.test(line) || /^\s*>/.test(line);
  }
  // A step that reports what happened (observed behaviour) rather than an action to take.
  // Observed behaviour is a different part of a bug report from the steps, so it stays.
  const OBSERVED = /(⚠️|❌|\bnotice\b|\bnote that\b|\binstead\b|\bcrash\w*|\bskips?\b|\bcan'?t\b|\bcannot\b|\bunable\b|\bdoes(n'?t| not)\b|\bnothing\b|\bis (skipped|not)\b|\bgives the\b|\bis initially\b)/i;
  function keepInSteps(line) { return carriesOther(line) || OBSERVED.test(line); }
  // The exact lines the "steps removed" copy drops: the steps heading, the list items under it
  // (or a steps paragraph when there is no list), and an unheaded numbered list of steps.
  // It stops at the first ordinary line after the list, so notes, recordings, workarounds
  // and "Tested on" lines after the steps stay.
  function stepDrops(body) {
    const L = lines(body);
    const drops = new Set();
    for (const [a, b] of stepBlocks(body)) {
      const headed = STEPS_HEAD.test(L[a]);
      if (headed) drops.add(a);
      let started = false, para = false;
      for (let j = headed ? a + 1 : a; j < b; j++) {
        const line = L[j];
        if (!line.trim()) { if (para) break; continue; }
        if (STEP_LINE.test(line)) {
          started = true;
          if (!keepInSteps(line)) drops.add(j);
          continue;
        }
        if (started) {
          if (/^\s{2,}\S/.test(line)) { if (!keepInSteps(line)) drops.add(j); continue; }
          break; // first ordinary line after the list
        }
        // before any list item: a setup line ("Talkback ON. An account with lists.") or a steps paragraph
        if (headed && line.length < 400 && !/^\s*#{1,6}\s/.test(line)) {
          const hasListBelow = L.slice(j + 1, b).some((x) => STEP_LINE.test(x));
          if (!hasListBelow) para = true;
          if (!keepInSteps(line)) drops.add(j);
          continue;
        }
        break;
      }
    }
    return drops;
  }

  // Did removing a condition's target detail leave every other measured detail intact?
  const FIELD_KEYS = ["tbSteps", "appVersion", "osDevice", "expectedActual", "heard", "media"];
  const TARGETS = { no_steps: ["tbSteps"], no_version: ["appVersion", "osDevice"], neither: ["tbSteps", "appVersion", "osDevice"] };
  function pairCheck(report, cond) {
    const before = check(report);
    const after = check({ title: report.title, body: variant(report, cond), labels: report.labels });
    const targets = TARGETS[cond] || [];
    const others = FIELD_KEYS.filter((k) => !targets.includes(k));
    const lostOther = others.filter((k) => before[k] && !after[k]);
    const gainedOther = others.filter((k) => !before[k] && after[k]);
    const targetLeft = targets.filter((k) => before[k] && after[k]);
    return { clean: !lostOther.length && !gainedOther.length && !targetLeft.length, lostOther, gainedOther, targetLeft };
  }

  const ENV_HEADS = /^\s*#{1,6}\s*(app version|android version|device model|where did you get the app from)\s*$/i;
  const ENV_LINE = /^\s*(#{1,6}\s*)?(<sup>)?\s*tested (on|with)\b|^\s*\*\*(app version|android version|device model|app source):?\*\*|^\s*(-\s*)?(lg g\d|pixel \d)\b.*\b(api|sdk)\s*\d+|^\s*pixel \d+, sdk \d+\s*$|^\s*\*\s*tested on\b/i;
  const INLINE_ENV = [
    /,?\s*(the audit was done using\s+)?develop\s*\([0-9a-f]{7,}\),?\s*(google\s+)?pixel \d( xl)?,?\s*android \d+\.?/gi,
    /\s*\(\s*from f-droid\s*\)/gi,
  ];

  function strip(report, opts) {
    const removeSteps = !!(opts && opts.steps);
    const removeVersion = !!(opts && opts.version);
    let L = lines(report.body || "");
    const L0 = L.slice();
    const drop = new Array(L.length).fill(false);

    if (removeSteps) {
      for (const k of stepDrops(report.body || "")) drop[k] = true;
    }
    if (removeVersion) {
      for (let i = 0; i < L.length; i++) {
        if (ENV_HEADS.test(L[i])) {
          drop[i] = true;
          let j = i + 1;
          while (j < L.length && !/^\s*#{1,6}\s/.test(L[j])) { drop[j] = true; j++; }
          i = j - 1;
        } else if (ENV_LINE.test(L[i])) {
          drop[i] = true;
          // a "Tested on [device], Android [version]" template line followed by the real values
          if (/\[device\]/i.test(L[i])) {
            let j = i + 1;
            while (j < L.length && L[j].trim() && !/^\s*#{1,6}\s/.test(L[j]) && !/^note:/i.test(L[j].trim())) { drop[j] = true; j++; }
          }
        }
      }
    }
    if (removeVersion) {
      L = L.map((line, i) => {
        if (drop[i]) return line;
        let t = line;
        for (const r of INLINE_ENV) t = t.replace(r, "");
        // version tokens mentioned in passing ("After updating to AntennaPod version 3.1.0")
        t = t.replace(/\s*\b(after updating to\s+)?antennapod version \d+(\.\d+)+/gi, "");
        if (line.trim() && !t.trim()) drop[i] = true;
        return t;
      });
    }
    // a heading whose whole section was removed goes too; headings that never had
    // anything under them (e.g. "##### Tested on Pixel 7, Android 14") are content and stay
    const isHead = (x) => /^\s*#{1,6}\s/.test(x);
    for (let i = 0; i < L.length; i++) {
      if (drop[i] || !isHead(L[i])) continue;
      let j = i + 1, had = 0, left = 0;
      while (j < L.length && !isHead(L0[j])) { if (L0[j].trim()) { had++; if (!drop[j]) left++; } j++; }
      if (had && !left) drop[i] = true;
    }
    let kept = L.filter((_, i) => !drop[i]);
    return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  // what each condition removes
  const CONDITIONS = {
    full: { label: "As filed", short: "Full", steps: false, version: false },
    no_steps: { label: "TalkBack steps removed", short: "No steps", steps: true, version: false },
    no_version: { label: "App version & device removed", short: "No version", steps: false, version: true },
    neither: { label: "Both removed", short: "Neither", steps: true, version: true },
  };

  // which reports a condition applies to: only those that actually have the removed field
  function applies(report, cond, chk) {
    const c = chk || check(report);
    if (cond === "full") return true;
    let has = false;
    if (cond === "no_steps") has = c.tbSteps;
    else if (cond === "no_version") has = c.appVersion || c.osDevice;
    else if (cond === "neither") has = c.tbSteps || c.appVersion || c.osDevice;
    // and only when removing it really changes the text
    return has && variant(report, cond).trim() !== (report.body || "").trim();
  }

  function variant(report, cond) {
    const c = CONDITIONS[cond];
    if (!c || (!c.steps && !c.version)) return report.body || "";
    // steps are only removed when they are TalkBack steps; other steps are left alone
    return strip(report, { steps: c.steps && check(report).tbSteps, version: c.version });
  }

  // ---------- the AI prompt ----------
  const MAX_BODY = 6000; // characters of the report body sent to the AI
  const MISSING_KEYS = ["talkback_steps", "app_version", "android_version_or_device", "expected_vs_actual", "what_talkback_said", "recording_or_screenshot"];

  function prompt(title, body, appName) {
    return [
      "You are triaging an accessibility bug report filed against an Android app" + (appName ? " (" + appName + ")" : "") + ".",
      "The people affected are blind or low-vision users who navigate with the TalkBack screen reader or other assistive settings.",
      "In the report, [image] and [video] mark attachments you cannot see.",
      "",
      "Answer two questions about the report exactly as written. Do not assume details the report does not give.",
      "",
      "1. task_impact: how badly does this issue affect an assistive-technology user trying to finish a task in the app?",
      '   "blocks_task" = the user cannot complete a task at all (cannot reach or activate a control, focus is trapped or lost, the app crashes, information needed to continue is never announced).',
      '   "slows_task" = the user can finish, but with extra effort or confusion (unclear, wrong or duplicate announcements, extra swipes, unlabeled but reachable controls).',
      '   "minor" = cosmetic or little effect on finishing tasks.',
      '   "cannot_tell" = the report does not give enough to judge.',
      "2. evidence: could a developer start reproducing this issue with the information here?",
      '   "actionable" = yes, a developer could start reproducing it from this report.',
      '   "needs_more_evidence" = a developer would have to ask the reporter for more before starting.',
      "",
      "Also list which of these the report is missing: " + MISSING_KEYS.join(", ") + ".",
      "",
      'Reply with only one JSON object, no other text, in this shape: {"task_impact": "blocks_task", "evidence": "actionable", "missing": ["app_version"], "reason": "one sentence", "ask_reporter": "one question to ask the reporter, or an empty string"}',
      "",
      "Report title: " + title,
      "Report body:",
      "<<<",
      (body || "(empty)").slice(0, MAX_BODY),
      ">>>",
    ].join("\n");
  }

  function parseAnswer(text) {
    let v = null;
    const tryParse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
    v = tryParse(text.trim());
    if (!v) { const m = text.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) v = tryParse(m[1]); }
    if (!v) { const a = text.indexOf("{"), b = text.lastIndexOf("}"); if (a >= 0 && b > a) v = tryParse(text.slice(a, b + 1)); }
    if (!v || typeof v !== "object") return null;
    const impacts = ["blocks_task", "slows_task", "minor", "cannot_tell"];
    const ev = ["actionable", "needs_more_evidence"];
    // an answer that is not on the list is an unreadable reply; never guess a category for it
    if (!impacts.includes(v.task_impact) || !ev.includes(v.evidence)) return null;
    return {
      impact: v.task_impact,
      evidence: v.evidence,
      missing: Array.isArray(v.missing) ? v.missing.filter((x) => MISSING_KEYS.includes(x)) : [],
      reason: String(v.reason || "").slice(0, 400),
      ask: String(v.ask_reporter || "").slice(0, 300),
    };
  }

  // ---------- statistics ----------
  function cohenKappa(pairs) {
    // pairs: [[a,b], ...] with categorical values
    const n = pairs.length;
    if (!n) return null;
    const cats = [...new Set(pairs.flat())];
    let agree = 0;
    const pa = {}, pb = {};
    for (const [a, b] of pairs) { if (a === b) agree++; pa[a] = (pa[a] || 0) + 1; pb[b] = (pb[b] || 0) + 1; }
    const po = agree / n;
    let pe = 0;
    for (const c of cats) pe += ((pa[c] || 0) / n) * ((pb[c] || 0) / n);
    const k = pe === 1 ? 1 : (po - pe) / (1 - pe);
    return { n, po, k };
  }

  // exact two-sided McNemar (binomial) test on discordant pairs
  function mcnemar(b, c) {
    const n = b + c;
    if (!n) return 1;
    const k = Math.min(b, c);
    let p = 0;
    let coef = 1;
    for (let i = 0; i <= n; i++) {
      if (i > 0) coef = (coef * (n - i + 1)) / i;
      if (i <= k) p += coef;
    }
    p = (2 * p) / Math.pow(2, n);
    return Math.min(1, p);
  }

  function summarize(reports, results, conds) {
    // results: {reportId: {cond: answer}}
    const rows = [];
    for (const c of conds) {
      const xs = reports.map((r) => results[r.id] && results[r.id][c]).filter(Boolean);
      const n = xs.length;
      const pct = (f) => (n ? xs.filter(f).length / n : null);
      rows.push({
        cond: c,
        n,
        needsEvidence: pct((x) => x.evidence === "needs_more_evidence"),
        blocks: pct((x) => x.impact === "blocks_task"),
        cannotTell: pct((x) => x.impact === "cannot_tell"),
        flagsSteps: pct((x) => x.missing.includes("talkback_steps")),
        flagsVersion: pct((x) => x.missing.includes("app_version")),
      });
    }
    // paired comparisons against "full"
    const paired = {};
    for (const c of conds) {
      if (c === "full") continue;
      let both = 0, evFlip = 0, impFlip = 0, b = 0, cc = 0;
      for (const r of reports) {
        const a = results[r.id] && results[r.id].full;
        const x = results[r.id] && results[r.id][c];
        if (!a || !x) continue;
        both++;
        if (a.evidence !== x.evidence) evFlip++;
        if (a.impact !== x.impact) impFlip++;
        const aNeed = a.evidence === "needs_more_evidence", xNeed = x.evidence === "needs_more_evidence";
        if (!aNeed && xNeed) b++;
        if (aNeed && !xNeed) cc++;
      }
      paired[c] = { n: both, evidenceFlip: both ? evFlip / both : null, impactFlip: both ? impFlip / both : null, toNeeds: b, toActionable: cc, p: mcnemar(b, cc) };
    }
    return { rows, paired };
  }

  const api = { parseRaw, check, strip, variant, applies, pairCheck, stepDrops, FIELD_KEYS, CONDITIONS, MISSING_KEYS, MAX_BODY, prompt, parseAnswer, cohenKappa, mcnemar, summarize, stepBlocks };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TBT = api;
})(typeof window !== "undefined" ? window : globalThis);
