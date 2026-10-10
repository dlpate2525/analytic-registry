import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useRegistry } from '../../data/store';
import { workItems, filterWorkItems, workThemes, todayLocal, businessPersonId, adminPersonId } from '../../utils/workItems';
import { Title, Panel, Badge, SearchInput, Select, Empty } from '../../components/ui';
import { RecordMappingCells } from '../../components/RecordMapping';
import { FindingTable } from '../workspaces/Workspaces';
import { platforms, buckets } from '../../data/mock';

export function WorkInbox() {
  const {data:d,viewMode}=useRegistry();const admin=viewMode==='Administrator';const [sp,setSp]=useSearchParams();
  const findings=admin&&sp.get('view')==='findings';const view=sp.get('scope')||(admin?'all':'assigned');
  const [query,setQuery]=useState('');const [theme,setTheme]=useState('All themes');const [platform,setPlatform]=useState(sp.get('platform')||'All platforms');const [bucket,setBucket]=useState('All risk buckets');
  const [severity,setSeverity]=useState('All severities');const [lob,setLob]=useState(sp.get('lob')||'All business lines');
  const changeView=(patch:Record<string,string>)=>{const next=new URLSearchParams(sp);Object.entries(patch).forEach(([k,v])=>v?next.set(k,v):next.delete(k));setSp(next);};
  const all=workItems(d,admin?adminPersonId:businessPersonId,admin);const asOf=todayLocal();
  const matches=(workspaceId:string|null,assetId:string|null,text:string)=>(text+' '+(d.workspaces.find(w=>w.id===workspaceId)?.businessName||'')+' '+(d.assets.find(a=>a.id===assetId)?.name||'')+' '+workspaceId+' '+assetId).toLowerCase().includes(query.toLowerCase());
  const filtered=all.filter(i=>(!sp.get('kind')||i.kind===sp.get('kind'))&&(lob==='All business lines'||i.lob===lob)&&(severity==='All severities'||i.severity===severity)&&(theme==='All themes'||i.theme===theme)&&(platform==='All platforms'||i.platform===platform)&&matches(i.workspaceId,i.assetId,i.id+' '+i.title+' '+i.assignee));
  const rows=filterWorkItems(filtered,view,asOf);
  const findingRows=d.findings.filter(f=>(sp.get('status')!=='open'||!['Closed','Resolved'].includes(f.status))&&(lob==='All business lines'||d.workspaces.find(w=>w.id===f.workspaceId)?.lob===lob)&&(severity==='All severities'||f.severity===severity)&&(platform==='All platforms'||f.platform===platform)&&(bucket==='All risk buckets'||f.bucket===bucket)&&matches(f.workspaceId,f.assetId,f.id+' '+f.rule+' '+f.evidence+' '+f.connectionId));
  const views=[['all','All work'],['assigned','Assigned to me'],['approval','Awaiting approval'],['business','Waiting on business'],['overdue','Overdue']];
  return <><Title title="My work" description="One place for setup, reviews, approvals, and annual assurance." actions={<Link className="button" to="/attestations">Annual reviews</Link>}/>
    <div className="tabs"><button className={!findings?'active':''} onClick={()=>changeView({view:'',scope:view})}>Work inbox</button>{admin&&<button className={findings?'active':''} onClick={()=>changeView({view:'findings'})}>Findings & risk buckets</button>}</div>
    {!findings&&<div className="inbox-views">{views.map(([key,label])=><button className={view===key?'active':''} key={key} onClick={()=>changeView({scope:key})}>{label}<b>{filterWorkItems(filtered,key,asOf).length}</b></button>)}</div>}
    <Panel title={findings?'Findings & risk buckets':views.find(([k])=>k===view)?.[1]||'All work'} subtitle={findings?'Illustrative findings linked to workspace and asset. They are not calculated from a live or uploaded delivery.':'Ordered by due date, then severity. Open a task to complete its next action.'}>
      <div className="table-toolbar"><SearchInput value={query} onChange={setQuery} placeholder={findings?'Search findings, workspace, or asset…':'Search work, workspace, or asset…'}/><Select label="Platform filter" value={platform} onChange={setPlatform} options={['All platforms',...platforms]}/>{findings?<Select label="Risk bucket filter" value={bucket} onChange={setBucket} options={['All risk buckets',...buckets]}/>:<Select label="Work theme" value={theme} onChange={setTheme} options={['All themes',...workThemes]}/>}</div>
      <details className="panel-body"><summary>More filters</summary><div className="filter-row"><Select label="Business line filter" value={lob} onChange={setLob} options={['All business lines',...new Set(d.workspaces.map(w=>w.lob))]}/><Select label="Severity filter" value={severity} onChange={setSeverity} options={['All severities','Critical','High','Medium','Low','Normal']}/><button onClick={()=>{setQuery('');setTheme('All themes');setPlatform('All platforms');setBucket('All risk buckets');setSeverity('All severities');setLob('All business lines');setSp(findings?{view:'findings'}:{scope:view});}}>Clear filters</button></div></details>
      {findings?<FindingTable findings={findingRows}/>:<div className="table-wrap"><table className="mapping-table"><thead><tr><th>Task / next action</th><th>Workspace</th><th>Asset</th><th>Responsible</th><th>Due</th><th>Status</th></tr></thead><tbody>{rows.map(i=><tr key={i.kind+i.id}><td><Link className="strong-link" to={i.href}>{i.title}</Link><small>{i.nextAction}</small><small>{i.theme} · {i.id}</small></td><RecordMappingCells workspaceId={i.workspaceId} assetId={i.assetId} proposedName={i.kind==='Request'?i.title:undefined}/><td>{i.assignee}</td><td>{i.due||'Not scheduled'}{i.due&&i.due<asOf&&<small className="overdue-text">Overdue</small>}</td><td><Badge>{i.status}</Badge></td></tr>)}</tbody></table>{!rows.length&&<Empty text="No work matches this view."/>}</div>}
      <div className="panel-foot">{findings?findingRows.length:rows.length} {findings?'findings':'tasks'} · {admin?'Administrator view':'Your workspace responsibilities'}</div>
    </Panel></>;
}
