import { Download, FileSpreadsheet, BookOpen, Package } from 'lucide-react';
import { Panel } from './ui';
import { prototypeArtifacts, prototypeRelease } from '../data/release';

export function PrototypeResources() {
  return <Panel title="V1.1 prototype resources" subtitle={`${prototypeRelease.version} · Baseline ${prototypeRelease.displayDate}`}>
    <div className="panel-body prototype-resources">
      <p>The Excel workbook defines the first platform delivery: nine data tables plus shared run context and coverage, with platform-specific source and NULL rules.</p>
      <div className="resource-actions">
        <a className="button primary" href={prototypeArtifacts.workbook} download><FileSpreadsheet size={16}/>Download Excel workbook</a>
        <a className="button" href={prototypeArtifacts.collectionPack} download><Package size={16}/>Queries & collection pack</a>
        <a className="button" href={prototypeArtifacts.documentation} target="_blank" rel="noreferrer"><BookOpen size={16}/>Full documentation</a>
        <a className="button" href={prototypeArtifacts.baseline} download><Download size={16}/>V1.1 baseline</a>
      </div>
      <p className="resource-note">Load extracts into SQL Server staging manually. Match email within the configured directory tenant; send unresolved records to Platform Manager. This prototype displays mock data.</p>
    </div>
  </Panel>;
}
