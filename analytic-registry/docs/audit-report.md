# Analytic Registry — historical audit and remaining work

Historical audit: 7 October 2026. Reconciled for **`1.0.0-prototype.1`**, 8 October 2026; intended tag **`v1.0.0-prototype.1`**.

This record preserves corrections made during the earlier audit. The later [GitHub review](github-review-and-repair-plan.md) found additional defects. Those defects remain in the frozen [V1 prototype baseline](v1-prototype-baseline.md). The version lock updates references and scope; it does not claim another round of workflow fixes.

## Assessment

The application has a coherent product structure: five main sections, short guided workflows, and separate intent, delivery, and evidence. The highest risks were incorrect conclusions and unsafe lifecycle updates rather than missing visual polish.

The first audit suite reproduced 12 defects outside the original 150 checks. The recorded corrections passed their targeted regressions. Later counterexamples exposed additional approval, actor, assessment, group, drift, and lateness gaps. Passing the earlier suite does not establish that those broader paths are correct.

This review does not certify a production system. The original brief intentionally excludes a backend, live identity, real platform execution, and production ingestion. Those are documented implementation gaps.

## Corrections recorded in the 7 October audit

| ID | Severity | Evidence / defect | Implemented correction |
|---|---|---|---|
| D-01 | High | A nonempty but unknown owner ID passed request validation. | Owner must resolve to a known person; inactive assignments still block. |
| D-02 | High | A selected workspace from a different platform could pass validation. | Verify selected workspace, platform, registration state, and request type together. |
| D-03 | Medium | Empty technical names passed submission if groups were valid. | Proposed technical-name rule is explicit and validated. |
| D-04 | Medium | Duplicate group purposes and the same group assigned to different roles were accepted. | Added purpose and resolved-ID checks. The later Existing/New intended-name collision remains R11. |
| D-05 | Medium | Continue filtered error-message text with regular expressions. Rule wording could move an error to the wrong step. | Shared structured validation associates each issue with a topic. Submission opens the first invalid topic. |
| D-06 | Medium | Impossible target or observation dates could be normalized by JavaScript and accepted. | Strict calendar-date validation and future-observation checks. |
| D-07 | High | An infinite or invalid freshness limit could make evidence appear usable. | Require integer limits from 1 to 365 days. Unconfigured limits remain unresolved. |
| D-08 | Medium | Finding age was fixed to 6 October 2026. | Calculate against the current New York business date, with deterministic test dates. |
| D-09 | High | Incomplete Champion membership evidence could produce a mismatch result. | Apply the completeness/freshness gate to roster flags as well as alignment and discrepancy. |
| D-10 | High | Custom direct access was compared to an assumed zero-user baseline. | Show Unable to Verify until an explicit approved Custom baseline exists. |
| D-11 | High | Approved future-dated closure evidence could pass closure validation. | Reject invalid/future verification dates and unsupported verification methods. |
| D-12 | High | Business users could edit action, resolution, and verification fields; completed cases remained editable. | Protect administrator fields, restrict business responses, and make completed reviews read-only. Validate in the local command as well as the interface. |
| D-13 | High | Previous-release or in-progress assessments could overwrite current asset classifications. | Added version/status guards. Backdated same-release and Changes required projection cases remain R06–R07. |
| D-14 | Medium | Negative counts, invalid dates, unknown assessors, and unsafe reference schemes were insufficiently checked. | Central assessment validation covers those cases and requires comments for follow-up/change outcomes. |
| D-15 | High | A frozen annual packet still derived Champions from the mutable current roster. | Capture Champion IDs in new packets. Legacy packets retain the documented compatibility fallback. |
| D-16 | High | Annual resubmission could replace a linked investigation with a new default case. | Preserve an existing follow-up case and its evidence. |
| D-17 | Medium | Anniversary calculation could create 29 February in a non-leap year. | Advance leap-day annual dates to 28 February. |
| D-18 | High | Malformed saved data silently fell back to mock data and could later be overwritten. | Preserve original bytes, show a persistent warning, block writes, and offer export. |
| D-19 | High | Another open tab could overwrite more recent saved state. | Compare the stored revision before saving and reject stale writes. No silent success or navigation after failure. |
| D-20 | Medium | The context object lived in a module with refresh-sensitive exports; development edits had caused provider errors. | Isolate the context identity from the provider implementation. Fresh-load browser verification remains required. |
| D-21 | High | A rejected submitted request had no correction path. | Create a linked replacement draft with new identity and fresh approvals. Preserve the original and mark it Superseded. |
| D-22 | Medium | Inbox counts could ignore active filters, and switching views discarded URL scope. | Apply the same scoped dataset to counts and rows; preserve scope across views. Restore business-line/severity filters under More filters. |
| D-23 | Medium | Substring status colors rendered Not Available as a positive state. | Handle unresolved and unavailable states before positive matches. |
| D-24 | Low | Unlabeled compact navigation and generic Filter labels reduced accessibility. | Add navigation names, a skip link, contextual field labels, and stronger supporting-text contrast. |
| D-25 | Medium | The column dictionary lacked per-column purposes and contained stale six-section navigation guidance. | Share column descriptions between the app and generated Markdown/HTML/CSV. Update the interface direction. |
| D-26 | High | First-pass Power BI lineage lacked a place for report-to-model dependencies. | Add proposed ObservedAssetDependency without conflating workspace ownership and technical lineage. |
| D-27 | Medium | Discovery required a person creator even when a collector created the registry stub. | Specify separate nullable human/service actors with an exactly-one rule. Never substitute the native owner. |

Severity refers to product correctness and potential governance impact. It is not a security rating for this local mock.

## Streamlining retained or strengthened

| Theme | Result |
|---|---|
| Navigation | Five main sections; administration in a menu; annual reviews inside My work. |
| Reusable fields | Shared person, evidence, group, status, mapping, validation, and column-purpose components. |
| Short workflows | Request and assessment: five topics. Review and annual assurance: three topics. |
| Groups | Compact rows; one expanded editor; inherited workspace accountability; Standard DS suffix retained. |
| Work prioritization | Shared inbox and dashboard selectors; next action, responsible person, due date, status, and mappings. |
| Evidence | Explicit confidence and missing-context states; approvals bind to the exact revision. |
| Corrections | New linked drafts preserve prior intent and receipts. |
| Documentation | Product, requirements, audit, schema, and platform extract contracts have separate purposes. |

## Missing context and production backlog

The [decision register](decision-register.md) separates confirmed requirements, target design, and proposed operating settings. SQL Server, DMP ranking, manual PRL, DS purpose, eligible self-approval, and six-month history are confirmed. The table below records remaining implementation or verification work, not reopened policy questions.

| ID | Priority | Gap / decision | Next acceptance evidence |
|---|---|---|---|
| G-01 | Before live use | No real authentication, server authorization, or actual role assignment. UI roles are simulated. | Approved identity architecture and negative authorization tests. |
| G-02 | Before ingestion | V1 supplies manual SQL staging artifacts; no deployed import service or app platform connection exists. | Validate populated extracts and prove the approved manual load before considering automated ingestion. |
| G-03 | Before conclusive risk | Freshness, completeness, activity cadence, thresholds, and Custom exceptions need policy approval. | Versioned rule catalog with owners and test cases. |
| G-04 | Before schema deployment | SQL Server is confirmed. Hosting, network, connector, licensing, and trusted command implementation require proof. | Verified deployment route, caller authorization, and transactional database behavior. |
| G-05 | Before identity refresh | Source identity scopes, alternate IDs, restore/recreate behavior, and crosswalk stewardship need team confirmation. | Rename/move/recreate samples matched by native IDs. |
| G-06 | Before classification reliance | Tier 1 highest and manual approved PRL are confirmed. Legacy asset vocabulary and score-oriented fields remain unaligned; repairs are deferred for V1. | Common tier vocabulary and manual PRL evidence, with legacy values preserved separately. |
| G-07 | Before promotion enforcement | Assessment triggers are guidance; there is no deployment gate or release integration. | A release cannot pass the gate without the applicable approved assessment. |
| G-08 | Before automated reconciliation | Local evidence uses one workspace-level timestamp/completeness flag. Production needs dataset/scope/run granularity. | Mixed complete/partial extracts produce correct unresolved results. |
| G-09 | Before operational rollout | No live collection scheduling, notification delivery, escalation, or recovery service. | Operating runbook, monitored jobs, and recovery exercise. |
| G-10 | Before broad access | Formal accessibility, browser/device, security, and load audits are incomplete. | WCAG review, real assistive-technology testing, threat review, and agreed load results. |
| G-11 | Before operational history storage | Six-month metadata history is confirmed. Local storage is editable and finite; cleanup is not implemented. | Protected current references, controlled historical cleanup, access control, and compatible backup/restore treatment. |
| G-12 | Next usability iteration | Unsaved changes can be lost when leaving a form. Save buttons are explicit, but there is no application-wide draft autosave. | Approved autosave/leave-warning behavior with conflict recovery. |
| G-13 | Next review implementation | The target design uses linked follow-up and annual amendments instead of mutating completed evidence. Full recurrence/amendment support is not implemented. | Proven linked lifecycle with prior decisions and evidence preserved. |
| G-14 | Next content-model iteration | Prototype assets retain one current workspace pointer and one current classification projection. Multiple observed memberships and unknown PII need the full schema. | Imported examples covering shared collections and unknown classifications. |
| G-15 | Before accepting live extracts | Tableau PostgreSQL, Power BI/Fabric extraction, and backend-only Alteryx MongoDB queries have not run against the user's installations. | Platform teams validate privileges, installed schema, scope, joins, row counts, and sample output. |

## Current V1 handoff boundary

Use the [current handoff](../../platform-data-collection/v1-extract/README.md) and [Excel template](../../platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx). The workbook has 15 sheets, including three platform output reference tabs and nine empty import tables with 117 columns. The future registry model has 53 tables and 602 columns; staging does not replace it.

V1 uses exact normalized email matching to Graph Mail in the configured tenant after manual SQL staging. Native IDs remain separate. UPN is not a mail fallback. All unresolved cases go to Platform Manager. Matched disabled users remain resolved-disabled. Existing RunKey, ObservedAt, and manifests stay unchanged. No RunDate or run redesign is included.

Classification, PRL, and risk repairs remain deferred. Proposed operating settings remain proposed. App connectors, authenticated commands, automated ingestion, and live platform execution are absent.

## Historical verification record

- Baseline: 119 domain/data checks and 31 workflow checks passed.
- New red cases: 12 failures reproduced in the initial audit suite before fixes.
- Audit suite at that audit: 36 checks passed, covering validation, evidence, assessment history, review edits, corrections, annual dates, and persistence.
- Production build: TypeScript and Vite completed successfully after the workflow and persistence changes.
- Isolated browser origin: port 5174. The user's saved port 5173 records were not reset or used for test writes.
- Browser request walkthrough: blank Continue blocked; five topics rendered; four Standard groups included DS; submission persisted; administrator correction decision exposed a correction action; replacement opened with a new ID and link to the original.
- Current release checks are recorded separately in [verification.md](verification.md).

Tests are targeted evidence, not proof that every possible path or production integration is correct.
