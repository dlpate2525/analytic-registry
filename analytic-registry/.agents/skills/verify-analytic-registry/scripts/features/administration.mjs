import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

export async function run(t) {
  const { page, check, state } = t;
  await t.action('Open Administration and Platform imports', async () => {
    await page.getByLabel('Administration', { exact: true }).click();
    await page.getByRole('link', { name: 'Platform imports', exact: true }).click();
  });
  await page.getByRole('heading', { name: 'Platform imports', exact: true }).waitFor();
  check('Import walkthrough has five steps', await page.locator('.steps button').count() === 5);
  const before = await state();
  await t.action('Inspect partial import evidence and acceptance boundary', async () => {
    await page.getByRole('button', { name: '4 Compare', exact: true }).click();
    await page.getByLabel('Import example').selectOption('Missing / partial');
  });
  check('Missing or partial evidence remains unverified', (await page.locator('main').innerText()).includes('Not verified'));
  await page.getByRole('button', { name: '5 Accept', exact: true }).click();
  check('Walkthrough does not claim live acceptance', (await page.locator('main').innerText()).includes('Production acceptance is not connected'));
  check('Walkthrough leaves registry data unchanged', JSON.stringify(await state()) === JSON.stringify(before));
  await t.snapshot('import-boundary');
  for (const [label, title] of [['Detection coverage', 'Detection coverage'], ['Configuration standards', 'Configuration standards'], ['Data foundation', 'Data foundation'], ['Reference data', 'Reference data'], ['Activity / history', 'Activity & history']]) {
    await t.action('Open Administration menu item ' + label, () => page.getByRole('link', { name: label, exact: true }).click());
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    check(title + ' renders', await page.getByRole('heading', { name: title, exact: true }).isVisible());
  }
  await page.getByLabel('Application view').selectOption('Administrator');
  await t.visit('/coverage');
  check('Coverage uses current release and all eleven retained buckets', (await page.locator('main').innerText()).includes('V1.2') && await page.locator('.detection-catalog tbody tr').count() === 11);
  check('Coverage offers the four agreed themes', JSON.stringify(await page.getByLabel('Coverage theme').locator('option').allTextContents()) === JSON.stringify(['All themes', 'Accountability', 'Access & credentials', 'Governance', 'Usage & capacity']));
  check('Current catalog excludes historical capability claims', !(await page.locator('main').innerText()).includes('What V1.1') && !(await page.locator('main').innerText()).includes('rules available'));
  await page.getByLabel('Coverage platform').selectOption('Alteryx');
  await page.getByLabel('Coverage theme').selectOption('Accountability');
  check('Theme filter shows both accountability buckets', await page.locator('.detection-catalog tbody tr').count() === 2 && (await page.locator('.detection-catalog').innerText()).includes('Coverage / Bus-Factor'));
  await page.locator('.coverage-detail summary').first().click();
  check('Evidence details disclose partial-source limitations', (await page.locator('.coverage-detail').first().innerText()).includes('Partial'));
  check('Coverage fits 1366 by 768 without horizontal overflow', await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth));
  await t.snapshot('detection-coverage');
  await page.getByRole('link', {name:'Open findings in this bucket →', exact:true}).first().click();
  await page.getByLabel('Finding status').waitFor();
  check('Coverage drilldown preserves platform, bucket, and open status', await page.getByLabel('Platform filter', {exact:true}).inputValue() === 'Alteryx' && await page.getByLabel('Risk bucket filter').inputValue() === 'Orphan' && await page.getByLabel('Finding status').inputValue() === 'Open');
  check('Read-only coverage exploration preserves all registry records', JSON.stringify(await state()) === JSON.stringify(before));
  await t.visit('/');
  const detection = page.locator('section').filter({has:page.getByRole('heading', {name:'Detection coverage',exact:true})});
  check('Dashboard describes query requirements without availability scores', (await detection.innerText()).includes('Primary query') && !(await detection.innerText()).includes('rules available'));
  await page.getByLabel('All platforms', {exact:true}).selectOption('Tableau');
  await page.getByRole('link', {name:'Explore all risk buckets',exact:false}).click();
  await page.getByLabel('Finding status').waitFor();
  check('Dashboard bucket drilldown preserves open findings and platform scope', await page.getByLabel('Platform filter', {exact:true}).inputValue() === 'Tableau' && await page.getByLabel('Finding status').inputValue() === 'Open');
  await t.visit('/reference');
  check('Reference data describes calculated PRL-01', (await page.locator('main').innerText()).includes('PRL-01') && !(await page.locator('main').innerText()).includes('manual recording without calculation'));
  await t.action('Export browser data to the evidence directory', async () => {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export browser data', exact: true }).click();
    const download = await downloading;
    await download.saveAs(t.directory + '/browser-export.json');
  });
  const exported = JSON.parse(await fs.readFile(t.directory + '/browser-export.json', 'utf8'));
  check('Downloaded export contains the current workspace identities', JSON.stringify(exported.workspaces.map(row => row.id)) === JSON.stringify((await state()).workspaces.map(row => row.id)));
  const guideState = await state();
  await page.getByRole('button', { name: 'Open app guide', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'App guide', exact: true });
  const metadata = await (await t.context.request.get(t.base + '/release.json')).json();
  check('Help uses the current release label', await dialog.getByRole('heading', { name: metadata.series + ' app guide', exact: true }).isVisible());
  const opened = t.context.waitForEvent('page');
  await dialog.getByRole('link', { name: 'Guide & documentation', exact: true }).click();
  const guide = await opened;
  try {
    await guide.waitForLoadState('networkidle');
    check('App help opens the readable current guide', await guide.getByRole('heading', { name: 'Analytic Registry ' + metadata.series, exact: true }).isVisible());
    check('Guide separates current guidance, unchanged delivery contract, and earlier designs', await guide.getByRole('heading', { name: 'Current '+metadata.series+' guidance' }).isVisible() && await guide.getByRole('heading', { name: 'Platform delivery · input schema '+metadata.collectionContract }).isVisible() && await guide.getByRole('heading', { name: 'Earlier designs and decisions' }).isVisible());
    check('Guide explains streamlined requests and completed evaluations', (await guide.locator('body').innerText()).includes('Three form steps') && (await guide.locator('body').innerText()).includes('No saved evaluation draft'));
    check('Guide fits the tablet viewport without horizontal overflow', await guide.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await guide.screenshot({ path: t.directory + '/documentation-guide.png', fullPage: true });
    await guide.getByText('Understand relationships and the data handoff', { exact: true }).click();
    await guide.locator('details img').first().waitFor({ state: 'visible' });
    await guide.waitForFunction(() => Array.from(document.querySelectorAll('details img')).every(image => image.complete && image.naturalWidth > 0));
    check('Both relationship diagrams load and fit the guide', await guide.locator('details img').count() === 2 && await guide.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await guide.locator('details').screenshot({ path: t.directory + '/baseline-diagrams.png' });
    const targets = await guide.locator('.resources a').evaluateAll(links => links.map(link => link.href));
    for (const target of targets) {
      if (new URL(target).origin !== t.base) throw new Error('Unexpected guide destination: ' + target);
      const response = await t.context.request.get(target);
      const bytes = await response.body();
      if (!response.ok() || !bytes.length || bytes.toString('utf8').includes('/@vite/client')) throw new Error('Missing document or SPA fallback: ' + target);
    }
    check('Every guide resource resolves to an actual file', targets.length === 15, targets.length);
    for (const key of ['workbook', 'collectionPack']) {
      const artifact = metadata.artifacts[key];
      const bytes = await (await t.context.request.get(t.base + '/' + artifact.path)).body();
      check(key + ' bytes match their own release checksum', createHash('sha256').update(bytes).digest('hex') === artifact.sha256 && bytes.subarray(0, 2).toString() === 'PK');
    }
    const current = await (await t.context.request.get(t.base + '/' + metadata.artifacts.workflows.path)).text();
    const alias = await (await t.context.request.get(t.base + '/current-workflows.md')).text();
    check('Existing current-workflows link resolves to V1.2 guidance', current === alias && current.includes('V1.2'));
  } finally { await guide.close(); }
  await page.getByRole('button', { name: 'Close guide', exact: true }).click();
  check('Opening documentation preserves registry records', JSON.stringify(await state()) === JSON.stringify(guideState));
  const malformed = JSON.stringify({ ...await state(), approvals: {} });
  await t.fixture('Synthetic unreadable approval history in the disposable context', malformed);
  check('Malformed approval history enters recovery', await page.getByRole('alert').filter({ hasText: 'The original is preserved' }).isVisible());
  check('Recovery preserves the exact original bytes', await page.evaluate(() => localStorage.getItem('analytic-registry-prototype-v1')) === malformed);
}
