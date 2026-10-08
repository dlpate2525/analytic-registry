/** Offline adapter: no network, authentication, database writes, or app mutations.
 * Usage: node normalize-scan.mjs scan.json context.json output-directory
 * Input: one scan result, or an array of results from one collection run.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const common = ['RunKey','PlatformCode','PlatformInstanceKey','NativeScopeKey','ObservedAt'];
export const headers = {
  workspaces: [...common,'NativeWorkspaceID','NativeRepositoryID','NativeWorkspaceType','DisplayName','NativeOwnerID','NativeLifecycleCode','CapacityKey'],
  assets: [...common,'NativeAssetID','NativeRepositoryID','NativeAssetType','AssetTypeCode','DisplayName','NativeVersionReference','CreatedByNativeID','ModifiedByNativeID','NativeOwnerID','CreatedAtNative','ModifiedAtNative','NativeLifecycleCode'],
  workspace_assets: [...common,'NativeWorkspaceID','NativeAssetID','NativeAssetType','NativeAssociationType'],
  connections: [...common,'NativeConnectionID','NativeRepositoryID','NativeConnectionType','DisplayName','TechnologyCode','ServerHostname','Port','DatabaseName','HasExtract','AuthenticationTypeCode','IdentityClassificationCode','GatewayID','NativeStatusCode','EvidenceStatusCode'],
  asset_connections: [...common,'NativeAssetID','NativeAssetType','NativeConnectionID','EvidenceStatusCode'],
  asset_dependencies: [...common,'NativeAssetID','NativeAssetType','UpstreamNativeAssetID','UpstreamNativeAssetType','UpstreamNativeWorkspaceID','RelationshipCode','EvidenceStatusCode'],
};
const required = (v, label) => {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Missing ${label}`);
  return v;
};
function utc(v, label, warnings) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !/([zZ]|[+-]\d\d:\d\d)$/.test(v) || Number.isNaN(Date.parse(v))) {
    warnings.push({Code:'UnresolvedTimestamp',Subject:label,Detail:'Date has no valid timezone offset. Kept null; confirm source timezone before converting.'});
    return null;
  }
  return new Date(v).toISOString();
}
export function technology(v) {
  const aliases = {sql:'SQL Server',sqlserver:'SQL Server',oracle:'Oracle',dataengine:'Extract',hyper:'Extract'};
  return v ? aliases[v.toLowerCase()] ?? v : 'Undefined';
}
export function csv(rows, columns) {
  const cell = v => v == null ? '' : `"${String(v).replaceAll('"','""')}"`;
  return [columns.map(cell).join(','),...rows.map(r=>columns.map(k=>cell(r[k])).join(','))].join('\r\n')+'\r\n';
}
export function normalize(input, context) {
  if(context.ScanStatus!=='Succeeded') throw new Error('Only results from Succeeded scans can be normalized. Keep failed scans in the run log.');
  const warnings=[];
  const tenant=required(context.PlatformInstanceKey,'PlatformInstanceKey');
  const observed=utc(required(context.ObservedAt,'ObservedAt'),'context.ObservedAt',warnings);
  if (!observed) throw new Error('ObservedAt requires an explicit UTC offset');
  const base={RunKey:required(context.RunKey,'RunKey'),PlatformCode:'PowerBI',PlatformInstanceKey:tenant,NativeScopeKey:tenant,ObservedAt:observed};
  const out=Object.fromEntries(Object.keys(headers).map(k=>[k,[]]));
  const maps=Object.fromEntries(Object.keys(headers).map(k=>[k,new Map()]));
  function add(table,key,values) {
    const row=Object.fromEntries(headers[table].map(k=>[k,({...base,...values})[k] ?? null]));
    const before=maps[table].get(key);
    if (before && JSON.stringify(before)!==JSON.stringify(row)) throw new Error(`Conflicting ${table} identity ${key}; do not mix different snapshots`);
    if (!before) {maps[table].set(key,row);out[table].push(row);}
  }
  const batches=Array.isArray(input)?input:[input];
  const workspaces=[];const inventories=[];
  for (const batch of batches) {
    if (!Array.isArray(batch.workspaces)) throw new Error('Input lacks workspaces array; not a successful scan result');
    workspaces.push(...batch.workspaces);
    for (const [field,status] of [['datasourceInstances','Observed'],['misconfiguredDatasourceInstances','Misconfigured']]) {
      if (!Array.isArray(batch[field])) warnings.push({Code:'MissingConnectionDataset',Subject:field,Detail:'Connection coverage is partial.'});
      for (const c of batch[field]??[]) {
        if (!c.datasourceId) { warnings.push({Code:'MissingConnectionID',Subject:field,Detail:'No durable connection row created. Keep source evidence for resolution.'});continue; }
        const id=required(c.datasourceId,'datasourceId');
        const details=c.connectionDetails??{};
        // Explicit allowlist. Never spread the source object or export connectionString.
        const tech=technology(c.datasourceType);
        add('connections',id,{NativeConnectionID:id,NativeConnectionType:'DatasourceInstance',DisplayName:`${tech} (${id})`,TechnologyCode:tech,ServerHostname:details.server??null,DatabaseName:details.database??null,GatewayID:c.gatewayId||null,IdentityClassificationCode:'Unknown',NativeStatusCode:status,EvidenceStatusCode:'Observed'});
      }
    }
  }
  const seenWorkspaces=new Set();const workspacePayloads=new Map();
  for(const w of workspaces) {
    const wid=required(w.id,'workspace.id');seenWorkspaces.add(wid);
    const workspacePayload=JSON.stringify(w);
    if(workspacePayloads.has(wid)&&workspacePayloads.get(wid)!==workspacePayload) throw new Error(`Conflicting workspace snapshot ${wid}; do not combine scans from different moments for the same workspace`);
    workspacePayloads.set(wid,workspacePayload);
    add('workspaces',wid,{NativeWorkspaceID:wid,NativeWorkspaceType:w.type??'Workspace',DisplayName:required(w.name,'workspace.name'),NativeLifecycleCode:w.state??null,CapacityKey:w.capacityId??null});
    for(const [field,type,assetType] of [['reports','Report','Report'],['datasets','Dataset','Semantic Model']]) {
      if (!Array.isArray(w[field])) warnings.push({Code:'MissingAssetDataset',Subject:`${wid}/${field}`,Detail:'Missing array is unknown, not an empty inventory.'});
      inventories.push({DatasetCode:field==='reports'?'ReportInventory':'SemanticModelInventory',ScopeKey:wid,CoverageStatusCode:Array.isArray(w[field])&&context.InventoryComplete===true?'Complete':Array.isArray(w[field])?'Partial':'NotCollected',RowCount:Array.isArray(w[field])?new Set(w[field].map(a=>a.id)).size:null});
      for(const a of w[field]??[]) {
        const aid=required(a.id,`${field}.id`);const key=`${type}:${aid}`;
        const kind=type==='Report'&&a.reportType==='PaginatedReport'?'Paginated Report':assetType;
        // WorkspaceInfoReport.createdById is the report owner ID, not original-author evidence.
        add('assets',key,{NativeAssetID:aid,NativeAssetType:type,AssetTypeCode:kind,DisplayName:required(a.name,`${field}.name`),NativeOwnerID:type==='Report'?a.createdById??null:null,ModifiedByNativeID:type==='Report'?a.modifiedById??null:null,CreatedAtNative:utc(type==='Report'?a.createdDateTime:a.createdDate,key+'.created',warnings),ModifiedAtNative:utc(a.modifiedDateTime,key+'.modified',warnings)});
        add('workspace_assets',`${wid}:${key}`,{NativeWorkspaceID:wid,NativeAssetID:aid,NativeAssetType:type,NativeAssociationType:'ContainedIn'});
        if(type==='Report') {
          if(a.datasetId) {
            add('asset_dependencies',`${key}:Dataset:${a.datasetId}`,{NativeAssetID:aid,NativeAssetType:type,UpstreamNativeAssetID:a.datasetId,UpstreamNativeAssetType:'Dataset',UpstreamNativeWorkspaceID:a.datasetWorkspaceId??wid,RelationshipCode:'UsesSemanticModel',EvidenceStatusCode:'Observed'});
          } else {
            warnings.push({Code:'UnresolvedReportLineage',Subject:key,Detail:kind==='Paginated Report'?'Paginated source lineage requires a separate collector.':'No semantic model reference returned; do not infer a connection.'});
          }
        } else {
          if(!Array.isArray(a.datasourceUsages)) warnings.push({Code:'MissingLineageDataset',Subject:key,Detail:'Missing datasourceUsages does not prove the model has no sources.'});
          for(const usage of [...(a.datasourceUsages??[]),...(a.misconfiguredDatasourceUsages??[])]) {
            const cid=usage.datasourceInstanceId;
            if(!cid || !maps.connections.has(cid)) {warnings.push({Code:'UnresolvedConnection',Subject:key,Detail:`Connection reference ${cid??'(missing)'} has no matching source row.`});continue;}
            add('asset_connections',`${key}:${cid}`,{NativeAssetID:aid,NativeAssetType:type,NativeConnectionID:cid,EvidenceStatusCode:'Observed'});
          }
          for (const [field,upstreamType,idField] of [['upstreamDatasets','Dataset','targetDatasetId'],['upstreamDataflows','Dataflow','targetDataflowId'],['upstreamDatamarts','Datamart','targetDatamartId']]) {
            for(const u of a[field]??[]) {
              if(!u[idField]) { warnings.push({Code:'MissingDependencyID',Subject:key,Detail:`${field} edge omitted because its native ID is unavailable.`});continue; }
              add('asset_dependencies',`${key}:${upstreamType}:${u[idField]}`,{NativeAssetID:aid,NativeAssetType:type,UpstreamNativeAssetID:u[idField],UpstreamNativeAssetType:upstreamType,UpstreamNativeWorkspaceID:u.groupId??null,RelationshipCode:'DependsOn',EvidenceStatusCode:'Observed'});
            }
          }
        }
      }
    }
  }
  const expected=context.ExpectedWorkspaceIDs;
  const scopeMatches=Array.isArray(expected)&&expected.length===new Set(expected).size&&expected.length===seenWorkspaces.size&&expected.every(id=>seenWorkspaces.has(id));
  if(!scopeMatches) {
    warnings.push({Code:'ScopeNotConfirmed',Subject:'run',Detail:'Expected workspace IDs do not match returned IDs, or no expected list was supplied.'});
    for(const d of inventories) if(d.CoverageStatusCode==='Complete')d.CoverageStatusCode='Partial';
  }
  for(const edge of out.asset_dependencies) {
    if(!maps.assets.has(`${edge.UpstreamNativeAssetType}:${edge.UpstreamNativeAssetID}`)) warnings.push({Code:'DependencyOutsideInventory',Subject:`${edge.NativeAssetType}:${edge.NativeAssetID}`,Detail:`Upstream ${edge.UpstreamNativeAssetType}:${edge.UpstreamNativeAssetID} requires collection or resolution. Preserve the edge in staging.`});
  }
  const inventoryMap=new Map(inventories.map(d=>[`${d.DatasetCode}:${d.ScopeKey}`,d]));
  const memberships=[...seenWorkspaces].map(wid=>({DatasetCode:'WorkspaceAssetMembership',ScopeKey:wid,CoverageStatusCode:scopeMatches&&[...inventoryMap.values()].filter(d=>d.ScopeKey===wid).every(d=>d.CoverageStatusCode==='Complete')?'Complete':'Partial',RowCount:out.workspace_assets.filter(row=>row.NativeWorkspaceID===wid).length}));
  const datasets=[{DatasetCode:'WorkspaceInventory',ScopeKey:tenant,CoverageStatusCode:scopeMatches&&context.InventoryComplete===true?'Complete':'Partial',RowCount:out.workspaces.length},...inventoryMap.values(),...memberships,
    {DatasetCode:'Connections',ScopeKey:tenant,CoverageStatusCode:context.DatasourceDetailsRequested===true||out.connections.length?'Partial':'NotCollected',RowCount:out.connections.length},
    {DatasetCode:'AssetConnectionLineage',ScopeKey:tenant,CoverageStatusCode:context.LineageRequested===true||out.asset_connections.length?'Partial':'NotCollected',RowCount:out.asset_connections.length},
    {DatasetCode:'AssetDependencies',ScopeKey:tenant,CoverageStatusCode:context.LineageRequested===true||out.asset_dependencies.length?'Partial':'NotCollected',RowCount:out.asset_dependencies.length},
    ...['ConfiguredAccess','EffectiveAccess','Activity','CredentialIdentity','FabricNonPowerBIItems'].map(DatasetCode=>({DatasetCode,ScopeKey:tenant,CoverageStatusCode:'NotCollected',RowCount:null}))];
  out.manifest={ContractVersion:'1.0',CollectorVersion:'registry-powerbi-offline-1.0',...base,EnvironmentCode:context.EnvironmentCode??null,ProductVersion:null,APIVersion:'v1.0',StartedAt:context.StartedAt??null,CompletedAt:observed,RunStatusCode:datasets.some(d=>d.CoverageStatusCode==='Partial')?'Partial':'Complete',ScopeDescription:'Power BI reports and semantic models in the explicit workspace list; not the full Fabric item estate.',Datasets:datasets,Warnings:warnings};
  return out;
}
export async function writeOutput(out, directory) {
  await mkdir(directory,{recursive:true});
  for(const [table,columns] of Object.entries(headers)) await writeFile(resolve(directory,`${table}.csv`),csv(out[table],columns),'utf8');
  await writeFile(resolve(directory,'manifest.json'),JSON.stringify(out.manifest,null,2)+'\n','utf8');
  await writeFile(resolve(directory,'normalized.json'),JSON.stringify(out,null,2)+'\n','utf8');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [input,context,directory]=process.argv.slice(2);
  if(!input||!context||!directory) {console.error('Usage: node normalize-scan.mjs scan.json context.json output-directory');process.exitCode=2;}
  else { const result=normalize(JSON.parse(await readFile(input,'utf8')),JSON.parse(await readFile(context,'utf8')));await writeOutput(result,directory);console.log(`Wrote ${result.assets.length} assets and ${result.connections.length} connections. Coverage: ${result.manifest.RunStatusCode}.`); }
}
