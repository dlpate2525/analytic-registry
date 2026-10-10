# Analytic Registry — V1.1 prototype

**1.1.0-prototype.1 · 9 October 2026**

Analytic Registry coordinates platform evidence, business accountability, and follow-up work. The React app uses fictional records and local browser storage. It does not provision resources or import live platform data.

Start with the [product and operating review](docs/v1.1-product-operating-review.md). It challenges where the app creates work without establishing a verified outcome. The [V1.1 baseline](docs/v1.1-prototype-baseline.md) separates implemented changes from proposed integration.

## Current artifacts

| Artifact | Purpose |
|---|---|
| [Excel template](../platform-data-collection/v1.1-extract/analytic-registry-v1.1-extract.xlsx) | 17 sheets; 11 blank input tables; 72 columns, including shared context and coverage. |
| [Platform handoff](../platform-data-collection/v1.1-extract/README.md) | Query, validate, and manually stage the delivery. |
| [Source queries](../platform-data-collection/v1.1-extract/source-query-design.md) | Tableau PostgreSQL, Alteryx MongoDB, Power BI SQL over supplied JSON. |
| [Column dictionary](../platform-data-collection/v1.1-extract/column-dictionary.csv) | Explicit source, value, applicability, and NULL behavior for each platform. |
| [Monthly reconciliation](../platform-data-collection/v1.1-extract/monthly-reconciliation.md) | Stable native identity, incomplete extracts, source authority, and protected history. |
| [Model simplification](docs/v1.1-model-simplification.md) | One Person, many source accounts; 12 proposed foundation entities. |
| [Verification](docs/v1.1-verification.md) | Tests actually run and limits of the evidence. |

Nine data tables use 60 columns. Context and coverage add 12 columns. The complete input contract has 38% fewer column positions than V1's 117. Shared values are moved, not discarded. The three platform reference tabs describe the same input tables; they are not additional import tables.

## Run and check

Use Node.js 22 or later. Keep the app and collection folders together.

1. Run `npm ci` in this folder.
2. Run `npm run dev`.
3. Open the localhost address printed by Vite.

Run `npm run check`, `npm run build`, then `npm run check:release`. The build copies current documents and collection artifacts. After changing collection files, rebuild the ZIP with `python ../platform-data-collection/build-bundle.py`.

## Product rules

Five sections remain: Dashboard, Workspaces, Assets, Requests, and My work. Forms keep fewer than six steps. Administration stays in a menu. White backgrounds use purple and coral accents.

Business Owner and Workspace Owner are one field. Champions remain with workspace accountability. Standard access has Champion, RW, R, and Data Sources groups. `_DS` creates and maintains workspace data connections, subject to supported platform roles.

Workspace declarations capture PII, EUCT, and highest DMP tier; Tier 1 is highest. Asset assessments record approved PRL with evidence and never calculate a score. Only a newer approved assessment for the current asset version updates its classifications.

Custom setup and annual responses require the agreed owner role. Closing evidence requires an eligible platform role. Eligible self-approval is allowed. New actions check current eligibility; historical approval receipts retain eligibility evidence recorded at decision time.

Email matches use exact `lower(trim(SourceEmail))` to `lower(trim(Mail))` in the configured tenant. Duplicate evidence remains unresolved. Disabled accounts remain resolved-disabled. Groups and applications do not become Person records. Platform-native keys remain distinct from registry keys. Unresolved cases go to Platform Manager.

Retain six months of superseded metadata history. Preserve current state, durable native mappings, open work, and evidence used by active decisions.

## Boundaries

The workbook, source queries, SQL staging files, and comparison functions do not constitute a working importer. Actual Alteryx exports have not been supplied for inspection. Installed databases and live directory services have not been tested.

The 45-table consolidated operational model is proposed, not deployed. The app still uses its smaller mock runtime. The [53-table design](docs/data-model.md) remains a historical reference. The [frozen V1 baseline](docs/v1-prototype-baseline.md) remains available for comparison.

Request delivery receipts do not create registry objects. Unlinked new-workspace deliveries remain visible for reconciliation. Risk fixtures are illustrative; unsupported detectors cannot establish a real control conclusion. Browser profiles simulate roles and are not production authorization.

The offline Canvas app remains unfinished. No import-tested `.msapp` or deployed Power App is claimed.
