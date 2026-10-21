# Monthly reconciliation and identity

## Authority

| Information | Authoritative writer | Refresh action |
|---|---|---|
| Native ID, technical name, observed membership, native role | Platform export | Append a new observation; update current technical projection only from newer accepted evidence. |
| Person identity and enabled state | Directory export | Preserve tenant/object ID and timestamp; failed lookup never overwrites a successful status as inactive. |
| Workspace Owner, purpose, equal Champions, PII, EUCT, highest DMP tier | Approved business workflow | Never overwrite from source ownership or account metadata. |
| Requested configuration | Request workflow | Version submitted intent. |
| Implemented configuration | Platform team's recorded execution | Retain execution evidence and date. An approval is not execution. |
| Findings and evidence closure | Evaluator and authorized reviewer | Keep the same issue across repeated deliveries; closure requires the agreed role and specific approved evidence. |

## Identity keys

Use separate keys for separate grains:

1. **Registry ID:** permanent UUID for the registry entity. Do not regenerate it each month.
2. **Native object identity:** use platform + stable instance + native scope + object kind + native ID. Add native asset type for assets. Workspace subtype stays an attribute; connections retain their native connection namespace. Keep exact ID text. Names, email, month, membership, and RunKey are excluded.
3. **Source account identity:** source instance, native scope, identifier namespace, and native principal ID. Many user accounts can map to one Person. Groups and applications remain source principals; they never become people through an email match.
4. **Person identity:** directory tenant plus directory object ID. Email is matching evidence, never the durable person key.
5. **Delivery identity:** RunKey plus retained immutable source checksum and mapping revision.

Use structured tuples or length-safe serialization before hashing. A plain delimiter can collide with source values. A hash does not replace retained original key fields. Compare IDs with a binary/case-sensitive SQL collation where the source requires it; never lowercase native keys by habit.

Workspace/project/collection identity uses its stable native namespace. PersonalGroup is an observed workspace subtype, not a reason to create a new registry object. A native asset type defines its namespace. Platform migrations, repository rebuilds, and reused source IDs require a reviewed crosswalk; names are insufficient proof of continuity.

Tableau connection identity uses `data_connections.luid`, preserving the V1 key. Repository integer IDs are join references only. Retain server/site scope and require a reviewed crosswalk after migration. Tableau users retain `TableauUserLUID`; Power BI accounts retain `PowerBIGraphID` or `PowerBIPrincipalIdentifier`. A later Graph ID does not silently replace an existing identifier key.

## Five acceptance stages

1. **Receive:** retain the original projected files, checksum, RunKey, ObservedAt, source scope, and mapping revision. Reject a reused RunKey with changed content.
2. **Validate:** check headers, required keys, types, duplicate tuples, counts, and scope. Structural errors block the whole delivery. Keep every invalid row for correction. Classify absent relationship endpoints as unresolved references.
3. **Match:** match exact source keys to existing registry mappings; compare source email with exactly one directory Mail evidence row in its tenant.
4. **Compare:** calculate new, changed, unchanged, missing, and unverifiable rows without changing business declarations.
5. **Accept:** the registry operator records acceptance and appends observations in one transaction. Update current projections only from newer evidence. Assign unresolved cases to Platform Manager.

The registry operator is initially the product owner. Routine delivery acceptance needs no additional approval. Business approvals and approved evidence closure retain their separate requirements.

Accept structurally valid Partial deliveries and valid unresolved references. Do not silently drop invalid rows or accept selected datasets from a rejected delivery. Corrected source content requires a new RunKey. An identical retry retains the existing delivery identity.

The [SQL validator](sqlserver-validation.sql) returns `IssueClass`, `BlocksDelivery`, and `FollowUpOwner` with each diagnostic. Inspect every result set. Any `BlocksDelivery = 1` result blocks the whole staged delivery. `BlocksDelivery = 0` results retain unresolved references and route follow-up to Platform Manager. These diagnostics do not load or accept records.

Inventory availability and control readiness are separate. Valid Partial rows can support the registry's initial inventory. Only complete, sufficiently recent evidence supports controls that require full coverage. NotCollected and Failed remain unknown; neither means a valid empty inventory. Preserve the observation date for every retained value when a later delivery lacks usable replacement evidence.

The prototype's comparison function implements part of stages 2–4 without database writes. A transactional production loader, durable replay ledger, and scheduled runs are not implemented.

## Monthly scenarios

| Scenario | Required result |
|---|---|
| Same native key, new name | Keep Registry ID and declaration. Update observed name. |
| Same asset moves to another workspace | Keep Asset ID. End or compare the old membership and add the observed new membership. Do not move business accountability automatically. |
| One asset belongs to several Alteryx collections | Keep one asset and several physical membership edges. Preserve one declared accountable workspace. |
| New source ID, same name | New identity or explicit continuity review. Never fuzzy-merge. |
| Same source ID in two sites/tenants | Two source identities. |
| Identical retry | No duplicate objects, observations, or findings. Return the recorded acceptance result. |
| Changed payload with reused RunKey | Reject. Corrected delivery needs a new RunKey and an explicit supersedes reference in the acceptance ledger. |
| Same observation time, changed attributes | Conflicting evidence; review before replacing current values. |
| Late older extract | Preserve history; never roll current evidence backward. |
| Duplicate/conflicting object keys | Block the whole delivery. Keep every source row for correction. Do not choose first/last silently. |
| Valid relationship with an absent endpoint | Accept the structurally valid delivery. Retain the raw reference and assign Platform Manager. |
| Partial inventory with valid rows | Accept the inventory; keep unavailable controls explicit. Do not infer missing objects are deleted. |
| Missing from Partial, Failed, or NotCollected dataset | Unable to verify. Preserve current evidence with its original age. |
| Missing from verified Complete snapshot | Mark missing and investigate. Never delete automatically or assume compliant closure. |
| Source account email changes | Retain SourceIdentity ID; review new email evidence against directory identity. Never reassign a historical approval. |
| Exact email matches a disabled directory account | Resolved-disabled; Platform Manager reviews accountability. |
| No match, duplicate mail, missing tenant, or failed lookup | Unresolved or unable to verify; Platform Manager. |

Monthly collection supports a monthly control statement only. It cannot establish continuous access compliance or immediate leaver removal. Time-critical identity and access changes remain with platform/IAM controls; the registry records their follow-up evidence. Show evidence age beside every reconciliation result.

## Retention and finding identity

Keep six calendar months of superseded business-metadata history. Preserve current records, accepted native-key mappings, open work, and evidence required by active approvals or findings. A retention job must not cause the next monthly load to allocate new IDs.

Finding identity uses stable rule identity, object identity, and issue discriminator. RunKey identifies an occurrence, not a new finding. Repeated observations update one open case; a cleared issue can later reopen with a new occurrence. Failed collection never closes it.

Unresolved SQL diagnostics expose `FollowUpKey` and `RunKey` separately. `FollowUpKey` contains a versioned issue code, source scope, and relevant native references. Each value has a byte-length prefix, which prevents delimiter collisions. Native case remains unchanged. The key excludes RunKey, observation date, display names, SourceEmail, and directory Mail attributes. A native principal reference remains verbatim, including sources that use an email-shaped identifier. A changed native reference requires identity review; it is not equivalent to a changed email attribute.

For manual follow-up, find the case by `FollowUpKey` before creating one. Attach each new RunKey as occurrence evidence. An identical retry must not add the same occurrence twice. Keep the delivered rows available through Dataset and ImportRowID. These columns describe staging diagnostics; they do not alter the workbook contract. A persistent case service is not implemented.

Retention scheduling, a transactional production loader, and persistent operator acceptance are operational implementation work. This document does not claim those jobs exist.
