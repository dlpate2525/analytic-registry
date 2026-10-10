# Analytic Registry V1.1 data handoff

Contract 1.1; query revision 2, 9 October 2026. This is a query-first prototype contract. No live source or SQL Server query execution is claimed.

Download the [Excel template](analytic-registry-v1.1-extract.xlsx). It contains 11 input tables and 72 column positions. Nine data tables use 60 columns; shared run context and coverage use 12. The V1 layout used 117 repeated data-column positions. This is a 38% reduction including the new context tables, not a claim of 38% less source information.

The workbook includes a platform-specific dictionary, a complete V1 migration map, and Tableau_Output, PowerBI_Output, and Alteryx_Output reference tabs. Only `Tbl_Run_Context`, `Tbl_Coverage`, and the nine dataset tables are inputs. Reference tables are not inventory.

## Five-step delivery

1. Confirm the source instance, scope, query revision, and evidence time with Platform Manager.
2. Run the [platform queries](source-query-design.md) over the source database or supplied export.
3. Populate the named input tables and declare each dataset's coverage and row count.
4. Load [SQL staging](sqlserver-staging.sql) and review [validation results](sqlserver-validation.sql).
5. Review the comparison and identity exceptions before accepting the delivery into the registry.

The registry does not execute platform provisioning. Approved setup is implemented through the platform team's existing process. Record its evidence separately from the next platform observation.

## Sources

| Platform | Query input | Current boundary |
|---|---|---|
| Tableau | PostgreSQL repository tables, scoped to site | Read-only queries; installed 2026.2 repository and permissions must be verified. |
| Alteryx | [SQL Server copies of Gallery and Service](alteryx-sqlserver-mapping.md) through named mapping views | No Alteryx API or MongoDB execution. Validate exported columns and array storage against the supplied 2025.1 references and target 2025.2. |
| Power BI / Fabric | [Landed Fabric inventory](fabric-query-mapping.md), queried with Fabric SQL; DAX discovers the inventory model | First-pass inventory is Partial. An existing scan JSON export remains a richer SQL Server alternative. No API collector is introduced. |
| Directory | Authorized directory export | Separate evidence run. Join exact normalized SourceEmail to Mail within the configured tenant. |

Use [source-query-design.md](source-query-design.md) for official references, supported fields, query limitations, and platform handoff details. Do not publish raw Gallery/Service exports: they can contain credentials or other operational data. The delivered queries select metadata fields only.

## NULL and completeness

- Required missing key: quarantine the row. Never invent an ID or use its name.
- Conditional field: keep NULL when the source did not supply it. NULL never means false.
- Leave NULL: the selected mapping explicitly does not populate that field.
- Not collected: emit no dataset rows and declare NotCollected in Coverage. An empty sheet does not mean no objects exist.
- Unknown identity class: retain Unknown and Partial evidence. Do not conclude that credentials comply or fail.

AlteryxGallery collection ownership is different from workflow authorship. `appInfos.CreatedBy` is an author reference. `appInfos.ServiceId` can join the Service catalog, but that join does not prove current workflow ownership or expose workflow data connections.

## Keys and migration

The existing RunKey and ObservedAt retain their meanings. V1.1 moves common metadata to Run_Context. It adds no RunDate. RunKey is a delivery key, never an object key.

V1.1 is a header-breaking extract revision. Do not paste its narrower rows into V1 staging or reuse the V1 workbook importer. Start with the new workbook and `ar11_stage` schema. Keep the [117-field migration map](migration-map.json) with the first migration.

All nine dataset columns have explicit Power BI, Tableau, and Alteryx source/value/NULL rules in [contract.json](contract.json) and [column-dictionary.csv](column-dictionary.csv). Each description is under 200 words. IDs are text, including Mongo object IDs and Tableau repository integers.

Observed names and technical ownership never replace approved business names, owners, classifications, Champions, requests, or approvals. Read [monthly reconciliation](monthly-reconciliation.md) before accepting a refresh.

## Validation boundary

Local tests cover dictionary completeness, workbook structure, stable native keys, duplicate rejection, evidence ordering, and email matching. Source-schema validation, database execution, production authorization, and Power Apps import remain unverified. The React app still uses local mock data. The offline Canvas build is a separate unfinished deliverable and must follow this reviewed foundation.
