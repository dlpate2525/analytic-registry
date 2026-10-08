import { Badge } from './ui';
import { workspaceEvidence } from '../utils/evidence';
import { useRegistry } from '../data/store';
import type { Workspace } from '../types';
export function EvidenceSummary({workspace}:{workspace:Workspace}) {
  const {data}=useRegistry();const state=workspaceEvidence(workspace,data);
  return <div className="evidence-summary"><div><strong>Evidence confidence</strong><small>Observed {workspace.observedDate||'date unavailable'}</small></div><Badge>{state.status}</Badge><span>{state.reason}</span></div>;
}
