/** Evidence supported by the V1.1 minimum contract, not a claim of deployed detection. */
export const foundationCoverage=[
 {risk:'Orphan / ownership',status:'Partial',inputs:'Workspace and asset inventory, membership, source accounts, directory evidence.',gap:'Approved business accountability is still needed. Missing membership in a partial extract is not proof of an orphan.'},
 {risk:'Access risk / privilege sprawl',status:'Partial',inputs:'Explicit source role rows where collected; approved group and access specifications.',gap:'Tableau and Alteryx core queries do not establish complete effective permissions or nested directory membership.'},
 {risk:'Compliance gap / bypassed gate',status:'Manual Review Required',inputs:'Declarations, assessments, release evidence, request and approval records.',gap:'Inventory does not prove policy compliance, promotion timing, or approved exceptions.'},
 {risk:'Credential exposure',status:'Unable to Verify',inputs:'Connection metadata can identify where to investigate.',gap:'Unknown identity/authentication fields do not prove exposure or safety. Alteryx workflow connections are not collected.'},
 {risk:'Stale / low adoption',status:'Not Available',inputs:'Not part of the monthly minimum contract.',gap:'Needs usage events, measurement window, coverage, and expected business cadence. Modified time is not usage.'},
 {risk:'Performance / concentration',status:'Not Available',inputs:'Not part of the monthly minimum contract.',gap:'Needs platform runtime, capacity/resource facts, measurement windows, and approved thresholds.'},
 {risk:'Champion coverage',status:'Partial',inputs:'Declared Champions plus directory account evidence.',gap:'Native group memberships and directory resolution must be verified. Unresolved never means inactive.'},
];
