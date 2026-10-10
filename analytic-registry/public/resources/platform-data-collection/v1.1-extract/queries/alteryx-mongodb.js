/* Analytic Registry V1.1: read-only mongosh aggregation queries.
   Load this file in mongosh; set registryRun to the existing manifest first.
   Run one query, for example registryQueries.Assets(), then export that result
   with the approved query client. No API, file writer, database update, or loop.
   MongoDB 4.4+ is required for $unionWith. Verify the installed server first.
   An isolated restored copy of the Gallery/Service export is preferred.
   Live sequential reads are NOT a consistent cross-database snapshot.

   Official candidate paths (installed 2025.2 export validation still pending):
   https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxgallery-mongodb-schema.html
   https://help.alteryx.com/current/en/server/configure/database-management/mongodb-management/mongodb-schema-reference/alteryxservice-mongodb-schema.html
   Current field pages describe schema 80 / 2026.1, not a certification of 79.

   registryRun = { RunKey:'existing-UUID', PlatformCode:'Alteryx',
     PlatformInstanceKey:'stable-server-key', NativeScopeKey:'stable-server-scope',
     ObservedAt:'2026-10-09T12:00:00Z', DirectoryTenantKey:'configured-tenant',
     MappingVersion:'1.1', ScopeDescription:'Exact boundary and exclusions' };

   Query results keep invalid records. NULL mandatory values fail staging.
   Never discard QueryDiagnostics results to make an extract look complete.
*/
if (typeof registryRun === 'undefined' || !registryRun.RunKey ||
    registryRun.PlatformCode !== 'Alteryx' || !registryRun.PlatformInstanceKey ||
    !registryRun.NativeScopeKey || !registryRun.ObservedAt ||
    registryRun.MappingVersion !== '1.1' || !registryRun.ScopeDescription) {
  throw new Error('Set registryRun to the existing Alteryx V1.1 delivery manifest.');
}
const arGallery = db.getSiblingDB('AlteryxGallery');
const arService = db.getSiblingDB('AlteryxService');
const arOptions = { maxTimeMS: 120000, allowDiskUse: false, collation: { locale: 'simple' } };
const arLiteral = value => ({ $literal: value });
// IDs accept source strings/ObjectIds only. Never stringify arbitrary documents.
const arId = path => ({ $cond: [
  { $in: [{ $type: path }, ['string', 'objectId']] },
  { $convert: { input: path, to: 'string', onError: null, onNull: null } }, null
] });
const arString = path => ({ $cond: [{ $eq: [{ $type: path }, 'string'] }, path, null] });
const arArray = path => ({ $cond: [{ $isArray: path }, path, []] });
const arRoleProjection = {
  _id: 0, RunKey: arLiteral(registryRun.RunKey),
  NativeObjectType: 1, NativeObjectID: 1, PrincipalRoleCode: 1,
  SourcePrincipalReference: 1,
  SourceReferenceNamespace: { $cond: [{ $in: ['$SourcePrincipalReference', [null, '']] },
    null, '$SourceReferenceNamespace'] },
  NativePrincipalID: { $cond: [{ $eq: [{ $size: '$matchedUsers' }, 1] },
    arId({ $arrayElemAt: ['$matchedUsers._id', 0] }), null] },
  IdentifierNamespace: { $cond: [{ $eq: [{ $size: '$matchedUsers' }, 1] },
    arLiteral('AlteryxMongoUserID'), null] },
  NativeRole: arLiteral(null),
  SourceReferenceStatusCode: { $switch: { branches: [
    { case: { $eq: ['$mappingUnverified', true] }, then: 'UnverifiedMapping' },
    { case: { $in: ['$SourcePrincipalReference', [null, '']] }, then: 'MissingSourceReference' },
    { case: { $ne: [{ $size: '$matchedUsers' }, 1] }, then: 'UnresolvedUserReference' },
    { case: { $eq: [{ $trim: { input: { $ifNull: [
      arString({ $arrayElemAt: ['$matchedUsers.Email', 0] }), ''
    ] } } }, ''] }, then: 'MissingEmail' }
  ], default: 'ReadyForEmailMatch' } }
};
const arPublished = [
  { $set: { published: { $filter: { input: arArray('$Revisions'), as: 'r',
    cond: { $eq: ['$$r.IsPublishedRevision', true] } } } } },
  { $set: { selectedRevision: { $cond: [{ $eq: [{ $size: '$published' }, 1] },
    { $arrayElemAt: ['$published', 0] }, null] } } },
  { $set: { primary: { $filter: { input: arArray('$selectedRevision.Applications'), as: 'a',
    cond: { $eq: ['$$a.IsPrimaryApp', true] } } } } },
  { $set: { selectedApp: { $cond: [{ $eq: [{ $size: '$primary' }, 1] },
    { $arrayElemAt: ['$primary', 0] }, null] } } }
];

globalThis.registryQueries = {
  // Run_Context is configured delivery evidence, not a claim from MongoDB.
  Run_Context: () => [{
    RunKey: registryRun.RunKey, PlatformCode: registryRun.PlatformCode,
    PlatformInstanceKey: registryRun.PlatformInstanceKey, NativeScopeKey: registryRun.NativeScopeKey,
    ObservedAt: registryRun.ObservedAt, DirectoryTenantKey: registryRun.DirectoryTenantKey || null,
    MappingVersion: '1.1', ScopeDescription: registryRun.ScopeDescription
  }],

  Workspaces: () => arGallery.getCollection('collections').aggregate([
    { $project: { _id: 0, RunKey: arLiteral(registryRun.RunKey),
      NativeWorkspaceID: arId('$CollectionId'), NativeWorkspaceType: arLiteral('Collection'),
      DisplayName: arString('$Name'), NativeLifecycleCode: arLiteral(null) } }
  ], arOptions),

  Assets: () => arGallery.getCollection('appInfos').aggregate([
    ...arPublished,
    { $project: { _id: 0, RunKey: arLiteral(registryRun.RunKey), NativeAssetID: arId('$_id'),
      NativeAssetType: arLiteral('Workflow'), DisplayName: arString('$selectedApp.MetaInfo.Name'),
      NativeVersionReference: arId('$selectedRevision.RevisionId'),
      NativeLifecycleCode: { $switch: { branches: [
        { case: { $eq: ['$IsDeleted', true] }, then: 'Deleted' },
        { case: { $eq: ['$IsDeleted', false] }, then: 'Present' }
      ], default: null } } } }
  ], arOptions),

  Workspace_Assets: () => arGallery.getCollection('collections').aggregate([
    // A malformed Apps field is reported separately; no guessed relationship.
    { $set: { members: arArray('$Apps') } }, { $unwind: '$members' },
    { $project: { _id: 0, RunKey: arLiteral(registryRun.RunKey),
      NativeWorkspaceID: arId('$CollectionId'), NativeAssetID: arId('$members.ApplicationId'),
      NativeAssetType: arLiteral('Workflow'), NativeAssociationType: arLiteral('CollectionMembership') } }
  ], arOptions),

  Platform_Users: () => arGallery.getCollection('users').aggregate([
    { $project: { _id: 0, RunKey: arLiteral(registryRun.RunKey), NativePrincipalID: arId('$_id'),
      IdentifierNamespace: arLiteral('AlteryxMongoUserID'), PrincipalTypeCode: arLiteral('User'),
      DisplayName: { $let: { vars: { name: { $trim: { input: { $concat: [
        { $ifNull: [arString('$FirstName'), ''] }, ' ', { $ifNull: [arString('$LastName'), ''] }
      ] } } } }, in: { $cond: [{ $eq: ['$$name', ''] }, null, '$$name'] } } },
      SourceEmail: arString('$Email'),
      SourceStatus: { $switch: { branches: [
        { case: { $eq: ['$Active', true] }, then: 'true' },
        { case: { $eq: ['$Active', false] }, then: 'false' }
      ], default: null } } } }
  ], arOptions),

  Object_Users: () => arGallery.getCollection('collections').aggregate([
    { $project: { _id: 0, NativeObjectType: arLiteral('Collection'), NativeObjectID: arId('$CollectionId'),
      PrincipalRoleCode: arLiteral('TechnicalOwner'), SourcePrincipalReference: arId('$OwnerId'),
      SourceReferenceNamespace: arLiteral('AlteryxMongoUserID') } },
    { $unionWith: { coll: 'collections', pipeline: [
      { $set: { directMembers: arArray('$Users') } }, { $unwind: '$directMembers' },
      { $project: { _id: 0, NativeObjectType: arLiteral('Collection'), NativeObjectID: arId('$CollectionId'),
        PrincipalRoleCode: arLiteral('CollectionMember'), SourcePrincipalReference: arId('$directMembers.UserId'),
        SourceReferenceNamespace: arLiteral('AlteryxMongoUserID') } }
    ] } },
    { $unionWith: { coll: 'appInfos', pipeline: [
      { $project: { _id: 0, NativeObjectType: arLiteral('Workflow'), NativeObjectID: arId('$_id'),
        PrincipalRoleCode: arLiteral('CreatedBy'), SourcePrincipalReference: arId('$CreatedBy'),
        SourceReferenceNamespace: arLiteral('AlteryxMongoUserID') } }
    ] } },
    { $unionWith: { coll: 'appInfos', pipeline: [
      { $project: { _id: 0, NativeObjectType: arLiteral('Workflow'), NativeObjectID: arId('$_id'),
        PrincipalRoleCode: arLiteral('TechnicalOwner'), SourcePrincipalReference: arLiteral(null),
        SourceReferenceNamespace: arLiteral(null), mappingUnverified: arLiteral(true) } }
    ] } },
    { $lookup: { from: 'users', let: { sourceReference: '$SourcePrincipalReference' }, pipeline: [
      { $match: { $expr: { $and: [
        { $not: [{ $in: ['$$sourceReference', [null, '']] }] },
        { $eq: [arId('$_id'), '$$sourceReference'] }
      ] } } },
      // Select only ID and email; no credentials, tokens, or unrelated profile fields.
      { $project: { _id: 1, Email: 1 } }
    ], as: 'matchedUsers' } },
    { $project: arRoleProjection }
  ], arOptions),

  // Supplemental evidence, not a workbook dataset or workflow ownership claim.
  Gallery_Service_References: () => arGallery.getCollection('appInfos').aggregate([
    { $project: { _id: 0, RunKey: arLiteral(registryRun.RunKey), NativeAssetID: arId('$_id'),
      ServiceApplicationID: arId('$ServiceId'), OriginalAuthorReference: arId('$CreatedBy') } }
  ], arOptions),
  Service_Applications: () => arService.getCollection('AS_Applications').aggregate([
    { $project: { _id: 0, RunKey: arLiteral(registryRun.RunKey), ServiceApplicationID: arId('$_id'),
      ServiceUserReference: arString('$UserName'), ServiceModuleName: arString('$ModuleName'),
      CreationDateTime: { $ifNull: ['$CreationDateTime', null] } } }
  ], arOptions),

  // Retain these results with the delivery. Any row requires Platform Manager review.
  QueryDiagnostics: () => arGallery.getCollection('appInfos').aggregate([
    ...arPublished,
    { $match: { $expr: { $or: [
      { $not: [{ $isArray: '$Revisions' }] },
      { $ne: [{ $size: '$published' }, 1] }, { $ne: [{ $size: '$primary' }, 1] },
      { $in: [arString('$selectedApp.MetaInfo.Name'), [null, '']] },
      { $not: [{ $in: [{ $type: '$IsDeleted' }, ['bool', 'null', 'missing']] }] }
    ] } } },
    { $project: { _id: 0, Dataset: arLiteral('Assets'), NativeReference: arId('$_id'),
      Issue: arLiteral('Invalid revision, primary application, display name, or IsDeleted type'),
      PublishedCount: { $size: '$published' }, PrimaryCount: { $size: '$primary' } } },
    { $unionWith: { coll: 'collections', pipeline: [
      { $match: { $expr: { $or: [ { $not: [{ $isArray: '$Apps' }] }, { $not: [{ $isArray: '$Users' }] } ] } } },
      { $project: { _id: 0, Dataset: arLiteral('Workspace_Assets / Object_Users'),
        NativeReference: arId('$CollectionId'), Issue: arLiteral('Apps or Users is missing or is not an array'),
        PublishedCount: arLiteral(null), PrimaryCount: arLiteral(null) } }
    ] } },
    { $unionWith: { coll: 'users', pipeline: [
      { $match: { $expr: { $or: [
        { $not: [{ $in: [{ $type: '$Active' }, ['bool', 'null', 'missing']] }] },
        { $not: [{ $in: [{ $type: '$Email' }, ['string', 'null', 'missing']] }] }
      ] } } },
      { $project: { _id: 0, Dataset: arLiteral('Platform_Users'), NativeReference: arId('$_id'),
        Issue: arLiteral('Active or Email has an unsupported type'),
        PublishedCount: arLiteral(null), PrimaryCount: arLiteral(null) } }
    ] } }
  ], arOptions)
};

// Empty datasets have NO placeholder row. Create header-only files from csv-headers.
// Count the delivered results and fill RowCount for each Partial dataset below.
// Never infer Complete from a successful cursor or a count alone.
globalThis.registryCoverage = [
  { RunKey: registryRun.RunKey, DatasetCode: 'Workspaces', CoverageStatus: 'Partial', RowCount: null },
  { RunKey: registryRun.RunKey, DatasetCode: 'Assets', CoverageStatus: 'Partial', RowCount: null },
  { RunKey: registryRun.RunKey, DatasetCode: 'Workspace_Assets', CoverageStatus: 'Partial', RowCount: null },
  { RunKey: registryRun.RunKey, DatasetCode: 'Connections', CoverageStatus: 'NotCollected', RowCount: null },
  { RunKey: registryRun.RunKey, DatasetCode: 'Asset_Connections', CoverageStatus: 'NotCollected', RowCount: null },
  { RunKey: registryRun.RunKey, DatasetCode: 'Asset_Dependencies', CoverageStatus: 'NotCollected', RowCount: null },
  { RunKey: registryRun.RunKey, DatasetCode: 'Platform_Users', CoverageStatus: 'Partial', RowCount: null },
  { RunKey: registryRun.RunKey, DatasetCode: 'Directory_Users', CoverageStatus: 'NotCollected', RowCount: null },
  { RunKey: registryRun.RunKey, DatasetCode: 'Object_Users', CoverageStatus: 'Partial', RowCount: null }
];
