import type { Platform } from '../types';

export const coverageThemes = ['Accountability', 'Access & credentials', 'Governance', 'Usage & capacity'] as const;
export type CoverageTheme = typeof coverageThemes[number];
export type EvidenceReadiness = 'Registry context needed' | 'Limited source evidence' | 'Not collected';

export const evidenceReadinessDescriptions: Record<EvidenceReadiness, string> = {
  'Registry context needed': 'The conclusion depends on business declarations, approved responsibility, or an applicable rule. Inventory alone cannot establish it.',
  'Limited source evidence': 'The current query supplies some relevant facts. Missing evidence, scope, and business context still prevent a conclusive control result.',
  'Not collected': 'The current primary query does not collect the source evidence this check needs. This does not mean the platform cannot supply it.',
};

export interface FoundationCoverage {
  bucket: string;
  theme: CoverageTheme;
  purpose: string;
  inputs: string;
  gap: string;
  action: string;
  platforms: Record<Platform, { state: EvidenceReadiness; note: string }>;
}

/**
 * Current primary query profiles: Fabric landed inventory, Tableau repository,
 * and SQL Server copies of Alteryx Gallery/Service exports. The optional Power BI
 * scan-export route is a separate profile. Directory and business evidence arrive
 * separately. These entries describe evidence support, not deployed detection,
 * accepted delivery coverage, or finding results. Installed execution is unverified.
 * Preserve the historical bucket keys; do not infer policy thresholds here.
 */
export const foundationCoverage: FoundationCoverage[] = [
  {
    bucket: 'Orphan', theme: 'Accountability',
    purpose: 'Identify confirmed missing required accountability or association.',
    inputs: 'Workspace and asset identities, observed memberships, approved responsibility, and separate directory evidence.',
    gap: 'Observed membership does not establish business accountability. Partial absence, an unregistered record, or an unresolved identity does not confirm an orphan.',
    action: 'Confirm the missing requirement and evidence scope. Route unresolved identities or relationships to Platform Manager.',
    platforms: {
      'Power BI / Fabric': { state: 'Limited source evidence', note: 'Report/model inventory supplies represented workspaces and memberships. Empty workspaces and source users are not collected.' },
      Tableau: { state: 'Limited source evidence', note: 'Project, workbook, and published data source rows support association review. Unresolved relationships require the query diagnostics.' },
      Alteryx: { state: 'Limited source evidence', note: 'Gallery collections, workflows, and memberships support association review. Service-only workflows and verified workflow ownership are outside this profile.' },
    },
  },
  {
    bucket: 'Stale', theme: 'Usage & capacity',
    purpose: 'Identify content whose activity falls outside its agreed business cadence.',
    inputs: 'Inventory identifies the content to investigate.',
    gap: 'The minimum extract has no activity window or agreed cadence. Modified time and evidence age are not content usage.',
    action: 'Obtain usage evidence and the expected cadence before classifying content as stale. Do not infer retirement.',
    platforms: {
      'Power BI / Fabric': { state: 'Not collected', note: 'The landed inventory query does not collect report or model usage events.' },
      Tableau: { state: 'Not collected', note: 'The repository query does not collect workbook or data source usage events.' },
      Alteryx: { state: 'Not collected', note: 'The Gallery/Service projection does not collect workflow execution history.' },
    },
  },
  {
    bucket: 'Access Risk', theme: 'Access & credentials',
    purpose: 'Compare effective access with the approved access baseline.',
    inputs: 'Recorded group purposes and configuration; selected source role rows where collected.',
    gap: 'Direct roles do not establish effective access, inheritance, nested membership, or approved exceptions. Champion authority does not grant platform access.',
    action: 'Verify effective permissions and the applicable approved baseline before asserting an access discrepancy.',
    platforms: {
      'Power BI / Fabric': { state: 'Not collected', note: 'The primary inventory query supplies no principal or permission rows.' },
      Tableau: { state: 'Limited source evidence', note: 'Selected owner/modifier relationships and user rows do not establish complete project or content permissions.' },
      Alteryx: { state: 'Limited source evidence', note: 'Collection owner/member references do not establish complete workflow permissions or effective capabilities.' },
    },
  },
  {
    bucket: 'Compliance Gap', theme: 'Governance',
    purpose: 'Identify a missing required declaration, evaluation, or workspace response.',
    inputs: 'Recorded declarations, completed asset evaluations, workspace Annual Attestation, and approval evidence.',
    gap: 'An applicable requirement must be established. Inventory and High risk qualification do not prove noncompliance. Assets have no Annual Attestation.',
    action: 'Review the applicable requirement and missing business evidence. Keep unresolved annual timing policy explicit.',
    platforms: {
      'Power BI / Fabric': { state: 'Registry context needed', note: 'Inventory identifies reports and models; it does not supply approved business declarations or evaluations.' },
      Tableau: { state: 'Registry context needed', note: 'Repository metadata identifies content; it does not prove registry declarations or required business review.' },
      Alteryx: { state: 'Registry context needed', note: 'Gallery and Service records identify workflows; they do not establish completed registry governance.' },
    },
  },
  {
    bucket: 'Bypassed Gate', theme: 'Governance',
    purpose: 'Identify a release that demonstrably preceded an applicable required approval.',
    inputs: 'Applicable external gate requirements and recorded approval or release references, when supplied.',
    gap: 'The current extract does not establish a release-to-approval timeline. A valid RW publisher need not be a Champion. No separate asset approval queue is required.',
    action: 'Establish the applicable gate and reliable release evidence first. Do not invent an approval requirement from a publisher role.',
    platforms: {
      'Power BI / Fabric': { state: 'Registry context needed', note: 'Inventory lacks the publication timeline and gate approval evidence needed for this conclusion.' },
      Tableau: { state: 'Registry context needed', note: 'Repository identity and ownership rows do not establish an approved promotion gate or its timing.' },
      Alteryx: { state: 'Registry context needed', note: 'Workflow revisions and creator references do not establish required release approval or its timing.' },
    },
  },
  {
    bucket: 'Credential Exposure', theme: 'Access & credentials',
    purpose: 'Identify confirmed prohibited credential use or supported exposure evidence.',
    inputs: 'Connection metadata where collected; separate credential-policy and verification evidence.',
    gap: 'Unknown authentication or identity classification proves neither exposure nor safety. The contract excludes secret values.',
    action: 'Investigate available metadata against the applicable policy. Keep unresolved identity separate from confirmed exposure.',
    platforms: {
      'Power BI / Fabric': { state: 'Not collected', note: 'The primary inventory query supplies no connection or credential metadata.' },
      Tableau: { state: 'Limited source evidence', note: 'Repository connection details identify investigation targets. Authentication and identity evidence remain insufficient for a conclusive result.' },
      Alteryx: { state: 'Not collected', note: 'The current Gallery/Service query does not collect workflow connections or credential evidence.' },
    },
  },
  {
    bucket: 'Performance Risk', theme: 'Usage & capacity',
    purpose: 'Identify measured workload behavior that exceeds an approved performance threshold.',
    inputs: 'Inventory identifies the workload; business declarations can provide context.',
    gap: 'Measured runtime, workload context, a measurement window, and approved thresholds are absent. Declared duration is not runtime telemetry.',
    action: 'Obtain relevant measurements and an approved comparison rule before assigning a performance finding.',
    platforms: {
      'Power BI / Fabric': { state: 'Not collected', note: 'The inventory query does not collect refresh, query, or capacity performance measurements.' },
      Tableau: { state: 'Not collected', note: 'The repository query does not collect render, refresh, or workload performance measurements.' },
      Alteryx: { state: 'Not collected', note: 'The Service application cross-reference is diagnostic; it does not supply execution performance measurements.' },
    },
  },
  {
    bucket: 'Concentration Risk', theme: 'Usage & capacity',
    purpose: 'Identify excessive dependence on shared platform resources within an agreed scope.',
    inputs: 'Inventory identifies candidate assets and workspaces.',
    gap: 'Shared-resource usage, capacity scope, measurement periods, and approved thresholds are absent. Asset counts alone do not establish concentration risk.',
    action: 'Obtain shared-resource measurements and the agreed concentration rule before reaching a conclusion.',
    platforms: {
      'Power BI / Fabric': { state: 'Not collected', note: 'The primary query does not collect capacity attribution or resource consumption.' },
      Tableau: { state: 'Not collected', note: 'The repository query does not collect shared-node capacity or resource consumption.' },
      Alteryx: { state: 'Not collected', note: 'The Gallery/Service projection does not collect worker capacity or resource consumption.' },
    },
  },
  {
    bucket: 'Coverage / Bus-Factor', theme: 'Accountability',
    purpose: 'Review whether effective Champions and support arrangements provide adequate business continuity.',
    inputs: 'Effective approved Champion assignments, separate directory eligibility evidence, and declared support context.',
    gap: 'Native group membership does not establish Champion authority. One Champion is permitted with a backup warning, not an automatic failure. Unresolved does not mean inactive.',
    action: 'Confirm effective Champions and available backup. Route eligibility uncertainty to Platform Manager; preserve equal Champion authority.',
    platforms: {
      'Power BI / Fabric': { state: 'Registry context needed', note: 'Champion responsibility comes from the registry. Directory eligibility and support context are separate from inventory.' },
      Tableau: { state: 'Registry context needed', note: 'A Tableau owner or user role does not establish Champion responsibility. Use approved assignments and separate directory evidence.' },
      Alteryx: { state: 'Registry context needed', note: 'Collection owners and members are not the Champion roster. Gallery Active is not directory account status.' },
    },
  },
  {
    bucket: 'Privilege Sprawl', theme: 'Access & credentials',
    purpose: 'Identify effective permissions that exceed an approved purpose or scope.',
    inputs: 'Recorded group purposes and approved access baseline; selected source principal references.',
    gap: 'The current queries do not establish complete effective capabilities. Publishing permissions must be compared with approved RW purposes, not the Champion roster.',
    action: 'Verify grant paths, effective permissions, and approved purpose. Avoid duplicate findings for the same access issue.',
    platforms: {
      'Power BI / Fabric': { state: 'Not collected', note: 'The primary inventory query does not collect permission grants or effective capabilities.' },
      Tableau: { state: 'Limited source evidence', note: 'Selected user and ownership records do not enumerate effective permissions or all grant paths.' },
      Alteryx: { state: 'Limited source evidence', note: 'Collection membership references do not establish effective publishing, administration, or workflow access.' },
    },
  },
  {
    bucket: 'Low Adoption', theme: 'Usage & capacity',
    purpose: 'Identify use below an agreed business target for the relevant audience and period.',
    inputs: 'Declared purpose and intended audience provide context for a future usage comparison.',
    gap: 'Complete usage evidence, a measurement period, and an agreed adoption target are absent. Intended audience size is not an observed user count.',
    action: 'Confirm expected use with the business and obtain usage evidence. Do not infer low value or retire content automatically.',
    platforms: {
      'Power BI / Fabric': { state: 'Not collected', note: 'The primary inventory query does not collect report viewers, model consumers, or usage events.' },
      Tableau: { state: 'Not collected', note: 'The repository query does not collect content viewers or usage events.' },
      Alteryx: { state: 'Not collected', note: 'The Gallery/Service projection does not collect consumers or execution frequency; automated use needs business context.' },
    },
  },
];
