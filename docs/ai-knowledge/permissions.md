# Permissions and Identity

## Identity models

- `users`: OAuth/Manus identity.
- `engineers`: operational owner record; daily tasks use `engineerId`.
- `appUsers`: local internal account, optionally linked to an engineer.
- `ctx.actor`: resolved request actor from app-user token, local session, or OAuth.

## Task enforcement

`getTaskAccess` resolves role permissions and direct permissions, then `requireTaskAction` enforces `view`, `add`, `edit`, or `delete`. Non-`all` scopes are constrained to the actor's linked `engineerId`; `taskEngineerFilter` prevents selecting another owner. `tasks.createMine` always derives ownership from the actor.

## Scope

The task helper supports `own`, `team`, and `all` scope values, although team membership is not modeled and fails closed to own behavior. The default `sales_engineer` and `sales_specialist` task permissions allow view/add/edit and deny delete with own scope (verified in `server/db.ts`).

## Limitations

Multiple permission stores exist (`role_permissions`, `user_permissions`, `section_permissions`) and not every module necessarily uses one effective resolver. This is **CONFLICTING/PARTIAL** architecture, not evidence that every UI permission is a backend security boundary.
