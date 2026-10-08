# Alteryx Server 2025.2: backend extract handoff

**Prototype release 1.0.0-prototype.1 — 8 October 2026. Intended Git tag: `v1.0.0-prototype.1`.**

[Download Excel workbook](https://github.com/dlpate2525/analytic-registry/raw/refs/tags/v1.0.0-prototype.1/platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx). Field contract 1.0 remains separate from this prototype release.

Use [Alteryx_Output in the current Excel workbook](analytic-registry-v1-extract.xlsx) for the exact output layouts. The workbook has 15 sheets, nine import tables with 117 columns, and three platform output reference tabs with 28 output sections in total. The nine import tables are empty; reference tabs do not contain extracted records. [V1 manual handoff](README.md).

Use the MongoDB collections below to produce the first registry delivery. The companion `alteryx-backend-extract.mongosh.js` performs read-only projections and writes local files. It uses the existing manifest's `RunKey` and `ObservedAt` unchanged.

The output fits the shared workbook and supports a manual SQL Server staging load. Send every unresolved field, identity, or relationship to the Platform Manager.

## Backend sources and outputs

| MongoDB source | Workbook destination | Purpose |
|---|---|---|
| `AlteryxGallery.users` | `Platform_Users` | Native user key, source email, display name, login, and labeled account flags. |
| `AlteryxGallery.collections` | `Workspaces` | Collection identity, name, and observed collection owner. |
| `AlteryxGallery.collections.Apps[]` | `Workspace_Assets` | Every observed collection-to-workflow link. |
| `AlteryxGallery.collections.OwnerId` and `Users[]` | `Object_Users` | Collection technical ownership and directly observed access. |
| `AlteryxGallery.appInfos` and `Revisions[]` | `Assets`, `Object_Users` | Workflow identity, selected published revision, name, and original author. |
| `AlteryxGallery.subscriptions` | Supplemental evidence | Studio context only; it does not establish workflow ownership. |

These collections and fields are documented in the [official MongoDB field reference](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxgallery-mongodb-schema.html). The extractor uses an explicit field allowlist.

## Version check

The official crosswalk maps Server 2025.2 to Gallery schema **79** and Service schema **8**. The current field reference covers schema 80. Its link labeled 2025.2 opens a 2025.1 page describing schema 72. Therefore, these are documented candidate queries requiring the included preflight; they are not a verified schema-79 extract. [Crosswalk](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference.html), [linked version page](https://help.alteryx.com/20251/en/server/configure/database-management/mongodb-management/mongodb-schema-reference.html)

Preflight checks the selected fields and their types across the retrieved documents. It stops extraction on incompatible required fields or unexpected types. A passing result establishes structural compatibility only. It cannot prove an undocumented ownership interpretation.

## Ownership and identity rules

`collections.OwnerId` is documented as the collection owner's user ID. Join it to the exact text representation of `users._id`. Copy `users.Email` into the corresponding `Object_Users.SourceEmail` after a unique native-key match.

`appInfos.CreatedBy` is documented as the original author. The Mongo search index's `OwnerId` is also described as the creator. Neither proves the workflow's current technical owner. The extractor therefore leaves `Assets.NativeOwnerID` blank. It adds an `Object_Users` row with `PrincipalRoleCode=TechnicalOwner`, a blank principal, and `SourceReferenceStatusCode=UnverifiedMapping`. [Mongo field definitions](https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxgallery-mongodb-schema.html)

The original author remains a separate `CreatedBy` relationship. Revision `AuthorId` and publication time remain in supplemental evidence. They are not relabeled as current owner, last modifier, or extraction time.

A studio can contain several users. Matching `appInfos.SubscriptionId` with `users.SubscriptionId` identifies studio association, not a unique workflow owner. Do not select the first matching user. [Shared studio behavior](https://help.alteryx.com/current/en/server/use-alteryx-server-ui/schedules--server-user-interface/share-a-schedule.html)

Use `IdentifierNamespace=AlteryxMongoUserID` for `users._id`. Preserve collection `CollectionId` separately from its Mongo `_id`. Preserve AD SIDs as SID references; never invent an email from them. A unique SID-to-user crosswalk may resolve a user assignment. Group assignments remain unverified until membership evidence is supplied.

After manual SQL staging, compare normalized `Platform_Users.SourceEmail` with `Directory_Users.Mail` within the configured tenant. Directory Mail preserves Microsoft Graph `mail`. Accept one distinct directory user ID. Do not substitute login, name, or a presumed email domain. Native Active, Locked, Validated, and Pending flags remain labeled source evidence. They do not establish corporate directory status or employment.

## Run the extract

1. Place the script, `workbook-contract.json`, and the existing manifest in one working folder. Use an approved read-only MongoDB connection.
2. Save the runner below. Set the corporate directory tenant and the existing server/scope identifiers. Start with `Mode: 'preflight'`.
3. Run the runner through `mongosh`. Review its field/type report. Assign incompatible fields to the Platform Manager before changing the mapping.
4. Change Mode to `extract`. Choose an empty output folder. Run the same runner with the same manifest metadata.
5. Import the CSV files into the corresponding workbook sheets. Load validated rows into SQL Server staging manually. Retain exceptions and supplemental evidence with the delivery.

Example `run-alteryx-extract.mongosh.js`:

```javascript
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf8'));
globalThis.REGISTRY_ALTERYX_CONTEXT = {
  DatabaseName: 'AlteryxGallery',
  Mode: 'preflight',
  RunKey: manifest.RunKey,
  PlatformInstanceKey: manifest.PlatformInstanceKey,
  NativeScopeKey: manifest.NativeScopeKey,
  ObservedAt: manifest.ObservedAt,
  DirectoryTenantKey: '<corporate-directory-tenant>',
  ContractPath: './workbook-contract.json',
  OutputDirectory: './alteryx-delivery'
};
load('./alteryx-backend-extract.mongosh.js');
```

Execute with your configured read-only connection:

```text
mongosh <approved-connection-options> --file run-alteryx-extract.mongosh.js
```

The script makes these source reads with the detailed projections defined near its top:

```javascript
gallery.getCollection('users').find({}, projections.users);
gallery.getCollection('collections').find({}, projections.collections);
gallery.getCollection('appInfos').find({}, projections.appInfos);
gallery.getCollection('subscriptions').find({}, projections.subscriptions);
```

The optional subscriptions read runs only when that collection exists. The joins happen in the extractor using source IDs. It performs no source updates, inserts, deletes, or database output stages.

## Delivery contents

The script writes `platform_users.csv`, `object_users.csv`, `workspaces.csv`, `assets.csv`, and `workspace_assets.csv`. Headers follow the shared contract exactly. Keep every native ID and email as text when importing into Excel.

Connections, Asset_Connections, and Asset_Dependencies contain headers only. Directory_Users is not emitted by this backend query and must come from the separate directory extract. `dataset-coverage.json` marks connections, asset-connection lineage, asset dependencies, and effective access as `NotCollected`. Empty files must not be treated as successful empty inventories.

Additional files are:

- `preflight.json`: observed field types and validation outcome, written in extract mode. Preflight mode prints its report without creating a delivery.
- `exceptions.json`: unresolved cases assigned to the Platform Manager.
- `supplemental-evidence.json`: revision authors, studio associations, and native access flags.
- `normalized.json`: the same workbook rows in JSON form.
- `dataset-coverage.json`: coverage entries for the existing manifest.

The initial coverage stays Partial because these are candidate mappings and separate collection reads are not an atomic snapshot. Preserve coverage in the existing manifest. Do not use an incomplete delivery to infer removed objects or users.

Rows with missing required values or overlong strings stay in the staging delivery and receive exceptions. Hold those rows from the final load. Do not silently truncate keys or discard unresolved ownership.

The local candidate extractor has one passing MongoDB fixture test. The extractor has not been run against the organization's MongoDB server or real platform data. Its output requires the stated preflight and first-delivery review.
