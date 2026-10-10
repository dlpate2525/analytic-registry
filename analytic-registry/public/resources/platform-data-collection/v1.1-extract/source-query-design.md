# V1.1 platform query handoff

Query revision **2**, 9 October 2026. These files produce the existing [Excel contract](analytic-registry-v1.1-extract.xlsx): 11 input tables and 72 columns. No source database was available for live execution.

## Files for platform managers

| Platform | Run this query | Source and instructions |
|---|---|---|
| Alteryx 2025.2 | [SQL Server extract](queries/alteryx-sqlserver.sql) | SQL Server copies of AlteryxGallery and AlteryxService. Start with [schema inspection](queries/alteryx-sqlserver-preflight.sql) and the [mapping guide](alteryx-sqlserver-mapping.md). |
| Tableau | [PostgreSQL extract](queries/tableau-postgresql-selects.sql) | Tableau repository tables, scoped to one site. Use the [2026.2 mapping guide](tableau-postgresql-mapping.md). |
| Power BI / Fabric | [Fabric SQL extract](queries/fabric-inventory.sql) | Landed inventory in a Warehouse or Lakehouse. Use [DAX discovery](queries/fabric-model-discovery.dax) and the [source mapping guide](fabric-query-mapping.md). |

The SQL adapter views are mappings over your supplied data. They are not native vendor tables or new registry entities. Set them up once, then retain the mappings across monthly deliveries.

## Five-step delivery

1. Verify source fields, snapshot scope, native IDs, and source observation time.
2. Set the existing delivery parameters and run the matching SQL batch.
3. Save each named result in its matching Excel input table.
4. Load [SQL staging](sqlserver-staging.sql) and review [validation](sqlserver-validation.sql) plus query diagnostics.
5. Have Platform Manager review coverage and unresolved references before accepting the delivery.

Preserve native IDs as text. Keep SQL NULL values as blank Excel cells. Do not paste diagnostics into input tables. Header-only results mean no dataset rows; they do not mean the platform has no such objects.

## Alteryx: SQL over exported Gallery and Service

The extract uses T-SQL against SQL Server copies. It does not call Alteryx APIs or require MongoDB execution. Mapping views isolate physical SQL table names, flattened columns, and JSON array storage from the output contract.

The user-supplied [Gallery field reference](https://help.alteryx.com/20251/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxgallery-mongodb-schema.html) and [Service field reference](https://help.alteryx.com/20251/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxservice-mongodb-schema.html) document **2025.1** fields. The requested target is **2025.2**. The mapping guide records this distinction and the installed-schema checks. These references do not establish the physical shape of your SQL export.

Use `collections.CollectionId` for collections, `appInfos._id` for workflows, and `users._id` for platform accounts. Keep their existing namespaces. `ServiceId` supports a supplemental join to `AS_Applications`; it never replaces the workflow ID.

`appInfos.CreatedBy` is the original author. Service `UserName` is not proof of the current workflow owner. Connections and lineage remain uncollected until verified source evidence is available. The query retains unresolved references and ambiguous revision evidence for Platform Manager.

## Tableau: PostgreSQL repository

The ordinary SQL batch works in a PostgreSQL query editor. It uses one read-only, repeatable-read transaction. The [mapping guide](tableau-postgresql-mapping.md) lists parameters and checks. The existing [psql CSV variant](queries/tableau-postgresql.sql) remains available for teams that prefer file output.

Preserve project, workbook, published datasource, connection, and user LUIDs. Repository integer references retain their own namespace. Published datasource records require `parent_workbook_id IS NULL`. Verify installed `projects_contents.content_type` and `data_connections.owner_type` tokens before execution. [Tableau 2026.2 dictionary](https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm)

Unknown credential classification remains Unknown with Partial evidence. Unresolved membership and owner references remain diagnostic records. Directory accounts and dependency lineage are separate evidence sources.

## Fabric: inventory model to queryable rows

Fabric SQL queries loaded tables. It does not expose a documented system-table catalog of every Power BI report. The [Fabric guide](fabric-query-mapping.md) describes an explicit seven-column inventory adapter and native DAX model discovery. [Microsoft SQL analytics endpoint](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-sql-analytics-endpoint)

The Fabric SQL route provides workspaces, reports, semantic models, and direct workspace membership. Those three datasets remain Partial. Connections, dependencies, users, ownership, and directory accounts remain NotCollected. Empty workspaces can be absent from an item inventory. Never promote this delivery to full tenant coverage merely because extraction succeeded.

Retain `PlatformCode=PowerBI`, `NativeAssetType=Report` or `Dataset`, and membership `ContainedIn`. Renaming these keys to Fabric or SemanticModel would break reconciliation with earlier accepted deliveries.

For an existing completed scan JSON export, the [SQL Server transform](queries/powerbi-export-sqlserver.sql) remains a richer alternative. It makes no API call. It requires SQL Server OPENJSON support and must not be run unchanged in Fabric. [Microsoft OPENJSON](https://learn.microsoft.com/en-us/sql/t-sql/functions/openjson-transact-sql)

The workbook's PowerBI_Output tab explicitly distinguishes these two profiles. In the scan export, Microsoft defines report `createdById` as the report owner's ID. Its role remains TechnicalOwner. Do not apply Alteryx's author semantics to this differently defined field. [Microsoft report fields](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result#workspaceinforeport)

## Monthly identity and acceptance

Match objects by platform, instance, stable scope, native type where required, and exact native ID. Display names remain attributes. A retry reuses RunKey only for identical immutable input. Later observations use a new delivery key. RunKey and ObservedAt keep their existing meanings; no RunDate field is added.

Resolve source account references within their declared namespaces. Match explicit SourceEmail to normalized directory Mail within the configured tenant. Keep unmatched, ambiguous, disabled, unknown, and missing-directory-evidence outcomes distinct. All unresolved cases go to Platform Manager. No UPN fallback or name match is introduced.

Do not infer deletion from Partial, NotCollected, or Failed coverage. NotCollected and Failed use NULL RowCount; collected empty datasets use zero. Technical observations never overwrite approved business owners, declarations, Champions, or historical approvals. See [monthly reconciliation](monthly-reconciliation.md).

Before acceptance, exercise rename, workspace move, duplicate key, omitted dataset, disabled account, and changed-email cases using real captures. Static checks cannot certify the installed SQL schema, export completeness, or runtime behavior.

## Retained earlier artifacts

The [MongoDB projection](queries/alteryx-mongodb.js) and [JSON Service crosswalk](queries/alteryx-service-crosswalk.sql) remain reference material for earlier deliveries. They are not the current Alteryx execution route. Earlier tagged releases remain immutable.
