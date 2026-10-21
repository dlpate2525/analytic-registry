import type { Attestation, RegistryData, Workspace } from '../types';
export { requestIdentityIssue, businessApplicationIssue, applyEffectiveBusinessChanges } from '../domain/requestPolicy';

/** Legacy records retain their baseline; new approved assignments have a separate business receipt. */
export function currentChampionIds(d:RegistryData,workspace:Workspace):string[]{
 const applied=d.requests.find(request=>request.id===workspace.businessRequestId)?.businessApplied;
 if(applied?.nativeWorkspaceId===workspace.nativeId)return [...applied.championIds];
 if(!workspace.implementedVersionId)return [];
 return [...new Set(d.champions.filter(assignment=>assignment.configurationVersionId===workspace.implementedVersionId).map(assignment=>assignment.personId))];
}

/** A packet's explicit recipient list is frozen, including an intentionally empty list. */
export function attestationRecipientIds(attestation:Attestation,d:RegistryData):string[]{
 if(attestation.snapshot){
  if(attestation.snapshot.championIds!==undefined)return [...new Set(attestation.snapshot.championIds)];
  // Legacy issued packets stay tied to their captured version, never today's assignment.
  const version=attestation.snapshot.workspace.implementedVersionId;
  return version?[...new Set(d.champions.filter(assignment=>assignment.configurationVersionId===version).map(assignment=>assignment.personId))]:[];
 }
 const workspace=d.workspaces.find(item=>item.id===attestation.workspaceId);
 return workspace?currentChampionIds(d,workspace):[];
}

export function attestationVisibleTo(attestation:Attestation,d:RegistryData,personId:string):boolean{
 return d.workspaces.some(workspace=>workspace.id===attestation.workspaceId&&workspace.ownerId===personId)||attestationRecipientIds(attestation,d).includes(personId);
}
