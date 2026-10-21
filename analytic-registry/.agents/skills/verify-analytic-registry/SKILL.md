---
name: verify-analytic-registry
description: Verify Analytic Registry React workflows locally after app changes or during a product review. Launch an isolated preview, drive mapped user journeys, and preserve browser evidence. Does not validate live platform queries or production authorization.
---

# Verify Analytic Registry

Read [the feature map](features/README.md) before selecting coverage. Use the [current guide](../../../docs/v1.2-guide.md) to distinguish requirements from unresolved policy.

The primary surface is the React browser app. Its local storage contains prototype data; no SQL Server or Power Apps environment participates. Platform extraction queries require separate validation against source systems.

## Launch

Run from the app directory in PowerShell. The installed dependencies and local Chrome must exist.

```powershell
Set-Location -LiteralPath 'C:/Users/dlpat/Documents/Codex/2026-10-06/files-pasted-by-the-user-build/outputs/analytic-registry'
& 'C:/Users/dlpat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' '.agents/skills/verify-analytic-registry/scripts/verify.mjs' requests
```

Prepare local resources first when documentation changes. This command runs the same script as `npm run docs:local` without requiring npm on PATH.

```powershell
& 'C:/Users/dlpat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' --import tsx scripts/prepare-local-docs.mjs
```

The runner starts Vite directly on strict localhost port 5191 without preparing artifacts. It owns the exact child PID, uses hidden windows, and refuses occupied ports. It never adopts or stops the user's preview on port 5180.

Each feature receives an empty, disposable browser context with the application's normal seed data. It uses the 1366 × 768 viewport. The default profile is Business (Maya/P1). Switching to Administrator selects Priya/P3. Reload resets the profile to Business.

Readiness requires the owned listener, the expected React entry, the usable application shell, and seeded workspace WS-001. No database, credentials, or network tenant is required.

## Doctor

```powershell
& 'C:/Users/dlpat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' '.agents/skills/verify-analytic-registry/scripts/verify.mjs' doctor
```

Doctor launches its own instance, verifies port ownership, checks the source entry and package version, opens seeded workspaces, captures a screenshot, then stops it. Every feature also runs the read-only instance checks before driving and after a failure. A failed doctor prevents a valid proof.

## Drive

Replace `requests` with `workspaces`, `assets`, `work`, `administration`, or `all`. `all` runs the five features sequentially on one owned server, with fresh browser storage per feature. An optional final integer selects another unused port; port 5180 is refused.

```powershell
& 'C:/Users/dlpat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' '.agents/skills/verify-analytic-registry/scripts/verify.mjs' all 5191
```

Use the feature's accessible controls and actual navigation paths. The runner's Playwright trace records each browser action. Wait for the destination control or saved effect after navigation. A URL change can precede React's rendered controls.

The five scripts use a shared runner, not a production test endpoint. Completed requests and evaluations are entered through UI controls. Read-only storage inspection verifies the resulting records. State inspection uses the production decoder and seed migration, matching normal startup. Synthetic recovery and inventory fixtures are explicitly logged as fixture setup; they are not ingestion proof.

## Evidence

Each invocation prints a unique `.scratch/verification-<UTC timestamp>-<suffix>` directory. Retain it on failure and success.

- `run.json`: selected coverage, application version, source-entry hash, owned PID and command, outcome, and cleanup. Startup writes this file before doctor completes.
- `doctor.jsonl`, `server.log`, `server-errors.log`: instance evidence.
- Each feature directory: assertion results, action log, Playwright trace, screenshots, accessibility snapshots, and exact local storage snapshots.
- Administration also captures the real browser JSON download.

Report verified journeys, failed journeys, and untested limitations separately. Source review, TypeScript, and domain checks are complementary evidence; they do not replace browser paths. The runner allows existing Google Fonts reads for actual styling and logs them. Other external browser requests fail the run. It performs no external writes.

Inspect each feature's `result.json` and `fixtures` list before reporting coverage. A synthetic relationship proves navigation from that relationship, not creation by a production workflow. Missing seed prerequisites remain uncovered unless a real user path creates them. Report fixture checks separately from user-created state.

## Cleanup

Cleanup closes only the disposable browser and terminates the exact Vite child process tree. It verifies the port is released. Evidence survives cleanup. A failed assertion returns a nonzero exit code.

If the runner is forcibly terminated, use the recorded PID and matching command line to identify any remaining owned server. Confirm that identity before stopping it. Preserve all evidence and leave the user's port 5180 preview alone.

## Helpers

[scripts/verify.mjs](scripts/verify.mjs) is the only entry point. [scripts/features](scripts/features) contains its five journeys. The runtime resolves Playwright beside bundled Node. Set `VERIFY_PLAYWRIGHT` or `VERIFY_CHROME` only when those installed locations differ.

Maintain this skill with `maintain-verification-skill` when routes, controls, seed prerequisites, or agreed requirements change. Update a failed selector only after checking the live page and source. Keep a product failure visible until it is repaired.
