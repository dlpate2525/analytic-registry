# Workspace requests

Users request business changes through short forms. Eligible Champions approve business responsibility; technical work remains a separate milestone.

## Sub-features

- R1: Existing business-only requests use three steps and the champion-v1 policy.
- R2: One eligible Champion approval applies a due Standard business-only declaration without creating technical configuration.
- R3: Technical requests expose five steps and the _DS group.
- R4: A stale browser tab cannot overwrite a newer saved draft.

## How to get to it (user POV)

Open Requests from primary navigation. Open WS-001 through Workspaces and choose Request change. Existing-workspace request links also use `#/requests/new?type=Update%20Existing&workspace=WS-001`.

## Driving it with Playwright

Preconditions: Normal seed data; Business profile P1 is a current eligible Champion of Standard workspace WS-001. The responsibility effective date is due.

Run `verify.mjs requests` using [SKILL.md](../SKILL.md).

- Open Request change, declare Local verification Operations, and submit through the three visible steps.
- Expect a stored champion-v1 request with technical work false.
- Record LOCAL-VERIFY-CHAMPION and approve business declarations.
- Expect an approval receipt for P1, applied business line, unchanged native ID, and unchanged group/configuration counts.
- Reload; expect the applied request to remain effective.
- Start another update, choose Platform changes required Yes, and open Groups & access.
- Expect five steps, Edit _DS, and no business group owner field.
- Open two request tabs in the disposable context. Save the second draft, then save the older tab.
- Expect the stale-write warning and the exact newer saved bytes to remain unchanged.

## Gotchas

Self-approval is allowed for an eligible role. Proposed replacements cannot acquire approval authority merely by appearing on a request. Custom configuration also requires Application Owner or Platform Owner approval. This journey does not complete Custom setup, external implementation, or registry linking. Domain checks cover those boundaries. Late approval precedence and retrospective execution dates need separate policy decisions.

The request journey keeps one Champion through the visible roster controls. It confirms the backup warning in both form locations, then submits and approves successfully.
