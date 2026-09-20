# تقرير تدقيق Authorization وPermissions

## الملخص التنفيذي

التطبيق لا يملك حاليًا مصدرًا واحدًا مكتملًا للحقيقة بالنسبة إلى التفويض. توجد ثلاثة نماذج بيانات مستقلة نسبيًا: `role_permissions` لصلاحيات الوحدات على مستوى الدور، و`section_permissions` لصلاحيات ظهور الأقسام وتعديلها، و`user_permissions` لصلاحيات المستخدم المباشرة. كما توجد قواعد ثابتة في `shared/authorization.ts` وبعض فحوص الدور المباشرة داخل الراوتر. الواجهة تعرض هذه الأنظمة في صفحات متقاربة، لكنها لا تجعلها نظامًا واحدًا يُستخدم تلقائيًا في كل endpoint.

النتيجة الأهم للطلب الحالي هي أن **المهام ليست معزولة server-side حسب المستخدم**. حقول المهام تحتوي على `engineerId`، وهذا يتيح تطبيق ownership بصورة صحيحة، لكن endpoints القراءة والتعديل والحذف والتنفيذ الحالية تقبل `engineerId` من العميل أو `id` فقط، ولا تربط الطلب بالـ actor المصادق عليه. لذلك يستطيع مستخدم مصادق عليه حاليًا طلب مهام مستخدم آخر أو تعديلها أو حذفها عبر API إذا عرف المعرفات المناسبة. إخفاء المهام في الواجهة لن يعالج ذلك.

لم يتم تنفيذ أي تغيير سلوكي في هذا التدقيق. التوصية الآمنة هي توحيد حل الهوية أولًا، ثم إضافة authorization مركزي يجمع **permission + scope + ownership** على جميع مسارات المهام، ثم إضافة اختبارات API تثبت أن المهندس يرى ويعدل مهامه فقط، بينما الإدارة ترى كل المهام.

## الإجابة المباشرة على السؤال المعماري

لا يوجد حاليًا مسار واحد مكتمل من النوع التالي:

```text
App User → Role → Permissions → Resource Scope → Backend Check
```

الموجود فعليًا أقرب إلى الآتي:

```text
App User ── role ───────────────┐
       └─ user_permissions       ├─ بيانات تُقرأ في بعض endpoints أو الواجهة
                                  │
Local engineer session ─ role ────┤
                                  ├─ فحوص role ثابتة في الراوتر
role_permissions ─ role/module ──┤
section_permissions ─ role/section┘

Task endpoint → protectedProcedure فقط
Task query/mutation → لا يوجد owner/scope check مركزي
```

وبالتالي فالإجابة على السؤال الحرج هي: **هناك أجزاء من System A وأجزاء من System B، وليسا مصدرًا واحدًا متزامنًا بالكامل**. لوحة صلاحيات الأدوار تكتب إلى `role_permissions`، ولوحة الأقسام تكتب إلى `section_permissions`، وإدارة المستخدمين تكتب إلى `user_permissions`. لكن معظم endpoints لا تقرأ هذه الجداول لاتخاذ قرار السماح أو الرفض.

## نماذج البيانات الفعلية

| النموذج | الحقول المهمة | الوظيفة الفعلية | ملاحظة التدقيق |
|---|---|---|---|
| `users` | `openId`, `role` | مستخدم OAuth/Manus | يظهر في `ctx.user`، ودوره `admin` يُعامل كصلاحية خاصة في بعض المسارات |
| `app_users` | `username`, `role`, `engineerId`, `status`, `sessionVersion` | نظام الدخول الداخلي | يربط الحساب اختياريًا بهوية مهندس |
| `engineers` | `id`, `username`, `passwordHash`, `role`, `status`, `sessionVersion` | هوية المهندس القديمة ومصدر `local_session` | ما زالت مستخدمة في بعض مسارات الدخول والبيانات |
| `daily_tasks` | `engineerId`, `taskDate`, `status`, `isDeleted` | سجل المهام اليومية | يحتوي على ownership واضح عبر `engineerId` |
| `role_permissions` | `role`, `module`, CRUD، `dataScope` = `own/team/all` | صلاحيات الوحدات على مستوى الدور | تُدار من لوحة الصلاحيات، ولا تُفرض مركزيًا على المهام |
| `section_permissions` | `role`, `module`, `section`, `visibility`، `canEdit` | ظهور الأقسام وتعديلها | تُستهلك أساسًا عبر `sectionPermissions.myPermissions` للواجهة |
| `user_permissions` | `userId`, `module`, CRUD، `dataScope` = `own/all` | صلاحيات مباشرة لمستخدم app user | تُنشأ وتُقرأ وتُعدل، لكن لا يوجد resolver عام يدمجها مع صلاحيات الدور في backend |
| `activity_logs` | `userId`, action, module, recordId | التدقيق التشغيلي | يسجل تغييرات كثيرة، لكنه ليس مصدر authorization |

لا توجد جداول مستقلة باسم `roles` أو `permissions` أو `user_roles`. الدور مخزن كسلسلة أو enum داخل الحساب، والصلاحيات مخزنة مباشرة في جداول permissions.

## دورة الهوية الحالية

يحل `createContext` هوية الطلب بهذا الترتيب:

1. `app_user_token`، ويُحوّل إلى `ctx.actor` بمصدر `app_user`.
2. `local_session`، ويُحوّل إلى `ctx.actor` بمصدر `local`.
3. OAuth user، ويُحوّل إلى `ctx.actor` بمصدر `oauth`.

هذا ترتيب جيد من ناحية وجود actor موحد نسبيًا، لكن العلاقة بين `app_users.engineerId` و`engineers.id` ليست مفروضة بوضوح كقيد foreign key في النموذج المقروء. كما أن بعض المسارات تستخدم `ctx.actor`، وبعضها تستخرج cookies مباشرة، وبعضها تستخدم `ctx.user`. هذا يجعل أي ownership check جديد يحتاج helper مركزيًا بدل إعادة منطق الهوية داخل كل endpoint.

## لوحة الصلاحيات وإدارة المستخدمين

### لوحة الصلاحيات

`rolePermissions` تسمح للإدارة بقراءة وتعديل `role_permissions` لكل دور ووحدة، بما في ذلك CRUD و`dataScope`. الحماية server-side موجودة لهذه اللوحة، وهي مقيدة بـ `manager` أو `admin` عبر `requirePrivilegedRoleManagementCaller`.

`sectionPermissions` تسمح للإدارة بقراءة وتعديل `section_permissions`. معظم عمليات الإدارة هنا تستخدم فحصًا مباشرًا للدور، مثل السماح فقط بـ `manager` و`admin`، بدل helper موحد مع لوحة الأدوار.

### إدارة المستخدمين

إدارة المستخدمين تستخدم `app_users` وتسمح بقراءة وتعديل الحسابات، وبقراءة وتعديل `user_permissions`. توجد حماية server-side لمنع الأدوار غير المصرح بها من إنشاء أو ترقية حسابات `manager` أو `admin`، عبر `assertCanAssignRole` و`canAssignUserRole`.

لكن `user_permissions` لا تظهر كطبقة effective permissions عامة. لا يوجد في المسارات الحالية منطق موحد من النوع:

```text
Effective permissions = role permissions + direct user permissions
```

كما لا يوجد تعريف صريح لما إذا كانت صلاحية المستخدم المباشرة تضيف إلى صلاحية الدور، أو تستبدلها، أو تنقص منها. عمليًا، جلب الصلاحيات المباشرة يحدث في `appUsers.me` وواجهات إدارة المستخدمين، بينما معظم إجراءات النظام تعتمد على role checks أو `protectedProcedure` فقط.

## هل تعديل الصلاحية يغير authorization الفعلي؟

**ليس بشكل عام.** تعديل `role_permissions` يغير السجل في قاعدة البيانات، لكنه لا يضمن أن endpoint مثل `tasks.create` أو `tasks.update` سيقرأ هذا السجل. تعديل `section_permissions` يؤثر على خريطة ظهور الأقسام عندما تستدعي الواجهة `sectionPermissions.myPermissions`، لكنه ليس بديلًا عن فحص backend.

بالتالي، إزالة صلاحية `tasks.create` من لوحة الصلاحيات لا تكفي حاليًا لمنع استدعاء `tasks.create` مباشرة عبر API. هذا خلل authorization وليس مجرد خلل UI.

## تدقيق المهام الحالية

حقول المهام تدعم الملكية من خلال `daily_tasks.engineerId`. لكن endpoints المهام الحالية تستخدم `protectedProcedure` فقط في معظم الحالات، ثم تمرر مدخلات العميل مباشرة إلى طبقة البيانات.

| العملية | الوضع الحالي | المشكلة |
|---|---|---|
| `tasks.list` | يقبل `date` و`engineerId` اختياريًا | المستخدم يستطيع طلب مهام مهندس آخر بتغيير `engineerId`، أو طلب كل مهام اليوم بتركه فارغًا |
| `tasks.stats` | يحسب إحصاءات اليوم العامة | لا يفرض owner scope |
| `tasks.create` | يقبل `engineerId` من العميل | المستخدم يستطيع إنشاء مهمة باسم مهندس آخر |
| `tasks.createWithTime` | يقبل `engineerId` من العميل | نفس المشكلة مع النسخة الزمنية |
| `tasks.updateStatus` | يقبل `id` فقط | لا يتحقق من مالك المهمة قبل تحديثها |
| `tasks.delete` | يقبل `id` فقط | لا يتحقق من مالك المهمة قبل حذفها |
| `tasks.reschedule` | يقبل `id` و`newDate` | لا يتحقق من الملكية |
| `tasks.moveTask` | يمكنه تغيير `newEngineerId` | يسمح نظريًا بإعادة إسناد المهمة دون فحص إداري مركزي |
| `tasks.updateFull` | يمكنه تعديل `engineerId` وكل بيانات المهمة | لا يوجد فحص ownership أو assign permission |
| `tasks.filtered` | فلتر `engineerId` اختياري | لا يوجد owner scope تلقائي |
| `tasks.calendarView` | فلتر `engineerId` اختياري | لا يوجد owner scope تلقائي |
| `tasks.timeline` | فلتر `engineerId` اختياري | لا يوجد owner scope تلقائي |
| `tasks.critical` و`criticalEnhanced` | تقرآن مهامًا عامة | قد تكشفان مهام جميع المهندسين لأي مستخدم مصادق عليه |
| `tasks.missingRecordings` | تقبل `engineerId` اختياريًا | لا يوجد تقييد يمنع قراءة مهام الآخرين |
| `tasks.submitRecording` | يقبل `taskId` فقط | يستطيع المستخدم محاولة تحديث تسجيل مهمة ليست له |

الخلاصة: **البنية تحمل ownership، لكن enforcement غير موجود بشكل شامل**.

## مصفوفة الصلاحيات الحالية الفعلية

المصفوفة التالية تصف ما يفرضه backend الآن، وليس ما تعرضه الواجهة أو ما تقصده أسماء الجداول.

| الدور أو المصدر | الوحدة | العملية | فحص موجود | النطاق الفعلي الحالي |
|---|---|---|---|---|
| أي actor مصادق | Tasks | View | `protectedProcedure` فقط | كل المهام التي يستطيع الاستعلام الوصول إليها |
| أي actor مصادق | Tasks | Create | `protectedProcedure` فقط | يمكن إرسال `engineerId` اختياريًا من منظور الصلاحيات |
| أي actor مصادق | Tasks | Update status | `protectedProcedure` فقط | أي task id قابل للوصول عبر endpoint |
| أي actor مصادق | Tasks | Delete | `protectedProcedure` فقط | أي task id قابل للوصول عبر endpoint |
| أي actor مصادق | Tasks | Assign/change owner | لا يوجد فحص موحد | ممكن عبر `moveTask` و`updateFull` |
| `manager` أو OAuth `admin` في مسارات محددة | User Management | إدارة المستخدمين | `requireUserManagementCaller` | حسب role ثابت، وليس effective permission عام |
| `manager` أو `admin` | Role Permissions | تعديل صلاحيات الأدوار | `requirePrivilegedRoleManagementCaller` | كل الأدوار المعروضة في النظام |
| `manager` أو `admin` | Section Permissions | تعديل صلاحيات الأقسام | فحص role مباشر | كل الأقسام المعروضة |
| `admin_sales` | User Management | بعض عمليات المستخدمين | `canManageUsers` | يمكنه إدارة أدوار عادية، مع قيود على manager/admin |
| App user | Direct permissions | قراءة/تعديل صلاحياته | بيانات `user_permissions` تُقرأ وتُعدل | لا يوجد أثر موحد على task endpoints |

## تصعيد الصلاحيات

الحماية الحالية تمنع في عدة مسارات أن يمنح `admin_sales` مستخدمًا دور `manager` أو `admin`. كما تمنع غير الإدارة من الوصول إلى بعض لوحات إدارة المستخدمين والأدوار.

مع ذلك، توجد فجوتان معماريتان يجب إغلاقهما قبل الاعتماد على الصلاحيات الديناميكية:

1. تعديل `user_permissions` يعتمد على صلاحيات إدارة المستخدمين والدور المستهدف، لكنه لا يثبت أن الصلاحية المباشرة لن تمنح قدرة أعلى من الدور في endpoint فعلي، لأن effective permission resolver غير موجود.
2. endpoints المهام لا تستخدم permission checks أو scope checks أصلًا. لذلك حتى لو عُدّلت `tasks` في `role_permissions` إلى `own` أو `canDelete = 0`، لا يصبح ذلك مانعًا server-side تلقائيًا.

## النتيجة المقترحة لعزل المهام

التصميم الأقل تغييرًا والأكثر أمانًا هو الاحتفاظ بجدولي الصلاحيات الحاليين، ثم إضافة طبقة enforcement مركزية دون إعادة كتابة النظام كله.

### طبقة القرار المطلوبة

يجب أن ينتج helper واحد قرارًا من الشكل التالي:

```text
resolveTaskAccess(ctx) → {
  actorId,
  role,
  engineerId,
  canView,
  canCreate,
  canEdit,
  canDelete,
  canAssign,
  scope: own | team | all
}
```

ويجب أن يطبق القرار في backend على كل endpoint، لا في React فقط.

### السياسة الآمنة المقترحة

| المستخدم | View | Create | Update status | Delete | Assign/change engineer |
|---|---|---|---|---|---|
| مهندس مرتبط بـ `engineerId` | مهامه فقط | لنفسه فقط | مهامه فقط | حسب القرار التجاري، والأفضل منع الحذف أو جعله soft delete | ممنوع |
| Admin Sales/Manager | كل المهام أو حسب `tasks` scope | لأي مهندس | لأي مهمة ضمن النطاق | لأي مهمة ضمن النطاق | مسموح إذا كانت لديه `tasks.assign` |
| OAuth Admin | كل المهام | لأي مهندس | لأي مهمة | لأي مهمة | مسموح |
| مستخدم بلا `engineerId` | لا مهام مملوكة له | مرفوض ما لم يكن scope إداريًا | مرفوض | مرفوض | مرفوض |

هذه السياسة تحتاج قرارًا تجاريًا واحدًا قبل التنفيذ: هل `admin_sales` يرى كل المهام، أم مهام فريقه فقط؟ التقرير لا يفترض الإجابة.

### قاعدة مهمة للإنشاء

لا يجب الوثوق بـ `engineerId` القادم من العميل. يجب أن يكون القرار:

```text
if scope === own:
  engineerId = actor.engineerId
else if scope === all/team and canAssign:
  engineerId = requested engineerId
else:
  reject
```

### قاعدة مهمة للتعديل

كل update أو delete أو submit recording يجب أن يبدأ بقراءة المهمة من قاعدة البيانات ثم فحص الملكية قبل تنفيذ التغيير. لا يكفي وضع `where(id = input.id)`.

### قاعدة مهمة للاستعلامات

يجب إضافة شرط owner إلى الاستعلام نفسه:

```text
scope === own  → WHERE daily_tasks.engineerId = actor.engineerId
scope === all  → بدون شرط owner
scope === team → شرط الفريق بعد تعريف علاقة الفريق
```

تطبيق الفلترة بعد جلب كل الصفوف ليس مناسبًا أمنيًا ولا اقتصاديًا.

## خطة التنفيذ المقترحة

1. اعتماد `ctx.actor` كمصدر الهوية الموحد، مع fallback محدود ومراقب للحسابات القديمة.
2. إنشاء resolver مركزي للصلاحيات الفعالة يحدد هل المصدر هو `role_permissions` أو `user_permissions`، ويضع سياسة دمج مكتوبة ومختبرة.
3. البدء بوحدة المهام فقط دون تغيير سلوك الوحدات الأخرى.
4. حماية القراءة والإنشاء والتعديل والحذف وإعادة الجدولة والتسجيلات والتقويم والإحصاءات والتنبيهات.
5. منع تغيير `engineerId` إلا بصلاحية `tasks.assign` وبنطاق إداري.
6. اعتماد soft delete بدل الحذف الفيزيائي إن كان المطلوب الحفاظ على سجل تدقيق المهام.
7. إضافة اختبارات server-side لكل حالة: مهندس يرى نفسه، مهندس يحاول رؤية غيره، مهندس يحاول تعديل غيره، مستخدم بلا هوية مهندس، ومدير يرى الجميع.
8. بعد نجاح اختبارات المهام، توحيد تدريجي لفحوص الوحدات الأخرى حول نفس resolver.

## قرار مطلوب قبل التنفيذ

لا أحتاج قرارًا حول التقنية، لأن الحل الآمن واضح. أحتاج فقط تحديد نطاق `admin_sales` و`manager` في المهام:

- هل كلاهما يرى كل المهام ويستطيع إعادة إسنادها؟
- أم `manager` فقط يرى الكل، بينما `admin_sales` يرى الفريق أو المهام المسندة إليه؟

بعد اعتماد هذا التفصيل، يمكن تنفيذ عزل المهام server-side مع الحفاظ على التوافق مع الحسابات الحالية.

## الملفات المرجعية داخل المشروع

- [نموذج قاعدة البيانات](../drizzle/schema.ts)
- [المصادقة وحل actor](../server/_core/context.ts)
- [قواعد الأدوار الثابتة](../shared/authorization.ts)
- [راوتر المهام](../server/routers.ts)
- [دوال استعلام وتعديل المهام](../server/db.ts)
- [لوحة الصلاحيات](../client/src/pages/PermissionsPanel.tsx)

## References

[1]: ../drizzle/schema.ts "Database schema and authorization-related tables"
[2]: ../server/_core/context.ts "Request actor resolution"
[3]: ../shared/authorization.ts "Static roles and authorization helpers"
[4]: ../server/routers.ts "tRPC routers and server-side procedures"
[5]: ../server/db.ts "Database queries and task operations"
[6]: ../client/src/pages/PermissionsPanel.tsx "Permissions administration UI"
