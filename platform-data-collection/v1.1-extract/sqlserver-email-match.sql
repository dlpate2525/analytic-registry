-- Read-only proposed matches. Review duplicate/run validation results first.
-- Set both keys to accepted staged deliveries. No registry ownership updates occur.
DECLARE @PlatformRun uniqueidentifier = NULL;
DECLARE @DirectoryRun uniqueidentifier = NULL;
IF @PlatformRun IS NULL OR @DirectoryRun IS NULL THROW 50000,'Set platform and directory RunKey.',1;
;WITH directory AS (
 SELECT d.*,r.DirectoryTenantKey,LOWER(LTRIM(RTRIM(d.Mail))) COLLATE Latin1_General_100_BIN2 AS MatchMail
 FROM ar11_stage.Directory_Users d JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey
 WHERE d.RunKey=@DirectoryRun AND r.PlatformCode=N'Directory'
), coverage AS (
 SELECT CASE WHEN COUNT(*)=1 AND MIN(CoverageStatus)=N'Complete'
 AND MIN(RowCount)=(SELECT COUNT_BIG(*) FROM ar11_stage.Directory_Users WHERE RunKey=@DirectoryRun)
 THEN 1 ELSE 0 END AS Complete FROM ar11_stage.Coverage WHERE RunKey=@DirectoryRun AND DatasetCode=N'Directory_Users'
)
SELECT p.NativePrincipalID,p.IdentifierNamespace,p.SourceEmail,r.DirectoryTenantKey,
 CASE WHEN p.PrincipalTypeCode<>N'User' OR p.PrincipalTypeCode IS NULL THEN N'Non-person principal requires review'
 WHEN c.Complete<>1 THEN N'Directory evidence incomplete'
 WHEN NULLIF(LTRIM(RTRIM(r.DirectoryTenantKey)),N'') IS NULL OR NULLIF(LTRIM(RTRIM(p.SourceEmail)),N'') IS NULL THEN N'Missing email or tenant'
 WHEN m.IdentityCount=0 THEN N'No exact email match'
 WHEN m.EvidenceRows<>1 OR m.IdentityCount<>1 OR m.StateCount<>1 THEN N'Ambiguous directory evidence'
 WHEN m.Enabled=1 THEN N'Resolved enabled' WHEN m.Enabled=0 THEN N'Resolved disabled' ELSE N'Resolved status unknown' END AS Resolution,
 CASE WHEN p.PrincipalTypeCode=N'User' AND c.Complete=1 AND m.EvidenceRows=1 AND m.IdentityCount=1 AND m.StateCount=1 THEN m.DirectoryObjectID END AS CandidateDirectoryObjectID,
 CASE WHEN p.PrincipalTypeCode=N'User' AND c.Complete=1 AND m.EvidenceRows=1 AND m.IdentityCount=1 AND m.StateCount=1 AND m.Enabled=1 THEN N'None' ELSE N'Platform Manager' END AS RouteTo
FROM ar11_stage.Platform_Users p JOIN ar11_stage.Run_Context r ON r.RunKey=p.RunKey CROSS JOIN coverage c
OUTER APPLY (
 SELECT COUNT_BIG(*) EvidenceRows, COUNT(DISTINCT d.DirectoryObjectID) IdentityCount,
 COUNT(DISTINCT COALESCE(CONVERT(int,d.AccountEnabled),-1)) StateCount,
 MIN(CONVERT(int,d.AccountEnabled)) Enabled, MIN(d.DirectoryObjectID) DirectoryObjectID
 FROM directory d WHERE d.DirectoryTenantKey=r.DirectoryTenantKey
 AND d.MatchMail=LOWER(LTRIM(RTRIM(p.SourceEmail))) COLLATE Latin1_General_100_BIN2
) m WHERE p.RunKey=@PlatformRun;
