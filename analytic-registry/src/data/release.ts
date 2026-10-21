const version = '1.2.0-prototype.1';
export const prototypeRelease = {
 version,series:'V1.2',tag:`v${version}`,publishedBaseline:'v1.1.0-prototype.2',publication:'Prototype release',label:'V1.2 prototype',baselineDate:'2026-10-21',displayDate:'21 October 2026',
 collectionContract:'1.1',workbookRevision:'1.2',workbookSheets:16,importTables:11,importColumns:72,
} as const;
export const prototypeArtifacts = {
 collectionRoot:'resources/platform-data-collection/v1.1-extract/',
 workbook:'resources/platform-data-collection/v1.2-workbook/analytic-registry-v1.2-extract.xlsx',
 collectionPack:'resources/platform-data-collection/analytic-registry-v1.2-extract.zip',
 handoff:'resources/platform-data-collection/v1.2-workbook/README.md',
 contract:'resources/platform-data-collection/v1.2-workbook/contract.json',
 dictionary:'resources/platform-data-collection/v1.2-workbook/column-dictionary.csv',baseline:'v1.1-prototype-baseline.md',
 documentation:'guide.html',workflows:'v1.2-guide.md',requirements:'v1.2-requirements.md',verification:'v1.2-publication-verification.md',currentBaseline:'v1.2-release.md',model:'v1.1-model-simplification.md',decisions:'decision-register.md',
 github:`https://github.com/dlpate2525/analytic-registry/tree/${prototypeRelease.tag}`,
} as const;
export const releaseArtifactKeys = ['workbook', 'collectionPack', 'documentation', 'workflows', 'requirements', 'verification', 'currentBaseline'] as const;
