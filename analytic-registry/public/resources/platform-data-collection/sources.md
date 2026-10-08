# Primary sources and release evidence

**Prototype release 1.0.0-prototype.1 — 8 October 2026. Intended Git tag: `v1.0.0-prototype.1`.**

[Download Excel workbook](https://github.com/dlpate2525/analytic-registry/raw/refs/tags/v1.0.0-prototype.1/platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx). Field contract 1.0 remains separate from this prototype release.

The references below support the existing mappings. This release review aligns the documentation and workbook; it does not certify a live tenant, repository, MongoDB installation, or SQL Server deployment.

| Source | Mapping or limitation retained |
|---|---|
| [Tableau 2026.2 dictionary](https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm) | Scoped object LUIDs, repository joins, users/system_users/email, project content, and explicit connection fields. |
| [Tableau repository access](https://help.tableau.com/current/server/en-us/perf_collect_server_repo.htm) | Approved read-only repository collection. |
| [Tableau Metadata API](https://help.tableau.com/current/api/metadata_api/en-us/docs/meta_api_start.html) | Future fuller lineage requires separate visibility and schema validation; it is not included in the repository collector. |
| [Power BI workspace enumeration](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/groups-get-groups-as-admin) | Scoped workspace enumeration and paging. |
| [Power BI scan request](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-post-workspace-info) | Scan options and artifact-user request behavior. |
| [Power BI scan status](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-status) | Only successful result payloads enter the offline adapter. |
| [Power BI scan result](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result) | Report/model/source relationships; report createdById is technical owner, not original creator. |
| [Fabric metadata scanning](https://learn.microsoft.com/en-us/fabric/governance/metadata-scanning-overview) | Power BI metadata interface used by this inventory design; not all Fabric item types. |
| [Alteryx schema crosswalk](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference.html) | Server 2025.2 maps to Gallery schema 79; public field coverage has version limitations. |
| [Alteryx Gallery fields](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxgallery-mongodb-schema.html) | Candidate backend users, collections, appInfos, and subscriptions fields. Does not establish current workflow ownership. |
| [Alteryx 2025.2 release notes](https://help.alteryx.com/release-notes/en/release-notes/server-release-notes/server-2025-2-release-notes.html) | Installed-release context and reported schema-file limitations. |
| [Microsoft Graph users](https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0) | Shared directory collection design; preserve paging, tenant, mail, object ID, and account evidence. |
| [Power Fx User](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-user) | User().Email is UPN; it is not the V1 Mail match field. |

## Confirmed V1 choices

- Use the [15-sheet Excel workbook](v1-extract/analytic-registry-v1-extract.xlsx). Its nine import tables contain 117 columns; the three platform output tabs contain 28 blank reference sections.
- Match normalized exact platform SourceEmail to directory Mail within the configured tenant. No automatic UPN fallback.
- Assign every unresolved field, identity, and relationship to Platform Manager.
- Load and review SQL Server staging manually. There is no live Power Apps or automated importer.
- Use backend MongoDB collection only for Alteryx V1. The earlier API option is superseded.
- Keep existing RunKey, ObservedAt, and field contract 1.0. Prototype release numbering is separate.
- Preserve current native-ID mappings beyond the six-month historical-payload window. Current records and active evidence dependencies remain available.
- Keep PRL, classification, and risk-correctness repairs deferred. This release lock does not claim those changes are implemented.

## Environment validation still required

These are installation and acceptance checks, not unanswered product decisions.

| Check | Purpose |
|---|---|
| Installed Tableau build, columns, and projects_contents.content_type tokens | Run the supplied preflight and verify source joins. |
| Native IDs from two successive extracts | Verify continuity across rename, movement, and scoped refresh. |
| Configured tenant, server/site, environment, and extraction scope | Prevent cross-environment or cross-tenant matches. |
| Power BI API permissions, pagination, and shared-model workspaces | Establish the returned scope and record omissions accurately. |
| Alteryx schema-79 preflight and candidate joins | Validate available backend fields; unresolved current workflow ownership remains Platform Manager work. |
| Directory permissions, selected fields, paging, and coverage | Distinguish unmatched/unknown identity from confirmed disabled account evidence. |
| Manual SQL staging permissions, collation, types, and import behavior | Verify that IDs, UTC timestamps, nulls, and email evidence survive the load. |

## Verification record

- The existing Power BI inventory suite has **27 passing checks**. It covers stable IDs, owner-versus-creator mapping, relationships, evidence gaps, and CSV output.
- The fictional Power BI sample produces two workspaces, three assets, two connections, three memberships, two direct connection edges, and one dependency edge.
- The workbook contains blank data tables and output layouts, not extracted source records.
- Tableau SQL and identity joins were checked against the versioned dictionary and static projections. No live PostgreSQL query was executed.
- The Alteryx candidate extractor has one passing MongoDB fixture test. Its installed schema and ownership semantics remain unverified.
- Power BI identity/directory collection remains pseudocode; the six-file offline inventory adapter does not emit those identity tables.
- No live platform or directory data was imported into the prototype, and no message was sent to platform teams.
