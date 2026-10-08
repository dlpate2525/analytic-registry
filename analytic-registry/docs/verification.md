# V1 prototype verification

Release **1.0.0-prototype.1**, 8 October 2026. Tag: **v1.0.0-prototype.1**.

This review verifies the frozen prototype and offline handoff. It does not certify production workflows or live platform queries. The [baseline](v1-prototype-baseline.md) defines accepted scope. The [repair backlog](github-review-and-repair-plan.md) identifies deferred defects.

## Current release checks

| Area | Result and scope |
|---|---|
| Application suites | 119 domain/data, 31 workflow, and 36 audit checks passed. Passing fixtures do not close later counterexamples. |
| Collection tests | 27 Power BI inventory checks and one Alteryx synthetic fixture passed. No server was contacted. |
| TypeScript and Vite | Production build passed. The JavaScript bundle is approximately 505 kB, 150 kB compressed. Route splitting remains an improvement. |
| Release integrity | Package, lockfile, version, tag, resource paths, source hashes, built downloads, and local document links checked. |
| Excel template | 15 sheets; nine blank import tables; 117 columns; three platform output tabs; 28 layout sections. XML parses, headers match, and no formulas or error cells exist. |
| Purpose corrections | 40 column descriptions corrected for observed timestamps and Alteryx scope/identity/type. All other values, styles, tables, panes, and validation rules were preserved. |
| Collection ZIP | Every bundled file matches the current source bytes. The verifier rejects missing, extra, or stale members. |
| Model dictionary | 53 tables and 602 columns. Every purpose is present and below 200 words; the longest has 25 words. |
| App/browser review | Dashboard, five main sections, mapping columns, help, V1 resources, reference wording, and documentation page inspected on isolated port 5184. |
| Download review | Workbook and ZIP response bytes are checked against release hashes. HTML fallback cannot satisfy this check. |
| Responsive documentation | At 390 x 844, the documentation page stayed within the viewport. The override was reset. |

Local Node checks needed an unrestricted process because the Windows sandbox blocks user-information lookup. This affects test execution, not the application requirements.

## Release defects corrected

| Finding | Correction |
|---|---|
| App lacked current handoff links | Added shared Excel, query-pack, documentation, and baseline links. |
| Source, public documents, and preview could drift | Added a release preparation command that copies current artifacts and rewrites local links. |
| Collection ZIP held stale documentation | Added deterministic bundle rebuilding and byte-for-byte archive verification. |
| Directory links failed on static preview | Added a CSV-header index and required file or index targets in the link check. |
| Baseline download links followed mutable main | Pinned external workbook URLs to the V1 tag. |
| Version and sample dates were mixed | Kept release version/date, mock snapshot, standard-template version, and contract version separate. |
| Old text described decisions as open or implemented | Reconciled full documents and labeled confirmed requirements, partial behavior, and deferred implementation. |
| Generated text had corrupted separators | Restored Unicode arrows/separators and regenerated the model. |
| Build runtime was unspecified | Declared Node 22 or newer and documented reproducible install/build commands. |

Browser checks used a separate origin. User records on port 5173 were not reset. No requests were sent to platform teams. Screenshots show fictional prototype data.

## Reproduce the release checks

1. Run `python platform-data-collection/verify-delivery.py` from the repository root.
2. Run `npm ci` inside `analytic-registry` using Node 22 or newer.
3. Run `npm run check`.
4. Run `npm run build`, then `npm run check:release`.
5. Run the collector tests shown in the repository README.

After editing collection files, run `python platform-data-collection/build-bundle.py` before verification and app preparation. Build preparation updates public docs and downloads. Do not modify generated public copies independently.

Known limits remain: mock authorization, deferred approval/actor/assessment/group/Champion/lateness defects, manual SQL staging, and no live directory or platform validation. Alteryx installed-schema checks remain essential. A resolved disabled user stays distinct from an unresolved user. None of the frozen scripts automatically changes business accountability or registry bindings.

---

# Historical verification - 7 October 2026

The following record preserves the 7 October checks. Current release evidence is above. Later review found additional workflow defects; those remain in the repair backlog.

## Automated checks

| Area | Result | Scope |
|---|---|---|
| Domain and sample data | 119 passed | Registry relationships, fixtures, reconciliation, and classification behavior. |
| Workflow checks | 31 passed | Request, approval, closure, and annual-review guards. |
| Audit regression checks | 36 passed | Input validation, evidence freshness, correction history, assessments, date rules, and persistence conflicts. |
| Platform collection adapter | 26 passed | Stable native keys, renames, moves, missing evidence, cross-workspace lineage, coverage, CSV quoting, and SQL safety structure. |
| TypeScript and Vite build | Passed | Production assets generated successfully. |
| Column dictionary | 53 tables; 602 columns | Every purpose is populated and shorter than 200 words. Common audit fields are included. |
| Document links | 18 passed | Local Markdown links resolve in the documentation and collection folders. |

The Windows sandbox blocked Node user-information lookup and an esbuild parent-directory read. The same local checks passed outside that sandbox. This was an execution-environment limitation.

Vite reports one bundle above its 500 kB warning threshold: approximately 501 kB, or 149 kB compressed. Route-level code splitting remains a performance improvement. No measured performance target has been approved.

## Browser walkthroughs

Browser test writes used the separate `127.0.0.1:5174` origin. The user's records on port 5173 were not reset or used for test writes. All new walkthrough records are fictional.

| Process | Observed result |
|---|---|
| Workspace request | Blank progression was blocked. Five topics rendered. Standard groups included Champion, RW, R, and DS. Submission persisted. |
| Request correction | An administrator requested changes. A new draft received a new ID and linked to the original. The original became superseded. |
| Corrected implementation | The replacement received a technical approval, execution reference, and verification reference. It completed and disabled further approval actions. |
| Evidence closure | Closing without evidence was blocked. A populated evidence record and Platform Manager approval allowed closure. The completed review became read-only. |
| Annual review | Responses created a follow-up review. Application Owner approval completed the annual review with follow-up. The follow-up remained open. |
| Asset assessment | Complete plus Pending was rejected. Complete plus Approved saved a new assessment. Reload retained both the earlier assessment and the new record. |
| Work filters | Selecting Tableau and switching work views retained the platform selection. The All work count matched the three displayed rows. |
| Asset mapping | The registry displayed workspace mappings. Asset detail displayed native asset ID and connection lineage. |
| Product document | The rendered review pack and workspace-to-asset-to-connection diagram were visually inspected. |
| Narrow layout | At 390 × 844, dashboard content remained within the viewport. Navigation collapsed to icons. The temporary viewport override was reset. |

These walkthroughs complement the automated checks. They are not exhaustive browser, accessibility, security, or concurrency certification.

## Data collection boundaries

No collector connected to a Tableau repository, Power BI tenant, or Alteryx installation. Tableau queries require the team's schema preflight and confirmed project-content type values. Power BI pseudocode requires an approved identity and tenant scope.

The offline adapter preserves source IDs and emits the agreed staging columns. It does not assign registry UUIDs or import data into the app. A production ingestion service must resolve the native identity tuple, append observations, and preserve business declarations.

Validate native connection IDs across two real extracts before accepting them as durable keys. Keep unsupported or missing source relationships unresolved. Never substitute a display name for a missing native key.

See [audit findings and remaining context](audit-report.md), [requirements](requirements.md), and [the collection pack](../../platform-data-collection/README.md).
