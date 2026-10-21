# Small platform samples for V1.1

These samples support local review before any GitHub publication. They contain synthetic business metadata only. They never connect to a platform.

Field shapes follow vendor references and the existing query contract. These records are not vendor-provided datasets or extracts from your installations. See [source evidence](source-evidence.md).

## Three scenarios for each platform

| Scenario | Delivery identity | Expected result |
|---|---|---|
| `initial` | First synthetic RunKey and observation time | New native objects are available for registration. |
| `identical-replay` | Identical RunKey, timestamp, and file bytes | Reference comparison returns Unchanged for previously known objects. |
| `changed-refresh` | New RunKey and later observation time | Renames retain registry identity; a new asset is New; an omitted asset is Not verified. |

All collected datasets remain `Partial`. `NotCollected` datasets contain headers only and use NULL row counts. No absence implies deletion or retirement.

| Platform folder | Source example | Coverage and deliberate cases |
|---|---|---|
| [Alteryx](alteryx/initial/delivery.json) | Gallery `collections`, `appInfos`, `users`, and Service `AS_Applications` | Two collections share one workflow. Current workflow owner remains unverified. One collection member cannot resolve. |
| [Tableau](tableau/initial/delivery.json) | PostgreSQL repository rows | A workbook moves projects. A SQL Server connection uses an extract. A project owner reference cannot resolve. |
| [Fabric](fabric/initial/delivery.json) | The organization-owned inventory adapter | Report and semantic model inventory only. User, connection, and lineage evidence remain uncollected. |

Each scenario contains `source-example.json`, `delivery.json`, and eleven CSV files. The CSV headers match the workbook's eleven input tables.

`source-example.json` shows source fields. `delivery.json` contains manually specified expected projections generated from the fixture descriptions. They are not results from executing SQL.

The [scenario checklist](validation-scenarios.json) records expected behavior and gaps. The [directory evidence](directory-evidence.json) provides separate, synthetic enabled and disabled accounts.

## Review in Excel

1. Create a test copy of the V1.1 workbook.
2. Select one platform and one scenario folder.
3. Import each CSV through **Data → From Text/CSV**.
4. Set all ID and namespace columns to Text before loading.
5. Copy each imported table into its matching workbook input table.

Do not combine scenarios in one workbook delivery. Empty CSV cells represent NULL in these fixtures; `delivery.json` preserves explicit JSON nulls. The sample does not use empty strings as real values.

The source JSON is a review aid, not a SQL Server loading script. Map your actual export tables through the existing platform guide.

## Run local checks

From the app folder, run `npx tsx scripts/platform-samples.check.ts`. The check reads the sibling collection pack and makes no database writes.

The check calls the existing `nativeKey`, `relationshipKey`, `compareDelivery`, and `resolveEmail` functions. It verifies:

- Exact contract columns, declared row counts, typed values, CSV parity, and fixture hashes.
- Native identity stability after renames, revisions, and project moves.
- Identical observations, new assets, and missing assets within partial deliveries.
- Duplicate rejection, source namespace separation, and older observation handling.
- Enabled, disabled, unknown, ambiguous, missing, and unmatched directory outcomes.
- Input immutability, including attached business metadata, during reference comparison.

`compareDelivery` only proposes comparisons. Its nonmutation check does not prove that a future database import preserves business fields.

The repeated unresolved owner remains visible in successive samples. Persistent case deduplication is **not yet tested** because no importer or case-upsert command exists here.

The same limit applies to persistent RunKey replay protection and transactional acceptance. Identical sample bytes do not prove database idempotency.

## Rebuild the fixtures

1. Run `python samples/build-samples.py` from the collection pack folder.
2. Run the app's sample check again.
3. Review changed fixture hashes and expected outcomes.

The builder only writes synthetic files under this sample folder. It does not call APIs or execute platform SQL.

## Installed-source checks remain separate

Alteryx targets 2025.2 but uses the selected 2025.1 field reference. Verify the real SQL export shape before claiming complete coverage.

Tableau content and owner tokens require installed verification. Fabric inventory model columns require discovery and mapping into the documented adapter.

These are source-specific validation steps, not additional product decisions. The sample-first approach keeps local development moving without claiming live validation.
