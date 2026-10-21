import type { TableSpec } from './schema';

// Shared descriptions keep the application and downloadable dictionary consistent.
const purposes:Record<string,string>={
  PlatformID:'Controlled analytics platform identifier. Child views derive this through the platform instance.',
  NativeInstanceKey:'Stable tenant or server-instance key supplied by the platform team. Do not use a changeable display name.',
  NativeScopeKey:'Native uniqueness scope, such as tenant or Tableau site. Do not include a movable workspace when IDs survive moves.',
  NativeObjectID:'Original platform identifier, stored as text without reformatting. Retained separately from the registry UUID for refresh matching.',
  NativeObjectType:'Native object category, such as report, semantic model, workbook, project, or workflow. Part of the identity key.',
  ObjectTypeCode:'Registry identity subtype: Workspace, Asset, or Connection. Exactly one corresponding subtype row must exist.',
  NativePrincipalID:'Original platform user, group, or service-principal identifier. Resolve to directory identity only with evidence.',
  NativeUnitTerm:'Platform term shown in forms: workspace, project, or collection.',
  ProductVersion:'Installed platform version or cloud API/service descriptor. Do not invent a Fabric server version.',
  DisplayName:'Human-readable label at this record or snapshot. Names may change and are never refresh join keys.',
  Name:'Human-readable controlled label. Identity is stored in the primary key.',
  Code:'Stable reference code used by commands and mappings, independent of the displayed label.',
  IsEnabled:'Whether new workflows can select this platform.',IsActive:'Whether this reference is currently selectable.',
  DirectoryTenantKey:'Directory boundary for a native person or group identity.',DirectoryObjectID:'Stable directory object identifier; names and email do not replace it.',
  Email:'Contact or identity-resolution evidence. An email change must not create a new person.',
  IdentityStatusCode:'Active, Inactive, or Unverified identity state. Unknown verification does not mean inactive.',
  ResolutionStatusCode:'Whether the native principal has been matched to a verified directory identity.',
  RegistryNumber:'Readable registry reference. The UUID remains the relational primary key.',
  OriginalOwnerLOBID:'Business line captured at onboarding. Preserve it when current ownership changes.',
  BusinessName:'Business-facing workspace name, limited to the proposed field length.',BusinessPurpose:'Business decisions or processes supported by the workspace; supplied by its accountable owner.',
  OwnerPersonID:'Single accountable Business Owner / Workspace Owner. Do not create a second owner field.',
  OwnerLOBAtDeclarationID:'Owner business line frozen with this declaration version.',OwnerManagerAtDeclarationID:'Owner manager frozen with this declaration; later directory updates do not rewrite it.',
  WillContainPIICode:'Required Yes/No declaration of intended workspace PII content. Not inferred from observed metadata.',
  WillContainEUCTCode:'Required Yes/No declaration of intended end-user computing tool content.',
  HighestDMPTierCode:'One highest applicable Data Management Policy tier: Tier 1, Tier 2, or Tier 3. Tier 1 is highest, followed by Tier 2 and Tier 3.',
  DataClassificationCode:'Business-declared sensitivity category; kept separate from native platform labels.',BusinessCriticalityCode:'Business impact category used for prioritization, not inferred solely from technical usage.',
  StateKindCode:'Requested or Implemented. Each state is an immutable snapshot; observations are stored separately.',
  VersionNumber:'Increasing version within the parent and state kind; never reuse a version number.',
  RequestedTechnicalName:'Desired platform name; remains a label until the platform returns its real native ID.',
  StandardVersionCode:'Version of the Standard template used for this decision; preserves historical requirements.',
  CustomReasonCode:'Structured reason for the alternative setup.',CustomExplanation:'Explanation of the Custom need; required for Other. Custom approval is not a control waiver.',
  AlternateSecurityApproach:'Documented entitlement model for a Custom setup.',AlternateAuthentication:'Documented authentication variation without credentials or secrets.',
  IsPrimaryContact:'Optional communication preference among Champions. It grants no additional native access.',
  SelectionModeCode:'Existing or New group selection. New names remain unresolved prerequisites.',
  SuggestedName:'Generated group-name suggestion retained to distinguish manual changes.',RequestedName:'Requested group display name. Existing groups must also resolve to a stable directory ID.',
  PurposeCode:'Role of this specification or approval in its parent workflow. Standard groups use Champion, RW, R, and Data Sources.',
  NativeAccessLevelCode:'Platform-native permission. Map explicitly to intended purposes; Champion is not a higher permission tier.',
  AssociationRoleCode:'Declared relationship role. Permit at most one current Accountable workspace per asset; observed memberships stay separate.',
  VersionReference:'Business release reference for an asset. It is distinct from extracted native revision metadata.',
  AssetPurpose:'Business purpose declared for the assessed asset release.',IntendedAudience:'Intended consumer population for the asset release.',
  ProductionFlag:'Declared production-release state.',PersonalSpaceFlag:'Whether the source or declaration identifies personal space; NULL observed values mean unknown.',
  ExpectedActivityCadenceDays:'Expected use interval for this business process; requires owner agreement before stale-use assessment.',
  AssessmentTriggerCode:'Initial production release or the material-change category requiring this assessment.',ReviewNumber:'Sequence of reviews for the asset version.',
  ReviewDate:'Business review calendar date, separate from ingestion timestamps.',ReviewOutcomeCode:'Reviewer decision: pending, approved, approved with follow-up, or changes required.',
  RowLevelSecurityCode:'Declared row-level security use, including Unknown or Not applicable.',ProcessingTypeCode:'Import, DirectQuery, live, extract, or workflow processing mode; not the source technology.',
  DatasetSizeMB:'Measured or declared dataset size in megabytes. NULL means unavailable.',CalculationCount:'Number of calculations in the assessed scope; NULL means not measured.',
  ComplexityCode:'Approved complexity classification for the release; values are configurable.',DataSourceCount:'Count of distinct relevant sources; NULL means unknown, not zero.',
  DurationSeconds:'Assessed refresh or execution duration in seconds; interpret by asset type.',AudienceSize:'Intended audience count; do not substitute observed consumers.',
  PRLScore:'Legacy illustrative score field. V1 captures an approved PRL manually and calculates no score; assessment repairs are deferred.',PRLTag:'Manually approved PRL label in the target design. Existing demo values require validation before use.',PRLMethodVersion:'Reserved for a future approved scoring method. V1 has no calculated scoring method.',IsIllustrativeScore:'True for legacy demonstration values. They are not an approved PRL.',
  ObservedPRLTag:'Readiness tag extracted from the platform. It does not overwrite the declared review decision.',
  EUCTCode:'Asset-level end-user computing tool classification; distinct from workspace intent.',DMPCode:'Asset-level data management classification. Align its vocabulary with policy before production.',PIIStateCode:'Asset PII classification: Yes, No, or Unknown.',
  TechnologyCode:'Source technology, such as Oracle or SQL Server. Keep processing mode such as Extract in its own field.',
  ServerHostname:'Source host without user information, tokens, or credentials.',Port:'Source network port when known.',DatabaseName:'Source database identifier when observed.',SchemaName:'Source schema identifier when available.',
  SourceLocator:'Approved sanitized file or endpoint locator. Never include credential-bearing query strings.',CanonicalFingerprint:'Hash of the approved canonical endpoint attributes used for deduplication; never a hash of secrets.',
  ExpectedIdentityClassCode:'Business-approved identity class for this connection.',CredentialPolicyCode:'Policy applicable to the connection identity. Unknown policy does not prove exposure.',
  ExpectedUse:'Declared reason this asset version requires the connection.',CollectorVersion:'Version of the collection script and mappings that produced the run.',
  ScopeDescription:'Exact collection boundary and exclusions. Used to interpret absent records safely.',SourceWatermark:'Source cursor or change watermark for resumable incremental collection.',
  RunStatusCode:'Complete, Partial, Failed, or running state; never treat failure as empty inventory.',DatasetCode:'Dataset being collected, such as assets, connections, lineage, permissions, or activity.',
  ScopeKey:'Boundary for dataset completeness, such as a site, workspace, or tenant.',CoverageStatusCode:'Complete, Partial, Not collected, or equivalent supported coverage state.',RowCount:'Rows delivered for the dataset after defined deduplication; NULL means not established.',
  NativeOwnerPrincipalID:'Observed technical owner; not automatically the accountable business owner.',CapacityKey:'Native capacity identifier for the observation.',
  LastActivityAt:'Last observed qualifying usage event. NULL does not mean no usage.',NativeVersionReference:'Native revision identifier when exposed; do not fabricate a release version.',
  CreatedAtNative:'Creation time reported by the source. Distinct from the registry row creation time.',ModifiedAtNative:'Modification time reported by the source. Not a reliable substitute for business usage.',
  NativePRLTag:'Platform-supplied readiness label, if available.',RuntimeSeconds:'Observed workflow or query runtime in seconds within the stated measurement window.',RefreshDurationSeconds:'Observed refresh duration in seconds within the stated measurement window.',ConsumerCount:'Distinct observed consumers in the stated window. NULL is unknown.',
  MeasurementWindowStart:'Inclusive start of the measurement interval in UTC.',MeasurementWindowEnd:'Exclusive end of the measurement interval in UTC.',NativeAssociationType:'Source relationship type, preserved without converting physical membership to business ownership.',
  Username:'Observed account label, if authorized for collection. It is evidence, not a password.',AuthenticationTypeCode:'Source authentication mechanism when exposed.',IdentityClassificationCode:'Service Account, Personal Account, Managed Identity, Delegated User, or Unknown; inference requires evidence.',
  CredentialReferenceID:'Opaque reference to externally managed credentials. Never a password, secret, or access token.',GatewayID:'Native gateway identifier. An absent value does not automatically mean an error.',
  EvidenceStatusCode:'Whether evidence is usable, missing, partial, unresolved, or otherwise limited.',DependencyTypeCode:'Observed asset-to-asset dependency, such as ReportUsesSemanticModel; preserves intermediate lineage.',
  IsDirectAssignment:'True when the platform grants access directly rather than through a group or inherited object.',MembershipKindCode:'Direct or nested membership classification from directory evidence.',IsTransitive:'Whether nested-group expansion contributed the membership.',EffectiveAccessCode:'Resolved effective access after combining paths and applicable permission rules.',
  Definition:'Business meaning of a controlled term.',SortOrder:'Presentation order; it is not an implicit severity or policy hierarchy.',StableRuleCode:'Rule identity preserved across implementation versions so recurring findings retain their lifecycle.',
  RuleVersion:'Version of the rule logic and thresholds.',RuleName:'Human-readable detection rule name.',RequiredDatasetCodes:'Dataset prerequisites for evaluating the rule. Missing prerequisites produce unresolved results.',LogicReference:'Versioned rule implementation or approved manual method reference.',ThresholdConfiguration:'Versioned threshold settings; no production defaults are implied.',
  ProductVersionScope:'Platform product versions for which the stated detection capability was validated.',CapabilityCode:'Available, Partial, Manual Review Required, or Not Available. Capability differs from assessment outcome.',EvidenceRequirements:'Minimum fields, freshness, and scope completeness needed for conclusive evaluation.',
  EvaluationBatchID:'Stable correlation identifier for one assessment execution across rules and objects.',ContextWorkspaceID:'Workspace context of this particular check, when applicable. Not a replacement for asset identity.',
  ResultCode:'Aligned, Pending Implementation, Flagged for Review, Discrepancy, Unable to Verify, or Not Applicable.',SeverityCode:'Impact severity determined under an approved rule or reviewer decision.',EvaluatorVersion:'Version of the assessment implementation that produced the result.',
  FieldCode:'Configuration attribute or relationship compared in this evaluation.',SubjectStableKey:'Stable principal, relationship, or other subject key for the comparison item.',RequestedValue:'Frozen display value of desired configuration; not the authoritative request row.',ImplementedValue:'Frozen display value of recorded implementation.',ObservedValue:'Frozen display value from platform evidence.',
  Fingerprint:'Stable finding deduplication hash built from rule identity, object identity, and issue discriminator.',Discriminator:'Issue-specific key, such as principal plus permission. Separates distinct issues on one object.',
  ResponsibleRoleCode:'Role accountable for investigating or resolving the issue.',RemediationSummary:'Human-reviewed proposed or completed response; not an automatic action instruction.',OccurrenceStateCode:'Detected, cleared, unresolved, or reopened state for this evidence occurrence.',
  EvidenceTypeCode:'Evidence category, such as extract row, manual verification, or external document.',SourceRecordID:'Original source row reference within the collector evidence. Do not use a display name as its identity.',EvidenceSummary:'Brief description of what the evidence supports and its limits.',ContentHash:'Digest used to detect changes to the evidence artifact; no secret payload is retained.',
  Priority:'Administrative queue order. Lower numbers denote greater priority under the configured review process.',EvidenceDate:'Time of evidence under investigation, distinct from when the case was edited.',
  RequiredAdministrativeAction:'Proposed external work for a human administrator.',DueDate:'Agreed due date for this review or annual packet.',RequestedDueDate:'Optional requested completion date; not an automatically approved service commitment.',
  Resolution:'Outcome and reasoning recorded by the administrator.',VerificationDate:'Date subsequent evidence or manual verification was obtained.',ClosingEvidenceReference:'Reference to the exact evidence revision submitted for authorized closure approval.',VerificationMethodCode:'Subsequent platform observation or approved manual verification.',
  StageCode:'Collect, Assess, Prepare, Execute, or Verify stage for external administration.',ActionTypeCode:'Category of externally prepared or performed administrative operation.',ScriptReference:'Versioned script reference, without embedding credentials or executing the script from the app.',ExecutionResultCode:'Recorded outcome of the external action attempt.',
  AnnualPeriod:'Year of the workspace annual attestation. Unique with WorkspaceID.',ChangesRequested:'Business corrections identified during attestation; do not directly rewrite observed state.',FollowUpItems:'Outstanding work retained after response or approved completion.',
  DeliveryStatusCode:'Delivery result for a Champion recipient. Non-Champion RW/R members are excluded.',DeliveryReference:'External notification reference; the prototype sends no messages.',
  QuestionCode:'Stable semantic question identity, independent of wording revisions.',QuestionVersion:'Version of question wording retained with historical answers.',QuestionText:'Wording presented in the annual review packet.',ApplicableConfigurationCode:'Optional Standard or Custom applicability condition.',IsRequired:'Whether the applicable question must be answered before submission.',AnswerCode:'Yes, No, Unable to Verify, or Not Applicable when allowed.',CorrectionText:'Explanation or proposed correction associated with the response.',
  TargetRevisionHash:'Digest of the exact intent, evidence, or response approved. Changes invalidate prior authorization.',ApproverRoleCode:'Authorized role under which the approver made this decision.',DecisionReference:'Evidence or ticket supporting the decision.',ApprovalReference:'Reference to the authorization for this relationship or operation.',
  CreatedByService:'Collector service identity that created a discovered workspace stub. Mutually exclusive with CreatedByPersonID; never infer it from a source owner.',
  ActorService:'Service identity for a scripted event when there is no human actor.',EventCategoryCode:'Requested, Implemented, Observed, Review, or Attestation event category.',EventTypeCode:'Specific event kind; defines the type of before/after version references.',CorrelationID:'Identifier linking events produced by one request, collection, or command.',
  BeforeVersionID:'Prior version audit reference; EventTypeCode defines its object type.',AfterVersionID:'Resulting version audit reference; EventTypeCode defines its object type.',
  CreatedAt:'UTC time this registry row was inserted. Never substitute a source creation timestamp.',ModifiedAt:'UTC time of the most recent allowed update.',ModifiedByPersonID:'Person responsible for the most recent allowed update.',RowVersion:'SQL Server concurrency token. Reject updates based on an outdated token.',
  Comments:'Reviewer explanation, including required follow-up or change details.',Notes:'Supporting human-entered context. Exclude credentials and secret values.',Summary:'Brief factual description of the event or evaluation.',Explanation:'Reason for the comparison result, including missing evidence.',Reason:'Business or technical reason for this review, exception, or decision.',ErrorSummary:'Collection or processing failure summary without credential-bearing payloads.'
};
const human=(name:string)=>name.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/ID$/,'identifier');
const mutable=new Set(['Platform','PlatformInstance','BusinessLine','Person','DirectoryGroup','Principal','RegistryObject','Workspace','WorkspaceRequest','Asset','WorkspaceAsset','DataSource','Connection','Finding','AdministrativeReview','Attestation','PlatformRoleAssignment']);
export function columnDetails(table:TableSpec){
  const columns=[...table.columns,'CreatedAt datetime2 NOT NULL',...(mutable.has(table.name)?['ModifiedAt datetime2 NOT NULL','ModifiedByPersonID uuid FK → Person NULL','RowVersion rowversion NOT NULL']:[])];
  return columns.map(spec=>{
    const [name,type,...rest]=spec.split(' ');const constraints=rest.join(' ');const target=spec.split('→ ')[1]?.split(' ')[0];
    let purpose=purposes[name];
    if(!purpose&&constraints.includes('PK'))purpose=`Stable internal primary key for this ${table.name} row. Source-native identity is retained separately when applicable.`;
    if(!purpose&&target)purpose=`Links this ${table.name} row to ${target}. Role: ${human(name)}. Uses the internal key, never the record name.`;
    if(!purpose&&name.endsWith('Code'))purpose=`Controlled ${human(name.slice(0,-4)).toLowerCase()} value for this ${table.name} record. Allowed values and transitions follow the table rules.`;
    if(!purpose&&/(URL|URI)$/.test(name))purpose=`Approved http or https reference for ${human(name.replace(/URL|URI/,'' )).toLowerCase()}. Keep the referenced document external and exclude secrets from the URL.`;
    if(!purpose&&/(At|From|To)$/.test(name))purpose=`UTC timestamp for ${human(name).toLowerCase()} in this record's lifecycle. NULL means the event or boundary is not established.`;
    if(!purpose)throw Error('Column purpose missing: '+table.name+'.'+name);
    return {name,type:type==='uuid'?'uniqueidentifier':type,constraints,purpose};
  });
}
