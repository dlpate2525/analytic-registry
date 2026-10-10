/* Analytic Registry 1.1 — Alteryx Server 2025.2 exported into SQL Server.
   READ ONLY: no API, live Mongo connection, source writes, or permanent objects.
   Run alteryx-sqlserver-preflight.sql and map the four SQL input views first.
   See ../alteryx-sqlserver-mapping.md. View names are OUR adapter contract.
   Requires SQL Server 2016+ and database compatibility level >= 130.
   Execute against ONE IMMUTABLE EXPORT of ONE server/scope. No NOLOCK.
   The retained source observation time is not the time this SELECT executes.
   Export the first 11 result sets to the workbook sheets in the stated order.
   Result set 12 is supplemental Gallery/Service diagnostics, outside the workbook.
*/
SET NOCOUNT ON;

-- Paste manifest values into wide raw strings. Validate BEFORE any narrowing
-- conversion: uniqueidentifier accepts a valid prefix followed by extra text.
-- Never regenerate keys during a retry. Example timestamp: 2026-10-09T12:00:00Z.
DECLARE @RawRunKey nvarchar(max) = NULL;
DECLARE @RawPlatformInstanceKey nvarchar(max) = NULL;
DECLARE @RawNativeScopeKey nvarchar(max) = NULL;
DECLARE @RawObservedAt nvarchar(max) = NULL;
DECLARE @RawDirectoryTenantKey nvarchar(max) = NULL;
DECLARE @RawScopeDescription nvarchar(max) = NULL;
-- Set only after the Platform Manager verifies the exported build and boundaries.
DECLARE @SourceProductVersion nvarchar(max) = N'2025.2';
DECLARE @GallerySchemaVersion int = 79;
DECLARE @ServiceSchemaVersion int = 8;
DECLARE @ImmutableSnapshotVerified bit = 0;

IF @RawRunKey IS NULL OR @RawPlatformInstanceKey IS NULL OR @RawNativeScopeKey IS NULL
 OR @RawObservedAt IS NULL OR NULLIF(LTRIM(RTRIM(@RawScopeDescription)),N'') IS NULL
    THROW 51000, 'Supply the existing Run_Context manifest before querying.', 1;
IF DATALENGTH(@RawRunKey)<>72
    THROW 51023, 'RunKey must be exactly one canonical 36-character UUID, without extra text.', 1;
IF TRY_CONVERT(uniqueidentifier,@RawRunKey) IS NULL
 OR LOWER(@RawRunKey) COLLATE Latin1_General_100_BIN2
       <>LOWER(CONVERT(nvarchar(36),TRY_CONVERT(uniqueidentifier,@RawRunKey))) COLLATE Latin1_General_100_BIN2
    THROW 51023, 'RunKey must be exactly one canonical 36-character UUID, without extra text.', 1;
IF DATALENGTH(@RawPlatformInstanceKey) NOT BETWEEN 2 AND 400
 OR DATALENGTH(@RawNativeScopeKey) NOT BETWEEN 2 AND 400
 OR DATALENGTH(@RawScopeDescription)>2000
 OR DATALENGTH(@RawPlatformInstanceKey)<>DATALENGTH(LTRIM(RTRIM(@RawPlatformInstanceKey)))
 OR DATALENGTH(@RawNativeScopeKey)<>DATALENGTH(LTRIM(RTRIM(@RawNativeScopeKey)))
 OR (@RawDirectoryTenantKey IS NOT NULL AND
     (DATALENGTH(@RawDirectoryTenantKey) NOT BETWEEN 2 AND 400
      OR DATALENGTH(@RawDirectoryTenantKey)<>DATALENGTH(LTRIM(RTRIM(@RawDirectoryTenantKey)))))
    THROW 51024, 'Manifest values exceed output limits or identity values have edge spaces. No truncation is allowed.', 1;
IF DATALENGTH(@RawObservedAt) NOT BETWEEN 40 AND 100
 OR SUBSTRING(@RawObservedAt,11,1)<>N'T'
 OR (RIGHT(@RawObservedAt,1) COLLATE Latin1_General_100_BIN2<>N'Z'
     AND RIGHT(@RawObservedAt,6) COLLATE Latin1_General_100_BIN2 NOT LIKE N'[+-][0-9][0-9]:[0-9][0-9]')
    THROW 51025, 'ObservedAt must be an ISO timestamp with an explicit Z or numeric timezone offset.', 1;
IF TRY_CONVERT(datetimeoffset(7),@RawObservedAt,127) IS NULL
    THROW 51026, 'ObservedAt is not a valid datetimeoffset value.', 1;

DECLARE @RunKey uniqueidentifier = CONVERT(uniqueidentifier,@RawRunKey);
DECLARE @PlatformInstanceKey nvarchar(200) = CONVERT(nvarchar(200),@RawPlatformInstanceKey);
DECLARE @NativeScopeKey nvarchar(200) = CONVERT(nvarchar(200),@RawNativeScopeKey);
DECLARE @ObservedAt datetimeoffset(7) = CONVERT(datetimeoffset(7),@RawObservedAt,127);
DECLARE @DirectoryTenantKey nvarchar(200) = CONVERT(nvarchar(200),@RawDirectoryTenantKey);
DECLARE @ScopeDescription nvarchar(1000) = CONVERT(nvarchar(1000),@RawScopeDescription);

IF COALESCE(@ImmutableSnapshotVerified,0) <> 1
 OR @SourceProductVersion IS NULL OR DATALENGTH(@SourceProductVersion)<>12 OR @SourceProductVersion <> N'2025.2'
 OR @GallerySchemaVersion IS NULL OR @GallerySchemaVersion <> 79
 OR @ServiceSchemaVersion IS NULL OR @ServiceSchemaVersion <> 8
    THROW 51001, 'Verify one immutable Alteryx 2025.2 Gallery79/Service8 export first.', 1;
IF (SELECT compatibility_level FROM sys.databases WHERE database_id = DB_ID()) < 130
    THROW 51002, 'OPENJSON requires database compatibility level 130 or later.', 1;

-- Fail before output if a mapping view is missing. Compile-time missing-column
-- errors also stop execution; preflight provides the exact missing-column list.
IF OBJECT_ID(N'ar_source.Alteryx_Collections') IS NULL
 OR OBJECT_ID(N'ar_source.Alteryx_AppInfos') IS NULL
 OR OBJECT_ID(N'ar_source.Alteryx_Users') IS NULL
 OR OBJECT_ID(N'ar_source.Alteryx_ServiceApplications') IS NULL
    THROW 51003, 'Map all four ar_source SQL inputs using the mapping document.', 1;
IF EXISTS (
 SELECT 1 FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id
 WHERE (c.object_id=OBJECT_ID(N'ar_source.Alteryx_Users') AND c.name=N'Active'
     OR c.object_id=OBJECT_ID(N'ar_source.Alteryx_AppInfos') AND c.name=N'IsDeleted')
   AND t.name <> N'bit'
) THROW 51004, 'Active and IsDeleted inputs must be nullable bit with invalid values rejected upstream.', 1;
IF EXISTS (
 SELECT 1 FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id
 WHERE c.object_id IN (OBJECT_ID(N'ar_source.Alteryx_Collections'),OBJECT_ID(N'ar_source.Alteryx_AppInfos'),
                      OBJECT_ID(N'ar_source.Alteryx_Users'),OBJECT_ID(N'ar_source.Alteryx_ServiceApplications'))
 AND c.name NOT IN (N'Active',N'IsDeleted')
 AND (t.name<>N'nvarchar' OR c.max_length<>-1)
) THROW 51020, 'Text adapter columns must be nvarchar(max) so limits are checked before output conversion.', 1;

-- Preserve source identity exactly. Reject blanks, oversize values and edge spaces.
-- SQL string comparison pads trailing spaces even with BIN2; these guards prevent
-- accidental matches. Mongo ObjectIds must already be decoded losslessly to text.
IF EXISTS (
 SELECT 1 FROM (
  SELECT CollectionId AS NativeID FROM ar_source.Alteryx_Collections
  UNION ALL SELECT AppInfoId FROM ar_source.Alteryx_AppInfos
  UNION ALL SELECT UserId FROM ar_source.Alteryx_Users
  UNION ALL SELECT ServiceApplicationId FROM ar_source.Alteryx_ServiceApplications
 ) ids WHERE NativeID IS NULL OR DATALENGTH(NativeID)=0 OR DATALENGTH(NativeID)>400
      OR DATALENGTH(NativeID)<>DATALENGTH(LTRIM(RTRIM(NativeID)))
) THROW 51005, 'Missing, oversize, or whitespace-padded source ID. Retain and fix the source exception.', 1;
IF EXISTS (SELECT CollectionId COLLATE Latin1_General_100_BIN2 FROM ar_source.Alteryx_Collections
           GROUP BY CollectionId COLLATE Latin1_General_100_BIN2 HAVING COUNT_BIG(*)>1)
 OR EXISTS (SELECT AppInfoId COLLATE Latin1_General_100_BIN2 FROM ar_source.Alteryx_AppInfos
            GROUP BY AppInfoId COLLATE Latin1_General_100_BIN2 HAVING COUNT_BIG(*)>1)
 OR EXISTS (SELECT UserId COLLATE Latin1_General_100_BIN2 FROM ar_source.Alteryx_Users
            GROUP BY UserId COLLATE Latin1_General_100_BIN2 HAVING COUNT_BIG(*)>1)
 OR EXISTS (SELECT ServiceApplicationId COLLATE Latin1_General_100_BIN2 FROM ar_source.Alteryx_ServiceApplications
            GROUP BY ServiceApplicationId COLLATE Latin1_General_100_BIN2 HAVING COUNT_BIG(*)>1)
    THROW 51006, 'Duplicate source IDs. Do not hide duplicate snapshots with DISTINCT.', 1;
IF EXISTS (
 SELECT 1 FROM (
  SELECT OwnerId AS NativeReference FROM ar_source.Alteryx_Collections
  UNION ALL SELECT CreatedBy FROM ar_source.Alteryx_AppInfos
  UNION ALL SELECT ServiceId FROM ar_source.Alteryx_AppInfos
 ) refs WHERE NativeReference IS NOT NULL AND
   (DATALENGTH(NativeReference)>400 OR DATALENGTH(NativeReference)<>DATALENGTH(LTRIM(RTRIM(NativeReference))))
) THROW 51007, 'Oversize or whitespace-padded source reference. Do not normalize source identity.', 1;
IF EXISTS (SELECT 1 FROM ar_source.Alteryx_Collections WHERE Name IS NULL OR NULLIF(LTRIM(RTRIM(Name)),N'') IS NULL OR DATALENGTH(Name)>400)
 OR EXISTS (SELECT 1 FROM ar_source.Alteryx_Users WHERE DATALENGTH(Email)>640
             OR DATALENGTH(LTRIM(RTRIM(CONCAT(FirstName,N' ',LastName))))>400)
    THROW 51008, 'A name or email exceeds the contract or a required collection name is missing.', 1;

-- SQL 2016-compatible array check. NULL is unknown; [] is observed empty.
IF EXISTS (SELECT 1 FROM ar_source.Alteryx_Collections
           WHERE ISJSON(AppsJson)<>1 OR AppsJson IS NULL OR LEFT(LTRIM(AppsJson),1)<>N'['
              OR ISJSON(UsersJson)<>1 OR UsersJson IS NULL OR LEFT(LTRIM(UsersJson),1)<>N'[')
 OR EXISTS (SELECT 1 FROM ar_source.Alteryx_AppInfos
            WHERE ISJSON(RevisionsJson)<>1 OR RevisionsJson IS NULL OR LEFT(LTRIM(RevisionsJson),1)<>N'[')
    THROW 51009, 'Required array is missing or invalid. Preserve unknown; never replace it with an empty array.', 1;
IF EXISTS (SELECT 1 FROM ar_source.Alteryx_Collections c CROSS APPLY OPENJSON(c.AppsJson) j WHERE j.type<>5)
 OR EXISTS (SELECT 1 FROM ar_source.Alteryx_Collections c CROSS APPLY OPENJSON(c.UsersJson) j WHERE j.type<>5)
 OR EXISTS (SELECT 1 FROM ar_source.Alteryx_AppInfos a CROSS APPLY OPENJSON(a.RevisionsJson) j WHERE j.type<>5)
    THROW 51010, 'An expected array element is not an object. Inspect the retained input.', 1;

-- Each workflow must select exactly one published revision and one primary app.
-- Use JSON type 3 for booleans: the string "true" is not a Boolean true.
IF EXISTS (
 SELECT 1 FROM ar_source.Alteryx_AppInfos a
 OUTER APPLY (SELECT COUNT_BIG(*) AS PublishedCount
   FROM OPENJSON(a.RevisionsJson) r CROSS APPLY OPENJSON(r.value) p
   WHERE p.[key]=N'IsPublishedRevision' AND p.type=3 AND p.value=N'true') n
 WHERE n.PublishedCount<>1
) THROW 51011, 'Expected exactly one published revision per workflow. No arbitrary latest-row selection.', 1;
IF EXISTS (
 SELECT 1 FROM ar_source.Alteryx_AppInfos a CROSS APPLY OPENJSON(a.RevisionsJson) r
 WHERE (SELECT COUNT_BIG(*) FROM OPENJSON(r.value) p WHERE p.[key]=N'IsPublishedRevision')<>1
 OR NOT EXISTS (SELECT 1 FROM OPENJSON(r.value) p WHERE p.[key]=N'IsPublishedRevision' AND p.type=3)
) THROW 51021, 'Each revision must have one Boolean IsPublishedRevision property.', 1;
IF EXISTS (
 SELECT 1 FROM ar_source.Alteryx_AppInfos a
 CROSS APPLY OPENJSON(a.RevisionsJson) r CROSS APPLY OPENJSON(r.value) p
 WHERE p.[key]=N'IsPublishedRevision' AND p.type=3 AND p.value=N'true'
 AND ((SELECT COUNT_BIG(*) FROM OPENJSON(r.value) q WHERE q.[key]=N'Applications')<>1
      OR JSON_QUERY(r.value,'$.Applications') IS NULL
      OR LEFT(LTRIM(JSON_QUERY(r.value,'$.Applications')),1)<>N'[')
) THROW 51012, 'Published revision Applications must be an observed JSON array.', 1;
IF EXISTS (
 SELECT 1 FROM ar_source.Alteryx_AppInfos a
 CROSS APPLY OPENJSON(a.RevisionsJson) r CROSS APPLY OPENJSON(r.value) p
 CROSS APPLY OPENJSON(JSON_QUERY(r.value,'$.Applications')) ap
 WHERE p.[key]=N'IsPublishedRevision' AND p.type=3 AND p.value=N'true' AND ap.type<>5
) THROW 51013, 'An application array element is not an object.', 1;
IF EXISTS (
 SELECT 1 FROM ar_source.Alteryx_AppInfos a
 CROSS APPLY OPENJSON(a.RevisionsJson) r CROSS APPLY OPENJSON(r.value) p
 CROSS APPLY OPENJSON(JSON_QUERY(r.value,'$.Applications')) ap
 WHERE p.[key]=N'IsPublishedRevision' AND p.type=3 AND p.value=N'true'
 AND ((SELECT COUNT_BIG(*) FROM OPENJSON(ap.value) flag WHERE flag.[key]=N'IsPrimaryApp')<>1
   OR NOT EXISTS (SELECT 1 FROM OPENJSON(ap.value) flag WHERE flag.[key]=N'IsPrimaryApp' AND flag.type=3))
) THROW 51022, 'Each application must have one Boolean IsPrimaryApp property.', 1;
IF EXISTS (
 SELECT 1 FROM ar_source.Alteryx_AppInfos a
 CROSS APPLY OPENJSON(a.RevisionsJson) r CROSS APPLY OPENJSON(r.value) p
 OUTER APPLY (SELECT COUNT_BIG(*) AS PrimaryCount
   FROM OPENJSON(JSON_QUERY(r.value,'$.Applications')) ap CROSS APPLY OPENJSON(ap.value) flag
   WHERE flag.[key]=N'IsPrimaryApp' AND flag.type=3 AND flag.value=N'true') n
 WHERE p.[key]=N'IsPublishedRevision' AND p.type=3 AND p.value=N'true' AND n.PrimaryCount<>1
) THROW 51014, 'Expected exactly one primary app in the published revision.', 1;

IF EXISTS (
 SELECT 1
 FROM ar_source.Alteryx_AppInfos a
 CROSS APPLY OPENJSON(a.RevisionsJson) r CROSS APPLY OPENJSON(r.value) p
 CROSS APPLY OPENJSON(JSON_QUERY(r.value,'$.Applications')) ap CROSS APPLY OPENJSON(ap.value) flag
 WHERE p.[key]=N'IsPublishedRevision' AND p.type=3 AND p.value=N'true'
   AND flag.[key]=N'IsPrimaryApp' AND flag.type=3 AND flag.value=N'true'
 AND ((SELECT COUNT_BIG(*) FROM OPENJSON(ap.value) m WHERE m.[key]=N'MetaInfo')<>1
   OR NOT EXISTS (SELECT 1 FROM OPENJSON(ap.value) m WHERE m.[key]=N'MetaInfo' AND m.type=5)
   OR (SELECT COUNT_BIG(*) FROM OPENJSON(ap.value,'$.MetaInfo') n WHERE n.[key]=N'Name')<>1
   OR NOT EXISTS (SELECT 1 FROM OPENJSON(ap.value,'$.MetaInfo') n
                  WHERE n.[key]=N'Name' AND n.type=1 AND NULLIF(LTRIM(RTRIM(n.value)),N'') IS NOT NULL AND DATALENGTH(n.value)<=400)
   OR (SELECT COUNT_BIG(*) FROM OPENJSON(r.value) v WHERE v.[key]=N'RevisionId')<>1
   OR NOT EXISTS (SELECT 1 FROM OPENJSON(r.value) v
                  WHERE v.[key]=N'RevisionId' AND v.type=1 AND DATALENGTH(v.value) BETWEEN 2 AND 200))
) THROW 51015, 'Invalid asset name or revision identifier. Inspect the source; no workbook output was emitted.', 1;

-- Membership keys must be strings. Directory-only collection members without a
-- Gallery UserId are kept below as unresolved; never matched by their display name.
IF EXISTS (
 SELECT 1 FROM ar_source.Alteryx_Collections c CROSS APPLY OPENJSON(c.AppsJson) j
 WHERE (SELECT COUNT_BIG(*) FROM OPENJSON(j.value) p WHERE p.[key]=N'ApplicationId')<>1
 OR NOT EXISTS (SELECT 1 FROM OPENJSON(j.value) p WHERE p.[key]=N'ApplicationId' AND p.type=1
    AND DATALENGTH(p.value) BETWEEN 2 AND 400 AND DATALENGTH(p.value)=DATALENGTH(LTRIM(RTRIM(p.value))))
) THROW 51016, 'Collection membership has a missing or invalid workflow ID.', 1;
IF EXISTS (
 SELECT c.CollectionId COLLATE Latin1_General_100_BIN2, JSON_VALUE(j.value,'$.ApplicationId') COLLATE Latin1_General_100_BIN2
 FROM ar_source.Alteryx_Collections c CROSS APPLY OPENJSON(c.AppsJson) j
 GROUP BY c.CollectionId COLLATE Latin1_General_100_BIN2, JSON_VALUE(j.value,'$.ApplicationId') COLLATE Latin1_General_100_BIN2
 HAVING COUNT_BIG(*)>1
) THROW 51017, 'Duplicate CollectionMembership edge. Inspect the source; do not deduplicate silently.', 1;
IF EXISTS (
 SELECT 1 FROM ar_source.Alteryx_Collections c CROSS APPLY OPENJSON(c.UsersJson) j
 WHERE (SELECT COUNT_BIG(*) FROM OPENJSON(j.value) p WHERE p.[key]=N'UserId')>1
 OR EXISTS (SELECT 1 FROM OPENJSON(j.value) p WHERE p.[key]=N'UserId'
            AND (p.type NOT IN (0,1) OR DATALENGTH(p.value)>400
             OR DATALENGTH(p.value)<>DATALENGTH(LTRIM(RTRIM(p.value)))))
) THROW 51018, 'Invalid collection user reference. Missing/null references remain unresolved; malformed references must be fixed.', 1;
IF EXISTS (
 SELECT c.CollectionId COLLATE Latin1_General_100_BIN2, p.value COLLATE Latin1_General_100_BIN2
 FROM ar_source.Alteryx_Collections c CROSS APPLY OPENJSON(c.UsersJson) j CROSS APPLY OPENJSON(j.value) p
 WHERE p.[key]=N'UserId' AND p.type=1 AND NULLIF(p.value,N'') IS NOT NULL
 GROUP BY c.CollectionId COLLATE Latin1_General_100_BIN2, p.value COLLATE Latin1_General_100_BIN2
 HAVING COUNT_BIG(*)>1
) THROW 51019, 'Duplicate direct collection user reference. Retain the source exception.', 1;

-- Dataset: Run_Context (1)
SELECT @RunKey AS RunKey, CAST(N'Alteryx' AS nvarchar(30)) AS PlatformCode,
       @PlatformInstanceKey AS PlatformInstanceKey, @NativeScopeKey AS NativeScopeKey,
       @ObservedAt AS ObservedAt, @DirectoryTenantKey AS DirectoryTenantKey,
       CAST(N'1.1' AS nvarchar(30)) AS MappingVersion, @ScopeDescription AS ScopeDescription;

-- Dataset: Coverage (2). Partial is deliberate: source mapping has not been certified.
-- Counts describe emitted rows, including unresolved references. Zero is not proof
-- of complete collection. NotCollected datasets produce no placeholder data rows.
SELECT @RunKey AS RunKey, v.DatasetCode, v.CoverageStatus, v.RowCount
FROM (VALUES
 (N'Workspaces',N'Partial',(SELECT COUNT_BIG(*) FROM ar_source.Alteryx_Collections)),
 (N'Assets',N'Partial',(SELECT COUNT_BIG(*) FROM ar_source.Alteryx_AppInfos)),
 (N'Workspace_Assets',N'Partial',(SELECT COUNT_BIG(*) FROM ar_source.Alteryx_Collections c CROSS APPLY OPENJSON(c.AppsJson) j)),
 (N'Connections',N'NotCollected',CAST(NULL AS bigint)),
 (N'Asset_Connections',N'NotCollected',CAST(NULL AS bigint)),
 (N'Asset_Dependencies',N'NotCollected',CAST(NULL AS bigint)),
 (N'Platform_Users',N'Partial',(SELECT COUNT_BIG(*) FROM ar_source.Alteryx_Users)),
 (N'Directory_Users',N'NotCollected',CAST(NULL AS bigint)),
 (N'Object_Users',N'Partial',(SELECT COUNT_BIG(*) FROM ar_source.Alteryx_Collections)
   +(SELECT COUNT_BIG(*) FROM ar_source.Alteryx_Collections c CROSS APPLY OPENJSON(c.UsersJson) j)
   +2*(SELECT COUNT_BIG(*) FROM ar_source.Alteryx_AppInfos))
) v(DatasetCode,CoverageStatus,RowCount);

-- Dataset: Workspaces (3)
SELECT @RunKey AS RunKey, CAST(CollectionId AS nvarchar(200)) AS NativeWorkspaceID,
       CAST(N'Collection' AS nvarchar(50)) AS NativeWorkspaceType,
       CAST(Name AS nvarchar(200)) AS DisplayName, CAST(NULL AS nvarchar(40)) AS NativeLifecycleCode
FROM ar_source.Alteryx_Collections;

-- Dataset: Assets (4). ServiceId is a cross-reference, never the Gallery asset ID.
SELECT @RunKey AS RunKey, CAST(a.AppInfoId AS nvarchar(200)) AS NativeAssetID,
       CAST(N'Workflow' AS nvarchar(50)) AS NativeAssetType,
       CAST(JSON_VALUE(ap.value,'$.MetaInfo.Name') AS nvarchar(200)) AS DisplayName,
       CAST(JSON_VALUE(r.value,'$.RevisionId') AS nvarchar(100)) AS NativeVersionReference,
       CAST(CASE WHEN a.IsDeleted=1 THEN N'Deleted' WHEN a.IsDeleted=0 THEN N'Present' END AS nvarchar(40)) AS NativeLifecycleCode
FROM ar_source.Alteryx_AppInfos a
CROSS APPLY OPENJSON(a.RevisionsJson) r CROSS APPLY OPENJSON(r.value) p
CROSS APPLY OPENJSON(JSON_QUERY(r.value,'$.Applications')) ap CROSS APPLY OPENJSON(ap.value) flag
WHERE p.[key]=N'IsPublishedRevision' AND p.type=3 AND p.value=N'true'
  AND flag.[key]=N'IsPrimaryApp' AND flag.type=3 AND flag.value=N'true';

-- Dataset: Workspace_Assets (5). Left unresolved endpoints for staging validation.
SELECT @RunKey AS RunKey, CAST(c.CollectionId AS nvarchar(200)) AS NativeWorkspaceID,
       CAST(JSON_VALUE(j.value,'$.ApplicationId') AS nvarchar(200)) AS NativeAssetID,
       CAST(N'Workflow' AS nvarchar(50)) AS NativeAssetType,
       CAST(N'CollectionMembership' AS nvarchar(40)) AS NativeAssociationType
FROM ar_source.Alteryx_Collections c CROSS APPLY OPENJSON(c.AppsJson) j;

-- Dataset: Connections (6). Gallery/Service inventory alone does not prove these.
SELECT @RunKey AS RunKey, CAST(NULL AS nvarchar(200)) AS NativeConnectionID,
 CAST(NULL AS nvarchar(200)) AS DisplayName, CAST(NULL AS nvarchar(40)) AS TechnologyCode,
 CAST(NULL AS bit) AS HasExtract, CAST(NULL AS nvarchar(255)) AS ServerHostname,
 CAST(NULL AS nvarchar(200)) AS DatabaseName, CAST(NULL AS nvarchar(40)) AS AuthenticationTypeCode,
 CAST(NULL AS nvarchar(40)) AS IdentityClassificationCode, CAST(NULL AS nvarchar(30)) AS EvidenceStatusCode WHERE 1=0;
-- Dataset: Asset_Connections (7)
SELECT @RunKey AS RunKey, CAST(NULL AS nvarchar(200)) AS NativeAssetID,
 CAST(NULL AS nvarchar(50)) AS NativeAssetType, CAST(NULL AS nvarchar(200)) AS NativeConnectionID,
 CAST(NULL AS nvarchar(30)) AS EvidenceStatusCode WHERE 1=0;
-- Dataset: Asset_Dependencies (8)
SELECT @RunKey AS RunKey, CAST(NULL AS nvarchar(200)) AS NativeAssetID,
 CAST(NULL AS nvarchar(50)) AS NativeAssetType, CAST(NULL AS nvarchar(200)) AS UpstreamNativeAssetID,
 CAST(NULL AS nvarchar(50)) AS UpstreamNativeAssetType, CAST(NULL AS nvarchar(40)) AS RelationshipCode,
 CAST(NULL AS nvarchar(30)) AS EvidenceStatusCode WHERE 1=0;

-- Dataset: Platform_Users (9). Active is source status, not Entra AccountEnabled.
SELECT @RunKey AS RunKey, CAST(UserId AS nvarchar(200)) AS NativePrincipalID,
 CAST(N'AlteryxMongoUserID' AS nvarchar(60)) AS IdentifierNamespace,
 CAST(N'User' AS nvarchar(30)) AS PrincipalTypeCode,
 CAST(NULLIF(LTRIM(RTRIM(CONCAT(FirstName,N' ',LastName))),N'') AS nvarchar(200)) AS DisplayName,
 CAST(Email AS nvarchar(320)) AS SourceEmail,
 CAST(CASE WHEN Active=1 THEN N'true' WHEN Active=0 THEN N'false' END AS nvarchar(500)) AS SourceStatus
FROM ar_source.Alteryx_Users;
-- Dataset: Directory_Users (10). Obtain directory evidence in a separate run.
SELECT @RunKey AS RunKey, CAST(NULL AS nvarchar(200)) AS DirectoryObjectID,
 CAST(NULL AS nvarchar(200)) AS DisplayName, CAST(NULL AS nvarchar(320)) AS Mail,
 CAST(NULL AS bit) AS AccountEnabled WHERE 1=0;

-- Dataset: Object_Users (11). CreatedBy means original author, NOT current owner.
;WITH Roles AS (
 SELECT N'Collection' AS NativeObjectType, CollectionId AS NativeObjectID,
        N'TechnicalOwner' AS PrincipalRoleCode, NULLIF(OwnerId,N'') AS SourcePrincipalReference,
        CAST(0 AS bit) AS MappingUnverified
 FROM ar_source.Alteryx_Collections
 UNION ALL
 SELECT N'Collection',c.CollectionId,N'CollectionMember',p.value,CAST(0 AS bit)
 FROM ar_source.Alteryx_Collections c CROSS APPLY OPENJSON(c.UsersJson) j
 OUTER APPLY (SELECT q.value FROM OPENJSON(j.value) q WHERE q.[key]=N'UserId' AND q.type=1) p
 UNION ALL
 SELECT N'Workflow',AppInfoId,N'CreatedBy',NULLIF(CreatedBy,N''),CAST(0 AS bit)
 FROM ar_source.Alteryx_AppInfos
 UNION ALL
 SELECT N'Workflow',AppInfoId,N'TechnicalOwner',CAST(NULL AS nvarchar(max)),CAST(1 AS bit)
 FROM ar_source.Alteryx_AppInfos
)
SELECT @RunKey AS RunKey, CAST(r.NativeObjectType AS nvarchar(50)) AS NativeObjectType,
 CAST(r.NativeObjectID AS nvarchar(200)) AS NativeObjectID,
 CAST(r.PrincipalRoleCode AS nvarchar(40)) AS PrincipalRoleCode,
 CAST(NULLIF(r.SourcePrincipalReference,N'') AS nvarchar(200)) AS SourcePrincipalReference,
 CAST(CASE WHEN NULLIF(r.SourcePrincipalReference,N'') IS NOT NULL THEN N'AlteryxMongoUserID' END AS nvarchar(60)) AS SourceReferenceNamespace,
 CAST(u.UserId AS nvarchar(200)) AS NativePrincipalID,
 CAST(CASE WHEN u.UserId IS NOT NULL THEN N'AlteryxMongoUserID' END AS nvarchar(60)) AS IdentifierNamespace,
 CAST(NULL AS nvarchar(100)) AS NativeRole,
 CAST(CASE WHEN r.MappingUnverified=1 THEN N'UnverifiedMapping'
           WHEN NULLIF(r.SourcePrincipalReference,N'') IS NULL THEN N'MissingSourceReference'
           WHEN u.UserId IS NULL THEN N'UnresolvedUserReference'
           WHEN NULLIF(LTRIM(RTRIM(u.Email)),N'') IS NULL THEN N'MissingEmail'
           ELSE N'ReadyForEmailMatch' END AS nvarchar(40)) AS SourceReferenceStatusCode
FROM Roles r LEFT JOIN ar_source.Alteryx_Users u
 ON u.UserId COLLATE Latin1_General_100_BIN2=r.SourcePrincipalReference COLLATE Latin1_General_100_BIN2;

-- Supplemental diagnostic (12): keep separately; this is not a Registry sheet.
-- A Service username is not promoted to a Gallery user ID or workflow owner.
SELECT @RunKey AS RunKey, a.AppInfoId AS NativeAssetID, a.ServiceId AS SourceServiceReference,
 s.ServiceApplicationId AS MatchedServiceApplicationID,
 s.UserName AS ServiceUserReference, s.ModuleName AS ServiceModuleName,
 CASE WHEN NULLIF(a.ServiceId,N'') IS NULL THEN N'MissingServiceReference'
      WHEN s.ServiceApplicationId IS NULL THEN N'UnresolvedServiceReference'
      ELSE N'MatchedServiceReference' END AS ReferenceStatus
FROM ar_source.Alteryx_AppInfos a LEFT JOIN ar_source.Alteryx_ServiceApplications s
 ON s.ServiceApplicationId COLLATE Latin1_General_100_BIN2=a.ServiceId COLLATE Latin1_General_100_BIN2;
