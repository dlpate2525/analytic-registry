---
status: accepted
date: 2026-10-09
---

# Make business responsibility effective through approval and date

Owner and Champion changes take effect when required approval is complete and the recorded effective date has arrived. The user selected this rule for both roles to keep the process simple, rejecting a separate incoming-person acceptance step. Platform implementation and source observations remain separate evidence; they do not determine when a business assignment takes effect.

## Consequences

New work follows the effective assignment. Previously issued annual packets and historical approval receipts retain their captured identities. Existing approval roles remain unchanged.

The local prototype now records a business-application receipt after approval and the effective date. Owner and Champion routing follows that receipt. Legacy records retain their recorded baseline until an approved change applies. New assignments require active, verified people; historical approvals remain valid if an approver later becomes inactive. The requested configuration records business intent; the implemented version remains separate.

## Considered alternatives

- Require incoming-person acceptance: adds another waiting state and handoff. The user chose simplicity instead.
- Wait for technical implementation: ties business accountability to platform work that may finish later.

See [Q2 in the design interview](../v1.1-design-interview.md).

Local verification: [79 responsibility and registration checks](../source/scripts/v11-responsibility.check.ts) passed. These are prototype checks, not live-platform validation.
