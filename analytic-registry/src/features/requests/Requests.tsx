import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Check, Save, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { standardTemplate } from '../../data/standard';
import { useRegistry } from '../../data/store';
import { platforms, customReasons, rulesConfig, nativeTerm } from '../../data/mock';
import { GroupSpecifications } from './GroupSpecifications';
import { RequestExecution } from './RequestExecution';
import { PersonField } from '../../components/WorkflowFields';
import { WorkspaceLink } from '../../components/RecordMapping';
import { StepNav } from '../../components/StepNav';
import { ApprovalPanel } from '../../components/ApprovalPanel';
import { Title, Panel, Badge, Field, Note, Empty, Select, Trail } from '../../components/ui';
import { currentChampionIds } from '../../utils/authority';
import { requestView } from '../../domain/requests';
import { ownsRequest, championApprovalAssigned, businessPersonId, adminPersonId, todayLocal } from '../../utils/workItems';
import { requestGroupPurposes, newRequestGroup, withTechnicalGroupSpecifications, renameGeneratedGroups } from '../../utils/requestGroups';
import { requestActorIssue } from '../../utils/workflowActors';
import { requestIssues } from '../../utils/logic';
import { requiresTechnicalWork, usesChampionApproval, requestChampionEligibility, separatesTechnicalWork } from '../../utils/approvals';
import type { WorkspaceRequest, RequestType, Platform } from '../../types';

export function RequestList(){
  const {data,viewMode}=useRegistry();
  const [params]=useSearchParams();
  const personId=viewMode==='Business'?businessPersonId:adminPersonId;
  const rows=data.requests.map(request=>requestView(data,request.id)).filter(view=>(params.get('scope')!=='mine'||(ownsRequest(view.request,personId)||championApprovalAssigned(data,view.request,personId)))&&(params.get('status')!=='open'||view.open));
  const options:[RequestType,string][]=[['Create New','Request a workspace and its initial setup.'],['Register Existing','Add business context to a discovered workspace.'],['Update Existing','Update business details or request platform changes.']];
  return <>
    <Title title="Requests" description="Create, register, or update a workspace." actions={<Link className="button primary" to="/requests/new"><Plus size={16}/>New request</Link>}/>
    <div className="request-types">{options.map(([type,description])=><Link className="request-type" key={type} to={'/requests/new?type='+encodeURIComponent(type)}><h2>{type}</h2><p>{description}</p><ArrowRight size={18}/></Link>)}</div>
    <Panel title="Request history" subtitle="Business completion and technical work are separate milestones."><div className="table-wrap"><table><thead><tr><th>Request</th><th>Workspace</th><th>Platform</th><th>Business status</th><th>Technical work</th><th>Next action</th></tr></thead><tbody>{rows.map(view=><tr key={view.request.id}>
      <td><Link to={'/requests/'+view.request.id}>{view.request.id}</Link><small>{view.request.type}</small></td><td><WorkspaceLink id={view.request.workspaceId} proposedName={view.request.businessName}/></td><td>{view.request.platform}</td>
      <td><Badge>{view.stage==='Complete'?(separatesTechnicalWork(view.request)?'Business complete':'Delivery recorded'):view.stage}</Badge></td><td><Badge>{view.technicalStage}</Badge></td><td><Link to={'/requests/'+view.request.id}>{view.open?view.nextAction:'View record'} →</Link></td>
    </tr>)}</tbody></table>{!rows.length&&<Empty text="No requests match this view."/>}</div></Panel>
  </>;
}

export function RequestForm(){const location=useLocation();return <RequestFormContent key={location.pathname+location.search}/>;}
function RequestFormContent(){
  const {data,dispatchRequest,setNotice,viewMode}=useRegistry();
  const {id}=useParams();const [params]=useSearchParams();const navigate=useNavigate();
  const existing=data.requests.find(request=>request.id===id);
  const initialType=(['Create New','Register Existing','Update Existing'].includes(params.get('type')||'')?params.get('type'):'Create New') as RequestType;
  const actorId=viewMode==='Business'?businessPersonId:adminPersonId;

  function loadWorkspace(base:WorkspaceRequest,workspaceId:string):WorkspaceRequest{
    const workspace=data.workspaces.find(item=>item.id===workspaceId);
    if(!workspace)return {...base,workspaceId:'',nativeWorkspaceId:''};
    const configuration=data.configurations.find(item=>item.id===workspace.requestedVersionId);
    const groups=data.groups.filter(group=>group.configurationVersionId===workspace.requestedVersionId).map(group=>({...group,id:crypto.randomUUID()}));
    return {...base,workspaceId:workspace.id,nativeWorkspaceId:workspace.nativeId,platform:workspace.platform,classification:workspace.classification,criticality:workspace.criticality,
      containsPii:workspace.containsPii||'',containsEuct:workspace.containsEuct||'',highestDmpTier:workspace.highestDmpTier||'',businessName:workspace.businessName,purpose:workspace.purpose,ownerId:workspace.ownerId,
      workspaceBusinessLine:workspace.lob,configuration:workspace.configuration,technicalName:workspace.name,championIds:currentChampionIds(data,workspace),groups:requiresTechnicalWork(base)?withTechnicalGroupSpecifications(groups,workspace.name,workspace.configuration):groups,
      customReason:configuration?.customReason||'',customExplanation:configuration?.customExplanation||'',alternateSecurity:configuration?.alternateSecurity||'',alternateAuthentication:configuration?.alternateAuthentication||''};
  }
  const [draft,setDraft]=useState<WorkspaceRequest>(()=>{
    const base:WorkspaceRequest=existing||{id:'REQ-'+crypto.randomUUID().slice(0,8).toUpperCase(),approvalPolicy:'champion-v1',workspaceBusinessLine:'',effectiveDate:todayLocal(),technicalWorkRequired:initialType==='Create New',classification:'Internal',criticality:'Moderate',containsPii:'',containsEuct:'',highestDmpTier:'',type:initialType,platform:'Power BI / Fabric',workspaceId:'',businessName:'',purpose:'',ownerId:'',configuration:'Standard',technicalName:'ANALYTICS_PROD',championIds:[],groups:initialType==='Create New'?requestGroupPurposes.map(purpose=>newRequestGroup(purpose,'ANALYTICS_PROD')):[],customReason:'',customExplanation:'',alternateSecurity:'',alternateAuthentication:'',status:'Draft',createdById:actorId,createdDate:todayLocal()};
    const workspaceId=params.get('workspace');
    return workspaceId&&!existing?loadWorkspace(base,workspaceId):base;
  });
  const savedView=data.requests.some(request=>request.id===draft.id)?requestView(data,draft.id):null;
  const request=savedView?.request.status==='Submitted'?savedView.request:draft;
  const [step,setStep]=useState(existing?.status==='Submitted'?4:0);
  const [errors,setErrors]=useState<string[]>([]);const [personId,setPersonId]=useState('');
  const submitted=request.status==='Submitted';const actorIssue=requestActorIssue(request,data,actorId);const readonly=submitted||!!actorIssue;
  const technical=requiresTechnicalWork(request);
  const steps=technical?[{id:0,label:'Workspace & people'},{id:1,label:'Data & risk'},{id:2,label:'Setup'},{id:3,label:'Groups & access'},{id:4,label:'Review & submit'}]:[{id:0,label:'Workspace & people'},{id:1,label:'Data & risk'},{id:4,label:'Review & submit'}];
  const stepIndex=Math.max(0,steps.findIndex(item=>item.id===step));
  const owner=data.people.find(person=>person.id===request.ownerId);
  const workspace=data.workspaces.find(item=>item.id===request.workspaceId);
  const championEligibility=usesChampionApproval(request)?requestChampionEligibility(data,request):undefined;
  const stage=savedView?.stage||'Draft';
  const championBackupNote=request.championIds.length===1?<Note tone="warning">One Champion is allowed. Add another Champion for backup when possible.</Note>:null;
  const set=(key:keyof WorkspaceRequest,value:unknown)=>setDraft(current=>({...current,[key]:value,...(key==='technicalName'?{groups:renameGeneratedGroups(current.groups,String(value))}:{})}));
  function setTechnical(required:boolean){
    setDraft(current=>{
      if(required)return {...current,technicalWorkRequired:true,groups:withTechnicalGroupSpecifications(current.groups,current.technicalName,current.configuration)};
      const observed=loadWorkspace({...current,technicalWorkRequired:false},current.workspaceId);
      return {...current,technicalWorkRequired:false,technicalName:observed.technicalName,configuration:observed.configuration,groups:observed.groups,customReason:observed.customReason,customExplanation:observed.customExplanation,alternateSecurity:observed.alternateSecurity,alternateAuthentication:observed.alternateAuthentication};
    });
  }
  function nextStep(){const found=readonly?[]:requestIssues(request,data).filter(issue=>issue.step===step).map(issue=>issue.message);setErrors(found);if(!found.length)setStep(steps[Math.min(stepIndex+1,steps.length-1)].id);}
  function save(submit:boolean){
    const issues=submit?requestIssues(request,data):[];setErrors(issues.map(issue=>issue.message));
    if(issues.length){setStep(steps.some(item=>item.id===issues[0].step)?issues[0].step:0);return;}
    const next=dispatchRequest({type:submit?'submit':'save',draft:request});if(!next)return;setDraft(next);
    setNotice(submit?'Request submitted. Approved business responsibility follows its effective date.':'Draft saved in this browser.');
    if(submit)navigate('/requests/'+next.id);
  }
  function correct(){const next=dispatchRequest({type:'correct',requestId:request.id});if(next)navigate('/requests/'+next.id);}
  if(id&&!existing)return <Empty text="Request not found. Return to Requests to select a saved record."/>;
  return <>
    <Trail items={[{label:'Requests',to:'/requests'},{label:existing?request.id:'New request'}]}/>
    <Title title={submitted?'Submitted request':request.type==='Create New'?'New workspace request':request.type==='Register Existing'?'Register existing workspace':'Update existing workspace'} description={technical?'Describe the business need and requested platform changes.':'Update business information. Existing platform details remain read-only.'} actions={<Badge>{stage}</Badge>}/>
    {request.supersedesRequestId&&<Note>Corrects <Link to={'/requests/'+request.supersedesRequestId}>{request.supersedesRequestId}</Link>. New approvals are required.</Note>}
    {actorIssue&&!submitted&&<Note tone="warning">{actorIssue}</Note>}
    <StepNav steps={steps.map(item=>item.label)} step={stepIndex} onChange={index=>{setErrors([]);setStep(steps[index].id);}}/>
    <div className="form-layout"><div>
      {errors.length>0&&<div className="validation" role="alert"><strong>Complete the required information.</strong><ul>{errors.map((error,index)=><li key={index}>{error}</li>)}</ul></div>}
      <fieldset disabled={readonly} className="form-fieldset">
        {step===0&&<Panel title="Workspace & people" subtitle="One accountable Workspace Owner and equal Champions."><div className="panel-body form-grid">
          <Field label="Request type"><Select label="Request type" value={request.type} options={['Create New','Register Existing','Update Existing']} onChange={type=>setDraft(current=>({...current,type:type as RequestType,workspaceId:'',nativeWorkspaceId:'',technicalWorkRequired:type==='Create New',ownerId:'',workspaceBusinessLine:'',championIds:[],purpose:'',businessName:'',technicalName:'ANALYTICS_PROD',configuration:'Standard',customReason:'',customExplanation:'',alternateAuthentication:'',alternateSecurity:'',groups:type==='Create New'?requestGroupPurposes.map(purpose=>newRequestGroup(purpose,'ANALYTICS_PROD')):[]}))}/></Field>
          <Field label="Platform"><Select label="Platform" value={request.platform} options={platforms} onChange={platform=>setDraft(current=>({...current,platform:platform as Platform,workspaceId:'',nativeWorkspaceId:''}))}/></Field>
          {request.type!=='Create New'&&<div className="full">
            <Field label={request.type==='Register Existing'?'Discovered workspace *':'Registered workspace *'} hint="Native identity links business information to platform observations."><select value={request.workspaceId} onChange={event=>setDraft(loadWorkspace(request,event.target.value))}><option value="">Choose a {nativeTerm(request.platform).toLowerCase()}…</option>{data.workspaces.filter(item=>item.platform===request.platform&&((submitted&&item.id===request.workspaceId)||(request.type==='Register Existing'?item.registryStatus==='Discovered':item.registryStatus==='Registered'))).map(item=><option key={item.id} value={item.id}>{item.name} · {item.nativeId}</option>)}</select></Field>
            {workspace&&<div className="observed-preview"><span className="eyebrow">PLATFORM CONTEXT · READ ONLY</span><h3>{workspace.name}</h3><p>Native ID: {workspace.nativeId} · Observation date: {workspace.observedDate||'Not recorded'}</p><p>Coverage: {workspace.observationComplete?'Complete for the recorded scope':'Partial or not verified'}. Registration does not confirm technical compliance.</p></div>}
            <Field label="Does this request need platform changes?" hint="Choose Yes to edit technical setup and access groups."><Select label="Platform changes required" value={technical?'Yes':'No'} options={['No','Yes']} onChange={value=>setTechnical(value==='Yes')}/></Field>
          </div>}
          <Field label="Business name" hint={`${request.businessName.length} / ${rulesConfig.businessNameMax} characters`}><input value={request.businessName} maxLength={rulesConfig.businessNameMax} onChange={event=>set('businessName',event.target.value)}/></Field>
          <PersonField label="Workspace Owner *" hint="One person accountable for this workspace." value={request.ownerId} people={data.people} onChange={value=>set('ownerId',value)}/>
          {usesChampionApproval(request)&&<Field label="Workspace business line *" hint="Confirm the business attribution. Changing the owner does not change this field."><input value={request.workspaceBusinessLine||''} onChange={event=>set('workspaceBusinessLine',event.target.value)} placeholder="e.g. Operations"/></Field>}
          <Field label="Responsibility effective date *" hint="Approved business responsibility starts on this date, independent of technical work."><input type="date" value={request.effectiveDate||''} onChange={event=>set('effectiveDate',event.target.value)}/></Field>
          <div className="full"><Field label="Business purpose *" hint="Which decisions or processes does this workspace support?"><textarea rows={3} maxLength={500} value={request.purpose} onChange={event=>set('purpose',event.target.value)}/></Field></div>
          {owner&&<div className="full observed-preview"><strong>Owner directory context</strong><p>Business line: {owner.lob||'Not recorded'} · Manager: {owner.manager||'Not recorded'}</p><small>Directory information does not determine the Workspace business line.</small></div>}
          <div className="full"><h3>Champions</h3><p className="muted">Choose 1–10 people. All Champions have equal authority. Platform access is managed separately.</p>
            <div className="filter-row"><select aria-label="Add Champion" value={personId} onChange={event=>setPersonId(event.target.value)}><option value="">Choose a Champion…</option>{data.people.map(person=><option key={person.id} value={person.id} disabled={person.status!=='Active'||request.championIds.includes(person.id)}>{person.name} · {person.status==='Unverified'?'Unable to verify':person.status}</option>)}</select><button disabled={!personId||request.championIds.length>=10} onClick={()=>{if(!personId||request.championIds.includes(personId))return;set('championIds',[...request.championIds,personId]);setPersonId('');}}><Plus size={15}/>Add Champion</button><span>{request.championIds.length} / 10</span></div>
            <div className="chips">{request.championIds.map(person=><span className="person-chip" key={person}>{data.people.find(item=>item.id===person)?.name||person}<button aria-label={'Remove '+(data.people.find(item=>item.id===person)?.name||person)} onClick={()=>set('championIds',request.championIds.filter(item=>item!==person))}><X size={13}/></button></span>)}</div>
            {championBackupNote}
          </div>
        </div></Panel>}
        {step===1&&<Panel title="Data & risk" subtitle="Declare the intended workspace content."><div className="panel-body form-grid">
          <Field label="Will this workspace contain PII? *"><Select label="Workspace PII" value={request.containsPii||''} options={['','Yes','No']} onChange={value=>set('containsPii',value)}/></Field>
          <Field label="Will this workspace contain an EUCT? *"><Select label="Workspace EUCT" value={request.containsEuct||''} options={['','Yes','No']} onChange={value=>set('containsEuct',value)}/></Field>
          <Field label="Highest applicable Data Management Policy tier *" hint="Tier 1 is highest, then Tier 2, then Tier 3. Select one tier."><Select label="Highest DMP tier" value={request.highestDmpTier||''} options={['','Tier 1','Tier 2','Tier 3']} onChange={value=>set('highestDmpTier',value)}/></Field>
          <Field label="Data classification"><Select value={request.classification} options={['Public','Internal','Confidential','Restricted']} onChange={value=>set('classification',value)}/></Field>
          <Field label="Business criticality"><Select value={request.criticality} options={['Low','Moderate','High','Critical']} onChange={value=>set('criticality',value)}/></Field>
        </div></Panel>}
        {step===2&&technical&&<Panel title="Technical setup" subtitle="Requested changes are separate from observed platform facts."><div className="panel-body form-grid">
          <Field label="Requested technical name *" hint="Use 3–100 uppercase letters, numbers, or underscores; start with a letter."><input value={request.technicalName} onChange={event=>set('technicalName',event.target.value.toUpperCase())}/></Field>
          <Field label="Configuration type"><Select label="Configuration type" value={request.configuration} options={['Standard','Custom']} onChange={value=>setDraft(current=>({...current,configuration:value as 'Standard'|'Custom',groups:withTechnicalGroupSpecifications(current.groups,current.technicalName,value as 'Standard'|'Custom')}))}/></Field>
          {request.configuration==='Custom'&&<><Field label="Custom reason *"><select value={request.customReason} onChange={event=>set('customReason',event.target.value)}><option value="">Select a reason…</option>{customReasons.map(reason=><option key={reason}>{reason}</option>)}</select></Field><Field label="Alternate authentication"><input value={request.alternateAuthentication} onChange={event=>set('alternateAuthentication',event.target.value)}/></Field><div className="full"><Field label="Alternate security approach"><input value={request.alternateSecurity} onChange={event=>set('alternateSecurity',event.target.value)}/></Field><Field label="Custom explanation" hint="Required for Other."><textarea maxLength={1000} value={request.customExplanation} onChange={event=>set('customExplanation',event.target.value)}/></Field></div><Note>Custom configuration requires Application Owner or Platform Owner approval.</Note></>}
        </div></Panel>}
        {step===3&&technical&&<GroupSpecifications groups={request.groups} technicalName={request.technicalName} custom={request.configuration==='Custom'} directory={data.groups} onChange={groups=>set('groups',groups)}/>}
        {step===4&&<Panel title="Review & submit" subtitle="Submission records intent. It does not change a platform."><div className="panel-body">
          <Field label="Target date (optional)"><input type="date" value={request.targetDate||''} onChange={event=>set('targetDate',event.target.value)}/></Field>
          <dl className="review-summary">{Object.entries({'Request type':request.type,'Platform':request.platform,'Workspace':workspace?.businessName||workspace?.name||'New workspace','Business name':request.businessName,'Business purpose':request.purpose,'Workspace Owner':owner?.name||'Not selected',...(usesChampionApproval(request)?{'Workspace business line':request.workspaceBusinessLine||'Not confirmed'}:{}),'Champions':request.championIds.map(person=>data.people.find(item=>item.id===person)?.name||person).join(', ')||'None','Responsibility effective date':request.effectiveDate||'Not recorded','PII':request.containsPii||'Not answered','EUCT':request.containsEuct||'Not answered','Highest DMP tier':request.highestDmpTier||'Not selected','Platform changes':technical?'Required':'Not requested',...(technical?{'Requested name':request.technicalName,'Configuration':request.configuration,'New group prerequisites':String(request.groups.filter(group=>group.mode==='New').length)}:{})}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value||'—'}</dd></div>)}</dl>
          {championBackupNote}
          {championEligibility&&<Note>{championEligibility.issue||`One eligible Champion approves the business declarations, Workspace Owner, and Champion roster. ${championEligibility.basis==='Proposed initial Champion at decision'?'Initial setup uses an active, verified proposed Champion.':'The current effective roster determines eligibility.'}`}</Note>}
          <Note>Business responsibility follows approval and its effective date. Custom and applicable technical approvals remain separate. Registration does not confirm technical compliance.</Note>
        </div></Panel>}
      </fieldset>
      {submitted&&step===4&&<>
        {savedView?.correctionAvailable&&<Note tone="warning">Submitted intent remains unchanged. <button onClick={correct}>Create corrected request</button></Note>}
        {stage==='Superseded'&&<Note>This request was replaced. Its intent and receipts remain in history.</Note>}
        {savedView?.championRoutingIssue&&<Note tone="warning">{savedView.championRoutingIssue}</Note>}
        {request.effectiveDate&&<Note>Business responsibility: {request.businessApplied?'Effective from '+request.businessApplied.effectiveDate:savedView?.businessIssue||'Ready to record effective responsibility'}.</Note>}
        {(savedView?.approvalNeeds||[]).map(need=><ApprovalPanel key={need.purpose} targetType="Request" targetId={request.id} purpose={need.purpose} contextKey={savedView!.contextKey} roles={need.roles} enabled={!['Complete','Superseded'].includes(stage)} businessOwnerId={request.ownerId} workspaceId={request.workspaceId||null}/>)}
        <RequestExecution request={request}/>
      </>}
      <div className="sticky-actions"><button disabled={stepIndex===0} onClick={()=>setStep(steps[stepIndex-1].id)}><ArrowLeft size={15}/>Back</button><span/>{!submitted&&<button disabled={readonly} onClick={()=>save(false)}><Save size={15}/>Save draft</button>}{stepIndex<steps.length-1?<button className="primary" onClick={nextStep}>Continue <ArrowRight size={15}/></button>:!submitted&&<button className="primary" disabled={readonly} onClick={()=>save(true)}>Submit request <Check size={15}/></button>}</div>
    </div><aside className="form-aside"><span className="eyebrow">{technical?'THE STANDARD PATH':'BUSINESS RESPONSIBILITY'}</span><h3>{technical?'Clear setup. Clear accountability.':'Keep the platform context.'}</h3>
      {technical?<><p>Standard version {rulesConfig.standardVersion}. Use Custom when an alternative is required.</p>{standardTemplate.groups.map((group,index)=><div className="aside-step" key={group.purpose}><b>{index+1}</b><div>{group.label}<small>{group.purpose==='Champion'?'Coordinates business responsibilities. This role does not require publish or modify access.':group.description}</small></div></div>)}</>:<p>Confirm the purpose, business line, Workspace Owner, Champions, and content declarations. Enable platform changes only when needed.</p>}
      <hr/><small>Identity and platform evidence are local samples. Approval records model the workflow; production authorization must run on the server.</small>
    </aside></div>
  </>;
}
