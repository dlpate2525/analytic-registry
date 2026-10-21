# Local build handoff — 20 October 2026

The authorized V1.1 local build is complete. All four approved Requests choices are implemented.
Nothing was pushed to GitHub, released, or deployed externally.

Open the [local application](http://127.0.0.1:5180/).
The preview runs on this computer. It stops if the computer or process stops.

The [approved workflows](v1.1-approved-workflows.md) describe current behavior.
Older release documents remain historical references.

## What changed

| Area | Result |
|---|---|
| Navigation and appearance | Five primary sections, white backgrounds, purple accents, restrained coral, and a 1366 × 768 canvas |
| Workspaces | Five list columns and five detail tabs; equal Champions; explicit business-line provenance; honest evidence gaps |
| Assets | Five list columns and four detail tabs; accountable workspace; inherited responsibility; explicit connection details |
| Evaluations | Four steps; completed records only; calculated PRL-01; no asset attestation or approval queue |
| Business versions | Material business changes create an explicit version; previous evaluations and actors remain intact |
| Accountability | Champion confirms initial association; Platform Manager records a documented transfer or correction |
| Requests | Three steps for business-only changes; five when technical work is needed |
| Approvals | One eligible Champion approves business declarations, Workspace Owner, and Champion changes |
| Platform imports | Five-step reference walkthrough, linked Excel template, query references, and scope-aware comparison examples |
| Excel and queries | Current contract, workbook, dictionary, Tableau queries, validation queries, and local downloads agree |

Custom and technical approvals remain separate. Eligible self-approval remains supported.
Champions have equal business authority. Their responsibility does not imply platform access.

The `_DS` group remains part of technical setup.
It supports connection creation and maintenance, subject to each platform's roles.

## Defects found and resolved

- New request commands could omit the Champion policy. They now enforce it.
- Skipped effective dates could leave approved responsibility changes unapplied. Due changes now settle chronologically before authorization.
- Eligible Champions could miss their approval task. My work and Business view now expose the action.
- Incomplete source evidence could imply a valid control conclusion. Missing coverage now stays explicitly unverified.
- Unlinked Findings could disappear from open-work counts. Counts include them without duplicating linked cases.
- Unknown asset types could acquire an inferred platform type. Unknown values now remain unknown.
- Unresolved Owner or Champion IDs could disappear from the display. The app preserves them visibly.
- Backdated recordings could overwrite newer asset context. Date guards now preserve the current projection and historical evidence.
- Malformed new history collections could enter saved state. Recovery now preserves the original saved content.
- Connection technology could be confused with extract status. Tableau preserves native technology and a separate `HasExtract` value.
- Partial deliveries could lack an exact row count. Validation now checks their delivered count.
- The first load produced a large JavaScript bundle warning. Separate loading for administration pages removed that warning.

## Validation

| Check | Result and evidence |
|---|---|
| Domain, workflow, compatibility, and page checks | **1,086 passed** across 15 suites; [log](../.scratch/local-build-2026-10-20/final-checks.log) |
| TypeScript | Compilation passed in the same validation run |
| Local build | Passed; no large-chunk warning; [build log](../.scratch/local-build-2026-10-20/build.log) |
| Main browser workflows | **24 passed**; [results](../.scratch/local-build-2026-10-20/browser-workflows.json) |
| Browser edge cases | **20 passed**; [results](../.scratch/local-build-2026-10-20/browser-edge-cases.json) |
| Page inspection | Eight pages rendered at 1366 × 768 with no browser runtime errors |
| Canvas scaling | 1024-pixel viewport preserved the 1366 × 768 design coordinates |
| SQL validation logic | 114 synthetic scenarios exercised 104 diagnostic queries through the local predicate harness |
| Query references | 50 Tableau static checks and 44 existing query checks passed |
| Workbook | 4,729 reference cells verified; 17 sheets, 17 tables, 11 blank inputs, 72 input headers |
| Local downloads | All 163 files matched canonical files, public copies, HTTP responses, and ZIP entries |

Browser checks used isolated temporary profiles. They did not open, reset, or overwrite the user's saved browser data.

The browser workflows covered saving and reloading evaluations, Champion self-approval, and separate business and technical work.
They also covered association transfers, unresolved identities, stale-tab protection, recovery, and retired-workspace visibility.

Historical approvals and legacy assessments remain readable. New records use optional collections without inventing historical evidence.
Final passing JSON files supersede intermediate test failure captures retained in the scratch folder.

SQL checks establish local structural and rule consistency. They do not prove compatibility with installed source databases.

The workbook authoring tool saved and rendered the file, then crashed during shutdown.
Independent ZIP integrity and exact saved-cell checks passed. See the [extract validation details](../.scratch/local-build-2026-10-20/extract-alignment.md).

## Local artifacts and changed files

| Artifact | Location |
|---|---|
| Excel delivery template | [Current workbook](../../platform-data-collection/v1.1-extract/analytic-registry-v1.1-extract.xlsx) |
| Platform query pack | [Current local ZIP](../public/resources/platform-data-collection/analytic-registry-v1.1-local-extract.zip) |
| Query and column guidance | [Extract README](../../platform-data-collection/v1.1-extract/README.md) |
| Source changes | [Checkpoint comparison](../.scratch/local-build-2026-10-20/changed-files.json) |
| Resource hashes | [Download manifest](../.scratch/local-build-2026-10-20/local-resource-manifest.json) |
| Workspace implementation | [Files and rules](../.scratch/local-build-2026-10-20/workspaces.md) |
| Asset implementation | [Files, compatibility, and review repairs](../.scratch/local-build-2026-10-20/assets.md) |
| Requests implementation | [Files, approval policy, and checks](../.scratch/local-build-2026-10-20/requests.md) |
| Validation scripts | [Local check runner](../.scratch/local-build-2026-10-20/validate-local.ps1), [browser workflows](../.scratch/local-build-2026-10-20/browser-workflows.mjs), [browser edge cases](../.scratch/local-build-2026-10-20/browser-edge-cases.mjs) |

Shared changes also cover persistence validation, effective responsibility, work queues, terminology, styling, and resource links.
The source comparison records added and modified application, test, and documentation files against the preserved checkpoint.

The pre-build checkpoint is at `work/local-build-checkpoints/before-build-20261020-010931.zip` under the task folder.
Existing resource copies were backed up before synchronization. Historical source snapshots and release archives were not regenerated.

Workbook SHA-256: `94473204f0d779d95a3acfb8637edce7c945f449eef6fc8827f8c32a29642a73`.

## Suggested morning review

1. Open Workspaces and select Servicing analytics.
2. Inspect the five tabs and equal Champions.
3. Open an asset and inspect Governance & risk.
4. Record a completed evaluation to review PRL and version behavior.
5. Create an Update Existing request to inspect the three-step business flow.
6. Enable technical changes to inspect Setup and Groups & access.
7. Open Administration, then Platform imports, to inspect the Excel and query links.

These interactions save changes in the browser profile used for the review.
The isolated browser tests did not prepopulate that profile with test transactions.

### Screenshots

[Workspace overview](../.scratch/local-build-2026-10-20/workspace-overview.png) ·
[Saved evaluation](../.scratch/local-build-2026-10-20/asset-governance-saved.png) ·
[Champion approval](../.scratch/local-build-2026-10-20/champion-request-approved.png) ·
[Platform imports](../.scratch/local-build-2026-10-20/imports.png).

## Remaining boundaries

This is a browser-local React prototype. Production authorization and transactional SQL persistence remain separate implementation work.
There is no live importer, persistent delivery replay protection, recurring-case engine, or retention service.
The offline Power Apps package remains unfinished; no import-tested `.msapp` is claimed.

Live Alteryx exports, Tableau PostgreSQL, Fabric inventory, and directory services have not been tested.
The queries need validation against the installed platform schemas before operational use.

Annual Attestation response policy and scheduling, retirement operations, freshness thresholds, and additional shared-case rules remain open.
This build preserves existing behavior without inventing those decisions.

The authorized overnight scope is complete. The follow-up schedule was deleted; the local preview remains available.
