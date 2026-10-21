-- Read-only diagnostics for the whole staged delivery. This script does not accept or load records.
-- BlocksDelivery = 1: structural error. Correct and resubmit the whole delivery; keep all rows.
-- BlocksDelivery = 0: valid unresolved reference. Retain its raw key and assign Platform Manager.
-- The registry operator may accept only when no BlocksDelivery = 1 row exists in any result set.
-- Partial / NotCollected / Failed coverage does not block structurally valid deliveries.
-- Acceptance does not establish control readiness. Never selectively accept datasets or drop rows.
-- Inspect every result set. Use a staging batch isolated from previously accepted deliveries.
SET NOCOUNT ON;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner,
    N'Run_Context' AS Dataset, N'No delivery context supplied' AS Issue
WHERE NOT EXISTS (SELECT 1 FROM ar11_stage.Run_Context);

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Run_Context' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Run_Context] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Run_Context' AS Dataset, ImportRowID, N'Missing PlatformCode' AS Issue FROM ar11_stage.[Run_Context] WHERE [PlatformCode] IS NULL OR LTRIM(RTRIM([PlatformCode]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Run_Context' AS Dataset, ImportRowID, N'Missing PlatformInstanceKey' AS Issue FROM ar11_stage.[Run_Context] WHERE [PlatformInstanceKey] IS NULL OR LTRIM(RTRIM([PlatformInstanceKey]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Run_Context' AS Dataset, ImportRowID, N'Missing NativeScopeKey' AS Issue FROM ar11_stage.[Run_Context] WHERE [NativeScopeKey] IS NULL OR LTRIM(RTRIM([NativeScopeKey]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Run_Context' AS Dataset, ImportRowID, N'Missing ObservedAt' AS Issue FROM ar11_stage.[Run_Context] WHERE [ObservedAt] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Run_Context' AS Dataset, ImportRowID, N'Missing MappingVersion' AS Issue FROM ar11_stage.[Run_Context] WHERE [MappingVersion] IS NULL OR LTRIM(RTRIM([MappingVersion]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Run_Context' AS Dataset, ImportRowID, N'Missing ScopeDescription' AS Issue FROM ar11_stage.[Run_Context] WHERE [ScopeDescription] IS NULL OR LTRIM(RTRIM([ScopeDescription]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Run_Context' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Run_Context] GROUP BY [RunKey] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Coverage' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Coverage] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Coverage' AS Dataset, ImportRowID, N'Missing DatasetCode' AS Issue FROM ar11_stage.[Coverage] WHERE [DatasetCode] IS NULL OR LTRIM(RTRIM([DatasetCode]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Coverage' AS Dataset, ImportRowID, N'Missing CoverageStatus' AS Issue FROM ar11_stage.[Coverage] WHERE [CoverageStatus] IS NULL OR LTRIM(RTRIM([CoverageStatus]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Coverage' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [DatasetCode], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Coverage] GROUP BY [RunKey], [DatasetCode] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Coverage' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Coverage] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspaces' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Workspaces] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspaces' AS Dataset, ImportRowID, N'Missing NativeWorkspaceID' AS Issue FROM ar11_stage.[Workspaces] WHERE [NativeWorkspaceID] IS NULL OR LTRIM(RTRIM([NativeWorkspaceID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspaces' AS Dataset, ImportRowID, N'Missing NativeWorkspaceType' AS Issue FROM ar11_stage.[Workspaces] WHERE [NativeWorkspaceType] IS NULL OR LTRIM(RTRIM([NativeWorkspaceType]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspaces' AS Dataset, ImportRowID, N'Missing DisplayName' AS Issue FROM ar11_stage.[Workspaces] WHERE [DisplayName] IS NULL OR LTRIM(RTRIM([DisplayName]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspaces' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeWorkspaceID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Workspaces] GROUP BY [RunKey], [NativeWorkspaceID] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspaces' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Workspaces] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspaces' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Workspaces' WHERE c.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspaces' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Workspaces] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Workspaces' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Assets' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Assets] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Assets' AS Dataset, ImportRowID, N'Missing NativeAssetID' AS Issue FROM ar11_stage.[Assets] WHERE [NativeAssetID] IS NULL OR LTRIM(RTRIM([NativeAssetID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Assets' AS Dataset, ImportRowID, N'Missing NativeAssetType' AS Issue FROM ar11_stage.[Assets] WHERE [NativeAssetType] IS NULL OR LTRIM(RTRIM([NativeAssetType]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Assets' AS Dataset, ImportRowID, N'Missing DisplayName' AS Issue FROM ar11_stage.[Assets] WHERE [DisplayName] IS NULL OR LTRIM(RTRIM([DisplayName]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Assets' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeAssetType], [NativeAssetID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Assets] GROUP BY [RunKey], [NativeAssetType], [NativeAssetID] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Assets' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Assets] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Assets' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Assets' WHERE c.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Assets' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Assets] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Assets' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspace_Assets' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Workspace_Assets] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspace_Assets' AS Dataset, ImportRowID, N'Missing NativeWorkspaceID' AS Issue FROM ar11_stage.[Workspace_Assets] WHERE [NativeWorkspaceID] IS NULL OR LTRIM(RTRIM([NativeWorkspaceID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspace_Assets' AS Dataset, ImportRowID, N'Missing NativeAssetID' AS Issue FROM ar11_stage.[Workspace_Assets] WHERE [NativeAssetID] IS NULL OR LTRIM(RTRIM([NativeAssetID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspace_Assets' AS Dataset, ImportRowID, N'Missing NativeAssetType' AS Issue FROM ar11_stage.[Workspace_Assets] WHERE [NativeAssetType] IS NULL OR LTRIM(RTRIM([NativeAssetType]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspace_Assets' AS Dataset, ImportRowID, N'Missing NativeAssociationType' AS Issue FROM ar11_stage.[Workspace_Assets] WHERE [NativeAssociationType] IS NULL OR LTRIM(RTRIM([NativeAssociationType]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspace_Assets' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeWorkspaceID], [NativeAssetType], [NativeAssetID], [NativeAssociationType], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Workspace_Assets] GROUP BY [RunKey], [NativeWorkspaceID], [NativeAssetType], [NativeAssetID], [NativeAssociationType] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspace_Assets' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Workspace_Assets] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspace_Assets' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Workspace_Assets' WHERE c.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Workspace_Assets' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Workspace_Assets] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Workspace_Assets' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Connections' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Connections] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Connections' AS Dataset, ImportRowID, N'Missing NativeConnectionID' AS Issue FROM ar11_stage.[Connections] WHERE [NativeConnectionID] IS NULL OR LTRIM(RTRIM([NativeConnectionID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Connections' AS Dataset, ImportRowID, N'Missing TechnologyCode' AS Issue FROM ar11_stage.[Connections] WHERE [TechnologyCode] IS NULL OR LTRIM(RTRIM([TechnologyCode]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Connections' AS Dataset, ImportRowID, N'Missing EvidenceStatusCode' AS Issue FROM ar11_stage.[Connections] WHERE [EvidenceStatusCode] IS NULL OR LTRIM(RTRIM([EvidenceStatusCode]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Connections' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeConnectionID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Connections] GROUP BY [RunKey], [NativeConnectionID] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Connections' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Connections] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Connections' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Connections' WHERE c.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Connections' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Connections] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Connections' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Connections' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Asset_Connections] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Connections' AS Dataset, ImportRowID, N'Missing NativeAssetID' AS Issue FROM ar11_stage.[Asset_Connections] WHERE [NativeAssetID] IS NULL OR LTRIM(RTRIM([NativeAssetID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Connections' AS Dataset, ImportRowID, N'Missing NativeAssetType' AS Issue FROM ar11_stage.[Asset_Connections] WHERE [NativeAssetType] IS NULL OR LTRIM(RTRIM([NativeAssetType]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Connections' AS Dataset, ImportRowID, N'Missing NativeConnectionID' AS Issue FROM ar11_stage.[Asset_Connections] WHERE [NativeConnectionID] IS NULL OR LTRIM(RTRIM([NativeConnectionID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Connections' AS Dataset, ImportRowID, N'Missing EvidenceStatusCode' AS Issue FROM ar11_stage.[Asset_Connections] WHERE [EvidenceStatusCode] IS NULL OR LTRIM(RTRIM([EvidenceStatusCode]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Connections' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeAssetType], [NativeAssetID], [NativeConnectionID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Asset_Connections] GROUP BY [RunKey], [NativeAssetType], [NativeAssetID], [NativeConnectionID] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Connections' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Asset_Connections] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Connections' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Asset_Connections' WHERE c.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Connections' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Asset_Connections] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Asset_Connections' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing NativeAssetID' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [NativeAssetID] IS NULL OR LTRIM(RTRIM([NativeAssetID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing NativeAssetType' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [NativeAssetType] IS NULL OR LTRIM(RTRIM([NativeAssetType]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing UpstreamNativeAssetID' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [UpstreamNativeAssetID] IS NULL OR LTRIM(RTRIM([UpstreamNativeAssetID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing UpstreamNativeAssetType' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [UpstreamNativeAssetType] IS NULL OR LTRIM(RTRIM([UpstreamNativeAssetType]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing RelationshipCode' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [RelationshipCode] IS NULL OR LTRIM(RTRIM([RelationshipCode]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing EvidenceStatusCode' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [EvidenceStatusCode] IS NULL OR LTRIM(RTRIM([EvidenceStatusCode]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeAssetType], [NativeAssetID], [UpstreamNativeAssetType], [UpstreamNativeAssetID], [RelationshipCode], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Asset_Dependencies] GROUP BY [RunKey], [NativeAssetType], [NativeAssetID], [UpstreamNativeAssetType], [UpstreamNativeAssetID], [RelationshipCode] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Asset_Dependencies] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Asset_Dependencies' WHERE c.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Asset_Dependencies' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Asset_Dependencies] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Asset_Dependencies' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Platform_Users' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Platform_Users] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Platform_Users' AS Dataset, ImportRowID, N'Missing NativePrincipalID' AS Issue FROM ar11_stage.[Platform_Users] WHERE [NativePrincipalID] IS NULL OR LTRIM(RTRIM([NativePrincipalID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Platform_Users' AS Dataset, ImportRowID, N'Missing IdentifierNamespace' AS Issue FROM ar11_stage.[Platform_Users] WHERE [IdentifierNamespace] IS NULL OR LTRIM(RTRIM([IdentifierNamespace]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Platform_Users' AS Dataset, ImportRowID, N'Missing PrincipalTypeCode' AS Issue FROM ar11_stage.[Platform_Users] WHERE [PrincipalTypeCode] IS NULL OR LTRIM(RTRIM([PrincipalTypeCode]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Platform_Users' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [IdentifierNamespace], [NativePrincipalID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Platform_Users] GROUP BY [RunKey], [IdentifierNamespace], [NativePrincipalID] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Platform_Users' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Platform_Users] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Platform_Users' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Platform_Users' WHERE c.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Platform_Users' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Platform_Users] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Platform_Users' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Directory_Users' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Directory_Users] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Directory_Users' AS Dataset, ImportRowID, N'Missing DirectoryObjectID' AS Issue FROM ar11_stage.[Directory_Users] WHERE [DirectoryObjectID] IS NULL OR LTRIM(RTRIM([DirectoryObjectID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Directory_Users' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [DirectoryObjectID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Directory_Users] GROUP BY [RunKey], [DirectoryObjectID] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Directory_Users' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Directory_Users] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Directory_Users' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Directory_Users' WHERE c.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Directory_Users' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Directory_Users] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Directory_Users' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Object_Users' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Object_Users] WHERE [RunKey] IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Object_Users' AS Dataset, ImportRowID, N'Missing NativeObjectType' AS Issue FROM ar11_stage.[Object_Users] WHERE [NativeObjectType] IS NULL OR LTRIM(RTRIM([NativeObjectType]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Object_Users' AS Dataset, ImportRowID, N'Missing NativeObjectID' AS Issue FROM ar11_stage.[Object_Users] WHERE [NativeObjectID] IS NULL OR LTRIM(RTRIM([NativeObjectID]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Object_Users' AS Dataset, ImportRowID, N'Missing PrincipalRoleCode' AS Issue FROM ar11_stage.[Object_Users] WHERE [PrincipalRoleCode] IS NULL OR LTRIM(RTRIM([PrincipalRoleCode]))=N'';


SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Object_Users' AS Dataset, ImportRowID, N'Missing SourceReferenceStatusCode' AS Issue FROM ar11_stage.[Object_Users] WHERE [SourceReferenceStatusCode] IS NULL OR LTRIM(RTRIM([SourceReferenceStatusCode]))=N'';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Object_Users' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeObjectType], [NativeObjectID], [PrincipalRoleCode], [SourceReferenceNamespace], [SourcePrincipalReference], [NativeRole], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Object_Users] GROUP BY [RunKey], [NativeObjectType], [NativeObjectID], [PrincipalRoleCode], [SourceReferenceNamespace], [SourcePrincipalReference], [NativeRole] HAVING COUNT_BIG(*)>1;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Object_Users' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Object_Users] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Object_Users' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Object_Users' WHERE c.RunKey IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, N'Object_Users' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Object_Users] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Object_Users' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, ImportRowID,N'Invalid platform/source code' AS Issue FROM ar11_stage.Run_Context WHERE PlatformCode NOT IN(N'PowerBI',N'Tableau',N'Alteryx',N'Directory');

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, ImportRowID,N'Wrong mapping version' AS Issue FROM ar11_stage.Run_Context WHERE MappingVersion<>N'1.1';

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, ImportRowID,N'Directory tenant required' AS Issue FROM ar11_stage.Run_Context WHERE PlatformCode=N'Directory' AND NULLIF(LTRIM(RTRIM(DirectoryTenantKey)),N'') IS NULL;

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner, d.ImportRowID,N'Directory rows require a Directory run' AS Issue FROM ar11_stage.Directory_Users d JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.PlatformCode<>N'Directory';

-- Directory is a companion source, not a platform inventory namespace.
-- Keep the offending rows in staging and block the whole delivery.
SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner,
    d.Dataset, d.ImportRowID, d.RunKey, N'Platform rows cannot use a Directory run' AS Issue
FROM (
    SELECT N'Workspaces' AS Dataset, ImportRowID, RunKey FROM ar11_stage.Workspaces
    UNION ALL SELECT N'Assets', ImportRowID, RunKey FROM ar11_stage.Assets
    UNION ALL SELECT N'Workspace_Assets', ImportRowID, RunKey FROM ar11_stage.Workspace_Assets
    UNION ALL SELECT N'Connections', ImportRowID, RunKey FROM ar11_stage.Connections
    UNION ALL SELECT N'Asset_Connections', ImportRowID, RunKey FROM ar11_stage.Asset_Connections
    UNION ALL SELECT N'Asset_Dependencies', ImportRowID, RunKey FROM ar11_stage.Asset_Dependencies
    UNION ALL SELECT N'Platform_Users', ImportRowID, RunKey FROM ar11_stage.Platform_Users
    UNION ALL SELECT N'Object_Users', ImportRowID, RunKey FROM ar11_stage.Object_Users
) d
JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey
WHERE r.PlatformCode=N'Directory';

-- Mapping 1.1 closes the inventory and workspace-membership asset namespaces.
-- A display classification such as SemanticModel or AnalyticApp is not its identity namespace.
-- Supplemental dependency references remain separate; a missing endpoint is not a structural error.
SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner,
    d.Dataset, d.ImportRowID, d.RunKey, d.NativeAssetType, r.PlatformCode,
    N'Unsupported native asset type for platform' AS Issue
FROM (
    SELECT N'Assets' AS Dataset, ImportRowID, RunKey, NativeAssetType FROM ar11_stage.Assets
    UNION ALL SELECT N'Workspace_Assets', ImportRowID, RunKey, NativeAssetType FROM ar11_stage.Workspace_Assets
) d
JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey
WHERE r.PlatformCode IN(N'PowerBI',N'Tableau',N'Alteryx')
    AND (
        NOT (
            (r.PlatformCode=N'PowerBI' AND d.NativeAssetType IN(N'Report',N'Dataset'))
            OR (r.PlatformCode=N'Tableau' AND d.NativeAssetType IN(N'Workbook',N'PublishedDatasource'))
            OR (r.PlatformCode=N'Alteryx' AND d.NativeAssetType=N'Workflow')
        )
        OR DATALENGTH(d.NativeAssetType)<>DATALENGTH(RTRIM(d.NativeAssetType))
    );

-- Partial counts describe delivered rows, not complete source inventory.
-- Per-dataset diagnostics above verify every supplied count against the staged rows.
SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner,
    DatasetCode AS Dataset, ImportRowID, RunKey, N'Invalid coverage or row count' AS Issue
FROM ar11_stage.Coverage
WHERE CoverageStatus=N'Partial' AND RowCount IS NULL;

-- Unknown codes are structural errors, not a way to bypass a required coverage or reference rule.
SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner,
    N'Coverage' AS Dataset, ImportRowID, N'Unknown dataset code' AS Issue
FROM ar11_stage.Coverage
WHERE DatasetCode NOT IN (N'Workspaces',N'Assets',N'Workspace_Assets',N'Connections',N'Asset_Connections',N'Asset_Dependencies',N'Platform_Users',N'Directory_Users',N'Object_Users');

SELECT N'StructuralError' AS IssueClass, CAST(1 AS bit) AS BlocksDelivery, CAST(NULL AS nvarchar(40)) AS FollowUpOwner,
    N'Object_Users' AS Dataset, ImportRowID, N'Unknown source reference status' AS Issue
FROM ar11_stage.Object_Users
WHERE SourceReferenceStatusCode NOT IN (N'ReadyForEmailMatch',N'MissingEmail',N'MissingSourceReference',N'UnresolvedUserReference',N'UnverifiedMapping');

-- Follow-up diagnostics: missing endpoints can reflect a valid partial delivery.
-- FollowUpKey is a scoped, length-prefixed tuple. It excludes delivery IDs, names, and SourceEmail/Mail attributes.
-- A source's native principal reference remains verbatim, even when the source uses an email-shaped identifier.
-- DATALENGTH preserves trailing spaces and distinguishes NULL (-1) from empty (0).
-- Workspace subtypes use the stable Workspace namespace; asset types keep their own namespaces.
-- Upsert one case by FollowUpKey; attach RunKey as occurrence evidence. Retain the original rows.
SELECT N'UnresolvedReference' AS IssueClass, CAST(0 AS bit) AS BlocksDelivery, N'Platform Manager' AS FollowUpOwner,
    N'Workspace_Assets' AS Dataset, a.ImportRowID, a.RunKey,
    CONCAT(CAST(N'Case:v1|WorkspaceMembershipEndpoint' AS nvarchar(max)), N'|', COALESCE(DATALENGTH(r.PlatformCode),-1), N':', r.PlatformCode, N'|', COALESCE(DATALENGTH(r.PlatformInstanceKey),-1), N':', r.PlatformInstanceKey, N'|', COALESCE(DATALENGTH(r.NativeScopeKey),-1), N':', r.NativeScopeKey, N'|', COALESCE(DATALENGTH(a.NativeWorkspaceID),-1), N':', a.NativeWorkspaceID, N'|', COALESCE(DATALENGTH(a.NativeAssetType),-1), N':', a.NativeAssetType, N'|', COALESCE(DATALENGTH(a.NativeAssetID),-1), N':', a.NativeAssetID, N'|', COALESCE(DATALENGTH(a.NativeAssociationType),-1), N':', a.NativeAssociationType) AS FollowUpKey,
    N'Unresolved workspace membership' AS Issue
FROM ar11_stage.Workspace_Assets a
LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=a.RunKey
LEFT JOIN ar11_stage.Workspaces w ON w.RunKey=a.RunKey AND w.NativeWorkspaceID=a.NativeWorkspaceID
LEFT JOIN ar11_stage.Assets b ON b.RunKey=a.RunKey AND b.NativeAssetID=a.NativeAssetID AND b.NativeAssetType=a.NativeAssetType
WHERE w.ImportRowID IS NULL OR b.ImportRowID IS NULL;

SELECT N'UnresolvedReference' AS IssueClass, CAST(0 AS bit) AS BlocksDelivery, N'Platform Manager' AS FollowUpOwner,
    N'Asset_Connections' AS Dataset, a.ImportRowID, a.RunKey,
    CONCAT(CAST(N'Case:v1|AssetConnectionEndpoint' AS nvarchar(max)), N'|', COALESCE(DATALENGTH(r.PlatformCode),-1), N':', r.PlatformCode, N'|', COALESCE(DATALENGTH(r.PlatformInstanceKey),-1), N':', r.PlatformInstanceKey, N'|', COALESCE(DATALENGTH(r.NativeScopeKey),-1), N':', r.NativeScopeKey, N'|', COALESCE(DATALENGTH(a.NativeAssetType),-1), N':', a.NativeAssetType, N'|', COALESCE(DATALENGTH(a.NativeAssetID),-1), N':', a.NativeAssetID, N'|', COALESCE(DATALENGTH(a.NativeConnectionID),-1), N':', a.NativeConnectionID) AS FollowUpKey,
    N'Unresolved asset connection' AS Issue
FROM ar11_stage.Asset_Connections a
LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=a.RunKey
LEFT JOIN ar11_stage.Assets b ON b.RunKey=a.RunKey AND b.NativeAssetID=a.NativeAssetID AND b.NativeAssetType=a.NativeAssetType
LEFT JOIN ar11_stage.Connections c ON c.RunKey=a.RunKey AND c.NativeConnectionID=a.NativeConnectionID
WHERE b.ImportRowID IS NULL OR c.ImportRowID IS NULL;

SELECT N'UnresolvedReference' AS IssueClass, CAST(0 AS bit) AS BlocksDelivery, N'Platform Manager' AS FollowUpOwner,
    N'Asset_Dependencies' AS Dataset, a.ImportRowID, a.RunKey,
    CONCAT(CAST(N'Case:v1|DependencyEndpoint' AS nvarchar(max)), N'|', COALESCE(DATALENGTH(r.PlatformCode),-1), N':', r.PlatformCode, N'|', COALESCE(DATALENGTH(r.PlatformInstanceKey),-1), N':', r.PlatformInstanceKey, N'|', COALESCE(DATALENGTH(r.NativeScopeKey),-1), N':', r.NativeScopeKey, N'|', COALESCE(DATALENGTH(a.NativeAssetType),-1), N':', a.NativeAssetType, N'|', COALESCE(DATALENGTH(a.NativeAssetID),-1), N':', a.NativeAssetID, N'|', COALESCE(DATALENGTH(a.UpstreamNativeAssetType),-1), N':', a.UpstreamNativeAssetType, N'|', COALESCE(DATALENGTH(a.UpstreamNativeAssetID),-1), N':', a.UpstreamNativeAssetID, N'|', COALESCE(DATALENGTH(a.RelationshipCode),-1), N':', a.RelationshipCode) AS FollowUpKey,
    N'Unresolved dependency endpoint' AS Issue
FROM ar11_stage.Asset_Dependencies a
LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=a.RunKey
LEFT JOIN ar11_stage.Assets b ON b.RunKey=a.RunKey AND b.NativeAssetID=a.NativeAssetID AND b.NativeAssetType=a.NativeAssetType
LEFT JOIN ar11_stage.Assets c ON c.RunKey=a.RunKey AND c.NativeAssetID=a.UpstreamNativeAssetID AND c.NativeAssetType=a.UpstreamNativeAssetType
WHERE b.ImportRowID IS NULL OR c.ImportRowID IS NULL;

SELECT N'UnresolvedReference' AS IssueClass, CAST(0 AS bit) AS BlocksDelivery, N'Platform Manager' AS FollowUpOwner,
    N'Object_Users' AS Dataset, o.ImportRowID, o.RunKey,
    CONCAT(CAST(N'Case:v1|SourceAccountReference' AS nvarchar(max)), N'|', COALESCE(DATALENGTH(r.PlatformCode),-1), N':', r.PlatformCode, N'|', COALESCE(DATALENGTH(r.PlatformInstanceKey),-1), N':', r.PlatformInstanceKey, N'|', COALESCE(DATALENGTH(r.NativeScopeKey),-1), N':', r.NativeScopeKey, N'|', COALESCE(DATALENGTH(CASE WHEN o.NativeObjectType IN (N'Workspace',N'PersonalGroup',N'Project',N'Collection') THEN N'Workspace' ELSE o.NativeObjectType END),-1), N':', CASE WHEN o.NativeObjectType IN (N'Workspace',N'PersonalGroup',N'Project',N'Collection') THEN N'Workspace' ELSE o.NativeObjectType END, N'|', COALESCE(DATALENGTH(o.NativeObjectID),-1), N':', o.NativeObjectID, N'|', COALESCE(DATALENGTH(o.PrincipalRoleCode),-1), N':', o.PrincipalRoleCode, N'|', COALESCE(DATALENGTH(o.SourceReferenceNamespace),-1), N':', o.SourceReferenceNamespace, N'|', COALESCE(DATALENGTH(o.SourcePrincipalReference),-1), N':', o.SourcePrincipalReference, N'|', COALESCE(DATALENGTH(o.NativeRole),-1), N':', o.NativeRole) AS FollowUpKey,
    N'Unresolved source account' AS Issue
FROM ar11_stage.Object_Users o
LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=o.RunKey
LEFT JOIN ar11_stage.Platform_Users p ON p.RunKey=o.RunKey AND p.NativePrincipalID=o.NativePrincipalID AND p.IdentifierNamespace=o.IdentifierNamespace
WHERE p.ImportRowID IS NULL OR o.SourceReferenceStatusCode<>N'ReadyForEmailMatch' OR NULLIF(LTRIM(RTRIM(p.SourceEmail)),N'') IS NULL;

SELECT N'UnresolvedReference' AS IssueClass, CAST(0 AS bit) AS BlocksDelivery, N'Platform Manager' AS FollowUpOwner,
    N'Object_Users' AS Dataset, o.ImportRowID, o.RunKey,
    CONCAT(CAST(N'Case:v1|ObjectPrincipalEndpoint' AS nvarchar(max)), N'|', COALESCE(DATALENGTH(r.PlatformCode),-1), N':', r.PlatformCode, N'|', COALESCE(DATALENGTH(r.PlatformInstanceKey),-1), N':', r.PlatformInstanceKey, N'|', COALESCE(DATALENGTH(r.NativeScopeKey),-1), N':', r.NativeScopeKey, N'|', COALESCE(DATALENGTH(CASE WHEN o.NativeObjectType IN (N'Workspace',N'PersonalGroup',N'Project',N'Collection') THEN N'Workspace' ELSE o.NativeObjectType END),-1), N':', CASE WHEN o.NativeObjectType IN (N'Workspace',N'PersonalGroup',N'Project',N'Collection') THEN N'Workspace' ELSE o.NativeObjectType END, N'|', COALESCE(DATALENGTH(o.NativeObjectID),-1), N':', o.NativeObjectID) AS FollowUpKey,
    N'Unresolved object endpoint' AS Issue
FROM ar11_stage.Object_Users o
LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=o.RunKey

WHERE NOT EXISTS (SELECT 1 FROM ar11_stage.Workspaces w WHERE w.RunKey=o.RunKey AND w.NativeWorkspaceID=o.NativeObjectID AND o.NativeObjectType IN (N'Workspace',N'PersonalGroup',N'Project',N'Collection'))
  AND NOT EXISTS (SELECT 1 FROM ar11_stage.Assets a WHERE a.RunKey=o.RunKey AND a.NativeAssetID=o.NativeObjectID AND a.NativeAssetType=o.NativeObjectType);
