import { todayLocal, isDateOnly } from './dates';
import type { RegistryData, WorkspaceRequest, AdministrativeReview } from '../types';
import { approvalSatisfied, requestApprovalNeeds, requestKey, validateClosure, latestApproval } from './approvals';

export type RequestStage='Draft'|'Changes required'|'Superseded'|'Awaiting approval'|'Ready for implementation'|'Awaiting verification'|'Complete';
export const needsRegistryLink=(r:WorkspaceRequest,d:RegistryData)=>requestStage(r,d)==='Complete'&&r.type==='Create New'&&!d.workspaces.some(w=>w.id===r.workspaceId);
export function requestStage(r:WorkspaceRequest,d:RegistryData):RequestStage {
  if(d.requests.some(x=>x.supersedesRequestId===r.id))return 'Superseded';
  if(r.status==='Draft')return 'Draft';
  if(requestApprovalNeeds(r,d).some(n=>latestApproval(d,'Request',r.id,n.purpose,requestKey(r))?.decision==='Changes required'))return 'Changes required';
  if(!requestApprovalNeeds(r,d).every(n=>approvalSatisfied(d,'Request',r.id,n.purpose,requestKey(r),n.roles)))return 'Awaiting approval';
  if(r.execution?.requestKey!==requestKey(r)||!r.execution?.implementationReference)return 'Ready for implementation';
  return r.execution.verificationReference?'Complete':'Awaiting verification';
}
export function correctedRequest(r:WorkspaceRequest,d:RegistryData,actorId:string):WorkspaceRequest {
  if(requestStage(r,d)!=='Changes required')throw Error('A correction decision is required before creating a replacement.');
  if(![r.ownerId,r.createdById,'P3'].includes(actorId))throw Error('Only the requester, workspace owner, or administrator can correct this request.');
  const {execution:_delivery,...intent}=r;
  return {...structuredClone(intent),id:'REQ-'+crypto.randomUUID().slice(0,8).toUpperCase(),supersedesRequestId:r.id,status:'Draft',createdDate:todayLocal(),createdById:actorId};
}
export function recordRequestExecution(r:WorkspaceRequest,d:RegistryData,action:'implement'|'verify',reference:string,date:string,actorId:string):WorkspaceRequest {
  if(actorId!=='P3'||!d.people.some(p=>p.id===actorId&&p.status==='Active'))throw new Error('An active platform administrator must record implementation and verification.');
  if(!reference.trim()||!date||!isDateOnly(date))throw new Error('Enter an evidence reference and valid date.');
  if(date>todayLocal())throw new Error('Evidence cannot be dated in the future.');
  const stage=requestStage(r,d);
  if(action==='implement') {
    if(stage!=='Ready for implementation')throw new Error('Required approvals must be recorded first.');
    if(date<r.createdDate.slice(0,10))throw new Error('Implementation cannot predate the request.');
    return {...r,execution:{requestKey:requestKey(r),implementationReference:reference.trim(),implementedAt:date,implementedBy:actorId}};
  }
  if(stage!=='Awaiting verification'||!r.execution)throw new Error('Record the external implementation first.');
  if(date<r.execution.implementedAt)throw new Error('Verification cannot predate implementation.');
  return {...r,execution:{...r.execution,verificationReference:reference.trim(),verifiedAt:date,verifiedBy:actorId}};
}

export const reviewActions=[
  {label:'Start investigation',status:'Investigating'},
  {label:'Request business response',status:'Pending Business Response'},
  {label:'Queue administrator action',status:'Pending Admin Action'},
  {label:'Mark evidence unavailable',status:'Unable to Verify'},
  {label:'Close verified review',status:'Closed'},
];
export function transitionReview(r:AdministrativeReview,d:RegistryData,status:string,admin:boolean) {
  if(!admin){
    if(!['Pending Business Response','Action Required'].includes(r.status)||status!=='Investigating'||r.ownerId!=='P1')throw new Error('Only the accountable business owner can submit this response.');
    if(!r.notes.trim())throw new Error('Enter a business response before returning the review.');
    return {...r,status};
  }
  if(['Closed','Resolved'].includes(r.status))throw new Error('This review is complete.');
  if(!reviewActions.some(a=>a.status===status))throw new Error('Select a supported review action.');
  if(r.status==='New'&&status==='Closed')throw new Error('Start the investigation before closing this review.');
  const next={...r,status};const issue=validateClosure(next,d);if(issue)throw new Error(issue);
  if(status==='Pending Business Response'&&(!r.ownerId||!r.dueDate))throw new Error('A business owner and response due date are required.');
  return next;
}

export function saveReview(original:AdministrativeReview,edited:AdministrativeReview,d:RegistryData,action:string,admin:boolean){
  if(['Closed','Resolved'].includes(original.status))throw Error('Completed reviews are read-only. Start a linked follow-up for new evidence.');
  if(!admin){
    if(original.ownerId!=='P1'||!['Pending Business Response','Action Required'].includes(original.status))throw Error('Only the accountable business owner can respond to this review.');
    const {notes:_old,...oldFields}=original;const {notes:_new,...newFields}=edited;
    if(JSON.stringify(oldFields)!==JSON.stringify(newFields))throw Error('Business users can update their response only. Administrator evidence is read-only.');
  }
  if(edited.dueDate&&!isDateOnly(edited.dueDate))throw Error('Enter a valid due date.');
  if(edited.reviewerId&&!d.people.some(p=>p.id===edited.reviewerId&&p.status==='Active'))throw Error('Assign an active, verified reviewer.');
  return action?transitionReview(edited,d,action,admin):edited;
}
