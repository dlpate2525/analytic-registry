# Verification record

Completed 7 October 2026, America/New_York. These checks apply to the local prototype and the offline collection adapter.

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

See [audit findings and remaining context](audit-report.md), [requirements](requirements.md), and the separate platform-data-collection folder.
