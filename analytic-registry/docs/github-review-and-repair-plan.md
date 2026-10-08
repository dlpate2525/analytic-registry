# Application review and repair plan

## V1 extract decision — 8 October 2026

The current delivery uses the [Excel extract and platform handoff](../../platform-data-collection/v1-extract/README.md). It uses exact normalized email matching after manual SQL staging. Retain native IDs separately. All unresolved identities and relationships go to Platform Manager. Alteryx collection uses MongoDB backend tables and read-only queries only.

Existing RunKey, ObservedAt, and manifest behavior remain unchanged. Classification, PRL, and risk repairs are deferred for V1. Existing product requirements remain. The plans below describe future implementation where they exceed this extract workflow. No live directory integration or application workflow repair has been implemented by this delivery.

Reviewed published commit [`6625514`](https://github.com/dlpate2525/analytic-registry/tree/6625514a523f744324433e5b951c8f322eb3c9dc). This is a review and proposed implementation plan. Application behavior has not been changed. The separate RunDate proposal is deferred.

## Assessment

The prototype preserves important distinctions between business declarations, platform observations, and internal versus native IDs. However, it is not ready to use live directory results for accountability or approvals. Its current collection pack cannot translate platform user IDs into corporate identities. Several workflows also change historical results or attribute actions incorrectly.

The first repair should separate **identity matching**, **directory account state**, **evidence freshness**, and **permission to act**. A failed Office 365 lookup is not evidence that a user is inactive.

### Review evidence

- Verified that GitHub main matched the reviewed commit before inspection.
- Reran all published suites: **119 domain/data + 31 workflow + 36 audit + 26 collector checks passed**.
- Executed seven additional app scenarios. They reproduced approval-history, assessment, group, reconciliation, and overdue defects below.
- Executed four collector counterexamples: invalid UUID, missing start time, invalid start time, and start after completion. All were incorrectly accepted.
- Opened the published preview in an isolated browser origin. The annual response screen showed Maya as the current business user while offering David as a responding Champion. No response was submitted.
- Checked Microsoft identity behavior against official documentation. No live directory, platform, SQL Server, or Power Apps connection was tested.

Passing the existing suites does not cover the newly identified scenarios. Add these cases to the regression suite when each repair is implemented.

## Prioritized findings

P1 means repair before introducing live identity-based decisions. P2 means repair before the affected workflow is accepted. **Integration gap** means documented or newly specified production work; it is not a claim that a live connector is broken.

| ID | Priority / kind | Finding and evidence | Required repair |
|---|---|---|---|
| R01 | P1 / integration gap | No platform-principal feed or verified directory crosswalk. Tableau exports repository user integers; Power BI excludes artifact-user collection. [Tableau export](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/platform-data-collection/tableau/export.sql#L108), [Power BI request](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/platform-data-collection/powerbi/collector-pseudocode.md#L20). | Deliver scoped principals and explicit identifier namespaces. Resolve technical owners, creators, and modifiers through that feed. Never pass an arbitrary platform ID directly to Office 365. |
| R02 | P1 / model gap | Person has one mutable Active/Inactive/Unverified state. Principal has an unspecified resolution status. There is no account-state history corresponding to a pinned directory run. Principal uniqueness also omits its identifier namespace. [Schema](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/data/schema.ts#L8). | Implement the identity model in [the companion design](identity-resolution-design.md). Preserve successful account evidence separately from failed lookup attempts. Give directory runs a directory source rather than treating them as a Tableau or Power BI execution. |
| R03 | P2 / defect | All-Unverified Champions are counted as having no active coverage. The owner metric instead counts only explicitly Inactive owners. Unknown and confirmed absence therefore produce inconsistent accountability results. [Dashboard](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/pages/Dashboard.tsx#L13), [workspace detail](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/features/workspaces/Workspaces.tsx#L12). | Use one evaluator for owner and Champion coverage. Separate Missing assignment, Verified eligible, Confirmed unavailable, and Unable to verify. Keep coverage gaps visible without declaring unresolved users inactive. |
| R04 | P1 / reproduced defect | Changing a past approver to Inactive changes a completed request to Awaiting approval. Historical approval validity depends on today's directory status. [Approval check](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/utils/approvals.ts#L8), [stage projection](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/utils/workflow.ts#L10). | Preserve eligibility and role evidence at decision time. Check current eligibility for new actions. Use an explicit revocation/correction event if an old decision must change. |
| R05 | P1 / command-authorization defect | Annual responses can select another Champion as the actor; the form does not bind the current user. Draft request save/submit also lacks an owner/requester check. List filtering does not protect a direct record route. [Annual form](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/features/attestations/Attestations.tsx#L14), [request save](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/features/requests/Requests.tsx#L22). | Centralize actor-aware save/submit checks. Bind the prototype actor now and authenticated identity in production. If delegated recording is supported later, retain recorder and respondent separately. |
| R06 | P1 / reproduced defect | A September 1 assessment for the current release overwrites classifications from September 21. Projection checks the release string, not which assessment is effective. [Assessment projection](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/utils/assessment.ts#L23). | Append historical assessments without changing current values. Select the effective approved assessment explicitly; use deterministic ordering and correction rules. |
| R07 | P2 / reproduced defect | A Complete assessment with outcome Changes required projects PRL and classifications onto the asset. Reproduction changed current PRL 2 to PRL 4. [Assessment projection](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/utils/assessment.ts#L23). | Separate completed review, proposed findings, and approved current values. A rejection must not establish an approved PRL. Preserve the assessment as evidence. |
| R08 | P2 / acknowledged alignment gap | Asset forms and score-oriented schema fields still use legacy DMP/illustrative PRL concepts. Confirmed decisions require Tier 1 > Tier 2 > Tier 3 and manually approved PRL. [Asset form](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/features/assets/Assets.tsx#L16), [requirements FR-11/24](requirements.md). | Apply one tier vocabulary and rank map. Record the manual PRL value, evidence/approval reference, reviewer, date, and retained inputs. Retain historical illustrative values without recalculating or relabeling them as approved. |
| R09 | P2 / reproduced defect | A requested Champion change hides unrelated observed membership drift behind Pending Implementation. [Comparison](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/utils/logic.ts#L59). | Evaluate requested-to-implemented and implemented-to-observed differences separately. Show pending work alongside independently established drift. |
| R10 | P2 / reproduced defect | Removing a group from a Custom configuration does not trigger the existing business access-approval rule. The comparison checks only the remaining requested groups. [Approval needs](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/utils/approvals.ts#L11). | Compare group sets in both directions. Detect additions, removals, replacements, and entitlement changes. Ignore reorder-only differences. |
| R11 | P2 / reproduced defect | An Existing Champion group and a New RW group can use the same intended group name. Validation compares the first group's ID with the second group's name. [Group validation](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/utils/logic.ts#L39). | Validate new-name collisions within the correct directory namespace. Require distinct resolved IDs by purpose. Names must never create an automatic binding. |
| R12 | P2 / reproduced defect | An In progress annual review remains In progress after its due date and is excluded by the Overdue status filter. The dashboard also counts raw statuses. [Annual status](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/utils/workItems.ts#L11). | Derive lateness independently from workflow stage. Use the same predicate for badges, filters, dashboard totals, and the work inbox. |
| R13 | P2 / reproduced contract defect | The Power BI adapter accepts `RunKey='not-a-uuid'`, null/invalid StartedAt, and StartedAt after completion. These violate its declared contract. [Key handling](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/platform-data-collection/powerbi/normalize-scan.mjs#L44), [manifest](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/platform-data-collection/powerbi/normalize-scan.mjs#L124). | Validate required UUIDs, UTC timestamps, chronology, types, and lengths before writing any delivery. Reject or quarantine invalid input explicitly. |
| R14 | P2 / contract inconsistency | Tableau uses collection start for ObservedAt; Power BI uses completion. The contract says observation time survives through ExtractRun, but ExtractRun has no matching field. [Tableau instructions](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/platform-data-collection/tableau/README.md#L32), [Power BI context](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/platform-data-collection/powerbi/collector-pseudocode.md#L67), [schema](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/src/data/schema.ts#L26). | Standardize collection start/end, dataset observation window, and registry receipt time. Preserve actual evidence age across delayed or out-of-order imports. Do this without adding the deferred RunDate field. |
| R15 | P2 / documentation defect | Generated data-model notes still ask for decisions already recorded, including PRL weights and retention. [Generated notes](https://github.com/dlpate2525/analytic-registry/blob/6625514a523f744324433e5b951c8f322eb3c9dc/analytic-registry/docs/data-model.md#L1280), [decision register](decision-register.md). | Update the generator's source notes and regenerate every public/doc copy together. Mark confirmed decisions, proposed operating settings, and unimplemented work consistently. |

## Identity resolution behavior

The companion [identity-resolution design](identity-resolution-design.md) defines the proposed data fields, state matrix, Power Apps behavior, and source references.

The practical rule is: **retain the platform identity even when no directory match exists**. A successful match does not itself prove authority to approve. A failed lookup does not prove a disabled account.

| Situation | User-facing result | Effect |
|---|---|---|
| Exact identity match with fresh enabled evidence | Verified enabled | Apply role and workspace-scope checks separately. |
| Explicit disabled-account evidence | Account disabled | Preserve history; route present accountability for replacement. |
| Positive directory deletion evidence | Account deleted | Preserve native bindings and historical references. |
| Not found, ambiguous, permission failure, timeout, or stale evidence | Unable to verify, with a specific reason | Keep unresolved work visible; do not create an inactivity conclusion. |
| Application, managed identity, group, or unresolved principal kind | Non-person or type unresolved | Do not assign it to a human accountability role automatically. |

Preserve the existing rule that unresolved owner/Champion evidence does not invent an extra onboarding approval gate. Actual approval and response commands must still establish the actor's eligibility. These are different decisions.

## Five implementation phases

### 1. Protect decisions and history

Fix R04–R07 first. Introduce shared command checks for actor, record scope, allowed transition, evidence, and revision. Preserve immutable approval receipts. Correct current-assessment projection.

**Acceptance:** a disabled former approver does not reopen completed work; an unauthorized actor cannot save or submit an annual response or draft request; rejected/backdated assessments do not overwrite approved current values. Self-approval remains allowed for eligible role holders.

### 2. Establish identity contracts and collection

Address R01–R02. Extend the platform delivery contract with principal records and typed references. Define directory sources, runs, account snapshots, resolution attempts, and versioned bindings. Validate one real sample from each platform before scheduling collection.

**Acceptance:** duplicate names do not merge; identical native integers on different sites remain separate; UPN changes preserve identity; an unmapped technical owner remains available for review. Service principals and groups never become fabricated people.

### 3. Apply identity evidence consistently

Address R03 and the identity parts of R05. Add a shared eligibility evaluator and an identity-resolution work queue. Use Office 365 for interactive user selection and a trusted directory integration for ongoing verification. Keep technical ownership distinct from accountable workspace ownership.

**Acceptance:** all-disabled, all-unresolved, mixed disabled/unresolved, missing-roster, stale-enabled, and directory-outage cases produce distinct, consistent results. List counts and detail views agree. A failed refresh preserves previous evidence with its original age.

### 4. Repair reconciliation and workflow rules

Address R08–R14. Align classifications, compare both sides of group changes, preserve drift during pending work, fix lateness, and validate import metadata. Build staging validation before a production SQL loader can make records current.

**Acceptance:** group removals invoke the existing access approval; duplicate intended groups fail validation; partial pulls cannot prove deletion; older imports do not replace newer evidence; manual approved PRL and DMP tiers match confirmed decisions.

### 5. Verify and publish one consistent release

Address R15. Regenerate diagrams, dictionaries, public copies, sample outputs, ZIPs, and the SHA-256 manifest. Update the requirement status table to distinguish implemented behavior from design. Run the existing suites plus the new scenarios. Validate Power Apps delegation, scoped authorization, and representative estate size before production use.

**Acceptance:** every published format uses the same field/state vocabulary; the collection samples load into staging; findings trace to exact platform and directory evidence; the app retains five main sections and short guided workflows.

## Scope and constraints to retain

- Business owner and workspace owner remain the same field. Platform technical ownership never overwrites it.
- Champions stay within the workspace/people workflow. Standard group purposes remain Champion, RW, R, and `_DS`.
- DS means creating and maintaining workspace data connections, subject to platform capabilities.
- Custom and annual approvals retain the required owner roles. Closing evidence retains the required platform roles.
- Self-approval remains allowed when the actor holds the required role and scope.
- Keep six calendar months of historical metadata, with the existing protections for current records, active evidence, and durable native-ID mappings.
- Preserve all existing risk buckets. Identity uncertainty produces Unable to Verify rather than a fabricated inactive-user finding.
- The proposed operating settings remain proposed. This review does not approve cadence, freshness intervals, recovery targets, or new platform permissions.

## Production boundaries

The repository is a React prototype. It has no production SQL importer, authenticated Power Apps implementation, live directory resolver, or platform executor. These are integration work, not regressions introduced by this review. The platform pack remains useful for asset inventory, but the principal feed must be added before it can support identity reconciliation.

This review produced documentation only. No app fixes, directory changes, platform changes, or messages to platform teams were made.
