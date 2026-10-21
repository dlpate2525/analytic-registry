import { Badge } from './ui';
import { workspaceEvidence } from '../utils/evidence';
import { useRegistry } from '../data/store';
import type { Workspace } from '../types';
export function EvidenceSummary({workspace}:{workspace:Workspace}) {
  const {data}=useRegistry();const state=workspaceEvidence(workspace,data);
  return <div className="evidence-summary">
    <div><strong>Source evidence</strong><small>Observed {workspace.observedDate||'date unavailable'} · Coverage: {state.coverage}</small></div>
    <div><small>Inventory</small><Badge>{state.inventoryAvailable?'Available':'Unavailable'}</Badge></div>
    <div><small>Comparison evidence</small><Badge>{state.controlReady?'Ready':state.status}</Badge></div>
    <span>{state.reason}</span>
  </div>;
}
