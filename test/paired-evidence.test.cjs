'use strict';
const assert = require('node:assert/strict');
const {T,loadReports,listRuns,loadRun} = require('../scripts/lib.js');
const reports=loadReports();
assert.equal(reports.length,75);
const observations=[];
for(const id of listRuns()) {
  const run=loadRun(id); if(run.meta.method!==2)continue;
  const scope=run.meta.scope==='all'?reports:reports.filter(r=>T.check(r).tbSteps||T.check(r).appVersion||T.check(r).osDevice);
  const valid={};
  for(const [rid,conditions] of Object.entries(run.items)) {
    valid[rid]={};
    for(const [condition,a] of Object.entries(conditions)) {
      if(a.error)continue;
      assert(T.parseAnswer(JSON.stringify({...a,task_impact:a.impact})),id+' has an invalid archived answer');
      valid[rid][condition]=a;
    }
  }
  const result=T.summarize(scope,valid,run.meta.conds);
  for(const [condition,pair] of Object.entries(result.paired)) {
    const pairs=scope.map(r=>[valid[r.id]?.full,valid[r.id]?.[condition]]).filter(([a,b])=>a&&b);
    const toNeeds=pairs.filter(([a,b])=>a.evidence==='actionable'&&b.evidence==='needs_more_evidence').length;
    const toActionable=pairs.filter(([a,b])=>a.evidence==='needs_more_evidence'&&b.evidence==='actionable').length;
    assert.equal(pair.n,pairs.length); assert.equal(pair.toNeeds,toNeeds); assert.equal(pair.toActionable,toActionable);
    // Independent binomial tail, rather than copying the engine's coefficient recurrence.
    const n=toNeeds+toActionable, k=Math.min(toNeeds,toActionable);
    const factorial=x=>{let v=1;for(let i=2;i<=x;i++)v*=i;return v;};
    let tail=0;for(let i=0;i<=k;i++)tail+=factorial(n)/(factorial(i)*factorial(n-i));
    const expected=n?Math.min(1,2*tail/2**n):1;
    assert(Math.abs(pair.p-expected)<1e-12);
    observations.push({run:id,condition,paired:pair.n,toNeeds,toActionable,p:pair.p});
  }
}
assert(observations.length>0);
console.log(JSON.stringify({sources:reports.length,comparisons:observations.length,observations}));
