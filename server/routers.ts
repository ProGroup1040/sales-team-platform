import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getEngineers, createEngineer,
  getDailyTasksStats, getTasksList, createTask, updateTaskStatus,
  getLeadsStats, getLeadsList, createLead, updateLeadStatus,
  getVisitsStats, getVisitsList, createVisit, updateVisitStatus,
  getDealsStats, getDealsList, createDeal, updateDealStage,
  getMonthlySalesStats, getMonthlySalesTrend,
  getEngineersKPI,
  getCollectionsStats, getCollectionsList, createCollection, updateCollection,
  getMonthlyTarget, upsertMonthlyTarget,
  isSeeded,
  getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer,
  getProducts, getProductById, createProduct, updateProduct, deleteProduct, getProductCategories,
  getSales, getSaleById, createSale, updateSaleStatus, deleteSale,
} from "./db";

// ─── Seed Data ────────────────────────────────────────────────────────────────
async function seedData() {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return;

  const { engineers, dailyTasks, leads, visits, deals, monthlyTargets, collections, customers, products, sales, saleItems } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");

  // Seed engineers
  const engData = [
    { name: 'أحمد محمد علي', email: 'ahmed@company.com', phone: '0501234567', department: 'المبيعات', status: 'active' as const },
    { name: 'سارة عبدالله', email: 'sara@company.com', phone: '0502345678', department: 'المبيعات', status: 'active' as const },
    { name: 'محمد الشمري', email: 'mohammed@company.com', phone: '0503456789', department: 'التشغيل', status: 'active' as const },
    { name: 'فاطمة الزهراني', email: 'fatima@company.com', phone: '0504567890', department: 'المبيعات', status: 'active' as const },
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

  // ── Seed ──────────────────────────────────────────────────────────────────
  seed: router({
    isSeeded: publicProcedure.query(async () => isSeeded()),
    run: publicProcedure.mutation(async () => {
      await seedData();
      return { success: true };
    }),
  }),

  // ── Engineers ─────────────────────────────────────────────────────────────
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
    })).mutation(async ({ input }) => { await createTask(input); return { success: true }; }),
    updateStatus: publicProcedure.input(z.object({
      id: z.number(), status: z.enum(['planned', 'completed', 'delayed', 'not_done']),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => { await updateTaskStatus(input.id, input.status, input.notes); return { success: true }; }),
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
    })).mutation(async ({ input }) => { await createVisit(input); return { success: true }; }),
    updateStatus: publicProcedure.input(z.object({
      id: z.number(), status: z.enum(['scheduled', 'completed', 'delayed', 'cancelled']),
      quality: z.enum(['successful', 'with_issues', 'rejected', 'repeated']).optional(),
      delayMinutes: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input }) => { await updateVisitStatus(input.id, input.status, input.quality, input.delayMinutes, input.notes); return { success: true }; }),
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
    })).mutation(async ({ input }) => { await createDeal(input); return { success: true }; }),
    updateStage: publicProcedure.input(z.object({
      id: z.number(), stage: z.enum(['proposal', 'negotiation', 'contract_sent', 'closed_won', 'closed_lost']),
      nextAction: z.string().optional(), nextActionDate: z.string().optional(), notes: z.string().optional(),
    })).mutation(async ({ input }) => { await updateDealStage(input.id, input.stage, input.nextAction, input.nextActionDate, input.notes); return { success: true }; }),
  }),

  // ── Monthly Sales ─────────────────────────────────────────────────────────
  sales: router({
    monthlyStats: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getMonthlySalesStats(input.year, input.month)),
    trend: publicProcedure.input(z.object({ months: z.number().optional() }))
      .query(async ({ input }) => getMonthlySalesTrend(input.months ?? 6)),
  }),

  // ── KPI ───────────────────────────────────────────────────────────────────
  kpi: router({
    engineers: publicProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getEngineersKPI(input.year, input.month)),
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

  // ── Legacy: Customers / Products ─────────────────────────────────────────
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
});

export type AppRouter = typeof appRouter;
