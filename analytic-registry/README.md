# Analytic Registry — V1 prototype

**Version:** `1.0.0-prototype.1` · **Release date:** 8 October 2026 · **Intended Git tag:** `v1.0.0-prototype.1`

Analytic Registry is a React and TypeScript prototype for a future Power Apps application backed by SQL Server. The app uses fictional records and local browser storage. The V1 handoff provides an empty Excel template, source mappings, and SQL staging scripts. It does not connect the app to live platforms or directory services.

The [V1 prototype baseline](docs/v1-prototype-baseline.md) defines this release. Approval of this baseline freezes the prototype and its handoff artifacts. It does not approve production rollout or the proposed operating defaults.

## Start with the current artifacts

| Artifact | Use |
|---|---|
| [V1 Excel template](../platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx) | Collect platform and directory metadata. It has 15 sheets, nine empty import tables, and 117 import columns. |
| [Four-step platform handoff](../platform-data-collection/v1-extract/README.md) | Select the queries, populate the template, stage manually, and review the results. |
| [Tableau PostgreSQL supplement](../platform-data-collection/v1-extract/tableau-identity-extract.md) | Read the installed-schema checks and identity joins before running the SQL. |
| [Power BI/Fabric supplement](../platform-data-collection/v1-extract/powerbi-identity-extract.md) | Project technical ownership and access records from documented API fields. This is extraction pseudocode. |
| [Alteryx MongoDB supplement](../platform-data-collection/v1-extract/alteryx-backend-extract.md) | Use backend queries only. Verify the installed schema and preserve unknown current ownership. |
| [SQL staging](../platform-data-collection/v1-extract/sqlserver-staging.sql), [validation](../platform-data-collection/v1-extract/sqlserver-validate.sql), [email matching](../platform-data-collection/v1-extract/sqlserver-email-match.sql) | Prepare and inspect a manual SQL Server load. These scripts do not apply data to the registry. |

The workbook contains Guide, Source_Map, Column_Dictionary, three platform output reference tabs, and nine import tables. The platform tabs show output layouts; they are not additional import tables. There are no formulas or populated source records.

V1 matches `lower(trim(SourceEmail))` to `lower(trim(Mail))` within the configured directory tenant. Accept only one distinct directory user and review duplicate or conflicting rows. Preserve platform-native IDs separately. UPN is not a mail fallback. Every unresolved identity or relationship goes to Platform Manager. A matched disabled account remains resolved-disabled.

Keep the existing `RunKey`, `ObservedAt`, and manifest contract. V1 adds no `RunDate` field and does not redesign runs. Classification, PRL, and risk repairs remain deferred.

## Run the prototype

Use Node.js 22 or later.

1. Open a terminal in this folder.
2. Run `npm ci`.
3. Run `npm run dev`.
4. Open the localhost address printed by Vite.

Use `npm run prepare:release` to regenerate documentation and align release links. Run `npm run build`, then `npm run check:release` to verify the release artifacts. Use `npm run preview` to serve the bundle and `npm run check` for domain checks. See the [verification record](docs/verification.md) for release evidence and its limits.

## Review the product

1. Start in Business view. Review the four dashboard numbers and My work.
2. Create a workspace request. Try Standard, Custom, and a single Champion.
3. Open a workspace and compare requested, implemented, and observed information.
4. Review an asset assessment, an evidence review, and an annual response.
5. Open the relationship model and the current V1 handoff from the app's reference links.

Five main sections remain: Dashboard, Workspaces, Assets, Requests, and My work. Administration stays in a menu. Requests and assessments use five topics. Reviews and annual attestations use three. External administration follows five stages.

The mock estate has 12 workspaces, 34 assets, 18 connections, 28 findings, 12 administrative reviews, 10 annual attestations, and 16 people. Eleven workspaces are registered. Examples include unresolved identities, missing accountability, orphan assets, pending changes, and incomplete evidence. Mock observations use October 2026; saved activity uses the browser clock.

## Requirements retained

- Business Owner and Workspace Owner are one field. Workspace, owner, and Champions share the people topic.
- Standard groups have Champion, RW, R, and Data Sources purposes. Groups inherit workspace accountability; DS names use `_DS`.
- DS creates and maintains workspace data connections, subject to verified native capabilities.
- Workspace declarations include PII, EUCT, and the highest applicable DMP tier. Tier 1 is highest, followed by Tier 2 and Tier 3.
- Approved PRL is manual; retained inputs must not create a calculated approval. Legacy illustrative fields still require alignment.
- Custom setup and annual responses require Application Owner or Platform Owner approval. Evidence closure requires an eligible platform role.
- Self-approval is allowed when the person holds the required role and scope. Business ownership alone does not grant that role.
- Keep six calendar months of metadata history. Preserve current records, active evidence dependencies, and native identity mappings.
- Keep workspace and asset mapping columns where relationships exist. Show missing relationships explicitly.

These are product requirements. The [requirements table](docs/requirements.md) distinguishes prototype behavior, partial implementation, and future design.

## Model and documents

Use related tables with focused Power Apps views. The **53-table / 602-column target model** describes the future registry. The **nine V1 staging tables** receive extracts. They have different purposes and are not interchangeable.

- [Business and product definition](docs/business-product.md), including workspace-to-asset-to-connection diagrams.
- [Target table dictionary](docs/data-model.md), [searchable model](docs/data-model.html), and [column CSV](docs/column-dictionary.csv).
- [Decision register](docs/decision-register.md) and [domain glossary](GLOSSARY.md).
- [Identity matching and future integration design](docs/identity-resolution-design.md).
- [Historical audit](docs/audit-report.md), [known defects and repair backlog](docs/github-review-and-repair-plan.md), and [verification record](docs/verification.md).
- [Earlier inventory collectors and contracts](../platform-data-collection/README.md). Use the V1 handoff for current identity and Alteryx instructions.

## Known boundaries

The app has no authenticated backend, live directory lookup, platform execution, importer, or notification service. Browser role selection simulates decisions. Local storage is editable and is not an audit repository. Cross-tab conflict checks do not provide production multiuser transactions.

Known defects remain in actor binding, historical approval validity, assessment projection, some group-change checks, Champion drift, and overdue annual status. The repair backlog records reproducible cases. The V1 freeze updates references and scope; it does not claim those workflows were repaired.

The app still uses legacy illustrative PRL and asset-classification concepts. Manual approved PRL and consistent DMP ranking remain required, but their repairs are deferred. No risk conclusion from mock data should be treated as a control assessment of a real platform.

The collection package has not run against the user's live platforms, directory, or SQL Server. Platform teams must verify schema, privileges, scope, and sample output. The Power BI identity pseudocode does not extend the existing inventory adapter automatically. Alteryx current ownership remains unknown when the backend join cannot be verified.

Saved browser edits remain local. Use Reference data to export or reset demo state when needed. Testing must not reset the user's saved records.
