# Assets

Champions record completed business evaluations. Workspace accountability remains separate from native platform identity and membership.

## Sub-features

- A1: Registry has five columns; detail has four tabs.
- A2: A four-step New current version evaluation activates its business version and calculated result together.
- A3: Initial accountability requires an eligible Champion of the target workspace.
- A4: A Platform Manager correction requires reason and business confirmation.
- A5: Corrections preserve native identity, earlier associations, and existing cases.

## How to get to it (user POV)

Open Assets from primary navigation. Select an asset, then Governance & risk to record an evaluation. Saved links include `#/assets/AST-001/assessment`. An unassigned asset exposes Confirm accountability; Administrator view exposes Transfer or correct accountability.

## Driving it with Playwright

Preconditions: Business profile P1 is eligible for AST-001 and WS-006. AST-034 starts without confirmed accountability. Administrator view exposes corrections with a separate Prototype Platform Manager selection, initially P8.

Run `verify.mjs assets` using [SKILL.md](../SKILL.md).

- Open AST-001 from the registry; verify the column and tab counts.
- Select Governance & risk, then Record completed evaluation.
- Complete business context, Simple complexity, two logical sources, and audience 20.
- Answer PII No, EUCT No, and DMP Untiered; supply an evidence reference and save.
- Expect version B-VERIFY, PRL 3, and Does not meet the High risk rule. Reload and inspect the saved evaluation.
- Confirm AST-034 belongs to WS-006; expect an association record without a fabricated evaluation.
- Switch Administrator, choose another workspace, and confirm the disabled save before supplying evidence.
- Supply reason and business confirmation; expect the selected Platform Manager actor, new association, unchanged native identity, and preserved cases.
- Open AST-001 evaluation as the non-Champion Administrator; expect no save action.

## Gotchas

The script tests registry navigation and the Governance & risk evaluation action. It does not verify every alternate evaluation entry point. This journey covers one PRL combination. Domain checks cover other bands, unknown answers, and historical evaluations that cannot replace current context. Assets have no Annual Attestation, separate approval queue, or saved evaluation draft. No native platform is changed.
