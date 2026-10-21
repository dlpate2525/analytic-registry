import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { prototypeRelease, prototypeArtifacts, releaseArtifactKeys } from '../src/data/release';

const app = path.resolve(import.meta.dirname, '..');
const pub = path.join(app, 'public');
const pack = path.resolve(app, '../platform-data-collection');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const digest = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}
function within(root, name) {
  const file = path.resolve(root, name);
  check(file === root || file.startsWith(root + path.sep), `Artifact leaves its root: ${name}`);
  return file;
}

const pkg = readJson(path.join(app, 'package.json'));
const lock = readJson(path.join(app, 'package-lock.json'));
check(pkg.version === prototypeRelease.version, 'Package version differs from release');
check(lock.version === pkg.version && lock.packages[''].version === pkg.version, 'Lockfile version differs');
check(prototypeRelease.publication === 'Local working draft' ? prototypeRelease.tag === null : prototypeRelease.tag === `v${pkg.version}`, 'Local drafts must not claim a published tag');
if (!process.argv.includes('--local')) check(prototypeRelease.publication === 'Prototype release' && !pkg.version.endsWith('-local'), 'Release verification requires a prototype release identity');
if (prototypeRelease.tag) {
  const preparation = spawnSync(process.execPath, ['--import', 'tsx', path.join(app, 'scripts/prepare-release.mjs'), '--check'], { cwd: app, encoding: 'utf8', windowsHide: true });
  check(preparation.status === 0, 'Read-only preparation verification failed: ' + (preparation.error?.message || preparation.stderr));
}

const release = readJson(path.join(pub, 'release.json'));
check(release.version === pkg.version && release.tag === prototypeRelease.tag, 'Public release metadata differs');
for (const [key, value] of Object.entries(prototypeRelease)) check(release[key] === value, `Public release field differs: ${key}`);
check(release.status === prototypeRelease.publication + '; installed-platform validation pending', 'Public release status differs');
check(release.github === prototypeArtifacts.github, 'Release repository target differs');
check(JSON.stringify(Object.keys(release.artifacts).sort()) === JSON.stringify([...releaseArtifactKeys].sort()), 'Release artifact inventory is incomplete or unexpected');
for (const [key, file] of Object.entries(prototypeArtifacts)) {
  if (/^https?:/.test(file)) continue;
  check(fs.existsSync(within(pub, file)), `Missing public artifact: ${key}: ${file}`);
}
for (const [key, artifact] of Object.entries(release.artifacts)) {
  check(artifact.path === prototypeArtifacts[key], `Configured artifact path differs: ${key}`);
  const copied = within(pub, artifact.path);
  if (['workbook', 'collectionPack'].includes(key)) {
    const source = within(pack, artifact.path.replace('resources/platform-data-collection/', ''));
    check(digest(copied) === digest(source), `Artifact differs from source: ${artifact.path}`);
  }
  check(digest(copied) === artifact.sha256, `Release digest differs: ${artifact.path}`);
}
const contract=readJson(path.join(pub,prototypeArtifacts.contract));
check(JSON.stringify(contract)===JSON.stringify(readJson(path.join(pack,prototypeArtifacts.contract.replace('resources/platform-data-collection/','')))),'Served contract differs from current source');
const tables=contract.tables;
check(JSON.stringify(contract)===JSON.stringify(readJson(path.join(app,'src/data/foundationContract.json'))),'App and extract mappings differ');
for(const profile of Object.values(contract.queryProfiles))for(const [kind,file] of Object.entries(profile)){
 if(kind==='label')continue;
 const original=path.resolve(pack,'v1.1-extract',file);
 const published=path.resolve(pub,'resources/platform-data-collection/v1.1-extract',file);
 within(pack,path.relative(pack,original));within(pub,path.relative(pub,published));
 check(fs.existsSync(original)&&fs.existsSync(published),`Missing query profile file: ${file}`);
 check(digest(original)===digest(published),`Query profile copy differs: ${file}`);
}
check(tables.length===prototypeRelease.importTables,'V1.1 input table count differs');
check(tables.reduce((n,t)=>n+t.columns.length,0)===prototypeRelease.importColumns,'V1.1 column count differs');
for(const table of tables)for(const column of table.columns){
 check(column.purpose.split(/\s+/).length<200,`Purpose too long: ${table.sheet}.${column.name}`);
 for(const platform of contract.platforms){const rule=column.platforms[platform];check(!!rule?.source&&!!rule?.valueRule&&!!rule?.nullRule,`Missing platform rule: ${table.sheet}.${column.name}/${platform}`);}
}
let links = 0;
function verifyLinks(folder) {
  for (const item of fs.readdirSync(folder, {withFileTypes: true})) {
    const file = path.join(folder, item.name);
    if (item.isDirectory()) { verifyLinks(file); continue; }
    if (!/\.(md|html)$/.test(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const targets = [...content.matchAll(/\]\(([^)]+)\)|\b(?:href|src)="([^"]+)"/g)];
    for (const match of targets) {
      const target = match[1] || match[2];
      if (/^(?:[a-z]+:|#|\/)/i.test(target)) continue;
      const clean = decodeURIComponent(target.split(/[?#]/)[0]);
      const resolved = path.resolve(path.dirname(file), clean);
      within(pub,path.relative(pub,resolved));
      if (resolved === pub && target.includes('#/')) {
        check(fs.existsSync(path.join(app, 'index.html')), 'Application route has no entry document');
        links++;
        continue;
      }
      check(fs.existsSync(resolved) && (fs.statSync(resolved).isFile() || fs.existsSync(path.join(resolved, 'index.html'))), `Broken local file link: ${path.relative(pub, file)} -> ${target}`);
      links++;
    }
  }
}
verifyLinks(pub);
const dist = path.join(app, process.argv.includes('--local') ? '.scratch/local-preview' : 'dist');
check(fs.existsSync(path.join(dist, 'index.html')), 'Production bundle missing; run npm run build first');
for (const artifact of Object.values(release.artifacts)) {
  check(digest(path.join(dist, artifact.path)) === artifact.sha256, `Built artifact digest differs: ${artifact.path}`);
}
check(digest(path.join(dist, 'release.json')) === digest(path.join(pub, 'release.json')), 'Built release metadata is stale');
const manifestName = 'v1.2-collection-manifest.json';
const manifest = readJson(path.join(pack, manifestName));
check(manifest.applicationVersion === prototypeRelease.version && manifest.workbookRevision === prototypeRelease.workbookRevision && manifest.inputSchemaVersion === prototypeRelease.collectionContract, 'Collection manifest identity differs');
check(Array.isArray(manifest.publicFiles) && manifest.publicFiles.length > 0 && new Set(manifest.publicFiles).size === manifest.publicFiles.length, 'Current public collection inventory is missing or duplicated');
for (const entry of manifest.files) {
  const original = within(pack, entry.path);
  check(fs.statSync(original).size === entry.bytes && digest(original) === entry.sha256, `Collection source digest differs: ${entry.path}`);
}
for (const name of [...manifest.publicFiles, manifestName]) {
  const original = within(pack, name);
  const served = within(pub, 'resources/platform-data-collection/' + name);
  const built = within(dist, 'resources/platform-data-collection/' + name);
  check(digest(served) === digest(original), `Current collection public copy differs: ${name}`);
  check(digest(built) === digest(original), `Current collection build copy differs: ${name}`);
}
console.log(`Release integrity: ${checks} checks passed, including ${links} local documentation links.`);
