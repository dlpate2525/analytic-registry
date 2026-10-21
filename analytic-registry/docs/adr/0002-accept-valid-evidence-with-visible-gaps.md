---
status: accepted
date: 2026-10-09
---

# Accept valid source evidence with its gaps visible

For the initial manual pilot, accept structurally valid source deliveries with declared partial coverage and unresolved references. A structural error blocks the whole delivery for correction; do not silently skip rows or accept selected datasets. The user selected this boundary to use available V1 evidence while prioritizing trust and ease of use.

## Acceptance authority

The registry operator, initially the user, records acceptance after validation. Routine imports need no additional approval. Platform Manager retains responsibility for unresolved identities and relationships. Existing business, Custom, annual, and evidence-closure approval roles remain unchanged.

## Consequences

Preserve declared coverage, source observation dates, native identifiers, and unresolved references. Assign unresolved cases to Platform Manager. Acceptance does not prove complete coverage, resolve unknown owners, or establish that a control passed.

A failed delivery leaves the previous accepted observations available with their original dates and coverage. Corrected content uses a new delivery identity under the existing replay rules. An unchanged retry must not create duplicate registry records or cases.

## Considered alternatives

- Require complete evidence and resolved references: prevents the first pilot from using valid partial source data.
- Accept selected datasets from a defective delivery: needs additional dependency handling. The initial manual process uses one acceptance boundary instead.

The local SQL validator separates blocking `StructuralError` results from nonblocking `UnresolvedReference` results. Unresolved results identify Platform Manager and include a stable, scoped `FollowUpKey`. The delivery's `RunKey` records the occurrence separately. Workspace subtype changes do not split an object's identity or its follow-up case.

The workbook and manual handoff identify the registry operator as the acceptance role. The browser separates inventory availability from control readiness. Partial evidence can support inventory while a comparison remains unavailable.

Local validation covers 41 scenarios across 101 diagnostic queries through a SQLite predicate harness. This harness translates SQL dialect features; it does not prove SQL Server execution. No importer, acceptance ledger, or persistent case upsert service is implemented.

See [Q3 and Q4 in the design interview](../v1.1-design-interview.md).
