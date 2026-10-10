import type { AssetAssessment, Attestation, AttestationSnapshot, RegistryData, WorkspaceRequest } from '../types';
import { attestationPacket, hasAttestationExceptions, questions } from './attestation';
import { isAttestationComplete } from './approvals';
import { todayLocal } from './dates';
import { recordAssessment } from './assessment';
import { attestationRecipientIds } from './authority';

// These guards bind commands to the visible prototype profile. Production must
// derive the actor and authorization from authenticated server-side context.
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

export function prepareAttestationResponse(edited:Attestation,d:RegistryData,actorId:string,submit:boolean):Attestation & {snapshot:AttestationSnapshot}{
 const original=d.attestations.find(record=>record.id===edited.id);
 if(!original)throw Error('Attestation not found.');
 if(isAttestationComplete(original.status)||original.status==='Pending Owner Approval')throw Error('This annual response is read-only at its current stage.');
 if(edited.workspaceId!==original.workspaceId)throw Error('The workspace under review cannot be changed.');
 if(!d.people.some(person=>person.id===actorId&&person.status==='Active'))throw Error('The current prototype profile must be active to respond.');
 const packet=original.snapshot||attestationPacket(d,original.workspaceId);
 const recipients=attestationRecipientIds({...original,snapshot:packet},d);
 if(!recipients.includes(actorId))throw Error('Only a selected Champion can save or submit this annual response.');
 const required=questions.filter((_,index)=>index!==6||packet.workspace.configuration==='Custom');
 if(submit&&required.some(question=>!['Yes','No','Unable to verify'].includes(edited.answers[question])))throw Error('Answer every applicable question before submitting.');
 if(submit&&hasAttestationExceptions(edited)&&!edited.changes.trim()&&!edited.followUp.trim())throw Error('Describe the requested changes or follow-up for your exceptions.');
 const needsFollowUp=hasAttestationExceptions(edited)||!!edited.changes.trim()||!!edited.followUp.trim();
 return {...original,snapshot:packet,answers:{...edited.answers},changes:edited.changes,followUp:edited.followUp,respondingChampionId:actorId,status:submit?'Pending Owner Approval':'In progress',date:submit?todayLocal():original.date,followUpReviewId:submit&&needsFollowUp?'REV-ATT-'+original.id:original.followUpReviewId};
}

export function recordAssessmentByActor(d:RegistryData,assessment:AssetAssessment,actorId:string):RegistryData{
 if(!d.people.some(person=>person.id===actorId&&person.status==='Active'))throw Error('The current prototype profile must be active to record an assessment.');
 if(assessment.reviewerId!==actorId)throw Error('The assessment reviewer must be the current prototype profile.');
 return recordAssessment(d,assessment);
}
