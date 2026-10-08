import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prototypeRelease, prototypeArtifacts } from '../src/data/release';

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

const pkg = readJson(path.join(app, 'package.json'));
const lock = readJson(path.join(app, 'package-lock.json'));
check(pkg.version === prototypeRelease.version, 'Package version differs from release');
check(lock.version === pkg.version && lock.packages[''].version === pkg.version, 'Lockfile version differs');
check(prototypeRelease.tag === `v${pkg.version}`, 'Tag differs from release');

const release = readJson(path.join(pub, 'release.json'));
check(release.version === pkg.version && release.tag === prototypeRelease.tag, 'Public release metadata differs');
for (const [key, file] of Object.entries(prototypeArtifacts)) {
  if (/^https?:/.test(file)) continue;
  check(fs.existsSync(path.join(pub, file)), `Missing public artifact: ${key}: ${file}`);
}
for (const artifact of Object.values(release.artifacts)) {
  const copied = path.join(pub, artifact.path);
  const source = path.join(pack, artifact.path.replace('resources/platform-data-collection/', ''));
  check(digest(copied) === digest(source), `Artifact differs from source: ${artifact.path}`);
  check(digest(copied) === artifact.sha256, `Release digest differs: ${artifact.path}`);
}
const tables = readJson(path.join(pack, 'v1-extract/workbook-contract.json'));
const layouts = readJson(path.join(pack, 'v1-extract/platform-output-layouts.json'));
check(tables.length === prototypeRelease.importTables, 'Import table count differs');
check(tables.reduce((n, t) => n + t.columns.length, 0) === prototypeRelease.importColumns, 'Import column count differs');
check(layouts.map(l => l.tabName).join(',') === 'Tableau_Output,PowerBI_Output,Alteryx_Output', 'Output tabs differ');
check(layouts.reduce((n, l) => n + l.sections.length, 0) === 28, 'Output section count differs');
for (const layout of layouts) for (const section of layout.sections) {
  const table = tables.find(t => t.sheet === section.sheet);
  if (table) check(JSON.stringify(section.headers) === JSON.stringify(table.columns.map(c => c.name)), `Header mismatch: ${layout.tabName}/${section.sheet}`);
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
      check(fs.existsSync(resolved) && (fs.statSync(resolved).isFile() || fs.existsSync(path.join(resolved, 'index.html'))), `Broken local file link: ${path.relative(pub, file)} -> ${target}`);
      links++;
    }
  }
}
verifyLinks(pub);
const dist = path.join(app, 'dist');
check(fs.existsSync(path.join(dist, 'index.html')), 'Production bundle missing; run npm run build first');
for (const artifact of Object.values(release.artifacts)) {
  check(digest(path.join(dist, artifact.path)) === artifact.sha256, `Built artifact digest differs: ${artifact.path}`);
}
check(digest(path.join(dist, 'release.json')) === digest(path.join(pub, 'release.json')), 'Built release metadata is stale');
console.log(`Release integrity: ${checks} checks passed, including ${links} local documentation links.`);
