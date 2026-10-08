# Publication notes - V1 baseline

Published baseline: **1.0.0-prototype.1**, dated 8 October 2026, tag **v1.0.0-prototype.1**.

- Updated app help, model page, reference wording, footer, and release metadata.
- Reconciled business/product, functional/nonfunctional requirements, decisions, identity design, target model, glossary, audit, and repair backlog.
- Included the current 15-sheet Excel workbook, nine import tables, 117 columns, and three platform output tabs.
- Corrected 40 column-purpose descriptions while preserving workbook layouts, values outside those cells, styles, tables, and validation rules.
- Rebuilt the collection and preview ZIPs from current files.
- Added source-to-archive, workbook, document-link, build-resource, version, and digest checks.
- Local checks passed: 186 application checks, 28 collection checks, and 220 release integrity checks, including 170 local links.
- Production build passed. The JavaScript bundle remains approximately 505 kB; route splitting is deferred.
- Reviewed changed app surfaces and documentation in a separate local browser origin. Narrow layouts at 390 x 844 remained within the viewport.
- Confirmed binary download bytes against release hashes. Vite omits the workbook MIME header, but serves the correct XLSX bytes.
- Excluded dependencies, caches, raw conversation attachments, local browser data, credentials, and scratch files.
- Preserved historical screenshots. The new V1 resources screenshot identifies the current handoff entry point.

The SHA-256 manifest covers every published file except itself and Git metadata. GitHub Actions repeats checks after publication. Local evidence and hosted CI results are separate.

No live Tableau, Alteryx, Power BI/Fabric, directory, or SQL Server collection was executed. Backend queries require installed-platform validation. The baseline preserves documented defects and proposed operating settings; it does not approve or deploy production workflows.
