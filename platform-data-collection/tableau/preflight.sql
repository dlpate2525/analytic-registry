-- Read-only Tableau Server 2026.2 preflight. Source: https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm
-- Run before export.sql. It does not query credential values or business data.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '120s';
SELECT version() AS postgres_engine_version;
-- This is the PostgreSQL engine version, NOT the Tableau product version.
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
SELECT r.table_name,r.column_name,c.data_type,
       CASE WHEN c.column_name IS NULL THEN 'MISSING' ELSE 'Present' END AS check_result
FROM required r LEFT JOIN information_schema.columns c
 ON c.table_schema='public' AND c.table_name=r.table_name AND c.column_name=r.column_name
ORDER BY r.table_name,r.column_name;
SELECT id AS repository_site_id,luid AS site_luid,name FROM public.sites ORDER BY id;
-- Confirm the exact type tokens with the platform team. Do NOT guess based on names.
SELECT content_type,count(*) AS row_count FROM public.projects_contents GROUP BY content_type ORDER BY content_type;
SELECT owner_type,count(*) AS row_count FROM public.data_connections GROUP BY owner_type ORDER BY owner_type;
COMMIT;
