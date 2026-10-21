"""Build synthetic fixtures, never extract or load platform data.

The expected projections below describe the published query contract. They do
not execute the platform SQL. Keep installed-source validation separate.
"""
from pathlib import Path
import csv
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parent
CONTRACT = json.loads((ROOT.parent / 'contract.json').read_text(encoding='utf-8-sig'))
TABLES = {t['sheet']: t for t in CONTRACT['tables']}
TENANT = '90000000-0000-4000-8000-000000000001'
DATE = ['2026-09-01T12:00:00Z', '2026-10-01T12:00:00Z']


def guid(prefix, value):
    return f'{prefix:08d}-0000-4000-8000-{value:012d}'


def oid(value):
    return f'{value:024x}'


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')


def delivery(platform, index, run, scope):
    result = {name: [] for name in TABLES}
    result['Run_Context'] = [dict(zip(
        [c['name'] for c in TABLES['Run_Context']['columns']],
        [run, platform, 'synthetic-' + platform.lower() + '-instance', scope,
         DATE[index], TENANT, '1.1',
         'SYNTHETIC TEST ONLY. Named small scope; intentionally partial inventory. '
         'Not an extract from an installed platform.']))]
    return result


def append(result, table, *values):
    headers = [c['name'] for c in TABLES[table]['columns']]
    assert len(values) == len(headers) - 1, table
    result[table].append(dict(zip(headers, [result['Run_Context'][0]['RunKey'], *values])))


def output(platform, scenario, result, source, collected):
    target = ROOT / platform / scenario
    target.mkdir(parents=True, exist_ok=True)
    for name in list(TABLES)[2:]:
        append(result, 'Coverage', name,
               'Partial' if name in collected else 'NotCollected',
               len(result[name]) if name in collected else None)
    save_json(target / 'delivery.json', result)
    save_json(target / 'source-example.json', source)
    for name, schema in TABLES.items():
        with (target / schema['file']).open('w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=[c['name'] for c in schema['columns']], lineterminator='\n')
            writer.writeheader()
            for row in result[name]:
                writer.writerow({k: ('true' if v is True else 'false' if v is False else v) for k, v in row.items()})


def alteryx(index):
    run = guid(11000000, index + 1)
    result = delivery('Alteryx', index, run, 'synthetic-gallery-scope')
    user1, user2 = oid(101), oid(102)
    w1, w2 = 'sample-collection-01', 'sample-collection-02'
    a1, other = oid(201), oid(202 if index == 0 else 203)
    users = [dict(_id=user1, FirstName='Alex', LastName='Sample', Email='alex@example.test', Active=True),
             dict(_id=user2, FirstName='Casey', LastName='Sample', Email='casey@example.test', Active=True)]
    collections = [dict(_id=oid(301), CollectionId=w1, Name='Sample operations' if not index else 'Sample operations renamed',
                        OwnerId=user1, Apps=[{'ApplicationId': a1}, {'ApplicationId': other}],
                        Users=[{'UserId': user2}, {'UserId': oid(999)}]),
                   dict(_id=oid(302), CollectionId=w2, Name='Sample shared workflows', OwnerId=user1,
                        Apps=[{'ApplicationId': a1}], Users=[])]
    apps, service = [], []
    for n, (aid, title) in enumerate([(a1, 'Sample daily balance' if not index else 'Sample monthly balance'),
                                     (other, 'Sample legacy workflow' if not index else 'Sample new workflow')]):
        sid = oid(401 if n == 0 else (402 if not index else 403))
        revision = oid(501 + index if n == 0 else (510 if not index else 511))
        apps.append(dict(_id=aid, CreatedBy=user1, ServiceId=sid, IsDeleted=False,
                         Revisions=[dict(RevisionId=revision, IsPublishedRevision=True,
                                         Applications=[dict(IsPrimaryApp=True, MetaInfo=dict(Name=title))])]))
        service.append(dict(_id=sid, UserName=user1, ModuleName=title + '.yxmd'))
        append(result, 'Assets', aid, 'Workflow', title, revision, 'Present')
        append(result, 'Object_Users', 'Workflow', aid, 'CreatedBy', user1, 'AlteryxMongoUserID',
               user1, 'AlteryxMongoUserID', None, 'ReadyForEmailMatch')
        append(result, 'Object_Users', 'Workflow', aid, 'TechnicalOwner', None, None,
               None, None, None, 'UnverifiedMapping')
    for collection in collections:
        append(result, 'Workspaces', collection['CollectionId'], 'Collection', collection['Name'], None)
        append(result, 'Object_Users', 'Collection', collection['CollectionId'], 'TechnicalOwner', user1,
               'AlteryxMongoUserID', user1, 'AlteryxMongoUserID', None, 'ReadyForEmailMatch')
        for app in collection['Apps']:
            append(result, 'Workspace_Assets', collection['CollectionId'], app['ApplicationId'], 'Workflow', 'CollectionMembership')
        for user in collection['Users']:
            known = user['UserId'] in [user1, user2]
            append(result, 'Object_Users', 'Collection', collection['CollectionId'], 'CollectionMember', user['UserId'],
                   'AlteryxMongoUserID', user['UserId'] if known else None, 'AlteryxMongoUserID' if known else None,
                   None, 'ReadyForEmailMatch' if known else 'UnresolvedUserReference')
    for user in users:
        append(result, 'Platform_Users', user['_id'], 'AlteryxMongoUserID', 'User',
               user['FirstName'] + ' ' + user['LastName'], user['Email'], 'true')
    source = {'notice': 'Synthetic MongoDB-shaped subset. ObjectIds are decoded text; omitted properties are outside this query.',
              'AlteryxGallery.collections': collections, 'AlteryxGallery.appInfos': apps,
              'AlteryxGallery.users': users, 'AlteryxService.AS_Applications': service}
    output('alteryx', 'initial' if not index else 'changed-refresh', result, source,
           ['Workspaces', 'Assets', 'Workspace_Assets', 'Platform_Users', 'Object_Users'])


def tableau(index):
    run = guid(12000000, index + 1)
    site = guid(22000000, 1)
    result = delivery('Tableau', index, run, site)
    p1, p2, a1, other = guid(22100000, 1), guid(22100000, 2), guid(22200000, 1), guid(22200000, 2 if not index else 3)
    people = [(101, guid(22300000, 1), 'Alex Sample', 'alex@example.test'),
              (102, guid(22300000, 2), 'Casey Sample', 'casey@example.test'),
              (103, guid(22300000, 3), 'Morgan Sample', 'unmatched@example.test')]
    projects = [dict(id=11, site_id=1, luid=p1, name='Sample projects' if not index else 'Sample projects renamed', state='active', owner_id=101),
                dict(id=12, site_id=1, luid=p2, name='Sample archive', state='active', owner_id=999)]
    workbooks = [dict(id=21, site_id=1, luid=a1, name='Sample revenue' if not index else 'Sample revenue renamed',
                      revision='1.0' if not index else '2.0', state='active', owner_id=101, modified_by_user_id=102)]
    other_row = dict(id=22 if not index else 23, site_id=1, luid=other, name='Sample published source' if not index else 'Sample new workbook',
                     revision='1.0', state='active', owner_id=103, modified_by_user_id=101)
    datasources = [dict(**other_row, parent_workbook_id=None)] if not index else []
    if index:
        workbooks.append(other_row)
    contents = [dict(site_id=1, project_id=11 if not index else 12, content_id=21, content_type='SAMPLE_WORKBOOK_TOKEN'),
                dict(site_id=1, project_id=11, content_id=other_row['id'], content_type='SAMPLE_DATASOURCE_TOKEN' if not index else 'SAMPLE_WORKBOOK_TOKEN')]
    connections = [dict(site_id=1, luid=guid(22400000, 1), caption='Sample SQL source', name='sample-sql', dbclass='sqlserver',
                        has_extract=True, server='sql.example.test', dbname='SampleOperations', authentication=None,
                        owner_id=21, owner_type='SAMPLE_WORKBOOK_OWNER_TOKEN')]
    for project in projects:
        append(result, 'Workspaces', project['luid'], 'Project', project['name'], project['state'])
    all_assets = [(x, 'Workbook') for x in workbooks] + [(x, 'PublishedDatasource') for x in datasources]
    for asset, kind in all_assets:
        append(result, 'Assets', asset['luid'], kind, asset['name'], asset['revision'], asset['state'])
        content = next(c for c in contents if c['content_id'] == asset['id'])
        project = next(p for p in projects if p['id'] == content['project_id'])
        append(result, 'Workspace_Assets', project['luid'], asset['luid'], kind, 'ProjectContent')
    connection = connections[0]
    append(result, 'Connections', connection['luid'], connection['caption'], 'SQL Server', True,
           connection['server'], connection['dbname'], None, 'Unknown', 'Partial')
    append(result, 'Asset_Connections', a1, 'Workbook', connection['luid'], 'Observed')
    for _, luid, name, email in people:
        append(result, 'Platform_Users', luid, 'TableauUserLUID', 'User', name, email, 'TableauSiteRole=Creator')
    for entity, kind in [(p, 'Project') for p in projects] + all_assets:
        for role, field in [('TechnicalOwner', 'owner_id')] + ([] if kind == 'Project' else [('ModifiedBy', 'modified_by_user_id')]):
            raw = entity[field]
            principal = next((p for p in people if p[0] == raw), None)
            append(result, 'Object_Users', kind, entity['luid'], role, str(raw), 'TableauRepositoryUserID',
                   principal[1] if principal else None, 'TableauUserLUID' if principal else None, None,
                   'ReadyForEmailMatch' if principal else 'UnresolvedUserReference')
    source = {'notice': 'Synthetic PostgreSQL rows. SAMPLE_* tokens are fixture-only parameters, never claimed installed Tableau tokens.',
              'public.sites': [dict(id=1, luid=site)], 'public.projects': projects, 'public.workbooks': workbooks,
              'public.datasources': datasources, 'public.projects_contents': contents, 'public.data_connections': connections,
              'public.users': [dict(id=p[0], site_id=1, luid=p[1], system_user_id=p[0] + 1000, site_role_id=1) for p in people],
              'public.system_users': [dict(id=p[0] + 1000, friendly_name=p[2], email=p[3]) for p in people],
              'public.site_roles': [dict(id=1, name='Creator')]}
    output('tableau', 'initial' if not index else 'changed-refresh', result, source,
           ['Workspaces', 'Assets', 'Workspace_Assets', 'Connections', 'Asset_Connections', 'Platform_Users', 'Object_Users'])


def fabric(index):
    run = guid(13000000, index + 1)
    result = delivery('PowerBI', index, run, TENANT)
    workspace = guid(23100000, 1)
    rows = [dict(RunKey=run, WorkspaceId=workspace,
                 WorkspaceName='Sample Fabric' if not index else 'Sample Fabric renamed', WorkspaceType='Workspace',
                 ItemId=guid(23200000, 1), ItemName='Sample revenue' if not index else 'Sample revenue renamed', ItemType='Report'),
            dict(RunKey=run, WorkspaceId=workspace,
                 WorkspaceName='Sample Fabric' if not index else 'Sample Fabric renamed', WorkspaceType='Workspace',
                 ItemId=guid(23200000, 2 if not index else 3),
                 ItemName='Sample semantic model' if not index else 'Sample new report', ItemType='SemanticModel' if not index else 'Report')]
    append(result, 'Workspaces', workspace, 'Workspace', rows[0]['WorkspaceName'], None)
    for row in rows:
        kind = 'Dataset' if row['ItemType'] == 'SemanticModel' else row['ItemType']
        append(result, 'Assets', row['ItemId'], kind, row['ItemName'], None, None)
        append(result, 'Workspace_Assets', workspace, row['ItemId'], kind, 'ContainedIn')
    source = {'notice': 'Synthetic rows for our organization-owned landing adapter. This is not a built-in Fabric table.',
              'registry_source.FabricInventory': rows}
    output('fabric', 'initial' if not index else 'changed-refresh', result, source,
           ['Workspaces', 'Assets', 'Workspace_Assets'])


for builder in [alteryx, tableau, fabric]:
    for index in [0, 1]:
        builder(index)
for platform in ['alteryx', 'tableau', 'fabric']:
    shutil.copytree(ROOT / platform / 'initial', ROOT / platform / 'identical-replay', dirs_exist_ok=True)

save_json(ROOT / 'directory-evidence.json', {
    'notice': 'Synthetic companion directory evidence for resolveEmail tests. Not collected by platform SQL. Not an Office 365 lookup.',
    'observedAt': DATE[0], 'scope': 'Only the listed test identities; completeness is an explicit test condition, never an estate claim.',
    'rows': [dict(tenant=TENANT, directoryId=guid(24000000, 1), mail='alex@example.test', accountEnabled=True),
             dict(tenant=TENANT, directoryId=guid(24000000, 2), mail='casey@example.test', accountEnabled=False)]})
files = sorted(p for p in ROOT.rglob('*') if p.is_file() and p.suffix in ['.json', '.csv'] and p.name != 'fixtures.sha256')
(ROOT / 'fixtures.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.relative_to(ROOT).as_posix() + '\n' for p in files), encoding='utf-8', newline='\n')
print(f'Wrote {len(files)} synthetic JSON/CSV fixtures. No platform query was executed.')
