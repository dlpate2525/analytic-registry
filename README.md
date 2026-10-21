# Analytic Registry V1.2 prototype

**1.2.0-prototype.1 · 21 October 2026**

Analytic Registry connects platform evidence with business accountability and follow-up work. This release simplifies business workflows and separates observed platform facts from approved business metadata.

Start with the [release record](analytic-registry/docs/v1.2-release.md) and [product guide](analytic-registry/docs/v1.2-guide.md). The React app uses fictional records and browser storage.

| Artifact | Purpose |
|---|---|
| [Excel workbook V1.2](platform-data-collection/v1.2-workbook/analytic-registry-v1.2-extract.xlsx) | 16 sheets, 11 named input tables, 72 input columns; schema 1.1. |
| [Platform handoff](platform-data-collection/v1.2-workbook/README.md) | Receive, Validate, Match, Compare, Accept. |
| [Source query guide](platform-data-collection/v1.1-extract/source-query-design.md) | Tableau PostgreSQL, Alteryx SQL Server exports, and Fabric landed inventory. |
| [Collection ZIP](platform-data-collection/analytic-registry-v1.2-extract.zip) | Workbook, queries, guidance, and file checksums. |
| [Relationships](analytic-registry/docs/diagrams/v1.2-relationships.svg) | Workspace accountability, assets, and observed connections. |
| [Evidence flow](analytic-registry/docs/diagrams/v1.2-evidence-flow.svg) | Manual delivery and the unconnected prototype boundary. |
| [Requirements](analytic-registry/docs/v1.2-requirements.md) | Implemented behavior and unresolved policy. |
| [Detection Coverage and Risk Buckets](analytic-registry/docs/v1.2-risk-and-coverage.md) | Evidence requirements, eleven retained buckets, and case navigation. |
| [Verification](analytic-registry/docs/v1.2-publication-verification.md) | Release checks, review results, and proof limits. |
| [Compiled preview](downloads/analytic-registry-v1.2-preview.zip) | Serve the extracted folder through a local HTTP server. |
| [Release manifest](V1.2-BASELINE.json) | Application, workbook, schema, and artifact checksums. |

## Run locally

Use Node.js 22 or later and Python 3. Keep the application and collection folders together.

1. Open `analytic-registry` in a terminal.
2. Run `npm ci`.
3. Run `npm run prepare:release`.
4. Run `npm run dev`.
5. Open the localhost address printed by Vite.

## Validate

1. Run `npm run check` in `analytic-registry`.
2. Run `npm run check:docs`.
3. Run `npm run build`.
4. Run `npm run check:release`.
5. Run `npm run prepare:release -- --check`.
6. Return to the repository root.
7. Run `python scripts/package-publication.py --check`.

After intentional artifact changes, run `python scripts/package-publication.py` from the repository root. This rebuilds the preview ZIP, release manifest, and repository checksums. It does not publish them.

The [verification skill](analytic-registry/.agents/skills/verify-analytic-registry/SKILL.md) drives isolated browser workflows at 1366 × 768. GitHub Actions runs the portable checks.

Platform queries are templates. Installed database execution, live ingestion, production authorization, SQL deployment, and Power Apps import remain unverified. No import-tested `.msapp` is included.

The input schema remains **1.1**. `RunKey` identifies an immutable delivery; native keys identify enduring objects. Do not use names or a delivery date as object identity.

Earlier V1 and V1.1 tags and manifests retain historical meaning. The [local baseline note](analytic-registry/docs/v1.2-baseline.md) describes the earlier frozen local snapshot. It is not the publication manifest.
