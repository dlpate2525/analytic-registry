# Analytic Registry — requirements and acceptance criteria

7 October 2026. **Prototype** means working local behavior. **Design** means specified for production but not deployed. Proposed operational targets need owner agreement.

## Functional requirements

| ID | Requirement and acceptance criterion | Current state |
|---|---|---|
| FR-01 | Support Power BI/Fabric, Tableau, and Alteryx. Native unit labels reflect workspace, project, and collection. | Prototype |
| FR-02 | Retain an internal UUID and scoped native identity for each workspace, asset, and connection. Refresh by IDs, never names. | Logical schema + collection pack; mock uses sample IDs |
| FR-03 | Renames preserve identity; moves update observed membership. Native ID changes require a new object or approved crosswalk. | Design + offline collector tests |
| FR-04 | Use a single Business Owner / Workspace Owner field. Preserve original onboarding LOB and historical declarations. | Prototype displays; full versioning is Design |
| FR-05 | Each asset has at most one current accountable workspace. Preserve orphan identities and multiple observed physical memberships separately. | Prototype one pointer; full associations are Design |
| FR-06 | Store asset-to-asset dependency and asset-to-connection lineage. Do not assume connections belong directly to workspaces. | Prototype direct lineage; dependency table + collection pack |
| FR-07 | Separate business metadata, requested setup, implemented setup, observed evidence, and comparison results. | Prototype + Design |
| FR-08 | Provide Create New, Register Existing, Update Existing, and annual review entry points. Registration selects a discovered record of the correct platform. | Prototype |
| FR-09 | Require purpose, known eligible owner, platform, and 1–10 unique Champions on request submission. Inactive assignments block; one Champion warns. | Prototype, automated checks |
| FR-10 | Show Unverified identity as unresolved. Do not classify it as inactive or invent an extra approval gate. | Prototype |
| FR-11 | Capture workspace PII Yes/No, EUCT Yes/No, and exactly one highest applicable DMP tier. Tier 1 is highest, then Tier 2, then Tier 3. | Prototype declarations; confirmed ordering to apply consistently |
| FR-12 | Standard includes Champion, RW, R, and DS group purposes. Groups inherit workspace accountability; DS suggestions end in `_DS`. | Prototype |
| FR-13 | Distinct group purposes cannot reuse one group. Existing selections resolve to IDs; new names remain prerequisites. | Prototype |
| FR-14 | Custom requires a reason; Other requires explanation. Permit alternate groups and document alternative security/authentication. | Prototype |
| FR-15 | Custom requires Application Owner or Platform Owner approval. A large group count alone creates no finding. | Prototype |
| FR-16 | Submitted requests are immutable. Corrections create linked drafts and fresh approval context. Superseded requests leave active queues. | Prototype |
| FR-17 | Approval, external implementation, and verification are separate milestones. Verification cannot predate implementation or occur in the future. | Prototype |
| FR-18 | Show one compact My work inbox with setup, accountability, evidence/risk, and annual themes. Counts and filters use the same records. | Prototype |
| FR-19 | Support platform, business line, severity, ownership, and risk-bucket filtering where applicable. | Prototype |
| FR-20 | Show Workspace and Asset mapping columns where real relationships exist; retain missing associations explicitly. | Prototype |
| FR-21 | Asset assessments capture release, purpose, audience, people, references, PRL inputs, classifications, reviewer, date, status, and outcome. | Prototype |
| FR-22 | Initial production release and material source, credential, access, processing, or audience changes require assessment. Minor presentation changes are exempt. | Guidance in prototype; release enforcement is Design |
| FR-23 | Reject invalid dates, unknown/inactive assessors, negative counts, and unsafe reference URL schemes. Historical assessments cannot alter current classifications. | Prototype, automated checks |
| FR-24 | Record an approved PRL manually and retain readiness inputs. Calculate no score. Preserve historical illustrative values separately. | Confirmed decision; prototype scoring field and evidence capture require alignment |
| FR-25 | Risk buckets are outputs, not onboarding questions. Preserve all 11 specified buckets and their meanings. | Prototype fixtures; production evaluator is Design |
| FR-26 | Pending requested change differs from drift. Preserve unrelated drift even when a request is pending. | Prototype, automated checks |
| FR-27 | Require usable, complete, sufficiently fresh evidence for conclusive comparison. Unknown freshness/completeness yields Unable to Verify. | Prototype workspace metadata; dataset-level Design |
| FR-28 | Detection capability is Available, Partial, Manual Review Required, or Not Available, distinct from result. | Prototype |
| FR-29 | Repeated detection must update one finding lifecycle using stable rule, object, and issue identity. Count distinct affected objects separately. | Logical schema; mock fixtures |
| FR-30 | Prioritize no active Champions, no active owner, orphaned workspace, orphaned asset, and unassociated connection reviews. Severity can increase with impact. | Prototype + configurable Design |
| FR-31 | A business user can respond only to assigned business work. Administrative actions and verification are protected. Completed cases remain immutable. | Prototype role simulation |
| FR-32 | Closure requires resolution, valid verification, exact evidence, and Platform Manager, Platform Team, or Platform Owner approval. | Prototype, automated checks |
| FR-33 | Close only the explicitly linked findings. Never alter platform state as a consequence of a review status change. | Prototype |
| FR-34 | Annual review recipients are selected Champions, not all RW/R members. Freeze the review context and questionnaire version. | Prototype snapshot; delivery/versioned questions are Design |
| FR-35 | Every annual response requires Application Owner or Platform Owner approval. Exceptions produce linked follow-up. | Prototype |
| FR-36 | Annual completion with open follow-up is permitted after owner approval. Resubmission must preserve the existing follow-up investigation. | Prototype |
| FR-37 | Administrator operations use Collect, Assess, Prepare, Execute, Verify. All platform execution stays external and human approved. | Prototype guidance; no execution integration |
| FR-38 | Persist local edits across reload. Failed saves must not show success. Malformed data and cross-tab conflicts must not silently overwrite saved records. | Prototype, automated checks |
| FR-39 | Offer export and recoverable reset for local prototype data. Never reset user data as part of testing. | Prototype |
| FR-40 | Provide the business/product definition, relationship diagrams, complete column dictionary, audit report, and collection mapping contract. | Delivered documents |
| FR-41 | DS groups create and maintain workspace data connections through approved platform-specific capabilities. The suffix alone confers no access. | Confirmed purpose; native mappings require platform verification |
| FR-42 | Permit self-approval when the authenticated person holds the required role and scope. Apply all evidence, state, and revision checks. | Prototype allows eligible same-person approval; production authorization is Design |
| FR-43 | Keep six calendar months of business-metadata history. Preserve current records, open-work evidence, active approval dependencies, and native-ID mappings. | Confirmed duration; controlled cleanup is Design |

## Nonfunctional requirements

| ID | Requirement | Verification / status |
|---|---|---|
| NFR-01 | Use five main sections and fewer than six steps per process. Disclose detailed context progressively. | Current requests 5, assessments 5, reviews 3, annual 3, external administration 5 |
| NFR-02 | Use readable labels, visible focus, keyboard operation, accessible names, text alternatives, and status text independent of color. | Improved labels, focus, skip link, and status colors. Formal WCAG 2.2 AA audit remains required |
| NFR-03 | Support desktop and narrow screens. Wide data tables may scroll within their container. Main navigation remains reachable. | Browser desktop/narrow inspection recorded in audit; not a full device matrix |
| NFR-04 | Enforce authentication, record-level authorization, role assignment, and separation of duties server-side in production. | Design. View switch is explicitly a simulation |
| NFR-05 | Store no passwords, tokens, raw credential strings, or secret values. Collect only approved metadata. | Prototype reference fields; collector allowlists; production classification review required |
| NFR-06 | Use parameterized queries and managed credentials. Collectors run read-only with the minimum approved scope. | Collection pack design; no live connections configured |
| NFR-07 | Use stable keys, foreign keys, unique constraints, append-only evidence, and transactional multi-row commands. | Logical schema. Browser store is not a production database |
| NFR-08 | Use optimistic concurrency for mutable production records. Reject outdated revisions and stale approval context. | Prototype storage conflict and approval binding; database RowVersion proposed |
| NFR-09 | Store technical timestamps in UTC and display the zone. Treat business dates as calendar dates. Leap-day annual calculations remain valid. | Shared date checks; legacy mock timestamps require migration in production |
| NFR-10 | Track run, dataset, scope, collector version, row counts, completeness, failures, and lineage provenance. | Collection contract + schema |
| NFR-11 | Complete/partial/failed extracts must not be confused. Process removal only after complete comparable scope and approved absence rules. | Design + offline collection tests |
| NFR-12 | Loading, empty, unresolved, error, and failed-save states must be explicit. Avoid silently replacing user records with demo data. | Improved local recovery and empty states; production telemetry pending |
| NFR-13 | Every decision records actor, time, target, revision, evidence, and outcome. Apply the six-month history treatment in the decision register. | Local receipts; protected production storage and cleanup are Design |
| NFR-14 | Production filters and counts must run in the data service with defined grains; do not depend on loading the full estate into Power Apps. | Design; approve estate size and performance targets before load testing |
| NFR-15 | Proposed performance target: common production galleries return within 2 seconds at agreed p95 load. Define record counts, network, and concurrency first. | Proposed, not measured or committed |
| NFR-16 | Define backup, recovery, monitoring, deployment rollback, support ownership, and service hours before production. | Open operating-model decisions; no SLA invented |
| NFR-17 | Reusable fields and central validation must keep labels, rules, table dictionaries, and workflows consistent. | Shared person, evidence, groups, workflow, and dictionary modules |
| NFR-18 | Maintain regression checks for state transitions, approval binding, identity, date boundaries, data preservation, and partial evidence. | Automated suites plus recorded browser walkthroughs |

## Production acceptance gates

1. Approve policy terms, role mappings, source scopes, and evidence freshness.
2. Validate the first platform extracts against the shared contract and scoped native identities.
3. Deploy transactional storage and enforce authorization outside the client.
4. Prove idempotent refresh, version retention, conflict detection, and complete-scope reconciliation.
5. Complete accessibility, security, performance, backup, and user acceptance testing with agreed operating targets.

The prototype is suitable for product review. These gates must pass before live operational reliance. The [decision register](decision-register.md) now supplies confirmed choices, selected designs, operating defaults, and owners for delivery checks.
