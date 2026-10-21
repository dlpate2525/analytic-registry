"""Execute source-query projections with explicit SQLite dialect substitutions.

This checks producer logic, not SQL Server syntax, types, permissions, or the
installed Alteryx export shape. No source connection or persistent write occurs.
"""
import json
from copy import deepcopy
from contextlib import redirect_stdout
import io
from pathlib import Path
import re
import runpy
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
POWERBI = (ROOT / 'queries/powerbi-export-sqlserver.sql').read_text(encoding='utf-8')
ALTERYX = (ROOT / 'queries/alteryx-sqlserver.sql').read_text(encoding='utf-8')
RUN = '11111111-1111-4111-8111-111111111111'
with redirect_stdout(io.StringIO()):
    VALIDATION = runpy.run_path(str(ROOT / 'scripts/verify-delivery-validation.py'))


def translate(sql):
    sql = re.sub(r'--[^\n]*', '', sql)
    # SQLite has no lateral APPLY over a derived SELECT. Retain its original
    # FROM/WHERE in correlated aggregate subqueries for the owner projection.
    matched = re.search(r'OUTER APPLY \(\s*SELECT COUNT\(\*\) AS MatchCount,MAX\(p.GraphID\) AS GraphID,MAX\(p.Email\) AS Email(.*?)\) matched', sql, re.S)
    if matched:
        sql = sql.replace(matched.group(0), '')
        for column, aggregate in [('MatchCount', 'COUNT(*)'), ('GraphID', 'MAX(p.GraphID)'), ('Email', 'MAX(p.Email)')]:
            sql = sql.replace(f'matched.{column}', f'(SELECT {aggregate}{matched.group(1)})')
    roles = "CROSS APPLY (VALUES\n ('TechnicalOwner',JSON_VALUE(a.Doc,'$.createdById')),\n ('ModifiedBy',JSON_VALUE(a.Doc,'$.modifiedById'))\n) v(RoleCode,NativeReference)"
    if roles in sql:
        sql = sql.replace(roles, "CROSS JOIN json_each('[\"TechnicalOwner\",\"ModifiedBy\"]') v")
        sql = sql.replace('v.RoleCode', 'v.value').replace('v.NativeReference', "(CASE v.value WHEN 'TechnicalOwner' THEN JSON_VALUE(a.Doc,'$.createdById') ELSE JSON_VALUE(a.Doc,'$.modifiedById') END)")
    sql = re.sub(r"\bN'", "'", sql)
    sql = sql.replace('COUNT_BIG(', 'COUNT(').replace('JSON_VALUE(', 'json_extract(').replace('JSON_QUERY(', 'json_extract(')
    sql = re.sub(r'\s+COLLATE Latin1_General_100_BIN2', '', sql)
    sql = sql.replace('@RunKey', ':run_key').replace('@ScanJson', ':scan_json')
    sql = re.sub(r'@(W|A|C|P|AC|AD|PU|OU)\b', r'\1', sql)
    sql = sql.replace('nvarchar(max)', 'TEXT').replace('LEFT(', 'LEFT_FN(')
    sql = sql.replace('ar_source.', '')
    sql = sql.replace("COALESCE(Type,'Undefined')+' ('+ID+')'", "COALESCE(Type,'Undefined')||' ('||ID||')'")
    sql = sql.replace("NOT LIKE '%[/?@#=; ]%'", "NOT GLOB '*[/?@#=; ]*'")
    # OPENJSON and json_each are both correlated table functions. Translate
    # their type codes explicitly; no producer filter is omitted.
    sql = re.sub(r'CROSS APPLY OPENJSON\(', 'CROSS JOIN json_each(', sql)
    sql = sql.replace('OPENJSON(', 'json_each(')
    sql = re.sub(r'\b(\w+)\.type(?=\s*(?:[=<>]|NOT|IN))', r"(CASE \1.type WHEN 'null' THEN 0 WHEN 'text' THEN 1 WHEN 'integer' THEN 2 WHEN 'real' THEN 2 WHEN 'true' THEN 3 WHEN 'false' THEN 3 WHEN 'array' THEN 4 WHEN 'object' THEN 5 END)", sql)
    return sql


def connect():
    db = sqlite3.connect(':memory:')
    db.row_factory = sqlite3.Row
    db.create_function('DATALENGTH', 1, lambda v: None if v is None else len(str(v).encode('utf-16-le')))
    db.create_function('LEFT_FN', 2, lambda v, n: None if v is None else v[:n])
    db.create_function('CHARINDEX', 2, lambda part, value: None if value is None else value.find(part) + 1)
    return db


def result_sql(source, name):
    marker = re.search(r'^-- ' + name + r'(?=[:.\s])', source, re.M)
    body = re.sub(r'--[^\n]*', '', source[marker.start():])
    end = next(m.end() for m in re.finditer(r"'(?:''|[^'])*'|;", body) if m.group(0) == ';')
    return body[body.index('SELECT '):end]


def scan_delivery(scan):
    with connect() as db:
        context = {'run_key': RUN, 'scan_json': json.dumps(scan)}
        # Execute the actual table projections. Only table declarations and SQL
        # dialect forms change; expected row values are not supplied by the test.
        for name, schema in re.findall(r'DECLARE @(\w+) TABLE \((.*?)\);', POWERBI, re.S):
            db.execute(f'CREATE TABLE {name} ({translate(schema)})')
        for name, select in re.findall(r'INSERT @(\w+)\s+(SELECT.*?);', POWERBI, re.S):
            db.execute(f'INSERT INTO {name} ' + translate(select), context)
        delivery = deepcopy(VALIDATION['base'])
        delivery['Run_Context'][0]['PlatformCode'] = 'PowerBI'
        for name in delivery:
            if name != 'Run_Context':
                delivery[name] = [dict(row) for row in db.execute(translate(result_sql(POWERBI, name)), context)]
        return delivery


def alteryx_members(members, users=()):
    sql = ALTERYX.split('-- Dataset: Object_Users (11).', 1)[1].split('-- Supplemental diagnostic', 1)[0]
    sql = sql[sql.index(';WITH '):]
    with connect() as db:
        db.execute('CREATE TABLE Alteryx_Collections (CollectionId TEXT, OwnerId TEXT, UsersJson TEXT)')
        db.execute('CREATE TABLE Alteryx_AppInfos (AppInfoId TEXT, CreatedBy TEXT)')
        db.execute('CREATE TABLE Alteryx_Users (UserId TEXT, Email TEXT)')
        db.execute('INSERT INTO Alteryx_Collections VALUES (?,NULL,?)', ['collection-1', members if isinstance(members, str) else json.dumps(members)])
        db.executemany('INSERT INTO Alteryx_Users VALUES (?,?)', users)
        return [dict(r) for r in db.execute(translate(sql), {'run_key': RUN}) if r['PrincipalRoleCode'] == 'CollectionMember']


def member_preflight(members):
    with connect() as db:
        db.execute('CREATE TABLE Alteryx_Collections (CollectionId TEXT, UsersJson TEXT)')
        db.execute('INSERT INTO Alteryx_Collections VALUES (?,?)', ['collection-1', members if isinstance(members, str) else json.dumps(members)])
        for code in (51018, 51027, 51028, 51019):
            end = ALTERYX.index(f'THROW {code}')
            begin = ALTERYX.rfind('IF EXISTS (', 0, end)
            condition = ALTERYX[begin + len('IF '):end].strip()
            if db.execute('SELECT ' + translate(condition)).fetchone()[0]:
                return code
    return None


def member_delivery(rows):
    delivery = deepcopy(VALIDATION['base'])
    delivery['Run_Context'][0]['PlatformCode'] = 'Alteryx'
    delivery['Workspaces'][0].update(NativeWorkspaceID='collection-1', NativeWorkspaceType='Collection')
    VALIDATION['set_rows'](delivery, 'Assets', [])
    VALIDATION['set_rows'](delivery, 'Workspace_Assets', [])
    VALIDATION['set_rows'](delivery, 'Object_Users', rows)
    return VALIDATION['diagnostics'](delivery)


class Producers(unittest.TestCase):
    def assert_scan_counts(self, scan):
        delivery = scan_delivery(scan)
        for row in delivery['Coverage']:
            expected = None if row['CoverageStatus'] == 'NotCollected' else len(delivery[row['DatasetCode']])
            self.assertEqual(row['RowCount'], expected, row)
            self.assertNotEqual(row['CoverageStatus'], 'Complete')
        blockers = [r for r in VALIDATION['diagnostics'](delivery) if r['BlocksDelivery']]
        self.assertEqual(blockers, [])
        return delivery

    def test_scan_empty_and_absent_arrays(self):
        for scan in ({'workspaces': []}, {'workspaces': [{'id': 'w', 'name': 'W'}]},
                     {'workspaces': [{'id': 'w', 'name': 'W', 'users': [], 'reports': [], 'datasets': []}], 'datasourceInstances': []}):
            with self.subTest(scan=scan):
                self.assert_scan_counts(scan)

    def test_scan_counts_distinct_people_all_roles_and_unresolved_edges(self):
        user = {'graphId': 'graph-1', 'identifier': 'account-1', 'principalType': 'User', 'emailAddress': 'one@example.test', 'displayName': 'One'}
        scan = {'workspaces': [{'id': 'w', 'name': 'W', 'users': [{**user, 'groupUserAccessRight': 'Admin'}],
            'reports': [
                {'id': 'r1', 'name': 'R1', 'datasetId': 'd', 'createdById': 'graph-1', 'modifiedById': 'unknown', 'users': [{**user, 'reportUserAccessRight': 'Read'}]},
                {'id': 'r2', 'name': 'R2', 'datasetId': 'missing', 'datasetWorkspaceId': 'other'}],
            'datasets': [{'id': 'd', 'name': 'D', 'users': [{**user, 'datasetUserAccessRight': 'Read'}],
                'datasourceUsages': [{'datasourceInstanceId': 'c1'}],
                'misconfiguredDatasourceUsages': [{'datasourceInstanceId': 'missing-c'}]}]}],
            'datasourceInstances': [{'datasourceId': 'c1', 'datasourceType': 'SQL'}]}
        delivery = self.assert_scan_counts(scan)
        self.assertEqual(len(delivery['Platform_Users']), 1)
        self.assertEqual(len(delivery['Object_Users']), 7)
        self.assertEqual([r['EvidenceStatusCode'] for r in delivery['Asset_Connections']], ['Observed', 'Unresolved'])
        self.assertEqual([r['EvidenceStatusCode'] for r in delivery['Asset_Dependencies']], ['Observed', 'Unresolved'])
        owners = [r for r in delivery['Object_Users'] if r['PrincipalRoleCode'] == 'TechnicalOwner']
        self.assertEqual([r['SourceReferenceStatusCode'] for r in owners], ['ReadyForEmailMatch', 'MissingSourceReference'])

    def test_sid_members_preserve_raw_identity_without_resolving(self):
        members = [{'UserId': None, 'ActiveDirectoryObject': [{'Sid': f'S-1-5-21-{n}'}]} for n in (1, 2)]
        rows = alteryx_members(members, [('S-1-5-21-1', 'wrong@example.test')])
        self.assertEqual([r['SourcePrincipalReference'] for r in rows], ['S-1-5-21-1', 'S-1-5-21-2'])
        self.assertTrue(all(r['SourceReferenceNamespace'] == 'ActiveDirectorySID' for r in rows))
        self.assertTrue(all(r['NativePrincipalID'] is None and r['IdentifierNamespace'] is None for r in rows))
        self.assertTrue(all(r['SourceReferenceStatusCode'] == 'UnresolvedUserReference' for r in rows))
        self.assertIsNone(member_preflight(members))
        issues = member_delivery(rows)
        self.assertFalse(any(r['BlocksDelivery'] for r in issues))
        self.assertEqual(sum(r['Issue'] == 'Unresolved source account' for r in issues), 2)

    def test_user_id_precedence_and_supported_directory_shapes(self):
        for directory in ({'Sid': 'SID-raw'}, [{'Sid': 'SID-raw'}]):
            with self.subTest(directory=directory):
                member = {'UserId': 'gallery-1', 'ActiveDirectoryObject': directory}
                self.assertIsNone(member_preflight([member]))
                row = alteryx_members([member], [('gallery-1', 'one@example.test')])[0]
                self.assertEqual(row['SourcePrincipalReference'], 'gallery-1')
                self.assertEqual(row['SourceReferenceNamespace'], 'AlteryxMongoUserID')
                self.assertEqual(row['NativePrincipalID'], 'gallery-1')
                self.assertEqual(row['SourceReferenceStatusCode'], 'ReadyForEmailMatch')
                member['UserId'] = None
                raw = alteryx_members([member])[0]
                self.assertEqual(raw['SourcePrincipalReference'], 'SID-raw')
                self.assertEqual(raw['SourceReferenceNamespace'], 'ActiveDirectorySID')
        for directory in (None, [], {}, {'Sid': None}, {'Sid': ''}, [{}]):
            with self.subTest(missing_directory=directory):
                member = {'ActiveDirectoryObject': directory}
                self.assertIsNone(member_preflight([member]))
                row = alteryx_members([member])[0]
                self.assertEqual(row['SourceReferenceStatusCode'], 'MissingSourceReference')
                self.assertIsNone(row['SourcePrincipalReference'])
        boundary = [{'ActiveDirectoryObject': {'Sid': 'x' * 200}}]
        self.assertIsNone(member_preflight(boundary))
        self.assertEqual(alteryx_members(boundary)[0]['SourcePrincipalReference'], 'x' * 200)

    def test_malformed_and_ambiguous_directory_evidence_is_rejected(self):
        malformed = [
            ([{'ActiveDirectoryObject': 'unsupported'}], 51027),
            ([{'ActiveDirectoryObject': [None]}], 51027),
            ([{'ActiveDirectoryObject': [{'Sid': 'a'}, {'Sid': 'b'}]}], 51027),
            ([{'ActiveDirectoryObject': [{'Sid': 'same'}, {'Sid': 'same'}]}], 51027),
            ('[{"ActiveDirectoryObject":{},"ActiveDirectoryObject":{}}]', 51027),
            ('[{"ActiveDirectoryObject":{"Sid":"a","Sid":"b"}}]', 51028),
            ('[{"ActiveDirectoryObject":[{"Sid":"a","Sid":"a"}]}]', 51028),
        ]
        for sid in (1, True, {}, [], 'x' * 201, '\U0001f600' * 101, ' leading', 'trailing '):
            malformed.append(([{'ActiveDirectoryObject': {'Sid': sid}}], 51028))
        for user in (1, True, {}, [], 'x' * 201, ' leading', 'trailing '):
            malformed.append(([{'UserId': user, 'ActiveDirectoryObject': {'Sid': 'valid-sid'}}], 51018))
        malformed.append(('[{"UserId":"a","UserId":"b","ActiveDirectoryObject":{"Sid":"valid-sid"}}]', 51018))
        for members, code in malformed:
            with self.subTest(members=members):
                self.assertEqual(member_preflight(members), code)

    def test_duplicate_and_missing_references_remain_visible(self):
        for members in ([{'ActiveDirectoryObject': {'Sid': 'same'}}] * 2, [{}, {}]):
            with self.subTest(members=members):
                self.assertIsNone(member_preflight(members))
                rows = alteryx_members(members)
                self.assertEqual(len(rows), 2)
                issues = member_delivery(rows)
                self.assertTrue(any(r['BlocksDelivery'] and r['Issue'] == 'Duplicate row key' for r in issues))
        self.assertEqual(member_preflight([{'UserId': 'same'}, {'UserId': 'same'}]), 51019)

    def test_empty_scan_counts_match_exported_rows(self):
        sql = POWERBI.split('-- Coverage:', 1)[1].split('-- SUPPLEMENTAL:', 1)[0]
        sql = re.sub(r'--[^\n]*', '', sql)
        sql = translate(sql[sql.index('SELECT '):])
        for users in (False, True):
            with self.subTest(users_array=users), sqlite3.connect(':memory:') as db:
                db.row_factory = sqlite3.Row
                for table in ('W', 'A', 'C', 'AC', 'AD', 'PU', 'OU'):
                    db.execute(f'CREATE TABLE {table} (Doc TEXT)')
                workspace = {'id': 'workspace-1', 'name': 'Empty workspace'}
                if users:
                    workspace['users'] = []
                db.execute('INSERT INTO W VALUES (?)', [json.dumps(workspace)])
                rows = list(db.execute(sql, {'run_key': RUN, 'scan_json': json.dumps({'workspaces': [workspace]})}))
                for row in rows:
                    expected = None if row['CoverageStatus'] == 'NotCollected' else (1 if row['DatasetCode'] == 'Workspaces' else 0)
                    self.assertEqual(row['RowCount'], expected, dict(row))


if __name__ == '__main__':
    print('Producer fixtures use SQLite substitutions. SQL Server and installed exports remain unverified.')
    unittest.main(verbosity=2)
