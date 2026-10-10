# Alteryx 2025.2: SQL Server query handoff

Use [alteryx-sqlserver.sql](queries/alteryx-sqlserver.sql) against the Gallery and Service exports already loaded into SQL Server. It produces the existing 11 Registry input tables. It does not call an API or connect to MongoDB.

The query uses four named SQL inputs. Their names are an adapter contract, not a claim about your physical table names. Map each input to the corresponding exported table. No platform field needs to be renamed in the source system.

## Version evidence

The user selected these field references: [Gallery 2025.1 schema](https://help.alteryx.com/20251/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxgallery-mongodb-schema.html) and [Service 2025.1 schema](https://help.alteryx.com/20251/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxservice-mongodb-schema.html). These pages identify schemas 72 and 7. The vendor [version crosswalk](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference.html) identifies **2025.2 as Gallery 79 and Service 8**. Its 2025.2 documentation link currently leads to the 2025.1 reference. Therefore, validate the selected fields against the installed 2025.2 export before approving complete coverage.

This is a SQL projection of **exported MongoDB-shaped data**. Do not substitute Alteryx's native SQL persistence schema or its identifiers. The export location does not change the source identifier namespace.

## Execution procedure

1. Run [the SQL preflight](queries/alteryx-sqlserver-preflight.sql) in the database containing the exported tables.
2. Map the four input views to one frozen server export, with its version, scope, observation time, and counts verified by the Platform Manager.
3. Set the `@Raw...` manifest parameters and set `@ImmutableSnapshotVerified = 1` after verification.
4. Run the full SQL with a read-only login, exporting its 11 workbook results and retaining the final diagnostic separately.
5. Validate the staged delivery before accepting it; preserve all ID columns as text.

The SQL file makes no permanent database changes. A DBA can implement the input names as views or replace them with equivalent subqueries. Defining views is a separate, local setup action. The queries require SQL Server 2016 or later and database compatibility level 130 or later for [OPENJSON](https://learn.microsoft.com/en-us/sql/t-sql/functions/openjson-transact-sql).

`ObservedAt` is the time represented by the source export. Running this SQL later does not create a newer source observation. If SQL tables retain several months, each input view must filter to exactly the same immutable export batch. A successful query does not establish cross-table snapshot consistency.

Enter manifest values as raw text, including the existing 36-character UUID in `@RawRunKey`. Use an explicit timezone for `@RawObservedAt`, such as `2026-10-09T12:00:00Z`. The SQL checks format and lengths before conversion. It rejects UUID suffixes, oversize keys, missing timezone offsets, and NULL snapshot confirmation. Optional `@RawDirectoryTenantKey` can remain NULL; it must not be an empty placeholder.

## SQL input contract

Use `nvarchar(max)` for text inputs until the query checks output limits. Use nullable `bit` for genuine source booleans. Preserve source NULLs. Invalid boolean values must fail source mapping; they must not become false.

| SQL input | Columns | Source grain and mapping |
| --- | --- | --- |
| `ar_source.Alteryx_Collections` | `CollectionId`, `Name`, `OwnerId`, `AppsJson`, `UsersJson` | One Gallery `collections` document. `AppsJson` and `UsersJson` hold the original arrays as JSON. `CollectionId` is the Registry workspace native ID; it is not the collection document `_id`. |
| `ar_source.Alteryx_AppInfos` | `AppInfoId`, `CreatedBy`, `ServiceId`, `IsDeleted`, `RevisionsJson` | One Gallery `appInfos` document. Map `_id` to `AppInfoId`; preserve the revision array. |
| `ar_source.Alteryx_Users` | `UserId`, `FirstName`, `LastName`, `Email`, `Active` | One Gallery `users` document. Map `_id` to `UserId`. `Active` is the source flag, not directory account status. |
| `ar_source.Alteryx_ServiceApplications` | `ServiceApplicationId`, `UserName`, `ModuleName` | One Service `AS_Applications` document. Map `_id` to `ServiceApplicationId`. These fields support diagnostics, not additional Registry assets. |

The original field meanings and array shapes follow the user-selected [Gallery reference](https://help.alteryx.com/20251/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxgallery-mongodb-schema.html). The Service cross-reference uses the selected [Service reference](https://help.alteryx.com/20251/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxservice-mongodb-schema.html).

### Adapter SELECT examples

These are **example aliases**, not discovered tables. Replace the two-part names with your actual database, schema, and table names. For example, `[AlteryxGallery].[collections]` below treats `AlteryxGallery` as a SQL schema. If it is a database, use its actual three-part name instead.

```sql
-- SELECT body for ar_source.Alteryx_Collections
SELECT CONVERT(nvarchar(max),[CollectionId]) AS CollectionId,
       CONVERT(nvarchar(max),[Name]) AS Name,
       CONVERT(nvarchar(max),[OwnerId]) AS OwnerId,
       CONVERT(nvarchar(max),[Apps]) AS AppsJson,
       CONVERT(nvarchar(max),[Users]) AS UsersJson
FROM [AlteryxGallery].[collections];

-- SELECT body for ar_source.Alteryx_AppInfos
SELECT CONVERT(nvarchar(max),[_id]) AS AppInfoId,
       CONVERT(nvarchar(max),[CreatedBy]) AS CreatedBy,
       CONVERT(nvarchar(max),[ServiceId]) AS ServiceId,
       [IsDeleted] AS IsDeleted, -- already nullable bit; reject malformed imports
       CONVERT(nvarchar(max),[Revisions]) AS RevisionsJson
FROM [AlteryxGallery].[appInfos];

-- SELECT body for ar_source.Alteryx_Users
SELECT CONVERT(nvarchar(max),[_id]) AS UserId,
       CONVERT(nvarchar(max),[FirstName]) AS FirstName,
       CONVERT(nvarchar(max),[LastName]) AS LastName,
       CONVERT(nvarchar(max),[Email]) AS Email,
       [Active] AS Active -- already nullable bit; NULL stays NULL
FROM [AlteryxGallery].[users];

-- SELECT body for ar_source.Alteryx_ServiceApplications
SELECT CONVERT(nvarchar(max),[_id]) AS ServiceApplicationId,
       CONVERT(nvarchar(max),[UserName]) AS UserName,
       CONVERT(nvarchar(max),[ModuleName]) AS ModuleName
FROM [AlteryxService].[AS_Applications];
```

These examples expect Mongo ObjectIds already decoded to their original text values. A literal `ObjectId(...)` wrapper, BSON bytes, or Extended JSON object must be decoded in the adapter. Do not generate a GUID or replace the ID with a name. Apply the same decoding to both ends of every reference.

### If the export flattened arrays into child tables

Reconstruct only the original relationships using the documented parent key. The following example names are placeholders for your export layout:

```sql
-- Example AppsJson expression inside the collection adapter:
(SELECT x.ApplicationId AS ApplicationId
 FROM [YourExport].[CollectionApps] x
 WHERE x.ParentCollectionDocumentId = c._id
 FOR JSON PATH) AS AppsJson

-- Example UsersJson expression inside the collection adapter:
(SELECT x.UserId AS UserId
 FROM [YourExport].[CollectionUsers] x
 WHERE x.ParentCollectionDocumentId = c._id
 FOR JSON PATH, INCLUDE_NULL_VALUES) AS UsersJson
```

Use this only when the child export is complete for the parent. Missing or uncollected child tables must stay unknown; they must not produce `[]`. A flattened revision adapter must restore `Revisions[].Applications[]` with boolean `IsPublishedRevision` and `IsPrimaryApp` properties. Do not replace the relationship with a join on workflow names. Microsoft documents the SQL array construction in [FOR JSON PATH](https://learn.microsoft.com/en-us/sql/relational-databases/json/format-nested-json-output-with-path-mode-sql-server).

## Result-to-workbook mapping

| Result | Workbook table | Source and treatment |
| --- | --- | --- |
| 1 | `Run_Context` | Existing manifest; no new enduring record key. |
| 2 | `Coverage` | Nine dataset declarations with emitted row counts. Collected sets remain `Partial` until mapping and scope are certified. |
| 3 | `Workspaces` | Collections keyed by `CollectionId`. Unknown lifecycle is NULL. |
| 4 | `Assets` | Workflows keyed by `appInfos._id`. Select exactly one published revision and primary application. Preserve deleted records as `Deleted`. |
| 5 | `Workspace_Assets` | Each `collections.Apps[].ApplicationId` references `appInfos._id`. Keep many-to-many memberships. |
| 6 | `Connections` | Header only; `NotCollected`. |
| 7 | `Asset_Connections` | Header only; `NotCollected`. |
| 8 | `Asset_Dependencies` | Header only; `NotCollected`. |
| 9 | `Platform_Users` | Gallery users; namespace `AlteryxMongoUserID`; preserve source email. |
| 10 | `Directory_Users` | Header only; directory evidence arrives in a separate delivery. |
| 11 | `Object_Users` | Collection owner, direct collection members, workflow author, and an unresolved workflow-owner record. |
| 12 | Outside workbook | `ServiceId` to `AS_Applications._id` match and diagnostic status. |

The 72-column Registry contract remains unchanged. Four Gallery/Service inputs do **not** establish workflow connection usage, effective access, directory status, or current workflow ownership. Connections and dependencies need separate, validated evidence. The query does not inspect binary workflows or expose credentials.

## Identity and reconciliation rules

The durable source key remains platform + instance + native scope + object type + native ID. `RunKey` groups observations. It does not replace the source key. Renaming a workflow or moving it between collections must preserve its Registry identity.

`CreatedBy` produces `PrincipalRoleCode = CreatedBy`. It never populates current workflow ownership. `ServiceId` is a bridge to the Service record, not a second workflow ID. `AS_Applications.UserName` remains supplemental because its meaning and identifier namespace can differ from Gallery users.

A direct collection user without a Gallery `UserId` stays unresolved. Group grants, studio inheritance, expiration, and effective permissions are outside this query. Multiple unresolved rows may need manual mapping before staging accepts their keys. Do not drop them or infer users from display names.

Join resolved Gallery user IDs to the Gallery user table first. Then use the established exact email rule: `lower(trim(SourceEmail)) = lower(trim(Mail))` within the configured directory tenant. A failed match goes to the Platform Manager. It does not prove the person is inactive. Only directory evidence can establish `AccountEnabled`.

## Validation and limits

The SQL fails before workbook output for duplicate source keys, malformed arrays, ambiguous published revisions, ambiguous primary applications, oversize values, and invalid membership references. It rejects empty arrays where a published revision is required. It preserves missing owner references as visible exceptions.

Preflight reads SQL object metadata through [sys.columns](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-columns-transact-sql). It cannot establish that the source export was complete. Retain export receipts and the exact source boundary outside the workbook. Do not infer deletion from a `Partial` delivery.

Static contract validation checks output headers, source-read-only behavior, and guard presence. These checks do not execute SQL Server or certify the user's installed export. Physical table names, imported array layout, and real-source execution remain to be validated by the platform team.
