# Power BI / Fabric — V1 identity supplement

**Prototype release 1.0.0-prototype.1 — 8 October 2026. Intended Git tag: `v1.0.0-prototype.1`.**

[Download Excel workbook](https://github.com/dlpate2525/analytic-registry/raw/refs/tags/v1.0.0-prototype.1/platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx). Field contract 1.0 remains separate from this prototype release.

Use [PowerBI_Output in the current Excel workbook](analytic-registry-v1-extract.xlsx) for the exact output layouts. The workbook has 15 sheets, nine import tables with 117 columns, and three platform output reference tabs with 28 output sections in total. The nine import tables are empty; reference tabs do not contain extracted records. [V1 manual handoff](README.md).

This pseudocode prepares `Platform_Users`, `Directory_Users`, and `Object_Users` for the [empty V1 workbook](analytic-registry-v1-extract.xlsx). It supplements the [existing inventory instructions](../powerbi/collector-pseudocode.md). It does not modify or extend the existing offline adapter automatically. Authentication and execution stay with the platform team; no live source has been tested.

Use the exact headers and order below. Raw source identities remain distinct from corporate directory users. Email matching occurs in SQL after manual staging, as described in the [handoff](README.md). All unresolved cases go to Platform Manager.

## Documented source calls

```text
# Approved workspace scope and existing run context are inputs.
# API host: https://api.powerbi.com

POST /v1.0/myorg/admin/workspaces/getInfo
  ?lineage=true&datasourceDetails=true
  &datasetSchema=false&datasetExpressions=false&getArtifactUsers=true
Body: { "workspaces": [up to 100 approved workspace IDs] }

GET /v1.0/myorg/admin/workspaces/scanStatus/{returnedScanId}
GET /v1.0/myorg/admin/workspaces/scanResult/{returnedScanId}
# Retrieve only after successful status. Use bounded retries and honor throttling.

# Workspace access:
GET /v1.0/myorg/admin/groups/{workspaceId}/users

# Use these for missing/unavailable artifact-user payloads:
GET /v1.0/myorg/admin/reports/{reportId}/users
GET /v1.0/myorg/admin/datasets/{datasetId}/users
```

`getArtifactUsers=true` requests item-access users. Record missing or failed payloads separately from successful empty results. Plain inventory `users` properties must not be assumed complete. Dedicated endpoints return native access rights alongside principal data. [Scan request](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-post-workspace-info), [workspace users](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/groups-get-group-users-as-admin), [report users](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/reports-get-report-users-as-admin), [model users](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/datasets-get-dataset-users-as-admin)

Report `createdBy` and `createdById` are documented as technical owner fields. The latter is not automatically a verified Graph ID. `modifiedBy` and `modifiedById` concern the last modifier. Semantic-model `configuredBy` concerns its technical owner; the dataset contract provides no `configuredById`. Do not label these owners as original creators. [Scanner response](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result), [dataset definition](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/datasets-get-datasets-as-admin#admindataset)

## Platform_Users projection

The input `u` is an access principal returned by a documented endpoint or requested scan. `ctx` contains the existing platform RunKey/ObservedAt, tenant scope, and configured directory tenant. It does not generate new run fields.

```python
# PSEUDOCODE. Helpers and request handling must be implemented by the platform team.
# A missing value stays None. Never turn it into the string "None" or an invented ID.

def native_key(u):
    if nonblank(u.get('graphId')):
        return (u['graphId'], 'PowerBIGraphID')
    if nonblank(u.get('identifier')):
        return (u['identifier'], 'PowerBIPrincipalIdentifier')
    return (None, None)               # retain unresolved source evidence

def principal_type(u):
    value = u.get('principalType')
    return value if value in ['User', 'Group', 'App'] else 'Unknown'
    # Keep the raw payload, including native None/unknown values, for manager review.

def platform_user_row(ctx, u):
    principal_id, namespace = native_key(u)
    return ordered_row(
        RunKey=ctx.RunKey,
        PlatformCode='PowerBI',
        PlatformInstanceKey=ctx.PlatformInstanceKey,
        NativeScopeKey=ctx.NativeScopeKey,
        ObservedAt=ctx.ObservedAt,
        NativePrincipalID=principal_id,
        IdentifierNamespace=namespace,
        PrincipalTypeCode=principal_type(u),
        DisplayName=u.get('displayName'),
        SourceLogin=None,
        SourceEmail=u.get('emailAddress'),
        SourceStatus=None,
        SourceDirectoryObjectID=u.get('graphId'),
        DirectoryTenantKey=ctx.DirectoryTenantKey,
        NativeRepositoryID=None)
```

`SourceLogin` stays null because this payload does not explicitly identify a login field. The original `identifier` is preserved in Object_Users.SourcePrincipalReference and the raw delivery. `SourceEmail` uses only the explicit `emailAddress`. `SourceStatus` remains null because these access entries do not establish directory enabled state. A returned Graph ID remains source evidence; V1 does not silently switch email matching to an ID-based directory lookup.

Deduplicate identical principal records by instance, scope, namespace, native ID, and extract. Conflicting email, Graph ID, or type evidence must be retained and flagged for Platform Manager. Do not pick whichever value appeared last. If graphId becomes available after an earlier identifier-only extract, retain both source identifiers for manager-reviewed continuity; do not create an automatic email-based merge of historical platform keys.

Rows missing their required native key stay in the raw handoff evidence and unresolved review. They cannot become valid keyed registry rows until the manager resolves them. An App or Group email remains nonhuman evidence. It must not establish an accountable person.

## Object_Users projection — access rows

Keep one row per source object, principal reference, and native access level. Workspace and artifact access can coexist. An Admin or Owner permission does not assign a registry business owner.

```python
def access_row(ctx, obj, u, access_field):
    principal_id, namespace = native_key(u)
    source_ref = u.get('identifier')
    source_namespace = 'PowerBIPrincipalIdentifier'
    if not nonblank(source_ref):
        source_ref = u.get('graphId')
        source_namespace = 'PowerBIGraphID' if nonblank(source_ref) else None
    email = u.get('emailAddress')
    status = ('MissingSourceReference' if not nonblank(source_ref)
              else 'UnverifiedMapping' if principal_type(u) != 'User'
              else 'MissingEmail' if not nonblank(email)
              else 'ReadyForEmailMatch')
    return ordered_row(
        RunKey=ctx.RunKey,
        PlatformCode='PowerBI',
        PlatformInstanceKey=ctx.PlatformInstanceKey,
        NativeScopeKey=ctx.NativeScopeKey,
        ObservedAt=ctx.ObservedAt,
        NativeObjectType=obj.native_type,
        NativeObjectID=obj.id,
        ObjectDisplayName=obj.name,
        PrincipalRoleCode='Access',
        SourcePrincipalReference=source_ref,
        SourceReferenceNamespace=source_namespace,
        NativePrincipalID=principal_id,
        IdentifierNamespace=namespace,
        NativeRole=u.get(access_field),
        SourceEmail=email,
        SourceReferenceStatusCode=status)

for workspace in scan.workspaces:
    # Preserve the returned workspace native type, such as Workspace/PersonalGroup.
    for u in successful_workspace_access_payload(workspace.id):
        emit_Platform_Users(platform_user_row(ctx, u))
        emit_Object_Users(access_row(ctx, workspace, u, 'groupUserAccessRight'))
    for report in workspace.reports:
        report.native_type = 'Report'
        for u in successful_report_access_payload(report.id):
            emit_Platform_Users(platform_user_row(ctx, u))
            emit_Object_Users(access_row(ctx, report, u, 'reportUserAccessRight'))
    for model in workspace.datasets:
        model.native_type = 'Dataset'
        for u in successful_model_access_payload(model.id):
            emit_Platform_Users(platform_user_row(ctx, u))
            emit_Object_Users(access_row(ctx, model, u, 'datasetUserAccessRight'))
```

Record endpoint/scan provenance with the retained source delivery. Preserve unavailable native permissions as null; do not borrow workspace Admin to populate a report Owner value. Access rights are documented independently for [workspaces](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/groups-get-group-users-as-admin#groupuseraccessright), [reports](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/reports-get-report-users-as-admin#reportuseraccessright), and [models](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/datasets-get-dataset-users-as-admin#datasetuseraccessright).

## Object_Users projection — technical owner and modifier

Source IDs are retained exactly. Owner/modifier strings are not documented as guaranteed SMTP-address fields. The conservative V1 platform-side association below uses an explicit source `emailAddress` from one corresponding User entry. It does not call the directory or perform the later corporate match.

```python
def source_person_for_label(raw_label, object_users):
    # No display-name, UPN, identifier, partial, or first-result fallback.
    if not usable_email(raw_label):
        return None
    candidates = distinct_by_native_key([
        u for u in object_users
        if principal_type(u) == 'User'
        and usable_email(u.get('emailAddress'))
        and normalize_email(u['emailAddress']) == normalize_email(raw_label)])
    return candidates[0] if len(candidates) == 1 else None

def person_role_row(ctx, obj, role, raw_id, raw_label, id_namespace,
                    label_namespace, object_users):
    u = source_person_for_label(raw_label, object_users)
    principal_id, namespace = native_key(u) if u else (None, None)
    source_ref = raw_id if nonblank(raw_id) else raw_label
    source_namespace = id_namespace if nonblank(raw_id) else label_namespace
    status = ('MissingSourceReference' if not nonblank(source_ref)
              else 'UnresolvedUserReference' if u is None
              else 'MissingEmail' if not nonblank(u.get('emailAddress'))
              else 'ReadyForEmailMatch')
    return ordered_row(
        RunKey=ctx.RunKey,
        PlatformCode='PowerBI',
        PlatformInstanceKey=ctx.PlatformInstanceKey,
        NativeScopeKey=ctx.NativeScopeKey,
        ObservedAt=ctx.ObservedAt,
        NativeObjectType=obj.native_type,
        NativeObjectID=obj.id,
        ObjectDisplayName=obj.name,
        PrincipalRoleCode=role,
        SourcePrincipalReference=source_ref,
        SourceReferenceNamespace=source_namespace if nonblank(source_ref) else None,
        NativePrincipalID=principal_id,
        IdentifierNamespace=namespace,
        NativeRole=None,
        SourceEmail=u.get('emailAddress') if u else None,
        SourceReferenceStatusCode=status)

for report in all_reports:
    emit_Object_Users(person_role_row(
        ctx, report, 'TechnicalOwner', report.get('createdById'),
        report.get('createdBy'), 'PowerBIReportOwnerID',
        'PowerBIReportOwnerLabel', access_users_for(report)))
    emit_Object_Users(person_role_row(
        ctx, report, 'ModifiedBy', report.get('modifiedById'),
        report.get('modifiedBy'), 'PowerBIReportModifierID',
        'PowerBIReportModifierLabel', access_users_for(report)))

for model in all_models:
    emit_Object_Users(person_role_row(
        ctx, model, 'TechnicalOwner', None, model.get('configuredBy'),
        None, 'PowerBIDatasetConfiguredBy', access_users_for(model)))
```

This can leave former modifiers or owners unresolved when they no longer appear in access evidence. Keep their native reference and full raw source record; Platform Manager resolves the missing association. Do not manufacture a native owner ID from configuredBy. If the retained source has conflicting identity evidence, mark `UnverifiedMapping` and route the conflict, even when an email appears to match.

For inventory review, Power BI report `createdById` is technical-owner evidence for `NativeOwnerID`; it is not independently verified `CreatedByNativeID`. Do not populate creator from that field. Preserve the original raw source and document any manual projection applied to V1 Assets. The existing adapter is unchanged and its output needs this semantic review before loading.

## Directory_Users projection

The directory team supplies a separate approved user export. Do not filter out disabled accounts. Retain its own existing run key and observation time.

```http
GET https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled
```

```python
for page in follow_all_graph_next_links(initial_directory_url):
    for user in page['value']:
        emit_Directory_Users(ordered_row(
            RunKey=directory_ctx.RunKey,
            DirectoryTenantKey=directory_ctx.DirectoryTenantKey,
            DirectoryObjectID=user['id'],
            DisplayName=user.get('displayName'),
            Mail=user.get('mail'),
            UserPrincipalName=user.get('userPrincipalName'),
            AccountEnabled=(user['accountEnabled']
                            if isinstance(user.get('accountEnabled'), bool) else None),
            ObservedAt=directory_ctx.ObservedAt))
```

Follow every supplied next-page link. Required properties must be selected explicitly; missing account state stays null. [List users](https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0), [Graph paging](https://learn.microsoft.com/en-us/graph/paging), [user properties](https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0)

After manual staging, compare `lower(trim(SourceEmail))` with `lower(trim(Mail))` in the configured tenant. Accept exactly one distinct directory user ID. A disabled match remains resolved-disabled; failed or ambiguous resolution remains unresolved. No silent UPN fallback is permitted. Route all unresolved cases to Platform Manager.

## Handoff checks

- Every emitted record uses the contract's exact headers and column order.
- Native keys remain Text in Excel; nullable fields remain blank.
- A blank principal key is retained for exception review, never invented or loaded as a valid identity.
- `SourceDirectoryObjectID` comes only from the documented `graphId` field.
- Unknown principal types retain raw evidence and cannot become human owners.
- Duplicate/conflicting source rows do not silently replace each other.
- Object_Users preserves unresolved technical owner/modifier relationships.
- No account state is derived from permissions, recent activity, missing email, or a failed call.
- The delivery includes existing manifest/coverage evidence; partial results are explicit.
- No workbook formula, production importer, platform write, or unrelated app repair is included.
