import { useState } from 'react';
import { useRegistry } from '../../data/store';
import { Panel, Badge, Note } from '../../components/ui';
import { ApprovalPanel } from '../../components/ApprovalPanel';
import { EvidenceFields } from '../../components/WorkflowFields';
import { separatesTechnicalWork } from '../../utils/approvals';
import { requestView } from '../../domain/requests';
import { todayLocal } from '../../utils/workItems';
import type { WorkspaceRequest } from '../../types';

export function RequestExecution({request}:{request:WorkspaceRequest}) {
  const {data,dispatchRequest,viewMode,setNotice}=useRegistry();
  const view=requestView(data,request.id);const r=view.request;
  const businessStage=view.stage;const stage=view.technicalStage;
  const [reference,setReference]=useState('');const [date,setDate]=useState(todayLocal());
  function record(action:'implement'|'verify') {
    const next=dispatchRequest({type:action,requestId:r.id,reference,date});
    if(!next)return;
    setReference('');setNotice(action==='implement'?'Implementation recorded. Verification is still required.':'Technical work verified. Platform observation remains separate evidence.');
  }
  return <>
    {separatesTechnicalWork(r)&&view.technicalApprovalNeeds.map(need=><ApprovalPanel key={need.purpose} targetType="Request" targetId={r.id} purpose={need.purpose} contextKey={view.contextKey} roles={need.roles} workspaceId={r.workspaceId} enabled={!['Complete','Superseded'].includes(stage)}/>)}
    <Panel title={separatesTechnicalWork(r)?'Linked technical work':'Delivery & verification'} subtitle="Business registration, technical work, and platform observation are separate milestones."><div className="panel-body"><Badge>{stage==='Complete'?'Technical work verified':stage}</Badge>
    {separatesTechnicalWork(r)&&<p>Business change: {businessStage==='Complete'?'Complete':businessStage}. {stage==='Not required'?'No platform changes were requested.':'Required technical work remains linked to this request.'}</p>}
    {stage==='Awaiting approval'&&<p>Record the required approvals before technical implementation.</p>}
    {r.execution?.implementationReference&&<p>Implementation: {r.execution.implementationReference}<small>{r.execution.implementedAt}</small></p>}
    {stage==='Complete'&&<p>Verification: {r.execution?.verificationReference}<small>{r.execution?.verifiedAt}</small></p>}
    {['Ready for implementation','Awaiting verification'].includes(stage)&&viewMode==='Administrator'&&<><div className="form-grid"><EvidenceFields reference={reference} date={date} onReference={setReference} onDate={setDate}/></div><button className="primary" onClick={()=>record(stage==='Ready for implementation'?'implement':'verify')}>{stage==='Ready for implementation'?'Record external implementation':'Verify implementation'}</button></>}
    {view.needsRegistryLink&&<Note tone="warning">Next action: reconcile this request with an accepted platform workspace identity. The request stays in My work until linked. The prototype has no import or linking service.</Note>}
    <Note>These records track external work. This prototype does not create resources or refresh platform inventory. Business registration alone does not establish technical compliance.</Note>
  </div></Panel></>;
}
