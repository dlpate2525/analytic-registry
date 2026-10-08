# Stable IDs and refresh rules

**Prototype release 1.0.0-prototype.1 — 8 October 2026. Intended Git tag: `v1.0.0-prototype.1`.**

[Download Excel workbook](https://github.com/dlpate2525/analytic-registry/raw/refs/tags/v1.0.0-prototype.1/platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx). Field contract 1.0 remains separate from this prototype release.

The platform teams supply source IDs. Separate registry IDs remain in the target model. V1 uses the [current Excel handoff](v1-extract/README.md) and manual SQL staging/loading; the React app does not perform these refreshes. Keep both identity systems.

## Identity crosswalk

| Key | Owner | Example / meaning |
|---|---|---|
| `ObjectID` / `AssetID` / `WorkspaceID` / `ConnectionID` | Registry resolver | Internal UUID; stable for the object's registry lifetime. |
| `NativeObjectID` | Source platform | Report GUID, Tableau LUID, Alteryx CollectionId, or workflow Mongo _id. |
| `NativeObjectType` | Collector contract | Disambiguates report, model, workbook, project, collection, workflow, and connection namespaces. |
| `NativeScopeKey` | Collector contract | Power BI tenant ID, Tableau site LUID, or the configured Alteryx scope from the existing manifest. |
| `PlatformInstanceID` | Registry configuration | Foreign key for the tenant or agreed server/site instance. |
| `NativeRepositoryID` | Tableau repository | Integer used to join tables locally; retain as an alternate identifier with its namespace. |

The proposed `RegistryObject` unique key is:

```text
(PlatformInstanceID, NativeScopeKey, NativeObjectType, NativeObjectID)
```

For Power BI, a report's current workspace is a membership field. Moving the report must not change its key. For Tableau, the instance includes the server/site identity. Never merge equal LUID text from different servers or sites without a reviewed migration record.

## Do not change namespaces silently

Use Tableau LUIDs as the main key and repository integers as traceable alternate IDs. If a LUID is absent, quarantine the row. A legacy integer-based integration can use an explicitly versioned `RepositoryWorkbookID` namespace, but converting that integration to LUIDs requires an ID-to-ID crosswalk and approval. Matching display names is insufficient.

The core model stores one canonical native identity. Retain an ingestion ledger for alternative identifiers:

```text
ObjectNativeIdentifier (proposed ingest-side ledger, not an existing app table)
  PlatformInstanceID uuid
  NativeScopeKey text(200)
  IdentifierNamespace text(50)   # TableauWorkbookLUID, TableauRepositoryWorkbookID
  IdentifierValue text(200)
  ObjectID uuid
  VerifiedByRunID uuid
  ValidFrom UTC datetime
  ValidTo UTC datetime null
  unique active(instance, scope, namespace, value)
```

An alternative is to preserve a verified immutable crosswalk file in the ingestion evidence store. Do not make the source teams guess internal `AssetID` values.

## Confirmed V1 person matching and retention

Use Platform_Users.SourceEmail and Directory_Users.Mail for normalized exact matching within the configured tenant. Accept exactly one distinct directory user ID. Preserve the raw emails and source principal namespace. Do not fall back to UPN, login, or display name. All unresolved rows and relationships go to Platform Manager. A later email change cannot silently transfer an existing binding to a different directory person.

This approved person-matching rule does not change object identity. Object refreshes continue to use the full scoped native-ID tuple, never email or names. Technical ownership does not assign business accountability. Unknown identity evidence is not inactive account evidence.

Keep six calendar months of historical metadata. Current records, active approval/evidence dependencies, open-work evidence, and native-ID mappings required for refreshes remain available. No automatic history purge is implemented in this prototype.

Keep the existing RunKey, ObservedAt, and manifest contract. Directory evidence retains its own extraction context. No RunDate field or automatic live resolver is introduced.

## Future transactional refresh design

```python
# Transactional ingestion design, NOT code currently running in the prototype.
validate_contract_version(delivery)
validate_required_keys_types_lengths_and_utc_dates(delivery)
validate_duplicate_rows_and_dataset_coverage(delivery)
assert_no_secrets_in_allowlisted_payload(delivery)

instance = resolve_configured_instance(platform_code, platform_instance_key)
run = resolve_delivery_run(instance.id, external_run_key)
if run.already_committed:
    require_same_delivery_content_hash()  # same run cannot acquire new facts
    return previous_receipt

with transaction():
    persist_run_and_coverage_even_if_partial(run, manifest)
    for row in workspace_asset_connection_inventory:
        native_key = (instance.id, row.scope, row.native_type, row.native_id)
        object = lookup_registry_object(native_key)
        if object is None:
            # Existing requested objects may have no native ID yet.
            binding = lookup_approved_provisioning_receipt(native_key)
            object = bind_request_object(binding) if binding else new_internal_uuid()
            create_discovered_identity_and_matching_subtype(object, native_key)
        append_observed_snapshot(run.id, object.id, row)
        record_verified_alternate_ids(object.id, row.repository_id)
        update_seen_timestamps_without_overwriting_business_intent(object, run)

    for link in membership_connection_dependency_rows:
        resolved = resolve_all_ends_by_native_key(link)
        if resolved:
            append_observed_relationship(run.id, resolved, link.evidence)
        else:
            hold_link_in_staging_and_record_partial_coverage(link)

    # No writes to business declarations or expected access from this feed.
    # Resolve technical owners through scoped principals and reviewed V1 email bindings.
    # Never invent a Person, overwrite business ownership, or infer approval.
    finalize_import_receipt_and_content_hash(run)
```

## Refresh outcomes

| Situation | Required behavior |
|---|---|
| Same native key, new name | Same internal object; append a snapshot with the new name. |
| Same Power BI asset, different workspace | Same internal object; append changed observed membership. |
| New native ID, same name | New discovered object or a reviewed migration binding. Never auto-merge by name. |
| Delete and recreate | New native identity creates a new object. Preserve the old object's history. |
| Restored database / changed instance namespace | Stop automatic matching until the team verifies instance continuity and an ID crosswalk. |
| Duplicate key with conflicting labels in one delivery | Reject that identity or the batch; do not let row order decide. |
| Upstream model outside selected workspaces | Preserve the unresolved native dependency and collect its workspace. Do not fabricate a provider asset. |
| Missing object in partial/failed scan | Keep prior identity and history. Mark current evidence incomplete. |
| Missing object in a validated full scoped inventory | Record a missing observation or lifecycle candidate. Do not hard-delete the registry object. |
| Explicit native archived/deleted state | Preserve the state as observed evidence. Business retirement remains a governed decision. |

Absence requires a complete dataset for the same instance, scope, object types, lifecycle filter, and collection period. A complete workbook list cannot establish complete connections or permissions. A report that uses a shared model outside scope must remain unresolved for source controls until that path is observed.

## Manual delivery acceptance and future refresh checks

1. Compare native IDs for an unchanged sample across two extractions.
2. Confirm a renamed item retains its internal registry ID after ingestion.
3. Confirm a moved Power BI report changes membership without duplicating the asset.
4. Confirm a partial extract leaves missing objects unresolved and does not delete them.
5. Confirm a newly created item with a reused name receives a separate identity.
