import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { prototypeRelease, prototypeArtifacts } from '../src/data/release.ts';

const app = path.resolve(import.meta.dirname, '..');
const options = process.argv.slice(2);
if (options.some(option => !['--check', '--collection-descriptor'].includes(option))) throw new Error('Unknown preparation option');
const descriptorOnly = options.includes('--collection-descriptor');
const local = prototypeRelease.publication === 'Local working draft';
if (!descriptorOnly && local) throw new Error('This version is local only. Use docs:local and the local collection packer.');
const validVersion = /^\d+\.\d+\.\d+-prototype\.\d+(?:-local)?$/.test(prototypeRelease.version);
if (!validVersion || local !== prototypeRelease.version.endsWith('-local')) throw new Error('Release version and publication state disagree');
if (local ? prototypeRelease.tag !== null : prototypeRelease.publication !== 'Prototype release' || prototypeRelease.tag !== 'v' + prototypeRelease.version) throw new Error('Release tag and publication state disagree');

const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(app, 'package-lock.json'), 'utf8'));
if (pkg.version !== prototypeRelease.version || lock.version !== pkg.version || lock.packages[''].version !== pkg.version) throw new Error('Package and lockfile versions must match release.ts');

function collectionPath(value) {
  const prefix = 'resources/platform-data-collection/';
  if (!value.startsWith(prefix)) throw new Error('Release artifact is outside the collection');
  const relative = value.slice(prefix.length);
  if (relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid collection artifact path');
  return relative;
}
const archive = collectionPath(prototypeArtifacts.collectionPack);
const workbook = collectionPath(prototypeArtifacts.workbook);
if (archive.includes('/') || workbook.split('/').length !== 2) throw new Error('Unexpected collection archive or workbook layout');
const descriptor = {
  applicationVersion: prototypeRelease.version, publication: prototypeRelease.publication,
  workbookRevision: prototypeRelease.workbookRevision, inputSchemaVersion: prototypeRelease.collectionContract,
  archiveName: archive, currentWorkbookDirectory: path.posix.dirname(workbook),
  workbookName: path.posix.basename(workbook),
};

if (descriptorOnly) {
  console.log(JSON.stringify(descriptor));
} else {
  const checkArgs = options.includes('--check') ? ['--check'] : [];
  const collection = spawnSync(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), [path.join(app, 'scripts/package-local-collection.py'), '--descriptor-stdin', ...checkArgs], {
    cwd: app, input: JSON.stringify(descriptor), encoding: 'utf8', windowsHide: true,
  });
  if (collection.error) throw collection.error;
  if (collection.status !== 0) throw new Error('Collection preparation failed: ' + collection.stderr);
  process.stdout.write(collection.stdout);
  const documentation = spawnSync(process.execPath, ['--import', 'tsx', path.join(app, 'scripts/prepare-local-docs.mjs'), ...checkArgs], {
    cwd: app, encoding: 'utf8', windowsHide: true,
  });
  if (documentation.error) throw documentation.error;
  if (documentation.status !== 0) throw new Error('Documentation preparation failed: ' + documentation.stderr);
  process.stdout.write(documentation.stdout);
  console.log(JSON.stringify({ version: prototypeRelease.version, intendedTag: prototypeRelease.tag, status: checkArgs.length ? 'Preparation verified' : 'Prepared for validation', publication: 'Not established by this command' }));
}
