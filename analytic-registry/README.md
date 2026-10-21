# Analytic Registry — V1.2 prototype

**1.2.0-prototype.1 · Prototype release · 21 October 2026**

The [release record](docs/v1.2-release.md) describes this candidate. Earlier tags retain their historical scope.

Analytic Registry coordinates platform evidence, business accountability, and follow-up work. The React app uses fictional records and local browser storage. It does not provision resources or import live platform data.

Review the [V1.2 publication verification](docs/v1.2-publication-verification.md) for current proof. The [local baseline](docs/v1.2-baseline.md) records the earlier frozen snapshot.

Start with the [V1.2 product and workflow guide](docs/v1.2-guide.md). It explains each page, eligible actions, business responsibility, source evidence, and the manual data-delivery path.

Use the [V1.2 requirements](docs/v1.2-requirements.md) to distinguish implemented behavior, intended integration, and unresolved policy. Use [V1.2 verification](docs/v1.2-verification.md) for checks actually run and their limits.

Use the [project verification skill](.agents/skills/verify-analytic-registry/SKILL.md) to repeat the browser workflows locally.

## Current artifacts

| Artifact | Purpose |
|---|---|
| [V1.2 guide](docs/v1.2-guide.md) | Current page purposes, actions, roles, diagrams, and workflow rules. |
| [V1.2 requirements](docs/v1.2-requirements.md) | Current local behavior, integration boundaries, and remaining policy decisions. |
| [V1.2 verification](docs/v1.2-verification.md) | Validation evidence and unverified areas. |
| [Glossary](GLOSSARY.md) | Consistent product and evidence terminology. |
| [Excel template](../platform-data-collection/v1.2-workbook/analytic-registry-v1.2-extract.xlsx) | 16 sheets; 11 blank input tables; 72 columns, including shared context and coverage. |
| [Platform handoff](../platform-data-collection/v1.2-workbook/README.md) | Receive, Validate, Match, Compare, Accept; manual SQL staging and current limits. |
| [Source queries](../platform-data-collection/v1.1-extract/source-query-design.md) | Tableau PostgreSQL, Alteryx SQL Server exports, and Fabric SQL inventory with DAX discovery. |
| [Column dictionary](../platform-data-collection/v1.2-workbook/column-dictionary.csv) | 72 common field definitions. The workbook's three platform tabs explain applicability, source, value, and NULL behavior. |
| [Monthly reconciliation](../platform-data-collection/v1.1-extract/monthly-reconciliation.md) | Stable native identity, incomplete extracts, source authority, and protected history. |
| [Platform samples](../platform-data-collection/v1.1-extract/samples/README.md) | Documented synthetic initial, replay, and changed-refresh deliveries for all three platforms. |

**The application and workbook revision are V1.2; the input schema remains 1.1.** Use `analytic-registry-v1.2-extract.xlsx` for new deliveries. Its table names, headers, types, and keys remain compatible.

The dictionary now defines each field once. Platform rules stay in the three output tabs. The historical migration map stays beside the query files.
Workspace subtype is an observed attribute, not part of its durable identity. The revised definition states this explicitly.

Nine data tables use 60 columns. Context and coverage add 12 columns. Shared values are moved, not discarded. The three platform reference tabs explain mappings; they are not additional import tables.

## Run and check

Use Node.js 22 or later. Keep the app and collection folders together.

1. Run `npm ci` in this folder.
2. Run `npm run prepare:release`.
3. Run `npm run dev`.
4. Open the localhost address printed by Vite.

Run `npm run check`, `npm run check:docs`, `npm run build`, and `npm run check:release` for application validation.
Run `npm run prepare:release -- --check` to verify collection and documentation outputs without rewriting them.
Preparation validates release identity before writing. Repeated preparation must produce identical artifacts.

The frozen local baseline remains separate. `npm run check:baseline -- 1.2.0-prototype.1-local` requires that local snapshot; it is not included in this repository.

## Product rules

Five sections remain: Dashboard, Workspaces, Assets, Requests, and My work. Forms keep fewer than six steps. Administration stays in a menu. White backgrounds use purple and coral accents. The [tablet canvas](docs/v1.1-canvas-layout.md) uses fixed 1366 × 768 design coordinates and proportional scaling.

Use Workspace Owner for the accountable person. Business process expertise belongs with equal Champions. Standard access has Champion, RW, R, and Data Sources groups. `_DS` creates and maintains workspace data connections, subject to supported platform roles. Champion responsibility does not grant platform access.

Workspace declarations capture PII, EUCT, and highest DMP tier; Tier 1 is highest. Current Champions record completed asset evaluations. PRL-01 calculates PRL from complexity, logical source count, and intended audience. High risk means PRL 1, PII Yes, EUCT Yes, or DMP Tier 1–3. No asset approval queue or asset Annual Attestation is required.

Custom setup and annual responses require the agreed owner role. Closing evidence requires an eligible platform role. Eligible self-approval is allowed. New actions check current eligibility; historical approval receipts retain eligibility evidence recorded at decision time.

One eligible Champion approves business declarations and Workspace Owner or Champion changes. Approved responsibility takes effect on its effective date. Register Existing and new-policy Update Existing can complete business changes while linked technical work remains open. Frozen annual recipients retain their issued work.

The intended manual process has the registry operator accept structurally valid deliveries, including Partial coverage and unresolved references. Structural errors block the whole delivery. Platform Manager handles unresolved cases. The app shows inventory availability and control readiness separately; it has no connected acceptance loader.

Email matches use exact `lower(trim(SourceEmail))` to `lower(trim(Mail))` in the configured tenant. Duplicate evidence remains unresolved. Disabled accounts remain resolved-disabled. Groups and applications do not become Person records. Platform-native keys remain distinct from registry keys. Unresolved cases go to Platform Manager.

The agreed history objective retains six months of superseded metadata. Current state, native mappings, open work, and active evidence remain protected. No retention job is implemented.

## Boundaries

The workbook, source queries, SQL staging files, and comparison functions do not constitute a working importer. Actual Alteryx exports have not been supplied for inspection. Installed databases and live directory services have not been tested.

The 45-table consolidated operational model is proposed, not deployed. The app still uses its smaller mock runtime. The [53-table design](docs/data-model.md) remains a historical reference. The [frozen V1 baseline](docs/v1-prototype-baseline.md) remains available for comparison.

Request delivery receipts do not create registry objects. Unlinked new-workspace deliveries remain visible for reconciliation. Risk fixtures are illustrative; unsupported detectors cannot establish a real control conclusion. Browser profiles simulate roles and are not production authorization.

The offline Canvas app remains unfinished. No import-tested `.msapp` or deployed Power App is claimed.

## Earlier design and review records

These records explain earlier decisions and validation. Their historical bodies remain intact; the V1.2 guide governs current local workflow instructions.

| Record | Historical purpose |
|---|---|
| [Approved V1.1 local workflows](docs/v1.1-approved-workflows.md) | Previous implemented workflow snapshot |
| [Model simplification](docs/v1.1-model-simplification.md) | Earlier proposed foundation and consolidation design; not a deployed schema |
| [Workspace request module](docs/v1.1-request-module.md) | Earlier architecture description; current forms now use three or five steps |
| [20 October local handoff](docs/local-build-handoff-2026-10-20.md) | Earlier build changes, screenshots, and limitations |
| [Local consistency review](docs/local-consistency-review-2026-10-20.md) | Earlier repairs and their validation |
| [Sequential POTETO review](docs/poteto-sequential-review-2026-10-20.md) | Previous refinement pass and its checks |
| [V1.1 verification](docs/v1.1-verification.md) | Earlier foundation and query-contract evidence |
