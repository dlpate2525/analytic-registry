/*
 * Alteryx MongoDB read-only candidate extractor. No database writes.
 * Uses the documented collections/field spellings; schema 79 has NOT been live-tested.
 * Set globalThis.REGISTRY_ALTERYX_CONTEXT in a runner, then load this file.
 * Preserve the existing manifest RunKey and ObservedAt. See companion handoff.
 */
(function () {
  'use strict';
  const fs = require('fs');
  const path = require('path');
  const ctx = globalThis.REGISTRY_ALTERYX_CONTEXT || {};
  const mode = ctx.Mode || 'preflight';
  if (!['preflight', 'extract'].includes(mode)) throw new Error('Mode must be preflight or extract.');
  const gallery = db.getSiblingDB(ctx.DatabaseName || 'AlteryxGallery');
  const existing = new Set(gallery.getCollectionNames());
  const requiredCollections = ['users', 'collections', 'appInfos'];
  for (const name of requiredCollections) {
    if (!existing.has(name)) throw new Error('Missing documented collection: ' + name);
  }

  // Explicit projections prevent credentials, password material, and other fields entering the export.
  const projections = {
    users: {
      _id: 1, Email: 1, FirstName: 1, LastName: 1, Role: 1,
      Active: 1, AccountLocked: 1, Validated: 1, Pending: 1,
      SubscriptionId: 1, 'WindowsIdentity.Sid': 1, 'WindowsIdentity.Name': 1
    },
    collections: {
      _id: 1, CollectionId: 1, Name: 1, OwnerId: 1, DateAdded: 1,
      'Apps.ApplicationId': 1, 'Apps.DateAdded': 1,
      'Users.UserId': 1, 'Users.ExpirationDate': 1,
      'Users.ActiveDirectoryObject.Category': 1, 'Users.ActiveDirectoryObject.Sid': 1,
      'Users.ActiveDirectoryObject.Name': 1, 'Users.ActiveDirectoryObject.DisplayName': 1,
      'Users.Permissions.Collection.IsAdmin': 1,
      'Users.Permissions.Assets.CanAdd': 1, 'Users.Permissions.Assets.CanUpdate': 1,
      'Users.Permissions.Assets.CanRemove': 1,
      'Users.Permissions.Users.CanAdd': 1, 'Users.Permissions.Users.CanRemove': 1,
      'UserGroups.UserId': 1, 'Subscriptions.UserId': 1
    },
    appInfos: {
      _id: 1, CreatedBy: 1, IsDeleted: 1, SubscriptionId: 1, SubscriptionName: 1,
      'Revisions.RevisionId': 1, 'Revisions.RevisionNumber': 1,
      'Revisions.IsPublishedRevision': 1, 'Revisions.AuthorId': 1,
      'Revisions.DateCreated': 1, 'Revisions.PackageType': 1,
      'Revisions.Applications.IsPrimaryApp': 1,
      'Revisions.Applications.FileName': 1, 'Revisions.Applications.MetaInfo.Name': 1
    },
    subscriptions: { _id: 1, Name: 1, Active: 1 }
  };
  const source = {};
  for (const [name, projection] of Object.entries(projections)) {
    source[name] = existing.has(name) ? gallery.getCollection(name).find({}, projection).toArray() : [];
  }

  function typeOf(value) {
    if (value === undefined) return 'missing';
    if (value === null) return 'null';
    if (value && typeof value.toHexString === 'function') return 'objectId';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
  const fieldTypes = {}, schemaErrors = [];
  function check(record, collection, field, allowed, required) {
    const value = record[field], type = typeOf(value), key = collection + '.' + field;
    fieldTypes[key] ||= {};
    fieldTypes[key][type] = (fieldTypes[key][type] || 0) + 1;
    if ((!required && ['missing', 'null'].includes(type)) || allowed.includes(type)) return;
    schemaErrors.push({ Collection: collection, Field: field, Type: type });
  }
  function shape(record, collection, rules) {
    for (const [field, allowed, required = false] of rules) check(record, collection, field, allowed, required);
  }
  for (const u of source.users) shape(u, 'users', [
    ['_id', ['objectId'], true], ['Email', ['string']], ['FirstName', ['string']],
    ['LastName', ['string']], ['Role', ['string']], ['Active', ['boolean']],
    ['AccountLocked', ['boolean']], ['Validated', ['boolean']], ['Pending', ['boolean']],
    ['SubscriptionId', ['string']], ['WindowsIdentity', ['object', 'array']]
  ]);
  for (const c of source.collections) {
    shape(c, 'collections', [['_id', ['objectId'], true], ['CollectionId', ['string'], true],
      ['Name', ['string'], true], ['OwnerId', ['string']], ['DateAdded', ['date']],
      ['Apps', ['array']], ['Users', ['array']], ['UserGroups', ['array']], ['Subscriptions', ['array']]]);
    for (const a of Array.isArray(c.Apps) ? c.Apps : []) shape(a, 'collections.Apps[]', [
      ['ApplicationId', ['string'], true], ['DateAdded', ['date']]]);
    for (const u of Array.isArray(c.Users) ? c.Users : []) shape(u, 'collections.Users[]', [
      ['UserId', ['string']], ['ExpirationDate', ['date']],
      ['ActiveDirectoryObject', ['object', 'array']], ['Permissions', ['object']]]);
  }
  for (const a of source.appInfos) {
    shape(a, 'appInfos', [['_id', ['objectId'], true], ['CreatedBy', ['string']],
      ['IsDeleted', ['boolean']], ['SubscriptionId', ['string']], ['SubscriptionName', ['string']],
      ['Revisions', ['array'], true]]);
    for (const r of Array.isArray(a.Revisions) ? a.Revisions : []) {
      shape(r, 'appInfos.Revisions[]', [['RevisionId', ['string']], ['RevisionNumber', ['number']],
        ['IsPublishedRevision', ['boolean']], ['AuthorId', ['string']], ['DateCreated', ['date']],
        ['PackageType', ['number']], ['Applications', ['array']]]);
      for (const app of Array.isArray(r.Applications) ? r.Applications : []) shape(app, 'appInfos.Revisions[].Applications[]', [
        ['IsPrimaryApp', ['boolean']], ['FileName', ['string']], ['MetaInfo', ['object']]]);
    }
  }
  for (const s of source.subscriptions) shape(s, 'subscriptions', [
    ['_id', ['objectId'], true], ['Name', ['string']], ['Active', ['boolean']]]);
  const preflight = {
    DatabaseName: ctx.DatabaseName || 'AlteryxGallery',
    Counts: Object.fromEntries(Object.entries(source).map(([k, v]) => [k, v.length])),
    FieldTypes: fieldTypes, Errors: schemaErrors,
    Status: schemaErrors.length ? 'Failed' : 'Passed',
    Limitation: 'Field/type compatibility only; does not prove current workflow ownership or schema-79 semantic equivalence.'
  };
  if (mode === 'preflight') { print(JSON.stringify(preflight, null, 2)); return; }
  if (schemaErrors.length) { print(JSON.stringify(preflight, null, 2)); throw new Error('Schema preflight failed. Assign to Platform Manager.'); }
  for (const key of ['RunKey', 'PlatformInstanceKey', 'NativeScopeKey', 'ObservedAt', 'DirectoryTenantKey', 'OutputDirectory', 'ContractPath']) {
    if (typeof ctx[key] !== 'string' || !ctx[key].trim()) throw new Error('Missing context: ' + key);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ctx.RunKey)) throw new Error('RunKey must be the existing manifest UUID.');
  if (!/(Z|[+-]\d\d:\d\d)$/i.test(ctx.ObservedAt) || !Number.isFinite(Date.parse(ctx.ObservedAt))) throw new Error('ObservedAt must include a valid UTC offset.');
  const contract = JSON.parse(fs.readFileSync(ctx.ContractPath, 'utf8'));
  const sheetSpecs = new Map(contract.map(s => [s.sheet, s]));
  const common = { RunKey: ctx.RunKey, PlatformCode: 'Alteryx', PlatformInstanceKey: ctx.PlatformInstanceKey,
    NativeScopeKey: ctx.NativeScopeKey, ObservedAt: ctx.ObservedAt };
  const rows = Object.fromEntries(['Workspaces', 'Assets', 'Workspace_Assets', 'Connections', 'Asset_Connections', 'Asset_Dependencies', 'Platform_Users', 'Object_Users'].map(s => [s, []]));
  const exceptions = [], supplemental = { RevisionAuthors: [], StudioMembership: [], CollectionAccessDetails: [] };
  const text = v => typeof v === 'string' ? v : null;
  const id = v => v && typeof v.toHexString === 'function' ? v.toHexString() : null;
  const list = v => Array.isArray(v) ? v : v && typeof v === 'object' ? [v] : [];
  const iso = v => v instanceof Date ? v.toISOString() : null;
  const issue = (code, objectType, objectId, detail) => exceptions.push({ ...common,
    Code: code, NativeObjectType: objectType, NativeObjectID: objectId,
    AssignedToRole: 'Platform Manager', Detail: detail });
  function emit(sheet, values) {
    const spec = sheetSpecs.get(sheet);
    if (!spec) throw new Error('Workbook contract lacks ' + sheet);
    const input = { ...common, ...values };
    const result = Object.fromEntries(spec.columns.map(c => [c.name, input[c.name] ?? null]));
    for (const c of spec.columns) {
      const v = result[c.name], max = /^nvarchar\((\d+)\)$/.exec(c.type);
      if ((c.required === 'Yes' && (v === null || v === '')) || (max && typeof v === 'string' && v.length > +max[1])) {
        issue('ContractValidation', values.NativeObjectType || sheet,
          values.NativeObjectID || values.NativeAssetID || values.NativeWorkspaceID || values.NativePrincipalID || null,
          c.name + ': missing required value or exceeds SQL length; retain in staging and hold load.');
      }
    }
    rows[sheet].push(result);
  }
  const usersById = new Map(), usersBySid = new Map();
  for (const u of source.users) {
    const uid = id(u._id);
    if (usersById.has(uid)) throw new Error('Duplicate users._id');
    usersById.set(uid, u);
    for (const w of list(u.WindowsIdentity)) if (typeof w.Sid === 'string' && w.Sid) {
      usersBySid.set(w.Sid, [...(usersBySid.get(w.Sid) || []), u]);
    }
    emit('Platform_Users', { NativePrincipalID: uid, IdentifierNamespace: 'AlteryxMongoUserID',
      PrincipalTypeCode: 'User', DisplayName: [text(u.FirstName), text(u.LastName)].filter(Boolean).join(' ') || null,
      SourceLogin: list(u.WindowsIdentity).length === 1 ? text(list(u.WindowsIdentity)[0].Name) : null,
      SourceEmail: text(u.Email), SourceStatus: JSON.stringify({ Role: u.Role ?? null, Active: u.Active ?? null,
        AccountLocked: u.AccountLocked ?? null, Validated: u.Validated ?? null, Pending: u.Pending ?? null }),
      SourceDirectoryObjectID: null, DirectoryTenantKey: ctx.DirectoryTenantKey, NativeRepositoryID: null });
    if (!text(u.Email) || !u.Email.trim()) issue('MissingEmail', 'User', uid, 'No explicit source email.');
    supplemental.StudioMembership.push({ UserID: uid, SubscriptionId: text(u.SubscriptionId) });
  }
  function link(objectType, objectId, label, role, reference, namespace = 'AlteryxMongoUserID', nativeRole = null, forceStatus = null) {
    let user = null;
    if (namespace === 'AlteryxMongoUserID' && reference) user = usersById.get(reference) || null;
    if (namespace === 'ActiveDirectorySID' && reference && (usersBySid.get(reference) || []).length === 1) user = usersBySid.get(reference)[0];
    const status = forceStatus || (!reference ? 'MissingSourceReference' : !user ? 'UnresolvedUserReference'
      : !text(user.Email) || !user.Email.trim() ? 'MissingEmail' : 'ReadyForEmailMatch');
    emit('Object_Users', { NativeObjectType: objectType, NativeObjectID: objectId, ObjectDisplayName: label,
      PrincipalRoleCode: role, SourcePrincipalReference: reference, SourceReferenceNamespace: reference ? namespace : null,
      NativePrincipalID: user ? id(user._id) : null, IdentifierNamespace: user ? 'AlteryxMongoUserID' : null,
      NativeRole: nativeRole, SourceEmail: user ? text(user.Email) : null, SourceReferenceStatusCode: status });
    if (status !== 'ReadyForEmailMatch') issue(status, objectType, objectId, role + ': preserve source reference and assign for review.');
  }
  const assetIDs = new Set(source.appInfos.map(a => id(a._id)));
  const seenCollections = new Set();
  for (const c of source.collections) {
    const wid = c.CollectionId;
    if (!wid || seenCollections.has(wid)) throw new Error('Blank or duplicate collections.CollectionId');
    seenCollections.add(wid);
    emit('Workspaces', { NativeWorkspaceID: wid, NativeRepositoryID: id(c._id), NativeWorkspaceType: 'Collection',
      DisplayName: c.Name, NativeOwnerID: text(c.OwnerId), NativeLifecycleCode: null, CapacityKey: null });
    link('Collection', wid, c.Name, 'TechnicalOwner', text(c.OwnerId));
    for (const a of c.Apps || []) {
      emit('Workspace_Assets', { NativeWorkspaceID: wid, NativeAssetID: a.ApplicationId,
        NativeAssetType: 'Workflow', NativeAssociationType: 'CollectionMembership' });
      if (!assetIDs.has(a.ApplicationId)) issue('UnresolvedAssetReference', 'Collection', wid,
        'Apps.ApplicationId does not match an extracted appInfos._id. Retain the edge; do not infer by name.');
    }
    for (const member of c.Users || []) {
      const ad = list(member.ActiveDirectoryObject);
      const principal = ad.length === 1 ? ad[0] : null;
      const isGroup = principal && principal.Category === 1;
      const ref = isGroup ? text(principal.Sid) : text(member.UserId) || (principal ? text(principal.Sid) : null);
      const ns = isGroup || !text(member.UserId) ? 'ActiveDirectorySID' : 'AlteryxMongoUserID';
      // No fabricated permission string: detailed flags are retained in supplemental evidence.
      link('Collection', wid, c.Name, 'Access', ref, ns, null, isGroup || ad.length > 1 ? 'UnverifiedMapping' : null);
      supplemental.CollectionAccessDetails.push({ CollectionId: wid, SourcePrincipalReference: ref,
        ExpirationDate: iso(member.ExpirationDate), Permissions: member.Permissions ?? null,
        ADCategory: principal ? principal.Category ?? null : null });
    }
    if ((c.UserGroups || []).length || (c.Subscriptions || []).length) issue('UnverifiedMapping', 'Collection', wid,
      'Group/studio sharing exists; expansion is not collected by this V1 query.');
  }
  for (const a of source.appInfos) {
    const aid = id(a._id), published = (a.Revisions || []).filter(r => r.IsPublishedRevision === true);
    const revision = published.length === 1 ? published[0] : null;
    const primary = revision ? (revision.Applications || []).filter(x => x.IsPrimaryApp === true) : [];
    const primaryApp = primary.length === 1 ? primary[0] : null;
    const name = primaryApp && primaryApp.MetaInfo ? text(primaryApp.MetaInfo.Name) : null;
    emit('Assets', { NativeAssetID: aid, NativeRepositoryID: null, NativeAssetType: 'Workflow',
      AssetTypeCode: revision ? ({ 0: 'Analytic App', 1: 'Workflow', 2: 'Macro' }[revision.PackageType] || 'Undefined') : 'Undefined',
      DisplayName: name, NativeVersionReference: revision ? text(revision.RevisionId) : null,
      CreatedByNativeID: text(a.CreatedBy), ModifiedByNativeID: null, NativeOwnerID: null,
      CreatedAtNative: null, ModifiedAtNative: null,
      NativeLifecycleCode: typeof a.IsDeleted === 'boolean' ? 'IsDeleted=' + a.IsDeleted : null });
    link('Workflow', aid, name, 'CreatedBy', text(a.CreatedBy));
    link('Workflow', aid, name, 'TechnicalOwner', null, 'AlteryxMongoUserID', null, 'UnverifiedMapping');
    if (!revision || !primaryApp) issue('UnverifiedMapping', 'Workflow', aid,
      'Exactly one published revision and primary application was not established.');
    for (const r of a.Revisions || []) supplemental.RevisionAuthors.push({ NativeAssetID: aid,
      RevisionId: text(r.RevisionId), RevisionNumber: r.RevisionNumber ?? null,
      IsPublishedRevision: r.IsPublishedRevision ?? null, RevisionAuthorID: text(r.AuthorId),
      PublishedAt: iso(r.DateCreated) });
    supplemental.StudioMembership.push({ NativeAssetID: aid, SubscriptionId: text(a.SubscriptionId),
      SubscriptionName: text(a.SubscriptionName) });
  }
  supplemental.Studios = source.subscriptions.map(s => ({ NativeStudioID: id(s._id), Name: text(s.Name), Active: s.Active ?? null }));
  const directory = path.resolve(ctx.OutputDirectory);
  if (fs.existsSync(directory) && fs.readdirSync(directory).length) throw new Error('OutputDirectory must be empty; preserve earlier delivery files.');
  fs.mkdirSync(directory, { recursive: true });
  const csv = (spec, data) => [spec.columns.map(c => c.name), ...data.map(r => spec.columns.map(c => r[c.name]))]
    .map(values => values.map(v => v === null || v === undefined ? '' : '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n') + '\r\n';
  for (const [sheet, data] of Object.entries(rows)) {
    const spec = sheetSpecs.get(sheet);
    fs.writeFileSync(path.join(directory, spec.file), csv(spec, data), 'utf8');
  }
  const coverage = [
    { DatasetCode: 'WorkspaceInventory', CoverageStatusCode: 'Partial', RowCount: rows.Workspaces.length },
    { DatasetCode: 'WorkflowInventory', CoverageStatusCode: 'Partial', RowCount: rows.Assets.length },
    { DatasetCode: 'WorkspaceAssetMembership', CoverageStatusCode: 'Partial', RowCount: rows.Workspace_Assets.length },
    { DatasetCode: 'PlatformUsers', CoverageStatusCode: 'Partial', RowCount: rows.Platform_Users.length },
    { DatasetCode: 'ObjectUsers', CoverageStatusCode: 'Partial', RowCount: rows.Object_Users.length },
    ...['Connections', 'AssetConnectionLineage', 'AssetDependencies', 'EffectiveAccess'].map(DatasetCode => ({ DatasetCode, CoverageStatusCode: 'NotCollected', RowCount: null }))
  ].map(d => ({ ...d, ScopeKey: ctx.NativeScopeKey }));
  for (const [name, value] of Object.entries({ 'normalized.json': rows, 'preflight.json': preflight,
    'exceptions.json': exceptions, 'supplemental-evidence.json': supplemental, 'dataset-coverage.json': coverage })) {
    fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', 'utf8');
  }
  print(JSON.stringify({ OutputDirectory: directory, Counts: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length])),
    Exceptions: exceptions.length, Coverage: 'Partial: candidate mapping and non-atomic multi-collection extraction require Platform Manager review.' }));
})();
