import type { RegistryData, Workspace } from '../types';
import { todayLocal, isDateOnly } from './dates';

export function evidenceState(observedAt:string,complete:boolean|undefined,maxAgeDays:number|undefined,asOf=todayLocal()) {
  const observed=observedAt?.slice(0,10);const age=(Date.parse(asOf)-Date.parse(observed))/86400000;
  if(!isDateOnly(observed)||!isDateOnly(asOf)||!Number.isFinite(age))return {status:'Unavailable',reason:'No valid observation timestamp.',ready:false};
  if(age<0)return {status:'Unable to verify',reason:'Observation is dated in the future.',ready:false};
  if(complete!==true)return {status:'Incomplete',reason:complete===false?'Extract coverage is incomplete.':'Extract completeness has not been recorded.',ready:false};
  if(!Number.isInteger(maxAgeDays)||!maxAgeDays||maxAgeDays<1||maxAgeDays>365)return {status:'Rule needed',reason:'No valid freshness limit is configured for this platform (1–365 days).',ready:false};
  if(age>maxAgeDays)return {status:'Stale',reason:`${Math.floor(age)} days old; configured limit is ${maxAgeDays} days.`,ready:false};
  return {status:'Current',reason:`Complete extract; ${Math.floor(age)} days old against a ${maxAgeDays}-day limit.`,ready:true};
}
export const workspaceEvidence=(w:Workspace,d:RegistryData)=>evidenceState(w.observedDate,w.observationComplete,d.evidencePolicies?.[w.platform]);
