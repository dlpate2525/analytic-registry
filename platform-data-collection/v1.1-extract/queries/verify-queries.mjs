// Local contract checks. No claim of SQL Server, PostgreSQL, or MongoDB execution.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(fs.readFileSync(path.join(here, '..', 'contract.json'), 'utf8'));
const expected = Object.fromEntries(contract.tables.map(t => [t.sheet, t.columns.map(c => c.name)]));
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
const read = name => fs.readFileSync(path.join(here, name), 'utf8');
const mongo = read('alteryx-mongodb.js');
const tableau = read('tableau-postgresql.sql');
const powerbi = read('powerbi-export-sqlserver.sql');
const run = { RunKey:'11111111-1111-4111-8111-111111111111', PlatformCode:'Alteryx',
  PlatformInstanceKey:'test-server', NativeScopeKey:'test-scope', ObservedAt:'2026-10-09T12:00:00Z',
  DirectoryTenantKey:'test-tenant', MappingVersion:'1.1', ScopeDescription:'Synthetic contract check only' };
const ctx = vm.createContext({ registryRun: run, db: {
  getSiblingDB: database => ({ getCollection: collection => ({
    aggregate: (pipeline, options) => ({ database, collection, pipeline, options })
  }) })
} });
check('MongoDB query definitions parse and load without source access', () => vm.runInContext(mongo, ctx));
const queries = vm.runInContext('registryQueries', ctx);
const coverage = JSON.parse(JSON.stringify(vm.runInContext('registryCoverage', ctx)));
const materialize = name => JSON.parse(JSON.stringify(queries[name]()));
for (const name of ['Workspaces','Assets','Workspace_Assets','Platform_Users','Object_Users']) {
  check(`Alteryx ${name} output headers match contract order`, () => {
    const q = materialize(name);
    const output = q.pipeline.at(-1).$project;
    assert.deepEqual(Object.keys(output).filter(k => k !== '_id'), expected[name]);
    assert.equal(q.database, 'AlteryxGallery');
    assert.equal(q.options.collation.locale, 'simple');
  });
}
check('Alteryx Run_Context headers and values are explicit', () => {
  const rows = materialize('Run_Context');
  assert.deepEqual(Object.keys(rows[0]), expected.Run_Context);
  assert.equal(rows[0].RunKey, run.RunKey);
});
check('Alteryx provides all nine dataset coverage entries', () => {
  assert.deepEqual(coverage.map(r => r.DatasetCode).sort(), Object.keys(expected).filter(n => !['Run_Context','Coverage'].includes(n)).sort());
  assert(coverage.every(r => Object.keys(r).join('|') === expected.Coverage.join('|')));
  assert(coverage.every(r => r.CoverageStatus !== 'Complete'));
});
check('Alteryx uncollected datasets have no fabricated source query or row', () => {
  for (const name of ['Connections','Asset_Connections','Asset_Dependencies','Directory_Users']) {
    assert.equal(queries[name], undefined);
    assert.equal(coverage.find(r => r.DatasetCode===name).CoverageStatus, 'NotCollected');
    assert.equal(coverage.find(r => r.DatasetCode===name).RowCount, null);
  }
});
check('Alteryx aggregations contain no database write operators or code execution', () => {
  for (const name of Object.keys(queries).filter(n => n !== 'Run_Context')) {
    const text = JSON.stringify(materialize(name));
    assert(!/"\$(out|merge|function|accumulator|where)"/.test(text));
  }
  assert(!/require\(['"](?:fs|https?|child_process)['"]\)|fetch\(|writeFile|openSync/.test(mongo));
});
check('Alteryx owner and author are separate and ambiguity is retained', () => {
  const q = materialize('Object_Users');
  const owner = q.pipeline.filter(s => s.$unionWith?.coll === 'appInfos');
  assert.equal(owner.length, 2);
  assert.equal(owner[0].$unionWith.pipeline[0].$project.PrincipalRoleCode.$literal, 'CreatedBy');
  assert.equal(owner[1].$unionWith.pipeline[0].$project.PrincipalRoleCode.$literal, 'TechnicalOwner');
  assert.equal(owner[1].$unionWith.pipeline[0].$project.SourcePrincipalReference.$literal, null);
  const statuses = q.pipeline.at(-1).$project.SourceReferenceStatusCode.$switch;
  assert.equal(statuses.branches[0].then, 'UnverifiedMapping');
  assert.equal(statuses.default, 'ReadyForEmailMatch');
});
check('Alteryx selects a single published revision and single primary app', () => {
  const q = materialize('Assets');
  assert.deepEqual(q.pipeline[1].$set.selectedRevision.$cond[0], { $eq:[{ $size:'$published' },1] });
  assert.deepEqual(q.pipeline[3].$set.selectedApp.$cond[0], { $eq:[{ $size:'$primary' },1] });
  assert.equal(q.pipeline[1].$set.selectedRevision.$cond[2], null);
  assert.equal(q.pipeline[3].$set.selectedApp.$cond[2], null);
});
check('Alteryx source Active boolean does not default to false', () => {
  const status = materialize('Platform_Users').pipeline.at(-1).$project.SourceStatus.$switch;
  assert.equal(status.default, null);
  assert.deepEqual(status.branches.map(b => b.then), ['true','false']);
});
check('Service evidence stays outside the workbook schema', () => {
  assert.equal(materialize('Service_Applications').database, 'AlteryxService');
  assert.equal(materialize('Service_Applications').collection, 'AS_Applications');
  assert(!expected.Service_Applications);
  assert(!expected.Gallery_Service_References);
});

const tableauBlocks = [...tableau.matchAll(/\\o (\w+)\.csv\s+COPY \(([\s\S]*?)\) TO STDOUT/g)];
for (const t of contract.tables) {
  check(`Tableau ${t.sheet} output headers match contract order`, () => {
    const block = tableauBlocks.find(b => `${b[1]}.csv` === t.file);
    assert(block, `No COPY block for ${t.file}`);
    const names = [...block[2].matchAll(/\bAS\s+"([A-Z]\w+)"/g)].map(m => m[1]);
    assert.deepEqual(names.slice(0,t.columns.length), expected[t.sheet]);
  });
}
check('Tableau published sources exclude embedded sources', () => {
  const assets = tableauBlocks.find(b => b[1] === 'assets')[2];
  assert.match(assets, /x\.parent_workbook_id IS NULL/);
  assert.match(tableau, /d\.parent_workbook_id IS NULL/);
  assert.match(tableau, /tableau_relationship_exceptions\.csv/);
});
check('Tableau unresolved principal never receives a resolved namespace', () => {
  const users = tableauBlocks.find(b => b[1] === 'object_users')[2];
  assert.match(users, /CASE WHEN u\.luid IS NOT NULL THEN 'TableauUserLUID'::text END AS "IdentifierNamespace"/);
});
check('Tableau read is a single read-only snapshot and has no repository writes', () => {
  assert.match(tableau, /REPEATABLE READ READ ONLY/);
  const sql = tableau.replace(/--[^\n]*/g, '');
  assert(!/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\s+/i.test(sql));
});

// Read the first SELECT list in a named SQL result block. Respect nested SELECTs,
// quoted strings and commas in functions. This checks headers, not SQL semantics.
function selectHeaders(block) {
  const start = block.search(/\bSELECT\b/i);
  assert(start >= 0);
  let text = block.slice(start + 6).replace(/^\s*DISTINCT\b/i, '');
  let depth=0, quoted=false, current='', expressions=[];
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (c==="'") { current+=c; if (quoted && text[i+1]==="'") { current+=text[++i]; continue; } quoted=!quoted; continue; }
    if (!quoted) {
      if (c==='(') depth++;
      if (c===')') depth--;
      if (depth===0 && (c===';' || /^(?:FROM|WHERE)\b/i.test(text.slice(i)))) { expressions.push(current); break; }
      if (depth===0 && c===',') { expressions.push(current); current=''; continue; }
    }
    current+=c;
  }
  return expressions.map(expr => {
    const aliased=expr.match(/\bAS\s+([A-Za-z_]\w*)\s*$/i);
    if (aliased) return aliased[1];
    const bare=expr.trim().match(/^(?:\w+\.)?([A-Za-z_]\w*)$/);
    assert(bare, `Expected explicit output alias: ${expr}`);
    return bare[1];
  });
}
for (const t of contract.tables) {
  check(`Power BI ${t.sheet} output headers match contract order`, () => {
    const marker = new RegExp(`^-- ${t.sheet}(?=[:.\\s])`, 'm');
    const index = powerbi.search(marker);
    assert(index>=0, `No result marker for ${t.sheet}`);
    const block = powerbi.slice(index).replace(/^--[^\n]*\n/gm, '');
    assert.deepEqual(selectHeaders(block), expected[t.sheet]);
  });
}
check('Power BI preserves missing endpoints as Unresolved', () => {
  assert.match(powerbi, /THEN 'Observed' ELSE 'Unresolved' END AS EvidenceStatusCode/);
  assert.match(powerbi, /m\.WorkspaceID=COALESCE/);
  assert.match(powerbi, /misconfiguredDatasourceUsages/);
});
check('Power BI rejects malformed nested inputs before output', () => {
  assert.match(powerbi, /THROW 51011/); assert.match(powerbi, /THROW 51012/); assert.match(powerbi, /THROW 51013/);
});
check('Power BI returns all nine conservative coverage records', () => {
  const section=powerbi.slice(powerbi.indexOf('-- Coverage:'), powerbi.indexOf('-- SUPPLEMENTAL:'));
  for (const name of Object.keys(expected).filter(n=>!['Run_Context','Coverage'].includes(n))) assert(section.includes(`'${name}'`));
  assert(!section.includes("'Complete'"));
});
check('Connection observations do not claim verified credential evidence', () => {
  assert.match(tableau, /'Partial'::text AS "EvidenceStatusCode"/);
  assert.match(powerbi, /'Partial' AS EvidenceStatusCode FROM @C/);
});
check('Source-query handoff links resolve to existing local artifacts', () => {
  const doc=fs.readFileSync(path.join(here, '..', 'source-query-design.md'), 'utf8');
  for (const match of doc.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(match[1])) continue;
    assert(fs.existsSync(path.resolve(here, '..', match[1])), `Missing handoff target: ${match[1]}`);
  }
});
console.log(`${checks} local query checks passed. Database execution remains unverified.`);
