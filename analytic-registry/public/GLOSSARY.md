# Analytic Registry â€” glossary

Analytic Registry connects business accountability, analytics content, and evidence from source platforms.

Version `1.0.0-prototype.1`, 8 October 2026; intended tag `v1.0.0-prototype.1`. Definitions describe product meaning. They do not imply every target feature is implemented. See the [V1 baseline](v1-prototype-baseline.md).

## Language

**Workspace**:
A governed area for analytics work: a Power BI workspace, Tableau project, or Alteryx collection.

**Business Owner / Workspace Owner**:
The single person accountable for a workspace's business purpose and declarations. These labels refer to the same role.
_Avoid_: Separate business owner and workspace owner roles.

**Champion**:
A designated person who coordinates workspace reviews, changes, and annual assurance. Champion status does not confer extra platform privileges.

**Asset**:
An identifiable analytics item, such as a report, workbook, semantic model, published data source, or workflow.

**Accountable workspace**:
The workspace responsible for an asset's business accountability. An asset has at most one current accountable workspace.

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

**Requested configuration**:
The setup submitted for approval and implementation.

**Implemented configuration**:
The setup an administrator records as delivered through an external action.

**Observed state**:
The state reported by a platform or directory at a stated time and scope.

**Evaluation**:
One application of a versioned rule to specific evidence and context.

**Finding**:
A persistent issue with a history of detections, responses, and resolution.
_Avoid_: Calling each repeated detection a new finding.

**Administrative review**:
A case used to investigate, coordinate action, and approve evidence for one or more findings.

**Annual attestation**:
A Champion's annual confirmation of workspace information, followed by the required owner-role approval.

**Custom configuration**:
An approved alternative to the Standard setup with explicit permissions, reasons, and review conditions. It is not a waiver.

**Data Sources group (DS)**:
The workspace-associated group responsible for creating and maintaining workspace data connections. Its purpose is distinct from general workspace administration.

**Highest DMP tier**:
The highest applicable Data Management Policy tier in the declared content. The order is Tier 1, then Tier 2, then Tier 3.

**Approved PRL**:
The manually approved PRL value for an asset. Recorded assessment inputs do not by themselves establish a calculated score.

**Unable to Verify**:
A result used when required evidence or an applicable rule is insufficient. It is neither proof of alignment nor proof of failure.

**Pending Implementation**:
A difference explained by an approved request that has not yet been delivered and verified. It does not explain unrelated drift.

## V1 extraction and identity terms

**V1 prototype baseline**:
The frozen React prototype and manual extraction handoff dated 8 October 2026. It is not a production release.

**V1 workbook**:
The empty Excel template with 15 sheets: three guides, three platform output references, and nine import tables with 117 columns.

**Platform output reference tab**:
A layout guide showing native query or adapter output and its destination table. It is not an import table.

**Staging table**:
A SQL Server table that receives raw delivery rows for validation and review. V1 has nine staging tables, separate from the 53-table / 602-column target registry.

**Platform principal**:
A source identity, such as a user, group, or application. Preserve its native ID, namespace, platform instance, and native scope.

**Directory user**:
A user record in a configured Microsoft Entra tenant. Its object ID, mail address, UPN, and enabled state are separate evidence fields.

**Email match**:
V1's exact comparison of normalized platform SourceEmail and directory Mail within one configured tenant. Normalize with lower(trim); require one distinct directory user.

**User principal name (UPN)**:
A directory sign-in identifier. It need not equal the mail address and is not a V1 email fallback.

**Resolved-disabled**:
A source identity matched to a directory user whose AccountEnabled value is false. The identity is resolved; current accountability needs review.

**Unresolved identity**:
A preserved source principal without an accepted match. Missing, ambiguous, invalid, conflicting, or failed evidence does not prove inactivity.

**Platform Manager review**:
The V1 destination for every unresolved identity or relationship and for current-accountability review of disabled users.

**RunKey**:
The existing delivery correlation key. Platform and directory deliveries retain their own keys. V1 does not redesign it.

**ObservedAt**:
The existing timestamp attached to source evidence. Preserve its original source context; a later manual load must not refresh its age.

**Technical ownership**:
A platform-reported owner relationship. It does not establish the declared Business Owner / Workspace Owner. In Power BI, report createdBy is technical-owner evidence.

## V1.1 identity and delivery terms

**Person**:
One corporate directory identity used for business accountability. Its name and email can change without creating another person.

**Source identity**:
One account, group, application principal, or unresolved principal within a source namespace. Several source identities can belong to one person.

**Identity binding**:
An accepted, dated relationship between a source identity and a corporate person or directory identity. A candidate email match is not yet an accepted binding.

**Complete snapshot**:
Evidence that covers the stated dataset and scope with a verified row count. A blank file alone does not establish completeness.

**Delivery**:
One immutable package of source observations with a stated scope and evidence time. It can be replayed without creating new business identities.
