# My work and Annual Attestation

Users find tasks with Workspace and Asset context. Review evidence and frozen annual packets retain the responsibility recorded for their lifecycle.

## Sub-features

- M1: Work and Findings tables show Workspace and Asset mapping.
- M2: Search, platform, theme, business line, severity, and risk bucket filters survive reload or a restored link.
- M3: Review detail keeps three steps and evidence closure approval.
- M4: Annual Attestation lists Champion recipients and shows frozen ownership context.
- M5: Finding status is visible, uses URL state, and distinguishes open from closed or resolved records.
- M6: Only an explicit finding-to-case relationship creates a Review-case link.
- M7: Unavailable Asset references keep their IDs and explain why no link is available.

## How to get to it (user POV)

Open My work in primary navigation. Administrator view exposes Findings & risk buckets. Open a task to inspect its Review case. Choose Annual Attestation from My work, then open a workspace packet.

## Driving it with Playwright

Preconditions: Seed Review REV-002 and annual packet ATT-1 exist. The run starts in Business view.

Run `verify.mjs work` using [SKILL.md](../SKILL.md).

- Open My work; expect Workspace and Asset columns.
- Open a Tableau deep link, choose Alteryx, and reload; expect Alteryx in the URL and control.
- Set search, theme, business line, and severity; reload and expect the selected filters.
- Select Administrator again after reload and open Findings & risk buckets; expect both mapping columns.
- Select a risk bucket and restore its link after reload; expect the selected bucket.
- Select Closed or resolved; expect only those finding statuses, then return to Open.
- Inspect REV-002 and Evidence & approval; expect recorded Workspace Owner context and closure approval.
- Open Annual Attestation from My work and inspect ATT-1; expect Champion recipients, three steps, and ownership at packet capture.
- Compare stored Review and annual records before and after inspection; expect no changes.
- Inspect migrated seed findings; expect only the explicitly mapped Review-case links.
- Inspect findings without a mapped case; expect no links inferred from shared workspace context.
- Follow a mapped Review-case link and confirm unchanged evidence.

- Inject a labeled unavailable-Asset fixture in the disposable context. Confirm visible ID, no dead link, and preserved reference.

## Gotchas

Review and annual inspection is read-only. Normal startup migrates raw seed cases to their defined finding links. The test uses that migrated state without inserting relationships. It does not prove production link creation, annual submission, owner approval, recurrence, or review closure. Their existing domain tests remain separate. New annual policy and shared-case behavior are unresolved. Reload resets Application view to Business.
