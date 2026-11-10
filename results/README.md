# Results

| Path | What it is |
|---|---|
| `runs/rmw9sfcx9/` | **Current run.** Clean removal rules (method 2), 9 Nov 2026, Claude via the Claude app, "quick" setting, 53 reports, 187 answers. |
| `runs/rmw9qhkle/` | **Superseded run.** First removal rules, which sometimes also cut device, version, a recording reference or a workaround. Kept for the record; don't cite it. |
| `pilot_run2_clean_quick.csv` | The current run as a spreadsheet, one row per report and version. |
| `pilot_run2_summary.txt` | Text summary of the current run. |
| `pilot_run1_superseded_*` | The superseded run's spreadsheet and summary. |
| `pair_review.md` | Every line each shortened copy removes (`node scripts/pair-review.js`). |

Each run folder has:
- `meta.json`: when the run was made, its settings and which versions it covered.
- `items/<report id>.json`: `{"answers": {"full": {...}, "no_steps": {...}, ...}}`, one answer per version.

Each answer has:
- `impact`: `blocks_task`, `slows_task`, `minor` or `cannot_tell`
- `evidence`: `actionable` or `needs_more_evidence`
- `missing`, `reason` and `ask`

The superseded run's answers also contain a `confidence` field, which is no longer used.

Recompute any run's numbers with `node scripts/analyze.js <run id>`. Add `--csv` to export it as a spreadsheet.
