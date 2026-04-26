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
- [ ] Backend: تحديث getEngineerTasks ليقبل engineerId + MTD (من بداية الشهر حتى اليوم)
- [ ] Backend: تحديث getTasksStats ليدعم MTD وفلترة بالمهندس
- [ ] Backend: إضافة getEngineerRanking (ترتيب المهندس بدون تفاصيل الآخرين)
- [ ] Backend: إضافة getEngineerCriticalTasks (مهام متأخرة >48h أو Priority=High ولم تنفذ)
- [ ] Frontend: Engineer View يرى 4 أقسام فقط (Task List + Overview + Ranking + Critical)
- [ ] Frontend: Task List يعرض مهام المهندس الحالي فقط (حسب session)
- [ ] Frontend: Overview يعرض إحصائيات المهندس الحالي فقط (MTD)
- [ ] Frontend: Ranking يعرض ترتيب المهندس فقط (#X من Y) بدون تفاصيل الآخرين
- [ ] Frontend: Critical Tasks يعرض مهام المهندس الحرجة فقط
- [ ] Frontend: Admin يرى كل الأقسام كما هي
- [ ] اختبارات Vitest للـ MTD وEngineer Ranking logic

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
- [ ] جدول work_logs: (id, engineer_id, activity_type, duration_minutes, log_date, week_number, month, year, notes)
- [ ] activity_type enum: meeting_2d, meeting_quotation, meeting_3d, meeting_closing, design_3d, design_2d, quotation
- [ ] Migration SQL لجدول work_logs

### Backend - db.ts
- [ ] logWorkActivity() - تسجيل نشاط جديد
- [ ] getWorkDistribution(engineerId, year, month) - توزيع الوقت لمهندس
- [ ] getAllEngineersDistribution(year, month) - توزيع كل المهندسين
- [ ] calculateDistributionScore(distribution) - حساب Distribution Score
- [ ] getWeeklyDistribution(engineerId, year, week) - توزيع أسبوعي
- [ ] getCriticalInsights(year, month) - تحليل نقاط الضعف تلقائياً
- [ ] getEngineerRankingFull(year, month) - ترتيب شامل (Sales + Closing + Distribution)

### Backend - routers.ts
- [ ] workDist.log - تسجيل نشاط (protected)
- [ ] workDist.myDistribution - توزيع المهندس الحالي
- [ ] workDist.allEngineers - توزيع كل المهندسين (admin فقط)
- [ ] workDist.criticalInsights - تحليل نقاط الضعف (admin فقط)
- [ ] workDist.weeklyAnalysis - تحليل أسبوعي
- [ ] workDist.fullRanking - ترتيب شامل

### Frontend - WorkDistribution.tsx
- [ ] صفحة رئيسية بـ 2 views: Engineer View + Manager View
- [ ] Engineer View: Donut Chart للتوزيع الفعلي vs المستهدف
- [ ] Engineer View: Distribution Score مع تفسير
- [ ] Engineer View: Weekly Feedback (متوازن؟ مركّز؟ ضعيف في Closing؟)
- [ ] Engineer View: نموذج تسجيل نشاط جديد
- [ ] Manager View: جدول مقارنة كل المهندسين
- [ ] Manager View: Critical Insights تلقائية
- [ ] Manager View: Ranking شامل (Sales + Closing + Distribution)
- [ ] إضافة WorkDistribution في sidebar وroutes

### تحديث KPIModule
- [ ] إضافة Distribution Score في بطاقة كل مهندس
- [ ] إضافة Critical Insights section
- [ ] تحديث Ranking ليشمل Distribution Score

### اختبارات
- [ ] Vitest لـ calculateDistributionScore
- [ ] Vitest لـ getCriticalInsights
- [ ] Vitest لـ getEngineerRankingFull

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
- [ ] تحديث schema: إضافة operational_targets (target_meetings, target_designs, target_closings)
- [ ] تحديث taskType enum: 2d, 3d_modeling, render, quotation, meeting_presentation, meeting_closing, closing
- [ ] تطبيق migration SQL الجديد
- [ ] Backend: getWeeklyPerformance (Activity Breakdown لكل مهندس)
- [ ] Backend: getTargetAchievement (مبيعات + صفقات + Designs + Meetings)
- [ ] Backend: getCriticalInsights (Meeting عالي + Closing قليل، إلخ)
- [ ] Backend: getBehaviorAlerts (مهندس Meeting عالي بدون Sales، Activity ضعيف)
- [ ] Backend: getActivityBalance (توزيع الأنشطة مقارنة بالهدف)
- [ ] إعادة بناء WeeklyReport.tsx: Target Achievement Section
- [ ] إعادة بناء WeeklyReport.tsx: Activity Breakdown Section (عدد كل نشاط)
- [ ] إعادة بناء WeeklyReport.tsx: Critical Insights Section (تحليل ذكي)
- [ ] إعادة بناء WeeklyReport.tsx: Behavior Alerts Section
- [ ] إعادة بناء WeeklyReport.tsx: Smart Summary لكل مهندس
- [ ] إعادة بناء WeeklyReport.tsx: Ranking بناءً على مبيعات + Closing Rate + Activity Balance
- [ ] تحديث AddTask Dialog: أنواع المهام الجديدة (حذف "عام")
- [ ] اختبارات Vitest للـ Activity Breakdown + Target Achievement

## Time Distribution Analysis System (الطلب الجديد)
- [ ] Backend: getTimeDistributionAnalysis (Actual vs Target % لكل مهندس)
- [ ] Backend: calcDistributionScore (نقاط الالتزام بالتوزيع المثالي)
- [ ] Backend: getEngineerPerformanceReport (MTD: مبيعات + أنشطة + توزيع وقت)
- [ ] WeeklyReport: Pie Chart لتوزيع الوقت الفعلي
- [ ] WeeklyReport: Bar Chart مقارنة Actual vs Target Distribution
- [ ] WeeklyReport: Distribution Score لكل مهندس
- [ ] WeeklyReport: Behavior Alerts (Meeting عالي بدون Sales، 3D عالي بدون تحويل)
- [ ] WeeklyReport: Smart Summary لكل مهندس
- [ ] TasksModule: AddTask Dialog يجعل Duration إلزامي
- [ ] TasksModule: AddTask Dialog يجعل TaskType إلزامي (لا يوجد Task بدون Type)
- [ ] TasksModule: تحديث أنواع المهام: 2D, 3D Modeling, Render, Quotation, Meeting Modeling, Meeting Closing

## Closing & Discount Management System (الطلب الجديد)
- [ ] إضافة engineerId إجباري في deals schema
- [ ] إضافة حقول: maxDiscountPct, usedDiscountPct, savedDiscountBonus في deals
- [ ] إضافة جدول discount_config لإعدادات الخصومات
- [ ] Backend: حساب Discount Pool لكل مهندس (Actual Sales + Negotiation)
- [ ] Backend: حساب Saved Discount Bonus بعد الإغلاق (50% للمهندس)
- [ ] Backend: Pipeline Stats (Closed/Negotiation/Quotation/Lost) لكل مهندس
- [ ] Backend: Performance-Based Discount (Closing Rate → Discount %)
- [ ] Backend: استبعاد admin_sales وgroup_admin من Ranking وKPI
- [ ] Frontend: Pipeline View احترافي بألوان (أخضر/أزرق/رمادي/أحمر)
- [ ] Frontend: Discount Dashboard لكل مهندس (Pool/Used/Saved/Bonus)
- [ ] Frontend: عرض Max/Used/Remaining Discount داخل الصفقة
- [ ] Frontend: Admin Control Panel للخصومات والموافقات
- [ ] Frontend: Bonus Summary لكل مهندس
- [ ] Frontend: Total Pipeline Value (Quotations + Negotiation)

## Output-Based KPI System (Tasks + KPI + Goals + Weekly Report)
- [ ] Backend: calcDistributionScore (50% Meetings, 30% 3D, 10% 2D, 10% Quotation)
- [ ] Backend: getOutputBasedKPI (Closed Deals + Designs + Meetings Closing)
- [ ] Backend: getTargetAchievement (Sales % + Designs % + Meetings %)
- [ ] Backend: getBehaviorAlerts (High Meetings/Low Closing, High Designs/Low Sales, etc.)
- [ ] Backend: getSmartRanking (Sales + Closing Rate + Distribution + Output)
- [ ] Backend: getCriticalInsights (Time Waste Control + Behavior Patterns)
- [ ] Backend: getWeeklyPerformanceFull (Activity Breakdown + Distribution + Targets)
- [ ] Frontend: WeeklyReport - Distribution Score Chart (Actual vs Target)
- [ ] Frontend: WeeklyReport - Target Achievement Progress Bars
- [ ] Frontend: WeeklyReport - Activity Breakdown (count + hours per type)
- [ ] Frontend: WeeklyReport - Behavior Alerts + Critical Insights
- [ ] Frontend: KPIModule - Output-Based KPI (not task count)
- [ ] Frontend: KPIModule - Smart Ranking (4 factors)
- [ ] Frontend: KPIModule - Progress Tracking (Sales/Design/Meetings %)

## Admin Sales System
- [ ] Admin Task Types: CRM Update, Task Distribution, Task Follow-up, Collection Follow-up, Inspection Management, Reporting, Meeting Management
- [ ] Admin KPI: Data Accuracy + Task Completion + Delay Rate + Team Performance
- [ ] Time Waste Detection: Alert when client consumes time without stage progress
- [ ] Admin Dashboard: Team Performance + CRM Status + Task Completion + Alerts
- [ ] Closing Task Type added to engineer task types

## Reports Module (Weekly / Monthly / Quarterly)
- [ ] Reports Module page with 3 tabs: Weekly / Monthly / Quarterly
- [ ] Weekly Report: Sales Achievement + Activity Breakdown + Distribution Score + Output + KPI Score + Insights
- [ ] Monthly Report: Total Sales + Target % + Closing Rate + Designs + Meetings + Distribution + Trend + Ranking + Bonus
- [ ] Quarterly Report: Sales Growth + Performance Trend + Top/Bottom Engineers
- [ ] Custom Dashboard: Engineer filter + Date Range + Report Type selector
- [ ] Alerts inside report: weak performance, unbalanced distribution, delay, weak closing
- [ ] Auto-generate Weekly Report every Thursday (scheduled task)
- [ ] Add Reports link in sidebar navigation

## Sales Execution System (Module جديد)
- [ ] Schema: جدول meeting_reviews (recording_link, score, notes, manager_rating, strengths, improvements)
- [ ] Schema: جدول playbook_sessions (engineer_id, task_id, steps_completed, started_at)
- [ ] Migration SQL وتطبيق على قاعدة البيانات
- [ ] Backend: Funnel stats (Lead→Meeting→Quotation→Closing conversion rates)
- [ ] Backend: Lost deals analysis (سعر/تأخير/منافس/عدم جدية)
- [ ] Backend: Meeting review CRUD (create/list/update)
- [ ] Backend: Playbook session tracking
- [ ] SalesExecutionSystem.tsx: Tab 1 - Playbook (Quotation + Product Cards + 6-Step Sales Flow)
- [ ] SalesExecutionSystem.tsx: Tab 2 - Meeting Review (Recording + Rating + Weekly Coaching)
- [ ] SalesExecutionSystem.tsx: Tab 3 - Funnel Analysis (Conversion Rates + Lost Deals)
- [ ] App.tsx: تسجيل route /sales-execution
- [ ] DashboardLayout: إضافة Sales Execution System للـ sidebar
- [ ] ReportsModule: تسجيل route /reports في App.tsx + sidebar
- [ ] إصلاح WorkDistribution.tsx: workDist router error

## Playbook Live Presentation Tool
- [ ] Schema: جدول playbook_items (name, category, price, description, script, media_urls, alternatives, spec_data)
- [ ] Schema: جدول playbook_quotations (deal_id, items_json, created_by, recording_link)
- [ ] Migration SQL وتطبيق على قاعدة البيانات
- [ ] Backend: Excel Import → playbook_items (parse XLSX/CSV)
- [ ] Backend: CRUD playbook_items (create/list/update/delete)
- [ ] Backend: getPlaybookByDeal (جلب Items مرتبطة بصفقة)
- [ ] Backend: saveRecordingLink (حفظ رابط التسجيل داخل الصفقة)
- [ ] Playbook Tab: Excel Upload → Import Items
- [ ] Playbook Tab: Items Library (بطاقات تفاعلية)
- [ ] Presentation Mode: 5 شاشات (Render / Quotation / Excel Data / Media / Script)
- [ ] Presentation Mode: Next/Previous Navigation + Full Screen
- [ ] Presentation Mode: Meeting Recording Link Input
- [ ] Presentation Mode: Item Validation (لا عرض بدون Media + Script + Data)

## Sales Execution Tracking System
- [ ] Schema: جدول meeting_sessions (engineerId, startTime, endTime, recordingLink, quotationId, score)
- [ ] Schema: جدول session_actions (sessionId, itemId, actionType, durationSeconds, timestamp)
- [ ] Migration SQL وتطبيق على قاعدة البيانات
- [ ] Backend: createMeetingSession + endMeetingSession + logSessionAction
- [ ] Backend: calculateMeetingScore (Video + Script + Render + Price scoring)
- [ ] Backend: getEngineerMeetingStats (avg score, playbook usage %)
- [ ] Backend: getSessionDetails (للـ Admin Review)
- [ ] Presentation Mode: تسجيل action عند فتح Video/Script/Render/Price
- [ ] Presentation Mode: Visual Indicators (Viewed ✅ / Not Viewed ❌ / Time Spent)
- [ ] Presentation Mode: Item validation قبل الانتقال للتالي
- [ ] Dashboard: Meeting Score + Playbook Usage % لكل مهندس
- [ ] Admin Review: Recording + Tracking Data معاً
- [ ] Alerts: "Meeting بدون Playbook" + "لم يُشغَّل الفيديو"

## Meeting Review Auto-Task System
- [ ] Auto-create admin task when meeting session ends with recording
- [ ] SLA: 24-hour review deadline tracking
- [ ] Alert for delayed reviews in Admin KPI
- [ ] Admin notification on new meeting recording
- [ ] Admin dashboard: Pending/Completed/Delayed reviews
- [ ] Meeting score input from admin review
- [ ] Score feeds into engineer KPI

## Meeting Recording Mandatory Rule
- [ ] Backend: Block task completion if meetingRecordingLink is missing for meeting-type tasks
- [ ] Backend: Task status logic: pending (no meeting link) → in_progress (meeting done, no recording) → completed (both links present)
- [ ] Backend: KPI excludes meeting tasks without recording from score calculation
- [ ] Backend: Auto-create admin review task when recording is submitted
- [ ] Backend: SLA 24h tracking for review tasks
- [ ] Backend: Admin alert for tasks missing recording > 24h after meeting
- [ ] UI: Meeting Recording Status indicators (✅/❌) in task list
- [ ] UI: Block "Complete" button if recording missing for meeting tasks
- [ ] UI: Recording Link input field in task edit dialog
- [ ] UI: Admin view: filter tasks with missing recordings
- [ ] UI: Alert badge for "Meeting without Recording"

## Meeting Review System (أداة تقييم حقيقية)
- [ ] تحديث جدول meeting_reviews بحقول: playbookUsageScore, presentationQualityScore, controlScore, closingAttemptScore, decisionTag, strengthPoint, improvementPoint
- [ ] شرط أساسي: لا Review إلا إذا Recording موجود + Task مكتملة
- [ ] 4 عناصر تقييم (من 10 كل عنصر) → إجمالي من 40 → %
- [ ] Decision Tag: Strong Performer / يحتاج تحسين / ضعيف
- [ ] Mandatory Feedback: نقطة قوة + نقطة تحسين
- [ ] ربط Meeting Score بـ KPI (عدم Review = خصم)
- [ ] Weekly Summary لكل مهندس: Average Score + عدد Reviews + Trend

## Promotion & Evaluation System
- [ ] إنشاء جدول engineer_evaluations في Schema
- [ ] 5 عناصر تقييم: Sales Achievement + Closing Rate + Meeting Score + Playbook Usage + Distribution Score
- [ ] Performance Levels: A Player / B Player / C Player
- [ ] Rules: A→ترقية+Bonus, B→Coaching إجباري, C→Warning+Plan 30 يوم
- [ ] Firing Logic: شهرين C Player → قرار إداري
- [ ] Dashboard: تقييم حالي + تاريخ + اتجاه (Up/Down)
- [ ] Backend دوال: calculateMonthlyEvaluation, getEngineerEvaluationHistory, checkFiringLogic
- [ ] tRPC endpoints للـ Promotion System
- [ ] PromotionSystem.tsx: A/B/C Player Dashboard + History + Trend

## SalesExecutionSystem
- [ ] إنشاء SalesExecutionSystem.tsx (4 Tabs)
- [ ] Tab 1 - Playbook: عرض Items + Presentation Mode + Excel Import + Session Tracking
- [ ] Tab 2 - Meeting Review: نموذج تقييم 4 عناصر + Decision Tag + Mandatory Feedback
- [ ] Tab 3 - Funnel Analysis: Funnel مراحل + Conversion Rates + Lost Deals + Insights
- [ ] Tab 4 - Coaching Dashboard: Weekly Summary + Average Score + Performance Trend

## Navigation & Registration
- [ ] إصلاح WorkDistribution.tsx (trpc.workDist error)
- [ ] تسجيل SalesExecutionSystem في App.tsx + Sidebar
- [ ] تسجيل ReportsModule في App.tsx + Sidebar
- [ ] تسجيل PromotionSystem في App.tsx + Sidebar

## Dashboard كأداة قرار (Management Decision Tool)
- [ ] Performance Section: Sales Target vs Actual + Closing Rate + Meeting Score + Ranking
- [ ] Execution Section: عدد Meetings + % Playbook Usage + Task Completion % + Missing Recordings
- [ ] Decision Section: Performance Level (A/B/C) + Promotion Status (Eligible/يحتاج تحسين/At Risk)
- [ ] Alerts System: Meetings بدون Recording + Tasks غير مكتملة + أداء ضعيف + عدم استخدام Playbook
- [ ] Engineer Cards: صورة/اسم + Sales + Meeting Score + Ranking + Status (A/B/C)
- [ ] تحويل Overview.tsx إلى Management Decision Dashboard

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
