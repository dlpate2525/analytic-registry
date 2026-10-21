export async function run(t) {
  const { page, check, state } = t;
  await t.action('Open the asset registry from primary navigation', () => page.getByRole('link', { name: 'Assets', exact: true }).click());
  await page.getByRole('heading', { name: 'Asset registry', exact: true }).waitFor();
  check('Asset registry has five columns', await page.locator('main th').count() === 5);
  await t.action('Open AST-001 from the asset registry', () => page.locator('main a.strong-link[href="#/assets/AST-001"]').click());
  await page.getByRole('tab', { name: 'Governance & risk', exact: true }).waitFor();
  check('Asset detail has four tabs', await page.locator('main .tabs button').count() === 4);
  await t.action('Open the completed evaluation from Governance & risk', async () => {
    await page.getByRole('tab', { name: 'Governance & risk', exact: true }).click();
    await page.getByRole('link', { name: 'Record completed evaluation', exact: true }).click();
    await page.getByLabel('Evaluation applies to').waitFor();
  });
  check('Completed evaluation has four steps and no saved draft', await page.locator('.steps button').count() === 4 && await page.getByRole('button', { name: 'Save draft', exact: true }).count() === 0);
  await t.action('Record a completed new business version evaluation', async () => {
    await page.getByLabel('Evaluation applies to').selectOption('New current version');
    await page.getByLabel('Business version *').fill('B-VERIFY');
    await page.getByLabel('Business purpose *').fill('Validate business evaluation and current version projection.');
    await page.getByLabel('Intended audience *').fill('Local product reviewers');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Complexity').selectOption('Simple');
    await page.getByLabel('Distinct logical data sources *').fill('2');
    await page.getByLabel('Intended human audience size *').fill('20');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Contains PII').selectOption('No');
    await page.getByLabel('Qualifies as an EUCT').selectOption('No');
    await page.getByLabel('DMP tier').selectOption('Untiered');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Supporting evidence reference *').fill('LOCAL-VERIFY-ASSET');
    await page.getByLabel('Change, correction or follow-up comments').fill('Material business purpose change in a disposable verification context.');
  });
  await t.snapshot('evaluation-before-save');
  await t.action('Save the completed evaluation', async () => {
    await page.getByRole('button', { name: 'Save completed evaluation', exact: true }).click();
    await page.waitForURL(/\/assets\/AST-001\?tab=/);
  });
  const saved = await state();
  const asset = saved.assets.find(row => row.id === 'AST-001');
  const evaluation = saved.assetEvaluations.find(row => row.id === asset.currentEvaluationId);
  check('Business version and evaluation become current together', asset.version === 'B-VERIFY' && !!evaluation && evaluation.businessVersionId === asset.currentBusinessVersionId);
  check('PRL 3 and non-high-risk qualification calculate', evaluation.calculatedPrl === 'PRL 3' && evaluation.risk === 'Does not meet the High risk rule');
  await page.reload(); await page.waitForLoadState('networkidle');
  check('Completed evaluation survives reload', (await state()).assetEvaluations.some(row => row.id === evaluation.id));
  await t.visit('/assets/AST-034');
  await t.action('Confirm initial asset accountability as an eligible Champion', async () => {
    await page.getByLabel('Accountable workspace').selectOption('WS-006');
    await page.getByRole('button', { name: 'Confirm accountability', exact: true }).click();
  });
  const associated = await state();
  check('Initial association records workspace, actor, and date', associated.assets.find(row => row.id === 'AST-034').workspaceId === 'WS-006' && associated.assetAssociations.some(row => row.assetId === 'AST-034' && row.actorId === 'P1' && row.recordedAt));
  check('Association does not create an evaluation', associated.assetEvaluations.length === saved.assetEvaluations.length);
  await t.action('Switch to Administrator and open transfer', async () => {
    await page.getByLabel('Application view').selectOption('Administrator');
    await t.visit('/assets/AST-034');
    await page.getByText('Transfer or correct accountability', { exact: true }).click();
  });
  const target = await page.getByLabel('Accountable workspace').locator('option').evaluateAll(rows => rows.map(row => row.value).find(Boolean));
  const manager = await page.getByLabel('Prototype Platform Manager').inputValue();
  await page.getByLabel('Accountable workspace').selectOption(target);
  check('Transfer requires reason and business confirmation', await page.getByRole('button', { name: 'Record confirmed change' }).isDisabled());
  await t.action('Record confirmed accountability correction', async () => {
    await page.getByLabel('Reason *').fill('Confirmed accountable workspace correction.');
    await page.getByLabel('Business confirmation reference *').fill('LOCAL-VERIFY-BOTH-WORKSPACES');
    await page.getByRole('button', { name: 'Record confirmed change' }).click();
  });
  const transferred = await state();
  check('Correction records the selected Platform Manager actor', transferred.assetAssociations.at(-1).actorId === manager);
  check('Transfer applies while preserving native identity and earlier association', transferred.assets.find(row => row.id === 'AST-034').workspaceId === target && transferred.assets.find(row => row.id === 'AST-034').nativeId === associated.assets.find(row => row.id === 'AST-034').nativeId && transferred.assetAssociations.length === 2);
  check('Accountability correction preserves existing cases', JSON.stringify(transferred.reviews) === JSON.stringify(associated.reviews));
  await t.visit('/assets/AST-001/assessment');
  check('Non-Champion profile cannot save an evaluation', await page.getByRole('button', { name: 'Save completed evaluation', exact: true }).count() === 0);
}
