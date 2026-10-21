import type { RegistryData, WorkspaceRequest } from '../types';
import { approvalSatisfied, businessApprovalNeeds, latestApproval, requestKey, requestApprovalNeeds, technicalApprovalNeeds, requiresTechnicalWork, separatesTechnicalWork, usesChampionApproval, requestChampionEligibility, championBusinessPurpose } from '../utils/approvals';
import { calendarDateLocal, isDateOnly, todayLocal } from '../utils/dates';
import { requestIssues } from '../utils/logic';

export function requestIdentityIssue(r:WorkspaceRequest,d:RegistryData):string{
 return [r.ownerId,...r.championIds].every(id=>d.people.some(person=>person.id===id&&person.status==='Active'))?'':'Assign active, verified owners and Champions. Platform Manager must resolve unavailable or unverified identities.';
}

type BusinessCheck = { code:'Ready'|'InformationRequired'|'ApprovalRequired'|'AwaitingEffectiveDate'; message:string };
export function businessApplicationCheck(r:WorkspaceRequest,d:RegistryData,asOf=todayLocal()):BusinessCheck {
 const blocked=(message:string):BusinessCheck=>({code:'InformationRequired',message});
 const workspace=d.workspaces.find(item=>item.id===r.workspaceId);
 if(!workspace||workspace.platform!==r.platform||!workspace.nativeId.trim())return blocked('Link this request to the existing native workspace identity.');
 if(r.nativeWorkspaceId!==workspace.nativeId)return blocked('The submitted native workspace identity does not match the selected platform record.');
 if(r.businessApplied?.requestKey===requestKey(r))return {code:'Ready',message:''};
 if(r.status!=='Submitted')return blocked('Submit the business information first.');
 if(d.requests.some(request=>request.supersedesRequestId===r.id))return blocked('This request was superseded.');
 if(!isDateOnly(r.effectiveDate||''))return blocked('Record a valid responsibility effective date.');
 if(r.effectiveDate!<r.createdDate.slice(0,10))return blocked('The effective date cannot predate this request.');
 const issue=requestIssues(r,d,'application')[0]?.message||requestIdentityIssue(r,d);
 if(issue)return blocked(issue);
 if(usesChampionApproval(r)&&!approvalSatisfied(d,'Request',r.id,championBusinessPurpose,requestKey(r),['Champion'])){
  const eligibility=requestChampionEligibility(d,r);
  if(eligibility.issue)return blocked(eligibility.issue);
 }
 const needs=businessApprovalNeeds(r,d);
 if(!needs.every(need=>approvalSatisfied(d,'Request',r.id,need.purpose,requestKey(r),need.roles)))return {code:'ApprovalRequired',message:'Record the required business and Custom approvals.'};
 const approvalDate=needs.map(need=>calendarDateLocal(latestApproval(d,'Request',r.id,need.purpose,requestKey(r))!.decidedAt)).sort().at(-1)||r.effectiveDate!;
 if(r.effectiveDate!>asOf||approvalDate>asOf)return {code:'AwaitingEffectiveDate',message:'Responsibility starts on the recorded effective date.'};
 return {code:'Ready',message:''};
}
export const businessApplicationIssue=(r:WorkspaceRequest,d:RegistryData,asOf=todayLocal())=>businessApplicationCheck(r,d,asOf).message;

/** Local prototype command: apply approved business intent without altering technical state. */
export function applyEffectiveBusinessChanges(d:RegistryData,asOf=todayLocal()):RegistryData{
 let next=d;
 for(const workspace of d.workspaces){
  const candidates=d.requests.filter(request=>request.workspaceId===workspace.id&&request.type!=='Create New'&&!businessApplicationIssue(request,d,asOf));
  candidates.sort((a,b)=>(a.effectiveDate||'').localeCompare(b.effectiveDate||'')||(a.submittedAt||a.createdDate).localeCompare(b.submittedAt||b.createdDate)||a.id.localeCompare(b.id));
  const currentProjectionIndex=candidates.findIndex(request=>request.id===workspace.businessRequestId);
  for(const [candidateIndex,request] of candidates.entries()){
  if(request.businessApplied)continue;
  const approvalIds=businessApprovalNeeds(request,d).map(need=>latestApproval(d,'Request',request.id,need.purpose,requestKey(request))!.id);
  const approvalDate=approvalIds.map(id=>calendarDateLocal(d.approvals!.find(approval=>approval.id===id)!.decidedAt)).sort().at(-1)||request.effectiveDate!;
  const receipt={requestKey:requestKey(request),appliedAt:asOf,effectiveDate:approvalDate>request.effectiveDate!?approvalDate:request.effectiveDate!,ownerId:request.ownerId,championIds:[...request.championIds],nativeWorkspaceId:workspace.nativeId,approvalIds};
  const configurationId='CFG-'+request.id;
  const version=Math.max(0,...next.configurations.filter(configuration=>configuration.workspaceId===workspace.id).map(configuration=>configuration.version))+1;
  const changesConfiguration=!usesChampionApproval(request)||requiresTechnicalWork(request);
  next={
   ...next,
   requests:next.requests.map(item=>item.id===request.id?{...item,businessApplied:receipt}:item),
   workspaces:next.workspaces.map(item=>item.id===workspace.id&&candidateIndex>=currentProjectionIndex?{...item,businessRequestId:request.id,businessName:request.businessName,purpose:request.purpose,ownerId:request.ownerId,...(usesChampionApproval(request)?{lob:request.workspaceBusinessLine!.trim(),businessLineStatus:'Declared' as const}:{lob:item.lob}),containsPii:request.containsPii,containsEuct:request.containsEuct,highestDmpTier:request.highestDmpTier,classification:request.classification,criticality:request.criticality,...(changesConfiguration?{configuration:request.configuration,requestedVersionId:configurationId}:{}),registryStatus:request.type==='Register Existing'?'Registered':item.registryStatus}:item),
   configurations:changesConfiguration?[...next.configurations,{id:configurationId,workspaceId:workspace.id,version,type:request.configuration,technicalName:request.technicalName,customReason:request.customReason,customExplanation:request.customExplanation,alternateSecurity:request.alternateSecurity,alternateAuthentication:request.alternateAuthentication,createdDate:asOf}]:next.configurations,
   groups:changesConfiguration?[...next.groups,...request.groups.map(group=>({...group,id:configurationId+'-'+group.id,configurationVersionId:configurationId}))]:next.groups,
   champions:usesChampionApproval(request)?next.champions:[...next.champions,...request.championIds.map(personId=>({configurationVersionId:configurationId,personId}))],
   events:[...next.events,{id:'BUSINESS-'+request.id,workspaceId:workspace.id,date:asOf,actor:'Local registry workflow',category:'Requested',description:`${request.id}: approved business responsibility effective ${receipt.effectiveDate}. Technical state remains separate.`}],
  };
  }
 }
 return next;
}

export function requestActorIssue(edited:WorkspaceRequest,d:RegistryData,actorId:string){
 if(!d.people.some(person=>person.id===actorId&&person.status==='Active'))return 'The current prototype profile must be active to save or submit a request.';
 const original=d.requests.find(request=>request.id===edited.id);
 if(original?.status==='Submitted')return 'Submitted requests are read-only. Create an authorized correction instead.';
 const scope=original||edited;
 if(![scope.createdById,scope.ownerId,'P3'].includes(actorId))return 'Only the requester, workspace owner, or administrator can save or submit this draft.';
 if(original&&edited.createdById!==original.createdById)return 'The original requester cannot be changed.';
 if(!original&&edited.createdById&&edited.createdById!==actorId)return 'New requests must record the current prototype profile as requester.';
 return '';
}

export type RequestStage='Draft'|'Changes required'|'Superseded'|'Awaiting approval'|'Business information required'|'Awaiting effective date'|'Ready for registration'|'Ready for business update'|'Ready for implementation'|'Awaiting verification'|'Complete';
export const needsRegistryLink=(r:WorkspaceRequest,d:RegistryData)=>requestStage(r,d)==='Complete'&&r.type==='Create New'&&!d.workspaces.some(w=>w.id===r.workspaceId);
export type TechnicalStage='Not required'|'Awaiting approval'|'Changes required'|'Ready for implementation'|'Awaiting verification'|'Complete'|'Superseded';
export function requestTechnicalStage(r:WorkspaceRequest,d:RegistryData):TechnicalStage{
 if(d.requests.some(request=>request.supersedesRequestId===r.id))return 'Superseded';
 if(!technicalApprovalNeeds(r).length)return 'Not required';
 const needs=[...requestApprovalNeeds(r,d),...technicalApprovalNeeds(r)];
 if(needs.some(need=>latestApproval(d,'Request',r.id,need.purpose,requestKey(r))?.decision==='Changes required'))return 'Changes required';
 if(!needs.every(need=>approvalSatisfied(d,'Request',r.id,need.purpose,requestKey(r),need.roles)))return 'Awaiting approval';
 if(r.execution?.requestKey!==requestKey(r)||!r.execution?.implementationReference)return 'Ready for implementation';
 return r.execution.verificationReference?'Complete':'Awaiting verification';
}
export const hasOpenTechnicalWork=(r:WorkspaceRequest,d:RegistryData)=>separatesTechnicalWork(r)&&!['Not required','Complete','Superseded'].includes(requestTechnicalStage(r,d));
export function requestStage(r:WorkspaceRequest,d:RegistryData,asOf=todayLocal()):RequestStage {
  if(d.requests.some(x=>x.supersedesRequestId===r.id))return 'Superseded';
  if(r.status==='Draft')return 'Draft';
  if(r.effectiveDate&&!r.businessApplied&&requestIdentityIssue(r,d))return 'Business information required';
  if(usesChampionApproval(r)&&!r.businessApplied&&!approvalSatisfied(d,'Request',r.id,championBusinessPurpose,requestKey(r),['Champion'])&&requestChampionEligibility(d,r).issue)return 'Business information required';
  if(requestApprovalNeeds(r,d).some(n=>latestApproval(d,'Request',r.id,n.purpose,requestKey(r))?.decision==='Changes required'))return 'Changes required';
  if(!requestApprovalNeeds(r,d).every(n=>approvalSatisfied(d,'Request',r.id,n.purpose,requestKey(r),n.roles)))return 'Awaiting approval';
  if(r.type==='Register Existing'||(r.type==='Update Existing'&&r.effectiveDate&&(!r.businessApplied||usesChampionApproval(r)))){
    if(r.businessApplied?.requestKey===requestKey(r))return 'Complete';
    const issue=businessApplicationCheck(r,d,asOf);
    if(issue.code==='AwaitingEffectiveDate')return 'Awaiting effective date';
    return issue.code!=='Ready'?'Business information required':r.type==='Register Existing'?'Ready for registration':'Ready for business update';
  }
  if(r.execution?.requestKey!==requestKey(r)||!r.execution?.implementationReference)return 'Ready for implementation';
  return r.execution.verificationReference?'Complete':'Awaiting verification';
}
export function correctedRequest(r:WorkspaceRequest,d:RegistryData,actorId:string,asOf=todayLocal(),newId:()=>string=()=>crypto.randomUUID()):WorkspaceRequest {
  r=d.requests.find(request=>request.id===r.id)||r;
  if(!['Changes required','Business information required'].includes(requestStage(r,d,asOf))&&requestTechnicalStage(r,d)!=='Changes required')throw Error('A correction decision is required before creating a replacement.');
  if(!d.people.some(person=>person.id===actorId&&person.status==='Active'))throw Error('An active profile is required to correct a request.');
  if(![r.ownerId,r.createdById,'P3'].includes(actorId))throw Error('Only the requester, workspace owner, or administrator can correct this request.');
  const {execution:_delivery,businessApplied:_applied,submittedAt:_submitted,...intent}=r;
  const workspace=d.workspaces.find(item=>item.id===r.workspaceId);
  return {...structuredClone(intent),approvalPolicy:'champion-v1',workspaceBusinessLine:r.workspaceBusinessLine||workspace?.lob||'',...(r.type==='Register Existing'&&r.businessApplied?{type:'Update Existing' as const}:{}),id:'REQ-'+newId().slice(0,8).toUpperCase(),supersedesRequestId:r.id,status:'Draft',createdDate:asOf,effectiveDate:asOf,createdById:actorId};
}
export function recordRequestExecution(r:WorkspaceRequest,d:RegistryData,action:'implement'|'verify',reference:string,date:string,actorId:string,asOf=todayLocal()):WorkspaceRequest {
  if(actorId!=='P3'||!d.people.some(p=>p.id===actorId&&p.status==='Active'))throw new Error('An active platform administrator must record implementation and verification.');
  if(!reference.trim()||!date||!isDateOnly(date))throw new Error('Enter an evidence reference and valid date.');
  if(date>asOf)throw new Error('Evidence cannot be dated in the future.');
  const stage=requestTechnicalStage(r,d);
  if(r.status!=='Submitted')throw new Error('Submit the request before recording technical work.');
  if(action==='implement') {
    if(stage!=='Ready for implementation')throw new Error('Required approvals must be recorded first.');
    if(date<r.createdDate.slice(0,10))throw new Error('Implementation cannot predate the request.');
    return {...r,execution:{requestKey:requestKey(r),implementationReference:reference.trim(),implementedAt:date,implementedBy:actorId}};
  }
  if(stage!=='Awaiting verification'||!r.execution)throw new Error('Record the external implementation first.');
  if(date<r.execution.implementedAt)throw new Error('Verification cannot predate implementation.');
  return {...r,execution:{...r.execution,verificationReference:reference.trim(),verifiedAt:date,verifiedBy:actorId}};
}

