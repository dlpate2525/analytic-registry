export async function run(t) {
  const { page, check, state } = t;
  const before = await state();
  await t.action('Open My work from primary navigation', () => page.getByRole('link', { name: 'My work', exact: true }).click());
  await page.getByRole('heading', { name: 'My work', exact: true }).waitFor();
  const headers = await page.locator('main th').allTextContents();
  check('Work queue maps Workspace and Asset', headers.includes('Workspace') && headers.includes('Asset'));
  await t.visit('/reviews?platform=Tableau');
  await t.action('Change work platform and reload', async () => {
    await page.getByLabel('Platform filter', { exact: true }).selectOption('Alteryx');
    await page.waitForURL(/platform=Alteryx/);
    await page.reload(); await page.waitForLoadState('networkidle');
  });
  check('Work platform filter survives reload', await page.getByLabel('Platform filter', { exact: true }).inputValue() === 'Alteryx');
  await t.action('Set search, theme, business line, and severity filters', async () => {
    await page.getByLabel('Search work, workspace, or asset…').fill('REV');
    await page.getByLabel('Work theme').selectOption('Evidence & risk');
    await page.getByText('More filters', { exact: true }).click();
  });
  const businessLine = await page.getByLabel('Business line filter').locator('option').nth(1).textContent();
  await page.getByLabel('Business line filter').selectOption(businessLine);
  await page.waitForURL(url => new URLSearchParams(url.hash.split('?')[1]).get('lob') === businessLine);
  await page.getByLabel('Severity filter').selectOption('High');
  await page.waitForURL(/severity=High/);
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.getByText('More filters', { exact: true }).click();
  check('Search and theme survive reload', await page.getByLabel('Search work, workspace, or asset…').inputValue() === 'REV' && await page.getByLabel('Work theme').inputValue() === 'Evidence & risk');
  check('Business line and severity survive reload', await page.getByLabel('Business line filter').inputValue() === businessLine && await page.getByLabel('Severity filter').inputValue() === 'High');
  await t.action('Switch Administrator and inspect Findings & risk buckets', async () => {
    await page.getByLabel('Application view').selectOption('Administrator');
    await t.visit('/reviews?view=findings&status=open&platform=Tableau');
  });
  const findingHeaders = await page.locator('main th').allTextContents();
  check('Findings map Workspace and Asset', findingHeaders.includes('Workspace') && findingHeaders.includes('Asset'));
  const bucket = await page.getByLabel('Risk bucket filter').locator('option').nth(1).textContent();
  await t.action('Select a risk bucket', () => page.getByLabel('Risk bucket filter').selectOption(bucket));
  await page.waitForURL(url => new URLSearchParams(url.hash.split('?')[1]).get('bucket') === bucket);
  const findingsRoute = page.url().split('#')[1];
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.getByLabel('Application view').selectOption('Administrator');
  await t.visit(findingsRoute);
  check('Findings link restores the selected risk bucket', await page.getByLabel('Risk bucket filter').inputValue() === bucket);
  await t.visit('/reviews?view=findings&status=open');
  check('Finding status is visible on a restored open-only link', await page.getByLabel('Finding status').inputValue() === 'Open');
  await page.getByLabel('Finding status').selectOption('Closed or resolved');
  await page.waitForURL(/status=closed/);
  check('Closed filter shows only closed or resolved rows', await page.locator('main tbody tr').evaluateAll(rows => rows.length > 0 && rows.every(row => ['Closed','Resolved'].includes(row.cells[6].textContent.trim()))));
  await page.getByLabel('Finding status').selectOption('Open');
  await page.waitForURL(/status=open/);
  check('Findings toolbar fits tablet width', await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth));
  await t.action('Open the recorded Review case from My work', async () => {
    await page.getByRole('link', { name: 'My work', exact: true }).click();
    await page.locator('main tbody a.strong-link[href="#/reviews/REV-002"]').click();
    await page.locator('.steps button').first().waitFor();
  });
  check('Review has three steps and recorded Workspace Owner wording', await page.locator('.steps button').count() === 3 && (await page.locator('main').innerText()).includes('Workspace Owner recorded for this case'));
  await t.action('Inspect closure approval requirements without closing a case', () => page.getByRole('button', { name: '3 Evidence & approval', exact: true }).click());
  check('Evidence closure retains approval context', (await page.locator('main').innerText()).includes('Evidence closure'));
  await t.visit('/reviews');
  await t.action('Open Annual Attestation from My work', () => page.getByRole('link', { name: 'Annual Attestation', exact: true }).click());
  await page.getByRole('heading', { name: 'Annual Attestation', exact: true }).waitFor();
  check('Annual list uses Champion recipients', (await page.locator('main th').allTextContents()).includes('Champion recipients'));
  await t.action('Open the annual packet from the Annual Attestation list', async () => {
    await page.locator('main a[href="#/attestations/ATT-1"]').click();
    await page.locator('.steps button').first().waitFor();
  });
  check('Annual packet has three steps and frozen ownership context', await page.locator('.steps button').count() === 3 && (await page.locator('main').innerText()).includes('Workspace Owner recorded at packet capture'));
  check('Inspecting cases and annual packets does not change stored evidence', JSON.stringify((await state()).attestations) === JSON.stringify(before.attestations) && JSON.stringify((await state()).reviews) === JSON.stringify(before.reviews));
  await t.snapshot('annual-packet');
  await t.visit('/reviews?view=findings&status=all');
  const observedLinks = await page.locator('main tbody tr').evaluateAll(rows => rows.map(row => ({
    id: row.querySelector('summary small')?.textContent.split(' · ')[0],
    reviews: [...row.querySelectorAll('a[href^="#/reviews/"]')].map(link => link.getAttribute('href').split('/').at(-1)),
  })));
  const unlinked = before.findings.filter(finding => !before.reviews.some(review => review.findingIds?.includes(finding.id)));
  check('Unlinked seed findings do not infer Review-case links from shared workspace context', unlinked.length > 0 && unlinked.every(finding => observedLinks.some(row => row.id === finding.id && row.reviews.length === 0)));
  check('Visible case links match explicit migrated relationships', observedLinks.every(row => JSON.stringify(row.reviews.sort()) === JSON.stringify(before.reviews.filter(review => review.findingIds?.includes(row.id)).map(review => review.id).sort())));
  const linked = before.reviews.find(review => review.findingIds?.some(id => before.findings.some(finding => finding.id === id)));
  if (!linked) throw new Error('Migrated seed needs an explicit finding-to-case relationship');
  await page.getByRole('link', {name:'Review case '+linked.id,exact:true}).click();
  await page.getByRole('heading', {name:linked.type,exact:true}).waitFor();
  check('Explicit finding link opens its recorded case', page.url().includes('/reviews/'+linked.id));
  check('Following a case link preserves the saved evidence', JSON.stringify((await state()).reviews) === JSON.stringify(before.reviews));
  await t.visit('/reviews?view=findings&status=all');
  await t.snapshot('findings-and-review-links');
  const unresolved = structuredClone(await state());
  unresolved.reviews[0].assetId = 'UNRESOLVED-ASSET';
  await t.fixture('Review references an unavailable asset; this tests retained context, not a platform import', unresolved);
  await t.visit('/reviews/' + unresolved.reviews[0].id);
  const context = page.locator('.kv-grid');
  check('Unavailable asset reference remains visible', (await context.innerText()).includes('UNRESOLVED-ASSET'));
  check('Unavailable asset explains why navigation is absent', (await context.innerText()).includes('Asset record unavailable') && await context.locator('a[href="#/assets/UNRESOLVED-ASSET"]').count() === 0);
  check('Inspecting unavailable context preserves the reference', (await state()).reviews[0].assetId === 'UNRESOLVED-ASSET');
  await page.getByText('Asset record unavailable', { exact: true }).scrollIntoViewIfNeeded();
  await t.snapshot('unavailable-asset-context');

}
