import {useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Title, Panel, Note, Select} from '../components/ui';
import {foundationCoverage, coverageThemes, evidenceReadinessDescriptions} from '../data/foundationCoverage';
import {platforms} from '../data/config';
import {prototypeRelease} from '../data/release';
import {useRegistry} from '../data/store';

export function Coverage() {
  const {viewMode}=useRegistry();
  const [params,setParams]=useSearchParams();
  const requestedPlatform=params.get('platform');
  const platform=platforms.find(item=>item===requestedPlatform)||'All platforms';
  const [theme,setTheme]=useState('All themes');
  const visiblePlatforms=platform==='All platforms'?platforms:[platform];
  const rows=foundationCoverage.filter(row=>theme==='All themes'||row.theme===theme)
    .sort((a,b)=>coverageThemes.indexOf(a.theme)-coverageThemes.indexOf(b.theme));
  function selectPlatform(value:string) {
    const next=new URLSearchParams(params);
    if(value==='All platforms') next.delete('platform'); else next.set('platform',value);
    setParams(next);
  }
  return <>
    <Title eyebrow={prototypeRelease.series+' · EVIDENCE & RISK'} title="Detection coverage"
      description="See what supports each risk bucket, what is missing, and who should act."
      actions={<Link className="button" to="/imports">Platform imports</Link>}/>
    <Note>Automated platform detection is not connected. This catalog describes evidence requirements; it does not measure compliance or count detected issues.</Note>
    <Panel title="Risk buckets and evidence" subtitle="A bucket groups findings by concern. Finding severity and an asset’s High risk qualification are separate.">
      <div className="table-toolbar">
        <Select label="Coverage platform" value={platform} onChange={selectPlatform} options={['All platforms',...platforms]}/>
        <Select label="Coverage theme" value={theme} onChange={setTheme} options={['All themes',...coverageThemes]}/>
        <span className="tiny-label">{rows.length} of {foundationCoverage.length} risk buckets</span>
      </div>
      <div className="table-wrap"><table className="detection-catalog">
        <thead><tr><th>Risk bucket / purpose</th><th>Current evidence support</th><th>Next action</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row.bucket}>
          <td><strong>{row.bucket}</strong><small>{row.theme}</small><p>{row.purpose}</p></td>
          <td>
            <div className="coverage-platforms">{visiblePlatforms.map(source=><div key={source}>
              <small>{source}</small><span className="evidence-support">{row.platforms[source].state}</span>
            </div>)}</div>
            <details className="coverage-detail"><summary>Evidence needed</summary>
              <p>{row.inputs}</p><p><strong>Gap:</strong> {row.gap}</p>
              {visiblePlatforms.map(source=><p key={source}><strong>{source}:</strong> {row.platforms[source].note}</p>)}
            </details>
          </td>
          <td><p>{row.action}</p>{viewMode==='Administrator'&&<Link to={'/reviews?'+new URLSearchParams({view:'findings',status:'open',bucket:row.bucket,...platform!=='All platforms'?{platform}:{}}).toString()}>Open findings in this bucket →</Link>}</td>
        </tr>)}</tbody>
      </table></div>
      <div className="panel-foot">Current query profiles · Monthly observations · Input schema {prototypeRelease.collectionContract}. Missing evidence remains unknown.</div>
    </Panel>
    <details className="process-help"><summary>How coverage, findings, and risk fit together</summary>
      <Panel title="Use the right meaning"><div className="panel-body">
        <dl className="risk-terms">
          <div><dt>Dataset coverage</dt><dd>How much of a stated source scope was collected. Complete, Partial, Failed, and NotCollected belong to the delivery.</dd></div>
          <div><dt>Detection coverage</dt><dd>Whether a rule has the evidence and business context needed for a check.</dd></div>
          <div><dt>Finding result and severity</dt><dd>The result describes an individual check. Severity prioritizes its issue. Neither describes dataset completeness.</dd></div>
          <div><dt>High-risk asset</dt><dd>PRL 1, PII Yes, EUCT Yes, or DMP Tier 1–3 qualifies independently. Qualification does not create a finding or Review case.</dd></div>
        </dl>
        <p>Collect source evidence → Validate and accept it → Assess the applicable rule → Track a finding and Review case → Verify and approve closure.</p>
        <p>A source refresh preserves business declarations. Closure requires eligible approval of the recorded evidence. No findings does not prove that controls passed.</p>
      </div></Panel>
      <Panel title="Evidence support labels"><div className="panel-body">
        {Object.entries(evidenceReadinessDescriptions).map(([label,meaning])=><p key={label}><strong>{label}:</strong> {meaning}</p>)}
        <p>These labels describe the current primary query profiles. They are separate from saved historical capability examples.</p>
      </div></Panel>
    </details>
  </>;
}
