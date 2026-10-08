import { Link } from 'react-router-dom';
import { useRegistry } from '../data/store';

export function WorkspaceLink({ id, proposedName }: { id?: string | null; proposedName?: string }) {
  const { data } = useRegistry();
  const workspace = data.workspaces.find(w => w.id === id);
  if (workspace) return <><Link to={'/workspaces/' + workspace.id}>{workspace.businessName}</Link><small>{workspace.id}</small></>;
  if (id) return <>{id}<small>Workspace record unavailable</small></>;
  if (proposedName !== undefined) return <>{proposedName || 'New workspace'}<small>Requested · not yet registered</small></>;
  return <>No governed workspace</>;
}

export function AssetLink({ id }: { id?: string | null }) {
  const { data } = useRegistry();
  const asset = data.assets.find(a => a.id === id);
  if (asset) return <><Link to={'/assets/' + asset.id}>{asset.name}</Link><small>{asset.id}</small></>;
  return id ? <>{id}<small>Asset record unavailable</small></> : <span title="No asset linked to this record">—</span>;
}

export function RecordMappingCells({ workspaceId, assetId, proposedName }: { workspaceId?: string | null; assetId?: string | null; proposedName?:string }) {
  return <><td><WorkspaceLink id={workspaceId} proposedName={proposedName}/></td><td><AssetLink id={assetId}/></td></>;
}
