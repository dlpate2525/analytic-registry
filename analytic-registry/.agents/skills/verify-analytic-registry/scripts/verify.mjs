import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const featureNames = ['workspaces', 'assets', 'requests', 'work', 'administration'];
const requested = process.argv[2] || 'all';
const port = Number(process.argv[3] || 5191);
assert.ok(['doctor', 'all', ...featureNames].includes(requested), 'Choose doctor, all, or a feature listed in features/README.md');
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535 && port !== 5180, 'Use an unoccupied verification port other than 5180');
const base = `http://127.0.0.1:${port}`;
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
const output = path.join(root, '.scratch', 'verification-' + runId);
await fs.mkdir(output, { recursive: true });
const report = { runId, root, base, requested, startedAt: new Date().toISOString(), features: [], errors: [], cleanup: {} };
await fs.writeFile(path.join(output, 'run.json'), JSON.stringify(report, null, 2));
console.log('Verification evidence: ' + output);
let server, browser;
const execute = promisify(execFile);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const log = async (file, value) => fs.appendFile(path.join(output, file), value);

async function listeningPid() {
  const command = `$ErrorActionPreference='Stop'; $owners=@(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); $owners -join ','`;
  const { stdout } = await execute('powershell.exe', ['-NoProfile', '-Command', command], { windowsHide: true });
  return stdout.trim();
}

async function assertPortFree() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen({ host: '127.0.0.1', port, exclusive: true }, resolve); });
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
}

async function doctor() {
  assert.ok(server && server.exitCode === null && server.signalCode === null, 'Owned Vite process is running');
  assert.equal(await listeningPid(), String(server.pid), 'Verification port belongs to the exact Vite child');
  const response = await fetch(base, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes('/src/main.tsx'), 'Expected React entry is served');
  const main = await fetch(base + '/src/main.tsx', { signal: AbortSignal.timeout(5000) });
  assert.equal(main.status, 200);
  assert.ok((await main.text()).includes('CanvasFrame'), 'Expected application module is served');
  const result = { checkedAt: new Date().toISOString(), pid: server.pid, base, packageVersion: JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')).version };
  await log('doctor.jsonl', JSON.stringify(result) + '\n');
  return result;
}

async function drive(feature) {
  const directory = path.join(output, feature);
  await fs.mkdir(directory);
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  const page = await context.newPage();
  const errors = [];
  const result = { feature, checks: [], errors, fixtures: [], pass: false };
  const record = async (kind, detail) => fs.appendFile(path.join(directory, 'actions.jsonl'), JSON.stringify({ at: new Date().toISOString(), kind, detail }) + '\n');
  context.on('page', next => {
    next.on('pageerror', error => errors.push({ kind: 'pageerror', message: error.message }));
    next.on('console', entry => { if (entry.type() === 'error') errors.push({ kind: 'console', message: entry.text() }); });
    next.setDefaultTimeout(10000);
  });
  page.on('pageerror', error => errors.push({ kind: 'pageerror', message: error.message }));
  page.on('console', entry => { if (entry.type() === 'error') errors.push({ kind: 'console', message: entry.text() }); });
  page.setDefaultTimeout(10000);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('http') && url.origin !== base && !['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) {
      errors.push({ kind: 'external-request', url: url.href });
      await route.abort();
    } else {
      if (url.origin !== base) await record('public-font-read', url.href);
      await route.continue();
    }
  });
  const state = () => page.evaluate(async () => {
    const { storageKey, decodeRegistry } = await import('/src/data/persistence.ts');
    const saved = localStorage.getItem(storageKey);
    if (saved) return decodeRegistry(saved);
    const { migrateData } = await import('/src/data/migrate.ts');
    return migrateData(structuredClone((await import('/src/data/mock.ts')).initialData));
  });
  const snapshot = async name => {
    await page.screenshot({ path: path.join(directory, name + '.png') });
    await fs.writeFile(path.join(directory, name + '.aria.yml'), await page.locator('body').ariaSnapshot());
    await fs.writeFile(path.join(directory, name + '.storage.json'), JSON.stringify(await page.evaluate(() => ({ ...localStorage })), null, 2));
  };
  const t = {
    page, context, directory, base, state, snapshot,
    async visit(route) { await record('navigate', route); await page.goto(base + '/#' + route); await page.waitForLoadState('networkidle'); await page.locator('main h1, main .empty').first().waitFor(); },
    async action(description, run) { await record('ui-action', description); await run(); },
    check(name, condition, observed) { assert.ok(condition, name + (observed === undefined ? '' : ': ' + JSON.stringify(observed))); result.checks.push({ name, pass: true, observed }); },
    async fixture(description, value) {
      result.fixtures.push(description);
      await record('synthetic-fixture', description);
      await page.evaluate(raw => localStorage.setItem('analytic-registry-prototype-v1', raw), typeof value === 'string' ? value : JSON.stringify(value));
      await page.reload(); await page.waitForLoadState('networkidle');
    },
  };
  try {
    await doctor();
    await t.visit('/');
    t.check('Expected shell and seeded workspace are usable', await page.getByLabel('Application view').isVisible() && (await state()).workspaces.some(row => row.id === 'WS-001'));
    await snapshot('start');
    const module = await import('./features/' + feature + '.mjs');
    await module.run(t);
    t.check('No browser runtime or external-request errors', errors.length === 0, errors);
    await snapshot('result');
    result.pass = true;
  } catch (error) {
    result.failure = error.stack || String(error);
    try { await snapshot('failure'); } catch (captureError) { result.captureError = String(captureError); }
    try { await doctor(); } catch (healthError) { result.doctorError = String(healthError); }
  } finally {
    try { await context.tracing.stop({ path: path.join(directory, 'trace.zip') }); }
    finally { await context.close(); }
    await fs.writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2));
  }
  report.features.push(result);
  console.log(`${result.pass ? 'PASS' : 'FAIL'} ${feature}: ${result.checks.length} assertions`);
}

try {
  await assertPortFree();
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const source = await fs.readFile(path.join(root, 'src/main.tsx'));
  report.application = { packageVersion: pkg.version, entrySha256: createHash('sha256').update(source).digest('hex') };
  const args = [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  server = spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  report.pid = server.pid;
  report.command = { executable: process.execPath, args };
  await fs.writeFile(path.join(output, 'run.json'), JSON.stringify(report, null, 2));
  server.stdout.on('data', value => { void log('server.log', value); });
  server.stderr.on('data', value => { void log('server-errors.log', value); });
  const readyBy = Date.now() + 30000;
  while (true) {
    assert.equal(server.exitCode, null, 'Vite exited before readiness');
    try { const response = await fetch(base, { signal: AbortSignal.timeout(1000) }); if (response.ok) break; } catch {}
    assert.ok(Date.now() < readyBy, 'Vite readiness timed out');
    await pause(200);
  }
  await doctor();
  const playwright = process.env.VERIFY_PLAYWRIGHT || path.resolve(path.dirname(process.execPath), '../node_modules/playwright/index.mjs');
  const { chromium } = await import(pathToFileURL(playwright).href);
  browser = await chromium.launch({ headless: true, executablePath: process.env.VERIFY_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  if (requested === 'doctor') {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base); await page.getByRole('link', { name: 'Workspaces', exact: true }).waitFor();
      await page.getByRole('link', { name: 'Workspaces', exact: true }).click();
      await page.getByRole('heading', { name: 'Workspaces', exact: true }).waitFor();
      assert.ok(await page.locator('tbody tr').count(), 'Seeded workspaces render');
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(output, 'doctor.png') });
      report.usableSeed = true;
    } finally { await context.close(); }
  } else for (const feature of requested === 'all' ? featureNames : [requested]) await drive(feature);
} catch (error) {
  report.errors.push(error.stack || String(error));
} finally {
  if (browser) { try { await browser.close(); report.cleanup.browserClosed = true; } catch (error) { report.errors.push('Browser cleanup: ' + error); } }
  if (server?.pid && server.exitCode === null) {
    try {
      await execute('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true });
      await pause(250);
      report.cleanup.stoppedPid = server.pid;
    } catch (error) { report.errors.push('Owned Vite cleanup: ' + error); }
  }
  if (server?.pid) {
    try { await assertPortFree(); report.cleanup.portReleased = true; } catch (error) { report.errors.push('Port cleanup: ' + error); }
  }
  report.finishedAt = new Date().toISOString();
  report.pass = report.errors.length === 0 && report.features.every(feature => feature.pass);
  await fs.writeFile(path.join(output, 'run.json'), JSON.stringify(report, null, 2));
  assert.ok((await fs.stat(path.join(output, 'run.json'))).size, 'Evidence survives cleanup');
  console.log(JSON.stringify({ pass: report.pass, evidence: output, cleanup: report.cleanup, errors: report.errors }, null, 2));
  process.exitCode = report.pass ? 0 : 1;
}
