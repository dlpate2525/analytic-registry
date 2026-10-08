import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../alteryx-backend-extract.mongosh.js', import.meta.url), 'utf8');
const contract = JSON.parse(fs.readFileSync(new URL('../workbook-contract.json', import.meta.url), 'utf8'));
const oid = value => ({ toHexString: () => value });
const user = '111111111111111111111111';
const asset = '222222222222222222222222';
const workspace = '33333333333333333333333333333333';
const makeSource = () => ({
  users: [{ _id: oid(user), FirstName: 'Example', LastName: 'Person', Email: 'person@example.invalid',
    Role: 'Artisan', Active: false, AccountLocked: false, Validated: true, Pending: false,
    SubscriptionId: 'studio-shared', WindowsIdentity: { Sid: 'S-1-5-user', Name: 'EXAMPLE\\person' },
    SecurityInfo: { Password: 'DO_NOT_EXPORT' } }],
  collections: [{ _id: oid('444444444444444444444444'), CollectionId: workspace, Name: 'Sample collection', OwnerId: user,
    Apps: [{ ApplicationId: asset }, { ApplicationId: 'unknown-asset' }],
    Users: [{ UserId: user }, { UserId: 'missing-user' }, { ActiveDirectoryObject: { Category: 1, Sid: 'S-1-5-group' } }],
    UserGroups: [{ UserId: 'sample-group' }] }],
  appInfos: [{ _id: oid(asset), CreatedBy: user, IsDeleted: false, SubscriptionId: 'studio-shared',
    Revisions: [{ RevisionId: 'revision-1', RevisionNumber: 1, IsPublishedRevision: true,
      AuthorId: 'publisher-other', DateCreated: new Date('2026-10-01T12:00:00Z'), PackageType: 1,
      Applications: [{ IsPrimaryApp: true, FileName: 'sample.yxmd', MetaInfo: { Name: 'Sample workflow' } }] }] }],
  subscriptions: [{ _id: oid('555555555555555555555555'), Name: 'Shared studio', Active: true }]
});

function run(source, mode = 'extract') {
  const files = new Map(), reads = [], printed = [];
  const config = { Mode: mode, RunKey: '12345678-1234-1234-1234-123456789abc', PlatformInstanceKey: 'sample-server',
    NativeScopeKey: 'sample-server', ObservedAt: '2026-10-08T14:00:00-04:00', DirectoryTenantKey: 'sample-tenant',
    ContractPath: 'contract.json', OutputDirectory: '/mock-output' };
  const context = {
    REGISTRY_ALTERYX_CONTEXT: config,
    Date,
    require: name => name === 'path' ? path : name === 'fs' ? {
      readFileSync: file => { assert.equal(file, 'contract.json'); return JSON.stringify(contract); },
      existsSync: () => false, mkdirSync: () => {},
      writeFileSync: (file, value) => files.set(path.basename(file), value)
    } : assert.fail('Unexpected module ' + name),
    db: { getSiblingDB: name => {
      assert.equal(name, 'AlteryxGallery');
      return { getCollectionNames: () => Object.keys(source), getCollection: collection => ({
        find: (filter, projection) => { assert.equal(Object.keys(filter).length, 0); reads.push({ collection, projection });
          return { toArray: () => source[collection] }; }
      }) };
    } },
    print: value => printed.push(value)
  };
  vm.runInNewContext(script, context, { filename: 'v1-alteryx-backend-extract.mongosh.js' });
  return { files, reads, printed, config };
}

const { files, reads, config } = run(makeSource());
const rows = JSON.parse(files.get('normalized.json'));
const links = rows.Object_Users;
assert.equal(rows.Platform_Users.length, 1);
assert.equal(rows.Platform_Users[0].IdentifierNamespace, 'AlteryxMongoUserID');
assert.equal(JSON.parse(rows.Platform_Users[0].SourceStatus).Active, false);
assert.equal(rows.Workspaces[0].NativeWorkspaceID, workspace);
assert.notEqual(rows.Workspaces[0].NativeRepositoryID, workspace);
assert.equal(rows.Assets[0].CreatedByNativeID, user);
assert.equal(rows.Assets[0].NativeOwnerID, null);
assert.equal(rows.Assets[0].ModifiedByNativeID, null);
assert.equal(rows.Assets[0].CreatedAtNative, null);
assert.equal(rows.Assets[0].DisplayName, 'Sample workflow');
assert.equal(links.find(x => x.NativeObjectType === 'Workflow' && x.PrincipalRoleCode === 'CreatedBy').SourceReferenceStatusCode, 'ReadyForEmailMatch');
const owner = links.find(x => x.NativeObjectType === 'Workflow' && x.PrincipalRoleCode === 'TechnicalOwner');
assert.equal(owner.NativePrincipalID, null);
assert.equal(owner.SourceReferenceStatusCode, 'UnverifiedMapping');
assert.equal(links.find(x => x.SourcePrincipalReference === 'missing-user').SourceReferenceStatusCode, 'UnresolvedUserReference');
assert.equal(links.find(x => x.SourcePrincipalReference === 'S-1-5-group').SourceReferenceStatusCode, 'UnverifiedMapping');
assert.equal(rows.Workspace_Assets.length, 2);
assert.ok(JSON.parse(files.get('exceptions.json')).every(x => x.AssignedToRole === 'Platform Manager'));
assert.equal(JSON.parse(files.get('dataset-coverage.json')).find(x => x.DatasetCode === 'Connections').CoverageStatusCode, 'NotCollected');
for (const [sheet, data] of Object.entries(rows)) {
  const expected = contract.find(x => x.sheet === sheet).columns.map(c => c.name);
  for (const row of data) {
    assert.deepEqual(Object.keys(row), expected);
    assert.equal(row.RunKey, config.RunKey);
    assert.equal(row.ObservedAt, config.ObservedAt);
    assert.ok(!Object.hasOwn(row, 'RunDate'));
  }
}
assert.ok(![...files.values()].join('\n').includes('DO_NOT_EXPORT'));
assert.ok(reads.every(x => !Object.hasOwn(x.projection, 'SecurityInfo')));
const preflight = run(makeSource(), 'preflight');
assert.equal(preflight.files.size, 0);
assert.equal(JSON.parse(preflight.printed[0]).Status, 'Passed');
const invalid = makeSource(); invalid.users[0].Email = 42;
assert.throws(() => run(invalid), /Schema preflight failed/);
console.log('Alteryx synthetic fixture checks passed: contract headers, ownership distinctions, unresolved links, metadata preservation, safe projection, coverage, and invalid-type rejection. No server was contacted.');
