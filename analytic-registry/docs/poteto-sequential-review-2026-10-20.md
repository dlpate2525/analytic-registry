# Sequential POTETO review

20 October 2026. This review keeps the prototype local.

The app now applies profile scope and filters consistently across workspace and work lists.
Recorded but unresolved reviewer IDs remain visible.
The annual pages use the agreed Annual Attestation term.
A project verification skill now provides repeatable browser workflows and evidence.

## Product changes

| Observed problem | Repair | Evidence |
|---|---|---|
| Administrator My workspaces showed the Business profile's responsibilities. | Select responsibility using the active profile. Keep retired records hidden by default. | Workspace render checks and browser profile comparison |
| My work filters reverted on reload and disagreed with same-page navigation. | Read all six filters from URL parameters. Remove six duplicated state values. Preserve view, scope, and existing deep-link restrictions. | Browser reload, Back, view-switch, filter, and clear checks |
| Asset work and My work showed an unresolved person reference as unassigned. | Display the resolved name, then the recorded ID, then the existing empty-assignment label. | Render, queue, unchanged-data, and browser checks |
| Annual pages used several names for the same process. | Use Annual Attestation in headings and breadcrumbs. Use Open attestation for the list action. | Browser inspection of list and frozen packet |

These repairs change five production files. No stored tables, fields, approval rules, source identities, or historical receipts changed.
Existing five-section navigation, white backgrounds, purple and coral accents, and the 1366 by 768 canvas remain.

## Completed skill sequence

| Pass | Applied skills | Outcome |
|---|---|---|
| Frame and trace | poteto-mode, figure-it-out, how, swarm, show-me-your-work | Two source reviews and a synthesis identified three safe repairs. |
| Establish repeatable verification | create-verification-skill, skill-creator, writing-for-agents | Created a project-local skill with five feature recipes and an owned browser runner. Proved Requests and Doctor. |
| Simplify implementation | architect, arena, typescript-best-practices | Two designs and an independent judge favored local URL ownership over a shared filter framework. |
| Harmonize wording and comments | unslop, technical-writing, no-comments | Standardized annual page labels. Scoped comment review found no justified deletions. |
| Check the verification map | maintain-verification-skill | Five source reviews corrected specific test and documentation gaps. All five feature journeys passed. |
| Challenge the result | blast-radius, interrogate | Two independent reviews passed with no actionable findings. A fresh full verification run passed all five features. |

The passes run in order. Independent source readers work within a pass. Product edits and browser driving have separate owners.
The user's local-only instruction replaces all PR and publication steps.
Formal verification, performance benchmarking, global skill tuning, teaching, and shipping were not relevant to these repairs.

Laziness Protocol rejected a shared filter framework that would add more configuration than behavior.
Model the Domain made the URL the single owner of work filters and preserved unresolved assignment meaning.
Prove It Works required real browser actions, persisted results, and cleanup evidence.
Sequence Work into Verifiable Units required focused checks before the next repair.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Application baseline | 1,139 passed | [Baseline log](../.scratch/poteto-sequence-2026-10-20/baseline-checks.log) |
| Updated application checks | 1,155 passed across 15 suites | [Check log](../.scratch/poteto-sequence-2026-10-20/final-checks.log) |
| TypeScript and local build | Passed | [Build log](../.scratch/poteto-sequence-2026-10-20/build.log) |
| Targeted browser regressions | 15 passed | [Results](../.scratch/poteto-sequence-2026-10-20/final-regressions.json) |
| Maintained feature journeys | 76 passed across five features | [Maintenance evidence](../.scratch/poteto-sequence-2026-10-20/maintenance.md) |
| Independent full browser run | 76 passed in one fresh run; zero runtime errors; cleanup verified | [Run results](../.scratch/verification-2026-10-21T02-28-32-891Z-199fc297/run.json) |
| Independent final reviews | Both passed with no actionable findings | [Review A](../.scratch/poteto-sequence-2026-10-20/final-review-a.md), [Review B](../.scratch/poteto-sequence-2026-10-20/final-review-b.md) |
| Skill structure validation | Passed | [Creation evidence](../.scratch/poteto-sequence-2026-10-20/skill-creation.md) |

The feature journeys cover workspace navigation and evidence, completed asset evaluation and accountability, request approval, work queues, annual packet inspection, and administration.
They also cover export contents, unreadable-data recovery, and stale-tab protection.
Annual response submission and live platform ingestion remain outside this browser proof.

The changed application logic projects existing records for display. It does not write business records.
Queue tests confirm the input data remains identical after unresolved-ID projection.
Browser checks confirm profile-specific scope, retained technical identity after approved requests, and unchanged case history during accountability correction.

The test runner starts a separate strict localhost server and fresh browser contexts.
It records the owned PID, application version, action logs, traces, screenshots, accessibility snapshots, and saved-state snapshots.
Cleanup stops only that server and browser, then verifies port release.
Evidence survives cleanup. The user's existing app on port 5180 remains available.

Failed attempts remain available. Early tests assumed the profile survived reload or read controls before rendering finished.
One test used an invalid platform option. Those observation errors were corrected without changing product requirements.
The maintenance run also corrected retired-record expectations and selected only record links when checking workspace IDs.
The independent full run then passed without selector repairs or manual intervention.

## Remaining limits

Late approval precedence remains unchanged.
Retrospective implementation evidence can be recorded with a date before approval, provided approvals exist when recording.
Whether that evidence should be rejected is not settled. This review adds no rule for it.

Annual scheduling and response policy, retirement operations, freshness thresholds, and additional shared-case rules remain open.
The local prototype does not prove installed platform queries, production authorization, a SQL importer, or Power Apps import.

Independent reviewers use the configured inherited model. This is independent review with one model, not review across model families.

## Reuse and handoff

Use [verify-analytic-registry](../.agents/skills/verify-analytic-registry/SKILL.md) for future local workflow verification.
Use maintain-verification-skill to keep its feature map aligned with the app.

The [decision trail](../.scratch/poteto-sequence-2026-10-20/decisions.tsv),
[change manifest](../.scratch/poteto-sequence-2026-10-20/changes.json),
and [source synthesis](../.scratch/poteto-sequence-2026-10-20/source-synthesis.md) explain the scope and evidence.
The before-change checkpoint remains in `.scratch/poteto-sequence-2026-10-20/before-sequence.zip`.

Open the [local app](http://127.0.0.1:5180/).
No GitHub push, release publication, or external deployment ran.
