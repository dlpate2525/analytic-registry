# Analytic Registry

Analytic Registry connects business accountability, analytics content, and evidence from source platforms.

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
