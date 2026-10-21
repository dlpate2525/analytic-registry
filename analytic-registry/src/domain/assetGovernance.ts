import type {
  Asset, AssetBusinessVersion, AssetEvaluationAnswers, AssetGovernanceEvaluation,
  AssetRisk, CalculatedPRL, RegistryData,
} from '../types';
import { currentChampionIds } from '../utils/authority';
import { demoRolePeople } from '../utils/approvals';
import { isDateOnly } from '../utils/dates';

export const prlMethodVersion = 'PRL-01' as const;
export const riskLabels: AssetRisk[] = ['High risk', 'Does not meet the High risk rule', 'Not determined'];
export const blankEvaluationAnswers = (): AssetEvaluationAnswers => ({
  complexity: 'Unknown', sourceCount: 'Unknown', audienceSize: 'Unknown',
  audienceApplicabilityReason: '', pii: 'Unknown', euct: 'Unknown', dmp: 'Unknown',
  rls: 'Unknown', processingType: 'Unknown', datasetSize: '', duration: '',
});

const knownCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Pure PRL-01 calculation. Unknown inputs remain visible even when one input is decisive. */
export function evaluateAssetRisk(answers: AssetEvaluationAnswers): {
  prl: CalculatedPRL; risk: AssetRisk; reasons: string[]; incomplete: string[];
} {
  const incomplete: string[] = [];
  const bands: number[] = [];
  const reasons: string[] = [];
  const complexityIndex = ['Simple', 'Moderate', 'Complex'].indexOf(answers.complexity);
  if (complexityIndex >= 0) bands.push(3 - complexityIndex);
  else incomplete.push('Complexity');
  if (knownCount(answers.sourceCount)) bands.push(answers.sourceCount >= 11 ? 1 : answers.sourceCount >= 4 ? 2 : 3);
  else incomplete.push('Data source count');
  if (knownCount(answers.audienceSize)) bands.push(answers.audienceSize >= 501 ? 1 : answers.audienceSize >= 51 ? 2 : 3);
  else if (answers.audienceSize !== 'Not applicable' || !answers.audienceApplicabilityReason.trim()) incomplete.push('Intended audience size');

  const prl: CalculatedPRL = bands.includes(1) ? 'PRL 1'
    : incomplete.length || !bands.length ? 'Not determined'
    : bands.includes(2) ? 'PRL 2' : 'PRL 3';
  if (prl === 'PRL 1') reasons.push('Calculated PRL 1');
  if (answers.pii === 'Yes') reasons.push('Contains PII');
  if (answers.euct === 'Yes') reasons.push('Qualifies as an EUCT');
  if (['Tier 1', 'Tier 2', 'Tier 3'].includes(answers.dmp)) reasons.push('DMP ' + answers.dmp);
  if (!['Yes', 'No'].includes(answers.pii)) incomplete.push('PII declaration');
  if (!['Yes', 'No'].includes(answers.euct)) incomplete.push('EUCT declaration');
  if (!['Tier 1', 'Tier 2', 'Tier 3', 'Untiered'].includes(answers.dmp)) incomplete.push('DMP tier');
  const ruledOut = ['PRL 2', 'PRL 3'].includes(prl) && answers.pii === 'No' && answers.euct === 'No' && answers.dmp === 'Untiered';
  return { prl, risk: reasons.length ? 'High risk' : ruledOut ? 'Does not meet the High risk rule' : 'Not determined', reasons, incomplete };
}

/** Native namespace controls the label; legacy sample labels are not written back as native facts. */
export function assetDisplayType(asset: Asset): string {
  const native = asset.nativeType;
  const legacy = asset.type?.trim().toLowerCase();
  if (asset.platform === 'Alteryx') {
    if (native) return native === 'Workflow' ? 'Workflow' : 'Unknown type';
    return ['workflow', 'alteryx workflow', 'alteryx analytic app'].includes(legacy) ? 'Workflow' : 'Unknown type';
  }
  if (asset.platform === 'Tableau') {
    if (native === 'Workbook') return 'Workbook';
    if (native === 'PublishedDatasource') return 'Published data source';
    if (native) return 'Unknown type';
    if (['workbook', 'tableau workbook'].includes(legacy)) return 'Workbook';
    return ['published data source', 'tableau published data source'].includes(legacy) ? 'Published data source' : 'Unknown type';
  }
  if (asset.platform === 'Power BI / Fabric') {
    if (native === 'Report') return 'Report';
    if (native === 'Dataset') return 'Semantic model';
    if (native) return 'Unknown type';
    if (['report', 'power bi report'].includes(legacy)) return 'Report';
    return ['semantic model', 'dataset', 'power bi dataset', 'power bi semantic model'].includes(legacy) ? 'Semantic model' : 'Unknown type';
  }
  return 'Unknown type';
}

export function assetChampionIssue(data: RegistryData, asset: Asset, actorId: string): string {
  if (!data.people.some(person => person.id === actorId && person.status === 'Active')) return 'The recorder must be active and verified.';
  const workspace = data.workspaces.find(item => item.id === asset.workspaceId);
  if (!workspace) return 'Confirm an accountable workspace before recording Governance & risk. Unresolved associations go to Platform Manager.';
  if (!currentChampionIds(data, workspace).includes(actorId)) return 'Only an active, verified, current Champion of the accountable workspace can record this evaluation.';
  return '';
}

export function currentAssetEvaluation(data: RegistryData, asset: Asset): AssetGovernanceEvaluation | undefined {
  return (data.assetEvaluations || []).find(row => row.id === asset.currentEvaluationId
    && row.assetId === asset.id && row.version === asset.version && row.mode !== 'Historical version');
}

/** Forms capture this token; any relevant change requires the user to reload. */
export function assetWriteToken(data: RegistryData, asset: Asset): string {
  return JSON.stringify([
    asset.id, asset.workspaceId, asset.version, asset.currentBusinessVersionId, asset.currentEvaluationId,
    asset.purpose, asset.audience,
    (data.assetEvaluations || []).filter(row => row.assetId === asset.id).map(row => row.id),
    data.assessments.filter(row => row.assetId === asset.id).map(row => [row.id, row.version, row.date, row.reviewNumber]),
    (data.assetAssociations || []).filter(row => row.assetId === asset.id).map(row => row.id),
  ]);
}

export type AssetEvaluationDraft = {
  assetId: string;
  expectedToken: string;
  mode: AssetGovernanceEvaluation['mode'];
  version: string;
  evaluatedOn: string;
  purpose: string;
  audience: string;
  answers: AssetEvaluationAnswers;
  evidenceReference: string;
  comments: string;
  externalWorkReference: string;
  changeKind: AssetGovernanceEvaluation['changeKind'];
};
export type AssetCommandContext = { actorId: string; now: string; newId: () => string; today: string };

function referenceIssue(reference: string): boolean {
  const value = reference.trim();
  if (/^(javascript|vbscript|data|file|blob):/i.test(value)) return true;
  if (/^https?:/i.test(value) || value.includes('://')) {
    try { const url = new URL(value); return !['https:', 'http:'].includes(url.protocol) || !url.hostname; }
    catch { return true; }
  }
  return false;
}
export function assetVersionReferences(data: RegistryData, asset: Asset): string[] {
  return [...new Set([asset.version, ...(data.assetBusinessVersions || []).filter(row => row.assetId === asset.id).map(row => row.reference),
    ...data.assessments.filter(row => row.assetId === asset.id).map(row => row.version),
    ...(data.assetEvaluations || []).filter(row => row.assetId === asset.id).map(row => row.version)].filter(Boolean))];
}

function recordingTimeIssue(data: RegistryData, assetId: string, now: string): string {
  const instant = Date.parse(now);
  if (!Number.isFinite(instant)) return 'A valid recording time is required.';
  const savedTimes = [
    ...(data.assetEvaluations || []).filter(row => row.assetId === assetId).map(row => row.recordedAt),
    ...(data.assetAssociations || []).filter(row => row.assetId === assetId).map(row => row.recordedAt),
  ];
  return savedTimes.some(value => Date.parse(value) > instant)
    ? 'The recording clock predates saved evidence. Reload and check the local clock.' : '';
}

export function validateAssetEvaluation(data: RegistryData, draft: AssetEvaluationDraft, context: AssetCommandContext): string {
  const asset = data.assets.find(row => row.id === draft.assetId);
  if (!asset) return 'Asset not found.';
  const actorIssue = assetChampionIssue(data, asset, context.actorId);
  if (actorIssue) return actorIssue;
  if (draft.expectedToken !== assetWriteToken(data, asset)) return 'This asset changed while the form was open. Reload before saving.';
  const timeIssue = recordingTimeIssue(data, asset.id, context.now);
  if (timeIssue) return timeIssue;
  if (!isDateOnly(draft.evaluatedOn) || draft.evaluatedOn > context.today) return 'Enter an evaluation date that is not in the future.';
  if (!draft.version.trim() || draft.version !== draft.version.trim()) return 'Enter a business version without surrounding spaces.';
  if (!draft.purpose.trim() || !draft.audience.trim()) return 'Enter the business purpose and intended audience. State automated use when there is no human audience.';
  if (!draft.evidenceReference.trim()) return 'Add one traceable supporting evidence reference.';
  if ([draft.evidenceReference, draft.externalWorkReference].some(referenceIssue)) return 'Use an https/http URL or a document/ticket reference, not an executable URL.';
  const result = evaluateAssetRisk(draft.answers);
  if (result.incomplete.length) return 'Complete the required answers: ' + result.incomplete.join(', ') + '. A conclusive risk label does not complete missing answers.';
  const versions = assetVersionReferences(data, asset);
  if (draft.mode === 'New current version') {
    if (versions.includes(draft.version)) return 'This business version is already recorded. Use the current or historical version action.';
    const expectedKind = asset.version ? 'Material business change' : 'Initial baseline';
    if (draft.changeKind !== expectedKind) return 'Select the correct reason for this new business version.';
    if (asset.version && !draft.comments.trim()) return 'Describe the material business change.';
    const currentDates = [
      ...(data.assetEvaluations || []).filter(row => row.assetId === asset.id && row.version === asset.version).map(row => row.evaluatedOn),
      ...data.assessments.filter(row => row.assetId === asset.id && row.version === asset.version).map(row => row.date),
    ];
    if (currentDates.some(date => date > draft.evaluatedOn)) return 'A new current version cannot predate the latest evaluation of the current version.';
  } else if (draft.mode === 'Current version') {
    if (!asset.version || draft.version !== asset.version) return 'Use the recorded current business version.';
    if (!['Technical change', 'Corrected declaration', 'Updated evidence'].includes(draft.changeKind)) return 'Select why this version is being evaluated again.';
    if (['Technical change', 'Corrected declaration'].includes(draft.changeKind) && !draft.comments.trim()) return 'Explain the change or correction.';
  } else if (draft.mode === 'Historical version') {
    if (!versions.includes(draft.version) || draft.version === asset.version) return 'Select an existing historical business version.';
    if (draft.changeKind !== 'Historical evidence' || !draft.comments.trim()) return 'Explain the historical evidence or correction.';
  } else return 'Select how this evaluation relates to the business version.';
  return '';
}

export function recordAssetEvaluation(data: RegistryData, draft: AssetEvaluationDraft, context: AssetCommandContext): RegistryData {
  const issue = validateAssetEvaluation(data, draft, context);
  if (issue) throw Error(issue);
  const asset = data.assets.find(row => row.id === draft.assetId)!;
  const result = evaluateAssetRisk(draft.answers);
  const evaluationId = 'GOV-' + context.newId();
  if ((data.assetEvaluations || []).some(row => row.id === evaluationId)) throw Error('This evaluation is already recorded.');
  let versions = data.assetBusinessVersions || [];
  if (asset.version && !versions.some(row => row.assetId === asset.id && row.reference === asset.version)) {
    versions = [...versions, { id: 'AV-' + context.newId(), assetId: asset.id, reference: asset.version, origin: 'Existing recorded version' }];
  }
  let version = versions.find(row => row.assetId === asset.id && row.reference === draft.version);
  if (!version) {
    version = {
      id: 'AV-' + context.newId(), assetId: asset.id, reference: draft.version,
      origin: draft.mode === 'New current version'
        ? draft.changeKind as 'Initial baseline'|'Material business change' : 'Existing recorded version',
      ...(draft.mode === 'New current version' ? { declaredAt: context.now, declaredById: context.actorId, evaluationId,
        previousVersionId: versions.find(row => row.assetId === asset.id && row.reference === asset.version)?.id } : {}),
    } satisfies AssetBusinessVersion;
    if (versions.some(row => row.id === version!.id)) throw Error('The generated business version ID is already in use.');
    versions = [...versions, version];
  }
  const previous = currentAssetEvaluation(data, asset);
  const evaluation: AssetGovernanceEvaluation = {
    id: evaluationId, assetId: asset.id, businessVersionId: version.id, version: draft.version,
    workspaceId: asset.workspaceId!, reviewerId: context.actorId, evaluatedOn: draft.evaluatedOn,
    recordedAt: context.now, purpose: draft.purpose.trim(), audience: draft.audience.trim(),
    answers: structuredClone(draft.answers), methodVersion: prlMethodVersion, calculatedPrl: result.prl,
    risk: result.risk, qualificationReasons: result.reasons, evidenceReference: draft.evidenceReference.trim(),
    comments: draft.comments.trim(), externalWorkReference: draft.externalWorkReference.trim(),
    changeKind: draft.changeKind, mode: draft.mode,
    ...(previous && previous.version === draft.version ? { previousEvaluationId: previous.id } : {}),
  };
  const legacyDates = data.assessments.filter(row => row.assetId === asset.id && row.version === draft.version).map(row => row.date);
  const newer = (!previous || draft.evaluatedOn >= previous.evaluatedOn)
    && !legacyDates.some(date => date > draft.evaluatedOn);
  const project = draft.mode === 'New current version' || (draft.mode === 'Current version' && newer);
  return {
    ...data, assetBusinessVersions: versions, assetEvaluations: [...(data.assetEvaluations || []), evaluation],
    assets: data.assets.map(row => row.id !== asset.id || !project ? row : {
      ...row, version: version.reference, currentBusinessVersionId: version.id, currentEvaluationId: evaluation.id,
      purpose: evaluation.purpose, audience: evaluation.audience, governanceRisk: evaluation.risk,
      prl: result.prl, euct: evaluation.answers.euct === 'Yes' ? 'EUCT' : 'Non-EUCT',
      dmp: evaluation.answers.dmp, pii: evaluation.answers.pii === 'Yes', assessmentStatus: 'Complete',
    }),
    events: [...data.events, {
      id: 'EV-' + context.newId(), workspaceId: asset.workspaceId, date: context.now, actor: context.actorId,
      category: 'Review', description: `Completed Governance & risk for ${asset.name} / ${draft.version}. ${project ? 'Current business context updated.' : 'Historical evidence retained; current context unchanged.'}`,
    }],
  };
}

export type AssetAssociationCommand = {
  assetId: string; workspaceId: string; expectedToken: string; reason: string; confirmationReference: string;
};

export function changeAssetAssociation(data: RegistryData, command: AssetAssociationCommand, context: AssetCommandContext): RegistryData {
  const asset = data.assets.find(row => row.id === command.assetId);
  const workspace = data.workspaces.find(row => row.id === command.workspaceId);
  if (!asset || !workspace) throw Error('Select an existing asset and accountable workspace.');
  if (assetWriteToken(data, asset) !== command.expectedToken) throw Error('The association changed. Reload before confirming.');
  if (asset.platform !== workspace.platform) throw Error('The accountable workspace must use the asset’s platform.');
  if (asset.workspaceId === workspace.id) throw Error('This is already the accountable workspace.');
  if (workspace.registryStatus !== 'Registered') throw Error('Register the proposed workspace before assigning business accountability.');
  if (!data.people.some(person => person.id === context.actorId && person.status === 'Active')) throw Error('The actor must be active and verified.');
  const timeIssue = recordingTimeIssue(data, asset.id, context.now);
  if (timeIssue) throw Error(timeIssue);
  const initial = !asset.workspaceId;
  if (initial && !currentChampionIds(data, workspace).includes(context.actorId)) throw Error('Only a current Champion of the proposed workspace can confirm the initial association.');
  if (!initial && !(demoRolePeople['Platform Manager'] || []).includes(context.actorId)) throw Error('Only Platform Manager can record an existing association transfer or correction.');
  if (!initial && (!command.reason.trim() || !command.confirmationReference.trim())) throw Error('Record the reason and business confirmation from the affected workspaces.');
  if (referenceIssue(command.confirmationReference)) throw Error('Use an https/http URL or a document/ticket confirmation reference.');
  const id = 'ASC-' + context.newId();
  if ((data.assetAssociations || []).some(row => row.id === id)) throw Error('This association action is already recorded.');
  return {
    ...data,
    assets: data.assets.map(row => row.id === asset.id ? { ...row, workspaceId: workspace.id } : row),
    assetAssociations: [...(data.assetAssociations || []), {
      id, assetId: asset.id, previousWorkspaceId: asset.workspaceId, workspaceId: workspace.id,
      actorId: context.actorId, recordedAt: context.now, reason: command.reason.trim(),
      confirmationReference: command.confirmationReference.trim(),
      kind: initial ? 'Initial confirmation' : 'Transfer or correction',
    }],
    events: [...data.events, {
      id: 'EV-' + context.newId(), workspaceId: workspace.id, date: context.now, actor: context.actorId,
      category: 'Review', description: `${initial ? 'Confirmed' : 'Changed'} accountable workspace for ${asset.name}: ${workspace.businessName}. Native membership and existing work were not changed.`,
    }],
  };
}
