import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'contract.json'), 'utf8'));
const sql = fs.readFileSync(path.join(root, 'queries/tableau-postgresql-selects.sql'), 'utf8');
const markers = [...sql.matchAll(/^-- RESULT: (\w+)\r?\n/gm)];
const blocks = new Map(markers.map((match, index) => [
  match[1], sql.slice(match.index + match[0].length, markers[index + 1]?.index ?? sql.length),
]));
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };

for (const table of contract.tables) {
  check(blocks.has(table.sheet), `Missing result ${table.sheet}`);
  const projected = [...blocks.get(table.sheet).matchAll(/\bAS\s+"([A-Za-z_]+)"/g)]
    .map(match => match[1]).slice(0, table.columns.length);
  assert.deepEqual(projected, table.columns.map(column => column.name), `${table.sheet} output headers`);
  checks++;
}
check(blocks.size === 15, 'Eleven inputs plus four supplemental diagnostics');
const commands = sql.replace(/^\s*--.*$/gm, '');
check(!/^\s*\\/m.test(commands), 'No psql meta commands');
check(!/:'[a-z_]+'/.test(commands), 'No psql substitutions');
check(!/^\s*(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COPY)\b/im.test(commands), 'No source writes or DDL');
check(/BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/.test(sql), 'One read-only snapshot');
check((commands.match(/\bCOMMIT;/g) ?? []).length === 1, 'One commit');
check((commands.match(/SET LOCAL ar11\./g) ?? []).length === 10, 'Ten transaction-local inputs');
check(sql.includes("position('REPLACE_' in value) > 0"), 'Unedited inputs fail');
check(sql.includes('IF site_count <> 1 THEN'), 'Missing or duplicate site fails');
check(sql.includes('IF NOT isfinite(observed) THEN'), 'Finite observation time required');
check(sql.includes("'(Z|[+-][0-9]{2}:[0-9]{2})$'"), 'Explicit timestamp offset required');
check(blocks.get('Platform_Users').includes('u.luid::text AS "NativePrincipalID"'), 'Retain platform user LUID');
check(blocks.get('Platform_Users').includes("'TableauUserLUID'"), 'Retain LUID namespace');
check(blocks.get('Object_Users').includes("'TableauRepositoryUserID'"), 'Retain raw repository namespace');
check(blocks.get('Object_Users').includes('LEFT JOIN public.users'), 'Unresolved owner evidence survives');
check(blocks.get('Assets').includes('x.parent_workbook_id IS NULL'), 'Exclude embedded sources from published inventory');
check(blocks.get('Workspace_Assets').includes('public.projects_contents'), 'Use documented membership relationship');
check(blocks.get('Connections').includes("'Partial'::text AS \"EvidenceStatusCode\""), 'Do not claim full credential evidence');
for (const empty of ['Asset_Dependencies', 'Directory_Users']) {
  check(/WHERE false/i.test(blocks.get(empty)), `${empty} has headers and zero rows`);
  check(blocks.get('Coverage').includes(`'${empty}'::text, 'NotCollected'::text, NULL::bigint`), `${empty} has honest coverage`);
}
check(!/'Complete'/.test(blocks.get('Coverage')), 'No automatic completeness assertion');
check(blocks.get('Tableau_Membership_Exceptions').includes('NOT EXISTS'), 'Assets without membership remain diagnostic');
check(blocks.get('Tableau_Identity_Exceptions').includes('HAVING native_id IS NULL OR count(*) <> 1'), 'Missing and repeated source IDs remain diagnostic');
console.log(`Tableau ordinary-SQL contract: ${checks} static checks passed. No live PostgreSQL execution was performed.`);
