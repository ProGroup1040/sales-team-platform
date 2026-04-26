import { z } from "zod";
import { COOKIE_NAME, LOCAL_AUTH_COOKIE } from "@shared/const";
import { localLogin, getLocalSessionFromRequest } from "./localAuth";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getEngineers, createEngineer,
  getDailyTasksStats, getTasksList, createTask, updateTaskStatus, deleteTask, rescheduleTask,
  getCriticalTasks, getEngineersWithRole, createEngineerWithRole, deleteEngineer,
  getLeadsStats, getLeadsList, createLead, updateLeadStatus,
  getVisitsStats, getVisitsList, createVisit, updateVisitStatus, updateVisitFull,
  getDealsStats, getDealsList, createDeal, updateDealStage,
  getMonthlySalesStats, getMonthlySalesTrend,
  getEngineersKPI,
  getCollectionsStats, getCollectionsList, createCollection, updateCollection,
  getAdminSalesTasks, updateAdminSalesTaskStatus, getOrCreateWeekMeeting, updateWeekMeeting, getAdminSalesStats,
  logLeadFollowup, getLeadFollowupLogs, getAdminSalesFollowupKPI, getTelesalesFollowupKPI, getAllTelesalesFollowupStats,
  getMonthlyTarget, upsertMonthlyTarget,
  getSalesControlStats, getEngineersSalesPerformance,
  getDiscountTiers, upsertDiscountTier, deleteDiscountTier,
  getCommissionTiers, upsertCommissionTier, deleteCommissionTier,
  upsertEngineerTarget,
  isSeeded,
  getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer,
  getProducts, getProductById, createProduct, updateProduct, deleteProduct, getProductCategories,
  getSales, getSaleById, createSale, updateSaleStatus, deleteSale,
  getAllCollectionsWithSummary, addPayment, addPaymentPromise, updatePromiseStatus,
  getDailyFollowUpList, getEngineersCollectionCommission, markCommissionPaid,
  addCollection, updateCollectionStatus, calcProgressiveCommission,
  getClientFinancialProfile,
  getManagementFocus,
  submitMeetingRecordingLink, upsertMeetingReview, getMeetingReview, getEngineerClosingQualityScore,
  softDeleteVisit, getVisitsDebt, getVisitsAlerts, getVisitsDailyTracking,
  updateVisitWithAdminTracking, getAdminSalesVisitsKPI, getEngineerVisitsKPI,
  softDeleteEngineer, softDeleteTask, softDeleteLead, softDeleteVisitFull, softDeleteDeal,
  getAuditLogs,
  upsertLeadDailyStats, getLeadDailyStatsList, getLeadSummaryStats,
  getDiscountSummary, validateDealDiscount, createDealWithDiscount, updateDealFull, getEngineerDiscountSummary,
  getLostDealsAnalysis, getTasksCalendarView, LOST_REASON_LABELS,
  getEngineersTrend, getWeeklyReport,
  logWorkActivity, getWorkDistribution, getAllEngineersDistribution,
  getWeeklyDistribution, getCriticalInsights, getEngineerRankingFull,
  ACTIVITY_LABELS, WORK_DISTRIBUTION_TARGETS,
  getTasksFiltered, getTasksTimeSummary, checkTimeOverlap, getCriticalTasksEnhanced, getTasksForTimeline,
} from "./db";

// ─── Seed Data ────────────────────────────────────────────────────────────────
async function seedData() {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return;

  const { engineers, dailyTasks, leads, visits, deals, monthlyTargets, collections, customers, products, sales, saleItems, engineerTargets, discountTiers, commissionTiers } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");

  // Seed engineers (6 engineers with varied performance levels)
  const engData = [
    { name: 'أحمد محمد علي', email: 'ahmed@company.com', phone: '0501234567', department: 'المبيعات', status: 'active' as const },
    { name: 'سارة عبدالله', email: 'sara@company.com', phone: '0502345678', department: 'المبيعات', status: 'active' as const },
    { name: 'محمد الشمري', email: 'mohammed@company.com', phone: '0503456789', department: 'التشغيل', status: 'active' as const },
    { name: 'فاطمة الزهراني', email: 'fatima@company.com', phone: '0504567890', department: 'المبيعات', status: 'active' as const },
    { name: 'خالد العتيبي', email: 'khalid@company.com', phone: '0505678901', department: 'المبيعات', status: 'active' as const },
    { name: 'نورة القحطاني', email: 'noura@company.com', phone: '0506789012', department: 'التشغيل', status: 'active' as const },
  ];
  await db.insert(engineers).values(engData).onDuplicateKeyUpdate({ set: { name: sql`VALUES(name)` } });
  const engList = await db.select().from(engineers);

  // Seed daily tasks for today and past 7 days
  const today = new Date();
  const taskStatuses = ['completed', 'completed', 'completed', 'delayed', 'not_done', 'planned'] as const;
  const taskTitles = ['متابعة عميل جديد', 'إعداد عرض سعر', 'زيارة ميدانية', 'تحديث قاعدة البيانات', 'اجتماع فريق', 'مراجعة العقود', 'التواصل مع العملاء', 'تقرير يومي'];
  const priorities = ['high', 'medium', 'medium', 'low', 'high', 'medium', 'urgent', 'low'] as const;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];
    for (const eng of engList) {
      const taskCount = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < taskCount; i++) {
        const statusIdx = dayOffset === 0 ? Math.floor(Math.random() * taskStatuses.length) : Math.floor(Math.random() * (taskStatuses.length - 1));
        await db.insert(dailyTasks).values({
          engineerId: eng.id, taskDate: new Date(dateStr + 'T00:00:00'),
          title: taskTitles[i % taskTitles.length],
          plannedHours: 1 + Math.random() * 2,
          status: taskStatuses[statusIdx],
          priority: priorities[i % priorities.length],
        }).onDuplicateKeyUpdate({ set: { title: sql`VALUES(title)` } }).catch(() => {});
      }
    }
  }

  // Seed leads
  const sources = ['website', 'referral', 'social_media', 'call', 'walk_in', 'other'] as const;
  const leadStatuses = ['new', 'contacted', 'qualified', 'unqualified', 'converted'] as const;
  const clientNames = ['شركة الأفق', 'مؤسسة النور', 'شركة التقنية', 'مجموعة الخليج', 'شركة الإبداع', 'مؤسسة الرياض', 'شركة الأمل', 'مجموعة الفجر', 'شركة الوطن', 'مؤسسة الغد', 'شركة النجاح', 'مجموعة الأعمال'];
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(); createdAt.setDate(createdAt.getDate() - daysAgo);
    const status = leadStatuses[Math.floor(Math.random() * leadStatuses.length)];
    const responseTime = status !== 'new' ? Math.floor(Math.random() * 180) : null;
    await db.insert(leads).values({
      name: clientNames[i % clientNames.length] + ` ${i + 1}`,
      phone: `050${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      source: sources[Math.floor(Math.random() * sources.length)],
      assignedEngineerId: engList[Math.floor(Math.random() * engList.length)].id,
      status, responseTimeMinutes: responseTime,
      firstContactAt: status !== 'new' ? createdAt : null,
      createdAt,
    }).onDuplicateKeyUpdate({ set: { name: sql`VALUES(name)` } }).catch(() => {});
  }
  const leadList = await db.select().from(leads);

  // Seed visits
  const visitStatuses = ['completed', 'completed', 'completed', 'delayed', 'cancelled', 'scheduled'] as const;
  const qualities = ['successful', 'successful', 'with_issues', 'rejected', 'repeated'] as const;
  const addresses = ['حي النزهة، الرياض', 'حي العليا، الرياض', 'حي الملقا، الرياض', 'حي الورود، الرياض', 'حي الروضة، جدة'];
  for (let i = 0; i < 40; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const scheduledAt = new Date(); scheduledAt.setDate(scheduledAt.getDate() - daysAgo);
    const status = visitStatuses[Math.floor(Math.random() * visitStatuses.length)];
    const quality = status === 'completed' ? qualities[Math.floor(Math.random() * qualities.length)] : null;
    const lead = leadList[Math.floor(Math.random() * leadList.length)];
    await db.insert(visits).values({
      leadId: lead?.id, engineerId: engList[Math.floor(Math.random() * engList.length)].id,
      clientName: lead?.name ?? `عميل ${i + 1}`,
      clientPhone: `050${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      address: addresses[i % addresses.length],
      scheduledAt, actualAt: status !== 'scheduled' ? scheduledAt : null,
      status, quality: quality as any,
      delayMinutes: status === 'delayed' ? Math.floor(Math.random() * 60) + 10 : 0,
    }).onDuplicateKeyUpdate({ set: { clientName: sql`VALUES(clientName)` } }).catch(() => {});
  }
  const visitList = await db.select().from(visits);

  // Seed deals
  const stages = ['proposal', 'negotiation', 'contract_sent', 'closed_won', 'closed_lost'] as const;
  const nextActions = ['إرسال عرض سعر', 'متابعة العميل', 'تحديد موعد اجتماع', 'مراجعة العقد', 'الحصول على توقيع'];
  const dealValues = [45000, 75000, 120000, 200000, 350000, 80000, 95000, 150000, 60000, 180000];
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(); createdAt.setDate(createdAt.getDate() - daysAgo);
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const visit = visitList[Math.floor(Math.random() * visitList.length)];
    const nextActionDate = new Date(); nextActionDate.setDate(nextActionDate.getDate() + Math.floor(Math.random() * 14));
    await db.insert(deals).values({
      visitId: visit?.id, leadId: visit?.leadId,
      engineerId: engList[Math.floor(Math.random() * engList.length)].id,
      clientName: visit?.clientName ?? `عميل ${i + 1}`,
      value: dealValues[i % dealValues.length].toString(),
      stage, nextAction: nextActions[i % nextActions.length],
      nextActionDate: nextActionDate,
      closedAt: ['closed_won', 'closed_lost'].includes(stage) ? createdAt : null,
      createdAt,
    }).onDuplicateKeyUpdate({ set: { clientName: sql`VALUES(clientName)` } }).catch(() => {});
  }

  // Seed monthly targets for last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    await db.insert(monthlyTargets).values({
      year: d.getFullYear(), month: d.getMonth() + 1,
      targetAmount: (500000 + Math.floor(Math.random() * 200000)).toString(),
      avgDealValue: '85000', closingRate: 0.35, visitToClosingRate: 0.45,
    }).onDuplicateKeyUpdate({ set: { targetAmount: sql`VALUES(targetAmount)` } }).catch(() => {});
  }

  // Seed engineer targets for current month
  // Targets designed to produce varied KPI levels for testing:
  // أحمد: target 1,800,000 → KPI ≥ 90% (High Performance)
  // سارة: target 1,600,000 → KPI 75-90% (Incentive eligible)
  // محمد: target 1,500,000 → KPI 60-75% (Bonus eligible)
  // فاطمة: target 1,200,000 → KPI 60-75% (Bonus eligible)
  // خالد: target 1,000,000 → KPI 45-60% (Commission only)
  // نورة: target 800,000 → KPI < 45% (No bonus, no incentive)
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const targetAmounts = [1800000, 1600000, 1500000, 1200000, 1000000, 800000];
  for (let i = 0; i < engList.length; i++) {
    const target = targetAmounts[i] ?? 1000000;
    await db.insert(engineerTargets).values({
      engineerId: engList[i].id, year: curYear, month: curMonth,
      targetAmount: target.toString(),
      manpower: target,
    }).onDuplicateKeyUpdate({ set: { targetAmount: sql`VALUES(targetAmount)` } }).catch(() => {});
  }

  // Seed discount tiers
  const discountData = [
    { minSales: '0', maxSales: '2000000', maxDiscountPct: 5, label: 'شريحة البداية (0 - 2م)' },
    { minSales: '2000000', maxSales: '3000000', maxDiscountPct: 8, label: 'شريحة المتوسط (2م - 3م)' },
    { minSales: '3000000', maxSales: null, maxDiscountPct: 12, label: 'شريحة المتميز (أكثر من 3م)' },
  ];
  for (const tier of discountData) {
    await db.insert(discountTiers).values(tier as any).onDuplicateKeyUpdate({ set: { label: sql`VALUES(label)` } }).catch(() => {});
  }

  // Seed commission tiers
  const commissionData = [
    { minAchievementPct: 0, maxAchievementPct: 50, commissionPct: 0, label: 'أقل من 50% - بدون كوميشن' },
    { minAchievementPct: 50, maxAchievementPct: 80, commissionPct: 1, label: '50% - 80% كوميشن 1%' },
    { minAchievementPct: 80, maxAchievementPct: 100, commissionPct: 2, label: '80% - 100% كوميشن 2%' },
    { minAchievementPct: 100, maxAchievementPct: null, commissionPct: 3, label: 'أكثر من 100% كوميشن 3%' },
  ];
  for (const tier of commissionData) {
    await db.insert(commissionTiers).values(tier as any).onDuplicateKeyUpdate({ set: { label: sql`VALUES(label)` } }).catch(() => {});
  }

  // Seed collections
  const dealList = await db.select().from(deals).where(sql`stage = 'closed_won'`);
  const collectionStatuses = ['on_track', 'due_soon', 'overdue', 'completed'] as const;
  for (const deal of dealList.slice(0, 15)) {
    const contractAmount = parseFloat(deal.value);
    const collected = contractAmount * (0.3 + Math.random() * 0.7);
    const status = collectionStatuses[Math.floor(Math.random() * collectionStatuses.length)];
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 60) - 30);
    await db.insert(collections).values({
      dealId: deal.id, clientName: deal.clientName,
      contractAmount: contractAmount.toString(),
      collectedAmount: Math.min(collected, contractAmount).toFixed(2),
      dueDate: dueDate,
      status,
    }).onDuplicateKeyUpdate({ set: { clientName: sql`VALUES(clientName)` } }).catch(() => {});
  }
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  // ── Seed ──────────────────────────────────────────────────────────────────────────────
  seed: router({
    isSeeded: publicProcedure.query(async () => isSeeded()),
    run: publicProcedure.mutation(async () => {
      await seedData();
      return { success: true };
    }),
    reset: publicProcedure.mutation(async () => {
      const { getDb } = await import('./db');
      const db = await getDb();
      if (!db) return { success: false };
      const { engineers, dailyTasks, leads, visits, deals, monthlyTargets, collections, customers, products, sales, saleItems, engineerTargets, discountTiers, commissionTiers, payments, paymentPromises, commissionPayments } = await import('../drizzle/schema');
      // Delete in dependency order (leaf tables first)
      await db.delete(saleItems).execute().catch(() => {});
      await db.delete(sales).execute().catch(() => {});
      await db.delete(commissionPayments).execute().catch(() => {});
      await db.delete(paymentPromises).execute().catch(() => {});
      await db.delete(payments).execute().catch(() => {});
      await db.delete(collections).execute().catch(() => {});
      await db.delete(deals).execute().catch(() => {});
      await db.delete(visits).execute().catch(() => {});
      await db.delete(leads).execute().catch(() => {});
      await db.delete(dailyTasks).execute().catch(() => {});
      await db.delete(engineerTargets).execute().catch(() => {});
      await db.delete(discountTiers).execute().catch(() => {});
      await db.delete(commissionTiers).execute().catch(() => {});
      await db.delete(monthlyTargets).execute().catch(() => {});
      await db.delete(engineers).execute().catch(() => {});
      await db.delete(customers).execute().catch(() => {});
      await db.delete(products).execute().catch(() => {});
      // Re-seed with fresh data
      await seedData();
      return { success: true, message: 'تم إعادة تهيئة بيانات الاختبار بنجاح' };
    }),
  }),

  // ── Engineers ──────────────────────────────────────────────────────────────────────────────
  engineers: router({
    list: publicProcedure.query(async () => getEngineers()),
    create: publicProcedure.input(z.object({
      name: z.string().min(1), email: z.string().email().optional(),
      phone: z.string().optional(), department: z.string().optional(),
    })).mutation(async ({ input }) => { await createEngineer(input); return { success: true }; }),
  }),

  // ── Daily Tasks ───────────────────────────────────────────────────────────
  tasks: router({
    stats: publicProcedure.input(z.object({ date: z.string() }))
      .query(async ({ input }) => getDailyTasksStats(input.date)),
    list: publicProcedure.input(z.object({ date: z.string(), engineerId: z.number().optional() }))
      .query(async ({ input }) => getTasksList(input.date, input.engineerId)),
    create: publicProcedure.input(z.object({
      engineerId: z.number(), taskDate: z.string(), title: z.string().min(1),
      description: z.string().optional(), plannedHours: z.number().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      category: z.string().optional(), // 'closing' | 'meeting' | 'general'
      meetingRecordingLink: z.string().optional(),
    })).mutation(async ({ input }) => { await createTask(input); return { success: true }; }),
    updateStatus: publicProcedure.input(z.object({
      id: z.number(), status: z.enum(['planned', 'completed', 'delayed', 'not_done', 'client_delay']),
      delayDays: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input }) => { return await updateTaskStatus(input.id, input.status, input.delayDays, input.notes); }),
    delete: publicProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteTask(input.id); return { success: true }; }),
    reschedule: publicProcedure.input(z.object({ id: z.number(), newDate: z.string() }))
      .mutation(async ({ input }) => { await rescheduleTask(input.id, input.newDate); return { success: true }; }),
    critical: publicProcedure.query(async () => getCriticalTasks()),
    calendarView: publicProcedure.input(z.object({ engineerId: z.number().optional() }))
      .query(async ({ input }) => getTasksCalendarView(input.engineerId)),
    engineers: publicProcedure.query(async () => getEngineersWithRole()),
    createEngineer: publicProcedure.input(z.object({
      name: z.string().min(1), email: z.string().optional(), phone: z.string().optional(),
      department: z.string().optional(), role: z.enum(['admin', 'engineer']).optional(),
    })).mutation(async ({ input }) => { await createEngineerWithRole(input); return { success: true }; }),
    deleteEngineer: publicProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteEngineer(input.id); return { success: true }; }),
    // ── New time-based endpoints ──
    filtered: publicProcedure.input(z.object({
      dateRange: z.enum(['today', 'yesterday', 'week', 'month', 'custom']),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      engineerId: z.number().optional(),
      taskType: z.string().optional(),
      status: z.string().optional(),
    })).query(async ({ input }) => getTasksFiltered(input)),
    timeSummary: publicProcedure.input(z.object({
      engineerId: z.number().optional(),
      dateFrom: z.string(),
      dateTo: z.string(),
    })).query(async ({ input }) => getTasksTimeSummary(input)),
    checkOverlap: publicProcedure.input(z.object({
      engineerId: z.number(),
      taskDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      excludeTaskId: z.number().optional(),
    })).query(async ({ input }) => checkTimeOverlap(input)),
    criticalEnhanced: publicProcedure.query(async () => getCriticalTasksEnhanced()),
    timeline: publicProcedure.input(z.object({
      date: z.string(),
      engineerId: z.number().optional(),
    })).query(async ({ input }) => getTasksForTimeline(input.date, input.engineerId)),
    createWithTime: publicProcedure.input(z.object({
      engineerId: z.number(), taskDate: z.string(), title: z.string().min(1),
      description: z.string().optional(), plannedHours: z.number().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      category: z.string().optional(),
      meetingRecordingLink: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      taskType: z.enum(['meeting_2d','meeting_3d','meeting_quotation','meeting_closing','design_3d','design_2d','quotation','negotiation','other']).optional(),
    })).mutation(async ({ input }) => {
      const { startTime, endTime, taskType, ...rest } = input;
      // Check overlap if times provided
      if (startTime && endTime) {
        const overlap = await checkTimeOverlap({ engineerId: input.engineerId, taskDate: input.taskDate, startTime, endTime });
        if (overlap.hasOverlap) {
          throw new Error(`تداخل زمني مع مهمة: ${overlap.conflictingTask?.title} (${overlap.conflictingTask?.startTime} - ${overlap.conflictingTask?.endTime})`);
        }
      }
      await createTask({ ...rest, startTime, endTime, taskType } as any);
      return { success: true };
    }),
  }),

  // ── Leads ─────────────────────────────────────────────────────────────────
  leads: router({
    stats: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getLeadsStats(input.year, input.month)),
    list: publicProcedure.input(z.object({ limit: z.number().optional(), offset: z.number().optional(), status: z.string().optional() }))
      .query(async ({ input }) => getLeadsList(input.limit, input.offset, input.status)),
    create: publicProcedure.input(z.object({
      name: z.string().min(1), phone: z.string().optional(), email: z.string().optional(),
      source: z.string().optional(), assignedEngineerId: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input }) => { await createLead(input); return { success: true }; }),
    updateStatus: publicProcedure.input(z.object({
      id: z.number(), status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted']),
      responseTimeMinutes: z.number().optional(),
    })).mutation(async ({ input }) => { await updateLeadStatus(input.id, input.status, input.responseTimeMinutes); return { success: true }; }),
  }),

  // ── Visits ────────────────────────────────────────────────────────────────
  visits: router({
    stats: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getVisitsStats(input.year, input.month)),
    list: publicProcedure.input(z.object({ limit: z.number().optional(), offset: z.number().optional(), status: z.string().optional() }))
      .query(async ({ input }) => getVisitsList(input.limit, input.offset, input.status)),
    create: publicProcedure.input(z.object({
      engineerId: z.number(), clientName: z.string().min(1), clientPhone: z.string().optional(),
      address: z.string().optional(), scheduledAt: z.date(), leadId: z.number().optional(), notes: z.string().optional(),
      assignedDelay: z.number().optional(),
      confirmationStatus: z.enum(['confirmed_same_day', 'confirmed_late', 'not_confirmed']).optional(),
      confirmationDelayHours: z.number().optional(),
      feeAmount: z.number().optional(), feeCollected: z.boolean().optional(),
    })).mutation(async ({ input }) => { await createVisit(input); return { success: true }; }),
    updateStatus: publicProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['scheduled', 'completed', 'delayed', 'cancelled', 'rescheduled']).optional(),
      quality: z.enum(['successful', 'with_issues', 'design_rejected', 'repeated', 'pending']).optional(),
      delayMinutes: z.number().optional(), notes: z.string().optional(),
      confirmationStatus: z.enum(['confirmed_same_day', 'confirmed_late', 'not_confirmed']).optional(),
      confirmationDelayHours: z.number().optional(),
      uploadStatus: z.enum(['uploaded_same_day', 'uploaded_late', 'not_uploaded']).optional(),
      deliveredToAdmin: z.boolean().optional(),
      deliveryDelayHours: z.number().optional(),
      groupStatus: z.enum(['created_on_time', 'created_late', 'not_created']).optional(),
      assignedToDesigner: z.boolean().optional(),
      feeAmount: z.number().optional(),
      feeCollected: z.boolean().optional(),
    })).mutation(async ({ input }) => { await updateVisitFull(input.id, input); return { success: true }; }),
    // Extended endpoints
    updateFull: publicProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['scheduled', 'completed', 'delayed', 'cancelled', 'rescheduled']).optional(),
      quality: z.enum(['successful', 'with_issues', 'design_rejected', 'repeated', 'pending']).optional(),
      delayMinutes: z.number().optional(), notes: z.string().optional(),
      confirmationStatus: z.enum(['confirmed_same_day', 'confirmed_late', 'not_confirmed']).optional(),
      confirmationDelayHours: z.number().optional(),
      uploadStatus: z.enum(['uploaded_same_day', 'uploaded_late', 'not_uploaded']).optional(),
      deliveredToAdmin: z.boolean().optional(),
      deliveryDelayHours: z.number().optional(),
      groupStatus: z.enum(['created_on_time', 'created_late', 'not_created']).optional(),
      assignedToDesigner: z.boolean().optional(),
      feeAmount: z.number().optional(),
      feeCollected: z.boolean().optional(),
      paymentScreenshotUrl: z.string().optional(),
      paymentDate: z.date().optional(),
      bookingStatus: z.enum(['booked', 'distributed', 'distribution_delayed']).optional(),
      adminSalesId: z.number().optional(),
      debtFollowedUp: z.boolean().optional(),
      scheduledAt: z.date().optional(),
    })).mutation(async ({ input }) => { const { id, ...data } = input; await updateVisitWithAdminTracking(id, data); return { success: true }; }),
    softDelete: publicProcedure.input(z.object({
      id: z.number(),
      reason: z.enum(['client_cancelled', 'postponed', 'data_entry_error']),
    })).mutation(async ({ input }) => { await softDeleteVisit(input.id, input.reason); return { success: true }; }),
    debt: publicProcedure.query(async () => getVisitsDebt()),
    alerts: publicProcedure.query(async () => getVisitsAlerts()),
    dailyTracking: publicProcedure.input(z.object({ date: z.string() }))
      .query(async ({ input }) => getVisitsDailyTracking(input.date)),
    adminSalesKPI: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getAdminSalesVisitsKPI(input.year, input.month)),
    engineerKPI: publicProcedure.input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input }) => getEngineerVisitsKPI(input.engineerId, input.year, input.month)),
  }),

  // ── Closing / Deals ───────────────────────────────────────────────────────
  closing: router({
    stats: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getDealsStats(input.year, input.month)),
    list: publicProcedure.input(z.object({ limit: z.number().optional(), offset: z.number().optional(), stage: z.string().optional() }))
      .query(async ({ input }) => getDealsList(input.limit, input.offset, input.stage)),
    create: publicProcedure.input(z.object({
      engineerId: z.number(), clientName: z.string().min(1), value: z.number().positive(),
      visitId: z.number().optional(), leadId: z.number().optional(),
      nextAction: z.string().optional(), nextActionDate: z.string().optional(), notes: z.string().optional(),
      discountPercent: z.number().min(0).max(100).optional(),
      discountValue: z.number().min(0).optional(),
      discountNote: z.string().optional(),
    })).mutation(async ({ input }) => { await createDealWithDiscount(input); return { success: true }; }),
    updateStage: publicProcedure.input(z.object({
      id: z.number(), stage: z.enum(['proposal', 'negotiation', 'contract_sent', 'closed_won', 'closed_lost']).optional(),
      nextAction: z.string().optional(), nextActionDate: z.string().optional(), notes: z.string().optional(),
      value: z.number().positive().optional(),
      discountPercent: z.number().min(0).max(100).optional(),
      discountValue: z.number().min(0).optional(),
      discountNote: z.string().optional(),
    })).mutation(async ({ input }) => { await updateDealFull(input.id, input); return { success: true }; }),
    // ─── Discount System ────────────────────────────────────────────────────────────────────────────────────────
    discountSummary: publicProcedure.query(async () => getDiscountSummary()),
    validateDiscount: publicProcedure.input(z.object({
      dealId: z.number().optional(),
      discountValue: z.number().min(0),
    })).query(async ({ input }) => validateDealDiscount(input.dealId, input.discountValue)),
    engineerDiscountSummary: publicProcedure.query(async () => getEngineerDiscountSummary()),
    // ─── Lost Deal Analysis ─────────────────────────────────────────────────────
    lostDealsAnalysis: publicProcedure.query(async () => getLostDealsAnalysis()),
    lostReasonLabels: publicProcedure.query(async () => LOST_REASON_LABELS),
    // ─── Update deal with lostReason ────────────────────────────────────────────
    updateDealStage: publicProcedure.input(z.object({
      id: z.number(),
      stage: z.enum(["proposal", "negotiation", "contract_sent", "closed_won", "closed_lost"]),
      lostReason: z.enum(["price_high", "competitor", "slow_response", "wrong_product", "not_serious", "budget_cut", "other"]).optional(),
      lostReasonNote: z.string().optional(),
    })).mutation(async ({ input }) => {
      await updateDealFull(input.id, {
        stage: input.stage,
        lostReason: input.lostReason,
        lostReasonNote: input.lostReasonNote,
        closedAt: (input.stage === 'closed_won' || input.stage === 'closed_lost') ? new Date() : undefined,
      });
      return { success: true };
    }),
  }),

  // ── Sales Control Tower ───────────────────────────────────────────────────────────────────────────────────────
  sales: router({
    // الإحصاءات الشاملة للشهر
    controlStats: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getSalesControlStats(input.year, input.month)),
    // أداء كل مهندس مع الكوميشن
    engineersPerformance: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getEngineersSalesPerformance(input.year, input.month)),
    // الإحصاءات الشهرية (للتوافق مع الكود القديم)
    monthlyStats: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getMonthlySalesStats(input.year, input.month)),
    trend: publicProcedure.input(z.object({ months: z.number().optional() }))
      .query(async ({ input }) => getMonthlySalesTrend(input.months ?? 6)),
    // إدارة أهداف المهندسين
    setEngineerTarget: publicProcedure.input(z.object({
      engineerId: z.number(), year: z.number(), month: z.number(),
      targetAmount: z.number().positive(), manpower: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input }) => { await upsertEngineerTarget(input); return { success: true }; }),
    // شرائح الخصم
    discountTiers: publicProcedure.query(async () => getDiscountTiers()),
    upsertDiscountTier: publicProcedure.input(z.object({
      id: z.number().optional(), minSales: z.number(), maxSales: z.number().optional(),
      maxDiscountPct: z.number(), label: z.string().optional(),
    })).mutation(async ({ input }) => { await upsertDiscountTier(input); return { success: true }; }),
    deleteDiscountTier: publicProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteDiscountTier(input.id); return { success: true }; }),
    // شرائح الكوميشن
    commissionTiers: publicProcedure.query(async () => getCommissionTiers()),
    upsertCommissionTier: publicProcedure.input(z.object({
      id: z.number().optional(), minAchievementPct: z.number(), maxAchievementPct: z.number().optional(),
      commissionPct: z.number(), label: z.string().optional(),
    })).mutation(async ({ input }) => { await upsertCommissionTier(input); return { success: true }; }),
    deleteCommissionTier: publicProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteCommissionTier(input.id); return { success: true }; }),
  }),

  // ── KPI ───────────────────────────────────────────────────────────────────────────────────────
  kpi: router({
    engineers: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getEngineersKPI(input.year, input.month)),
    trend: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getEngineersTrend(input.year, input.month)),
    weeklyReport: publicProcedure.query(async () => getWeeklyReport()),
  }),

  // ── Collections ───────────────────────────────────────────────────────────
  collections: router({
    stats: publicProcedure.query(async () => getCollectionsStats()),
    list: publicProcedure.input(z.object({ limit: z.number().optional(), offset: z.number().optional(), status: z.string().optional() }))
      .query(async ({ input }) => getCollectionsList(input.limit, input.offset, input.status)),
    create: publicProcedure.input(z.object({
      clientName: z.string().min(1), contractAmount: z.number().positive(),
      collectedAmount: z.number().optional(), dueDate: z.string().optional(),
      dealId: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input }) => { await createCollection(input); return { success: true }; }),
    update: publicProcedure.input(z.object({
      id: z.number(), collectedAmount: z.number(), status: z.string().optional(), notes: z.string().optional(),
    })).mutation(async ({ input }) => { await updateCollection(input.id, input.collectedAmount, input.status, input.notes); return { success: true }; }),
  }),

  // ── Planning ──────────────────────────────────────────────────────────────
  planning: router({
    getTarget: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getMonthlyTarget(input.year, input.month)),
    setTarget: publicProcedure.input(z.object({
      year: z.number(), month: z.number(), targetAmount: z.number().positive(),
      avgDealValue: z.number().optional(), closingRate: z.number().optional(),
      visitToClosingRate: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input }) => { await upsertMonthlyTarget(input); return { success: true }; }),
    calculate: publicProcedure.input(z.object({
      targetAmount: z.number(), avgDealValue: z.number(), closingRate: z.number(), visitToClosingRate: z.number(),
    })).query(async ({ input }) => {
      const { targetAmount, avgDealValue, closingRate, visitToClosingRate } = input;
      const dealsNeeded = Math.ceil(targetAmount / avgDealValue);
      const visitsNeeded = Math.ceil(dealsNeeded / closingRate);
      const leadsNeeded = Math.ceil(visitsNeeded / visitToClosingRate);
      return { dealsNeeded, visitsNeeded, leadsNeeded, avgDealValue, closingRate, visitToClosingRate };
    }),
  }),

  // ── Financial Module ───────────────────────────────────────────────────────────────────────────────
  financial: router({
    // جلب كل العقود مع ملخص التحصيل
    allContracts: publicProcedure.input(z.object({ engineerId: z.number().optional() }))
      .query(async ({ input }) => getAllCollectionsWithSummary(input.engineerId)),
    // ملف عميل مالي كامل
    clientProfile: publicProcedure.input(z.object({ collectionId: z.number() }))
      .query(async ({ input }) => getClientFinancialProfile(input.collectionId)),
    // إضافة عقد جديد
    addContract: publicProcedure.input(z.object({
      clientName: z.string().min(1),
      contractAmount: z.number().positive(),
      dueDate: z.string().optional(),
      dealId: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => { const result = await addCollection(input); return { success: true, id: (result as { insertId?: number })?.insertId }; }),
    // تسجيل دفعة
    addPayment: publicProcedure.input(z.object({
      collectionId: z.number(),
      engineerId: z.number().optional(),
      clientName: z.string().min(1),
      amount: z.number().positive(),
      paymentDate: z.string(),
      paymentType: z.enum(["initial", "installment", "final", "visit_fee"]).default("installment"),
      addedBy: z.enum(["engineer", "admin"]).default("admin"),
      receiptNumber: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const result = await addPayment({ ...input, amount: String(input.amount), paymentDate: input.paymentDate as unknown as Date });
      return { success: true };
    }),
    // إضافة وعد دفع
    addPromise: publicProcedure.input(z.object({
      collectionId: z.number(),
      engineerId: z.number().optional(),
      clientName: z.string().min(1),
      promiseAmount: z.number().positive(),
      promiseDate: z.string(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      await addPaymentPromise({ ...input, promiseAmount: String(input.promiseAmount), promiseDate: input.promiseDate as unknown as Date });
      return { success: true };
    }),
    // تحديث حالة وعد الدفع
    updatePromise: publicProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["pending", "paid", "overdue"]),
    })).mutation(async ({ input }) => { await updatePromiseStatus(input.id, input.status); return { success: true }; }),
    // قائمة المتابعة اليومية
    dailyFollowUp: publicProcedure.query(async () => getDailyFollowUpList()),
    // كوميشن المهندسين من التحصيل
    engineersCommission: publicProcedure.query(async () => getEngineersCollectionCommission()),
    // صرف كوميشن
    markCommissionPaid: publicProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await markCommissionPaid(input.id); return { success: true }; }),
    // تحديث حالة العقد
    updateContractStatus: publicProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["on_track", "due_soon", "overdue", "completed"]),
    })).mutation(async ({ input }) => { await updateCollectionStatus(input.id, input.status); return { success: true }; }),
    // حساب الكوميشن التصاعدي
    calcCommission: publicProcedure.input(z.object({ amount: z.number() }))
      .query(async ({ input }) => ({
        commission: calcProgressiveCommission(input.amount),
        amount: input.amount,
      })),
  }),
  // ── Legacy: Customers / Products ───────────────────────────────────────────────────────────────────────────────
  customers: router({
    list: publicProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => getCustomers(input)),
    create: publicProcedure.input(z.object({ name: z.string().min(1), email: z.string().optional(), phone: z.string().optional(), company: z.string().optional(), status: z.string().optional() }))
      .mutation(async ({ input }) => { await createCustomer({ ...input, status: input.status ?? 'active' }); return { success: true }; }),
    update: publicProcedure.input(z.object({ id: z.number(), name: z.string().optional(), email: z.string().optional(), phone: z.string().optional(), company: z.string().optional(), status: z.string().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await updateCustomer(id, data); return { success: true }; }),
    delete: publicProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteCustomer(input.id); return { success: true }; }),
  }),
  products: router({
    list: publicProcedure.input(z.object({ search: z.string().optional(), category: z.string().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => getProducts(input)),
    categories: publicProcedure.query(async () => getProductCategories()),
    create: publicProcedure.input(z.object({ name: z.string().min(1), sku: z.string().optional(), category: z.string().optional(), price: z.string(), cost: z.string().optional(), stock: z.number().optional(), minStock: z.number().optional(), unit: z.string().optional(), description: z.string().optional(), status: z.string().optional() }))
      .mutation(async ({ input }) => { await createProduct({ ...input, status: input.status ?? 'active' }); return { success: true }; }),
    update: publicProcedure.input(z.object({ id: z.number(), name: z.string().optional(), sku: z.string().optional(), category: z.string().optional(), price: z.string().optional(), cost: z.string().optional(), stock: z.number().optional(), minStock: z.number().optional(), unit: z.string().optional(), description: z.string().optional(), status: z.string().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await updateProduct(id, data); return { success: true }; }),
    delete: publicProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteProduct(input.id); return { success: true }; }),
  }),

  // ─── Admin Sales Tasks ────────────────────────────────────────────────────
  // ── Management Focus ─────────────────────────────────────────────────────
  management: router({
    focus: publicProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getManagementFocus(input.year, input.month)),
  }),
  // ─── Meeting Recording & Review ────────────────────────────────────────────────────────────────────────────────
  meetingReview: router({
    // تقديم رابط تسجيل الميتينج
    submitLink: publicProcedure
      .input(z.object({ taskId: z.number(), link: z.string().url('رابط غير صحيح') }))
      .mutation(async ({ input }) => {
        const task = await submitMeetingRecordingLink(input.taskId, input.link);
        if (!task) throw new Error('المهمة غير موجودة');
        return { success: true, task };
      }),
    // جلب تقييم مهمة معينة
    getReview: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => getMeetingReview(input.taskId)),
    // إنشاء أو تحديث تقييم الميتينج
    upsertReview: publicProcedure
      .input(z.object({
        taskId: z.number(),
        engineerId: z.number(),
        reviewedBy: z.number().optional(),
        openingScore: z.number().min(0).max(10),
        understandingScore: z.number().min(0).max(20),
        presentationScore: z.number().min(0).max(20),
        objectionScore: z.number().min(0).max(25),
        closingScore: z.number().min(0).max(25),
        comments: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const review = await upsertMeetingReview(input);
        return { success: true, review };
      }),
    // جلب Closing Quality Score لمهندس
    getClosingQuality: publicProcedure
      .input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input }) => getEngineerClosingQualityScore(input.engineerId, input.year, input.month)),
  }),
  adminSalesTasks: router({
    // جلب مهام يوم معين لـ Admin Sales
    getByDate: publicProcedure
      .input(z.object({ engineerId: z.number(), date: z.string() }))
      .query(async ({ input }) => getAdminSalesTasks(input.engineerId, input.date)),
    // تحديث حالة مهمة
    updateStatus: publicProcedure
      .input(z.object({
        taskId: z.number(),
        status: z.enum(['pending', 'done', 'delayed', 'not_done']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateAdminSalesTaskStatus(input.taskId, input.status, input.notes);
        return { success: true };
      }),
    // جلب أو إنشاء سجل الاجتماعات الأسبوعية
    getWeekMeeting: publicProcedure
      .input(z.object({ engineerId: z.number(), weekStart: z.string() }))
      .query(async ({ input }) => getOrCreateWeekMeeting(input.engineerId, input.weekStart)),
    // تحديث سجل الاجتماعات
    updateWeekMeeting: publicProcedure
      .input(z.object({
        id: z.number(),
        weeklyTeamMeeting: z.enum(['done', 'not_done', 'pending']).optional(),
        managementMeeting: z.enum(['done', 'not_done', 'pending']).optional(),
        reportSubmitted: z.enum(['yes', 'no', 'pending']).optional(),
        meetingNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateWeekMeeting(id, data);
        return { success: true };
      }),
     // إحصائيات للمدير
    getStats: publicProcedure
      .input(z.object({ engineerId: z.number(), month: z.string() }))
      .query(async ({ input }) => getAdminSalesStats(input.engineerId, input.month)),
  }),

  // ─── Lead Followup Tracking ────────────────────────────────────────────────────────────────────────────────
  leadFollowup: router({
    // تسجيل نتيجة متابعة Lead يومية
    log: publicProcedure
      .input(z.object({
        logDate: z.string(),
        adminSalesId: z.number(),
        telesalesId: z.number(),
        followupStatus: z.enum(['followed_up', 'delayed', 'no_response']),
        responseDelayHours: z.number().optional(),
        followupQuality: z.enum(['excellent', 'good', 'poor']).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => logLeadFollowup(input)),

    // جلب سجلات المتابعة
    getLogs: publicProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        adminSalesId: z.number().optional(),
        telesalesId: z.number().optional(),
      }))
      .query(async ({ input }) => getLeadFollowupLogs(input)),

    // KPI لـ Admin Sales
    adminSalesKPI: publicProcedure
      .input(z.object({ adminSalesId: z.number(), startDate: z.string(), endDate: z.string() }))
      .query(async ({ input }) => getAdminSalesFollowupKPI(input.adminSalesId, input.startDate, input.endDate)),

    // KPI لـ Tele-sales
    telesalesKPI: publicProcedure
      .input(z.object({ telesalesId: z.number(), startDate: z.string(), endDate: z.string() }))
      .query(async ({ input }) => getTelesalesFollowupKPI(input.telesalesId, input.startDate, input.endDate)),

    // إحصائيات جميع Tele-sales
    allTelesalesStats: publicProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input }) => getAllTelesalesFollowupStats(input.startDate, input.endDate)),
  }),
  // Soft Delete + Audit Log
  softDelete: router({
    engineer: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('FORBIDDEN');
        await softDeleteEngineer(input.id, input.reason, input.reasonCustom, ctx.user.name ?? 'admin');
        return { success: true };
      }),
    task: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!['admin','admin_sales'].includes(ctx.user.role ?? '')) throw new Error('FORBIDDEN');
        await softDeleteTask(input.id, input.reason, input.reasonCustom, ctx.user.name ?? 'user');
        return { success: true };
      }),
    lead: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!['admin','admin_sales'].includes(ctx.user.role ?? '')) throw new Error('FORBIDDEN');
        await softDeleteLead(input.id, input.reason, input.reasonCustom, ctx.user.name ?? 'user');
        return { success: true };
      }),
    visit: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!['admin','admin_sales'].includes(ctx.user.role ?? '')) throw new Error('FORBIDDEN');
        await softDeleteVisitFull(input.id, input.reason, input.reasonCustom, ctx.user.name ?? 'user');
        return { success: true };
      }),
    deal: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new Error('FORBIDDEN');
        await softDeleteDeal(input.id, input.reason, input.reasonCustom, ctx.user.name ?? 'admin');
        return { success: true };
      }),
    getAuditLogs: publicProcedure
      .input(z.object({ entityType: z.enum(['engineer','task','lead','visit','deal']).optional(), limit: z.number().optional() }))
      .query(async ({ input }) => getAuditLogs(input)),
  }),
  // ─── Lead Daily Stats ─────────────────────────────────────────────────────────
  localAuth: router({
    // تسجيل الدخول بيوزرنيم وباسورد
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await localLogin(input.username, input.password);
        if (!result) throw new Error("يوزرنيم أو باسورد غلط");
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(LOCAL_AUTH_COOKIE, result.token, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 365,
        });
        return { ok: true, role: result.session.role, name: result.session.name, engineerId: result.session.engineerId };
      }),
    // جلب بيانات الجلسة الحالية
    me: publicProcedure
      .query(async ({ ctx }) => {
        const session = await getLocalSessionFromRequest(ctx.req);
        if (!session) return null;
        return { engineerId: session.engineerId, username: session.username, role: session.role, name: session.name };
      }),
    // تسجيل الخروج
    logout: publicProcedure
      .mutation(async ({ ctx }) => {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(LOCAL_AUTH_COOKIE, cookieOptions);
        return { ok: true };
      }),
  }),

  leadDailyStats: router({
    // إدخال أو تحديث أرقام يوم معين
    upsert: publicProcedure
      .input(z.object({
        date: z.string(),
        totalLeads: z.number().min(0),
        contacted: z.number().min(0),
        delayed: z.number().min(0),
        notContacted: z.number().min(0),
        qualified: z.number().min(0).optional(),
        converted: z.number().min(0).optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
        enteredBy: z.string().optional(),
      }))
      .mutation(async ({ input }) => upsertLeadDailyStats(input)),
    // جلب سجلات الأيام
    list: publicProcedure
      .input(z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => getLeadDailyStatsList(input)),
    // إحصائيات إجمالية للفترة
    summary: publicProcedure
      .input(z.object({
        from: z.string(),
        to: z.string(),
      }))
      .query(async ({ input }) => getLeadSummaryStats(input)),
  }),

  // ── Work Distribution ─────────────────────────────────────────────────────────
  workDist: router({
    // تسجيل نشاط جديد
    log: protectedProcedure
      .input(z.object({
        engineerId: z.number(),
        logDate: z.string(),
        activityType: z.enum([
          "meeting_2d", "meeting_quotation", "meeting_3d", "meeting_closing",
          "design_3d", "design_2d", "quotation"
        ]),
        durationMinutes: z.number().min(5).max(480).default(60),
        clientName: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const d = new Date(input.logDate);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNumber = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
        await logWorkActivity({
          engineerId: input.engineerId,
          logDate: d,
          activityType: input.activityType,
          durationMinutes: input.durationMinutes,
          clientName: input.clientName,
          notes: input.notes,
          weekNumber,
          month: d.getMonth() + 1,
          year: d.getFullYear(),
        });
        return { success: true };
      }),

    // توزيع مهندس واحد (MTD)
    myDistribution: protectedProcedure
      .input(z.object({
        engineerId: z.number(),
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => getWorkDistribution(input.engineerId, input.year, input.month)),

    // توزيع كل المهندسين (admin فقط)
    allEngineers: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getAllEngineersDistribution(input.year, input.month)),

    // تحليل أسبوعي
    weeklyAnalysis: protectedProcedure
      .input(z.object({
        engineerId: z.number(),
        year: z.number(),
        weekNumber: z.number(),
      }))
      .query(async ({ input }) => getWeeklyDistribution(input.engineerId, input.year, input.weekNumber)),

    // تحليل نقاط الضعف (Critical Insights)
    criticalInsights: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getCriticalInsights(input.year, input.month)),

    // ترتيب شامل (Sales + Closing + Distribution)
    fullRanking: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getEngineerRankingFull(input.year, input.month)),

    // ثوابت (labels + targets)
    config: publicProcedure.query(() => ({
      activityLabels: ACTIVITY_LABELS,
      targets: WORK_DISTRIBUTION_TARGETS,
    })),
  }),
});
export type AppRouter = typeof appRouter;
