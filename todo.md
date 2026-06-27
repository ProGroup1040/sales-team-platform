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
- [x] تحديث schema: إضافة جدول design_reviews (تقييم التصميم الأسبوعي)
- [x] تحديث schema: إضافة جدول incentive_tiers (شرائح الحوافز)
- [x] تطبيق migration SQL الجديد
- [x] تحديث Backend: حساب KPI بالأوزان الثلاثة (Tasks 55% + Response 20% + CRM 25%)
- [x] تحديث Backend: Efficiency Score (عدد الاجتماعات لكل صفقة)
- [x] تحديث Backend: Commission Status (Available/Partial/Blocked) بناءً على KPI
- [x] تحديث Backend: Incentive System (KPI < 70% → محجوب، KPI ≥ 70% → مصروف)
- [x] تحديث Backend: Design KPI Weekly (من design_reviews)
- [x] تحديث Backend: KPI Alerts (سبب الانخفاض)
- [x] تحديث Backend: Ranking بناءً على KPI فقط
- [x] إعادة بناء KPIModule.tsx: 8 أقسام كاملة
- [x] قسم 1: KPI System (Breakdown + Alerts)
- [x] قسم 2: Efficiency داخل Tasks
- [x] قسم 3: Commission System (Available/Partial/Blocked)
- [x] قسم 4: Incentive System
- [x] قسم 5: Engineer View (KPI + Commission + Incentive + Ranking)
- [x] قسم 6: Ranking System (بناءً على KPI)
- [x] قسم 7: Real-time Updates indicators
- [x] قسم 8: Design KPI Weekly
- [x] كتابة اختبارات للـ KPI الجديد

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
- [x] جدول payments: client_id, contract_id, amount, payment_date, payment_type, added_by
- [x] جدول payment_promises: client_id, promise_amount, promise_date, status (pending/paid/overdue)
- [x] جدول commission_payments: engineer_id, contract_id, stage (1/2), amount, status (paid/pending)
- [x] تحديث جدول contracts: إضافة حقول total_paid, collection_status, delivery_date
- [x] Backend: payment.create + payment.list + payment.byClient
- [x] Backend: promise.create + promise.list + promise.updateStatus
- [x] Backend: financial.clientProfile (contract value + paid + remaining + %)
- [x] Backend: financial.followUpToday (دفعات مستحقة اليوم + متأخرة)
- [x] Backend: financial.commissionByEngineer (Progressive + Split Stage 1/2)
- [x] Backend: financial.collectionVsCommission (overview)
- [x] Backend: visit payment tracking (1000/2000 ج.م خصم من التعاقد)
- [x] FinancialModule.tsx: Client Financial Profile (contract + paid + remaining + %)
- [x] FinancialModule.tsx: Payment Tracking (تسجيل دفعة جديدة)
- [x] FinancialModule.tsx: Payment Promise Tracking (وعد بالدفع)
- [x] FinancialModule.tsx: Daily Follow-up List (اليوم + متأخرة + تنبيهات)
- [x] FinancialModule.tsx: Responsibility Tracking (مهندس + admin)
- [x] FinancialModule.tsx: Visit Collection Tracking (1000/2000)
- [x] FinancialModule.tsx: Commission System (Progressive Tiers على التحصيل)
- [x] FinancialModule.tsx: Commission Split (Stage 1: 50% عند 75% تحصيل | Stage 2: 50% عند الاستلام)
- [x] FinancialModule.tsx: Commission Tracking (Earned + Paid + Pending لكل مهندس)
- [x] FinancialModule.tsx: Collection vs Commission Dashboard
- [x] تسجيل route /financial في App.tsx وإضافة للـ sidebar
- [x] Seed data للـ Financial Module
- [x] اختبارات Vitest للـ Commission Progressive + Split Logic

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
- [x] تحديث db.ts: Commission ثابت دائماً (لا يتأثر بـ KPI)
- [x] تحديث db.ts: KPI Bonus يُصرف عند KPI ≥ 60% فقط
- [x] تحديث db.ts: Incentive يُصرف عند KPI ≥ 75% فقط
- [x] تحديث db.ts: High Performance Level عند KPI ≥ 90%
- [x] تحديث KPIModule.tsx: عرض Commission دائماً بدون حجب
- [x] تحديث KPIModule.tsx: KPI Bonus (Available/Blocked) مع رسالة واضحة
- [x] تحديث KPIModule.tsx: Incentive (Available/Blocked) مع رسالة واضحة
- [x] تحديث KPIModule.tsx: Status Messages ("الحافز متوقف بسبب KPI أقل من 75%"...)
- [x] تحديث الاختبارات لتعكس القواعد الجديدة

## Test Data Setup (Dummy Engineers)
- [x] إصلاح خطأ db.ts (totalPayout مكسور)
- [x] تحديث KPI Rules: Commission ثابت دائماً
- [x] إضافة 6 مهندسين افتراضيين بمبيعات مختلفة (300K → 2M)
- [x] إضافة KPI مختلف لكل مهندس (45% → 92%)
- [x] إضافة مهام يومية (Completed + Delayed + Not Done) لكل مهندس
- [x] إضافة بيانات تحصيل مالي لكل مهندس
- [x] إضافة زر "Reset Test Data" في الواجهة
- [x] تحديث KPIModule.tsx بالقواعد الجديدة + Status Messages
- [x] اختبار Commission ثابت + KPI Bonus ≥60% + Incentive ≥75%

## Dark Theme System
- [x] تحديث index.css بـ Dark Theme CSS Variables الكاملة
- [x] تحديث DashboardLayout لتفعيل Dark Mode ثابت
- [x] تحديث App.tsx لـ defaultTheme="dark"
- [x] تطبيق Dark Theme على كل الـ Modules

## Admin Sales Tasks Module (تطوير موديول المهام)
- [x] إضافة جدول admin_sales_tasks في schema.ts (daily/weekly/monthly + meetings)
- [x] تحديث engineers role ليشمل admin_sales
- [x] تطبيق migration SQL
- [x] Backend API: CRUD للـ Admin Sales Tasks
- [x] Backend API: Weekly Templates (الاثنين+الخميس / الأربعاء / الخميس / السبت+الثلاثاء)
- [x] Backend API: Monthly Templates (يوم 15 / 22 / 28)
- [x] Backend API: Meetings Tracking (Weekly Team / Management / Report)
- [x] Backend API: إحصائيات للمدير (نسبة تنفيذ + متأخرات)
- [x] TasksModule.tsx: إضافة Tab خاص بـ Admin Sales
- [x] TasksModule.tsx: Daily Tasks Section بالـ 7 مهام
- [x] TasksModule.tsx: Weekly Tasks Section بالتقسيم حسب الأيام
- [x] TasksModule.tsx: Monthly Tasks Section (15/22/28)
- [x] TasksModule.tsx: Meetings Tracking Section
- [x] TasksModule.tsx: Manager View (نسبة تنفيذ + متأخرات)
- [x] Visibility Control: Admin Sales يرى مهامه فقط، Manager يرى الكل

## Management Focus Section (للإدارة فقط)
- [x] إضافة getManagementFocus endpoint في routers.ts يجمع بيانات Admin Sales + Leads + Alerts
- [x] بناء ManagementFocusSection component في Overview.tsx
- [x] عرض Admin Sales Performance (KPI + أخطاء + تأخيرات + Status)
- [x] عرض Campaign Performance (Leads count + quality + Status)
- [x] عرض Alerts الذكية (تأخير تحصيل + انخفاض KPI + ضعف Leads + مشاكل مهام)
- [x] تقييد الـ section للإدارة فقط (admin role)

## Meeting Recording + Review System (داخل موديول المهام)
- [x] تحديث schema: إضافة meetingRecordingLink + recordingSubmittedAt لجدول daily_tasks
- [x] تحديث schema: إضافة جدول meeting_reviews (تقييم الميتينج)
- [x] تطبيق migration SQL
- [x] Backend: submitRecordingLink (task_id + link) + Notification لـ Admin Sales
- [x] Backend: createMeetingReview (5 أبعاد + totalScore + comments)
- [x] Backend: getMeetingReview (by taskId)
- [x] Backend: شرط إغلاق Closing task: لا يمكن done بدون recordingLink
- [x] Backend: تعليق الكوميشن عند غياب recordingLink في حساب KPI
- [x] Backend: إضافة closingQualityScore لـ KPI المهندس
- [x] TasksModule: حقل Recording Link إجباري عند إنشاء Closing/Meeting task
- [x] TasksModule: شرط إغلاق المهمة (تنبيه عند محاولة done بدون لينك)
- [x] TasksModule: Review Panel للـ Admin (تقييم 5 أبعاد + تعليق)
- [x] TasksModule: عرض Total Score + حالة الكوميشن على بطاقة المهمة
- [x] كتابة اختبارات Vitest للـ Review Scoring Logic

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
- [x] تحديث schema: إضافة paymentScreenshotUrl, paymentDate, bookingStatus, distributionStatus لجدول visits
- [x] تحديث schema: إضافة deleteReason, deletedAt, isDeleted (Soft Delete) لجدول visits
- [x] تحديث schema: إضافة adminSalesId (من يتابع) لجدول visits
- [x] تطبيق migration SQL
- [x] Backend: softDeleteVisit (حذف ناعم مع سبب)
- [x] Backend: getVisitsDebt (المديونية = تمت ولم يتم التحصيل)
- [x] Backend: getVisitsDailyTracking (تتبع يومي إلزامي)
- [x] Backend: getVisitsAlerts (تنبيهات: لم يتأكد / لم يُرفع / مديونية)
- [x] Backend: تحديث createVisit لإضافة adminSalesId + bookingStatus + distributionStatus
- [x] Backend: تحديث updateVisitFull لإضافة paymentScreenshotUrl + paymentDate
- [x] Backend: getAdminSalesVisitsKPI (خصم KPI لعدم التحديث اليومي + عدم متابعة التحصيل + مديونية بدون متابعة + تأخير التوزيع)
- [x] Backend: تحديث getEngineersKPI لإضافة خصم KPI المعاينات (عدم التأكيد + تأخير + عدم الرفع)
- [x] VisitsModule.tsx: إعادة بناء كاملة مع 7 أقسام
- [x] VisitsModule.tsx: قسم Daily Tracking (تتبع يومي إلزامي مع تحذير عند غياب التحديث)
- [x] VisitsModule.tsx: قسم الحجز والتوزيع (محجوزة/موزعة/تأخير توزيع)
- [x] VisitsModule.tsx: قسم التأكيد (نفس اليوم/متأخر/لم يتم)
- [x] VisitsModule.tsx: قسم التنفيذ (تمت/متأخرة/ملغية/مؤجلة)
- [x] VisitsModule.tsx: قسم الرفع والتسليم (نفس اليوم/متأخر/لم يتم)
- [x] VisitsModule.tsx: قسم الجودة (ناجحة/بها مشاكل/مكررة/مرفوضة)
- [x] VisitsModule.tsx: قسم المالية (تم الدفع/لم يتم + Screenshot إجباري + تاريخ الدفع)
- [x] VisitsModule.tsx: قسم المديونية (حساب تلقائي للمعاينات التي تمت ولم يُحصَّل)
- [x] VisitsModule.tsx: زر حذف ناعم مع سبب (العميل ألغى/تأجيل/خطأ إدخال)
- [x] VisitsModule.tsx: قسم Alerts (لم يتأكد/لم يُرفع/مديونية)
- [x] VisitsModule.tsx: KPI Impact panel (تأثير على KPI المهندس وAdmin Sales)
- [x] كتابة اختبارات Vitest لـ Debt Calculation وKPI Deduction Logic

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

## Leads Module Redesign - إدخال أرقام يومية فقط (بدلاً من Lead بالتفاصيل)
- [x] إنشاء جدول lead_daily_stats (date, totalLeads, contacted, delayed, notContacted, source, notes)
- [x] تطبيق migration SQL لجدول lead_daily_stats
- [x] Backend: upsertLeadDailyStats (إدخال أو تحديث أرقام يوم معين)
- [x] Backend: getLeadDailyStats (جلب سجلات الأيام مع فلترة بالفترة)
- [x] Backend: getLeadSummaryStats (إجمالي الأسبوع/الشهر + نسب)
- [x] إعادة بناء LeadsModule: نموذج إدخال يومي بسيط (إجمالي + تم + تأخير + لم يتم)
- [x] عرض جدول السجلات اليومية مع إمكانية التعديل
- [x] عرض بطاقات إحصائية (إجمالي الأسبوع + نسبة التواصل + نسبة التأخير)
- [x] كتابة اختبارات Vitest للـ daily stats logic (27 اختبار جديد)

## نظام تسجيل الدخول بيوزرنيم وباسورد
- [x] إضافة حقول username وpasswordHash لجدول engineers في schema.ts
- [x] تطبيق migration SQL
- [x] Backend: localAuth.login (يوزرنيم + باسورد → JWT cookie)
- [x] Backend: localAuth.me (جلب بيانات المستخدم الحالي من الجلسة)
- [x] Backend: localAuth.logout (مسح الجلسة)
- [x] إنشاء صفحة LoginPage.tsx (نموذج يوزرنيم + باسورد)
- [x] حماية الداشبورد: redirect لـ /login إذا لم يكن هناك جلسة
- [x] إنشاء حساب Admin (username: admin)
- [x] إنشاء حساب Admin Sales (username: admin_sales)
- [x] تسليم اليوزرنيم والباسورد للمستخدم

## إصلاح مشكلة الأمان
- [x] إصلاح flash of content: الداشبورد يظهر لثانية قبل الـ redirect لـ /login
- [x] إصلاح مشكلة cookie: إضافة trust proxy للـ Express لتفعيل HTTPS detection

## نظام الخصومات المتكامل (Discount System)
- [x] إضافة حقول discountPercent, discountValue, discountNote لجدول closingDeals في schema.ts
- [x] تطبيق migration SQL لحقول الخصم
- [x] Backend: getDiscountSummary (Total Volume, Tier, Allowed, Used, Remaining)
- [x] Backend: validateDealDiscount (التحقق من عدم تجاوز الحد المتبقي)
- [x] Backend: تحديث upsertDeal لحفظ discountPercent وdiscountValue
- [x] Backend: getEngineerDiscountSummary (Pipeline وخصم كل مهندس)
- [x] واجهة: بطاقات ملخص الخصومات (Total Volume, Tier, Allowed, Used, Remaining)
- [x] واجهة: جدول الصفقات مع عمود الخصم لكل صفقة
- [x] واجهة: نموذج إضافة/تعديل صفقة مع حقل الخصم والتحقق من الحد
- [x] واجهة: قسم مهندسين مع Pipeline والخصم المتاح لكل مهندس
- [x] كتابة 20 اختبار Vitest لمنطق حساب الشرائح والخصومات (192 اختبار ناجح إجمالاً)

## Lost Deal Analysis - تحليل الصفقات الخاسرة
- [x] إضافة حقل lostReason (enum) لجدول deals في schema.ts
- [x] تطبيق migration SQL
- [x] Backend: getLostDealsAnalysis (إجمالي الخسائر، توزيع الأسباب، خسائر كل مهندس)
- [x] Backend: تحديث updateDealStage ليقبل lostReason عند closed_lost
- [x] tRPC: closing.lostDealsAnalysis + closing.lostReasonLabels + closing.updateDealStage
- [x] واجهة: Dialog يطلب سبب الخسارة عند تغيير المرحلة لـ closed_lost
- [x] واجهة: Tab جديد "الصفقات الخاسرة" في ClosingModule (Tab رابع)
- [x] واجهة: بطاقات إحصائية (إجمالي خسائر، أكثر سبب، أسوأ مهندس)
- [x] واجهة: شريط تقدم توزيع أسباب الخسارة مع نسب مئوية
- [x] واجهة: جدول خسائر كل مهندس مع الأسباب
- [x] واجهة: قائمة الصفقات الخاسرة مع التفاصيل
- [x] واجهة: صلاحيات canEdit (admin + admin_sales فقط)
- [x] اختبارات Vitest لمنطق تحليل الخسائر (28 اختبار جديد - 215 إجمالي)

## TasksModule - Engineer View + MTD Scope (الطلب الجديد)
- [x] Backend: تحديث getEngineerTasks ليقبل engineerId + MTD (من بداية الشهر حتى اليوم)
- [x] Backend: تحديث getTasksStats ليدعم MTD وفلترة بالمهندس
- [x] Backend: إضافة getEngineerRanking (ترتيب المهندس بدون تفاصيل الآخرين)
- [x] Backend: إضافة getEngineerCriticalTasks (مهام متأخرة >48h أو Priority=High ولم تنفذ)
- [x] Frontend: Engineer View يرى 4 أقسام فقط (Task List + Overview + Ranking + Critical)
- [x] Frontend: Task List يعرض مهام المهندس الحالي فقط (حسب session)
- [x] Frontend: Overview يعرض إحصائيات المهندس الحالي فقط (MTD)
- [x] Frontend: Ranking يعرض ترتيب المهندس فقط (#X من Y) بدون تفاصيل الآخرين
- [x] Frontend: Critical Tasks يعرض مهام المهندس الحرجة فقط
- [x] Frontend: Admin يرى كل الأقسام كما هي
- [x] اختبارات Vitest للـ MTD وEngineer Ranking logic

## Calendar View - تقويم زمني للمهام (الطلب الجديد)
- [x] Backend: إضافة tasks.calendarView endpoint يجلب مهام MTD مجمعة حسب اليوم
- [x] Frontend: بناء TaskCalendarView component (عرض أفقي Timeline)
- [x] Frontend: كل يوم عمود (Day Column) من بداية الشهر حتى اليوم
- [x] Frontend: كل مهمة Block ملون حسب الحالة (أخضر/أصفر/أحمر/أزرق)
- [x] Frontend: ترتيب المهام داخل اليوم حسب Priority ثم الوقت
- [x] Frontend: Summary bar أعلى التقويم (MTD: منجزة + متأخرة + لم تُنفذ + مخططة + نسبة الإنجاز)
- [x] Frontend: فلترة حسب المهندس (Manager View) أو عرض مهندس واحد (Engineer View)
- [x] Frontend: فلترة حسب الحالة (planned/delayed/completed/not_done/client_delay)
- [x] Frontend: Popup تفاصيل المهمة عند الضغط عليها
- [x] Frontend: دمج Calendar View كـ Tab جديد في TasksModule (التقويم الزمني)
- [x] Frontend: Engineer View يرى مهامه فقط في التقويم
- [x] Frontend: Manager View يرى كل المهندسين مع فلترة
- [x] Auto-scroll لليوم الحالي عند فتح التقويم
- [x] تحديث تلقائي كل دقيقة

## Edit Deal - تحديث بيانات الصفقات
- [x] Backend: التحقق من وجود updateDealFull endpoint يقبل تعديل كل حقول الصفقة
- [x] Frontend: تحديث UpdateDealState ليشمل lostReason و lostReasonNote
- [x] Frontend: زر "تحديث" يظهر لكل الصفقات (بما فيها closed_lost) في قائمة الصفقات وفي Tab الخسائر
- [x] Frontend: الصلاحية محدودة لـ admin_sales و admin فقط (canEdit)
- [x] Frontend: حقول سبب الخسارة تظهر داخل Dialog عند stage === closed_lost
- [x] Frontend: handleUpdate يحدث lostReason مباشرة بدون فتح dialog منفصل

## Commission Update - تعديل شرائح الكوميشن
- [x] تعديل منطق الكوميشن: 1% على المبيعات من 0 حتى 1,000,000 ج.م
- [x] الشرائح الحالية تبقى كما هي للمبيعات فوق 1,000,000 ج.م
- [x] إصلاح خطأ تلف الكود والتحقق من TypeScript
- [x] 215 اختبار ناجح

## Bug Fixes - إصلاحات (21 أبريل)
- [x] Axis: زر الحذف موجود في admin view - المهمة يمكن حذفها من الواجهة
- [x] المعاينات: إضافة حقل تاريخ المعاينة في FullUpdateDialog مع تحميل التاريخ الحالي مسبقاً
- [x] المعاينات: إضافة scheduledAt لـ updateFull endpoint و updateVisitWithAdminTracking
- [x] الإغلاق والتفاوض: إضافة Search باسم العميل في قائمة الصفقات
- [x] العقود: إضافة منطق إنشاء عقد تلقائي عند إغلاق صفقة closed_won في updateDealFull
- [x] العقود: تحديث قيمة العقد تلقائياً إذا تغيرت قيمة الصفقة
- [x] 215 اختبار ناجح + 0 أخطاء TypeScript

## Trend Analysis + Quota Attainment + Weekly Report (23 أبريل)
- [x] Backend: getEngineersTrend - مقارنة مبيعات كل مهندس الشهر الحالي vs الشهر السابق (مبيعات + نسبة الهدف + تنفيذ المهام)
- [x] Backend: getWeeklyReport - تقرير أسبوعي شامل (مبيعات + مهام + معاينات + صفقات + أداء كل مهندس)
- [x] Frontend: KPIModule - إضافة Section 8 "اتجاه الأداء" مع سهم صاعد/هابط
- [x] Frontend: KPIModule - إضافة Quota Attainment % مع Progress Bar لكل مهندس
- [x] Frontend: صفحة WeeklyReport.tsx - تقرير أسبوعي شامل (KPIs + أداء المهندسين + ملخص المهام + الصفقات)
- [x] Frontend: إضافة WeeklyReport في الـ sidebar (التقرير الأسبوعي) والـ routes (/weekly-report)
- [x] 215 اختبار ناجح + 0 أخطاء TypeScript

## REST API Layer - ERP Integration (24 أبريل)
- [x] GET /api/summary - total_deals, closed_deals, closing_rate, total_revenue
- [x] GET /api/list - deals list (id, client_name, value, status, assigned_engineer) + query params: limit, offset, stage
- [x] GET /api/kpi - performance per engineer (engineer_id, deals_closed, revenue, closing_rate, kpi_score, kpi_rank, rating) + query params: year, month
- [x] CORS مفعّل (Access-Control-Allow-Origin: *) للـ 3 endpoints
- [x] Endpoints عامة بدون authentication
- [x] 215 اختبار ناجح + 0 أخطاء TypeScript

## Work Distribution + KPI Analysis System (25 أبريل)

### Database
- [x] جدول work_logs: (id, engineer_id, activity_type, duration_minutes, log_date, week_number, month, year, notes)
- [x] activity_type enum: meeting_2d, meeting_quotation, meeting_3d, meeting_closing, design_3d, design_2d, quotation
- [x] Migration SQL لجدول work_logs

### Backend - db.ts
- [x] logWorkActivity() - تسجيل نشاط جديد
- [x] getWorkDistribution(engineerId, year, month) - توزيع الوقت لمهندس
- [x] getAllEngineersDistribution(year, month) - توزيع كل المهندسين
- [x] calculateDistributionScore(distribution) - حساب Distribution Score
- [x] getWeeklyDistribution(engineerId, year, week) - توزيع أسبوعي
- [x] getCriticalInsights(year, month) - تحليل نقاط الضعف تلقائياً
- [x] getEngineerRankingFull(year, month) - ترتيب شامل (Sales + Closing + Distribution)

### Backend - routers.ts
- [x] workDist.log - تسجيل نشاط (protected)
- [x] workDist.myDistribution - توزيع المهندس الحالي
- [x] workDist.allEngineers - توزيع كل المهندسين (admin فقط)
- [x] workDist.criticalInsights - تحليل نقاط الضعف (admin فقط)
- [x] workDist.weeklyAnalysis - تحليل أسبوعي
- [x] workDist.fullRanking - ترتيب شامل

### Frontend - WorkDistribution.tsx
- [x] صفحة رئيسية بـ 2 views: Engineer View + Manager View
- [x] Engineer View: Donut Chart للتوزيع الفعلي vs المستهدف
- [x] Engineer View: Distribution Score مع تفسير
- [x] Engineer View: Weekly Feedback (متوازن؟ مركّز؟ ضعيف في Closing؟)
- [x] Engineer View: نموذج تسجيل نشاط جديد
- [x] Manager View: جدول مقارنة كل المهندسين
- [x] Manager View: Critical Insights تلقائية
- [x] Manager View: Ranking شامل (Sales + Closing + Distribution)
- [x] إضافة WorkDistribution في sidebar وroutes

### تحديث KPIModule
- [x] إضافة Distribution Score في بطاقة كل مهندس
- [x] إضافة Critical Insights section
- [x] تحديث Ranking ليشمل Distribution Score

### اختبارات
- [x] Vitest لـ calculateDistributionScore
- [x] Vitest لـ getCriticalInsights
- [x] Vitest لـ getEngineerRankingFull

## Time-based Calendar في موديول المهام (الطلب الجديد)
- [x] تحديث schema: إضافة startTime, endTime, taskType لجدول daily_tasks
- [x] تطبيق migration SQL الجديد
- [x] Backend: getTasksFiltered (فلترة زمنية متقدمة: today/yesterday/week/month/custom)
- [x] Backend: getTasksTimeSummary (ملخص توزيع الوقت الفعلي للـ KPI)
- [x] Backend: checkTimeOverlap (منع التداخل الزمني بين المهام)
- [x] Backend: getCriticalTasksEnhanced (3 أنواع: critical/not_done/stale_planned)
- [x] Backend: getTasksForTimeline (مهام يوم واحد مع بيانات الوقت)
- [x] Backend: createWithTime (إنشاء مهمة بوقت + فحص تداخل تلقائي)
- [x] مكوّن TimeFilterBar (اليوم/أمس/الأسبوع/الشهر/مخصص)
- [x] مكوّن DailyTimeline (Timeline زمني مع Task Blocks ملونة حسب النوع)
- [x] مكوّن AddTimeTaskDialog (إضافة مهمة بوقت + نوع + منع تداخل)
- [x] تحديث TasksModule: Time Filter Bar فوق قائمة المهام
- [x] تحديث TasksModule: List/Timeline Toggle
- [x] تحديث TasksModule: Advanced Filters (مهندس + نوع + حالة)
- [x] تحديث TasksModule: List View يعرض وقت البداية/النهاية ونوع المهمة
- [x] تحديث TasksModule: Critical Alerts محسّن (3 تصنيفات + عمر المهمة)
- [x] تحديث TasksModule: حذف تاب "متابعة Leads" من هذا الموديول
- [x] Current Time Indicator (خط أحمر يُظهر الوقت الحالي في Timeline)
- [x] Summary Bar (إجمالي الوقت + توزيع % لكل نشاط)

## Performance Analysis System - التقرير الأسبوعي (الطلب الجديد)
- [x] تحديث schema: إضافة operational_targets (target_meetings, target_designs, target_closings)
- [x] تحديث taskType enum: 2d, 3d_modeling, render, quotation, meeting_presentation, meeting_closing, closing
- [x] تطبيق migration SQL الجديد
- [x] Backend: getWeeklyPerformance (Activity Breakdown لكل مهندس)
- [x] Backend: getTargetAchievement (مبيعات + صفقات + Designs + Meetings)
- [x] Backend: getCriticalInsights (Meeting عالي + Closing قليل، إلخ)
- [x] Backend: getBehaviorAlerts (مهندس Meeting عالي بدون Sales، Activity ضعيف)
- [x] Backend: getActivityBalance (توزيع الأنشطة مقارنة بالهدف)
- [x] إعادة بناء WeeklyReport.tsx: Target Achievement Section
- [x] إعادة بناء WeeklyReport.tsx: Activity Breakdown Section (عدد كل نشاط)
- [x] إعادة بناء WeeklyReport.tsx: Critical Insights Section (تحليل ذكي)
- [x] إعادة بناء WeeklyReport.tsx: Behavior Alerts Section
- [x] إعادة بناء WeeklyReport.tsx: Smart Summary لكل مهندس
- [x] إعادة بناء WeeklyReport.tsx: Ranking بناءً على مبيعات + Closing Rate + Activity Balance
- [x] تحديث AddTask Dialog: أنواع المهام الجديدة (حذف "عام")
- [x] اختبارات Vitest للـ Activity Breakdown + Target Achievement

## Time Distribution Analysis System (الطلب الجديد)
- [x] Backend: getTimeDistributionAnalysis (Actual vs Target % لكل مهندس)
- [x] Backend: calcDistributionScore (نقاط الالتزام بالتوزيع المثالي)
- [x] Backend: getEngineerPerformanceReport (MTD: مبيعات + أنشطة + توزيع وقت)
- [x] WeeklyReport: Pie Chart لتوزيع الوقت الفعلي
- [x] WeeklyReport: Bar Chart مقارنة Actual vs Target Distribution
- [x] WeeklyReport: Distribution Score لكل مهندس
- [x] WeeklyReport: Behavior Alerts (Meeting عالي بدون Sales، 3D عالي بدون تحويل)
- [x] WeeklyReport: Smart Summary لكل مهندس
- [x] TasksModule: AddTask Dialog يجعل Duration إلزامي
- [x] TasksModule: AddTask Dialog يجعل TaskType إلزامي (لا يوجد Task بدون Type)
- [x] TasksModule: تحديث أنواع المهام: 2D, 3D Modeling, Render, Quotation, Meeting Modeling, Meeting Closing

## Closing & Discount Management System (الطلب الجديد)
- [x] إضافة engineerId إجباري في deals schema
- [x] إضافة حقول: maxDiscountPct, usedDiscountPct, savedDiscountBonus في deals
- [x] إضافة جدول discount_config لإعدادات الخصومات
- [x] Backend: حساب Discount Pool لكل مهندس (Actual Sales + Negotiation)
- [x] Backend: حساب Saved Discount Bonus بعد الإغلاق (50% للمهندس)
- [x] Backend: Pipeline Stats (Closed/Negotiation/Quotation/Lost) لكل مهندس
- [x] Backend: Performance-Based Discount (Closing Rate → Discount %)
- [x] Backend: استبعاد admin_sales وgroup_admin من Ranking وKPI
- [x] Frontend: Pipeline View احترافي بألوان (أخضر/أزرق/رمادي/أحمر)
- [x] Frontend: Discount Dashboard لكل مهندس (Pool/Used/Saved/Bonus)
- [x] Frontend: عرض Max/Used/Remaining Discount داخل الصفقة
- [x] Frontend: Admin Control Panel للخصومات والموافقات
- [x] Frontend: Bonus Summary لكل مهندس
- [x] Frontend: Total Pipeline Value (Quotations + Negotiation)

## Output-Based KPI System (Tasks + KPI + Goals + Weekly Report)
- [x] Backend: calcDistributionScore (50% Meetings, 30% 3D, 10% 2D, 10% Quotation)
- [x] Backend: getOutputBasedKPI (Closed Deals + Designs + Meetings Closing)
- [x] Backend: getTargetAchievement (Sales % + Designs % + Meetings %)
- [x] Backend: getBehaviorAlerts (High Meetings/Low Closing, High Designs/Low Sales, etc.)
- [x] Backend: getSmartRanking (Sales + Closing Rate + Distribution + Output)
- [x] Backend: getCriticalInsights (Time Waste Control + Behavior Patterns)
- [x] Backend: getWeeklyPerformanceFull (Activity Breakdown + Distribution + Targets)
- [x] Frontend: WeeklyReport - Distribution Score Chart (Actual vs Target)
- [x] Frontend: WeeklyReport - Target Achievement Progress Bars
- [x] Frontend: WeeklyReport - Activity Breakdown (count + hours per type)
- [x] Frontend: WeeklyReport - Behavior Alerts + Critical Insights
- [x] Frontend: KPIModule - Output-Based KPI (not task count)
- [x] Frontend: KPIModule - Smart Ranking (4 factors)
- [x] Frontend: KPIModule - Progress Tracking (Sales/Design/Meetings %)

## Admin Sales System
- [x] Admin Task Types: CRM Update, Task Distribution, Task Follow-up, Collection Follow-up, Inspection Management, Reporting, Meeting Management
- [x] Admin KPI: Data Accuracy + Task Completion + Delay Rate + Team Performance
- [x] Time Waste Detection: Alert when client consumes time without stage progress
- [x] Admin Dashboard: Team Performance + CRM Status + Task Completion + Alerts
- [x] Closing Task Type added to engineer task types

## Reports Module (Weekly / Monthly / Quarterly)
- [x] Reports Module page with 3 tabs: Weekly / Monthly / Quarterly
- [x] Weekly Report: Sales Achievement + Activity Breakdown + Distribution Score + Output + KPI Score + Insights
- [x] Monthly Report: Total Sales + Target % + Closing Rate + Designs + Meetings + Distribution + Trend + Ranking + Bonus
- [x] Quarterly Report: Sales Growth + Performance Trend + Top/Bottom Engineers
- [x] Custom Dashboard: Engineer filter + Date Range + Report Type selector
- [x] Alerts inside report: weak performance, unbalanced distribution, delay, weak closing
- [x] Auto-generate Weekly Report every Thursday (scheduled task)
- [x] Add Reports link in sidebar navigation

## Sales Execution System (Module جديد)
- [x] Schema: جدول meeting_reviews (recording_link, score, notes, manager_rating, strengths, improvements)
- [x] Schema: جدول playbook_sessions (engineer_id, task_id, steps_completed, started_at)
- [x] Migration SQL وتطبيق على قاعدة البيانات
- [x] Backend: Funnel stats (Lead→Meeting→Quotation→Closing conversion rates)
- [x] Backend: Lost deals analysis (سعر/تأخير/منافس/عدم جدية)
- [x] Backend: Meeting review CRUD (create/list/update)
- [x] Backend: Playbook session tracking
- [x] SalesExecutionSystem.tsx: Tab 1 - Playbook (Quotation + Product Cards + 6-Step Sales Flow)
- [x] SalesExecutionSystem.tsx: Tab 2 - Meeting Review (Recording + Rating + Weekly Coaching)
- [x] SalesExecutionSystem.tsx: Tab 3 - Funnel Analysis (Conversion Rates + Lost Deals)
- [x] App.tsx: تسجيل route /sales-execution
- [x] DashboardLayout: إضافة Sales Execution System للـ sidebar
- [x] ReportsModule: تسجيل route /reports في App.tsx + sidebar
- [x] إصلاح WorkDistribution.tsx: workDist router error

## Playbook Live Presentation Tool
- [x] Schema: جدول playbook_items (name, category, price, description, script, media_urls, alternatives, spec_data)
- [x] Schema: جدول playbook_quotations (deal_id, items_json, created_by, recording_link)
- [x] Migration SQL وتطبيق على قاعدة البيانات
- [x] Backend: Excel Import → playbook_items (parse XLSX/CSV)
- [x] Backend: CRUD playbook_items (create/list/update/delete)
- [x] Backend: getPlaybookByDeal (جلب Items مرتبطة بصفقة)
- [x] Backend: saveRecordingLink (حفظ رابط التسجيل داخل الصفقة)
- [x] Playbook Tab: Excel Upload → Import Items
- [x] Playbook Tab: Items Library (بطاقات تفاعلية)
- [x] Presentation Mode: 5 شاشات (Render / Quotation / Excel Data / Media / Script)
- [x] Presentation Mode: Next/Previous Navigation + Full Screen
- [x] Presentation Mode: Meeting Recording Link Input
- [x] Presentation Mode: Item Validation (لا عرض بدون Media + Script + Data)

## Sales Execution Tracking System
- [x] Schema: جدول meeting_sessions (engineerId, startTime, endTime, recordingLink, quotationId, score)
- [x] Schema: جدول session_actions (sessionId, itemId, actionType, durationSeconds, timestamp)
- [x] Migration SQL وتطبيق على قاعدة البيانات
- [x] Backend: createMeetingSession + endMeetingSession + logSessionAction
- [x] Backend: calculateMeetingScore (Video + Script + Render + Price scoring)
- [x] Backend: getEngineerMeetingStats (avg score, playbook usage %)
- [x] Backend: getSessionDetails (للـ Admin Review)
- [x] Presentation Mode: تسجيل action عند فتح Video/Script/Render/Price
- [x] Presentation Mode: Visual Indicators (Viewed ✅ / Not Viewed ❌ / Time Spent)
- [x] Presentation Mode: Item validation قبل الانتقال للتالي
- [x] Dashboard: Meeting Score + Playbook Usage % لكل مهندس
- [x] Admin Review: Recording + Tracking Data معاً
- [x] Alerts: "Meeting بدون Playbook" + "لم يُشغَّل الفيديو"

## Meeting Review Auto-Task System
- [x] Auto-create admin task when meeting session ends with recording
- [x] SLA: 24-hour review deadline tracking
- [x] Alert for delayed reviews in Admin KPI
- [x] Admin notification on new meeting recording
- [x] Admin dashboard: Pending/Completed/Delayed reviews
- [x] Meeting score input from admin review
- [x] Score feeds into engineer KPI

## Meeting Recording Mandatory Rule
- [x] Backend: Block task completion if meetingRecordingLink is missing for meeting-type tasks
- [x] Backend: Task status logic: pending (no meeting link) → in_progress (meeting done, no recording) → completed (both links present)
- [x] Backend: KPI excludes meeting tasks without recording from score calculation
- [x] Backend: Auto-create admin review task when recording is submitted
- [x] Backend: SLA 24h tracking for review tasks
- [x] Backend: Admin alert for tasks missing recording > 24h after meeting
- [x] UI: Meeting Recording Status indicators (✅/❌) in task list
- [x] UI: Block "Complete" button if recording missing for meeting tasks
- [x] UI: Recording Link input field in task edit dialog
- [x] UI: Admin view: filter tasks with missing recordings
- [x] UI: Alert badge for "Meeting without Recording"

## Meeting Review System (أداة تقييم حقيقية)
- [x] تحديث جدول meeting_reviews بحقول: playbookUsageScore, presentationQualityScore, controlScore, closingAttemptScore, decisionTag, strengthPoint, improvementPoint
- [x] شرط أساسي: لا Review إلا إذا Recording موجود + Task مكتملة
- [x] 4 عناصر تقييم (من 10 كل عنصر) → إجمالي من 40 → %
- [x] Decision Tag: Strong Performer / يحتاج تحسين / ضعيف
- [x] Mandatory Feedback: نقطة قوة + نقطة تحسين
- [x] ربط Meeting Score بـ KPI (عدم Review = خصم)
- [x] Weekly Summary لكل مهندس: Average Score + عدد Reviews + Trend

## Promotion & Evaluation System
- [x] إنشاء جدول engineer_evaluations في Schema
- [x] 5 عناصر تقييم: Sales Achievement + Closing Rate + Meeting Score + Playbook Usage + Distribution Score
- [x] Performance Levels: A Player / B Player / C Player
- [x] Rules: A→ترقية+Bonus, B→Coaching إجباري, C→Warning+Plan 30 يوم
- [x] Firing Logic: شهرين C Player → قرار إداري
- [x] Dashboard: تقييم حالي + تاريخ + اتجاه (Up/Down)
- [x] Backend دوال: calculateMonthlyEvaluation, getEngineerEvaluationHistory, checkFiringLogic
- [x] tRPC endpoints للـ Promotion System
- [x] PromotionSystem.tsx: A/B/C Player Dashboard + History + Trend

## SalesExecutionSystem
- [x] إنشاء SalesExecutionSystem.tsx (4 Tabs)
- [x] Tab 1 - Playbook: عرض Items + Presentation Mode + Excel Import + Session Tracking
- [x] Tab 2 - Meeting Review: نموذج تقييم 4 عناصر + Decision Tag + Mandatory Feedback
- [x] Tab 3 - Funnel Analysis: Funnel مراحل + Conversion Rates + Lost Deals + Insights
- [x] Tab 4 - Coaching Dashboard: Weekly Summary + Average Score + Performance Trend

## Navigation & Registration
- [x] إصلاح WorkDistribution.tsx (trpc.workDist error)
- [x] تسجيل SalesExecutionSystem في App.tsx + Sidebar
- [x] تسجيل ReportsModule في App.tsx + Sidebar
- [x] تسجيل PromotionSystem في App.tsx + Sidebar

## Dashboard كأداة قرار (Management Decision Tool)
- [x] Performance Section: Sales Target vs Actual + Closing Rate + Meeting Score + Ranking
- [x] Execution Section: عدد Meetings + % Playbook Usage + Task Completion % + Missing Recordings
- [x] Decision Section: Performance Level (A/B/C) + Promotion Status (Eligible/يحتاج تحسين/At Risk)
- [x] Alerts System: Meetings بدون Recording + Tasks غير مكتملة + أداء ضعيف + عدم استخدام Playbook
- [x] Engineer Cards: صورة/اسم + Sales + Meeting Score + Ranking + Status (A/B/C)
- [x] تحويل Overview.tsx إلى Management Decision Dashboard

## Promotion & Evaluation System (مكتمل)
- [x] Schema: engineer_evaluations جدول (A/B/C Player + Career Path + Firing Logic)
- [x] Schema: engineer_career_levels جدول (Sales Engineer → Senior → Consultant)
- [x] Migration: 0023 + 0024 تطبيق على قاعدة البيانات
- [x] Backend: createOrUpdateMeetingReview (4 عناصر + Decision Tag)
- [x] Backend: createOrUpdateMonthlyEvaluation (5 عناصر + A/B/C Logic)
- [x] Backend: getAllEngineersEvaluationDashboard
- [x] Backend: promoteEngineer + getOrCreateEngineerCareerLevel
- [x] Backend: getManagementDecisionDashboard
- [x] Frontend: PromotionSystem.tsx (Career Path + A/B/C + History + Benefits)
- [x] Frontend: Overview.tsx Decision Dashboard (Engineer Cards + A/B/C + Promotion Status)
- [x] Navigation: إضافة "التقييم والترقية" في DashboardLayout
- [x] App.tsx: Route /promotion-system

## Dashboard كأداة قرار (مكتمل)
- [x] Performance Section: Sales Target vs Actual + Closing Rate + Meeting Score + Ranking
- [x] Decision Section: Performance Level (A/B/C) + Promotion Status (Eligible/Needs Improvement/At Risk)
- [x] Engineer Cards: اسم + درجة + 5 عناصر + Promotion Status + Firing Warning
- [x] Summary Badges: عدد A/B/C Players في الـ header

## مراجعة شاملة - تنفيذ كامل

- [x] WorkDistribution: إصلاح protectedProcedure + تسجيل في App.tsx + Sidebar
- [x] ReportsModule: تسجيل في App.tsx + Sidebar
- [x] SalesExecutionSystem: بناء الصفحة الكاملة (4 Tabs: Playbook + Meeting Review + Funnel + Coaching)
- [x] SalesExecutionSystem: تسجيل في App.tsx + Sidebar
- [x] KPI: مكتمل بالقواعد الصحيحة (Commission + KPI Bonus + Incentive)
- [x] Meeting Recording Mandatory Rule: مطبّق في TasksModule
- [x] Overview Alerts: إضافة Meetings بدون Recording + Playbook Usage
- [x] TypeScript: نظيف تماماً (0 errors)
- [x] Tests: 233 passed

## Refactor: Single Source of Truth (القرار النهائي)

- [x] حذف WorkDistribution من Sidebar + App.tsx
- [x] حذف WeeklyReport من Sidebar + App.tsx
- [x] TasksModule: Task Types إلزامية (7 أنواع: 2D Design, 3D Modeling, Render, Quotation, Meeting Modeling, Meeting Presentation, Meeting Closing)
- [x] TasksModule: Calendar View
- [x] TasksModule: Meeting Mandatory Rules (Meeting Link + Recording Link إجباري)
- [x] TasksModule: Tab "تحليل توزيع العمل" (Actual vs Target: 50% Meetings, 30% 3D+Render, 10% 2D, 10% Quotations)
- [x] KPIModule: إعادة بناء بـ 5 Tabs (Performance Dashboard + Target Achievement + Reports + Ranking + Alerts)
- [x] PlanningModule: Target لكل Engineer (Revenue + Designs + Meetings + Quotations)
- [x] PlanningModule: ربط بـ KPI مباشرة
- [x] Backend: setEngineerTarget يشمل targetDesigns + targetMeetings + targetQuotations
- [x] Backend: getEngineerPerformanceReport يقيس على Targets الفردية

## KPI Refactor (الحفاظ على الموجود + إضافات)

- [x] Backend: Progressive Commission System (cumulative tiers, لا flat)
- [x] Backend: getOperationalPerformance (عدد كل نوع Task من Tasks Module)
- [x] Backend: Ranking يعتمد على Revenue + Closing Rate + Task Efficiency + Target Achievement
- [x] KPIModule: إضافة Section "تحليل الأداء التشغيلي" (Actual vs Target per Task Type)
- [x] KPIModule: Progressive Commission Breakdown واضح للمستخدم
- [x] KPIModule: Tabs Weekly/Monthly/Quarterly (دمج التقارير بدون Module منفصل)
- [x] TasksModule: Task Types إلزامية (7 أنواع: 2D Design, 3D Modeling, Render, Quotation, Meeting Modeling, Meeting Presentation, Meeting Closing)
- [x] TasksModule: Calendar View
- [x] TasksModule: Meeting Mandatory Rules (Meeting Link + Recording Link إجباري)
- [x] TasksModule: Tab "توزيع العمل" (Actual vs Target: 50% Meetings, 30% 3D+Render, 10% 2D, 10% Quotations)
- [x] PlanningModule: Target لكل Engineer (Revenue + Designs + Meetings + Quotations)
- [x] PlanningModule: ربط بـ KPI مباشرة

## KPI Refactor - مكتمل (Apr 2026)
- [x] Backend: Progressive Commission System (cumulative tiers, لا flat) - getEngineersKPI يحسب commissionBreakdown
- [x] Backend: getOperationalPerformance (عدد كل نوع Task من Tasks Module) - 7 أنواع
- [x] Backend: getEnhancedRanking (Revenue 35% + Closing Rate 25% + Task Efficiency 20% + Target 20%)
- [x] KPIModule: Section 8 - Progressive Commission Breakdown واضح للمستخدم
- [x] KPIModule: Section 9 - تحليل الأداء التشغيلي (Actual vs Target per Task Type)
- [x] KPIModule: Section 10 - Enhanced Ranking (4 معايير مركبة)
- [x] TasksModule: Tab "توزيع العمل" (WorkDistributionTab - Actual vs Target: 50% Meetings, 30% 3D+Render, 10% 2D, 10% Quotations)
- [x] PlanningModule: EngineerTargetsSection (Target لكل Engineer + ربط بـ KPI)
- [x] TypeScript: نظيف (0 errors)
- [x] Tests: 233 passed

## Role-Based System Refactor (Apr 2026)
- [x] Schema: تحديث engineers.role enum ليشمل (sales_engineer, admin_sales, tele_sales, site_engineer)
- [x] Migration: تطبيق SQL migration لتغيير enum
- [x] Backend: getEngineersKPI يفلتر sales_engineer فقط (يستثني admin_group/group_admin)
- [x] Backend: getTeleSalesKPI دالة جديدة (Calls + Leads + Conversion + Response Speed)
- [x] Backend: getSiteEngineersKPI دالة جديدة (Visits + Punctuality + Data Quality + Conversion)
- [x] Backend: getAdminSalesKPI دالة جديدة (Task Distribution + CRM + Process Compliance)
- [x] Backend: getOperationalPerformance يفلتر sales_engineer فقط
- [x] Backend: getEnhancedRanking يفلتر sales_engineer فقط
- [x] Backend: تحديث جميع دوال KPI لاستثناء admin/group_admin/system users
- [x] Router: إضافة kpi.teleSales + kpi.siteEngineers + kpi.adminSales endpoints
- [x] Frontend: KPIModule - إضافة Tabs منفصلة (Sales / Admin Sales / Tele Sales / Site Engineers)
- [x] Frontend: TasksModule - فلترة Engineers حسب Role في الـ dropdown
- [x] Frontend: Engineers Management - تحديث Role options (4 أدوار + system_user)
- [x] Frontend: Reports - فلترة حسب Role (Sales Report / Tele Report / Site Report)

## Deal Ownership & Closing Module Refactor (Apr 2026)
- [x] Backend: autoCreateOrUpdateDealFromTask (Quotation/Meeting/Closing → Deal)
- [x] Backend: addDealTimelineEntry (تسجيل كل نشاط في deal_timeline)
- [x] Backend: updateDealEngineer endpoint مع Audit Log (old/new engineer + date + modified by)
- [x] Backend: فلترة Sales Engineers فقط في قوائم Assign Engineer (استثناء admin/tele/site)
- [x] Backend: Warning عند تغيير مهندس صفقة WON
- [x] Frontend: ClosingModule - إضافة Gross/Net/Discount fields في Add Deal + Update Deal
- [x] Frontend: ClosingModule - إضافة Assigned Engineer dropdown في Update Deal (Sales Engineers فقط)
- [x] Frontend: ClosingModule - Lock fields بعد إغلاق الصفقة (WON/LOST)
- [x] Frontend: ClosingModule - Warning Modal عند تغيير مهندس صفقة WON
- [x] Frontend: ClosingModule - Audit Log tab يعرض تاريخ تغييرات المهندس
- [x] Frontend: ClosingModule - Deal Timeline tab يعرض نشاطات الصفقة
- [x] Frontend: KPIModule - Tabs منفصلة (Sales / Tele Sales / Site Engineers / Admin Sales)
- [x] Frontend: TasksModule - فلترة Engineers حسب Role في dropdown
- [x] Frontend: Engineers Management - تحديث Role options (4 أدوار + system_user)
- [x] Backend: getTeleSalesKPI endpoint في routers.ts
- [x] Backend: getSiteEngineersKPI endpoint في routers.ts
- [x] Backend: getAdminSalesKPI endpoint في routers.ts

## Discount System Refactor (Advanced)
- [x] Backend: حساب شريحة الخصم من (Actual Sales + Pipeline Value)
- [x] Backend: Realized Discount = Actual Sales × Discount%
- [x] Backend: Potential Discount = Pipeline × Discount%
- [x] Backend: توزيع Potential Discount على المهندسين بالوزن (مبيعات 60d + pipeline + closing rate + ranking)
- [x] Backend: تقسيم نصيب المهندس على صفقاته بالوزن (حسب قيمة كل صفقة من إجمالي pipeline)
- [x] Backend: Bonus = 50% مهندس + 15% Admin Sales + 35% شركة من Unused Discount
- [x] Backend: شرط الـ Bonus: Closed/Won فقط
- [x] Backend: Net Sales = Gross - Used Discount
- [x] Backend: منع تعديل Used Discount بعد الإغلاق إلا بصلاحية Manager
- [x] Backend: Audit Log لأي تعديل بعد الإغلاق
- [x] Frontend: Discount Dashboard لكل مهندس (Allocated/Used/Remaining/Bonus + صفقاته)
- [x] Frontend: Admin Sales Dashboard (صفقات موفرة + Bonus + نسبة التوفير)
- [x] Frontend: تحديث KPIModule بـ Role Tabs (Tele/Site/Admin Sales)

## Department System (نظام الأقسام)
- [x] Schema: إضافة department field في engineers table (7 قيم)
- [x] Migration: تطبيق تعديل الـ schema
- [x] Backend: تحديث SALES_ENGINEER_ROLES و DEAL_OWNER_ROLES لاستخدام department
- [x] Backend: فلترة getEngineersKPI لـ Sales فقط
- [x] Backend: فلترة getAdvancedDiscountSummary لـ Sales فقط
- [x] Backend: فلترة getSalesEngineers لـ Sales فقط
- [x] Backend: endpoints جديدة لكل KPI حسب Department
- [x] Frontend: Engineers Management - إضافة Department dropdown
- [x] Frontend: ClosingModule - فلترة Dropdown لـ Sales فقط
- [x] Frontend: KPIModule - Tabs منفصلة لكل Department
- [x] Frontend: Discount Dashboard - فلترة لـ Sales فقط

## Advanced Discount Distribution System (Score-Based)
- [x] Backend: دالة calcEngineerDiscountScore (Performance 40% + Pipeline 30% + Closing Skill 30%)
- [x] Backend: Ranking Multiplier (Top×1.1, Mid×1.0, Low×0.8)
- [x] Backend: Boost +10% لأعلى 2 مهندسين
- [x] Backend: Minimum Threshold (Performance < 20% = لا خصم)
- [x] Backend: Output لكل مهندس (Score + Rank + Share + عدد صفقات + متوسط خصم)
- [x] Frontend: Discount Distribution Dashboard

## Company Closing KPI + Reward System
- [x] Backend: دالة getCompanyClosingKPI (Current Rate + Target 60% + Gap + Trend)
- [x] Backend: دالة getTeamRewardStatus (Bonus عند Rate ≥ 60%)
- [x] Backend: Commission Structure = Base + Individual Bonus + Saving Discount Bonus + Team Closing Bonus
- [x] Backend: Discount Pool Adjustment حسب Closing Rate
- [x] Frontend: KPIModule - Company Closing KPI Section
- [x] Frontend: KPIModule - Team Reward Dashboard (Total Earnings لكل مهندس)
- [x] Frontend: Alert عند Closing Rate < 60%

## Lost Deals Impact System
- [x] Backend: دالة getLostDealsImpact (Lost Rate + Lost Value Impact + KPI Penalty)
- [x] Backend: Lost Rate > 30% → -20% من KPI Score
- [x] Backend: Discount Allocation Reduction (High Loss × 0.7, Very High × 0.5)
- [x] Backend: Alert عند خسارة 2+ صفقات كبيرة
- [x] Backend: تحليل أسباب الخسارة (Top Loss Reasons)
- [x] Frontend: KPIModule - Lost Deals Impact Section
- [x] Frontend: ClosingModule - Lost Analysis Dashboard

## Collections Module - Full Refactor (Financial Collection System)
- [x] Backend: autoCreateContractFromDeal (عند WON/CLOSED → إنشاء Contract تلقائي)
- [x] Backend: Commission يُحسب على Collected Amount فقط (لا على Contract Value)
- [x] Backend: createFollowUpTask (عند Next Payment Date → Task للـ Sales Engineer)
- [x] Backend: getCollectionAlerts (Due Today + Overdue + Upcoming)
- [x] Backend: getCollectionDashboard (Total Today + Month + Overdue + Upcoming)
- [x] Backend: فلترة CollectionsModule لـ Sales Engineer + Sales Specialist + Admin Sales فقط
- [x] Backend: Admin Sales Bonus من التحصيل المنتظم + تقليل التأخير
- [x] Frontend: CollectionsModule - Auto-contract notification عند WON
- [x] Frontend: CollectionsModule - Dashboard (Today + Month + Overdue + Upcoming)
- [x] Frontend: CollectionsModule - Payment form (Amount + Type + Date + Receipt + Notes)
- [x] Frontend: CollectionsModule - Commission Earned = f(Collected Amount)
- [x] Frontend: CollectionsModule - Alerts Section (Due Today + Overdue + Upcoming)
- [x] Frontend: CollectionsModule - فلترة Engineers (Sales + Admin Sales فقط)
- [x] Frontend: ClosingModule - Auto-trigger Contract عند تغيير Status إلى WON

## Feature-by-Feature Implementation (Session 3)

### Feature 1: Tasks - 7 Types + Department Enforcement
- [x] إضافة meeting_modeling لـ taskType enum في DB
- [x] تحديث schema.ts ليطابق الـ 7 أنواع الصحيحة (design_2d→2d_design alias, design_3d→3d_modeling alias)
- [x] إضافة ALLOWED_TASK_TYPES_BY_DEPARTMENT constant في db.ts
- [x] تحديث AddTaskDialog: إضافة Task Type dropdown بالـ 7 أنواع
- [x] تحديث AddTaskDialog: Department Enforcement (فلترة الأنواع حسب قسم المهندس المختار)
- [x] تحديث tasks.create router ليقبل taskType
- [x] تحديث createTask في db.ts ليحفظ taskType
- [x] التحقق من Work Distribution Tab يعرض بيانات صحيحة

### Feature 2: Deals Automation
- [x] التحقق من autoCreateOrUpdateDealFromTask مربوطة بـ tasks.create
- [x] إضافة Engineer dropdown يعرض Sales Engineers فقط في ClosingModule
- [x] التحقق من Gross/Net/Discount fields موجودة وتعمل
- [x] التحقق من Deal Lock بعد WON/CLOSED

### Feature 3: Discount System
- [x] التحقق من Realized/Potential Discount في ClosingModule
- [x] التحقق من Score-Based Distribution يعمل
- [x] التحقق من Bonus 50% للمهندس من الخصم الموفَّر

### Feature 4: KPI Integration
- [x] التحقق من Progressive Commission يعمل صح
- [x] التحقق من Role Tabs (Tele/Site/Admin/Company)
- [x] التحقق من Operational Performance يسحب من Tasks

### Feature 5: Collection Module
- [x] التحقق من Dashboard يعرض البيانات
- [x] التحقق من Alerts للمتأخرين
- [x] التحقق من Commission على المحصَّل

## Full Implementation Session - All Features

### Feature 1: Tasks (تم جزئياً - إكمال)
- [x] meeting_modeling في DB enum
- [x] TASK_TYPE_LABELS_V2 محدثة
- [x] ALLOWED_TASK_TYPES_BY_DEPARTMENT constant
- [x] tasks.create router يقبل taskType
- [x] createTask يحفظ taskType
- [x] AddTaskDialog: 7 Task Types + Department Enforcement
- [x] Work Distribution Tab: تحديث ليعرض 7 أنواع بشكل صحيح مع الأسماء الجديدة

### Feature 2: Deals Automation
- [x] autoCreateOrUpdateDealFromTask موجودة وتعمل
- [x] Gross/Net حسابات موجودة
- [x] Deal Lock موجود
- [x] Engineer Filter في ClosingModule: يعرض Sales Engineers فقط
- [x] إضافة زر "Auto-create Deal" في Task list عند meeting_closing/quotation
- [x] التحقق من Lock يمنع التعديل بعد WON

### Feature 3: Discount System
- [x] التحقق من Realized/Potential Discount في ClosingModule
- [x] التحقق من Score-Based Distribution يعمل
- [x] التحقق من Bonus 50% للمهندس من الخصم الموفَّر
- [x] إضافة Discount Summary section في ClosingModule

### Feature 4: KPI Integration
- [x] التحقق من Progressive Commission يعمل صح
- [x] التحقق من Role Tabs (Tele/Site/Admin/Company) موجودة
- [x] التحقق من Operational Performance يسحب من Tasks بالأسماء الجديدة
- [x] إصلاح أي مشكلة في KPIModule

### Feature 5: Collection Module
- [x] التحقق من Dashboard يعرض البيانات
- [x] التحقق من Alerts للمتأخرين
- [x] التحقق من Commission على المحصَّل
- [x] إصلاح أي مشكلة في CollectionsModule

## Gaps Fix Session - Apr 28 2026

- [x] Fix 1: KPI Commission Multiplier = 0.5 عند KPI < 60% (حالياً ثابت 1.0)
- [x] Fix 2: Discount Bonus 50% يظهر في UI لكل مهندس في ClosingModule
- [x] Fix 3: Realized vs Potential Discount يظهر في UI بشكل منفصل في ClosingModule
- [x] Fix 4: Backend Department Enforcement في tasks.create (يرفض taskType غير مسموح)

## Tasks Distribution Module Fixes - Apr 29 2026

- [ ] Fix 1: إضافة زر "تعديل" بجانب كل مهندس (تغيير القسم + نوع المهندس)
- [ ] Fix 2: فلترة المهندسين في توزيع المهام - Sales Engineers فقط (بدون Pro Group Admin / Admin Sales)
- [ ] Fix 3: ربط توزيع المهام بنوع المهندس (Sales Engineer = 7 أنواع، باقي الأنواع لا تظهر)
- [ ] Fix 4: Target vs Actual بالنسب (2D=10%, 3D+Render=30%, Quotation=10%, Meetings=50%)
- [ ] Fix 5: دمج توزيع العمل داخل تبويب في المهام اليومية (مش Module منفصل)
- [ ] Fix 6: ربط بيانات التوزيع بالـ KPI والتقارير

## Admin Sales Tasks Restructure - Apr 29 2026
- [ ] إضافة adminTaskCategory enum في DB (crm_data, financial_collection, operations, reporting, coordination)
- [ ] إضافة adminTaskWeight و adminTaskObjective في admin_sales_tasks schema
- [ ] تحديث Admin Tasks UI لعرض Category dropdown + Objective
- [ ] حساب KPI Admin = 40% تنفيذ + 30% تأثير فريق + 30% جودة
- [ ] Dashboard جديد لـ Admin Sales: توزيع الوقت + نسبة تنفيذ + Score + Weak Points
- [ ] ربط Admin KPI بنفس بيانات Tasks في KPI Module
- [ ] منع Task بدون Category من الدخول في KPI

## Leads Module - Advanced Date Filter - Apr 29 2026
- [ ] إضافة Custom Range (From Date + To Date) في LeadsModule
- [ ] إضافة 9 Presets: اليوم/أمس/آخر 7 أيام/آخر 14 يوم/آخر 30 يوم/هذا الأسبوع/الأسبوع الماضي/هذا الشهر/الشهر الماضي
- [ ] ربط الفلتر بكل البيانات: إجمالي Leads + تم التواصل + لم يتم التواصل + المؤهل + المتحول لصفقات
- [ ] تحسين UI: Dropdown واضح + عرض التاريخ المختار + زر Reset
- [ ] تجهيز للـ CRM Integration: Date Field حقيقي + Dynamic Filter

## Visits Module - Stage-Based Updates - Apr 29 2026
- [ ] إلغاء التحديث الإلزامي اليومي الكامل للمعاينات
- [ ] إضافة getVisitsNeedingAction في db.ts: Next Action + Missing Action + Delay Detection
- [ ] تعديل التنبيهات: "5 معاينات تحتاج رفع" بدلاً من "29 معاينة لم يتم تحديثها"
- [ ] تعديل KPI Logic: نسبة التنفيذ + نسبة الرفع في نفس اليوم + نسبة التأخير + نسبة التحصيل
- [ ] Stage-Based Notifications في VisitsModule.tsx

## Visits Module - Stage-Based Updates - Apr 29 2026
- [ ] Stage-Based Updates Logic in db.ts
- [ ] Stage-Based Notifications in VisitsModule.tsx
- [x] Role-Based Access Control: useRoleAccess hook
- [ ] RBAC: إخفاء Sales Modules عن Admin/Tele/Visits/Interior
- [ ] RBAC: Manager يرى كل الأقسام

## Discount System - Full Operational Redesign
- [ ] Schema: dealDiscountAllocations table (توزيع الخصم على الصفقات)
- [ ] Schema: discountBonusCap table (حد أقصى للمكافأة الشهرية)
- [ ] db.ts: distributeDiscountToDeals (توزيع نسبي حسب قيمة الصفقة)
- [ ] db.ts: Closed/Pipeline separation logic
- [ ] db.ts: Bonus calculation (50% من الخصم أو بحد الكومشن)
- [ ] db.ts: منع المكافأة إذا خسرت الصفقة بسبب السعر
- [ ] routers.ts: discount.dealAllocations endpoint
- [ ] routers.ts: discount.applyToClosedDeal endpoint
- [ ] routers.ts: discount.bonusSummary endpoint
- [ ] Frontend: DiscountModule - شاشة التوزيع على الصفقات
- [ ] Frontend: بيانات كل صفقة (قبل/بعد الخصم + صافي + نسبة)
- [ ] Frontend: Bonus Panel (شروط + حساب + Cap)
- [ ] Frontend: إخفاء Pro Group Admin من الصفقات/الخصومات/التقارير

## Operational Targets + KPI Activity-Based + Team Performance
- [ ] Schema: إضافة operationalTargets table (2D Design, 3D Modeling, Render, Quotation, Meeting, Presentation, Closing)
- [ ] db.ts: getOperationalTargets + setOperationalTargets + getOperationalPerformance
- [ ] db.ts: getTeamPerformanceRanking (Sales Engineer + Sales Specialist فقط)
- [ ] routers.ts: endpoints للأهداف التشغيلية + Team Performance
- [ ] Frontend: Operational Targets Panel في SalesModule - المطلوب/المنفذ/نسبة الإنجاز
- [ ] Frontend: تحديث KPI في SalesModule (مبيعات فعلية + نسبة التحقيق + كومشن + حوافز فقط)
- [ ] Frontend: Team Performance (Sales فقط - Top/Needs Support) بناءً على النشاط + Closing Rate
- [ ] فصل Rules/شرائح الكومشن إلى الإعدادات فقط (إخفاء من KPI display)

## KPI + Commission + Incentives Overhaul
- [ ] Progressive Commission: 0-1M=1%, 1M-1.25M=1.25%, 1.25M-1.5M=1.5%, 1.5M-1.75M=1.75%, 1.75M-2M=2%, +0.25% per 250k after 2M
- [ ] KPI Share: نسبة تحقيق × قيمة KPI الكلية للفريق
- [x] Closing Rate Incentive: ربط الحوافز بتحسين Closing Rate (40%/50%/60%)
- [ ] حذف Discount Bonus System (استُبدل بمنظومة الأداء)
- [ ] KPI Role Filter: عرض Sales Engineer + Sales Specialist فقط في الترتيب
- [ ] Frontend: تحديث KPIModule لعرض Commission + KPI Share + Incentive بشكل صحيح
- [ ] Frontend: تحديث SalesModule لعرض Progressive Commission details

## Company Closing Incentive System
- [ ] calcCompanyClosingBonus: Company-Based tiers (<40%=0, 40-50%=+15%, 50-60%=+30%, 60-70%=+50%, 70-80%=+75%, >80%=+100%)
- [ ] Gate Condition: >=70% target = full bonus, <70% = 50% bonus
- [x] getCompanyClosingBonusForAllEngineers: company rate + per-engineer eligibility
- [ ] companyClosingBonus endpoint in routers.ts
- [ ] Company Closing KPI Tab update: Tier + Bonus Multiplier + per-engineer eligibility
- [ ] Test 3 scenarios: 35%, 50%, 65% closing rate

## Planning Module - Full Goals System
- [ ] Schema: companyGoals table (revenue target, avg deal, closing rate target, period)
- [ ] Schema: engineerPersonalGoals table (objective, evaluation method, reviewer, score)
- [ ] Migration SQL for new tables
- [ ] db.ts: getCompanyGoals + setCompanyGoal + calcCompanyGoalProgress
- [ ] db.ts: getEngineerPersonalGoals + setPersonalGoal + calcPersonalScore
- [ ] db.ts: calcTotalPerformanceScore (Financial 40% + Operational 40% + Personal 20%)
- [ ] routers.ts: planning.companyGoal + planning.individualGoal + planning.personalGoal endpoints
- [ ] PlanningModule: Tab 1 - Company Goals (input + auto calculation)
- [ ] PlanningModule: Tab 2 - Individual Goals (Financial + Operational per engineer)
- [ ] PlanningModule: Tab 3 - Personal Development Goals (Objective + Score)
- [ ] KPIModule: Total Performance Score panel (Financial + Operational + Personal)

## Goals Module - تخطيط الأهداف الكامل (الطلب الأخير)
- [x] تحديث schema: إضافة engineerTargets.target2D/target3D/targetRender/targetQuotations/targetMeetings/targetPresentations/targetClosings
- [x] تحديث schema: إضافة engineerPersonalGoals (developmentArea + evaluationMethod + score + reviewerRole)
- [x] تطبيق migration SQL الجديد
- [x] Backend: upsertEngineerOperationalTargets (حفظ الأهداف التشغيلية)
- [x] Backend: setOperationalTargets endpoint في sales router
- [x] Backend: calcTotalPerformanceScore (مالي 40% + تشغيلي 40% + شخصي 20%)
- [x] Backend: getAllEngineersPerformanceScores (لكل المهندسين)
- [x] Backend: planning.allEngineersPerformanceScores endpoint
- [x] PlanningModule.tsx: Tab 1 - هدف الشركة (Company Goals) مع الحسابات التلقائية
- [x] PlanningModule.tsx: Tab 2 - أهداف المهندسين (Individual Goals) مالي + تشغيلي
- [x] PlanningModule.tsx: Tab 3 - التطوير الشخصي (Personal Development) مع التقييم
- [x] KPIModule.tsx: إضافة Tab "التقييم الشامل" يعرض Total Performance Score
- [x] KPIModule.tsx: عرض مالي/40 + تشغيلي/40 + شخصي/20 + إجمالي + تقدير A/B/C/D
- [x] إصلاح filter المهندسين ليشمل جميع الأدوار

## بحث في المعاينات
- [x] إضافة حقل بحث باسم العميل في قائمة المعاينات (VisitsModule) مماثل للتعاقدات

## تطوير موديول المهام - نظام قياس الأداء
- [ ] إضافة نوعي مهمة جديدين: Contract (إعداد العقد) و Work Order (أمر الشغل)
- [ ] إضافة حقل goalType لربط المهمة بالهدف التشغيلي (2D/3D/Render/Quotation/Meeting/Closing/Contract/WorkOrder)
- [ ] إضافة حقل actualHours (الساعات الفعلية) و completionDate (تاريخ الإنجاز)
- [ ] إضافة حقل clientName/dealId لربط المهمة بالعميل أو الصفقة
- [ ] تطبيق migration SQL للحقول الجديدة
- [ ] تحديث Backend: حساب نسبة الالتزام بالوقت وكفاءة التنفيذ
- [ ] تحديث Backend: ربط المهام المكتملة بالـ Operational Score في KPI
- [ ] تحديث TasksModule.tsx: إضافة Contract و Work Order في قائمة الأنواع
- [ ] تحديث TasksModule.tsx: إضافة حقول Actual Hours + Completion Date في نموذج الإضافة
- [ ] تحديث TasksModule.tsx: إضافة حقل Client/Deal في نموذج الإضافة
- [ ] تحديث TasksModule.tsx: Dashboard لكل مهندس (مطلوب/منفذ/متأخر/نسبة الإنجاز)
- [ ] تحديث KPIModule.tsx: ربط المهام بالـ Operational Score وعرض تحليل الأداء

## توحيد أنواع الأنشطة وتوزيع الأوزان
- [ ] إنشاء shared/activityTypes.ts بقائمة موحدة للأنشطة التسعة
- [ ] تحديث Schema: إضافة contract + work_order لـ taskType enum + goalType + actualHours + completionDate + clientName + dealId
- [ ] تطبيق Migration SQL للحقول الجديدة
- [ ] تحديث db.ts: createTask يقبل الحقول الجديدة
- [ ] تحديث db.ts: حساب Actual Count تلقائياً من Tasks المكتملة
- [ ] تحديث db.ts: حساب Operational Score بالأوزان الجديدة (Meetings 40%, 3D 15%, Render 10%, 2D 10%, Quotation 10%, WorkOrder 10%, Contract 5%)
- [ ] تحديث routers.ts: tasks.create يقبل goalType + actualHours + completionDate + clientName + dealId
- [ ] تحديث PlanningModule.tsx: عرض Target vs Actual لكل نشاط من التسعة
- [ ] تحديث KPIModule.tsx: عرض توزيع وقت المهندس + أعلى/أقل نشاط + Operational Score بالأوزان الجديدة
- [ ] تحديث TasksModule.tsx: إضافة Contract + Work Order في قائمة الأنواع + حقول جديدة

## نظام Users & Permissions الداخلي (Internal Auth)
- [ ] حفظ checkpoint للتغييرات الحالية (Tasks + Goals + KPI)
- [ ] إضافة جداول: app_users, user_permissions, activity_logs في schema
- [ ] migration SQL للجداول الجديدة
- [ ] دوال db.ts: createAppUser, loginAppUser, getUserPermissions, updatePermissions
- [ ] routers.ts: appUsers router (login, me, list, create, update, deactivate)
- [ ] صفحة Login.tsx داخلية (username/password) مستقلة عن OAuth
- [ ] صفحة UserManagement.tsx (Admin Panel) لإدارة المستخدمين والصلاحيات
- [ ] PermissionsEditor component لتعديل صلاحيات كل user
- [ ] تطبيق الصلاحيات فعلياً على الـ Sidebar (إخفاء/إظهار الـ Modules)
- [ ] Data Access Control: كل user يرى بياناته فقط (إلا Manager/Admin)
- [ ] ربط app_users بـ engineers table
- [ ] Activity Logs: تسجيل كل العمليات
- [ ] Template Permissions لكل Role

## ✅ نظام Users & Permissions الداخلي - المكتمل (29 أبريل 2026)
- [x] إضافة جداول: app_users, user_permissions, activity_logs في schema
- [x] migration SQL للجداول الجديدة
- [x] دوال db.ts: createAppUser, loginAppUser, verifyAppUserToken, getUserPermissions, updateUserPermissions, updateAppUser, logActivity, getActivityLogs, DEFAULT_ROLE_PERMISSIONS
- [x] routers.ts: appUsers router (login, logout, me, list, create, update, getPermissions, updatePermissions, activityLogs, defaultPermissions)
- [x] صفحة UserManagement.tsx: إنشاء مستخدمين + تعديل + إدارة صلاحيات + سجل النشاط
- [x] PermissionsEditor component: تعديل صلاحيات كل module (view/add/edit/delete + dataScope)
- [x] إضافة "إدارة المستخدمين" في Sidebar (تحت إدارة الفريق)
- [x] Route /user-management في App.tsx
- [x] hook useAppAuth.ts: useAppAuth, usePermission, useRequireAppAuth
- [x] إنشاء مستخدم Manager افتراضي (admin/admin123)
- [x] Vitest tests: 11 tests لنظام Users (جميعها اجتازت)

## نظام Users & Permissions الداخلي - المكتمل (29 أبريل 2026)
- [x] إضافة جداول: app_users, user_permissions, activity_logs في schema
- [x] migration SQL للجداول الجديدة
- [x] دوال db.ts: createAppUser, loginAppUser, verifyAppUserToken, getUserPermissions, updateUserPermissions, updateAppUser, logActivity, getActivityLogs, DEFAULT_ROLE_PERMISSIONS
- [x] routers.ts: appUsers router (login, logout, me, list, create, update, getPermissions, updatePermissions, activityLogs, defaultPermissions)
- [x] صفحة UserManagement.tsx: إنشاء مستخدمين + تعديل + إدارة صلاحيات + سجل النشاط
- [x] PermissionsEditor component: تعديل صلاحيات كل module (view/add/edit/delete + dataScope)
- [x] إضافة "إدارة المستخدمين" في Sidebar (تحت إدارة الفريق)
- [x] Route /user-management في App.tsx
- [x] hook useAppAuth.ts: useAppAuth, usePermission, useRequireAppAuth
- [x] إنشاء مستخدم Manager افتراضي (admin/admin123)
- [x] Vitest tests: 11 tests لنظام Users (جميعها اجتازت - 244 test إجمالاً)

## Dynamic Permissions System (الطلب الجديد)
- [ ] إضافة جدول role_permissions في schema.ts (صلاحيات على مستوى الـ Role)
- [ ] توليد migration وتطبيقه
- [ ] seed البيانات الافتراضية لكل Role في role_permissions
- [ ] Backend: procedures لقراءة/تحديث role_permissions
- [ ] إنشاء Permission Control Panel (Matrix) صفحة كاملة
- [ ] استبدال useRoleAccess الـ Hardcoded بـ Dynamic permissions من DB
- [ ] تحديث DashboardLayout ليعتمد على Dynamic permissions
- [ ] إزالة كل الـ Hardcoded Rules من useRoleAccess.ts
- [ ] اختبار تغيير الصلاحيات Live

## Granular Section Permissions (الطلب الجديد - 2 مايو 2026)
- [x] تطبيق canViewSection('kpi', section) على KPI Module (tabs: engineer_details, monthly_earnings, company_closing, rewards, lost_deals_impact, overall_evaluation, activities_analysis)
- [x] تطبيق canViewSection('planning', section) على Planning Module (tabs: company_goals, engineer_goals, personal_goals)
- [x] تطبيق canViewSection('closing', section) على Closing Module (tabs: deals_pipeline, discount_system, engineers_tab, lost_deals)
- [ ] تحديث MODULE_SECTIONS في db.ts لإضافة الـ sections الجديدة لكل Module
- [ ] تحديث شاشة إدارة الصلاحيات لعرض Section-level controls بدلاً من Module-level
- [ ] إضافة دعم View All / View Self / Hidden لكل Section
- [ ] Backend: تطبيق View Self على Goals Module (المهندس يرى نفسه فقط)
- [ ] Backend: تطبيق View Self على KPI Module (المهندس يرى بياناته فقط)

## Auto Target Distribution Engine (الطلب الجديد - 2 مايو 2026)
- [x] إضافة حقول isAutoDistributed وdistributionWeight وtargetLeads إلى engineerTargets schema
- [x] تطبيق migration على قاعدة البيانات
- [x] بناء calcAutoDistribution function في db.ts
- [x] بناء applyAutoDistribution function في db.ts
- [x] بناء manualOverrideEngineerTarget function في db.ts
- [x] إضافة previewDistribution وapplyDistribution وmanualOverride procedures في routers.ts
- [x] دمج شاشة أهداف المهندسين مع التطوير الشخصي في شاشة واحدة
- [x] عرض Auto Distribution Banner مع معاينة التوزيع
- [x] دعم Manual Override مع Flag تحذيري
- [x] عرض الهدف المالي والتشغيلي والشخصي في نفس الشاشة
- [x] إزالة tab التطوير الشخصي المنفصل (مدمج داخل أهداف المهندسين)

## إصلاح تسجيل الدخول والخروج
- [x] إضافة زر تسجيل الدخول (Login) في الـ Sidebar أو الـ Header
- [x] إضافة زر تسجيل الخروج (Logout) في الـ Sidebar أو الـ Header

## تعديلات موديول التفاوض والإغلاق + نظام الخصومات (Critical - 3 مايو 2026)

### أولاً: Schema
- [x] إضافة حقل closingMonth (int) و closingYear (int) في جدول deals
- [x] تطبيق migration SQL

### ثانياً: Backend - منطق الفلترة
- [x] تصحيح getDealsStats: فلترة closed_won بـ closingMonth/closingYear، وفلترة Pipeline بـ createdAt
- [x] تصحيح getDealsList: نفس المنطق (closed_won → closingMonth، غيرها → createdAt)
- [x] تصحيح getDiscountSummary: إضافة year/month parameter وفلترة بالشهر
- [x] تصحيح getMonthlySalesStats: استخدام netValue فقط
- [x] تصحيح getEngineersSalesPerformance: استخدام netValue فقط
- [x] تصحيح getSalesControlStats: استخدام netValue فقط
- [x] تصحيح getEngineersKPI: استخدام netValue فقط
- [x] تحديث createDealWithDiscount: حفظ closingMonth و closingYear عند الإنشاء
- [x] تحديث updateDealFull: تحديث closingMonth و closingYear عند الإغلاق

### ثالثاً: Frontend - ClosingModule
- [x] إضافة رسالة تأكيد الشهر في نافذة إضافة الصفقة
- [x] عرض Gross vs Net بوضوح في قائمة الصفقات
- [x] ربط فلتر الشهر بالـ Discount tab (getDiscountSummary يأخذ year/month)
- [x] ربط lostDealsAnalysis بفلتر year/month
- [x] إضافة بطاقات نسبة الإغلاق + الصفقات الخاسرة + Pipeline في الـ discount tab

### رابعاً: توحيد فلتر الشهر
- [x] KPI Module: يستخدم year/month بالفعل
- [x] Sales Module: يستخدم year/month بالفعل
- [x] Discount tab في Closing: مربوط بفلتر الشهر المحدد
- [x] Overview: closing.list مربوط بالشهر الحالي

### خامساً: الاختبارات
- [x] Vitest: اختبار منطق الفلترة بالشهر (closedAt vs createdAt) - 8 اختبارات ناجحة
- [x] Vitest: اختبار حساب netValue = grossValue - discountValue
- [x] Vitest: اختبار استقلالية بيانات كل شهر

## نظام إدارة المستخدمين الكامل (Critical - 5 مايو 2026)

### أولاً: Schema
- [ ] إضافة حقل forcePasswordChange (boolean) في جدول engineers
- [ ] تطبيق migration SQL

### ثانياً: Backend
- [ ] إضافة procedure bulkCreateUsers: إنشاء username/password لكل مهندس بدون account
- [ ] تحديث localLogin: التحقق من forcePasswordChange وإرجاعه في الـ session
- [ ] إضافة procedure changePassword: تغيير كلمة المرور مع التحقق من القديمة
- [ ] إضافة procedure resetPassword (admin): إعادة تعيين كلمة المرور وتفعيل forcePasswordChange
- [ ] إضافة procedure listEngineersWithAccountStatus: عرض كل المهندسين مع حالة الـ account
- [ ] فلترة site_engineer و admin (Pro Group) من شاشات المبيعات والـ KPI

### ثالثاً: Frontend
- [ ] تحديث LoginPage: عرض شاشة تغيير كلمة المرور عند forcePasswordChange
- [ ] تحديث UserManagement: عرض كل المهندسين مع حالة الـ account (لديه account / بدون)
- [ ] إضافة زر "إنشاء حسابات تلقائياً" في UserManagement (Bulk Creation)
- [ ] إضافة زر "إعادة تعيين كلمة المرور" لكل مستخدم
- [ ] إضافة زر "تفعيل / تعطيل" لكل مستخدم
- [ ] عرض بيانات المهندس حسب دوره (Engineer يرى بياناته فقط)

### رابعاً: الاختبارات
- [ ] Vitest: اختبار Bulk Creation
- [ ] Vitest: اختبار forcePasswordChange flow
- [ ] Vitest: اختبار Role-based data filtering

## نظام تاريخ الاحتساب المالي (accountingMonth/accountingYear)

### أولاً: Schema
- [ ] إضافة حقل accountingMonth (int) و accountingYear (int) في جدول deals
- [ ] تطبيق migration SQL

### ثانياً: Backend
- [ ] تحديث getDealsStats لاستخدام accountingMonth/accountingYear
- [ ] تحديث getDealsList لاستخدام accountingMonth/accountingYear
- [ ] تحديث getDiscountSummary لاستخدام accountingMonth/accountingYear
- [ ] تحديث getLostDealsAnalysis لاستخدام accountingMonth/accountingYear
- [ ] إضافة procedure updateAccountingMonth (للـ Admin فقط) مع تسجيل في audit_logs
- [ ] عند إغلاق الصفقة: accountingMonth = closingMonth تلقائياً
- [ ] إضافة reopenDeal procedure في closing router

### ثالثاً: Frontend
- [ ] إضافة Badge "محسوبة على شهر: [اسم الشهر]" في بطاقة كل صفقة
- [ ] إضافة زر تعديل شهر الاحتساب (للـ Admin فقط) في نافذة التعديل
- [ ] إضافة Reopen Deal button في بطاقة الصفقات المغلقة
- [ ] تحسين Deal Transfer UI

### رابعاً: إصلاح TS errors
- [ ] إصلاح localAuth.changePassword procedure في routers.ts
- [ ] إصلاح UserManagement.tsx - listEngineers, bulkCreateAccounts, createEngineerAccount, resetPassword, toggleStatus
- [ ] إصلاح LoginPage.tsx - changePassword procedure

## نظام Calendar الموحد (Advanced Date Filter)

### أولاً: DateRangePicker Component
- [ ] بناء DateRangePicker component موحد يدعم: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, Custom Range
- [ ] تصميم مشابه لـ Meta Ads Business Manager
- [ ] دعم From Date → To Date للـ Custom Range

### ثانياً: ربط Calendar بالـ Modules
- [ ] Leads Module: ربط بـ DateRangePicker (activityDate)
- [ ] Closing Module: ربط بـ DateRangePicker (accountingDate/closingDate)
- [ ] KPI Module: ربط بـ DateRangePicker (period)
- [ ] Collections Module: ربط بـ DateRangePicker (paymentDate)
- [ ] Visits Module: ربط بـ DateRangePicker (visitDate)
- [ ] Reports Module: ربط بـ DateRangePicker (unified)

### ثالثاً: Backend Date Range Support
- [ ] تحديث getLeadDailyStatsList لقبول from/to dates
- [ ] تحديث getDealsStats لقبول from/to dates (بجانب month/year)
- [ ] تحديث getDealsList لقبول from/to dates
- [ ] تحديث getDiscountSummary لقبول from/to dates
- [ ] تحديث getPaymentsList لقبول from/to dates
- [ ] تحديث getVisitsStats لقبول from/to dates

### رابعاً: إصلاح TS errors
- [ ] نقل listEngineers/bulkCreateAccounts/createEngineerAccount/resetPassword/changePassword/toggleStatus من rolePermissions إلى appUsers في routers.ts
- [ ] إصلاح LoginPage.tsx - استخدام trpc.appUsers.changePassword بدلاً من trpc.localAuth.changePassword

## نظام Calendar الموحد (Timeline System)
- [x] بناء DateRangePicker Component موحد (مشابه Meta Ads Business Manager)
- [x] يدعم: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, Custom Range
- [x] يدعم: From Date → To Date (Custom Range مع Calendar Grid مزدوج)
- [x] ربط DateRangePicker بـ LeadsModule
- [x] ربط DateRangePicker بـ ClosingModule
- [x] ربط DateRangePicker بـ KPIModule
- [x] ربط DateRangePicker بـ CollectionsModule (Financial Collection)
- [x] ربط DateRangePicker بـ VisitsModule
- [x] ربط DateRangePicker بـ ReportsModule (MonthlyReportTab)
- [x] إضافة accountingMonth/accountingYear في deals table (Schema + Migration 0044)
- [x] Backend: setDealAccountingMonth procedure (admin/manager only)
- [x] Backend: financial.periodAnalysis procedure (startDate → endDate)
- [x] CollectionsModule: تحليل زمني كامل في analytics tab (إجمالي التحصيل + حسب الشهر + حسب نوع الدفعة + المتأخرات)
- [x] Historical Tracking: مراجعة أي فترة ماضية في كل Module
- [x] Vitest tests لـ DateRangePicker utilities (305 اختبار ناجح)

## نظام الخصومات الزمني (Time-Based Discount System)
- [ ] إعادة بناء getDiscountSummary لدعم startDate/endDate بدلاً من month/year فقط
- [ ] إعادة بناء getEngineerDiscountSummary لدعم date range
- [ ] إعادة بناء getDiscountBonusSummary لدعم date range
- [ ] تحديث discountSummary procedure لتمرير startDate/endDate
- [ ] تحديث engineerDiscountSummary procedure لتمرير date range
- [ ] ربط ClosingModule discount tab بالـ DateRangePicker (تغيير الفترة يغير الخصومات)
- [ ] إصلاح bug تحديث الصفقة (updateStage لا يقبل lostReason)

## شهر احتساب الصفقة (Accounting Month)
- [ ] إصلاح syntax error في db.ts (getEngineerDiscountSummary)
- [x] إضافة حقل accountingMonth/accountingYear في deals table (migration)
- [x] إضافة حقل "تحسب في شهر" في dialog تحديث الصفقة (Admin فقط)
- [ ] ربط getDiscountSummary بـ accountingMonth بدلاً من closingMonth
- [ ] ربط getEngineerDiscountSummary بـ date range
- [ ] تحديث discountSummary procedure لتمرير startDate/endDate
- [ ] تحديث engineerDiscountSummary procedure لتمرير date range
- [ ] تسجيل تغيير شهر الاحتساب في Activity Log
- [ ] ربط KPI + Commission + Reports بـ accountingMonth

## نظام Tasks + Alerts + KPI للـ Next Step (الطلب الجديد)
- [x] إنشاء deal_tasks table في Schema + Migration
- [x] إضافة DB functions: createDealTask, listOverdueTasks, getFollowupKPI
- [x] إضافة procedures في routers.ts: dealTasks.create, listOverdue, markDone
- [x] تحديث ClosingModule: إنشاء task تلقائياً عند حفظ Next Step
- [x] عرض Overdue Alerts بالأحمر في ClosingModule
- [x] إضافة Follow-up Compliance KPI في KPIModule
- [x] تقارير: Follow-up Compliance, Delayed Follow-ups, Engineer Response Tracking
- [ ] تسجيل Next Step في Activity Timeline

## ربط الخصومات بالـ Calendar (الطلب الجديد)
- [x] إعادة بناء getDiscountSummary لدعم startDate/endDate
- [x] إعادة بناء getEngineerDiscountSummary لدعم date range
- [x] تحديث discountSummary procedure لتمرير startDate/endDate
- [x] تحديث engineerDiscountSummary procedure لتمرير startDate/endDate
- [x] تحديث ClosingModule لاستخدام discountQueryParams مرتبطة بالـ dateFilter
- [x] إضافة حقل "تحسب في شهر" في dialog تحديث الصفقة (للإدارة فقط)
- [x] إضافة accountingMonth/accountingYear في updateDealFull

## إصلاح bug تحديث الصفقة
- [x] إصلاح updateStage procedure: إضافة lostReason وإصلاح value validation
- [x] إصلاح handleUpdate في ClosingModule: توحيد الـ mutation

## Dynamic Performance-Based Discount Engine (المرحلة القادمة)
- [ ] إعادة بناء Discount Pool بناءً على Calendar + Accounting Month
- [ ] معادلة توزيع الخصومات على المهندسين (Score-Based: Sales 40% + Pipeline 20% + Closing 20% + KPI 10% - Lost 10%)
- [ ] توزيع خصم المهندس على الصفقات حسب قيمة كل صفقة (Deal Weight)
- [ ] منع ترحيل الخصومات بين الشهور
- [ ] ربط الصفقات الخاسرة بـ Discount Weight
- [ ] ربط Company Closing KPI بـ Discount Flexibility
- [ ] واجهة عرض: Discount Pool + Used + Remaining + Pipeline + Closed
- [ ] تطبيق النظام فقط على Sales Engineer + Sales Specialist

## إصلاح bugs الحذف والتحديث في ClosingModule
- [ ] إصلاح deleteDeal procedure (خطأ "حدث خطأ في الحذف")
- [ ] إضافة Activity Log للحذف (من حذف + وقت + سبب)
- [ ] إصلاح Re-fetch بعد الحذف (تحديث القائمة + الأرقام)
- [ ] إصلاح نقل الصفقة للشهر المحاسبي الصحيح عند التحديث
- [ ] إصلاح Calendar Filtering - Month-Based بدلاً من Global Accumulative
- [ ] إصلاح Re-fetch بعد Update (تحديث Sales + Pipeline + Discounts + KPI)
- [ ] إصلاح getDeals query لاستخدام accountingMonth/accountingYear كـ primary filter

## إصلاح bug حذف المهندس
- [ ] إصلاح softDelete.engineer - protectedProcedure يفشل مع localAuth
- [ ] إصلاح softDelete.deal - protectedProcedure يفشل مع localAuth
- [ ] إخفاء المهندس المحذوف من جميع Dropdowns
- [ ] إعادة حساب KPI/Ranking بعد الحذف
- [ ] Activity Log للحذف (من حذف + وقت + سبب)

## إصلاح Bug حذف المهندس (مايو 2026)
- [x] إصلاح getEngineers و getEngineersWithRole لإضافة فلتر isDeleted = 0
- [x] إصلاح softDeleteEngineer لتعيين status = inactive عند الحذف
- [x] إصلاح softDeleteMut في TasksModule.tsx لإطلاق utils.invalidate() الشامل
- [x] إصلاح getEngineersCollectionCommission لإضافة فلتر isDeleted = 0
- [x] إصلاح getAllEngineersDistribution لإضافة فلتر isDeleted = 0
- [x] إصلاح getAllEngineersPerformanceScores لإضافة فلتر isDeleted = 0
- [x] إصلاح getFollowupComplianceReport لإضافة فلتر isDeleted = 0
- [x] إصلاح getTeamPerformanceRanking لإضافة فلتر isDeleted = 0
- [x] إصلاح getEngineersKPI لإضافة فلتر isDeleted = 0
- [x] إصلاح getAllEngineersEvaluationDashboard لإضافة فلتر isDeleted = 0
- [x] إصلاح getEngineersSalesPerformance لاستخدام accountingMonth كأولوية
- [x] إصلاح getSalesControlStats لاستخدام accountingMonth كأولوية
- [x] إصلاح getDealsStats لاستخدام accountingMonth كأولوية
- [x] إصلاح getDealsList لاستخدام accountingMonth كأولوية
- [x] إصلاح getDiscountSummary لاستخدام accountingMonth كأولوية
- [x] إصلاح getEngineerDiscountSummary لاستخدام accountingMonth كأولوية
- [x] إصلاح getLostDealsAnalysis لاستخدام accountingMonth كأولوية
- [x] إصلاح getTeamPerformanceRanking لاستخدام accountingMonth كأولوية

## إصلاح Bug تخطيط الأهداف (مايو 2026)
- [x] إصلاح setCompanyGoal router: تحويل من protectedProcedure إلى publicProcedure مع localAuth
- [x] إضافة useEffect لتحميل البيانات المحفوظة عند فتح الصفحة أو تغيير الشهر
- [x] إضافة Badge لإظهار حالة الهدف (محفوظ / غير محفوظ) في header الـ Card
- [x] إضافة banner لعرض الهدف المحفوظ الحالي مع التفاصيل
- [x] تحسين Date Picker: إضافة Calendar icon وتحقق من صحة التاريخ ومنع تاريخ نهاية قبل البداية
- [x] إضافة onError handler مع رسائل خطأ واضحة
- [x] إصلاح getCompanyGoalProgress لاستخدام accountingMonth كأولوية أولى
- [x] إضافة utils.invalidate() شامل بعد حفظ الهدف لتحديث جميع الموديولات

## إزالة القيم الافتراضية من النماذج (مايو 2026)
- [x] إصلاح softDelete.engineer - تحويل إلى publicProcedure مع localAuth ✅
- [x] إصلاح softDelete.deal - تحويل إلى publicProcedure مع localAuth ✅
- [x] إخفاء المهندس المحذوف من جميع Dropdowns (isDeleted=0 filter) ✅
- [x] إعادة حساب KPI/Ranking بعد الحذف (utils.invalidate شامل) ✅
- [x] إزالة القيمة الافتراضية من DeleteConfirmDialog (reason = '') وإضافة placeholder ✅
- [x] إزالة القيم الافتراضية من EMPTY_FORM في TasksModule (priority='', plannedHours='') ✅
- [x] إزالة القيم الافتراضية من WorkDistribution (activityType='', durationMinutes=0) + validation ✅
- [x] إزالة القيم الافتراضية من PlanningModule (avgDealValue='', closingRateTarget='', manpower='') + placeholders ✅
- [x] إزالة القيمة الافتراضية من SalesModule (manpower='') + placeholder ✅
- [x] إزالة القيم الافتراضية من ClosingModule (discountPercent='', discountValue='') ✅

## إصلاح Calendar View - مايو 2026

- [x] تشخيص سبب الـ Crash الجذري: كود مقطوع في السطر 246 من TaskCalendarView.tsx يُسبب SyntaxError ✅
- [x] إعادة بناء TaskCalendarView.tsx بالكامل مع Error Boundary كامل ✅
- [x] إضافة Validation لكل task قبل العرض (validateTask function) ✅
- [x] إضافة safeDate function لمنع أخطاء Date parsing ✅
- [x] إضافة 3 أوضاع عرض: Timeline / أسبوع / شهر ✅
- [x] إضافة فلتر المهندس (Admin فقط) ✅
- [x] إضافة فلتر الحالة (مخططة/منجزة/متأخرة/لم تُنفذ/تأخير العميل/جارية) ✅
- [x] إضافة فلتر نوع المهمة (اجتماعات/إغلاق/عروض أسعار/2D/3D/رندر) ✅
- [x] عرض اسم المهندس + نوع المهمة + حالة المهمة في كل task block ✅
- [x] إضافة MTD Summary Bar (إجمالي/منجزة/متأخرة/لم تُنفذ/مخططة/نسبة الإنجاز) ✅
- [x] إضافة Task Detail Dialog عند الضغط على أي مهمة ✅
- [x] إصلاح خطأ Select empty string (filterEngineerId = "all" بدلاً من "") ✅
- [x] إضافة taskType و startTime و endTime لـ getTasksCalendarView في db.ts ✅
- [x] رسالة فارغة محترمة عند عدم وجود مهام ✅
- [x] زر إعادة المحاولة عند فشل التحميل ✅

## Interactive Business Calendar - Google Calendar Style (مايو 2026)

### Backend / Schema
- [x] إضافة حقل reminderMinutes لجدول daily_tasks + migration ✅
- [x] إضافة procedure: tasks.moveTask (نقل مهمة لتاريخ/وقت مختلف) ✅
- [x] إضافة procedure: tasks.updateFull (تحديث كامل للمهمة) ✅
- [x] تثبيت @dnd-kit/core + @dnd-kit/sortable للـ Drag & Drop ✅

### Calendar Engine
- [x] بناء InteractiveCalendar.tsx جديد (يستبدل TaskCalendarView) ✅
- [x] Day View: عرض ساعات 8AM-10PM مع Time Slots بمنطق Google Calendar ✅
- [x] Week View: 7 أيام × ساعات مع Task blocks ✅
- [x] Month View: شبكة الشهر مع عدد المهام لكل يوم ✅
- [x] Timeline/جدول View: عرض زمني للمهام ✅

### Task Interaction
- [x] Drag & Drop: سحب مهمة لتاريخ/وقت مختلف مع تحديث DB ✅
- [x] Click on time slot: فتح Modal لإضافة مهمة جديدة ✅
- [x] Click on task: فتح Task Detail/Edit Modal ✅

### Task Modal (Add/Edit)
- [x] حقل: اسم المهمة ✅
- [x] حقل: نوع المهمة (2D/3D/Render/Quotation/Meeting/Presentation/Closing/Follow Up/Site Visit/Call) ✅
- [x] حقل: المهندس المسؤول ✅
- [x] حقل: العميل المرتبط ✅
- [x] حقل: تاريخ التنفيذ ✅
- [x] حقل: وقت البداية ✅
- [x] حقل: وقت النهاية ✅
- [x] حقل: الأولوية ✅
- [x] حقل: حالة المهمة ✅
- [x] حقل: ملاحظات ✅
- [x] حقل: Reminder (بدون/15/30/60/120 دقيقة) ✅

### ألوان المهام
- [x] Meeting → أزرق ✅
- [x] Closing → أخضر ✅
- [x] Render → بنفسجي ✅
- [x] Presentation → برتقالي ✅
- [x] Follow Up → أصفر ✅
- [x] 2D Design → سماوي ✅
- [x] 3D Modeling → وردي ✅
- [x] Quotation → رمادي ✅
- [x] Site Visit → أحمر ✅
- [x] Call → أخضر فاتح ✅

### الفلاتر
- [x] فلتر المهندس (Admin فقط) ✅
- [x] فلتر نوع المهمة ✅
- [x] فلتر الحالة ✅
- [x] فلتر الشهر/الأسبوع (navigation) ✅

### الصلاحيات
- [x] Admin: إضافة/تعديل/حذف/نقل أي مهمة ✅
- [x] Engineer: تعديل مهامه فقط ✅

### ربط بالنظام
- [x] المهام المضافة من التقويم تظهر في Daily Tasks ✅
- [x] المهام تدخل في KPI و Performance ✅
- [x] Reminder System: reminderMinutes field ✅

## فصل Workflows حسب Role في التقويم - مايو 2026
- [x] إضافة getAdminSalesCalendarView في db.ts (يجلب من adminSalesTasks)
- [x] إضافة procedure tasks.calendarViewAdmin في routers.ts
- [x] تحديث InteractiveCalendar ليدعم roleFilter (sales_engineer / admin_sales / specialist)
- [x] عند اختيار Admin Sales → جلب من adminSalesTasks
- [x] عند اختيار Sales Engineer → جلب من daily_tasks (الحالي)
- [x] فصل ألوان وأنواع المهام حسب Role
- [x] Admin Sales KPI لا يدخل في KPI Sales Engineers
- [x] فلتر Role في التقويم يُغيّر مصدر البيانات تلقائياً
- [x] إضافة مهام Admin Sales من التقويم (createAdminSalesTask procedure)
- [x] تحديث handleDrop لدعم نقل مهام Admin Sales
- [x] عرض معلومات KPI و category في TaskDetailModal لمهام Admin Sales
- [x] 21 Vitest tests للتحقق من فصل الـ Roles

## نظام شرائح الخصومات — Performance-Based (2026-06-27)
- [x] calcCompositeDiscountScore: 40% مبيعات + 30% Pipeline + 20% Closing + 10% KPI
- [x] getEngineerCompositeDiscountScore: حساب Score لكل مهندس
- [x] getTeamCompositeDiscountScore: حساب Score للفريق كاملاً
- [x] شرط Gate: لا خصم بدون تحقيق فعلي (1%→لازم 20%, 3%→لازم 40%, ...)
- [x] Pipeline وحده لا يفتح شريحة عالية
- [x] عرض سبب الرفض لكل شريحة في Dashboard
- [x] تحديث getDiscountSummary و getDiscountSummaryForEngineer لاستخدام Composite Score
- [x] الخصم المسموح يُحسب على المبيعات الفعلية فقط (ليس totalVolume)
- [x] 12 Vitest tests تؤكد صحة المنطق الجديد
