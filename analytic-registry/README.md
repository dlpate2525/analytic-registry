# Analytic Registry prototype

A React and TypeScript prototype for reviewing a future Power Apps application. It uses realistic mock data and local browser storage. It does not connect to SQL Server, Active Directory, or analytics platforms.

## Run locally

1. Open a terminal in this folder.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the localhost address printed by Vite.

Use `npm run build` to compile the production bundle. Use `npm run preview` to serve that bundle. Use `npm run check` for domain and data checks. Use `npx tsx scripts/generate-model.mjs` to regenerate the relationship documentation.

## Product review walkthrough

1. Start in Business view with four summary numbers. Switch to Administrator view for estate-wide reporting and platform / LOB filters.
2. Create a workspace request. Try Standard and Custom, one Champion, and a requested new group.
3. Register an existing Tableau project. Branch performance is the discovered example.
4. Open Credit portfolio and select Comparison. The new RW group is pending implementation; the direct user is a separate discrepancy.
5. Open Client insights for the Tableau direct-user scenario.
6. Open Loan automation for the no-active-Champion review and a personal-credential investigation.
7. Open an asset and create an assessment. PRL values are illustrative.
8. Update a review status and record the external administrative action.
9. Complete an annual attestation as an eligible Champion.
10. Open Relationships & data model for the association diagrams and explicit columns.

## Implemented screens

- Executive dashboard and attention queue.
- Workspace list and detail: Overview, Access, Comparison, Assets, Connections, Findings, Attestation, History.
- Requests: Create New, Register Existing, Update Existing, topic validation, compact group editing, approvals, external implementation records, and verification.
- Asset list, detail, assessment form, and assessment history.
- Unified My work inbox with thematic filters, saved views, risk findings, and controlled review actions.
- Annual attestation list and pre-populated response form.
- Detection coverage, configuration standards, mock reference data, and activity history.
- Relationship explorer with three diagrams and a 52-table proposed column dictionary.

## Project structure

```text
src/
  components/       Shared tables, fields, badges, and visual primitives
  layouts/          Navigation and application shell
  pages/            Dashboard, administration, relationship explorer
  features/
    workspaces/     Registry, configuration comparison, access and lineage
    assets/         Inventory, asset detail, point-in-time assessment
    requests/       Progressive onboarding and changes
    reviews/        Queues, findings, external action records
    attestations/   Annual responses
  data/             Normalized mock records, local state, proposed schema
  types/            Domain interfaces
  utils/            Validation and comparison logic
scripts/            Domain checks and documentation generator
docs/               Data model narrative, standalone HTML, Mermaid sources
public/             Downloadable model documentation
```

## Mock data

12 workspace identities: four each for Power BI / Fabric, Tableau, and Alteryx. Eleven are registered; one awaits registration. The estate includes 34 assets, 18 connections, 28 findings, 12 administrative reviews, 10 annual attestations, and 16 people.

Specific examples cover clean Standard access, Custom access with six approved groups, inactive ownership, missing Champion coverage, an orphaned workbook, unassociated connection, direct users, pending RW change, unknown identity, personal credentials, and a provisioned workspace without content.

## Product assumptions

- “Workspace” is a generic label; the UI also shows Project or Collection where relevant.
- Champion is an accountability role, usually represented in RW. It is not a higher permission tier.
- One Champion is allowed with a warning. Zero, duplicates, and more than ten are blocked at submission.
- Inactive identities cannot be assigned. Unverified identities display an unresolved warning.
- Requests do not overwrite implemented or observed state. New group names remain pending prerequisites.
- Annual attestation completion records a response; it does not certify that every control passed.
- PRL scores, coverage capabilities, classifications, naming rules, and text limits are illustrative or proposed.
- Mock snapshots use October 6, 2026. Saved activity uses the browser clock.
- Fictional Northstar branding provides enterprise context. All people, systems, and records are demo content.

## Relationship design

Use multiple related tables, with focused read views for Power Apps screens. The proposed model is more detailed than the React mock layer.

- [Complete model and explicit columns](docs/data-model.md)
- [Standalone visual relationship guide](docs/data-model.html)
- [Registry diagram source](docs/registry-relationships.mmd)
- [Intent and evidence diagram source](docs/reconciliation-relationships.mmd)
- [Review diagram source](docs/review-relationships.mmd)

The design preserves native identity, platform scope, historical intent, immutable implemented versions, observed extract completeness, asset membership, connection lineage, repeated detections, and annual evidence context.

## Known gaps and decisions

- No production authentication, authorization, backend, notifications, script execution, or multiuser conflict handling. Approval roles are explicitly simulated with mock role assignments.
- The mock layer currently has one workspace pointer per asset. Each asset has one accountable workspace. The proposed database separately preserves multiple observed technical memberships.
- Observed evidence is static. Reference data now configures prototype freshness limits and extract completeness. Missing metadata prevents alignment; live ingestion and production rule enforcement remain unimplemented.
- Submitted requests enter the shared inbox. Approval, recorded external implementation, and verification determine their delivery stage. The prototype does not provision resources or refresh platform inventory.
- Assessment status and latest classifications are projected into the mock asset record for convenience. The proposed schema derives them from assessment history.
- Attestation forms freeze a local review packet. Champion responses require Application Owner or Platform Owner approval. Corrections create linked reviews, and approved attestations can finish with follow-up.
- Selected mock reviews link to tracked findings. Closing linked findings requires evidence and a matching Platform Manager, Platform Team, or Platform Owner approval receipt. Production authorization is not implemented.
- No asset-creation form, server-side search, pagination, or attachment upload is implemented.
- Final PRL weights and meaning, classifications, role mappings, evidence freshness, native uniqueness scopes, and retention rules need agreement.
- Desktop rendering was inspected. The CSS supports narrower layouts, but a full device and accessibility audit remains outstanding.

## Recommended Power Apps iteration

1. Agree on native keys, object relationships, the Standard access contract, and the first platform to implement.
2. Build the registry and request tables first, with SQL constraints and a transactional submission command.
3. Add canvas app galleries over read views with stable IDs and server-delegated filters.
4. Integrate one read-only platform extract with explicit scope and completeness.
5. Implement the comparison pipeline and deduplicated finding lifecycle.
6. Add administrator action records and verification, then frozen annual attestation packets.

SQL Server in the deployment environment is the proposed system of record. Confirm its database, gateway, permissions, identity design, and licensing. A final Dataverse-versus-SQL decision remains open.

Microsoft documents [SQL view and stored procedure access](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-connection-access-data), [delegation](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview), and [SQL security considerations](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections/sql-server-security).

## Validation

The TypeScript production build passes. The domain suite checks mock record counts, relationship keys, platform consistency, scenario invariants, required fields, identity eligibility, Champion limits, group specifications, and stable-ID comparison. Browser checks cover the rendered dashboard, request validation, progressive Custom fields, and Champion selection behavior.

Reset local state from Reference data → Reset demo data. This clears prototype edits in the current browser only.

## Confirmed refinements

- Business Owner / Workspace Owner is one identity field.
- Workspace onboarding requires PII, EUCT, and one highest applicable DMP tier (Tier 1, Tier 2, or Tier 3).
- Business users own group creation and membership maintenance.
- Custom setup and annual attestations require Application Owner or Platform Owner approval.
- Item 6 was marked N/A; no extra identity approval gate was introduced.
- Initial production release and material changes trigger a new asset assessment.
- Complete and sufficiently fresh evidence is required for conclusive reconciliation. Exact freshness thresholds still need agreement.
- Platform Manager, Platform Team, or Platform Owner approval is required to close evidence. Approval binds to the exact evidence revision.
- Annual review can finish with open, linked follow-up after approval.
- Business view is the default. It has four dashboard metrics, five main navigation entries, an administration menu, simple workspace rows, and guided request/review/attestation steps.

Saved browser edits are retained. Older records without the new workspace declarations show them as missing until updated. Older completed attestations without approval receipts remain historical records; they do not fabricate a new approval.

Guided processes stay below six steps: workspace requests use five (Workspace & people, Classification, Configuration, Groups, Review & submit); asset assessments use five; evidence reviews and annual attestations each use three. Workspace, owner, and Champions share the first request step.

Group ownership is derived from the workspace owner. Requests do not collect a separate group owner; saving a draft or submitting removes any legacy group-owner overrides from that request.

Workspace requests include Champion, RW, R, and Data Sources group specifications. Data Sources supports New or Existing, uses the _DS naming suffix, and follows workspace ownership. Drafts receive a missing Data Sources specification when opened; submitted requests and observed platform evidence are retained.

Review queues, findings, and the administrator dashboard show separate linked Workspace and Asset columns. Requests and attestations link their workspace records; new workspace requests display their proposed name. Missing asset links show a dash, and missing workspace associations are explicit. Connection references remain visible in review and finding context.

## Streamlined workflow implementation

- Five main sections: Dashboard, Workspaces, Assets, Requests, My work. Annual reviews remain accessible from My work and direct links.
- Four work themes: Workspace setup; Access & accountability; Evidence & risk; Annual assurance.
- Dashboard and destination lists share owner, completion, and due-window selectors. Due means overdue plus the next 30 days in America/New_York. The admin dashboard preserves platform and business-line filters in drill-through links.
- The Standard template in `src/data/standard.ts` drives group defaults, suffixes, guidance, and schema documentation. Generated names follow technical-name edits; deliberate manual names are retained.
- Reusable person and evidence fields serve the request, asset, and review workflows. Annual questions have four thematic disclosures. Requests still use five guided steps; reviews and annual attestations use three.
- `src/utils/workflow.ts` contains testable request delivery commands and review transition guards. Approvals bind to business intent; implementation evidence cannot satisfy verification by itself.
- `src/utils/evidence.ts` keeps extract confidence separate from risk. Unknown completeness or an unset freshness limit produces an unresolved assessment. Administrators can simulate metadata in Reference data → Evidence rules; these settings do not assert a corporate policy.
- Existing saved records are preserved. Missing creator identities are not invented; owner responsibility can include a legacy request in My open requests. Historical approvals and observations are retained.

### Production boundary

The implementation above is a local prototype. It does not introduce a server, database, real identity, concurrent writes, or ingestion. Move the domain commands behind authenticated APIs before an operational pilot. Power Apps should read focused workspace, asset, and work-item views and invoke submit/approve/record/verify commands. Persist request intent, approval receipts, implementation records, verification evidence, and audit events in related tables. Enforce role eligibility and concurrency on the server. Start with one platform and the full request-to-verification lifecycle before adding more integrations.

## October 7 audit and collection handoff

- [Current decision register](docs/decision-register.md): confirmed choices, selected design, operating defaults, and delivery checks.
- [Domain glossary](GLOSSARY.md): consistent workspace, asset, connection, ownership, and evidence terms.

- [Business / product document](docs/business-product.md) and [relationship diagram](docs/workspace-asset-connection.svg).
- [53-table dictionary](docs/data-model.md), [searchable HTML](docs/data-model.html), and [CSV](docs/column-dictionary.csv).
- [Functional and nonfunctional requirements](docs/requirements.md).
- [Audit report](docs/audit-report.md) and [verification record](docs/verification.md).
- [Platform collection pack](../platform-data-collection/README.md).

The audit adds validation, immutable completion behavior, correction requests, safer browser persistence, and explicit native-ID design. The mock has no live import or database. Internal UUIDs must remain separate from platform-native IDs during future ingestion.
