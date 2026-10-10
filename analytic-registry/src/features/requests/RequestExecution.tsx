import { useState } from 'react';
import { useRegistry, event } from '../../data/store';
import { Panel, Badge, Note } from '../../components/ui';
import { EvidenceFields } from '../../components/WorkflowFields';
import { recordRequestExecution, requestStage, needsRegistryLink } from '../../utils/workflow';
import { todayLocal } from '../../utils/workItems';
import type { WorkspaceRequest } from '../../types';

export function RequestExecution({request}:{request:WorkspaceRequest}) {
  const {data,update,viewMode,setNotice}=useRegistry();const r=data.requests.find(x=>x.id===request.id)||request;
  const stage=requestStage(r,data);const [reference,setReference]=useState('');const [date,setDate]=useState(todayLocal());const [error,setError]=useState('');
  function record(action:'implement'|'verify') {
    try {const next=recordRequestExecution(r,data,action,reference,date,viewMode==='Administrator'?'P3':'P1');
      if(!update(d=>({...d,requests:d.requests.map(x=>x.id===r.id?next:x),events:[...d.events,event(`${r.id}: ${action==='implement'?'external implementation recorded':'implementation verified'} · ${reference}`,'Implemented',r.workspaceId||null)] })))return;      setReference('');setError('');setNotice(action==='implement'?'Implementation recorded. Verification is still required.':'External delivery verified. Registry reconciliation remains a separate milestone.');
    } catch(e){setError((e as Error).message);}
  }
  return <Panel title="Delivery & verification" subtitle="Approval, external implementation, and verification are separate milestones."><div className="panel-body"><Badge>{stage==='Complete'?'Delivery recorded':stage}</Badge>
    {stage==='Awaiting approval'&&<p>Record the required approvals above before implementation.</p>}
    {r.execution?.implementationReference&&<p>Implementation: {r.execution.implementationReference}<small>{r.execution.implementedAt}</small></p>}
    {stage==='Complete'&&<p>Verification: {r.execution?.verificationReference}<small>{r.execution?.verifiedAt}</small></p>}
    {['Ready for implementation','Awaiting verification'].includes(stage)&&viewMode==='Administrator'&&<><div className="form-grid"><EvidenceFields reference={reference} date={date} onReference={setReference} onDate={setDate}/></div><button className="primary" onClick={()=>record(stage==='Ready for implementation'?'implement':'verify')}>{stage==='Ready for implementation'?'Record external implementation':'Verify implementation'}</button></>}
    {error&&<div role="alert" className="validation">{error}</div>}
    {needsRegistryLink(r,data)&&<Note tone="warning">Next action: reconcile this request with an accepted platform workspace identity. The request stays in My work until linked. The prototype has no import or linking service.</Note>}<Note>These records track external work. This prototype does not create resources or refresh platform inventory.</Note>
  </div></Panel>;
}
