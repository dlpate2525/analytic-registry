import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { useRegistry } from '../../data/store';
import { platforms } from '../../data/mock';
import { WorkspaceLink } from '../../components/RecordMapping';
import { Title, Panel, Badge, PlatformMark, Select, SearchInput, Empty, KV, Field, Note, Trail } from '../../components/ui';
import { businessPersonId, adminPersonId, workspaceIdsFor } from '../../utils/workItems';
import { currentChampionIds } from '../../utils/authority';
import { demoRolePeople } from '../../utils/approvals';
import { todayLocal } from '../../utils/dates';
import { connectionTechnologyDisplay } from '../../utils/connectionDisplay';
import { assetChampionIssue, assetDisplayType, assetWriteToken, changeAssetAssociation, currentAssetEvaluation, riskLabels } from '../../domain/assetGovernance';
import type { Asset, AssetGovernanceEvaluation, RegistryData } from '../../types';
import { assetPersonReference, assetWork } from './assetView';
export { AssessmentForm } from './GovernanceForm';

export function AssetTable({ assets }: { assets: Asset[] }) {
  const { data } = useRegistry();
  return <div className="table-wrap"><table className="simple-workspaces">
    <thead><tr><th>Asset</th><th>Platform</th><th>Accountable workspace</th><th>Governance &amp; risk</th><th>Next action</th></tr></thead>
    <tbody>{assets.map(asset => {
      const evaluation = currentAssetEvaluation(data, asset);
      return <tr key={asset.id}>
        <td><Link className="strong-link" to={'/assets/' + asset.id}>{asset.name}</Link><small>{assetDisplayType(asset)}</small></td>
        <td><span className="entity-link"><PlatformMark platform={asset.platform}/>{asset.platform}</span></td>
        <td>{asset.workspaceId ? <WorkspaceLink id={asset.workspaceId}/> : <>Not confirmed<small>Unresolved associations go to Platform Manager</small></>}</td>
        <td><Badge>{evaluation?.risk || 'Not yet evaluated'}</Badge><small>{evaluation ? evaluation.calculatedPrl + ' · ' + evaluation.evaluatedOn : 'Legacy evidence remains in the record'}</small></td>
        <td><Link to={'/assets/' + asset.id + '?tab=' + encodeURIComponent(asset.workspaceId ? 'Governance & risk' : 'Overview')}>
          {asset.workspaceId ? 'Open Governance & risk →' : 'Confirm workspace →'}
        </Link></td>
      </tr>;
    })}</tbody>
  </table>{!assets.length && <Empty text="No assets match this view. Change the scope or filters to see other records."/>}</div>;
}

export function AssetList() {
  const { data, viewMode } = useRegistry();
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('All platforms');
  const [scope, setScope] = useState(viewMode === 'Business' ? 'My workspace assets' : 'All assets');
  const [risk, setRisk] = useState('All governance states');
  const mine = workspaceIdsFor(data, viewMode === 'Business' ? businessPersonId : adminPersonId);
  const assets = data.assets.filter(asset =>
    (asset.name + ' ' + asset.id).toLowerCase().includes(query.toLowerCase()) &&
    (platform === 'All platforms' || asset.platform === platform) &&
    (scope === 'All assets' || (scope === 'Unconfirmed workspace' ? !asset.workspaceId : !!asset.workspaceId && mine.has(asset.workspaceId))) &&
    (risk === 'All governance states' || (currentAssetEvaluation(data, asset)?.risk || 'Not yet evaluated') === risk));
  return <><Title title="Asset registry" description="Connect analytics assets to workspace accountability and completed governance evidence."/>
    <Panel><div className="table-toolbar">
      <SearchInput value={query} onChange={setQuery} placeholder="Search assets…"/>
      <Select label="Asset scope" value={scope} onChange={setScope} options={['My workspace assets', 'All assets', 'Unconfirmed workspace']}/>
      <Select label="Asset platform" value={platform} onChange={setPlatform} options={['All platforms', ...platforms]}/>
      <details className="more-filters"><summary>More filters</summary><div>
        <Select label="Governance state" value={risk} onChange={setRisk} options={['All governance states', 'Not yet evaluated', ...riskLabels]}/>
      </div></details>
    </div><AssetTable assets={assets}/><div className="panel-foot">{assets.length} assets · This view does not grant permission.</div></Panel>
  </>;
}

function Reference({ value }: { value: string }) {
  return /^https?:\/\/\S+$/i.test(value) ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : <>{value || 'Not recorded'}</>;
}

function EvaluationHistory({ rows, data }: { rows: AssetGovernanceEvaluation[]; data: RegistryData }) {
  if (!rows.length) return <Empty text="No completed Governance & risk evaluation has been recorded under PRL-01."/>;
  return <div className="panel-body">{rows.slice().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).map(row =>
    <details className="assessment-history" key={row.id}>
      <summary>{row.version} · {row.evaluatedOn} <Badge>{row.risk}</Badge></summary>
      <div className="kv-grid">
        <KV label="Evaluation">{row.id}</KV><KV label="Reason">{row.changeKind}</KV>
        <KV label="Recorded by">{data.people.find(person => person.id === row.reviewerId)?.name || row.reviewerId}</KV>
        <KV label="Recorded at">{row.recordedAt}</KV><KV label="Workspace at recording"><WorkspaceLink id={row.workspaceId}/></KV>
        <KV label="Purpose snapshot">{row.purpose}</KV><KV label="Audience snapshot">{row.audience}</KV>
        <KV label="Calculated PRL">{row.calculatedPrl} · {row.methodVersion}</KV>
        <KV label="Qualification basis">{row.qualificationReasons.join('; ') || 'No qualifying condition; complete answers recorded.'}</KV>
        <KV label="Evidence"><Reference value={row.evidenceReference}/></KV>
        <KV label="Comments">{row.comments}</KV><KV label="External follow-up"><Reference value={row.externalWorkReference}/></KV>
      </div>
      <details><summary>Recorded answers</summary><div className="kv-grid">
        {Object.entries(row.answers).map(([key, value]) => <KV key={key} label={key}>{String(value === '' ? 'Unknown' : value)}</KV>)}
      </div></details>
    </details>)}</div>;
}

function AssociationPanel({ asset }: { asset: Asset }) {
  const { data, update, setNotice, viewMode } = useRegistry();
  const initial = !asset.workspaceId;
  const defaultActor = viewMode === 'Business' ? businessPersonId : adminPersonId;
  const [actor, setActor] = useState((demoRolePeople['Platform Manager'] || [])[0] || '');
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [token] = useState(() => assetWriteToken(data, asset));
  const [error, setError] = useState('');
  const options = data.workspaces.filter(workspace => workspace.id !== asset.workspaceId && workspace.platform === asset.platform &&
    workspace.registryStatus === 'Registered' && (!initial || currentChampionIds(data, workspace).includes(defaultActor)));
  function confirm() {
    setError('');
    const context = { actorId: initial ? defaultActor : actor, now: new Date().toISOString(), today: todayLocal(), newId: () => crypto.randomUUID() };
    let failure = '';
    const saved = update(latest => {
      try { return changeAssetAssociation(latest, { assetId: asset.id, workspaceId: target, expectedToken: token, reason, confirmationReference: reference }, context); }
      catch (error) { failure = (error as Error).message; throw error; }
    });
    if (saved) setNotice('Accountable workspace recorded. Native membership and existing work remain unchanged.');
    else setError(failure || 'The association was not saved. Check the notice above.');
  }
  if (!initial && viewMode !== 'Administrator') return <Note>Platform Manager records a transfer or correction using confirmation from the affected workspaces. A platform move does not change accountability.</Note>;
  return <details className="process-help" open={initial}>
    <summary>{initial ? 'Confirm the initial accountable workspace' : 'Transfer or correct accountability'}</summary>
    <div className="panel-body form-grid">
      {!initial && <Field label="Prototype Platform Manager" hint="Local role simulation. Production requires authenticated authorization.">
        <select value={actor} onChange={event => setActor(event.target.value)}>
          {(demoRolePeople['Platform Manager'] || []).filter(id => data.people.some(person => person.id === id && person.status === 'Active'))
            .map(id => <option key={id} value={id}>{data.people.find(person => person.id === id)?.name}</option>)}
        </select>
      </Field>}
      <Field label="Accountable workspace" hint={initial ? 'Registered workspaces where the current profile is a Champion.' : 'Use business confirmation from both affected workspaces.'}>
        <select value={target} onChange={event => setTarget(event.target.value)}>
          <option value="">Select workspace</option>{options.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.businessName}</option>)}
        </select>
      </Field>
      {!initial && <>
        <Field label="Reason *"><textarea value={reason} onChange={event => setReason(event.target.value)}/></Field>
        <Field label="Business confirmation reference *"><input value={reference} onChange={event => setReference(event.target.value)}/></Field>
      </>}
      <div className="full">
        <Note>{initial ? 'Confirm business accountability independently of observed platform membership.' : 'Missing or disputed confirmation leaves the current association unchanged. This action does not close or reassign cases.'}</Note>
        {error && <div className="validation" role="alert">{error}</div>}
        <button className="primary" disabled={!target || (!initial && (!reason.trim() || !reference.trim()))} onClick={confirm}>
          {initial ? 'Confirm accountability' : 'Record confirmed change'}
        </button>
      </div>
    </div>
  </details>;
}

export function AssetDetail() {
  const { id } = useParams();
  const { data } = useRegistry();
  const asset = data.assets.find(row => row.id === id);
  return asset ? <AssetDetailContent key={asset.id} asset={asset}/> : <Empty text="Asset not found."/>;
}

function AssetDetailContent({ asset }: { asset: Asset }) {
  const { data, viewMode } = useRegistry();
  const [params, setParams] = useSearchParams();
  const tabs = ['Overview', 'Connections', 'Governance & risk', 'Work'];
  const tab = tabs.includes(params.get('tab') || '') ? params.get('tab')! : 'Overview';
  const workspace = data.workspaces.find(row => row.id === asset.workspaceId);
  const actorId = viewMode === 'Business' ? businessPersonId : adminPersonId;
  const actorIssue = assetChampionIssue(data, asset, actorId);
  const champions = workspace ? currentChampionIds(data, workspace).map(id => assetPersonReference(data, id)) : [];
  const owner = assetPersonReference(data, workspace?.ownerId);
  const evaluation = currentAssetEvaluation(data, asset);
  const evaluations = (data.assetEvaluations || []).filter(row => row.assetId === asset.id);
  const legacy = data.assessments.filter(row => row.assetId === asset.id);
  const links = data.lineage.filter(row => row.assetId === asset.id);
  const { reviews, findings, count: openWorkCount } = assetWork(data, asset.id);
  const associations = (data.assetAssociations || []).filter(row => row.assetId === asset.id);
  return <>
    <Trail items={[{ label: 'Assets', to: '/assets' }, { label: asset.name }]}/>
    <Title title={asset.name} description={`${assetDisplayType(asset)} · ${asset.platform} · ${asset.id}`}
      actions={<button className="button" onClick={() => setParams({ tab: 'Work' })}>Open work ({openWorkCount})</button>}/>
    <div className="detail-meta"><Badge>{evaluation?.risk || 'Not yet evaluated'}</Badge><span>Business version: {asset.version || 'Not yet recorded'}</span><span>Accountable workspace: {workspace?.businessName || 'Not confirmed'}</span></div>
    <div className="tabs" role="tablist" aria-label="Asset sections">{tabs.map(label =>
      <button key={label} role="tab" aria-selected={tab === label} className={tab === label ? 'active' : ''} onClick={() => setParams({ tab: label })}>{label}</button>)}</div>
    {tab === 'Overview' && <>
      {!workspace && <Note tone="warning">Accountable workspace not confirmed. An eligible Champion confirms initial accountability; Platform Manager resolves disputed or unresolved associations.</Note>}
      <div className="two-col">
        <Panel title="Business context" subtitle="Updated through completed Governance & risk evaluations"><div className="panel-body kv-grid">
          <KV label="Purpose">{asset.purpose || 'Not yet recorded'}</KV><KV label="Intended audience">{asset.audience || 'Not yet recorded'}</KV>
          <KV label="Current business version">{asset.version || 'Not yet recorded'}</KV><KV label="Latest evaluation">{evaluation ? evaluation.evaluatedOn + ' · ' + evaluation.methodVersion : 'No PRL-01 evaluation recorded'}</KV>
        </div></Panel>
        <Panel title="Workspace accountability"><div className="panel-body kv-grid">
          <KV label="Accountable workspace">{workspace ? <WorkspaceLink id={workspace.id}/> : 'Not confirmed'}</KV>
          <KV label="Workspace Owner">{owner.name} {owner.id && <Badge>{owner.status}</Badge>}</KV>
          <KV label="Current Champions">{champions.length ? champions.map(person => <div key={person.id}>{person.name} <Badge>{person.status}</Badge></div>) : 'Not recorded'}</KV>
          <KV label="Champion authority">All Champions have equal authority. This role does not grant platform access.</KV>
        </div></Panel>
      </div>
      <AssociationPanel key={asset.id + ':' + asset.workspaceId + ':' + viewMode} asset={asset}/>
      <Panel title="Record details"><div className="panel-body">
        <details><summary>Platform facts and identity</summary><div className="kv-grid">
          <KV label="Native ID">{asset.nativeId}</KV><KV label="Registry ID">{asset.id}</KV>
          <KV label="Native type">{asset.nativeType || 'Not supplied separately in the legacy sample'}</KV>
          <KV label="Native revision">{asset.nativeVersionReference || 'Not supplied'}</KV><KV label="Environment">{asset.environment}</KV>
          <KV label="Source dates">{asset.createdDate} · {asset.modifiedDate}</KV>
          <KV label="Original developer reference">{data.people.find(person => person.id === asset.developerId)?.name || asset.developerId || 'Unknown'}</KV>
          <KV label="Observed membership">Not recorded separately in this local sample. The accountable workspace is a business association.</KV>
        </div></details>
        {!!associations.length && <details><summary>Accountability history ({associations.length})</summary>{associations.slice().reverse().map(row =>
          <div className="timeline" key={row.id}><div><strong>{row.kind}</strong><small>{row.previousWorkspaceId || 'Unassigned'} → {row.workspaceId} · {row.recordedAt} · {data.people.find(person => person.id === row.actorId)?.name || row.actorId}</small><p>{row.reason}</p><Reference value={row.confirmationReference}/></div></div>)}</details>}
      </div></Panel>
    </>}
    {tab === 'Connections' && <Panel title="Connections" subtitle="Native connection identity and endpoint details">
      <div className="table-wrap"><table><thead><tr><th>Connection</th><th>Technology</th><th>Endpoint</th><th>Identity</th><th>Evidence</th></tr></thead><tbody>
        {links.map(link => {
          const connection = data.connections.find(row => row.id === link.connectionId);
          if (!connection) return <tr key={link.connectionId}><td>{link.connectionId}</td><td colSpan={4}>Connection reference unresolved · Platform Manager follow-up</td></tr>;
          const display = connectionTechnologyDisplay(connection.technology);
          return <tr key={connection.id}><td>{connection.name}<small>{connection.id}</small></td>
            <td>{display.technology}{display.processingNote && <small>{display.processingNote}</small>}</td>
            <td>{connection.hostname || 'Unknown'}<small>{[connection.database, connection.schema].filter(Boolean).join('.')}</small></td>
            <td><Badge>{connection.identityClassification}</Badge><small>{connection.authenticationType}</small></td>
            <td>{connection.status}<small>Sample metadata date: {connection.modifiedDate || 'Unknown'}</small></td></tr>;
        })}
      </tbody></table>{!links.length && <Empty text="No connection evidence is recorded. This does not establish that the asset uses no connections."/>}</div>
      <div className="panel-body"><Note>Technology, processing mode and connection identity have different meanings. Endpoint text does not merge connections across platforms.</Note></div>
    </Panel>}
    {tab === 'Governance & risk' && <>
      <Panel title="Governance & risk" subtitle="Completed evaluations · PRL-01" actions={!actorIssue
        ? <Link className="button primary" to={'/assets/' + asset.id + '/assessment'}><ClipboardCheck size={16}/>Record completed evaluation</Link> : undefined}>
        <div className="panel-body">{actorIssue && <Note>{actorIssue}</Note>}
          <div className="kv-grid"><KV label="Risk qualification"><Badge>{evaluation?.risk || 'Not yet evaluated'}</Badge></KV>
            <KV label="Calculated PRL">{evaluation?.calculatedPrl || 'Not calculated'}</KV>
            <KV label="Qualification basis">{evaluation ? evaluation.qualificationReasons.join('; ') || 'Complete answers rule out the qualifying conditions.' : 'No current evaluation recorded'}</KV>
            <KV label="DMP tier">{evaluation?.answers.dmp || 'Not declared under the current method'}</KV>
            <KV label="Contains PII">{evaluation?.answers.pii || 'Unknown'}</KV><KV label="Qualifies as an EUCT">{evaluation?.answers.euct || 'Unknown'}</KV>
          </div><Note>PRL 1, PII Yes, EUCT Yes, or any numbered DMP tier qualifies as High risk. A qualification is not a release approval or Finding severity.</Note>
        </div>
      </Panel>
      <Panel title="Completed evaluation history"><EvaluationHistory rows={evaluations} data={data}/></Panel>
      {!!legacy.length && <Panel title="Legacy assessment history" subtitle="Preserved as originally recorded; these records have not been recalculated">
        <div className="panel-body">{legacy.slice().reverse().map(row => <details className="assessment-history" key={row.id}>
          <summary>{row.version} · {row.date} · {row.status} · {row.outcome}</summary><div className="kv-grid">
            {Object.entries(row).map(([key, value]) => <KV key={key} label={key}>{String(value ?? '')}</KV>)}
          </div></details>)}</div>
      </Panel>}
    </>}
    {tab === 'Work' && <>
      <Panel title="Registry work"><div className="table-wrap"><table><thead><tr><th>Case</th><th>Workspace</th><th>Status</th><th>Assigned reviewer</th><th>Next action</th></tr></thead><tbody>
        {reviews.map(row => <tr key={row.id}><td><Link to={'/reviews/' + row.id}>{row.type}</Link><small>{row.id}</small></td>
          <td><WorkspaceLink id={row.workspaceId}/></td><td><Badge>{row.status}</Badge></td>
          <td>{data.people.find(person => person.id === row.reviewerId)?.name || row.reviewerId || 'Not assigned'}</td><td><Link to={'/reviews/' + row.id}>Open case →</Link></td></tr>)}
      </tbody></table>{!reviews.length && <Empty text="No registry case is linked to this asset."/>}</div>
        {!!findings.length && <div className="panel-body"><details><summary>Linked findings ({findings.length})</summary>{findings.map(row =>
          <div className="list-link" key={row.id}><span>{row.id} · {row.bucket}</span><Badge>{row.status}</Badge><span>{row.result}</span></div>)}</details></div>}
      </Panel>
      <Panel title="External follow-up" subtitle="References from completed evaluations; separate from registry work counts"><div className="panel-body">
        {evaluations.filter(row => row.externalWorkReference || row.comments).map(row => <div className="timeline" key={row.id}><div>
          <strong>{row.version} · {row.evaluatedOn}</strong><p>{row.comments}</p><Reference value={row.externalWorkReference}/>
        </div></div>)}
        {!evaluations.some(row => row.externalWorkReference || row.comments) && <Empty text="No external follow-up reference has been recorded."/>}
        <Note>Saving an evaluation does not create or close a registry case. Assets have no Annual Attestation.</Note>
      </div></Panel>
    </>}
  </>;
}
