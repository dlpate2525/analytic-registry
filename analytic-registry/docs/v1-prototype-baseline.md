# Analytic Registry — V1 prototype baseline

**Version:** `1.0.0-prototype.1`  
**Baseline date:** 8 October 2026  
**Intended Git tag:** `v1.0.0-prototype.1`

This baseline freezes the React prototype and the current platform handoff as V1. It records the user's approval of a prototype release. It does not authorize production rollout, live directory changes, or all previously proposed operating settings.

## Frozen scope

| Component | Included in V1 | Boundary |
|---|---|---|
| React application | Five main sections, guided workflows, mock records, local saves, diagrams, and current artifact references. | Role selection is simulated. Known workflow defects remain in the repair backlog. |
| Excel handoff | One empty 15-sheet workbook with nine import tables and 117 import columns. | No source data, formulas, matching results, or live importer. |
| Platform references | Tableau PostgreSQL queries; Power BI/Fabric inventory adapter and identity pseudocode; Alteryx MongoDB backend query template. | Installed versions, permissions, field joins, and output need platform-team validation. |
| SQL Server handoff | Nine staging tables, validation queries, and email-match review queries. | Manual loading only. Scripts do not update the 53-table target registry or app state. |
| Product documentation | Requirements, decisions, diagrams, glossary, target table dictionary, audit, and known limitations. | A documented target design is not an implemented feature. |

The workbook has three guide sheets: Guide, Source_Map, and Column_Dictionary. Three reference tabs show exact platform output layouts: Tableau_Output, PowerBI_Output, and Alteryx_Output. The nine empty import tables are Workspaces, Assets, Workspace_Assets, Connections, Asset_Connections, Asset_Dependencies, Platform_Users, Directory_Users, and Object_Users.

The six inventory tables retain their existing contract. The three identity tables add source principals, directory evidence, and object-role references. The 117 columns count only the nine import tables. Platform output reference tabs must not be loaded as data tables.

## Four-step delivery process

1. Confirm scope, platform instructions, native identity namespaces, and the directory tenant.
2. Collect metadata and populate the exact workbook headers or equivalent CSV files.
3. Load SQL staging manually, validate the delivery, and run the email-match queries.
4. Review exceptions with Platform Manager, then load approved observations and mappings through the approved manual process.

No step grants platform access or changes declared business ownership. Preserve incomplete inventory and unresolved references for review.

## Firm V1 decisions

| Decision | Required treatment |
|---|---|
| Identity matching | Match exact `lower(trim(SourceEmail))` to `lower(trim(Mail))` in the configured directory tenant. Accept one distinct directory user only. |
| Duplicate or conflicting evidence | Review flagged duplicates before rerunning. Remove only verified identical duplicate rows. Do not collapse conflicting evidence. |
| Native identifiers | Retain original IDs, namespaces, platform instance, and native scope. Keep registry IDs separate. Email is a matching attribute, not a replacement key. |
| UPN and mail | Keep UPN separately. Do not silently substitute UPN, login, display name, or a constructed address for mail. |
| Disabled user | Record a successful identity match with disabled account state. Platform Manager reviews current accountability; history remains. |
| Unresolved cases | Send missing, ambiguous, invalid, failed, conflicting, nonhuman-accountability, and unresolved relationship cases to Platform Manager. |
| Alteryx collection | Use backend MongoDB tables and read-only queries only. Preserve unknown current ownership when the installed join is unverified. |
| Run context | Keep existing RunKey, ObservedAt, and manifest behavior. Directory extracts retain their own run and observation time. No RunDate or run redesign is included. |
| Loading | Use manual SQL Server staging and review. No live importer or Power Apps connector is added. |
| Deferred repairs | Classification, manual-PRL alignment, and risk repairs remain future work. Their confirmed product requirements are retained. |

A missing directory match does not prove inactivity or deletion. A matched enabled account does not prove employment, human identity, approval authority, or workspace scope. Existing bindings must not transfer automatically when a reused email points to another directory user.

## Product decisions retained

The default view serves business users. The app retains five main sections and fewer than six steps per process. Business Owner and Workspace Owner remain one field. Champions stay with workspace and people information. Groups inherit workspace accountability.

Standard includes Champion, RW, R, and Data Sources groups. `_DS` supports creating and maintaining workspace data connections. Platform-specific access mappings still require verification.

Workspace declarations retain PII, EUCT, and one highest applicable DMP tier. Tier 1 ranks above Tier 2 and Tier 3. Approved PRL must be recorded manually without calculating a score. Legacy app fields remain a known alignment gap.

Custom setup and annual responses retain Application Owner or Platform Owner approval. Evidence closure retains Platform Manager, Platform Team, or Platform Owner approval. A person may approve their own work when eligible for the required role and scope.

The user selected six calendar months of business-metadata history. Current records, open-work evidence, active approval dependencies, and native identity mappings remain operational state. Cleanup implementation and its detailed operating schedule remain future work.

## Artifact index

| Artifact | Purpose |
|---|---|
| [Current handoff README](../../platform-data-collection/v1-extract/README.md) | Authoritative V1 collection and manual staging instructions. |
| [Excel template](../../platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx) | Empty collection and import layouts, with platform reference tabs. |
| [Workbook contract](../../platform-data-collection/v1-extract/workbook-contract.json) | Exact import table names, column order, types, and purposes. |
| [Column dictionary CSV](../../platform-data-collection/v1-extract/column-dictionary.csv) | Flat-file copy of the 117 import column definitions. |
| [CSV header index](../../platform-data-collection/v1-extract/csv-headers/README.md) | Links to all nine header-only CSV alternatives. |
| [Platform output layouts](../../platform-data-collection/v1-extract/platform-output-layouts.json) | Output-file headers and destination mapping for the three reference tabs. |
| [Tableau instructions](../../platform-data-collection/v1-extract/tableau-identity-extract.md) and [SQL](../../platform-data-collection/v1-extract/tableau-identity-export.sql) | Repository identity and object-role supplement. |
| [Power BI/Fabric pseudocode](../../platform-data-collection/v1-extract/powerbi-identity-extract.md) | Documented ownership/access fields and directory export mapping. |
| [Alteryx instructions](../../platform-data-collection/v1-extract/alteryx-backend-extract.md) and [MongoDB template](../../platform-data-collection/v1-extract/alteryx-backend-extract.mongosh.js) | Backend-only schema checks and extraction. |
| [SQL staging](../../platform-data-collection/v1-extract/sqlserver-staging.sql), [validation](../../platform-data-collection/v1-extract/sqlserver-validate.sql), and [email matching](../../platform-data-collection/v1-extract/sqlserver-email-match.sql) | Manual staging and review result sets. |
| [Earlier inventory pack](../../platform-data-collection/README.md) | Existing inventory contract and collectors. Current V1 identity and Alteryx instructions take precedence. |
| [Business definition](business-product.md), [requirements](requirements.md), and [decisions](decision-register.md) | Product intent, status, and confirmed versus proposed choices. |
| [53-table target model](data-model.md) and [identity design](identity-resolution-design.md) | Future registry structure and integration backlog, distinct from staging. |
| [Known defects](github-review-and-repair-plan.md) and [verification](verification.md) | Remaining issues and recorded release evidence. |

## Acceptance and known limitations

V1 acceptance means the prototype and handoff are versioned together, current artifacts are reachable, and the documented scope is clear. The verification record supplies the checks actually run. Passing offline checks does not prove live extraction, SQL execution, or production authorization.

Known app defects remain in historical approvals, actor binding, assessment projection, group checks, Champion comparison, and annual lateness. Classification, PRL, and risk alignment is deferred. The workbook and staging scripts do not repair those application paths.

The 53-table / 602-column model is a target design. The nine staging tables receive extracts. Neither the target database nor a Power Apps application is deployed by this release. The proposed identity-history additions remain design work and do not silently change the published model.

Tableau, Power BI/Fabric, Alteryx, directory, and SQL Server live environments have not been tested by this handoff. Alteryx backend mappings depend on installed-schema verification. Power BI identity rows require the documented supplement; the inventory adapter does not produce them automatically.

Daily collection, freshness limits, notification schedules, support targets, performance objectives, recovery targets, and cleanup schedules remain proposed where marked. Prototype acceptance does not approve these operating defaults.

## Change control after the baseline

Use this version and tag to identify the frozen prototype. Record later changes in a new version. Keep source mappings, workbook headers, SQL staging, application references, generated documents, and verification evidence aligned. Review backlog items before claiming a new workflow is fixed or production-ready.
