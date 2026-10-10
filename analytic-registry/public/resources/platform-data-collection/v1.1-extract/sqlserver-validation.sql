-- Read-only validation. Any returned row is an issue; do not accept the delivery.
SET NOCOUNT ON;

SELECT N'Run_Context' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Run_Context] WHERE [RunKey] IS NULL;

SELECT N'Run_Context' AS Dataset, ImportRowID, N'Missing PlatformCode' AS Issue FROM ar11_stage.[Run_Context] WHERE [PlatformCode] IS NULL OR LTRIM(RTRIM([PlatformCode]))=N'';

SELECT N'Run_Context' AS Dataset, ImportRowID, N'Missing PlatformInstanceKey' AS Issue FROM ar11_stage.[Run_Context] WHERE [PlatformInstanceKey] IS NULL OR LTRIM(RTRIM([PlatformInstanceKey]))=N'';

SELECT N'Run_Context' AS Dataset, ImportRowID, N'Missing NativeScopeKey' AS Issue FROM ar11_stage.[Run_Context] WHERE [NativeScopeKey] IS NULL OR LTRIM(RTRIM([NativeScopeKey]))=N'';

SELECT N'Run_Context' AS Dataset, ImportRowID, N'Missing ObservedAt' AS Issue FROM ar11_stage.[Run_Context] WHERE [ObservedAt] IS NULL;

SELECT N'Run_Context' AS Dataset, ImportRowID, N'Missing MappingVersion' AS Issue FROM ar11_stage.[Run_Context] WHERE [MappingVersion] IS NULL OR LTRIM(RTRIM([MappingVersion]))=N'';

SELECT N'Run_Context' AS Dataset, ImportRowID, N'Missing ScopeDescription' AS Issue FROM ar11_stage.[Run_Context] WHERE [ScopeDescription] IS NULL OR LTRIM(RTRIM([ScopeDescription]))=N'';

SELECT N'Run_Context' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Run_Context] GROUP BY [RunKey] HAVING COUNT_BIG(*)>1;

SELECT N'Coverage' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Coverage] WHERE [RunKey] IS NULL;

SELECT N'Coverage' AS Dataset, ImportRowID, N'Missing DatasetCode' AS Issue FROM ar11_stage.[Coverage] WHERE [DatasetCode] IS NULL OR LTRIM(RTRIM([DatasetCode]))=N'';

SELECT N'Coverage' AS Dataset, ImportRowID, N'Missing CoverageStatus' AS Issue FROM ar11_stage.[Coverage] WHERE [CoverageStatus] IS NULL OR LTRIM(RTRIM([CoverageStatus]))=N'';

SELECT N'Coverage' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [DatasetCode], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Coverage] GROUP BY [RunKey], [DatasetCode] HAVING COUNT_BIG(*)>1;

SELECT N'Coverage' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Coverage] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'Workspaces' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Workspaces] WHERE [RunKey] IS NULL;

SELECT N'Workspaces' AS Dataset, ImportRowID, N'Missing NativeWorkspaceID' AS Issue FROM ar11_stage.[Workspaces] WHERE [NativeWorkspaceID] IS NULL OR LTRIM(RTRIM([NativeWorkspaceID]))=N'';

SELECT N'Workspaces' AS Dataset, ImportRowID, N'Missing NativeWorkspaceType' AS Issue FROM ar11_stage.[Workspaces] WHERE [NativeWorkspaceType] IS NULL OR LTRIM(RTRIM([NativeWorkspaceType]))=N'';

SELECT N'Workspaces' AS Dataset, ImportRowID, N'Missing DisplayName' AS Issue FROM ar11_stage.[Workspaces] WHERE [DisplayName] IS NULL OR LTRIM(RTRIM([DisplayName]))=N'';

SELECT N'Workspaces' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeWorkspaceID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Workspaces] GROUP BY [RunKey], [NativeWorkspaceID] HAVING COUNT_BIG(*)>1;

SELECT N'Workspaces' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Workspaces] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'Workspaces' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Workspaces' WHERE c.RunKey IS NULL;

SELECT N'Workspaces' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Workspaces] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Workspaces' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'Assets' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Assets] WHERE [RunKey] IS NULL;

SELECT N'Assets' AS Dataset, ImportRowID, N'Missing NativeAssetID' AS Issue FROM ar11_stage.[Assets] WHERE [NativeAssetID] IS NULL OR LTRIM(RTRIM([NativeAssetID]))=N'';

SELECT N'Assets' AS Dataset, ImportRowID, N'Missing NativeAssetType' AS Issue FROM ar11_stage.[Assets] WHERE [NativeAssetType] IS NULL OR LTRIM(RTRIM([NativeAssetType]))=N'';

SELECT N'Assets' AS Dataset, ImportRowID, N'Missing DisplayName' AS Issue FROM ar11_stage.[Assets] WHERE [DisplayName] IS NULL OR LTRIM(RTRIM([DisplayName]))=N'';

SELECT N'Assets' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeAssetType], [NativeAssetID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Assets] GROUP BY [RunKey], [NativeAssetType], [NativeAssetID] HAVING COUNT_BIG(*)>1;

SELECT N'Assets' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Assets] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'Assets' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Assets' WHERE c.RunKey IS NULL;

SELECT N'Assets' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Assets] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Assets' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'Workspace_Assets' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Workspace_Assets] WHERE [RunKey] IS NULL;

SELECT N'Workspace_Assets' AS Dataset, ImportRowID, N'Missing NativeWorkspaceID' AS Issue FROM ar11_stage.[Workspace_Assets] WHERE [NativeWorkspaceID] IS NULL OR LTRIM(RTRIM([NativeWorkspaceID]))=N'';

SELECT N'Workspace_Assets' AS Dataset, ImportRowID, N'Missing NativeAssetID' AS Issue FROM ar11_stage.[Workspace_Assets] WHERE [NativeAssetID] IS NULL OR LTRIM(RTRIM([NativeAssetID]))=N'';

SELECT N'Workspace_Assets' AS Dataset, ImportRowID, N'Missing NativeAssetType' AS Issue FROM ar11_stage.[Workspace_Assets] WHERE [NativeAssetType] IS NULL OR LTRIM(RTRIM([NativeAssetType]))=N'';

SELECT N'Workspace_Assets' AS Dataset, ImportRowID, N'Missing NativeAssociationType' AS Issue FROM ar11_stage.[Workspace_Assets] WHERE [NativeAssociationType] IS NULL OR LTRIM(RTRIM([NativeAssociationType]))=N'';

SELECT N'Workspace_Assets' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeWorkspaceID], [NativeAssetType], [NativeAssetID], [NativeAssociationType], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Workspace_Assets] GROUP BY [RunKey], [NativeWorkspaceID], [NativeAssetType], [NativeAssetID], [NativeAssociationType] HAVING COUNT_BIG(*)>1;

SELECT N'Workspace_Assets' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Workspace_Assets] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'Workspace_Assets' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Workspace_Assets' WHERE c.RunKey IS NULL;

SELECT N'Workspace_Assets' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Workspace_Assets] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Workspace_Assets' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'Connections' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Connections] WHERE [RunKey] IS NULL;

SELECT N'Connections' AS Dataset, ImportRowID, N'Missing NativeConnectionID' AS Issue FROM ar11_stage.[Connections] WHERE [NativeConnectionID] IS NULL OR LTRIM(RTRIM([NativeConnectionID]))=N'';

SELECT N'Connections' AS Dataset, ImportRowID, N'Missing TechnologyCode' AS Issue FROM ar11_stage.[Connections] WHERE [TechnologyCode] IS NULL OR LTRIM(RTRIM([TechnologyCode]))=N'';

SELECT N'Connections' AS Dataset, ImportRowID, N'Missing EvidenceStatusCode' AS Issue FROM ar11_stage.[Connections] WHERE [EvidenceStatusCode] IS NULL OR LTRIM(RTRIM([EvidenceStatusCode]))=N'';

SELECT N'Connections' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeConnectionID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Connections] GROUP BY [RunKey], [NativeConnectionID] HAVING COUNT_BIG(*)>1;

SELECT N'Connections' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Connections] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'Connections' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Connections' WHERE c.RunKey IS NULL;

SELECT N'Connections' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Connections] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Connections' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'Asset_Connections' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Asset_Connections] WHERE [RunKey] IS NULL;

SELECT N'Asset_Connections' AS Dataset, ImportRowID, N'Missing NativeAssetID' AS Issue FROM ar11_stage.[Asset_Connections] WHERE [NativeAssetID] IS NULL OR LTRIM(RTRIM([NativeAssetID]))=N'';

SELECT N'Asset_Connections' AS Dataset, ImportRowID, N'Missing NativeAssetType' AS Issue FROM ar11_stage.[Asset_Connections] WHERE [NativeAssetType] IS NULL OR LTRIM(RTRIM([NativeAssetType]))=N'';

SELECT N'Asset_Connections' AS Dataset, ImportRowID, N'Missing NativeConnectionID' AS Issue FROM ar11_stage.[Asset_Connections] WHERE [NativeConnectionID] IS NULL OR LTRIM(RTRIM([NativeConnectionID]))=N'';

SELECT N'Asset_Connections' AS Dataset, ImportRowID, N'Missing EvidenceStatusCode' AS Issue FROM ar11_stage.[Asset_Connections] WHERE [EvidenceStatusCode] IS NULL OR LTRIM(RTRIM([EvidenceStatusCode]))=N'';

SELECT N'Asset_Connections' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeAssetType], [NativeAssetID], [NativeConnectionID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Asset_Connections] GROUP BY [RunKey], [NativeAssetType], [NativeAssetID], [NativeConnectionID] HAVING COUNT_BIG(*)>1;

SELECT N'Asset_Connections' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Asset_Connections] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'Asset_Connections' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Asset_Connections' WHERE c.RunKey IS NULL;

SELECT N'Asset_Connections' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Asset_Connections] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Asset_Connections' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [RunKey] IS NULL;

SELECT N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing NativeAssetID' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [NativeAssetID] IS NULL OR LTRIM(RTRIM([NativeAssetID]))=N'';

SELECT N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing NativeAssetType' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [NativeAssetType] IS NULL OR LTRIM(RTRIM([NativeAssetType]))=N'';

SELECT N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing UpstreamNativeAssetID' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [UpstreamNativeAssetID] IS NULL OR LTRIM(RTRIM([UpstreamNativeAssetID]))=N'';

SELECT N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing UpstreamNativeAssetType' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [UpstreamNativeAssetType] IS NULL OR LTRIM(RTRIM([UpstreamNativeAssetType]))=N'';

SELECT N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing RelationshipCode' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [RelationshipCode] IS NULL OR LTRIM(RTRIM([RelationshipCode]))=N'';

SELECT N'Asset_Dependencies' AS Dataset, ImportRowID, N'Missing EvidenceStatusCode' AS Issue FROM ar11_stage.[Asset_Dependencies] WHERE [EvidenceStatusCode] IS NULL OR LTRIM(RTRIM([EvidenceStatusCode]))=N'';

SELECT N'Asset_Dependencies' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeAssetType], [NativeAssetID], [UpstreamNativeAssetType], [UpstreamNativeAssetID], [RelationshipCode], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Asset_Dependencies] GROUP BY [RunKey], [NativeAssetType], [NativeAssetID], [UpstreamNativeAssetType], [UpstreamNativeAssetID], [RelationshipCode] HAVING COUNT_BIG(*)>1;

SELECT N'Asset_Dependencies' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Asset_Dependencies] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'Asset_Dependencies' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Asset_Dependencies' WHERE c.RunKey IS NULL;

SELECT N'Asset_Dependencies' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Asset_Dependencies] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Asset_Dependencies' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'Platform_Users' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Platform_Users] WHERE [RunKey] IS NULL;

SELECT N'Platform_Users' AS Dataset, ImportRowID, N'Missing NativePrincipalID' AS Issue FROM ar11_stage.[Platform_Users] WHERE [NativePrincipalID] IS NULL OR LTRIM(RTRIM([NativePrincipalID]))=N'';

SELECT N'Platform_Users' AS Dataset, ImportRowID, N'Missing IdentifierNamespace' AS Issue FROM ar11_stage.[Platform_Users] WHERE [IdentifierNamespace] IS NULL OR LTRIM(RTRIM([IdentifierNamespace]))=N'';

SELECT N'Platform_Users' AS Dataset, ImportRowID, N'Missing PrincipalTypeCode' AS Issue FROM ar11_stage.[Platform_Users] WHERE [PrincipalTypeCode] IS NULL OR LTRIM(RTRIM([PrincipalTypeCode]))=N'';

SELECT N'Platform_Users' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [IdentifierNamespace], [NativePrincipalID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Platform_Users] GROUP BY [RunKey], [IdentifierNamespace], [NativePrincipalID] HAVING COUNT_BIG(*)>1;

SELECT N'Platform_Users' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Platform_Users] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'Platform_Users' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Platform_Users' WHERE c.RunKey IS NULL;

SELECT N'Platform_Users' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Platform_Users] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Platform_Users' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'Directory_Users' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Directory_Users] WHERE [RunKey] IS NULL;

SELECT N'Directory_Users' AS Dataset, ImportRowID, N'Missing DirectoryObjectID' AS Issue FROM ar11_stage.[Directory_Users] WHERE [DirectoryObjectID] IS NULL OR LTRIM(RTRIM([DirectoryObjectID]))=N'';

SELECT N'Directory_Users' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [DirectoryObjectID], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Directory_Users] GROUP BY [RunKey], [DirectoryObjectID] HAVING COUNT_BIG(*)>1;

SELECT N'Directory_Users' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Directory_Users] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'Directory_Users' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Directory_Users' WHERE c.RunKey IS NULL;

SELECT N'Directory_Users' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Directory_Users] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Directory_Users' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT N'Object_Users' AS Dataset, ImportRowID, N'Missing RunKey' AS Issue FROM ar11_stage.[Object_Users] WHERE [RunKey] IS NULL;

SELECT N'Object_Users' AS Dataset, ImportRowID, N'Missing NativeObjectType' AS Issue FROM ar11_stage.[Object_Users] WHERE [NativeObjectType] IS NULL OR LTRIM(RTRIM([NativeObjectType]))=N'';

SELECT N'Object_Users' AS Dataset, ImportRowID, N'Missing NativeObjectID' AS Issue FROM ar11_stage.[Object_Users] WHERE [NativeObjectID] IS NULL OR LTRIM(RTRIM([NativeObjectID]))=N'';

SELECT N'Object_Users' AS Dataset, ImportRowID, N'Missing PrincipalRoleCode' AS Issue FROM ar11_stage.[Object_Users] WHERE [PrincipalRoleCode] IS NULL OR LTRIM(RTRIM([PrincipalRoleCode]))=N'';


SELECT N'Object_Users' AS Dataset, ImportRowID, N'Missing SourceReferenceStatusCode' AS Issue FROM ar11_stage.[Object_Users] WHERE [SourceReferenceStatusCode] IS NULL OR LTRIM(RTRIM([SourceReferenceStatusCode]))=N'';

SELECT N'Object_Users' AS Dataset, N'Duplicate row key' AS Issue, [RunKey], [NativeObjectType], [NativeObjectID], [PrincipalRoleCode], [SourceReferenceNamespace], [SourcePrincipalReference], [NativeRole], COUNT_BIG(*) AS DuplicateCount FROM ar11_stage.[Object_Users] GROUP BY [RunKey], [NativeObjectType], [NativeObjectID], [PrincipalRoleCode], [SourceReferenceNamespace], [SourcePrincipalReference], [NativeRole] HAVING COUNT_BIG(*)>1;

SELECT N'Object_Users' AS Dataset, d.ImportRowID, N'Missing Run_Context' AS Issue FROM ar11_stage.[Object_Users] d LEFT JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.RunKey IS NULL;

SELECT N'Object_Users' AS Dataset, r.RunKey, N'Missing dataset coverage' AS Issue FROM ar11_stage.Run_Context r LEFT JOIN ar11_stage.Coverage c ON c.RunKey=r.RunKey AND c.DatasetCode=N'Object_Users' WHERE c.RunKey IS NULL;

SELECT N'Object_Users' AS Dataset,c.RunKey,N'Invalid coverage or row count' AS Issue FROM ar11_stage.Coverage c OUTER APPLY(SELECT COUNT_BIG(*) n FROM ar11_stage.[Object_Users] d WHERE d.RunKey=c.RunKey) x WHERE c.DatasetCode=N'Object_Users' AND (c.CoverageStatus NOT IN(N'Complete',N'Partial',N'NotCollected',N'Failed') OR (c.CoverageStatus=N'Complete' AND (c.RowCount IS NULL OR c.RowCount<>x.n)) OR (c.RowCount IS NOT NULL AND c.RowCount<>x.n) OR (c.CoverageStatus IN(N'Failed',N'NotCollected') AND (x.n<>0 OR c.RowCount IS NOT NULL)));

SELECT ImportRowID,N'Invalid platform/source code' AS Issue FROM ar11_stage.Run_Context WHERE PlatformCode NOT IN(N'PowerBI',N'Tableau',N'Alteryx',N'Directory');

SELECT ImportRowID,N'Wrong mapping version' AS Issue FROM ar11_stage.Run_Context WHERE MappingVersion<>N'1.1';

SELECT ImportRowID,N'Directory tenant required' AS Issue FROM ar11_stage.Run_Context WHERE PlatformCode=N'Directory' AND NULLIF(LTRIM(RTRIM(DirectoryTenantKey)),N'') IS NULL;

SELECT d.ImportRowID,N'Directory rows require a Directory run' AS Issue FROM ar11_stage.Directory_Users d JOIN ar11_stage.Run_Context r ON r.RunKey=d.RunKey WHERE r.PlatformCode<>N'Directory';

SELECT a.ImportRowID,N'Unresolved workspace membership' AS Issue FROM ar11_stage.Workspace_Assets a LEFT JOIN ar11_stage.Workspaces w ON w.RunKey=a.RunKey AND w.NativeWorkspaceID=a.NativeWorkspaceID LEFT JOIN ar11_stage.Assets b ON b.RunKey=a.RunKey AND b.NativeAssetID=a.NativeAssetID AND b.NativeAssetType=a.NativeAssetType WHERE w.ImportRowID IS NULL OR b.ImportRowID IS NULL;

SELECT a.ImportRowID,N'Unresolved asset connection' AS Issue FROM ar11_stage.Asset_Connections a LEFT JOIN ar11_stage.Assets b ON b.RunKey=a.RunKey AND b.NativeAssetID=a.NativeAssetID AND b.NativeAssetType=a.NativeAssetType LEFT JOIN ar11_stage.Connections c ON c.RunKey=a.RunKey AND c.NativeConnectionID=a.NativeConnectionID WHERE b.ImportRowID IS NULL OR c.ImportRowID IS NULL;

-- Dependency endpoints outside a delivered subset remain unresolved; they do not prove invalid source IDs.

SELECT a.ImportRowID,N'Unresolved dependency endpoint' AS Issue FROM ar11_stage.Asset_Dependencies a LEFT JOIN ar11_stage.Assets b ON b.RunKey=a.RunKey AND b.NativeAssetID=a.NativeAssetID AND b.NativeAssetType=a.NativeAssetType LEFT JOIN ar11_stage.Assets c ON c.RunKey=a.RunKey AND c.NativeAssetID=a.UpstreamNativeAssetID AND c.NativeAssetType=a.UpstreamNativeAssetType WHERE b.ImportRowID IS NULL OR c.ImportRowID IS NULL;

SELECT o.ImportRowID,N'Unresolved source account' AS Issue FROM ar11_stage.Object_Users o LEFT JOIN ar11_stage.Platform_Users p ON p.RunKey=o.RunKey AND p.NativePrincipalID=o.NativePrincipalID AND p.IdentifierNamespace=o.IdentifierNamespace WHERE p.ImportRowID IS NULL OR o.SourceReferenceStatusCode<>N'ReadyForEmailMatch';
