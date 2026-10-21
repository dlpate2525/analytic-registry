import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {compareDelivery,nativeKey,relationshipKey,resolveEmail,type Delivery,type Observation,type NativeIdentity,type DirectoryEvidence} from '../src/domain/foundation';

// Exercise the real reference functions with the platform-shaped fixtures.
// This is not a database importer, SQL execution, or a persisted replay ledger.
const root=fileURLToPath(new URL('../../platform-data-collection/v1.1-extract/samples/',import.meta.url));
const contract=JSON.parse(readFileSync(resolve(root,'../contract.json'),'utf8')) as {tables:{sheet:string,file:string,columns:{name:string,type:string,required:string}[],rowKey:string[]}[]};
type Cell=string|number|boolean|null;
type Row=Record<string,Cell>;
type Fixture=Record<string,Row[]>;
const load=(path:string):Fixture=>JSON.parse(readFileSync(path,'utf8'));
let checks=0;
const check=(label:string,fn:()=>void)=>{try{fn();checks++;}catch(error){throw new Error(label,{cause:error});}};
const string=(row:Row,key:string)=>{assert.equal(typeof row[key],'string',key);return row[key] as string;};
const csvCell=(cell:Cell)=>{const text=cell===null?'':String(cell);return /[",\n\r]/.test(text)?'"'+text.replaceAll('"','""')+'"':text;};

function rows(f:Fixture,kind:NativeIdentity['kind']):Observation[]{
  const context=f.Run_Context[0];
  const sheet={Workspace:'Workspaces',Asset:'Assets',Connection:'Connections'}[kind];
  return f[sheet].map(row=>({platform:string(context,'PlatformCode'),instance:string(context,'PlatformInstanceKey'),
    scope:string(context,'NativeScopeKey'),kind,nativeId:string(row,'Native'+kind+'ID'),
    nativeType:kind==='Connection'?'Connection':string(row,'Native'+kind+'Type'),name:string(row,'DisplayName'),
    attributes:Object.fromEntries(Object.entries(row).filter(([key])=>!['RunKey','Native'+kind+'ID','Native'+kind+'Type','DisplayName'].includes(key)))}));
}
function manifest(f:Fixture,kind:NativeIdentity['kind']):Delivery{
  const context=f.Run_Context[0];const dataset={Workspace:'Workspaces',Asset:'Assets',Connection:'Connections'}[kind];
  const coverage=f.Coverage.find(row=>row.DatasetCode===dataset)!;
  return {runKey:string(context,'RunKey'),observedAt:string(context,'ObservedAt'),platform:string(context,'PlatformCode'),
    instance:string(context,'PlatformInstanceKey'),scope:string(context,'NativeScopeKey'),kind,
    coverage:string(coverage,'CoverageStatus') as Delivery['coverage'],expectedRows:coverage.RowCount as number|null,scopeVerified:false};
}
for(const platform of ['alteryx','tableau','fabric']){
  const initial=load(resolve(root,platform,'initial/delivery.json'));
  const replay=load(resolve(root,platform,'identical-replay/delivery.json'));
  const refresh=load(resolve(root,platform,'changed-refresh/delivery.json'));
  for(const scenario of ['initial','identical-replay','changed-refresh']){
    const dir=resolve(root,platform,scenario),fixture=load(resolve(dir,'delivery.json'));
    check(`${platform}/${scenario}: all 11 tables`,()=>assert.deepEqual(Object.keys(fixture),contract.tables.map(t=>t.sheet)));
    check(`${platform}/${scenario}: single run`,()=>assert.equal(fixture.Run_Context.length,1));
    const run=fixture.Run_Context[0].RunKey;
    for(const table of contract.tables){
      const columns=table.columns.map(c=>c.name);
      check(`${platform}/${scenario}/${table.sheet}: exact schema, keys and counts`,()=>{
        for(const row of fixture[table.sheet]){
          assert.deepEqual(Object.keys(row),columns);
          assert.equal(row.RunKey,run);
          for(const column of table.columns){
            const value=row[column.name];
            if(column.required==='Yes')assert.ok(value!==null&&value!=='',column.name);
            if(value===null)continue;
            if(column.type.startsWith('nvarchar'))assert.equal(typeof value,'string',column.name);
            if(column.type==='bit')assert.equal(typeof value,'boolean',column.name);
            const limit=/nvarchar\((\d+)\)/.exec(column.type)?.[1];
            if(limit)assert.ok(String(value).length<=Number(limit),column.name);
          }
        }
        const keys=fixture[table.sheet].map(row=>JSON.stringify(table.rowKey.map(key=>row[key])));
        assert.equal(new Set(keys).size,keys.length);
        if(!['Run_Context','Coverage'].includes(table.sheet)){
          const coverage=fixture.Coverage.filter(row=>row.DatasetCode===table.sheet);
          assert.equal(coverage.length,1);
          if(coverage[0].CoverageStatus==='NotCollected'){
            assert.equal(coverage[0].RowCount,null);assert.equal(fixture[table.sheet].length,0);
          }else assert.equal(coverage[0].RowCount,fixture[table.sheet].length);
        }
      });
      check(`${platform}/${scenario}/${table.sheet}: CSV equals typed JSON`,()=>{
        const expected=[columns.join(','),...fixture[table.sheet].map(row=>columns.map(c=>csvCell(row[c])).join(','))].join('\n')+'\n';
        assert.equal(readFileSync(resolve(dir,table.file),'utf8'),expected);
      });
    }
  }
  check(`${platform}: replay is identical for every fixture file`,()=>{
    for(const file of readdirSync(resolve(root,platform,'initial'))){
      assert.equal(readFileSync(resolve(root,platform,'initial',file),'utf8'),readFileSync(resolve(root,platform,'identical-replay',file),'utf8'));
    }
  });
  check(`${platform}: refresh uses later observation and new delivery identity`,()=>{
    assert.notEqual(initial.Run_Context[0].RunKey,refresh.Run_Context[0].RunKey);
    assert.ok(Date.parse(string(refresh.Run_Context[0],'ObservedAt'))>Date.parse(string(initial.Run_Context[0],'ObservedAt')));
  });
  for(const kind of ['Workspace','Asset','Connection'] as const){
    const incoming=rows(initial,kind);
    const previous=incoming.map((row,index)=>({...row,registryId:`registry-${platform}-${kind}-${index+1}`,
      lastSeenAt:string(initial.Run_Context[0],'ObservedAt'),businessMetadata:{owner:'approved-owner',dmp:'Tier 1',purpose:'Approved business purpose'}}));
    const before=structuredClone(previous);
    check(`${platform}/${kind}: initial observations are New`,()=>assert.ok(compareDelivery([],incoming,manifest(initial,kind)).every(row=>row.state==='New')));
    check(`${platform}/${kind}: identical observations are Unchanged with existing registry IDs`,()=>{
      const result=compareDelivery(previous,rows(replay,kind),manifest(replay,kind));
      assert.equal(result.length,previous.length);
      result.forEach((row,index)=>{assert.equal(row.state,'Unchanged');assert.equal(row.registryId,previous[index].registryId);});
    });
    const changed=compareDelivery(previous,rows(refresh,kind),manifest(refresh,kind));
    if(kind==='Asset'){
      check(`${platform}: rename retains native and registry identity`,()=>{
        assert.equal(nativeKey(incoming[0]),nativeKey(rows(refresh,kind)[0]));
        assert.equal(changed[0].registryId,previous[0].registryId);
        assert.equal(changed[0].state,'Changed');assert.ok(changed[0].changedFields.includes('name'));
      });
      check(`${platform}: new asset is New, omitted partial asset is Not verified`,()=>{
        assert.equal(changed.filter(row=>row.state==='New').length,1);
        assert.equal(changed.filter(row=>row.state==='Not verified').length,1);
        assert.equal(changed.find(row=>row.state==='Not verified')?.registryId,previous[1].registryId);
      });
      check(`${platform}: duplicates and count mismatch reject reference comparison`,()=>{
        assert.throws(()=>compareDelivery(previous,[incoming[0],incoming[0]],{...manifest(initial,kind),expectedRows:2}));
        assert.throws(()=>compareDelivery(previous,incoming,{...manifest(initial,kind),expectedRows:99}));
      });
      check(`${platform}: source namespace isolates equal native IDs`,()=>assert.notEqual(nativeKey(incoming[0]),nativeKey({...incoming[0],instance:'other-instance'})));
      check(`${platform}: old observation cannot supersede newer evidence`,()=>assert.ok(compareDelivery(previous,incoming,
        {...manifest(initial,kind),observedAt:'2026-08-01T12:00:00Z'}).every(row=>row.state==='Older observation')));
    }
    check(`${platform}/${kind}: reference comparison never mutates prior observations or business metadata`,()=>assert.deepEqual(previous,before));
    check(`${platform}/${kind}: no business metadata is proposed by comparison result`,()=>{
      for(const row of changed)assert.deepEqual(Object.keys(row),['key','registryId','name','state','changedFields']);
    });
  }
  const firstAsset=rows(initial,'Asset')[0],firstWorkspace=rows(initial,'Workspace')[0];
  const renamedWorkspace:Observation={...firstWorkspace,name:'different'};
  const renamedAsset:Observation={...firstAsset,name:'renamed'};
  check(`${platform}: relationship identity ignores display renames`,()=>assert.equal(
    relationshipKey(firstWorkspace,firstAsset,'Contains'),
    relationshipKey(renamedWorkspace,renamedAsset,'Contains')));
  if(platform==='alteryx'){
    check('Alteryx: same workflow belongs to two collections without duplicate asset rows',()=>{
      assert.equal(initial.Workspace_Assets.filter(row=>row.NativeAssetID===firstAsset.nativeId).length,2);
      assert.equal(initial.Assets.filter(row=>row.NativeAssetID===firstAsset.nativeId).length,1);
    });
    check('Alteryx: repeated unverified workflow owner remains explicit across runs',()=>{
      const find=(f:Fixture)=>f.Object_Users.find(row=>row.NativeObjectID===firstAsset.nativeId&&row.PrincipalRoleCode==='TechnicalOwner')!;
      const first=find(initial),next=find(refresh);
      assert.equal(first.SourceReferenceStatusCode,'UnverifiedMapping');assert.equal(next.SourceReferenceStatusCode,'UnverifiedMapping');
      assert.equal(first.NativePrincipalID,null);assert.equal(next.NativePrincipalID,null);
      for(const key of Object.keys(first).filter(key=>key!=='RunKey'))assert.equal(first[key],next[key]);
    });
  }
  if(platform==='tableau')check('Tableau: workbook moves projects without changing asset identity',()=>{
    assert.notEqual(initial.Workspace_Assets.find(row=>row.NativeAssetID===firstAsset.nativeId)?.NativeWorkspaceID,
      refresh.Workspace_Assets.find(row=>row.NativeAssetID===firstAsset.nativeId)?.NativeWorkspaceID);
    assert.equal(nativeKey(firstAsset),nativeKey(rows(refresh,'Asset')[0]));
  });
  if(platform==='fabric')check('Fabric: no fabricated principal or lineage evidence',()=>{
    for(const name of ['Platform_Users','Object_Users','Asset_Dependencies','Connections','Asset_Connections','Directory_Users']){
      assert.equal(initial[name].length,0);assert.equal(initial.Coverage.find(row=>row.DatasetCode===name)?.CoverageStatus,'NotCollected');
    }
    assert.equal(initial.Assets[1].NativeAssetType,'Dataset');
  });
}
const directory=JSON.parse(readFileSync(resolve(root,'directory-evidence.json'),'utf8')) as {rows:DirectoryEvidence[]};
const tenant=directory.rows[0].tenant;
check('email: exact normalized match returns enabled person',()=>assert.equal(resolveEmail(' ALEX@EXAMPLE.TEST ',tenant,directory.rows,true).status,'Resolved enabled'));
check('email: resolved disabled keeps directory ID and routes to Platform Manager',()=>{
  const result=resolveEmail('casey@example.test',tenant,directory.rows,true);
  assert.equal(result.status,'Resolved disabled');assert.equal(result.directoryId,directory.rows[1].directoryId);assert.equal(result.route,'Platform Manager');
});
check('email: source Active is not directory activity',()=>{
  const fixture=load(resolve(root,'alteryx/initial/delivery.json'));
  const user=fixture.Platform_Users.find(row=>row.SourceEmail==='casey@example.test')!;
  assert.equal(user.SourceStatus,'true');assert.equal(resolveEmail(string(user,'SourceEmail'),tenant,directory.rows,true).status,'Resolved disabled');
});
check('email: unmatched is not disabled',()=>assert.equal(resolveEmail('unmatched@example.test',tenant,directory.rows,true).status,'No exact email match'));
check('email: duplicate mail is ambiguous',()=>assert.equal(resolveEmail('alex@example.test',tenant,[...directory.rows,{...directory.rows[0],directoryId:'another-id'}],true).status,'Ambiguous directory evidence'));
check('email: same user repeated in evidence remains ambiguous',()=>assert.equal(resolveEmail('alex@example.test',tenant,[...directory.rows,directory.rows[0]],true).status,'Ambiguous directory evidence'));
check('email: incomplete directory cannot prove resolution',()=>assert.equal(resolveEmail('alex@example.test',tenant,directory.rows,false).status,'Directory evidence incomplete'));
check('email: group never becomes a person',()=>assert.equal(resolveEmail('alex@example.test',tenant,directory.rows,true,'Group').directoryId,null));
check('email: missing mail has an explicit unresolved result',()=>assert.equal(resolveEmail(null,tenant,directory.rows,true).status,'Missing email or tenant'));
check('email: unknown directory status remains unknown',()=>assert.equal(resolveEmail('alex@example.test',tenant,[{...directory.rows[0],accountEnabled:null}],true).status,'Resolved status unknown'));
check('fixture manifest matches every saved JSON and CSV',()=>{
  const paths:string[]=[];
  for(const line of readFileSync(resolve(root,'fixtures.sha256'),'utf8').trim().split(/\r?\n/)){
    const [hash,path]=line.split('  ');assert.equal(createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex'),hash,path);
    paths.push(path);
  }
  const expected=readdirSync(root).filter(name=>/\.(json|csv)$/.test(name));
  for(const platform of ['alteryx','tableau','fabric'])for(const scenario of ['initial','identical-replay','changed-refresh']){
    expected.push(...readdirSync(resolve(root,platform,scenario)).filter(name=>/\.(json|csv)$/.test(name)).map(name=>`${platform}/${scenario}/${name}`));
  }
  assert.deepEqual(paths.sort(),expected.sort());
});
console.log(`Platform samples: ${checks} fixture, reconciliation and identity checks passed.`);
console.log('Not tested: installed SQL execution, persistent RunKey replay protection, transactional business-metadata merge, or recurring-case upsert. These need an implemented importer and case persistence.');
