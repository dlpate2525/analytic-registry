import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prototypeArtifacts, prototypeRelease, releaseArtifactKeys } from '../src/data/release.ts';
import { documentationCopies, documentationGroups, workflowGuides } from '../src/data/documentation.ts';

const app = path.resolve(import.meta.dirname, '..');
const pub = path.join(app, 'public');
const pack = path.resolve(app, '../platform-data-collection');
const checkOnly = process.argv.includes('--check');
const projected = new Map();
const inside = (parent, file) => file === parent || file.startsWith(parent + path.sep);
const relative = (folder, file) => path.relative(folder, file).replaceAll('\\', '/');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function publicPath(source) {
  if (inside(pub, source)) return source;
  if (inside(path.join(app, 'docs'), source)) return path.join(pub, relative(path.join(app, 'docs'), source));
  if (inside(pack, source)) return path.join(pub, 'resources/platform-data-collection', relative(pack, source));
  if (source === path.join(app, 'GLOSSARY.md')) return path.join(pub, 'GLOSSARY.md');
  if (inside(path.join(app, 'src'), source) || inside(path.join(app, 'scripts'), source)) return path.join(pub, 'source', relative(app, source));
  throw new Error(`Documentation link has no public destination: ${relative(app, source)}`);
}

function rewriteLink(link, source, destination) {
  if (/^(?:[a-z]+:|#|\/)/i.test(link)) return link;
  const [clean, suffix = ''] = link.split(/(?=[?#])/s, 2);
  const target = path.resolve(path.dirname(source), decodeURIComponent(clean));
  if (!fs.existsSync(target)) throw new Error(`Missing source link: ${relative(app, source)} -> ${link}`);
  if (prototypeRelease.tag && (inside(path.join(app, 'src'), target) || inside(path.join(app, 'scripts'), target))) {
    return prototypeArtifacts.github.replace('/tree/', '/blob/') + '/analytic-registry/' + relative(app, target) + suffix;
  }
  return relative(path.dirname(destination), publicPath(target)) + suffix;
}

for (const [sourceName, outputName] of documentationCopies()) {
  const source = path.join(app, sourceName);
  const destination = path.join(pub, outputName);
  let content = fs.readFileSync(source, 'utf8').replaceAll('\r\n', '\n');
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, link) => {
    const local = path.resolve(path.dirname(source), link.split(/[?#]/)[0]);
    if (inside(path.join(app, '.scratch'), local)) return `${label} (local review evidence; not included in this browser copy)`;
    return '[' + label + '](' + rewriteLink(link, source, destination) + ')';
  });
  projected.set(destination, content);
}
projected.set(path.join(pub, 'current-workflows.md'), projected.get(path.join(pub, prototypeArtifacts.workflows)));

const cards = workflowGuides.map(item => `<article><h3><a href="./${escape(item.href)}">${escape(item.title)}</a></h3><p>${escape(item.summary)}</p><p class="detail">${escape(item.detail)}</p></article>`).join('');
const groups = documentationGroups().map(group => `<section><h2>${escape(group.title)}</h2><p>${escape(group.description)}</p><ul class="resources">${group.links.map(link => `<li><a href="${escape(link.href)}">${escape(link.title)}</a><span>${escape(link.detail)}</span></li>`).join('')}</ul></section>`).join('');
const visuals = `<section><details><summary>Understand relationships and the data handoff</summary><figure style="margin:24px 0"><img style="width:100%;height:auto" src="diagrams/v1.2-relationships.svg" alt="Confirmed workspace accountability, asset identity, and observed connections"><figcaption class="detail">An accountable workspace is a business association. Native memberships and connections remain source observations.</figcaption></figure><figure style="margin:24px 0"><img style="width:100%;height:auto" src="diagrams/v1.2-evidence-flow.svg" alt="Intended platform evidence delivery and the unconnected React prototype"><figcaption class="detail">Dashed paths show integration work. The current app demonstrates the process with fictional records.</figcaption></figure></details></section>`;
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Analytic Registry ${prototypeRelease.series} guide</title>
<style>body{margin:0;background:#fff;color:#302b38;font:16px/1.65 system-ui,sans-serif}main{max-width:1080px;margin:auto;padding:36px 28px}a{color:#65419c;text-underline-offset:3px}a:focus-visible{outline:3px solid #b891db;outline-offset:4px}h1{font-size:36px;line-height:1.2;margin:12px 0}h2{font-size:23px;margin-top:0}h3{font-size:18px;margin:0}p{max-width:84ch}.meta,.detail{color:#665e70;font-size:14px}.intro{border-left:4px solid #ce816e;padding-left:18px}.workflows{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:28px 0}article,section{border:1px solid #e7e0ed;border-radius:10px;padding:22px}article p:last-child{margin-bottom:0}section{margin:24px 0}.resources{padding:0;list-style:none}.resources li{display:grid;grid-template-columns:260px 1fr;gap:20px;border-top:1px solid #eee8f2;padding:13px 0}.resources span{font-size:14px}.flow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:#faf8fc;padding:18px;border-radius:8px}.flow strong{padding:8px 14px;border:1px solid #d8cbe7;border-radius:6px}footer{border-top:1px solid #eee8f2;padding:18px 0;font-size:14px;color:#665e70}@media(max-width:700px){.workflows{grid-template-columns:1fr}.resources li{grid-template-columns:1fr;gap:2px}main{padding:24px 18px}}</style></head>
<body><main><a href="./#/">Return to the app</a><p class="meta">${escape(prototypeRelease.version)} · ${escape(prototypeRelease.displayDate)} · ${escape(prototypeRelease.publication)}</p><h1>Analytic Registry ${prototypeRelease.series}</h1><p class="intro">Connect platform evidence with business accountability. Use this guide for the current prototype. The Excel delivery contract remains ${escape(prototypeRelease.collectionContract)}.</p>
<div class="flow" role="img" aria-label="Workspace accountability links to assets. Assets link to observed connections. Server and database details stay on each connection."><strong>Workspace</strong><span aria-hidden="true">→</span><strong>Asset</strong><span aria-hidden="true">→</span><strong>Connection</strong></div><p class="detail">Platform membership is evidence. The accountable workspace is a confirmed business association. Source refreshes do not overwrite approved business metadata.</p>
<div class="workflows">${cards}</div>${visuals}${groups}<footer>This prototype uses fictional records and browser storage. Live ingestion, production authorization, SQL deployment, and Power Apps import remain unverified. Preparing this guide does not establish GitHub publication.</footer></main></body></html>\n`;
projected.set(path.join(pub, prototypeArtifacts.documentation), html);

const artifacts = {};
for (const key of releaseArtifactKeys) {
  const file = path.join(pub, prototypeArtifacts[key]);
  const content = projected.has(file) ? projected.get(file) : fs.readFileSync(file);
  artifacts[key] = { path: prototypeArtifacts[key], sha256: hash(content) };
}
projected.set(path.join(pub, 'release.json'), JSON.stringify({ ...prototypeRelease, status: prototypeRelease.publication + '; installed-platform validation pending', mockSnapshotDate: '2026-10-06', standardTemplateVersion: '2026.1', artifacts, github: prototypeArtifacts.github }, null, 2) + '\n');

let links = 0;
for (const [file, content] of projected) {
  if (!/\.(md|html)$/.test(file)) continue;
  for (const match of content.matchAll(/\]\(([^)]+)\)|\b(?:href|src)="([^"]+)"/g)) {
    const target = match[1] || match[2];
    if (/^(?:[a-z]+:|#|\/)/i.test(target)) continue;
    const clean = decodeURIComponent(target.split(/[?#]/)[0]);
    if (!clean || clean === './') continue;
    const resolved = path.resolve(path.dirname(file), clean);
    if (!inside(pub, resolved)) throw new Error(`Link leaves public files: ${relative(pub, file)} -> ${target}`);
    if (!projected.has(resolved) && !fs.existsSync(resolved)) throw new Error(`Broken public link: ${relative(pub, file)} -> ${target}`);
    links++;
  }
}

for (const [file, content] of projected) {
  if (checkOnly) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) throw new Error(`Stale current documentation: ${relative(pub, file)}. Run npm run docs:local.`);
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}
console.log(`${checkOnly ? 'Verified' : 'Prepared'} ${projected.size} current documentation files; ${links} links resolved; archive hashes match their exact files.`);
