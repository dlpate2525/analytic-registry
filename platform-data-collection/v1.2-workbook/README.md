# Analytic Registry workbook V1.2

Workbook revision 1.2 uses **input schema 1.1**. The 11 named input tables and all 72 input columns retain their names, order, types, and meaning. Continue to use `MappingVersion=1.1` in `Run_Context`.

Use [the V1.2 workbook](analytic-registry-v1.2-extract.xlsx) for the manual platform evidence handoff. Its 16 sheets contain one Guide, 72 common field definitions, 11 blank input tables, and three platform mapping references. The input tables include five blank template rows. Only the 11 `Tbl_` tables are inputs.

The common dictionary now defines each field once. The same [72 field definitions are available as CSV](column-dictionary.csv). Platform reference tabs retain source, applicability, value, and blank-handling rules. The historical migration sheet has moved out of the recurring workbook. Use the retained [V1.0-to-V1.1 migration map](../v1.1-extract/migration-map.json) when migrating older deliveries.

The [contract reference](contract.json) preserves schema 1.1. Workspace subtype is observed evidence rather than a durable workspace key. Current queries establish only Unknown connection credential classification.

Alteryx collection members preserve an available raw directory SID when UserId is absent. `ActiveDirectorySID` identifies that raw reference, not a Gallery user account. The SQL adapter leaves its resolved user fields blank and reports `UnresolvedUserReference`. A valid nonblank UserId takes precedence. Verify the installed export shape before acceptance.

1. Receive the immutable source delivery and its context.
2. Validate headers, keys, types, duplicates, coverage, and counts.
3. Match stable native and directory identities.
4. Compare observations while preserving business declarations and evidence dates.
5. Accept valid evidence through the registry operator and assign unresolved follow-up to Platform Manager.

Use the existing [query design](../v1.1-extract/source-query-design.md), [handoff instructions](../v1.1-extract/README.md), [SQL staging](../v1.1-extract/sqlserver-staging.sql), [validation](../v1.1-extract/sqlserver-validation.sql), and [monthly reconciliation](../v1.1-extract/monthly-reconciliation.md). All CSV templates, platform queries, and samples remain in the schema 1.1 directory.

Platform observations do not assign Workspace Owner, equal Champions, accountable workspace, or business risk declarations. The local application does not load SQL staging. Installed-source execution, SQL Server execution, and production ingestion remain unverified.

The previous workbook and schema artifacts remain unchanged for historical use.

Run `python verify-workbook.py` from this folder to verify the saved template without Excel or third-party Python packages. It compares all input headers, types, keys, blank rows, and platform mapping cells with the contract. It also checks worksheet order, named tables, dictionary CSV, and formula errors. This check does not execute platform queries or certify installed-source mappings.
