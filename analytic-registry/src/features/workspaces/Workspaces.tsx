import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Pencil } from 'lucide-react';
import { currentChampionIds } from '../../utils/authority';
import { isAttestationComplete } from '../../utils/approvals';
import { EvidenceSummary } from '../../components/EvidenceSummary';
import { RecordMappingCells } from '../../components/RecordMapping';
import { useRegistry } from '../../data/store';
import { nativeTerm } from '../../data/mock';
import { comparison } from '../../utils/logic';
import { connectionTechnologyDisplay } from '../../utils/connectionDisplay';
import { Title, Panel, Badge, PlatformMark, Empty, KV, Note, Trail } from '../../components/ui';
import { AssetTable } from '../assets/Assets';
import type { RegistryData, Workspace } from '../../types';
import { isRetiredWorkspace, registrationHref, workspaceBusinessLine, workspaceTab, workspaceTabs, workspaceWork } from './workspaceView';

export { WorkspaceList } from './WorkspaceList';
type WorkspaceContext = { data: RegistryData; workspace: Workspace };
const recorded = (value: string | undefined) => value?.trim() || 'Not recorded';

export function WorkspaceDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useRegistry();
  const workspace = data.workspaces.find(item => item.id === id);
  if (!workspace) return <Empty text="Workspace not found."/>;
  const tab = workspaceTab(searchParams.get('tab'));
  const work = workspaceWork(data, workspace);
  const changeTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next);
  };
  return <>
    <Trail items={[{ label: 'Workspaces', to: '/workspaces' }, { label: workspace.businessName || workspace.name }]}/>
    <Title title={workspace.businessName || workspace.name || workspace.id}
      description={`${workspace.platform} ${nativeTerm(workspace.platform)} · ${recorded(workspace.name)}`}
      actions={<>
        {workspace.registryStatus === 'Discovered'
          ? <Link className="button" to={registrationHref(data, workspace)}><Pencil size={15}/>Register workspace</Link>
          : <Link className="button" to={`/requests/new?type=Update%20Existing&workspace=${encodeURIComponent(workspace.id)}`}><Pencil size={15}/>Request change</Link>}
        <button className="primary" onClick={() => changeTab('Work')}><ArrowUpRight size={16}/>Open work ({work.count})</button>
      </>}/>
    <div className="detail-meta">
      <PlatformMark platform={workspace.platform}/><Badge>{workspace.configuration}</Badge>
      <span>Registration: {workspace.registryStatus === 'Discovered' ? 'Needs registration' : 'Registered'}</span>
      <span>Lifecycle: {recorded(workspace.lifecycle)}</span>
    </div>
    {isRetiredWorkspace(workspace) && <Note>This workspace is recorded as Retired. Its history and outstanding work remain available.</Note>}
    <div className="tabs" role="tablist" aria-label="Workspace sections">
      {workspaceTabs.map(item => <button key={item} id={`workspace-tab-${workspaceTabs.indexOf(item)}`}
        role="tab" aria-selected={tab === item} aria-controls="workspace-tab-content"
        className={tab === item ? 'active' : ''} onClick={() => changeTab(item)}>{item}{item === 'Work' && <b>{work.count}</b>}</button>)}
    </div>
    <div id="workspace-tab-content" role="tabpanel" aria-labelledby={`workspace-tab-${workspaceTabs.indexOf(tab)}`}>
      {tab === 'Overview' && <WorkspaceOverview data={data} workspace={workspace}/>}
      {tab === 'Assets & connections' && <WorkspaceAssets data={data} workspace={workspace}/>}
      {tab === 'Access & configuration' && <WorkspaceAccess data={data} workspace={workspace}/>}
      {tab === 'Work' && <WorkspaceWork data={data} workspace={workspace}/>}
      {tab === 'History' && <WorkspaceHistory data={data} workspace={workspace}/>}
    </div>
  </>;
}

function WorkspaceOverview({ data, workspace }: WorkspaceContext) {
  const owner = data.people.find(person => person.id === workspace.ownerId);
  const championIds = currentChampionIds(data, workspace);
  const businessLine = workspaceBusinessLine(workspace);
  const request = data.requests.find(item => item.id === workspace.businessRequestId);
  const relatedRequests = data.requests.filter(item => item.workspaceId === workspace.id);
  const submitted = relatedRequests.filter(item => item.status === 'Submitted')
    .sort((a, b) => (b.submittedAt || b.createdDate).localeCompare(a.submittedAt || a.createdDate))[0];
  const implementation = data.configurations.find(item => item.id === workspace.implementedVersionId);
  const completedAnnual = data.attestations.filter(item => item.workspaceId === workspace.id && isAttestationComplete(item.status))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const activeChampions = championIds.filter(id => data.people.some(person => person.id === id && person.status === 'Active'));
  return <>
    <div className="two-col">
      <Panel title="Business context" subtitle="Declared purpose and responsibility">
        <div className="panel-body">
          <p className="purpose">{recorded(workspace.purpose)}</p>
          <div className="kv-grid">
            <KV label="Workspace Owner">{owner?.name || workspace.ownerId || 'Not assigned'} <Badge>{owner?.status === 'Unverified' || !owner ? 'Unable to verify' : owner.status}</Badge></KV>
            <KV label="Workspace business line">{businessLine.value} <Badge>{businessLine.status}</Badge></KV>
            <KV label="Will contain PII">{workspace.containsPii || 'Not declared'}</KV>
            <KV label="Will contain an EUCT">{workspace.containsEuct || 'Not declared'}</KV>
            <KV label="Highest DMP tier">{workspace.highestDmpTier || 'Not declared'}</KV>
            <KV label="Effective business change">{request?.businessApplied
              ? <Link to={`/requests/${request.id}`}>{request.id} · {request.businessApplied.effectiveDate}</Link>
              : 'No approved change receipt recorded'}</KV>
          </div>
          <p className="muted">Workspace business line: {businessLine.detail}</p>
          {(!owner || owner.status !== 'Active') && <Note>Workspace Owner identity needs Platform Manager follow-up. An unresolved identity does not establish inactivity.</Note>}
          <details>
            <summary>Business details</summary>
            <div className="kv-grid">
              <KV label="Classification">{recorded(workspace.classification)}</KV>
              <KV label="Business criticality">{recorded(workspace.criticality)}</KV>
              <KV label="Recorded content readiness">{recorded(workspace.contentReadiness)}</KV>
            </div>
          </details>
        </div>
      </Panel>
      <Panel title="Champions" subtitle="Equal authority for workspace business responsibilities">
        <div className="panel-body">
          {championIds.map(id => {
            const person = data.people.find(item => item.id === id);
            return <div className="person-row" key={id}>
              <span className="avatar">{person?.name.split(' ').map(word => word[0]).join('') || '?'}</span>
              <div><strong>{person?.name || id}</strong><small>{person?.email || 'Directory identity not resolved'}</small></div>
              <Badge>{!person || person.status === 'Unverified' ? 'Unable to verify' : person.status}</Badge>
            </div>;
          })}
          {!championIds.length && <Empty text="No current Champion assignment is recorded."/>}
          <Note>All current Champions have equal authority. Champion responsibility neither grants nor requires publish/modify access.</Note>
          {activeChampions.length !== championIds.length && <p className="muted">Inactive or unresolved Champion identities require Platform Manager follow-up.</p>}
        </div>
      </Panel>
    </div>
    <EvidenceSummary workspace={workspace}/>
    <Panel title="Recorded milestones" subtitle="Each milestone uses its own records. No milestone proves another is complete.">
      <div className="panel-body kv-grid">
        <KV label="Request submitted">{submitted
          ? <Link to={`/requests/${submitted.id}`}>{submitted.id} · {submitted.submittedAt || submitted.createdDate}</Link>
          : 'No submitted request recorded'}</KV>
        <KV label="Business registration">{workspace.registryStatus === 'Registered' ? 'Registered' : 'Needs registration'}</KV>
        <KV label="Technical implementation">{implementation
          ? <>Recorded configuration v{implementation.version}<small>{recorded(implementation.createdDate)} · observed state is separate</small></>
          : 'No implementation record'}</KV>
        <KV label="Annual Attestation">{completedAnnual
          ? <Link to={`/attestations/${completedAnnual.id}`}>{completedAnnual.period} · {completedAnnual.status}</Link>
          : 'No completed Annual Attestation recorded'}</KV>
      </div>
    </Panel>
    <Panel>
      <details className="panel-body">
        <summary>Record details</summary>
        <div className="kv-grid">
          <KV label="Registry workspace ID">{workspace.id}</KV>
          <KV label="Native workspace ID">{recorded(workspace.nativeId)}</KV>
          <KV label="Technical name">{recorded(workspace.name)}</KV>
          <KV label="Workspace Owner person ID">{recorded(workspace.ownerId)}</KV>
          <KV label="Owner directory business line">{owner?.lob || 'Not recorded'}</KV>
          <KV label="Original onboarding business line">{recorded(workspace.originalOwnerLob)}</KV>
          <KV label="Owner manager">{owner?.manager || 'Not recorded'}</KV>
          <KV label="Requester">{data.people.find(person => person.id === workspace.requesterId)?.name || workspace.requesterId || 'Not recorded'}</KV>
          <KV label="Created">{recorded(workspace.createdDate)}</KV>
        </div>
      </details>
    </Panel>
  </>;
}

function WorkspaceAssets({ data, workspace }: WorkspaceContext) {
  const assets = data.assets.filter(asset => asset.workspaceId === workspace.id);
  const assetIds = new Set(assets.map(asset => asset.id));
  const links = data.lineage.filter(link => assetIds.has(link.assetId));
  return <>
    <Note>These assets use this workspace for business accountability. Observed workspace membership is not recorded in this prototype dataset.</Note>
    <Panel title="Accountable assets" subtitle="Business association · separate from where the platform currently stores an asset">
      {assets.length ? <AssetTable assets={assets}/> : <Empty text="No accountable asset association is recorded. This does not establish that the platform workspace contains no assets."/>}
      <div className="panel-foot">Platform asset membership coverage: Not recorded. Use an asset's association action to confirm responsibility.</div>
    </Panel>
    <Panel title="Asset connections" subtitle="Accountable workspace → asset → recorded connection → endpoint">
      <div className="table-wrap">
        <table><thead><tr><th>Asset</th><th>Connection</th><th>Technology</th><th>Endpoint</th><th>Evidence</th></tr></thead>
          <tbody>{links.map((link, index) => {
            const connection = data.connections.find(item => item.id === link.connectionId);
            const asset = assets.find(item => item.id === link.assetId);
            const display = connectionTechnologyDisplay(connection?.technology);
            return <tr key={`${link.assetId}:${link.connectionId}:${index}`}>
              <td><Link to={`/assets/${link.assetId}`}>{asset?.name || link.assetId}</Link></td>
              <td>{connection ? <details><summary>{connection.name || connection.id}</summary>
                <div className="detail-pop">
                  <p>Registry connection ID: {connection.id}</p>
                  <p>Recorded data source reference: {recorded(connection.dataSourceId)}</p>
                  <p>Identity: {recorded(connection.identityClassification)}</p>
                  <p>Authentication: {recorded(connection.authenticationType)}</p>
                  <p>Gateway: {recorded(connection.gatewayId)}</p>
                  <p>Credential reference: {recorded(connection.credentialReferenceId)}</p>
                  <p>Recorded user: {recorded(connection.username)}</p>
                  <p>Environment: {recorded(connection.environment)}</p>
                  <p>Created by: {recorded(connection.createdBy)}</p>
                  <p>Source modified: {recorded(connection.modifiedDate)}</p>
                  <p>Status: {recorded(connection.status)}</p>
                </div>
              </details> : <>{link.connectionId || 'Missing connection ID'}<small>Unresolved reference · Platform Manager follow-up</small></>}</td>
              <td>{display.technology}{display.processingNote && <small>{display.processingNote}</small>}</td>
              <td>{connection
                ? <>{connection.hostname || 'Host not recorded'}{connection.port ? `:${connection.port}` : ''}<small>{connection.database || 'Database not recorded'}{connection.schema ? ` · ${connection.schema}` : ''}</small></>
                : 'Unable to verify'}</td>
              <td>Observation date not recorded<small>Dataset coverage not recorded</small></td>
            </tr>;
          })}</tbody>
        </table>
        {!links.length && <Empty text="No asset-to-connection evidence is recorded for these accountable assets. Connection use and dataset coverage remain unknown."/>}
      </div>
      <div className="panel-foot">Endpoint details describe native connections. Matching host or database text does not establish a shared data source.</div>
    </Panel>
  </>;
}

function WorkspaceAccess({ data, workspace }: WorkspaceContext) {
  const principals = data.principals.filter(item => item.workspaceId === workspace.id);
  const effectiveAccess = data.effectiveAccess.filter(item => item.workspaceId === workspace.id);
  const requested = data.configurations.find(item => item.id === workspace.requestedVersionId);
  const implemented = data.configurations.find(item => item.id === workspace.implementedVersionId);
  // Workspace-level coverage cannot prove that an access dataset is complete.
  const comparisonRows = comparison(workspace, data).filter(item => item.field !== 'Champion roster').map(item => ({
    ...item,
    observed: item.field === 'Direct user access' && !principals.some(principal => principal.kind === 'User')
      ? 'No direct-user rows recorded' : item.observed,
    status: item.status === 'Pending Implementation' ? item.status : 'Unable to Verify',
    note: `${item.note} Access dataset coverage is not recorded.`,
  }));
  return <>
    <Note>Workspace observation: {recorded(workspace.observedDate)}. Access dataset coverage is not recorded, so complete access reconciliation cannot be established.</Note>
    <Panel title="Configuration" subtitle="Requested intent, recorded implementation, and platform observations stay separate.">
      <div className="panel-body kv-grid">
        <KV label="Configuration">{workspace.configuration}</KV>
        <KV label="Standard version">{recorded(workspace.standardVersion)}</KV>
        <KV label="Requested configuration">{requested ? `Version ${requested.version} · ${requested.createdDate}` : 'Not recorded'}</KV>
        <KV label="Recorded implementation">{implemented ? `Version ${implemented.version} · ${implemented.createdDate}` : 'Not recorded'}</KV>
      </div>
      <div className="table-wrap"><table className="comparison-table">
        <thead><tr><th>Configuration area</th><th>Requested</th><th>Implemented</th><th>Observed</th><th>Comparison result</th></tr></thead>
        <tbody>{comparisonRows.map(item => <tr key={item.field}>
          <td><strong>{item.field}</strong><small>{item.note}</small></td>
          <td>{item.requested}</td><td>{item.implemented}</td><td>{item.observed}</td><td><Badge>{item.status}</Badge></td>
        </tr>)}</tbody>
      </table></div>
      {workspace.configuration === 'Custom' && <details className="panel-body">
        <summary>Custom configuration details</summary>
        {[['Requested', requested], ['Implemented', implemented]].map(([label, value]) => {
          const configuration = typeof value === 'object' ? value : undefined;
          return <div key={String(label)}><h3>{String(label)}</h3><div className="kv-grid">
            <KV label="Reason">{configuration?.customReason || 'Not recorded'}</KV>
            <KV label="Explanation">{configuration?.customExplanation || 'Not recorded'}</KV>
            <KV label="Alternate security">{configuration?.alternateSecurity || 'Not recorded'}</KV>
            <KV label="Alternate authentication">{configuration?.alternateAuthentication || 'Not recorded'}</KV>
          </div></div>;
        })}
        <Note>Custom configuration requires its recorded approvals. A Custom label alone does not establish an exception or a failure.</Note>
      </details>}
    </Panel>
    <Panel title="Observed principals" subtitle="Workspace × principal × access level">
      <div className="panel-body"><Note>Access dataset coverage is not recorded. Each supplied principal retains its evidence date. Champion group membership does not grant native access.</Note></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Principal</th><th>Type / purpose</th><th>Access</th><th>Principal ID</th><th>Evidence date</th></tr></thead>
        <tbody>{principals.map(principal => <tr key={principal.id}>
          <td><details><summary>{principal.name || principal.principalId}</summary><div className="detail-pop">
            <strong>Recorded members</strong>
            {principal.memberIds.length ? principal.memberIds.map(id => {
              const person = data.people.find(item => item.id === id);
              return <p key={id}>{person?.name || id} · {person?.status === 'Unverified' || !person ? 'Unable to verify' : person.status}</p>;
            }) : <p>No member rows recorded. Membership completeness is unknown.</p>}
          </div></details></td>
          <td>{principal.kind}<small>{recorded(principal.purpose)}</small></td><td>{recorded(principal.accessLevel)}</td>
          <td className="mono">{recorded(principal.principalId)}</td><td>{recorded(principal.evidenceDate)}</td>
        </tr>)}</tbody>
      </table>{!principals.length && <Empty text="No principal evidence is recorded. This does not establish that nobody has platform access."/>}</div>
    </Panel>
    <Panel title="Effective user access" subtitle="Recorded access through a principal · separate from Champion responsibility">
      <div className="table-wrap"><table>
        <thead><tr><th>User</th><th>Effective access</th><th>Via principal</th><th>Evidence</th></tr></thead>
        <tbody>{effectiveAccess.map((access, index) => {
          const person = data.people.find(item => item.id === access.userId);
          const principal = principals.find(item => item.principalId === access.viaPrincipalId);
          return <tr key={`${access.userId}:${access.viaPrincipalId}:${access.accessLevel}:${index}`}>
            <td>{person?.name || access.userId}<small>{person?.status === 'Unverified' || !person ? 'Unable to verify · Platform Manager follow-up' : person.status}</small></td>
            <td>{recorded(access.accessLevel)}</td><td>{principal?.name || access.viaPrincipalId || 'Unresolved reference'}</td>
            <td>Effective-access observation date not recorded<small>Dataset coverage not recorded</small></td>
          </tr>;
        })}</tbody>
      </table>{!effectiveAccess.length && <Empty text="No effective-user-access evidence is recorded. Completeness and platform access remain unknown."/>}</div>
    </Panel>
  </>;
}

function WorkspaceWork({ data, workspace }: WorkspaceContext) {
  const work = workspaceWork(data, workspace);
  return <>
    <Panel title={`Open work (${work.count})`} subtitle="Requests, Review cases, Findings, and Annual Attestation">
      {work.count === 0 ? <Empty text="No open work recorded. This does not establish compliance."/> : <div className="table-wrap">
        <table><thead><tr><th>Item</th><th>Assignee</th><th>Status</th><th>Due date</th><th>Next action</th></tr></thead>
          <tbody>{work.items.map(item => <tr key={`${item.kind}:${item.id}`}>
            <td><Link to={item.href}>{item.title.replace(/annual review/gi, 'Annual Attestation')}</Link><small>{item.kind === 'Annual review' ? 'Annual Attestation' : item.kind === 'Review' ? 'Review case' : item.kind} · {item.id}</small></td>
            <td>{item.assignee || 'Not assigned'}</td><td><Badge>{item.status}</Badge></td><td>{item.due || 'Not recorded'}</td>
            <td><Link to={item.href}>{item.nextAction} →</Link></td>
          </tr>)}
          {work.unlinkedFindings.map(finding => <tr key={`Finding:${finding.id}`}>
            <td><details><summary>{finding.rule}<small>Finding · {finding.id}</small></summary>
              <div className="detail-pop"><p>{finding.evidence}</p><p>Remediation: {finding.remediation}</p><p>Verification: {finding.verification}</p></div>
            </details></td>
            <td>{finding.responsibleRole || 'Not assigned'}</td><td><Badge>{finding.status}</Badge></td><td>Not recorded</td>
            <td>Review the finding<small>No linked open Review case</small></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <div className="panel-foot">A Finding linked to an open Review case counts through that case.</div>
    </Panel>
    <Panel>
      <details className="panel-body">
        <summary>All workspace Findings ({work.findings.length})</summary>
        <FindingTable findings={work.findings}/>
        {data.reviews.filter(review => review.findingIds?.some(id => work.findings.some(finding => finding.id === id))).map(review =>
          <div className="list-link" key={review.id}><span>{review.id} · {review.findingIds?.join(', ')}</span><Badge>{review.status}</Badge><Link to={`/reviews/${review.id}`}>Open Review case →</Link></div>)}
      </details>
    </Panel>
    <Panel title="Annual Attestation">
      <div className="panel-body">
        <div className="kv-grid"><KV label="Recorded last attestation">{recorded(workspace.lastAttestation)}</KV><KV label="Recorded next attestation">{recorded(workspace.nextAttestation)}</KV></div>
        {data.attestations.filter(item => item.workspaceId === workspace.id).map(item => <div className="list-link" key={item.id}>
          <span>{item.period} Annual Attestation</span><Badge>{item.status}</Badge><Link to={`/attestations/${item.id}`}>Open attestation →</Link>
        </div>)}
        {!data.attestations.some(item => item.workspaceId === workspace.id) && <Empty text="No Annual Attestation record is available."/>}
      </div>
    </Panel>
  </>;
}

function WorkspaceHistory({ data, workspace }: WorkspaceContext) {
  const events = data.events.filter(event => event.workspaceId === workspace.id).slice().sort((a, b) => b.date.localeCompare(a.date));
  const requests = data.requests.filter(request => request.workspaceId === workspace.id);
  const reviews = data.reviews.filter(review => review.workspaceId === workspace.id);
  const attestations = data.attestations.filter(attestation => attestation.workspaceId === workspace.id);
  const origins = [
    ...requests.map(request => ({ id: request.id, kind: 'Request', date: request.submittedAt || request.createdDate, actor: data.people.find(person => person.id === request.createdById)?.name || request.createdById || 'Actor not recorded', href: `/requests/${request.id}`, status: request.status })),
    ...attestations.map(item => ({ id: item.id, kind: 'Annual Attestation', date: item.date, actor: data.people.find(person => person.id === item.respondingChampionId)?.name || item.respondingChampionId || 'Response actor not recorded', href: `/attestations/${item.id}`, status: item.status })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const targetIds = new Set([...requests, ...reviews, ...attestations].map(item => item.id));
  const approvals = (data.approvals || []).filter(approval => targetIds.has(approval.targetId)).slice().sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  return <>
    <Panel title="Workspace history" subtitle="Recorded changes preserve their dates and actors.">
      <div className="panel-body">
        {events.map(event => {
          const origin = origins.find(item => event.description.includes(item.id));
          return <div className="timeline" key={event.id}>
            <Badge>{event.category === 'Attestation' ? 'Annual Attestation' : event.category}</Badge>
            <div><strong>{event.description}</strong><small>{recorded(event.date)} · {recorded(event.actor)}</small>{origin && <Link to={origin.href}>Open {origin.id} →</Link>}</div>
          </div>;
        })}
        {!events.length && <Empty text="No workspace events are recorded."/>}
      </div>
    </Panel>
    <Panel title="Originating records">
      <div className="table-wrap"><table>
        <thead><tr><th>Record</th><th>Recorded date</th><th>Actor</th><th>Status</th></tr></thead>
        <tbody>{origins.map(origin => <tr key={origin.id}><td><Link to={origin.href}>{origin.kind} · {origin.id}</Link></td><td>{recorded(origin.date)}</td><td>{origin.actor}</td><td><Badge>{origin.status}</Badge></td></tr>)}</tbody>
      </table>{!origins.length && <Empty text="No request or Annual Attestation origin records are available."/>}</div>
    </Panel>
    <Panel>
      <details className="panel-body">
        <summary>Approval history ({approvals.length})</summary>
        {approvals.map(approval => <div className="timeline" key={approval.id}>
          <Badge>{approval.decision}</Badge><div><strong>{approval.purpose} · {approval.targetId}</strong>
            <small>{approval.decidedAt} · {data.people.find(person => person.id === approval.personId)?.name || approval.personId} · {approval.role}</small>
            <p>{approval.reference}</p>
          </div>
        </div>)}
        {!approvals.length && <Empty text="No approval receipt is recorded for these workspace records."/>}
      </details>
    </Panel>
  </>;
}

export function FindingTable({ findings }: { findings: import('../../types').Finding[] }) {
  const { data } = useRegistry();
  return <div className="table-wrap"><div className="panel-foot">Saved illustrative findings. Severity prioritizes an issue; it is separate from an asset’s High risk qualification. <Link to="/coverage">Check evidence support</Link>.</div><table>
    <thead><tr><th>Finding / rule</th><th>Workspace</th><th>Asset</th><th>Risk bucket</th><th>Severity</th><th>Result</th><th>Status</th><th>Detection</th></tr></thead>
    <tbody>{findings.map(finding => {
      const linkedReviews = data.reviews.filter(review => review.findingIds?.includes(finding.id));
      return <tr key={finding.id}>
      <td><details><summary><strong>{finding.rule}</strong><small>{finding.id} · {finding.platform}{finding.connectionId && ` · ${finding.connectionId}`}</small></summary>
        <div className="detail-pop"><p>{finding.evidence}</p><p>Responsible: {finding.responsibleRole}</p><p>Remediation: {finding.remediation}</p><p>Verification: {finding.verification}</p></div>
      </details>
        {linkedReviews.length ? linkedReviews.map(review => <small key={review.id}><Link to={'/reviews/' + review.id}>Review case {review.id}</Link> · {review.status}</small>) : <small>No linked Review case</small>}
      </td>
      <RecordMappingCells workspaceId={finding.workspaceId} assetId={finding.assetId}/>
      <td>{finding.bucket}</td><td><Badge>{finding.severity}</Badge></td><td><Badge>{finding.result}</Badge></td><td>{finding.status}</td>
      <td><small>First: {finding.firstDetected}</small><small>Last: {finding.lastDetected}</small></td>
    </tr>;})}</tbody>
  </table>{!findings.length && <Empty text="No findings match this view."/>}</div>;
}
