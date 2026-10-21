import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useRegistry } from '../../data/store';
import { platforms } from '../../data/mock';
import { adminPersonId, businessPersonId, workspaceIdsFor } from '../../utils/workItems';
import { Title, Panel, Badge, PlatformMark, SearchInput, Select, Empty } from '../../components/ui';
import { isRetiredWorkspace, registrationHref, workspaceBusinessLine, workspaceWork } from './workspaceView';

export function WorkspaceList() {
  const { data, viewMode } = useRegistry();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const platform = searchParams.get('platform') || 'All platforms';
  const businessLine = searchParams.get('lob') || 'All business lines';
  const configuration = searchParams.get('configuration') || 'All configurations';
  const scope = searchParams.get('scope') === 'mine' || (!searchParams.get('scope') && viewMode === 'Business') ? 'My workspaces' : 'All workspaces';
  const includeRetired = searchParams.get('retired') === 'include';
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, {replace: true});
  };
  const myWorkspaceIds = workspaceIdsFor(data, viewMode === 'Administrator' ? adminPersonId : businessPersonId);
  const rows = data.workspaces.filter(workspace =>
    (includeRetired || !isRetiredWorkspace(workspace))
    && (!searchParams.get('registry') || workspace.registryStatus === searchParams.get('registry'))
    && `${workspace.name} ${workspace.businessName}`.toLowerCase().includes(query.toLowerCase())
    && (scope === 'All workspaces' || myWorkspaceIds.has(workspace.id))
    && (platform === 'All platforms' || workspace.platform === platform)
    && (businessLine === 'All business lines' || workspace.lob === businessLine)
    && (configuration === 'All configurations' || workspace.configuration === configuration));

  return <>
    <Title title="Workspaces" description="Find a workspace, check responsibility, and open its work."
      actions={<Link className="button primary" to="/requests/new"><Plus size={16}/>New request</Link>}/>
    <Panel>
      <div className="table-toolbar">
        <SearchInput value={query} onChange={value => setFilter('q', value)} placeholder="Search workspaces…"/>
        <Select value={scope} onChange={value => setFilter('scope', value === 'My workspaces' ? 'mine' : 'all')} options={['My workspaces', 'All workspaces']} label="Workspace scope"/>
        <Select value={platform} onChange={value => setFilter('platform', value === 'All platforms' ? '' : value)} options={['All platforms', ...platforms]} label="Platform filter"/>
        <details className="more-filters">
          <summary>More filters</summary>
          <div>
            <Select value={businessLine} onChange={value => setFilter('lob', value === 'All business lines' ? '' : value)}
              options={['All business lines', ...new Set(data.workspaces.map(workspace => workspace.lob).filter(Boolean))]} label="Business line filter"/>
            <Select value={configuration} onChange={value => setFilter('configuration', value === 'All configurations' ? '' : value)} options={['All configurations', 'Standard', 'Custom']} label="Configuration filter"/>
            <label className="checkbox-row"><input type="checkbox" checked={includeRetired} onChange={event => setFilter('retired', event.target.checked ? 'include' : '')}/>Include retired</label>
            {searchParams.size > 0 && <button onClick={() => setSearchParams({}, {replace: true})}>Clear filters</button>}
          </div>
        </details>
      </div>
      <div className="table-wrap">
        <table className="simple-workspaces">
          <thead><tr><th>Workspace</th><th>Platform</th><th>Workspace Owner</th><th>Status</th><th>Next action</th></tr></thead>
          <tbody>{rows.map(workspace => {
            const owner = data.people.find(person => person.id === workspace.ownerId);
            const line = workspaceBusinessLine(workspace);
            const work = workspaceWork(data, workspace);
            return <tr key={workspace.id}>
              <td><Link className="strong-link" to={`/workspaces/${workspace.id}`}>{workspace.businessName || workspace.name || workspace.id}</Link>
                <small>{line.value}{line.status !== 'Declared' && ` · ${line.status}`}</small></td>
              <td><span className="entity-link"><PlatformMark platform={workspace.platform}/>{workspace.platform}</span></td>
              <td>{owner?.name || workspace.ownerId || 'Not assigned'}
                {(!owner || owner.status !== 'Active') && <small>{owner?.status === 'Inactive' ? 'Inactive' : 'Unable to verify'} · Platform Manager follow-up</small>}</td>
              <td><small>Registration: {workspace.registryStatus === 'Discovered' ? 'Needs registration' : 'Registered'}</small><Badge>{workspace.lifecycle || 'Lifecycle not recorded'}</Badge></td>
              <td>{workspace.registryStatus === 'Discovered'
                ? <Link to={registrationHref(data, workspace)}>Register workspace →</Link>
                : <Link to={`/workspaces/${workspace.id}?tab=Work`}>Open work ({work.count}) →</Link>}</td>
            </tr>;
          })}</tbody>
        </table>
        {!rows.length && <Empty text={includeRetired ? 'No workspaces match these filters.' : 'No workspaces match these filters. Retired workspaces are available under More filters.'}/>}
      </div>
      <div className="panel-foot">{rows.length} workspaces · My workspaces uses Workspace Owner and Champion responsibility.</div>
    </Panel>
  </>;
}
