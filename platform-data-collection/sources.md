# Verified primary sources and research findings

Checked 7 October 2026. All external references below are vendor-owned documentation. No live tenant, repository, or MongoDB connection was used.

| Source | Verified fact used in this pack |
|---|---|
| [Tableau 2026.2 repository dictionary](https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm) | Verified explicit columns for sites, projects, workbooks, published data sources, project contents, data connections, and views. LUIDs and repository integers are separate. The workbook/source project columns are deprecated. Repository timestamps use UTC. |
| [Tableau repository collection access](https://help.tableau.com/current/server/en-us/perf_collect_server_repo.htm) | Repository collection is a Tableau Server administration capability with read-only access. |
| [Tableau Metadata API setup](https://help.tableau.com/current/api/metadata_api/en-us/docs/meta_api_start.html) | Metadata API enablement, authorization, and visibility must be confirmed before collecting fuller lineage. |
| [Power BI GetGroupsAsAdmin](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/groups-get-groups-as-admin) | Workspace enumeration, paging parameters, request limits, and administrator/service-principal access. |
| [Power BI PostWorkspaceInfo](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-post-workspace-info) | Scan submission accepts 1–100 workspaces. Lineage and data-source details are options. The API version is v1.0. |
| [Power BI GetScanStatus](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-status) | Separate status endpoint; the included payloads must reach Succeeded before normalization. |
| [Power BI GetScanResult](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result) | Verified report/model/source relationships and fields. Properties can be omitted. The result example connects datasourceInstanceId to datasourceId. Cross-workspace model references have datasetWorkspaceId. |
| [Fabric metadata scanning overview](https://learn.microsoft.com/en-us/fabric/governance/metadata-scanning-overview) | The Power BI metadata scanner is the supported interface used for this report/model collection design. |
| [Alteryx Server API V3](https://help.alteryx.com/current/en/server/api-overview/alteryx-server-api-v3.html) | Collections and workflows are available API object families; installed API capabilities still need confirmation. |
| [Alteryx 2025.2 release notes](https://help.alteryx.com/release-notes/en/release-notes/server-release-notes/server-2025-2-release-notes.html) | Provides version-specific release context and documents an outdated schema-file issue in Server Usage Report. |
| [Alteryx current service database schema](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxservice-mongodb-schema.html) | Current schema page identifies a newer release; it is insufficient to certify a 2025.2 MongoDB query. |

## Design conclusions, not vendor guarantees

- The delivery contract, table mappings, internal UUID resolution, and no-name-join rules are Analytic Registry design choices.
- A Tableau workbook is the first-pass report grain. Views remain optional. This avoids counting one workbook once per sheet or connection.
- Direct repository connection-owner links do not prove all upstream source relationships. The SQL therefore does not claim complete lineage.
- The Power BI normalizer conservatively leaves connection and lineage coverage partial. Teams can improve coverage through separately validated collectors.
- Registry creation and retirement remain separate from source observation. A complete technical inventory does not approve ownership or controls.

## Confirm with the platform teams

| Open detail | Why it matters |
|---|---|
| Exact Tableau build and required column availability | Repository layouts can change; the SQL is intentionally preflighted. |
| `projects_contents.content_type` values | The dictionary describes the column without an exhaustive token list. Supply confirmed tokens to avoid guessed joins. |
| Stable Power BI connection IDs across two scans | The source-ID fields can be absent for some cases. Missing or unstable values must not become name keys. |
| Tenant, server/site, and environment keys | Prevents equal native IDs from being merged across environments or sites. |
| Personal spaces, archived items, and other exclusions | Completeness only applies to the stated scope. |
| Shared model workspaces | Report source paths can cross workspace boundaries. |
| Alteryx 2025.2 schema/API response sample | Required before producing field-accurate MongoDB queries. |

## Verification record

- 26 offline automated checks pass in `tests/normalize.test.mjs`.
- Fictional sample normalization produces two workspaces, three assets, two connections, three memberships, two direct connection edges, and one dependency edge.
- The paginated sample remains explicitly unresolved for source lineage.
- SQL columns and ID relationships were checked against the versioned vendor dictionary. Static checks verify the read-only transaction and explicit field selection.
- No PostgreSQL runtime was available locally, and no live SQL or API execution occurred. Platform preflight and a small source sample remain required before operational use.
- No files were imported into the app, no business declarations were changed, and no messages were sent to the teams.
