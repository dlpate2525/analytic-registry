-- Read-only, one consistent snapshot; no source changes.
-- Source: https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm
-- Required psql variables: run_key, instance_key, site_luid, observed_at,
-- workbook_content_type, datasource_content_type. See README.md for execution.
-- Exported IDs are LUIDs; repository integers are diagnostic crosswalks only.
\set ON_ERROR_STOP on
\set QUIET on
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '120s';
SET LOCAL TIME ZONE 'UTC';
WITH required(table_name,column_name) AS (VALUES
('sites','id'),
('sites','luid'),
('sites','name'),
('projects','id'),
('projects','luid'),
('projects','site_id'),
('projects','name'),
('projects','owner_id'),
('projects','state'),
('workbooks','id'),
('workbooks','luid'),
('workbooks','site_id'),
('workbooks','name'),
('workbooks','owner_id'),
('workbooks','modified_by_user_id'),
('workbooks','created_at'),
('workbooks','updated_at'),
('workbooks','revision'),
('workbooks','state'),
('datasources','id'),
('datasources','luid'),
('datasources','site_id'),
('datasources','name'),
('datasources','owner_id'),
('datasources','modified_by_user_id'),
('datasources','created_at'),
('datasources','updated_at'),
('datasources','revision'),
('datasources','state'),
('projects_contents','project_id'),
('projects_contents','site_id'),
('projects_contents','content_id'),
('projects_contents','content_type'),
('data_connections','id'),
('data_connections','luid'),
('data_connections','site_id'),
('data_connections','name'),
('data_connections','caption'),
('data_connections','dbclass'),
('data_connections','server'),
('data_connections','port'),
('data_connections','dbname'),
('data_connections','has_extract'),
('data_connections','authentication'),
('data_connections','state'),
('data_connections','owner_id'),
('data_connections','owner_type'),
('views','id'),
('views','luid'),
('views','site_id'),
('views','workbook_id'),
('views','name'),
('views','sheettype'),
('views','revision'),
('views','created_at'),
('views','updated_at'),
('views','state')
)
SELECT NOT EXISTS (SELECT 1 FROM required r WHERE NOT EXISTS (
 SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public'
 AND c.table_name=r.table_name AND c.column_name=r.column_name)) AS schema_ok \gset
\if :schema_ok
\else
\echo 'STOP: required columns missing. Inspect preflight; do not substitute guessed columns.'
SELECT 1/0 AS missing_required_columns;
\endif
SELECT count(*)=1 AS site_ok FROM public.sites WHERE luid=:'site_luid'::uuid \gset
\if :site_ok
\else
\echo 'STOP: unknown or ambiguous site LUID.'
SELECT 1/0 AS invalid_site;
\endif
-- Exact supplied content-type tokens must occur in this site's rows, unless
-- the corresponding asset table has zero rows. This is a guard, not proof of
-- semantic correctness. Team confirmation and sampled ID joins remain required.
SELECT (NOT EXISTS(SELECT 1 FROM public.workbooks w JOIN public.sites s ON s.id=w.site_id WHERE s.luid=:'site_luid'::uuid)
 OR EXISTS(SELECT 1 FROM public.projects_contents p JOIN public.sites s ON s.id=p.site_id WHERE s.luid=:'site_luid'::uuid AND p.content_type=:'workbook_content_type'))
 AND (NOT EXISTS(SELECT 1 FROM public.datasources d JOIN public.sites s ON s.id=d.site_id WHERE s.luid=:'site_luid'::uuid)
 OR EXISTS(SELECT 1 FROM public.projects_contents p JOIN public.sites s ON s.id=p.site_id WHERE s.luid=:'site_luid'::uuid AND p.content_type=:'datasource_content_type')) AS type_ok \gset
\if :type_ok
\else
\echo 'STOP: type token not found for nonempty inventory. Resolve membership contract first.'
SELECT 1/0 AS invalid_content_type;
\endif

\o workspaces.csv
COPY (
SELECT :'run_key'::text AS "RunKey",
  'Tableau'::text AS "PlatformCode",
  :'instance_key'::text AS "PlatformInstanceKey",
  s.luid::text AS "NativeScopeKey",
  :'observed_at'::timestamptz AS "ObservedAt",
  x.luid::text AS "NativeWorkspaceID",
  x.id::text AS "NativeRepositoryID",
  'Project'::text AS "NativeWorkspaceType",
  x.name AS "DisplayName",
  x.owner_id::text AS "NativeOwnerID",
  x.state AS "NativeLifecycleCode",
  NULL::text AS "CapacityKey"
FROM public.projects x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o assets.csv
COPY (
SELECT :'run_key'::text AS "RunKey",
  'Tableau'::text AS "PlatformCode",
  :'instance_key'::text AS "PlatformInstanceKey",
  s.luid::text AS "NativeScopeKey",
  :'observed_at'::timestamptz AS "ObservedAt",
  x.luid::text AS "NativeAssetID",
  x.id::text AS "NativeRepositoryID",
  'Workbook'::text AS "NativeAssetType",
  'Workbook'::text AS "AssetTypeCode",
  x.name AS "DisplayName",
  x.revision AS "NativeVersionReference",
  NULL::text AS "CreatedByNativeID",
  x.modified_by_user_id::text AS "ModifiedByNativeID",
  x.owner_id::text AS "NativeOwnerID",
  to_char(x.created_at,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "CreatedAtNative",
  to_char(x.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "ModifiedAtNative",
  x.state AS "NativeLifecycleCode"
FROM public.workbooks x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
UNION ALL
SELECT :'run_key'::text AS "RunKey",
  'Tableau'::text AS "PlatformCode",
  :'instance_key'::text AS "PlatformInstanceKey",
  s.luid::text AS "NativeScopeKey",
  :'observed_at'::timestamptz AS "ObservedAt",
  x.luid::text AS "NativeAssetID",
  x.id::text AS "NativeRepositoryID",
  'PublishedDatasource'::text AS "NativeAssetType",
  'Published Data Source'::text AS "AssetTypeCode",
  x.name AS "DisplayName",
  x.revision AS "NativeVersionReference",
  NULL::text AS "CreatedByNativeID",
  x.modified_by_user_id::text AS "ModifiedByNativeID",
  x.owner_id::text AS "NativeOwnerID",
  to_char(x.created_at,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "CreatedAtNative",
  to_char(x.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "ModifiedAtNative",
  x.state AS "NativeLifecycleCode"
FROM public.datasources x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o workspace_assets.csv
COPY (
SELECT :'run_key'::text AS "RunKey",
  'Tableau'::text AS "PlatformCode",
  :'instance_key'::text AS "PlatformInstanceKey",
  s.luid::text AS "NativeScopeKey",
  :'observed_at'::timestamptz AS "ObservedAt",
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
  'Tableau'::text AS "PlatformCode",
  :'instance_key'::text AS "PlatformInstanceKey",
  s.luid::text AS "NativeScopeKey",
  :'observed_at'::timestamptz AS "ObservedAt",
  p.luid::text AS "NativeWorkspaceID",
  x.luid::text AS "NativeAssetID",
  'PublishedDatasource'::text AS "NativeAssetType",
  'ProjectContent'::text AS "NativeAssociationType"
FROM public.datasources x
JOIN public.projects_contents pc ON pc.site_id=x.site_id AND pc.content_id=x.id AND pc.content_type=:'datasource_content_type'
JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o connections.csv
COPY (
SELECT :'run_key'::text AS "RunKey",
  'Tableau'::text AS "PlatformCode",
  :'instance_key'::text AS "PlatformInstanceKey",
  s.luid::text AS "NativeScopeKey",
  :'observed_at'::timestamptz AS "ObservedAt",
  x.luid::text AS "NativeConnectionID",
  x.id::text AS "NativeRepositoryID",
  'DataConnection'::text AS "NativeConnectionType",
  coalesce(nullif(x.caption,''),nullif(x.name,''),x.luid::text) AS "DisplayName",
  CASE lower(x.dbclass) WHEN 'sqlserver' THEN 'SQL Server' WHEN 'oracle' THEN 'Oracle' WHEN 'dataengine' THEN 'Extract' WHEN 'hyper' THEN 'Extract' ELSE coalesce(nullif(x.dbclass,''),'Undefined') END AS "TechnologyCode",
  x.server AS "ServerHostname",
  x.port::text AS "Port",
  x.dbname AS "DatabaseName",
  x.has_extract::text AS "HasExtract",
  x.authentication AS "AuthenticationTypeCode",
  'Unknown'::text AS "IdentityClassificationCode",
  NULL::text AS "GatewayID",
  x.state AS "NativeStatusCode",
  'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o asset_connections.csv
COPY (
SELECT :'run_key'::text AS "RunKey",
  'Tableau'::text AS "PlatformCode",
  :'instance_key'::text AS "PlatformInstanceKey",
  s.luid::text AS "NativeScopeKey",
  :'observed_at'::timestamptz AS "ObservedAt",
  a.luid::text AS "NativeAssetID",
  'Workbook'::text AS "NativeAssetType",
  x.luid::text AS "NativeConnectionID",
  'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x
JOIN public.workbooks a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type='Workbook'
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
UNION ALL
SELECT :'run_key'::text AS "RunKey",
  'Tableau'::text AS "PlatformCode",
  :'instance_key'::text AS "PlatformInstanceKey",
  s.luid::text AS "NativeScopeKey",
  :'observed_at'::timestamptz AS "ObservedAt",
  a.luid::text AS "NativeAssetID",
  'PublishedDatasource'::text AS "NativeAssetType",
  x.luid::text AS "NativeConnectionID",
  'Observed'::text AS "EvidenceStatusCode"
FROM public.data_connections x
JOIN public.datasources a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type='Datasource'
JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

\o views_optional.csv
COPY (
SELECT :'run_key'::text AS "RunKey", 'Tableau'::text AS "PlatformCode", :'instance_key'::text AS "PlatformInstanceKey", s.luid::text AS "NativeScopeKey", :'observed_at'::timestamptz AS "ObservedAt",
 x.luid::text AS "NativeViewID",x.id::text AS "NativeRepositoryID",
 w.luid::text AS "NativeWorkbookID",x.name AS "DisplayName",x.sheettype AS "NativeViewType",
 x.revision AS "NativeVersionReference",to_char(x.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "ModifiedAtNative",x.state AS "NativeLifecycleCode"
FROM public.views x JOIN public.workbooks w ON w.site_id=x.site_id AND w.id=x.workbook_id JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');
\o

COMMIT;
