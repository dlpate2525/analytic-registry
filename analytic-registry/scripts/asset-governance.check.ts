import assert from 'node:assert/strict';
import { initialData } from '../src/data/mock';
import {
  assetDisplayType, assetWriteToken, blankEvaluationAnswers, changeAssetAssociation,
  currentAssetEvaluation, evaluateAssetRisk, recordAssetEvaluation, validateAssetEvaluation,
  type AssetCommandContext, type AssetEvaluationDraft,
} from '../src/domain/assetGovernance';
import type { AssetEvaluationAnswers, RegistryData } from '../src/types';

let checks = 0;
function check(name: string, run: () => void) { run(); checks++; }
let sequence = 0;
const context = (actorId = 'P1', now = '2026-10-20T12:00:00.000Z'): AssetCommandContext =>
  ({ actorId, now, today: '2026-10-20', newId: () => String(++sequence) });
const answers: AssetEvaluationAnswers = {
  ...blankEvaluationAnswers(), complexity: 'Simple', sourceCount: 3, audienceSize: 50,
  pii: 'No', euct: 'No', dmp: 'Untiered',
};
const calculate = (changes: Partial<AssetEvaluationAnswers> = {}) => evaluateAssetRisk({ ...answers, ...changes });

check('Small Untiered asset does not meet the High risk rule', () => {
  assert.equal(calculate().prl, 'PRL 3');
  assert.equal(calculate().risk, 'Does not meet the High risk rule');
});
for (const [sourceCount, expected] of [[0, 'PRL 3'], [3, 'PRL 3'], [4, 'PRL 2'], [10, 'PRL 2'], [11, 'PRL 1']] as const) {
  check('Logical sources boundary ' + sourceCount, () => assert.equal(calculate({ sourceCount }).prl, expected));
}
for (const [audienceSize, expected] of [[0, 'PRL 3'], [50, 'PRL 3'], [51, 'PRL 2'], [500, 'PRL 2'], [501, 'PRL 1']] as const) {
  check('Intended audience boundary ' + audienceSize, () => assert.equal(calculate({ audienceSize }).prl, expected));
}
check('Complexity alone can establish PRL 1', () => assert.equal(calculate({ complexity: 'Complex' }).prl, 'PRL 1'));
check('Several middle bands do not combine into PRL 1', () => assert.equal(calculate({ complexity: 'Moderate', sourceCount: 8, audienceSize: 200 }).prl, 'PRL 2'));
for (const dmp of ['Tier 1', 'Tier 2', 'Tier 3'] as const) {
  check(dmp + ' independently qualifies', () => assert.equal(calculate({ dmp }).risk, 'High risk'));
}
check('PII independently qualifies', () => assert.equal(calculate({ pii: 'Yes' }).risk, 'High risk'));
check('EUCT independently qualifies', () => assert.equal(calculate({ euct: 'Yes' }).risk, 'High risk'));
check('Missing required answer is not zero or a low-risk result', () => {
  assert.equal(calculate({ sourceCount: 'Unknown' }).prl, 'Not determined');
  assert.equal(calculate({ sourceCount: 'Unknown' }).risk, 'Not determined');
});
check('A decisive PRL 1 can coexist with incomplete inputs', () => {
  const result = calculate({ sourceCount: 11, complexity: 'Unknown', audienceSize: 'Unknown', dmp: 'Unknown' });
  assert.equal(result.prl, 'PRL 1'); assert.equal(result.risk, 'High risk'); assert.equal(result.incomplete.length, 3);
});
check('Governance can establish High with unknown PRL', () => {
  const result = calculate({ sourceCount: 'Unknown', dmp: 'Tier 2' });
  assert.equal(result.prl, 'Not determined'); assert.equal(result.risk, 'High risk');
});
check('Unknown governance is not Untiered', () => assert.equal(calculate({ dmp: 'Unknown' }).risk, 'Not determined'));
check('Automated use needs a reason', () => {
  assert.equal(calculate({ audienceSize: 'Not applicable' }).prl, 'Not determined');
  assert.equal(calculate({ audienceSize: 'Not applicable', audienceApplicabilityReason: 'Consumed only by another documented process.' }).prl, 'PRL 3');
});
check('Context inputs do not score', () => assert.equal(calculate({ rls: 'Yes', processingType: 'DirectQuery', datasetSize: '400 TB', duration: '5 days' }).prl, 'PRL 3'));
for (const sourceCount of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  check('Invalid source count is incomplete: ' + sourceCount, () => assert.ok(calculate({ sourceCount }).incomplete.includes('Data source count')));
}

const data = structuredClone(initialData);
const assetId = data.assets[0].id;
const makeDraft = (state: RegistryData = data, changes: Partial<AssetEvaluationDraft> = {}): AssetEvaluationDraft => {
  const asset = state.assets.find(row => row.id === assetId)!;
  return {
    assetId, expectedToken: assetWriteToken(state, asset), mode: 'Current version', version: asset.version,
    evaluatedOn: '2026-10-20', purpose: 'Support operating decisions.', audience: 'Operations analysts.',
    answers: { ...answers }, evidenceReference: 'EVID-2026-10-20', comments: '', externalWorkReference: '',
    changeKind: 'Updated evidence', ...changes,
  };
};
const original = JSON.stringify(data);
const saved = recordAssetEvaluation(data, makeDraft(), context());
check('Save leaves original data and legacy records intact', () => {
  assert.equal(JSON.stringify(data), original); assert.deepEqual(saved.assessments, data.assessments);
  assert.deepEqual(saved.approvals, data.approvals); assert.deepEqual(saved.attestations, data.attestations);
});
check('One completed record has immutable answers and method', () => {
  assert.equal(saved.assetEvaluations?.length, 1);
  assert.equal(saved.assetEvaluations?.[0].methodVersion, 'PRL-01');
  assert.equal(saved.assetEvaluations?.[0].reviewerId, 'P1');
  assert.equal(saved.assetEvaluations?.[0].workspaceId, data.assets[0].workspaceId);
  assert.equal(saved.assetEvaluations?.[0].risk, 'Does not meet the High risk rule');
});
check('Current purpose and audience project through the completed record', () => {
  assert.equal(saved.assets[0].purpose, 'Support operating decisions.');
  assert.equal(saved.assets[0].audience, 'Operations analysts.');
  assert.equal(saved.assets[0].currentEvaluationId, saved.assetEvaluations?.[0].id);
});
check('Native facts and historical people stay unchanged', () => {
  for (const key of ['nativeId', 'name', 'platform', 'workspaceId', 'modifiedDate', 'developerId', 'championId'] as const) assert.equal(saved.assets[0][key], data.assets[0][key]);
});
check('No work or approvals are created from risk evaluation', () => {
  assert.deepEqual(saved.reviews, data.reviews); assert.deepEqual(saved.findings, data.findings);
  assert.deepEqual(saved.requests, data.requests);
});
check('Evidence is required even for a decisive high result', () =>
  assert.ok(validateAssetEvaluation(data, makeDraft(data, { evidenceReference: '', answers: { ...answers, pii: 'Yes' } }), context())));
check('Incomplete conclusive risk cannot be saved as completed', () =>
  assert.throws(() => recordAssetEvaluation(data, makeDraft(data, { answers: { ...answers, complexity: 'Unknown', dmp: 'Tier 2' } }), context())));
check('Unsafe evidence URL is rejected', () =>
  assert.throws(() => recordAssetEvaluation(data, makeDraft(data, { evidenceReference: 'javascript:alert(1)' }), context())));
check('Negative count is rejected', () => assert.throws(() => recordAssetEvaluation(data, makeDraft(data, { answers: { ...answers, sourceCount: -1 } }), context())));
check('Future evaluation is rejected', () => assert.throws(() => recordAssetEvaluation(data, makeDraft(data, { evaluatedOn: '2026-10-21' }), context())));
check('A non-Champion cannot record governance', () => assert.throws(() => recordAssetEvaluation(data, makeDraft(), context('P8'))));
check('Inactive Champion cannot record governance', () => {
  const inactive = structuredClone(data); inactive.people.find(row => row.id === 'P1')!.status = 'Inactive';
  assert.throws(() => recordAssetEvaluation(inactive, makeDraft(inactive), context()));
});
check('Unverified Champion cannot record governance', () => {
  const unverified = structuredClone(data); unverified.people.find(row => row.id === 'P1')!.status = 'Unverified';
  assert.throws(() => recordAssetEvaluation(unverified, makeDraft(unverified), context()));
});
check('Unconfirmed accountability blocks evaluation', () => {
  const unassigned = structuredClone(data); unassigned.assets[0].workspaceId = null;
  assert.throws(() => recordAssetEvaluation(unassigned, makeDraft(unassigned), context()));
});
check('Stale open form cannot overwrite a newer evaluation', () => assert.throws(() => recordAssetEvaluation(saved, makeDraft(), context())));
check('A backdated current-version record remains history', () => {
  const older = recordAssetEvaluation(saved, makeDraft(saved, { evaluatedOn: '2026-10-19', purpose: 'Historical wording.' }), context('P1', '2026-10-20T13:00:00.000Z'));
  assert.equal(older.assets[0].purpose, saved.assets[0].purpose);
  assert.equal(older.assetEvaluations?.length, 2);
});
check('A first PRL-01 record older than legacy evidence does not become current through the read view', () => {
  const older = recordAssetEvaluation(data, makeDraft(data, { evaluatedOn: '2026-09-01', purpose: 'Old context.' }), context());
  assert.equal(older.assets[0].purpose, data.assets[0].purpose);
  assert.equal(currentAssetEvaluation(older, older.assets[0]), undefined);
  assert.equal(older.assetEvaluations?.length, 1);
});
const corrected = recordAssetEvaluation(saved, makeDraft(saved, {
  changeKind: 'Corrected declaration', comments: 'The unchanged data already contained PII.',
  answers: { ...answers, pii: 'Yes' }, externalWorkReference: 'EXT-200',
}), context('P1', '2026-10-20T14:00:00.000Z'));
check('Correction changes risk without changing version', () => {
  assert.equal(corrected.assets[0].version, data.assets[0].version);
  assert.equal(currentAssetEvaluation(corrected, corrected.assets[0])?.risk, 'High risk');
  assert.equal(corrected.assetEvaluations?.[0].answers.pii, 'No');
  assert.deepEqual(corrected.reviews, saved.reviews);
});
const nextVersion = recordAssetEvaluation(corrected, makeDraft(corrected, {
  mode: 'New current version', version: 'B4', changeKind: 'Material business change',
  comments: 'Output now supports a different business decision.', purpose: 'Support new decisions.', answers: { ...answers, dmp: 'Tier 3' },
}), context('P1', '2026-10-20T15:00:00.000Z'));
check('Explicit version and evaluation become current together, even when High', () => {
  assert.equal(nextVersion.assets[0].version, 'B4'); assert.equal(nextVersion.assets[0].purpose, 'Support new decisions.');
  assert.equal(nextVersion.assets[0].governanceRisk, 'High risk');
  assert.equal(nextVersion.assetBusinessVersions?.length, 2);
  assert.equal(nextVersion.assetBusinessVersions?.[0].origin, 'Existing recorded version');
  assert.equal(nextVersion.assetBusinessVersions?.[0].declaredAt, undefined);
});
check('Known version cannot be redeclared as new current', () => assert.throws(() => recordAssetEvaluation(nextVersion, makeDraft(nextVersion, {
  mode: 'New current version', version: data.assets[0].version, changeKind: 'Material business change', comments: 'Duplicate.'
}), context('P1', '2026-10-20T16:00:00.000Z'))));
check('Historical correction cannot change current context', () => {
  const historical = recordAssetEvaluation(nextVersion, makeDraft(nextVersion, {
    mode: 'Historical version', version: data.assets[0].version, changeKind: 'Historical evidence',
    comments: 'Correct evidence for the previous version.', purpose: 'Earlier purpose.'
  }), context('P1', '2026-10-20T16:00:00.000Z'));
  assert.equal(historical.assets[0].version, 'B4'); assert.equal(historical.assets[0].purpose, 'Support new decisions.');
});
check('Initial baseline records current state without an invented source revision', () => {
  const incoming = structuredClone(data); incoming.assets[0].version = ''; incoming.assessments = [];
  const baseline = recordAssetEvaluation(incoming, makeDraft(incoming, { mode: 'New current version', version: 'B1', changeKind: 'Initial baseline' }), context());
  assert.equal(baseline.assets[0].version, 'B1'); assert.equal(baseline.assets[0].nativeVersionReference, undefined);
  assert.equal(baseline.assetBusinessVersions?.[0].origin, 'Initial baseline');
  assert.equal(baseline.assets[0].createdDate, incoming.assets[0].createdDate);
});
check('Legacy version is preserved even when it has no assessment', () => {
  const withoutAssessments = structuredClone(data); withoutAssessments.assessments = [];
  const result = recordAssetEvaluation(withoutAssessments, makeDraft(withoutAssessments, { mode: 'New current version', version: 'B2', changeKind: 'Material business change', comments: 'New purpose.' }), context());
  assert.ok(result.assetBusinessVersions?.some(row => row.reference === data.assets[0].version));
});

const unassociated = data.assets.find(row => row.id === 'AST-034')!;
const initialAssociation = {
  assetId: unassociated.id, workspaceId: 'WS-006', expectedToken: assetWriteToken(data, unassociated), reason: '', confirmationReference: '',
};
const associated = changeAssetAssociation(data, initialAssociation, context());
check('Eligible target-workspace Champion confirms initial association', () => {
  assert.equal(associated.assets.find(row => row.id === unassociated.id)?.workspaceId, 'WS-006');
  assert.equal(associated.assetAssociations?.[0].actorId, 'P1');
  assert.equal(associated.assetAssociations?.[0].previousWorkspaceId, null);
  assert.deepEqual(associated.assessments, data.assessments);
});
check('Non-Champion cannot confirm initial association', () => assert.throws(() => changeAssetAssociation(data, initialAssociation, context('P8'))));
check('Cross-platform workspace is rejected', () => assert.throws(() => changeAssetAssociation(data, { ...initialAssociation, workspaceId: 'WS-001' }, context())));
check('Discovered workspace cannot grant effective accountability', () => assert.throws(() => changeAssetAssociation(data, { ...initialAssociation, workspaceId: 'WS-008' }, context())));
const transfer = { assetId, workspaceId: 'WS-003', expectedToken: assetWriteToken(saved, saved.assets[0]), reason: 'Confirmed correction.', confirmationReference: 'BOTH-WORKSPACES-300' };
check('Champion cannot transfer an already-associated asset', () => assert.throws(() => changeAssetAssociation(saved, transfer, context())));
check('Manager transfer requires confirmation evidence', () => assert.throws(() => changeAssetAssociation(saved, { ...transfer, confirmationReference: '' }, context('P8'))));
const moved = changeAssetAssociation(saved, transfer, context('P8'));
check('Manager transfer preserves governance history and native identity', () => {
  assert.equal(moved.assets[0].workspaceId, 'WS-003'); assert.equal(moved.assets[0].version, saved.assets[0].version);
  assert.equal(moved.assets[0].nativeId, saved.assets[0].nativeId);
  assert.equal(moved.assetEvaluations?.[0].workspaceId, saved.assets[0].workspaceId);
  assert.deepEqual(moved.reviews, saved.reviews); assert.deepEqual(moved.findings, saved.findings);
});
check('Association rejects stale confirmation', () => assert.throws(() => changeAssetAssociation(moved, transfer, context('P8'))));
const nextTransfer = { ...transfer, workspaceId: 'WS-002', expectedToken: assetWriteToken(moved, moved.assets[0]) };
check('Association rejects a clock rollback even with a fresh token', () => {
  const before = JSON.stringify(moved);
  let failure = '';
  try { changeAssetAssociation(moved, nextTransfer, context('P8', '2026-10-19T12:00:00Z')); }
  catch (error) { failure = (error as Error).message; }
  assert.ok(failure.includes('recording clock predates'));
  assert.equal(JSON.stringify(moved), before);
});
check('Association compares timestamp instants across offsets', () => {
  const later = changeAssetAssociation(moved, nextTransfer, context('P8', '2026-10-20T08:30:00-04:00'));
  assert.equal(later.assets[0].workspaceId, 'WS-002');
});
check('Evaluation compares timestamp instants across offsets', () => {
  const later = recordAssetEvaluation(saved, makeDraft(saved), context('P1', '2026-10-20T08:30:00-04:00'));
  assert.equal(later.assetEvaluations?.length, 2);
});
check('Association cannot predate existing evaluation evidence', () => {
  let failure = '';
  try { changeAssetAssociation(saved, transfer, context('P8', '2026-10-19T12:00:00Z')); }
  catch (error) { failure = (error as Error).message; }
  assert.ok(failure.includes('recording clock predates'));
});
check('Workspace transfer invalidates an open evaluation form', () => assert.throws(() => recordAssetEvaluation(moved, makeDraft(saved), context())));
check('Inactive manager cannot record transfer', () => {
  const inactive = structuredClone(saved); inactive.people.find(person => person.id === 'P8')!.status = 'Inactive';
  assert.throws(() => changeAssetAssociation(inactive, { ...transfer, expectedToken: assetWriteToken(inactive, inactive.assets[0]) }, context('P8')));
});
check('Display mapping does not infer an Alteryx subtype', () =>
  assert.equal(assetDisplayType({ ...data.assets[0], platform: 'Alteryx', nativeType: 'Workflow', type: 'Alteryx analytic app' }), 'Workflow'));
check('An unsupported native type is not silently classified', () =>
  assert.equal(assetDisplayType({ ...data.assets[0], nativeType: 'Unexpected' }), 'Unknown type'));
for (const platform of ['Alteryx', 'Tableau', 'Power BI / Fabric'] as const) {
  for (const type of ['', 'Unexpected legacy label']) {
    check('Unknown legacy type remains unknown on ' + platform + ': ' + type, () =>
      assert.equal(assetDisplayType({ ...data.assets[0], platform, nativeType: undefined, type }), 'Unknown type'));
  }
}
for (const [platform, type, expected] of [
  ['Alteryx', 'Alteryx analytic app', 'Workflow'], ['Tableau', 'Tableau workbook', 'Workbook'],
  ['Tableau', 'Published data source', 'Published data source'], ['Power BI / Fabric', 'Power BI report', 'Report'],
  ['Power BI / Fabric', 'Semantic model', 'Semantic model'],
] as const) {
  check('Known sample type retains its display: ' + type, () =>
    assert.equal(assetDisplayType({ ...data.assets[0], platform, nativeType: undefined, type }), expected));
}
console.log(`Asset governance: ${checks} scenario checks passed.`);
