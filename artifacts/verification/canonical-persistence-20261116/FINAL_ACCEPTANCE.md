# CueReport final acceptance

PASS. Source is frozen at offline build `a250ccc19b368293`. The deployed server worker build is `e8de89dd5d85c880` because image preparation inserts the public server-capability marker and regenerates the exact index digest. Docker reports healthy. All 11 source offline asset digests and the deployed annotated index digest match their manifests.

## Final behavior

Four canonical pages and root Overview retain the ivory/indigo/terracotta identity, existing hashes and public fixture links. Workbench has contextual tools and native optional disclosures; mobile report input starts at 798px at both320/375px, with scenario selector widths254/309px instead of the reproduced45.69px. Local and encrypted original copies remain intact.

Explicit owned saves retain actual versioned report/check/comparison evidence. Evaluation saves contain the actual bounded summary plus the full existing CSV export as an owned artifact with SHA-256. Saved comparisons recompute checks from the selected original. Oversized UTF-8 evidence stays unsynced with the editor retained and an export path. Reconnection never uploads silently.

Server reset clears private reports/runs/comparisons/diffs, staged files, copy fallbacks, export callbacks, Share text, decrypted backup/passphrases, cloud previews/sessions and local auth buffers. Initial capability installation, provider sign-in/retry/read→write, lower PBKDF2 restore and asynchronous UI commits are fenced. Explicit local-profile signup/restore still preserves authorized pending guest work.

## Exact commands and measured results

- `npm test`: PASS on final source. Includes existing core/checker/workflow/data/build checks,20 launch unit tests,45 local-provider checks and3 audio unit tests.
- `node test/canonical.e2e.cjs`: PASS on final deployed build;15 flow groups,20 axe states across320/375/768/1024/1440, zero page errors. Covers canonical refresh/history/focus, in-tab draft, meaningful legacy routes, private URL boundary, zero repeated unchanged live-region mutations, mobile containment, real saves/exports, matching ablation checks, evaluation CSV/hash readback, snapshot creation, UTF-8 failure retention and logout isolation.
- `node artifacts/verification/canonical-persistence-20261116/persistence-browser.mjs`: PASS on final deployed build;15 groups and12 further axe states. Actual save/outage/retry/export/snapshot, durable browser reopen, Cue-only `restart --no-deps` and `up -d --no-deps --force-recreate`, separate-guest denial, server account rotation retaining guest work, snapshot restore into a new workspace preserving the original, and logout/session revocation.
- `node artifacts/verification/canonical-persistence-20261116/verify-selector.cjs`: FAIL before fix (45.69px selector at320); PASS after combined fix at320/375/1440, keyboard disclosure/Escape checks and3 axe states. `selector-result.json` records measured editor/selector geometry.
- `npm run test:e2e`: PASS before the final narrow progressive-layout refinement. Legacy route gate reported223 checks and42 axe states. The final layout is covered by the current canonical/persistence/focused gates above.
- `node test/product-repair.e2e.cjs`:14 groups PASS; actual completeness/ablation/statistics and private-sharing/recovery/size/clipboard paths.
- `node test/direct-routes.e2e.cjs`:25 axe states, five widths, zero page errors; history, tab isolation and keyboard PASS before final layout refinement.
- `node test/private-crypto.e2e.cjs`:3 real-crypto lifecycle groups PASS: held native PBKDF2/AES-GCM encryption cannot download after server reset, held real decryption cannot stage plaintext, lower held PBKDF2 restore cannot write a new profile. Original saved work remains.
- `node test/backup-browser.cjs`: encrypted export, wrong-pass rollback, fresh-context preview, exact Unicode restore and logout/login PASS.
- `node test/cloud-ui.cjs`: owned local-HTTP fixture consent/auth/insert/conflict/CAS/tombstone/disconnect/stale-reset PASS;3 writes. No external provider call.
- `node test/pages-links.e2e.cjs`: Pages subpath and canonical local demo/comparison/edit/reload PASS.
- `node test/pwa-launch.cjs`: real service-worker offline task/export, A→B update, dirty/multiple-tab deferral, failed-update/eviction recovery and retained saved-work PASS; no unexpected console errors.
- Cue deployment only: `docker compose --env-file ../.local-state/launch.env -f ../compose.local.yml build cuereport`, followed by `docker compose --env-file ../.local-state/launch.env -f ../compose.local.yml up -d --no-deps cuereport`. Secrets are not included in this report. No other application/service or database was restarted.

## Audio evidence

`test/audio.test.cjs` instruments API/graph edge cases. The final real-browser test wraps the native AudioContext without autoplay overrides; an actual user-triggered demo produced PCM RMS `0.01172335242074106`. Muted and zero-volume measurements were0, and suspended contexts emitted no implicit resume. Demo/comparison terminal tones, explicit re-enable, duplicate/typing suppression and reload-off behavior passed. Physical listening remains unverified. The event contract is in `AUDIO.md`.

## Evidence and review

Machine summary: `final-summary.json`. Current canonical screenshots/results: `browser/`. Current owned persistence result: `cuereport-persistence.json`; its copied runner and private log are in this folder. Focused geometry: `selector-result.json` and `selector-*.png`. Raw private logs remain local and are not reproduced here. Core/checker/platform-checks/data/results have no new diff. The shared SDK JS/CSS and backend match the root-owned copies. Scoped read-only critic review found no remaining blockers in the inspected lifecycle/version/audio paths.

## Skills actually used

- `/Users/anirudhyadav/.codex/plugins/cache/ponytail/ponytail/5.3.3/skills/ponytail/SKILL.md`
- `/Users/anirudhyadav/Downloads/five-app-final-work/talkback-triage-pilot/.agents/skills/enterprise-ui-polish/SKILL.md`
- `/Users/anirudhyadav/Downloads/five-app-final-work/talkback-triage-pilot/.agents/skills/triage-ablation-qa/SKILL.md`

Skipped: physical listening and native VoiceOver are root-owned separate acceptance; automated axe/PCM is not a human accessibility study. Snapshots share the local volume and are not an independent device backup. No external paid model/service call, commit or push occurred.
