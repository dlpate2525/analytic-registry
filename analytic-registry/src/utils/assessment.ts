import type { AssetAssessment, RegistryData } from '../types';
import { isDateOnly, todayLocal } from './dates';

export function validateAssessment(s:AssetAssessment,d:RegistryData):string {
  if(!d.assets.some(a=>a.id===s.assetId))return 'Select a known asset.';
  if(!s.version.trim()||!s.purpose.trim())return 'Enter a version and business purpose.';
  for(const [label,id] of [['Reviewer',s.reviewerId],['Developer',s.developerId],['Reviewing Champion',s.championId]]) {
    if(!d.people.some(p=>p.id===id&&p.status==='Active'))return `${label} must be an active, verified person.`;
  }
  if(!isDateOnly(s.date)||s.date>todayLocal())return 'Enter a valid review date that is not in the future.';
  if(![s.sourceCount,s.audienceSize].every(n=>Number.isInteger(n)&&n>=0)||!Number.isFinite(s.prlScore)||s.prlScore<0)return 'Counts must be nonnegative whole numbers. The illustrative score must be a nonnegative number.';
  for(const link of [s.solutionLink,s.developmentLink,s.requirementsLink,s.evidenceLink].filter(Boolean)) {
    try{if(!['https:','http:'].includes(new URL(link).protocol))return 'References must use an http or https address.';}catch{return 'Enter a valid reference address or leave it blank.';}
  }
  if(!['In review','Complete'].includes(s.status))return 'Select a supported review status.';
  if(s.status==='Complete'&&!['Approved','Approved with follow-up','Changes required'].includes(s.outcome))return 'Select a completed review outcome.';
  if(s.status==='Complete'&&['Approved with follow-up','Changes required'].includes(s.outcome)&&!s.comments.trim())return 'Describe the follow-up or required changes in comments.';
  return '';
}
export function recordAssessment(d:RegistryData,s:AssetAssessment):RegistryData {
  const issue=validateAssessment(s,d);if(issue)throw Error(issue);
  if(d.assessments.some(x=>x.id===s.id))throw Error('This assessment is already saved.');
  return {...d,assessments:[...d.assessments,s],assets:d.assets.map(a=>a.id===s.assetId&&a.version===s.version?{...a,assessmentStatus:s.status,...(s.status==='Complete'?{prl:s.prlTag,euct:s.euct,dmp:s.dmp,pii:s.pii}:{})}:a)};
}
