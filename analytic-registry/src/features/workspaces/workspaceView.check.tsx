import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { initialData } from '../../data/mock';
import { RegistryContext, type RegistryContextValue } from '../../data/RegistryContext';
import type { RegistryData, WorkspaceRequest } from '../../types';
import { WorkspaceDetail, WorkspaceList } from './Workspaces';
import { isRetiredWorkspace, registrationHref, workspaceBusinessLine, workspaceTab, workspaceTabs, workspaceWork } from './workspaceView';
import { todayLocal } from '../../utils/dates';

let checks = 0;
const check = (run: () => void) => { run(); checks++; };
const fresh = () => structuredClone(initialData);
const data = fresh();
const workspace = data.workspaces[0];

function render(data: RegistryData, path: string, viewMode: RegistryContextValue['viewMode'] = 'Business') {
  const value: RegistryContextValue = {
    data, viewMode, update: () => false, dispatchRequest: () => null,
    notice: '', storageIssue: '', setNotice: () => {}, setViewMode: () => {}, reset: () => {}, exportData: () => {},
  };
  return renderToStaticMarkup(<RegistryContext.Provider value={value}>
    <MemoryRouter initialEntries={[path]}><Routes>
      <Route path="/workspaces" element={<WorkspaceList/>}/>
      <Route path="/workspaces/:id" element={<WorkspaceDetail/>}/>
    </Routes></MemoryRouter>
  </RegistryContext.Provider>);
}

const adminMine = render(data, '/workspaces?scope=mine', 'Administrator');
check(() => assert.ok(adminMine.includes('href="/workspaces/WS-002"')));
check(() => assert.ok(adminMine.includes('href="/workspaces/WS-003"')));
check(() => assert.ok(!adminMine.includes('href="/workspaces/WS-001"')));
check(() => assert.ok(!adminMine.includes('href="/workspaces/WS-011"')));
check(() => assert.ok(render(data, '/workspaces?scope=mine&retired=include', 'Administrator').includes('href="/workspaces/WS-011"')));
check(() => assert.ok(render(data, '/workspaces?scope=mine', 'Business').includes('href="/workspaces/WS-001"')));
check(() => assert.equal(workspaceTabs.length, 5));
for (const [oldTab, expected] of Object.entries({
  Assets: 'Assets & connections', Connections: 'Assets & connections', Comparison: 'Access & configuration',
  Access: 'Access & configuration', Findings: 'Work', Attestation: 'Work',
})) check(() => assert.equal(workspaceTab(oldTab), expected));
check(() => assert.equal(workspaceTab('not-a-tab'), 'Overview'));
check(() => assert.equal(workspaceTab(null), 'Overview'));

check(() => assert.equal(workspaceBusinessLine({ ...workspace, businessLineStatus: 'Inherited' }).status, 'Confirmation needed'));
check(() => assert.equal(workspaceBusinessLine({ ...workspace, businessLineStatus: 'Unknown' }).status, 'Not confirmed'));
check(() => assert.equal(workspaceBusinessLine({ ...workspace, businessLineStatus: undefined }).status, 'Not confirmed'));
check(() => assert.equal(workspaceBusinessLine({ ...workspace, lob: '', businessLineStatus: 'Declared' }).status, 'Not confirmed'));
check(() => assert.equal(workspaceBusinessLine({ ...workspace, ownerId: 'P6', businessLineStatus: 'Declared' }).value, workspace.lob));
check(() => assert.equal(isRetiredWorkspace({ ...workspace, lifecycle: ' Retired ' }), true));
check(() => assert.equal(isRetiredWorkspace(workspace), false));

// Exact linked records count as one work item; rule names and asset matches do not invent links.
const counted = fresh();
counted.requests = [];
counted.attestations = [];
counted.findings = [
  { ...counted.findings[0], id: 'F-ONE', workspaceId: workspace.id, assetId: null, status: 'Open' },
  { ...counted.findings[1], id: 'F-TWO', workspaceId: workspace.id, assetId: null, status: 'Open' },
];
counted.reviews = [{ ...counted.reviews[0], workspaceId: workspace.id, assetId: null, status: 'New', findingIds: ['F-ONE', 'F-TWO'] }];
check(() => assert.equal(workspaceWork(counted, workspace).count, 1));
check(() => assert.equal(workspaceWork(counted, workspace).unlinkedFindings.length, 0));
counted.reviews[0].findingIds = ['F-ONE'];
check(() => assert.equal(workspaceWork(counted, workspace).count, 2));
counted.reviews[0].status = 'Closed';
check(() => assert.equal(workspaceWork(counted, workspace).count, 2));
check(() => assert.equal(workspaceWork(counted, { ...workspace, lifecycle: 'Retired' }).count, 2));
counted.reviews = [];
counted.findings[0].workspaceId = null;
counted.findings[0].assetId = counted.assets.find(asset => asset.workspaceId === workspace.id)!.id;
check(() => assert.equal(workspaceWork(counted, workspace).count, 2));
counted.findings[0].workspaceId = 'WS-OTHER';
check(() => assert.equal(workspaceWork(counted, workspace).count, 1));

const request: WorkspaceRequest = {
  id: 'REQ-REGISTER', type: 'Register Existing', workspaceId: workspace.id, nativeWorkspaceId: workspace.nativeId,
  platform: workspace.platform, businessName: workspace.businessName, purpose: workspace.purpose, ownerId: workspace.ownerId,
  championIds: ['P1'], configuration: workspace.configuration, technicalName: workspace.name, groups: [],
  customReason: '', customExplanation: '', alternateSecurity: '', alternateAuthentication: '', classification: workspace.classification,
  criticality: workspace.criticality, status: 'Draft', createdDate: '2026-10-01',
};
check(() => assert.ok(registrationHref(data, workspace).includes('/requests/new?type=Register')));
data.requests = [request];
check(() => assert.equal(registrationHref(data, workspace), '/requests/REQ-REGISTER'));
data.requests.push({ ...request, id: 'REQ-CORRECTED', supersedesRequestId: request.id, createdDate: '2026-10-02' });
check(() => assert.equal(registrationHref(data, workspace), '/requests/REQ-CORRECTED'));
data.requests[1].nativeWorkspaceId = 'different-native-id';
check(() => assert.ok(registrationHref(data, workspace).includes('/requests/new?type=Register')));

for (const mode of ['Business', 'Administrator'] as const) {
  const markup = render(fresh(), `/workspaces/${workspace.id}`, mode);
  check(() => assert.equal((markup.match(/role="tab"/g) || []).length, 5));
  check(() => assert.ok(markup.includes('Open work (')));
  check(() => assert.ok(markup.includes('No submitted request recorded')));
  check(() => assert.ok(!markup.includes('Compare configuration</button>')));
}
const list = render(fresh(), '/workspaces', 'Administrator');
check(() => assert.equal((list.match(/<th>/g) || []).length, 5));
check(() => assert.ok(list.includes('<th>Workspace Owner</th>')));
check(() => assert.ok(!list.includes('Operations archive')));
check(() => assert.ok(list.includes('Include retired')));

const unresolved = fresh();
unresolved.champions.push({ configurationVersionId: workspace.implementedVersionId, personId: 'MISSING-PERSON' });
const overview = render(unresolved, `/workspaces/${workspace.id}`);
check(() => assert.ok(overview.includes('MISSING-PERSON')));
check(() => assert.ok(overview.includes('Directory identity not resolved')));
check(() => assert.ok(overview.includes('neither grants nor requires publish/modify access')));
unresolved.lineage = [{ assetId: unresolved.assets.find(asset => asset.workspaceId === workspace.id)!.id, connectionId: 'MISSING-CONNECTION' }];
const connectionPage = render(unresolved, `/workspaces/${workspace.id}?tab=Connections`);
check(() => assert.ok(connectionPage.includes('MISSING-CONNECTION')));
check(() => assert.ok(connectionPage.includes('Unresolved reference')));
check(() => assert.ok(connectionPage.includes('Observed workspace membership is not recorded')));
check(() => assert.ok(connectionPage.includes('Dataset coverage not recorded')));
unresolved.principals = [];
unresolved.effectiveAccess = [];
const accessPage = render(unresolved, `/workspaces/${workspace.id}?tab=Access`);
check(() => assert.ok(accessPage.includes('No principal evidence is recorded')));
check(() => assert.ok(!accessPage.includes('need RW membership reconciliation')));
unresolved.workspaces[0].observationComplete = true;
unresolved.workspaces[0].observedDate = new Date().toISOString();
unresolved.evidencePolicies = { [workspace.platform]: 31 };
const completeWorkspaceOnly = render(unresolved, `/workspaces/${workspace.id}?tab=Comparison`);
check(() => assert.ok(completeWorkspaceOnly.includes('No direct-user rows recorded')));
check(() => assert.ok(!completeWorkspaceOnly.includes('>Aligned<')));
const inventoryOnly = fresh();
inventoryOnly.workspaces[0].observationComplete = true;
inventoryOnly.workspaces[0].observedDate = todayLocal();
inventoryOnly.evidencePolicies = { [workspace.platform]: 31 };
const inventoryOverview = render(inventoryOnly, `/workspaces/${workspace.id}`);
check(() => assert.ok(inventoryOverview.includes('Workspace inventory evidence')));
check(() => assert.ok(/Inventory status<\/small><span[^>]*><i><\/i>Current</.test(inventoryOverview)));
check(() => assert.ok(!inventoryOverview.includes('Comparison evidence')));
check(() => assert.ok(render(inventoryOnly, `/workspaces/${workspace.id}?tab=Access`).includes('Access dataset coverage is not recorded')));
for (const [raw, technology, note] of [
  ['Extract', 'Undefined', 'Extract processing recorded; source technology not supplied'],
  [' extract ', 'Undefined', 'Extract processing recorded; source technology not supplied'],
  ['   ', 'Undefined', ''],
  ['', 'Undefined', ''],
  [' Oracle ', 'Oracle', ''],
  ['hyper', 'hyper', ''],
]) {
  const connections = fresh();
  connections.connections[0].technology = raw;
  const original = JSON.stringify(connections);
  const page = render(connections, `/workspaces/${workspace.id}?tab=Connections`);
  check(() => assert.ok(page.includes(`<td>${technology}${note ? `<small>${note}</small>` : ''}</td>`)));
  check(() => assert.equal(JSON.stringify(connections), original));
}
const empty = fresh();
empty.assets = [];
empty.lineage = [];
const emptyAssets = render(empty, `/workspaces/${workspace.id}?tab=Assets`);
check(() => assert.ok(emptyAssets.includes('No accountable asset association is recorded')));
check(() => assert.ok(!emptyAssets.includes('Provisioning is complete')));
empty.requests = [];
empty.reviews = [];
empty.findings = [];
empty.attestations = [];
check(() => assert.ok(render(empty, `/workspaces/${workspace.id}?tab=Work`).includes('No open work recorded. This does not establish compliance.')));
console.log(`Workspace page checks passed: ${checks}`);
