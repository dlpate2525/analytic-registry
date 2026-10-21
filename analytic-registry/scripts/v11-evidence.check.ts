import assert from 'node:assert/strict';
import { evidenceState, type EvidenceCoverage } from '../src/utils/evidence';
import { compareDelivery, type Delivery, type RegistryEvidence } from '../src/domain/foundation';
import { initialData } from '../src/data/mock';
import { comparison } from '../src/utils/logic';

let checks=0;
function check(run:()=>void){run();checks++;}
const observedAt='2026-10-01T12:00:00Z';
const asOf='2026-10-09';
const current=evidenceState(observedAt,'Complete',31,asOf);
check(()=>assert.equal(current.inventoryAvailable,true));
check(()=>assert.equal(current.controlReady,true));
check(()=>assert.equal(current.ready,current.controlReady));
check(()=>assert.equal(current.observedAt,observedAt));
check(()=>assert.equal(current.ageDays,8));
const partial=evidenceState(observedAt,'Partial',31,asOf);
check(()=>assert.equal(partial.inventoryAvailable,true));
check(()=>assert.equal(partial.controlReady,false));
check(()=>assert.equal(partial.ready,false));
check(()=>assert.equal(partial.status,'Partial'));
check(()=>assert.equal(partial.coverage,'Partial'));
check(()=>assert.equal(evidenceState(observedAt,false,31,asOf).coverage,'Partial'));
check(()=>assert.equal(evidenceState(observedAt,true,31,asOf).coverage,'Complete'));
for(const coverage of ['Unknown','NotCollected','Failed'] satisfies EvidenceCoverage[]){
  const state=evidenceState(observedAt,coverage,31,asOf);
  check(()=>assert.equal(state.inventoryAvailable,false));
  check(()=>assert.equal(state.controlReady,false));
  check(()=>assert.equal(state.observedAt,observedAt));
}
const stale=evidenceState(observedAt,'Complete',7,asOf);
check(()=>assert.equal(stale.inventoryAvailable,true));
check(()=>assert.equal(stale.controlReady,false));
check(()=>assert.equal(stale.status,'Stale'));
check(()=>assert.equal(evidenceState(observedAt,'Partial',7,asOf).inventoryAvailable,true));
check(()=>assert.equal(evidenceState(observedAt,'Complete',undefined,asOf).controlReady,false));
check(()=>assert.equal(evidenceState(observedAt,'Complete',undefined,asOf).inventoryAvailable,true));
for(const date of ['', '2026-02-30', '2026-10-10']){
  check(()=>assert.equal(evidenceState(date,'Partial',31,asOf).inventoryAvailable,false));
  check(()=>assert.equal(evidenceState(date,'Complete',31,asOf).controlReady,false));
}

// Partial inventory must never authorize access comparisons that require a full roster.
const registry=structuredClone(initialData);
const workspace=registry.workspaces[0];
workspace.observationComplete=false;
const rows=comparison(workspace,registry);
check(()=>assert.ok(rows.every(row=>!['Aligned','Discrepancy','Flagged for Review'].includes(row.status))));

// Failed, missing, partial, and late refreshes cannot rewrite retained evidence dates.
const prior:RegistryEvidence={platform:'Tableau',instance:'sample-server',scope:'sample-site',kind:'Asset',nativeType:'Workbook',nativeId:'workbook-1',name:'Recorded workbook',attributes:{revision:'1'},registryId:'registry-1',lastSeenAt:observedAt};
const before=JSON.stringify(prior);
const delivery:Delivery={runKey:'synthetic-next-delivery',observedAt:'2026-10-09T12:00:00Z',platform:prior.platform,instance:prior.instance,scope:prior.scope,kind:prior.kind,coverage:'Partial',expectedRows:0,scopeVerified:true};
for(const coverage of ['Partial','NotCollected','Failed'] as const){
  const result=compareDelivery([prior],[],{...delivery,coverage,expectedRows:coverage==='Partial'?0:null});
  check(()=>assert.equal(result[0].state,'Not verified'));
  check(()=>assert.equal(JSON.stringify(prior),before));
  check(()=>assert.equal(evidenceState(prior.lastSeenAt,'Complete',31,asOf).ageDays,8));
}
const late=compareDelivery([prior],[{...prior,name:'Older name'}],{...delivery,observedAt:'2026-09-01T12:00:00Z',expectedRows:1});
check(()=>assert.equal(late[0].state,'Older observation'));
check(()=>assert.equal(JSON.stringify(prior),before));
check(()=>assert.throws(()=>compareDelivery([prior],[prior,prior],{...delivery,expectedRows:2})));
check(()=>assert.equal(JSON.stringify(prior),before));
console.log(`V1.1 evidence: ${checks} inventory, control-readiness, and retained-date checks passed.`);
