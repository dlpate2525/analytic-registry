# Analytic Registry glossary

Analytic Registry connects business accountability, analytics content, and evidence from source platforms.

Definitions describe product meaning. Release scope and implementation status belong in the [current V1.2 guide](v1.2-guide.md). Accepted interview decisions and their implementation boundary belong in the [design interview](v1.1-design-interview.md).

## Language

**Workspace**:
A governed area for analytics work: a Power BI workspace, Tableau project, or Alteryx collection.

**Workspace Owner**:
The single person recorded as accountable for a workspace. The owner need not be its business logic or process subject-matter expert.
_Avoid_: Business Owner as an interchangeable label for Workspace Owner, or a second workspace-owner field.

**Champion**:
A designated person who contributes relevant expertise and coordinates workspace reviews, changes, and Annual Attestation. All Champions assigned to a workspace have equal Champion authority, with no hierarchy. Champions provide approval of request declarations about business purpose, sensitive data, and access. Champion responsibility alone neither requires nor grants publish/modify access.

**Workspace business line**:
The declared business area supported by a workspace, used for registry reporting. It is independent of the Workspace Owner's directory business line.

**Business-process subject matter expert (SME)**:
A person with expertise in the business logic or process supported by the workspace. When a technology team builds for others, this person participates as a Champion.

**Effective responsibility**:
An owner or Champion assignment whose required approval is complete and whose recorded effective date has arrived. Its authority is separate from platform permission changes.

**Asset**:
An identifiable analytics item, such as a report, workbook, semantic model, published data source, or workflow.

**Asset type**:
The registry display classification mapped from an asset's native type. It is separate from the asset's governance declarations and PRL.

**Business asset version**:
A Champion-declared business release of an asset, recorded with a completed Governance & risk evaluation. Several completed evaluations can refer to the same business asset version.
_Avoid_: Treating each imported platform revision as a new business asset version.

**Material business change**:
A change to an asset's business purpose, logic or result meaning, data use, or intended audience and permitted use that requires a new business version.
_Avoid_: Treating a corrected declaration about an unchanged asset, or an equivalent technical change, as a material business change.

**Native revision**:
A version or revision reference reported by the source platform. It is technical evidence, separate from the declared business asset version.

**Accountable workspace**:
The workspace responsible for an asset's business accountability. An asset has at most one current accountable workspace. Its Workspace Owner remains accountable, and its current Champions support the asset.

**Observed membership**:
A platform-reported relationship between an asset and a workspace. Membership does not establish business ownership.

**Asset dependency**:
A relationship in which one asset uses another, such as a report using a semantic model.

**Connection**:
A platform-native connection identity used by one or more assets. Its identity differs from the endpoint it accesses.

**Data source**:
The endpoint, database, schema, file, or service accessed through a connection.
_Avoid_: Using data source as a synonym for every connection or semantic model.

**Native ID**:
The original identifier assigned by the source platform. Its platform, scope, and object type determine its identity namespace.

**Registry ID**:
The permanent identifier assigned by Analytic Registry. It remains separate from native IDs and display names.

**Business declaration**:
A person's statement of intended purpose, accountability, or data use. It is distinct from a platform observation.

**Asset business metadata**:
Business context, governance declarations, and calculated PRL recorded for an asset, including its purpose, audience, and classifications. It is distinct from platform-reported technical details.

**Business registration**:
The approved record of an existing workspace's business purpose, accountability, and declarations, effective from its recorded date. Completion does not establish technical compliance or close linked technical work.
_Avoid_: Using registered to mean technically compliant or fully remediated.

**Requested configuration**:
The setup submitted for approval and implementation.

**Implemented configuration**:
The setup an administrator records as delivered through an external action.

**Implementation receipt**:
A record that external platform work was reported as implemented, with supporting evidence. It does not by itself establish an accepted registry observation.
_Avoid_: Calling an implementation receipt a source delivery or proof of reconciliation.

**Observed state**:
The state reported by a platform or directory at a stated time and scope.

**Evaluation**:
One application of a versioned rule to specific evidence and context.

**Finding**:
A persistent issue with a history of detections, responses, and resolution.
_Avoid_: Calling each repeated detection a new finding.

**Risk bucket**:
A category that groups findings by the concern they address. It does not assign severity or determine an asset's High risk qualification.

**Detection coverage**:
The extent to which a check has the source evidence, business context, and applicable rule needed for an assessment.
_Avoid_: Treating source inventory completeness or a lack of findings as proof that controls passed.

**Finding severity**:
The assessed importance of a tracked issue. It is separate from the finding's result and remediation status.

**Review case**:
A case used to investigate, coordinate action, and approve evidence for one or more findings.
_Avoid_: Review as an ambiguous name for both the case and the shared work queue.

**Asset assessment**:
A record of a completed evaluation of an asset version's business context, governance declarations, and PRL-related information. It is distinct from a Review case and an Annual Attestation.
_Avoid_: Asset attestation.

**High-risk asset**:
An asset with PRL 1, a Yes declaration for PII or EUCT, or DMP Tier 1, Tier 2, or Tier 3. Each condition independently qualifies; this differs from a Finding's severity.

**Annual Attestation**:
A Champion's annual confirmation of workspace information, followed by Application Owner or Platform Owner approval.
_Avoid_: Annual review as a competing name for the same process, or asset attestation.

**Orphan**:
A workspace, asset, or other registry object with a confirmed missing required accountability or association. Its object type and missing requirement identify the issue.
_Avoid_: Treating unregistered records, unresolved identities, or missing rows in partial evidence as confirmed orphans.

**Frozen annual recipients**:
The Champions captured when an annual packet was issued. Later roster changes do not silently replace those recipients.

**Custom configuration**:
An approved alternative to the Standard setup with explicit permissions, reasons, and review conditions. It is not a waiver.

**Data Sources group (DS)**:
The workspace-associated group responsible for creating and maintaining workspace data connections. Its purpose is distinct from general workspace administration.

**DMP tier**:
The Data Management Policy classification: Tier 1, Tier 2, Tier 3, or Untiered. Untiered is an explicit classification, distinct from missing information.

**Highest DMP tier**:
The highest applicable Data Management Policy tier in the declared content. The order is Tier 1, then Tier 2, then Tier 3; Untiered has no numbered rank.

**Calculated PRL**:
An asset's PRL level determined from question answers using a defined calculation method. It differs from a platform-reported tag and the asset's High risk qualification.

**Approved PRL**:
A PRL value supported by recorded approval evidence. Approval is distinct from the method used to determine the level.

**Unable to Verify**:
A result used when required evidence or an applicable rule is insufficient. It is neither proof of alignment nor proof of failure.

**Pending Implementation**:
A difference explained by an approved request that has not yet been delivered and verified. It does not explain unrelated drift.

## Source evidence and identity

**Platform output reference tab**:
A layout guide showing native query or adapter output and its destination table. It is not an import table.

**Staging table**:
A holding area for source observations awaiting validation and acceptance. Presence in staging does not make evidence accepted.

**Platform principal**:
A user, group, or application represented in a source platform. Each has a source identity within its native namespace.

**Directory user**:
A user record in a configured Microsoft Entra tenant. Its object ID, mail address, UPN, and enabled state are separate evidence fields.

**Email match**:
An exact comparison of platform email and directory mail within one configured tenant, ignoring letter case and surrounding spaces. Exactly one matching directory evidence record is required; duplicate or conflicting records remain ambiguous.

**User principal name (UPN)**:
A directory sign-in identifier. It need not equal the mail address and is not an email-match fallback.

**Resolved-disabled**:
A source identity matched to a directory user whose AccountEnabled value is false. The identity is resolved; current accountability needs review.

**Unresolved identity**:
A preserved source principal without an accepted match. Missing, ambiguous, invalid, conflicting, or failed evidence does not prove inactivity.

**Platform Manager review**:
The review destination for every unresolved identity or relationship and for current-accountability review of disabled users.

**RunKey**:
The identifier of one immutable source delivery. It does not identify an enduring workspace, asset, or person.

**ObservedAt**:
The time represented by a source observation or snapshot refresh. A later query or load does not make that evidence newer.

**Technical ownership**:
A platform-reported owner relationship. It does not establish the declared Workspace Owner.

**Person**:
One corporate directory identity, identified by its tenant and directory object ID. Email supports matching; it is not the permanent identity.

**Source identity**:
One source principal identified by instance, scope, namespace, and native ID. Several user accounts can bind to one Person; groups and applications do not.

**Identity binding**:
An accepted, dated relationship between a source identity and a corporate person or directory identity. A candidate email match is not yet an accepted binding.

**Complete snapshot**:
Evidence that covers the stated dataset and scope with a verified row count. A blank file alone does not establish completeness.

**Dataset coverage**:
The stated extent of evidence collected for one dataset and scope. Coverage of assets does not establish coverage of access, connections, or directory identities.

**Partial snapshot**:
Evidence that covers only part of a stated dataset or scope, or whose completeness remains unverified. Missing rows do not establish absence.

**NotCollected**:
A coverage state indicating that no evidence was collected for a dataset. It does not mean that no corresponding objects or relationships exist.

**Evidence age**:
The elapsed time since an observation's source time. It is independent of when the evidence was loaded or reviewed.

**Source delivery**:
One immutable package of source observations with a stated scope and evidence time. It can be replayed without creating new business identities.
_Avoid_: Using delivery alone when it could mean implementation of platform work.

**Delivery acceptance**:
A recorded decision identifying validated source observations that may update the registry. Acceptance does not expand the evidence's declared coverage.

**Registry operator**:
The person who loads source deliveries and records their acceptance after validation. This role does not replace required business or evidence-closure approvals.

**Structural validation error**:
A defect that prevents reliable interpretation or identification of delivered records, such as a missing required key or duplicate record identity. It blocks acceptance of the source delivery.

**Unresolved reference**:
A source reference that cannot be matched using the available evidence. A structurally valid unresolved reference can remain in an accepted delivery with assigned follow-up.
