import { todayLocal, addDays } from './dates';
export { todayLocal, addDays } from './dates';
import type { RegistryData } from '../types';
import { isAttestationComplete } from './approvals';
import { requestStage } from './workflow';

export const businessPersonId='P1';
export const adminPersonId='P3';
export function workspaceIdsFor(d:RegistryData,personId:string) {return new Set(d.workspaces.filter(w=>w.ownerId===personId||d.champions.some(c=>c.configurationVersionId===w.requestedVersionId&&c.personId===personId)).map(w=>w.id));}
export const ownsRequest=(r:RegistryData['requests'][number],personId:string)=>r.createdById===personId||r.ownerId===personId;
export function annualStatus(a:RegistryData['attestations'][number],asOf=todayLocal()) {
  if(a.status==='Overdue'&&a.dueDate>=asOf)return Object.keys(a.answers).length?'In progress':'Not started';
  if(a.status==='Not started'&&a.dueDate<asOf)return 'Overdue';
  return a.status;
}
export function openRequestsFor(d:RegistryData,personId:string) {return d.requests.filter(r=>ownsRequest(r,personId)&&!['Complete','Superseded'].includes(requestStage(r,d)));}
export function dueAttestations(d:RegistryData,personId:string,asOf=todayLocal()) {const mine=workspaceIdsFor(d,personId);return d.attestations.filter(a=>mine.has(a.workspaceId)&&!isAttestationComplete(a.status)&&a.dueDate<=addDays(asOf,30)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));}
export const workThemes=['Workspace setup','Access & accountability','Evidence & risk','Annual assurance'] as const;
export type WorkItem={id:string;kind:'Request'|'Review'|'Annual review';theme:string;title:string;href:string;workspaceId:string|null;assetId:string|null;status:string;nextAction:string;assignee:string;assignedToMe:boolean;awaitingApproval:boolean;waitingOnBusiness:boolean;due:string;severity:string;platform:string;lob:string};
export function workItems(d:RegistryData,personId:string,admin:boolean):WorkItem[] {
  const mine=workspaceIdsFor(d,personId);const items:WorkItem[]=[];
  for(const r of d.requests){const stage=requestStage(r,d);if(['Complete','Superseded'].includes(stage)||(!admin&&!ownsRequest(r,personId)))continue;
    const business=stage==='Draft'||stage==='Changes required';items.push({id:r.id,kind:'Request',theme:'Workspace setup',title:r.businessName||'Untitled workspace request',href:'/requests/'+r.id,workspaceId:r.workspaceId||null,assetId:null,status:stage,nextAction:business?'Complete request':stage==='Awaiting approval'?'Review required approvals':stage==='Ready for implementation'?'Record external implementation':'Verify implementation',assignee:business?(d.people.find(p=>p.id===(r.createdById||r.ownerId))?.name||'Requester'):'Platform approval / operations',assignedToMe:business?ownsRequest(r,personId):admin,awaitingApproval:stage==='Awaiting approval',waitingOnBusiness:business,due:r.targetDate||'',severity:'Normal',platform:r.platform,lob:d.people.find(p=>p.id===r.ownerId)?.lob||''});}
  for(const r of d.reviews){if(['Closed','Resolved'].includes(r.status)||(!admin&&(!r.workspaceId||!mine.has(r.workspaceId))))continue;
    const waiting=['Pending Business Response','Action Required'].includes(r.status);
    items.push({id:r.id,kind:'Review',theme:/Champion|Owner|Access|Group/.test(r.type)?'Access & accountability':r.type.includes('Attestation')?'Annual assurance':'Evidence & risk',title:r.type,href:'/reviews/'+r.id,workspaceId:r.workspaceId,assetId:r.assetId,status:r.status,nextAction:waiting?'Provide business response':r.status==='Pending Admin Action'?'Record administrator action':r.status==='Unable to Verify'?'Collect missing evidence':'Investigate and resolve',assignee:d.people.find(p=>p.id===(waiting?r.ownerId:r.reviewerId))?.name||'Unassigned',assignedToMe:waiting?r.ownerId===personId:r.reviewerId===personId,awaitingApproval:false,waitingOnBusiness:waiting,due:r.dueDate,severity:r.severity,platform:r.platform,lob:r.lob});}
  for(const a of d.attestations){if(isAttestationComplete(a.status)||(!admin&&!mine.has(a.workspaceId)))continue;const w=d.workspaces.find(w=>w.id===a.workspaceId);const pending=a.status==='Pending Owner Approval';const champion=d.champions.some(c=>c.configurationVersionId===w?.requestedVersionId&&c.personId===personId);
    items.push({id:a.id,kind:'Annual review',theme:'Annual assurance',title:(w?.businessName||a.workspaceId)+' annual review',href:'/attestations/'+a.id,workspaceId:a.workspaceId,assetId:null,status:annualStatus(a),nextAction:pending?'Approve Champion response':'Confirm workspace details',assignee:pending?'Application / Platform Owner':'Workspace Champions',assignedToMe:!pending&&champion,awaitingApproval:pending,waitingOnBusiness:!pending,due:a.dueDate,severity:'Normal',platform:w?.platform||'',lob:w?.lob||''});}
  return items.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||(['Critical','High','Medium','Low','Normal'].indexOf(a.severity)-['Critical','High','Medium','Low','Normal'].indexOf(b.severity))||a.id.localeCompare(b.id));
}
export function filterWorkItems(items:WorkItem[],view:string,asOf=todayLocal()) {return items.filter(i=>view==='assigned'?i.assignedToMe:view==='approval'?i.awaitingApproval:view==='business'?i.waitingOnBusiness:view==='overdue'?!!i.due&&i.due<asOf:true);}
