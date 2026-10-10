import { workspaceEvidence } from './evidence';
import { requestGroupPurposes } from './requestGroups';
import { isDateOnly, todayLocal } from './dates';
import type { RegistryData, Workspace, WorkspaceRequest } from '../types';
import { rulesConfig, platforms, customReasons } from '../data/mock';

export interface RequestIssue { step:number; message:string }
export function requestIssues(r:WorkspaceRequest,d:RegistryData):RequestIssue[] {
  const issues:RequestIssue[]=[];const add=(step:number,message:string)=>issues.push({step,message});
  if(!['Create New','Register Existing','Update Existing'].includes(r.type))add(0,'Select a supported workspace request type.');
  if(!platforms.includes(r.platform))add(0,'Select a platform.');
  const w=d.workspaces.find(w=>w.id===r.workspaceId);
  if(r.type!=='Create New'&&!w)add(0,'Select an existing workspace.');
  if(w&&r.type!=='Create New'&&w.platform!==r.platform)add(0,'The selected workspace must match the platform.');
  if(r.type==='Register Existing'&&w?.registryStatus!=='Discovered')add(0,'Select a discovered workspace.');
  if(r.type==='Update Existing'&&w?.registryStatus!=='Registered')add(0,'Select a registered workspace.');
  if(r.type==='Create New'&&r.workspaceId)add(0,'A new workspace request cannot reuse an existing workspace selection.');
  if(!r.purpose.trim())add(0,'Business purpose is required.');
  const owner=d.people.find(p=>p.id===r.ownerId);
  if(!owner)add(0,'Business owner must resolve to a known person.');
  else if(owner.status==='Inactive')add(0,'An inactive owner cannot be assigned.');
  if(r.championIds.length<1)add(0,'Select at least one Champion.');
  if(r.championIds.length>10)add(0,'Select no more than 10 Champions.');
  if(new Set(r.championIds).size!==r.championIds.length)add(0,'Champion selections must be unique.');
  if(r.championIds.some(id=>d.people.find(p=>p.id===id)?.status==='Inactive'))add(0,'Inactive Champions cannot be assigned.');
  if(r.championIds.some(id=>!d.people.some(p=>p.id===id)))add(0,'Champion identity was not found.');
  if(r.businessName.length>rulesConfig.businessNameMax||r.purpose.length>500)add(0,'A configurable business name or purpose text limit was exceeded.');
  if(!['Yes','No'].includes(r.containsPii||''))add(1,'Answer whether the workspace will contain PII.');
  if(!['Yes','No'].includes(r.containsEuct||''))add(1,'Answer whether the workspace will contain an EUCT.');
  if(!['Tier 1','Tier 2','Tier 3'].includes(r.highestDmpTier||''))add(1,'Select the single highest applicable DMP tier.');
  if(!['Standard','Custom'].includes(r.configuration))add(2,'Select Standard or Custom.');
  if(!/^[A-Z][A-Z0-9_]{2,99}$/.test(r.technicalName))add(2,'Requested technical name: use 3–100 uppercase letters, numbers, or underscores; start with a letter.');
  if(r.configuration==='Custom'&&!customReasons.includes(r.customReason))add(2,'A Custom reason is required.');
  if(r.configuration==='Custom'&&r.customReason==='Other'&&!r.customExplanation.trim())add(2,'Explain the Other Custom reason.');
  if(r.customExplanation.length>1000)add(2,'The configurable Custom explanation text limit was exceeded.');
  const purposes=r.groups.map(g=>g.purpose.trim().toLowerCase());
  if(purposes.some(p=>!p)||new Set(purposes).size!==purposes.length)add(3,'Group purposes must be present and unique.');
  if(r.configuration==='Standard'&&(r.groups.length!==4||requestGroupPurposes.some(p=>!r.groups.some(g=>g.purpose===p))))add(3,'Standard requires exactly Champion, RW, R, and Data Sources specifications. Remove additional groups or use Custom.');
  const keys=r.groups.map(g=>g.mode==='Existing'?g.groupId:g.requestedName.trim().toUpperCase()).filter(Boolean);
  if(new Set(keys).size!==keys.length)add(3,'Use distinct groups for different access purposes.');
  const resolvedNames=r.groups.map(g=>(g.mode==='Existing'?d.groups.find(x=>x.groupId===g.groupId)?.requestedName:g.requestedName)?.trim().toUpperCase()).filter(Boolean);
  if(new Set(resolvedNames).size!==resolvedNames.length)add(3,'Requested group names collide across access purposes. Resolve the intended directory groups before submission.');
  for(const g of r.groups){
    if(g.mode==='Existing'&&(!g.groupId||!d.groups.some(x=>x.groupId===g.groupId)))add(3,`${g.purpose}: select a validated existing group.`);
    if(g.mode==='New'&&!new RegExp(rulesConfig.groupNamePattern).test(g.requestedName))add(3,`${g.purpose}: use 3–80 uppercase letters, numbers, or underscores; start with a letter.`);
    if(!['Existing','New'].includes(g.mode))add(3,`${g.purpose}: select Existing or New.`);
  }
  if(r.targetDate&&!isDateOnly(r.targetDate))add(4,'Enter a valid target date or leave it blank.');
  return issues;
}
export const validateRequest=(r:WorkspaceRequest,d:RegistryData)=>requestIssues(r,d).map(i=>i.message);

export function comparison(w:Workspace,d:RegistryData){
  const req=d.groups.filter(g=>g.configurationVersionId===w.requestedVersionId);
  const imp=d.groups.filter(g=>g.configurationVersionId===w.implementedVersionId);
  const obs=d.principals.filter(p=>p.workspaceId===w.id);
  const rc=d.champions.filter(c=>c.configurationVersionId===w.requestedVersionId);
  const ic=d.champions.filter(c=>c.configurationVersionId===w.implementedVersionId);
  const oc=obs.find(p=>p.purpose==='Champion');const direct=obs.filter(p=>p.kind==='User');
  const evidence=workspaceEvidence(w,d);
  const rosterPending=rc.map(c=>c.personId).sort().join()!==ic.map(c=>c.personId).sort().join();
  return [{field:'Champion roster',requested:`${rc.length} selected people`,implemented:`${ic.length} people`,observed:oc?`${oc.memberIds.length} group members`:'Missing evidence',status:!oc?'Unable to Verify':ic.map(c=>c.personId).sort().join()!==oc.memberIds.slice().sort().join()?'Flagged for Review':rosterPending?'Pending Implementation':'Aligned',note:(rosterPending?'A requested roster change is pending. Observed membership is independently compared with the implemented roster. ':'')+'Accountability role. Membership does not grant native privileges.'},...req.map(g=>{
    const i=imp.find(x=>x.purpose===g.purpose);const o=obs.find(x=>x.purpose===g.purpose);
    const pending=!i||g.mode==='New'||i.groupId!==g.groupId;
    return {field:g.purpose+' group',requested:g.requestedName,implemented:i?.requestedName||'Not implemented',observed:o?.name||'Missing evidence',status:i&&o&&o.principalId!==i.groupId?'Discrepancy':pending?'Pending Implementation':!o?'Unable to Verify':'Aligned',note:pending?'Requested change remains a pending prerequisite.':'Compared using stable principal IDs.'};
  }),{field:'Direct user access',requested:w.configuration==='Custom'?'Custom approval scope':'None',implemented:w.configuration==='Custom'?'Explicit baseline required':'None',observed:direct.length?direct.map(p=>p.name).join(', '):'None',status:w.configuration==='Custom'?'Unable to Verify':direct.length?'Discrepancy':'Aligned',note:w.configuration==='Custom'?'Review approved Custom entitlements. This prototype has no structured direct-user allowance baseline.':'Compare observed privileges to the approved access model.'}].map(row=>['Aligned','Discrepancy','Flagged for Review'].includes(row.status)&&!evidence.ready?{...row,status:'Unable to Verify',note:evidence.reason+' '+row.note}:row);
}
export const isOpen=(f:{status:string})=>!['Resolved','Closed'].includes(f.status);
export const ageDays=(date:string,asOf=todayLocal())=>isDateOnly(date.slice(0,10))&&isDateOnly(asOf)?Math.max(0,Math.floor((Date.parse(asOf)-Date.parse(date.slice(0,10)))/86400000)):0;
