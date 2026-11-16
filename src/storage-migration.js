'use strict';
// Copy only known app-owned keys; retain conflicts and originals for explicit recovery.
(() => {
 const exact = {"tbt-theme": "cuereport_theme_v1", "tbt-report": "cuereport_guest_report_v1", "cuer-report-draft-v1": "cuereport_guest_draft_v1", "tbt-labels-v2": "cuereport_guest_labels_v2", "tbt-probe": "cuereport_probe_v1", "cuereport:preview-paused": "cuereport_preview_paused_v1"}, prefixes = {"cuereport:v1:": "cuereport_profiles_v1:", "cuereport:install-dismissed:v1": "cuereport_install_dismissed_v1", "cuereport:quick:v1:": "cuereport_quick_v1:"};
 for (const name of ['localStorage','sessionStorage']) {
  try {
   const store=window[name], keys=Array.from({length:store.length},(_,i)=>store.key(i));
   for (const key of keys) {
    const prefix=Object.keys(prefixes).find(p=>key.startsWith(p));
    let target=exact[key] || (prefix ? prefixes[prefix]+key.slice(prefix.length) : null);
    if(!target) continue;
    target=target.replace(':tbt-labels-v2',':cuereport_guest_labels_v2');
    const value=store.getItem(key);
    if(value===null || value.length>262144) continue;
    const existing=store.getItem(target);
    if(existing===null) store.setItem(target,value);
    if(store.getItem(target)===value) store.removeItem(key);
    else document.documentElement.dataset.storageRecovery='conflict';
   }
  } catch { document.documentElement.dataset.storageRecovery='unavailable'; }
 }
})();
