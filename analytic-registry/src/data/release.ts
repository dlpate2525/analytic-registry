export const prototypeRelease = {
  version: '1.0.0-prototype.1',
  tag: 'v1.0.0-prototype.1',
  label: 'V1 prototype',
  baselineDate: '2026-10-08',
  displayDate: '8 October 2026',
  collectionContract: '1.0',
  workbookSheets: 15,
  importTables: 9,
  importColumns: 117,
} as const;

// Relative paths also work when the preview is served from a subdirectory.
export const prototypeArtifacts = {
  workbook: 'resources/platform-data-collection/v1-extract/analytic-registry-v1-extract.xlsx',
  collectionPack: 'resources/platform-data-collection/analytic-registry-platform-data-pack.zip',
  handoff: 'resources/platform-data-collection/v1-extract/README.md',
  baseline: 'v1-prototype-baseline.md',
  documentation: 'review-pack.html',
  model: 'data-model.html',
  decisions: 'decision-register.md',
  github: `https://github.com/dlpate2525/analytic-registry/tree/${prototypeRelease.tag}`,
} as const;
