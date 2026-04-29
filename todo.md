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
