import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { initialData } from '../../data/mock';
import { RegistryContext, type RegistryContextValue } from '../../data/RegistryContext';
import type { RegistryData } from '../../types';
import { AssetDetail } from './Assets';
import { assetPersonReference, assetWork } from './assetView';

let checks = 0;
function check(run: () => void) { run(); checks++; }
function render(data: RegistryData, assetId: string, tab = 'Overview') {
  const value: RegistryContextValue = {
    data, viewMode: 'Business', update: () => false, dispatchRequest: () => null,
    notice: '', storageIssue: '', setNotice: () => {}, setViewMode: () => {}, reset: () => {}, exportData: () => {},
  };
  return renderToStaticMarkup(<RegistryContext.Provider value={value}>
    <MemoryRouter initialEntries={['/assets/' + assetId + '?tab=' + encodeURIComponent(tab)]}><Routes>
      <Route path="/assets/:id" element={<AssetDetail/>}/>
    </Routes></MemoryRouter>
  </RegistryContext.Provider>);
}

const unresolved = structuredClone(initialData);
const workspace = unresolved.workspaces.find(row => row.id === 'WS-001')!;
workspace.ownerId = 'UNRESOLVED-OWNER';
unresolved.champions.push({ configurationVersionId: workspace.implementedVersionId, personId: 'UNRESOLVED-CHAMPION' });
const markup = render(unresolved, 'AST-001');
check(() => assert.ok(markup.includes('UNRESOLVED-CHAMPION')));
check(() => assert.ok(markup.includes('UNRESOLVED-OWNER')));
check(() => assert.ok(markup.includes('Unresolved')));
check(() => assert.deepEqual(assetPersonReference(unresolved, 'UNRESOLVED-OWNER'),
  { id: 'UNRESOLVED-OWNER', name: 'UNRESOLVED-OWNER', status: 'Unresolved' }));

const data = structuredClone(initialData);
const unresolvedReview = structuredClone(initialData);
unresolvedReview.reviews = [{ ...unresolvedReview.reviews[0], assetId: 'AST-001', reviewerId: 'UNRESOLVED-REVIEWER' }];
check(() => assert.ok(render(unresolvedReview, 'AST-001', 'Work').includes('UNRESOLVED-REVIEWER')));
unresolvedReview.reviews[0].reviewerId = '';
check(() => assert.ok(render(unresolvedReview, 'AST-001', 'Work').includes('Not assigned')));
check(() => assert.equal(assetWork(data, 'AST-004').count, 1));
check(() => assert.ok(render(data, 'AST-004').includes('Open work (1)')));

const counted = structuredClone(initialData);
counted.findings = [
  { ...counted.findings[0], id: 'F-ONE', assetId: 'AST-001', status: 'Open' },
  { ...counted.findings[0], id: 'F-TWO', assetId: 'AST-001', status: 'Open' },
];
counted.reviews = [{ ...counted.reviews[0], assetId: 'AST-001', status: 'New', findingIds: ['F-ONE', 'F-TWO'] }];
check(() => assert.equal(assetWork(counted, 'AST-001').count, 1));
counted.reviews[0].findingIds = ['F-ONE'];
check(() => assert.equal(assetWork(counted, 'AST-001').count, 2));
counted.reviews[0].findingIds = [];
check(() => assert.equal(assetWork(counted, 'AST-001').count, 3));
counted.reviews[0].status = 'Closed';
check(() => assert.equal(assetWork(counted, 'AST-001').count, 2));
counted.findings[0].status = 'Resolved';
check(() => assert.equal(assetWork(counted, 'AST-001').count, 1));
for (const [raw, technology, note] of [
  ['Extract', 'Undefined', 'Extract processing recorded; source technology not supplied'],
  [' extract ', 'Undefined', 'Extract processing recorded; source technology not supplied'],
  ['   ', 'Undefined', ''],
  ['', 'Undefined', ''],
  [' Oracle ', 'Oracle', ''],
  ['hyper', 'hyper', ''],
]) {
  const connections = structuredClone(initialData);
  connections.connections[0].technology = raw;
  const original = JSON.stringify(connections);
  const page = render(connections, 'AST-001', 'Connections');
  check(() => assert.ok(page.includes(`<td>${technology}${note ? `<small>${note}</small>` : ''}</td>`)));
  check(() => assert.equal(JSON.stringify(connections), original));
}
console.log(`Asset views: ${checks} checks passed.`);
