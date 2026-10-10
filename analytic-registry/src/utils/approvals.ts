import { isDateOnly, todayLocal } from './dates';
import type { ApprovalRecord, RegistryData, WorkspaceRequest, AdministrativeReview } from '../types';
export const ownerRoles=['Application Owner','Platform Owner'];
export const closureRoles=['Platform Manager','Platform Team','Platform Owner'];
export const demoRolePeople:Record<string,string[]>={'Application Owner':['P4'],'Platform Owner':['P7'],'Platform Manager':['P8'],'Platform Team':['P2','P3'],'Platform Administrator':['P3']};
export const isAttestationComplete=(status:string)=>status==='Complete'||status==='Complete with follow-up';
export function latestApproval(d:RegistryData,kind:ApprovalRecord['targetType'],targetId:string,purpose:string,contextKey:string){return (d.approvals||[]).filter(a=>a.targetType===kind&&a.targetId===targetId&&a.purpose===purpose&&a.contextKey===contextKey).at(-1);}
export function captureApprovalEligibility(d:RegistryData,role:string,personId:string,decidedAt:string,businessOwnerId?:string):NonNullable<ApprovalRecord['eligibilityEvidence']>{
 const ownerRole=role==='Business Owner / Workspace Owner';
 const eligible=ownerRole?businessOwnerId===personId:(demoRolePeople[role]||[]).includes(personId);
 if(!eligible||!d.people.some(p=>p.id===personId&&p.status==='Active'))throw Error('The selected approver must currently be active and hold the required role.');
 return {personId,role,personStatus:'Active',checkedAt:decidedAt,basis:ownerRole?'Workspace owner at decision':'Prototype role assignment',...(ownerRole?{businessOwnerId}:{})};
}
export function approvalSatisfied(d:RegistryData,kind:ApprovalRecord['targetType'],targetId:string,purpose:string,contextKey:string,roles:string[]){
 const a=latestApproval(d,kind,targetId,purpose,contextKey);
 if(!a||a.decision!=='Approved'||!roles.includes(a.role)||!a.personId.trim()||!a.reference.trim()||!isDateOnly(a.decidedAt.slice(0,10))||!Number.isFinite(Date.parse(a.decidedAt)))return false;
 const evidence=a.eligibilityEvidence;
 // Older prototype receipts captured role, person, date, and reference only.
 // Preserve those historical facts without inventing a retrospective directory check.
 if(!evidence)return true;
 return evidence.personId===a.personId&&evidence.role===a.role&&evidence.personStatus==='Active'&&evidence.checkedAt===a.decidedAt&&
   (a.role==='Business Owner / Workspace Owner'?evidence.basis==='Workspace owner at decision'&&evidence.businessOwnerId===a.personId:evidence.basis==='Prototype role assignment');
}
export const requestKey=(r:WorkspaceRequest)=>{const {execution,...intent}=r;return JSON.stringify(intent);};
export const closureKey=(r:AdministrativeReview)=>JSON.stringify([r.resolution,r.verificationDate,r.closureEvidence,r.verificationMethod,r.findingIds||[]]);
export function requestApprovalNeeds(r:WorkspaceRequest,d:RegistryData){const w=d.workspaces.find(w=>w.id===r.workspaceId);const currentGroups=w?d.groups.filter(g=>g.configurationVersionId===w.requestedVersionId):[];const groupKey=(g:WorkspaceRequest['groups'][number])=>JSON.stringify([g.purpose,g.mode,g.groupId,g.requestedName]);const groupSet=(groups:WorkspaceRequest['groups'])=>groups.map(groupKey).sort();const groupChanged=!!w&&JSON.stringify(groupSet(r.groups))!==JSON.stringify(groupSet(currentGroups));const needs=[{purpose:'Technical setup',roles:['Platform Administrator']}];if(r.configuration==='Custom')needs.push({purpose:'Custom configuration',roles:ownerRoles});if(r.containsPii==='Yes'||r.classification==='Restricted'||r.classification==='Confidential'||(w&&r.ownerId!==w.ownerId)||groupChanged)needs.push({purpose:'Business ownership / sensitive data / access',roles:['Business Owner / Workspace Owner']});return needs;}
export function validateClosure(r:AdministrativeReview,d:RegistryData){if(!['Resolved','Closed'].includes(r.status))return '';if(!r.resolution.trim()||!r.verificationDate||!r.closureEvidence?.trim())return 'A resolution, verification date, and closing evidence reference are required.';if(!['Subsequent platform observation','Manual verification'].includes(r.verificationMethod||''))return 'Select subsequent platform observation or manual verification.';if(!isDateOnly(r.verificationDate)||r.verificationDate>todayLocal())return 'Verification requires a valid date that is not in the future.';if(r.verificationDate<r.evidenceDate.slice(0,10))return 'Verification cannot predate the evidence under review.';if(!approvalSatisfied(d,'Review',r.id,'Evidence closure',closureKey(r),closureRoles))return 'Closing evidence requires approval by a Platform Manager, Platform Team member, or Platform Owner.';return '';}
