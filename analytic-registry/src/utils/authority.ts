import type { Attestation, RegistryData, Workspace } from '../types';

/** Requested assignments are proposed intent. Only the implemented version grants current responsibility. */
export function currentChampionIds(d:RegistryData,workspace:Workspace):string[]{
 if(!workspace.implementedVersionId)return [];
 return [...new Set(d.champions.filter(assignment=>assignment.configurationVersionId===workspace.implementedVersionId).map(assignment=>assignment.personId))];
}

/** A packet's explicit recipient list is frozen, including an intentionally empty list. */
export function attestationRecipientIds(attestation:Attestation,d:RegistryData):string[]{
 if(attestation.snapshot){
  if(attestation.snapshot.championIds!==undefined)return [...new Set(attestation.snapshot.championIds)];
  return currentChampionIds(d,attestation.snapshot.workspace);
 }
 const workspace=d.workspaces.find(item=>item.id===attestation.workspaceId);
 return workspace?currentChampionIds(d,workspace):[];
}

export function attestationVisibleTo(attestation:Attestation,d:RegistryData,personId:string):boolean{
 return d.workspaces.some(workspace=>workspace.id===attestation.workspaceId&&workspace.ownerId===personId)||attestationRecipientIds(attestation,d).includes(personId);
}
