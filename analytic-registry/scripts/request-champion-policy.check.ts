import { initialData } from '../src/data/mock';
import { applyDueRequests, executeRequest, requestView } from '../src/domain/requests';
import { approvalSatisfied, championBusinessPurpose, requestChampionEligibility, requestKey } from '../src/utils/approvals';
import { championApprovalAssigned, openRequestsFor, workItems } from '../src/utils/workItems';
import { currentChampionIds } from '../src/utils/authority';
import { requestGroupPurposes, newRequestGroup, withTechnicalGroupSpecifications } from '../src/utils/requestGroups';
import type { RegistryData, WorkspaceRequest } from '../src/types';

let count=0,sequence=0;
const day='2026-10-20';const now=day+'T14:00:00Z';
function check(value:unknown,message:string){if(!value)throw Error(message);count++;}
function same(actual:unknown,expected:unknown,message:string){check(JSON.stringify(actual)===JSON.stringify(expected),message);}
const context=(actorId='P1',at=now)=>({actorId,now:at,newId:()=>`POLICY-${++sequence}`});
function fixture(registered=true):RegistryData{
 const data=structuredClone(initialData);const base=data.workspaces[0];
 const workspace={...base,id:'WS-POLICY',name:'An imported workspace name',nativeId:'NATIVE-POLICY',businessRequestId:undefined,ownerId:'P1',configuration:'Standard' as const,registryStatus:registered?'Registered' as const:'Discovered' as const,implementedVersionId:registered?'CFG-BASE':'',requestedVersionId:'CFG-BASE',lob:'Operations'};
 data.workspaces=[workspace];data.requests=[];data.approvals=[];data.groups=[];
 data.champions=registered?[{configurationVersionId:'CFG-BASE',personId:'P2'}]:[];
 data.configurations=[{id:'CFG-BASE',workspaceId:workspace.id,version:1,type:'Standard',technicalName:workspace.name,customReason:'',customExplanation:'',alternateSecurity:'',alternateAuthentication:'',createdDate:'2026-10-01'}];
 return data;
}
function draft(data:RegistryData,changes:Partial<WorkspaceRequest>={}):WorkspaceRequest{
 const workspace=data.workspaces[0];
 return {id:`REQ-CHAMPION-${++sequence}`,approvalPolicy:'champion-v1',type:workspace.registryStatus==='Discovered'?'Register Existing':'Update Existing',platform:workspace.platform,workspaceId:workspace.id,nativeWorkspaceId:workspace.nativeId,workspaceBusinessLine:workspace.lob,businessName:'Business operations',purpose:'Support the monthly operating decision.',ownerId:'P4',championIds:['P4'],classification:'Internal',criticality:'Moderate',containsPii:'No',containsEuct:'No',highestDmpTier:'Tier 2',configuration:workspace.configuration,technicalName:workspace.name,groups:structuredClone(data.groups),customReason:'',customExplanation:'',alternateSecurity:'',alternateAuthentication:'',status:'Draft',createdById:'P1',createdDate:day,effectiveDate:day,technicalWorkRequired:false,...changes};
}
function submit(data:RegistryData,changes:Partial<WorkspaceRequest>={}){return executeRequest(data,{type:'submit',draft:draft(data,changes)},context());}
function approve(data:RegistryData,id:string,personId='P2',purpose=championBusinessPurpose,role='Champion'){
 return executeRequest(data,{type:'approve',requestId:id,contextKey:requestKey(data.requests.find(request=>request.id===id)!),purpose,role,personId,decision:'Approved',reference:'LOCAL-APPROVAL-EVIDENCE'},context('P3'));
}
function rejects(action:()=>unknown,message:string){let failed=false;try{action();}catch{failed=true;}check(failed,message);}

const proposedGroups=withTechnicalGroupSpecifications([],'PLATFORM_WORK','Standard');
same(proposedGroups.map(group=>group.purpose).sort(),requestGroupPurposes.slice().sort(),'Opting into Standard technical work proposes all four missing groups');
check(proposedGroups.every(group=>group.mode==='New'&&!group.groupId),'Missing group proposals remain pending prerequisites, never invented identities');
const data=fixture();const source=JSON.stringify(data);
const omittedPolicy=submit(fixture(),{approvalPolicy:undefined});
check(omittedPolicy.request.approvalPolicy==='champion-v1','New submission cannot select historical approval by omitting policy');
rejects(()=>approve(omittedPolicy.data,omittedPolicy.request.id,'P4','Business ownership / sensitive data / access','Business Owner / Workspace Owner'),'Owner-only approval cannot complete a newly created request');
const omittedSave=executeRequest(fixture(),{type:'save',draft:draft(fixture(),{approvalPolicy:undefined})},context());
check(omittedSave.request.approvalPolicy==='champion-v1','New saved draft receives Champion approval policy at command boundary');
const submitted=submit(data);
check(submitted.request.status==='Submitted','Business-only request submits without valid technical name or groups');
same(JSON.stringify(data),source,'Submitting does not mutate input records');
check(requestView(submitted.data,submitted.request.id,day).technicalStage==='Not required','Business-only Update does not request technical approval');
same(requestChampionEligibility(submitted.data,submitted.request).eligibleIds,['P2'],'Current effective roster determines governed workspace eligibility');
rejects(()=>approve(submitted.data,submitted.request.id,'P4'),'Proposed replacement Champion cannot approve their own appointment');
rejects(()=>approve(submitted.data,submitted.request.id,'P1'),'Workspace Owner role alone does not grant business approval');
check(championApprovalAssigned(submitted.data,submitted.request,'P2'),'Current Champion receives an approval assignment without owner or requester role');
check(openRequestsFor(submitted.data,'P2').some(request=>request.id===submitted.request.id),'Current Champion sees the request in open work');
check(workItems(submitted.data,'P2',false).some(item=>item.id===submitted.request.id&&item.assignedToMe),'Current Champion sees an assigned approval in My work');
check(workItems(submitted.data,'P3',true).some(item=>item.id===submitted.request.id&&!item.assignedToMe),'Administrator simulation does not own a Champion-only approval');
check(requestView(submitted.data,submitted.request.id,day).assignee==='Workspace Champions','Champion-only pending approval has a business-role assignee');
const updated=approve(submitted.data,submitted.request.id);
check(!championApprovalAssigned(updated.data,updated.request,'P2'),'Business approval removes the former Champion approval assignment');
check(!workItems(updated.data,'P2',false).some(item=>item.id===updated.request.id),'Completed business-only request leaves the Champion work queue');
const updatedWorkspace=updated.data.workspaces[0];
check(requestView(updated.data,updated.request.id,day).stage==='Complete','One current Champion approval completes business-only Update');
check(updatedWorkspace.ownerId==='P4','The same approval applies the requested Workspace Owner');
same(currentChampionIds(updated.data,updatedWorkspace),['P4'],'The same approval applies the requested Champion roster');
check(updatedWorkspace.lob==='Operations'&&updatedWorkspace.businessLineStatus==='Declared','Owner change preserves explicit independent business attribution');
same(updated.data.configurations,data.configurations,'Business-only changes create no configuration versions');
same(updated.data.groups,data.groups,'Business-only changes create no technical groups');
same(updated.data.champions,data.champions,'Business responsibility is not duplicated into configuration-linked assignments');
check(updated.data.approvals?.[0].eligibilityEvidence?.eligibleChampionIds?.includes('P2'),'Approval receipt captures eligibility at decision time');
const later=structuredClone(updated.data);later.people=later.people.map(person=>person.id==='P2'?{...person,status:'Inactive'}:person);
check(requestView(later,updated.request.id,day).stage==='Complete','Later roster or directory changes do not reopen completed business work');
check(approvalSatisfied(later,'Request',updated.request.id,championBusinessPurpose,requestKey(updated.request),['Champion']),'Historical Champion receipt remains valid after departure');
const forged=structuredClone(updated.data);forged.approvals![0].eligibilityEvidence=undefined;
check(!approvalSatisfied(forged,'Request',updated.request.id,championBusinessPurpose,requestKey(updated.request),['Champion']),'New Champion policy cannot use a receipt without captured eligibility');
rejects(()=>executeRequest(updated.data,{type:'save',draft:{...updated.request,status:'Draft',purpose:'Changed after submission'}},context()),'Submitted intent remains immutable');
rejects(()=>submit(data,{technicalName:'CHANGED_NAME'}),'Hidden technical changes cannot bypass technical approval');
rejects(()=>submit(data,{workspaceBusinessLine:''}),'Workspace business line needs explicit confirmation');
rejects(()=>submit(data,{effectiveDate:undefined}),'New policy requires an effective date');
const inactive=fixture();inactive.people=inactive.people.map(person=>person.id==='P4'?{...person,status:'Unverified'}:person);
rejects(()=>submit(inactive),'Unverified proposed responsibility cannot become effective');

const noChampion=fixture();noChampion.champions=[];
const routed=submit(noChampion);
const routedView=requestView(routed.data,routed.request.id,day);
check(routedView.assignee==='Platform Manager'&&!!routedView.championRoutingIssue,'Missing eligible current Champion routes explicitly to Platform Manager');
check(routedView.stage==='Business information required','Unresolved approval authority cannot appear approved');
check(workItems(routed.data,'P8',true).some(item=>item.id===routed.request.id&&item.assignedToMe),'Unresolved eligibility is assigned to Platform Manager');
check(workItems(routed.data,'P3',true).some(item=>item.id===routed.request.id&&!item.assignedToMe),'Administrator simulation does not replace Platform Manager routing');
rejects(()=>approve(routed.data,routed.request.id,'P4'),'Registered workspace cannot bootstrap from proposed roster');
rejects(()=>approve(routed.data,routed.request.id,'P8',championBusinessPurpose,'Platform Manager'),'Routing does not grant Platform Manager business approval authority');

const discovered=fixture(false);const bootstrap=submit(discovered,{ownerId:'P1',championIds:['P1']});
same(requestChampionEligibility(bootstrap.data,bootstrap.request).eligibleIds,['P1'],'Initial registration uses a verified proposed Champion when no effective roster exists');
const selfDecision={type:'approve' as const,requestId:bootstrap.request.id,contextKey:requestKey(bootstrap.request),purpose:championBusinessPurpose,role:'Champion',personId:'P1',decision:'Approved' as const,reference:'OWN-DECISION'};
rejects(()=>executeRequest(bootstrap.data,{...selfDecision,personId:'P4'},context('P1')),'Business actor cannot impersonate another approver');
rejects(()=>executeRequest(bootstrap.data,{...selfDecision,purpose:'Custom configuration',role:'Application Owner'},context('P1')),'Business Champion cannot record another approval role');
const registered=executeRequest(bootstrap.data,selfDecision,context('P1'));
check(registered.data.approvals?.at(-1)?.personId==='P1','Business profile records its own eligible Champion decision');
check(registered.data.workspaces[0].registryStatus==='Registered','Eligible initial Champion self-approval registers discovered workspace');
check(registered.data.approvals?.[0].eligibilityEvidence?.basis==='Proposed initial Champion at decision','Initial eligibility is recorded without promoting responsibility early');

const future=submit(fixture(),{effectiveDate:'2026-10-23'});const futureApproved=approve(future.data,future.request.id);
check(!futureApproved.request.businessApplied&&requestView(futureApproved.data,future.request.id,day).stage==='Awaiting effective date','Future responsibility waits after approval');
same(currentChampionIds(futureApproved.data,futureApproved.data.workspaces[0]),['P2'],'Proposed roster is not effective before the recorded date');
const nextPending=submit(futureApproved.data,{effectiveDate:'2026-10-24'});
const nextDecision={type:'approve' as const,requestId:nextPending.request.id,contextKey:requestKey(nextPending.request),purpose:championBusinessPurpose,role:'Champion',personId:'P4',decision:'Approved' as const,reference:'CURRENT-ROSTER'};
rejects(()=>executeRequest(nextPending.data,{...nextDecision,personId:'P2'},context('P2','2026-10-23T14:00:00Z')),'Outgoing Champion cannot approve after the effective roster date');
const justEffective=executeRequest(nextPending.data,nextDecision,context('P4','2026-10-23T14:00:00Z'));
check(justEffective.data.approvals?.at(-1)?.personId==='P4','Command applies due responsibility before checking current Champion authority');
const effective=applyDueRequests(futureApproved.data,'2026-10-23');
check(effective.workspaces[0].ownerId==='P4','Approved responsibility takes effect when due');
same(currentChampionIds(effective,effective.workspaces[0]),['P4'],'Due responsibility updates the business roster');

const technical=submit(fixture(),{technicalWorkRequired:true,technicalName:'NEW_PLATFORM_NAME',groups:requestGroupPurposes.map(purpose=>newRequestGroup(purpose,'NEW_PLATFORM_NAME'))});
const businessApproved=approve(technical.data,technical.request.id);
const split=requestView(businessApproved.data,businessApproved.request.id,day);
check(split.stage==='Complete'&&split.hasOpenTechnicalWork&&split.technicalStage==='Awaiting approval','Business Update completes while linked technical work remains pending');
check(businessApproved.data.workspaces[0].name==='An imported workspace name','Business approval does not overwrite observed native name');
const technicalApproved=approve(businessApproved.data,businessApproved.request.id,'P3','Technical setup','Platform Administrator');
const implemented=executeRequest(technicalApproved.data,{type:'implement',requestId:technical.request.id,reference:'CHANGE-123',date:day},context('P3'));
const verified=executeRequest(implemented.data,{type:'verify',requestId:technical.request.id,reference:'VERIFY-123',date:day},context('P3'));
check(!requestView(verified.data,technical.request.id,day).open,'Verified linked technical work closes the remaining request action');

const customData=fixture();customData.workspaces[0].configuration='Custom';customData.configurations[0].type='Custom';
const custom=submit(customData);const championCustom=approve(custom.data,custom.request.id);
check(!championCustom.request.businessApplied,'Custom business-only request retains separate Custom approval');
const approvedCustom=approve(championCustom.data,custom.request.id,'P4','Custom configuration','Application Owner');
check(!!approvedCustom.request.businessApplied,'Custom and Champion receipts allow business completion without technical work');

const created=submit(fixture(),{type:'Create New',workspaceId:'',nativeWorkspaceId:undefined,technicalWorkRequired:true,technicalName:'NEW_SPACE',championIds:['P1'],groups:requestGroupPurposes.map(purpose=>newRequestGroup(purpose,'NEW_SPACE'))});
const creatorApproved=approve(created.data,created.request.id,'P1');
check(requestView(creatorApproved.data,created.request.id,day).technicalStage==='Awaiting approval','Create New always requires technical approval');
check(creatorApproved.data.workspaces.length===1,'Initial request approval never fabricates native workspace identity');
const firstFuture=submit(fixture(),{effectiveDate:'2026-10-21',technicalWorkRequired:true,technicalName:'FIRST_TECHNICAL_CHANGE',groups:requestGroupPurposes.map(purpose=>newRequestGroup(purpose,'FIRST_TECHNICAL_CHANGE'))});
const firstApproved=approve(firstFuture.data,firstFuture.request.id);
const secondFuture=submit(firstApproved.data,{effectiveDate:'2026-10-22',ownerId:'P1',championIds:['P1'],purpose:'Later business purpose.'});
const secondApproved=approve(secondFuture.data,secondFuture.request.id);
const afterSkippedDay=applyDueRequests(secondApproved.data,'2026-10-23');
check(afterSkippedDay.requests.every(request=>!!request.businessApplied),'Skipped-day settlement records every approved due request');
check(afterSkippedDay.workspaces[0].businessRequestId===secondFuture.request.id&&afterSkippedDay.workspaces[0].ownerId==='P1','Chronological settlement ends with the latest approved responsibility');
check(afterSkippedDay.workspaces[0].requestedVersionId==='CFG-'+firstFuture.request.id,'Later business-only change preserves the earlier effective technical intent');
check(afterSkippedDay.requests.find(request=>request.id===firstFuture.request.id)?.businessApplied?.effectiveDate==='2026-10-21','Earlier request preserves its actual effective date');
check(afterSkippedDay.events.some(event=>event.id==='BUSINESS-'+firstFuture.request.id)&&afterSkippedDay.events.some(event=>event.id==='BUSINESS-'+secondFuture.request.id),'Every due request receives a history event');
same(applyDueRequests(afterSkippedDay,'2026-10-24'),afterSkippedDay,'Repeated settlement neither duplicates receipts nor rolls responsibility backward');
const afterFirstDay=applyDueRequests(secondApproved.data,'2026-10-21');
check(!afterFirstDay.requests.find(request=>request.id===secondFuture.request.id)?.businessApplied,'Later approved business request waits while the earlier technical request takes effect');
const afterDailySettlement=applyDueRequests(afterFirstDay,'2026-10-22');
const afterSingleSettlement=applyDueRequests(secondApproved.data,'2026-10-22');
check(afterDailySettlement.requests.every(request=>!!request.businessApplied),'Daily settlement applies an approved business-only request after technical context changes');
same(afterDailySettlement.workspaces,afterSingleSettlement.workspaces,'Daily and single-run settlement produce the same current business responsibility');
check(requestView(afterDailySettlement,secondFuture.request.id,'2026-10-22').stage==='Complete','Intervening technical intent does not reopen the approved business request');
same(afterDailySettlement.configurations,afterFirstDay.configurations,'Later business-only application leaves the current technical configurations intact');
same(afterDailySettlement.groups,afterFirstDay.groups,'Later business-only application leaves the current technical groups intact');
same(afterDailySettlement.approvals,secondApproved.data.approvals,'Settlement preserves the approval receipts exactly');
same(afterDailySettlement.requests.map(requestKey),secondApproved.data.requests.map(requestKey),'Settlement preserves submitted intent and its approval keys exactly');
check(afterDailySettlement.workspaces[0].nativeId==='NATIVE-POLICY','Daily settlement preserves the native workspace identity');
same(afterDailySettlement.requests.map(request=>request.businessApplied?.effectiveDate),['2026-10-21','2026-10-22'],'Daily settlement records each requested effective date');
check(afterDailySettlement.events.filter(event=>event.id==='BUSINESS-'+firstFuture.request.id).length===1&&afterDailySettlement.events.filter(event=>event.id==='BUSINESS-'+secondFuture.request.id).length===1,'Daily settlement records one business history event for each request');
same(applyDueRequests(afterDailySettlement,'2026-10-23'),afterDailySettlement,'Repeating daily settlement preserves receipts and history without duplication');
rejects(()=>submit(fixture(),{configuration:'Custom'}),'A business-only submission cannot change configuration');
rejects(()=>submit(fixture(),{groups:[newRequestGroup('Data Sources','UNAPPROVED')]}),'A business-only submission cannot introduce technical groups');
for(const status of ['Inactive','Unverified'] as const){
 const unavailable=structuredClone(afterFirstDay);
 unavailable.people=unavailable.people.map(person=>person.id==='P1'?{...person,status}:person);
 const blocked=applyDueRequests(unavailable,'2026-10-22');
 check(!blocked.requests.find(request=>request.id===secondFuture.request.id)?.businessApplied,`${status} proposed responsibility still blocks application after technical context changes`);
 check(requestView(blocked,secondFuture.request.id,'2026-10-22').stage==='Business information required',`${status} proposed responsibility remains visible as required business information`);
}
const changedNative=structuredClone(afterFirstDay);changedNative.workspaces[0].nativeId='DIFFERENT-NATIVE-ID';
check(!applyDueRequests(changedNative,'2026-10-22').requests.find(request=>request.id===secondFuture.request.id)?.businessApplied,'A changed native identity still blocks business application');
const missingApproval=structuredClone(afterFirstDay);missingApproval.approvals=missingApproval.approvals!.filter(approval=>approval.targetId!==secondFuture.request.id);
check(!applyDueRequests(missingApproval,'2026-10-22').requests.find(request=>request.id===secondFuture.request.id)?.businessApplied,'A missing matching approval still blocks business application');
const pendingRegistration=submit(fixture(false),{ownerId:'P1',championIds:['P1'],effectiveDate:'2026-10-22'});
const registrationApproved=approve(pendingRegistration.data,pendingRegistration.request.id,'P1');
const renamedRegistration=structuredClone(registrationApproved.data);renamedRegistration.workspaces[0].name='RENAMED_NATIVE_SPACE';
const registrationApplied=applyDueRequests(renamedRegistration,'2026-10-22');
check(registrationApplied.workspaces[0].registryStatus==='Registered','Approved Champion registration survives a later native name refresh');
check(registrationApplied.workspaces[0].name==='RENAMED_NATIVE_SPACE','Business registration preserves the latest native name');
same(registrationApplied.configurations,renamedRegistration.configurations,'Business-only registration creates no technical configuration after a native refresh');
const legacyRegistrationData=fixture(false);
const legacyDraft=draft(legacyRegistrationData,{approvalPolicy:undefined,ownerId:'P1',championIds:['P1'],effectiveDate:'2026-10-22'});
legacyRegistrationData.requests=[legacyDraft];
const legacyRegistration=executeRequest(legacyRegistrationData,{type:'submit',draft:legacyDraft},context());
const legacyApproved=approve(legacyRegistration.data,legacyRegistration.request.id,'P1','Business ownership / sensitive data / access','Business Owner / Workspace Owner');
const legacyRenamed=structuredClone(legacyApproved.data);legacyRenamed.workspaces[0].name='RENAMED_NATIVE_SPACE';
check(!applyDueRequests(legacyRenamed,'2026-10-22').requests[0].businessApplied,'Historical registration retains its original technical-baseline validation');
const saved=executeRequest(fixture(),{type:'save',draft:draft(fixture())},context());
rejects(()=>executeRequest(saved.data,{type:'save',draft:{...saved.request,approvalPolicy:undefined}},context()),'Saved new-policy draft cannot downgrade to historical owner approval');
console.log(`${count} Champion request policy checks passed.`);
