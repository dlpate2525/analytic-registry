# Alteryx 2025.2 — keep the same delivery contract

The requested report queries cover Power BI and Tableau. Alteryx can use the same staging columns when its team provides a workflow inventory. A collection maps to an observed workspace; a workflow maps to an asset. Preserve multiple collection memberships without assigning multiple business owners.

Prefer the team's existing approved export or read endpoints in Server API V3. V3 exposes collections and workflows. Match the installed server's API help before using an endpoint or response field. No workflow execution, upload, or change operation is needed for this inventory. [Server API V3](https://help.alteryx.com/current/en/server/api-overview/alteryx-server-api-v3.html)

If the team uses MongoDB, confirm the exact product build and database schema first. The current online schema reference describes newer releases and must not be treated as a verified 2025.2 schema. The 2025.2 release notes also identify a mismatch in the older Server Usage Report schema file. [2025.2 release notes](https://help.alteryx.com/release-notes/en/release-notes/server-release-notes/server-2025-2-release-notes.html), [current schema reference](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxservice-mongodb-schema.html)

```text
# PSEUDOCODE; collection and property names require installed-schema verification.
read the verified workflow inventory with its stable workflow IDs
read collections with their stable collection IDs
read collection-to-workflow links by IDs
read supported connection metadata using an explicit non-secret field allowlist
export to assets, workspaces, workspace_assets, connections, asset_connections
record unsupported or uncollected lineage as NotCollected or Partial
```

Use one server instance key. Keep source workflow IDs distinct from registry `AssetID` values. Retain MongoDB `_id` only in its explicit namespace; do not assume it equals the API workflow ID. Verify an ID-to-ID crosswalk before combining feeds.

Do not export workflow packages, encrypted credential fields, connection secrets, or whole MongoDB documents. Do not infer a workflow's data lineage merely because it belongs to a collection. A missing supported connection reference stays unresolved.

The first sample should show one collection, two workflows, their native IDs, and their physical memberships. A second extract should demonstrate that the IDs remain stable. The registry team can then confirm the mapping before the team expands the scope.
