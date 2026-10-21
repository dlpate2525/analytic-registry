import type { RegistryData, Workspace } from '../../types';
import { isOpen } from '../../utils/logic';
import { businessPersonId, workItems } from '../../utils/workItems';

export const workspaceTabs = ['Overview', 'Assets & connections', 'Access & configuration', 'Work', 'History'] as const;
export type WorkspaceTab = typeof workspaceTabs[number];

/** Keep bookmarked links working after grouping related pages. */
export function workspaceTab(value: string | null): WorkspaceTab {
  const aliases: Record<string, WorkspaceTab> = {
    Assets: 'Assets & connections',
    Connections: 'Assets & connections',
    Access: 'Access & configuration',
    Comparison: 'Access & configuration',
    Findings: 'Work',
    Attestation: 'Work',
  };
  return workspaceTabs.includes(value as WorkspaceTab) ? value as WorkspaceTab : aliases[value || ''] || 'Overview';
}

export function workspaceBusinessLine(workspace: Workspace) {
  const value = workspace.lob?.trim();
  if (!value) return { value: 'Not recorded', status: 'Not confirmed', detail: 'The workspace business line has not been recorded.' };
  if (workspace.businessLineStatus === 'Declared') {
    return { value, status: 'Declared', detail: 'Declared for this workspace. A change of Workspace Owner does not change this value.' };
  }
  if (workspace.businessLineStatus === 'Inherited') {
    return { value, status: 'Confirmation needed', detail: 'Inherited from the owner directory record. Confirm or correct it through a workspace change request.' };
  }
  return { value, status: 'Not confirmed', detail: 'The origin of this recorded value is unknown. Confirm or correct it through a workspace change request.' };
}

export function registrationHref(data: RegistryData, workspace: Workspace) {
  const supersededIds = new Set(data.requests.map(request => request.supersedesRequestId).filter(Boolean));
  const existing = data.requests
    .filter(request => request.type === 'Register Existing'
      && request.workspaceId === workspace.id
      && request.platform === workspace.platform
      && (!request.nativeWorkspaceId || request.nativeWorkspaceId === workspace.nativeId)
      && !supersededIds.has(request.id))
    .sort((a, b) => (b.submittedAt || b.createdDate).localeCompare(a.submittedAt || a.createdDate))[0];
  return existing ? `/requests/${existing.id}` : `/requests/new?type=Register%20Existing&workspace=${encodeURIComponent(workspace.id)}`;
}

export function isRetiredWorkspace(workspace: Workspace) {
  return workspace.lifecycle.trim().toLowerCase() === 'retired';
}

/** Count linked Findings once, through their open Review case. */
export function workspaceWork(data: RegistryData, workspace: Workspace) {
  const assetIds = new Set(data.assets.filter(asset => asset.workspaceId === workspace.id).map(asset => asset.id));
  const belongs = (item: { workspaceId: string | null; assetId: string | null }) =>
    item.workspaceId === workspace.id || (item.workspaceId === null && !!item.assetId && assetIds.has(item.assetId));
  const items = workItems(data, businessPersonId, true).filter(belongs);
  const openReviewIds = new Set(items.filter(item => item.kind === 'Review').map(item => item.id));
  const linkedFindingIds = new Set(data.reviews
    .filter(review => openReviewIds.has(review.id))
    .flatMap(review => review.findingIds || []));
  const findings = data.findings.filter(belongs);
  const unlinkedFindings = findings.filter(finding => isOpen(finding) && !linkedFindingIds.has(finding.id));
  return { items, findings, unlinkedFindings, count: items.length + unlinkedFindings.length };
}
