import type { TableSpec } from './schema';

export type FoundationPlatform = 'PowerBI' | 'Tableau' | 'Alteryx';
export interface FoundationColumn {
  name: string;
  type: string;
  purpose: string;
  platforms: FoundationPlatform[];
  writeAuthority: string;
  nullable: boolean;
  appliesWhen: string;
  nullMeaning: string;
}
export interface FoundationTable {
  name: string;
  domain: string;
  grain: string;
  source: string;
  originTables: string[];
  rules: string;
  columns: FoundationColumn[];
}

const all: FoundationPlatform[] = ['PowerBI', 'Tableau', 'Alteryx'];
const column = (name: string, type: string, purpose: string, writeAuthority: string,
  nullable = false, appliesWhen = 'All three platforms; platform is derived through the source or parent record.',
  nullMeaning = 'Required; a missing value fails validation.', platforms = all): FoundationColumn =>
  ({ name, type: `${type} ${nullable ? 'NULL' : 'NOT NULL'}`, purpose, platforms: [...platforms], writeAuthority, nullable, appliesWhen, nullMeaning });
const id = (name: string, purpose: string) => column(name, 'uniqueidentifier PK', purpose, 'Registry identity resolver');
const fk = (name: string, purpose: string, nullable = false, appliesWhen?: string, nullMeaning?: string) =>
  column(name, 'uniqueidentifier FK', purpose, 'Validated registry command / ingestion', nullable, appliesWhen, nullMeaning);
const observed = (name: string, type: string, purpose: string, nullable = false, appliesWhen?: string, nullMeaning?: string, platforms?: FoundationPlatform[]) =>
  column(name, type, purpose, 'Validated source ingestion', nullable, appliesWhen, nullMeaning, platforms);
const configured = (name: string, type: string, purpose: string, nullable = false, appliesWhen?: string, nullMeaning?: string) =>
  column(name, type, purpose, 'Registry administrator', nullable, appliesWhen, nullMeaning);

/** V1.1 logical foundation. This catalog is not deployed SQL or a new runtime store. */
export const foundationTables: FoundationTable[] = [
  {
    name: 'Platform', domain: 'Reference', grain: 'One supported analytics platform', source: 'Controlled registry configuration', originTables: ['Platform'],
    rules: 'Codes are PowerBI, Tableau, and Alteryx. Directory evidence has a separate source kind; do not create a fake analytics platform for Entra.',
    columns: [
      column('PlatformID', 'int PK', 'Stable reference key for an analytics platform.', 'Registry administrator'),
      configured('Code', 'nvarchar(30)', 'Unique delivery code; never infer it from a display name.'),
      configured('DisplayName', 'nvarchar(80)', 'User-facing platform label.'),
      configured('NativeUnitTerm', 'nvarchar(30)', 'Workspace, project, or collection label used in the application.'),
      configured('IsEnabled', 'bit', 'Whether this platform can receive new registry work.'),
    ],
  },
  {
    name: 'PlatformInstance', domain: 'Reference', grain: 'One configured analytics instance and its native scope definition', source: 'Run_Context and approved instance configuration', originTables: ['PlatformInstance'],
    rules: 'Unique PlatformID plus NativeInstanceKey. A source-native scope remains explicit when IDs require a site or tenant boundary. Product version is not an API version.',
    columns: [
      id('PlatformInstanceID', 'Stable registry key for the configured platform instance.'),
      column('PlatformID', 'int FK', 'Reference to the supported analytics platform.', 'Registry administrator'),
      configured('NativeInstanceKey', 'nvarchar(200)', 'Exact configured tenant, server, or site-instance key.'),
      configured('DisplayName', 'nvarchar(100)', 'Readable instance label; changing it does not change identity.'),
      configured('ScopeDefinition', 'nvarchar(500)', 'Explains the native scope used to distinguish otherwise equal IDs.'),
      configured('EnvironmentCode', 'nvarchar(30)', 'Approved environment label for this instance.'),
      configured('ProductVersion', 'nvarchar(40)', 'Verified installed product build when available.', true, 'Optional technical context for all platforms; cloud API version is not a product build.', 'Unknown or not supplied; never invent a Power BI release number.'),
      configured('IsEnabled', 'bit', 'Whether this instance remains registered for ingestion and new work.'),
    ],
  },
  {
    name: 'Person', domain: 'Identity', grain: 'One corporate directory user identity', source: 'Reviewed Directory_Users evidence', originTables: ['Person'],
    rules: 'Unique DirectoryTenantKey plus DirectoryObjectID. Many source accounts can resolve to one Person. Display name and email are labels, not keys. Account state and approval eligibility remain separate.',
    columns: [
      id('PersonID', 'Durable registry person ID shared by workspace, assessment, and approval records.'),
      observed('DirectoryTenantKey', 'nvarchar(200)', 'Directory tenant that owns the corporate user.', false, 'Directory-origin evidence reused by all three platforms.'),
      observed('DirectoryObjectID', 'nvarchar(200)', 'Exact directory user object ID, retained as text.', false, 'Directory-origin evidence; platform GUID shape alone does not prove this namespace.'),
      observed('DisplayName', 'nvarchar(200)', 'Current verified directory display label.', true, 'Directory-origin evidence reused by all three platforms.', 'Directory label unavailable; do not infer a name from email.'),
      observed('Mail', 'nvarchar(320)', 'Current verified Graph Mail value; historical values remain in observations.', true, 'Directory-origin email; no UPN fallback.', 'Mail was not supplied; matching must remain unresolved when email is required.'),
      column('CreatedAt', 'datetime2(3)', 'UTC time when the registry created the person identity.', 'Registry identity resolver'),
    ],
  },
  {
    name: 'SourceIdentity', domain: 'Identity', grain: 'One source-scoped user, group, app, or unknown principal', source: 'Platform_Users and Directory_Users', originTables: ['Principal', 'DirectoryGroup'],
    rules: 'Platform key: instance + native scope + namespace + native ID. Directory key: tenant + namespace + native ID. Scope requirements depend on SourceKindCode. No per-platform ID columns on Person; no account flattening.',
    columns: [
      id('SourceIdentityID', 'Durable identity for one source account or principal.'),
      observed('SourceKindCode', 'nvarchar(20)', 'Platform or Directory; selects the required source boundary.'),
      fk('PlatformInstanceID', 'Configured analytics instance for a platform principal.', true, 'Required when SourceKindCode is Platform.', 'Not applicable for a directory-only principal.'),
      observed('DirectoryTenantKey', 'nvarchar(200)', 'Tenant boundary for a directory principal.', true, 'Required when SourceKindCode is Directory.', 'Not applicable to the native platform-account key; matching tenant is stored with its observation.'),
      observed('NativeScopeKey', 'nvarchar(200)', 'Native ID namespace boundary, such as Tableau site or directory tenant.'),
      observed('IdentifierNamespace', 'nvarchar(60)', 'Meaning of the ID, such as TableauUserLUID or EntraGroupObjectID.'),
      observed('NativePrincipalID', 'nvarchar(200)', 'Exact native principal identifier, preserved as text.'),
      observed('PrincipalTypeCode', 'nvarchar(30)', 'User, Group, App, or Unknown; a group never becomes a person by email.'),
      observed('FirstSeenAt', 'datetime2(3)', 'UTC time of the earliest accepted source observation.'),
      observed('LastSeenAt', 'datetime2(3)', 'UTC time of the latest accepted observation; failed runs do not replace it.'),
    ],
  },
  {
    name: 'SourceIdentityBinding', domain: 'Identity', grain: 'One accepted source-identity mapping interval', source: 'Exact email resolution and reviewed mapping decisions', originTables: [],
    rules: 'Exactly one target: PersonID or DirectoryGroupIdentityID. At most one open binding per source identity. Do not end a binding after a failed lookup. Changed directory candidates require Platform Manager review. Matching does not authorize a role.',
    columns: [
      id('BindingID', 'One immutable accepted mapping interval.'),
      fk('SourceIdentityID', 'Source identity being resolved.'),
      fk('PersonID', 'Accepted corporate person for a human source account.', true, 'Human User principal only; mutually exclusive with the group target.', 'No person target when this accepted binding resolves a group.'),
      fk('DirectoryGroupIdentityID', 'Accepted directory Group source identity.', true, 'Verified Group principal only; mutually exclusive with PersonID.', 'Not applicable to a person binding.'),
      column('MatchMethodCode', 'nvarchar(40)', 'ExactEmail for V1 human matching; separately approved methods for group crosswalks.', 'Identity resolver / Platform Manager'),
      fk('EvidenceRunID', 'Source run that supplied the identity being matched.'),
      fk('DirectoryEvidenceRunID', 'Independent directory run used by the decision.', true, 'Required for the agreed platform-email to directory-Mail match.', 'Only permitted when the approved nonhuman mapping method needs no directory run.'),
      column('ValidFrom', 'datetime2(3)', 'UTC start of the accepted mapping interval.', 'Identity resolver / Platform Manager'),
      column('ValidTo', 'datetime2(3)', 'Exclusive UTC end of the mapping interval.', 'Identity resolver / Platform Manager', true, undefined, 'The accepted mapping remains current.'),
      fk('AcceptedByPersonID', 'Person recording a manual mapping decision.', true, 'Manual decisions require a real eligible person.', 'Automated exact-match receipt; its rule and evidence remain required.'),
      column('DecisionReference', 'nvarchar(1000)', 'Traceable rule receipt or approved manual evidence reference.', 'Identity resolver / Platform Manager'),
    ],
  },
  {
    name: 'SourceIdentityObservation', domain: 'Observation', grain: 'One source identity in one source extraction run', source: 'Platform_Users or Directory_Users; source kind distinguishes semantics', originTables: [],
    rules: 'Unique ExtractRunID plus SourceIdentityID. Preserve raw emails and source status. Platform SourceEmail matches directory Mail only within the configured tenant. AccountEnabled is a directory-user fact, not a platform role or employment conclusion.',
    columns: [
      id('IdentityObservationID', 'Immutable account observation record.'),
      fk('ExtractRunID', 'Execution that supplied the account evidence.'),
      fk('SourceIdentityID', 'Durable source identity for this observation.'),
      observed('DisplayName', 'nvarchar(200)', 'Source label at observation time.', true, undefined, 'Label was absent from the source.'),
      observed('EmailValue', 'nvarchar(320)', 'Unchanged platform SourceEmail or directory Mail value.', true, 'Meaning is identified by EmailFieldCode and the identity source kind.', 'Email absent; never substitute login, display name, or UPN.'),
      observed('EmailFieldCode', 'nvarchar(30)', 'SourceEmail for platform evidence; Mail for directory evidence.'),
      observed('MatchingDirectoryTenantKey', 'nvarchar(200)', 'Configured directory tenant for matching a platform user.', true, 'Required for platform human matching; directory records already have their tenant scope.', 'Not applicable to directory-origin observations, or unresolved missing matching configuration.'),
      observed('SourceDirectoryObjectID', 'nvarchar(200)', 'Directory ID explicitly supplied by a platform, retained for conflict checks.', true, 'Platform-origin fact only when the vendor documents the ID namespace.', 'Not returned; does not justify guessing an Entra ID.'),
      observed('SourceStatus', 'nvarchar(500)', 'Raw native account status or labeled role flags, when collected.', true, 'Supplementary platform evidence; never a substitute for directory account state.', 'Not collected or not returned, as declared by coverage.'),
      observed('AccountEnabled', 'bit', 'Observed directory-user enabled flag.', true, 'Directory source kind and User principal only.', 'Use AccountValueStateCode to distinguish unknown, uncollected, and not applicable.'),
      observed('AccountValueStateCode', 'nvarchar(30)', 'Observed, Unknown, NotCollected, NotSupported, Failed, or NotApplicable for the account flag.'),
      observed('ObservedAt', 'datetime2(3)', 'UTC observation time derived from the explicit source timestamp and offset.'),
    ],
  },
  {
    name: 'RegistryObject', domain: 'Registry', grain: 'One durable workspace, asset, or connection', source: 'Native inventory identity plus app-owned registration state', originTables: ['RegistryObject', 'Workspace', 'Asset', 'Connection'],
    rules: 'Unique populated native tuple: instance + scope + native type + native ID. Workspace, Asset, and Connection are typed views. Renames and moves preserve ObjectID. Source ownership never assigns business ownership.',
    columns: [
      id('ObjectID', 'Permanent registry object ID, independent from source IDs.'),
      column('ObjectKindCode', 'nvarchar(20)', 'Workspace, Asset, or Connection; controls typed views and valid relationships.', 'Validated registry command / ingestion'),
      fk('PlatformInstanceID', 'Configured analytics instance that contains this native identity.'),
      observed('NativeScopeKey', 'nvarchar(200)', 'Stable source namespace; not a movable workspace display name.'),
      observed('NativeObjectType', 'nvarchar(50)', 'Native class, such as Project, Workbook, Report, Dataset, or DataConnection.'),
      observed('NativeObjectID', 'nvarchar(200)', 'Exact source object ID as text.', true, 'Required for observed objects; a requested object may predate provisioning.', 'Awaiting verified provisioning or binding; never match the draft by name alone.'),
      column('RegistryNumber', 'nvarchar(30)', 'Unique readable registry reference for the object.', 'Registry command'),
      column('RegistrationStatusCode', 'nvarchar(30)', 'Business registration state, distinct from native lifecycle state.', 'Registry command'),
      column('AssetTypeCode', 'nvarchar(50)', 'Report, model, workbook, workflow, or other controlled asset classification.', 'Validated registry command / ingestion', true, 'ObjectKindCode is Asset.', 'Not applicable to workspaces and connections; Unknown asset classification remains explicit.'),
      observed('FirstSeenAt', 'datetime2(3)', 'Earliest accepted platform observation.', true, 'Observed objects on all three platforms.', 'No source observation exists yet for an app-created draft.'),
      observed('LastSeenAt', 'datetime2(3)', 'Latest accepted platform observation.', true, 'Observed objects on all three platforms.', 'No source observation exists yet; failed refreshes do not invent a seen time.'),
    ],
  },
  {
    name: 'ObjectObservation', domain: 'Observation', grain: 'One registry object in one extraction run', source: 'Workspaces, Assets, or Connections', originTables: ['ObservedWorkspace', 'ObservedAsset', 'ObservedConnection'],
    rules: 'Unique run plus ObjectID. Typed columns preserve known values and explicit evidence states. Owner/creator/modifier links live in ObjectSourceRoleObservation. Technical evidence never overwrites declared purpose, owner, or classifications.',
    columns: [
      id('ObjectObservationID', 'Immutable object observation.'),
      fk('ExtractRunID', 'Execution that supplied the observation.'),
      fk('ObjectID', 'Durable workspace, asset, or connection identity.'),
      observed('DisplayName', 'nvarchar(200)', 'Source label at collection time.'),
      observed('NativeLifecycleCode', 'nvarchar(40)', 'Original platform lifecycle state, when collected.', true, 'Applicable when the source exposes a lifecycle fact for this object type.', 'Unknown or not collected; never infer retirement.'),
      observed('NativeVersionReference', 'nvarchar(100)', 'Observed source revision, separate from a business release.', true, 'Asset observations when a verified source revision is available.', 'Not returned or not applicable; no business AssetVersion is invented.'),
      observed('TechnologyCode', 'nvarchar(40)', 'Connection technology such as Oracle or SQL Server.', true, 'Connection objects; Alteryx connection inventory remains uncollected in the current handoff.', 'Not applicable to other objects; unknown connection technology is displayed as Undefined.'),
      observed('HasExtract', 'bit', 'Tableau extract indicator, independent from connection technology.', true, 'Tableau connection observations only.', 'Unknown if absent for Tableau; not applicable to this native flag on other platforms.', ['Tableau']),
      observed('ExtractValueStateCode', 'nvarchar(30)', 'Evidence state for HasExtract; false is an observed value, not a missing value.'),
      observed('IdentityClassificationCode', 'nvarchar(40)', 'Verified connection credential class, or explicit Unknown.', true, 'Connection objects only; metadata must not contain secrets.', 'Not applicable to other object kinds; no credential inference is permitted.'),
      observed('EvidenceStatusCode', 'nvarchar(30)', 'Captured, partial, or unknown row-level evidence, separate from dataset completeness.'),
      observed('ObservedAt', 'datetime2(3)', 'UTC source observation time; not a business approval date.'),
    ],
  },
  {
    name: 'ObjectRelationshipObservation', domain: 'Observation', grain: 'One directed, typed object relationship in one extraction run', source: 'Workspace_Assets, Asset_Connections, and Asset_Dependencies', originTables: ['ObservedWorkspaceAsset', 'ObservedAssetConnection', 'ObservedAssetDependency', 'ObservedWorkspaceConnection'],
    rules: 'Unique run + source + target + relationship + native discriminator. Physical membership is workspace→asset; connection use is asset→connection; dependency is consumer→provider asset. Unresolved endpoints remain in staging and review. Accountable membership is a separate business declaration.',
    columns: [
      id('ObjectRelationshipObservationID', 'Immutable observed relationship.'),
      fk('ExtractRunID', 'Execution that supplied the relationship evidence.'),
      fk('FromObjectID', 'Source object with the kind required by RelationshipCode.'),
      fk('ToObjectID', 'Target object with the kind required by RelationshipCode.'),
      observed('RelationshipCode', 'nvarchar(40)', 'PhysicalMembership, UsesConnection, DependsOn, or DirectWorkspaceConnection.'),
      observed('NativeRelationshipCode', 'nvarchar(60)', 'Original source association vocabulary.', true, undefined, 'No additional native label was supplied; the controlled relationship remains required.'),
      observed('EvidenceStatusCode', 'nvarchar(30)', 'Evidence supporting the edge; an absent edge is not automatically a removal.'),
    ],
  },
  {
    name: 'ObjectSourceRoleObservation', domain: 'Observation', grain: 'One observed object-to-source-identity role reference in one run', source: 'Object_Users; replaces duplicate scalar owner and author fields', originTables: ['ConfiguredAccessSnapshot'],
    rules: 'TechnicalOwner, CreatedBy, ModifiedBy, and Access are bridge rows, not Person flags. Retain unresolved references. Access does not imply business ownership or approval authority. Native scope is inherited from the run; account namespaces remain explicit.',
    columns: [
      id('ObjectRoleObservationID', 'Immutable source role reference.'),
      fk('ExtractRunID', 'Execution that supplied this role reference.'),
      fk('ObjectID', 'Resolved registry object.', true, undefined, 'Object reference is unresolved; preserve its native type and ID.'),
      fk('SourceIdentityID', 'Resolved source account or principal.', true, undefined, 'Principal reference is unresolved; preserve raw ID and namespace.'),
      observed('NativeObjectType', 'nvarchar(50)', 'Exact native object type, including unresolved object references.'),
      observed('NativeObjectID', 'nvarchar(200)', 'Exact source object ID as text.'),
      observed('SourcePrincipalReference', 'nvarchar(200)', 'Original account reference returned for this object role.', true, undefined, 'Source omitted the reference; route unresolved work to Platform Manager.'),
      observed('SourceReferenceNamespace', 'nvarchar(60)', 'Namespace of the original principal reference.', true, undefined, 'Unknown namespace; do not join only by matching ID text.'),
      observed('PrincipalRoleCode', 'nvarchar(40)', 'TechnicalOwner, CreatedBy, ModifiedBy, or Access.'),
      observed('NativeRole', 'nvarchar(100)', 'Unchanged permission vocabulary for an Access assignment.', true, 'PrincipalRoleCode is Access.', 'Not applicable to non-access roles, or unknown native permission requiring review.'),
      observed('ResolutionStatusCode', 'nvarchar(30)', 'Resolved or Unresolved relationship; independent from enabled account state.'),
      observed('SourceReferenceStatusCode', 'nvarchar(40)', 'ReadyForEmailMatch or the explicit unresolved-reference reason.'),
    ],
  },
  {
    name: 'ExtractRun', domain: 'Delivery', grain: 'One source collection execution and immutable delivery receipt', source: 'Run_Context and retained collection manifest', originTables: ['ExtractRun'],
    rules: 'RunKey remains the external delivery key; ExtractRunID is internal. Exactly one platform instance or directory tenant scope applies. The same scoped RunKey with identical content is a retry; changed content is a conflict. No RunDate redesign.',
    columns: [
      id('ExtractRunID', 'Internal registry identity for this source execution.'),
      observed('RunKey', 'uniqueidentifier', 'Unchanged external delivery correlation key; never an object ID.'),
      observed('SourceKindCode', 'nvarchar(20)', 'Platform or Directory; selects the required scope.'),
      fk('PlatformInstanceID', 'Configured source platform instance.', true, 'Required for Platform source kind.', 'Not applicable to a directory-only run.'),
      observed('DirectoryTenantKey', 'nvarchar(200)', 'Directory collection tenant.', true, 'Required for Directory source kind.', 'Not applicable to the platform execution scope.'),
      observed('NativeScopeKey', 'nvarchar(200)', 'Exact source scope declared by this delivery.'),
      observed('CollectorVersion', 'nvarchar(50)', 'Version of the query or extraction adapter.'),
      observed('ContractVersion', 'nvarchar(30)', 'Field contract version validated for this delivery.'),
      observed('ObservedAt', 'datetime2(3)', 'UTC observation time derived from source context; independent directory runs retain their own value.'),
      observed('RunStatusCode', 'nvarchar(30)', 'Complete, Partial, or Failed execution state; dataset coverage remains separate.'),
      observed('ContentHash', 'char(64)', 'SHA-256 digest of the accepted delivery for retry and conflict checks.'),
      observed('EvidenceReference', 'nvarchar(1000)', 'Approved source-delivery or manifest reference without credentials.'),
    ],
  },
  {
    name: 'ExtractDataset', domain: 'Delivery', grain: 'One dataset and declared scope within a source extraction run', source: 'Coverage table and manifest scope evidence', originTables: ['ExtractDataset'],
    rules: 'Unique run + dataset + scope. A zero row count proves only a successful empty result within verified scope. Partial, failed, unsupported, and uncollected evidence must not prove absence or removal.',
    columns: [
      id('ExtractDatasetID', 'Stable receipt for dataset coverage within a run.'),
      fk('ExtractRunID', 'Execution that owns this dataset receipt.'),
      observed('DatasetCode', 'nvarchar(50)', 'One of the versioned inventory, relationship, or identity dataset names.'),
      observed('ScopeKey', 'nvarchar(200)', 'Exact dataset scope, including relevant object-type or lifecycle filters.'),
      observed('CoverageStatusCode', 'nvarchar(30)', 'Complete, Partial, NotCollected, NotSupported, or Failed.'),
      observed('RowCount', 'int', 'Validated delivered row count; zero is a known empty result.', true, 'A count is required for a successfully delivered dataset.', 'Not counted or unavailable; never substitute zero.'),
      observed('ScopeVerified', 'bit', 'Whether the intended scope and collection coverage were independently checked.'),
      observed('CoverageNote', 'nvarchar(2000)', 'Explicit omissions, failures, or scope qualifications.', true, undefined, 'No qualification recorded; this alone does not prove completeness.'),
    ],
  },
];

/** Compatibility shape for existing dictionary helpers; does not import the historical catalog at runtime. */
export const foundationSchema: TableSpec[] = foundationTables.map(table => ({
  name: table.name,
  domain: table.domain,
  grain: table.grain,
  writer: table.source,
  columns: table.columns.map(field => `${field.name} ${field.type}`),
  rules: table.rules,
}));

export const foundationModelStatus = {
  version: '1.1',
  foundationTableCount: foundationTables.length,
  historicalTableCount: 53,
  completeConsolidationProposalCount: 45,
  deployed: false,
  purpose: 'Inventory and identity foundation; workflow modules remain required before live operations.',
} as const;
