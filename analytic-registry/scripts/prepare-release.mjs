import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prototypeRelease,prototypeArtifacts} from '../src/data/release.ts';

const app=path.resolve(import.meta.dirname,'..');
const docs=path.join(app,'docs'),pub=path.join(app,'public');
const pack=path.resolve(app,'../platform-data-collection');
const resources=path.join(pub,'resources/platform-data-collection');
const workbook=path.join(pack,'v1.1-extract/analytic-registry-v1.1-extract.xlsx');
if(!fs.existsSync(workbook))throw new Error('V1.1 workbook is missing. Keep platform-data-collection beside the application folder.');
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
 const resolved=path.resolve(path.dirname(source),clean);
 if(inside(path.join(app,'src'),resolved)||inside(path.join(app,'scripts'),resolved))return 'https://github.com/dlpate2525/analytic-registry/blob/main/analytic-registry/'+relative(app,resolved)+suffix;
 const target=mapped(resolved);
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
  if(item.name.startsWith('.')||['node_modules','__pycache__'].includes(item.name))continue;
  const from=path.join(source,item.name),to=path.join(dest,item.name);
  if(item.isDirectory())copyTree(from,to);else if(item.isFile())copyFile(from,to);
 }
}
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Analytic Registry V1.1</title><style>
body{font:16px/1.65 'Segoe UI',Arial,sans-serif;color:#292432;background:#fff;margin:0}main{max-width:1080px;margin:auto;padding:48px 24px}h1{font-size:36px;line-height:1.2}h2{font-size:22px}small{color:#625b6c}section{border:1px solid #e8e2ef;border-radius:10px;padding:24px;margin:24px 0}a{color:#65419c}p{max-width:900px}.actions{display:flex;gap:12px;flex-wrap:wrap}.actions a{border:1px solid #ddd3e9;padding:10px 16px;border-radius:7px;text-decoration:none}.actions .primary{background:#65419c;color:white}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.grid section{margin:0}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:12px;border-bottom:1px solid #e8e2ef;vertical-align:top}footer{margin-top:30px;color:#625b6c}@media(max-width:700px){.grid{grid-template-columns:1fr}}
</style></head><body><main><small>${prototypeRelease.version} · ${prototypeRelease.displayDate}</small><h1>Analytic Registry V1.1</h1><p>A smaller data foundation, explicit source mappings, and a clear separation between platform observations and business decisions.</p>
<div class="actions"><a class="primary" href="../../platform-data-collection/v1.1-extract/analytic-registry-v1.1-extract.xlsx" download>Excel template</a><a href="../../platform-data-collection/analytic-registry-platform-data-pack.zip" download>Queries and collection pack</a><a href="v1.1-prototype-baseline.md">V1.1 baseline</a></div>
<section><h2>Start with the delivery contract</h2><p>Nine data tables contain 60 columns. Run context and coverage add 12 columns across two small tables. The dictionary gives each field a source, value, and NULL rule for Power BI, Tableau, and Alteryx.</p><table><tr><th>Source</th><th>Query route</th><th>Boundary</th></tr><tr><td>Tableau</td><td>PostgreSQL repository</td><td>Validate the installed schema.</td></tr><tr><td>Alteryx</td><td>SQL Server copies of Gallery and Service, through explicit mapping views</td><td>Actual export shapes remain unverified.</td></tr><tr><td>Power BI / Fabric</td><td>Fabric SQL over landed inventory; DAX model discovery; optional existing JSON-export transform</td><td>Inventory-only coverage is Partial. Upstream acquisition and source mapping stay with the platform team.</td></tr></table><p><a href="../../platform-data-collection/v1.1-extract/README.md">Delivery handoff</a> · <a href="../../platform-data-collection/v1.1-extract/column-dictionary.csv">Column dictionary</a> · <a href="../../platform-data-collection/v1.1-extract/monthly-reconciliation.md">Monthly reconciliation</a></p></section>
<div class="grid"><section><h2>Model and identity</h2><p>One Person, many source accounts. Twelve proposed foundation entities support inventory and identity. The complete workflow model remains separate.</p><p><a href="v1.1-model-simplification.md">Model simplification and Kimball references</a></p></section><section><h2>Product and workflow review</h2><p>Challenge ownership, evidence, approval, and operational handoffs before adding more controls.</p><p><a href="v1.1-product-operating-review.md">Principal engineer and product review</a></p></section><section><h2>Requirements and decisions</h2><p><a href="business-product.md">Product definition</a> · <a href="requirements.md">Requirements</a> · <a href="decision-register.md">Decisions</a></p></section><section><h2>Validation</h2><p><a href="v1.1-verification.md">V1.1 verification</a> · <a href="github-review-and-repair-plan.md">Historical repair backlog</a></p><p>No live platform extraction, SQL deployment, or Power Apps import is claimed.</p></section></div>
<section><h2>Historical V1</h2><p><a href="v1-prototype-baseline.md">Frozen V1 baseline</a> · <a href="data-model.html">Historical 53-table design</a>. V1 files stay available for migration and comparison; use V1.1 headers for new deliveries.</p></section>
<footer>React prototype with local mock data. Source queries and database design require environment validation. The offline Canvas app remains unfinished.</footer></main></body></html>`;
fs.writeFileSync(path.join(docs,'review-pack.html'),html);
copyTree(docs,pub);copyTree(pack,resources);copyFile(path.join(app,'GLOSSARY.md'),path.join(pub,'GLOSSARY.md'));
const files={
 workbook:{path:prototypeArtifacts.workbook,sha256:hash(workbook)},
 collectionPack:{path:prototypeArtifacts.collectionPack,sha256:hash(path.join(pack,'analytic-registry-platform-data-pack.zip'))},
};
const release={...prototypeRelease,status:'V1.1 prototype; source validation pending',mockSnapshotDate:'2026-10-06',standardTemplateVersion:'2026.1',artifacts:files,github:prototypeArtifacts.github};
fs.writeFileSync(path.join(pub,'release.json'),JSON.stringify(release,null,2)+'\n');
console.log(`Prepared ${prototypeRelease.version}: current documentation, workbook, and collection resources.`);
