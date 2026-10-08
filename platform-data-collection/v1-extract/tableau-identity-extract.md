# Tableau 2026.2 — identity extract handoff

Use the existing [inventory query](../tableau/export.sql) for workspaces, assets, connections, and their relationships. Run the [identity supplement](tableau-identity-export.sql) for the two additional identity files.

| Output | Workbook sheet | Grain |
|---|---|---|
| platform_users.csv | Platform_Users | One Tableau site-user record |
| object_users.csv | Object_Users | One object-to-user role reference |

Both files use the workbook's exact columns and order. They preserve existing native object IDs. The user will review the Excel data and load SQL Server manually.

## Native mapping

The source join is:

`owner_id / modified_by_user_id → users.id → users.system_user_id → system_users.id → system_users.email`

The user join also requires the object's `site_id` to equal `users.site_id`. The supplement retains `users.id` as `NativeRepositoryID` and `users.luid` as `NativePrincipalID`. `sites.luid` supplies `NativeScopeKey`. [Tableau 2026.2 dictionary](https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm)

Object_Users keeps the original integer in `SourcePrincipalReference`, labeled `TableauRepositoryUserID`. The resolved user LUID uses `TableauUserLUID`. A failed join keeps the original object and reference.

Project, workbook, and data-source owners use `TechnicalOwner`. Workbook and data-source modifiers use `ModifiedBy`. These tables do not provide a separate original-creator field. Older modifier values can equal the owner. Do not substitute either value for `CreatedBy`. [Tableau 2026.2 dictionary](https://tableau.github.io/tableau-data-dictionary/2026.2/data_dictionary.htm)

## Run

1. Create a new delivery directory.
2. Use the existing approved read-only PostgreSQL connection.
3. Supply the same agreed instance, site, and collection context used for the inventory delivery.
4. Supply the corporate directory tenant used for the later email match.
5. Run the supplement from that delivery directory.

```powershell
psql -X -q -v ON_ERROR_STOP=1 `
  -v 'run_key=<delivery-run-uuid>' `
  -v 'instance_key=<configured-server/site-key>' `
  -v 'site_luid=<site-luid>' `
  -v 'observed_at=<UTC-ISO-timestamp-with-Z>' `
  -v 'directory_tenant_key=<corporate-directory-tenant>' `
  'service=tableau_registry_readonly' `
  -f 'C:\path\tableau-identity-export.sql'
```

Preflight checks the required columns and site before writing CSVs. The transaction is read-only. Files are written by the client. The SQL is checked against the published dictionary; it has not run against your installed server. [Repository access guide](https://help.tableau.com/current/server/en-us/perf_collect_server_repo.htm)

## Review

Import native IDs and email values into Excel as Text. Use the workbook's agreed email join. Keep the raw `SourceEmail`; do not substitute login or display name.

`SourceStatus` contains a labeled Tableau site role. It is not Microsoft directory status. The supplement leaves `SourceDirectoryObjectID` empty.

Missing references, missing user LUIDs, missing email, duplicate email matches, unmatched email, and lookup failures go to the Platform Manager. `ReadyForEmailMatch` means only that source email is available.

Technical ownership does not overwrite the approved workspace business owner. This supplement does not change PRL, classification, risk rules, RunKey, or the existing timestamp contract.
