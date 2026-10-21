import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, Download} from 'lucide-react';
import {Title, Panel, Note, Select, KV} from '../components/ui';
import {StepNav, StepActions} from '../components/StepNav';
import {prototypeArtifacts} from '../data/release';
import contract from '../data/foundationContract.json';
import {compareDelivery, type Delivery, type Observation, type RegistryEvidence} from '../domain/foundation';

const steps=['Receive','Validate','Match','Compare','Accept'];
const resourceRoot=prototypeArtifacts.collectionRoot;
type Platform='Alteryx'|'Tableau'|'PowerBI';
const labels={Alteryx:'Alteryx',Tableau:'Tableau',PowerBI:'Power BI / Fabric'};
const sourceDescriptions={
 Alteryx:'SQL Server queries over exported Alteryx Gallery and Service collections.',
 Tableau:'PostgreSQL queries against the Tableau Server repository.',
 PowerBI:'SQL queries against Fabric inventory already landed in a queryable table.',
};
const nativeTypes={Alteryx:'Workflow',Tableau:'Workbook',PowerBI:'Report'};

/** A reference walkthrough, deliberately separate from a production import receipt. */
export function PlatformImports(){
 const [step,setStep]=useState(0);
 const [platform,setPlatform]=useState<Platform>('Tableau');
 const [scenario,setScenario]=useState('Rename');
 const previous:RegistryEvidence={platform,instance:'example-instance',scope:'example-scope',kind:'Asset',nativeType:nativeTypes[platform],nativeId:'native-100',registryId:'registry-900',name:'Revenue overview',attributes:{},lastSeenAt:'2026-09-01T12:00:00Z'};
 const incoming:Observation[]=scenario.startsWith('Missing')?[]:[{...previous,name:scenario==='Rename'?'Revenue by region':previous.name,nativeId:scenario==='New native ID'?'native-200':previous.nativeId}];
 const delivery:Delivery={platform,instance:previous.instance,scope:previous.scope,kind:'Asset',runKey:'example-october-delivery',observedAt:'2026-10-01T12:00:00Z',coverage:scenario==='Missing / partial'?'Partial':'Complete',expectedRows:incoming.length,scopeVerified:true};
 const comparison=compareDelivery([previous],incoming,delivery);
 const profile=contract.queryProfiles[platform];
 return <>
  <Title eyebrow="ADMINISTRATION" title="Platform imports" description="Collect source evidence, check it, and preserve business accountability." actions={<a className="button" href={prototypeArtifacts.workbook} download><Download size={15}/>Excel template</a>}/>
  <Note>This local walkthrough uses synthetic examples. It does not upload files, load SQL Server, or accept production deliveries.</Note>
  <Panel title="Monthly handoff" subtitle="Refresh at least monthly. Keep the original source observation date.">
   <div className="panel-body import-intro">
    <div><label className="field"><span>Platform</span><Select label="Import platform" value={platform} onChange={value=>setPlatform(value as Platform)} options={['Tableau','Alteryx','PowerBI']}/></label></div>
    <div><strong>{labels[platform]}</strong><p>{sourceDescriptions[platform]}</p><a href={resourceRoot+profile.query}>Query reference</a> · <a href={resourceRoot+profile.guide}>Mapping guide</a> · <Link to="/data-model">Column dictionary</Link></div>
   </div>
  </Panel>
  <StepNav steps={steps} step={step} onChange={setStep}/>
  <Panel title={steps[step]} subtitle="One delivery boundary; source evidence stays separate from business registration.">
   <div className="panel-body">
    {step===0&&<>
     <p>The platform team runs the approved queries and fills the named Excel tables. The operator loads the extract into SQL Server staging.</p>
     <div className="import-facts"><KV label="Delivery identity">RunKey + configured source scope</KV><KV label="Object identity">Native ID + its exact namespace</KV><KV label="Observation date">ObservedAt from the source collection</KV></div>
     <p>Use a new RunKey for changed delivery content. Keep native IDs as text. Names, email, and business versions are not object keys.</p>
    </>}
    {step===1&&<>
     <p>Validate required columns, supported types, unique keys, source scope, declared coverage, and delivered row counts.</p>
     <p>A structural error blocks the whole delivery. Correct it before acceptance; do not silently discard rows.</p>
     <p>A valid partial delivery can proceed. Complete coverage also needs verified scope. A zero row count alone does not prove completeness.</p>
     <a href={resourceRoot+'sqlserver-validation.sql'}>SQL validation reference <ArrowRight size={13}/></a>
    </>}
    {step===2&&<>
     <p>Match objects with their exact native identity. Keep the Registry ID through renames and later refreshes.</p>
     <p>Match user email to directory Mail within the configured tenant, after trimming spaces and ignoring case.</p>
     <p>Keep missing, ambiguous, disabled, and unknown account status distinct. Route unresolved identities to Platform Manager. Do not fall back to names or UPN.</p>
     <p>Groups and applications remain source principals. They do not become people through email matching.</p>
    </>}
    {step===3&&<>
     <label className="field"><span>Example refresh</span><Select label="Import example" value={scenario} onChange={setScenario} options={['Rename','Unchanged','New native ID','Missing / complete','Missing / partial']}/></label>
     <div className="table-wrap"><table><thead><tr><th>Observed asset</th><th>Registry ID</th><th>Comparison</th></tr></thead><tbody>{comparison.map(row=><tr key={row.key}><td>{row.name}</td><td>{row.registryId??'Allocate after validation'}</td><td>{row.state}</td></tr>)}</tbody></table></div>
     <p>Platform movement does not change the accountable workspace. Absence does not delete or retire the asset.</p>
     <p>Source facts cannot replace declared purpose, Workspace Owner, Champions, governance answers, or a business asset version.</p>
    </>}
    {step===4&&<>
     <p>The registry operator accepts structurally valid routine deliveries. An additional business approval is not required for the source evidence.</p>
     <p>Acceptance must save the source scope, original observation date, coverage, content identity, comparison, and operator receipt together.</p>
     <p>An identical retry must reuse its receipt. Changed content under the same RunKey must be rejected.</p>
     <Note>Production acceptance is not connected in this prototype. Persistent retry checks, SQL transactions, and assigned exception cases require the importer.</Note>
     <p>Source acceptance, business registration, and platform implementation each need their own receipt. One cannot stand in for another.</p>
    </>}
   </div>
   <div className="panel-foot actions"><StepActions step={step} count={steps.length} onChange={setStep}/></div>
  </Panel>
 </>;
}
