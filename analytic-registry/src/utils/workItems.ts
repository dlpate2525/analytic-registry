import { todayLocal, addDays, isDateOnly } from './dates';
export { todayLocal, addDays } from './dates';
import type { RegistryData } from '../types';
import { isAttestationComplete, approvalSatisfied, closureKey, closureRoles, requestChampionEligibility, usesChampionApproval, championBusinessPurpose, requestKey, demoRolePeople } from './approvals';
import { requestView } from '../domain/requests';
import { attestationRecipientIds, attestationVisibleTo, currentChampionIds } from './authority';

export const businessPersonId='P1';
export const adminPersonId='P3';
export function workspaceIdsFor(d:RegistryData,personId:string) {return new Set(d.workspaces.filter(w=>w.ownerId===personId||currentChampionIds(d,w).includes(personId)).map(w=>w.id));}
export const ownsRequest=(r:RegistryData['requests'][number],personId:string)=>r.createdById===personId||r.ownerId===personId;
export function annualStatus(a:RegistryData['attestations'][number],asOf=todayLocal()) {
  if(a.status==='Overdue'&&a.dueDate>=asOf)return Object.keys(a.answers).length?'In progress':'Not started';
  if(!isAttestationComplete(a.status)&&a.dueDate<asOf)return 'Overdue';
  return a.status;
}
export function championApprovalAssigned(d:RegistryData,r:RegistryData['requests'][number],personId:string){
 return usesChampionApproval(r)&&r.status==='Submitted'&&requestView(d,r.id).stage==='Awaiting approval'
  &&!approvalSatisfied(d,'Request',r.id,championBusinessPurpose,requestKey(r),['Champion'])
  &&requestChampionEligibility(d,r).eligibleIds.includes(personId);
}
export function openRequestsFor(d:RegistryData,personId:string) {return d.requests.filter(r=>(ownsRequest(r,personId)||championApprovalAssigned(d,r,personId))&&requestView(d,r.id).open);}
function assignedRequest(d:RegistryData,view:ReturnType<typeof requestView>,personId:string,admin:boolean){
 const request=view.request;
 if(!usesChampionApproval(request))return view.waitingOnBusiness?ownsRequest(request,personId):admin;
 if(view.championRoutingIssue||view.shownStage==='Business information required')return (demoRolePeople['Platform Manager']||[]).includes(personId);
 if(view.waitingOnBusiness)return ownsRequest(request,personId);
 if(view.awaitingApproval){
  const needs=view.technicalOpen?view.technicalApprovalNeeds:view.approvalNeeds;
  return needs.filter(need=>!approvalSatisfied(d,'Request',request.id,need.purpose,view.contextKey,need.roles))
   .some(need=>need.roles.some(role=>role==='Champion'?requestChampionEligibility(d,request).eligibleIds.includes(personId):(demoRolePeople[role]||[]).includes(personId)));
 }
 if(view.shownStage==='Awaiting effective date')return false;
 return (view.needsRegistryLink||['Ready for implementation','Awaiting verification','Changes required'].includes(view.shownStage))
  &&(demoRolePeople['Platform Administrator']||[]).includes(personId);
}
export function dueAttestations(d:RegistryData,personId:string,asOf=todayLocal()) {return d.attestations.filter(a=>attestationVisibleTo(a,d,personId)&&!isAttestationComplete(a.status)&&a.dueDate<=addDays(asOf,30)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));}
export const workThemes=['Workspace setup','Access & accountability','Evidence & risk','Annual assurance'] as const;
export type WorkItem={id:string;kind:'Request'|'Review'|'Annual review';theme:string;title:string;href:string;workspaceId:string|null;assetId:string|null;status:string;nextAction:string;assignee:string;assignedToMe:boolean;awaitingApproval:boolean;waitingOnBusiness:boolean;due:string;severity:string;platform:string;lob:string};
export function workItems(d:RegistryData,personId:string,admin:boolean):WorkItem[] {
  const mine=workspaceIdsFor(d,personId);const items:WorkItem[]=[];
  for(const r of d.requests){
    const view=requestView(d,r.id);
    const championApproval=championApprovalAssigned(d,r,personId);
    if(!view.open||(!admin&&!ownsRequest(r,personId)&&!championApproval))continue;
    items.push({id:r.id,kind:'Request',theme:'Workspace setup',title:(r.businessName||'Untitled workspace request')+(view.technicalOpen?' · technical work':''),href:'/requests/'+r.id,workspaceId:r.workspaceId||null,assetId:null,status:view.queueStatus,nextAction:championApproval?'Approve business declarations and responsibility':view.nextAction,assignee:championApproval?'Current eligible Champion':view.assignee,assignedToMe:assignedRequest(d,view,personId,admin),awaitingApproval:view.awaitingApproval,waitingOnBusiness:view.waitingOnBusiness,due:r.targetDate||'',severity:'Normal',platform:r.platform,lob:r.workspaceBusinessLine||d.workspaces.find(w=>w.id===r.workspaceId)?.lob||''});
  }
  for(const r of d.reviews){if(['Closed','Resolved'].includes(r.status)||(!admin&&r.ownerId!==personId&&(!r.workspaceId||!mine.has(r.workspaceId))))continue;
    const closingEvidenceReady=!!r.resolution.trim()&&!!r.closureEvidence?.trim()&&isDateOnly(r.verificationDate)&&r.verificationDate<=todayLocal()&&r.verificationDate>=r.evidenceDate.slice(0,10)&&['Subsequent platform observation','Manual verification'].includes(r.verificationMethod||'');
    const pendingClosure=closingEvidenceReady&&!approvalSatisfied(d,'Review',r.id,'Evidence closure',closureKey(r),closureRoles);
    const waiting=!pendingClosure&&['Pending Business Response','Action Required'].includes(r.status);
    const responsibleId=waiting?r.ownerId:r.reviewerId;
    items.push({id:r.id,kind:'Review',theme:/Champion|Owner|Access|Group/.test(r.type)?'Access & accountability':r.type.includes('Attestation')?'Annual assurance':'Evidence & risk',title:r.type,href:'/reviews/'+r.id,workspaceId:r.workspaceId,assetId:r.assetId,status:pendingClosure?'Awaiting closure approval':r.status,nextAction:pendingClosure?'Approve closing evidence':waiting?'Provide business response':r.status==='Pending Admin Action'?'Record administrator action':r.status==='Unable to Verify'?'Collect missing evidence':'Investigate and resolve',assignee:pendingClosure?'Platform closure approver':d.people.find(p=>p.id===responsibleId)?.name||responsibleId||'Unassigned',assignedToMe:pendingClosure?admin:waiting?r.ownerId===personId:r.reviewerId===personId,awaitingApproval:pendingClosure,waitingOnBusiness:waiting,due:r.dueDate,severity:r.severity,platform:r.platform,lob:r.lob});}
  for(const a of d.attestations){if(isAttestationComplete(a.status)||(!admin&&!attestationVisibleTo(a,d,personId)))continue;const w=d.workspaces.find(w=>w.id===a.workspaceId);const pending=a.status==='Pending Owner Approval';const champion=attestationRecipientIds(a,d).includes(personId)&&d.people.some(person=>person.id===personId&&person.status==='Active');
    items.push({id:a.id,kind:'Annual review',theme:'Annual assurance',title:(w?.businessName||a.workspaceId)+' Annual Attestation',href:'/attestations/'+a.id,workspaceId:a.workspaceId,assetId:null,status:annualStatus(a),nextAction:pending?'Approve Champion response':'Confirm workspace details',assignee:pending?'Application / Platform Owner':'Workspace Champions',assignedToMe:!pending&&champion,awaitingApproval:pending,waitingOnBusiness:!pending,due:a.dueDate,severity:'Normal',platform:w?.platform||'',lob:w?.lob||''});}
  return items.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||(['Critical','High','Medium','Low','Normal'].indexOf(a.severity)-['Critical','High','Medium','Low','Normal'].indexOf(b.severity))||a.id.localeCompare(b.id));
}
export function filterWorkItems(items:WorkItem[],view:string,asOf=todayLocal()) {return items.filter(i=>view==='assigned'?i.assignedToMe:view==='approval'?i.awaitingApproval:view==='business'?i.waitingOnBusiness:view==='overdue'?!!i.due&&i.due<asOf:true);}
