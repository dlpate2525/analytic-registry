# Local consistency review

20 October 2026. The clear defects are repaired locally. No GitHub operation or external deployment ran.

The review compared the five primary sections and administration pages with the approved workflows and glossary.
It included independent request, asset, and complexity reviews, followed by a fresh review of the combined changes.

## Repaired inconsistencies

| Issue | Observed before repair | Current behavior |
|---|---|---|
| Approved business requests | A prior technical change could block an approved business-only request. Daily and batch settlement differed. | Application validates business responsibility without comparing frozen technical context against a newer configuration. Submission remains strict. |
| Approval recovery | Malformed optional approval history reached the UI and caused a runtime error. | Loading enters recovery and preserves the original saved content. |
| Workspace search | Global search changed the URL while the list retained its previous search and platform filters. | URL parameters own the filters. Search, Back, reload, and Clear filters agree. |
| Workspace counts | Both dashboard counts included retired records that their destination lists hid. | The two inventory counts use the same retirement predicate as the list. Retired open work remains visible. |
| Reviewer display | The dashboard always displayed Priya Shah, even when a different reviewer was recorded. | The dashboard resolves the recorded reviewer and retains unresolved IDs. |
| Orphan terminology | The dashboard called discovered workspaces and unassociated assets orphaned without a confirmed finding. | Metrics say Unregistered workspaces and Assets without an accountable workspace. Historical Findings remain unchanged. |
| PRL guidance | Reference data still described manual PRL without calculation. | It describes PRL-01 and identifies earlier manual records as historical evidence. |
| Owner labels | Review cases and annual packets used Business owner as an alternative owner label. | They use Workspace Owner and identify the historical context. Packet contents and approval role keys remain unchanged. |
| Connection technology | Extract and blank values displayed differently on workspace and asset pages. | One display function separates extract processing from source technology and shows blank technology as Undefined. Raw values remain intact. |
| Evidence readiness | A workspace summary implied comparison readiness from inventory coverage. | The summary reports workspace inventory status. It does not establish access evidence coverage. |

## Removed complexity

Workspace filters now have one source of truth instead of six separate state values that could disagree with the URL.
One shared display rule replaces two connection interpretations.

Removed two unused foundation exports and their obsolete compatibility comment.
Removed the unused asset-table option and a pass-through version function.
Asset and workspace work counts now reuse the same open-status predicate.

No stored columns, tables, or migration rules changed.
Legacy assessments, approval receipts, native identity, and bookmarked routes remain supported.

The Laziness Protocol principle kept repairs within existing modules.
Model the Domain put filters and connection meanings behind one interpretation.
Prove It Works required failing evidence and direct workflow checks before a repair counted as complete.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Baseline application checks | 1,086 passed | [Baseline log](../.scratch/poteto-review-2026-10-20/baseline-checks.log) |
| Final application checks | **1,139 passed** across 15 suites | [Final log](../.scratch/poteto-review-2026-10-20/final-checks.log) |
| TypeScript and local build | Passed | [Build log](../.scratch/poteto-review-2026-10-20/build.log) |
| Existing main workflows | 24 browser assertions passed | [Workflow results](../.scratch/poteto-review-2026-10-20/browser-workflows.json) |
| Existing edge cases | 20 browser assertions passed | [Edge results](../.scratch/poteto-review-2026-10-20/browser-edge-cases.json) |
| New consistency regressions | 16 browser assertions passed | [Regression results](../.scratch/poteto-review-2026-10-20/browser-regressions.json) |
| Connection and evidence repairs | 24 browser assertions passed | [Display results](../.scratch/poteto-review-2026-10-20/asset-probes/browser-repair.json) |
| Broad page inspection | 32 page and profile combinations, no runtime errors | [Page results](../.scratch/poteto-review-2026-10-20/browser-after.json) |
| Independent review | Repairs checked against the actual diff and evidence | [Review verdict](../.scratch/poteto-review-2026-10-20/final-review.md) |

The 84 browser assertions ran in isolated Chrome contexts.
The checks used the 1366 by 768 canvas and retained the existing smaller-viewport scaling test.
They did not reset or write to the user's browser profile.

The request regressions verify unchanged approval keys, receipts, native identity, technical configuration, and group records.
They also verify that inactive proposed responsibility and missing approvals still block application.

For example, the new request check failed before the repair with:

```text
Daily settlement applies an approved business-only request after technical context changes
```

The repaired request suite reported:

```text
90 Champion request policy checks passed.
```

The recovery check changed from:

```text
FAIL: Malformed optional approvals triggers recovery
```

to:

```text
41 audit checks passed; 0 failed.
```

The original connection render probe is retained as before-repair evidence.
Use the current view suites and `asset-probes/browser-repair.mjs` for regression testing.
Browser scripts now wait for rendered controls after navigation. Immediate URL reads can precede React's display update.

## One policy decision remains

Late approval precedence remains unchanged.
An older request can receive approval after a later-dated request has already taken effect.
The current projection orders by the requested effective date, while each receipt records when approval permits effectiveness.

For example, requests ask for 21 and 22 October.
The first request receives its final approval on 23 October.
The current implementation keeps the request dated 22 October as the current projection.

Decide whether the requested date or actual effective date should determine precedence in that situation.
This review does not invent that rule or rewrite historical receipts.

Annual scheduling, retirement operations, freshness thresholds, and additional shared-case policy remain open.
Live platform queries, SQL ingestion, production authorization, and Power Apps import remain unverified.

## Local handoff

Open the [local application](http://127.0.0.1:5180/).
The running development server serves the current source.

The [decision trail](../.scratch/poteto-review-2026-10-20/decisions.tsv) records scope choices and evidence.
The [changed-file manifest](../.scratch/poteto-review-2026-10-20/changed-files.json) lists the local changes.
The source checkpoint remains in `.scratch/poteto-review-2026-10-20/before-review.zip`.

Screenshots show the [dashboard](../.scratch/poteto-review-2026-10-20/after-dashboard.png),
[inventory evidence](../.scratch/poteto-review-2026-10-20/asset-probes/workspace-overview-repaired.png),
and [connection display](../.scratch/poteto-review-2026-10-20/asset-probes/asset-connection-repaired.png).

Independent reviewers used the configured inherited model.
This was not a review across different model families.
