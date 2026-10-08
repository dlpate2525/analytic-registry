import type { GroupSpecification } from '../types';
import { standardTemplate } from '../data/standard';

export const requestGroupPurposes = standardTemplate.groups.map(g=>g.purpose);
export const groupSuffix = (purpose: string) => standardTemplate.groups.find(g=>g.purpose===purpose)?.suffix || purpose.toUpperCase().replace(/\s+/g, '_');

export function renameGeneratedGroups(groups:GroupSpecification[], technicalName:string) {
  return groups.map(g=>g.mode==='New'&&g.requestedName===g.suggestedName
    ? {...g,requestedName:`${technicalName}_${groupSuffix(g.purpose)}`,suggestedName:`${technicalName}_${groupSuffix(g.purpose)}`}
    : g);
}

export function newRequestGroup(purpose: string, technicalName = 'CL_ANALYTICS_PROD'): GroupSpecification {
  const name = `${technicalName}_${groupSuffix(purpose)}`;
  return {
    id: crypto.randomUUID(), configurationVersionId: 'DRAFT', purpose,
    mode: 'New', groupId: '', displayName: '', suggestedName: name,
    requestedName: name, provisioningStatus: 'Pending prerequisite',
  };
}

export function withDataSourcesGroup(groups: GroupSpecification[], technicalName: string) {
  const oldDefault = (g: GroupSpecification) => g.purpose === 'Data Sources' && g.mode === 'New'
    && g.requestedName === g.suggestedName && g.suggestedName.endsWith('_DATA_SOURCES');
  if (groups.some(oldDefault)) {
    groups = groups.map(g => oldDefault(g) ? {
      ...g, requestedName: g.requestedName.replace(/_DATA_SOURCES$/, '_DS'),
      suggestedName: g.suggestedName.replace(/_DATA_SOURCES$/, '_DS'),
    } : g);
  }
  return groups.some(g => g.purpose === 'Data Sources')
    ? groups
    : [...groups, newRequestGroup('Data Sources', technicalName)];
}
