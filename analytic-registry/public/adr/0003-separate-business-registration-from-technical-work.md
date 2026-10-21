---
status: accepted
date: 2026-10-09
---

# Separate business registration from technical work

Register Existing may complete business registration after required information and approvals are complete and the recorded effective date has arrived. Required technical changes remain linked open work until independently completed and verified. The user chose this boundary to establish business accountability without waiting for platform changes.

## Consequences

Bind registration to the accepted native workspace identity. Preserve applicable business, sensitive-data, and Custom approvals. Show registration and technical work as separate states. Registration does not prove technical compliance or close remediation.

The local request stages now separate business registration from technical work. Business completion requires a saved business-application receipt; until then, the request remains Ready for registration. Required technical work remains one linked queue item after registration. This does not relax Create New implementation requirements.

## Considered alternative

Keep registration open until technical implementation and verification finish. This delays recorded business accountability when existing workspace changes take longer.

See [Q5 in the design interview](../v1.1-design-interview.md) and [effective responsibility](0001-effective-business-responsibility.md).

Local verification: [79 responsibility and registration checks](../source/scripts/v11-responsibility.check.ts) passed, including future dates, native identity, separate technical completion, and frozen annual recipients.
