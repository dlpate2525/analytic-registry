export async function run(t) {
  const { page, context, check, state } = t;
  await t.action('Open Requests from primary navigation', () => page.getByRole('link', { name: 'Requests', exact: true }).click());
  await page.getByRole('heading', { name: 'Requests', exact: true }).waitFor();
  await t.action('Open Workspaces and the WS-001 record', async () => {
    await page.getByRole('link', { name: 'Workspaces', exact: true }).click();
    await page.getByRole('heading', { name: 'Workspaces', exact: true }).waitFor();
    await page.locator('main tbody a.strong-link[href="#/workspaces/WS-001"]').click();
    await page.getByRole('link', { name: /Request change/ }).waitFor();
  });
  await t.action('Open the workspace request action', () => page.getByRole('link', { name: /Request change/ }).click());
  await page.waitForURL(/\/requests\/new/);
  await page.locator('.steps button').first().waitFor();
  check('Existing-workspace request opens with three business steps', await page.locator('.steps button').count() === 3);
  await t.action('Keep one Champion to check the permitted backup warning', async () => {
    while (await page.locator('.person-chip button').count() > 1) await page.locator('.person-chip button').last().click();
  });
  check('One Champion shows a nonblocking backup warning in Workspace & people', await page.getByText('One Champion is allowed. Add another Champion for backup when possible.', { exact: true }).isVisible());

  await t.action('Declare an independent business line and submit', async () => {
    await page.getByLabel('Workspace business line *').fill('Local verification Operations');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    check('Review & submit repeats the one-Champion backup warning', await page.getByText('One Champion is allowed. Add another Champion for backup when possible.', { exact: true }).isVisible());
    await page.getByRole('button', { name: 'Submit request', exact: true }).click();
    await page.waitForURL(/\/requests\/REQ-/);
  });
  const requestId = page.url().split('/').at(-1);
  const submitted = await state();
  const request = submitted.requests.find(row => row.id === requestId);
  check('New submission uses Champion policy without technical work', request?.approvalPolicy === 'champion-v1' && request.technicalWorkRequired === false);
  await t.snapshot('submitted-request');
  await t.action('Record the eligible Champion business approval', async () => {
    await page.getByLabel('Approval reference / note').fill('LOCAL-VERIFY-CHAMPION');
    await page.getByRole('button', { name: 'Approve business declarations', exact: true }).click();
  });
  const approved = await state();
  check('Business approval applies the request', !!approved.requests.find(row => row.id === requestId)?.businessApplied);
  check('Approval records the acting Champion', approved.approvals.some(row => row.targetId === requestId && row.role === 'Champion' && row.personId === 'P1'));
  check('Independent business line applies', approved.workspaces.find(row => row.id === 'WS-001').lob === 'Local verification Operations');
  check('Business-only approval preserves configuration and groups', approved.configurations.length === submitted.configurations.length && approved.groups.length === submitted.groups.length);
  check('Approval preserves native identity', approved.workspaces.find(row => row.id === 'WS-001').nativeId === submitted.workspaces.find(row => row.id === 'WS-001').nativeId);
  await page.reload(); await page.waitForLoadState('networkidle');
  check('Approved request survives reload', !!(await state()).requests.find(row => row.id === requestId)?.businessApplied);
  await t.visit('/requests/new?type=Update%20Existing&workspace=WS-001');
  await t.action('Request platform changes and inspect groups', async () => {
    await page.getByLabel('Platform changes required').selectOption('Yes');
    await page.getByRole('button', { name: '4 Groups & access', exact: true }).click();
  });
  check('Technical request has five steps', await page.locator('.steps button').count() === 5);
  check('Data Sources group retains the _DS suffix', await page.getByRole('button', { name: 'Edit _DS', exact: true }).count() === 1);
  check('Groups do not ask for a business group owner', !(await page.locator('main').innerText()).toLowerCase().includes('business group owner'));
  await t.snapshot('technical-groups');
  await t.visit('/requests/new?type=Update%20Existing&workspace=WS-001');
  const second = await context.newPage();
  try {
    await t.action('Save a draft in a second isolated tab', async () => {
      await second.goto(t.base + '/#/requests/new?type=Update%20Existing&workspace=WS-001');
      await second.waitForLoadState('networkidle');
      await second.getByRole('button', { name: 'Save draft', exact: true }).click();
    });
    const secondBytes = await second.evaluate(() => localStorage.getItem('analytic-registry-prototype-v1'));
    await t.action('Try saving the older tab draft', () => page.getByRole('button', { name: 'Save draft', exact: true }).click());
    check('Stale tab write is rejected', (await page.locator('body').innerText()).includes('Another tab changed the registry'));
    check('Stale save preserves the other tab bytes', await page.evaluate(() => localStorage.getItem('analytic-registry-prototype-v1')) === secondBytes);
  } finally { await second.close(); }
}
