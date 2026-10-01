# Sales Team Platform — AI Knowledge Base

قاعدة معرفة موثقة من source code وschema وtests وملفات التدقيق داخل repository. لا تُعامل المعلومة غير المثبتة كحقيقة.

## Evidence labels

- **VERIFIED**: مثبت من الكود أو schema أو test أو configuration.
- **INFERRED**: استنتاج مدعوم بأكثر من مصدر، لكنه ليس قاعدة صريحة.
- **UNKNOWN**: لا يوجد دليل كافٍ.
- **CONFLICTING**: يوجد أكثر من implementation أو مصدر متعارض.

## Reading order

1. [Architecture](architecture.md)
2. [Modules](modules.md)
3. [Detailed Modules](modules-detailed.md)
3. [Workflows](workflows.md)
4. [Permissions](permissions.md)
6. [KPIs](kpis.md)
7. [Detailed KPI Formulas](kpi-formulas-detailed.md)
6. [Data Dictionary](data-dictionary.md)
7. [Known Issues](known-issues.md)
8. [FAQ](FAQ.md)
9. [New Employee Guide](onboarding/new-employee-guide.md)
10. [Coverage Report](KNOWLEDGE-COVERAGE.md)
11. [AI Agent System Prompt](ai-agent/system-prompt.md)

## Primary evidence

- `client/src/App.tsx` — routes and page composition.
- `client/src/pages/` — user workflows.
- `server/routers.ts` — tRPC procedures, validation, and guards.
- `server/db.ts` — persistence and calculations.
- `server/_core/context.ts`, `server/localAuth.ts` — actor/session resolution.
- `drizzle/schema.ts`, `drizzle/*.sql` — database model and migrations.
- `shared/authorization.ts`, `shared/money.ts` — shared policy helpers.
- `server/*.test.ts` — executable evidence.
- Existing audit documents under `docs/` — scope, findings, and limitations.

## Scope note

Production database state, deployment state, organizational policy, timezone policy, retention policy, and untested business intent remain **UNKNOWN** unless explicitly evidenced.
