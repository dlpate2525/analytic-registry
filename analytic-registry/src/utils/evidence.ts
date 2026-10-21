import type { RegistryData, Workspace } from '../types';
import { todayLocal, isDateOnly } from './dates';

export type EvidenceCoverage = 'Complete'|'Partial'|'NotCollected'|'Failed'|'Unknown';

/** Availability describes observed inventory. It does not establish complete control evidence. */
export function evidenceState(observedAt:string,complete:boolean|EvidenceCoverage|undefined,maxAgeDays:number|undefined,asOf=todayLocal()) {
  const coverage:EvidenceCoverage=complete===true?'Complete':complete===false?'Partial':complete??'Unknown';
  const observed=observedAt?.slice(0,10);
  const age=(Date.parse(asOf)-Date.parse(observed))/86400000;
  const result=(status:string,reason:string,inventoryAvailable=false,controlReady=false)=>({
    status,reason,coverage,observedAt,ageDays:Number.isFinite(age)?Math.floor(age):null,
    inventoryAvailable,controlReady,
    ready:controlReady,
  });
  if(coverage==='NotCollected')return result('Not collected','No observations were collected. Previous accepted evidence keeps its original observation date.');
  if(coverage==='Failed')return result('Collection failed','Collection failed. Previous accepted evidence keeps its original observation date.');
  if(!isDateOnly(observed)||!isDateOnly(asOf)||!Number.isFinite(age))return result('Unavailable','No valid observation timestamp.');
  if(age<0)return result('Unable to verify','Observation is dated in the future.');
  if(coverage==='Unknown')return result('Incomplete','Extract coverage has not been recorded.');
  const validLimit=Number.isInteger(maxAgeDays)&&!!maxAgeDays&&maxAgeDays>=1&&maxAgeDays<=365;
  const ageReason=`${Math.floor(age)} days old`;
  if(coverage==='Partial')return result('Partial',`Partial inventory is available; ${ageReason}. Missing rows do not prove absence. Complete control evidence is unavailable.`+(validLimit&&age>maxAgeDays!?' The configured freshness limit is exceeded.':!validLimit?' No valid freshness limit is configured.':''),true);
  if(!validLimit)return result('Rule needed','Inventory is available. No valid freshness limit is configured for this platform (1–365 days).',true);
  if(age>maxAgeDays!)return result('Stale',`Inventory is available; ${ageReason}; configured limit is ${maxAgeDays} days.`,true);
  return result('Current',`Complete extract; ${ageReason} against a ${maxAgeDays}-day limit.`,true,true);
}
export const workspaceEvidence=(w:Workspace,d:RegistryData)=>evidenceState(w.observedDate,w.observationComplete,d.evidencePolicies?.[w.platform]);
