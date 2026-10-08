// Regenerates export.sql and preflight.sql. Uses only documented columns.
import {writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {headers,common} from '../powerbi/normalize-scan.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const required={
 sites:['id','luid','name'],
 projects:['id','luid','site_id','name','owner_id','state'],
 workbooks:['id','luid','site_id','name','owner_id','modified_by_user_id','created_at','updated_at','revision','state'],
 datasources:['id','luid','site_id','name','owner_id','modified_by_user_id','created_at','updated_at','revision','state'],
 projects_contents:['project_id','site_id','content_id','content_type'],
 data_connections:['id','luid','site_id','name','caption','dbclass','server','port','dbname','has_extract','authentication','state','owner_id','owner_type'],
 views:['id','luid','site_id','workbook_id','name','sheettype','revision','created_at','updated_at','state'],
};
const requiredValues=Object.entries(required).flatMap(([t,cols])=>cols.map(c=>`('${t}','${c}')`)).join(',\n');
const reference='https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm';
await writeFile(resolve(here,'preflight.sql'),`-- Read-only Tableau Server 2026.2 preflight. Source: ${reference}
-- Run before export.sql. It does not query credential values or business data.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '120s';
SELECT version() AS postgres_engine_version;
-- This is the PostgreSQL engine version, NOT the Tableau product version.
WITH required(table_name,column_name) AS (VALUES
${requiredValues}
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
`,'utf8');
const b={RunKey:`:'run_key'::text`,PlatformCode:`'Tableau'::text`,PlatformInstanceKey:`:'instance_key'::text`,NativeScopeKey:`s.luid::text`,ObservedAt:`:'observed_at'::timestamptz`};
const fields=(name,values)=>headers[name].map(k=>`${({...b,...values})[k]??'NULL::text'} AS "${k}"`).join(',\n  ');
const csv=(name,query)=>`\n\\o ${name}.csv\nCOPY (\n${query}\n) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8');\n\\o\n`;
const site=`JOIN public.sites s ON s.id = x.site_id WHERE s.luid = :'site_luid'::uuid`;
const time=c=>`to_char(${c},'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
let sql=`-- Read-only, one consistent snapshot; no source changes.
-- Source: ${reference}
-- Required psql variables: run_key, instance_key, site_luid, observed_at,
-- workbook_content_type, datasource_content_type. See README.md for execution.
-- Exported IDs are LUIDs; repository integers are diagnostic crosswalks only.
\\set ON_ERROR_STOP on
\\set QUIET on
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '120s';
SET LOCAL TIME ZONE 'UTC';
WITH required(table_name,column_name) AS (VALUES
${requiredValues}
)
SELECT NOT EXISTS (SELECT 1 FROM required r WHERE NOT EXISTS (
 SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public'
 AND c.table_name=r.table_name AND c.column_name=r.column_name)) AS schema_ok \\gset
\\if :schema_ok
\\else
\\echo 'STOP: required columns missing. Inspect preflight; do not substitute guessed columns.'
SELECT 1/0 AS missing_required_columns;
\\endif
SELECT count(*)=1 AS site_ok FROM public.sites WHERE luid=:'site_luid'::uuid \\gset
\\if :site_ok
\\else
\\echo 'STOP: unknown or ambiguous site LUID.'
SELECT 1/0 AS invalid_site;
\\endif
-- Exact supplied content-type tokens must occur in this site's rows, unless
-- the corresponding asset table has zero rows. This is a guard, not proof of
-- semantic correctness. Team confirmation and sampled ID joins remain required.
SELECT (NOT EXISTS(SELECT 1 FROM public.workbooks w JOIN public.sites s ON s.id=w.site_id WHERE s.luid=:'site_luid'::uuid)
 OR EXISTS(SELECT 1 FROM public.projects_contents p JOIN public.sites s ON s.id=p.site_id WHERE s.luid=:'site_luid'::uuid AND p.content_type=:'workbook_content_type'))
 AND (NOT EXISTS(SELECT 1 FROM public.datasources d JOIN public.sites s ON s.id=d.site_id WHERE s.luid=:'site_luid'::uuid)
 OR EXISTS(SELECT 1 FROM public.projects_contents p JOIN public.sites s ON s.id=p.site_id WHERE s.luid=:'site_luid'::uuid AND p.content_type=:'datasource_content_type')) AS type_ok \\gset
\\if :type_ok
\\else
\\echo 'STOP: type token not found for nonempty inventory. Resolve membership contract first.'
SELECT 1/0 AS invalid_content_type;
\\endif
`;
sql+=csv('workspaces',`SELECT ${fields('workspaces',{NativeWorkspaceID:'x.luid::text',NativeRepositoryID:'x.id::text',NativeWorkspaceType:"'Project'::text",DisplayName:'x.name',NativeOwnerID:'x.owner_id::text',NativeLifecycleCode:'x.state'})}\nFROM public.projects x ${site}`);
const assets=(table,type)=>`SELECT ${fields('assets',{NativeAssetID:'x.luid::text',NativeRepositoryID:'x.id::text',NativeAssetType:`'${type}'::text`,AssetTypeCode:`'${type==='Workbook'?'Workbook':'Published Data Source'}'::text`,DisplayName:'x.name',NativeVersionReference:'x.revision',ModifiedByNativeID:'x.modified_by_user_id::text',NativeOwnerID:'x.owner_id::text',CreatedAtNative:time('x.created_at'),ModifiedAtNative:time('x.updated_at'),NativeLifecycleCode:'x.state'})}\nFROM public.${table} x ${site}`;
sql+=csv('assets',assets('workbooks','Workbook')+'\nUNION ALL\n'+assets('datasources','PublishedDatasource'));
const membership=(table,type,param)=>`SELECT ${fields('workspace_assets',{NativeWorkspaceID:'p.luid::text',NativeAssetID:'x.luid::text',NativeAssetType:`'${type}'::text`,NativeAssociationType:"'ProjectContent'::text"})}
FROM public.${table} x
JOIN public.projects_contents pc ON pc.site_id=x.site_id AND pc.content_id=x.id AND pc.content_type=:'${param}'
JOIN public.projects p ON p.site_id=pc.site_id AND p.id=pc.project_id
${site}`;
sql+=csv('workspace_assets',membership('workbooks','Workbook','workbook_content_type')+'\nUNION ALL\n'+membership('datasources','PublishedDatasource','datasource_content_type'));
const tech=`CASE lower(x.dbclass) WHEN 'sqlserver' THEN 'SQL Server' WHEN 'oracle' THEN 'Oracle' WHEN 'dataengine' THEN 'Extract' WHEN 'hyper' THEN 'Extract' ELSE coalesce(nullif(x.dbclass,''),'Undefined') END`;
sql+=csv('connections',`SELECT ${fields('connections',{NativeConnectionID:'x.luid::text',NativeRepositoryID:'x.id::text',NativeConnectionType:"'DataConnection'::text",DisplayName:"coalesce(nullif(x.caption,''),nullif(x.name,''),x.luid::text)",TechnologyCode:tech,ServerHostname:'x.server',Port:'x.port::text',DatabaseName:'x.dbname',HasExtract:'x.has_extract::text',AuthenticationTypeCode:'x.authentication',IdentityClassificationCode:"'Unknown'::text",NativeStatusCode:'x.state',EvidenceStatusCode:"'Observed'::text"})}\nFROM public.data_connections x ${site}`);
const lineage=(table,type,ownerType)=>`SELECT ${fields('asset_connections',{NativeAssetID:'a.luid::text',NativeAssetType:`'${type}'::text`,NativeConnectionID:'x.luid::text',EvidenceStatusCode:"'Observed'::text"})}
FROM public.data_connections x
JOIN public.${table} a ON a.site_id=x.site_id AND a.id=x.owner_id AND x.owner_type='${ownerType}'
${site}`;
sql+=csv('asset_connections',lineage('workbooks','Workbook','Workbook')+'\nUNION ALL\n'+lineage('datasources','PublishedDatasource','Datasource'));
sql+=csv('views_optional',`SELECT ${common.map(k=>`${b[k]} AS "${k}"`).join(', ')},
 x.luid::text AS "NativeViewID",x.id::text AS "NativeRepositoryID",
 w.luid::text AS "NativeWorkbookID",x.name AS "DisplayName",x.sheettype AS "NativeViewType",
 x.revision AS "NativeVersionReference",${time('x.updated_at')} AS "ModifiedAtNative",x.state AS "NativeLifecycleCode"
FROM public.views x JOIN public.workbooks w ON w.site_id=x.site_id AND w.id=x.workbook_id ${site}`);
sql+=`\nCOMMIT;\n`;
await writeFile(resolve(here,'export.sql'),sql,'utf8');
console.log('Generated preflight.sql and export.sql');
