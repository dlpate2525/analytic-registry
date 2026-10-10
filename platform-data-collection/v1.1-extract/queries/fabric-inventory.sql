/* Analytic Registry V1.1 — Fabric inventory projection, revision 2.
   Run in a Fabric Warehouse or Lakehouse SQL analytics endpoint.
   Read-only T-SQL. No API calls, writes, JSON parser, or table variables.

   IMPORTANT: registry_source.FabricInventory is an ORGANIZATION-OWNED adapter
   table/view over a supplied inventory snapshot. It is NOT a Fabric system table.
   See ../fabric-query-mapping.md for acquisition and the seven input columns.
   Preserve the native IDs and workspace types used by earlier accepted pulls.

   This route covers reports and semantic models only. It cannot prove complete
   tenant inventory or include empty workspaces. Coverage remains Partial.
   Other datasets are header-only and NotCollected, never inferred from activity.

   Replace the manifest parameters, then run the whole batch. Save each named
   result to its matching workbook table. Validation failures stop the batch.
   Live Fabric execution has not been performed.
*/
DECLARE @RunKey varchar(max) = NULL;
DECLARE @PlatformInstanceKey varchar(max) = NULL;
DECLARE @NativeScopeKey varchar(max) = NULL;
DECLARE @ObservedAt varchar(max) = NULL; -- Snapshot time, ISO 8601 with UTC offset.
DECLARE @DirectoryTenantKey varchar(max) = NULL;
DECLARE @ScopeDescription varchar(max) = NULL;

-- One snapshot for validation, outputs, and counts. Run the entire batch.
-- Fabric applies snapshot isolation; do not issue SET TRANSACTION ISOLATION LEVEL.
IF @@TRANCOUNT<>0
    THROW 51108, 'Run this extract in a session without an existing transaction.', 1;
BEGIN TRY
BEGIN TRANSACTION;

IF TRY_CONVERT(uniqueidentifier,@RunKey) IS NULL OR DATALENGTH(@RunKey)<>36
 OR NULLIF(LTRIM(RTRIM(@PlatformInstanceKey)),'') IS NULL
 OR NULLIF(LTRIM(RTRIM(@NativeScopeKey)),'') IS NULL
 OR NULLIF(LTRIM(RTRIM(@ScopeDescription)),'') IS NULL
 OR TRY_CONVERT(datetimeoffset(7),@ObservedAt) IS NULL
 OR NOT (@ObservedAt LIKE '%Z' OR @ObservedAt LIKE '%+__:__' OR @ObservedAt LIKE '%-__:__')
    THROW 51101, 'Supply the existing immutable delivery context and source snapshot time.', 1;

-- SQL equality pads trailing spaces. Reject padded identities instead of merging
-- them or trimming them into a different Registry native key.
IF DATALENGTH(@PlatformInstanceKey)<>DATALENGTH(LTRIM(RTRIM(@PlatformInstanceKey)))
 OR DATALENGTH(@NativeScopeKey)<>DATALENGTH(LTRIM(RTRIM(@NativeScopeKey)))
 OR DATALENGTH(@DirectoryTenantKey)<>DATALENGTH(LTRIM(RTRIM(@DirectoryTenantKey)))
    THROW 51109, 'Manifest identity contains edge spaces. Retain and repair the source value.', 1;
IF EXISTS (
 SELECT 1 FROM registry_source.FabricInventory WHERE RunKey=@RunKey
 AND (DATALENGTH(WorkspaceId)<>DATALENGTH(LTRIM(RTRIM(WorkspaceId)))
   OR DATALENGTH(WorkspaceType)<>DATALENGTH(LTRIM(RTRIM(WorkspaceType)))
   OR DATALENGTH(ItemId)<>DATALENGTH(LTRIM(RTRIM(ItemId)))
   OR DATALENGTH(ItemType)<>DATALENGTH(LTRIM(RTRIM(ItemType))))
)
    THROW 51110, 'Source identity contains edge spaces. Do not trim or merge native keys.', 1;

-- Validate the destination contract BEFORE narrowing text. UTF-16 byte lengths
-- match SQL Server nvarchar limits, including names with supplementary characters.
IF DATALENGTH(CAST(@PlatformInstanceKey AS nvarchar(max)))>400
 OR DATALENGTH(CAST(@NativeScopeKey AS nvarchar(max)))>400
 OR DATALENGTH(CAST(@DirectoryTenantKey AS nvarchar(max)))>400
 OR DATALENGTH(CAST(@ScopeDescription AS nvarchar(max)))>2000
    THROW 51106, 'Manifest text exceeds the registry contract. Retain input; do not truncate.', 1;

IF EXISTS (
 SELECT 1 FROM registry_source.FabricInventory WHERE RunKey=@RunKey
 AND (DATALENGTH(CAST(WorkspaceId AS nvarchar(max)))>400
   OR DATALENGTH(CAST(WorkspaceName AS nvarchar(max)))>400
   OR DATALENGTH(CAST(WorkspaceType AS nvarchar(max)))>100
   OR DATALENGTH(CAST(ItemId AS nvarchar(max)))>400
   OR DATALENGTH(CAST(ItemName AS nvarchar(max)))>400)
)
    THROW 51107, 'Source text exceeds registry limits. Route to Platform Manager; do not truncate.', 1;

-- Missing records do not prove a genuinely empty inventory. Require source review.
IF NOT EXISTS (SELECT 1 FROM registry_source.FabricInventory WHERE RunKey=@RunKey)
    THROW 51102, 'No inventory rows for this RunKey. Review the source; do not infer deletions.', 1;

IF EXISTS (
 SELECT 1 FROM registry_source.FabricInventory WHERE RunKey=@RunKey
 AND (NULLIF(LTRIM(RTRIM(WorkspaceId)),'') IS NULL
   OR NULLIF(LTRIM(RTRIM(WorkspaceName)),'') IS NULL
   OR NULLIF(LTRIM(RTRIM(WorkspaceType)),'') IS NULL
   OR NULLIF(LTRIM(RTRIM(ItemId)),'') IS NULL
   OR NULLIF(LTRIM(RTRIM(ItemName)),'') IS NULL
   OR NULLIF(LTRIM(RTRIM(ItemType)),'') IS NULL)
)
    THROW 51103, 'Missing native identity or name. Retain the source for Platform Manager review.', 1;

-- Conflicting names/types can mean mixed snapshots. Do not choose MAX(name).
IF EXISTS (
 SELECT WorkspaceId FROM registry_source.FabricInventory WHERE RunKey=@RunKey
 GROUP BY WorkspaceId
 HAVING COUNT(DISTINCT WorkspaceName COLLATE Latin1_General_100_BIN2_UTF8)>1
     OR COUNT(DISTINCT WorkspaceType COLLATE Latin1_General_100_BIN2_UTF8)>1
)
    THROW 51104, 'Conflicting workspace observations. Separate or repair the delivery.', 1;

-- Preserve duplicate records as an exception instead of silently deduplicating assets.
IF EXISTS (
 SELECT ItemId, CASE WHEN ItemType IN ('SemanticModel','Semantic model','Dataset')
                    THEN 'Dataset' ELSE ItemType END
 FROM registry_source.FabricInventory
 WHERE RunKey=@RunKey AND ItemType IN ('Report','SemanticModel','Semantic model','Dataset')
 GROUP BY ItemId, CASE WHEN ItemType IN ('SemanticModel','Semantic model','Dataset')
                      THEN 'Dataset' ELSE ItemType END
 HAVING COUNT_BIG(*)>1
)
    THROW 51105, 'Duplicate asset native key. Review joins, copies, and mixed snapshots.', 1;

-- Run_Context — registry platform code and type names deliberately remain stable.
SELECT @RunKey AS RunKey, 'PowerBI' AS PlatformCode,
 @PlatformInstanceKey AS PlatformInstanceKey, @NativeScopeKey AS NativeScopeKey,
 @ObservedAt AS ObservedAt, @DirectoryTenantKey AS DirectoryTenantKey,
 '1.1' AS MappingVersion, @ScopeDescription AS ScopeDescription;

-- Workspaces — only those represented in this supplied item snapshot.
SELECT DISTINCT @RunKey AS RunKey, WorkspaceId AS NativeWorkspaceID,
 WorkspaceType AS NativeWorkspaceType, WorkspaceName AS DisplayName,
 CAST(NULL AS nvarchar(40)) AS NativeLifecycleCode
FROM registry_source.FabricInventory WHERE RunKey=@RunKey;

-- Assets — UI label Semantic model maps to existing durable native type Dataset.
SELECT @RunKey AS RunKey, ItemId AS NativeAssetID,
 CASE WHEN ItemType IN ('SemanticModel','Semantic model','Dataset')
      THEN 'Dataset' ELSE 'Report' END AS NativeAssetType,
 ItemName AS DisplayName, CAST(NULL AS nvarchar(100)) AS NativeVersionReference,
 CAST(NULL AS nvarchar(40)) AS NativeLifecycleCode
FROM registry_source.FabricInventory
WHERE RunKey=@RunKey AND ItemType IN ('Report','SemanticModel','Semantic model','Dataset');

-- Workspace_Assets — direct containment, never a guessed lineage relationship.
SELECT @RunKey AS RunKey, WorkspaceId AS NativeWorkspaceID, ItemId AS NativeAssetID,
 CASE WHEN ItemType IN ('SemanticModel','Semantic model','Dataset')
      THEN 'Dataset' ELSE 'Report' END AS NativeAssetType,
 'ContainedIn' AS NativeAssociationType
FROM registry_source.FabricInventory
WHERE RunKey=@RunKey AND ItemType IN ('Report','SemanticModel','Semantic model','Dataset');

-- Connections — inventory alone has no validated connection identifiers.
SELECT CAST(NULL AS uniqueidentifier) AS RunKey, CAST(NULL AS nvarchar(200)) AS NativeConnectionID,
 CAST(NULL AS nvarchar(200)) AS DisplayName, CAST(NULL AS nvarchar(40)) AS TechnologyCode,
 CAST(NULL AS bit) AS HasExtract, CAST(NULL AS nvarchar(255)) AS ServerHostname,
 CAST(NULL AS nvarchar(200)) AS DatabaseName, CAST(NULL AS nvarchar(40)) AS AuthenticationTypeCode,
 CAST(NULL AS nvarchar(40)) AS IdentityClassificationCode,
 CAST(NULL AS nvarchar(30)) AS EvidenceStatusCode WHERE 1=0;

-- Asset_Connections
SELECT CAST(NULL AS uniqueidentifier) AS RunKey, CAST(NULL AS nvarchar(200)) AS NativeAssetID,
 CAST(NULL AS nvarchar(50)) AS NativeAssetType, CAST(NULL AS nvarchar(200)) AS NativeConnectionID,
 CAST(NULL AS nvarchar(30)) AS EvidenceStatusCode WHERE 1=0;

-- Asset_Dependencies — matching names or workspace location is not lineage evidence.
SELECT CAST(NULL AS uniqueidentifier) AS RunKey, CAST(NULL AS nvarchar(200)) AS NativeAssetID,
 CAST(NULL AS nvarchar(50)) AS NativeAssetType, CAST(NULL AS nvarchar(200)) AS UpstreamNativeAssetID,
 CAST(NULL AS nvarchar(50)) AS UpstreamNativeAssetType, CAST(NULL AS nvarchar(40)) AS RelationshipCode,
 CAST(NULL AS nvarchar(30)) AS EvidenceStatusCode WHERE 1=0;

-- Platform_Users — do not turn report activity users into a current account inventory.
SELECT CAST(NULL AS uniqueidentifier) AS RunKey, CAST(NULL AS nvarchar(200)) AS NativePrincipalID,
 CAST(NULL AS nvarchar(60)) AS IdentifierNamespace, CAST(NULL AS nvarchar(30)) AS PrincipalTypeCode,
 CAST(NULL AS nvarchar(200)) AS DisplayName, CAST(NULL AS nvarchar(320)) AS SourceEmail,
 CAST(NULL AS nvarchar(500)) AS SourceStatus WHERE 1=0;

-- Directory_Users — a separate approved directory delivery supplies this evidence.
SELECT CAST(NULL AS uniqueidentifier) AS RunKey, CAST(NULL AS nvarchar(200)) AS DirectoryObjectID,
 CAST(NULL AS nvarchar(200)) AS DisplayName, CAST(NULL AS nvarchar(320)) AS Mail,
 CAST(NULL AS bit) AS AccountEnabled WHERE 1=0;

-- Object_Users — an inventory modifier is not proof of owner or current access.
SELECT CAST(NULL AS uniqueidentifier) AS RunKey, CAST(NULL AS nvarchar(50)) AS NativeObjectType,
 CAST(NULL AS nvarchar(200)) AS NativeObjectID, CAST(NULL AS nvarchar(40)) AS PrincipalRoleCode,
 CAST(NULL AS nvarchar(200)) AS SourcePrincipalReference,
 CAST(NULL AS nvarchar(60)) AS SourceReferenceNamespace,
 CAST(NULL AS nvarchar(200)) AS NativePrincipalID, CAST(NULL AS nvarchar(60)) AS IdentifierNamespace,
 CAST(NULL AS nvarchar(100)) AS NativeRole, CAST(NULL AS nvarchar(40)) AS SourceReferenceStatusCode
WHERE 1=0;

-- Coverage — all nine dataset entries. Uncollected datasets have NULL row counts.
SELECT @RunKey AS RunKey, 'Workspaces' AS DatasetCode, 'Partial' AS CoverageStatus,
 COUNT_BIG(*) AS RowCount
FROM (SELECT DISTINCT WorkspaceId,WorkspaceType,WorkspaceName
      FROM registry_source.FabricInventory WHERE RunKey=@RunKey) w
UNION ALL
SELECT @RunKey,'Assets','Partial',COUNT_BIG(*) FROM registry_source.FabricInventory
WHERE RunKey=@RunKey AND ItemType IN ('Report','SemanticModel','Semantic model','Dataset')
UNION ALL
SELECT @RunKey,'Workspace_Assets','Partial',COUNT_BIG(*) FROM registry_source.FabricInventory
WHERE RunKey=@RunKey AND ItemType IN ('Report','SemanticModel','Semantic model','Dataset')
UNION ALL SELECT @RunKey,'Connections','NotCollected',CAST(NULL AS bigint)
UNION ALL SELECT @RunKey,'Asset_Connections','NotCollected',CAST(NULL AS bigint)
UNION ALL SELECT @RunKey,'Asset_Dependencies','NotCollected',CAST(NULL AS bigint)
UNION ALL SELECT @RunKey,'Platform_Users','NotCollected',CAST(NULL AS bigint)
UNION ALL SELECT @RunKey,'Directory_Users','NotCollected',CAST(NULL AS bigint)
UNION ALL SELECT @RunKey,'Object_Users','NotCollected',CAST(NULL AS bigint);

-- SUPPLEMENTAL: Fabric item types outside this release's report/model asset scope.
SELECT @RunKey AS RunKey, ItemType, COUNT_BIG(*) AS ExcludedItemCount
FROM registry_source.FabricInventory
WHERE RunKey=@RunKey AND ItemType NOT IN ('Report','SemanticModel','Semantic model','Dataset')
GROUP BY ItemType;

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
