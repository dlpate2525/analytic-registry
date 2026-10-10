-- V1.1 manual landing tables; run in your chosen SQL Server database.
-- No production registry writes. Native identifiers retain case-sensitive text.
SET NOCOUNT ON;
IF SCHEMA_ID(N'ar11_stage') IS NULL EXEC(N'CREATE SCHEMA ar11_stage');
GO

IF OBJECT_ID(N'ar11_stage.Run_Context', N'U') IS NULL
CREATE TABLE ar11_stage.[Run_Context] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [PlatformCode] nvarchar(30) COLLATE Latin1_General_100_BIN2 NULL,
    [PlatformInstanceKey] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeScopeKey] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [ObservedAt] datetimeoffset(7) NULL,
    [DirectoryTenantKey] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [MappingVersion] nvarchar(30) COLLATE Latin1_General_100_BIN2 NULL,
    [ScopeDescription] nvarchar(1000) COLLATE Latin1_General_100_BIN2 NULL
);
GO

IF OBJECT_ID(N'ar11_stage.Coverage', N'U') IS NULL
CREATE TABLE ar11_stage.[Coverage] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [DatasetCode] nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    [CoverageStatus] nvarchar(20) COLLATE Latin1_General_100_BIN2 NULL,
    [RowCount] bigint NULL
);
GO

IF OBJECT_ID(N'ar11_stage.Workspaces', N'U') IS NULL
CREATE TABLE ar11_stage.[Workspaces] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [NativeWorkspaceID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeWorkspaceType] nvarchar(50) COLLATE Latin1_General_100_BIN2 NULL,
    [DisplayName] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeLifecycleCode] nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
);
GO

IF OBJECT_ID(N'ar11_stage.Assets', N'U') IS NULL
CREATE TABLE ar11_stage.[Assets] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [NativeAssetID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeAssetType] nvarchar(50) COLLATE Latin1_General_100_BIN2 NULL,
    [DisplayName] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeVersionReference] nvarchar(100) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeLifecycleCode] nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
);
GO

IF OBJECT_ID(N'ar11_stage.Workspace_Assets', N'U') IS NULL
CREATE TABLE ar11_stage.[Workspace_Assets] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [NativeWorkspaceID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeAssetID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeAssetType] nvarchar(50) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeAssociationType] nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
);
GO

IF OBJECT_ID(N'ar11_stage.Connections', N'U') IS NULL
CREATE TABLE ar11_stage.[Connections] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [NativeConnectionID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [DisplayName] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [TechnologyCode] nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    [HasExtract] bit NULL,
    [ServerHostname] nvarchar(255) COLLATE Latin1_General_100_BIN2 NULL,
    [DatabaseName] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [AuthenticationTypeCode] nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    [IdentityClassificationCode] nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    [EvidenceStatusCode] nvarchar(30) COLLATE Latin1_General_100_BIN2 NULL
);
GO

IF OBJECT_ID(N'ar11_stage.Asset_Connections', N'U') IS NULL
CREATE TABLE ar11_stage.[Asset_Connections] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [NativeAssetID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeAssetType] nvarchar(50) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeConnectionID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [EvidenceStatusCode] nvarchar(30) COLLATE Latin1_General_100_BIN2 NULL
);
GO

IF OBJECT_ID(N'ar11_stage.Asset_Dependencies', N'U') IS NULL
CREATE TABLE ar11_stage.[Asset_Dependencies] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [NativeAssetID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeAssetType] nvarchar(50) COLLATE Latin1_General_100_BIN2 NULL,
    [UpstreamNativeAssetID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [UpstreamNativeAssetType] nvarchar(50) COLLATE Latin1_General_100_BIN2 NULL,
    [RelationshipCode] nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    [EvidenceStatusCode] nvarchar(30) COLLATE Latin1_General_100_BIN2 NULL
);
GO

IF OBJECT_ID(N'ar11_stage.Platform_Users', N'U') IS NULL
CREATE TABLE ar11_stage.[Platform_Users] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [NativePrincipalID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [IdentifierNamespace] nvarchar(60) COLLATE Latin1_General_100_BIN2 NULL,
    [PrincipalTypeCode] nvarchar(30) COLLATE Latin1_General_100_BIN2 NULL,
    [DisplayName] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [SourceEmail] nvarchar(320) COLLATE Latin1_General_100_BIN2 NULL,
    [SourceStatus] nvarchar(500) COLLATE Latin1_General_100_BIN2 NULL
);
GO

IF OBJECT_ID(N'ar11_stage.Directory_Users', N'U') IS NULL
CREATE TABLE ar11_stage.[Directory_Users] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [DirectoryObjectID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [DisplayName] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [Mail] nvarchar(320) COLLATE Latin1_General_100_BIN2 NULL,
    [AccountEnabled] bit NULL
);
GO

IF OBJECT_ID(N'ar11_stage.Object_Users', N'U') IS NULL
CREATE TABLE ar11_stage.[Object_Users] (
    ImportRowID bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [RunKey] uniqueidentifier NULL,
    [NativeObjectType] nvarchar(50) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeObjectID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [PrincipalRoleCode] nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL,
    [SourcePrincipalReference] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [SourceReferenceNamespace] nvarchar(60) COLLATE Latin1_General_100_BIN2 NULL,
    [NativePrincipalID] nvarchar(200) COLLATE Latin1_General_100_BIN2 NULL,
    [IdentifierNamespace] nvarchar(60) COLLATE Latin1_General_100_BIN2 NULL,
    [NativeRole] nvarchar(100) COLLATE Latin1_General_100_BIN2 NULL,
    [SourceReferenceStatusCode] nvarchar(40) COLLATE Latin1_General_100_BIN2 NULL
);
GO
