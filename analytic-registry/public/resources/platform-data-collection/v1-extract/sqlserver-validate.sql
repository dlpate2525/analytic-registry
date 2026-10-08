-- Read-only staging validation. No production records are changed.
-- Set existing delivery keys; run after loading populated tables only.
DECLARE @PlatformRunKey uniqueidentifier = NULL;
DECLARE @DirectoryRunKey uniqueidentifier = NULL;
IF @PlatformRunKey IS NULL OR @DirectoryRunKey IS NULL
 THROW 50002, 'Set the existing platform and directory delivery keys.', 1;
-- One row per issue. All issues route to the same owner.
SELECT TableName,StageRowID,N'Platform Manager' AS ReviewOwner,ReviewReason
FROM (
SELECT N'Workspaces' AS TableName,StageRowID,N'Missing required RunKey' AS ReviewReason
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [RunKey] IS NULL
UNION ALL
SELECT N'Workspaces' AS TableName,StageRowID,N'Missing required PlatformCode' AS ReviewReason
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformCode])),N'') IS NULL
UNION ALL
SELECT N'Workspaces' AS TableName,StageRowID,N'Missing required PlatformInstanceKey' AS ReviewReason
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformInstanceKey])),N'') IS NULL
UNION ALL
SELECT N'Workspaces' AS TableName,StageRowID,N'Missing required NativeScopeKey' AS ReviewReason
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeScopeKey])),N'') IS NULL
UNION ALL
SELECT N'Workspaces' AS TableName,StageRowID,N'Missing required ObservedAt' AS ReviewReason
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [ObservedAt] IS NULL
UNION ALL
SELECT N'Workspaces' AS TableName,StageRowID,N'Missing required NativeWorkspaceID' AS ReviewReason
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeWorkspaceID])),N'') IS NULL
UNION ALL
SELECT N'Workspaces' AS TableName,StageRowID,N'Missing required NativeWorkspaceType' AS ReviewReason
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeWorkspaceType])),N'') IS NULL
UNION ALL
SELECT N'Workspaces' AS TableName,StageRowID,N'Missing required DisplayName' AS ReviewReason
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([DisplayName])),N'') IS NULL
UNION ALL
SELECT N'Workspaces',StageRowID,N'Duplicate source key'
FROM (SELECT StageRowID,COUNT(*) OVER(PARTITION BY [RunKey],[PlatformCode],[PlatformInstanceKey],[NativeScopeKey],[NativeWorkspaceType],[NativeWorkspaceID]) AS n
 FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)) d WHERE n>1
UNION ALL
SELECT N'Workspaces',StageRowID,N'Boundary whitespace in PlatformCode'
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformCode])<>DATALENGTH(LTRIM(RTRIM([PlatformCode])) )
UNION ALL
SELECT N'Workspaces',StageRowID,N'Boundary whitespace in PlatformInstanceKey'
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformInstanceKey])<>DATALENGTH(LTRIM(RTRIM([PlatformInstanceKey])) )
UNION ALL
SELECT N'Workspaces',StageRowID,N'Boundary whitespace in NativeScopeKey'
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeScopeKey])<>DATALENGTH(LTRIM(RTRIM([NativeScopeKey])) )
UNION ALL
SELECT N'Workspaces',StageRowID,N'Boundary whitespace in NativeWorkspaceID'
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeWorkspaceID])<>DATALENGTH(LTRIM(RTRIM([NativeWorkspaceID])) )
UNION ALL
SELECT N'Workspaces',StageRowID,N'Boundary whitespace in NativeRepositoryID'
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeRepositoryID])<>DATALENGTH(LTRIM(RTRIM([NativeRepositoryID])) )
UNION ALL
SELECT N'Workspaces',StageRowID,N'Boundary whitespace in NativeOwnerID'
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeOwnerID])<>DATALENGTH(LTRIM(RTRIM([NativeOwnerID])) )
UNION ALL
SELECT N'Workspaces',StageRowID,N'Boundary whitespace in CapacityKey'
FROM RegistryExtractV1.[Workspaces] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([CapacityKey])<>DATALENGTH(LTRIM(RTRIM([CapacityKey])) )
UNION ALL
SELECT N'Assets' AS TableName,StageRowID,N'Missing required RunKey' AS ReviewReason
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [RunKey] IS NULL
UNION ALL
SELECT N'Assets' AS TableName,StageRowID,N'Missing required PlatformCode' AS ReviewReason
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformCode])),N'') IS NULL
UNION ALL
SELECT N'Assets' AS TableName,StageRowID,N'Missing required PlatformInstanceKey' AS ReviewReason
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformInstanceKey])),N'') IS NULL
UNION ALL
SELECT N'Assets' AS TableName,StageRowID,N'Missing required NativeScopeKey' AS ReviewReason
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeScopeKey])),N'') IS NULL
UNION ALL
SELECT N'Assets' AS TableName,StageRowID,N'Missing required ObservedAt' AS ReviewReason
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [ObservedAt] IS NULL
UNION ALL
SELECT N'Assets' AS TableName,StageRowID,N'Missing required NativeAssetID' AS ReviewReason
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeAssetID])),N'') IS NULL
UNION ALL
SELECT N'Assets' AS TableName,StageRowID,N'Missing required NativeAssetType' AS ReviewReason
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeAssetType])),N'') IS NULL
UNION ALL
SELECT N'Assets' AS TableName,StageRowID,N'Missing required AssetTypeCode' AS ReviewReason
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([AssetTypeCode])),N'') IS NULL
UNION ALL
SELECT N'Assets' AS TableName,StageRowID,N'Missing required DisplayName' AS ReviewReason
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([DisplayName])),N'') IS NULL
UNION ALL
SELECT N'Assets',StageRowID,N'Duplicate source key'
FROM (SELECT StageRowID,COUNT(*) OVER(PARTITION BY [RunKey],[PlatformCode],[PlatformInstanceKey],[NativeScopeKey],[NativeAssetType],[NativeAssetID]) AS n
 FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)) d WHERE n>1
UNION ALL
SELECT N'Assets',StageRowID,N'Boundary whitespace in PlatformCode'
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformCode])<>DATALENGTH(LTRIM(RTRIM([PlatformCode])) )
UNION ALL
SELECT N'Assets',StageRowID,N'Boundary whitespace in PlatformInstanceKey'
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformInstanceKey])<>DATALENGTH(LTRIM(RTRIM([PlatformInstanceKey])) )
UNION ALL
SELECT N'Assets',StageRowID,N'Boundary whitespace in NativeScopeKey'
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeScopeKey])<>DATALENGTH(LTRIM(RTRIM([NativeScopeKey])) )
UNION ALL
SELECT N'Assets',StageRowID,N'Boundary whitespace in NativeAssetID'
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeAssetID])<>DATALENGTH(LTRIM(RTRIM([NativeAssetID])) )
UNION ALL
SELECT N'Assets',StageRowID,N'Boundary whitespace in NativeRepositoryID'
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeRepositoryID])<>DATALENGTH(LTRIM(RTRIM([NativeRepositoryID])) )
UNION ALL
SELECT N'Assets',StageRowID,N'Boundary whitespace in CreatedByNativeID'
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([CreatedByNativeID])<>DATALENGTH(LTRIM(RTRIM([CreatedByNativeID])) )
UNION ALL
SELECT N'Assets',StageRowID,N'Boundary whitespace in ModifiedByNativeID'
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([ModifiedByNativeID])<>DATALENGTH(LTRIM(RTRIM([ModifiedByNativeID])) )
UNION ALL
SELECT N'Assets',StageRowID,N'Boundary whitespace in NativeOwnerID'
FROM RegistryExtractV1.[Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeOwnerID])<>DATALENGTH(LTRIM(RTRIM([NativeOwnerID])) )
UNION ALL
SELECT N'Workspace_Assets' AS TableName,StageRowID,N'Missing required RunKey' AS ReviewReason
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [RunKey] IS NULL
UNION ALL
SELECT N'Workspace_Assets' AS TableName,StageRowID,N'Missing required PlatformCode' AS ReviewReason
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformCode])),N'') IS NULL
UNION ALL
SELECT N'Workspace_Assets' AS TableName,StageRowID,N'Missing required PlatformInstanceKey' AS ReviewReason
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformInstanceKey])),N'') IS NULL
UNION ALL
SELECT N'Workspace_Assets' AS TableName,StageRowID,N'Missing required NativeScopeKey' AS ReviewReason
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeScopeKey])),N'') IS NULL
UNION ALL
SELECT N'Workspace_Assets' AS TableName,StageRowID,N'Missing required ObservedAt' AS ReviewReason
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [ObservedAt] IS NULL
UNION ALL
SELECT N'Workspace_Assets' AS TableName,StageRowID,N'Missing required NativeWorkspaceID' AS ReviewReason
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeWorkspaceID])),N'') IS NULL
UNION ALL
SELECT N'Workspace_Assets' AS TableName,StageRowID,N'Missing required NativeAssetID' AS ReviewReason
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeAssetID])),N'') IS NULL
UNION ALL
SELECT N'Workspace_Assets' AS TableName,StageRowID,N'Missing required NativeAssetType' AS ReviewReason
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeAssetType])),N'') IS NULL
UNION ALL
SELECT N'Workspace_Assets' AS TableName,StageRowID,N'Missing required NativeAssociationType' AS ReviewReason
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeAssociationType])),N'') IS NULL
UNION ALL
SELECT N'Workspace_Assets',StageRowID,N'Duplicate source key'
FROM (SELECT StageRowID,COUNT(*) OVER(PARTITION BY [RunKey],[PlatformCode],[PlatformInstanceKey],[NativeScopeKey],[NativeWorkspaceID],[NativeAssetType],[NativeAssetID],[NativeAssociationType]) AS n
 FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)) d WHERE n>1
UNION ALL
SELECT N'Workspace_Assets',StageRowID,N'Boundary whitespace in PlatformCode'
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformCode])<>DATALENGTH(LTRIM(RTRIM([PlatformCode])) )
UNION ALL
SELECT N'Workspace_Assets',StageRowID,N'Boundary whitespace in PlatformInstanceKey'
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformInstanceKey])<>DATALENGTH(LTRIM(RTRIM([PlatformInstanceKey])) )
UNION ALL
SELECT N'Workspace_Assets',StageRowID,N'Boundary whitespace in NativeScopeKey'
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeScopeKey])<>DATALENGTH(LTRIM(RTRIM([NativeScopeKey])) )
UNION ALL
SELECT N'Workspace_Assets',StageRowID,N'Boundary whitespace in NativeWorkspaceID'
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeWorkspaceID])<>DATALENGTH(LTRIM(RTRIM([NativeWorkspaceID])) )
UNION ALL
SELECT N'Workspace_Assets',StageRowID,N'Boundary whitespace in NativeAssetID'
FROM RegistryExtractV1.[Workspace_Assets] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeAssetID])<>DATALENGTH(LTRIM(RTRIM([NativeAssetID])) )
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required RunKey' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [RunKey] IS NULL
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required PlatformCode' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformCode])),N'') IS NULL
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required PlatformInstanceKey' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformInstanceKey])),N'') IS NULL
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required NativeScopeKey' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeScopeKey])),N'') IS NULL
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required ObservedAt' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [ObservedAt] IS NULL
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required NativeConnectionID' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeConnectionID])),N'') IS NULL
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required NativeConnectionType' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeConnectionType])),N'') IS NULL
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required DisplayName' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([DisplayName])),N'') IS NULL
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required TechnologyCode' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([TechnologyCode])),N'') IS NULL
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required IdentityClassificationCode' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([IdentityClassificationCode])),N'') IS NULL
UNION ALL
SELECT N'Connections' AS TableName,StageRowID,N'Missing required EvidenceStatusCode' AS ReviewReason
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([EvidenceStatusCode])),N'') IS NULL
UNION ALL
SELECT N'Connections',StageRowID,N'Duplicate source key'
FROM (SELECT StageRowID,COUNT(*) OVER(PARTITION BY [RunKey],[PlatformCode],[PlatformInstanceKey],[NativeScopeKey],[NativeConnectionType],[NativeConnectionID]) AS n
 FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)) d WHERE n>1
UNION ALL
SELECT N'Connections',StageRowID,N'Boundary whitespace in PlatformCode'
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformCode])<>DATALENGTH(LTRIM(RTRIM([PlatformCode])) )
UNION ALL
SELECT N'Connections',StageRowID,N'Boundary whitespace in PlatformInstanceKey'
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformInstanceKey])<>DATALENGTH(LTRIM(RTRIM([PlatformInstanceKey])) )
UNION ALL
SELECT N'Connections',StageRowID,N'Boundary whitespace in NativeScopeKey'
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeScopeKey])<>DATALENGTH(LTRIM(RTRIM([NativeScopeKey])) )
UNION ALL
SELECT N'Connections',StageRowID,N'Boundary whitespace in NativeConnectionID'
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeConnectionID])<>DATALENGTH(LTRIM(RTRIM([NativeConnectionID])) )
UNION ALL
SELECT N'Connections',StageRowID,N'Boundary whitespace in NativeRepositoryID'
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeRepositoryID])<>DATALENGTH(LTRIM(RTRIM([NativeRepositoryID])) )
UNION ALL
SELECT N'Connections',StageRowID,N'Boundary whitespace in GatewayID'
FROM RegistryExtractV1.[Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([GatewayID])<>DATALENGTH(LTRIM(RTRIM([GatewayID])) )
UNION ALL
SELECT N'Asset_Connections' AS TableName,StageRowID,N'Missing required RunKey' AS ReviewReason
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [RunKey] IS NULL
UNION ALL
SELECT N'Asset_Connections' AS TableName,StageRowID,N'Missing required PlatformCode' AS ReviewReason
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformCode])),N'') IS NULL
UNION ALL
SELECT N'Asset_Connections' AS TableName,StageRowID,N'Missing required PlatformInstanceKey' AS ReviewReason
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformInstanceKey])),N'') IS NULL
UNION ALL
SELECT N'Asset_Connections' AS TableName,StageRowID,N'Missing required NativeScopeKey' AS ReviewReason
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeScopeKey])),N'') IS NULL
UNION ALL
SELECT N'Asset_Connections' AS TableName,StageRowID,N'Missing required ObservedAt' AS ReviewReason
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [ObservedAt] IS NULL
UNION ALL
SELECT N'Asset_Connections' AS TableName,StageRowID,N'Missing required NativeAssetID' AS ReviewReason
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeAssetID])),N'') IS NULL
UNION ALL
SELECT N'Asset_Connections' AS TableName,StageRowID,N'Missing required NativeAssetType' AS ReviewReason
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeAssetType])),N'') IS NULL
UNION ALL
SELECT N'Asset_Connections' AS TableName,StageRowID,N'Missing required NativeConnectionID' AS ReviewReason
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeConnectionID])),N'') IS NULL
UNION ALL
SELECT N'Asset_Connections' AS TableName,StageRowID,N'Missing required EvidenceStatusCode' AS ReviewReason
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([EvidenceStatusCode])),N'') IS NULL
UNION ALL
SELECT N'Asset_Connections',StageRowID,N'Duplicate source key'
FROM (SELECT StageRowID,COUNT(*) OVER(PARTITION BY [RunKey],[PlatformCode],[PlatformInstanceKey],[NativeScopeKey],[NativeAssetType],[NativeAssetID],[NativeConnectionID]) AS n
 FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)) d WHERE n>1
UNION ALL
SELECT N'Asset_Connections',StageRowID,N'Boundary whitespace in PlatformCode'
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformCode])<>DATALENGTH(LTRIM(RTRIM([PlatformCode])) )
UNION ALL
SELECT N'Asset_Connections',StageRowID,N'Boundary whitespace in PlatformInstanceKey'
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformInstanceKey])<>DATALENGTH(LTRIM(RTRIM([PlatformInstanceKey])) )
UNION ALL
SELECT N'Asset_Connections',StageRowID,N'Boundary whitespace in NativeScopeKey'
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeScopeKey])<>DATALENGTH(LTRIM(RTRIM([NativeScopeKey])) )
UNION ALL
SELECT N'Asset_Connections',StageRowID,N'Boundary whitespace in NativeAssetID'
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeAssetID])<>DATALENGTH(LTRIM(RTRIM([NativeAssetID])) )
UNION ALL
SELECT N'Asset_Connections',StageRowID,N'Boundary whitespace in NativeConnectionID'
FROM RegistryExtractV1.[Asset_Connections] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeConnectionID])<>DATALENGTH(LTRIM(RTRIM([NativeConnectionID])) )
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required RunKey' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [RunKey] IS NULL
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required PlatformCode' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformCode])),N'') IS NULL
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required PlatformInstanceKey' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformInstanceKey])),N'') IS NULL
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required NativeScopeKey' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeScopeKey])),N'') IS NULL
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required ObservedAt' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [ObservedAt] IS NULL
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required NativeAssetID' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeAssetID])),N'') IS NULL
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required NativeAssetType' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeAssetType])),N'') IS NULL
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required UpstreamNativeAssetID' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([UpstreamNativeAssetID])),N'') IS NULL
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required UpstreamNativeAssetType' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([UpstreamNativeAssetType])),N'') IS NULL
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required RelationshipCode' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([RelationshipCode])),N'') IS NULL
UNION ALL
SELECT N'Asset_Dependencies' AS TableName,StageRowID,N'Missing required EvidenceStatusCode' AS ReviewReason
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([EvidenceStatusCode])),N'') IS NULL
UNION ALL
SELECT N'Asset_Dependencies',StageRowID,N'Duplicate source key'
FROM (SELECT StageRowID,COUNT(*) OVER(PARTITION BY [RunKey],[PlatformCode],[PlatformInstanceKey],[NativeScopeKey],[NativeAssetType],[NativeAssetID],[UpstreamNativeAssetType],[UpstreamNativeAssetID],[RelationshipCode]) AS n
 FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)) d WHERE n>1
UNION ALL
SELECT N'Asset_Dependencies',StageRowID,N'Boundary whitespace in PlatformCode'
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformCode])<>DATALENGTH(LTRIM(RTRIM([PlatformCode])) )
UNION ALL
SELECT N'Asset_Dependencies',StageRowID,N'Boundary whitespace in PlatformInstanceKey'
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformInstanceKey])<>DATALENGTH(LTRIM(RTRIM([PlatformInstanceKey])) )
UNION ALL
SELECT N'Asset_Dependencies',StageRowID,N'Boundary whitespace in NativeScopeKey'
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeScopeKey])<>DATALENGTH(LTRIM(RTRIM([NativeScopeKey])) )
UNION ALL
SELECT N'Asset_Dependencies',StageRowID,N'Boundary whitespace in NativeAssetID'
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeAssetID])<>DATALENGTH(LTRIM(RTRIM([NativeAssetID])) )
UNION ALL
SELECT N'Asset_Dependencies',StageRowID,N'Boundary whitespace in UpstreamNativeAssetID'
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([UpstreamNativeAssetID])<>DATALENGTH(LTRIM(RTRIM([UpstreamNativeAssetID])) )
UNION ALL
SELECT N'Asset_Dependencies',StageRowID,N'Boundary whitespace in UpstreamNativeWorkspaceID'
FROM RegistryExtractV1.[Asset_Dependencies] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([UpstreamNativeWorkspaceID])<>DATALENGTH(LTRIM(RTRIM([UpstreamNativeWorkspaceID])) )
UNION ALL
SELECT N'Platform_Users' AS TableName,StageRowID,N'Missing required RunKey' AS ReviewReason
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [RunKey] IS NULL
UNION ALL
SELECT N'Platform_Users' AS TableName,StageRowID,N'Missing required PlatformCode' AS ReviewReason
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformCode])),N'') IS NULL
UNION ALL
SELECT N'Platform_Users' AS TableName,StageRowID,N'Missing required PlatformInstanceKey' AS ReviewReason
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformInstanceKey])),N'') IS NULL
UNION ALL
SELECT N'Platform_Users' AS TableName,StageRowID,N'Missing required NativeScopeKey' AS ReviewReason
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeScopeKey])),N'') IS NULL
UNION ALL
SELECT N'Platform_Users' AS TableName,StageRowID,N'Missing required ObservedAt' AS ReviewReason
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [ObservedAt] IS NULL
UNION ALL
SELECT N'Platform_Users' AS TableName,StageRowID,N'Missing required NativePrincipalID' AS ReviewReason
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativePrincipalID])),N'') IS NULL
UNION ALL
SELECT N'Platform_Users' AS TableName,StageRowID,N'Missing required IdentifierNamespace' AS ReviewReason
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([IdentifierNamespace])),N'') IS NULL
UNION ALL
SELECT N'Platform_Users' AS TableName,StageRowID,N'Missing required PrincipalTypeCode' AS ReviewReason
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PrincipalTypeCode])),N'') IS NULL
UNION ALL
SELECT N'Platform_Users' AS TableName,StageRowID,N'Missing required DirectoryTenantKey' AS ReviewReason
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([DirectoryTenantKey])),N'') IS NULL
UNION ALL
SELECT N'Platform_Users',StageRowID,N'Duplicate source key'
FROM (SELECT StageRowID,COUNT(*) OVER(PARTITION BY [RunKey],[PlatformCode],[PlatformInstanceKey],[NativeScopeKey],[IdentifierNamespace],[NativePrincipalID]) AS n
 FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)) d WHERE n>1
UNION ALL
SELECT N'Platform_Users',StageRowID,N'Boundary whitespace in PlatformCode'
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformCode])<>DATALENGTH(LTRIM(RTRIM([PlatformCode])) )
UNION ALL
SELECT N'Platform_Users',StageRowID,N'Boundary whitespace in PlatformInstanceKey'
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformInstanceKey])<>DATALENGTH(LTRIM(RTRIM([PlatformInstanceKey])) )
UNION ALL
SELECT N'Platform_Users',StageRowID,N'Boundary whitespace in NativeScopeKey'
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeScopeKey])<>DATALENGTH(LTRIM(RTRIM([NativeScopeKey])) )
UNION ALL
SELECT N'Platform_Users',StageRowID,N'Boundary whitespace in NativePrincipalID'
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativePrincipalID])<>DATALENGTH(LTRIM(RTRIM([NativePrincipalID])) )
UNION ALL
SELECT N'Platform_Users',StageRowID,N'Boundary whitespace in IdentifierNamespace'
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([IdentifierNamespace])<>DATALENGTH(LTRIM(RTRIM([IdentifierNamespace])) )
UNION ALL
SELECT N'Platform_Users',StageRowID,N'Boundary whitespace in SourceDirectoryObjectID'
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([SourceDirectoryObjectID])<>DATALENGTH(LTRIM(RTRIM([SourceDirectoryObjectID])) )
UNION ALL
SELECT N'Platform_Users',StageRowID,N'Boundary whitespace in DirectoryTenantKey'
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([DirectoryTenantKey])<>DATALENGTH(LTRIM(RTRIM([DirectoryTenantKey])) )
UNION ALL
SELECT N'Platform_Users',StageRowID,N'Boundary whitespace in NativeRepositoryID'
FROM RegistryExtractV1.[Platform_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeRepositoryID])<>DATALENGTH(LTRIM(RTRIM([NativeRepositoryID])) )
UNION ALL
SELECT N'Directory_Users' AS TableName,StageRowID,N'Missing required RunKey' AS ReviewReason
FROM RegistryExtractV1.[Directory_Users] WHERE (RunKey=@DirectoryRunKey OR RunKey IS NULL) AND [RunKey] IS NULL
UNION ALL
SELECT N'Directory_Users' AS TableName,StageRowID,N'Missing required DirectoryTenantKey' AS ReviewReason
FROM RegistryExtractV1.[Directory_Users] WHERE (RunKey=@DirectoryRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([DirectoryTenantKey])),N'') IS NULL
UNION ALL
SELECT N'Directory_Users' AS TableName,StageRowID,N'Missing required DirectoryObjectID' AS ReviewReason
FROM RegistryExtractV1.[Directory_Users] WHERE (RunKey=@DirectoryRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([DirectoryObjectID])),N'') IS NULL
UNION ALL
SELECT N'Directory_Users' AS TableName,StageRowID,N'Missing required ObservedAt' AS ReviewReason
FROM RegistryExtractV1.[Directory_Users] WHERE (RunKey=@DirectoryRunKey OR RunKey IS NULL) AND [ObservedAt] IS NULL
UNION ALL
SELECT N'Directory_Users',StageRowID,N'Duplicate source key'
FROM (SELECT StageRowID,COUNT(*) OVER(PARTITION BY [RunKey],[DirectoryTenantKey],[DirectoryObjectID]) AS n
 FROM RegistryExtractV1.[Directory_Users] WHERE (RunKey=@DirectoryRunKey OR RunKey IS NULL)) d WHERE n>1
UNION ALL
SELECT N'Directory_Users',StageRowID,N'Boundary whitespace in DirectoryTenantKey'
FROM RegistryExtractV1.[Directory_Users] WHERE (RunKey=@DirectoryRunKey OR RunKey IS NULL)
 AND DATALENGTH([DirectoryTenantKey])<>DATALENGTH(LTRIM(RTRIM([DirectoryTenantKey])) )
UNION ALL
SELECT N'Directory_Users',StageRowID,N'Boundary whitespace in DirectoryObjectID'
FROM RegistryExtractV1.[Directory_Users] WHERE (RunKey=@DirectoryRunKey OR RunKey IS NULL)
 AND DATALENGTH([DirectoryObjectID])<>DATALENGTH(LTRIM(RTRIM([DirectoryObjectID])) )
UNION ALL
SELECT N'Object_Users' AS TableName,StageRowID,N'Missing required RunKey' AS ReviewReason
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [RunKey] IS NULL
UNION ALL
SELECT N'Object_Users' AS TableName,StageRowID,N'Missing required PlatformCode' AS ReviewReason
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformCode])),N'') IS NULL
UNION ALL
SELECT N'Object_Users' AS TableName,StageRowID,N'Missing required PlatformInstanceKey' AS ReviewReason
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PlatformInstanceKey])),N'') IS NULL
UNION ALL
SELECT N'Object_Users' AS TableName,StageRowID,N'Missing required NativeScopeKey' AS ReviewReason
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeScopeKey])),N'') IS NULL
UNION ALL
SELECT N'Object_Users' AS TableName,StageRowID,N'Missing required ObservedAt' AS ReviewReason
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND [ObservedAt] IS NULL
UNION ALL
SELECT N'Object_Users' AS TableName,StageRowID,N'Missing required NativeObjectType' AS ReviewReason
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeObjectType])),N'') IS NULL
UNION ALL
SELECT N'Object_Users' AS TableName,StageRowID,N'Missing required NativeObjectID' AS ReviewReason
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([NativeObjectID])),N'') IS NULL
UNION ALL
SELECT N'Object_Users' AS TableName,StageRowID,N'Missing required PrincipalRoleCode' AS ReviewReason
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([PrincipalRoleCode])),N'') IS NULL
UNION ALL
SELECT N'Object_Users' AS TableName,StageRowID,N'Missing required SourceReferenceStatusCode' AS ReviewReason
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL) AND NULLIF(LTRIM(RTRIM([SourceReferenceStatusCode])),N'') IS NULL
UNION ALL
SELECT N'Object_Users',StageRowID,N'Duplicate source key'
FROM (SELECT StageRowID,COUNT(*) OVER(PARTITION BY [RunKey],[PlatformCode],[PlatformInstanceKey],[NativeScopeKey],[NativeObjectType],[NativeObjectID],[PrincipalRoleCode],[SourceReferenceNamespace],[SourcePrincipalReference],[NativeRole]) AS n
 FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)) d WHERE n>1
UNION ALL
SELECT N'Object_Users',StageRowID,N'Boundary whitespace in PlatformCode'
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformCode])<>DATALENGTH(LTRIM(RTRIM([PlatformCode])) )
UNION ALL
SELECT N'Object_Users',StageRowID,N'Boundary whitespace in PlatformInstanceKey'
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([PlatformInstanceKey])<>DATALENGTH(LTRIM(RTRIM([PlatformInstanceKey])) )
UNION ALL
SELECT N'Object_Users',StageRowID,N'Boundary whitespace in NativeScopeKey'
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeScopeKey])<>DATALENGTH(LTRIM(RTRIM([NativeScopeKey])) )
UNION ALL
SELECT N'Object_Users',StageRowID,N'Boundary whitespace in NativeObjectID'
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativeObjectID])<>DATALENGTH(LTRIM(RTRIM([NativeObjectID])) )
UNION ALL
SELECT N'Object_Users',StageRowID,N'Boundary whitespace in NativePrincipalID'
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([NativePrincipalID])<>DATALENGTH(LTRIM(RTRIM([NativePrincipalID])) )
UNION ALL
SELECT N'Object_Users',StageRowID,N'Boundary whitespace in IdentifierNamespace'
FROM RegistryExtractV1.[Object_Users] WHERE (RunKey=@PlatformRunKey OR RunKey IS NULL)
 AND DATALENGTH([IdentifierNamespace])<>DATALENGTH(LTRIM(RTRIM([IdentifierNamespace])) )
UNION ALL
SELECT N'Workspace_Assets',c.StageRowID,N'Missing Assets reference: NativeAssetID'
FROM RegistryExtractV1.[Workspace_Assets] c WHERE c.RunKey=@PlatformRunKey
 AND NOT EXISTS(SELECT 1 FROM RegistryExtractV1.[Assets] p WHERE p.[RunKey]=c.[RunKey] AND p.[PlatformCode]=c.[PlatformCode] AND p.[PlatformInstanceKey]=c.[PlatformInstanceKey] AND p.[NativeScopeKey]=c.[NativeScopeKey] AND p.[NativeAssetID]=c.[NativeAssetID] AND p.[NativeAssetType]=c.[NativeAssetType])
UNION ALL
SELECT N'Workspace_Assets',c.StageRowID,N'Missing Workspaces reference: NativeWorkspaceID'
FROM RegistryExtractV1.[Workspace_Assets] c WHERE c.RunKey=@PlatformRunKey
 AND NOT EXISTS(SELECT 1 FROM RegistryExtractV1.[Workspaces] p WHERE p.[RunKey]=c.[RunKey] AND p.[PlatformCode]=c.[PlatformCode] AND p.[PlatformInstanceKey]=c.[PlatformInstanceKey] AND p.[NativeScopeKey]=c.[NativeScopeKey] AND p.[NativeWorkspaceID]=c.[NativeWorkspaceID])
UNION ALL
SELECT N'Asset_Connections',c.StageRowID,N'Missing Assets reference: NativeAssetID'
FROM RegistryExtractV1.[Asset_Connections] c WHERE c.RunKey=@PlatformRunKey
 AND NOT EXISTS(SELECT 1 FROM RegistryExtractV1.[Assets] p WHERE p.[RunKey]=c.[RunKey] AND p.[PlatformCode]=c.[PlatformCode] AND p.[PlatformInstanceKey]=c.[PlatformInstanceKey] AND p.[NativeScopeKey]=c.[NativeScopeKey] AND p.[NativeAssetID]=c.[NativeAssetID] AND p.[NativeAssetType]=c.[NativeAssetType])
UNION ALL
SELECT N'Asset_Connections',c.StageRowID,N'Missing Connections reference: NativeConnectionID'
FROM RegistryExtractV1.[Asset_Connections] c WHERE c.RunKey=@PlatformRunKey
 AND NOT EXISTS(SELECT 1 FROM RegistryExtractV1.[Connections] p WHERE p.[RunKey]=c.[RunKey] AND p.[PlatformCode]=c.[PlatformCode] AND p.[PlatformInstanceKey]=c.[PlatformInstanceKey] AND p.[NativeScopeKey]=c.[NativeScopeKey] AND p.[NativeConnectionID]=c.[NativeConnectionID])
UNION ALL
SELECT N'Asset_Dependencies',c.StageRowID,N'Missing Assets reference: NativeAssetID'
FROM RegistryExtractV1.[Asset_Dependencies] c WHERE c.RunKey=@PlatformRunKey
 AND NOT EXISTS(SELECT 1 FROM RegistryExtractV1.[Assets] p WHERE p.[RunKey]=c.[RunKey] AND p.[PlatformCode]=c.[PlatformCode] AND p.[PlatformInstanceKey]=c.[PlatformInstanceKey] AND p.[NativeScopeKey]=c.[NativeScopeKey] AND p.[NativeAssetID]=c.[NativeAssetID] AND p.[NativeAssetType]=c.[NativeAssetType])
UNION ALL
SELECT N'Asset_Dependencies',c.StageRowID,N'Missing Assets reference: UpstreamNativeAssetID'
FROM RegistryExtractV1.[Asset_Dependencies] c WHERE c.RunKey=@PlatformRunKey
 AND NOT EXISTS(SELECT 1 FROM RegistryExtractV1.[Assets] p WHERE p.[RunKey]=c.[RunKey] AND p.[PlatformCode]=c.[PlatformCode] AND p.[PlatformInstanceKey]=c.[PlatformInstanceKey] AND p.[NativeScopeKey]=c.[NativeScopeKey] AND p.[NativeAssetID]=c.[UpstreamNativeAssetID] AND p.[NativeAssetType]=c.[UpstreamNativeAssetType])
) issues ORDER BY TableName,StageRowID,ReviewReason;
