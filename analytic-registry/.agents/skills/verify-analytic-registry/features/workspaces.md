# Dashboard and workspaces

Users find accountable workspaces, inspect platform evidence, and open business work without confusing source facts with declarations.

## Sub-features

- W1: Dashboard counts lead to matching registry rows.
- W2: Search, Back, reload, and Clear filters preserve one visible filter state.
- W3: Workspace detail retains five tabs and existing Connections links.
- W4: Current inventory does not imply access evidence readiness.
- W5: Administrator My workspaces uses the Administrator profile.
- W6: The 1366 × 768 design scales to a smaller viewport.

## How to get to it (user POV)

Use Dashboard → My workspaces or Registered workspaces. Global Find a workspace opens a filtered registry. The Workspaces navigation link and saved `#/workspaces/WS-001?tab=Connections` links reach the same records.

## Driving it with Playwright

Preconditions: Normal seeded WS-001, WS-002, WS-003, WS-011, and CON-001 exist. Seed data includes one retired registered workspace.

Run `verify.mjs workspaces` using the launch command in [SKILL.md](../SKILL.md).

- Follow My workspaces; compare the Dashboard number with its destination rows.
- Choose Tableau, then globally search Mortgage; expect one row and cleared previous platform filtering.
- Use Back and reload; expect the Tableau filter and My workspaces scope.
- Open the saved Connections link; expect Assets & connections as the selected tab.
- Load a marked synthetic current-inventory fixture; expect legacy Extract to show Undefined technology with a processing note.
- Open Access & configuration; expect missing coverage to remain explicit.
- Switch Administrator and select My workspaces; expect WS-002 and WS-003.
- Select Include retired; expect WS-011 to appear alongside those two workspaces.
- Follow Registered workspaces, include retired, then clear filters; expect the count and URL restrictions to agree.
- Resize to 1024 pixels; expect proportional scaling with unchanged design coordinates.

## Gotchas

The inventory fixture's 31-day freshness value is test setup, not an agreed production threshold. It does not prove source ingestion. Raw connection text must remain unchanged. Reload resets Application view to Business. Retired filtering changes visibility only; retirement operations are not covered.
