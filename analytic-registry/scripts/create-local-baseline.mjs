import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const app = path.resolve(import.meta.dirname, '..');
const baselineRoot = path.join(app, 'baselines');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const entries = [];
const localVersion = /^[\w.-]+-local$/;

function collect(source, target, category) {
  if (!fs.existsSync(source)) throw new Error('Missing baseline input: ' + source);
  if (fs.lstatSync(source).isSymbolicLink()) throw new Error('Baseline input must be an ordinary file or directory: ' + source);
  if (fs.statSync(source).isDirectory()) {
    for (const item of fs.readdirSync(source).sort()) {
      if (item.startsWith('.') || ['node_modules', '__pycache__'].includes(item)) continue;
      collect(path.join(source, item), target + '/' + item, category);
    }
  } else {
    const bytes = fs.readFileSync(source);
    entries.push({ source, path: target, category: target.includes('/public/source/') ? 'historical-served-source' : category, size: bytes.length, sha256: digest(bytes) });
  }
}
function verify(folder, manifest) {
  if (fs.lstatSync(folder).isSymbolicLink()) throw new Error('Unexpected link in baseline: ' + folder);
  const actual = [];
  function inventory(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isSymbolicLink()) throw new Error('Unexpected link in baseline: ' + file);
      if (item.isDirectory()) inventory(file);
      else if (file !== path.join(folder, 'manifest.json')) actual.push(path.relative(folder, file).replaceAll('\\', '/'));
    }
  }
  inventory(folder);
  if (JSON.stringify(actual.sort()) !== JSON.stringify(manifest.files.map(file => file.path).sort())) throw new Error('Baseline file inventory changed.');
  for (const entry of manifest.files) {
    const file = path.resolve(folder, entry.path);
    if (!file.startsWith(folder + path.sep)) throw new Error('Manifest path leaves the baseline: ' + entry.path);
    const bytes = fs.readFileSync(file);
    if (bytes.length !== entry.size || digest(bytes) !== entry.sha256) throw new Error('Baseline checksum failed: ' + entry.path);
  }
}

async function verifyPreview() {
  const preview = new Map(entries.filter(entry => entry.path.startsWith('preview/')).map(entry => [entry.path.slice('preview/'.length), entry]));
  const publicFiles = entries.filter(entry => entry.path.startsWith('analytic-registry/public/'));
  const expected = new Set();
  for (const entry of publicFiles) {
    const name = entry.path.slice('analytic-registry/public/'.length);
    expected.add(name);
    if (preview.get(name)?.sha256 !== entry.sha256) throw new Error('Stale preview public file: ' + name + '. Run npm run build:local after preparing current documentation.');
  }
  console.log('Validating the saved preview against a Vite compilation in memory (write:false). Preview files will not change.');
  const { build } = await import('vite');
  const compiled = await build({
    root: app,
    configFile: path.join(app, 'vite.config.ts'),
    publicDir: false,
    build: { outDir: path.join(app, '.scratch/local-preview'), write: false, emptyOutDir: false },
  });
  for (const result of Array.isArray(compiled) ? compiled : [compiled]) {
    for (const output of result.output) {
      expected.add(output.fileName);
      const bytes = output.type === 'chunk' ? output.code : output.source;
      if (preview.get(output.fileName)?.sha256 !== digest(bytes)) throw new Error('Stale preview bundle: ' + output.fileName + '. Run npm run build:local before creating the baseline.');
    }
  }
  if (JSON.stringify([...preview.keys()].sort()) !== JSON.stringify([...expected].sort())) throw new Error('Preview file inventory differs from the current build. Run npm run build:local before creating the baseline.');
  console.log(`Verified ${publicFiles.length} public resources and ${expected.size - publicFiles.length} generated preview files by SHA-256.`);
}

function moveWithPowerShell(staging, destination) {
  const root = path.resolve(baselineRoot);
  const source = path.resolve(staging);
  const target = path.resolve(destination);
  if (path.dirname(source) !== root || path.dirname(target) !== root || !path.basename(source).startsWith('.preparing-') || !localVersion.test(path.basename(target)) || fs.existsSync(target)) throw new Error('Unsafe baseline finalization paths.');
  const powerShell7 = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe');
  console.log('Windows blocked the Node rename. Finalizing with a checked PowerShell move; the destination must be absent.');
  execFileSync(fs.existsSync(powerShell7) ? powerShell7 : 'powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `
    $ErrorActionPreference = 'Stop'
    $registryRoot = [IO.Path]::GetFullPath($env:ANALYTIC_BASELINE_ROOT)
    $registrySource = [IO.Path]::GetFullPath($env:ANALYTIC_BASELINE_SOURCE)
    $registryTarget = [IO.Path]::GetFullPath($env:ANALYTIC_BASELINE_TARGET)
    if ([IO.Path]::GetDirectoryName($registrySource) -ne $registryRoot -or [IO.Path]::GetDirectoryName($registryTarget) -ne $registryRoot) { throw 'Baseline move leaves its root.' }
    if (-not [IO.Path]::GetFileName($registrySource).StartsWith('.preparing-') -or [IO.Path]::GetFileName($registryTarget) -notmatch '^[\\w.-]+-local$') { throw 'Invalid baseline directory names.' }
    $registryRootItem = Get-Item -LiteralPath $registryRoot -Force
    $registrySourceItem = Get-Item -LiteralPath $registrySource -Force
    if (-not $registryRootItem.PSIsContainer -or -not $registrySourceItem.PSIsContainer -or ($registryRootItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -or ($registrySourceItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Baseline directories must be ordinary directories.' }
    if (Test-Path -LiteralPath $registryTarget) { throw 'A baseline already exists at the destination.' }
    Move-Item -LiteralPath $registrySource -Destination $registryTarget -ErrorAction Stop
  `], {
    windowsHide: true,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, ANALYTIC_BASELINE_ROOT: root, ANALYTIC_BASELINE_SOURCE: source, ANALYTIC_BASELINE_TARGET: target },
  });
}

const args = process.argv.slice(2);
if (args[0] === '--check') {
  if (args.length > 2 || (args[1] && !localVersion.test(args[1]))) throw new Error('Use --check [baseline-id] with a named local baseline.');
  const candidates = fs.existsSync(baselineRoot) ? fs.readdirSync(baselineRoot, { withFileTypes: true }).filter(entry => entry.isDirectory() && localVersion.test(entry.name)).map(entry => entry.name) : [];
  if (!args[1] && candidates.length !== 1) throw new Error(candidates.length ? 'Several frozen baselines exist. Pass --check <baseline-id>.' : 'No frozen local baseline exists.');
  const baselineId = args[1] || candidates[0];
  const destination = path.join(baselineRoot, baselineId);
  const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json'), 'utf8'));
  if (manifest.baselineId !== baselineId) throw new Error('Manifest baseline ID does not match its directory.');
  verify(destination, manifest);
  console.log(`Verified existing ${manifest.baselineId}: ${manifest.files.length} files. No snapshot files changed.`);
} else {
  if (args.length) throw new Error('Use no arguments to create a baseline, or --check [baseline-id] to verify one.');
  await createBaseline();
}

async function createBaseline() {
  const { prototypeRelease, prototypeArtifacts } = await import('../src/data/release.ts');
  if (prototypeRelease.publication !== 'Local working draft' || !localVersion.test(prototypeRelease.version)) throw new Error('Only a named local draft can create a local baseline.');
  const destination = path.join(baselineRoot, prototypeRelease.version);
  for (const [folder, category] of [['src', 'application-source'], ['scripts', 'local-tools'], ['docs', 'documentation'], ['public', 'served-resources']]) collect(path.join(app, folder), 'analytic-registry/' + folder, category);
  collect(path.join(app, '.agents/skills/verify-analytic-registry'), 'analytic-registry/.agents/skills/verify-analytic-registry', 'verification-tool');
  for (const file of ['README.md', 'GLOSSARY.md', 'package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts']) collect(path.join(app, file), 'analytic-registry/' + file, 'application-entry');
  collect(path.resolve(app, '../platform-data-collection'), 'platform-data-collection', 'collection-contract');
  collect(path.join(app, '.scratch/local-preview'), 'preview', 'built-preview');
  entries.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const fileList = entries.map(({ source, ...entry }) => entry);

  if (fs.existsSync(destination)) {
    const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json'), 'utf8'));
    verify(destination, manifest);
    if (JSON.stringify(manifest.files) !== JSON.stringify(fileList)) throw new Error('Working files differ from this frozen baseline. Choose a new baseline version; the existing snapshot was not changed.');
    console.log(`Verified existing ${manifest.baselineId}: ${manifest.files.length} files. No snapshot files changed.`);
  } else {
    const release = JSON.parse(fs.readFileSync(path.join(app, 'public/release.json'), 'utf8'));
    if (release.version !== prototypeRelease.version || release.collectionContract !== prototypeRelease.collectionContract || release.workbookRevision !== prototypeRelease.workbookRevision) throw new Error('Prepare current documentation before creating the baseline.');
    for (const artifact of Object.values(release.artifacts)) {
      if (digest(fs.readFileSync(path.join(app, 'public', artifact.path))) !== artifact.sha256) throw new Error('Stale artifact: ' + artifact.path);
    }
    const browser = JSON.parse(fs.readFileSync(path.join(app, 'public/verification/v1.2/browser-results.json'), 'utf8'));
    if (!browser.pass || browser.application.packageVersion !== prototypeRelease.version || !browser.cleanup.portReleased) throw new Error('A passing browser run for this version is required.');
    await verifyPreview();
    const manifest = {
      manifestVersion: 1,
      baselineId: prototypeRelease.version,
      status: 'Frozen local review baseline; not published',
      createdAt: new Date().toISOString(),
      applicationVersion: prototypeRelease.version,
      extractContractVersion: prototypeRelease.collectionContract,
      workbookRevision: prototypeRelease.workbookRevision,
      lastPublishedBaseline: prototypeRelease.publishedBaseline,
      entryPoints: {
        start: 'analytic-registry/README.md',
        baseline: 'analytic-registry/docs/v1.2-baseline.md',
        guide: 'analytic-registry/public/' + prototypeArtifacts.documentation,
        workflows: 'analytic-registry/docs/v1.2-guide.md',
        requirements: 'analytic-registry/docs/v1.2-requirements.md',
        verification: 'analytic-registry/docs/v1.2-verification.md',
        workbook: 'analytic-registry/public/' + prototypeArtifacts.workbook,
        workbookHandoff: 'analytic-registry/public/' + prototypeArtifacts.handoff,
        queryHandoff: 'platform-data-collection/v1.1-extract/README.md',
        relationships: 'analytic-registry/docs/diagrams/v1.2-relationships.svg',
        evidenceFlow: 'analytic-registry/docs/diagrams/v1.2-evidence-flow.svg',
      },
      boundaries: [
        'The current V1.2 guide and requirements govern current local instructions.',
        'Earlier documents and served source copies are historical references; analytic-registry/src is the current source.',
        'This is a React mock-data prototype, not live ingestion, production authorization, or an import-tested Power App.',
        'No extract header change or new business policy is implied by this application version.',
        'Dependencies, browser storage, scratch work, secrets, and Git metadata are excluded.',
        'The manifest excludes itself from file checksums.',
      ],
      files: fileList,
    };
    fs.mkdirSync(baselineRoot, { recursive: true });
    const staging = path.join(baselineRoot, '.preparing-' + randomUUID());
    fs.mkdirSync(staging);
    for (const entry of entries) {
      const file = path.join(staging, entry.path);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.copyFileSync(entry.source, file);
    }
    for (const entry of Object.values(manifest.entryPoints)) if (!fs.existsSync(path.join(staging, entry))) throw new Error('Missing baseline entry point: ' + entry);
    verify(staging, manifest);
    fs.writeFileSync(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    const retryDelays = [100, 250, 500];
    for (let attempt = 0; ; attempt++) {
      try {
        await fs.promises.rename(staging, destination);
        break;
      } catch (error) {
        if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error.code) || fs.existsSync(destination)) throw error;
        if (attempt === retryDelays.length) {
          moveWithPowerShell(staging, destination);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      }
    }
    const savedManifest = JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json'), 'utf8'));
    if (JSON.stringify(savedManifest) !== JSON.stringify(manifest)) throw new Error('Manifest changed during baseline finalization.');
    verify(destination, savedManifest);
    console.log(`Created ${prototypeRelease.version}: ${entries.length} files, each verified by SHA-256. ${destination}`);
  }
}
