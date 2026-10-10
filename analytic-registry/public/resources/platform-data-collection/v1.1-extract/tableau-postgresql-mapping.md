# Tableau Server: PostgreSQL query handoff

Use [tableau-postgresql-selects.sql](queries/tableau-postgresql-selects.sql) in a PostgreSQL query editor. It supplies eleven V1.1 result sets for the [Excel workbook](analytic-registry-v1.1-extract.xlsx). It makes no API calls. The earlier [psql export](queries/tableau-postgresql.sql) remains available for automated CSV output.

**Target:** Tableau Server 2026.2 repository, one site per delivery. The query uses the documented source columns. It has not run against your installed server. Tableau Cloud does not expose this repository route. Repository schemas can change; verify the installed shape before each version change. [Tableau repository access](https://help.tableau.com/current/server/en-us/perf_collect_server_repo.htm), [2026.2 dictionary](https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm)

## Run and deliver

1. Connect an approved PostgreSQL client to the Tableau repository with read-only access.
2. Run the preflight below. Record the site LUID and verified content and owner tokens.
3. Replace the ten `REPLACE_*` values in the SQL file. Run all statements in one connection with stop-on-error enabled.
4. Export each named result with its exact headers. Keep the four diagnostic results with the delivery.
5. Load the eleven contract results into Excel or SQL staging. Have Platform Manager review counts, exceptions, and coverage before acceptance.

Do not execute each result in a separate connection. The file uses one read-only, repeatable-read transaction and transaction-local parameters. PostgreSQL discards `SET LOCAL` values when the transaction ends. Save the query outputs from that execution; do not run a second export query after committing. [PostgreSQL SET](https://www.postgresql.org/docs/current/sql-set.html), [transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

If any statement fails, discard all results from that execution. Run `ROLLBACK`, correct the cause, and rerun the whole delivery. A missing site fails validation instead of producing an apparently empty inventory.

## Required source checks

First confirm the Tableau version in its administration interface. `SELECT version()` reports the PostgreSQL engine version, not the Tableau version.

```sql
SELECT id AS repository_site_id, luid AS site_luid, name
FROM public.sites ORDER BY id;

SELECT content_type, count(*) AS source_rows
FROM public.projects_contents
GROUP BY content_type ORDER BY content_type;

SELECT owner_type, count(*) AS source_rows
FROM public.data_connections
GROUP BY owner_type ORDER BY owner_type;

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('sites','projects','workbooks','datasources',
      'projects_contents','data_connections','users','system_users','site_roles')
ORDER BY table_name, ordinal_position;
```

Compare source columns with the query before execution. Check representative asset IDs against their project and connection rows. Counts by token alone do not prove that a token belongs to a particular asset type. The [broader repository preflight](../tableau/preflight.sql) can assist; the query also needs `datasources.parent_workbook_id` and the identity columns shown below.

| Required table | Columns used by the query |
|---|---|
| `sites` | `id`, `luid` |
| `projects` | `id`, `site_id`, `luid`, `name`, `state`, `owner_id` |
| `workbooks` | `id`, `site_id`, `luid`, `name`, `revision`, `state`, `owner_id`, `modified_by_user_id` |
| `datasources` | `id`, `site_id`, `luid`, `name`, `revision`, `state`, `owner_id`, `modified_by_user_id`, `parent_workbook_id` |
| `projects_contents` | `site_id`, `project_id`, `content_id`, `content_type` |
| `data_connections` | `site_id`, `luid`, `caption`, `name`, `dbclass`, `has_extract`, `server`, `dbname`, `authentication`, `owner_id`, `owner_type` |
| `users` | `id`, `site_id`, `luid`, `system_user_id`, `site_role_id` |
| `system_users` | `id`, `friendly_name`, `email` |
| `site_roles` | `id`, `name` |

## Parameter meanings

| Parameter | Supply |
|---|---|
| `run_key` | Existing delivery UUID. Use a new UUID for a later capture. Reuse only for identical immutable input. |
| `instance_key` | Stable registry key for this Tableau deployment. Do not change it when a server display name changes. |
| `site_luid` | Exact site LUID from `sites`, not its repository integer ID or display name. |
| `observed_at` | Actual source capture timestamp, with `Z` or an explicit offset. Do not use the later SQL Server load time. |
| `directory_tenant_key` | Registry's configured corporate directory tenant key. This does not imply that Tableau validated the account. |
| `scope_description` | Site and included object profile, including lifecycle-state coverage. |
| `workbook_content_type` | Installed `projects_contents.content_type` token verified for workbooks. |
| `datasource_content_type` | Installed `projects_contents.content_type` token verified for datasources. |
| `workbook_owner_type` | Installed `data_connections.owner_type` token verified for workbooks. |
| `datasource_owner_type` | Installed `data_connections.owner_type` token verified for datasources. |

The final four parameters remain explicit to avoid silently losing relationships after schema changes. Do not use an arbitrary token merely because it appears in a source row.

## Output and identity

| Contract result | Native key and content |
|---|---|
| `Run_Context` | One delivery context row. These fields come from the manifest. |
| `Workspaces` | Project LUID; name and native lifecycle state. |
| `Assets` | Workbook or published datasource LUID; name, revision, native state. Published sources require `parent_workbook_id IS NULL`. |
| `Workspace_Assets` | `projects_contents` membership; related project and asset LUIDs. |
| `Connections` | Connection LUID; selected technology and endpoint metadata. |
| `Asset_Connections` | Connection owner joins for included asset types. |
| `Platform_Users` | Site-user LUID; explicit system-user email and native site role. |
| `Object_Users` | Raw repository user reference plus resolved site-user LUID, when available. |
| `Asset_Dependencies` | Empty result with headers; `NotCollected`. |
| `Directory_Users` | Empty result with headers; `NotCollected`. |
| `Coverage` | Nine dataset records; seven `Partial`, two `NotCollected`. |

These mappings use the documented repository relationships and LUID fields. Technical owner observations remain separate from approved business ownership. [Tableau 2026.2 dictionary](https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm)

Maintain identity with platform + instance + site + native type + native ID. Names and revisions do not identify enduring assets. Preserve `TableauUserLUID` for resolved platform identities and `TableauRepositoryUserID` for raw ownership references. Do not substitute one namespace for the other.

Join source email to corporate `Mail` using only `lower(trim(email))` in the configured tenant. Missing email or a failed match routes to Platform Manager. A Tableau role does not prove that an Office 365 account is enabled. Directory status comes from a separate accepted directory delivery.

## Completeness and NULL rules

All native lifecycle states are included. Compare counts with equivalent filters in Tableau; an active-only interface count may differ. Missing records cannot trigger absence reconciliation while coverage remains `Partial`.

Connection credential classification stays `Unknown`, and connection evidence stays `Partial`. `HasExtract` preserves the source boolean; it does not replace technology. A missing optional value stays SQL `NULL`. Potential URL or credential delimiters cause hostname omission and a diagnostic entry.

Missing user references remain in `Object_Users` with an explicit resolution state. Missing or repeated LUIDs appear in identity diagnostics; they must not be repaired with invented IDs. Inner-join relationship losses appear in relationship and membership diagnostics. Retain these exceptions even when the valid output count looks plausible.

The current profile excludes view-level assets, flows, full permission expansion, directory state, and inferred lineage. Embedded-datasource connection owners outside the included asset profile remain diagnostic exceptions. Do not mark all access or lineage evidence complete from these results.

`Coverage.RowCount` is the delivered data-row count. Header-only `NotCollected` datasets use `NULL` counts. The SQL computes counts in the same transaction but leaves collection status `Partial`. Promotion to `Complete` requires independent scope and count checks, accepted exceptions, and the existing acceptance process. Record that decision with the immutable delivered files.

## Validation status

The source field mappings were checked against the official 2026.2 dictionary. Static contract checks confirm all eleven exact result headers, read-only structure, key namespaces, and conservative coverage. These checks do not prove installed-column compatibility, query execution, performance, or source completeness. The platform team must execute the first delivery and compare its diagnostics before acceptance.
