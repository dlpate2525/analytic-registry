/** Workspace request actions and views. No browser storage or platform calls. */
import type { ActivityEvent, ApprovalRecord, RegistryData, WorkspaceRequest } from '../types';
import { approvalSatisfied, captureRequestApprovalEligibility, requestApprovalNeeds, requestKey, technicalApprovalNeeds, separatesTechnicalWork, usesChampionApproval, requestChampionEligibility, championBusinessPurpose } from '../utils/approvals';
import { calendarDateLocal, todayLocal } from '../utils/dates';
import { requestIssues } from '../utils/logic';
import { applyEffectiveBusinessChanges, businessApplicationIssue, correctedRequest, recordRequestExecution, requestActorIssue, requestStage, requestTechnicalStage } from './requestPolicy';

export type RequestCommand =
  | { type:'save'|'submit'; draft:WorkspaceRequest }
  | { type:'correct'; requestId:string }
  | { type:'approve'; requestId:string; contextKey:string; purpose:string; role:string; personId:string; decision:ApprovalRecord['decision']; reference:string }
  | { type:'implement'|'verify'; requestId:string; reference:string; date:string };

export type RequestContext = { actorId:string; now:string; newId:()=>string };

function storedRequest(data:RegistryData,id:string):WorkspaceRequest {
  const matches=data.requests.filter(request=>request.id===id);
  if(matches.length!==1)throw Error(matches.length?'Duplicate request identity. Resolve it before continuing.':'Request not found.');
  return matches[0];
}

export function requestView(data:RegistryData,requestId:string,asOf=todayLocal()) {
  const request=storedRequest(data,requestId);
  const stage=requestStage(request,data,asOf);
  const technicalStage=requestTechnicalStage(request,data);
  const linkedTechnical=separatesTechnicalWork(request)&&!['Not required','Complete','Superseded'].includes(technicalStage);
  const technicalOpen=stage==='Complete'&&linkedTechnical;
  const linkNeeded=stage==='Complete'&&request.type==='Create New'&&!data.workspaces.some(workspace=>workspace.id===request.workspaceId);
  const shownStage=technicalOpen?technicalStage:stage;
  const waitingOnBusiness=stage==='Draft'||stage==='Changes required';
  const approvalNeeds=requestApprovalNeeds(request,data);
  const contextKey=requestKey(request);
  const championRoutingIssue=usesChampionApproval(request)&&!approvalSatisfied(data,'Request',request.id,championBusinessPurpose,contextKey,['Champion'])?requestChampionEligibility(data,request).issue:'';
  const pendingNeeds=approvalNeeds.filter(need=>!approvalSatisfied(data,'Request',request.id,need.purpose,contextKey,need.roles));
  const onlyChampionApproval=!technicalOpen&&pendingNeeds.length>0&&pendingNeeds.every(need=>need.purpose===championBusinessPurpose);
  const nextAction=championRoutingIssue?'Resolve Champion eligibility':linkNeeded?'Reconcile accepted workspace identity':waitingOnBusiness?'Complete request':
    shownStage==='Awaiting approval'?'Review required approvals':shownStage==='Ready for implementation'?'Record external implementation':
    shownStage==='Awaiting effective date'?'Wait for the recorded effective date':
    ['Ready for registration','Ready for business update'].includes(shownStage)?'Save approved business metadata':
    shownStage==='Business information required'?'Correct business information':shownStage==='Changes required'?'Correct technical intent':'Verify implementation';
  return {
    request,stage,technicalStage,contextKey,approvalNeeds,technicalApprovalNeeds:technicalApprovalNeeds(request),
    approvalsSatisfied:approvalNeeds.every(need=>approvalSatisfied(data,'Request',request.id,need.purpose,contextKey,need.roles)),
    businessIssue:championRoutingIssue||businessApplicationIssue(request,data,asOf),championRoutingIssue,
    correctionAvailable:stage!=='Superseded'&&(['Changes required','Business information required'].includes(stage)||technicalStage==='Changes required'),
    open:!['Complete','Superseded'].includes(stage)||linkNeeded||technicalOpen,
    needsRegistryLink:linkNeeded,hasOpenTechnicalWork:linkedTechnical,technicalOpen,shownStage,
    queueStatus:linkNeeded?'Awaiting registry link':technicalOpen?'Technical work · '+shownStage:stage,
    nextAction,waitingOnBusiness,awaitingApproval:shownStage==='Awaiting approval',
    assignee:championRoutingIssue?'Platform Manager':onlyChampionApproval?'Workspace Champions':waitingOnBusiness?(data.people.find(person=>person.id===(request.createdById||request.ownerId))?.name||'Requester'):
      shownStage==='Business information required'?'Platform Manager':'Platform approval / operations',
  };
}

/** Apply due responsibility on load, after saved changes, or on the local timer. */
export function applyDueRequests(data:RegistryData,asOf=todayLocal()):RegistryData {
  return applyEffectiveBusinessChanges(data,asOf);
}

/** Complete one action, including its event and effective business consequences. */
export function executeRequest(data:RegistryData,command:RequestCommand,context:RequestContext):{data:RegistryData;request:WorkspaceRequest} {
  if(!/(Z|[+-]\d{2}:\d{2})$/i.test(context.now)||!Number.isFinite(Date.parse(context.now)))throw Error('Record a valid action timestamp with its UTC offset.');
  const asOf=calendarDateLocal(context.now);
  data=applyDueRequests(data,asOf);
  const actor=data.people.find(person=>person.id===context.actorId&&person.status==='Active');
  if(!actor)throw Error('The current prototype profile must be active to change a request.');
  const event=(description:string,category:ActivityEvent['category'],workspaceId:string|null,personId=context.actorId):ActivityEvent=>({
    id:context.newId(),workspaceId,date:context.now,actor:data.people.find(person=>person.id===personId)?.name||personId,category,description,
  });
  let next:RegistryData;
  let requestId:string;

  if('draft' in command) {
    const draft=command.draft;
    const actorIssue=requestActorIssue(draft,data,context.actorId);
    if(actorIssue)throw Error(actorIssue);
    if(draft.status!=='Draft')throw Error('Only a draft can be saved or submitted.');
    if(!draft.id.trim())throw Error('A request identity is required.');
    const original=data.requests.find(request=>request.id===draft.id);
    if(data.requests.filter(request=>request.id===draft.id).length>1)throw Error('Duplicate request identity. Resolve it before continuing.');
    if(!original&&draft.supersedesRequestId)throw Error('Create corrections from the saved request.');
    if(original&&draft.supersedesRequestId!==original.supersedesRequestId)throw Error('The request being corrected cannot be changed.');
    if(original?.approvalPolicy==='champion-v1'&&draft.approvalPolicy!=='champion-v1')throw Error('The request approval policy cannot be downgraded.');
    const {execution:_execution,businessApplied:_business,submittedAt:_submitted,...intent}=structuredClone(draft);
    const request:WorkspaceRequest={
      ...intent,approvalPolicy:original?intent.approvalPolicy:'champion-v1',createdById:original?.createdById||context.actorId,createdDate:original?.createdDate||draft.createdDate,
      groups:intent.groups.map(({businessOwnerId:_legacyOwner,...group})=>group),
      ...(command.type==='submit'?{submittedAt:context.now}:{}),status:command.type==='submit'?'Submitted':'Draft',
    };
    if(command.type==='submit') {
      const issues=requestIssues(request,data);
      if(issues.length)throw Error(issues.map(issue=>issue.message).join('\n'));
    }
    requestId=request.id;
    next={...data,requests:[...data.requests.filter(item=>item.id!==request.id),request],events:[...data.events,
      event(`${request.type} request ${request.id} ${command.type==='submit'?'submitted for administrative review':'saved as draft'}.`,'Requested',request.workspaceId||null)]};
  } else {
    const request=storedRequest(data,command.requestId);
    const view=requestView(data,request.id,asOf);
    requestId=request.id;
    if(command.type==='correct') {
      if(!view.correctionAvailable)throw Error('A correction decision is required before creating a replacement.');
      const corrected=correctedRequest(request,data,context.actorId,asOf,context.newId);
      if(data.requests.some(item=>item.id===corrected.id))throw Error('The generated request identity already exists. Retry the correction.');
      requestId=corrected.id;
      next={...data,requests:[...data.requests,corrected],events:[...data.events,event(`Request ${corrected.id} corrects ${request.id}.`,'Requested',request.workspaceId||null)]};
    } else if(command.type==='approve') {
      const ownChampionDecision=usesChampionApproval(request)&&command.role==='Champion'&&command.purpose===championBusinessPurpose&&command.personId===context.actorId;
      if(context.actorId!=='P3'&&!ownChampionDecision)throw Error('A Champion may record only their own business decision. Other approval roles use the administrator profile.');
      if(request.status!=='Submitted'||view.stage==='Superseded')throw Error('Only current submitted intent can receive a decision.');
      if(command.contextKey!==view.contextKey)throw Error('The submitted intent changed. Reload before recording this decision.');
      const technical=separatesTechnicalWork(request)&&command.purpose==='Technical setup';
      const needs=technical?view.technicalApprovalNeeds:view.approvalNeeds;
      const need=needs.find(item=>item.purpose===command.purpose);
      if(!need||!need.roles.includes(command.role))throw Error('The selected purpose and role are not required for this request.');
      if(['Complete','Superseded','Not required'].includes(technical?view.technicalStage:view.stage))throw Error('Approval recording is unavailable at this stage.');
      if(!['Approved','Changes required'].includes(command.decision)||!command.reference.trim())throw Error('Enter a valid decision and approval reference.');
      const receipt:ApprovalRecord={
        id:context.newId(),targetType:'Request',targetId:request.id,purpose:command.purpose,contextKey:view.contextKey,
        role:command.role,personId:command.personId,decision:command.decision,reference:command.reference.trim(),decidedAt:context.now,
        eligibilityEvidence:captureRequestApprovalEligibility(data,request,command.role,command.personId,context.now),
      };
      next={...data,approvals:[...(data.approvals||[]),receipt],events:[...data.events,
        event(`${receipt.purpose}: ${receipt.decision} by ${data.people.find(person=>person.id===receipt.personId)?.name} (${receipt.role}). Reference: ${receipt.reference}`,'Review',request.workspaceId||null,receipt.personId)]};
    } else {
      const delivered=recordRequestExecution(request,data,command.type,command.reference,command.date,context.actorId,asOf);
      next={...data,requests:data.requests.map(item=>item.id===request.id?delivered:item),events:[...data.events,
        event(`${request.id}: ${command.type==='implement'?'external implementation recorded':'implementation verified'} · ${command.reference.trim()}`,'Implemented',request.workspaceId||null)]};
    }
  }
  const settled=applyDueRequests(next,asOf);
  return {data:settled,request:storedRequest(settled,requestId)};
}
