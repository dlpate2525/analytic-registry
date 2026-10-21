import { prototypeRelease } from '../src/data/release.ts';
import { columnDetails } from '../src/data/columnDictionary.ts';
import fs from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { schema, modelNotes } from '../src/data/schema.ts';
import { RelationshipDiagram } from '../src/pages/DataModel.tsx';
const mermaid=`erDiagram
    Platform ||--o{ PlatformInstance : scopes
    PlatformInstance ||--o{ RegistryObject : identifies
    RegistryObject ||--o| Workspace : subtype
    RegistryObject ||--o| Asset : subtype
    RegistryObject ||--o| Connection : subtype
    Workspace ||--o{ WorkspaceBusinessVersion : declares
    Workspace ||--o{ WorkspaceAsset : associates
    Asset ||--o{ WorkspaceAsset : participates
    Asset ||--o{ AssetVersion : releases
    AssetVersion ||--o{ AssetAssessment : reviewed
    AssetVersion ||--o{ DeclaredAssetConnection : expects
    Connection ||--o{ DeclaredAssetConnection : serves
    Connection ||--o{ ObservedConnection : observed
    DataSource |o--o{ ObservedConnection : resolves
`;
const reconciliation=`erDiagram
    Workspace ||--o{ WorkspaceRequest : requests
    Workspace ||--o{ ConfigurationVersion : versions
    WorkspaceRequest |o--o{ ConfigurationVersion : proposes
    ConfigurationVersion ||--o{ ChampionAssignment : selects
    Person ||--o{ ChampionAssignment : accountable
    ConfigurationVersion ||--o{ GroupSpecification : specifies
    DirectoryGroup |o--o{ GroupSpecification : resolves
    PlatformInstance ||--o{ ExtractRun : collects
    ExtractRun ||--o{ ExtractDataset : completeness
    ExtractRun ||--o{ ConfiguredAccessSnapshot : observes
    ExtractRun ||--o{ ObservedWorkspaceAsset : memberships
    ExtractRun ||--o{ ObservedAssetConnection : lineage
    ExtractRun |o--o{ RuleEvaluation : evidence
    ConfigurationVersion |o--o{ RuleEvaluation : compares
`;
const reviews=`erDiagram
    DetectionRuleIdentity ||--o{ DetectionRule : versions
    DetectionRule ||--o{ DetectionCoverage : capability
    Platform ||--o{ DetectionCoverage : supports
    DetectionRule ||--o{ RuleEvaluation : evaluates
    RegistryObject ||--o{ RuleEvaluation : checked
    RegistryObject ||--o{ Finding : affects
    Finding ||--o{ FindingEvaluation : recurs
    RuleEvaluation ||--o{ FindingEvaluation : supplies
    Finding ||--o{ ReviewFinding : investigated
    AdministrativeReview ||--o{ ReviewFinding : coordinates
    Workspace ||--o{ Attestation : annually
    Attestation ||--o{ AttestationRecipient : champions
    Attestation ||--o{ AttestationAnswer : records
    AttestationQuestion ||--o{ AttestationAnswer : answers
`;
const intro=`# Analytic Registry data model for Power Apps

Historical V1 53-table design, retained for comparison. Use the [V1.1 foundation](v1.1-model-simplification.md) and [V1.1 delivery](../../platform-data-collection/v1.1-extract/README.md) for current development. The [V1 baseline](v1-prototype-baseline.md) records its original scope.

The [Excel extract workbook](../../platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx) is the V1 delivery contract for manual SQL staging. It contains 15 sheets: three guides, nine import tables, and three platform output layouts. The nine staging tables and 117 delivery columns are distinct from this 53-table target application model. Use the [collection handoff](../../platform-data-collection/v1-extract/README.md) for queries, exact headers, and import validation.

V1 matches source email to directory mail within the configured tenant. Preserve native IDs and route every unresolved identity or relationship to Platform Manager. Alteryx collection uses backend MongoDB queries. Existing RunKey and ObservedAt are unchanged. None of this connects the mock UI to live data.

Use multiple related tables with explicit grains. Do not use one large editable table. A workspace can have many assets, Champions, access assignments, and findings. Combining these creates repeated rows, inflated counts, and ambiguous updates.

This is a proposed logical SQL Server design for the configured SQL Server host. It is not deployed DDL. The React prototype implements a smaller local mock model. The table dictionary below is the design target, not a claim that all of it is already implemented.

## Reading the design

Grain means what one row represents. PK is a primary key. FK is a foreign key. UUID means SQL Server uniqueidentifier. Date-time columns use UTC datetime2. NULL explicitly marks optional values; unmarked FK columns are required. UNIQUE rules are listed per table.

All tables also include CreatedAt datetime2 NOT NULL. Mutable app records include ModifiedAt datetime2 NOT NULL, ModifiedByPersonID uuid NULL, and RowVersion rowversion. Immutable versions, evaluations, observations, and completed answers use append-only writes. Code columns require checked values or maintained lookup tables. Proposed field lengths require business approval.

## Platform and native identity

Platform is a controlled reference with Power BI / Fabric, Tableau, and Alteryx rows. PlatformInstance adds tenant, site, server, environment, and product version. Alteryx Server 2025.2 is an instance version.

RegistryObject references PlatformInstance. PlatformID is therefore available for every workspace, asset, and connection. Each screen view exposes PlatformID and PlatformName explicitly. Child tables derive platform through their parent, avoiding contradictory duplicated values. A canonical DataSource can be shared across platforms and does not require a single owning platform.

Use an internal ObjectID and a filtered unique native key: instance + native scope + native object type + native object ID. Names are attributes. A create request can have a stable ObjectID before a native object exists. Provisioning binds the returned native ID to that object; an ambiguous discovery goes to reconciliation.

RegistryObject is an identity supertype only, not a generic attribute store. Exactly one Workspace, Asset, or Connection subtype must match ObjectTypeCode. Enforce same-instance membership constraints in commands and ingestion unless an approved cross-instance relationship is explicitly supported.

## Relationship diagrams

Each parent-to-many relationship can have zero children. An asset may have no workspace association. The subtype diagram permits each individual subtype to be absent, but exactly one subtype must exist across the three.

### Registry and lineage

\`\`\`mermaid
${mermaid}\`\`\`

### Intent and observation

\`\`\`mermaid
${reconciliation}\`\`\`

ConfigurationVersion is used separately for requested and implemented snapshots. RuleEvaluation pins both IDs independently. The diagram abbreviates the two foreign keys to one relationship.

### Detection and review

\`\`\`mermaid
${reviews}\`\`\`

## What the app creates and what exists

| State | Writer | Authoritative tables | Meaning |
|---|---|---|---|
| Business metadata | Business user, through validated app commands | WorkspaceBusinessVersion, AssetVersion | Purpose, owner, declared audience and classification context |
| Requested configuration | Business user | WorkspaceRequest, requested ConfigurationVersion, ChampionAssignment, GroupSpecification | Desired future setup; may refer to groups or workspaces not created yet |
| Implemented configuration | Platform administrator | Implemented ConfigurationVersion, AdministrativeAction | What the administrator records as completed externally |
| Observed platform state | External extraction scripts | ExtractRun, ExtractDataset, Observed tables, access snapshots | What the platform actually reported at a specific time and scope |
| Comparison | Assessment script or reviewer | RuleEvaluation, ConfigurationComparisonItem, EvidenceItem | Comparison against pinned versions, evidence, and rule version |
| Tracked issue | Assessment upsert and reviewers | Finding, FindingEvaluation, AdministrativeReview | Persistent issue lifecycle, not a new issue for every extract |

App submission is not proof of provisioning. An administrator action is not proof of verified platform state. Observation never silently overwrites historical intent.

## Confirmed business decisions

- Business Owner and Workspace Owner are one field: OwnerPersonID.
- Workspace requests require a PII Yes/No declaration, an EUCT Yes/No declaration, and exactly one highest applicable DMP tier: Tier 1, Tier 2, or Tier 3. These describe intended content. Tier 1 is highest, followed by Tier 2 and Tier 3. Do not overwrite declarations from asset observations.
- Each asset has at most one accountable workspace. Keep observed physical memberships separate.
- Business users own group creation and ongoing membership maintenance. Group names remain pending until directory evidence resolves a real ID.
- Custom workspaces and all annual attestations require Application Owner or Platform Owner approval. These role names identify alternative eligible approvers; actual role assignments remain configurable.
- No additional unverified-identity approval gate is added (item 6 was marked N/A). Existing inactive-person restrictions and unresolved-evidence labels remain.
- New asset assessment is required for initial production release and material changes to sources, credentials, access, processing, or audience. Minor presentation changes do not restart the review.
- Conclusive reconciliation requires complete and sufficiently recent evidence. Exact freshness thresholds remain to be defined. Overdue pending requests are distinct from drift.
- Closing evidence requires Platform Manager, Platform Team, or Platform Owner approval. A later evidence change invalidates the old approval.
- An annual attestation can become Complete with follow-up after owner approval, with a linked correction review. Freeze the reviewed context.

## Confirmed interface direction

Default to Business view. Show four key numbers on the home dashboard. Keep five sections: Dashboard, Workspaces, Assets, Requests, and My work. Annual reviews sit inside My work. Collapse administrative tools into one menu. Workspace lists show name, platform, owner, status, and next action. Requests, reviews, and annual attestations use short guided steps. Estate-wide analytics remains in Administrator view.

## Table dictionary

${schema.length} logical tables are specified below. This separates all requested grains and histories. It does not imply ${schema.length} screens or require every module in the first delivery.

`;
const dictionary=schema.map(t=>`### ${t.name}

**Domain:** ${t.domain}. **Grain:** ${t.grain}. **Writer:** ${t.writer}.

| Column | Proposed type, keys and nullability | Purpose (under 200 words) |
|---|---|---|
${columnDetails(t).map(c=>'| '+c.name+' | '+c.type+' '+c.constraints+' | '+c.purpose+' |').join('\n')}

**Integrity and behavior:** ${t.rules}

`).join('');
const risks=[['Orphan','RegistryObject, WorkspaceAsset, WorkspaceBusinessVersion, observed membership and lineage','Evaluate missing accountability or required association at the object grain; retain orphan identities.'],['Stale','ObservedAsset.LastActivityAt, AssetVersion.ExpectedActivityCadenceDays','Compare to declared cadence; missing activity evidence is unresolved.'],['Access Risk','Implemented GroupSpecification, ApprovedAccessException, ConfiguredAccessSnapshot','Compare stable principals and native permissions.'],['Compliance Gap','Business versions, assessments, evidence, attestations','Missing required metadata or overdue review; evidence coverage is separately recorded.'],['Bypassed Gate','AssetVersion release, completed AssetAssessment, ObservedAsset publisher and time','Check the required promotion gate. Non-Champion RW publishers remain valid.'],['Credential Exposure','ObservedConnection identity, Connection.CredentialPolicyCode','Confirmed prohibited personal credential is a discrepancy. Unknown identity needs investigation; no automatic exposure label.'],['Performance Risk','ObservedAsset durations and versioned DetectionRule thresholds','Only compare applicable thresholds in the same measurement context.'],['Concentration Risk','ObservedAsset resource metrics and measurement windows','Add platform-specific resource metric fact tables when extract contracts are agreed. A single aggregate duration does not fully support concentration detection.'],['Coverage / Bus-Factor','ChampionAssignment, GroupMembershipSnapshot, Person','One Champion warns of limited backup. No active Champion gets urgent administrative review. One owner alone is not a failure.'],['Privilege Sprawl','EffectiveAccessSnapshot and approved RW/R purposes','Compare against approved RW, not the Champion roster. Preserve multiple access paths separately.'],['Low Adoption','ObservedAsset.ConsumerCount and window, declared audience and cadence','Low activity must be interpreted relative to expected use and evidence completeness.']];
const tail=`## Reconciliation logic

1. Select the applicable approved business and requested configuration versions.
2. Select the latest applicable recorded implemented version for that workspace.
3. Select complete, sufficiently fresh evidence per required dataset and scope.
4. Evaluate the applicable versioned rule and pin every baseline ID.
5. Store the comparison result and evidence, including non-failures.
6. Upsert a finding only when the rule requires a tracked issue.
7. Record human review and external remediation actions.
8. Verify with subsequent evidence before resolving the finding.

| Requested | Implemented | Observed | Result |
|---|---|---|---|
| RW = G2 | RW = G1 | RW = G1 | Pending Implementation, not drift |
| No direct user | No direct user | User P16 has publish | Discrepancy unless an applicable approved exception permits it |
| Four Champions | Four people | Unreadable group membership | Unable to Verify, not inactive |
| Four Champions | Four people | Six different members | Flagged for Review; reconcile sets, not just counts |
| New workspace | Provisioned | No assets or connections | Connection controls Not Applicable; content readiness Pending |
| Approved Custom six groups | Six groups | Same six groups | Aligned; extra group count is not itself a finding |
| G1 display name A | G1 display name A | G1 display name B | Same identity; evaluate naming separately if a naming rule applies |

A pending request does not suppress unrelated drift. Compare observed against implemented first, then explain requested deltas. Partial implementation records actual applied values. Retain unmet prerequisites. A rollback creates a new implementation record; it does not rewrite history.

Finding fingerprint uses stable rule identity, affected ObjectID, and the issue discriminator. Include principal/permission or association workspace context when relevant. Repeated detection updates LastDetectedAt and adds FindingEvaluation. Reopening uses the same tracked issue. Do not auto-resolve because an extract failed or a row disappeared from an incomplete dataset.

## Risk bucket evidence map

| Bucket | Tables and evidence | Interpretation |
|---|---|---|
${risks.map(r=>'| '+r.join(' | ')+' |').join('\n')}

DetectionCoverage says what can be checked. RuleEvaluation says what happened when a check ran. Finding says which issue needs tracking. AdministrativeReview says who is handling it.

## Power Apps access pattern

Use normalized SQL tables as the system of record and focused views for screens. Proposed views:

| Read view | Grain | Main fields |
|---|---|---|
| vwWorkspaceSummary | WorkspaceID | PlatformID, native name, business name, owner, LOB, configuration, lifecycle, distinct asset/finding counts, attestation due |
| vwWorkspaceComparison | WorkspaceID × FieldCode × SubjectStableKey | Requested, implemented, observed, result, version IDs, evidence date |
| vwAssetSummary | AssetID | PlatformID, primary accountable workspace, latest declared version, assessment status, classifications |
| vwAssetMembership | WorkspaceID × AssetID | Declared and observed membership, evidence run, association status |
| vwAssetLineage | AssetID × ConnectionID × selected evidence run | DataSourceID, authentication and identity classification, evidence status |
| vwReviewQueue | AdministrativeReviewID | PlatformID, object, priority, severity, age, owner/LOB context, assigned reviewer, status |
| vwAttestationPacket | AttestationID, with child queries | Frozen business/configuration IDs, recipient list, assets, connections, questions, findings |
| vwFindingSummary | FindingID | Rule, bucket, affected object, current severity/status, first/last detection |
| vwDetectionCoverage | Rule version × PlatformID × current validity | Capability, requirements, applicable product version |

Preaggregate each child collection independently before joining a workspace summary. Count distinct workspace and asset IDs for affected populations. Do not join Champions × assets × findings and then count rows. Scope platform and LOB filters consistently; unassociated objects need an explicit Unknown LOB bucket.

Microsoft documents that SQL tables require primary keys to support updates; SQL views support reads, and stored procedures can perform writes. Recommended transactional commands are SaveRequestDraft, SubmitWorkspaceRequest, RecordImplementation, SaveAssetAssessment, UpdateAdministrativeReview, IssueAnnualAttestation, CompleteAttestation, and RecordVerification. Multi-row submission belongs in a server transaction with concurrency checks, not several unrelated Patch calls. [Microsoft SQL data access](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-connection-access-data).

Use delegable server filters for platform, LOB, status, severity, dates, and indexed search fields. Do not calculate enterprise counts from a client collection that might be truncated by delegation limits. [Microsoft delegation guidance](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview).

Authorize users and commands on the server. Hiding an admin button is not authorization. Verify SQL permissions, connection identity, gateway design, and row restrictions for the deployment. [Microsoft SQL security guidance](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-server-security).

Use surrogate keys on bridge tables for direct app editing, plus composite unique constraints to preserve grain. Index all FKs and common queue filters. Add filtered unique constraints for active associations and scoped native IDs. Use RowVersion on mutable headers to detect concurrent edits. Rule services and command transactions enforce cross-row maximum counts and effective-date overlap rules.

## Implementation phases

1. Registry and onboarding: platform/instance, people/groups, workspace identity, business versions, requests, configuration versions, Champion and group children. Validate the Standard path first.
2. Assets and reviews: asset identity/releases, declared membership, asset assessments, connection identity, expected lineage.
3. Evidence and reconciliation: extract completeness, observed snapshots, configured/effective access, rules, coverage, evaluations, evidence, deduplicated findings.
4. Operating cycle: administrative cases/actions, immutable implementation records, annual attestation packets/answers, audit views.

## Confirmed V1 decisions and future verification

- SQL Server is the selected target database. The prototype uses local mock data; manual Excel/CSV staging is the first delivery process.
- Native IDs retain platform, instance, scope, and object type. Email matching resolves people, not asset identity.
- Every unresolved identity or relationship goes to Platform Manager. A failed lookup does not establish a disabled account.
- An asset has at most one accountable workspace. Physical memberships remain separate.
- Tier 1 is highest. PII/EUCT are Yes/No declarations. Approved PRL is recorded manually with no calculated score. Classification, PRL, and risk repairs remain deferred.
- The _DS group authorizes creating and maintaining workspace data connections, subject to supported native capabilities.
- Eligible role holders may self-approve. Keep six calendar months of historical business metadata, plus current records and the identities needed for refreshes.
- Database access, gateway, authentication, licensing, installed-platform schema validation, native permission mappings, and operating thresholds remain future verification. Prototype approval does not approve production settings.

See the [decision register](decision-register.md) and [review backlog](github-review-and-repair-plan.md) for detailed status. The [V1 baseline](v1-prototype-baseline.md) takes precedence over earlier alternatives.

## Prototype simplifications

The React store has direct platform labels, one current workspace pointer per asset, a current observed extract, simplified review links, and local browser persistence. It does not yet implement command transactions, SQL constraints, multiple observed collection memberships, or real identity checks. Local annual packets and approval receipts are now modeled. This proposed schema deliberately addresses those gaps before a Power Apps implementation.
`;
const md=intro+dictionary+tail;
fs.mkdirSync('docs',{recursive:true});fs.mkdirSync('public',{recursive:true});
fs.writeFileSync('docs/data-model.md',md);
fs.writeFileSync('docs/registry-relationships.mmd',mermaid);fs.writeFileSync('docs/reconciliation-relationships.mmd',reconciliation);fs.writeFileSync('docs/review-relationships.mmd',reviews);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Analytic Registry · Relationship and column guide</title><style>body{font:15px/1.7 'Segoe UI',sans-serif;color:#304a3c;background:#f3f7f2;margin:0}main{max-width:1120px;margin:auto;padding:50px 30px}h1{font-size:36px;letter-spacing:-1px}h2{margin-top:45px}p{max-width:900px}section{background:white;padding:24px;border:1px solid #dce7db;border-radius:6px;margin:22px 0}.model-canvas{overflow:auto}svg{width:100%;min-width:760px}details{background:white;border:1px solid #dce7db;padding:15px 20px;margin:10px 0}summary{cursor:pointer;font-weight:600}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;border-bottom:1px solid #e7ede5;padding:10px}small{color:#758b70}.badge{color:#557b42}input{width:100%;padding:13px;border:1px solid #b9d1af;border-radius:5px;font:inherit;box-sizing:border-box}a{color:#30704c}.intro{background:#e7f0e2;padding:22px}footer{margin:40px 0;color:#718a69;font-size:12px}@media print{input{display:none}details{break-inside:avoid}svg{min-width:0}}</style><main><small>${prototypeRelease.version} · FUTURE LOGICAL MODEL</small><h1>Analytic Registry relationships and columns</h1><p><a href="review-pack.html">V1 documentation</a> · <a href="../../platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx">Excel extract workbook</a> · <a href="v1-prototype-baseline.md">V1 baseline</a></p><p>The workbook defines nine staging tables. The 53-table model below describes the future application database.</p><div class="intro"><strong>Use multiple related tables, not one large editable table.</strong><p>Keep workspace, asset, access, connection, evidence, and review grains separate. The app records intent. Administrators record implementation. External extracts record observed reality.</p></div><p>${schema.length} logical tables with explicit keys and columns. This is a design proposal, not a deployed SQL database. <a href="data-model.md">Read the complete design narrative and Power Apps mapping</a>.</p>${[0,1,2].map((n)=>'<section><h2>'+['Registry and lineage','Intent and observed evidence','Reconciliation and review'][n]+'</h2>'+renderToStaticMarkup(createElement(RelationshipDiagram,{index:n,onPick:()=>{}}))+'</section>').join('')}<h2>Design decisions</h2>${modelNotes.map(([h,p])=>'<h3>'+escape(h)+'</h3><p>'+escape(p)+'</p>').join('')}<h2>Column dictionary</h2><p>PK = primary key; FK = foreign key; uuid = uniqueidentifier. NULL is explicit. Unmarked FK columns are required. Every table also has CreatedAt datetime2 NOT NULL. Mutable app records add ModifiedAt, ModifiedByPersonID, and RowVersion.</p><input id="search" placeholder="Filter by table name or column" aria-label="Filter column dictionary">${schema.map(t=>'<details class="entry"><summary>'+escape(t.name)+' <small> · '+escape(t.domain)+'</small></summary><p><strong>Grain:</strong> '+escape(t.grain)+'<br><strong>Writer:</strong> '+escape(t.writer)+'</p><table><thead><tr><th>Column</th><th>Type / key / nullability</th><th>Purpose</th></tr></thead><tbody>'+columnDetails(t).map(c=>'<tr><td>'+escape(c.name)+'</td><td>'+escape(c.type+' '+c.constraints)+'</td><td>'+escape(c.purpose)+'</td></tr>').join('')+'</tbody></table><p>'+escape(t.rules)+'</p></details>').join('')}<h2>Microsoft implementation references</h2><p><a href="https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-connection-access-data">SQL data access, views, primary keys, and stored procedures</a><br><a href="https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview">Delegation and server-side queries</a><br><a href="https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-server-security">SQL connection security</a></p><footer>${prototypeRelease.label} · ${prototypeRelease.version} · ${prototypeRelease.displayDate} · No backend has been deployed</footer></main><script>document.getElementById('search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.entry').forEach(d=>{d.hidden=!d.textContent.toLowerCase().includes(q);if(q&&!d.hidden)d.open=true;});});</script></html>`;
fs.writeFileSync('docs/data-model.html',html);
console.log(`Generated ${schema.length}-table dictionary, three diagrams, and standalone HTML.`);


fs.writeFileSync('docs/column-dictionary.csv','Table,Grain,Column,SQLType,Constraints,Purpose\n'+schema.flatMap(t=>columnDetails(t).map(c=>[t.name,t.grain,c.name,c.type,c.constraints,c.purpose].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))).join('\n'));
