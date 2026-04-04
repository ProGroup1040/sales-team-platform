# Sales Control Panel - TODO

## قاعدة البيانات
- [x] جدول engineers (المهندسون)
- [x] جدول daily_tasks (المهام اليومية)
- [x] جدول leads (العملاء المحتملون)
- [x] جدول visits (المعاينات)
- [x] جدول deals (الصفقات / Closing)
- [x] جدول monthly_targets (الأهداف الشهرية)
- [x] جدول collections (التحصيل المالي)
- [x] تطبيق migrations وإدراج بيانات تجريبية

## Backend (tRPC Routers)
- [x] router: tasks (المهام اليومية + Execution Score)
- [x] router: leads (الـ Leads + سرعة الرد)
- [x] router: visits (المعاينات + Rates)
- [x] router: closing (الصفقات + Conversion Rate)
- [x] router: sales (Monthly Sales + Target)
- [x] router: kpi (مقارنة أداء المهندسين)
- [x] router: collections (التحصيل المالي)
- [x] router: planning (Target Planning + حسابات)

## واجهة المستخدم
- [x] تحديث DashboardLayout بقائمة الـ 8 Modules
- [x] صفحة Overview (نظرة عامة مع Alerts)
- [x] صفحة Tasks Module
- [x] صفحة Leads Module
- [x] صفحة Visits Module
- [x] صفحة Closing Module
- [x] صفحة Sales Module
- [x] صفحة KPI Module
- [x] صفحة Collections Module
- [x] صفحة Planning Module
- [x] نظام Alerts للحالات الحرجة

## الاختبارات والتسليم
- [x] Vitest tests للـ routers الجديدة (23 اختبار ناجح)
- [x] حفظ checkpoint نهائي
- [x] تسليم النتيجة للمستخدم

## تعريب النظام وتغيير العملة
- [ ] تعريب DashboardLayout (قائمة التنقل والعناوين)
- [ ] تعريب صفحة Overview
- [ ] تعريب صفحة Daily Tasks
- [ ] تعريب صفحة Leads
- [ ] تعريب صفحة Visits
- [ ] تعريب صفحة Closing
- [ ] تعريب صفحة Sales
- [ ] تعريب صفحة KPI
- [ ] تعريب صفحة Collections
- [ ] تعريب صفحة Planning
- [ ] تغيير العملة إلى الجنيه المصري (ج.م) في جميع الصفحات
- [ ] تعريب صفحة Home
