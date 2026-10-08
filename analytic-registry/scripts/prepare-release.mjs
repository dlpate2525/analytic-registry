import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prototypeRelease,prototypeArtifacts} from '../src/data/release.ts';

const app=path.resolve(import.meta.dirname,'..');
const docs=path.join(app,'docs'),pub=path.join(app,'public');
const pack=path.resolve(app,'../platform-data-collection');
const resources=path.join(pub,'resources/platform-data-collection');
const workbook=path.join(pack,'v1-extract/analytic-registry-v1-extract.xlsx');
if(!fs.existsSync(workbook))throw new Error('V1 workbook is missing. Keep platform-data-collection beside the application folder.');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const relative=(base,file)=>path.relative(base,file).replaceAll('\\','/');
const inside=(folder,file)=>file===folder||file.startsWith(folder+path.sep);
function mapped(file){
 if(inside(docs,file))return path.join(pub,path.relative(docs,file));
 if(inside(pack,file))return path.join(resources,path.relative(pack,file));
 if(file===path.join(app,'GLOSSARY.md'))return path.join(pub,'GLOSSARY.md');
 return null;
}
function localLink(link,source,dest){
 if(/^(?:[a-z]+:|#|\/)/i.test(link))return link;
 const [clean,suffix='']=link.split(/(?=[?#])/s,2);
 const target=mapped(path.resolve(path.dirname(source),clean));
 return target?relative(path.dirname(dest),target)+suffix:link;
}
function copyFile(source,dest){
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 if(/\.(?:md|html)$/.test(source)){
  let content=fs.readFileSync(source,'utf8');
  content=content.replace(/\]\(([^)]+)\)/g,(_,url)=>']('+localLink(url,source,dest)+')');
  content=content.replace(/\b(href|src)="([^"]+)"/g,(_,attr,url)=>`${attr}="${localLink(url,source,dest)}"`);
  fs.writeFileSync(dest,content.replaceAll('\r\n','\n'));
 }else fs.copyFileSync(source,dest);
}
function copyTree(source,dest){
 for(const item of fs.readdirSync(source,{withFileTypes:true})){
  if(item.name.startsWith('.')||item.name==='node_modules')continue;
  const from=path.join(source,item.name),to=path.join(dest,item.name);
  if(item.isDirectory())copyTree(from,to);else if(item.isFile())copyFile(from,to);
 }
}
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Analytic Registry V1 prototype documentation</title><style>
body{font:16px/1.65 'Segoe UI',sans-serif;color:#264334;background:#f3f6f4;margin:0}main{max-width:1100px;margin:auto;padding:40px 24px}h1{font-size:34px;line-height:1.2}h2{font-size:21px}small{color:#526c5c}section{background:white;border:1px solid #cfddd3;border-radius:8px;padding:24px;margin:22px 0}a{color:#206847}img{width:100%;height:auto}.actions{display:flex;gap:12px;flex-wrap:wrap}.actions a{border:1px solid #c2d4c9;padding:10px 16px;border-radius:5px;text-decoration:none}.actions .primary{background:#174a41;color:white}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.grid section{margin:0}li{margin:7px 0}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:10px;text-align:left;border-bottom:1px solid #e2e9e5}footer{margin-top:28px;color:#526c5c}@media(max-width:700px){.grid{grid-template-columns:1fr}h1{font-size:28px}table{font-size:12px}}
</style></head><body><main><small>${prototypeRelease.version} · BASELINE ${prototypeRelease.displayDate}</small><h1>Analytic Registry V1 prototype</h1><p>The versioned baseline includes the React prototype, product requirements, model diagrams, Excel extract formats, and platform collection guidance. The app uses mock data. SQL loading and identity reconciliation remain a manual process.</p>
<div class="actions"><a class="primary" href="../../platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx" download>Download Excel workbook</a><a href="../../platform-data-collection/analytic-registry-platform-data-pack.zip" download>Download collection pack</a><a href="v1-prototype-baseline.md">V1 baseline</a><a href="${prototypeArtifacts.github}">Pinned GitHub version</a></div>
<section><h2>Start with the Excel delivery</h2><p>15 sheets contain three guides, nine import tables, and Tableau_Output, PowerBI_Output, and Alteryx_Output. Each platform tab shows exact headers and labels implemented, planned, supplemental, or uncollected output.</p><ol><li>Collect metadata using the platform instructions and agreed scope.</li><li>Populate the workbook's named import tables.</li><li>Load and validate SQL Server staging manually.</li><li>Match email and send unresolved records to Platform Manager.</li></ol><p><a href="../../platform-data-collection/v1-extract/README.md">Collection handoff</a> · <a href="../../platform-data-collection/v1-extract/column-dictionary.csv">117 import columns</a></p><table><thead><tr><th>Platform</th><th>Collection path</th><th>Identity guidance</th></tr></thead><tbody><tr><td>Tableau 2026.2</td><td>PostgreSQL inventory and scoped user joins</td><td><a href="../../platform-data-collection/v1-extract/tableau-identity-extract.md">Tableau handoff</a></td></tr><tr><td>Power BI / Fabric</td><td>Inventory adapter plus identity pseudocode</td><td><a href="../../platform-data-collection/v1-extract/powerbi-identity-extract.md">Power BI handoff</a></td></tr><tr><td>Alteryx 2025.2</td><td>Read-only MongoDB backend queries</td><td><a href="../../platform-data-collection/v1-extract/alteryx-backend-extract.md">Alteryx handoff</a></td></tr></tbody></table><p>Keep native IDs separate from registry IDs. Match platform email to directory mail within the configured tenant. A missing match does not establish account inactivity. Alteryx current workflow ownership remains unresolved when backend evidence cannot verify it.</p></section>
<section><h2>Workspace, asset, connection, and data source</h2><img src="workspace-asset-connection.svg" alt="Workspace accountability and observed membership link assets to dependencies, connections, and data sources"><p>The workbook's nine staging tables define delivery formats. The 53-table application model describes a future Power Apps database. These have separate purposes.</p></section>
<div class="grid"><section><h2>Business and decisions</h2><p>Accountability, workflow steps, confirmed choices, and future operating proposals.</p><p><a href="business-product.md">Business and product</a> · <a href="decision-register.md">Decision register</a> · <a href="../GLOSSARY.md">Glossary</a></p></section><section><h2>Requirements and model</h2><p>Functional and nonfunctional requirements, relationships, column types, and purposes.</p><p><a href="requirements.md">Requirements</a> · <a href="data-model.html">Searchable model</a> · <a href="data-model.md">Model narrative</a> · <a href="column-dictionary.csv">602 model columns</a></p></section><section><h2>Verification and limitations</h2><p>The baseline preserves known gaps. Prototype acceptance does not certify production readiness.</p><p><a href="verification.md">Verification record</a> · <a href="audit-report.md">Earlier audit</a> · <a href="github-review-and-repair-plan.md">Repair backlog</a></p></section><section><h2>Identity and V1 scope</h2><p>Email matching, separate directory status, Platform Manager routing, and manual SQL staging.</p><p><a href="identity-resolution-design.md">Identity design</a> · <a href="v1-prototype-baseline.md">Versioned scope and deferred work</a></p></section></div>
<footer>${prototypeRelease.label} · ${prototypeRelease.version} · Mock snapshot: 6 October 2026. No live platform or directory collection was performed for this baseline.</footer></main></body></html>`;
fs.writeFileSync(path.join(docs,'review-pack.html'),html);
copyTree(docs,pub);copyTree(pack,resources);copyFile(path.join(app,'GLOSSARY.md'),path.join(pub,'GLOSSARY.md'));
const files={
 workbook:{path:prototypeArtifacts.workbook,sha256:hash(workbook)},
 collectionPack:{path:prototypeArtifacts.collectionPack,sha256:hash(path.join(pack,'analytic-registry-platform-data-pack.zip'))},
};
const release={...prototypeRelease,status:'Prototype baseline',mockSnapshotDate:'2026-10-06',standardTemplateVersion:'2026.1',artifacts:files,github:prototypeArtifacts.github};
fs.writeFileSync(path.join(pub,'release.json'),JSON.stringify(release,null,2)+'\n');
console.log(`Prepared ${prototypeRelease.version}: current documentation, workbook, and collection resources.`);
