# Delivery contract and column dictionary

Version 1.0. This is an ingestion contract for the proposed relational model. The collectors return source keys. The registry resolver supplies foreign keys and internal UUIDs. The running prototype does not yet ingest these files.

All purposes below are shorter than 200 words. Types describe the staging/import value, not vendor storage types. `text(n)` maps to `nvarchar(n)` in the proposed SQL design. Native IDs are text even when they look numeric. Keep UUID-shaped IDs as exact source strings.

## File conventions

- Use UTF-8 CSV with a header, or the equivalent JSON arrays from the adapter.
- Use exact, case-sensitive column names. Keep names and values separate.
- In CSV, a blank nullable cell means null. In JSON, use `null`.
- Use UTC ISO 8601 timestamps with an offset. Convert them to UTC before storing `datetime2`.
- Keep one row at each stated grain. Do not repeat an asset once per source connection.
- Validate length limits before loading. Reject or quarantine overlong values; never truncate identity keys.
- Import CSV strings as text. Do not use spreadsheet auto-conversion for keys or execute cell formulas.

## Common columns — all six primary CSV files

| Column | Type | Required | Purpose / destination |
|---|---|---|---|
| `RunKey` | UUID string | Yes | Platform team's correlation key for this delivery. Registry ingestion maps it to `ExtractRunID`; it is not automatically the registry UUID. |
| `PlatformCode` | text(30) | Yes | `PowerBI` or `Tableau` in this pack. Resolve through `Platform.Code`; agree code aliases before loading. |
| `PlatformInstanceKey` | text(200) | Yes | Stable tenant or server/site scope key. Resolves `PlatformInstance.NativeInstanceKey`. Never use a mutable display name. |
| `NativeScopeKey` | text(200) | Yes | Namespace for source IDs. Power BI uses tenant ID; Tableau uses site LUID. Resolves `RegistryObject.NativeScopeKey`. |
| `ObservedAt` | UTC datetime | Yes | Collection evidence time. Maps to `ObservedWorkspace.ObservedAt` and the extract dataset timestamp. Retain it for other snapshot rows through `ExtractRun`. |

## `workspaces.csv` — one native workspace/project

| Column | Type | Required | Purpose / destination |
|---|---|---|---|
| `NativeWorkspaceID` | text(200) | Yes | Source workspace GUID or project LUID. Resolves `RegistryObject.NativeObjectID` and then `WorkspaceID`. |
| `NativeRepositoryID` | text(200) | No | Tableau integer `projects.id` for diagnostic joins and a verified alternate-ID ledger. Staging-only; never replaces the LUID. Null for Power BI. |
| `NativeWorkspaceType` | text(50) | Yes | Native object class: `Workspace`, `PersonalGroup`, or `Project`, as returned or agreed. Maps to `RegistryObject.NativeObjectType`. |
| `DisplayName` | text(200) | Yes | Current technical label. Maps to `ObservedWorkspace.DisplayName`. Does not overwrite the declared business name. |
| `NativeOwnerID` | text(200) | No | Technical Tableau user repository ID. Resolve with site scope to `Principal`, then `ObservedWorkspace.NativeOwnerPrincipalID`. Not a business-owner assertion. |
| `NativeLifecycleCode` | text(40) | No | Native state, such as active or archived. Maps to `ObservedWorkspace.NativeLifecycleCode`. Keep the native vocabulary. |
| `CapacityKey` | text(200) | No | Power BI capacity reference when returned. Maps to `ObservedWorkspace.CapacityKey`. |

The resolver creates a `Discovered` workspace stub only after an identity check. It records the real ingesting service in `CreatedByService`, or an authorized person in `CreatedByPersonID`. Registration adds business context later. It must not invent a human creator from a native owner.

## `assets.csv` — one native asset

| Column | Type | Required | Purpose / destination |
|---|---|---|---|
| `NativeAssetID` | text(200) | Yes | Power BI report/model ID or Tableau workbook/published-source LUID. Resolves `RegistryObject.NativeObjectID`, then `AssetID`. |
| `NativeRepositoryID` | text(200) | No | Tableau `workbooks.id` or `datasources.id`. Diagnostic alternate ID only. Null for Power BI. |
| `NativeAssetType` | text(50) | Yes | Identity namespace: `Report`, `Dataset`, `Workbook`, or `PublishedDatasource`. Maps to `RegistryObject.NativeObjectType`. |
| `AssetTypeCode` | text(50) | Yes | Agreed display classification: `Report`, `Paginated Report`, `Semantic Model`, `Workbook`, or `Published Data Source`. Maps to `Asset.AssetTypeCode`. |
| `DisplayName` | text(200) | Yes | Current source label. Maps to `ObservedAsset.DisplayName`; not an identity key. |
| `NativeVersionReference` | text(100) | No | Tableau revision when returned. Maps to `ObservedAsset.NativeVersionReference`. It does not automatically create a business `AssetVersion`. |
| `CreatedByNativeID` | text(200) | No | Verified original-creator reference only. Power BI Report.createdById is technical-owner evidence and must not populate this field. Preserve the creator's source namespace before assigning `ObservedAsset.CreatedByPrincipalID`. |
| `ModifiedByNativeID` | text(200) | No | Native last-modifier identifier. Resolve to `ObservedAsset.ModifiedByPrincipalID`. Tableau uses a repository user ID; Power BI may expose a GUID. |
| `NativeOwnerID` | text(200) | No | Technical owner reference: Power BI Report.createdById or Tableau repository owner_id. Preserve the native value, platform scope, and identifier namespace before resolving `ObservedAsset.NativeOwnerPrincipalID`. Do not infer an Entra ID from GUID shape or assign accountable business ownership. |
| `CreatedAtNative` | UTC datetime | No | Source creation timestamp. Maps to `ObservedAsset.CreatedAtNative`. Unknown timezone remains unresolved. |
| `ModifiedAtNative` | UTC datetime | No | Source last-change timestamp. Maps to `ObservedAsset.ModifiedAtNative`. It does not mean last viewed. |
| `NativeLifecycleCode` | text(40) | No | Native lifecycle state. Maps to proposed `ObservedAsset.NativeLifecycleCode`. Missing Power BI report state remains null. |

Microsoft documents WorkspaceInfoReport.createdById as the report owner's ID, despite its field name. It is not proof of the original creator. [WorkspaceInfoReport reference](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result#workspaceinforeport).

## `workspace_assets.csv` — one observed physical membership

| Column | Type | Required | Purpose / destination |
|---|---|---|---|
| `NativeWorkspaceID` | text(200) | Yes | Resolve the source workspace within this instance and scope. Maps to `ObservedWorkspaceAsset.WorkspaceID`. |
| `NativeAssetID` | text(200) | Yes | Resolve the member asset using its native type. Maps to `ObservedWorkspaceAsset.AssetID`. |
| `NativeAssetType` | text(50) | Yes | Disambiguates equal ID text across object classes. Part of the asset resolution key. |
| `NativeAssociationType` | text(40) | Yes | `ContainedIn` or `ProjectContent` in these adapters. Maps to `ObservedWorkspaceAsset.NativeAssociationType`. |

Do not insert these rows into declared `WorkspaceAsset`. A business decision establishes the one accountable workspace. Physical memberships can be multiple.

## `connections.csv` — one native connection

| Column | Type | Required | Purpose / destination |
|---|---|---|---|
| `NativeConnectionID` | text(200) | Yes | Tableau data connection LUID or returned Power BI source-instance ID. Resolve to `ConnectionID`. Missing or unstable IDs require review. |
| `NativeRepositoryID` | text(200) | No | Tableau integer connection ID. Keep in the alternate-ID staging ledger for traceability only. |
| `NativeConnectionType` | text(50) | Yes | `DataConnection` or `DatasourceInstance`. Maps to `RegistryObject.NativeObjectType`. |
| `DisplayName` | text(200) | Yes | Source caption when available. The Power BI adapter uses an explicit technology-and-ID label when no supported name is provided. Maps to `ObservedConnection.DisplayName`. |
| `TechnologyCode` | text(40) | Yes | Source technology, such as Oracle or SQL Server. Null source types become `Undefined`. Preserve other vendor values for mapping review. Maps to resolved `DataSource.TechnologyCode`. |
| `ServerHostname` | text(255) | No | Allowed endpoint host from the source. Maps to `DataSource.ServerHostname` after endpoint resolution. Do not merge by host alone. |
| `Port` | integer | No | Connection port when exposed. Maps to `DataSource.Port`. Do not invent a default. |
| `DatabaseName` | text(200) | No | Source database or provider-specific database identifier. Maps to `DataSource.DatabaseName` after validation. |
| `HasExtract` | boolean | No | Tableau extract indicator. True can coexist with Oracle/SQL Server technology. Staging-only pending a dedicated observed mode field. Power BI remains null. |
| `AuthenticationTypeCode` | text(40) | No | Tableau native authentication method when present. Maps to `ObservedConnection.AuthenticationTypeCode` after vocabulary validation. Missing does not imply anonymous access. |
| `IdentityClassificationCode` | text(40) | Yes | `Unknown` for this pass. Maps to `ObservedConnection.IdentityClassificationCode`. Later identity evidence may support a service/personal classification. |
| `GatewayID` | text(200) | No | Power BI gateway binding when supplied. Maps to `ObservedConnection.GatewayID`. A blank binding is valid unknown/unbound evidence. |
| `NativeStatusCode` | text(40) | No | Source state or explicitly labeled adapter category `Observed`/`Misconfigured`. Maps to `ObservedConnection.NativeStatusCode`. It is not a risk conclusion. |
| `EvidenceStatusCode` | text(30) | Yes | `Observed` for the row's captured facts. Maps to `ObservedConnection.EvidenceStatusCode`. Dataset coverage controls what absences can mean. |

Canonical `DataSourceID` is assigned by the registry. Resolve endpoints using environment, technology, host, port, database, and schema/locator when available. Keep unresolved endpoints unlinked. Never hash an all-null endpoint into one shared data source. Do not infer authentication identity from the connection type or the presence of a gateway.

## `asset_connections.csv` — one directly observed usage edge

| Column | Type | Required | Purpose / destination |
|---|---|---|---|
| `NativeAssetID` | text(200) | Yes | Direct consumer asset. Resolve to `ObservedAssetConnection.AssetID`. |
| `NativeAssetType` | text(50) | Yes | Asset identity namespace used for resolution. |
| `NativeConnectionID` | text(200) | Yes | Referenced native connection. Resolve to `ObservedAssetConnection.ConnectionID`. |
| `EvidenceStatusCode` | text(30) | Yes | Row-level observation status. Maps to the matching observed edge. |

`ObservedAssetConnection.DataSourceID` can be filled from the resolved connection snapshot. Do not duplicate a report-to-model path as a direct report-to-connection fact. A reporting view can derive that path separately.

## `asset_dependencies.csv` — one asset dependency edge

| Column | Type | Required | Purpose / destination |
|---|---|---|---|
| `NativeAssetID` | text(200) | Yes | Consumer, such as a report. Resolve to proposed `ObservedAssetDependency.ConsumerAssetID`. |
| `NativeAssetType` | text(50) | Yes | Consumer native type. Part of its identity key. |
| `UpstreamNativeAssetID` | text(200) | Yes | Provider, such as a semantic model. Resolve to proposed `ObservedAssetDependency.ProviderAssetID`. |
| `UpstreamNativeAssetType` | text(50) | Yes | Provider native type. May require a supplemental inventory for Dataflow or Datamart. |
| `UpstreamNativeWorkspaceID` | text(200) | No | Source-reported provider location. Helps collect missing provider inventory. It is not part of the durable Power BI asset key. |
| `RelationshipCode` | text(40) | Yes | `UsesSemanticModel` or `DependsOn` in the Power BI adapter. Maps to `DependencyTypeCode`. |
| `EvidenceStatusCode` | text(30) | Yes | Captured edge evidence. Maps to proposed `ObservedAssetDependency.EvidenceStatusCode`. |

Hold an edge in staging if the provider has not been resolved. Do not fabricate a provider name or declared membership to satisfy a foreign key. The proposed dependency table is part of the logical design; it is not implemented as a production database in the prototype.

## `views_optional.csv` — Tableau detail

Includes the five common columns plus:

| Column | Type | Required | Purpose |
|---|---|---|---|
| `NativeViewID` | text(200) | Yes | Native view LUID. Retain independently of the workbook LUID. |
| `NativeRepositoryID` | text(200) | Yes | Repository integer view ID for diagnostic joins. |
| `NativeWorkbookID` | text(200) | Yes | Parent workbook's LUID. |
| `DisplayName` | text(200) | Yes | Current view label. |
| `NativeViewType` | text(50) | No | Native sheet type; preserve the vendor's value. |
| `NativeVersionReference` | text(100) | No | View revision. |
| `ModifiedAtNative` | UTC datetime | No | Source last-change timestamp. |
| `NativeLifecycleCode` | text(40) | No | Source lifecycle state. |

The first pass holds these rows in staging. A later design may register views as child assets and retain a `PartOfWorkbook` dependency. That would be an explicit scope decision.

## Manifest and coverage

| Field | Type | Purpose / destination |
|---|---|---|
| `ContractVersion` | text(30) | Delivery column version; ingestion validation. |
| `RunKey` | UUID string | External delivery identity, mapped to an internal `ExtractRunID` through the ingestion ledger. |
| `PlatformCode` | text(30) | Resolves the platform lookup. |
| `PlatformInstanceKey` | text(200) | Resolves the tenant or server/site instance. |
| `NativeScopeKey` | text(200) | Source identity namespace. |
| `EnvironmentCode` | text(30) | Registry-agreed environment; platform instance/reference configuration. Required before final endpoint resolution. |
| `ProductVersion` | text(40), nullable | Exact installed build when relevant. Power BI cloud feed stays null unless the team has an authoritative build value. |
| `APIVersion` | text(30), nullable | Power BI `v1.0`; collection metadata, not the product build. |
| `CollectorVersion` | text(50) | Script/adapter version. Maps to `ExtractRun.CollectorVersion`. |
| `StartedAt` | UTC datetime | Collection start. Maps to `ExtractRun.StartedAt`. |
| `CompletedAt` | UTC datetime, nullable | Collection completion. Maps to `ExtractRun.CompletedAt`. |
| `ObservedAt` | UTC datetime | Evidence reference time for the dataset. |
| `RunStatusCode` | text(30) | `Complete`, `Partial`, or `Failed` for an executed run. `NotStarted` is template-only. Maps to `ExtractRun.RunStatusCode`. |
| `ScopeDescription` | text(1000) | Inventory boundaries, lifecycle filters, included item types, and exclusions. Maps to `ExtractRun.ScopeDescription`. |
| `EvidenceURI` | text(1000), nullable | Approved internal evidence location. Maps to `ExtractRun.EvidenceURI`; never include a token-bearing URL. |
| `Datasets[].DatasetCode` | text(50) | Identifies inventory, membership, connections, lineage, or another dataset. Maps to `ExtractDataset.DatasetCode`. |
| `Datasets[].ScopeKey` | text(200) | Site or workspace scope to which this dataset's coverage applies. Maps to `ExtractDataset.ScopeKey`. |
| `Datasets[].CoverageStatusCode` | text(30) | `Complete`, `Partial`, `NotCollected`, or `Failed`. Maps to `ExtractDataset.CoverageStatusCode`. |
| `Datasets[].RowCount` | integer, nullable | Validated delivered rows. Zero means a successful empty result; null means unavailable/not counted. |
| `Warnings[]` | structured list | Code, subject key, and safe explanation. Retain in ingestion evidence; summarize within `ExtractRun.ErrorSummary` limits. |

The Power BI context additionally carries `ExpectedWorkspaceIDs`, `InventoryComplete`, `LineageRequested`, `DatasourceDetailsRequested`, and `ScanStatus`. They are collector controls. `ScanStatus` must be `Succeeded` for every included result. Keep failed/pending scan receipts in the run log. An API's successful status does not establish complete coverage of every dataset.

## Fields this pass deliberately does not supply

Business owner, owner LOB, Champions, purpose, PII/EUCT declarations, highest DMP tier, approved configuration, expected groups, PRL assessment, and approval outcomes come from their governed workflows. Runtime, refresh duration, consumers, last activity, credential identity, effective access, and measurement windows need separate validated evidence. No collector fills these with guessed values or zeros.

The remaining schema extension decisions are the alternate native-ID ledger, extract mode on observed connections, and optional view grain. Keep the related fields in durable staging until those decisions are implemented.
