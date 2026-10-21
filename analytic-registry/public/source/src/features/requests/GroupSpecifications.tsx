import { useState } from 'react';
import { standardTemplate } from '../../data/standard';
import { newRequestGroup, groupSuffix } from '../../utils/requestGroups';
import { Panel, Field, Select, Badge } from '../../components/ui';
import type { GroupSpecification } from '../../types';

export function GroupSpecifications({groups,technicalName,custom,directory,onChange}:{groups:GroupSpecification[];technicalName:string;custom:boolean;directory:GroupSpecification[];onChange:(groups:GroupSpecification[])=>void}) {
  const [extra,setExtra]=useState('');
  const [open,setOpen]=useState<string|null>(null);
  const available=directory.filter((g,i,a)=>g.groupId&&a.findIndex(x=>x.groupId===g.groupId)===i);
  const update=(id:string,patch:Partial<GroupSpecification>)=>onChange(groups.map(g=>g.id===id?{...g,...patch}:g));
  return <Panel title="Groups & access" subtitle={`Standard ${standardTemplate.version} · Ownership follows the workspace. Business users create groups and maintain membership.`}>
    <div className="compact-groups">{groups.map(g=>{
      const definition=standardTemplate.groups.find(x=>x.purpose===g.purpose);
      const expanded=open===g.id;
      return <div className="compact-group" key={g.id}>
        <div className="compact-group-row"><div><strong>{definition?.label||g.purpose}</strong><small>{definition?.description||'Additional Custom group'}</small></div><div><span>{g.requestedName||'Select a group'}</span><small>{g.mode==='New'?'Pending creation':g.groupId||'Directory selection needed'}</small></div><Badge>{g.mode}</Badge><button type="button" aria-expanded={expanded} aria-controls={'group-'+g.id} onClick={()=>setOpen(expanded?null:g.id)}>{expanded?'Done':'Edit'} {definition?.label||g.purpose}</button></div>
        {expanded&&<div id={'group-'+g.id} className="group-editor form-grid"><Field label={g.purpose+' group source'}><Select label={g.purpose+' group mode'} value={g.mode} options={['New','Existing']} onChange={v=>update(g.id,v==='New'?{mode:'New',groupId:'',requestedName:`${technicalName}_${groupSuffix(g.purpose)}`,suggestedName:`${technicalName}_${groupSuffix(g.purpose)}`,provisioningStatus:'Pending prerequisite'}:{mode:'Existing',groupId:'',requestedName:'',provisioningStatus:'Select group'})}/></Field>
          {g.mode==='New'?<Field label={g.purpose+' group name *'} hint={`Suggested: ${technicalName}_${groupSuffix(g.purpose)}`}><input value={g.requestedName} onChange={e=>update(g.id,{requestedName:e.target.value})}/></Field>:<Field label={g.purpose+' directory group *'}><select value={g.groupId} onChange={e=>{const found=available.find(x=>x.groupId===e.target.value);update(g.id,{groupId:e.target.value,requestedName:found?.requestedName||'',displayName:found?.displayName||'',provisioningStatus:found?'Provisioned':'Select group'});}}><option value="">Select existing group…</option>{available.map(x=><option key={x.groupId} value={x.groupId}>{x.requestedName} · {x.groupId}</option>)}</select></Field>}
          {(!definition||custom)&&<button type="button" onClick={()=>onChange(groups.filter(x=>x.id!==g.id))}>Remove group</button>}
        </div>}
      </div>;
    })}</div>
    {custom&&<div className="panel-body filter-row"><input aria-label="Additional group purpose" placeholder="Additional group purpose" value={extra} onChange={e=>setExtra(e.target.value)}/><button disabled={!extra.trim()||groups.some(g=>g.purpose.toLowerCase()===extra.trim().toLowerCase())} onClick={()=>{const group=newRequestGroup(extra.trim(),technicalName);onChange([...groups,group]);setOpen(group.id);setExtra('');}}>Add group</button></div>}
  </Panel>;
}
