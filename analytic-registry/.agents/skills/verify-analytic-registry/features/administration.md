# Administration and platform imports

Administration explains the data contract and evidence limits. Platform imports is a reference walkthrough, not a live loading service.

## Sub-features

- D1: Platform imports has five steps and marks partial evidence unverified.
- D2: Acceptance explicitly remains disconnected from production.
- D3: Reference pages render and explain calculated PRL-01.
- D4: Browser export creates a downloadable JSON file.
- D5: Invalid saved approval history enters recovery without losing original bytes.
- D6: App help opens the current guide and separates workbook revision 1.2, input schema 1.1, and earlier designs.
- D7: Expand the relationship diagrams; expect readable images, explicit integration limits, and no horizontal overflow.
- D8: Guide links resolve to real files; workbook and collection archive bytes match their own release checksums.
- D9: The current-workflows alias stays current, and reading documentation preserves registry data.
- D10: Detection Coverage uses eleven retained buckets, four themes, platform-specific limits, and current release labels.
- D11: Coverage and dashboard links preserve platform and open-finding scope without claiming live detection.

## How to get to it (user POV)

Expand Administration and select Platform imports. The same menu exposes Detection coverage, Configuration standards, Data foundation, Reference data, and Activity / history. Reference data includes Export browser data.

## Driving it with Playwright

Preconditions: Normal seeded browser state and the local public resources directory exist. No platform tenant is configured.

Run `verify.mjs administration` using [SKILL.md](../SKILL.md).

- Open Platform imports through Administration; expect five steps.
- Select Compare, then Missing / partial; expect Not verified.
- Open Accept; expect Production acceptance is not connected and unchanged registry data.
- Open each reference route; expect its named heading.
- Select Alteryx and Accountability in Detection Coverage; expect two bucket rows and explicit evidence gaps.
- Open a bucket's findings; expect the selected platform, bucket, and Open status.
- Follow the dashboard's bucket link after filtering a platform; expect that platform and Open status.
- Export browser data from Reference data; save the download in the run evidence directory.
- Open App guide from the help button, then select Guide & documentation.
- Inspect the separate guide tab at 1366 by 768 and capture its screenshot.
- Check each resource response and both artifact checksums; reject a Vite fallback page as a missing file.
- Compare the current-workflows alias with the current workflow document, then close the guide tab and dialog.
- Load a marked synthetic malformed approvals object in disposable storage and reload.
- Expect the recovery alert and exact preserved original bytes.

## Gotchas

The recovery fixture is test setup, not a user ingestion workflow. The script never resets the user's saved data. Reference-route renders do not prove workbook contents or live SQL queries. Detailed input validation, native identity refresh, and email matching require domain checks and platform validation.
