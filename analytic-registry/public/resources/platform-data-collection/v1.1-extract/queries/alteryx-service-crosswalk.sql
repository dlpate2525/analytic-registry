/* Optional SQL Server query over the two projected supplemental MongoDB results.
   Inputs are JSON arrays from Gallery_Service_References and Service_Applications.
   They are NOT whole raw Gallery/Service database exports.
   No current workflow owner is inferred from the service username.
   Requires SQL Server compatibility level 130+. No persistent writes.
*/
SET NOCOUNT ON;
DECLARE @GalleryServiceReferencesJson nvarchar(max) = NULL;
DECLARE @ServiceApplicationsJson nvarchar(max) = NULL;
IF COALESCE(ISJSON(@GalleryServiceReferencesJson),0)<>1
 OR COALESCE(ISJSON(@ServiceApplicationsJson),0)<>1
 OR LEFT(LTRIM(@GalleryServiceReferencesJson),1)<>'['
 OR LEFT(LTRIM(@ServiceApplicationsJson),1)<>'['
 THROW 51100, 'Supply the two projected result arrays. Raw database exports have a different shape.', 1;
IF EXISTS(SELECT 1 FROM OPENJSON(@GalleryServiceReferencesJson) WHERE [type]<>5)
 OR EXISTS(SELECT 1 FROM OPENJSON(@ServiceApplicationsJson) WHERE [type]<>5)
 THROW 51101, 'Every projected source row must be a JSON object.', 1;

WITH GalleryReferences AS (
 SELECT RunKey,NativeAssetID,ServiceApplicationID,OriginalAuthorReference
 FROM OPENJSON(@GalleryServiceReferencesJson) WITH (
  RunKey nvarchar(36) '$.RunKey', NativeAssetID nvarchar(256) '$.NativeAssetID',
  ServiceApplicationID nvarchar(256) '$.ServiceApplicationID',
  OriginalAuthorReference nvarchar(256) '$.OriginalAuthorReference'
 )
), ServiceApplications AS (
 SELECT RunKey,ServiceApplicationID,ServiceUserReference,ServiceModuleName
 FROM OPENJSON(@ServiceApplicationsJson) WITH (
  RunKey nvarchar(36) '$.RunKey', ServiceApplicationID nvarchar(256) '$.ServiceApplicationID',
  ServiceUserReference nvarchar(1024) '$.ServiceUserReference',
  ServiceModuleName nvarchar(1024) '$.ServiceModuleName'
 )
)
SELECT g.RunKey,g.NativeAssetID,g.ServiceApplicationID,g.OriginalAuthorReference,
 CASE WHEN m.MatchCount=1 THEN m.ServiceUserReference END AS ServiceUserReference,
 CASE WHEN m.MatchCount=1 THEN m.ServiceModuleName END AS ServiceModuleName,
 m.MatchCount,
 CASE WHEN NULLIF(g.ServiceApplicationID,'') IS NULL THEN 'MissingSourceReference'
      WHEN m.MatchCount=1 THEN 'Observed'
      ELSE 'Unresolved' END AS ServiceLinkStatus,
 CAST(NULL AS nvarchar(256)) AS CurrentWorkflowOwnerID,
 'UnverifiedMapping' AS CurrentWorkflowOwnerStatus
FROM GalleryReferences g
OUTER APPLY (
 SELECT COUNT_BIG(*) AS MatchCount,
        MAX(s.ServiceUserReference) AS ServiceUserReference,
        MAX(s.ServiceModuleName) AS ServiceModuleName
 FROM ServiceApplications s
 WHERE s.RunKey=g.RunKey
   AND s.ServiceApplicationID COLLATE Latin1_General_100_BIN2
       =g.ServiceApplicationID COLLATE Latin1_General_100_BIN2
   AND NULLIF(g.ServiceApplicationID,'') IS NOT NULL
) m;
