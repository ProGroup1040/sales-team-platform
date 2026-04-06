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
- [x] تعريب DashboardLayout (قائمة التنقل والعناوين)
- [x] تعريب صفحة Overview
- [x] تعريب صفحة Daily Tasks
- [x] تعريب صفحة Leads
- [x] تعريب صفحة Visits
- [x] تعريب صفحة Closing
- [x] تعريب صفحة Sales
- [x] تعريب صفحة KPI
- [x] تعريب صفحة Collections
- [x] تعريب صفحة Planning
- [x] تغيير العملة إلى الجنيه المصري (ج.م) في جميع الصفحات
- [x] تعريب صفحة Home

## إزالة شرط تسجيل الدخول
- [x] تحديث App.tsx لتوجيه المستخدم مباشرة إلى Overview بدون login
- [x] تحديث DashboardLayout لإزالة شرط المصادقة
- [x] تحويل جميع الـ routers من protectedProcedure إلى publicProcedure
- [x] تحديث Home.tsx لتوجيه مباشر إلى لوحة التحكم

## تطوير موديول المهام اليومية المتقدم
- [x] تحديث schema: إضافة delayDays, clientDelay, rescheduledFromId, isRescheduled للمهام
- [x] تحديث schema: إضافة role للمهندسين (admin/engineer)
- [x] تطبيق migration SQL الجديد
- [x] تحديث Backend: منطق Dynamic Scoring (Done=1, Delayed 1d=0.5, 2d=0.3, 3d=0.1, >3d=0)
- [x] تحديث Backend: Client Delay لا يؤثر على Score + إنشاء Task جديدة تلقائياً
- [x] تحديث Backend: تصنيف Critical Tasks (تأخير > يومين)
- [x] تحديث Backend: Ranking System (Top 3 / Bottom 3)
- [x] تحديث Backend: Alerts (تأخير، Critical، أداء < 70%)
- [x] بناء Admin View: إضافة/تعديل/حذف Tasks مع تحديد الحالة وعدد أيام التأخير
- [x] بناء Engineer View: عرض المهام الخاصة فقط بدون صلاحية تعديل
- [x] بناء قسم Critical Tasks منفصل في الموديول
- [x] بناء Ranking Section (Top 3 / Bottom 3)
- [x] بناء Alerts Section في الموديول والـ Overview
- [x] تحديث Overview لعرض Critical Tasks والـ Alerts الجديدة
- [x] كتابة اختبارات للـ Scoring Logic

## إعادة بناء موديول المعاينات الكامل
- [x] تحديث schema: إضافة حقول Booking (assignedDelay)
- [x] تحديث schema: إضافة حقول Confirmation (confirmedSameDay, confirmationDelay, notConfirmed)
- [x] تحديث schema: إضافة حقول Execution (cancelled, rescheduled)
- [x] تحديث schema: إضافة حقول Upload (uploadedSameDay, uploadDelayed, notUploaded, deliveredToAdmin, deliveryDelay)
- [x] تحديث schema: إضافة حقول Quality (withIssues, repeated, designRejected)
- [x] تحديث schema: إضافة حقول Admin (groupCreatedOnTime, groupDelayed, notAssignedToDesigner)
- [x] تحديث schema: إضافة حقول Financial (feeCollected, feeAmount)
- [x] تطبيق migration SQL الجديد
- [x] تحديث Backend: getVisitsStats مع KPI calculations كاملة
- [x] تحديث Backend: إضافة/تعديل معاينة مع الحقول الجديدة
- [x] إعادة بناء VisitsModule: 7 أقسام (Booking/Confirmation/Execution/Upload/Quality/Admin/Financial)
- [x] إضافة KPI cards: Confirmation Rate, Delay Rate, Upload Same Day Rate, Cancellation Rate, Revisit Rate, Collection Rate
- [x] كتابة اختبارات للـ KPI calculations

## KPI & Commission Module المستقل (الطلب الجديد)
- [ ] تحديث schema: إضافة جدول design_reviews (تقييم التصميم الأسبوعي)
- [ ] تحديث schema: إضافة جدول incentive_tiers (شرائح الحوافز)
- [ ] تطبيق migration SQL الجديد
- [ ] تحديث Backend: حساب KPI بالأوزان الثلاثة (Tasks 55% + Response 20% + CRM 25%)
- [ ] تحديث Backend: Efficiency Score (عدد الاجتماعات لكل صفقة)
- [ ] تحديث Backend: Commission Status (Available/Partial/Blocked) بناءً على KPI
- [ ] تحديث Backend: Incentive System (KPI < 70% → محجوب، KPI ≥ 70% → مصروف)
- [ ] تحديث Backend: Design KPI Weekly (من design_reviews)
- [ ] تحديث Backend: KPI Alerts (سبب الانخفاض)
- [ ] تحديث Backend: Ranking بناءً على KPI فقط
- [ ] إعادة بناء KPIModule.tsx: 8 أقسام كاملة
- [ ] قسم 1: KPI System (Breakdown + Alerts)
- [ ] قسم 2: Efficiency داخل Tasks
- [ ] قسم 3: Commission System (Available/Partial/Blocked)
- [ ] قسم 4: Incentive System
- [ ] قسم 5: Engineer View (KPI + Commission + Incentive + Ranking)
- [ ] قسم 6: Ranking System (بناءً على KPI)
- [ ] قسم 7: Real-time Updates indicators
- [ ] قسم 8: Design KPI Weekly
- [ ] كتابة اختبارات للـ KPI الجديد

## شرائح الحوافز والكوميشن المحددة (الطلب الجديد)
- [x] تطبيق Incentive Tiers: <500K=0, 500K=2500, 1M=5000, 1.25M=6500, 1.5M=7500, 1.75M=8750, 2M+=10000
- [x] تطبيق Commission Tiers: 1% حتى 1M، 1.25% حتى 1.25M، 1.5% حتى 1.5M، 1.75% حتى 1.75M، 2% حتى 2M، +0.25% لكل 250K إضافية
- [x] تطبيق KPI Rules: KPI<60% → لا KPI + لا حافز + 50% كوميشن فقط
- [x] تطبيق KPI Rules: KPI 60-75% → KPI متاح + كوميشن كامل + لا حافز
- [x] تطبيق KPI Rules: KPI 75-90% → KPI + كوميشن + حافز
- [x] تطبيق KPI Rules: KPI ≥ 90% → كل المستحقات كاملة
- [x] seed الشرائح الجديدة في قاعدة البيانات
- [x] تحديث KPIModule.tsx لعرض الشرائح والحالة بوضوح
