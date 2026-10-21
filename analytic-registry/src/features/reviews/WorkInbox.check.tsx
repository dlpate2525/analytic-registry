import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { initialData } from '../../data/mock';
import { RegistryContext, type RegistryContextValue } from '../../data/RegistryContext';
import { WorkInbox } from './WorkInbox';

let checks = 0;
const check = (run: () => void) => { run(); checks++; };
const data = structuredClone(initialData);
const workspace = data.workspaces[0];
data.requests = [];
data.attestations = [];
data.findings = ['Open', 'Investigating', 'Resolved', 'Closed'].map((status, index) => ({
  ...data.findings[0], id: `F-CHECK-${index}`, rule: `Finding marker ${index}`, status,
  workspaceId: workspace.id, assetId: data.assets[0].id, platform: workspace.platform,
  bucket: 'Orphan', severity: 'High',
}));
data.reviews = [
  { ...data.reviews[0], id: 'CASE-EXPLICIT', workspaceId: workspace.id, findingIds: ['F-CHECK-0'], status: 'Investigating' },
  { ...data.reviews[0], id: 'CASE-HISTORICAL', workspaceId: workspace.id, findingIds: ['F-CHECK-0'], status: 'Closed' },
  { ...data.reviews[0], id: 'CASE-SAME-WORKSPACE', workspaceId: workspace.id, assetId: data.assets[0].id, findingIds: [] },
];
const original = JSON.stringify(data);

function render(query: string) {
  const value: RegistryContextValue = {
    data, viewMode: 'Administrator', update: () => false, dispatchRequest: () => null,
    notice: '', storageIssue: '', setNotice: () => {}, setViewMode: () => {}, reset: () => {}, exportData: () => {},
  };
  return renderToStaticMarkup(<RegistryContext.Provider value={value}>
    <MemoryRouter initialEntries={['/reviews?view=findings&' + query]}><WorkInbox/></MemoryRouter>
  </RegistryContext.Provider>);
}

const open = render('status=open');
check(() => assert.ok(open.includes('aria-label="Finding status"')));
check(() => assert.ok(/<option[^>]*selected=""[^>]*>Open<\/option>/.test(open)));
check(() => assert.ok(open.includes('Finding marker 0') && open.includes('Finding marker 1')));
check(() => assert.ok(!open.includes('Finding marker 2') && !open.includes('Finding marker 3')));
check(() => assert.ok(open.includes('2 findings')));
const closed = render('status=closed');
check(() => assert.ok(/<option[^>]*selected=""[^>]*>Closed or resolved<\/option>/.test(closed)));
check(() => assert.ok(!closed.includes('Finding marker 0') && !closed.includes('Finding marker 1')));
check(() => assert.ok(closed.includes('Finding marker 2') && closed.includes('Finding marker 3')));
check(() => assert.ok(closed.includes('2 findings')));
for (const query of ['', 'status=all', 'status=unrecognized']) {
  const all = render(query);
  check(() => assert.ok(all.includes('4 findings')));
  check(() => assert.ok(/<option[^>]*selected=""[^>]*>All statuses<\/option>/.test(all)));
}
check(() => assert.ok(open.includes('href="/reviews/CASE-EXPLICIT"')));
check(() => assert.ok(open.includes('href="/reviews/CASE-HISTORICAL"')));
check(() => assert.ok(!open.includes('href="/reviews/CASE-SAME-WORKSPACE"')));
check(() => assert.ok(open.includes('No linked Review case')));
check(() => assert.ok(open.includes('<th>Workspace</th>') && open.includes('<th>Asset</th>')));
check(() => assert.ok(open.includes('href="/workspaces/' + workspace.id + '"')));
check(() => assert.ok(open.includes('href="/assets/' + data.assets[0].id + '"')));
const matched = new URLSearchParams({ status: 'open', platform: workspace.platform, lob: workspace.lob, bucket: 'Orphan', severity: 'High', q: 'Finding marker 0' });
check(() => assert.ok(render(matched.toString()).includes('1 findings')));
matched.set('bucket', 'Credential Exposure');
const empty = render(matched.toString());
check(() => assert.ok(empty.includes('0 findings')));
check(() => assert.ok(empty.includes('No findings match this view.')));
check(() => assert.equal(JSON.stringify(data), original));

console.log(`Finding navigation and status filters: ${checks} checks passed.`);
