# V1.2 workbook verification

The new workbook is `outputs/platform-data-collection/v1.2-workbook/analytic-registry-v1.2-extract.xlsx`.

SHA-256: `e7acf60dcdba348dc6c4da1b7d9508365cfa6d7476e10ae928b2eca48b916f2f`.

The bundled Artifact Tool generated the workbook after the required edit marker ran successfully once. The existing workbook was rendered and viewed before authoring. All 16 resulting sheets were rendered and viewed. Additional views covered the complete Guide, changed dictionary purposes, object-user definitions, and platform reference rules. The inspected views were readable without clipped headers or values.

The workbook was recalculated before final inspection and export. Artifact inspection found no formula errors. This is a blank data-entry contract with reference text, so no business calculation or input-change recalculation test applies.

Independent Python ZIP/XML checks passed after the final filename change. They verified:

- 16 sheets with no historical Migration_Map sheet.
- 11 input tables with the same names, ranges, 72 headers, and column order as the old workbook.
- Five blank template rows per input table and 345 text-formatted nonnumeric input cells.
- 72 common dictionary definitions, matching the CSV exactly.
- Three 72-row platform reference tables and 1,728 unchanged reference cells.
- The five Guide stages in order: Receive, Validate, Match, Compare, Accept.
- Only three purpose descriptions changed in the new contract copy; all other contract content matches schema 1.1.
- No cell formulas or Excel error cells.
- The old workbook retained SHA-256 `94473204f0d779d95a3acfb8637edce7c945f449eef6fc8827f8c32a29642a73`.

The validation script returned exit code 0. Its full result is `saved-workbook-validation.json` in this directory.

## Runtime limitation

The bundled Node process returned exit code 1 after both the read-only rendering command and the authoring command. It printed successful render/export completion and no error message. This exit behavior remains unexplained. It was not suppressed or overridden. The exported XLSX and all preview images existed and passed the independent structure checks and visual review described above.

Native Excel behavior, installed source queries, SQL Server execution, and production ingestion were not tested.

Final wording update: NativeWorkspaceID now explicitly resolves using entity kind Workspace and excludes workspace subtype. The affected dictionary range was rendered and visually checked after rebuilding. Artifact inspection and independent saved-file validation passed again. The export process again returned unexplained exit code 1.
