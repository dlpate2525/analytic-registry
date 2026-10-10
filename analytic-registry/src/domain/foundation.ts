/** V1.1 reference reconciliation. No network access and no registry writes. */
export type NativeIdentity = {
  platform: string; instance: string; scope: string; kind: 'Workspace'|'Asset'|'Connection';
  nativeType: string; nativeId: string;
};
export type Observation = NativeIdentity & {name:string; attributes:Record<string,string|boolean|number|null>};
export type RegistryEvidence = Observation & {registryId:string; lastSeenAt:string};
export type Delivery = {
  runKey:string; observedAt:string; platform:string; instance:string; scope:string;
  kind: NativeIdentity['kind']; coverage:'Complete'|'Partial'|'NotCollected'|'Failed';
  expectedRows:number|null; scopeVerified:boolean;
};
export type ReconciliationItem = {key:string; registryId:string|null; name:string; state:'New'|'Changed'|'Unchanged'|'Missing from complete snapshot'|'Not verified'|'Older observation'|'Conflicting observation time'; changedFields:string[]};
function nonempty(value:string){return typeof value==='string' && value.trim().length>0;}
export function nativeKey(row:NativeIdentity):string {
  if (![row.platform,row.instance,row.scope,row.kind,row.nativeType,row.nativeId].every(nonempty)) throw new Error('A native key component is missing. Route the row to Platform Manager.');
  // JSON encoding avoids delimiter collisions. Never normalize source IDs or use names/run IDs.
  // Workspace subtype (for example PersonalGroup) and connection technology can change.
  // Only asset type partitions the native asset namespace.
  return JSON.stringify([row.platform,row.instance,row.scope,row.kind,row.kind==='Asset'?row.nativeType:row.kind,row.nativeId]);
}
export function relationshipKey(from:NativeIdentity,to:NativeIdentity,relationship:string):string {
  if(!nonempty(relationship)) throw new Error('Relationship kind is required.');
  return JSON.stringify([nativeKey(from),relationship,nativeKey(to)]);
}
const timestamp=(value:string)=>{
  if(!/(Z|[+-]\d{2}:\d{2})$/i.test(value)||!Number.isFinite(Date.parse(value))) throw new Error('Evidence time requires a valid UTC offset.');
  return Date.parse(value);
};
export function compareDelivery(current:RegistryEvidence[],incoming:Observation[],delivery:Delivery):ReconciliationItem[] {
  if(!nonempty(delivery.runKey))throw new Error('RunKey is required.');
  const time=timestamp(delivery.observedAt);
  const inScope=(row:NativeIdentity)=>row.platform===delivery.platform&&row.instance===delivery.instance&&row.scope===delivery.scope&&row.kind===delivery.kind;
  if(incoming.some(row=>!inScope(row)))throw new Error('Incoming rows cross the declared delivery scope.');
  if((delivery.coverage==='Failed'||delivery.coverage==='NotCollected')&&incoming.length)throw new Error('Uncollected or failed datasets cannot contain accepted observations.');
  if(delivery.expectedRows!==null&&(!Number.isInteger(delivery.expectedRows)||delivery.expectedRows<0||delivery.expectedRows!==incoming.length))throw new Error('Delivered count does not match Coverage.RowCount.');
  if(delivery.coverage==='Complete'&&(!delivery.scopeVerified||delivery.expectedRows===null))throw new Error('Complete coverage requires verified scope and row count.');
  const previous=new Map<string,RegistryEvidence>();
  for(const row of current){const key=nativeKey(row);if(previous.has(key))throw new Error('Duplicate registry native key.');previous.set(key,row);timestamp(row.lastSeenAt);}
  const seen=new Set<string>();
  const result:ReconciliationItem[]=[];
  for(const row of incoming){
    const key=nativeKey(row);
    if(seen.has(key))throw new Error('Duplicate incoming native key. Quarantine conflicting rows.');
    seen.add(key);
    const old=previous.get(key);
    const changedFields=old?[...(old.name!==row.name?['name']:[]),...new Set([...Object.keys(old.attributes),...Object.keys(row.attributes)])].filter(field=>field==='name'||old.attributes[field]!==row.attributes[field]):[];
    result.push({key,registryId:old?.registryId??null,name:row.name,state:!old?'New':time<timestamp(old.lastSeenAt)?'Older observation':changedFields.length?(time===timestamp(old.lastSeenAt)?'Conflicting observation time':'Changed'):'Unchanged',changedFields});
  }
  for(const [key,row] of previous){
    if(!inScope(row)||seen.has(key))continue;
    result.push({key,registryId:row.registryId,name:row.name,state:time<timestamp(row.lastSeenAt)?'Older observation':delivery.coverage==='Complete'?'Missing from complete snapshot':'Not verified',changedFields:[]});
  }
  return result;
}
export type DirectoryEvidence={tenant:string;directoryId:string;mail:string|null;accountEnabled:boolean|null};
export function resolveEmail(sourceEmail:string|null,tenant:string|null,directory:DirectoryEvidence[],coverageComplete:boolean,principalType='User'){
  const unresolved=(status:string)=>({status,directoryId:null as string|null,route:'Platform Manager'});
  if(principalType!=='User')return unresolved('Non-person principal requires review');
  if(!tenant||!sourceEmail?.trim())return unresolved('Missing email or tenant');
  if(!coverageComplete)return unresolved('Directory evidence incomplete');
  const email=sourceEmail.trim().toLowerCase();
  const matches=directory.filter(row=>row.tenant===tenant&&row.mail?.trim().toLowerCase()===email);
  if(matches.some(row=>!row.directoryId.trim()))return unresolved('Invalid directory identity');
  const ids=new Set(matches.map(row=>row.directoryId));
  if(ids.size===0)return unresolved('No exact email match');
  if(matches.length!==1||ids.size!==1||new Set(matches.map(row=>row.accountEnabled)).size!==1)return unresolved('Ambiguous directory evidence');
  const row=matches[0];
  return {status:row.accountEnabled===true?'Resolved enabled':row.accountEnabled===false?'Resolved disabled':'Resolved status unknown',directoryId:row.directoryId,route:row.accountEnabled===true?'None':'Platform Manager'};
}
