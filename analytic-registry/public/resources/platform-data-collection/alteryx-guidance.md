# Alteryx 2025.2 — backend-only V1 collection

**Prototype release 1.0.0-prototype.1 — 8 October 2026. Intended Git tag: `v1.0.0-prototype.1`.**

[Download Excel workbook](https://github.com/dlpate2525/analytic-registry/raw/refs/tags/v1.0.0-prototype.1/platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx). Field contract 1.0 remains separate from this prototype release.

Use the [Excel workbook](v1-extract/analytic-registry-v1-extract.xlsx), [backend handoff](v1-extract/alteryx-backend-extract.md), and [MongoDB candidate extractor](v1-extract/alteryx-backend-extract.mongosh.js). The Alteryx_Output tab shows the exact output layouts. This release uses backend queries only.

The script reads allowlisted fields from AlteryxGallery.users, collections, appInfos, and optional subscriptions. It supplies platform users, collections, workflows, physical memberships, and object-user references. The user reviews the output and loads SQL Server manually.

## Version and ownership limits

Server 2025.2 maps to Gallery schema 79. The available field reference and its older-version link do not fully certify that schema. Run the included preflight against the installed backend. A passing type check confirms structure, not undocumented ownership meaning. [Schema crosswalk](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference.html), [Gallery fields](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxgallery-mongodb-schema.html)

Collection OwnerId is a technical-owner reference. appInfos.CreatedBy is original-author evidence. The query leaves current workflow ownership unresolved and preserves that exception for Platform Manager. Studio membership does not establish a unique current owner.

Keep collection CollectionId, workflow Mongo _id, user Mongo _id, and AD SID references in their proper namespaces. Never replace them with registry UUIDs or infer an email from their shape.

## Outputs

The extractor writes five datasets with potential rows: Workspaces, Assets, Workspace_Assets, Platform_Users, and Object_Users. Coverage stays Partial for this candidate, non-atomic multi-collection extract.

Connections, Asset_Connections, and Asset_Dependencies contain headers only and are NotCollected. Directory_Users is a separate corporate-directory extract and is not emitted by the MongoDB query.

Match explicit source email to directory Mail within the configured tenant after manual SQL staging. No UPN fallback is applied. Native account flags do not establish corporate directory status. All unresolved fields, users, and relationships go to Platform Manager.

Preserve the existing RunKey, ObservedAt, manifest, and supplemental evidence. Do not export complete MongoDB documents, credential fields, workflow packages, or secrets. One local MongoDB fixture test passes. No live backend execution or automatic registry loading is claimed.
