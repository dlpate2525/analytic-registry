-- Analytic Registry V1.1 / PostgreSQL psql source export. Read-only.
-- Source fields: https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm
-- Required variables: run_key, instance_key, site_luid, observed_at,
-- directory_tenant_key, scope_description, workbook_content_type,
-- datasource_content_type, workbook_owner_type, datasource_owner_type.
-- Validate with ../../tableau/preflight.sql and the checks described in
-- ../../v1-extract/tableau-identity-extract.md (paths relative to this file).
-- Confirm exact type tokens from source rows. Output directory must be new.
-- Each file uses the V1.1 workbook's exact header order.
-- Field names/types are dictionary-verified; this has not run on your server.
-- Partial coverage is deliberate until deployment and reference checks pass.
\set ON_ERROR_STOP on
\set QUIET on
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '120s';
SET LOCAL TIME ZONE 'UTC';
SELECT count(*)=1 AS site_ok FROM public.sites WHERE luid=:'site_luid'::uuid \gset
\if :site_ok
\else
SELECT 1/0 AS invalid_site;
\endif
SELECT :'run_key'::uuid, :'observed_at'::timestamptz;
\o run_context.csv
COPY (
SELECT :'run_key'::uuid::text AS "RunKey", 'Tableau'::text AS "PlatformCode",
       :'instance_key'::text AS "PlatformInstanceKey", :'site_luid'::uuid::text AS "NativeScopeKey",
       to_char(:'observed_at'::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "ObservedAt",
       :'directory_tenant_key'::text AS "DirectoryTenantKey", '1.1'::text AS "MappingVersion",
       :'scope_description'::text AS "ScopeDescription"
) TO STDOUT WITH (FORMAT CSV,HEADER TRUE,ENCODING 'UTF8');
\o
\o workspaces.csv
COPY (
SELECT :'run_key'::text AS "RunKey",
       x.luid::text AS "NativeWorkspaceID",
       'Project'::text AS "NativeWorkspaceType",
       x.name AS "DisplayName",
       x.state AS "NativeLifecycleCode"
FROM public.projects x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o assets.csv
COPY (
SELECT :'run_key'::text AS "RunKey",
       x.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       x.name AS "DisplayName",
       x.revision AS "NativeVersionReference",
       x.state AS "NativeLifecycleCode"
FROM public.workbooks x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
UNION ALL
SELECT :'run_key'::text AS "RunKey",
       x.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       x.name AS "DisplayName",
       x.revision AS "NativeVersionReference",
       x.state AS "NativeLifecycleCode"
FROM public.datasources x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid AND x.parent_workbook_id IS NULL
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o workspace_assets.csv
COPY (
SELECT :'run_key'::text AS "RunKey",
       p.luid::text AS "NativeWorkspaceID",
       x.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       'ProjectContent'::text AS "NativeAssociationType"
FROM public.workbooks x
JOIN public.projects_contents pc ON pc.site_id=x.site_id AND pc.content_id=x.id AND pc.content_type=:'workbook_content_type'
JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
UNION ALL
SELECT :'run_key'::text AS "RunKey",
       p.luid::text AS "NativeWorkspaceID",
       x.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       'ProjectContent'::text AS "NativeAssociationType"
FROM public.datasources x
JOIN public.projects_contents pc ON pc.site_id=x.site_id AND pc.content_id=x.id AND pc.content_type=:'datasource_content_type' AND x.parent_workbook_id IS NULL
JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o connections.csv
COPY (
SELECT :'run_key'::text AS "RunKey",
       x.luid::text AS "NativeConnectionID",
       coalesce(nullif(x.caption,''),nullif(x.name,''),x.luid::text) AS "DisplayName",
       CASE lower(x.dbclass) WHEN 'sqlserver' THEN 'SQL Server' WHEN 'oracle' THEN 'Oracle' WHEN 'dataengine' THEN 'Extract' WHEN 'hyper' THEN 'Extract' ELSE coalesce(nullif(x.dbclass,''),'Undefined') END AS "TechnologyCode",
       x.has_extract::text AS "HasExtract",
       CASE WHEN x.server !~ '[/?@#=;[:space:]]' THEN x.server END AS "ServerHostname",
       x.dbname AS "DatabaseName",
       x.authentication AS "AuthenticationTypeCode",
       'Unknown'::text AS "IdentityClassificationCode",
       'Partial'::text AS "EvidenceStatusCode"
FROM public.data_connections x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o asset_connections.csv
COPY (
SELECT :'run_key'::text AS "RunKey",
       a.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       x.luid::text AS "NativeConnectionID",
       'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x
JOIN public.workbooks a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type=:'workbook_owner_type'
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
UNION ALL
SELECT :'run_key'::text AS "RunKey",
       a.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       x.luid::text AS "NativeConnectionID",
       'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x
JOIN public.datasources a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type=:'datasource_owner_type' AND a.parent_workbook_id IS NULL
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o platform_users.csv
COPY (
 SELECT :'run_key'::uuid::text AS "RunKey",
       u.luid::text AS "NativePrincipalID",
       'TableauUserLUID'::text AS "IdentifierNamespace",
       'User'::text AS "PrincipalTypeCode",
       NULLIF(su.friendly_name,'') AS "DisplayName",
       su.email AS "SourceEmail",
       'TableauSiteRole=' || coalesce(sr.name,u.site_role_id::text,'Unknown') AS "SourceStatus"
FROM public.users u
 JOIN public.sites s ON s.id=u.site_id
 LEFT JOIN public.system_users su ON su.id=u.system_user_id
 LEFT JOIN public.site_roles sr ON sr.id=u.site_role_id
 WHERE s.luid=:'site_luid'::uuid
 ORDER BY u.id
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o object_users.csv
COPY (
 WITH object_roles AS (
  SELECT p.site_id,'Project'::text AS object_type,p.luid AS object_luid,
         p.name AS object_name,'TechnicalOwner'::text AS principal_role,p.owner_id AS repository_user_id
  FROM public.projects p
  UNION ALL
  SELECT w.site_id,'Workbook',w.luid,w.name,'TechnicalOwner',w.owner_id
  FROM public.workbooks w
  UNION ALL
  SELECT w.site_id,'Workbook',w.luid,w.name,'ModifiedBy',w.modified_by_user_id
  FROM public.workbooks w
  UNION ALL
  SELECT d.site_id,'PublishedDatasource',d.luid,d.name,'TechnicalOwner',d.owner_id
  FROM public.datasources d WHERE d.parent_workbook_id IS NULL
  UNION ALL
  SELECT d.site_id,'PublishedDatasource',d.luid,d.name,'ModifiedBy',d.modified_by_user_id
  FROM public.datasources d WHERE d.parent_workbook_id IS NULL
 )
 SELECT :'run_key'::uuid::text AS "RunKey",
       r.object_type AS "NativeObjectType",
       r.object_luid::text AS "NativeObjectID",
       r.principal_role AS "PrincipalRoleCode",
       r.repository_user_id::text AS "SourcePrincipalReference",
       CASE WHEN r.repository_user_id IS NOT NULL THEN 'TableauRepositoryUserID'::text END AS "SourceReferenceNamespace",
       u.luid::text AS "NativePrincipalID",
       CASE WHEN u.luid IS NOT NULL THEN 'TableauUserLUID'::text END AS "IdentifierNamespace",
       NULL::text AS "NativeRole",
       CASE
         WHEN r.repository_user_id IS NULL THEN 'MissingSourceReference'
         WHEN u.id IS NULL THEN 'UnresolvedUserReference'
         WHEN u.luid IS NULL THEN 'UnverifiedMapping'
         WHEN NULLIF(btrim(su.email),'') IS NULL THEN 'MissingEmail'
         ELSE 'ReadyForEmailMatch'
        END AS "SourceReferenceStatusCode"
FROM object_roles r
 JOIN public.sites s ON s.id=r.site_id
 LEFT JOIN public.users u ON u.id=r.repository_user_id AND u.site_id=r.site_id
 LEFT JOIN public.system_users su ON su.id=u.system_user_id
 WHERE s.luid=:'site_luid'::uuid
 ORDER BY r.object_type,r.object_luid,r.principal_role
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

-- No verified repository lineage query or directory collector is asserted here.
\o asset_dependencies.csv
COPY (
SELECT NULL::text AS "RunKey", NULL::text AS "NativeAssetID",
       NULL::text AS "NativeAssetType", NULL::text AS "UpstreamNativeAssetID",
       NULL::text AS "UpstreamNativeAssetType", NULL::text AS "RelationshipCode",
       NULL::text AS "EvidenceStatusCode" WHERE false
) TO STDOUT WITH (FORMAT CSV,HEADER TRUE,ENCODING 'UTF8');
\o
\o directory_users.csv
COPY (
SELECT NULL::text AS "RunKey", NULL::text AS "DirectoryObjectID",
       NULL::text AS "DisplayName", NULL::text AS "Mail", NULL::boolean AS "AccountEnabled" WHERE false
) TO STDOUT WITH (FORMAT CSV,HEADER TRUE,ENCODING 'UTF8');
\o
\o coverage.csv
COPY (
SELECT :'run_key'::uuid::text AS "RunKey", 'Workspaces'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
SELECT :'run_key'::text AS "RunKey",
       x.luid::text AS "NativeWorkspaceID",
       'Project'::text AS "NativeWorkspaceType",
       x.name AS "DisplayName",
       x.state AS "NativeLifecycleCode"
FROM public.projects x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) source_rows
UNION ALL
SELECT :'run_key'::uuid::text AS "RunKey", 'Assets'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
SELECT :'run_key'::text AS "RunKey",
       x.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       x.name AS "DisplayName",
       x.revision AS "NativeVersionReference",
       x.state AS "NativeLifecycleCode"
FROM public.workbooks x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
UNION ALL
SELECT :'run_key'::text AS "RunKey",
       x.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       x.name AS "DisplayName",
       x.revision AS "NativeVersionReference",
       x.state AS "NativeLifecycleCode"
FROM public.datasources x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid AND x.parent_workbook_id IS NULL
) source_rows
UNION ALL
SELECT :'run_key'::uuid::text AS "RunKey", 'Workspace_Assets'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
SELECT :'run_key'::text AS "RunKey",
       p.luid::text AS "NativeWorkspaceID",
       x.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       'ProjectContent'::text AS "NativeAssociationType"
FROM public.workbooks x
JOIN public.projects_contents pc ON pc.site_id=x.site_id AND pc.content_id=x.id AND pc.content_type=:'workbook_content_type'
JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
UNION ALL
SELECT :'run_key'::text AS "RunKey",
       p.luid::text AS "NativeWorkspaceID",
       x.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       'ProjectContent'::text AS "NativeAssociationType"
FROM public.datasources x
JOIN public.projects_contents pc ON pc.site_id=x.site_id AND pc.content_id=x.id AND pc.content_type=:'datasource_content_type' AND x.parent_workbook_id IS NULL
JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) source_rows
UNION ALL
SELECT :'run_key'::uuid::text AS "RunKey", 'Connections'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
SELECT :'run_key'::text AS "RunKey",
       x.luid::text AS "NativeConnectionID",
       coalesce(nullif(x.caption,''),nullif(x.name,''),x.luid::text) AS "DisplayName",
       CASE lower(x.dbclass) WHEN 'sqlserver' THEN 'SQL Server' WHEN 'oracle' THEN 'Oracle' WHEN 'dataengine' THEN 'Extract' WHEN 'hyper' THEN 'Extract' ELSE coalesce(nullif(x.dbclass,''),'Undefined') END AS "TechnologyCode",
       x.has_extract::text AS "HasExtract",
       CASE WHEN x.server !~ '[/?@#=;[:space:]]' THEN x.server END AS "ServerHostname",
       x.dbname AS "DatabaseName",
       x.authentication AS "AuthenticationTypeCode",
       'Unknown'::text AS "IdentityClassificationCode",
       'Partial'::text AS "EvidenceStatusCode"
FROM public.data_connections x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) source_rows
UNION ALL
SELECT :'run_key'::uuid::text AS "RunKey", 'Asset_Connections'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
SELECT :'run_key'::text AS "RunKey",
       a.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       x.luid::text AS "NativeConnectionID",
       'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x
JOIN public.workbooks a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type=:'workbook_owner_type'
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
UNION ALL
SELECT :'run_key'::text AS "RunKey",
       a.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       x.luid::text AS "NativeConnectionID",
       'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x
JOIN public.datasources a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type=:'datasource_owner_type' AND a.parent_workbook_id IS NULL
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) source_rows
UNION ALL
SELECT :'run_key'::uuid::text AS "RunKey", 'Platform_Users'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
 SELECT :'run_key'::uuid::text AS "RunKey",
       u.luid::text AS "NativePrincipalID",
       'TableauUserLUID'::text AS "IdentifierNamespace",
       'User'::text AS "PrincipalTypeCode",
       NULLIF(su.friendly_name,'') AS "DisplayName",
       su.email AS "SourceEmail",
       'TableauSiteRole=' || coalesce(sr.name,u.site_role_id::text,'Unknown') AS "SourceStatus"
FROM public.users u
 JOIN public.sites s ON s.id=u.site_id
 LEFT JOIN public.system_users su ON su.id=u.system_user_id
 LEFT JOIN public.site_roles sr ON sr.id=u.site_role_id
 WHERE s.luid=:'site_luid'::uuid
 ORDER BY u.id
) source_rows
UNION ALL
SELECT :'run_key'::uuid::text AS "RunKey", 'Object_Users'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
 WITH object_roles AS (
  SELECT p.site_id,'Project'::text AS object_type,p.luid AS object_luid,
         p.name AS object_name,'TechnicalOwner'::text AS principal_role,p.owner_id AS repository_user_id
  FROM public.projects p
  UNION ALL
  SELECT w.site_id,'Workbook',w.luid,w.name,'TechnicalOwner',w.owner_id
  FROM public.workbooks w
  UNION ALL
  SELECT w.site_id,'Workbook',w.luid,w.name,'ModifiedBy',w.modified_by_user_id
  FROM public.workbooks w
  UNION ALL
  SELECT d.site_id,'PublishedDatasource',d.luid,d.name,'TechnicalOwner',d.owner_id
  FROM public.datasources d WHERE d.parent_workbook_id IS NULL
  UNION ALL
  SELECT d.site_id,'PublishedDatasource',d.luid,d.name,'ModifiedBy',d.modified_by_user_id
  FROM public.datasources d WHERE d.parent_workbook_id IS NULL
 )
 SELECT :'run_key'::uuid::text AS "RunKey",
       r.object_type AS "NativeObjectType",
       r.object_luid::text AS "NativeObjectID",
       r.principal_role AS "PrincipalRoleCode",
       r.repository_user_id::text AS "SourcePrincipalReference",
       CASE WHEN r.repository_user_id IS NOT NULL THEN 'TableauRepositoryUserID'::text END AS "SourceReferenceNamespace",
       u.luid::text AS "NativePrincipalID",
       CASE WHEN u.luid IS NOT NULL THEN 'TableauUserLUID'::text END AS "IdentifierNamespace",
       NULL::text AS "NativeRole",
       CASE
         WHEN r.repository_user_id IS NULL THEN 'MissingSourceReference'
         WHEN u.id IS NULL THEN 'UnresolvedUserReference'
         WHEN u.luid IS NULL THEN 'UnverifiedMapping'
         WHEN NULLIF(btrim(su.email),'') IS NULL THEN 'MissingEmail'
         ELSE 'ReadyForEmailMatch'
        END AS "SourceReferenceStatusCode"
FROM object_roles r
 JOIN public.sites s ON s.id=r.site_id
 LEFT JOIN public.users u ON u.id=r.repository_user_id AND u.site_id=r.site_id
 LEFT JOIN public.system_users su ON su.id=u.system_user_id
 WHERE s.luid=:'site_luid'::uuid
 ORDER BY r.object_type,r.object_luid,r.principal_role
) source_rows
UNION ALL
SELECT :'run_key'::uuid::text, 'Asset_Dependencies'::text, 'NotCollected'::text, NULL::bigint
UNION ALL
SELECT :'run_key'::uuid::text, 'Directory_Users'::text, 'NotCollected'::text, NULL::bigint
) TO STDOUT WITH (FORMAT CSV,HEADER TRUE,ENCODING 'UTF8');
\o
-- Supplemental exceptions are retained even when an inner join cannot produce
-- a valid workbook relationship. They are not a twelfth input table.
\o tableau_relationship_exceptions.csv
COPY (
SELECT 'Workspace_Assets'::text AS "DatasetCode", pc.content_id::text AS "SourceReference",
       pc.content_type::text AS "SourceType", pc.project_id::text AS "RelatedReference",
       'Missing project or workbook endpoint'::text AS "Issue", 'Platform Manager'::text AS "AssignedToRole"
FROM public.projects_contents pc
JOIN public.sites s ON s.id=pc.site_id
LEFT JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
LEFT JOIN public.workbooks w ON w.site_id=pc.site_id AND w.id=pc.content_id
WHERE s.luid=:'site_luid'::uuid AND pc.content_type=:'workbook_content_type'
  AND (p.id IS NULL OR w.id IS NULL)
UNION ALL
SELECT 'Workspace_Assets', pc.content_id::text, pc.content_type::text, pc.project_id::text,
       'Missing project or published datasource endpoint', 'Platform Manager'
FROM public.projects_contents pc
JOIN public.sites s ON s.id=pc.site_id
LEFT JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
LEFT JOIN public.datasources d ON d.site_id=pc.site_id AND d.id=pc.content_id AND d.parent_workbook_id IS NULL
WHERE s.luid=:'site_luid'::uuid AND pc.content_type=:'datasource_content_type'
  AND (p.id IS NULL OR d.id IS NULL)
UNION ALL
SELECT 'Asset_Connections', c.luid::text, c.owner_type::text, c.owner_id::text,
       'Connection owner is unresolved or outside the workbook/published-source profile', 'Platform Manager'
FROM public.data_connections c
JOIN public.sites s ON s.id=c.site_id
LEFT JOIN public.workbooks w ON w.site_id=c.site_id AND w.id=c.owner_id AND c.owner_type=:'workbook_owner_type'
LEFT JOIN public.datasources d ON d.site_id=c.site_id AND d.id=c.owner_id AND c.owner_type=:'datasource_owner_type'
  AND d.parent_workbook_id IS NULL
WHERE s.luid=:'site_luid'::uuid AND w.id IS NULL AND d.id IS NULL
UNION ALL
SELECT 'Connections', c.luid::text, 'ServerHostname', NULL::text,
       'Host omitted because the source value contains URI, credential, or whitespace delimiters', 'Platform Manager'
FROM public.data_connections c JOIN public.sites s ON s.id=c.site_id
WHERE s.luid=:'site_luid'::uuid AND c.server ~ '[/?@#=;[:space:]]'
) TO STDOUT WITH (FORMAT CSV,HEADER TRUE,ENCODING 'UTF8');
\o
COMMIT;
