from __future__ import annotations

import json
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "reverse_engineering.md"
INV = json.loads((ROOT / "review_artifacts" / "reverse_engineering_inventory.json").read_text(encoding="utf-8"))
API = json.loads((ROOT / "review_artifacts" / "api_inventory.json").read_text(encoding="utf-8"))
SCHEMA_TEXT = (ROOT / "drizzle" / "schema.ts").read_text(encoding="utf-8", errors="replace")


def link(path: str, line: int | None = None) -> str:
    suffix = f"#L{line}" if line else ""
    return f"[`{path}`](../{path}{suffix})"


def cell(v: object) -> str:
    return str(v).replace("|", "\\|").replace("\n", " ")


def schema_details():
    result = []
    pat = re.compile(r'export const (\w+) = mysqlTable\("([^"]+)", \{(.*?)\n\}\);', re.S)
    for m in pat.finditer(SCHEMA_TEXT):
        fields = []
        current_name = None
        current_lines = []
        for line in m.group(3).splitlines():
            fm = re.match(r"^\s{2}([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$", line)
            if fm:
                if current_name is not None:
                    value = " ".join(x.strip() for x in current_lines).rstrip(",")
                    fields.append(f"{current_name} — {value}")
                current_name = fm.group(1)
                current_lines = [fm.group(2)]
            elif current_name is not None:
                current_lines.append(line)
        if current_name is not None:
            value = " ".join(x.strip() for x in current_lines).rstrip(",")
            fields.append(f"{current_name} — {value}")
        result.append({"symbol": m.group(1), "table": m.group(2), "fields": fields})
    return result


def api_table():
    rows = []
    for ns in API["namespaces"]:
        for p in ns["procedures"]:
            rows.append(f"| `{ns['namespace']}.{p['name']}` | {p['kind']} | {p['guard']} | {p['input']} | {link('server/routers.ts', p['line'])} |")
    return "\n".join(rows)


def frontend_table():
    grouped = defaultdict(list)
    for c in API["frontend_calls"]:
        grouped[c["file"]].append(f"`{c['namespace']}.{c['procedure']}`")
    rows = []
    for f in sorted(grouped):
        calls = ", ".join(sorted(set(grouped[f])))
        rows.append(f"| {link(f)} | {calls} |")
    return "\n".join(rows)


def schema_table():
    rows = []
    for d in schema_details():
        fields = "; ".join(d["fields"])
        rows.append(f"| `{d['table']}` | `{d['symbol']}` | {cell(fields)} | {link('drizzle/schema.ts')} |")
    return "\n".join(rows)

routes = [
    ("/", "Home", "صفحة الدخول/الترحيب العامة بحسب مكوّن الصفحة.", "لا يوجد حارس مسار خاص في App.tsx"),
    ("/login", "LoginPage", "تسجيل الدخول المحلي وتغيير كلمة المرور الإجباري عند الحاجة.", "عامة؛ المصادقة تتم داخل الإجراء"),
    ("/overview", "Overview", "نظرة عامة وتشغيل لوحة التحكم.", "داخل DashboardLayout؛ session مطلوبة عمليًا"),
    ("/tasks", "TasksModule", "المهام اليومية، التقويم، التسجيلات، التوزيع، والمتابعة.", "داخل DashboardLayout"),
    ("/leads", "LeadsModule", "قائمة العملاء المحتملين وإحصاءات المتابعة.", "داخل DashboardLayout"),
    ("/visits", "VisitsModule", "المعاينات من الحجز حتى التنفيذ والرفع والجودة والتحصيل.", "داخل DashboardLayout"),
    ("/closing", "ClosingModule", "الصفقات ومراحل الإغلاق والخصومات والصفقات المفقودة.", "داخل DashboardLayout"),
    ("/sales-module", "SalesModule", "المبيعات والأهداف وشرائح العمولة والأداء.", "داخل DashboardLayout"),
    ("/kpi", "KPIModule", "KPI والعمولات والمكافآت وتصنيفات الأداء.", "داخل DashboardLayout"),
    ("/collections", "CollectionsModule", "العقود والمدفوعات ووعود الدفع والعمولات.", "داخل DashboardLayout"),
    ("/planning", "PlanningModule", "أهداف الشركة والمهندسين والأهداف الشخصية والتوزيع.", "داخل DashboardLayout"),
    ("/promotion-system", "PromotionSystem", "التقييم الشهري، الترقية، ومسار التطور.", "داخل DashboardLayout"),
    ("/reports", "ReportsModule", "التقارير الأسبوعية والشهرية والربع سنوية.", "داخل DashboardLayout"),
    ("/sales-execution", "SalesExecutionSystem", "Playbook، عروض الأسعار، جلسات الاجتماعات، المراجعات، والتدريب.", "داخل DashboardLayout"),
    ("/project-timeline", "ProjectTimelineModule", "متابعة تنفيذ المشاريع بعد إغلاق الصفقة، SLA والتأخيرات والتوقفات.", "داخل DashboardLayout؛ نطاق البيانات يفرضه الخادم"),
    ("/user-management", "UserManagement", "حسابات المستخدمين، كلمات المرور، الحالة، وربط المهندس.", "داخل DashboardLayout؛ العمليات الحساسة تفحص الدور يدويًا"),
    ("/permissions", "PermissionsPanel", "مصفوفة صلاحيات الأدوار والأقسام.", "داخل DashboardLayout؛ العمليات الحساسة تفحص الدور يدويًا"),
    ("/dashboard", "Overview", "اسم قديم/alias لنظرة عامة.", "داخل DashboardLayout"),
    ("/404", "NotFound", "صفحة غير موجودة؛ وSwitch يحتوي أيضًا fallback عام.", "عامة"),
]

static = r'''# PROJECT EXECUTIVE SUMMARY

## نطاق الوثيقة ومنهجيتها

هذه الوثيقة هي **Reverse Engineering موثق** للنسخة الحالية من مستودع `sales-team-platform` على فرع `main`. تم فحص ملفات المصدر، مخطط Drizzle، ملفات الهجرة، تعريفات tRPC، صفحات React، المكونات المشتركة، إعدادات التشغيل، الاختبارات، ونتائج التحقق المحلي. كل عبارة تصف تنفيذًا مؤكدًا مرتبطة بمسار ملف؛ أما العبارات التي تربط أكثر من ملف فهي موسومة بوضوح بأنها **Inferred**. لا تُعد هذه الوثيقة إثباتًا لمطابقة بيئة الإنتاج أو قاعدة بيانات الإنتاج.

> **قاعدة القراءة:** وجود اسم في `todo.md` أو تعليق في الكود لا يساوي اكتمال الميزة. المصدر الحاكم هو مسار التنفيذ الفعلي من الصفحة إلى الإجراء إلى طبقة البيانات.

## النتيجة التنفيذية

المشروع عبارة عن **منصة تشغيل ومراقبة لفريق مبيعات** تجمع بين إدارة المهام اليومية، العملاء المحتملين، المعاينات، الصفقات، التحصيل، مؤشرات الأداء، التقييم والترقية، تنفيذ المبيعات المعتمد على Playbook، ومراقبة Timeline المشاريع بعد إغلاق الصفقة. هذا الوصف **Inferred** من تركيب الصفحات والـ routers والجداول، وليس من وثيقة متطلبات واحدة. المصادر الأساسية هي [`client/src/App.tsx`](../client/src/App.tsx)، [`server/routers.ts`](../server/routers.ts)، و[`drizzle/schema.ts`](../drizzle/schema.ts).

البنية الحالية عبارة عن تطبيق React/Vite في الواجهة، Express في الخادم، وtRPC كعقد API typed، مع Drizzle ORM على MySQL عبر `mysql2`. توجد طبقة تشغيل واحدة تقريبًا، لكن `server/db.ts` كبير جدًا ويجمع الوصول إلى البيانات مع قدر مهم من قواعد الأعمال. التخزين الأساسي relational، وتوجد 51 table معرفة في schema الحالي، مع migrations متسلسلة حتى `0057_enforce_core_relationships.sql`.

نقطة القوة الرئيسية هي اتساع نطاق الأعمال ووجود اختبارات كثيرة وحواجز تحقق في عدة إجراءات. أهم نقاط الخطر ليست غياب الميزات، بل **تعدد نماذج الهوية، التوزيع اليدوي لفحوص الصلاحيات داخل routers، الاعتماد على `any` في بعض المسارات، وفجوة التحقق البيئي عندما لا تتوفر أسرار التشغيل وقاعدة البيانات**. لا ينبغي تفسير ذلك بأن كل API مكشوف؛ معظم واجهات الأعمال الحالية تستخدم `protectedProcedure`، لكن الاتساق بين الحارس العام، فحص الدور اليدوي، ومصفوفة الصلاحيات المخزنة يحتاج تدقيقًا.

## الحالة التي تم التحقق منها محليًا

| الفحص | النتيجة الحالية | التفسير |
|---|---:|---|
| `pnpm check` | ناجح | TypeScript يمر دون أخطاء معلنة. |
| `pnpm build` | ناجح | تم بناء Vite والـ server bundle مع تحذيرات بناء يجب مراجعتها. |
| `pnpm test` | 388 ناجحًا و1 فاشل | الفشل في `server/_core/env.runtime.test.ts` لأن بيئة الفحص الحالية لا تحتوي session secret بطول 96 ولا `DATABASE_URL`. |
| قاعدة البيانات | غير قابلة للإثبات من sandbox | لا توجد قيم أسرار أو اتصال إنتاجية ضمن هذه الوثيقة. |

هذه النتائج محفوظة أيضًا في [`review_artifacts/validation_summary.md`](../review_artifacts/validation_summary.md).

# PROJECT STRUCTURE

## Root structure

```text
sales-team-platform/
├── client/                 # React/Vite frontend
├── server/                 # Express + tRPC + data-access/business logic
├── shared/                 # Contracts/constants shared by client and server
├── drizzle/                # MySQL schema, migrations, snapshots, relation placeholder
├── docs/                   # Project documentation
├── scripts/                # Operational migration/account scripts and analysis scripts
├── review_artifacts/       # Generated review evidence and inventories
├── .manus/                 # Project/runtime metadata supplied by the environment
├── package.json            # Scripts and dependencies
├── pnpm-lock.yaml          # Locked dependency graph
├── pnpm-workspace.yaml     # Workspace declaration
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite, aliases, Tailwind, Manus runtime/debug collector
├── drizzle.config.ts       # Drizzle Kit MySQL configuration
├── vitest.config.ts        # Test configuration
├── todo.md                 # Chronological backlog/implementation notes
└── components.json         # UI component generator configuration
```

عدد الملفات النصية/البرمجية التي شملها الفهرس الآلي هو 314 ملفًا بعد إضافة ملفات أدلة المراجعة المحلية. الفهرس التفصيلي هو [`review_artifacts/reverse_engineering_inventory.json`](../review_artifacts/reverse_engineering_inventory.json).

## وظيفة الأدلة الرئيسية

| المسار | المسؤولية الفعلية | العلاقات المهمة |
|---|---|---|
| `client/src/App.tsx` | تسجيل Wouter routes، lazy loading، `DashboardLayout`، وErrorBoundary. | يربط كل route بصفحة، ويحدد alias `/dashboard`. |
| `client/src/pages/` | صفحات المجالات: tasks, leads, visits, closing, sales, KPI, finance, planning, reports, sales execution, promotion, project timeline, user management. | تستدعي typed tRPC وتدير local UI state. |
| `client/src/components/` | مكونات مشتركة كبيرة مثل `DashboardLayout`, `InteractiveCalendar`, `DailyTimeline`, `TaskCalendarView`, `AIChatBox`، ومكتبة `ui/`. | تستخدمها الصفحات أو تغلفها طبقة layout. |
| `server/_core/index.ts` | إنشاء Express server، health/readiness، REST compatibility، OAuth، tRPC، Vite/static. | نقطة دخول كل HTTP request. |
| `server/_core/context.ts` | يبني `ctx.user` من OAuth و`ctx.actor` من app-user/local/OAuth. | يستهلكه middleware وrouters. |
| `server/_core/trpc.ts` | `publicProcedure`, `protectedProcedure`, `adminProcedure`. | يقرر هل يوجد actor وهل الدور admin/manager. |
| `server/routers.ts` | العقد الكامل لـ tRPC، 33 namespace و291 procedure وفق الفهرس الآلي. | يستدعي `server/db.ts`، auth helpers، وخدمات المشروع. |
| `server/db.ts` | MySQL/Drizzle access ومعظم الحسابات والقواعد والمصالحات. | يعتمد على `drizzle/schema.ts` و`getDb()`. |
| `server/localAuth.ts` | Login للمهندس، JWT محلي، bcrypt، والتحقق من status/isDeleted. | يتكامل مع `engineers` وcookie محلي. |
| `drizzle/schema.ts` | النموذج relational والـ enum والقيم الافتراضية. | مصدر أنواع Insert/Select. |
| `drizzle/*.sql` | تاريخ schema migrations حتى migration رقم 0057. | يطبّق على MySQL عبر Drizzle Kit. |
| `shared/authorization.ts` | APP_ROLES، SYSTEM_MODULES، SYSTEM_ROLES، دوال role predicates. | يستخدمه UI وبعض الخادم. |

# TECHNOLOGY STACK

| الطبقة | التقنية | الاستخدام في المستودع | المصدر |
|---|---|---|---|
| UI | React 19 + TypeScript | صفحات ومكونات functional. | `package.json`, `client/src/` |
| Build | Vite 7 + esbuild | بناء client وserver. | `package.json`, `vite.config.ts` |
| Routing | Wouter | route matching في `App.tsx`. | `client/src/App.tsx` |
| Data fetching | tRPC 11 + TanStack React Query 5 + SuperJSON | typed queries/mutations/cache invalidation. | `package.json`, `client/src/lib/trpc.ts` |
| Server | Express 4 | HTTP entrypoint وREST/OAuth/static. | `server/_core/index.ts` |
| ORM/DB | Drizzle ORM + MySQL + `mysql2` | schema وqueries. | `drizzle/schema.ts`, `server/db.ts` |
| Validation | Zod 4 | inputs لمعظم procedures. | `server/routers.ts` |
| Auth | Manus OAuth + local engineer JWT + app-user JWT | ثلاثة مصادر هوية normalized جزئيًا في `ctx.actor`. | `server/_core/context.ts`, `server/localAuth.ts`, `server/db.ts` |
| Passwords | `bcryptjs` | hash/compare لكلمات مرور engineer/app user. | `server/localAuth.ts`, `server/db.ts` |
| Tokens | `jose` | JWT HS256 والتحقق. | `server/localAuth.ts`, `server/db.ts` |
| Styling/UI | Tailwind CSS 4، Radix primitives، Lucide، shadcn-like wrappers | visual system وdialogs/forms/tables. | `vite.config.ts`, `client/src/components/ui/` |
| Charts/reports | Recharts، `xlsx`، `jspdf`، `html2canvas` | dashboards/export/print/PDF client behavior. | `package.json`, pages |
| Calendar/interactions | `@dnd-kit/*`, `date-fns`, Framer Motion | drag/drop calendar وmotion/date controls. | `package.json`, calendar components |
| Storage/integrations | S3 SDK، built-in Forge helpers، map/notification/image/voice modules | infrastructure helpers؛ الاستخدام التجاري يجب تتبعه حسب caller. | `server/_core/`, `server/storage.ts` |
| AI | `invokeLLM` helper referencing `gemini-2.5-flash` | capability infrastructure؛ لم يثبت وجود live business route في source search الحالي. | `server/_core/llm.ts` |

# APPLICATION ARCHITECTURE

## Current architecture

```mermaid
flowchart TD
    B[Browser] --> W[React application]
    W --> L[Dashboard layout]
    L --> Q[tRPC query client]
    Q --> H[HTTP API request]
    H --> C[Request context]
    C --> A[Actor resolution]
    A --> G[Procedure guard]
    G --> R[Router procedures]
    R --> D[Data access layer]
    D --> O[Drizzle ORM]
    O --> M[MySQL database]
    D --> X[Integration helpers]
    M --> D --> R --> Q --> W
```

يبدأ الطلب في browser من route/page أو shared component. الـ component يستعمل hook مولدًا من `trpc`، وينشئ HTTP request إلى `/api/trpc`. Express يمرر الطلب إلى `createExpressMiddleware`; `createContext` يحاول OAuth ثم cookie `app_user_token` ثم cookie الجلسة المحلية، ويضع actor. بعد ذلك يطبق procedure guard، ثم ينفذ handler في `server/routers.ts`، الذي يستدعي وظيفة في `server/db.ts` أو helper داخل router، ثم Drizzle/MySQL. هذه السلسلة مؤكدة من [`server/_core/index.ts`](../server/_core/index.ts)، [`server/_core/context.ts`](../server/_core/context.ts)، [`server/_core/trpc.ts`](../server/_core/trpc.ts)، و[`server/routers.ts`](../server/routers.ts).

## Request lifecycle

| المرحلة | نقطة التنفيذ | القرار/البيانات |
|---|---|---|
| 1 | Wouter route | اختيار page أو NotFound. |
| 2 | Page/component | بناء query/mutation inputs وإدارة local state. |
| 3 | tRPC client | تحويل الاستدعاء إلى request typed. |
| 4 | Express | body parsing، HTTP endpoint matching، ثم tRPC adapter. |
| 5 | `createContext` | تحميل `ctx.user` و`ctx.actor` من مصادر الهوية. |
| 6 | middleware | public لا يتطلب actor، protected يتطلب actor، admin يقبل `admin` أو `manager`. |
| 7 | router handler | Zod input ثم فحص دور يدوي في بعض المسارات. |
| 8 | data/business layer | query، mutation، حسابات، triggers تطبيقية، audit/timeline. |
| 9 | response | tRPC/REST JSON يعود إلى React Query. |
| 10 | cache/UI | invalidation/refetch، toast، تحديث العرض. |

# COMPLETE ROUTING MAP

كل routes المسجلة صراحة في `client/src/App.tsx` هي:

| Path | Page/component | الغرض | سلوك الوصول الحالي |
|---|---|---|---|
'''

static += "\n".join(f"| `{p}` | `{page}` | {purpose} | {access} |" for p, page, purpose, access in routes)

static += r'''

المسارات التشغيلية كلها تقريبًا children لـ `DashboardLayout`. الـ layout يعيد التوجيه إلى `/login` عندما تنتهي عملية `useLocalAuth` دون session، ويصفّي عناصر sidebar عبر `useRoleAccess`. هذا **UI gate** وليس بديلًا عن authorization الخادمي. توجد أيضًا `/dashboard` كاسم بديل لنفس `Overview`، و`/404` بالإضافة إلى fallback عام في `Switch`.

## Navigation map

```mermaid
flowchart LR
    Login[Login] --> Overview[Overview]
    Overview --> Tasks[Tasks]
    Overview --> Leads[Leads]
    Leads --> Visits[Visits]
    Visits --> Closing[Closing]
    Closing --> Collections[Collections]
    Closing --> Project[Project timeline]
    Overview --> Sales[Sales]
    Sales --> KPI[KPI]
    KPI --> Reports[Reports]
    Overview --> Planning[Planning]
    Overview --> Execution[Sales execution]
    Overview --> Promotion[Promotion]
    Promotion --> Users[User management]
    Promotion --> Permissions[Permissions]
```

الروابط المرئية في sidebar معرفة في `DashboardLayout.tsx`. روابط الأعمال بين الصفحات ليست كلها route-to-route links؛ جزء مهم منها يتم عبر tabs/dialogs داخل الصفحة واستدعاءات tRPC، خصوصًا داخل Tasks وVisits وClosing وProjectTimeline.

# PAGE-BY-PAGE ANALYSIS

## Home و Login

`Home` هي الصفحة المرتبطة بـ `/`، بينما `LoginPage` هي `/login`. صفحة Login تستدعي `trpc.localAuth.login`; عند إرجاع `forcePasswordChange` تعرض فرعًا لتغيير كلمة المرور باستدعاء `trpc.appUsers.changePassword`, ثم تنتقل إلى `/overview`. مسار session المحلي يستعمل cookie ولا يعتمد على تخزين token في localStorage بحسب التنفيذ المقروء في [`LoginPage.tsx`](../client/src/pages/LoginPage.tsx) و[`server/localAuth.ts`](../server/localAuth.ts).

## Overview

`Overview` هي لوحة ملخص، وتستخدمها `/overview` و`/dashboard`. مسؤوليتها عرض ملخصات التشغيل والتنبيهات والأداء؛ الواجهة تغلفها `DashboardLayout`. الـ APIs التفصيلية التي تظهر في الصفحة يجب الرجوع إلى calls الفعلية في الملف لأنها قد تتغير، بينما النمط العام هو query إلى namespaces `tasks`, `leads`, `visits`, `closing`, `kpi`, و`management`.

## TasksModule

المسار `/tasks`. الصفحة تجمع قائمة المهام، التقويم التفاعلي، Timeline اليومي، الفلاتر الزمنية، التوزيع، critical insights، review recordings، Admin Sales tasks وLead follow-up. أهم child components هي `InteractiveCalendar`, `DailyTimeline`, `TaskCalendarView`, `TimeFilterBar`, وdialogs داخل الصفحة.

عند الدخول، تُقرأ engineers والمهام والإحصاءات حسب التاريخ/الفلاتر. إنشاء المهمة يمر عبر Zod ثم يطبق server-side department enforcement عندما يكون `taskType` غير `other`. تحديث الحالة يحترم قاعدة أن task من نوع meeting/closing لا يكتمل بلا recording link؛ حالة `client_delay` تنشئ مهمة لليوم التالي مع `rescheduledFromId`. التقويم يدعم move/update/delete وتحديثات Admin Sales. هذه القواعد مؤكدة في [`TasksModule.tsx`](../client/src/pages/TasksModule.tsx) و[`server/db.ts`](../server/db.ts).

## LeadsModule

المسار `/leads`. يعرض list/stats ويدعم الإنشاء وتغيير status. الـ lead يملك `source`, `assignedEngineerId`, `status`, `firstContactAt`, و`responseTimeMinutes`. status enum الحالي هو `new`, `contacted`, `qualified`, `unqualified`, `converted`. follow-up اليومي المنفصل يستعمل `leadDailyStats` و`leadFollowup` procedures.

## VisitsModule

المسار `/visits`. الصفحة مقسمة إلى tabs: daily, booking, confirmation, execution, upload, quality, financial, alerts. عند الدخول تستدعي `visits.stats`, `visits.list` بنوع filter يختلف حسب tab، `visits.alerts`, `visits.debt`, `visits.dailyTracking`, `visits.adminSalesKPI`, `visits.needingAction`, و`engineers.list`.

إنشاء المعاينة يتطلب engineer/client/date. التحديث الكامل يسمح بتعديل booking/confirmation/execution/upload/delivery/quality/financial. الواجهة تعرض تنبيهات عندما لا يوجد confirmation أو upload أو collection. قاعدة مهمة: رسم المعاينة المحصل يحتاج screenshot URL في dialog، لكن يجب اعتبار enforcement الكامل server-side **Needs Verification** إذا لم يثبت في كل mutation paths.

## ClosingModule

المسار `/closing`. الصفحة تستدعي إحصاءات الصفقات وقائمتها والمهندسين والخصومات والتحليل والمهام والتايم لاين. الإنشاء يمر إلى `createDealWithDiscount`; تحديث stage يمر إلى `updateDealFull`; يوجد update stage بديل، reopen، update engineer، accounting month، auto-create from task، soft delete وdeal tasks.

Stages الفعلية: `proposal`, `negotiation`, `contract_sent`, `closed_won`, `closed_lost`. تغيير المرحلة إلى closed قد يضع `closedAt`، وقد يؤدي إلى إنشاء follow-up task أو مشروع عبر مسارات أخرى. يجب اعتبار transactional atomicity بين deal/project/collection **Needs Verification** لأن المصادر الحالية لا تثبت transaction واحدة لكل workflow.

## SalesModule و KPIModule

`SalesModule` في `/sales-module` يعرض monthly sales, trend, engineer performance, targets, commission tiers وdiscount tiers/control stats. `KPIModule` في `/kpi` يستدعي engineers/trend/operational/ranking/tele-sales/site/company-closing/reward/lost-impact/discount distribution/earnings/bonus/follow-up queries. هذه الصفحات تعتمد على حسابات مركزية في `server/db.ts`، لكن توجد أكثر من دالة period attribution؛ لذلك يجب عدم افتراض أن كل report يطبق نفس تعريف الشهر دون اختبار.

## CollectionsModule

المسار `/collections`. يعرض العقود، المتابعة اليومية، commission per engineer، dashboard، alerts، contracts with commission وperiod analysis. يدعم إضافة عقد، auto-create contract من deal، إضافة payment، إضافة promise، وتحديث promise. الجداول الأساسية هي `collections`, `payments`, `payment_promises`, `commission_payments`.

## PlanningModule

المسار `/planning`. يحتوي Company Goals وIndividual Goals وPersonal Goals. يقرأ/يكتب `companyGoals`, `engineerTargets`, `engineerPersonalGoals`، ويعرض preview/apply auto-distribution مع manual override. بعض sections gated عبر `useSectionPermission`, لكن enforcement النهائي يجب أن يبقى في الخادم.

## ReportsModule

المسار `/reports`. يوفر weekly full، monthly KPI، quarterly comparison عبر procedures `reports.weeklyFull`, `reports.monthlyKPI`, و`reports.quarterly`. quarterly يحسب الأشهر الثلاثة ويستدعي monthly KPI لكل شهر.

## SalesExecutionSystem

المسار `/sales-execution`. الصفحة مقسمة إلى Playbook، Meeting Review، Funnel Analysis، Coaching Dashboard. Playbook يدعم list/categories/import، quotations وpresentation tracking. Meeting Review يستخدم `promotion.createMeetingReview`; Funnel يستعمل `funnel.full` و`funnel.comparison`; Coaching يستعمل `playbook.weeklyCoaching`. الجداول: `playbook_items`, `playbook_quotations`, `meeting_sessions`, `session_actions`, `meeting_reviews`.

## PromotionSystem

المسار `/promotion-system`. يقرأ review summaries، evaluation dashboard، career level، promotion progress، وmanagement decision dashboard. يدعم create monthly evaluation، promote engineer، وmeeting review. البيانات موزعة بين `engineer_evaluations` و`engineer_career_levels`.

## ProjectTimelineModule

المسار `/project-timeline`. الصفحة تملك config/list/dashboard/analytics/detail، وتدعم sync من closed deals، import historical spreadsheet، transition stage، delay ledger، hold، update، pre-execution، start execution وclose. غير المديرين يفرض الخادم عليهم `engineerId = caller.id` في list/dashboard؛ وهذا مثال واضح على data-scope server-side داخل namespace.

## UserManagement و PermissionsPanel

`UserManagement` في `/user-management` يدير app users وحسابات engineers وتغيير/إعادة تعيين كلمة المرور وحالة الحساب. `PermissionsPanel` في `/permissions` يدير role permissions وsection permissions. الوصول إلى هذه العمليات يعتمد غالبًا على `protectedProcedure` مع فحص يدوي لأدوار `manager`, `admin_sales`, `admin`، أو `manager`, `admin`. يجب توحيد ذلك في policy service مستقبلًا.

# COMPONENT ARCHITECTURE

## الطبقات

| الفئة | أمثلة | المسؤولية |
|---|---|---|
| Layout | `DashboardLayout`, `DashboardLayoutSkeleton` | shell، sidebar، session redirect، menu filtering. |
| Domain components | `InteractiveCalendar`, `DailyTimeline`, `TaskCalendarView`, `DateRangePicker`, `TimeFilterBar` | UX متخصص للمهام والتاريخ. |
| Cross-cutting | `ErrorBoundary`, `DeleteConfirmDialog`, `ManusDialog`, `Map` | أخطاء، حذف، dialog، map. |
| AI/UI shell | `AIChatBox` | chat presentation/callback contract؛ لا يثبت live AI route. |
| Primitive UI | `client/src/components/ui/*` | wrappers فوق Radix/Tailwind: button, dialog, form, table, tabs, chart وغيرها. |
| Pages | كل `client/src/pages/*.tsx` | composition للـ domain queries والـ UI state. |

أهم علاقة dependency هي: `App` → page → domain components → `trpc` hooks → tRPC router → `db.ts`. معظم الصفحات ليست مجرد presentational components؛ فهي تحتوي handlers، query invalidation، filter state، dialog state، وvalidation أولي. لذلك coupling مرتفع خصوصًا في `TasksModule`, `ClosingModule`, `VisitsModule`, `KPIModule`, و`ProjectTimelineModule`.

## أهم المكونات القابلة لإعادة الاستخدام

| Component | Props/State الأساسية | مستخدم من | ملاحظة |
|---|---|---|---|
| `DashboardLayout` | children، local sidebar width، session، role access | كل dashboard routes | أهم UI auth boundary. |
| `InteractiveCalendar` | engineer/date/task mode، drag/drop state | Tasks | ينفذ create/update/move/delete. |
| `DailyTimeline` | date، engineer، viewMode | Tasks | يستعمل tasks timeline وcreateWithTime. |
| `TaskCalendarView` | filter engineer/date | Tasks | query calendarView. |
| `DateRangePicker` | range mode/date state | Visits, Closing, KPI, Planning | يؤثر على query params. |
| `TimeFilterBar` | dateRange/custom dates | Tasks | يغير filtered/timeSummary. |
| `DeleteConfirmDialog` | target/reason/confirm | pages with soft delete | يعرض أسباب الحذف. |
| `ErrorBoundary` | child tree | App | يمنع crash كامل للـ UI. |
| `AIChatBox` | messages، onSend، loading | ComponentShowcase | live product wiring غير مثبت. |

الفهرس الكامل للملفات والم symbols موجود في `reverse_engineering_inventory.json`; لم يُعتبر كل ملف UI primitive business component.

# DATA FLOW

## Flow عام

```mermaid
sequenceDiagram
    participant U as User
    participant P as React Page
    participant T as tRPC Client
    participant E as Express/tRPC
    participant C as createContext
    participant R as Router Procedure
    participant D as db.ts
    participant DB as MySQL
    U->>P: click/submit/filter
    P->>T: query or mutation
    T->>E: /api/trpc
    E->>C: build actor/user context
    C->>R: guard + input parse
    R->>D: domain/data helper
    D->>DB: Drizzle query/mutation
    DB-->>D: rows/result
    D-->>R: result
    R-->>T: typed response
    T-->>P: cache update/invalidation
    P-->>U: UI/toast/table/chart
```

## أهم العمليات الفعلية

| العملية | المسار الفعلي المختصر |
|---|---|
| Login المحلي | LoginPage → `localAuth.login` → `localLogin` → `engineers` + bcrypt → local JWT cookie → `localAuth.me` → DashboardLayout. |
| إنشاء مهمة | Tasks/Calendar → `tasks.create` أو `tasks.createWithTime` → department check/time overlap → `createTask` → `daily_tasks` → invalidate/refetch. |
| إكمال meeting task | UpdateStatusDialog → optional `meetingReview.submitLink` → `tasks.updateStatus` → recording rule → update task؛ `client_delay` ينشئ task لاحقة. |
| إنشاء lead | Leads page → `leads.create` → `createLead` → `leads`. |
| إنشاء زيارة | Visits page → `visits.create` → `createVisit` → `visits`؛ التحديث يمر `updateVisitFull` أو `updateVisitWithAdminTracking`. |
| إنشاء/إغلاق صفقة | Closing → `closing.create`/`updateStage` → discount validation/full update → `deals`, timeline/tasks وربما project effects. |
| تحصيل دفعة | Collections → `financial.addPayment` أو `addPaymentWithFollowUp` → payment record، collection aggregate/follow-up/commission effects. |
| KPI | KPI page → `kpi.*` → functions في db.ts → engineer targets + deals/visits/tasks/collections → calculated result. |
| Project transition | Project Timeline → `projectTimeline.transition` → authorization/data scope → `projects` + movement/delay/audit records. |

# DATABASE / DATA MODEL

## قواعد عامة

المصدر الحالي هو `drizzle/schema.ts`، حيث كل table تعرّف integer auto-increment primary key غالبًا، مع enums وdefaults وحقول timestamps. توجد علاقات صريحة مهمة في migration `0057_enforce_core_relationships.sql`، بينما ملف `drizzle/relations.ts` لا يحتوي تعريفات relations typed؛ لذلك يوجد فرق بين database FK integrity وبين Drizzle relation helpers.

## Database Relationship Map

```mermaid
erDiagram
    ENGINEERS ||--o{ DAILY_TASKS : owns
    ENGINEERS ||--o{ LEADS : assigned
    LEADS ||--o{ VISITS : source
    ENGINEERS ||--o{ VISITS : executes
    VISITS ||--o{ DEALS : source
    ENGINEERS ||--o{ DEALS : owns
    DEALS ||--o{ COLLECTIONS : contracts
    COLLECTIONS ||--o{ PAYMENTS : receives
    COLLECTIONS ||--o{ PAYMENT_PROMISES : promises
    COLLECTIONS ||--o{ COMMISSION_PAYMENTS : commissions
    DEALS ||--|| PROJECTS : creates
    PROJECTS ||--o{ PROJECT_MOVEMENTS : history
    PROJECTS ||--o{ PROJECT_DELAY_LEDGER : delays
    PROJECTS ||--o{ PROJECT_UPDATES : updates
    PLAYBOOK_ITEMS ||--o{ PLAYBOOK_QUOTATIONS : selected
    MEETING_SESSIONS ||--o{ SESSION_ACTIONS : contains
    ENGINEERS ||--o{ ENGINEER_EVALUATIONS : evaluated
```

العلاقات في الرسم تجمع declared FK من migration مع ID conventions وتعليقات schema؛ أي علاقة موسومة بأنها inferred يجب تأكيدها عبر production schema أو business owner.

## فهرس كامل للجداول والحقول

الجدول التالي مولد من `drizzle/schema.ts` ويعرض أسماء الحقول وتعريفها النصي؛ وهو أوسع من قائمة domain المختصرة.

| Table | Symbol | Fields / declared types | Source |
|---|---|---|---|
'''

static += schema_table()

static += r'''

## تصنيف الكيانات

| Domain | Tables |
|---|---|
| Identity | `users`, `engineers`, `app_users` |
| Daily operations | `daily_tasks`, `work_logs`, `admin_sales_tasks`, `admin_sales_meetings` |
| CRM/funnel | `leads`, `visits`, `deals`, `deal_tasks`, `deal_timeline`, `lead_daily_stats`, `lead_followup_logs` |
| Finance | `collections`, `payments`, `payment_promises`, `commission_payments` |
| Targets/KPI | `monthly_targets`, `engineer_targets`, `company_goals`, `engineer_personal_goals`, `commission_tiers`, `incentive_tiers`, `design_reviews` |
| Discount | `discount_tiers`, `deal_discount_allocations`, `discount_bonus_caps` |
| Execution/coaching | `playbook_items`, `playbook_quotations`, `meeting_sessions`, `session_actions`, `meeting_reviews` |
| Promotion | `engineer_evaluations`, `engineer_career_levels` |
| Permission/audit | `user_permissions`, `role_permissions`, `section_permissions`, `activity_logs`, `audit_logs` |
| Project execution | `project_stages`, `projects`, `project_movements`, `project_delay_ledger`, `project_updates`, `project_audit_logs`, `project_delay_reasons` |
| Legacy sales | `customers`, `products`, `sales`, `sale_items` |

# API DOCUMENTATION

## HTTP endpoints

| Method | Endpoint | Behavior | Auth boundary | Source |
|---|---|---|---|---|
| GET | `/healthz` | liveness JSON `{status: ok}` | public | `server/_core/index.ts` |
| GET | `/readyz` | database readiness via `SELECT 1` | public | `server/_core/index.ts` |
| GET | `/api/summary` | current-month deal summary | `getAdminCallerFromRequest` | `server/_core/index.ts` |
| GET | `/api/list` | paginated deal list with engineer name | `getAdminCallerFromRequest` | `server/_core/index.ts` |
| GET | `/api/kpi` | per-engineer KPI for year/month | `getAdminCallerFromRequest` | `server/_core/index.ts` |
| GET | `/api/oauth/callback` | OAuth callback | OAuth flow | `server/_core/oauth.ts` |

## Complete tRPC procedure index

الجدول التالي يغطي جميع procedures التي استخرجها parser من `server/routers.ts`. `protectedProcedure` يعني actor مطلوب، لكنه لا يعني تلقائيًا أن module/action/data scope من `role_permissions` تم فرضه؛ ذلك قد يكون في handler نفسه أو غير موجود، ويجب التحقق لكل endpoint.

| Procedure | Kind | Guard | Input | Source |
|---|---|---|---|---|
'''

static += api_table()

static += r'''

## Frontend-to-API call map

| الملف المستدعي | tRPC calls المستخرجة |
|---|---|
'''
static += frontend_table()

static += r'''

# AUTHENTICATION & AUTHORIZATION

## Login/session models

### Local engineer session

`localAuth.login` يستقبل username/password، ويستدعي `localLogin`. المقارنة تتم بـ bcrypt، والحساب يجب أن يكون active وغير محذوف. عند النجاح يُوقّع JWT HS256 باستخدام session secret ويضعه في cookie `LOCAL_AUTH_COOKIE` لمدة سنة. `verifyLocalSession` يعيد تحميل engineer من قاعدة البيانات ويفحص `status=active` و`isDeleted=0`؛ لذلك role/name/session claims لا تُؤخذ من token وحده.

### Internal app-user session

`appUsers.login` يستدعي `loginAppUser` ويضع `app_user_token` في HttpOnly cookie لمدة 7 أيام. `verifyAppUserToken` يعيد actor app_user، و`appUsers.me` يعيد permissions المستخدم. الحسابات في `app_users` منفصلة عن `engineers` مع `engineerId` اختياري.

### Manus OAuth

`createContext` يحاول `sdk.authenticateRequest`. إذا لم يوجد app-user/local actor ووجد OAuth user، ينشئ actor من `ctx.user`; `localAuth.me` يسمح OAuth admin الداخلي عندما يكون `ctx.user.role === "admin"`. هذا مسار platform identity لا ينبغي الخلط بينه وبين business identity.

## Authorization layers

| الطبقة | ما تفعله | حدودها |
|---|---|---|
| `DashboardLayout` | redirect UX وإخفاء sidebar items عبر role access. | لا يمنع direct URL/API. |
| `protectedProcedure` | يرفض غياب actor. | لا يفرض module CRUD/data scope. |
| `adminProcedure` | يقبل roles `admin` أو `manager`. | لا يشمل تلقائيًا `admin_sales`، ولا يطبق matrix. |
| Manual router checks | بعض procedures تفحص roles صراحة. | القواعد موزعة وقد تختلف بين endpoints. |
| Project timeline access helpers | scope manager/non-manager وedit access. | محلي لقطاع المشروع. |
| Stored permission rows | `role_permissions`, `user_permissions`, `section_permissions`. | وجود البيانات لا يثبت أن كل query/mutation يستخدمها. |

## Role → permission → pages/actions

الأدوار المعرّفة في `shared/authorization.ts` تشمل: `admin`, `engineer`, `admin_sales`, `sales_engineer`, `tele_sales`, `site_engineer`, `system_user`, `sales_specialist`, `interior_designer`, `manager`, `group_admin`. الأدوار المعروضة في system permission panel هي `manager`, `admin_sales`, `sales_engineer`, `sales_specialist`. هذا التباين يجب اعتباره **Needs Verification** عند اعتماد matrix رسمية.

| Role family | Pages/modules المرتبطة من الكود | Actions المسموح بها فعليًا |
|---|---|---|
| manager/admin | permissions, users, KPI/planning/project management حسب الفحوص اليدوية | إدارة configuration/users/permissions وبعض الإجراءات الإدارية. |
| admin_sales | Admin Sales tasks, visits tracking, follow-up, بعض user/role operations | تعتمد على check خاص بكل procedure؛ ليست مساوية لـ adminProcedure. |
| sales_engineer / engineer | tasks, leads, visits, closing, KPI own-scope بحسب caller/UI | protected access عام؛ data scope الموحد غير مثبت لكل namespace. |
| sales_specialist | sales/CRM execution بحسب permissions | بعض router input يقبل الدور، لكن policy مركزية غير موجودة. |
| OAuth admin | `localAuth.me` admin-shaped dashboard path | يجب اعتبار mapping إلى business role قرارًا تشغيليًا يحتاج اعتمادًا. |

# USER ROLES

الـ role ليس مجرد label في الواجهة؛ هو موزع بين `engineers.role`, `engineers.department`, `app_users.role`, legacy `users.role`, والـ permission tables. لذلك لا يجوز استنتاج accessible pages من enum واحدة. النتيجة المؤكدة: جميع procedures الحساسة تقريبًا protected، والعديد من procedures الإدارية تضيف check يدويًا. النتيجة غير المؤكدة: هل كل صلاحية CRUD المخزنة تنعكس على كل API.

# BUSINESS LOGIC

## Task scoring

`calcTaskScore` يعيد:

| Status | Score |
|---|---:|
| `completed` | 1 |
| `delayed`, <=1 day | 0.5 |
| `delayed`, 2 days | 0.3 |
| `delayed`, 3 days | 0.1 |
| `delayed`, >3 days | 0 |
| `not_done` | 0 |
| `client_delay` | -1 marker، ويُستبعد من scoring |
| `planned` | -1 marker، ويُستبعد من scoring |

`getDailyTasksStats` يستبعد أدوار Admin Sales/system-like من إحصاءات المهام العادية، ويحوّل نقاط المهام القابلة للتقييم إلى percentage. قواعد التصنيف المرئي: >=90 ممتاز، >=70 جيد، >=50 مقبول، وإلا ضعيف.

## Visit workflow

```mermaid
stateDiagram-v2
    [*] --> booked
    booked --> distributed
    distributed --> confirmed_same_day
    distributed --> confirmed_late
    distributed --> not_confirmed
    confirmed_same_day --> scheduled
    confirmed_late --> scheduled
    not_confirmed --> scheduled
    scheduled --> completed
    scheduled --> delayed
    scheduled --> cancelled
    scheduled --> rescheduled
    completed --> uploaded_same_day
    completed --> uploaded_late
    completed --> not_uploaded
    uploaded_same_day --> successful
    uploaded_late --> with_issues
    not_uploaded --> pending
```

الرسم يوضح مراحل وenums الموجودة، وليس transition validator موحدًا. actual transition rules موزعة في `VisitsModule` و`db.ts`; لذلك الانتقالات المسموحة بالتفصيل تحتاج اختبارات مباشرة لكل mutation.

## Deal workflow

المراحل الفعلية هي `proposal → negotiation → contract_sent → closed_won/closed_lost`. عند الإغلاق تخزن الحقول `closedAt`, `closingMonth`, `closingYear`; ويمكن تعيين `accountingMonth/accountingYear` للمدير/manager. في عدة دوال performance توجد أولوية: accounting month ثم closing month ثم `closedAt`, بينما يجب اختبار كل report مستقلًا.

## Commission

`calcCommission` يختار tier الأعلى الذي يطابق `achievementPct` ويحسب `salesAmount * commissionPct / 100` مع rounding إلى integer. `calcProgressiveCommission` يستخدم الشرائح المعرفة في `server/db.ts`: أول 1,000,000 بنسبة 1%، ثم 1.25%، 1.5%، 1.75%، 2% على الأجزاء التالية، وبعد 2M يزيد 0.25% لكل 250K على الجزء الزائد. هذه قيم تنفيذية وليست توصية مالية.

## Discount

`getDiscountTier` يختار الشريحة حسب `salesAmount` و`minSales/maxSales`. الصفقات تحمل discount percent/value، max discount، approval status، saved bonus؛ وتوجد جداول allocations وbonus caps. توجد أيضًا functions performance/composite score. لا توجد وثيقة واحدة تثبت أن كل شاشة تعتمد formula واحدًا؛ توحيد authoritative formula مطلوب.

## Promotion/evaluation

التقييم الشهري يخزن خمسة scores: sales achievement, closing rate, meeting, playbook usage, task discipline، ثم overall/performance level `a_player/b_player/c_player`. career levels هي `sales_engineer`, `senior_sales_engineer`, `sales_consultant`، مع promotion eligibility وconsecutive months وfiring decision flags. actual promotion rules موزعة في `db.ts` وrouter ويجب اختبارها كجدول قرارات.

## Project timeline

الـ project لا يبدأ تلقائيًا فقط لأن deal أغلقت؛ schema يملك pre-execution state، site readiness، survey، execution clock، stages، SLA، holds، delay ownership، completion/closure وaudit history. `projectTimeline` يضيف scope checks ثم يستدعي functions التي تحفظ current state وسجل movement/delay/update/audit.

# STATE MANAGEMENT

لا يوجد Redux/Zustand store مثبت في الملفات المفحوصة. الحالة موزعة بين:

| نوع الحالة | مكانها | أمثلة |
|---|---|---|
| Server/cache state | TanStack Query عبر `trpc.*.useQuery` | lists/stats/KPI/data. |
| Local page state | `useState` داخل pages | active tab، dialogs، filters، forms. |
| Layout persistence | `localStorage` في DashboardLayout | `sidebar-width`. |
| Context | `ThemeContext`, React Query provider | theme/client cache. |
| Auth state | `useLocalAuth`, `useAppAuth`, `useRoleAccess` | session/role/permissions. |
| Form state | local state وبعض React Hook Form dependencies | dialogs and field collections. |

بعد mutation، الصفحات غالبًا تستدعي `utils.<namespace>.<procedure>.invalidate()` أو refetch. caching defaults تختلف؛ `useAppAuth` يحدد stale time 5 minutes/no retry، بينما العديد من page queries تعتمد defaults.

# SERVICES & UTILITIES

`server/db.ts` هو service/data-access monolith: يضم CRUD، calculators، KPI، discount، commission، follow-up، project timeline، playbook، auth helpers. `server/localAuth.ts` auth service. `server/_core/llm.ts`, `imageGeneration.ts`, `voiceTranscription.ts`, `map.ts`, `notification.ts`, `storage.ts` integration helpers. shared utilities تشمل `dateUtils.ts`, `money.ts`, `activityTypes.ts`, `authorization.ts`, و`const.ts`.

لا توجد repository classes أو domain service boundaries واضحة مستقلة؛ معظم business modules تستدعي functions exported من `db.ts`. هذا يسهّل البحث عن التنفيذ لكنه يرفع coupling ويصعب الفصل transactional/domain boundaries.

# EXTERNAL INTEGRATIONS

## المثبت في الكود

| Integration | Evidence | الاستخدام المؤكد |
|---|---|---|
| Manus OAuth | `server/_core/oauth.ts`, sdk/context | callback وidentity. |
| Forge-compatible LLM | `_core/llm.ts` | helper يستدعي endpoint خارجي عند توفر credentials. |
| Forge image generation | `_core/imageGeneration.ts` | helper يولد image ويحفظها عبر storage؛ caller التجاري غير مثبت. |
| S3-compatible storage | `server/storage.ts`, AWS SDK | upload/presigned helpers؛ callers يجب تتبعهم per feature. |
| Google Maps-style API | `_core/map.ts`, `@types/google.maps` | geocode/directions/places/static map helpers؛ live usage في business pages غير مثبت بالكامل. |
| Notifications | `_core/notification.ts` | helper/framework capability؛ مسار الإرسال الفعلي لكل event يحتاج verification. |
| Excel/PDF client tooling | `xlsx`, `jspdf`, `html2canvas` | import/export/render behavior في pages. |

لا يوجد دليل مصدر مؤكد على WhatsApp أو Email أو payment gateway أو Firebase في code paths الحالية. يجب تصنيفها **Missing/Needs Verification** بدل افتراض وجودها.

# AI / GEMINI ARCHITECTURE

`server/_core/llm.ts` يعرّف `invokeLLM`; payload يحمل model `gemini-2.5-flash`, messages normalized، optional tools/tool choice، optional response format/output schema، `max_tokens=32768`، وthinking budget 128. الطلب يذهب إلى `ENV.forgeApiUrl` مع Bearer `ENV.forgeApiKey`; failure يرمي error يتضمن HTTP status/text.

لكن البحث الحالي وجد `AIChatBox` و`ComponentShowcase` كواجهة/مثال، ولم يثبت live `ai` namespace في `server/routers.ts` أو business caller يستدعي `invokeLLM`. لذلك:

```text
Implemented: generic LLM transport capability.
Partially Implemented: AIChatBox presentation/example contract.
Not proven: live Gemini feature, prompt ownership, business data passed to AI,
structured-output validation at a product boundary, fallback, persistence, governance.
```

# FORMS & USER ACTIONS

| Action | Page/component | Handler/API | Persistence/effect |
|---|---|---|---|
| Login | LoginPage | `localAuth.login` | local JWT cookie. |
| Logout | DashboardLayout/useAuth | `localAuth.logout` أو `appUsers.logout` | clears cookie/cache. |
| Create task | Tasks/InteractiveCalendar/DailyTimeline | `tasks.create`, `tasks.createWithTime` | `daily_tasks`. |
| Edit/move task | InteractiveCalendar | `tasks.updateFull`, `tasks.moveTask` | task date/time/engineer. |
| Complete/delay task | UpdateStatusDialog | `tasks.updateStatus` | status, score fields, optional rescheduled task. |
| Create lead | Leads | `leads.create` | `leads`. |
| Create/update visit | Visits/FullUpdateDialog | `visits.create`, `visits.updateFull` | stage fields/fee/payment. |
| Create/update deal | Closing | `closing.create`, `closing.updateStage` | `deals`, timeline/tasks effects. |
| Reopen/assign deal | Closing | `closing.reopen`, `closing.updateEngineer` | deal owner/stage/audit behavior. |
| Add payment/promise | Collections | `financial.addPayment*`, `addPromise`, `updatePromise` | collections/payment/promise/commission. |
| Set goals | Planning | `planning.setCompanyGoal`, `setPersonalGoal`, target mutations | goal tables. |
| Import playbook | Sales Execution | `playbook.import` | `playbook_items`. |
| Transition project | Project Timeline | `projectTimeline.transition` | project current state + movement/audit. |
| Manage users/permissions | Admin pages | `appUsers.*`, `rolePermissions.*`, `sectionPermissions.*` | identity/permission/activity rows. |

# STATUS & WORKFLOW SYSTEM

## Status enumerations المؤكدة

| Entity | Statuses |
|---|---|
| Lead | `new`, `contacted`, `qualified`, `unqualified`, `converted` |
| Visit | `scheduled`, `completed`, `delayed`, `cancelled`, `rescheduled` |
| Visit booking | `booked`, `distributed`, `distribution_delayed` |
| Visit confirmation | `confirmed_same_day`, `confirmed_late`, `not_confirmed` |
| Visit upload | `uploaded_same_day`, `uploaded_late`, `not_uploaded` |
| Visit quality | `successful`, `with_issues`, `design_rejected`, `repeated`, `pending` |
| Deal | `proposal`, `negotiation`, `contract_sent`, `closed_won`, `closed_lost` |
| Collection | `on_track`, `due_soon`, `overdue`, `completed` |
| Payment promise | `pending`, `paid`, `overdue` |
| Project | `on_time`, `at_risk`, `delayed`, `critical_delay`, `on_hold`, `completed`, `closed` |
| Meeting session | `active`, `completed`, `abandoned` |
| Evaluation | `a_player`, `b_player`, `c_player` |

المعنى والآثار المباشرة لكل transition موجودة في schema/router/db functions، لكن ليست كل الانتقالات محكومة بآلة حالات منفردة. `projectTimeline` هو الأقرب إلى workflow domain مستقل لأنه يحافظ على movements/delays/audits.

# CRM STRUCTURE

النواة CRM هي `leads → visits → deals → collections/projects` مع أن الربط اختياري في بعض الأعمدة. توجد أيضًا activities على شكل tasks, work logs, lead follow-up, deal timeline, meeting sessions، وdeal tasks. `customers/products/sales/sale_items` نموذج legacy منفصل عن مسار leads/deals الحديث؛ اعتباره active أو transitional يحتاج قرارًا.

| CRM concept | Implementation |
|---|---|
| Leads | `leads`, `leadDailyStats`, `leadFollowupLogs`. |
| Visits | `visits`, visit stage/status/KPI functions. |
| Deals/opportunities | `deals`, `dealTimeline`, `dealTasks`, discount functions. |
| Activities | `dailyTasks`, `workLogs`, meeting/session actions. |
| Follow-ups | deal tasks, payment promises, lead follow-up. |
| Customer history | partial across timeline/audit/payment/project records؛ unified customer profile غير مثبت. |
| Communication | recording links/notes؛ WhatsApp/email integration غير مثبت. |

التصنيف: **Implemented** في leads/visits/deals/tasks/follow-up؛ **Partially Implemented** في unified customer/contact/opportunity model؛ **Needs Verification** في legacy sales model.

# SALES / PRICING SYSTEM

يوجد مساران:

1. **Deal/discount/collection path:** deal value/gross/net/discount/accounting month، discount tiers/allocations/bonus، collections/payments/commission.
2. **Legacy catalog/invoice path:** customers/products/sales/sale_items مع price/cost/stock/tax/discount/finalAmount.

السعر في Playbook quotation يمكن أن يأتي من input العناصر والـ price؛ deal discount يدخل من Closing ويخضع لـ Zod وباقي validation functions؛ commission يقرأ target/achievement tiers. لا توجد بوابة واحدة واضحة لتحديد «من يعتمد السعر» لكل المسارات. هذا **Unknown / Needs Verification**، خاصة إذا كان legacy invoice flow ما زال مستخدمًا.

# DEPENDENCY MAP

```mermaid
flowchart TD
    App[Application entry] --> Layout[Dashboard layout]
    Layout --> AuthHooks[Auth and role hooks]
    Layout --> Pages[Domain pages]
    Pages --> Components[Shared UI components]
    Pages --> TRPC[Typed API client]
    TRPC --> Router[Router procedures]
    Router --> Auth[Auth context]
    Router --> DB[Data access layer]
    DB --> Schema[Database schema]
    DB --> Migrations[Database migrations]
    DB --> Integrations[External integrations]
```

## Coupling and circularity

لا توجد circular dependency مثبتة آليًا في الفهرس الحالي، لكن `server/routers.ts` يستورد عددًا ضخمًا من exports من `db.ts`، و`db.ts` يجمع مجالات كثيرة. هذا **high coupling** مؤكد بنيويًا. يجب تشغيل dependency graph متخصص قبل الجزم بعدم وجود cycles runtime.

# WHO CALLS WHO

| Caller | Calls | Called responsibility |
|---|---|---|
| `App.tsx` | Wouter + `DashboardLayout` | route/layout composition. |
| `DashboardLayout` | `useLocalAuth`, `useRoleAccess`, `localAuth.logout` | session/menu/logout. |
| `LoginPage` | `localAuth.login`, `appUsers.changePassword` | login/forced password flow. |
| Tasks pages/components | `tasks.*`, `meetingReview.*`, `adminSalesTasks.*`, `dealTasks.*`, `kpi.*` | task calendar/scoring/review/follow-up. |
| Visits page | `visits.*`, `engineers.list` | stage tracking and KPI. |
| Closing page | `closing.*`, `dealTasks.*`, `kpi.teamCompositeDiscountScore`, `softDelete.deal` | deal/discount/lost/timeline. |
| Collections page | `financial.*`, `engineers.list` | contracts/payments/promises/commission. |
| KPI page | `kpi.*`, `dealTasks.complianceReport` | performance and rewards. |
| Planning page | `planning.*`, target procedures | company/engineer/personal goals. |
| SalesExecution page | `playbook.*`, `promotion.*`, `funnel.*` | playbook/review/funnel/coaching. |
| ProjectTimeline page | `projectTimeline.*` | project state/history/import/analytics. |
| `server/_core/index.ts` | Express/tRPC/OAuth/REST | HTTP boundary. |
| `createContext` | SDK/local/app-user verification | request actor. |
| `server/routers.ts` | `server/db.ts` + auth helpers | API/business orchestration. |
| `server/db.ts` | Drizzle/MySQL + optional helpers | persistence/calculation/integration. |

# COMPLETE USER JOURNEYS

## Sales engineer journey — inferred from implemented paths

```text
Login
  → Overview
  → View/create daily task
  → Schedule or execute visit
  → Confirm/upload/quality tracking
  → Create or update deal
  → Set next action and deal task
  → Close won/lost with discount/accounting fields
  → Collection contract/payments
  → KPI/commission/review visibility
```

## Admin Sales journey — inferred

```text
Login as Admin Sales
  → Admin Sales tasks/meetings
  → Distribute visits and monitor confirmation/upload/debt
  → Log lead follow-up
  → Review meeting recording
  → View Admin Sales KPI and team summaries
```

## Manager/admin journey — inferred

```text
Login
  → KPI/Sales/Planning
  → Configure targets/discount/commission tiers
  → Manage users and role/section permissions
  → Review promotion/evaluation
  → Manage Project Timeline stages/holds/delays/import
```

هذه journeys توحّد عدة source files ولذلك هي **Inferred**, وليست workflow contract مكتوبًا من product owner.

# COMPLETE SYSTEM FLOWS

## Deal-to-collection flow

1. المستخدم ينشئ deal من Closing أو من task auto-create.
2. router يتحقق من input، وقد يمرر discount validation/full update.
3. `deals` يحفظ stage/value/gross/net/discount/period fields.
4. stage closed يضيف closed timestamp/period values في المسار المناسب.
5. collection module ينشئ contract يدويًا أو عبر auto-create من deal.
6. payments وpromises تُحفظ تحت collection.
7. commission functions تحسب progressive/collection-based values.
8. KPI/reports تقرأ deal/collection/target records وتعيد charts/tables.

## Meeting-recording flow

1. task ذات category/type meeting تظهر recording UI.
2. المستخدم يحفظ URL عبر `meetingReview.submitLink` أو task endpoint.
3. الخادم يحدّث `daily_tasks.meetingRecordingLink`.
4. عند status completed يتحقق `updateTaskStatus` من وجود الرابط.
5. يفتح المسار review task عند الحاجة.
6. Admin Sales يسجل meeting review عبر promotion/meetingReview.

## Project execution flow

1. project sync يبحث عن closed deals.
2. project يبدأ في pre-execution state، لا في execution clock بالضرورة.
3. الإدارة تحدّث site readiness/survey/pre-execution.
4. authorized actor يبدأ execution.
5. stage transitions تحفظ current stage وmovement/history.
6. delay/hold تُسجل مع owner/reason/dates.
7. updates/audits ترافق التقدم.
8. close يضع completion/closing fields ويترك التاريخ محفوظًا.

# ENVIRONMENT VARIABLES & CONFIGURATION

| Variable | Purpose | Used in | Required/optional بحسب source |
|---|---|---|---|
| `DATABASE_URL` | MySQL connection and Drizzle commands | `db.ts`, `drizzle.config.ts`, scripts, readiness | Required for database/build operations; production startup validates it. |
| `APP_JWT_SECRET` | application-owned session-secret override | `_core/env.ts` | Optional if `JWT_SECRET` exists; production needs effective secret >=32 chars. |
| `JWT_SECRET` | fallback session/JWT secret source | `_core/env.ts`, `db.ts` | Required effectively when APP_JWT_SECRET absent; actual deployment length test expects 96. |
| `VITE_APP_ID` | app/platform identifier | `_core/env.ts` | Optional/default empty in source. |
| `OAUTH_SERVER_URL` | OAuth server URL | `_core/env.ts` | Optional/default empty in source. |
| `OWNER_OPEN_ID` | owner identity metadata | `_core/env.ts` | Optional/default empty in source. |
| `BUILT_IN_FORGE_API_URL` | LLM/image/voice-compatible API base | `_core/env.ts` and helpers | Required only when integration invoked. |
| `BUILT_IN_FORGE_API_KEY` | Bearer credential for Forge helpers | `_core/env.ts` and helpers | Required only when integration invoked. |
| `CORS_ORIGIN` | allowlisted origin for REST compatibility endpoints | `_core/index.ts` | Optional; behavior depends on origin/config. |
| `PORT` | preferred server port | `_core/index.ts` | Optional; defaults to 3000 and scans upward. |
| `NODE_ENV` | development/production behavior | server/vite/routers | Runtime switch. |

لا توجد قيم فعلية للأسرار في الوثيقة.

# SECURITY ANALYSIS

## Authentication security

الإيجابي: local session يعيد تحميل engineer ويفحص active/isDeleted؛ passwords تستخدم bcrypt؛ cookies المحلية/app-user مضبوطة HttpOnly في مسارات login؛ production startup يرفض غياب `DATABASE_URL` أو session secret قصير. المخاطر: مدة local JWT سنة، app-user token يحتاج سياسة revocation/versioning أوضح، ووجود عدة identity stores يزيد احتمال divergence.

## Authorization/API security

معظم domain procedures protected، وبعض admin operations تضيف role arrays داخل handler. لكن matrix المخزنة في `role_permissions/user_permissions/section_permissions` ليست policy middleware موحدًا لكل procedures. إخفاء sidebar ليس authorization. يجب اختبار direct API calls لكل role/mutation.

## Input/security concerns

Zod حاضر على router inputs، مع min/max وenum وURL validation في مواضع كثيرة. توجد مسارات تقبل `z.string()` عامة أو `any` data في legacy CRUD، لذلك التحقق غير متجانس. SQL injection risk منخفض نسبيًا في Drizzle parameterization، لكن raw `sql` predicates موجودة وتحتاج مراجعة. CSRF/rate limiting ليسا مثبتين بشكل شامل في source. رفع الملفات/روابط receipts يعتمد على URL/storage helpers؛ MIME/size/content validation التفصيلية **Needs Verification**.

## Data exposure

REST compatibility endpoints محمية الآن عبر `getAdminCallerFromRequest` وCORS allowlist behavior، وتعيد deal/KPI data. يجب توثيق consumers قبل تغيير contract. Error messages في بعض router paths عربية عامة، لكن بعض helpers قد تسجل/ترمي raw error؛ audit logging لا يساوي redaction.

# ERROR HANDLING

| Layer | Behavior الحالي |
|---|---|
| Frontend | `toast.error` في mutation callbacks، `ErrorBoundary` حول App. |
| tRPC | `TRPCError` للـ unauthorized/forbidden/conflict/bad request في مواضع مختارة. |
| Local auth | login returns failure/throws generic Arabic message؛ verify catches and returns null. |
| Database | `getDb()` قد يعيد null؛ عدة helpers تعيد []/null/undefined أو success-like false. |
| REST | 401 auth required، 503 DB unavailable، 500 internal server error. |
| LLM | `invokeLLM` يرمي error عند non-2xx؛ لا fallback business route مثبت. |
| Frontend query | pages غالبًا تستخدم defaults وloading/fallback؛ التغطية ليست موحدة. |

الخطر التشغيلي هو أن بعض missing-database branches لا تفشل fail-fast في كل mutation path. ينبغي الفصل بين mock/development behavior وproduction service unavailable.

# PERFORMANCE

المؤشرات الحالية: `server/db.ts` و`routers.ts` كبيران؛ pages مثل InteractiveCalendar وTasksModule وProjectTimeline كبيرة؛ بعض dashboard queries متعددة عند mount؛ React Query يخفف جزءًا من duplicate requests لكن invalidations الواسعة قد تعيد تحميل أكثر من اللازم. build ينجح لكن bundle warnings/large chunks يجب قياسها. MySQL indexes لا يمكن إعلان اكتمالها إلا من migrations/production schema؛ migration 0057 يضيف FKs لكنه لا يثبت كل indexes المطلوبة. AI latency لا تدخل في business path مثبت حاليًا.

# CURRENT STATE OF THE PROJECT

| التصنيف | ما يدخل فيه |
|---|---|
| Fully implemented at source level | route map، React/Vite shell، tRPC contract، local/app auth paths، schema/migrations، tasks/leads/visits/deals/collections/KPI/planning/reports/playbook/promotion/project timeline implementations، automated tests. |
| Partially implemented | unified authorization policy، unified customer model، period/money policy، AI product feature، transactional cross-domain workflows، complete page-level data-scope policy. |
| Missing/not proven | WhatsApp/email/payment gateway live integrations، live AI business route، authoritative production database parity، complete analytics/observability/rate limiting/CSRF policy. |
| Unclear | status of legacy sales model، consumers of REST compatibility endpoints، approved role matrix، production secret/config values، business policy for reopening/reversals. |

# CRITICAL ARCHITECTURE RISKS

| Severity | Problem | Location | Impact | Suggested solution |
|---|---|---|---|---|
| Critical | Multiple auth sources and role vocabularies | `context.ts`, `localAuth.ts`, schema, shared auth | identity/permission divergence. | canonical actor + account resolver + role mapping. |
| Critical | Authorization rules are split across guard and inline arrays | `trpc.ts`, `routers.ts`, UI hooks | inconsistent direct API authorization. | default-deny policy service `requirePermission(module, action, scope)`. |
| High | Monolithic data/business layer | `server/db.ts` | change risk and hidden coupling. | split domain services/repositories. |
| High | Multi-table financial/workflow writes need transaction/idempotency audit | deal/collection/project functions | partial state on failure/retry. | DB transactions, idempotency keys, failure tests. |
| High | Environment-dependent readiness test | `env.runtime.test.ts`, `DATABASE_URL`/secret | false confidence in CI/local validation. | disposable DB + secrets fixture/CI contract; fail fast. |
| Medium | Period attribution and money semantics are distributed | sales/KPI/discount/collections | report/payout disagreement. | one period attribution and money policy. |
| Medium | Large initial client/domain bundles and eager query fan-out | pages/build output | slower initial load and unnecessary queries. | lazy domain chunks, query aggregation/prefetch policy. |
| Low | Legacy/duplicate definitions and broad `any` inputs | legacy CRUD, role enums, old tables | maintenance ambiguity. | deprecation plan and stricter contracts. |

# RECOMMENDED FUTURE ARCHITECTURE

## CURRENT ARCHITECTURE

```mermaid
flowchart LR
    Browser --> ReactPages
    ReactPages --> APIClient[Typed API client]
    APIClient --> Router
    Router --> MonolithDB[Data access layer]
    MonolithDB --> MySQL[MySQL database]
    MonolithDB --> Helpers[Integration helpers]
```

## RECOMMENDED ARCHITECTURE

```mermaid
flowchart LR
    Browser --> WebApp[React feature modules]
    WebApp --> ClientSDK[Typed client]
    ClientSDK --> API[Authenticated API boundary]
    API --> Actor[Canonical actor resolver]
    Actor --> Policy[Permission and data scope policy]
    Policy --> Domain[Domain services]
    Domain --> Repo[Focused repositories]
    Repo --> MySQL[MySQL database]
    Domain --> Audit[Transactional audit service]
    Domain --> Integrations[External integrations]
    Domain --> Events[Optional event layer]
```

التوصية لا تعني أن المشروع الحالي يملك هذه الطبقات؛ هي target architecture منفصلة. ترتيب التنفيذ: توحيد actor والpolicy، تثبيت test DB، معاملات financial/workflow، فصل `db.ts` حسب domains، ثم code-splitting/observability.

# MASTER SYSTEM MAP

```mermaid
flowchart TD
    Users[Users / Engineers / App Users]
    Roles[Roles + Permission Rows]
    Pages[Wouter Pages]
    Components[Layout + Domain + UI Components]
    State[React local state + TanStack Query]
    Services[tRPC procedures + db.ts functions]
    APIs[API and REST compatibility]
    Logic[Business domain logic]
    DB[MySQL database]
    External[OAuth storage maps notifications]
    AI[Gemini LLM helper]
    Users --> Roles --> Pages --> Components --> State --> Services
    Services --> APIs
    Services --> Logic --> DB
    Logic --> External
    Logic -. capability only, live caller unproven .-> AI
```

# MASTER PROJECT TABLE

| Module | Purpose | Main Files | Depends On | Used By | APIs | Database | Role |
|---|---|---|---|---|---|---|---|
| Auth/Identity | local/OAuth/app-user sessions | `server/localAuth.ts`, `_core/context.ts`, `routers.ts` | cookies, jose, bcrypt, DB | Login/Layout/all protected procedures | `auth.*`, `localAuth.*`, `appUsers.*` | users/engineers/app_users | all |
| Tasks | daily execution/calendar/scoring | `TasksModule.tsx`, calendar components, db.ts | tRPC, date rules | overview/KPI/deal follow-up | `tasks.*`, `adminSalesTasks.*` | daily_tasks/work_logs/admin_sales_tasks | engineer/admin_sales/manager |
| CRM Leads | lead intake/follow-up | `LeadsModule.tsx`, db.ts | engineers | visits/KPI | `leads.*`, `leadDailyStats.*`, `leadFollowup.*` | leads/follow-up tables | sales roles |
| Visits | booking-to-collection workflow | `VisitsModule.tsx` | leads/engineers | closing/KPI | `visits.*` | visits | sales/admin_sales |
| Closing | deal pipeline/discount/lost analysis | `ClosingModule.tsx` | visits/leads/tasks | finance/KPI/project | `closing.*`, `pipeline.*`, `dealTasks.*` | deals/timeline/discount | sales/manager |
| Sales/KPI | targets, achievement, ranking | `SalesModule.tsx`, `KPIModule.tsx`, db.ts | deals/visits/tasks/targets | reports/planning/promotion | `sales.*`, `kpi.*`, `reports.*` | target/tier/review tables | managers/sales |
| Collections | contracts/payments/promises | `CollectionsModule.tsx` | deals/engineers | KPI/project | `financial.*`, `collections.*` | collections/payments/commission | finance/admin |
| Planning | company/individual/personal goals | `PlanningModule.tsx` | KPI/engineer targets | KPI/reports | `planning.*` | goals/targets | managers/sales |
| Sales Execution | playbook/meeting/funnel/coaching | `SalesExecutionSystem.tsx` | deals/items/sessions | promotion/KPI | `playbook.*`, `session.*`, `funnel.*` | playbook/session/review | sales/manager |
| Promotion | evaluations/career path | `PromotionSystem.tsx` | KPI/reviews | management | `promotion.*` | evaluations/career | manager/admin |
| Project Timeline | post-sale execution | `ProjectTimelineModule.tsx`, db.ts | closed deals/engineers | management/reports | `projectTimeline.*` | projects/stages/history | manager/admin_sales/engineer scope |
| Permissions | role/user/section matrix | `PermissionsPanel.tsx`, shared auth | auth | Layout + admin pages | `rolePermissions.*`, `sectionPermissions.*` | permission tables | manager/admin |
| Legacy Sales | catalog/invoices | schema + routers | products/customers | current usage unclear | `customers.*`, `products.*`, `sales.*` | legacy tables | needs verification |

# FILE-BY-FILE INDEX

الجدول التالي يركز على الملفات الحرجة بدل تكرار كل Radix primitive؛ inventory JSON المرفق يحوي الفهرس الآلي الكامل.

| File | Path | Responsibility | Depends On | Used By | Criticality |
|---|---|---|---|---|---|
| App | `client/src/App.tsx` | route registry/layout/error boundary | Wouter, pages | browser entry | Critical |
| DashboardLayout | `client/src/components/DashboardLayout.tsx` | shell/session/menu/sidebar | auth hooks, trpc | all dashboard pages | Critical |
| TasksModule | `client/src/pages/TasksModule.tsx` | task/calendar/admin-sales UX | tasks/admin APIs | route `/tasks` | High |
| VisitsModule | `client/src/pages/VisitsModule.tsx` | visit stages/KPI/debt | visits APIs | `/visits` | High |
| ClosingModule | `client/src/pages/ClosingModule.tsx` | deal/discount/timeline | closing/KPI/deal task APIs | `/closing` | Critical |
| CollectionsModule | `client/src/pages/CollectionsModule.tsx` | payment/contract workflow | financial APIs | `/collections` | Critical |
| KPIModule | `client/src/pages/KPIModule.tsx` | KPI/ranking/rewards | kpi APIs | `/kpi` | High |
| PlanningModule | `client/src/pages/PlanningModule.tsx` | targets/goals/distribution | planning APIs | `/planning` | High |
| SalesExecutionSystem | `client/src/pages/SalesExecutionSystem.tsx` | playbook/review/funnel/coaching | playbook/promotion/funnel APIs | `/sales-execution` | High |
| ProjectTimelineModule | `client/src/pages/ProjectTimelineModule.tsx` | project execution control | projectTimeline APIs | `/project-timeline` | Critical |
| routers.ts | `server/routers.ts` | tRPC public contract/orchestration | db/auth/shared | all API calls | Critical |
| db.ts | `server/db.ts` | DB access/calculations/domain logic | Drizzle/schema/MySQL | routers | Critical |
| context.ts | `server/_core/context.ts` | request identity/actor | sdk/local/app auth | tRPC | Critical |
| trpc.ts | `server/_core/trpc.ts` | guard middleware | context | routers | Critical |
| localAuth.ts | `server/localAuth.ts` | local login/session/password | jose/bcrypt/engineers | auth router/context | Critical |
| index.ts | `server/_core/index.ts` | Express bootstrap/HTTP | routers/db/oauth/vite | process start | Critical |
| schema.ts | `drizzle/schema.ts` | relational model/types | drizzle mysql-core | db/migrations | Critical |
| 0057 FK migration | `drizzle/0057_enforce_core_relationships.sql` | core FK constraints | existing tables | database | High |
| authorization.ts | `shared/authorization.ts` | roles/modules/constants | none | UI/server | High |
| llm.ts | `server/_core/llm.ts` | generic LLM transport | Forge env | potential callers | Medium |

# FINAL NEW DEVELOPER GUIDE

## If you are new to this project

### Read these files first

1. `client/src/App.tsx` لفهم routes.
2. `client/src/components/DashboardLayout.tsx` لفهم shell/session/menu.
3. `server/_core/context.ts` و`server/_core/trpc.ts` لفهم actor/guards.
4. `server/routers.ts` لفهم API surface.
5. `server/localAuth.ts` لفهم login المحلي.
6. `drizzle/schema.ts` و`drizzle/0057_enforce_core_relationships.sql` لفهم data model/FKs.
7. `server/db.ts` لفهم business calculations، لكن اقرأه حسب domain لا دفعة واحدة.

### Understand these modules first

1. Tasks + visits لأنهما التشغيل اليومي والانتقال إلى deal.
2. Closing + discount لأنهما يؤثران على KPI/collections/projects.
3. Collections + commission لأنهما ماليان وحساسان.
4. Project Timeline لأنه يحافظ على history بعد الإغلاق.
5. Permissions/Auth لأن تغييرهما قد يفتح أو يغلق النظام بالكامل.

### Main business flow

```text
Identity
 → Tasks / Leads
 → Visits
 → Deals / Discount / Next Step
 → Closed Won/Lost
 → Collection Contract / Payments
 → KPI / Commission / Evaluation
 → Project Timeline execution
```

### Most important APIs

ابدأ بـ `localAuth.*`, `tasks.*`, `visits.*`, `closing.*`, `financial.*`, `kpi.*`, `projectTimeline.*`, ثم `appUsers.*` وpermission namespaces. الفهرس الكامل أعلاه هو المرجع الحرفي للأسماء والguards.

### Most important database entities

`engineers`, `daily_tasks`, `leads`, `visits`, `deals`, `collections`, `payments`, `engineer_targets`, `company_goals`, `project_stages`, `projects`, `project_movements`, `role_permissions`, `user_permissions`, و`activity_logs`.

### Most dangerous areas to modify

Authentication/session cookies، role checks، deal stage/discount/accounting month، payment/commission calculations، project creation/transition/closure، migrations، soft-delete، وperiod/date calculations.

### Things you must NOT break

لا تسمح anonymous mutation؛ لا تعتمد على sidebar كauthorization؛ لا تغيّر financial period/money rules دون regression tests؛ لا تحذف migrations deployed؛ لا تكسر audit/history؛ لا تجعل mutation متعددة الجداول تبلغ success بعد partial failure؛ ولا تعرض secrets في logs أو docs.

# UNKNOWN / NEEDS VERIFICATION

1. مطابقة production schema الفعلية مع `drizzle/schema.ts` وجميع migrations.
2. قيم/طول/rotation للـ `APP_JWT_SECRET` أو `JWT_SECRET` في كل بيئة.
3. المصدر الرسمي لهوية business user: `engineers` أم `app_users` أم الربط بينهما.
4. مصفوفة role → module → CRUD → data scope المعتمدة من business owner.
5. هل `role_permissions`, `user_permissions`, و`section_permissions` enforce فعليًا على كل procedure أم تُستخدم للواجهة فقط في بعض المسارات.
6. مستهلكو `/api/summary`, `/api/list`, `/api/kpi` ومتطلبات versioning/auth/CORS الخاصة بهم.
7. هل WhatsApp/email/payment gateways/Firebase/analytics مطلوبة فعلًا؛ لا يوجد live implementation مؤكد لها في المصدر المفحوص.
8. هل AI/Gemini live feature مستخدمة أم أن `AIChatBox` و`invokeLLM` مجرد infrastructure/example.
9. authoritative policy للشهر: accounting vs closing vs closedAt لكل KPI/report/commission/discount.
10. policy إعادة فتح deal مغلق، وعكس collection/commission/project effects.
11. status transition matrix الكاملة لكل visit/deal/project، ومن يحق له كل transition.
12. هل legacy `customers/products/sales/sale_items` ما زال active أم transitional أم retirement candidate.
13. semantics النهائية لقيم `value`, `grossValue`, `netValue`, `discountValue`, collected cash، وrecognized revenue.
14. storage/file upload validation للـ payment screenshots وrecording links وhistorical imports.
15. readiness/test contract في CI؛ الفحص المحلي الحالي فشل test runtime بسبب غياب secret/database configuration.
16. وجود indexes إضافية في production غير ممثلة في migrations الحالية.
17. observability، rate limiting، CSRF policy، backup/restore، وincident response خارج source repository.

# REFERENCES

[1]: ../client/src/App.tsx "Route registry and application composition"
[2]: ../client/src/components/DashboardLayout.tsx "Dashboard layout, redirect, sidebar and role access"
[3]: ../client/src/pages/TasksModule.tsx "Task module and user actions"
[4]: ../client/src/pages/VisitsModule.tsx "Visits workflow and stage tabs"
[5]: ../client/src/pages/ClosingModule.tsx "Deal/closing UI and API calls"
[6]: ../client/src/pages/CollectionsModule.tsx "Collections UI and financial calls"
[7]: ../client/src/pages/PlanningModule.tsx "Planning and targets UI"
[8]: ../client/src/pages/SalesExecutionSystem.tsx "Playbook, reviews, funnel and coaching UI"
[9]: ../client/src/pages/ProjectTimelineModule.tsx "Project timeline UI and workflows"
[10]: ../server/_core/index.ts "Express bootstrap, REST, health/readiness and tRPC mount"
[11]: ../server/_core/context.ts "Request actor resolution"
[12]: ../server/_core/trpc.ts "Procedure guards"
[13]: ../server/localAuth.ts "Local JWT session and password login"
[14]: ../server/routers.ts "Complete tRPC router contract"
[15]: ../server/db.ts "Data access and business logic"
[16]: ../drizzle/schema.ts "MySQL/Drizzle schema"
[17]: ../drizzle/0057_enforce_core_relationships.sql "Core foreign-key constraints"
[18]: ../drizzle/relations.ts "Currently empty Drizzle relation module"
[19]: ../shared/authorization.ts "Role and module constants"
[20]: ../server/_core/llm.ts "LLM helper and Gemini model reference"
[21]: ../package.json "Dependencies and scripts"
[22]: ../vite.config.ts "Vite/Tailwind/runtime configuration"
[23]: ../review_artifacts/validation_summary.md "Local validation results"
[24]: ../review_artifacts/reverse_engineering_inventory.json "Generated repository inventory"
[25]: ../review_artifacts/api_inventory.json "Generated API namespace/procedure inventory"
'''

DOC.write_text(static, encoding="utf-8")
print(f"Wrote {DOC} ({len(static.splitlines())} lines, {len(static)} bytes)")

if __name__ == "__main__":
    pass
