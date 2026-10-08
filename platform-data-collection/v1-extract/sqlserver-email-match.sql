-- Read-only V1 reconciliation, apart from temporary result tables in tempdb.
-- Select the database containing RegistryExtractV1 staging tables first.
-- Set these existing delivery keys. Keep the existing manifest unchanged.
SET NOCOUNT ON;
DECLARE @PlatformRunKey uniqueidentifier = NULL;
DECLARE @DirectoryRunKey uniqueidentifier = NULL;
DECLARE @DirectoryExtractComplete bit = 0; -- 1 only after all directory pages and counts pass.
IF @PlatformRunKey IS NULL OR @DirectoryRunKey IS NULL
  THROW 50001, 'Set the platform and directory delivery keys before running.', 1;

IF OBJECT_ID('tempdb..#EmailResolution') IS NOT NULL DROP TABLE #EmailResolution;
IF OBJECT_ID('tempdb..#ObjectResolution') IS NOT NULL DROP TABLE #ObjectResolution;

;WITH SourceUsers AS (
 SELECT p.*,
  NULLIF(LOWER(LTRIM(RTRIM(p.SourceEmail))),N'') COLLATE Latin1_General_100_BIN2 AS EmailJoinKey,
  COUNT(*) OVER (PARTITION BY RunKey,PlatformCode,PlatformInstanceKey,NativeScopeKey,
    IdentifierNamespace,NativePrincipalID) AS SourceKeyCount
 FROM RegistryExtractV1.Platform_Users p WHERE RunKey=@PlatformRunKey
), DirectoryUsers AS (
 SELECT d.*,
  NULLIF(LOWER(LTRIM(RTRIM(d.Mail))),N'') COLLATE Latin1_General_100_BIN2 AS EmailJoinKey,
  COUNT(*) OVER (PARTITION BY RunKey,DirectoryTenantKey,DirectoryObjectID) AS DirectoryKeyCount
 FROM RegistryExtractV1.Directory_Users d WHERE RunKey=@DirectoryRunKey
), Evidence AS (
 SELECT p.*,m.MatchRowCount,m.MatchUserCount,m.CandidateID,m.CandidateEnabled,m.DirectoryKeyCount,
  CASE
   WHEN ISNULL(@DirectoryExtractComplete,0)<>1 THEN N'Directory extract incomplete or unconfirmed'
   WHEN NULLIF(LTRIM(RTRIM(p.PlatformCode)),N'') IS NULL
     OR NULLIF(LTRIM(RTRIM(p.PlatformInstanceKey)),N'') IS NULL
     OR NULLIF(LTRIM(RTRIM(p.NativeScopeKey)),N'') IS NULL
     OR NULLIF(LTRIM(RTRIM(p.NativePrincipalID)),N'') IS NULL
     OR NULLIF(LTRIM(RTRIM(p.IdentifierNamespace)),N'') IS NULL
     OR NULLIF(LTRIM(RTRIM(p.DirectoryTenantKey)),N'') IS NULL
     THEN N'Missing source identity or directory scope'
   WHEN p.SourceKeyCount<>1 THEN N'Duplicate platform principal key'
   WHEN DATALENGTH(p.NativePrincipalID)<>DATALENGTH(LTRIM(RTRIM(p.NativePrincipalID)))
     OR DATALENGTH(p.NativeScopeKey)<>DATALENGTH(LTRIM(RTRIM(p.NativeScopeKey)))
     OR DATALENGTH(p.PlatformInstanceKey)<>DATALENGTH(LTRIM(RTRIM(p.PlatformInstanceKey)))
     OR DATALENGTH(p.IdentifierNamespace)<>DATALENGTH(LTRIM(RTRIM(p.IdentifierNamespace)))
     OR DATALENGTH(p.PlatformCode)<>DATALENGTH(LTRIM(RTRIM(p.PlatformCode)))
     OR DATALENGTH(p.DirectoryTenantKey)<>DATALENGTH(LTRIM(RTRIM(p.DirectoryTenantKey)))
     THEN N'Boundary whitespace in source identity key'
   WHEN ISNULL(p.PrincipalTypeCode,N'Unknown')<>N'User' THEN N'Principal is not a verified person'
   WHEN p.ObservedAt IS NULL THEN N'Missing platform observation time'
   WHEN p.EmailJoinKey IS NULL THEN N'Missing platform email'
   WHEN p.EmailJoinKey NOT LIKE N'%_@_%' OR p.EmailJoinKey LIKE N'%@%@%'
     OR p.EmailJoinKey LIKE N'% %' OR CHARINDEX(CHAR(9),p.EmailJoinKey)>0
     OR CHARINDEX(CHAR(10),p.EmailJoinKey)>0 OR CHARINDEX(CHAR(13),p.EmailJoinKey)>0
     THEN N'Invalid platform email format'
   WHEN m.MatchUserCount=0 THEN N'No directory email match'
   WHEN m.MatchUserCount<>1 THEN N'Ambiguous directory email match'
   WHEN m.MatchRowCount<>1 OR m.DirectoryKeyCount<>1 THEN N'Duplicate directory user evidence'
   WHEN m.BadDirectoryKeys>0 THEN N'Boundary whitespace in directory identity key'
   WHEN NULLIF(LTRIM(RTRIM(m.CandidateID)),N'') IS NULL THEN N'Missing directory object ID'
   WHEN m.MissingObservedAt>0 THEN N'Missing directory observation time'
   WHEN p.IdentifierNamespace=N'PowerBIGraphID' AND LOWER(p.NativePrincipalID)<>LOWER(m.CandidateID)
     THEN N'Native Graph ID conflicts with email match'
   WHEN NULLIF(LTRIM(RTRIM(p.SourceDirectoryObjectID)),N'') IS NOT NULL
     AND LOWER(p.SourceDirectoryObjectID)<>LOWER(m.CandidateID) THEN N'Source directory ID conflicts with email match'
   ELSE NULL
  END AS IdentityIssue
 FROM SourceUsers p
 OUTER APPLY (
  SELECT COUNT(*) AS MatchRowCount,COUNT(DISTINCT d.DirectoryObjectID) AS MatchUserCount,
   MIN(d.DirectoryObjectID) AS CandidateID,MIN(CONVERT(int,d.AccountEnabled)) AS CandidateEnabled,
   MAX(d.DirectoryKeyCount) AS DirectoryKeyCount,
   SUM(CASE WHEN d.ObservedAt IS NULL THEN 1 ELSE 0 END) AS MissingObservedAt,
   SUM(CASE WHEN DATALENGTH(d.DirectoryObjectID)<>DATALENGTH(LTRIM(RTRIM(d.DirectoryObjectID)))
     OR DATALENGTH(d.DirectoryTenantKey)<>DATALENGTH(LTRIM(RTRIM(d.DirectoryTenantKey)))
     THEN 1 ELSE 0 END) AS BadDirectoryKeys
  FROM DirectoryUsers d
  WHERE d.DirectoryTenantKey=p.DirectoryTenantKey AND d.EmailJoinKey=p.EmailJoinKey
 ) m
)
SELECT StageRowID,RunKey,PlatformCode,PlatformInstanceKey,NativeScopeKey,
 NativePrincipalID,IdentifierNamespace,PrincipalTypeCode,DisplayName,SourceEmail,EmailJoinKey,
 SourceStatus,DirectoryTenantKey,SourceDirectoryObjectID,ObservedAt,
 MatchUserCount,
 CASE WHEN IdentityIssue IS NULL THEN CandidateID END AS MatchedDirectoryObjectID,
 CASE WHEN IdentityIssue IS NULL THEN N'Resolved' ELSE N'Unresolved' END AS ResolutionStatus,
 CASE WHEN IdentityIssue IS NOT NULL THEN N'Unknown'
      WHEN CandidateEnabled=1 THEN N'Enabled'
      WHEN CandidateEnabled=0 THEN N'Disabled' ELSE N'Unknown' END AS DirectoryAccountState,
 CASE WHEN IdentityIssue IS NOT NULL OR ISNULL(CandidateEnabled,-1)<>1 THEN N'Platform Manager' END AS ReviewOwner,
 CASE WHEN IdentityIssue IS NOT NULL THEN IdentityIssue
      WHEN CandidateEnabled=0 THEN N'Directory account disabled; review affected roles'
      WHEN CandidateEnabled IS NULL THEN N'Directory account state unknown' END AS ReviewReason
INTO #EmailResolution
FROM Evidence;

SELECT * FROM #EmailResolution ORDER BY PlatformCode,PlatformInstanceKey,NativePrincipalID;

-- Preserve every object relationship, including missing source references.
SELECT o.StageRowID,o.RunKey,o.PlatformCode,o.PlatformInstanceKey,o.NativeScopeKey,
 o.NativeObjectType,o.NativeObjectID,o.ObjectDisplayName,o.PrincipalRoleCode,
 o.SourcePrincipalReference,o.SourceReferenceNamespace,o.NativePrincipalID,o.IdentifierNamespace,
 o.NativeRole,o.SourceEmail,o.SourceReferenceStatusCode,
 CASE WHEN issue.Reason IS NULL THEN p.MatchedDirectoryObjectID END AS MatchedDirectoryObjectID,
 CASE WHEN issue.Reason IS NULL THEN N'Resolved' ELSE N'Unresolved' END AS ResolutionStatus,
 CASE WHEN issue.Reason IS NULL THEN p.DirectoryAccountState ELSE N'Unknown' END AS DirectoryAccountState,
 CASE WHEN issue.Reason IS NOT NULL OR p.ReviewOwner IS NOT NULL THEN N'Platform Manager' END AS ReviewOwner,
 COALESCE(issue.Reason,p.ReviewReason) AS ReviewReason
INTO #ObjectResolution
FROM RegistryExtractV1.Object_Users o
OUTER APPLY (
 SELECT COUNT(*) AS PrincipalCount,
  MIN(p.MatchedDirectoryObjectID) AS MatchedDirectoryObjectID,
  MIN(p.ResolutionStatus) AS ResolutionStatus,MIN(p.DirectoryAccountState) AS DirectoryAccountState,
  MIN(p.ReviewOwner) AS ReviewOwner,MIN(p.ReviewReason) AS ReviewReason,MIN(p.EmailJoinKey) AS EmailJoinKey
 FROM #EmailResolution p
 WHERE p.RunKey=o.RunKey AND p.PlatformCode=o.PlatformCode
  AND p.PlatformInstanceKey=o.PlatformInstanceKey AND p.NativeScopeKey=o.NativeScopeKey
  AND p.NativePrincipalID=o.NativePrincipalID AND p.IdentifierNamespace=o.IdentifierNamespace
) p
CROSS APPLY (SELECT CASE
 WHEN NULLIF(LTRIM(RTRIM(o.NativeObjectID)),N'') IS NULL
   OR NULLIF(LTRIM(RTRIM(o.NativeObjectType)),N'') IS NULL THEN N'Missing object identity'
 WHEN o.ObservedAt IS NULL THEN N'Missing object observation time'
 WHEN DATALENGTH(o.NativeObjectID)<>DATALENGTH(LTRIM(RTRIM(o.NativeObjectID)))
   OR DATALENGTH(o.NativePrincipalID)<>DATALENGTH(LTRIM(RTRIM(o.NativePrincipalID)))
   OR DATALENGTH(o.IdentifierNamespace)<>DATALENGTH(LTRIM(RTRIM(o.IdentifierNamespace)))
   OR DATALENGTH(o.NativeScopeKey)<>DATALENGTH(LTRIM(RTRIM(o.NativeScopeKey)))
   OR DATALENGTH(o.PlatformInstanceKey)<>DATALENGTH(LTRIM(RTRIM(o.PlatformInstanceKey)))
   OR DATALENGTH(o.PlatformCode)<>DATALENGTH(LTRIM(RTRIM(o.PlatformCode)))
   OR DATALENGTH(o.NativeObjectType)<>DATALENGTH(LTRIM(RTRIM(o.NativeObjectType)))
   THEN N'Boundary whitespace in object identity key'
 WHEN ISNULL(o.PrincipalRoleCode,N'') NOT IN (N'TechnicalOwner',N'CreatedBy',N'ModifiedBy',N'Access')
   THEN N'Missing or unsupported principal role'
 WHEN NOT EXISTS (
  SELECT 1 FROM RegistryExtractV1.Assets a
  WHERE a.RunKey=o.RunKey AND a.PlatformCode=o.PlatformCode AND a.PlatformInstanceKey=o.PlatformInstanceKey
    AND a.NativeScopeKey=o.NativeScopeKey AND a.NativeAssetID=o.NativeObjectID AND a.NativeAssetType=o.NativeObjectType
  UNION ALL
  SELECT 1 FROM RegistryExtractV1.Workspaces w
  WHERE w.RunKey=o.RunKey AND w.PlatformCode=o.PlatformCode AND w.PlatformInstanceKey=o.PlatformInstanceKey
    AND w.NativeScopeKey=o.NativeScopeKey AND w.NativeWorkspaceID=o.NativeObjectID AND w.NativeWorkspaceType=o.NativeObjectType
 ) THEN N'Object is missing from the staged inventory'
 WHEN ISNULL(o.SourceReferenceStatusCode,N'Unknown')<>N'ReadyForEmailMatch'
   THEN N'Source reference unresolved or mapping unverified'
 WHEN NULLIF(LTRIM(RTRIM(o.SourcePrincipalReference)),N'') IS NULL
   OR NULLIF(LTRIM(RTRIM(o.SourceReferenceNamespace)),N'') IS NULL THEN N'Missing original source principal reference'
 WHEN p.PrincipalCount=0 THEN N'No scoped platform principal'
 WHEN p.PrincipalCount<>1 THEN N'Duplicate scoped platform principal'
 WHEN p.ResolutionStatus<>N'Resolved' THEN p.ReviewReason
 WHEN NULLIF(LOWER(LTRIM(RTRIM(o.SourceEmail))),N'') IS NOT NULL
  AND LOWER(LTRIM(RTRIM(o.SourceEmail))) COLLATE Latin1_General_100_BIN2<>p.EmailJoinKey
   THEN N'Object email conflicts with platform principal'
 ELSE NULL END AS Reason) issue
WHERE o.RunKey=@PlatformRunKey;

SELECT * FROM #ObjectResolution ORDER BY PlatformCode,NativeObjectType,NativeObjectID,PrincipalRoleCode;

-- All follow-up uses one owner. Disabled accounts are matched people with a role-review issue.
SELECT N'Principal' AS RecordType,StageRowID,PlatformCode,NativeScopeKey,
 NativePrincipalID AS NativeRecordID,ResolutionStatus,DirectoryAccountState,ReviewOwner,ReviewReason
FROM #EmailResolution WHERE ReviewOwner IS NOT NULL
UNION ALL
SELECT N'Object relationship',StageRowID,PlatformCode,NativeScopeKey,
 NativeObjectID,ResolutionStatus,DirectoryAccountState,ReviewOwner,ReviewReason
FROM #ObjectResolution WHERE ReviewOwner IS NOT NULL;

-- Results are candidate bindings only. Compare an existing registry binding before applying.
-- A changed directory object ID for a previously bound source principal requires Platform Manager review.
-- Do not overwrite declared business owners or grant permissions from these results.
