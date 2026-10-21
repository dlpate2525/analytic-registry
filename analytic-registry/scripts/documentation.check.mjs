import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { documentationCopies, documentationGroups } from '../src/data/documentation.ts';
import { prototypeArtifacts, prototypeRelease } from '../src/data/release.ts';

const app = path.resolve(import.meta.dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'analytic-registry-docs-'));
const pub = path.join(fixture, 'public');
let checks = 0;
function check(name, condition) { assert.ok(condition, name); checks++; }
function write(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); }
function read(name) { return fs.readFileSync(path.join(pub, name), 'utf8'); }
function run(...args) {
  return spawnSync(process.execPath, [path.join(app, 'node_modules/tsx/dist/cli.mjs'), path.join(fixture, 'scripts/prepare-local-docs.mjs'), ...args], { cwd: fixture, encoding: 'utf8', windowsHide: true });
}
try {
  for (const name of ['src/data/release.ts', 'src/data/documentation.ts', 'scripts/prepare-local-docs.mjs']) write(path.join(fixture, name), fs.readFileSync(path.join(app, name)));
  write(path.join(fixture, 'package.json'), JSON.stringify({ type: 'module' }));
  for (const [source, destination] of documentationCopies()) write(path.join(fixture, source), `# Fixture ${destination}\n`);
  for (const group of documentationGroups()) for (const link of group.links) write(path.join(pub, link.href), 'PK preserved fixture bytes: ' + link.href);
  const workflowSource = path.join(fixture, 'docs/v1.2-guide.md');
  write(workflowSource, '# V1.2 fixture\n\n[Requirements](v1.2-requirements.md)\n');
  write(path.join(pub, 'review-pack.html'), 'Historical HTML must remain unchanged.');
  const artifactsBefore = Object.fromEntries(['workbook', 'collectionPack'].map(key => [key, read(prototypeArtifacts[key])]));
  check('Preparation succeeds with declared inputs', run().status === 0);
  check('Current alias comes from the current workflow source', read('current-workflows.md') === read(prototypeArtifacts.workflows));
  check('Historical HTML remains untouched', read('review-pack.html') === 'Historical HTML must remain unchanged.');
  check('Workflow links resolve in the public layout', read(prototypeArtifacts.workflows).includes('](v1.2-requirements.md)'));
  const metadata = JSON.parse(read('release.json'));
  check('Metadata keeps app and contract versions separate', metadata.version === prototypeRelease.version && metadata.collectionContract === '1.1');
  check('Guide and metadata derive their publication state', metadata.publication === prototypeRelease.publication && read('guide.html').includes(prototypeRelease.publication));
  check('Local baseline and current release record stay separate', read('v1.2-baseline.md').includes('Fixture v1.2-baseline.md') && read(prototypeArtifacts.currentBaseline).includes('Fixture ' + prototypeArtifacts.currentBaseline));
  for (const key of ['workbook', 'collectionPack']) {
    check(key + ' remains byte-identical', read(prototypeArtifacts[key]) === artifactsBefore[key]);
    check(key + ' checksum describes the configured file', metadata.artifacts[key].sha256 === createHash('sha256').update(read(prototypeArtifacts[key])).digest('hex'));
  }
  const first = read('release.json') + read('guide.html') + read('current-workflows.md');
  check('Repeated preparation succeeds', run().status === 0);
  check('Repeated preparation produces identical outputs', first === read('release.json') + read('guide.html') + read('current-workflows.md'));
  check('Read-only check accepts current files', run('--check').status === 0);
  write(path.join(pub, 'current-workflows.md'), 'stale');
  check('Read-only check rejects stale aliases', run('--check').status !== 0 && read('current-workflows.md') === 'stale');
  check('Preparation repairs a stale alias', run().status === 0 && read('current-workflows.md') === read(prototypeArtifacts.workflows));
  const beforeFailure = read(prototypeArtifacts.workflows);
  write(workflowSource, '# Broken source\n[Missing](missing.md)\n');
  const failed = run();
  check('Broken source links fail before public writes', failed.status !== 0 && failed.stderr.includes('Missing source link') && read(prototypeArtifacts.workflows) === beforeFailure);
  write(workflowSource, '# V1.2 fixture\n[Local decision](../.scratch/private.md)\n');
  write(path.join(fixture, '.scratch/private.md'), 'Private working material');
  check('Local review links remain explicit without copying private notes', run().status === 0 && read(prototypeArtifacts.workflows).includes('not included in this browser copy') && !fs.existsSync(path.join(pub, '.scratch')));
  write(workflowSource, '# V1.2 fixture\n[Release source](../src/data/release.ts)\n');
  check('Published current source links use the configured tag', run().status === 0 && read(prototypeArtifacts.workflows).includes(prototypeArtifacts.github.replace('/tree/', '/blob/') + '/analytic-registry/src/data/release.ts') && !fs.existsSync(path.join(pub, 'source')));
  console.log(`${checks} documentation command checks passed. Fixture: ${fixture}`);
} finally {
  const resolved = fs.realpathSync(fixture);
  const temporaryRoot = fs.realpathSync(os.tmpdir()) + path.sep;
  assert.ok(resolved.startsWith(temporaryRoot) && path.basename(resolved).startsWith('analytic-registry-docs-'));
  fs.rmSync(resolved, { recursive: true });
}
