/* READ ONLY. Run in the SQL Server database containing the exported Alteryx tables.
   This discovers physical names; it does not assume Gallery/Service are schemas.
   Share these metadata result sets, not passwords, tokens, or full source rows.
   SQL Server 2016+; main projection needs database compatibility level >= 130.
   See ../alteryx-sqlserver-mapping.md for the four input views and source limits. */
SET NOCOUNT ON;

SELECT DB_NAME() AS DatabaseName,
       CONVERT(nvarchar(128), SERVERPROPERTY('ProductVersion')) AS SqlServerVersion,
       compatibility_level AS CompatibilityLevel,
       snapshot_isolation_state_desc AS SnapshotIsolationState,
       is_read_committed_snapshot_on AS ReadCommittedSnapshotEnabled
FROM sys.databases WHERE database_id = DB_ID();

-- All user tables/views with likely Gallery or Service names. Metadata only.
SELECT s.name AS SchemaName, o.name AS ObjectName, o.type_desc AS ObjectType,
       c.column_id AS ColumnOrdinal, c.name AS ColumnName, t.name AS SqlType,
       c.max_length AS MaxLengthBytes, c.precision AS NumericPrecision,
       c.scale AS NumericScale, c.is_nullable AS IsNullable, c.collation_name AS CollationName
FROM sys.objects o
JOIN sys.schemas s ON s.schema_id = o.schema_id
JOIN sys.columns c ON c.object_id = o.object_id
JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE o.type IN ('U','V') AND o.is_ms_shipped = 0
  AND (LOWER(s.name) LIKE '%alteryx%' OR LOWER(o.name) LIKE '%alteryx%'
       OR LOWER(o.name) IN ('collections','appinfos','users','as_applications','versions'))
ORDER BY s.name, o.name, c.column_id;

-- The four names below are Registry adapter names, NOT vendor table names.
WITH Expected(ViewName, ColumnName) AS (
    SELECT * FROM (VALUES
      (N'Alteryx_Collections',N'CollectionId'),(N'Alteryx_Collections',N'Name'),
      (N'Alteryx_Collections',N'OwnerId'),(N'Alteryx_Collections',N'AppsJson'),
      (N'Alteryx_Collections',N'UsersJson'),
      (N'Alteryx_AppInfos',N'AppInfoId'),(N'Alteryx_AppInfos',N'CreatedBy'),
      (N'Alteryx_AppInfos',N'ServiceId'),(N'Alteryx_AppInfos',N'IsDeleted'),
      (N'Alteryx_AppInfos',N'RevisionsJson'),
      (N'Alteryx_Users',N'UserId'),(N'Alteryx_Users',N'FirstName'),
      (N'Alteryx_Users',N'LastName'),(N'Alteryx_Users',N'Email'),(N'Alteryx_Users',N'Active'),
      (N'Alteryx_ServiceApplications',N'ServiceApplicationId'),
      (N'Alteryx_ServiceApplications',N'UserName'),(N'Alteryx_ServiceApplications',N'ModuleName')
    ) v(ViewName,ColumnName)
)
SELECT N'ar_source' AS AdapterSchema, e.ViewName, e.ColumnName,
       CASE WHEN c.column_id IS NULL THEN N'Missing' ELSE N'Present' END AS AdapterStatus,
       t.name AS SqlType, c.max_length AS MaxLengthBytes
FROM Expected e
LEFT JOIN sys.schemas s ON s.name = N'ar_source'
LEFT JOIN sys.objects o ON o.schema_id = s.schema_id AND o.name = e.ViewName AND o.type IN ('V','U')
LEFT JOIN sys.columns c ON c.object_id = o.object_id AND c.name = e.ColumnName
LEFT JOIN sys.types t ON t.user_type_id = c.user_type_id
ORDER BY e.ViewName, e.ColumnName;

/* A SELECT cannot certify a consistent export. Confirm the source product build,
   Gallery schema 79, Service schema 8, source observation time and scope with the
   Platform Manager. AS_Versions.versionNumber is NOT the database schema version.
   Retain the original extract receipt and hashes outside the workbook. */
