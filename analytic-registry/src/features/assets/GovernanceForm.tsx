import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useRegistry } from '../../data/store';
import { StepNav } from '../../components/StepNav';
import { Title, Panel, Field, Note, Trail, Empty, Select, Badge, KV } from '../../components/ui';
import { todayLocal } from '../../utils/dates';
import { businessPersonId, adminPersonId } from '../../utils/workItems';
import {
  assetChampionIssue, assetVersionReferences, assetWriteToken, blankEvaluationAnswers, currentAssetEvaluation,
  evaluateAssetRisk, recordAssetEvaluation, validateAssetEvaluation, type AssetEvaluationDraft,
} from '../../domain/assetGovernance';
import type { Asset, AssetEvaluationAnswers } from '../../types';

export function AssessmentForm() {
  const { id } = useParams();
  const { data } = useRegistry();
  const asset = data.assets.find(row => row.id === id);
  return asset ? <GovernanceForm key={asset.id} asset={asset}/> : <Empty text="Asset not found."/>;
}

function GovernanceForm({ asset }: { asset: Asset }) {
  const { data, update, setNotice, viewMode } = useRegistry();
  const navigate = useNavigate();
  const actorId = viewMode === 'Business' ? businessPersonId : adminPersonId;
  const previous = currentAssetEvaluation(data, asset);
  const [draft, setDraft] = useState<AssetEvaluationDraft>(() => ({
    assetId: asset.id, expectedToken: assetWriteToken(data, asset),
    mode: asset.version ? 'Current version' : 'New current version', version: asset.version || '',
    evaluatedOn: todayLocal(), purpose: asset.purpose || '', audience: asset.audience || '',
    answers: previous ? structuredClone(previous.answers) : blankEvaluationAnswers(),
    evidenceReference: '', comments: '', externalWorkReference: '',
    changeKind: asset.version ? 'Updated evidence' : 'Initial baseline',
  }));
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const result = evaluateAssetRisk(draft.answers);
  const actorIssue = assetChampionIssue(data, asset, actorId);
  const historicalVersions = assetVersionReferences(data, asset).filter(reference => reference !== asset.version);
  const detailPath = '/assets/' + asset.id + '?tab=' + encodeURIComponent('Governance & risk');
  const set = <K extends keyof AssetEvaluationDraft>(key: K, value: AssetEvaluationDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const answer = <K extends keyof AssetEvaluationAnswers>(key: K, value: AssetEvaluationAnswers[K]) =>
    setDraft(current => ({ ...current, answers: { ...current.answers, [key]: value } }));
  function historicalContext(version: string) {
    const recorded = (data.assetEvaluations || []).filter(row => row.assetId === asset.id && row.version === version)
      .sort((a, b) => a.evaluatedOn.localeCompare(b.evaluatedOn) || a.recordedAt.localeCompare(b.recordedAt)).at(-1);
    const legacy = data.assessments.filter(row => row.assetId === asset.id && row.version === version)
      .sort((a, b) => a.date.localeCompare(b.date) || a.reviewNumber - b.reviewNumber).at(-1);
    return {
      purpose: recorded?.purpose || legacy?.purpose || '',
      audience: recorded?.audience || legacy?.audience || '',
      answers: recorded ? structuredClone(recorded.answers) : blankEvaluationAnswers(),
    };
  }
  function changeMode(mode: AssetEvaluationDraft['mode']) {
    setDraft(current => ({
      ...current, ...(mode === 'Historical version' ? historicalContext(historicalVersions[0] || '')
        : { purpose: asset.purpose || '', audience: asset.audience || '', answers: previous ? structuredClone(previous.answers) : blankEvaluationAnswers() }), mode,
      version: mode === 'Current version' ? asset.version : mode === 'Historical version' ? historicalVersions[0] || '' : '',
      changeKind: mode === 'New current version' ? asset.version ? 'Material business change' : 'Initial baseline'
        : mode === 'Historical version' ? 'Historical evidence' : 'Updated evidence',
    }));
  }
  function save() {
    const context = { actorId, now: new Date().toISOString(), today: todayLocal(), newId: () => crypto.randomUUID() };
    const issue = validateAssetEvaluation(data, draft, context);
    if (issue) { setError(issue); return; }
    let failure = '';
    let projected = false;
    const saved = update(latest => {
      try {
        const next = recordAssetEvaluation(latest, draft, context);
        projected = next.assets.find(row => row.id === asset.id)?.currentEvaluationId !== latest.assets.find(row => row.id === asset.id)?.currentEvaluationId;
        return next;
      } catch (error) { failure = (error as Error).message; throw error; }
    });
    if (!saved) { setError(failure || 'The evaluation was not saved. Check the notice above.'); return; }
    setNotice(projected ? 'Completed evaluation saved. Current business context updated.' : 'Completed evaluation saved as historical evidence. Current business context is unchanged.');
    navigate(detailPath);
  }
  return <>
    <Trail items={[{ label: 'Assets', to: '/assets' }, { label: asset.name, to: '/assets/' + asset.id }, { label: 'Governance & risk' }]}/>
    <Title title="Record Governance & risk" description={`${asset.name} · Completed evaluation · PRL-01`}/>
    {actorIssue ? <><Note tone="warning">{actorIssue}</Note><Link className="button" to={'/assets/' + asset.id}>Return to asset</Link></> : <>
      <StepNav steps={['Business context', 'PRL inputs', 'Governance', 'Evidence & save']} step={step} onChange={setStep}/>
      {error && <div className="validation" role="alert">{error}</div>}
      <div hidden={step !== 0}><Panel title="1. Business context"><div className="panel-body form-grid">
        <Field label="Evaluation applies to">
          <select value={draft.mode} onChange={event => changeMode(event.target.value as AssetEvaluationDraft['mode'])}>
            {asset.version && <option>Current version</option>}<option>New current version</option>
            {!!historicalVersions.length && <option>Historical version</option>}
          </select>
        </Field>
        <Field label="Business version *" hint="A business release reference. Native revisions remain separate technical evidence.">
          {draft.mode === 'Historical version' ? <Select value={draft.version}
            onChange={value => setDraft(current => ({ ...current, version: value, ...historicalContext(value) }))}
            options={historicalVersions} label="Historical business version"/>
            : <input value={draft.version} readOnly={draft.mode === 'Current version'} onChange={event => set('version', event.target.value)} placeholder="For example, B1"/>}
        </Field>
        {draft.mode === 'Current version' && <Field label="Reason for evaluation"><Select value={draft.changeKind}
          onChange={value => set('changeKind', value as AssetEvaluationDraft['changeKind'])}
          options={['Updated evidence', 'Technical change', 'Corrected declaration']} label="Evaluation reason"/></Field>}
        <Field label="Evaluation date *"><input type="date" max={todayLocal()} value={draft.evaluatedOn} onChange={event => set('evaluatedOn', event.target.value)}/></Field>
        <Field label="Business purpose *"><textarea value={draft.purpose} onChange={event => set('purpose', event.target.value)}/></Field>
        <Field label="Intended audience *" hint="Describe the intended consumers or automated use; this is not observed usage."><textarea value={draft.audience} onChange={event => set('audience', event.target.value)}/></Field>
        <div className="full"><details className="process-help"><summary>When does the business version change?</summary>
          <p>A material change to purpose, business logic, result meaning, data use, or intended consumers creates a new business version.</p>
          <p>Equivalent material technical changes and corrected declarations require another completed evaluation of the same version.</p>
          <p>Routine refreshes, native revisions, renames and presentation-only changes do not create business versions by themselves.</p>
        </details><Note>{draft.mode === 'New current version'
          ? 'Saving explicitly establishes this as the current business version. Its completed evaluation and business context are saved together.'
          : draft.mode === 'Historical version' ? 'This evaluation stays in history and cannot replace current business context.'
          : 'Only a newer current-version evaluation updates current business context. Earlier dated evaluations remain history.'}</Note></div>
      </div></Panel></div>
      <div hidden={step !== 1}><Panel title="2. PRL inputs" subtitle="The most demanding applicable answer determines PRL. No numeric score is used."><div className="panel-body form-grid">
        <Field label="Calculation / transformation complexity *" hint="Simple: standard filters, joins and aggregations. Moderate: dependent stages or conditional rules. Complex: recursive, dynamic or specialist modeling logic.">
          <Select value={draft.answers.complexity} onChange={value => answer('complexity', value as AssetEvaluationAnswers['complexity'])}
            options={['Unknown', 'Simple', 'Moderate', 'Complex']} label="Complexity"/>
        </Field>
        <Field label="Distinct logical data sources *" hint="Count databases once and distinct files/services separately. Include documented dependencies; do not count connection rows.">
          <input type="number" min="0" step="1" value={typeof draft.answers.sourceCount === 'number' ? draft.answers.sourceCount : ''}
            placeholder="Unknown" onChange={event => answer('sourceCount', event.target.value === '' ? 'Unknown' : Number(event.target.value))}/>
        </Field>
        <Field label="Audience applies">
          <Select value={draft.answers.audienceSize === 'Not applicable' ? 'Automated use only' : 'Human consumers'}
            onChange={value => answer('audienceSize', value === 'Automated use only' ? 'Not applicable' : 'Unknown')}
            options={['Human consumers', 'Automated use only']} label="Audience applicability"/>
        </Field>
        {draft.answers.audienceSize === 'Not applicable'
          ? <Field label="Applicability reason *"><textarea value={draft.answers.audienceApplicabilityReason} onChange={event => answer('audienceApplicabilityReason', event.target.value)} placeholder="Explain why no human audience applies."/></Field>
          : <Field label="Intended human audience size *" hint="Count distinct intended consumers. Zero requires evidence; an unknown count must stay blank.">
            <input type="number" min="0" step="1" placeholder="Unknown" value={typeof draft.answers.audienceSize === 'number' ? draft.answers.audienceSize : ''}
              onChange={event => answer('audienceSize', event.target.value === '' ? 'Unknown' : Number(event.target.value))}/>
          </Field>}
        <div className="full"><Note>PRL 1: Complex, 11+ sources, or 501+ people. PRL 2: Moderate, 4–10 sources, or 51–500 people. Otherwise PRL 3 when required answers are known.</Note>
          <details><summary>Supporting technical context</summary><div className="form-grid">
            <Field label="Row-level security"><Select value={draft.answers.rls} onChange={value => answer('rls', value)} options={['Unknown', 'Yes', 'No', 'Not applicable']}/></Field>
            <Field label="Processing mode"><Select value={draft.answers.processingType} onChange={value => answer('processingType', value)}
              options={['Unknown', 'Import', 'DirectQuery', 'Live connection', 'Extract', 'Batch workflow', 'Analytic app', 'Scheduled workflow', 'Not applicable']}/></Field>
            <Field label="Dataset size" hint="Include the unit and measurement basis."><input value={draft.answers.datasetSize} onChange={event => answer('datasetSize', event.target.value)} placeholder="Unknown"/></Field>
            <Field label="Refresh / execution duration" hint="Include the operation, unit and evidence date."><input value={draft.answers.duration} onChange={event => answer('duration', event.target.value)} placeholder="Unknown"/></Field>
          </div><p>These four context inputs do not change PRL-01.</p></details>
        </div>
      </div></Panel></div>
      <div hidden={step !== 2}><Panel title="3. Governance"><div className="panel-body form-grid">
        <Field label="Contains PII *"><Select value={draft.answers.pii} onChange={value => answer('pii', value as AssetEvaluationAnswers['pii'])} options={['Unknown', 'Yes', 'No']} label="Contains PII"/></Field>
        <Field label="Qualifies as an EUCT *"><Select value={draft.answers.euct} onChange={value => answer('euct', value as AssetEvaluationAnswers['euct'])} options={['Unknown', 'Yes', 'No']} label="Qualifies as an EUCT"/></Field>
        <Field label="Data Management Policy tier *" hint="Tier 1 is highest. All numbered tiers qualify as High risk; Untiered is an explicit declaration.">
          <Select value={draft.answers.dmp} onChange={value => answer('dmp', value as AssetEvaluationAnswers['dmp'])}
            options={['Unknown', 'Tier 1', 'Tier 2', 'Tier 3', 'Untiered']} label="DMP tier"/>
        </Field>
        <div className="full"><Note>High risk applies when PRL is 1, PII is Yes, EUCT is Yes, or DMP is Tier 1, 2, or 3. It does not mean a control failed.</Note></div>
      </div></Panel></div>
      <div hidden={step !== 3}><Panel title="4. Evidence & save" subtitle="One traceable reference can support several answers."><div className="panel-body form-grid">
        <Field label="Supporting evidence reference *" hint="Identify the asset boundary, answer basis, dependencies and relevant dates."><input value={draft.evidenceReference} onChange={event => set('evidenceReference', event.target.value)} placeholder="Document URL or reference"/></Field>
        <Field label="External work reference" hint="Optional follow-up; no registry case is created."><input value={draft.externalWorkReference} onChange={event => set('externalWorkReference', event.target.value)}/></Field>
        <Field label="Change, correction or follow-up comments"><textarea value={draft.comments} onChange={event => set('comments', event.target.value)}/></Field>
        <div className="kv-grid"><KV label="Recorder">{data.people.find(person => person.id === actorId)?.name || actorId}</KV>
          <KV label="Business version">{draft.version || 'Not entered'}</KV><KV label="Reason">{draft.changeKind}</KV><KV label="Method">PRL-01</KV></div>
      </div></Panel></div>
      <div className="panel-body"><span>Calculated PRL: <strong>{result.prl}</strong></span> · <Badge>{result.risk}</Badge>
        {!!result.reasons.length && <p>{result.reasons.join(' · ')}</p>}
        {!!result.incomplete.length && <p>Required answers still missing: {result.incomplete.join(', ')}.</p>}
      </div>
      <div className="sticky-actions"><button disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
        <Link className="button" to={detailPath}>Cancel</Link><span/>
        {step < 3 ? <button className="primary" onClick={() => setStep(step + 1)}>Continue</button>
          : <button className="primary" onClick={save}><Save size={16}/>Save completed evaluation</button>}
      </div>
    </>}
  </>;
}
