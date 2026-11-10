# Labelling protocol

Human labels are what the AI's answers are checked against. This protocol keeps them independent and comparable. It is a starting point: after the starter set, write down any rule you add and the date you added it.

## The two questions

Answer both for each report, reading only the text shown.

**1. Could a developer start reproducing this issue with the information here?**

| Answer | Use it when |
|---|---|
| **Enough to start reproducing** | A developer could open the app and try to make the problem happen: they can tell where in the app it is, what to do there, and what goes wrong for a TalkBack (or other assistive technology) user. |
| **Needs more evidence** | A developer would have to ask the reporter something before they could even start: where it happens, what was done, or what the problem actually is. |

Starting guidance, to refine together:
- A missing app version on its own doesn't make a report "needs more evidence" if the steps and the problem are clear. Note it, don't fail it.
- A clear description of where and what can be enough without numbered steps.
- Judge the text as shown. `[image]` and `[video]` mean an attachment existed, but you can't see it.

**2. Could a TalkBack user finish the task?**

| Answer | Use it when |
|---|---|
| **Blocks the task** | They can't finish at all: a control can't be reached or activated, focus is trapped or lost, the app crashes, or information needed to continue is never announced. |
| **Slows the task** | They can finish, but with extra effort or confusion: wrong, unclear or duplicate announcements, extra swipes, or unlabeled but reachable controls. |
| **Minor** | Cosmetic, or little effect on finishing tasks. |
| **Can't tell** | The report doesn't say enough to judge. |

## Procedure

1. **Work alone.** Don't discuss reports with the other rater until you have both finished the set. Don't look at the AI's answers; the Label reports tab never shows them.
2. **Starter set first.** In the app's Label reports tab, choose *Starter set (5 reports)* and *Version: As filed*.
3. **Export your labels.** Press **Copy my labels**, paste the text into `labels/<your-name>.json`, and send it: a pull request, a GitHub issue, or directly to the other rater.
4. **Compare.** Run `node scripts/agreement.js labels/a.json labels/b.json`, or use *Add as a rater* in the app. Discuss every disagreement it lists.
5. **Fix the rubric.** Add any rule you agreed on to the guidance above, with the date.
6. **Label more.** Do the same for *Pilot reports (53)*.
7. **Shortened versions.** To check the AI on shortened copies, people must label those copies too. A copy is never scored with labels of the full report. The rater should not have read the full report recently: ideally a third person, or the same person after the full set is done and some time has passed. The app warns you when you have already labelled the full version.

Agreement on fewer than about 20 shared labels moves a lot with each disagreement. Use it to find unclear rules, not as a result.

## Label file format

The app's **Copy my labels** produces:

```json
{
  "tool": "talkback-triage-pilot",
  "version": 2,
  "labels": {
    "WP-20770": { "impact": "blocks_task", "evidence": "actionable", "at": "2026-11-10T16:00:00Z" },
    "WP-20770~no_steps": { "impact": "blocks_task", "evidence": "needs_more_evidence", "at": "..." }
  }
}
```

- **Keys:** a report id (`WP-` for WordPress for Android, `AP-` for AntennaPod, then the GitHub issue number) is the report as filed. `~no_steps`, `~no_version` or `~neither` marks a shortened copy.
- **`impact`:** `blocks_task`, `slows_task`, `minor` or `cannot_tell`.
- **`evidence`:** `actionable` (enough to start reproducing) or `needs_more_evidence`.

## Where labels are saved in the app

- Labels are always saved in your browser, so they survive a reload.
- When the app runs inside Claude and you're allowed to save to the page, they're also saved with the page.
- On GitHub Pages or a local file they stay in your browser only. Use **Copy my labels** to send them.
