import type { RegistryData } from '../../types';
import { isOpen } from '../../utils/logic';

/** Preserve unresolved responsibility references without inventing directory status. */
export function assetPersonReference(data: RegistryData, id: string | undefined) {
  const person = data.people.find(row => row.id === id);
  return person || { id: id || '', name: id || 'Not recorded', status: id ? 'Unresolved' : 'Not recorded' };
}

/** An open Finding counts once when an open asset case explicitly links its ID. */
export function assetWork(data: RegistryData, assetId: string) {
  const reviews = data.reviews.filter(row => row.assetId === assetId);
  const findings = data.findings.filter(row => row.assetId === assetId);
  const openReviews = reviews.filter(isOpen);
  const linkedFindingIds = new Set(openReviews.flatMap(row => row.findingIds || []));
  const unlinkedFindings = findings.filter(row => isOpen(row) && !linkedFindingIds.has(row.id));
  return { reviews, findings, count: openReviews.length + unlinkedFindings.length };
}
