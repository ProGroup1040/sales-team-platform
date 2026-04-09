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

## Financial Module (التحصيل + الكوميشن)
- [ ] جدول payments: client_id, contract_id, amount, payment_date, payment_type, added_by
- [ ] جدول payment_promises: client_id, promise_amount, promise_date, status (pending/paid/overdue)
- [ ] جدول commission_payments: engineer_id, contract_id, stage (1/2), amount, status (paid/pending)
- [ ] تحديث جدول contracts: إضافة حقول total_paid, collection_status, delivery_date
- [ ] Backend: payment.create + payment.list + payment.byClient
- [ ] Backend: promise.create + promise.list + promise.updateStatus
- [ ] Backend: financial.clientProfile (contract value + paid + remaining + %)
- [ ] Backend: financial.followUpToday (دفعات مستحقة اليوم + متأخرة)
- [ ] Backend: financial.commissionByEngineer (Progressive + Split Stage 1/2)
- [ ] Backend: financial.collectionVsCommission (overview)
- [ ] Backend: visit payment tracking (1000/2000 ج.م خصم من التعاقد)
- [ ] FinancialModule.tsx: Client Financial Profile (contract + paid + remaining + %)
- [ ] FinancialModule.tsx: Payment Tracking (تسجيل دفعة جديدة)
- [ ] FinancialModule.tsx: Payment Promise Tracking (وعد بالدفع)
- [ ] FinancialModule.tsx: Daily Follow-up List (اليوم + متأخرة + تنبيهات)
- [ ] FinancialModule.tsx: Responsibility Tracking (مهندس + admin)
- [ ] FinancialModule.tsx: Visit Collection Tracking (1000/2000)
- [ ] FinancialModule.tsx: Commission System (Progressive Tiers على التحصيل)
- [ ] FinancialModule.tsx: Commission Split (Stage 1: 50% عند 75% تحصيل | Stage 2: 50% عند الاستلام)
- [ ] FinancialModule.tsx: Commission Tracking (Earned + Paid + Pending لكل مهندس)
- [ ] FinancialModule.tsx: Collection vs Commission Dashboard
- [ ] تسجيل route /financial في App.tsx وإضافة للـ sidebar
- [ ] Seed data للـ Financial Module
- [ ] اختبارات Vitest للـ Commission Progressive + Split Logic

## Financial Module - الحالة الفعلية (مكتمل)
- [x] جداول payments + payment_promises + commission_payments في قاعدة البيانات
- [x] Backend API: addContract + addPayment + addPromise + updatePromise + dailyFollowUp + engineersCommission + markCommissionPaid
- [x] CollectionsModule.tsx: 4 تابات (العقود + المتابعة اليومية + الكوميشن + التحليلات)
- [x] نظام الكوميشن التصاعدي (Progressive) على التحصيل الفعلي
- [x] نظام الصرف بالمرحلتين (Stage 1: 75% تحصيل | Stage 2: 100% تحصيل)
- [x] Payment Promise Tracking مع تحديث الحالة
- [x] Daily Follow-up List (مستحق اليوم + متأخر + وعود اليوم + وعود متأخرة)
- [x] اختبارات Vitest: 100 اختبار ناجح (17 جديد للـ Financial Module)

## تحديث KPI + Commission + Incentive Rules (Final Version)
- [ ] تحديث db.ts: Commission ثابت دائماً (لا يتأثر بـ KPI)
- [ ] تحديث db.ts: KPI Bonus يُصرف عند KPI ≥ 60% فقط
- [ ] تحديث db.ts: Incentive يُصرف عند KPI ≥ 75% فقط
- [ ] تحديث db.ts: High Performance Level عند KPI ≥ 90%
- [ ] تحديث KPIModule.tsx: عرض Commission دائماً بدون حجب
- [ ] تحديث KPIModule.tsx: KPI Bonus (Available/Blocked) مع رسالة واضحة
- [ ] تحديث KPIModule.tsx: Incentive (Available/Blocked) مع رسالة واضحة
- [ ] تحديث KPIModule.tsx: Status Messages ("الحافز متوقف بسبب KPI أقل من 75%"...)
- [ ] تحديث الاختبارات لتعكس القواعد الجديدة

## Test Data Setup (Dummy Engineers)
- [ ] إصلاح خطأ db.ts (totalPayout مكسور)
- [x] تحديث KPI Rules: Commission ثابت دائماً
- [x] إضافة 6 مهندسين افتراضيين بمبيعات مختلفة (300K → 2M)
- [ ] إضافة KPI مختلف لكل مهندس (45% → 92%)
- [ ] إضافة مهام يومية (Completed + Delayed + Not Done) لكل مهندس
- [ ] إضافة بيانات تحصيل مالي لكل مهندس
- [x] إضافة زر "Reset Test Data" في الواجهة
- [ ] تحديث KPIModule.tsx بالقواعد الجديدة + Status Messages
- [ ] اختبار Commission ثابت + KPI Bonus ≥60% + Incentive ≥75%

## Dark Theme System
- [x] تحديث index.css بـ Dark Theme CSS Variables الكاملة
- [x] تحديث DashboardLayout لتفعيل Dark Mode ثابت
- [x] تحديث App.tsx لـ defaultTheme="dark"
- [x] تطبيق Dark Theme على كل الـ Modules

## Admin Sales Tasks Module (تطوير موديول المهام)
- [ ] إضافة جدول admin_sales_tasks في schema.ts (daily/weekly/monthly + meetings)
- [ ] تحديث engineers role ليشمل admin_sales
- [ ] تطبيق migration SQL
- [ ] Backend API: CRUD للـ Admin Sales Tasks
- [ ] Backend API: Weekly Templates (الاثنين+الخميس / الأربعاء / الخميس / السبت+الثلاثاء)
- [ ] Backend API: Monthly Templates (يوم 15 / 22 / 28)
- [ ] Backend API: Meetings Tracking (Weekly Team / Management / Report)
- [ ] Backend API: إحصائيات للمدير (نسبة تنفيذ + متأخرات)
- [ ] TasksModule.tsx: إضافة Tab خاص بـ Admin Sales
- [ ] TasksModule.tsx: Daily Tasks Section بالـ 7 مهام
- [ ] TasksModule.tsx: Weekly Tasks Section بالتقسيم حسب الأيام
- [ ] TasksModule.tsx: Monthly Tasks Section (15/22/28)
- [ ] TasksModule.tsx: Meetings Tracking Section
- [ ] TasksModule.tsx: Manager View (نسبة تنفيذ + متأخرات)
- [ ] Visibility Control: Admin Sales يرى مهامه فقط، Manager يرى الكل

## Management Focus Section (للإدارة فقط)
- [ ] إضافة getManagementFocus endpoint في routers.ts يجمع بيانات Admin Sales + Leads + Alerts
- [ ] بناء ManagementFocusSection component في Overview.tsx
- [ ] عرض Admin Sales Performance (KPI + أخطاء + تأخيرات + Status)
- [ ] عرض Campaign Performance (Leads count + quality + Status)
- [ ] عرض Alerts الذكية (تأخير تحصيل + انخفاض KPI + ضعف Leads + مشاكل مهام)
- [ ] تقييد الـ section للإدارة فقط (admin role)

## Meeting Recording + Review System (داخل موديول المهام)
- [ ] تحديث schema: إضافة meetingRecordingLink + recordingSubmittedAt لجدول daily_tasks
- [ ] تحديث schema: إضافة جدول meeting_reviews (تقييم الميتينج)
- [ ] تطبيق migration SQL
- [ ] Backend: submitRecordingLink (task_id + link) + Notification لـ Admin Sales
- [ ] Backend: createMeetingReview (5 أبعاد + totalScore + comments)
- [ ] Backend: getMeetingReview (by taskId)
- [ ] Backend: شرط إغلاق Closing task: لا يمكن done بدون recordingLink
- [ ] Backend: تعليق الكوميشن عند غياب recordingLink في حساب KPI
- [ ] Backend: إضافة closingQualityScore لـ KPI المهندس
- [ ] TasksModule: حقل Recording Link إجباري عند إنشاء Closing/Meeting task
- [ ] TasksModule: شرط إغلاق المهمة (تنبيه عند محاولة done بدون لينك)
- [ ] TasksModule: Review Panel للـ Admin (تقييم 5 أبعاد + تعليق)
- [ ] TasksModule: عرض Total Score + حالة الكوميشن على بطاقة المهمة
- [ ] كتابة اختبارات Vitest للـ Review Scoring Logic

## Lead Followup Tracking System (Admin Sales + Tele-sales KPI)
- [x] تحديث schema: إضافة جدول lead_followup_logs (date, adminSalesId, telesalesId, followupStatus, responseDelay, notes)
- [x] تطبيق migration SQL
- [x] Backend: logLeadFollowup (تسجيل نتيجة المتابعة اليومية)
- [x] Backend: getLeadFollowupStats (إحصائيات Admin Sales + Tele-sales)
- [x] Backend: getAdminSalesFollowupKPI (تقييم Admin Sales: دقة + اكتشاف تأخيرات)
- [x] Backend: getTelesalesFollowupKPI (تقييم Tele-sales: سرعة رد + جودة متابعة)
- [x] واجهة: LeadFollowupTab داخل TasksModule (متابعة Leads جديد)
- [x] واجهة: نموذج تسجيل المتابعة اليومية (تم/تأخير/لم يتم)
- [x] واجهة: عرض إحصائيات Tele-sales (KPI cards: سرعة الرد + جودة المتابعة + Overall Score)
- [x] واجهة: سجل المتابعة مع فلتر الفترة (اليوم / 7 أيام / الشهر)
- [x] ربط نتائج المتابعة بـ KPI الشامل لكلا الدورين
- [x] كتابة اختبارات Vitest لـ Lead Followup scoring logic (13 اختبار ناجح)

## Visits Module - نظام تشغيل يومي إلزامي (الطلب الجديد)
- [ ] تحديث schema: إضافة paymentScreenshotUrl, paymentDate, bookingStatus, distributionStatus لجدول visits
- [ ] تحديث schema: إضافة deleteReason, deletedAt, isDeleted (Soft Delete) لجدول visits
- [ ] تحديث schema: إضافة adminSalesId (من يتابع) لجدول visits
- [ ] تطبيق migration SQL
- [ ] Backend: softDeleteVisit (حذف ناعم مع سبب)
- [ ] Backend: getVisitsDebt (المديونية = تمت ولم يتم التحصيل)
- [ ] Backend: getVisitsDailyTracking (تتبع يومي إلزامي)
- [ ] Backend: getVisitsAlerts (تنبيهات: لم يتأكد / لم يُرفع / مديونية)
- [ ] Backend: تحديث createVisit لإضافة adminSalesId + bookingStatus + distributionStatus
- [ ] Backend: تحديث updateVisitFull لإضافة paymentScreenshotUrl + paymentDate
- [ ] Backend: getAdminSalesVisitsKPI (خصم KPI لعدم التحديث اليومي + عدم متابعة التحصيل + مديونية بدون متابعة + تأخير التوزيع)
- [ ] Backend: تحديث getEngineersKPI لإضافة خصم KPI المعاينات (عدم التأكيد + تأخير + عدم الرفع)
- [ ] VisitsModule.tsx: إعادة بناء كاملة مع 7 أقسام
- [ ] VisitsModule.tsx: قسم Daily Tracking (تتبع يومي إلزامي مع تحذير عند غياب التحديث)
- [ ] VisitsModule.tsx: قسم الحجز والتوزيع (محجوزة/موزعة/تأخير توزيع)
- [ ] VisitsModule.tsx: قسم التأكيد (نفس اليوم/متأخر/لم يتم)
- [ ] VisitsModule.tsx: قسم التنفيذ (تمت/متأخرة/ملغية/مؤجلة)
- [ ] VisitsModule.tsx: قسم الرفع والتسليم (نفس اليوم/متأخر/لم يتم)
- [ ] VisitsModule.tsx: قسم الجودة (ناجحة/بها مشاكل/مكررة/مرفوضة)
- [ ] VisitsModule.tsx: قسم المالية (تم الدفع/لم يتم + Screenshot إجباري + تاريخ الدفع)
- [ ] VisitsModule.tsx: قسم المديونية (حساب تلقائي للمعاينات التي تمت ولم يُحصَّل)
- [ ] VisitsModule.tsx: زر حذف ناعم مع سبب (العميل ألغى/تأجيل/خطأ إدخال)
- [ ] VisitsModule.tsx: قسم Alerts (لم يتأكد/لم يُرفع/مديونية)
- [ ] VisitsModule.tsx: KPI Impact panel (تأثير على KPI المهندس وAdmin Sales)
- [ ] كتابة اختبارات Vitest لـ Debt Calculation وKPI Deduction Logic

## Delete System + Fake Data Cleanup
- [x] حذف جميع البيانات الافتراضية من DB (leads, visits, deals, engineers, daily_tasks, sales, customers, collections)
- [x] منع seed scripts من التشغيل التلقائي مستقبلاً (حذف زر تحميل بيانات تجريبية من Overview)
- [x] تحديث schema: إضافة isDeleted + deletedAt + deleteReason + deletedBy لجداول: engineers, daily_tasks, leads, visits, deals
- [x] إنشاء جدول audit_logs (entityType, entityId, action, reason, customReason, performedBy, performedAt)
- [x] تطبيق migration SQL
- [x] Backend: softDelete endpoints لكل موديول (engineers, tasks, leads, visits, deals)
- [x] Backend: صلاحيات الحذف (admin يحذف engineers+deals, admin_sales يحذف visits+leads, engineer لا يحذف)
- [x] واجهة: DeleteConfirmDialog مشترك (Confirmation + سبب الحذف + سبب آخر يدوي)
- [x] واجهة: إضافة زر Delete في TasksModule (مهندسين + مهام يومية)
- [x] واجهة: إضافة زر Delete في LeadsModule
- [x] واجهة: إضافة زر Delete في VisitsModule (استبدال DeleteDialog القديم)
- [x] واجهة: إضافة زر Delete في ClosingModule (صفقات)
- [x] كتابة اختبارات Vitest لـ Soft Delete (15 اختبار ناجح)
