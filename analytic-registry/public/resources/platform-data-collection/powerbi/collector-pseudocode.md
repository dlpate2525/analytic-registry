# Power BI / Fabric: metadata collection

**Prototype release 1.0.0-prototype.1 — 8 October 2026. Intended Git tag: `v1.0.0-prototype.1`.**

[Download Excel workbook](https://github.com/dlpate2525/analytic-registry/raw/refs/tags/v1.0.0-prototype.1/platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx). Field contract 1.0 remains separate from this prototype release.

This page separates source API collection pseudocode from the implemented offline inventory adapter. It does not connect to your tenant. The [current workbook](../v1-extract/analytic-registry-v1-extract.xlsx) has 15 sheets, nine import tables with 117 columns, and three platform output reference tabs with 28 output sections in total. PowerBI_Output labels the six implemented inventory files separately from identity/directory pseudocode. Use the Power BI REST API `v1.0`. Do not invent a Fabric product version such as `2026.2` for this feed. Record the tenant, collection time, and API version. The scanner is a Power BI metadata interface within Fabric. [Scanner overview](https://learn.microsoft.com/en-us/fabric/governance/metadata-scanning-overview)

## Access and scope

The platform team should use its approved Fabric administrator identity or service principal. Delegated access uses `Tenant.Read.All`; service principal configuration follows separate tenant settings. Do not add delegated admin-consent permissions to a service principal based on that delegated scope. Request metadata and lineage access through the team's normal process. [PostWorkspaceInfo permissions](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-post-workspace-info)

For the first pass, select an explicit list of workspace IDs. Include the workspaces containing shared semantic models. Include personal workspaces only if the agreed inventory scope requires them. Save the original selection and exclusions with the run.

## API sequence

```text
GET https://api.powerbi.com/v1.0/myorg/admin/groups?$top=5000&$skip=0
GET https://api.powerbi.com/v1.0/myorg/admin/groups?$top=5000&$skip=5000
...continue until a page is smaller than the requested page size...

POST https://api.powerbi.com/v1.0/myorg/admin/workspaces/getInfo
     ?lineage=true&datasourceDetails=true
     &datasetSchema=false&datasetExpressions=false&getArtifactUsers=false
Body: { "workspaces": ["<workspace-guid>", "<workspace-guid>"] }

GET https://api.powerbi.com/v1.0/myorg/admin/workspaces/scanStatus/<scanId>
...poll until Succeeded or a terminal failure...

GET https://api.powerbi.com/v1.0/myorg/admin/workspaces/scanResult/<scanId>
```

Workspace enumeration supports `$top` up to 5,000 and `$skip`. It has a separate limit of 50 calls/hour or 15/minute. Record every page; a failed page makes tenant inventory partial. [GetGroupsAsAdmin](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/groups-get-groups-as-admin)

Submit batches of 1–100 workspace IDs. Use sequential batches initially. The scan submission limit is 500/hour and 16 concurrent requests. This inventory-only example excludes model expressions, model schema, and user lists. V1 identity collection is specified separately in the [identity handoff](../v1-extract/powerbi-identity-extract.md); those projections are not implemented by normalize-scan.mjs. [PostWorkspaceInfo](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-post-workspace-info)

```python
# PSEUDOCODE: implement request(), retry(), and secure artifact storage locally.
run = new_run_uuid()
requested_ids = approved_scope_from_all_enumeration_pages()
successful_results = []
failures = []

for batch in chunks(requested_ids, 100):
    try:
        scan_id = request("POST", scanner_url, body={"workspaces": batch})["id"]
        deadline = now_utc() + configured_scan_timeout
        while now_utc() < deadline:
            status = request("GET", status_url(scan_id))
            if status["status"] == "Succeeded":
                break
            if status["status"] == "Failed":
                raise CollectionFailure(safe_error_code(status))
            wait_with_backoff()
        else:
            raise CollectionFailure("ScanTimeout")

        result = request("GET", result_url(scan_id))
        validate_returned_workspace_ids(result, batch)
        successful_results.append(result)
        record_scan_receipt(scan_id, batch, "Succeeded", now_utc())
    except CollectionFailure as error:
        failures.append({"workspace_ids": batch, "error_code": error.code})
        record_partial_coverage(batch, error.code)

# Never pass failed or pending responses to normalize-scan.mjs.
# ExpectedWorkspaceIDs stays the full intended scope, including failed batches.
context = {
    "RunKey": run,
    "PlatformInstanceKey": tenant_id,
    "ObservedAt": now_utc_iso(),
    "StartedAt": run_started_at,
    "ScanStatus": "Succeeded",  # all INCLUDED result payloads succeeded
    "ExpectedWorkspaceIDs": requested_ids,
    "InventoryComplete": not failures and all_pages_succeeded,
    "LineageRequested": True,
    "DatasourceDetailsRequested": True
}
save_input_and_context_in_restricted_storage(successful_results, context)
save_failed_scan_receipts_separately(failures)
run_offline_normalizer()
```

Polling and result retrieval are separate endpoints. Check status before retrieving results. Use bounded retries for transient failures and honor `Retry-After` on throttling. Avoid retrying a submission indefinitely after an ambiguous timeout. Keep the original scan ID when available. [Scan status](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-status), [Scan result](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result)

## Run the offline normalizer

```powershell
node .\powerbi\normalize-scan.mjs .\scan.json .\context.json .\delivery\run-001
```

Use an empty directory for each delivery. The normalizer uses Node.js built-in modules. It generates six CSV files, `normalized.json`, and `manifest.json`. It does not generate Registry IDs.

Run the included fictional example:

```powershell
node .\powerbi\normalize-scan.mjs .\samples\powerbi-scan.json .\samples\powerbi-context.json .\delivery\example
node --test .\tests\normalize.test.mjs
```

## Mapping and limits

The adapter maps Report.createdById to NativeOwnerID and leaves CreatedByNativeID null. Microsoft describes createdById as the report owner ID. Preserve its source namespace; GUID shape is not proof of an Entra ID. The 27-check collector suite includes this ownership-versus-creator regression.

V1 matching remains normalized exact SourceEmail-to-directory Mail within the configured tenant after manual SQL staging. UPN is not a fallback. Route every unresolved case to Platform Manager. Keep existing RunKey/ObservedAt; there is no new run field or deployed Power Apps integration.


The mapping is `reports[].datasetId` → `datasets[].id` → `datasourceUsages[].datasourceInstanceId` → `datasourceInstances[].datasourceId`. `datasetWorkspaceId` identifies a different model workspace when returned. Omitted properties remain unknown. A gateway binding can be absent. [Scan result contract](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result)

The adapter treats `datasourceId` as the source identifier returned for the scan instance. Confirm this key remains stable across two extractions in your tenant. A blank ID produces an unresolved record warning; it does not trigger a name-based key. If an ID is only scan-scoped in the observed payload, hold that row in staging until the team establishes a stable alternate key.

Report-to-model edges remain separate from model-to-connection edges. The proposed `ObservedAssetDependency` table stores the first relationship. `ObservedAssetConnection` stores the second. The report's source list can be a derived view that traverses these edges. It must preserve the evidence path.

Paginated reports without a returned model reference stay in the inventory with unresolved source lineage. This adapter does not claim full paginated lineage, all Fabric items, effective access, usage metrics, or credential ownership. Missing evidence must not create a failed risk control.

Credentials, connection strings, model expressions, and arbitrary URLs are not copied to delivery files. The endpoint allowlist contains server and database only. Review source payload access and retention before storing raw results. CSV files are machine-import files; import text columns explicitly if reviewing them in Excel.
