# Analytic Registry: seven critiques and simplifications

Engineering and executive review · 6 October 2026

**Recommendation:** Make the next iteration about completing work with confidence. Prioritize clear ownership, fewer decisions, and trustworthy evidence before adding more screens.

This review covers the current React prototype and its proposed Power Apps model. Findings below come from the code, rendered screens, and project documentation. Production capabilities are proposals, not implemented controls.

## 1. Make every dashboard number explain what requires action

**Critique:** Some labels imply more precision than the calculations provide. “Your requests” counts every saved request. “Annual reviews due” includes all incomplete reviews for the user's workspaces, without a due-date cutoff. The next-steps list uses array order rather than urgency.

**Streamline:** Keep four cards: My workspaces, My open requests, Actions awaiting me, and Reviews due within an agreed period. Define each card's owner scope, status filter, and date window. Open the exact same population when clicked. Rank next actions by overdue date, severity, and due date.

**Executive value:** Users can trust the dashboard to direct their work. Leaders can distinguish workload from overdue obligations.

**Acceptance:** Every card count matches its destination list. A future review does not appear overdue. Requests belonging to another user do not appear as “mine.”

Priority: **Next iteration.** Evidence: [Business dashboard](analytic-registry/src/pages/BusinessHome.tsx).

## 2. Turn Standard setup into a reusable template

**Critique:** Users repeatedly handle four similar group forms. Standard definitions are also duplicated: the request now includes `_DS`, while the Standards page still describes Champion, `_RW`, and `_R` only. This creates inconsistent instructions.

**Streamline:** Define one versioned Standard template containing group purposes, suffixes, required fields, and guidance. Generate the group summary from it. Show four compact rows with an **Edit** action; expand only the selected group. Keep New/Existing selection and confirmed directory IDs explicit. Generate names from the workspace name until a user deliberately overrides them.

**Executive value:** Faster onboarding and fewer configuration errors, with one place to maintain the approved standard.

**Acceptance:** Changing the template updates the request, validation, and guidance together. A requested group remains pending until its existence is verified.

Priority: **Next iteration.** Evidence: [Group defaults](analytic-registry/src/utils/requestGroups.ts), [Standards page](analytic-registry/src/pages/Admin.tsx).

## 3. Give each user one action inbox

**Critique:** Administrative work is divided among twelve queue cards, findings, requests, and attestations. The queue cards even draw from different record types. Users must understand the system's categories before finding their next task.

**Streamline:** Provide one inbox with saved views: **Assigned to me**, **Awaiting approval**, **Waiting on business**, and **Overdue**. Show action, workspace, asset, assignee, due date, and status. Keep risk buckets and platform categories as filters. Retain findings as evidence records linked to work items; one investigation may address several findings.

**Executive value:** Clear accountability and a measurable backlog, without counting every detection as a separate task.

**Acceptance:** Every actionable item has one accountable assignee, one next action, and one due date. Users can reach the source request, finding, or attestation from that item.

Priority: **Next iteration.** Evidence: [Review queues](analytic-registry/src/features/reviews/Reviews.tsx).

## 4. Make relationship mapping consistent without widening every table

**Critique:** Separate Workspace and Asset columns improve traceability, but long names crowd the tables. A dash can mean that a record has no linked asset; it does not prove that no asset exists. Connection-only issues also need their own context.

**Streamline:** Use linked business names with stable IDs underneath. Include both columns when the row genuinely maps both entities. Keep workspace-only processes focused on their workspace. Put extended lineage in the record detail: **Workspace → Asset → Connection → Data source**. Distinguish direct associations, associations through linked findings, and missing evidence. Never create an association from matching names.

**Executive value:** Faster investigation with less visual noise and fewer incorrect ownership assumptions.

**Acceptance:** An orphaned asset shows its asset link and missing governed workspace. Connection-only findings retain their connection reference. Multiple mappings remain explicit.

Priority: **Next iteration.** Evidence: [Shared mapping display](analytic-registry/src/components/RecordMapping.tsx), [Domain records](analytic-registry/src/types/index.ts).

## 5. Define completion as a controlled transition

**Critique:** Requests currently stop at Draft or Submitted. Reviews expose broad status choices. Approval receipts and closure checks exist, but the prototype does not yet model the complete implementation lifecycle.

**Streamline:** Define allowed transitions and replace unrestricted status selection with actions such as **Submit**, **Approve**, **Record implementation**, and **Verify**. Use a concise request lifecycle: Draft → Awaiting approval → Ready for implementation → Awaiting verification → Complete. Keep correction and cancellation paths explicit. Preserve the agreed approver roles and invalidate approval when its bound content changes.

**Executive value:** “Approved,” “implemented,” and “verified” become distinct operational commitments.

**Acceptance:** Approval alone cannot complete provisioning. Evidence closure requires verification and the authorized approval. Annual attestation can complete with a linked, assigned follow-up.

Priority: **Before an operational pilot.** Evidence: [Request workflow](analytic-registry/src/features/requests/Requests.tsx), [Approval rules](analytic-registry/src/utils/approvals.ts).

## 6. Separate risk from confidence in the evidence

**Critique:** The prototype correctly distinguishes missing evidence from a discrepancy. However, extracts are static and freshness rules remain undecided. Some dashboard wording says “today” despite a fixed mock snapshot. Users could mistake a current-looking display for current evidence.

**Streamline:** Show the actual observation timestamp and a compact evidence state: **Current**, **Stale**, **Incomplete**, or **Unavailable**. Define freshness and completeness by platform and rule. Keep this separate from severity and assessment result. Use the same evaluation logic in the dashboard, finding, and closure workflow.

**Executive value:** Decisions reflect both potential harm and how well the organization understands it.

**Acceptance:** Old or incomplete evidence cannot imply alignment. A pending requested change remains separate from drift in the implemented configuration.

Priority: **Before an operational pilot.** Evidence: [Dashboard](analytic-registry/src/pages/Dashboard.tsx), [Comparison logic](analytic-registry/src/utils/logic.ts), [Known limitations](analytic-registry/README.md).

## 7. Deliver the production architecture in focused slices

**Critique:** The proposed model has 52 tables, while the working prototype uses local browser storage and simulated roles. Building the entire model at once would delay validation of the operating process. Large screen components also mix display, decisions, and data updates.

**Streamline:** Retain related tables rather than one large table. Start with one platform and one complete lifecycle: workspace request, groups, approval, implementation evidence, and verification. Give Power Apps focused read views and server-side commands. Enforce identity, authorization, valid transitions, and concurrent-update checks centrally. Expand asset assessments and additional platforms after this slice works with real users.

**Executive value:** Earlier operational learning, controlled delivery cost, and fewer expensive changes across multiple platforms.

**Acceptance:** Two users can safely work on the same record. Unauthorized actions fail on the server. Audit events identify the actual actor. Requested, implemented, and observed records remain separate.

Priority: **Production foundation.** Evidence: [Storage and state](analytic-registry/src/data/store.tsx), [Proposed data model](analytic-registry/docs/data-model.md).

**Delivery order:** Apply items 1–4 to the prototype. Settle items 5–6 as process rules. Use item 7 to implement those rules in the first production slice. Measure request completion time, correction rate, overdue work, and verified closure time before expanding scope.
