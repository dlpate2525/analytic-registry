import { useState } from 'react';
import { useRegistry, event } from '../data/store';
import { captureApprovalEligibility, demoRolePeople, latestApproval, requestChampionEligibility, usesChampionApproval } from '../utils/approvals';
import { businessPersonId } from '../utils/workItems';
import { Panel, Field, Note, Badge } from './ui';
import type { ApprovalRecord, RegistryData } from '../types';

type Props={targetType:ApprovalRecord['targetType'];targetId:string;purpose:string;contextKey:string;roles:string[];workspaceId?:string|null;businessOwnerId?:string;enabled?:boolean;onDecision?:(data:RegistryData,approval:ApprovalRecord)=>RegistryData;onRecorded?:(approval:ApprovalRecord)=>void};
export function ApprovalPanel({targetType,targetId,purpose,contextKey,roles,workspaceId=null,businessOwnerId,enabled=true,onDecision,onRecorded}:Props){
  const {data,update,dispatchRequest,setNotice,viewMode}=useRegistry();
  const [role,setRole]=useState(roles[0]);const [selectedPersonId,setPersonId]=useState('');const [reference,setReference]=useState('');const [error,setError]=useState('');
  const receipt=latestApproval(data,targetType,targetId,purpose,contextKey);
  const request=targetType==='Request'?data.requests.find(item=>item.id===targetId):undefined;
  const championEligibility=request&&roles.includes('Champion')?requestChampionEligibility(data,request):undefined;
  const ownChampionDecision=viewMode==='Business'&&!!request&&usesChampionApproval(request)&&roles.includes('Champion')&&!!championEligibility?.eligibleIds.includes(businessPersonId);
  const personId=ownChampionDecision?businessPersonId:selectedPersonId;
  const decisionRole=ownChampionDecision?'Champion':role;
  const eligibleIds=decisionRole==='Champion'?championEligibility?.eligibleIds||[]:decisionRole==='Business Owner / Workspace Owner'?[businessOwnerId]:demoRolePeople[decisionRole]||[];
  function record(decision:ApprovalRecord['decision']){
    if((viewMode!=='Administrator'&&!ownChampionDecision)||!enabled||!roles.includes(decisionRole)||!reference.trim()||!eligibleIds.includes(personId)||!data.people.some(person=>person.id===personId&&person.status==='Active')){setError('An eligible approver and decision reference are required.');return;}
    if(targetType==='Request'){
      const next=dispatchRequest({type:'approve',requestId:targetId,contextKey,purpose,role:decisionRole,personId,decision,reference});
      if(!next)return;setError('');setNotice(`${purpose} ${decision.toLowerCase()}. Approval receipt saved.`);return;
    }
    const decidedAt=new Date().toISOString();
    const approval:ApprovalRecord={eligibilityEvidence:captureApprovalEligibility(data,decisionRole,personId,decidedAt,businessOwnerId),id:crypto.randomUUID(),targetType,targetId,purpose,contextKey,role:decisionRole,personId,decision,reference:reference.trim(),decidedAt};
    if(!update(current=>{const next={...current,approvals:[...(current.approvals||[]),approval],events:[...current.events,event(`${purpose}: ${decision} by ${data.people.find(person=>person.id===personId)?.name} (${decisionRole}). Reference: ${reference}`,'Review',workspaceId,data.people.find(person=>person.id===personId)?.name||'Approver')]};return onDecision?onDecision(next,approval):next;}))return;
    onRecorded?.(approval);setError('');setNotice(`${purpose} ${decision.toLowerCase()}. Approval receipt saved.`);
  }
  if(viewMode==='Business'&&!ownChampionDecision)return <Note>{receipt?'':championEligibility?.issue||''} {purpose}: {receipt?.decision||'Awaiting approval'}. Authorized approvers: {roles.join(' or ')}. {roles.includes('Champion')?'The eligible Champion records their own decision.':'Other approval controls are available in Administrator view.'}</Note>;
  return <Panel title={purpose+' approval'} subtitle={'Authorized role: '+roles.join(' or ')}><div className="panel-body">
    <Note>{ownChampionDecision?'You are recording your own Champion decision.':'Administrator role simulation records the selected eligible approver.'} Production authorization must run on the server.</Note>
    {!receipt&&championEligibility?.issue&&<Note tone="warning">{championEligibility.issue}</Note>}
    {receipt&&<p><Badge>{receipt.decision}</Badge> {data.people.find(person=>person.id===receipt.personId)?.name||receipt.personId} · {receipt.role} · {receipt.decidedAt.slice(0,10)} UTC<small>{receipt.reference} · {receipt.eligibilityEvidence?'Eligibility captured at decision time':'Historical receipt: recorded role and evidence retained'}</small></p>}
    <div className="form-grid">{ownChampionDecision?<Field label="Approver"><div className="readonly-value">{data.people.find(person=>person.id===businessPersonId)?.name} · Champion</div></Field>:<>
      <Field label="Approval role"><select value={role} onChange={event=>{setRole(event.target.value);setPersonId('');}}>{roles.map(item=><option key={item}>{item}</option>)}</select></Field>
      <Field label="Approver"><select value={selectedPersonId} onChange={event=>setPersonId(event.target.value)}><option value="">Select approver…</option>{data.people.filter(person=>eligibleIds.includes(person.id)&&person.status==='Active').map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
    </>}<div className="full"><Field label="Approval reference / note"><input value={reference} onChange={event=>setReference(event.target.value)} placeholder="Decision or evidence reference"/></Field></div></div>
    {error&&<p className="validation" role="alert">{error}</p>}
    <div className="actions" style={{marginTop:18}}><button disabled={!enabled} onClick={()=>record('Changes required')}>Request corrections</button><button className="primary" disabled={!enabled} onClick={()=>record('Approved')}>{ownChampionDecision?'Approve business declarations':'Record approval'}</button></div>
    {!enabled&&<small>Approval recording is unavailable at this stage.</small>}
  </div></Panel>;
}
