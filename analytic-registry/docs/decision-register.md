# Analytic Registry — decision register

## V1 extract decision — 8 October 2026

The current delivery uses the [Excel extract and platform handoff](../../platform-data-collection/v1-extract/README.md). It uses exact normalized email matching after manual SQL staging. Retain native IDs separately. All unresolved identities and relationships go to Platform Manager. Alteryx collection uses MongoDB backend tables and read-only queries only.

Existing RunKey, ObservedAt, and manifest behavior remain unchanged. Classification, PRL, and risk repairs are deferred for V1. Existing product requirements remain. The plans below describe future implementation where they exceed this extract workflow. No live directory integration or application workflow repair has been implemented by this delivery.

Prepared 7 October 2026. This register consolidates the audit gaps, product questions, and collection decisions.

The objective is to close design choices without treating unknown corporate policy or untested infrastructure as verified. A chosen design can still require implementation and acceptance testing.

**Status meanings:** Confirmed = established user requirement. Selected = engineering choice made for the target design. Proposed = concrete operating default awaiting product-owner acceptance. Verification = evidence or configuration a delivery team must supply. The five policy questions have been answered below.

This document does not change live permissions, schedule jobs, send notifications, or enable production risk rules. It takes precedence over the earlier generic list of open questions. Existing code and the 53-table model require the changes identified below before they implement every selected decision.

## 1. Confirmed requirements — retain these

| ID | Decision | Basis |
|---|---|---|
| C-01 | Keep the React app as the product prototype. Build the operational application in Microsoft Power Apps. | Original brief. |
| C-02 | Use SQL Server in the deployment environment as the target registry database. Do not introduce a second editable registry in Dataverse. | Original brief explicitly names this target; the later SQL-versus-Dataverse question was redundant. |
| C-03 | Use related tables with explicit row grain and focused screen views. | Workspace, asset, connection, evidence, and workflow requirements. |
| C-04 | Retain five main sections. Keep every guided process below six steps. Default to Business view. | User's simplification decisions. |
| C-05 | Business Owner and Workspace Owner are one person field. Champions belong with workspace and owner information. | Explicit user decisions. |
| C-06 | Give an asset at most one accountable workspace. Preserve multiple observed physical memberships separately. | Confirmed product model. |
| C-07 | Retain internal IDs and exact native IDs. Match by platform instance, native scope, object type, and native ID. Names are labels. | Original brief and native-ID clarification. |
| C-08 | Business users create and maintain directory groups. Standard has Champion, RW, R, and DS purposes. DS names end in `_DS`. | Explicit user decisions. |
| C-09 | Groups inherit workspace accountability. Do not add a separate group business-owner field. Champion status adds no native privilege. | Explicit user decisions and original access model. |
| C-10 | Capture PII Yes/No, EUCT Yes/No, and one highest applicable DMP tier. | Explicit user classification fields. |
| C-11 | Custom setup and every annual attestation require Application Owner or Platform Owner approval. Closing evidence requires Platform Manager, Team, or Owner approval. | Explicit user approval decisions. |
| C-12 | Annual reviews may complete with linked follow-up after the required approval. Platform execution remains external and human controlled. | Confirmed workflow requirements. |
| C-13 | Preserve the 11 risk buckets and distinguish missing evidence, pending change, drift, and confirmed failure. | Original brief. |
| C-14 | Show workspace and asset mappings wherever real relationships exist. Keep connection technology visible. | Explicit mapping and connection-column requests. |

## 2. Selected design — no additional business choice required

| ID | Selected design | Consequence / implementation |
|---|---|---|
| D-01 | Use a Canvas Power App with an authenticated registry service over SQL Server. | The service exposes paged reads and commands. SQL views support queries; stored procedures or equivalent transactions enforce multi-row updates. Keep direct table mutation out of the client. |
| D-02 | Authenticate users through corporate Microsoft Entra ID. Resolve permissions at the service for every read and command. | Validate the caller's signed identity. Never trust an actor ID, role, or business-line filter supplied by the client. Business users see their assigned or accountable records; platform staff see their authorized platform instances. |
| D-03 | Keep service identities separate for collection, ingestion, application operations, and notifications. | Grant each identity its required scope. Collection is read-only. No role switch in the production UI creates authorization. |
| D-04 | Use separate development, test, and production environments with versioned deployments. | Keep endpoints and secrets in managed configuration. Require tested database migrations and a recovery plan. React browser storage remains a prototype feature. |
| D-05 | Collect source metadata into staging before resolving registry records. | Validate keys, types, duplicates, scope, row counts, and payload hashes. Quarantine invalid rows. An invalid dependency remains unresolved rather than becoming a false relationship. |
| D-06 | Make ingestion repeatable without duplicate effects. | A delivery key plus content hash identifies a run. Repeating the same delivery returns its receipt. Reusing the delivery key with different content is rejected. Commit each validated dataset and its coverage atomically. |
| D-07 | Use a managed native-identifier ledger, not an informal crosswalk spreadsheet. | Promote `ObjectNativeIdentifier` from the collection proposal into the next schema revision. Retain identifier namespace, object reference, verification evidence, validity interval, and steward approval. |
| D-08 | Assign identity stewardship to the registry administration team. | The source platform owner verifies an ID-to-ID crosswalk. A registry administrator records the binding. A rename never requires a new object; a recreated source ID never auto-merges by name. |
| D-09 | Retain report/model/source distinctions. | Power BI report and semantic model are separate assets. Tableau workbook and published data source are separate assets. Optional Tableau views remain child detail. Alteryx workflows retain their own native IDs. |
| D-10 | Separate connection technology from processing mode. | Oracle and SQL Server are technologies. Extract is a processing mode. Show an understandable connection summary while retaining both fields. Missing values remain Unknown. |
| D-11 | Use one classification vocabulary at asset and workspace levels. | Align DMP tier codes and EUCT Yes/No concepts. Preserve imported unknown values. Keep legacy labels as historical source values, not silently converted classifications. Corporate confidentiality labels remain a separate concept. |
| D-12 | Require complete, fresh evidence for every contributing dataset and relationship in an evaluation. | A fresh asset list cannot establish fresh permissions or complete lineage. Pin the exact input runs and versions. Evidence with missing fields cannot prove the corresponding control passed. |
| D-13 | Require explicit per-platform access mappings. | Record native capability, scope, inheritance, grant path, approved group purpose, and template version. Do not equate identically named roles across products. Confirm effective capability, not only direct assignments. |
| D-14 | Give Custom configuration an explicit, versioned baseline. | Record allowed principals, permissions, scope, business reason, compensating controls, approver, and review date. An absent baseline yields Unable to Verify; it is never an assumed zero-access policy. |
| D-15 | Keep every completed review immutable. | A correction or recurrence creates a linked follow-up case. The same stable finding may become active again; the prior closed case and its evidence remain unchanged. |
| D-16 | Keep submitted requests and approval receipts immutable. | Corrections create a linked replacement draft. Changed intent, evidence, or response requires a fresh approval. Recheck current role eligibility at the action boundary. |
| D-17 | Preserve annual amendments separately. | Keep one annual period identity. A post-completion correction creates an amendment linked to that period and needs fresh approval. Add amendment/revision support to the next schema revision. |
| D-18 | Drafts save automatically; submissions remain explicit. | Save after a short idle interval and when leaving a topic. Show Saving, Saved, and Save failed. Warn before leaving with unsaved changes. Never auto-submit or auto-approve. |
| D-19 | Resolve concurrent edits through explicit conflict handling. | Compare revisions on save. Retain the user's draft and display the newer record. Do not use last-write-wins for ownership, access, approvals, or evidence. |
| D-20 | Bind production assessment evidence to an asset version and material-change reference. | An initial release and material source, credential, access, processing, or audience change require assessment. Presentation-only changes remain exempt. A completed review with Changes required is not release approval. |
| D-21 | Keep deployment enforcement in the platform release process. | The registry records the decision and returns its verification reference. Administrators check that reference before release. Missing release telemetry yields Unable to Verify, not an invented Bypassed Gate finding. |
| D-22 | Use deterministic rules for approvals, matching, and risk evaluation in the first release. | No AI model decides authorization, identity merges, tier order, or evidence closure. An AI assistant is outside the first-release scope. |
| D-23 | Keep business declarations authoritative until changed through a governed workflow. | New evidence can trigger a proposed correction or review. It cannot overwrite business purpose, owner, expected access, PII/EUCT, or DMP declarations. |
| D-24 | Split first delivery into evidence availability, not reduced product scope. | Begin with workspace, asset, connection, identity, and lineage inventories. Enable permission, activity, and resource rules only after their datasets and baselines pass acceptance. All three platforms remain supported. |
| D-25 | Adopt the current first-release naming and text limits as registry defaults. | Business name: 100 characters. Workspace purpose: 500. Custom explanation: 1,000. Technical name: 3–100 uppercase letters, digits, or underscores, starting with a letter. Group name: the same pattern, 3–80 characters. A stricter verified platform limit wins. Keep suffixes CHAMPION, RW, R, and DS. Reject collisions; never bind by a matching name. |
| D-26 | Keep DS membership separate from group purpose. | The same person may belong to DS and RW. The four Standard purposes still require distinct group identities. DS does not imply all-source access. If a platform cannot isolate the required capability, document and approve the broader capability through Custom setup. |
| D-27 | Compare assessed asset tiers with the declared workspace tier without changing either automatically. | An asset assessed at a higher tier than the workspace declaration creates classification follow-up. Unknown asset tiers produce Unable to Verify. Tier 1 ranks above Tier 2 and Tier 3. |
| D-28 | Record an existing PRL approval as assessment evidence. | Require the manually assigned PRL, its reference, reviewer, and date when claiming an approved PRL. Do not add an unrequested second PRL approval workflow or treat a copied platform tag as approval. |

The selected service pattern is an engineering decision, not a claim that it is deployed. The enterprise application team supplies the host and private network route to the configured SQL Server host. Power Apps connector authentication and licensing must pass verification before implementation. The SQL connector supports views and stored procedures; its specific behavior does not remove the need for trusted caller authorization. See [Microsoft's SQL access guidance](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-connection-access-data) and [connector reference](https://learn.microsoft.com/en-us/connectors/sql/).

## 3. Proposed operating baseline — review as one package

These are proposed product settings, not assertions about existing corporate policy. The product owner can accept the package or change individual IDs.

| ID | Recommended setting | Why / boundary |
|---|---|---|
| O-01 | Include production, development, and test workspaces in registered platform instances. Include personal spaces for discovery and review. | Personal space does not imply misconduct. Apply production gates only to content identified as production. Every extract declares its included and excluded scope. |
| O-02 | Collect inventory, memberships, directory status, access, and connection metadata daily. Use a 48-hour freshness limit. | A missed daily run does not immediately invalidate everything. Any older evidence becomes Unable to Verify. First-pass scope can be smaller, but coverage remains explicit. |
| O-03 | Collect activity and resource telemetry daily where supported. Use a 72-hour arrival limit plus an explicit observation window. | Resource and usage conclusions need enough event coverage. Last activity is separate from the collection timestamp. |
| O-04 | Permit evidence from different collectors only when relevant collection times differ by at most 24 hours. | Every input must also pass its freshness and completeness checks. Otherwise record Unable to Verify and collect again. |
| O-05 | Treat absence in two complete, comparable inventories at least 24 hours apart as a missing-object candidate. | Keep the object and history. A platform administrator confirms retirement; neither absence nor age triggers deletion. One partial run never establishes removal. |
| O-06 | Start the annual cycle from registration approval. Issue the packet 30 calendar days before its anniversary. | Use a fixed annual due date rather than extending the next date after late completion. Use 28 February for leap-day anniversaries. Existing estates receive an approved initial due-date schedule. |
| O-07 | Send annual reminders 14 and 7 days before due, on the due date, and weekly while overdue. | Send to eligible Champions. Notify the owner and platform queue on overdue escalation. No active Champion creates immediate administrative work. Do not email all RW/R members. |
| O-08 | Use the in-app queue plus email. Send one weekday work digest at 09:00 America/New_York. Send immediate alerts only for High/Critical findings or failed production collections. | Group notices by recipient and workspace. Reference IDs and links; exclude sensitive evidence content. Notification delivery is future implementation, not enabled now. |
| O-09 | Use response targets: Critical 4 supported hours; High 1 business day; Medium 3 business days; Low 5 business days. | These are acknowledgement targets, not automatic closure deadlines. Remediation gets an explicit owner, due date, and extension reason. Security incidents also follow the existing incident process. |
| O-10 | Define registry support as weekdays 08:00–18:00 America/New_York, excluding the enterprise holiday calendar. | Existing enterprise incident support handles urgent out-of-hours events. This proposal does not invent a new staffed 24-hour team. |
| O-11 | Review Custom baselines at least annually and after any material change. Review temporary exceptions within 90 calendar days. | Expiry creates review work and prevents an exception from authorizing new changes. It does not automatically revoke live platform access. |
| O-12 | Use two active Champions as the preferred coverage target; allow one with a visible warning. Keep the maximum at ten. | No active Champion remains urgent. Two named Champions alone do not prove effective backup coverage. |
| O-13 | Define inactive use relative to declared business cadence. Flag a stale-use candidate after the greater of 30 days or two expected cycles. | Require complete activity evidence for that period. Seasonal and on-demand assets use the next expected-use date. No declared cadence means Unable to Verify. |
| O-14 | Set Low Adoption against a declared audience or usage target over a 90-day window. Set performance and concentration thresholds per platform and workload. | Do not invent one universal runtime, user percentage, or capacity threshold. A missing target produces Unable to Verify. The platform owner supplies versioned technical thresholds. |
| O-15 | Use restore targets of at most 24 hours of data loss and restoration within one business day. | Treat these as pilot design targets. The database team must prove backup and restoration can meet them before live reliance. |
| O-16 | Target common pages and first-page searches within 2 seconds at p95, and saves within 3 seconds at p95. Test at twice forecast pilot volume and concurrency. | The platform teams must supply the volume forecast. Imports remain asynchronous. Server paging and filtering are required; a local row cap cannot establish a complete result. |
| O-17 | Require new-owner acceptance and platform validation for ownership transfer. Notify the previous owner when available. | An inactive previous owner cannot block reassignment forever. Preserve both identities and the effective date. Existing role-based approval requirements remain in force. |
| O-18 | Confirmed: keep six calendar months of historical business metadata. The registry is not the official source system. | Apply to superseded versions, completed historical work, activity events, and source extracts. Keep current records, their supporting active approvals, and the identity index needed for refreshes. Detailed cleanup semantics follow Q-05 below. |

### Risk rules: the first-release interpretation

Every enabled rule needs a version, applicable platforms, owner, evidence requirements, severity, and test cases. Missing evidence creates unresolved work; it is not counted as a confirmed risk failure.

| Bucket | Required basis for a conclusive finding | Initial routing |
|---|---|---|
| Orphan | Confirmed missing required accountability or association. Directory evidence is required to conclude someone is inactive. | No active owner or Champion: High. Other missing associations: Medium pending impact review. |
| Stale | Complete activity window plus the asset's declared cadence and O-13. | Review candidate; Medium only after applicability is established. |
| Access Risk | Effective access differs from the approved baseline. | High for unintended write/admin access; otherwise Medium, subject to data impact. |
| Compliance Gap | A required declaration, assessment, or annual response is absent or overdue. | Medium; escalate based on production use and impact. |
| Bypassed Gate | A known applicable gate and reliable publication evidence show that release preceded approval. | High. A non-Champion RW publisher is not sufficient evidence. |
| Credential Exposure | Confirmed prohibited credential use or approved exposure evidence. | High and incident routing when appropriate. Unresolved credential identity stays Unable to Verify. |
| Performance Risk | Complete relevant telemetry exceeds the platform-approved workload threshold. | Platform review; severity follows measured impact. |
| Concentration Risk | Complete shared-resource telemetry exceeds an approved concentration threshold. | Platform review; use explicit capacity scope and period. |
| Coverage / Bus-Factor | A verified lack of capable backup support, considering Champion and support coverage. | Medium. One owner alone does not establish failure. |
| Privilege Sprawl | A principal's effective capability exceeds its approved purpose or scope. | High for unintended administration, otherwise Medium. Publisher population is compared with RW. |
| Low Adoption | Complete usage evidence falls below an agreed business target for the relevant period. | Low review candidate. Never retire content automatically. |

Critical severity requires documented current business or security impact. A bucket name alone does not make a finding Critical.

### Approval matrix

| Event | Eligible decision maker | Decision evidence |
|---|---|---|
| Technical setup | Platform Administrator | Exact request revision and validated prerequisites. |
| Sensitive-data/access change or owner acceptance | Business Owner / Workspace Owner | Applicable business revision and changed scope. |
| Custom setup or material Custom change | Application Owner or Platform Owner | Exact entitlement baseline and exception conditions. |
| Annual completion | Application Owner or Platform Owner | Frozen annual packet, response, and linked follow-up. |
| Evidence closure | Platform Manager, Platform Team member, or Platform Owner | Exact evidence revision, verification method, resolution, and linked findings. |

One eligible decision is sufficient for each required purpose. Separate purposes retain separate receipts. Independence follows Q-04 below. The role holder's identity and validity interval must be recorded.

## 4. Five product-owner decisions — confirmed

| ID | Question | Confirmed decision | Status |
|---|---|---|---|
| Q-01 | Which DMP tier is highest? | Tier 1 is highest, then Tier 2, then Tier 3. Use an explicit ranking lookup. Do not use numeric maximum to find the highest tier. | Confirmed by user, 7 October 2026 |
| Q-02 | What should PRL do in the first release? | Record an approved PRL manually. Retain inputs, but calculate no score. Capture approval/evidence reference, reviewer, and date. Keep old illustrative scores as historical values only. | Confirmed by user, 7 October 2026 |
| Q-03 | What does `_DS` authorize? | Create and maintain workspace data connections. Record the least native capabilities needed for this purpose. It does not imply workspace administration or unrestricted access to every source. Platform mappings still require verification. | Confirmed by user, 7 October 2026 |
| Q-04 | May someone approve their own work? | Yes, when the person holds the required role for the platform and decision. All evidence, revision, and eligibility checks still apply. Record the actual person and role; do not infer eligibility from ownership alone. | Confirmed by user, 7 October 2026 |
| Q-05 | Which retention schedule applies? | Keep business-metadata history for six calendar months. The user identifies the registry as a secondary metadata system, not the official source. | Confirmed by user, 7 October 2026 |

### Six-month history treatment

Keep the current workspace, asset, native-ID mapping, accountable owner, active configuration, and open work while they remain current. Their creation date alone does not make them history.

Start the six-calendar-month history period when a business version is superseded or work is completed. Start it at observation time for source extracts and at occurrence time for activity events. Retain the approval supporting a current configuration until that configuration is superseded, then keep its history for six months.

Keep a minimal identity index, including a retired object's native-to-registry mapping, while its platform instance remains registered. This is refresh state, not a retained full historical payload. Preserve stable identity when an old object is observed again. Removing a platform registration requires a separate controlled decommissioning action.

Run history cleanup monthly after the six-month boundary. Delete eligible historical payloads and their dependent detail together. Never leave broken foreign keys, remove open-case evidence, or orphan an active approval. Record cleanup counts and failures. Backups follow the same six-month maximum history objective and must not silently reintroduce expired payloads after restore.

History cleanup is a target design; it is not enabled against the user's prototype data. The proposed operating settings in section 3 can be accepted as one package, with exceptions by ID.

## 5. Delivery proof, ownership, and closure criteria

These items remain work even after decisions are accepted. They are not a reason to reopen the same design debate.

| Verification | Accountable delivery role | Evidence required |
|---|---|---|
| Source identity and installed versions | Each Platform Owner | Native scope, stable-ID samples from two runs, restore/recreate behavior, installed schema, row counts, and API capability. |
| DS and access mappings | Platform Owner with directory team | Reviewed native capability mappings and positive/negative access tests. |
| Hosting, network, connector, and license fit | Enterprise application/platform team | Approved service host, authenticated route to the configured SQL Server host, connector proof, and license entitlement. No new purchase is authorized by this document. |
| Caller identity and least privilege | Identity/security team | Negative tests for cross-workspace reads, unauthorized decisions, forged actor IDs, expired roles, and service scope. |
| Risk thresholds and corporate classification | Data-policy owner and Platform Owners | Referenced policy versions, DMP hierarchy, allowed terms, workload thresholds, and example evaluations. |
| Six-month history cleanup | Registry application owner with database team | Eligible-record selection, protected current references, dependent-row cleanup, and restore/cleanup compatibility. |
| Reliability and support | Registry support lead and database team | Named service queues, holiday calendar, monitored jobs, recovery exercise, and escalation routing. |
| Scale and usability | Product owner and test lead | Forecast volume/concurrency, paged-result completeness, performance measurements, accessibility review, and business acceptance. |

### Map every audit gap to its resolution

| Audit gap | Decision treatment | Work still required |
|---|---|---|
| G-01 Authentication and roles | D-02, D-03; Q-04 sets independence. | Implement and test server-side authorization and named role assignments. |
| G-02 Ingestion service | D-05, D-06, D-24. | Build staging, importer, transactions, and monitoring. |
| G-03 Risk policy | O-02–O-05, O-11–O-14 and the risk matrix. | Accept settings; load platform thresholds; prove dataset coverage. |
| G-04 SQL/Dataverse | C-02, D-01. | Verify hosting, network, licensing, and trusted identity. |
| G-05 Stable source identity | C-07, D-07, D-08. | Validate real ID samples and implement the managed identifier ledger. |
| G-06 Classification and PRL | D-11; Q-01 and Q-02 are confirmed. | Apply Tier 1 > Tier 2 > Tier 3 and manual PRL; preserve legacy fields. |
| G-07 Promotion gates | D-20, D-21. | Implement release-reference checks and gather publication evidence. |
| G-08 Dataset-level evidence | D-12, O-02–O-04. | Replace the prototype's workspace-level confidence simplification. |
| G-09 Scheduling and operations | O-06–O-10, O-15. | Accept targets; build monitored jobs and notification delivery. |
| G-10 Accessibility/security/load | D-02, D-04, O-16. | Complete formal testing and define the load fixture from the volume forecast. |
| G-11 Retention and audit | Q-05 confirms six-month history; O-18 defines treatment. | Implement cleanup and protected current records and identity mappings. |
| G-12 Draft saving | D-18, D-19. | Implement autosave, leave warnings, and conflict recovery. |
| G-13 Reopening and recurrence | D-15–D-17. | Implement linked follow-up cases and annual amendments. |
| G-14 Multiple memberships and unknown values | C-06, D-09–D-12. | Implement the full association model and explicit unknown classification states. |
| G-15 Live collection proof | D-24 and the source-verification row above. | Platform teams run the SQL/API collectors and validate samples. |

### Definition of decisions closed

1. Keep the confirmed Q-01 through Q-05 decisions in the requirements and implementation backlog.
2. Accept the operating package, recording any changed O-numbered settings.
3. Record policy references and assign real people or service groups to accountable roles.
4. Update the affected requirements, schema, collection contract, and implementation backlog.
5. Keep delivery checks open until evidence proves the agreed design works.

The first release should not claim a comprehensive control evaluation merely because its decisions are documented. A complete solution needs both a closed decision register and successful delivery checks.

Related documents: [business/product definition](business-product.md), [requirements](requirements.md), [audit](audit-report.md), [table model](data-model.md), [glossary](../GLOSSARY.md), and [collection identity rules](../../platform-data-collection/identity-and-refresh.md).
