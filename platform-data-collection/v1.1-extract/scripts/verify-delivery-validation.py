"""Exercise staging diagnostic predicates with synthetic rows in SQLite.

This checks query logic after explicit SQL dialect substitutions. It does not
validate SQL Server syntax, typed imports, permissions, or installed sources.
"""
from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
contract = json.loads((ROOT / "contract.json").read_text(encoding="utf-8"))
source = (ROOT / "sqlserver-validation.sql").read_text(encoding="utf-8")
statements = []
for statement in re.sub(r"--[^\n]*", "", source).split(";"):
    statement = statement.strip()
    if not statement or statement == "SET NOCOUNT ON":
        continue
    assert statement.startswith("SELECT "), "Validator must remain read-only"
    # Preserve each predicate. SQLite uses a correlated count in place of APPLY.
    apply = re.search(r" OUTER APPLY\(SELECT COUNT_BIG\(\*\) n FROM ar11_stage\.\[(\w+)\] d WHERE d.RunKey=c.RunKey\) x", statement)
    if apply:
        count = f"(SELECT COUNT(*) FROM ar11_stage.[{apply.group(1)}] d WHERE d.RunKey=c.RunKey)"
        statement = statement.replace(apply.group(0), "").replace("x.n", count)
    statement = re.sub(r"\bN'", "'", statement).replace("COUNT_BIG(", "COUNT(").replace("nvarchar(max)", "TEXT")
    statements.append(statement)

datasets = [table["sheet"] for table in contract["tables"] if table["sheet"] not in ("Run_Context", "Coverage")]
RUN = "11111111-1111-4111-8111-111111111111"
base = {table["sheet"]: [] for table in contract["tables"]}
base["Run_Context"] = [{"RunKey": RUN, "PlatformCode": "Tableau", "PlatformInstanceKey": "sample-server", "NativeScopeKey": "sample-site", "ObservedAt": "2026-10-09T12:00:00Z", "DirectoryTenantKey": None, "MappingVersion": "1.1", "ScopeDescription": "Synthetic validation scope"}]
base["Coverage"] = [{"RunKey": RUN, "DatasetCode": name, "CoverageStatus": "NotCollected", "RowCount": None} for name in datasets]


def set_rows(data, name, rows, coverage="Partial"):
    data[name] = [{"RunKey": RUN, **row} for row in rows]
    record = next(row for row in data["Coverage"] if row["DatasetCode"] == name)
    record.update(CoverageStatus=coverage, RowCount=len(rows) if coverage in ("Partial", "Complete") else None)


set_rows(base, "Workspaces", [{"NativeWorkspaceID": "project-1", "NativeWorkspaceType": "Project", "DisplayName": "Sample project"}])
set_rows(base, "Assets", [{"NativeAssetID": "workbook-1", "NativeAssetType": "Workbook", "DisplayName": "Sample workbook"}])
set_rows(base, "Workspace_Assets", [{"NativeWorkspaceID": "project-1", "NativeAssetID": "workbook-1", "NativeAssetType": "Workbook", "NativeAssociationType": "ProjectContent"}])


def diagnostics(data):
    with sqlite3.connect(":memory:") as database:
        database.row_factory = sqlite3.Row
        database.create_function("DATALENGTH", 1, lambda value: None if value is None else len(str(value).encode("utf-16-le")))
        database.create_function("CONCAT", -1, lambda *values: "".join("" if value is None else str(value) for value in values))
        database.execute("ATTACH DATABASE ':memory:' AS ar11_stage")
        for table in contract["tables"]:
            name = table["sheet"]
            columns = ", ".join(f'[{column["name"]}] {"INTEGER" if column["type"] in ("bigint", "bit") else "TEXT"}' for column in table["columns"])
            database.execute(f"CREATE TABLE ar11_stage.[{name}] (ImportRowID INTEGER PRIMARY KEY, {columns})")
            for row in data[name]:
                fields = list(row)
                database.execute(f'INSERT INTO ar11_stage.[{name}] ({", ".join("[" + field + "]" for field in fields)}) VALUES ({", ".join("?" for _ in fields)})', [row[field] for field in fields])
        return [dict(row) for statement in statements for row in database.execute(statement).fetchall()]


checks = 0


def check(label, data, blocked=False, issue=None, dataset=None):
    global checks
    issues = diagnostics(data)
    assert any(row["BlocksDelivery"] for row in issues) == blocked, (label, issues)
    assert all(row["IssueClass"] == ("StructuralError" if row["BlocksDelivery"] else "UnresolvedReference") for row in issues), label
    assert all(row["FollowUpOwner"] == "Platform Manager" for row in issues if not row["BlocksDelivery"]), label
    if issue:
        assert any(row["Issue"] == issue and (dataset is None or row.get("Dataset") == dataset) for row in issues), (label, issues)
    checks += 1


check("valid partial delivery", base)
check("empty staging is not a valid delivery", {table["sheet"]: [] for table in contract["tables"]}, True, "No delivery context supplied")
data = deepcopy(base)
data["Workspace_Assets"][0]["NativeAssetID"] = "outside-subset"
check("unresolved membership remains acceptable", data, issue="Unresolved workspace membership")
data["Workspaces"][0]["NativeWorkspaceID"] = ""
check("structural error blocks delivery despite valid unresolved references", data, True, "Missing NativeWorkspaceID")
data = deepcopy(base)
set_rows(data, "Asset_Connections", [{"NativeAssetID": "workbook-1", "NativeAssetType": "Workbook", "NativeConnectionID": "outside-subset", "EvidenceStatusCode": "Partial"}])
check("unresolved connection remains acceptable", data, issue="Unresolved asset connection")
data = deepcopy(base)
set_rows(data, "Asset_Dependencies", [{"NativeAssetID": "workbook-1", "NativeAssetType": "Workbook", "UpstreamNativeAssetID": "outside-subset", "UpstreamNativeAssetType": "PublishedDatasource", "RelationshipCode": "DependsOn", "EvidenceStatusCode": "Partial"}])
check("unresolved dependency remains acceptable", data, issue="Unresolved dependency endpoint")
data = deepcopy(base)
set_rows(data, "Object_Users", [{"NativeObjectID": "outside-subset", "NativeObjectType": "Workbook", "PrincipalRoleCode": "TechnicalOwner", "SourcePrincipalReference": "raw-user-1", "SourceReferenceNamespace": "TableauRepositoryUserID", "SourceReferenceStatusCode": "UnresolvedUserReference"}])
check("unresolved account remains acceptable", data, issue="Unresolved source account")
check("unresolved object remains acceptable", data, issue="Unresolved object endpoint")
data["Object_Users"][0]["SourceReferenceStatusCode"] = "InventedStatus"
check("unknown reference status is structural", data, True, "Unknown source reference status")
data = deepcopy(base)
data["Assets"].append(deepcopy(data["Assets"][0]))
check("duplicate keys block entire delivery", data, True, "Duplicate row key")
data = deepcopy(base)
data["Run_Context"] = []
check("missing delivery context blocks entire delivery", data, True, "Missing Run_Context")
data = deepcopy(base)
data["Coverage"] = [row for row in data["Coverage"] if row["DatasetCode"] != "Assets"]
check("missing coverage blocks entire delivery", data, True, "Missing dataset coverage")
data = deepcopy(base)
data["Coverage"].append({"RunKey": RUN, "DatasetCode": "InventedDataset", "CoverageStatus": "Partial", "RowCount": 0})
check("unknown dataset cannot bypass coverage checks", data, True, "Unknown dataset code")
data = deepcopy(base)
next(row for row in data["Coverage"] if row["DatasetCode"] == "Assets")["RowCount"] = 2
check("mismatched count blocks entire delivery", data, True, "Invalid coverage or row count")
for coverage in ("NotCollected", "Failed"):
    data = deepcopy(base)
    set_rows(data, "Assets", [], coverage)
    check(f"{coverage} preserves unresolved references", data, issue="Unresolved workspace membership")
    next(row for row in data["Coverage"] if row["DatasetCode"] == "Assets")["RowCount"] = 0
    check(f"{coverage} must not claim zero objects", data, True, "Invalid coverage or row count")
    data = deepcopy(base)
    next(row for row in data["Coverage"] if row["DatasetCode"] == "Assets").update(CoverageStatus=coverage, RowCount=None)
    check(f"{coverage} cannot carry accepted observations", data, True, "Invalid coverage or row count")
data = deepcopy(base)
set_rows(data, "Assets", [], "Complete")
check("verified empty inventory does not reject unresolved external references", data, issue="Unresolved workspace membership")
next(row for row in data["Coverage"] if row["DatasetCode"] == "Assets")["RowCount"] = None
check("complete coverage requires exact count", data, True, "Invalid coverage or row count")
assert base["Assets"][0]["NativeAssetID"] == "workbook-1", "Fixtures must not be changed by validation"

# Counts describe the delivered subset. They must not be omitted for Partial.
for name in datasets:
    data = deepcopy(base)
    if name == "Directory_Users":
        data = {table["sheet"]: [] for table in contract["tables"]}
        data["Run_Context"] = [{**deepcopy(base["Run_Context"][0]), "PlatformCode": "Directory", "DirectoryTenantKey": "sample-tenant"}]
        data["Coverage"] = deepcopy(base["Coverage"])
        for row in data["Coverage"]:
            row.update(CoverageStatus="NotCollected", RowCount=None)
    set_rows(data, name, data[name], "Partial")
    check(f"{name} partial count matches delivered rows", data)
    coverage = next(row for row in data["Coverage"] if row["DatasetCode"] == name)
    coverage["RowCount"] = None
    check(f"{name} partial count is required", data, True, "Invalid coverage or row count", name)
    coverage["RowCount"] = -1
    check(f"{name} rejects a negative partial count", data, True, "Invalid coverage or row count", name)

# The inventory contract uses fixed platform identity namespaces, not display classifications.
native_types = {"PowerBI": ("Report", "Dataset"), "Tableau": ("Workbook", "PublishedDatasource"), "Alteryx": ("Workflow",)}
workspace_types = {"PowerBI": "Workspace", "Tableau": "Project", "Alteryx": "Collection"}
for platform, allowed_types in native_types.items():
    for native_type in allowed_types:
        data = deepcopy(base)
        data["Run_Context"][0]["PlatformCode"] = platform
        data["Workspaces"][0]["NativeWorkspaceType"] = workspace_types[platform]
        data["Assets"][0]["NativeAssetType"] = native_type
        data["Workspace_Assets"][0]["NativeAssetType"] = native_type
        check(f"{platform} accepts {native_type} inventory and membership", data)
    for name in ("Assets", "Workspace_Assets"):
        wrong_platform_type = "Workflow" if platform != "Alteryx" else "Workbook"
        for invalid_type in ("InventedType", wrong_platform_type, allowed_types[0].lower(), allowed_types[0] + " "):
            data = deepcopy(base)
            data["Run_Context"][0]["PlatformCode"] = platform
            data["Workspaces"][0]["NativeWorkspaceType"] = workspace_types[platform]
            data["Assets"][0]["NativeAssetType"] = allowed_types[0]
            data["Workspace_Assets"][0]["NativeAssetType"] = allowed_types[0]
            data[name][0]["NativeAssetType"] = invalid_type
            check(f"{platform} {name} rejects {invalid_type!r}", data, True, "Unsupported native asset type for platform", name)
    data = deepcopy(base)
    data["Run_Context"][0]["PlatformCode"] = platform
    data["Workspaces"][0]["NativeWorkspaceType"] = workspace_types[platform]
    data["Assets"][0]["NativeAssetType"] = allowed_types[0]
    data["Workspace_Assets"][0].update(NativeAssetType=allowed_types[0], NativeAssetID="valid-type-outside-subset")
    check(f"{platform} retains valid unresolved inventory membership", data, issue="Unresolved workspace membership")

for platform, classification in (("PowerBI", "SemanticModel"), ("Alteryx", "AnalyticApp"), ("Alteryx", "Macro")):
    data = deepcopy(base)
    data["Run_Context"][0]["PlatformCode"] = platform
    data["Assets"][0]["NativeAssetType"] = classification
    check(f"{classification} requires the documented identity namespace mapping", data, True, "Unsupported native asset type for platform", "Assets")

# Directory deliveries may contain their own users, but no platform dataset rows.
directory = {table["sheet"]: [] for table in contract["tables"]}
directory["Run_Context"] = [{**deepcopy(base["Run_Context"][0]), "PlatformCode": "Directory", "DirectoryTenantKey": "sample-tenant"}]
directory["Coverage"] = [
    {"RunKey": RUN, "DatasetCode": name, "CoverageStatus": "NotCollected", "RowCount": None}
    for name in datasets
]
set_rows(directory, "Directory_Users", [{"DirectoryObjectID": "person-1", "DisplayName": "Sample person", "Mail": "person@example.test", "AccountEnabled": 1}])
check("valid companion directory delivery", directory)
platform_rows = {
    "Workspaces": {"NativeWorkspaceID": "project-1", "NativeWorkspaceType": "Project", "DisplayName": "Sample project"},
    "Assets": {"NativeAssetID": "workbook-1", "NativeAssetType": "Workbook", "DisplayName": "Sample workbook"},
    "Workspace_Assets": {"NativeWorkspaceID": "project-1", "NativeAssetID": "workbook-1", "NativeAssetType": "Workbook", "NativeAssociationType": "ProjectContent"},
    "Connections": {"NativeConnectionID": "connection-1", "TechnologyCode": "Undefined", "EvidenceStatusCode": "Partial"},
    "Asset_Connections": {"NativeAssetID": "workbook-1", "NativeAssetType": "Workbook", "NativeConnectionID": "connection-1", "EvidenceStatusCode": "Partial"},
    "Asset_Dependencies": {"NativeAssetID": "workbook-1", "NativeAssetType": "Workbook", "UpstreamNativeAssetID": "source-1", "UpstreamNativeAssetType": "PublishedDatasource", "RelationshipCode": "DependsOn", "EvidenceStatusCode": "Partial"},
    "Platform_Users": {"NativePrincipalID": "user-1", "IdentifierNamespace": "TableauUserLUID", "PrincipalTypeCode": "User"},
    "Object_Users": {"NativeObjectID": "workbook-1", "NativeObjectType": "Workbook", "PrincipalRoleCode": "TechnicalOwner", "SourcePrincipalReference": "raw-user-1", "SourceReferenceNamespace": "TableauRepositoryUserID", "SourceReferenceStatusCode": "UnresolvedUserReference"},
}
for name, row in platform_rows.items():
    data = deepcopy(directory)
    set_rows(data, name, [row])
    check(f"directory run rejects {name} rows", data, True, "Platform rows cannot use a Directory run", name)
    blocking = {row["Issue"] for row in diagnostics(data) if row["BlocksDelivery"]}
    assert blocking == {"Platform rows cannot use a Directory run"}, (name, blocking)
data = deepcopy(base)
set_rows(data, "Directory_Users", [{"DirectoryObjectID": "person-1"}])
check("platform run rejects directory rows", data, True, "Directory rows require a Directory run")
data = deepcopy(base)
for name, records in directory.items():
    data[name].extend({**row, "RunKey": "33333333-3333-4333-8333-333333333333"} for row in records)
check("separate platform and directory runs retain their own dataset source boundaries", data)

# Case identity remains stable across deliveries and mutable names. Scope and native references still distinguish cases.
data = deepcopy(base)
data["Workspace_Assets"][0]["NativeAssetID"] = "outside-subset"
first = next(row for row in diagnostics(data) if row["Issue"] == "Unresolved workspace membership")
retry = deepcopy(data)
for records in retry.values():
    for row in records:
        row["RunKey"] = "22222222-2222-4222-8222-222222222222"
retry["Workspaces"][0]["DisplayName"] = "Renamed project"
retry["Run_Context"][0]["ObservedAt"] = "2026-11-09T12:00:00Z"
second = next(row for row in diagnostics(retry) if row["Issue"] == "Unresolved workspace membership")
assert first["FollowUpKey"] == second["FollowUpKey"] and first["RunKey"] != second["RunKey"]
checks += 1
for field in ("PlatformInstanceKey", "NativeScopeKey", "PlatformCode"):
    other = deepcopy(data)
    other["Run_Context"][0][field] = "different-source"
    assert first["FollowUpKey"] != next(row for row in diagnostics(other) if row["Issue"] == "Unresolved workspace membership")["FollowUpKey"]
    checks += 1
other = deepcopy(data)
other["Workspace_Assets"][0]["NativeAssetID"] = "OUTSIDE-SUBSET"
assert first["FollowUpKey"] != next(row for row in diagnostics(other) if row["Issue"] == "Unresolved workspace membership")["FollowUpKey"]
checks += 1
left, right = deepcopy(data), deepcopy(data)
left["Run_Context"][0].update(PlatformInstanceKey="a|b", NativeScopeKey="c")
right["Run_Context"][0].update(PlatformInstanceKey="a", NativeScopeKey="b|c")
assert diagnostics(left)[0]["FollowUpKey"] != diagnostics(right)[0]["FollowUpKey"]
checks += 1
data = deepcopy(base)
set_rows(data, "Object_Users", [{"NativeObjectID": "workbook-1", "NativeObjectType": "Workbook", "PrincipalRoleCode": "TechnicalOwner", "SourcePrincipalReference": "raw-user-1", "SourceReferenceNamespace": "TableauRepositoryUserID", "NativePrincipalID": "user-1", "IdentifierNamespace": "TableauUserLUID", "SourceReferenceStatusCode": "UnverifiedMapping"}])
set_rows(data, "Platform_Users", [{"NativePrincipalID": "user-1", "IdentifierNamespace": "TableauUserLUID", "PrincipalTypeCode": "User", "DisplayName": "Sample person", "SourceEmail": "before@example.test"}])
before_key = next(row for row in diagnostics(data) if row["Issue"] == "Unresolved source account")["FollowUpKey"]
data["Platform_Users"][0].update(DisplayName="Renamed person", SourceEmail="after@example.test")
assert before_key == next(row for row in diagnostics(data) if row["Issue"] == "Unresolved source account")["FollowUpKey"]
checks += 1
data["Object_Users"][0]["NativeRole"] = ""
assert before_key != next(row for row in diagnostics(data) if row["Issue"] == "Unresolved source account")["FollowUpKey"]
checks += 1
data["Object_Users"][0]["NativeRole"] = None
data["Object_Users"][0]["SourcePrincipalReference"] = "raw-user-1 "
assert before_key != next(row for row in diagnostics(data) if row["Issue"] == "Unresolved source account")["FollowUpKey"]
checks += 1
data["Object_Users"][0]["SourceReferenceStatusCode"] = "ReadyForEmailMatch"
data["Platform_Users"][0]["SourceEmail"] = None
check("missing email remains unresolved despite claimed source readiness", data, issue="Unresolved source account")
# Mutable workspace subtypes must not split source-account or endpoint cases.
data = deepcopy(base)
set_rows(data, "Object_Users", [{"NativeObjectID": "workspace-outside-scope", "NativeObjectType": "Workspace", "PrincipalRoleCode": "TechnicalOwner", "SourcePrincipalReference": "raw-user-1", "SourceReferenceNamespace": "PowerBIIdentifier", "SourceReferenceStatusCode": "UnresolvedUserReference"}])
workspace_keys = {row["Issue"]: row["FollowUpKey"] for row in diagnostics(data) if not row["BlocksDelivery"]}
for subtype in ("PersonalGroup", "Project", "Collection"):
    data["Object_Users"][0]["NativeObjectType"] = subtype
    subtype_keys = {row["Issue"]: row["FollowUpKey"] for row in diagnostics(data) if not row["BlocksDelivery"]}
    assert workspace_keys == subtype_keys
    checks += 1
data["Object_Users"][0]["NativeObjectType"] = "Report"
asset_keys = {row["Issue"]: row["FollowUpKey"] for row in diagnostics(data) if not row["BlocksDelivery"]}
assert all(workspace_keys[issue] != asset_keys[issue] for issue in workspace_keys)
checks += 1
# Workspace subtype is descriptive; it is not an extra endpoint identity key.
data = deepcopy(base)
data["Workspaces"][0]["NativeWorkspaceType"] = "PersonalGroup"
set_rows(data, "Object_Users", [{"NativeObjectID": "project-1", "NativeObjectType": "Workspace", "PrincipalRoleCode": "TechnicalOwner", "SourcePrincipalReference": "raw-user-1", "SourceReferenceNamespace": "PowerBIIdentifier", "SourceReferenceStatusCode": "UnresolvedUserReference"}])
for subtype in ("Workspace", "Project", "Collection", "PersonalGroup"):
    data["Object_Users"][0]["NativeObjectType"] = subtype
    assert not any(row["Issue"] == "Unresolved object endpoint" for row in diagnostics(data))
    checks += 1
data["Object_Users"][0]["NativeObjectType"] = "Report"
assert any(row["Issue"] == "Unresolved object endpoint" for row in diagnostics(data)), "An asset cannot resolve through a workspace with the same ID"
checks += 1
print(f"{checks} delivery validation scenarios passed across {len(statements)} diagnostic queries (SQLite predicate harness). SQL Server execution remains unverified.")
