-- Analytic Registry V1.1 / Tableau Server 2026.2 / ordinary PostgreSQL.
-- Use pgAdmin, DBeaver, or another PostgreSQL client. No psql meta commands.
-- Read ../tableau-postgresql-mapping.md before running.
-- Source: https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm
-- No permanent objects, source updates, API calls, credentials, or business rows.
-- Replace every REPLACE_* value. Tokens must match this installed repository.
-- Run in ONE connection. Enable stop-on-error. Discard ALL output after any error.
-- Export each named RESULT using its exact headers. Diagnostics are supplemental.
-- Set the actual capture time; do not substitute a workbook edit or load time.

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '120s';
SET LOCAL TIME ZONE 'UTC';
SET LOCAL ar11.run_key = 'REPLACE_DELIVERY_UUID';
SET LOCAL ar11.instance_key = 'REPLACE_STABLE_TABLEAU_INSTANCE_KEY';
SET LOCAL ar11.site_luid = 'REPLACE_SITE_LUID';
SET LOCAL ar11.observed_at = 'REPLACE_SOURCE_CAPTURE_ISO8601_WITH_OFFSET';
SET LOCAL ar11.directory_tenant_key = 'REPLACE_DIRECTORY_TENANT_KEY';
SET LOCAL ar11.scope_description = 'REPLACE_VERIFIED_SITE_AND_PROFILE_DESCRIPTION';
SET LOCAL ar11.workbook_content_type = 'REPLACE_INSTALLED_WORKBOOK_CONTENT_TOKEN';
SET LOCAL ar11.datasource_content_type = 'REPLACE_INSTALLED_DATASOURCE_CONTENT_TOKEN';
SET LOCAL ar11.workbook_owner_type = 'REPLACE_INSTALLED_WORKBOOK_OWNER_TOKEN';
SET LOCAL ar11.datasource_owner_type = 'REPLACE_INSTALLED_DATASOURCE_OWNER_TOKEN';

-- Fail before exporting an empty or mislabeled delivery.
-- DO executes an anonymous validation block; it creates no stored procedure.
DO $ar11_validate$
DECLARE
    key text;
    value text;
    site_count bigint;
    observed timestamptz;
BEGIN
    FOREACH key IN ARRAY ARRAY[
        'run_key','instance_key','site_luid','observed_at','directory_tenant_key',
        'scope_description','workbook_content_type','datasource_content_type',
        'workbook_owner_type','datasource_owner_type'
    ] LOOP
        value := current_setting('ar11.' || key);
        IF btrim(value) = '' OR position('REPLACE_' in value) > 0 THEN
            RAISE EXCEPTION 'Supply ar11.% before exporting.', key;
        END IF;
    END LOOP;
    PERFORM current_setting('ar11.run_key')::uuid;
    PERFORM current_setting('ar11.site_luid')::uuid;
    IF current_setting('ar11.observed_at') !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' THEN
        RAISE EXCEPTION 'ObservedAt must include an explicit UTC offset.';
    END IF;
    observed := current_setting('ar11.observed_at')::timestamptz;
    IF NOT isfinite(observed) THEN
        RAISE EXCEPTION 'ObservedAt must be a finite timestamp.';
    END IF;
    SELECT count(*) INTO site_count FROM public.sites
      WHERE luid = current_setting('ar11.site_luid')::uuid;
    IF site_count <> 1 THEN
        RAISE EXCEPTION 'The requested site LUID must identify exactly one site.';
    END IF;
    IF current_setting('ar11.workbook_content_type') = current_setting('ar11.datasource_content_type')
       OR current_setting('ar11.workbook_owner_type') = current_setting('ar11.datasource_owner_type') THEN
        RAISE EXCEPTION 'Workbook and datasource tokens must be distinct within each token family.';
    END IF;
END;
$ar11_validate$;

-- RESULT: Run_Context
-- Save as run_context.csv; headers must remain unchanged.
SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey", 'Tableau'::text AS "PlatformCode",
       current_setting('ar11.instance_key')::text AS "PlatformInstanceKey", current_setting('ar11.site_luid')::uuid::text AS "NativeScopeKey",
       to_char(current_setting('ar11.observed_at')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "ObservedAt",
       current_setting('ar11.directory_tenant_key')::text AS "DirectoryTenantKey", '1.1'::text AS "MappingVersion",
       current_setting('ar11.scope_description')::text AS "ScopeDescription";

-- RESULT: Workspaces
-- Save as workspaces.csv; headers must remain unchanged.
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       x.luid::text AS "NativeWorkspaceID",
       'Project'::text AS "NativeWorkspaceType",
       x.name AS "DisplayName",
       x.state AS "NativeLifecycleCode"
FROM public.projects x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid;

-- RESULT: Assets
-- Save as assets.csv; headers must remain unchanged.
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       x.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       x.name AS "DisplayName",
       x.revision AS "NativeVersionReference",
       x.state AS "NativeLifecycleCode"
FROM public.workbooks x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid
UNION ALL
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       x.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       x.name AS "DisplayName",
       x.revision AS "NativeVersionReference",
       x.state AS "NativeLifecycleCode"
FROM public.datasources x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid AND x.parent_workbook_id IS NULL;

-- RESULT: Workspace_Assets
-- Save as workspace_assets.csv; headers must remain unchanged.
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       p.luid::text AS "NativeWorkspaceID",
       x.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       'ProjectContent'::text AS "NativeAssociationType"
FROM public.workbooks x
JOIN public.projects_contents pc ON pc.site_id=x.site_id AND pc.content_id=x.id AND pc.content_type=current_setting('ar11.workbook_content_type')
JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid
UNION ALL
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       p.luid::text AS "NativeWorkspaceID",
       x.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       'ProjectContent'::text AS "NativeAssociationType"
FROM public.datasources x
JOIN public.projects_contents pc ON pc.site_id=x.site_id AND pc.content_id=x.id AND pc.content_type=current_setting('ar11.datasource_content_type') AND x.parent_workbook_id IS NULL
JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid;

-- RESULT: Connections
-- Save as connections.csv; headers must remain unchanged.
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       x.luid::text AS "NativeConnectionID",
       coalesce(nullif(x.caption,''),nullif(x.name,''),x.luid::text) AS "DisplayName",
       CASE lower(x.dbclass) WHEN 'sqlserver' THEN 'SQL Server' WHEN 'oracle' THEN 'Oracle' WHEN 'dataengine' THEN 'Extract' WHEN 'hyper' THEN 'Extract' ELSE coalesce(nullif(x.dbclass,''),'Undefined') END AS "TechnologyCode",
       x.has_extract::text AS "HasExtract",
       CASE WHEN x.server !~ '[/?@#=;[:space:]]' THEN x.server END AS "ServerHostname",
       x.dbname AS "DatabaseName",
       x.authentication AS "AuthenticationTypeCode",
       'Unknown'::text AS "IdentityClassificationCode",
       'Partial'::text AS "EvidenceStatusCode"
FROM public.data_connections x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid;

-- RESULT: Asset_Connections
-- Save as asset_connections.csv; headers must remain unchanged.
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       a.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       x.luid::text AS "NativeConnectionID",
       'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x
JOIN public.workbooks a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type=current_setting('ar11.workbook_owner_type')
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid
UNION ALL
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       a.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       x.luid::text AS "NativeConnectionID",
       'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x
JOIN public.datasources a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type=current_setting('ar11.datasource_owner_type') AND a.parent_workbook_id IS NULL
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid;

-- RESULT: Platform_Users
-- Save as platform_users.csv; headers must remain unchanged.
SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey",
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
 WHERE s.luid=current_setting('ar11.site_luid')::uuid
 ORDER BY u.id;

-- RESULT: Object_Users
-- Save as object_users.csv; headers must remain unchanged.
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
 SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey",
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
 WHERE s.luid=current_setting('ar11.site_luid')::uuid
 ORDER BY r.object_type,r.object_luid,r.principal_role;

-- RESULT: Asset_Dependencies
-- Save as asset_dependencies.csv; headers must remain unchanged.
SELECT NULL::text AS "RunKey", NULL::text AS "NativeAssetID",
       NULL::text AS "NativeAssetType", NULL::text AS "UpstreamNativeAssetID",
       NULL::text AS "UpstreamNativeAssetType", NULL::text AS "RelationshipCode",
       NULL::text AS "EvidenceStatusCode" WHERE false;

-- RESULT: Directory_Users
-- Save as directory_users.csv; headers must remain unchanged.
SELECT NULL::text AS "RunKey", NULL::text AS "DirectoryObjectID",
       NULL::text AS "DisplayName", NULL::text AS "Mail", NULL::boolean AS "AccountEnabled" WHERE false;

-- RESULT: Coverage
-- Save as coverage.csv; headers must remain unchanged.
SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey", 'Workspaces'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       x.luid::text AS "NativeWorkspaceID",
       'Project'::text AS "NativeWorkspaceType",
       x.name AS "DisplayName",
       x.state AS "NativeLifecycleCode"
FROM public.projects x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid
) source_rows
UNION ALL
SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey", 'Assets'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       x.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       x.name AS "DisplayName",
       x.revision AS "NativeVersionReference",
       x.state AS "NativeLifecycleCode"
FROM public.workbooks x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid
UNION ALL
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       x.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       x.name AS "DisplayName",
       x.revision AS "NativeVersionReference",
       x.state AS "NativeLifecycleCode"
FROM public.datasources x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid AND x.parent_workbook_id IS NULL
) source_rows
UNION ALL
SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey", 'Workspace_Assets'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       p.luid::text AS "NativeWorkspaceID",
       x.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       'ProjectContent'::text AS "NativeAssociationType"
FROM public.workbooks x
JOIN public.projects_contents pc ON pc.site_id=x.site_id AND pc.content_id=x.id AND pc.content_type=current_setting('ar11.workbook_content_type')
JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid
UNION ALL
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       p.luid::text AS "NativeWorkspaceID",
       x.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       'ProjectContent'::text AS "NativeAssociationType"
FROM public.datasources x
JOIN public.projects_contents pc ON pc.site_id=x.site_id AND pc.content_id=x.id AND pc.content_type=current_setting('ar11.datasource_content_type') AND x.parent_workbook_id IS NULL
JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid
) source_rows
UNION ALL
SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey", 'Connections'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       x.luid::text AS "NativeConnectionID",
       coalesce(nullif(x.caption,''),nullif(x.name,''),x.luid::text) AS "DisplayName",
       CASE lower(x.dbclass) WHEN 'sqlserver' THEN 'SQL Server' WHEN 'oracle' THEN 'Oracle' WHEN 'dataengine' THEN 'Extract' WHEN 'hyper' THEN 'Extract' ELSE coalesce(nullif(x.dbclass,''),'Undefined') END AS "TechnologyCode",
       x.has_extract::text AS "HasExtract",
       CASE WHEN x.server !~ '[/?@#=;[:space:]]' THEN x.server END AS "ServerHostname",
       x.dbname AS "DatabaseName",
       x.authentication AS "AuthenticationTypeCode",
       'Unknown'::text AS "IdentityClassificationCode",
       'Partial'::text AS "EvidenceStatusCode"
FROM public.data_connections x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid
) source_rows
UNION ALL
SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey", 'Asset_Connections'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       a.luid::text AS "NativeAssetID",
       'Workbook'::text AS "NativeAssetType",
       x.luid::text AS "NativeConnectionID",
       'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x
JOIN public.workbooks a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type=current_setting('ar11.workbook_owner_type')
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid
UNION ALL
SELECT current_setting('ar11.run_key')::text AS "RunKey",
       a.luid::text AS "NativeAssetID",
       'PublishedDatasource'::text AS "NativeAssetType",
       x.luid::text AS "NativeConnectionID",
       'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x
JOIN public.datasources a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type=current_setting('ar11.datasource_owner_type') AND a.parent_workbook_id IS NULL
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = current_setting('ar11.site_luid')::uuid
) source_rows
UNION ALL
SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey", 'Platform_Users'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
 SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey",
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
 WHERE s.luid=current_setting('ar11.site_luid')::uuid
 ORDER BY u.id
) source_rows
UNION ALL
SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey", 'Object_Users'::text AS "DatasetCode", 'Partial'::text AS "CoverageStatus", count(*)::bigint AS "RowCount" FROM (
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
 SELECT current_setting('ar11.run_key')::uuid::text AS "RunKey",
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
 WHERE s.luid=current_setting('ar11.site_luid')::uuid
 ORDER BY r.object_type,r.object_luid,r.principal_role
) source_rows
UNION ALL
SELECT current_setting('ar11.run_key')::uuid::text, 'Asset_Dependencies'::text, 'NotCollected'::text, NULL::bigint
UNION ALL
SELECT current_setting('ar11.run_key')::uuid::text, 'Directory_Users'::text, 'NotCollected'::text, NULL::bigint;

-- RESULT: Tableau_Relationship_Exceptions
-- Save as tableau_relationship_exceptions.csv; headers must remain unchanged.
SELECT 'Workspace_Assets'::text AS "DatasetCode", pc.content_id::text AS "SourceReference",
       pc.content_type::text AS "SourceType", pc.project_id::text AS "RelatedReference",
       'Missing project or workbook endpoint'::text AS "Issue", 'Platform Manager'::text AS "AssignedToRole"
FROM public.projects_contents pc
JOIN public.sites s ON s.id=pc.site_id
LEFT JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
LEFT JOIN public.workbooks w ON w.site_id=pc.site_id AND w.id=pc.content_id
WHERE s.luid=current_setting('ar11.site_luid')::uuid AND pc.content_type=current_setting('ar11.workbook_content_type')
  AND (p.id IS NULL OR w.id IS NULL)
UNION ALL
SELECT 'Workspace_Assets', pc.content_id::text, pc.content_type::text, pc.project_id::text,
       'Missing project or published datasource endpoint', 'Platform Manager'
FROM public.projects_contents pc
JOIN public.sites s ON s.id=pc.site_id
LEFT JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
LEFT JOIN public.datasources d ON d.site_id=pc.site_id AND d.id=pc.content_id AND d.parent_workbook_id IS NULL
WHERE s.luid=current_setting('ar11.site_luid')::uuid AND pc.content_type=current_setting('ar11.datasource_content_type')
  AND (p.id IS NULL OR d.id IS NULL)
UNION ALL
SELECT 'Asset_Connections', c.luid::text, c.owner_type::text, c.owner_id::text,
       'Connection owner is unresolved or outside the workbook/published-source profile', 'Platform Manager'
FROM public.data_connections c
JOIN public.sites s ON s.id=c.site_id
LEFT JOIN public.workbooks w ON w.site_id=c.site_id AND w.id=c.owner_id AND c.owner_type=current_setting('ar11.workbook_owner_type')
LEFT JOIN public.datasources d ON d.site_id=c.site_id AND d.id=c.owner_id AND c.owner_type=current_setting('ar11.datasource_owner_type')
  AND d.parent_workbook_id IS NULL
WHERE s.luid=current_setting('ar11.site_luid')::uuid AND w.id IS NULL AND d.id IS NULL
UNION ALL
SELECT 'Connections', c.luid::text, 'ServerHostname', NULL::text,
       'Host omitted because the source value contains URI, credential, or whitespace delimiters', 'Platform Manager'
FROM public.data_connections c JOIN public.sites s ON s.id=c.site_id
WHERE s.luid=current_setting('ar11.site_luid')::uuid AND c.server ~ '[/?@#=;[:space:]]';

-- RESULT: Tableau_Membership_Exceptions
-- A wrong token or a missing projects_contents row must not silently hide an asset.
SELECT 'Workspace_Assets'::text AS "DatasetCode", 'Workbook'::text AS "NativeAssetType",
       w.luid::text AS "NativeAssetID", w.id::text AS "RepositoryAssetID",
       'No verified project membership for an included workbook'::text AS "Issue",
       'Platform Manager'::text AS "AssignedToRole"
FROM public.workbooks w JOIN public.sites s ON s.id=w.site_id
WHERE s.luid=current_setting('ar11.site_luid')::uuid
AND NOT EXISTS (
    SELECT 1 FROM public.projects_contents pc
    JOIN public.projects p ON p.id=pc.project_id AND p.site_id=pc.site_id
    WHERE pc.site_id=w.site_id AND pc.content_id=w.id
      AND pc.content_type=current_setting('ar11.workbook_content_type')
)
UNION ALL
SELECT 'Workspace_Assets', 'PublishedDatasource', d.luid::text, d.id::text,
       'No verified project membership for an included published datasource', 'Platform Manager'
FROM public.datasources d JOIN public.sites s ON s.id=d.site_id
WHERE s.luid=current_setting('ar11.site_luid')::uuid AND d.parent_workbook_id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.projects_contents pc
    JOIN public.projects p ON p.id=pc.project_id AND p.site_id=pc.site_id
    WHERE pc.site_id=d.site_id AND pc.content_id=d.id
      AND pc.content_type=current_setting('ar11.datasource_content_type')
);

-- RESULT: Tableau_Identity_Exceptions
-- Missing or repeated LUIDs are source defects. Do not replace them with names.
WITH native_objects AS (
    SELECT 'Workspaces'::text AS dataset, 'Project'::text AS kind, p.luid::text AS native_id
    FROM public.projects p JOIN public.sites s ON s.id=p.site_id
    WHERE s.luid=current_setting('ar11.site_luid')::uuid
    UNION ALL
    SELECT 'Assets', 'Workbook', w.luid::text
    FROM public.workbooks w JOIN public.sites s ON s.id=w.site_id
    WHERE s.luid=current_setting('ar11.site_luid')::uuid
    UNION ALL
    SELECT 'Assets', 'PublishedDatasource', d.luid::text
    FROM public.datasources d JOIN public.sites s ON s.id=d.site_id
    WHERE s.luid=current_setting('ar11.site_luid')::uuid AND d.parent_workbook_id IS NULL
    UNION ALL
    SELECT 'Connections', 'Connection', c.luid::text
    FROM public.data_connections c JOIN public.sites s ON s.id=c.site_id
    WHERE s.luid=current_setting('ar11.site_luid')::uuid
    UNION ALL
    SELECT 'Platform_Users', 'TableauUserLUID', u.luid::text
    FROM public.users u JOIN public.sites s ON s.id=u.site_id
    WHERE s.luid=current_setting('ar11.site_luid')::uuid
)
SELECT dataset AS "DatasetCode", kind AS "NativeType", native_id AS "NativeID",
       count(*) AS "SourceRowCount",
       CASE WHEN native_id IS NULL THEN 'Missing LUID' ELSE 'Repeated scoped LUID' END AS "Issue",
       'Platform Manager'::text AS "AssignedToRole"
FROM native_objects GROUP BY dataset,kind,native_id
HAVING native_id IS NULL OR count(*) <> 1;

-- RESULT: Tableau_Inventory_Reconciliation
-- These counts include all native lifecycle states. Reconcile UI filters explicitly.
SELECT 'Workspaces'::text AS "DatasetCode", p.state::text AS "NativeLifecycleCode",
       count(*) AS "SourceRowCount"
FROM public.projects p JOIN public.sites s ON s.id=p.site_id
WHERE s.luid=current_setting('ar11.site_luid')::uuid GROUP BY p.state
UNION ALL
SELECT 'Assets:Workbook',w.state::text,count(*)
FROM public.workbooks w JOIN public.sites s ON s.id=w.site_id
WHERE s.luid=current_setting('ar11.site_luid')::uuid GROUP BY w.state
UNION ALL
SELECT 'Assets:PublishedDatasource',d.state::text,count(*)
FROM public.datasources d JOIN public.sites s ON s.id=d.site_id
WHERE s.luid=current_setting('ar11.site_luid')::uuid AND d.parent_workbook_id IS NULL
GROUP BY d.state;

COMMIT;

-- Never load partial result sets from an aborted transaction.
-- If any statement failed, use ROLLBACK, correct the cause, then rerun the delivery.
-- No coverage row is automatically Complete. Validate the installed schema,
-- exceptions, selected scope, and delivered row counts before accepting coverage.
