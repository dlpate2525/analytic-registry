# Publication notes

Prepared 7 October 2026 for the public analytic-registry repository.

- Generalized the deployment host references in source, generated documentation, and the compiled preview.
- Inspected all 11 existing PNG screenshots. They contain the prototype's fictional sample data and generic product branding.
- Preserved the original screenshots as a design history; older screens are not the current specification.
- Included the application source, tests, docs, HTML guides, CSV dictionary, diagrams, collection scripts, fixtures, and both downloadable bundles.
- Excluded installed dependencies, local build caches, raw conversation attachments, browser-storage exports, credentials, and scratch investigation files.
- Regenerated the 53-table documentation and rebuilt the prototype before packaging.
- Local checks: 119 domain/data checks, 31 workflow checks, 36 audit checks, and 26 collector checks passed.
- The build passed with a roughly 501 kB JavaScript bundle warning. Code splitting remains an improvement.
- Scanned text and nested ZIP contents for excluded organization identifiers, local home paths, and common credential patterns. No matching publication content remained.

The artifact manifest lists a SHA-256 digest for each published file except the manifest itself and Git metadata. GitHub Actions repeats the application and collector checks after publication. Its results are separate from the completed local checks.

No live platform SQL or API collection was executed. The proposed operating package remains proposed until accepted. This publication changes neither that status nor the scope of the prototype.

## V1 extract supplement — 8 October 2026

Added the empty Excel extract, nine-table import contract, official source mappings, Tableau user joins, backend-only Alteryx MongoDB queries, Power BI identity pseudocode, and manual SQL staging/matching queries. The workbook was rendered and each sheet visually checked. Exact headers and blank data tables were verified. No live platform, directory, or SQL Server execution was performed.

Corrected Power BI report `createdById` mapping to technical owner instead of original creator and added a collector regression check. Existing app behavior and deferred workflow repairs remain unchanged. Refreshed the collection ZIP and artifact digests.

Added three platform output tabs to the Excel workbook: Tableau_Output, PowerBI_Output, and Alteryx_Output. Their 28 layout sections use exact output headers and label unavailable or separately collected data. Verified that the existing data, formatting, validation rules, and table ranges were preserved. The workbook now contains 15 sheets.
