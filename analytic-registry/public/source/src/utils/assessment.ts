import type { AssetAssessment, RegistryData } from '../types';
import { isDateOnly, todayLocal } from './dates';

export function validateAssessment(s:AssetAssessment,d:RegistryData):string {
  if(!d.assets.some(a=>a.id===s.assetId))return 'Select a known asset.';
  if(!s.version.trim()||!s.purpose.trim())return 'Enter a version and business purpose.';
  for(const [label,id] of [['Reviewer',s.reviewerId],['Developer',s.developerId],['Reviewing Champion',s.championId]]) {
    if(!d.people.some(p=>p.id===id&&p.status==='Active'))return `${label} must be an active, verified person.`;
  }
  if(!isDateOnly(s.date)||s.date>todayLocal())return 'Enter a valid review date that is not in the future.';
  if(![s.sourceCount,s.audienceSize].every(n=>Number.isInteger(n)&&n>=0))return 'Counts must be nonnegative whole numbers.';
  for(const link of [s.solutionLink,s.developmentLink,s.requirementsLink,s.evidenceLink].filter(Boolean)) {
    try{if(!['https:','http:'].includes(new URL(link).protocol))return 'References must use an http or https address.';}catch{return 'Enter a valid reference address or leave it blank.';}
  }
  if(!['In review','Complete'].includes(s.status))return 'Select a supported review status.';
  if(s.status==='Complete'&&!['Approved','Approved with follow-up','Changes required'].includes(s.outcome))return 'Select a completed review outcome.';
  if(s.status==='Complete'&&['Approved with follow-up','Changes required'].includes(s.outcome)&&!s.comments.trim())return 'Describe the follow-up or required changes in comments.';
  if(!['Unclassified','Tier 1','Tier 2','Tier 3'].includes(s.dmp))return 'Use the current DMP tiers. Legacy labels need a new classification decision.';
  if(s.status==='Complete'&&['Approved','Approved with follow-up'].includes(s.outcome)){
    if(s.dmp==='Unclassified')return 'Select the highest applicable DMP tier before approval.';
    if(!s.prlTag.trim()||s.prlTag==='Unassigned'||!s.prlApprovalReference?.trim()||!s.prlApprovedBy?.trim())return 'Record the manually approved PRL, approver, and approval reference. No score is calculated.';
  }
  return '';
}
export function recordAssessment(d:RegistryData,s:AssetAssessment):RegistryData {
  const issue=validateAssessment(s,d);if(issue)throw Error(issue);
  if(d.assessments.some(x=>x.id===s.id))throw Error('This assessment is already saved.');
  // A new row is historical evidence. Only a newer approved current-version decision projects values.
  const isApproved=(x:AssetAssessment)=>x.status==='Complete'&&['Approved','Approved with follow-up'].includes(x.outcome);
  const existing=d.assessments.filter(x=>x.assetId===s.assetId&&x.version===s.version&&isApproved(x));
  const latest=existing.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.reviewNumber-b.reviewNumber).at(-1);
  const newer=!latest||s.date>latest.date||(s.date===latest.date&&s.reviewNumber>latest.reviewNumber);
  const latestAny=d.assessments.filter(x=>x.assetId===s.assetId&&x.version===s.version).sort((a,b)=>a.date.localeCompare(b.date)||a.reviewNumber-b.reviewNumber).at(-1);
  const newerStatus=!latestAny||s.date>latestAny.date||(s.date===latestAny.date&&s.reviewNumber>latestAny.reviewNumber);
  return {...d,assessments:[...d.assessments,s],assets:d.assets.map(a=>a.id===s.assetId&&a.version===s.version?{...a,
    ...(newerStatus?{assessmentStatus:s.outcome==='Changes required'?'Changes required':s.status}:{}),
    ...(isApproved(s)&&newer?{prl:s.prlTag,euct:s.euct,dmp:s.dmp,pii:s.pii}:{})}:a)};
}
