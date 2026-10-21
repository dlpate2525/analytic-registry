import { initialData } from '../src/data/mock';
import { applyDueRequests, executeRequest as executeCommand, requestView } from '../src/domain/requests';
import { newRequestGroup, requestGroupPurposes } from '../src/utils/requestGroups';
import type { RegistryData, WorkspaceRequest } from '../src/types';

let count = 0;
let sequence = 0;
const now = '2026-10-09T14:00:00Z';
const day = '2026-10-09';
function check(condition: unknown, label: string): void {
  if (!condition) throw Error(label);
  count++;
}
function same(actual: unknown, expected: unknown, label: string): void {
  check(JSON.stringify(actual) === JSON.stringify(expected), label);
}
const fresh = (): RegistryData => ({ ...structuredClone(initialData), requests: [], approvals: [] });
const context = (actorId = 'P1', instant = now) => ({ actorId, now: instant, newId: () => 'REQUEST-MODULE-' + ++sequence });
function executeHistoricalRequest(data:RegistryData,command:Parameters<typeof executeCommand>[1],actionContext:Parameters<typeof executeCommand>[2]) {
  const historical='draft' in command&&!command.draft.approvalPolicy&&!data.requests.some(item=>item.id===command.draft.id)
    ? {...data,requests:[...data.requests,structuredClone(command.draft)]}:data;
  return executeCommand(historical,command,actionContext);
}

function draft(data: RegistryData, changes: Partial<WorkspaceRequest> = {}): WorkspaceRequest {
  const workspace = data.workspaces.find(record => record.registryStatus === 'Discovered')!;
  return {
    id: 'REQ-MODULE-' + ++sequence,
    type: 'Register Existing',
    workspaceId: workspace.id,
    nativeWorkspaceId: workspace.nativeId,
    platform: workspace.platform,
    businessName: 'Command module sample',
    purpose: 'Validate business registration and technical work through one request module.',
    ownerId: 'P4',
    championIds: ['P5'],
    classification: 'Internal',
    criticality: 'Moderate',
    containsPii: 'No',
    containsEuct: 'No',
    highestDmpTier: 'Tier 1',
    configuration: 'Standard',
    technicalName: workspace.name,
    groups: requestGroupPurposes.map(purpose => newRequestGroup(purpose, workspace.name)),
    customReason: '',
    customExplanation: '',
    alternateSecurity: '',
    alternateAuthentication: '',
    status: 'Draft',
    createdById: 'P1',
    createdDate: day,
    effectiveDate: day,
    technicalWorkRequired: true,
    ...changes,
  };
}
function rejection(data: RegistryData, command: Parameters<typeof executeHistoricalRequest>[1], actorId: string, label: string, instant = now): void {
  const before = JSON.stringify(data);
  let rejected = false;
  try { executeHistoricalRequest(data, command, context(actorId, instant)); } catch { rejected = true; }
  check(rejected, label);
  check(JSON.stringify(data) === before, label + ': failed command leaves every record unchanged');
}
function approve(data: RegistryData, requestId: string, purpose: string, decision: 'Approved' | 'Changes required' = 'Approved', instant = now) {
  const view = requestView(data, requestId, instant.slice(0, 10));
  const need = [...view.approvalNeeds, ...view.technicalApprovalNeeds].find(item => item.purpose === purpose)!;
  if (!need) throw Error('Fixture is missing approval need: ' + purpose);
  const role = need.roles[0];
  return executeHistoricalRequest(data, {
    type: 'approve', requestId, contextKey: view.contextKey, purpose, role,
    personId: role === 'Business Owner / Workspace Owner' ? view.request.ownerId : role === 'Platform Administrator' ? 'P3' : 'P4',
    decision, reference: 'SYNTHETIC-' + purpose,
  }, context('P3', instant));
}
const businessPurpose = 'Business ownership / sensitive data / access';
const technicalPurpose = 'Technical setup';

// Drafts may be incomplete. Submission validates the current record and identity.
const original = fresh();
const originalJson = JSON.stringify(original);
const incomplete = draft(original, { purpose: '', containsPii: '' });
const saved = executeHistoricalRequest(original, { type: 'save', draft: incomplete }, context());
check(saved.request.status === 'Draft', 'An incomplete draft can be saved');
check(saved.data.requests.some(record => record.id === incomplete.id), 'Save returns the persisted request record');
check(saved.data.events.length === original.events.length + 1, 'Save returns its activity event with the record');
check(JSON.stringify(original) === originalJson, 'Successful save does not mutate its input');
rejection(saved.data, { type: 'submit', draft: saved.request }, 'P1', 'Submission rejects incomplete business information');
rejection(saved.data, { type: 'save', draft: { ...saved.request, ownerId: 'P2', createdById: 'P2' } }, 'P2', 'Draft payload cannot grant its editor access');
rejection(saved.data, { type: 'save', draft: { ...saved.request, createdById: 'P2' } }, 'P1', 'The original requester is immutable');
const inactive = structuredClone(saved.data);
inactive.people = inactive.people.map(person => person.id === 'P1' ? { ...person, status: 'Inactive' } : person);
rejection(inactive, { type: 'save', draft: saved.request }, 'P1', 'An inactive requester cannot save');
rejection(fresh(), { type: 'save', draft: draft(original, { createdById: 'P2' }) }, 'P1', 'A new request cannot impersonate another requester');
rejection(original, { type: 'submit', draft: draft(original, { nativeWorkspaceId: 'DIFFERENT-NATIVE-ID' }) }, 'P1', 'Submission preserves the selected native workspace identity');
rejection(original, { type: 'submit', draft: draft(original, { groups: draft(original).groups.slice(0, 3) }) }, 'P1', 'Standard submission requires all four group purposes');
rejection(original, { type: 'submit', draft: draft(original, { technicalWorkRequired: false }) }, 'P1', 'New groups cannot be declared as no technical work');

// Register Existing records business responsibility without claiming platform work.
const valid = draft(original);
const submitted = executeHistoricalRequest(original, { type: 'submit', draft: valid }, context());
check(submitted.request.status === 'Submitted', 'Submission records submitted intent');
check(submitted.request.submittedAt === now, 'Submission uses the injected clock');
check(submitted.data.events.length === original.events.length + 1, 'Submission records one activity event');
const submittedView = requestView(submitted.data, valid.id, day);
check(submittedView.stage === 'Awaiting approval', 'Submitted registration awaits business approval');
check(!submittedView.approvalNeeds.some(need => need.purpose === technicalPurpose), 'Business registration does not wait for technical approval');
check(submittedView.technicalApprovalNeeds.some(need => need.purpose === technicalPurpose), 'Required technical work retains its own approval');
rejection(submitted.data, { type: 'save', draft: valid }, 'P1', 'A stale draft cannot overwrite submitted intent');
rejection(submitted.data, { type: 'submit', draft: valid }, 'P3', 'An administrator cannot resubmit immutable submitted intent');
rejection(submitted.data, { type: 'correct', requestId: valid.id }, 'P1', 'A correction requires a correction decision or business issue');

const approvalCommand = {
  type: 'approve' as const, requestId: valid.id, contextKey: submittedView.contextKey,
  purpose: businessPurpose, role: 'Business Owner / Workspace Owner', personId: 'P4',
  decision: 'Approved' as const, reference: 'SYNTHETIC-APPROVAL',
};
rejection(submitted.data, approvalCommand, 'P1', 'A business profile cannot record approval receipts');
rejection(submitted.data, { ...approvalCommand, contextKey: 'stale-intent' }, 'P3', 'Approval rejects stale intent');
rejection(submitted.data, { ...approvalCommand, purpose: 'Unrequested approval' }, 'P3', 'Approval rejects an unrelated purpose');
rejection(submitted.data, { ...approvalCommand, personId: 'P2' }, 'P3', 'Approval requires an eligible selected owner');
rejection(submitted.data, { ...approvalCommand, reference: '  ' }, 'P3', 'Approval requires a reference');
const approverInactive = structuredClone(submitted.data);
approverInactive.people = approverInactive.people.map(person => person.id === 'P4' ? { ...person, status: 'Inactive' } : person);
rejection(approverInactive, approvalCommand, 'P3', 'Approval rechecks current eligibility');

const beforeApproval = JSON.stringify(submitted.data);
const registered = approve(submitted.data, valid.id, businessPurpose);
check(JSON.stringify(submitted.data) === beforeApproval, 'Approval and its business consequences do not mutate their input');
const registrationView = requestView(registered.data, valid.id, day);
const previousWorkspace = original.workspaces.find(workspace => workspace.id === valid.workspaceId)!;
const registeredWorkspace = registered.data.workspaces.find(workspace => workspace.id === valid.workspaceId)!;
check(registrationView.stage === 'Complete', 'Approved current-date registration completes in the command');
check(registeredWorkspace.registryStatus === 'Registered', 'Business registration updates the workspace status');
check(registeredWorkspace.ownerId === 'P4', 'Business registration applies the approved owner');
same(registered.request.businessApplied?.championIds, ['P5'], 'Business registration records approved Champions');
check(registered.request.businessApplied?.requestKey === submittedView.contextKey, 'Business receipt binds to submitted intent');
check(registrationView.contextKey === submittedView.contextKey, 'Business receipt does not alter approval context');
check(registrationView.hasOpenTechnicalWork && registrationView.open, 'Completed registration retains linked open technical work');
check(registrationView.queueStatus.includes('Technical work'), 'Queue identifies the remaining technical work');
check(registrationView.technicalStage === 'Awaiting approval', 'Registration does not silently approve technical work');
check(registeredWorkspace.nativeId === previousWorkspace.nativeId, 'Registration preserves native identity');
check(registeredWorkspace.implementedVersionId === previousWorkspace.implementedVersionId, 'Registration preserves implemented configuration');
check(registeredWorkspace.observedDate === previousWorkspace.observedDate, 'Registration preserves evidence age');
same(registered.data.principals, original.principals, 'Registration preserves platform observations');
same(registered.data.attestations, original.attestations, 'Registration preserves existing annual packets');
same(registered.data.reviews, original.reviews, 'Registration preserves existing review assignments');
check(applyDueRequests(registered.data, day) === registered.data, 'Repeated due processing returns the same data when nothing changes');
rejection(registered.data, approvalCommand, 'P3', 'Completed business registration cannot receive a new business decision');
const copiedReceiptDraft = executeHistoricalRequest(original, { type: 'save', draft: { ...registered.request, id: 'REQ-COPIED-RECEIPT', status: 'Draft' } }, context());
check(!copiedReceiptDraft.request.businessApplied && !copiedReceiptDraft.request.submittedAt, 'A new draft cannot inherit business or submission receipts from copied data');

// A recorded implementation is not verification, reconciliation, or source evidence.
rejection(registered.data, { type: 'implement', requestId: valid.id, reference: 'CHANGE', date: day }, 'P3', 'Technical work requires its approval');
const technicalApproved = approve(registered.data, valid.id, technicalPurpose);
check(requestView(technicalApproved.data, valid.id, day).technicalStage === 'Ready for implementation', 'Technical approval permits implementation');
rejection(technicalApproved.data, { type: 'verify', requestId: valid.id, reference: 'VERIFY', date: day }, 'P3', 'Verification requires recorded implementation');
rejection(technicalApproved.data, { type: 'implement', requestId: valid.id, reference: 'CHANGE', date: day }, 'P1', 'Business profiles cannot record technical implementation');
for (const date of ['2026-02-30', '2026-10-08', '2026-10-10']) {
  rejection(technicalApproved.data, { type: 'implement', requestId: valid.id, reference: 'CHANGE', date }, 'P3', 'Implementation rejects invalid, prior-request, or future date ' + date);
}
const implemented = executeHistoricalRequest(technicalApproved.data, { type: 'implement', requestId: valid.id, reference: ' CHANGE-1 ', date: day }, context('P3'));
check(implemented.request.execution?.implementationReference === 'CHANGE-1', 'Implementation trims its evidence reference');
check(requestView(implemented.data, valid.id, day).technicalStage === 'Awaiting verification', 'Implementation remains open until verification');
check(requestView(implemented.data, valid.id, day).contextKey === submittedView.contextKey, 'Implementation preserves approval context');
same(implemented.data.workspaces, technicalApproved.data.workspaces, 'Implementation receipt does not overwrite workspace evidence');
rejection(implemented.data, { type: 'verify', requestId: valid.id, reference: 'VERIFY', date: '2026-10-08' }, 'P3', 'Verification cannot predate implementation');
const verified = executeHistoricalRequest(implemented.data, { type: 'verify', requestId: valid.id, reference: 'VERIFY-1', date: day }, context('P3'));
check(requestView(verified.data, valid.id, day).technicalStage === 'Complete', 'Verification completes linked technical work');
check(!requestView(verified.data, valid.id, day).open, 'Fully completed registration leaves the open queue');
same(verified.data.principals, original.principals, 'Verification does not invent source observations');
rejection(verified.data, { type: 'verify', requestId: valid.id, reference: 'DUPLICATE', date: day }, 'P3', 'A completed technical receipt cannot be overwritten');

// Correction timing uses stored receipts and never rewrites previous intent.
const correctionRequired = approve(registered.data, valid.id, technicalPurpose, 'Changes required');
const correction = executeHistoricalRequest(correctionRequired.data, { type: 'correct', requestId: valid.id }, context());
check(correction.request.type === 'Update Existing', 'Correcting registered intent creates Update Existing');
check(correction.request.status === 'Draft', 'Correction is an editable draft');
check(correction.request.supersedesRequestId === valid.id, 'Correction links its original request');
check(correction.request.nativeWorkspaceId === valid.nativeWorkspaceId, 'Correction retains the native workspace identity');
check(!correction.request.execution && !correction.request.businessApplied && !correction.request.submittedAt, 'Correction has no copied execution, application, or submission receipt');
check(correction.request.createdDate === day && correction.request.effectiveDate === day, 'Correction uses the injected current calendar date');
same(correction.data.requests.find(record => record.id === valid.id), correctionRequired.data.requests.find(record => record.id === valid.id), 'Correction preserves the complete original record');
same(correction.data.workspaces, correctionRequired.data.workspaces, 'Correction draft does not reverse effective business responsibility');
check(requestView(correction.data, valid.id, day).stage === 'Superseded', 'Original request is superseded immediately');
rejection(correction.data, { type: 'correct', requestId: valid.id }, 'P1', 'A superseded request cannot receive a second correction');
rejection(correction.data, { ...approvalCommand, purpose: technicalPurpose, role: 'Platform Administrator', personId: 'P3' }, 'P3', 'A superseded request cannot receive a stale approval');
const correctedSubmission = executeHistoricalRequest(correction.data, { type: 'submit', draft: correction.request }, context());
check(requestView(correctedSubmission.data, correction.request.id, day).stage === 'Awaiting approval', 'Corrected intent requires fresh approvals');

// Future dates and delayed approvals determine when responsibility starts.
const futureDraft = draft(original, { effectiveDate: '2026-10-15' });
const futureSubmitted = executeHistoricalRequest(original, { type: 'submit', draft: futureDraft }, context());
const futureApproved = approve(futureSubmitted.data, futureDraft.id, businessPurpose);
check(requestView(futureApproved.data, futureDraft.id, day).stage === 'Awaiting effective date', 'Future approved assignment stays scheduled');
same(futureApproved.data.workspaces, original.workspaces, 'Scheduled assignment does not change the current owner');
check(applyDueRequests(futureApproved.data, '2026-10-14') === futureApproved.data, 'Due processing waits through the preceding date');
const due = applyDueRequests(futureApproved.data, '2026-10-15');
check(requestView(due, futureDraft.id, '2026-10-15').stage === 'Complete', 'Due processing applies an approved assignment on its effective date');
check(due.requests.find(record => record.id === futureDraft.id)?.businessApplied?.effectiveDate === '2026-10-15', 'Receipt retains the declared future date when later than approval');
check(applyDueRequests(due, '2026-10-16') === due, 'Later timer runs do not duplicate the assignment');
// Use a freshly approved command path; no manufactured approval receipt is needed.
const delayedDraft = draft(original, { createdDate: '2026-10-01', effectiveDate: '2026-10-02' });
const delayedSubmitted = executeHistoricalRequest(original, { type: 'submit', draft: delayedDraft }, context('P1', '2026-10-02T14:00:00Z'));
const delayedApproved = approve(delayedSubmitted.data, delayedDraft.id, businessPurpose, 'Approved', now);
check(delayedApproved.request.businessApplied?.effectiveDate === day, 'Late approval becomes the actual responsibility start date');
check(delayedApproved.request.businessApplied?.appliedAt === day, 'Business application uses the injected local date');
const eveningSubmitted = executeHistoricalRequest(original, { type: 'submit', draft: draft(original) }, context());
const eveningApproved = approve(eveningSubmitted.data, eveningSubmitted.request.id, businessPurpose, 'Approved', '2026-10-10T00:30:00Z');
check(eveningApproved.request.businessApplied?.effectiveDate === day, 'Approval after UTC midnight uses the New York calendar date');
check(eveningApproved.request.businessApplied?.appliedAt === day, 'Business application and approval agree on the local date');

// Unverified means unresolved, and routes to the Platform Manager without a false inactive claim.
const unresolvedDraft = draft(original, { ownerId: 'P15' });
const unresolved = executeHistoricalRequest(original, { type: 'submit', draft: unresolvedDraft }, context());
const unresolvedView = requestView(unresolved.data, unresolvedDraft.id, day);
check(unresolvedView.stage === 'Business information required', 'Unverified owner remains an explicit business issue');
check(unresolvedView.assignee === 'Platform Manager', 'Unresolved ownership routes to Platform Manager');
check(unresolvedView.correctionAvailable, 'Unresolved identity can be corrected through the request module');
check(!unresolved.request.businessApplied, 'Unverified ownership cannot silently become effective');
rejection(unresolved.data, { ...approvalCommand, requestId: unresolvedDraft.id, contextKey: unresolvedView.contextKey, personId: 'P15' }, 'P3', 'Unverified owner cannot provide current approval eligibility');

// Historical receipts survive later directory changes; new decisions still need eligibility.
const disabledAfterDecision = structuredClone(verified.data);
disabledAfterDecision.people = disabledAfterDecision.people.filter(person => person.id !== 'P4' && person.id !== 'P3');
check(requestView(disabledAfterDecision, valid.id, day).stage === 'Complete', 'Removing historical approvers does not reopen completed registration');
check(requestView(disabledAfterDecision, valid.id, day).technicalStage === 'Complete', 'Removing historical approvers does not invalidate technical receipts');
check(applyDueRequests(disabledAfterDecision, '2026-10-10') === disabledAfterDecision, 'Historical completed responsibility is not reapplied');
const legacyReceipts = structuredClone(verified.data);
legacyReceipts.approvals = legacyReceipts.approvals?.map(({ eligibilityEvidence: _legacy, ...receipt }) => receipt);
check(requestView(legacyReceipts, valid.id, day).stage === 'Complete', 'Legacy recorded approvals remain compatible without eligibility snapshots');
check(requestView(legacyReceipts, valid.id, day).technicalStage === 'Complete', 'Legacy technical approvals retain their historical effect');

// Custom and sensitive-data requirements remain in force, including eligible self-approval.
const customDraft = draft(original, { configuration: 'Custom', customReason: 'Other', customExplanation: 'Documented sample exception.', containsPii: 'Yes' });
const customSubmitted = executeHistoricalRequest(original, { type: 'submit', draft: customDraft }, context());
const businessApprovedCustom = approve(customSubmitted.data, customDraft.id, businessPurpose);
check(!businessApprovedCustom.request.businessApplied, 'Business approval alone cannot complete Custom registration');
const customApproved = approve(businessApprovedCustom.data, customDraft.id, 'Custom configuration');
check(requestView(customApproved.data, customDraft.id, day).stage === 'Complete', 'Eligible owner-role approval completes Custom business registration');
check(customApproved.data.approvals?.filter(receipt => receipt.personId === 'P4').length === 2, 'The same eligible person may approve both required roles');

// No-change registration can close without manufacturing technical work.
const noWorkData = fresh();
const noWorkWorkspace = noWorkData.workspaces.find(record => record.registryStatus === 'Discovered')!;
const existingGroups = requestGroupPurposes.map((purpose, index) => ({
  ...newRequestGroup(purpose, noWorkWorkspace.name),
  id: 'EXISTING-NO-WORK-' + index,
  configurationVersionId: noWorkWorkspace.implementedVersionId,
  mode: 'Existing' as const,
  groupId: 'DIRECTORY-NO-WORK-' + index,
  provisioningStatus: 'Provisioned',
}));
noWorkData.groups = [...noWorkData.groups.filter(group => group.configurationVersionId !== noWorkWorkspace.implementedVersionId), ...existingGroups];
const noWorkDraft = draft(noWorkData, { groups: existingGroups, technicalWorkRequired: false });
const noWorkSubmitted = executeHistoricalRequest(noWorkData, { type: 'submit', draft: noWorkDraft }, context());
const noWorkApproved = approve(noWorkSubmitted.data, noWorkDraft.id, businessPurpose);
const noWorkView = requestView(noWorkApproved.data, noWorkDraft.id, day);
check(noWorkView.stage === 'Complete', 'No-change registration completes after business approval');
check(noWorkView.technicalStage === 'Not required', 'No-change registration has no technical approval or delivery requirement');
check(!noWorkView.open && !noWorkView.hasOpenTechnicalWork, 'No-change registration leaves no extra technical queue item');

// Create New retains registry linking work after technical delivery completes.
const newDraft = draft(original, { type: 'Create New', workspaceId: '', nativeWorkspaceId: undefined, ownerId: 'P1', technicalName: 'MODULE_NEW_PROD', groups: requestGroupPurposes.map(purpose => newRequestGroup(purpose, 'MODULE_NEW_PROD')) });
const newSubmitted = executeHistoricalRequest(original, { type: 'submit', draft: newDraft }, context());
const newBusiness = approve(newSubmitted.data, newDraft.id, businessPurpose);
const newTechnical = approve(newBusiness.data, newDraft.id, technicalPurpose);
const newImplemented = executeHistoricalRequest(newTechnical.data, { type: 'implement', requestId: newDraft.id, reference: 'CHANGE-NEW', date: day }, context('P3'));
const newVerified = executeHistoricalRequest(newImplemented.data, { type: 'verify', requestId: newDraft.id, reference: 'VERIFY-NEW', date: day }, context('P3'));
const newView = requestView(newVerified.data, newDraft.id, day);
check(newView.stage === 'Complete' && newView.needsRegistryLink && newView.open, 'Verified Create New remains open until registry linking');
check(newView.queueStatus === 'Awaiting registry link', 'Create New has an explicit registry-link queue state');
same(newVerified.data.workspaces, original.workspaces, 'Create New commands do not fabricate a workspace identity');

console.log(`${count} workspace request module checks passed.`);
