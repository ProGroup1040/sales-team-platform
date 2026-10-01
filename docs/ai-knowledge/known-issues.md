# Known Issues and Gaps

## Verified/implemented concerns

- Identity is represented by users, engineers, and app users; the boundary is not fully unified.
- Permission configuration has multiple stores; not all endpoints are proven to consume one effective policy.
- Financial schema uses decimal storage while calculations use cents at selected application boundaries.
- Many workflows lack a repository-wide idempotency contract.
- Timezone and month/year derivation policy is not authoritative.

## Task-specific limitation

A regular user can add a personal daily task only when the account is linked to an `engineers` record. This follows the `dailyTasks.engineerId` ownership model; an unlinked system user has no valid task owner.

## Unknowns

Production database state, complete status transition matrices, immutable audit policy, canonical customer/deal source of truth, commission approval policy, and full KPI catalog require product-owner or production evidence.

This file records findings only; it does not silently change business logic.
