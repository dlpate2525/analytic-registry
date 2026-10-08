-- Tableau Server 2026.2 identity supplement. PostgreSQL psql script.
-- Documentation-verified template; not executed against a live Tableau server.
-- Run from a new delivery directory with the existing approved readonly service.
-- Required psql variables: run_key, instance_key, site_luid, observed_at,
-- directory_tenant_key (configured corporate tenant for the later email match).
-- Dictionary: https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm
-- Writes client-side CSV only. Never selects password/keychain/token columns.
\set ON_ERROR_STOP on
\set QUIET on
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '120s';
SET LOCAL TIME ZONE 'UTC';

WITH required(table_name,column_name) AS (VALUES
 ('sites','id'),('sites','luid'),
 ('users','id'),('users','luid'),('users','site_id'),('users','system_user_id'),
 ('users','site_role_id'),
 ('system_users','id'),('system_users','name'),('system_users','email'),
 ('system_users','friendly_name'),
 ('site_roles','id'),('site_roles','name'),
 ('projects','id'),('projects','luid'),('projects','site_id'),
 ('projects','name'),('projects','owner_id'),
 ('workbooks','id'),('workbooks','luid'),('workbooks','site_id'),
 ('workbooks','name'),('workbooks','owner_id'),('workbooks','modified_by_user_id'),
 ('datasources','id'),('datasources','luid'),('datasources','site_id'),
 ('datasources','name'),('datasources','owner_id'),('datasources','modified_by_user_id')
)
SELECT NOT EXISTS(
 SELECT 1 FROM required r
 WHERE NOT EXISTS(
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.table_name=r.table_name AND c.column_name=r.column_name
 )
) AS schema_ok \gset
\if :schema_ok
\else
\echo 'STOP: required dictionary columns are absent or not visible to this account.'
SELECT 1/0 AS incompatible_schema;
\endif
SELECT count(*)=1 AS site_ok FROM public.sites WHERE luid=:'site_luid'::uuid \gset
\if :site_ok
\else
\echo 'STOP: site_luid must identify exactly one site.'
SELECT 1/0 AS invalid_site;
\endif
SELECT (:'observed_at' ~ '([zZ]|[+-][0-9]{2}:[0-9]{2})$'
 AND length(btrim(:'instance_key'))>0
 AND length(btrim(:'directory_tenant_key'))>0) AS context_ok \gset
\if :context_ok
\else
\echo 'STOP: nonblank instance_key/directory_tenant_key and offset-qualified observed_at are required.'
SELECT 1/0 AS invalid_context;
\endif
-- Parsing fails immediately for invalid UUID/date input.
SELECT :'run_key'::uuid AS validated_run_key,
       :'observed_at'::timestamptz AS validated_observed_at;

\o platform_users.csv
COPY (
 SELECT :'run_key'::uuid::text AS "RunKey",
        'Tableau'::text AS "PlatformCode",
        :'instance_key'::text AS "PlatformInstanceKey",
        s.luid::text AS "NativeScopeKey",
        to_char(:'observed_at'::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "ObservedAt",
        u.luid::text AS "NativePrincipalID",
        'TableauUserLUID'::text AS "IdentifierNamespace",
        'User'::text AS "PrincipalTypeCode",
        NULLIF(su.friendly_name,'') AS "DisplayName",
        su.name AS "SourceLogin",
        su.email AS "SourceEmail",
        'TableauSiteRole=' || coalesce(sr.name,u.site_role_id::text,'Unknown') AS "SourceStatus",
        NULL::text AS "SourceDirectoryObjectID",
        :'directory_tenant_key'::text AS "DirectoryTenantKey",
        u.id::text AS "NativeRepositoryID"
 FROM public.users u
 JOIN public.sites s ON s.id=u.site_id
 LEFT JOIN public.system_users su ON su.id=u.system_user_id
 LEFT JOIN public.site_roles sr ON sr.id=u.site_role_id
 WHERE s.luid=:'site_luid'::uuid
 ORDER BY u.id
) TO STDOUT WITH (FORMAT CSV,HEADER TRUE,ENCODING 'UTF8');
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
  FROM public.datasources d
  UNION ALL
  SELECT d.site_id,'PublishedDatasource',d.luid,d.name,'ModifiedBy',d.modified_by_user_id
  FROM public.datasources d
 )
 SELECT :'run_key'::uuid::text AS "RunKey",
        'Tableau'::text AS "PlatformCode",
        :'instance_key'::text AS "PlatformInstanceKey",
        s.luid::text AS "NativeScopeKey",
        to_char(:'observed_at'::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "ObservedAt",
        r.object_type AS "NativeObjectType",
        r.object_luid::text AS "NativeObjectID",
        r.object_name AS "ObjectDisplayName",
        r.principal_role AS "PrincipalRoleCode",
        r.repository_user_id::text AS "SourcePrincipalReference",
        'TableauRepositoryUserID'::text AS "SourceReferenceNamespace",
        u.luid::text AS "NativePrincipalID",
        'TableauUserLUID'::text AS "IdentifierNamespace",
        NULL::text AS "NativeRole",
        su.email AS "SourceEmail",
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
) TO STDOUT WITH (FORMAT CSV,HEADER TRUE,ENCODING 'UTF8');
\o

COMMIT;
