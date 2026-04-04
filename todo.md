# Sales Control Panel - TODO

## قاعدة البيانات
- [ ] جدول engineers (المهندسون)
- [ ] جدول daily_tasks (المهام اليومية)
- [ ] جدول leads (العملاء المحتملون)
- [ ] جدول visits (المعاينات)
- [ ] جدول deals (الصفقات / Closing)
- [ ] جدول monthly_targets (الأهداف الشهرية)
- [ ] جدول collections (التحصيل المالي)
- [ ] تطبيق migrations وإدراج بيانات تجريبية

## Backend (tRPC Routers)
- [ ] router: tasks (المهام اليومية + Execution Score)
- [ ] router: leads (الـ Leads + سرعة الرد)
- [ ] router: visits (المعاينات + Rates)
- [ ] router: closing (الصفقات + Conversion Rate)
- [ ] router: sales (Monthly Sales + Target)
- [ ] router: kpi (مقارنة أداء المهندسين)
- [ ] router: collections (التحصيل المالي)
- [ ] router: planning (Target Planning + حسابات)

## واجهة المستخدم
- [ ] تحديث DashboardLayout بقائمة الـ 8 Modules
- [ ] صفحة Overview (نظرة عامة مع Alerts)
- [ ] صفحة Tasks Module
- [ ] صفحة Leads Module
- [ ] صفحة Visits Module
- [ ] صفحة Closing Module
- [ ] صفحة Sales Module
- [ ] صفحة KPI Module
- [ ] صفحة Collections Module
- [ ] صفحة Planning Module
- [ ] نظام Alerts للحالات الحرجة

## الاختبارات والتسليم
- [ ] Vitest tests للـ routers الجديدة
- [ ] حفظ checkpoint نهائي
- [ ] تسليم النتيجة للمستخدم
