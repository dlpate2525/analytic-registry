# V1.1 source-query handoff

Updated 9 October 2026. These are read-only query templates over source databases or supplied metadata exports. None has run against your installed platforms or SQL Server. Your exported Alteryx files have not yet been located or inspected.

Use the [V1.1 workbook](analytic-registry-v1.1-extract.xlsx) and its [contract](contract.json). V1.1 has different headers from V1. Keep the frozen V1 release for comparison. A successful query is not proof that a delivery covers the whole platform.

## Query files and inputs

| Platform | Query | Input | Output |
|---|---|---|---|
| Tableau | [tableau-postgresql.sql](queries/tableau-postgresql.sql) | Read-only Tableau PostgreSQL repository; one site | Eleven contract CSV files plus a supplemental relationship exception file. |
| Alteryx | [alteryx-mongodb.js](queries/alteryx-mongodb.js) | AlteryxGallery collections, appInfos, users; optional AlteryxService AS_Applications | Named aggregation results; explicit run context and nine coverage records. Export results with the approved query client. |
| Alteryx Service crosswalk | [alteryx-service-crosswalk.sql](queries/alteryx-service-crosswalk.sql) | Two projected supplemental JSON arrays from the MongoDB queries | Workflow-to-Service reference evidence. This is not a workbook input table. |
| Power BI / Fabric | [powerbi-export-sqlserver.sql](queries/powerbi-export-sqlserver.sql) | Existing WorkspaceInfo scan-result JSON plus delivery context | Eleven named contract result sets plus supplemental evidence. No API calls. |

Power BI has a documented metadata scan-result interface. This pack reads an already supplied result; it does not assume a customer-queryable PostgreSQL metadata database. The platform team must provide the metadata export and its coverage. Workload tables in a Fabric warehouse are not the tenant's report inventory. [Microsoft scan-result contract](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result)

The SQL Server transforms use `OPENJSON`, which requires compatibility level 130 or later. Run them against supplied JSON values, not against undocumented Microsoft internal tables. [Microsoft OPENJSON documentation](https://learn.microsoft.com/en-us/sql/t-sql/functions/openjson-transact-sql)

## Five-step handoff

1. Confirm the installed schema, source instance, scope, query revision, and capture time.
2. Execute the platform query against the approved source or isolated restored export.
3. Save each result with the exact workbook headers and record its delivered row count.
4. Load [staging](sqlserver-staging.sql), then review [validation results](sqlserver-validation.sql) and supplemental exceptions.
5. Have Platform Manager accept coverage and unresolved cases before reconciliation updates current observations.

Record query revision and original source location with the delivery. Keep the source evidence separate from app-owned business declarations. A retry reuses RunKey only for identical immutable input. A later delivery gets its own existing-format RunKey.

## Tableau query boundary

The query uses one read-only repeatable-read transaction. It requires `psql`, approved repository access, and the variables listed at the top. Run it in a new output directory. `psql` output redirection can overwrite an existing file; it is not an overwrite guard.

Verify the source columns with the existing [repository preflight](../tableau/preflight.sql) and [identity validation guidance](../v1-extract/tableau-identity-extract.md). Confirm the installed `projects_contents.content_type` and `data_connections.owner_type` tokens before supplying them. These tokens are inputs because a guessed token can silently remove relationships.

The dictionary supports project, workbook, user, and connection LUIDs. Published datasource records have `parent_workbook_id IS NULL`; embedded datasource records must not be labeled as published assets. Connections identify their owning object through `owner_type` and `owner_id`. Project membership uses `projects_contents`. [Tableau 2026.2 dictionary](https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm)

| Result | Query behavior |
|---|---|
| Workspaces | Projects in the selected site. |
| Assets | Workbooks and published datasources in the selected site. |
| Workspace_Assets | Project membership for those asset kinds. |
| Connections | Repository connection observations, including rows whose owning asset is outside this profile. Credential classification remains Unknown; evidence remains Partial. |
| Asset_Connections | Direct connection-owner edges to included workbooks or published datasources. |
| Platform_Users | Site users and explicit email evidence. Native role labels are not directory enabled status. |
| Object_Users | Technical-owner and modifier references. Missing users remain unresolved. |
| Asset_Dependencies | Header only; NotCollected. No lineage inferred from equal names. |
| Directory_Users | Header only; NotCollected. Obtain directory evidence separately. |

Relationships that cannot produce a valid inventory edge are retained in `tableau_relationship_exceptions.csv`. Do not ignore this file when evaluating completeness. Inner-join output counts alone cannot identify omitted source references.

The manifest's ObservedAt must include an actual UTC offset. The query does not export native created/modified timestamps. Do not append `Z` to an unknown source timezone. PostgreSQL distinguishes timestamps with and without time zones. [PostgreSQL date/time documentation](https://www.postgresql.org/docs/current/datatype-datetime.html)

## Alteryx: query the exported databases directly

Restore database exports to an isolated approved MongoDB instance when possible. A CSV or JSON export may use flattened names or Extended JSON wrappers; inspect that format before adapting these pipelines. Do not point them at files without restoring or adapting the input shape.

The named queries require MongoDB 4.4 or later because Object_Users combines collections with `$unionWith`. The file contains aggregation definitions, not an API client or filesystem export loop. Loading it does not run every query or create delivery files. [MongoDB unionWith documentation](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/)

1. Set `registryRun` to the existing delivery context shown in the query header.
2. Load `queries/alteryx-mongodb.js` in mongosh.
3. Run the selected result, such as `registryQueries.Assets()`.
4. Export that result using the approved client and exact contract column order.
5. Save `QueryDiagnostics()` and fill the nine `registryCoverage` row counts.

`registryQueries.Run_Context()` provides configured metadata. It is not a source-system fact. Four uncollected datasets have no placeholder records: Connections, Asset_Connections, Asset_Dependencies, and Directory_Users. Use their header templates and NotCollected coverage. Sequential live queries do not provide a cross-database snapshot.

The official Gallery field page identifies collection IDs, collection owners, workflow IDs, original authors, revisions, and Service references. `appInfos.CreatedBy` identifies the original author. It does not prove current workflow ownership. A published revision and primary application must each have one candidate before the query selects their metadata. [Alteryx Gallery field reference](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxgallery-mongodb-schema.html)

| Field or dataset | Populate | NULL or exception behavior |
|---|---|---|
| Workspace ID | collections.CollectionId | Missing key fails staging. Do not use the collection name. |
| Workspace lifecycle | No baseline source | Always NULL. Presence does not mean Active. |
| Asset ID | appInfos._id as exact text | Never use RevisionId or ServiceId as the enduring asset ID. |
| Asset name/version | One published revision and one primary application | Ambiguous name stays NULL; retain diagnostics and route to Platform Manager. |
| Asset lifecycle | Explicit IsDeleted boolean | True becomes Deleted; false becomes Present; absent stays NULL. |
| User email/status | users.Email and explicit users.Active | Missing stays NULL. Active is not corporate directory accountEnabled. |
| Collection owner | collections.OwnerId resolved to users._id | Keep raw reference; unresolved match remains an exception. |
| Workflow author | appInfos.CreatedBy resolved to users._id | Role is CreatedBy, never TechnicalOwner. |
| Current workflow owner | No verified baseline source | NULL reference and UnverifiedMapping row for Platform Manager. |
| Direct collection members | collections.Users[].UserId | Direct members only. No claim of full effective access or inherited group expansion. |
| Connections and lineage | No verified baseline query | No rows; NotCollected coverage. |

The current Gallery documentation describes schema 80 / Server 2026.1. Server 2025.2 appears as schema 79 in the version crosswalk. These pages do not certify the shape of your installed export. The platform team must verify the candidate mappings against that export before acceptance. [Alteryx schema crosswalk](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference.html)

### Optional Service evidence

Run `Gallery_Service_References()` and `Service_Applications()` only when the Service crosswalk helps a specific investigation. Their output does not widen the 72-column input contract. Query AS_Applications; do not export job logs or binary workflow packages just to populate asset names.

Gallery ServiceId references the Service application catalog. Service UserName and ModuleName are supplemental evidence; they do not establish current workflow ownership. The separate SQL crosswalk joins exact IDs within the same RunKey and retains missing or multiple matches. It does not use cross-database `$lookup`. [Alteryx Service field reference](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxservice-mongodb-schema.html)

Do not export credentials, tokens, passwords, connection strings, or opaque package content. The delivered projections select named metadata fields. QueryDiagnostics reports malformed arrays and ambiguous revision selection. It is not a substitute for complete source-schema validation.

## Power BI query boundary

Supply one completed scan-result JSON body. The SQL validates root and nested object/array shapes before producing results. It rejects duplicate workspace, asset, and connection keys. Identical principal observations may collapse; conflicting observations remain visible for staging review.

Reports and semantic models remain separate assets. Direct model connection use belongs to the model. Report-to-model dependencies preserve the source relationship. A missing model or connection endpoint becomes Unresolved, even when the source reference itself was present.

The supplemental report result preserves report format and dataset workspace reference. Keep it with the raw JSON. The input contract identifies assets within a stable tenant scope; it does not use a movable workspace ID as the enduring scope. Connection source condition is also retained separately from credential evidence quality.

Only explicit source email can enter automatic email matching. Principal access rights describe roles, not enabled status. Groups and applications must not become people automatically. A report owner reference is different from workspace business ownership.

The property name `createdById` is misleading: Microsoft documents it as the report owner's ID for eligible reports. This query therefore uses TechnicalOwner. `modifiedById` identifies the last modifier. Neither field sets the workspace's approved business owner. [Microsoft report field definitions](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result#workspaceinforeport)

The Tableau and Power BI queries omit host strings containing common URI, credential, or whitespace delimiters. Supplemental results flag those omissions. This conservative check is not a complete secret detector; review unusual endpoint formats before release.

The query does not acquire the export, verify scanner permissions, verify capture timing, or prove tenant coverage. Missing arrays are not evidence of zero objects. All auto-generated coverage is conservative; Platform Manager must approve completeness separately.

## Reconciliation and acceptance

Match native objects using platform, source instance, stable scope, native type where needed, and exact native ID. Use display name as an attribute. Resolve source principals through their declared ID namespace before matching normalized SourceEmail to directory Mail within the configured tenant. No UPN fallback is added.

Keep these outcomes distinct: resolved-enabled, resolved-disabled, unmatched, ambiguous, missing directory evidence, and failed lookup. Platform Active is not directory enabled status. Unresolved cases go to Platform Manager without changing approved business ownership.

Do not infer deletion from a missing row in Partial, NotCollected, or Failed coverage. Even Complete coverage supports a missing-observation candidate within its approved boundary; it does not prove business retirement. See [monthly reconciliation](monthly-reconciliation.md).

Before accepting the first delivery, verify identifiers and row counts across two captures. Exercise rename, workspace move, omitted dataset, duplicate key, disabled matched user, and changed-email cases. Preserve current business declarations during every refresh. These are acceptance scenarios; this pack does not claim they ran on your environment.

## Verification record

Local checks validate query syntax where available, output-header alignment, read-only operators, required coverage entries, and retained exception paths. They cannot certify the installed database schema or SQL runtime behavior. Platform query execution, actual Alteryx export mapping, and production loading remain pending.
