import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { initialData } from '../../data/mock';
import { decodeRegistry } from '../../data/persistence';
import { RegistryContext, type RegistryContextValue } from '../../data/RegistryContext';
import { ReviewDetail } from './Reviews';

let checks = 0;
const check = (run: () => void) => { run(); checks++; };

function render(assetId: string | null) {
  const fixture = structuredClone(initialData);
  fixture.reviews[0].assetId = assetId;
  const data = decodeRegistry(JSON.stringify(fixture));
  const before = JSON.stringify(data);
  const value: RegistryContextValue = {
    data, viewMode: 'Administrator', update: () => false, dispatchRequest: () => null,
    notice: '', storageIssue: '', setNotice: () => {}, setViewMode: () => {}, reset: () => {}, exportData: () => {},
  };
  const html = renderToStaticMarkup(<RegistryContext.Provider value={value}>
    <MemoryRouter initialEntries={['/reviews/' + data.reviews[0].id]}>
      <Routes><Route path="/reviews/:id" element={<ReviewDetail/>}/></Routes>
    </MemoryRouter>
  </RegistryContext.Provider>);
  check(() => assert.equal(JSON.stringify(data), before));
  return html;
}

const unresolved = render('UNRESOLVED-ASSET');
check(() => assert.ok(unresolved.includes('Asset record unavailable'), 'Unresolved references explain the missing asset record'));
check(() => assert.ok(!unresolved.includes('href="/assets/UNRESOLVED-ASSET"'), 'Unresolved references do not advertise dead links'));
check(() => assert.ok(unresolved.includes('UNRESOLVED-ASSET'), 'Unresolved native reference stays visible'));
const asset = initialData.assets[0];
const resolved = render(asset.id);
check(() => assert.ok(resolved.includes('href="/assets/' + asset.id + '"'), 'Available assets remain navigable'));
check(() => assert.ok(resolved.includes(asset.name), 'Available assets show their names'));
check(() => assert.ok(render(null).includes('No asset linked'), 'Absent references have explicit empty context'));

console.log(`Review asset context: ${checks} checks passed.`);
