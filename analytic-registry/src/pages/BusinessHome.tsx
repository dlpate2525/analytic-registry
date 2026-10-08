import { Link } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import { useRegistry } from '../data/store';
import { Title, Metric, Panel, Badge, Empty } from '../components/ui';
import { businessPersonId, workspaceIdsFor, openRequestsFor, dueAttestations, workItems, filterWorkItems } from '../utils/workItems';
export function BusinessHome(){
  const {data:d}=useRegistry();const myIds=workspaceIdsFor(d,businessPersonId);const requests=openRequestsFor(d,businessPersonId);const due=dueAttestations(d,businessPersonId);const actions=filterWorkItems(workItems(d,businessPersonId,false),'assigned');
  return <><Title eyebrow="YOUR ANALYTICS" title="What needs your attention" description="Start with your next action, or find the workspace you need." actions={<Link className="button primary" to="/requests/new"><Plus size={16}/>New request</Link>}/>
    <div className="metrics four"><Metric label="My workspaces" value={myIds.size} to="/workspaces?scope=mine"/><Metric label="My open requests" value={requests.length} to="/requests?scope=mine&status=open"/><Metric label="Actions awaiting me" value={actions.length} to="/reviews?scope=assigned"/><Metric label="Reviews due" value={due.length} detail="Overdue + next 30 days" to="/attestations?scope=mine&due=30"/></div>
    <Panel title="Next actions" subtitle="Your earliest due tasks, across all workflows." actions={<Link to="/reviews?scope=assigned">Open My work →</Link>}><div className="home-tasks">{actions.slice(0,4).map(i=><Link className="home-task" key={i.kind+i.id} to={i.href}><span><strong>{i.title}</strong><small>{i.nextAction} · {i.due?'Due '+i.due:'Due date not scheduled'}</small></span><Badge>{i.status}</Badge><ArrowRight size={17}/></Link>)}{!actions.length&&<Empty text="No actions are currently assigned to you."/>}</div></Panel>
    <div className="home-links"><Link to="/workspaces?scope=mine"><strong>Workspaces & ownership</strong><span>Find people, groups, and content.</span><ArrowRight size={18}/></Link><Link to="/assets"><strong>Assets & connections</strong><span>Trace content to its workspace and sources.</span><ArrowRight size={18}/></Link></div><p className="quiet-help">Prototype identity: Maya Johnson. Counts use the same filters as their destination lists.</p></>;
}
