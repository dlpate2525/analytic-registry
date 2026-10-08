# Tableau team — PostgreSQL first-pass export

The SQL targets the Tableau Server repository dictionary for 2026.2. Use a permitted read-only repository session. Repository access is a server administration setting; the team should manage it through its normal controls. [Repository access](https://help.tableau.com/current/server/en-us/perf_collect_server_repo.htm)

## Scope and grain

Export one Tableau site per delivery directory. Include all returned lifecycle states and preserve `NativeLifecycleCode`. Count workbooks as report assets. Published data sources are separate assets. Views are optional detail.

The queries use the published LUID fields as native IDs. Repository integer IDs only support same-site joins and a diagnostic crosswalk. Membership uses `projects_contents`; the dictionary marks `workbooks.project_id` and `datasources.project_id` deprecated. The repository can change between versions, so preflight is required. [2026.2 dictionary](https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm)

## Run in five steps

1. Confirm the installed Tableau build and the agreed server/site instance key.
2. Run `preflight.sql` with an existing approved read-only database connection.
3. Confirm each required column and the exact project-content type tokens.
4. Run `export.sql` from an empty delivery directory.
5. Validate row counts, keys, joins, and the manifest before returning the files.

The preflight emits table/column checks, site keys, and observed type tokens. Select the site LUID and confirm tokens using platform knowledge and sample ID relationships. The query deliberately does not assume their case or spelling.

```powershell
# Use your existing PostgreSQL connection service. Do not put passwords in scripts.
psql -X -v ON_ERROR_STOP=1 'service=tableau_registry_readonly' -f 'C:\path\platform-data-collection\tableau\preflight.sql'

# Run the export from a NEW empty delivery directory. It writes CSVs there.
# Replace every placeholder with values confirmed by the team.
psql -X -q -v ON_ERROR_STOP=1 `
  -v 'run_key=<new-collection-run-uuid>' `
  -v 'instance_key=<registry-agreed-server-key>|site=<site-luid>' `
  -v 'site_luid=<site-luid>' `
  -v 'observed_at=<collection-start-UTC-ISO-timestamp>' `
  -v 'workbook_content_type=<confirmed-workbook-token>' `
  -v 'datasource_content_type=<confirmed-datasource-token>' `
  'service=tableau_registry_readonly' `
  -f 'C:\path\platform-data-collection\tableau\export.sql'
```

The export is a single repeatable-read, read-only transaction with a two-minute statement timeout. `COPY ... TO STDOUT` writes through the client into the current directory. It does not write files on the database server. A query failure invalidates the delivery, even if earlier CSVs exist. Record the failed run, then retry into a new directory.

## Verify the sample

| Check | Acceptance rule |
|---|---|
| Asset IDs | Every row has a native LUID. No null or duplicate `(type, ID)` within the site. |
| Native namespace | UUID LUIDs remain LUIDs across runs. Integers never replace missing LUIDs automatically. |
| Asset count | Workbook rows match the workbook source count for the site and stated lifecycle scope. |
| Membership | Each returned project/content link has matching source IDs in the same site. Unlinked assets remain in the asset inventory. |
| Connection IDs | Every retained connection has a LUID. An unresolved ID requires staging review. |
| Direct lineage | Workbook/Datasource owner-type links resolve by IDs, not names or endpoint text. |
| Null evidence | A missing connection does not mean the workbook has no data source. |
| Date semantics | Repository timestamp columns are serialized as UTC. Record the extraction window separately. |

## Complete the manifest

Start with [the template](../samples/tableau-manifest.template.json). Set `CoverageStatusCode` for each dataset after validation. The initial template says `NotCollected`; it is not a claim that a run happened.

`WorkspaceInventory`, `WorkbookInventory`, `PublishedDatasourceInventory`, and `WorkspaceAssetMembership` can be `Complete` for the stated site/scope when queries and validation succeed. `Connections` can be complete for the repository's `data_connections` rows, while endpoint details remain nullable.

Keep `AssetConnectionLineage` **Partial**. These queries expose direct owner links. They do not establish every workbook → published data source → external source chain. Keep `AssetDependencies` **NotCollected** until another collector supplies those edges. Activity, effective access, directory membership, and credential identity are also separate collections.

For fuller lineage, the team can use the Tableau Metadata API and resolve its IDs to the exported native LUIDs. Confirm enablement, visibility, and schema through the site's GraphiQL interface. Do not join on captions. [Metadata API prerequisites and endpoint](https://help.tableau.com/current/api/metadata_api/en-us/docs/meta_api_start.html)

```text
# PSEUDOCODE for the follow-up lineage collector:
enumerate visible workbooks with native LUID and metadata graph ID
enumerate their upstream published data sources with native LUID
page through every result; keep permission/filter warnings
write (workbook LUID, published-source LUID, UsesPublishedDatasource)
resolve graph IDs to native LUIDs before merging with repository rows
mark incomplete or hidden relationships Partial
```

The initial pass should not query encrypted embedded fields, keychains, passwords, or arbitrary connection strings. `NativeOwnerID` is a technical Tableau repository user ID. It is not the business owner or a confirmed corporate directory ID.

## Maintenance

`build-sql.mjs` regenerates both SQL files from an explicit column allowlist. It uses Node.js built-in modules. Re-run preflight after a Tableau upgrade. Do not replace a failed join with a name join.
