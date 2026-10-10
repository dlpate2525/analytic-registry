/* Analytic Registry V1.1: SQL Server query over a supplied Power BI scan export.
   No API calls. No Microsoft internal database is assumed. No persistent writes.
   Execute in SQL Server with database compatibility >= 130.
   Input: one completed WorkspaceInfo GetScanResult JSON body, plus its manifest.
   Fields: https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result
   JSON: https://learn.microsoft.com/en-us/sql/t-sql/functions/openjson-transact-sql
   Save each named result set to the matching V1.1 Excel table. The final supplemental
   result sets are supplemental evidence, not workbook tables.
   Actual exports have not been supplied; this query requires deployment testing.
*/
SET NOCOUNT ON;
DECLARE @ScanJson nvarchar(max) = NULL; -- Supply the export body; do not paste secrets.
DECLARE @RunKey uniqueidentifier = NULL; -- Existing manifest RunKey.
DECLARE @PlatformInstanceKey nvarchar(256) = NULL;
DECLARE @NativeScopeKey nvarchar(256) = NULL;
DECLARE @ObservedAt datetimeoffset(7) = NULL;
DECLARE @DirectoryTenantKey nvarchar(256) = NULL;
DECLARE @ScopeDescription nvarchar(1024) = NULL;

IF @RunKey IS NULL OR @ObservedAt IS NULL OR NULLIF(@PlatformInstanceKey,'') IS NULL
   OR NULLIF(@NativeScopeKey,'') IS NULL
   OR NULLIF(@ScopeDescription,'') IS NULL
  THROW 51000, 'Supply existing manifest context before running this query.', 1;
IF COALESCE(ISJSON(@ScanJson),0) <> 1
  THROW 51001, 'Input must be one valid scan-result JSON object.', 1;
IF NOT EXISTS(SELECT 1 FROM OPENJSON(@ScanJson) WHERE [key]='workspaces' AND [type]=4)
  THROW 51002, 'Expected workspaces array. This is not a compatible scan result.', 1;
IF EXISTS(SELECT 1 FROM OPENJSON(@ScanJson,'$.workspaces') WHERE [type]<>5)
  THROW 51003, 'Every workspace must be a JSON object. Retain invalid input.', 1;

DECLARE @W TABLE (ID nvarchar(4000) COLLATE Latin1_General_100_BIN2,
 Name nvarchar(4000), Type nvarchar(4000), State nvarchar(4000), Doc nvarchar(max));
INSERT @W SELECT JSON_VALUE(value,'$.id'),JSON_VALUE(value,'$.name'),
 JSON_VALUE(value,'$.type'),JSON_VALUE(value,'$.state'),value
FROM OPENJSON(@ScanJson,'$.workspaces');
IF EXISTS(SELECT 1 FROM @W WHERE NULLIF(ID,'') IS NULL OR NULLIF(Name,'') IS NULL)
  THROW 51004, 'Workspace native ID/name is missing; retain input for Platform Manager.', 1;
IF EXISTS(SELECT ID FROM @W GROUP BY ID HAVING COUNT(*)>1)
  THROW 51005, 'Duplicate workspace observations. Separate conflicting snapshots.', 1;
IF EXISTS(SELECT 1 FROM @W w CROSS APPLY OPENJSON(w.Doc) p
 WHERE p.[key] IN ('reports','datasets','users') AND p.[type]<>4)
  THROW 51006, 'Expected array is present with the wrong type.', 1;
IF EXISTS(SELECT 1 FROM @W w CROSS APPLY OPENJSON(w.Doc,'$.reports') j WHERE j.[type]<>5)
 OR EXISTS(SELECT 1 FROM @W w CROSS APPLY OPENJSON(w.Doc,'$.datasets') j WHERE j.[type]<>5)
 OR EXISTS(SELECT 1 FROM @W w CROSS APPLY OPENJSON(w.Doc,'$.users') j WHERE j.[type]<>5)
  THROW 51011, 'Workspace report, dataset, or user entries must be JSON objects.', 1;
IF EXISTS(SELECT 1 FROM OPENJSON(@ScanJson) p
 WHERE p.[key] IN ('datasourceInstances','misconfiguredDatasourceInstances') AND p.[type]<>4)
 OR EXISTS(SELECT 1 FROM OPENJSON(@ScanJson,'$.datasourceInstances') j WHERE j.[type]<>5)
 OR EXISTS(SELECT 1 FROM OPENJSON(@ScanJson,'$.misconfiguredDatasourceInstances') j WHERE j.[type]<>5)
  THROW 51012, 'Connection arrays and objects have an unsupported source shape.', 1;

DECLARE @A TABLE (WorkspaceID nvarchar(4000) COLLATE Latin1_General_100_BIN2,
 ID nvarchar(4000) COLLATE Latin1_General_100_BIN2, Type nvarchar(80),
 Name nvarchar(4000), Doc nvarchar(max));
INSERT @A
SELECT w.ID,JSON_VALUE(j.value,'$.id'),'Report',JSON_VALUE(j.value,'$.name'),j.value
FROM @W w CROSS APPLY OPENJSON(w.Doc,'$.reports') j
UNION ALL
SELECT w.ID,JSON_VALUE(j.value,'$.id'),'Dataset',JSON_VALUE(j.value,'$.name'),j.value
FROM @W w CROSS APPLY OPENJSON(w.Doc,'$.datasets') j;
IF EXISTS(SELECT 1 FROM @A WHERE NULLIF(ID,'') IS NULL OR NULLIF(Name,'') IS NULL)
  THROW 51007, 'Asset native ID/name missing. Retain input for Platform Manager.', 1;
IF EXISTS(SELECT ID,Type FROM @A GROUP BY ID,Type HAVING COUNT(*)>1)
  THROW 51008, 'Duplicate asset native key. Retain input; do not pick the first.', 1;
IF EXISTS(SELECT 1 FROM @A a CROSS APPLY OPENJSON(a.Doc) p
 WHERE p.[key] IN ('users','datasourceUsages','misconfiguredDatasourceUsages') AND p.[type]<>4)
 OR EXISTS(SELECT 1 FROM @A a CROSS APPLY OPENJSON(a.Doc,'$.users') j WHERE j.[type]<>5)
 OR EXISTS(SELECT 1 FROM @A a CROSS APPLY OPENJSON(a.Doc,'$.datasourceUsages') j WHERE j.[type]<>5)
 OR EXISTS(SELECT 1 FROM @A a CROSS APPLY OPENJSON(a.Doc,'$.misconfiguredDatasourceUsages') j WHERE j.[type]<>5)
  THROW 51013, 'Asset user or connection-use fields have an unsupported source shape.', 1;

DECLARE @C TABLE (ID nvarchar(4000) COLLATE Latin1_General_100_BIN2,
 Type nvarchar(4000), ServerName nvarchar(4000), DatabaseName nvarchar(4000),
 SourceState nvarchar(80));
INSERT @C
SELECT JSON_VALUE(j.value,'$.datasourceId'),JSON_VALUE(j.value,'$.datasourceType'),
 JSON_VALUE(j.value,'$.connectionDetails.server'),JSON_VALUE(j.value,'$.connectionDetails.database'),'Observed'
FROM OPENJSON(@ScanJson,'$.datasourceInstances') j
UNION ALL
SELECT JSON_VALUE(j.value,'$.datasourceId'),JSON_VALUE(j.value,'$.datasourceType'),
 JSON_VALUE(j.value,'$.connectionDetails.server'),JSON_VALUE(j.value,'$.connectionDetails.database'),'Misconfigured'
FROM OPENJSON(@ScanJson,'$.misconfiguredDatasourceInstances') j;
IF EXISTS(SELECT 1 FROM @C WHERE NULLIF(ID,'') IS NULL)
  THROW 51009, 'Connection native ID missing. Retain input as unresolved evidence.', 1;
IF EXISTS(SELECT ID FROM @C GROUP BY ID HAVING COUNT(*)>1)
  THROW 51010, 'Duplicate connection native key. Reconcile before loading.', 1;

DECLARE @P TABLE (ObjectType nvarchar(80), ObjectID nvarchar(4000) COLLATE Latin1_General_100_BIN2,
 GraphID nvarchar(4000) COLLATE Latin1_General_100_BIN2,
 Identifier nvarchar(4000) COLLATE Latin1_General_100_BIN2,
 PrincipalType nvarchar(80), DisplayName nvarchar(4000), Email nvarchar(4000), NativeRole nvarchar(4000));
INSERT @P
SELECT COALESCE(w.Type,'Workspace'),w.ID,JSON_VALUE(u.value,'$.graphId'),
 JSON_VALUE(u.value,'$.identifier'),JSON_VALUE(u.value,'$.principalType'),
 JSON_VALUE(u.value,'$.displayName'),JSON_VALUE(u.value,'$.emailAddress'),JSON_VALUE(u.value,'$.groupUserAccessRight')
FROM @W w CROSS APPLY OPENJSON(w.Doc,'$.users') u
UNION ALL
SELECT a.Type,a.ID,JSON_VALUE(u.value,'$.graphId'),JSON_VALUE(u.value,'$.identifier'),
 JSON_VALUE(u.value,'$.principalType'),JSON_VALUE(u.value,'$.displayName'),JSON_VALUE(u.value,'$.emailAddress'),
 CASE a.Type WHEN 'Report' THEN JSON_VALUE(u.value,'$.reportUserAccessRight')
             WHEN 'Dataset' THEN JSON_VALUE(u.value,'$.datasetUserAccessRight') END
FROM @A a CROSS APPLY OPENJSON(a.Doc,'$.users') u;

-- Run_Context: one row; this is the platform extract context, not directory context.
SELECT CONVERT(nvarchar(36),@RunKey) AS RunKey,'PowerBI' AS PlatformCode,
 @PlatformInstanceKey AS PlatformInstanceKey,@NativeScopeKey AS NativeScopeKey,
 @ObservedAt AS ObservedAt,@DirectoryTenantKey AS DirectoryTenantKey,
 '1.1' AS MappingVersion,@ScopeDescription AS ScopeDescription;

-- Workspaces
SELECT @RunKey AS RunKey,ID AS NativeWorkspaceID,COALESCE(Type,'Workspace') AS NativeWorkspaceType,
 Name AS DisplayName,State AS NativeLifecycleCode FROM @W;

-- Assets. NativeType remains Report/Dataset, separate from report format.
SELECT @RunKey AS RunKey,ID AS NativeAssetID,Type AS NativeAssetType,Name AS DisplayName,
 CAST(NULL AS nvarchar(256)) AS NativeVersionReference,
 CAST(NULL AS nvarchar(80)) AS NativeLifecycleCode FROM @A;

-- Workspace_Assets
SELECT @RunKey AS RunKey,WorkspaceID AS NativeWorkspaceID,ID AS NativeAssetID,
 Type AS NativeAssetType,'ContainedIn' AS NativeAssociationType FROM @A;

-- Connections. Do not infer extract mode or authentication from datasource type.
SELECT @RunKey AS RunKey,ID AS NativeConnectionID,
 COALESCE(Type,'Undefined')+' ('+ID+')' AS DisplayName,
 CASE LOWER(Type) WHEN 'sql' THEN 'SQL Server' WHEN 'sqlserver' THEN 'SQL Server'
      WHEN 'oracle' THEN 'Oracle' ELSE COALESCE(NULLIF(Type,''),'Undefined') END AS TechnologyCode,
 CAST(NULL AS bit) AS HasExtract,
 CASE WHEN ServerName NOT LIKE N'%[/?@#=; ]%'
       AND CHARINDEX(CHAR(9),ServerName)=0 AND CHARINDEX(CHAR(10),ServerName)=0
       AND CHARINDEX(CHAR(13),ServerName)=0 THEN ServerName END AS ServerHostname,DatabaseName,
 CAST(NULL AS nvarchar(80)) AS AuthenticationTypeCode,'Unknown' AS IdentityClassificationCode,
 'Partial' AS EvidenceStatusCode FROM @C;

-- Asset_Connections: dataset direct use only; do not attach a model's connection to a report.
SELECT @RunKey AS RunKey,a.ID AS NativeAssetID,a.Type AS NativeAssetType,
 JSON_VALUE(u.value,'$.datasourceInstanceId') AS NativeConnectionID,
 CASE WHEN EXISTS(SELECT 1 FROM @C c WHERE c.ID=JSON_VALUE(u.value,'$.datasourceInstanceId') COLLATE Latin1_General_100_BIN2)
      THEN 'Observed' ELSE 'Unresolved' END AS EvidenceStatusCode
FROM @A a CROSS APPLY OPENJSON(a.Doc,'$.datasourceUsages') u WHERE a.Type='Dataset'
UNION ALL
SELECT @RunKey,a.ID,a.Type,JSON_VALUE(u.value,'$.datasourceInstanceId'),
 CASE WHEN EXISTS(SELECT 1 FROM @C c WHERE c.ID=JSON_VALUE(u.value,'$.datasourceInstanceId') COLLATE Latin1_General_100_BIN2)
      THEN 'Observed' ELSE 'Unresolved' END
FROM @A a CROSS APPLY OPENJSON(a.Doc,'$.misconfiguredDatasourceUsages') u WHERE a.Type='Dataset';

-- Asset_Dependencies: report-to-model only. Preserve cross-workspace scope below.
SELECT @RunKey AS RunKey,ID AS NativeAssetID,Type AS NativeAssetType,
 JSON_VALUE(Doc,'$.datasetId') AS UpstreamNativeAssetID,'Dataset' AS UpstreamNativeAssetType,
 'UsesSemanticModel' AS RelationshipCode,
 CASE WHEN EXISTS(SELECT 1 FROM @A m WHERE m.Type='Dataset'
        AND m.ID=JSON_VALUE(r.Doc,'$.datasetId') COLLATE Latin1_General_100_BIN2
        AND m.WorkspaceID=COALESCE(NULLIF(JSON_VALUE(r.Doc,'$.datasetWorkspaceId'),''),r.WorkspaceID) COLLATE Latin1_General_100_BIN2)
      THEN 'Observed' ELSE 'Unresolved' END AS EvidenceStatusCode
FROM @A r WHERE Type='Report' AND NULLIF(JSON_VALUE(Doc,'$.datasetId'),'') IS NOT NULL;

-- Platform_Users: identical observations collapse; conflicting values remain separate.
-- Missing native IDs remain in supplemental exceptions and Object_Users below.
SELECT DISTINCT @RunKey AS RunKey,COALESCE(NULLIF(GraphID,''),NULLIF(Identifier,'')) AS NativePrincipalID,
 CASE WHEN NULLIF(GraphID,'') IS NOT NULL THEN 'PowerBIGraphID' ELSE 'PowerBIPrincipalIdentifier' END AS IdentifierNamespace,
 COALESCE(NULLIF(PrincipalType,''),'Unknown') AS PrincipalTypeCode,DisplayName,Email AS SourceEmail,
 CAST(NULL AS nvarchar(80)) AS SourceStatus
FROM @P WHERE COALESCE(NULLIF(GraphID,''),NULLIF(Identifier,'')) IS NOT NULL;

-- Directory_Users: header-only; collect directory evidence under its own Run_Context.
SELECT CAST(NULL AS uniqueidentifier) AS RunKey,CAST(NULL AS nvarchar(256)) AS DirectoryObjectID,
 CAST(NULL AS nvarchar(1024)) AS DisplayName,CAST(NULL AS nvarchar(320)) AS Mail,
 CAST(NULL AS bit) AS AccountEnabled WHERE 1=0;

-- Object_Users: direct access observations plus report owner/modifier references.
SELECT @RunKey AS RunKey,ObjectType AS NativeObjectType,ObjectID AS NativeObjectID,
 'Access' AS PrincipalRoleCode,COALESCE(NULLIF(Identifier,''),NULLIF(GraphID,'')) AS SourcePrincipalReference,
 CASE WHEN NULLIF(Identifier,'') IS NOT NULL THEN 'PowerBIPrincipalIdentifier'
      WHEN NULLIF(GraphID,'') IS NOT NULL THEN 'PowerBIGraphID' END AS SourceReferenceNamespace,
 COALESCE(NULLIF(GraphID,''),NULLIF(Identifier,'')) AS NativePrincipalID,
 CASE WHEN NULLIF(GraphID,'') IS NOT NULL THEN 'PowerBIGraphID'
      WHEN NULLIF(Identifier,'') IS NOT NULL THEN 'PowerBIPrincipalIdentifier' END AS IdentifierNamespace,
 NativeRole,
 CASE WHEN COALESCE(NULLIF(GraphID,''),NULLIF(Identifier,'')) IS NULL THEN 'MissingSourceReference'
      WHEN COALESCE(PrincipalType,'Unknown')<>'User' THEN 'UnverifiedMapping'
      WHEN NULLIF(LTRIM(RTRIM(Email)),'') IS NULL THEN 'MissingEmail'
      ELSE 'ReadyForEmailMatch' END AS SourceReferenceStatusCode FROM @P
UNION ALL
SELECT @RunKey,'Report',a.ID,v.RoleCode,v.NativeReference,
 CASE WHEN NULLIF(v.NativeReference,'') IS NOT NULL THEN 'PowerBIGraphID' END,
 CASE WHEN matched.MatchCount=1 THEN matched.GraphID END,
 CASE WHEN matched.MatchCount=1 THEN 'PowerBIGraphID' END,NULL,
 CASE WHEN NULLIF(v.NativeReference,'') IS NULL THEN 'MissingSourceReference'
      WHEN matched.MatchCount<>1 THEN 'UnresolvedUserReference'
      WHEN NULLIF(LTRIM(RTRIM(matched.Email)),'') IS NULL THEN 'MissingEmail'
      ELSE 'ReadyForEmailMatch' END
FROM @A a CROSS APPLY (VALUES
 ('TechnicalOwner',JSON_VALUE(a.Doc,'$.createdById')),
 ('ModifiedBy',JSON_VALUE(a.Doc,'$.modifiedById'))
) v(RoleCode,NativeReference)
OUTER APPLY (
 SELECT COUNT(*) AS MatchCount,MAX(p.GraphID) AS GraphID,MAX(p.Email) AS Email
 FROM (SELECT DISTINCT GraphID,Email,PrincipalType FROM @P) p
 WHERE p.GraphID COLLATE Latin1_General_100_BIN2=v.NativeReference COLLATE Latin1_General_100_BIN2
   AND p.PrincipalType='User'
) matched WHERE a.Type='Report';

-- Coverage: conservative Partial; this query cannot prove complete tenant coverage.
-- RowCount NULL for datasets not counted here or not collected. Confirm counts on saved results.
SELECT @RunKey AS RunKey,'Workspaces' AS DatasetCode,'Partial' AS CoverageStatus,COUNT_BIG(*) AS RowCount FROM @W
UNION ALL SELECT @RunKey,'Assets','Partial',COUNT_BIG(*) FROM @A
UNION ALL SELECT @RunKey,'Workspace_Assets','Partial',COUNT_BIG(*) FROM @A
UNION ALL SELECT @RunKey,'Connections',CASE WHEN JSON_QUERY(@ScanJson,'$.datasourceInstances') IS NULL
 AND JSON_QUERY(@ScanJson,'$.misconfiguredDatasourceInstances') IS NULL THEN 'NotCollected' ELSE 'Partial' END,
 CASE WHEN JSON_QUERY(@ScanJson,'$.datasourceInstances') IS NULL
 AND JSON_QUERY(@ScanJson,'$.misconfiguredDatasourceInstances') IS NULL THEN NULL ELSE COUNT_BIG(*) END FROM @C
UNION ALL SELECT @RunKey,'Asset_Connections','Partial',NULL
UNION ALL SELECT @RunKey,'Asset_Dependencies','Partial',NULL
UNION ALL SELECT @RunKey,'Platform_Users',CASE WHEN
 EXISTS(SELECT 1 FROM @W WHERE JSON_QUERY(Doc,'$.users') IS NOT NULL)
 OR EXISTS(SELECT 1 FROM @A WHERE JSON_QUERY(Doc,'$.users') IS NOT NULL)
 THEN 'Partial' ELSE 'NotCollected' END,NULL
UNION ALL SELECT @RunKey,'Object_Users','Partial',NULL
UNION ALL SELECT @RunKey,'Directory_Users','NotCollected',NULL;

-- SUPPLEMENTAL: preserve information that is outside the 72-column workbook.
SELECT @RunKey AS RunKey,a.ID AS ReportID,JSON_VALUE(a.Doc,'$.reportType') AS ReportType,
 JSON_VALUE(a.Doc,'$.datasetId') AS DatasetID,
 COALESCE(NULLIF(JSON_VALUE(a.Doc,'$.datasetWorkspaceId'),''),a.WorkspaceID) AS DatasetWorkspaceID
FROM @A a WHERE a.Type='Report';
SELECT @RunKey AS RunKey,ID AS NativeConnectionID,SourceState,
 CASE WHEN ServerName LIKE N'%[/?@#=; ]%'
       OR CHARINDEX(CHAR(9),ServerName)>0 OR CHARINDEX(CHAR(10),ServerName)>0
       OR CHARINDEX(CHAR(13),ServerName)>0 THEN 'HostOmittedForReview' END AS HostReviewStatus
FROM @C;

-- SUPPLEMENTAL: source references requiring manager attention.
SELECT @RunKey AS RunKey,ObjectType,ObjectID,Identifier,GraphID,PrincipalType,Email,
 'Platform Manager' AS AssignedToRole
FROM @P WHERE COALESCE(NULLIF(GraphID,''),NULLIF(Identifier,'')) IS NULL
 OR COALESCE(PrincipalType,'Unknown')<>'User' OR NULLIF(LTRIM(RTRIM(Email)),'') IS NULL;
