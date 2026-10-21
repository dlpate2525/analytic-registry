import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import type {ReactNode} from 'react';
import {initialData, buckets} from '../src/data/mock';
import {RegistryContext, type RegistryContextValue} from '../src/data/RegistryContext';
import {foundationCoverage, coverageThemes, evidenceReadinessDescriptions} from '../src/data/foundationCoverage';
import {platforms} from '../src/data/config';
import {prototypeRelease} from '../src/data/release';
import {Coverage} from '../src/pages/DetectionCoverage';
import {Dashboard} from '../src/pages/Dashboard';

let checks=0;
function check(run:()=>void){run();checks++;}
const data=structuredClone(initialData);
const before=JSON.stringify(data);
function render(element:ReactNode,route='/',source=data,admin=true){
  const value:RegistryContextValue={data:source,viewMode:admin?'Administrator':'Business',update:()=>false,dispatchRequest:()=>null,notice:'',storageIssue:'',setNotice:()=>{},setViewMode:()=>{},reset:()=>{},exportData:()=>{}};
  return renderToStaticMarkup(<RegistryContext.Provider value={value}><MemoryRouter initialEntries={[route]}>{element}</MemoryRouter></RegistryContext.Provider>);
}
check(()=>assert.deepEqual(foundationCoverage.map(row=>row.bucket).sort(),[...buckets].sort()));
check(()=>assert.equal(new Set(foundationCoverage.map(row=>row.bucket)).size,11));
check(()=>assert.ok(coverageThemes.length<6));
for(const row of foundationCoverage){
  check(()=>assert.deepEqual(Object.keys(row.platforms).sort(),[...platforms].sort()));
  check(()=>assert.ok(row.purpose&&row.inputs&&row.gap&&row.action));
  for(const platform of platforms)check(()=>assert.ok(Object.keys(evidenceReadinessDescriptions).includes(row.platforms[platform].state)&&row.platforms[platform].note.length>0));
}
for(const bucket of ['Stale','Low Adoption','Performance Risk','Concentration Risk']){
  check(()=>assert.ok(platforms.every(platform=>foundationCoverage.find(row=>row.bucket===bucket)!.platforms[platform].state==='Not collected')));
}
check(()=>assert.equal(foundationCoverage.find(row=>row.bucket==='Credential Exposure')!.platforms.Alteryx.state,'Not collected'));
const page=render(<Coverage/>,'/coverage?platform=Alteryx');
check(()=>assert.ok(page.includes(prototypeRelease.series+' · EVIDENCE &amp; RISK')));
check(()=>assert.ok(!page.includes('V1.1 evidence')&&!page.includes('Historical illustrative capability matrix')));
check(()=>assert.ok(page.includes('Automated platform detection is not connected')));
check(()=>assert.ok(page.includes('Input schema '+prototypeRelease.collectionContract)));
const links=[...page.matchAll(/href="([^"]+)"[^>]*>Open findings in this bucket/g)].map(match=>new URL(match[1].replaceAll('&amp;','&'),'https://example.test'));
check(()=>assert.equal(links.length,11));
for(const link of links)check(()=>assert.equal(link.searchParams.get('platform'),'Alteryx'));
check(()=>assert.ok(links.every(link=>link.searchParams.get('view')==='findings'&&link.searchParams.get('status')==='open'&&buckets.includes(link.searchParams.get('bucket')!))));
const business=render(<Coverage/>,'/coverage',data,false);
check(()=>assert.ok(!business.includes('Open findings in this bucket')));
const dashboard=render(<Dashboard/>);
check(()=>assert.ok(!dashboard.includes('rules available')));
check(()=>assert.ok(dashboard.includes('not findings or compliance scores')));
const historical=structuredClone(data);
historical.coverage.forEach(row=>{row.capability='Available';row.note='Synthetic legacy mutation';});
historical.rules=[];
check(()=>assert.equal(render(<Coverage/>,'/coverage?platform=Alteryx',historical),page));
check(()=>assert.equal(render(<Dashboard/>,'/',historical),dashboard));
check(()=>assert.equal(JSON.stringify(data),before));
console.log(checks+' coverage semantics, source-boundary, navigation, and preservation checks passed.');
