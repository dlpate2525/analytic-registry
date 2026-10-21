import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { documentationCopies, documentationGroups } from '../src/data/documentation.ts';
import { prototypeRelease, prototypeArtifacts, releaseArtifactKeys } from '../src/data/release.ts';

const app = path.resolve(import.meta.dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-release-'));
const candidate = path.join(fixture, 'analytic-registry');
fs.mkdirSync(path.join(candidate, 'scripts'), { recursive: true });
fs.mkdirSync(path.join(candidate, 'src/data'), { recursive: true });
fs.copyFileSync(path.join(app, 'scripts/prepare-release.mjs'), path.join(candidate, 'scripts/prepare-release.mjs'));
fs.writeFileSync(path.join(candidate, 'scripts/package-local-collection.py'), 'raise RuntimeError("Unexpected collection writer")\n');
fs.writeFileSync(path.join(candidate, 'scripts/prepare-local-docs.mjs'), 'throw new Error("Unexpected docs writer");\n');
const artifacts = {
  collectionPack: 'resources/platform-data-collection/analytic-registry-v1.2-extract.zip',
  workbook: 'resources/platform-data-collection/v1.2-workbook/analytic-registry-v1.2-extract.xlsx',
};
const release = {
  version: '1.2.0-prototype.1', tag: 'v1.2.0-prototype.1', publication: 'Prototype release',
  collectionContract: '1.1', workbookRevision: '1.2',
};
let checks = 0;
function configure(metadata = release, paths = artifacts, packageVersion = metadata.version) {
  fs.writeFileSync(path.join(candidate, 'src/data/release.ts'), 'export const prototypeRelease = ' + JSON.stringify(metadata) + ';\nexport const prototypeArtifacts = ' + JSON.stringify(paths) + ';\n');
  fs.writeFileSync(path.join(candidate, 'package.json'), JSON.stringify({ type: 'module', version: packageVersion }));
  fs.writeFileSync(path.join(candidate, 'package-lock.json'), JSON.stringify({ version: packageVersion, packages: { '': { version: packageVersion } } }));
}
function run(...args) {
  return spawnSync(process.execPath, [path.join(app, 'node_modules/tsx/dist/cli.mjs'), path.join(candidate, 'scripts/prepare-release.mjs'), ...args], { cwd: candidate, encoding: 'utf8', windowsHide: true });
}
function snapshot(folder = fixture) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(item => {
    const file = path.join(folder, item.name);
    return item.isSymbolicLink() ? [[file, fs.readlinkSync(file)]] : item.isDirectory() ? snapshot(file) : [[file, fs.readFileSync(file).toString('base64')]];
  });
}
function check(name, result) { assert.ok(result, name); checks++; }

configure({ ...release, version: release.version + '-local', tag: null, publication: 'Local working draft' });
let before = JSON.stringify(snapshot());
let result = run();
check('Local preparation is rejected before any writer', result.status !== 0 && result.stderr.includes('local') && !result.stderr.includes('Unexpected') && JSON.stringify(snapshot()) === before);
result = run('--collection-descriptor');
check('Direct local packaging can read the same metadata authority', result.status === 0 && JSON.parse(result.stdout).applicationVersion.endsWith('-local'));

configure(release, artifacts, '0.0.0');
before = JSON.stringify(snapshot());
result = run();
check('Package disagreement fails before any writer', result.status !== 0 && result.stderr.includes('Package') && !result.stderr.includes('Unexpected') && JSON.stringify(snapshot()) === before);

configure({ ...release, tag: 'v1.1.0-prototype.2' });
before = JSON.stringify(snapshot());
result = run();
check('Wrong target tag fails before any writer', result.status !== 0 && result.stderr.includes('tag') && !result.stderr.includes('Unexpected') && JSON.stringify(snapshot()) === before);

configure(release, { ...artifacts, collectionPack: 'resources/platform-data-collection/../escape.zip' });
before = JSON.stringify(snapshot());
result = run();
check('Artifact traversal fails before any writer', result.status !== 0 && !result.stderr.includes('Unexpected') && JSON.stringify(snapshot()) === before);

configure();
before = JSON.stringify(snapshot());
result = run('--collection-descriptor');
const descriptor = result.status === 0 ? JSON.parse(result.stdout) : {};
check('Descriptor derives current workbook and separate versions', descriptor.workbookName === 'analytic-registry-v1.2-extract.xlsx' && descriptor.currentWorkbookDirectory === 'v1.2-workbook' && descriptor.applicationVersion === release.version && descriptor.inputSchemaVersion === '1.1' && descriptor.workbookRevision === '1.2' && JSON.stringify(snapshot()) === before);
result = run('--unknown');
check('Unknown preparation options fail before writers', result.status !== 0 && !result.stderr.includes('Unexpected') && JSON.stringify(snapshot()) === before);

function write(file, bytes) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); }
configure(prototypeRelease, prototypeArtifacts);
fs.appendFileSync(path.join(candidate, 'src/data/release.ts'), '\nexport const releaseArtifactKeys = ' + JSON.stringify(releaseArtifactKeys) + ';\n');
fs.symlinkSync(path.join(app, 'node_modules'), path.join(candidate, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
for (const name of ['scripts/package-local-collection.py', 'scripts/prepare-local-docs.mjs', 'src/data/documentation.ts']) write(path.join(candidate, name), fs.readFileSync(path.join(app, name)));
for (const [source] of documentationCopies()) write(path.join(candidate, source), '# Synthetic release fixture\n');
const publicRoot = path.join(candidate, 'public');
for (const group of documentationGroups()) for (const link of group.links) write(path.join(publicRoot, link.href), 'Historical fixture: ' + link.href);
write(path.join(publicRoot, 'review-pack.html'), 'Preserved historical HTML');
const collection = path.join(fixture, 'platform-data-collection');
for (const name of ['analytic-registry-v1.2-extract.xlsx', 'column-dictionary.csv', 'README.md']) write(path.join(collection, 'v1.2-workbook', name), 'Synthetic current bytes: ' + name);
write(path.join(collection, 'v1.2-workbook/contract.json'), JSON.stringify({ queryProfiles: { Tableau: { label: 'Fixture', query: 'queries/current.sql', guide: 'current.md' } } }));
for (const name of ['queries/current.sql', 'current.md', 'README.md', 'source-query-design.md', 'monthly-reconciliation.md', 'sqlserver-staging.sql', 'sqlserver-validation.sql', 'sqlserver-email-match.sql']) write(path.join(collection, 'v1.1-extract', name), 'Current source bytes: ' + name);
result = run();
check('Preparation coordinates real collection and document owners', result.status === 0);
check('Preparation preserves historical HTML', fs.readFileSync(path.join(publicRoot, 'review-pack.html'), 'utf8') === 'Preserved historical HTML');
before = JSON.stringify(snapshot());
result = run('--check');
check('Coordinated check is read-only', result.status === 0 && JSON.stringify(snapshot()) === before);
check('Repeated coordinated preparation is byte-identical', run().status === 0 && JSON.stringify(snapshot()) === before);
write(path.join(publicRoot, 'resources/platform-data-collection/v1.1-extract/current.md'), 'Stale served query guide');
before = JSON.stringify(snapshot());
result = run('--check');
check('Coordinated check rejects stale query guides without writes', result.status !== 0 && result.stderr.includes('Public collection resource differs') && JSON.stringify(snapshot()) === before);
check('Coordinated preparation repairs current copies', run().status === 0 && run('--check').status === 0);
fs.writeFileSync(path.join(fixture, 'result.json'), JSON.stringify({ checks, fixture }, null, 2));
console.log(checks + ' release preparation boundary checks passed. Evidence: ' + fixture);
