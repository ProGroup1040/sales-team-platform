import { and, between, count, desc, eq, gte, isNull, lte, or, sql, sum, avg, lt, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  engineers, dailyTasks, leads, visits, deals,
  monthlyTargets, collections,
  customers, products, sales, saleItems
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Engineers ────────────────────────────────────────────────────────────────
export async function getEngineers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(engineers).where(eq(engineers.status, 'active')).orderBy(engineers.name);
}

export async function createEngineer(data: { name: string; email?: string; phone?: string; department?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(engineers).values({ ...data, status: 'active' });
}

// ─── Daily Tasks ──────────────────────────────────────────────────────────────

/** حساب نقطة المهمة حسب الحالة وعدد أيام التأخير */
export function calcTaskScore(status: string, delayDays: number): number {
  if (status === 'completed') return 1;
  if (status === 'delayed') {
    if (delayDays <= 1) return 0.5;
    if (delayDays === 2) return 0.3;
    if (delayDays === 3) return 0.1;
    return 0;
  }
  if (status === 'not_done') return 0;
  if (status === 'client_delay') return -1; // علامة خاصة: لا تحتسب
  return -1; // planned = لا تحتسب
}

export async function getDailyTasksStats(dateStr: string) {
  const db = await getDb();
  if (!db) return { planned: 0, completed: 0, delayed: 0, not_done: 0, client_delay: 0, critical: 0, byEngineer: [], topEngineers: [], bottomEngineers: [], alerts: [] };
  const taskDateObj = new Date(dateStr + 'T00:00:00');
  const allTasks = await db.select().from(dailyTasks).where(eq(dailyTasks.taskDate, taskDateObj));

  const planned = allTasks.filter(t => t.status === 'planned').length;
  const completed = allTasks.filter(t => t.status === 'completed').length;
  const delayed = allTasks.filter(t => t.status === 'delayed').length;
  const not_done = allTasks.filter(t => t.status === 'not_done').length;
  const client_delay = allTasks.filter(t => t.status === 'client_delay').length;
  const critical = allTasks.filter(t => t.isCritical === 1).length;
  const total = allTasks.length;

  const engList = await db.select().from(engineers).where(eq(engineers.status, 'active')).orderBy(engineers.name);
  const byEngineer = engList.map(eng => {
    const engTasks = allTasks.filter(t => t.engineerId === eng.id);
    const scorableTasks = engTasks.filter(t => t.status !== 'client_delay' && t.status !== 'planned');
    const ePlanned = engTasks.length;
    const eCompleted = engTasks.filter(t => t.status === 'completed').length;
    const eDelayed = engTasks.filter(t => t.status === 'delayed').length;
    const eNotDone = engTasks.filter(t => t.status === 'not_done').length;
    const eClientDelay = engTasks.filter(t => t.status === 'client_delay').length;
    const eCritical = engTasks.filter(t => t.isCritical === 1).length;
    const totalPoints = scorableTasks.reduce((sum, t) => sum + calcTaskScore(t.status, t.delayDays ?? 0), 0);
    const executionScore = scorableTasks.length > 0 ? (totalPoints / scorableTasks.length) * 100 : 0;
    const roundedScore = Math.round(executionScore * 10) / 10;
    return {
      engineerId: eng.id, engineerName: eng.name, engineerRole: eng.role,
      planned: ePlanned, completed: eCompleted, delayed: eDelayed,
      not_done: eNotDone, client_delay: eClientDelay, critical: eCritical,
      executionScore: roundedScore,
      rating: roundedScore >= 90 ? 'ممتاز' : roundedScore >= 70 ? 'جيد' : roundedScore >= 50 ? 'مقبول' : 'ضعيف',
    };
  }).filter(e => e.planned > 0);

  // Ranking
  const sorted = [...byEngineer].sort((a, b) => b.executionScore - a.executionScore);
  const topEngineers = sorted.slice(0, 3);
  const bottomEngineers = sorted.slice(-3).reverse();

  // Alerts
  const alerts: { type: string; message: string; severity: 'high' | 'medium' | 'low' }[] = [];
  if (critical > 0) alerts.push({ type: 'critical_tasks', message: `يوجد ${critical} مهمة حرجة تحتاج تدخلاً فورياً`, severity: 'high' });
  if (not_done > 0) alerts.push({ type: 'not_done', message: `${not_done} مهمة لم تُنفذ اليوم`, severity: 'high' });
  byEngineer.forEach(eng => {
    if (eng.executionScore < 70 && eng.planned > 0) {
      alerts.push({ type: 'low_performance', message: `أداء ${eng.engineerName} أقل من 70% (${eng.executionScore}%)`, severity: 'medium' });
    }
    if (eng.delayed >= 3) {
      alerts.push({ type: 'repeated_delay', message: `${eng.engineerName} لديه تأخيرات متكررة (${eng.delayed} مهام)`, severity: 'medium' });
    }
  });

  return { planned: total, completed, delayed, not_done, client_delay, critical, total, byEngineer, topEngineers, bottomEngineers, alerts };
}

export async function getTasksList(dateStr: string, engineerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(dailyTasks.taskDate, new Date(dateStr + 'T00:00:00'))];
  if (engineerId) conditions.push(eq(dailyTasks.engineerId, engineerId));
  return db.select().from(dailyTasks).where(and(...conditions)).orderBy(dailyTasks.priority);
}

export async function getCriticalTasks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyTasks).where(eq(dailyTasks.isCritical, 1)).orderBy(desc(dailyTasks.createdAt)).limit(50);
}

export async function createTask(data: {
  engineerId: number; taskDate: string; title: string; description?: string;
  plannedHours?: number; priority?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(dailyTasks).values({
    engineerId: data.engineerId, taskDate: new Date(data.taskDate + 'T00:00:00'), title: data.title,
    description: data.description, plannedHours: data.plannedHours ?? 1,
    priority: (data.priority as any) ?? 'medium', status: 'planned',
    delayDays: 0, isClientDelay: 0, isRescheduled: 0, isCritical: 0,
  });
}

export async function updateTaskStatus(id: number, status: string, delayDays?: number, notes?: string) {
  const db = await getDb();
  if (!db) return null;
  const updateData: any = { status };
  if (notes !== undefined) updateData.notes = notes;
  if (status === 'completed') { updateData.completedAt = new Date(); updateData.delayDays = 0; updateData.isCritical = 0; }
  if (status === 'delayed') {
    const days = delayDays ?? 1;
    updateData.delayDays = days;
    updateData.isCritical = days > 2 ? 1 : 0;
  }
  if (status === 'not_done') { updateData.isCritical = 0; }
  if (status === 'client_delay') { updateData.isClientDelay = 1; updateData.isCritical = 0; }
  await db.update(dailyTasks).set(updateData).where(eq(dailyTasks.id, id));
  // إذا client_delay: أنشئ مهمة جديدة بتاريخ جديد
  if (status === 'client_delay') {
    const [original] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, id)).limit(1);
    if (original) {
      const nextDate = new Date(original.taskDate);
      nextDate.setDate(nextDate.getDate() + 1);
      await db.insert(dailyTasks).values({
        engineerId: original.engineerId,
        taskDate: nextDate,
        title: original.title,
        description: original.description,
        plannedHours: original.plannedHours ?? 1,
        priority: original.priority,
        status: 'planned',
        delayDays: 0, isClientDelay: 0, isRescheduled: 1,
        rescheduledFromId: id, isCritical: 0,
      });
    }
  }
  return { success: true };
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(dailyTasks).where(eq(dailyTasks.id, id));
}

export async function rescheduleTask(id: number, newDate: string) {
  const db = await getDb();
  if (!db) return;
  const [original] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, id)).limit(1);
  if (!original) return;
  await db.insert(dailyTasks).values({
    engineerId: original.engineerId, taskDate: new Date(newDate + 'T00:00:00'),
    title: original.title, description: original.description,
    plannedHours: original.plannedHours ?? 1, priority: original.priority,
    status: 'planned', delayDays: 0, isClientDelay: 0, isRescheduled: 1,
    rescheduledFromId: id, isCritical: 0,
  });
}

export async function getEngineersWithRole() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(engineers).where(eq(engineers.status, 'active')).orderBy(engineers.name);
}

export async function createEngineerWithRole(data: { name: string; email?: string; phone?: string; department?: string; role?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(engineers).values({ ...data, role: (data.role as any) ?? 'engineer', status: 'active' });
}

export async function deleteEngineer(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(engineers).set({ status: 'inactive' }).where(eq(engineers.id, id));
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function getLeadsStats(year: number, month: number) {
  const db = await getDb();
  if (!db) return { total: 0, contacted: 0, qualified: 0, converted: 0, avgResponseMinutes: 0, delayedRate: 0, bySource: [] };
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const allLeads = await db.select().from(leads).where(between(leads.createdAt, startDate, endDate));
  const total = allLeads.length;
  const contacted = allLeads.filter(l => l.status !== 'new').length;
  const qualified = allLeads.filter(l => l.status === 'qualified' || l.status === 'converted').length;
  const converted = allLeads.filter(l => l.status === 'converted').length;
  const withResponse = allLeads.filter(l => l.responseTimeMinutes !== null);
  const avgResponseMinutes = withResponse.length > 0
    ? Math.round(withResponse.reduce((s, l) => s + (l.responseTimeMinutes ?? 0), 0) / withResponse.length) : 0;
  const delayed = allLeads.filter(l => l.responseTimeMinutes !== null && (l.responseTimeMinutes ?? 0) > 60).length;
  const delayedRate = total > 0 ? Math.round((delayed / total) * 100) : 0;

  const sourceMap: Record<string, number> = {};
  allLeads.forEach(l => { sourceMap[l.source] = (sourceMap[l.source] ?? 0) + 1; });
  const bySource = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));

  return { total, contacted, qualified, converted, avgResponseMinutes, delayedRate, bySource };
}

export async function getLeadsList(limit = 20, offset = 0, status?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const conditions = status ? [eq(leads.status, status as any)] : [];
  const data = await db.select().from(leads)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leads.createdAt)).limit(limit).offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(leads)
    .where(conditions.length ? and(...conditions) : undefined);
  return { data, total };
}

export async function createLead(data: {
  name: string; phone?: string; email?: string; source?: string;
  assignedEngineerId?: number; notes?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(leads).values({
    name: data.name, phone: data.phone, email: data.email,
    source: (data.source as any) ?? 'other',
    assignedEngineerId: data.assignedEngineerId,
    notes: data.notes, status: 'new',
  });
}

export async function updateLeadStatus(id: number, status: string, responseTimeMinutes?: number) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { status };
  if (status !== 'new' && !responseTimeMinutes) updateData.firstContactAt = new Date();
  if (responseTimeMinutes) updateData.responseTimeMinutes = responseTimeMinutes;
  await db.update(leads).set(updateData).where(eq(leads.id, id));
}

// ─── Visits ───────────────────────────────────────────────────────────────────
export async function getVisitsStats(year: number, month: number) {
  const db = await getDb();
  const empty = {
    // Booking
    booked: 0, assigned: 0, assignedDelayCount: 0,
    // Confirmation
    confirmedSameDay: 0, confirmedLate: 0, notConfirmed: 0,
    // Execution
    scheduled: 0, completed: 0, delayed: 0, cancelled: 0, rescheduled: 0,
    // Upload
    uploadedSameDay: 0, uploadedLate: 0, notUploaded: 0,
    deliveredToAdmin: 0, deliveryDelayCount: 0,
    // Quality
    successful: 0, withIssues: 0, designRejected: 0, repeated: 0,
    // Admin
    groupOnTime: 0, groupDelayed: 0, notAssignedToDesigner: 0,
    // Financial
    totalFeeAmount: 0, feeCollectedCount: 0, feeNotCollectedCount: 0, feeCollectedAmount: 0,
    // KPIs
    confirmationRate: 0, delayRate: 0, uploadSameDayRate: 0,
    cancellationRate: 0, revisitRate: 0, collectionRate: 0, completionRate: 0,
  };
  if (!db) return empty;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const allVisits = await db.select().from(visits).where(between(visits.scheduledAt, startDate, endDate));
  const total = allVisits.length;
  if (total === 0) return empty;

  // ── 1. Booking & Assignment ──
  const booked = total;
  const assigned = allVisits.filter(v => v.engineerId).length;
  const assignedDelayCount = allVisits.filter(v => (v.assignedDelay ?? 0) > 0).length;

  // ── 2. Confirmation ──
  const confirmedSameDay = allVisits.filter(v => v.confirmationStatus === 'confirmed_same_day').length;
  const confirmedLate = allVisits.filter(v => v.confirmationStatus === 'confirmed_late').length;
  const notConfirmed = allVisits.filter(v => v.confirmationStatus === 'not_confirmed').length;

  // ── 3. Execution ──
  const completed = allVisits.filter(v => v.status === 'completed').length;
  const delayed = allVisits.filter(v => v.status === 'delayed').length;
  const cancelled = allVisits.filter(v => v.status === 'cancelled').length;
  const rescheduled = allVisits.filter(v => v.status === 'rescheduled').length;
  const scheduled = allVisits.filter(v => v.status === 'scheduled').length;

  // ── 4. Upload & Delivery ──
  const uploadedSameDay = allVisits.filter(v => v.uploadStatus === 'uploaded_same_day').length;
  const uploadedLate = allVisits.filter(v => v.uploadStatus === 'uploaded_late').length;
  const notUploaded = allVisits.filter(v => v.uploadStatus === 'not_uploaded').length;
  const deliveredToAdmin = allVisits.filter(v => v.deliveredToAdmin === 1).length;
  const deliveryDelayCount = allVisits.filter(v => (v.deliveryDelayHours ?? 0) > 0).length;

  // ── 5. Quality ──
  const successful = allVisits.filter(v => v.quality === 'successful').length;
  const withIssues = allVisits.filter(v => v.quality === 'with_issues').length;
  const designRejected = allVisits.filter(v => v.quality === 'design_rejected').length;
  const repeated = allVisits.filter(v => v.quality === 'repeated').length;

  // ── 6. Admin Handling ──
  const groupOnTime = allVisits.filter(v => v.groupStatus === 'created_on_time').length;
  const groupDelayed = allVisits.filter(v => v.groupStatus === 'created_late').length;
  const notAssignedToDesigner = allVisits.filter(v => v.assignedToDesigner === 0).length;

  // ── 7. Financial ──
  const totalFeeAmount = allVisits.reduce((sum, v) => sum + parseFloat(v.feeAmount ?? '0'), 0);
  const feeCollectedCount = allVisits.filter(v => v.feeCollected === 1).length;
  const feeNotCollectedCount = allVisits.filter(v => v.feeCollected === 0).length;
  const feeCollectedAmount = allVisits.filter(v => v.feeCollected === 1).reduce((sum, v) => sum + parseFloat(v.feeAmount ?? '0'), 0);

  // ── KPI Calculations ──
  const confirmationRate = total > 0 ? Math.round(((confirmedSameDay + confirmedLate) / total) * 100) : 0;
  const delayRate = total > 0 ? Math.round((delayed / total) * 100) : 0;
  const uploadSameDayRate = (completed + delayed) > 0 ? Math.round((uploadedSameDay / (completed + delayed)) * 100) : 0;
  const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
  const revisitRate = total > 0 ? Math.round((repeated / total) * 100) : 0;
  const collectionRate = total > 0 ? Math.round((feeCollectedCount / total) * 100) : 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    booked, assigned, assignedDelayCount,
    confirmedSameDay, confirmedLate, notConfirmed,
    scheduled, completed, delayed, cancelled, rescheduled,
    uploadedSameDay, uploadedLate, notUploaded, deliveredToAdmin, deliveryDelayCount,
    successful, withIssues, designRejected, repeated,
    groupOnTime, groupDelayed, notAssignedToDesigner,
    totalFeeAmount, feeCollectedCount, feeNotCollectedCount, feeCollectedAmount,
    confirmationRate, delayRate, uploadSameDayRate, cancellationRate, revisitRate, collectionRate, completionRate,
  };
}

export async function getVisitsList(limit = 20, offset = 0, status?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const conditions = status ? [eq(visits.status, status as any)] : [];
  const data = await db.select().from(visits)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(visits.scheduledAt)).limit(limit).offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(visits)
    .where(conditions.length ? and(...conditions) : undefined);
  return { data, total };
}

export async function createVisit(data: {
  engineerId: number; clientName: string; clientPhone?: string;
  address?: string; scheduledAt: Date; leadId?: number; notes?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(visits).values({ ...data, status: 'scheduled' });
}

export async function updateVisitStatus(id: number, status: string, quality?: string, delayMinutes?: number, notes?: string) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { status };
  if (quality) updateData.quality = quality;
  if (delayMinutes !== undefined) updateData.delayMinutes = delayMinutes;
  if (notes) updateData.notes = notes;
  if (status === 'completed' || status === 'delayed') updateData.actualAt = new Date();
  await db.update(visits).set(updateData).where(eq(visits.id, id));
}

export async function updateVisitFull(id: number, data: {
  status?: string; quality?: string; delayMinutes?: number; notes?: string;
  confirmationStatus?: string; confirmationDelayHours?: number;
  uploadStatus?: string; deliveredToAdmin?: boolean; deliveryDelayHours?: number;
  groupStatus?: string; assignedToDesigner?: boolean;
  feeAmount?: number; feeCollected?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = {};
  if (data.status) { updateData.status = data.status; if (data.status === 'completed' || data.status === 'delayed') updateData.actualAt = new Date(); }
  if (data.quality) updateData.quality = data.quality;
  if (data.delayMinutes !== undefined) updateData.delayMinutes = data.delayMinutes;
  if (data.notes) updateData.notes = data.notes;
  if (data.confirmationStatus) { updateData.confirmationStatus = data.confirmationStatus; updateData.confirmedAt = new Date(); }
  if (data.confirmationDelayHours !== undefined) updateData.confirmationDelayHours = data.confirmationDelayHours;
  if (data.uploadStatus) { updateData.uploadStatus = data.uploadStatus; updateData.uploadedAt = new Date(); }
  if (data.deliveredToAdmin !== undefined) updateData.deliveredToAdmin = data.deliveredToAdmin ? 1 : 0;
  if (data.deliveryDelayHours !== undefined) updateData.deliveryDelayHours = data.deliveryDelayHours;
  if (data.groupStatus) updateData.groupStatus = data.groupStatus;
  if (data.assignedToDesigner !== undefined) updateData.assignedToDesigner = data.assignedToDesigner ? 1 : 0;
  if (data.feeAmount !== undefined) updateData.feeAmount = String(data.feeAmount);
  if (data.feeCollected !== undefined) updateData.feeCollected = data.feeCollected ? 1 : 0;
  if (Object.keys(updateData).length > 0) await db.update(visits).set(updateData).where(eq(visits.id, id));
}

// ─── Deals (Closing) ──────────────────────────────────────────────────────────
export async function getDealsStats(year: number, month: number) {
  const db = await getDb();
  if (!db) return { open: 0, closedWon: 0, closedLost: 0, totalValue: 0, closedValue: 0, conversionRate: 0, byStage: [] };
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const allDeals = await db.select().from(deals).where(between(deals.createdAt, startDate, endDate));
  const open = allDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).length;
  const closedWon = allDeals.filter(d => d.stage === 'closed_won').length;
  const closedLost = allDeals.filter(d => d.stage === 'closed_lost').length;
  const totalValue = allDeals.reduce((s, d) => s + parseFloat(d.value), 0);
  const closedValue = allDeals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + parseFloat(d.value), 0);

  // Conversion rate from visits
  const visitsCount = await db.select({ total: count() }).from(visits).where(between(visits.scheduledAt, startDate, endDate));
  const totalVisits = visitsCount[0]?.total ?? 0;
  const conversionRate = totalVisits > 0 ? Math.round((closedWon / totalVisits) * 100) : 0;

  const stageMap: Record<string, { count: number; value: number }> = {};
  allDeals.forEach(d => {
    if (!stageMap[d.stage]) stageMap[d.stage] = { count: 0, value: 0 };
    stageMap[d.stage].count++;
    stageMap[d.stage].value += parseFloat(d.value);
  });
  const byStage = Object.entries(stageMap).map(([stage, data]) => ({ stage, ...data }));

  return { open, closedWon, closedLost, totalValue, closedValue, conversionRate, byStage };
}

export async function getDealsList(limit = 20, offset = 0, stage?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const conditions = stage ? [eq(deals.stage, stage as any)] : [];
  const data = await db.select().from(deals)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(deals.createdAt)).limit(limit).offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(deals)
    .where(conditions.length ? and(...conditions) : undefined);
  return { data, total };
}

export async function createDeal(data: {
  engineerId: number; clientName: string; value: number;
  visitId?: number; leadId?: number; nextAction?: string; nextActionDate?: string; notes?: string;
}) {
  const db = await getDb();
  if (!db) return;
    await db.insert(deals).values({
      engineerId: data.engineerId, clientName: data.clientName,
      value: data.value.toString(), stage: 'proposal',
      visitId: data.visitId, leadId: data.leadId,
      nextAction: data.nextAction,
      nextActionDate: data.nextActionDate ? new Date(data.nextActionDate + 'T00:00:00') : undefined,
      notes: data.notes,
    });
}

export async function updateDealStage(id: number, stage: string, nextAction?: string, nextActionDate?: string, notes?: string) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { stage };
  if (nextAction !== undefined) updateData.nextAction = nextAction;
    if (nextActionDate !== undefined) updateData.nextActionDate = nextActionDate ? new Date(nextActionDate + 'T00:00:00') : null;
  if (notes !== undefined) updateData.notes = notes;
  if (stage === 'closed_won' || stage === 'closed_lost') updateData.closedAt = new Date();
  await db.update(deals).set(updateData).where(eq(deals.id, id));
}

// ─── Monthly Sales ────────────────────────────────────────────────────────────
export async function getMonthlySalesStats(year: number, month: number) {
  const db = await getDb();
  if (!db) return { target: 0, actual: 0, achievementRate: 0, remaining: 0 };
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const targetRow = await db.select().from(monthlyTargets)
    .where(and(eq(monthlyTargets.year, year), eq(monthlyTargets.month, month))).limit(1);
  const target = targetRow.length > 0 ? parseFloat(targetRow[0].targetAmount) : 0;

  const wonDeals = await db.select().from(deals)
    .where(and(eq(deals.stage, 'closed_won'), between(deals.closedAt as any, startDate, endDate)));
  const actual = wonDeals.reduce((s, d) => s + parseFloat(d.value), 0);

  const achievementRate = target > 0 ? Math.round((actual / target) * 100) : 0;
  const remaining = Math.max(0, target - actual);

  return { target, actual, achievementRate, remaining };
}

export async function getMonthlySalesTrend(months: number = 6) {
  const db = await getDb();
  if (!db) return [];
  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const stats = await getMonthlySalesStats(year, month);
    result.push({ year, month, label: `${year}/${String(month).padStart(2, '0')}`, ...stats });
  }
  return result;
}

// ─── KPI (Engineers Performance) ─────────────────────────────────────────────
export async function getEngineersKPI(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const engList = await getEngineers();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

    const allTasks = await db.select().from(dailyTasks)
    .where(and(gte(dailyTasks.taskDate, startDate), lte(dailyTasks.taskDate, endDate)));
  const allVisits = await db.select().from(visits).where(between(visits.scheduledAt, startDate, endDate));
  const allDeals = await db.select().from(deals).where(between(deals.createdAt, startDate, endDate));
  const allLeads = await db.select().from(leads).where(between(leads.createdAt, startDate, endDate));

  return engList.map(eng => {
    const engTasks = allTasks.filter(t => t.engineerId === eng.id);
    const planned = engTasks.length;
    const completed = engTasks.filter(t => t.status === 'completed').length;
    const delayed = engTasks.filter(t => t.status === 'delayed').length;
    const executionScore = planned > 0 ? ((completed + 0.5 * delayed) / planned) * 100 : 0;

    const engVisits = allVisits.filter(v => v.engineerId === eng.id);
    const engDeals = allDeals.filter(d => d.engineerId === eng.id);
    const closedWon = engDeals.filter(d => d.stage === 'closed_won').length;
    const totalDealValue = engDeals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + parseFloat(d.value), 0);
    const engLeads = allLeads.filter(l => l.assignedEngineerId === eng.id);

    return {
      engineerId: eng.id, engineerName: eng.name, department: eng.department,
      tasksPlanned: planned, tasksCompleted: completed, tasksDelayed: delayed,
      executionScore: Math.round(executionScore * 10) / 10,
      rating: executionScore >= 90 ? 'ممتاز' : executionScore >= 70 ? 'جيد' : executionScore >= 50 ? 'مقبول' : 'ضعيف',
      visitsCount: engVisits.length, dealsCount: engDeals.length,
      closedWon, totalDealValue, leadsCount: engLeads.length,
    };
  });
}

// ─── Collections ──────────────────────────────────────────────────────────────
export async function getCollectionsStats() {
  const db = await getDb();
  if (!db) return { totalContracts: 0, totalCollected: 0, outstanding: 0, overdue: 0, collectionRate: 0 };
  const all = await db.select().from(collections);
  const totalContracts = all.reduce((s, c) => s + parseFloat(c.contractAmount), 0);
  const totalCollected = all.reduce((s, c) => s + parseFloat(c.collectedAmount ?? '0'), 0);
  const outstanding = totalContracts - totalCollected;
  const overdue = all.filter(c => c.status === 'overdue').reduce((s, c) => s + (parseFloat(c.contractAmount) - parseFloat(c.collectedAmount ?? '0')), 0);
  const collectionRate = totalContracts > 0 ? Math.round((totalCollected / totalContracts) * 100) : 0;
  return { totalContracts, totalCollected, outstanding, overdue, collectionRate };
}

export async function getCollectionsList(limit = 20, offset = 0, status?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const conditions = status ? [eq(collections.status, status as any)] : [];
  const data = await db.select().from(collections)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(collections.createdAt)).limit(limit).offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(collections)
    .where(conditions.length ? and(...conditions) : undefined);
  return { data, total };
}

export async function createCollection(data: {
  clientName: string; contractAmount: number; collectedAmount?: number;
  dueDate?: string; dealId?: number; notes?: string;
}) {
  const db = await getDb();
  if (!db) return;
    await db.insert(collections).values({
      clientName: data.clientName,
      contractAmount: data.contractAmount.toString(),
      collectedAmount: (data.collectedAmount ?? 0).toString(),
      dueDate: data.dueDate ? new Date(data.dueDate + 'T00:00:00') : undefined,
      dealId: data.dealId,
      notes: data.notes,
      status: 'on_track',
    });
}

export async function updateCollection(id: number, collectedAmount: number, status?: string, notes?: string) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { collectedAmount: collectedAmount.toString(), lastPaymentAt: new Date() };
  if (status) updateData.status = status;
  if (notes) updateData.notes = notes;
  await db.update(collections).set(updateData).where(eq(collections.id, id));
}

// ─── Target Planning ──────────────────────────────────────────────────────────
export async function getMonthlyTarget(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(monthlyTargets)
    .where(and(eq(monthlyTargets.year, year), eq(monthlyTargets.month, month))).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertMonthlyTarget(data: {
  year: number; month: number; targetAmount: number;
  avgDealValue?: number; closingRate?: number; visitToClosingRate?: number; notes?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await getMonthlyTarget(data.year, data.month);
  if (existing) {
    await db.update(monthlyTargets).set({
      targetAmount: data.targetAmount.toString(),
      avgDealValue: data.avgDealValue?.toString(),
      closingRate: data.closingRate,
      visitToClosingRate: data.visitToClosingRate,
      notes: data.notes,
    }).where(eq(monthlyTargets.id, existing.id));
  } else {
    await db.insert(monthlyTargets).values({
      year: data.year, month: data.month,
      targetAmount: data.targetAmount.toString(),
      avgDealValue: data.avgDealValue?.toString() ?? '50000',
      closingRate: data.closingRate ?? 0.3,
      visitToClosingRate: data.visitToClosingRate ?? 0.4,
      notes: data.notes,
    });
  }
}

// ─── Seed Check ───────────────────────────────────────────────────────────────
export async function isSeeded(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ total: count() }).from(engineers);
  return (result[0]?.total ?? 0) > 0;
}

// ─── Legacy helpers (customers / products / sales) ────────────────────────────
export async function getCustomers(opts: { search?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const conditions: any[] = [];
  if (opts.status) conditions.push(eq(customers.status, opts.status as any));
  const data = await db.select().from(customers)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(customers.createdAt)).limit(opts.limit ?? 20).offset(opts.offset ?? 0);
  const [{ total }] = await db.select({ total: count() }).from(customers)
    .where(conditions.length ? and(...conditions) : undefined);
  return { data, total };
}

export async function getProducts(opts: { search?: string; category?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const conditions: any[] = [];
  if (opts.status) conditions.push(eq(products.status, opts.status as any));
  const data = await db.select().from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(products.createdAt)).limit(opts.limit ?? 20).offset(opts.offset ?? 0);
  const [{ total }] = await db.select({ total: count() }).from(products)
    .where(conditions.length ? and(...conditions) : undefined);
  return { data, total };
}

export async function getProductCategories(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ category: products.category }).from(products).where(sql`${products.category} IS NOT NULL`);
  return result.map(r => r.category).filter(Boolean) as string[];
}

export async function createCustomer(data: any) {
  const db = await getDb();
  if (!db) return;
  await db.insert(customers).values(data);
}

export async function updateCustomer(id: number, data: any) {
  const db = await getDb();
  if (!db) return;
  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(customers).where(eq(customers.id, id));
}

export async function createProduct(data: any) {
  const db = await getDb();
  if (!db) return;
  await db.insert(products).values(data);
}

export async function updateProduct(id: number, data: any) {
  const db = await getDb();
  if (!db) return;
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(products).where(eq(products.id, id));
}

export async function getSales(opts: any) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const data = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(opts.limit ?? 20).offset(opts.offset ?? 0);
  const [{ total }] = await db.select({ total: count() }).from(sales);
  return { data, total };
}

export async function createSale(data: any) {
  const db = await getDb();
  if (!db) return { id: 0, invoiceNumber: 'INV-000' };
  const invoiceNumber = `INV-${Date.now()}`;
  const finalAmount = (parseFloat(data.totalAmount ?? '0') - parseFloat(data.discount ?? '0') + parseFloat(data.tax ?? '0')).toString();
  await db.insert(sales).values({ ...data, invoiceNumber, finalAmount });
  return { id: 0, invoiceNumber };
}

export async function updateSaleStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(sales).set({ status: status as any }).where(eq(sales.id, id));
}

export async function deleteSale(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(sales).where(eq(sales.id, id));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function getSaleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  return result[0];
}

export async function getDashboardStats() {
  return { totalSales: 0, monthSales: 0, salesGrowth: 0, totalOrders: 0, monthOrders: 0, ordersGrowth: 0, totalCustomers: 0, newCustomers: 0, avgOrderValue: 0, topProducts: [] };
}

export async function getMonthlySalesTrendLegacy() { return []; }
export async function getSalesByStatus() { return []; }
