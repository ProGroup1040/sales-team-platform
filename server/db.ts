import { and, between, count, desc, eq, gte, isNull, lte, or, sql, sum, avg, lt, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  engineers, dailyTasks, leads, visits, deals,
  monthlyTargets, collections,
  engineerTargets, discountTiers, commissionTiers,
  designReviews, incentiveTiers,
  customers, products, sales, saleItems,
  payments, paymentPromises, commissionPayments,
  InsertPayment, InsertPaymentPromise,
  adminSalesTasks, adminSalesMeetings,
  InsertAdminSalesTask, InsertAdminSalesMeeting,
  meetingReviews, MeetingReview, InsertMeetingReview,
  leadFollowupLogs, LeadFollowupLog, InsertLeadFollowupLog,
  auditLogs, AuditLog, InsertAuditLog,
  leadDailyStats, LeadDailyStat, InsertLeadDailyStat
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { notifyOwner } from './_core/notification';

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
  category?: string; meetingRecordingLink?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(dailyTasks).values({
    engineerId: data.engineerId, taskDate: new Date(data.taskDate + 'T00:00:00'), title: data.title,
    description: data.description, plannedHours: data.plannedHours ?? 1,
    priority: (data.priority as any) ?? 'medium', status: 'planned',
    delayDays: 0, isClientDelay: 0, isRescheduled: 0, isCritical: 0,
    category: data.category ?? null,
    meetingRecordingLink: data.meetingRecordingLink ?? null,
  });
}

export async function updateTaskStatus(id: number, status: string, delayDays?: number, notes?: string) {
  const db = await getDb();
  if (!db) return null;
  // ─── شرط إغلاق Closing/Meeting ────────────────────────────────────────────────────────────────────────────────
  if (status === 'completed') {
    const [task] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, id)).limit(1);
    if (task && (task.category === 'closing' || task.category === 'meeting') && !task.meetingRecordingLink) {
      return { success: false, error: 'RECORDING_REQUIRED', message: 'يجب إدخال رابط تسجيل الميتينج قبل إغلاق المهمة' };
    }
  }
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
// KPI Weights: Tasks & Execution = 55%, Response Speed = 20%, CRM Update = 25%
// Efficiency penalty: if avg visits per closed deal > 3, reduce tasks score
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
  const commTiers = await getCommissionTiers();
  const engTargetsList = await db.select().from(engineerTargets)
    .where(and(eq(engineerTargets.year, year), eq(engineerTargets.month, month)));

  // ─── Closing Quality Reviews ────────────────────────────────────────────────
  const allReviews = await db.select().from(meetingReviews)
    .where(and(gte(meetingReviews.createdAt, startDate), lte(meetingReviews.createdAt, endDate)));
  const allClosingTasks = await db.select().from(dailyTasks)
    .where(and(
      gte(dailyTasks.taskDate, startDate), lte(dailyTasks.taskDate, endDate),
      or(eq(dailyTasks.category, 'closing'), eq(dailyTasks.category, 'meeting'))
    ));

  const results = engList.map(eng => {
    // ── 1) Tasks & Execution Score (55%) ──────────────────────────────────────
    const engTasks = allTasks.filter(t => t.engineerId === eng.id);
    const planned = engTasks.length;
    const completed = engTasks.filter(t => t.status === 'completed').length;
    const delayed = engTasks.filter(t => t.status === 'delayed').length;
    const notDone = engTasks.filter(t => t.status === 'not_done').length;
    // Raw execution: completed=1pt, delayed=0.5pt, not_done=0pt
    const rawExecution = planned > 0 ? ((completed + 0.5 * delayed) / planned) * 100 : 0;

    // Efficiency: visits per closed deal (ideal ≤ 3, penalty if > 3)
    const engVisits = allVisits.filter(v => v.engineerId === eng.id);
    const engDeals = allDeals.filter(d => d.engineerId === eng.id);
    const closedWon = engDeals.filter(d => d.stage === 'closed_won').length;
    const visitsPerDeal = closedWon > 0 ? engVisits.length / closedWon : (engVisits.length > 0 ? 10 : 1);
    // Efficiency score: 100 if ≤3 visits/deal, decreases by 10 per extra visit above 3
    const efficiencyScore = Math.max(0, 100 - Math.max(0, visitsPerDeal - 3) * 10);
    // Combined tasks score: 70% execution + 30% efficiency
    const tasksScore = rawExecution * 0.7 + efficiencyScore * 0.3;

    // ── 2) Response Speed Score (20%) ─────────────────────────────────────────
    const engLeads = allLeads.filter(l => l.assignedEngineerId === eng.id);
    const respondedLeads = engLeads.filter(l => l.responseTimeMinutes !== null && l.responseTimeMinutes !== undefined);
    // Score: response ≤ 30min = 100, ≤ 60min = 80, ≤ 120min = 60, ≤ 240min = 40, > 240min = 20
    const responseScore = respondedLeads.length > 0
      ? respondedLeads.reduce((sum, l) => {
          const mins = l.responseTimeMinutes ?? 999;
          const s = mins <= 30 ? 100 : mins <= 60 ? 80 : mins <= 120 ? 60 : mins <= 240 ? 40 : 20;
          return sum + s;
        }, 0) / respondedLeads.length
      : (engLeads.length > 0 ? 0 : 100); // 0 if has leads but no response, 100 if no leads

    // ── 3) CRM Update Score (25%) ─────────────────────────────────────────────
    // CRM compliance: visits with notes/quality filled, deals with nextAction set
    const completedVisits = engVisits.filter(v => v.status === 'completed' || v.status === 'delayed');
    const visitsWithNotes = completedVisits.filter(v => v.notes || v.quality).length;
    const visitCRMScore = completedVisits.length > 0 ? (visitsWithNotes / completedVisits.length) * 100 : 100;
    const openDeals = engDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage));
    const dealsWithAction = openDeals.filter(d => d.nextAction).length;
    const dealCRMScore = openDeals.length > 0 ? (dealsWithAction / openDeals.length) * 100 : 100;
    const crmScore = (visitCRMScore * 0.5 + dealCRMScore * 0.5);

    // ── Final KPI (weighted) ────────────────────────────────────────────────────────────────────────────────
    const kpiScore = Math.round((tasksScore * 0.55 + responseScore * 0.20 + crmScore * 0.25) * 10) / 10;
    const rating = kpiScore >= 90 ? 'ممتاز' : kpiScore >= 75 ? 'جيد جداً' : kpiScore >= 60 ? 'جيد' : kpiScore >= 45 ? 'مقبول' : 'ضعيف';

    // ── Sales figures (from closed_won deals) ────────────────────────────────────
    const totalDealValue = engDeals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + parseFloat(d.value), 0);
    const engTarget = engTargetsList.find(t => t.engineerId === eng.id);
    const targetAmount = engTarget ? parseFloat(engTarget.targetAmount) : 0;
    const achievementPct = targetAmount > 0 ? (totalDealValue / targetAmount) * 100 : 0;

    // ── Commission Tiers (based on total sales value) ─────────────────────────────────────────────
    // 1% up to 1M (NEW), 1.25% up to 1.25M, 1.5% up to 1.5M, 1.75% up to 1.75M,
    // 2% up to 2M, +0.25% per extra 250K above 2M
    let baseCommissionPct = 0;
    if (totalDealValue >= 2_000_000) {
      const extraSlabs = Math.floor((totalDealValue - 2_000_000) / 250_000);
      baseCommissionPct = 2 + extraSlabs * 0.25;
    } else if (totalDealValue >= 1_750_000) {
      baseCommissionPct = 1.75;
    } else if (totalDealValue >= 1_500_000) {
      baseCommissionPct = 1.5;
    } else if (totalDealValue >= 1_250_000) {
      baseCommissionPct = 1.25;
    } else if (totalDealValue >= 1_000_000) {
      baseCommissionPct = 1.0;
    } else {
      // شريحة جديدة: 1% على أي مبيعات حتى مليون جنيه
      baseCommissionPct = totalDealValue > 0 ? 1.0 : 0;
    }

    // ── Incentive Tiers (fixed amounts based on total sales) ──────────────────────
    let baseIncentiveAmount = 0;
    if (totalDealValue >= 2_000_000)      baseIncentiveAmount = 10_000;
    else if (totalDealValue >= 1_750_000) baseIncentiveAmount = 8_750;
    else if (totalDealValue >= 1_500_000) baseIncentiveAmount = 7_500;
    else if (totalDealValue >= 1_250_000) baseIncentiveAmount = 6_500;
    else if (totalDealValue >= 1_000_000) baseIncentiveAmount = 5_000;
    else if (totalDealValue >= 500_000)   baseIncentiveAmount = 2_500;
    else                                   baseIncentiveAmount = 0;

    // ── KPI Rules (Final Version) ─────────────────────────────────
    // Commission: ثابت دائماً بغض النظر عن KPI
    // KPI Bonus:  يُصرف عند KPI ≥ 60%
    // Incentive:  يُصرف عند KPI ≥ 75%
    // High Perf:  KPI ≥ 90% → أعلى مستوى
     let kpiStatus: 'available' | 'blocked' = 'blocked';
     let kpiBonusStatus: 'available' | 'blocked' = 'blocked';
     let incentiveStatus: 'available' | 'blocked' = 'blocked';
     let performanceLevel: 'high' | 'good' | 'average' | 'low' = 'low';
     let kpiStatusReason = '';
     let incentiveStatusReason = '';
     let kpiBonusStatusReason = '';

     // Commission ثابت دائماً (100% في جميع الحالات)
     const commissionStatus: 'full' = 'full';
     const commissionMultiplier = 1.0;

     if (kpiScore >= 90) {
       kpiStatus = 'available'; kpiBonusStatus = 'available'; incentiveStatus = 'available';
       performanceLevel = 'high';
       kpiStatusReason = 'KPI ≥ 90% — مستوى أداء عالي جداً';
       kpiBonusStatusReason = 'KPI ≥ 60% — KPI Bonus متاح';
       incentiveStatusReason = 'KPI ≥ 75% — الحافز متاح';
     } else if (kpiScore >= 75) {
       kpiStatus = 'available'; kpiBonusStatus = 'available'; incentiveStatus = 'available';
       performanceLevel = 'good';
       kpiStatusReason = 'KPI 75-90% — أداء جيد جداً';
       kpiBonusStatusReason = 'KPI ≥ 60% — KPI Bonus متاح';
       incentiveStatusReason = 'KPI ≥ 75% — الحافز متاح';
     } else if (kpiScore >= 60) {
       kpiStatus = 'available'; kpiBonusStatus = 'available'; incentiveStatus = 'blocked';
       performanceLevel = 'average';
       kpiStatusReason = 'KPI 60-75% — أداء متوسط';
       kpiBonusStatusReason = 'KPI ≥ 60% — KPI Bonus متاح';
       incentiveStatusReason = 'الحافز متوقف — ارفع KPI إلى 75% للحصول على الحافز';
     } else {
       kpiStatus = 'blocked'; kpiBonusStatus = 'blocked'; incentiveStatus = 'blocked';
       performanceLevel = 'low';
       kpiStatusReason = 'KPI أقل من 60% — أداء منخفض';
       kpiBonusStatusReason = 'KPI أقل من 60% — لا يوجد KPI Bonus';
       incentiveStatusReason = 'الحافز متوقف — KPI أقل من 75%';
     }

     const effectiveCommissionPct = baseCommissionPct * commissionMultiplier;
     const commissionValue = Math.round(totalDealValue * (effectiveCommissionPct / 100));
     const incentiveValue = incentiveStatus === 'available' ? baseIncentiveAmount : 0;
     // KPI Bonus = 5% من قيمة الكوميشن الأساسي عند الاستحقاق
     const kpiBonusValue = kpiBonusStatus === 'available' ? Math.round(commissionValue * 0.05) : 0;
     const totalPayout = commissionValue + incentiveValue + kpiBonusValue;

    // ── KPI Alerts ────────────────────────────────────────────────
    const kpiAlerts: string[] = [];
    if (tasksScore < 60) {
      if (rawExecution < 60) kpiAlerts.push('تأخير في تنفيذ المهام');
      if (efficiencyScore < 60) kpiAlerts.push(`عدد الاجتماعات مرتفع (${Math.round(visitsPerDeal * 10) / 10} لكل صفقة)`);
    }
    if (responseScore < 60) kpiAlerts.push('تأخير في الرد على العملاء المحتملين');
    if (crmScore < 60) kpiAlerts.push('عدم تحديث CRM بشكل منتظم');
    if (delayed > 0) kpiAlerts.push(`${delayed} مهمة متأخرة`);

    return {
      engineerId: eng.id, engineerName: eng.name, department: eng.department,
      tasksPlanned: planned, tasksCompleted: completed, tasksDelayed: delayed, tasksNotDone: notDone,
      rawExecutionScore: Math.round(rawExecution * 10) / 10,
      efficiencyScore: Math.round(efficiencyScore * 10) / 10,
      visitsPerDeal: Math.round(visitsPerDeal * 10) / 10,
      tasksScore: Math.round(tasksScore * 10) / 10,
      leadsCount: engLeads.length, respondedLeads: respondedLeads.length,
      responseScore: Math.round(responseScore * 10) / 10,
      visitCRMScore: Math.round(visitCRMScore * 10) / 10,
      dealCRMScore: Math.round(dealCRMScore * 10) / 10,
      crmScore: Math.round(crmScore * 10) / 10,
      kpiScore, executionScore: kpiScore,
      rating, kpiStatus, kpiStatusReason, kpiAlerts,
      performanceLevel,
      kpiBonusStatus, kpiBonusValue, kpiBonusStatusReason,
      incentiveStatusReason,
      visitsCount: engVisits.length, dealsCount: engDeals.length,
      closedWon, totalDealValue, achievementPct: Math.round(achievementPct * 10) / 10,
      targetAmount,
      baseCommissionPct, commissionMultiplier, effectiveCommissionPct: Math.round(effectiveCommissionPct * 100) / 100,
      commissionValue, commissionStatus,
      baseIncentiveAmount, incentiveValue, incentiveStatus,
      totalPayout,
    };

  });

  // Add ranking
  const sorted = [...results].sort((a, b) => b.kpiScore - a.kpiScore);
  return results.map(r => ({
    ...r,
    kpiRank: sorted.findIndex(s => s.engineerId === r.engineerId) + 1,
    kpiRankDelta: 0, // can be computed with historical data
  }));
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

// ─── Sales Control Tower ──────────────────────────────────────────────────────

/** حساب الكوميشن بناءً على الشرائح */
export function calcCommission(achievementPct: number, salesAmount: number, tiers: Array<{ minAchievementPct: number; maxAchievementPct: number | null; commissionPct: number }>): number {
  const sorted = [...tiers].sort((a, b) => a.minAchievementPct - b.minAchievementPct);
  for (const tier of sorted.reverse()) {
    if (achievementPct >= tier.minAchievementPct) {
      if (tier.maxAchievementPct === null || achievementPct <= tier.maxAchievementPct) {
        return Math.round((salesAmount * tier.commissionPct) / 100);
      }
    }
  }
  return 0;
}

/** تحديد شريحة الخصم بناءً على إجمالي المبيعات */
export function getDiscountTier(salesAmount: number, tiers: Array<{ minSales: string; maxSales: string | null; maxDiscountPct: number; label: string | null }>): { maxDiscountPct: number; label: string } | null {
  const sorted = [...tiers].sort((a, b) => parseFloat(b.minSales) - parseFloat(a.minSales));
  for (const tier of sorted) {
    const min = parseFloat(tier.minSales);
    const max = tier.maxSales ? parseFloat(tier.maxSales) : Infinity;
    if (salesAmount >= min && salesAmount < max) {
      return { maxDiscountPct: tier.maxDiscountPct, label: tier.label ?? '' };
    }
  }
  return null;
}

/** جلب أهداف المهندسين للشهر مع حساب الأداء الفعلي */
export async function getEngineersSalesPerformance(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const engList = await getEngineers();
  const targets = await db.select().from(engineerTargets)
    .where(and(eq(engineerTargets.year, year), eq(engineerTargets.month, month)));
  const wonDeals = await db.select().from(deals)
    .where(and(eq(deals.stage, 'closed_won'), between(deals.closedAt as any, startDate, endDate)));
  const allDeals = await db.select().from(deals)
    .where(between(deals.createdAt, startDate, endDate));
  const allVisits = await db.select().from(visits)
    .where(between(visits.scheduledAt, startDate, endDate));
  const commTiers = await db.select().from(commissionTiers).orderBy(commissionTiers.minAchievementPct);

  return engList.map(eng => {
    const targetRow = targets.find(t => t.engineerId === eng.id);
    const targetAmount = targetRow ? parseFloat(targetRow.targetAmount) : 0;
    const manpower = targetRow?.manpower ?? 1;

    const engWonDeals = wonDeals.filter(d => d.engineerId === eng.id);
    const actualSales = engWonDeals.reduce((s, d) => s + parseFloat(d.value), 0);
    const achievementPct = targetAmount > 0 ? Math.round((actualSales / targetAmount) * 100) : 0;
    const remaining = Math.max(0, targetAmount - actualSales);

    const engAllDeals = allDeals.filter(d => d.engineerId === eng.id);
    const engVisits = allVisits.filter(v => v.engineerId === eng.id);

    // حالة الأداء مقارنة بالوقت
    const now = new Date();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysPassed = year === now.getFullYear() && month === now.getMonth() + 1
      ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
    const timePct = Math.round((daysPassed / daysInMonth) * 100);
    const progressStatus = achievementPct >= timePct + 10 ? 'ahead' : achievementPct >= timePct - 10 ? 'on_track' : 'behind';

    // حساب الكوميشن
    const commission = calcCommission(achievementPct, actualSales, commTiers.map(t => ({
      minAchievementPct: t.minAchievementPct,
      maxAchievementPct: t.maxAchievementPct,
      commissionPct: t.commissionPct,
    })));

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      targetAmount,
      manpower,
      actualSales,
      achievementPct,
      remaining,
      progressStatus,
      commission,
      dealsCount: engAllDeals.length,
      closedWon: engWonDeals.length,
      visitsCount: engVisits.length,
    };
  });
}

/** إحصاءات Sales Control Tower الشاملة */
export async function getSalesControlStats(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // الهدف الشهري الإجمالي
  const targetRow = await db.select().from(monthlyTargets)
    .where(and(eq(monthlyTargets.year, year), eq(monthlyTargets.month, month))).limit(1);
  const totalTarget = targetRow.length > 0 ? parseFloat(targetRow[0].targetAmount) : 0;

  // المبيعات الفعلية
  const wonDeals = await db.select().from(deals)
    .where(and(eq(deals.stage, 'closed_won'), between(deals.closedAt as any, startDate, endDate)));
  const actualSales = wonDeals.reduce((s, d) => s + parseFloat(d.value), 0);
  const achievementRate = totalTarget > 0 ? Math.round((actualSales / totalTarget) * 100) : 0;
  const remaining = Math.max(0, totalTarget - actualSales);

  // الوقت
  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysPassed = year === now.getFullYear() && month === now.getMonth() + 1
    ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
  const daysRemaining = Math.max(0, daysInMonth - daysPassed);
  const timePct = Math.round((daysPassed / daysInMonth) * 100);
  const requiredDailyRate = daysRemaining > 0 ? Math.round(remaining / daysRemaining) : 0;

  // Capacity Planning
  const engTargets = await db.select().from(engineerTargets)
    .where(and(eq(engineerTargets.year, year), eq(engineerTargets.month, month)));
  const totalCapacity = engTargets.reduce((s, t) => s + parseFloat(t.targetAmount), 0);

  // Conversion Metrics
  const allVisits = await db.select({ total: count() }).from(visits)
    .where(between(visits.scheduledAt, startDate, endDate));
  const allLeads = await db.select({ total: count() }).from(leads)
    .where(between(leads.createdAt, startDate, endDate));
  const totalVisits = allVisits[0]?.total ?? 0;
  const totalLeads = allLeads[0]?.total ?? 0;
  const closedWonCount = wonDeals.length;
  const visitsToClosingRate = totalVisits > 0 ? Math.round((closedWonCount / totalVisits) * 100) : 0;
  const leadsToVisitsRate = totalLeads > 0 ? Math.round((totalVisits / totalLeads) * 100) : 0;

  // Pipeline (active deals)
  const pipelineDeals = await db.select().from(deals)
    .where(and(
      between(deals.createdAt, startDate, endDate),
      sql`${deals.stage} NOT IN ('closed_won', 'closed_lost')`
    )).orderBy(desc(deals.createdAt)).limit(20);

  // Discount tiers
  const discTiers = await db.select().from(discountTiers).orderBy(discountTiers.minSales);
  const currentDiscountTier = getDiscountTier(actualSales, discTiers.map(t => ({
    minSales: t.minSales,
    maxSales: t.maxSales,
    maxDiscountPct: t.maxDiscountPct,
    label: t.label,
  })));

  return {
    totalTarget, actualSales, achievementRate, remaining,
    daysInMonth, daysPassed, daysRemaining, timePct, requiredDailyRate,
    totalCapacity, visitsToClosingRate, leadsToVisitsRate,
    pipelineDeals, discountTiers: discTiers, currentDiscountTier,
    totalVisits, totalLeads, closedWonCount,
  };
}

/** جلب شرائح الخصم */
export async function getDiscountTiers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discountTiers).orderBy(discountTiers.minSales);
}

/** إضافة / تعديل شريحة خصم */
export async function upsertDiscountTier(data: { id?: number; minSales: number; maxSales?: number; maxDiscountPct: number; label?: string }) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(discountTiers).set({
      minSales: data.minSales.toString(),
      maxSales: data.maxSales?.toString() ?? null,
      maxDiscountPct: data.maxDiscountPct,
      label: data.label,
    }).where(eq(discountTiers.id, data.id));
  } else {
    await db.insert(discountTiers).values({
      minSales: data.minSales.toString(),
      maxSales: data.maxSales?.toString() ?? null,
      maxDiscountPct: data.maxDiscountPct,
      label: data.label,
    });
  }
}

export async function deleteDiscountTier(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(discountTiers).where(eq(discountTiers.id, id));
}

/** جلب شرائح الكوميشن */
export async function getCommissionTiers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(commissionTiers).orderBy(commissionTiers.minAchievementPct);
}

/** إضافة / تعديل شريحة كوميشن */
export async function upsertCommissionTier(data: { id?: number; minAchievementPct: number; maxAchievementPct?: number; commissionPct: number; label?: string }) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(commissionTiers).set({
      minAchievementPct: data.minAchievementPct,
      maxAchievementPct: data.maxAchievementPct ?? null,
      commissionPct: data.commissionPct,
      label: data.label,
    }).where(eq(commissionTiers.id, data.id));
  } else {
    await db.insert(commissionTiers).values({
      minAchievementPct: data.minAchievementPct,
      maxAchievementPct: data.maxAchievementPct ?? null,
      commissionPct: data.commissionPct,
      label: data.label,
    });
  }
}

export async function deleteCommissionTier(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(commissionTiers).where(eq(commissionTiers.id, id));
}

/** إضافة / تعديل هدف مهندس */
export async function upsertEngineerTarget(data: { engineerId: number; year: number; month: number; targetAmount: number; manpower?: number; notes?: string }) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(engineerTargets)
    .where(and(eq(engineerTargets.engineerId, data.engineerId), eq(engineerTargets.year, data.year), eq(engineerTargets.month, data.month))).limit(1);
  if (existing.length > 0) {
    await db.update(engineerTargets).set({
      targetAmount: data.targetAmount.toString(),
      manpower: data.manpower ?? 1,
      notes: data.notes,
    }).where(eq(engineerTargets.id, existing[0].id));
  } else {
    await db.insert(engineerTargets).values({
      engineerId: data.engineerId, year: data.year, month: data.month,
      targetAmount: data.targetAmount.toString(),
      manpower: data.manpower ?? 1,
      notes: data.notes,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FINANCIAL MODULE — Payment Tracking + Promises + Commission Split
// ════════════════════════════════════════════════════════════════════════════

/** حساب الكوميشن التصاعدي على المبلغ المحصّل */
export function calcProgressiveCommission(collected: number): number {
  if (collected < 1_000_000) return 0;
  let commission = 0;
  const tiers = [
    { from: 1_000_000, to: 1_250_000, rate: 0.01 },
    { from: 1_250_000, to: 1_500_000, rate: 0.0125 },
    { from: 1_500_000, to: 1_750_000, rate: 0.015 },
    { from: 1_750_000, to: 2_000_000, rate: 0.0175 },
    { from: 2_000_000, to: Infinity,  rate: 0.02 },
  ];
  for (const tier of tiers) {
    if (collected <= tier.from) break;
    const taxable = Math.min(collected, tier.to) - tier.from;
    commission += taxable * tier.rate;
  }
  // +0.25% لكل 250K فوق 2M
  if (collected > 2_000_000) {
    const extra = Math.floor((collected - 2_000_000) / 250_000);
    const extraRate = extra * 0.0025;
    commission += (collected - 2_000_000) * extraRate;
  }
  return Math.round(commission * 100) / 100;
}

/** جلب ملف العميل المالي الكامل (Client Financial Profile) */
export async function getClientFinancialProfile(collectionId: number) {
  const db = await getDb();
  if (!db) return null;
  const [col] = await db.select().from(collections).where(eq(collections.id, collectionId)).limit(1);
  if (!col) return null;
  const paymentsList = await db.select().from(payments).where(eq(payments.collectionId, collectionId));
  const promisesList = await db.select().from(paymentPromises).where(eq(paymentPromises.collectionId, collectionId));
  const commList = await db.select().from(commissionPayments).where(eq(commissionPayments.collectionId, collectionId));
  const totalPaid = paymentsList.reduce((s, p) => s + parseFloat(p.amount as string), 0);
  const contractAmt = parseFloat(col.contractAmount as string);
  const remaining = contractAmt - totalPaid;
  const pct = contractAmt > 0 ? Math.round((totalPaid / contractAmt) * 100) : 0;
  let status: "paid" | "partial" | "overdue" = "partial";
  if (pct >= 100) status = "paid";
  else if (col.status === "overdue") status = "overdue";
  return { collection: col, payments: paymentsList, promises: promisesList, commissions: commList, totalPaid, remaining, pct, status };
}

/** جلب كل العقود مع ملخص التحصيل */
export async function getAllCollectionsWithSummary(engineerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const cols = await db.select().from(collections);
  const results = await Promise.all(cols.map(async (col) => {
    const paymentsList = await db.select().from(payments).where(eq(payments.collectionId, col.id));
    const promisesList = await db.select().from(paymentPromises).where(eq(paymentPromises.collectionId, col.id));
    const totalPaid = paymentsList.reduce((s, p) => s + parseFloat(p.amount as string), 0);
    const contractAmt = parseFloat(col.contractAmount as string);
    const remaining = contractAmt - totalPaid;
    const pct = contractAmt > 0 ? Math.round((totalPaid / contractAmt) * 100) : 0;
    // حالة الكوميشن
    const commList = await db.select().from(commissionPayments).where(eq(commissionPayments.collectionId, col.id));
    const stage1 = commList.find(c => c.stage === "stage1");
    const stage2 = commList.find(c => c.stage === "stage2");
    return { ...col, totalPaid, remaining, pct, payments: paymentsList, promises: promisesList, stage1Commission: stage1 ?? null, stage2Commission: stage2 ?? null };
  }));
  return results;
}

/** إضافة دفعة جديدة وتحديث collectedAmount */
export async function addPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(payments).values(data);
  // تحديث collectedAmount في collections
  const allPayments = await db.select().from(payments).where(eq(payments.collectionId, data.collectionId));
  const total = allPayments.reduce((s, p) => s + parseFloat(p.amount as string), 0);
  const [col] = await db.select().from(collections).where(eq(collections.id, data.collectionId)).limit(1);
  if (col) {
    const contractAmt = parseFloat(col.contractAmount as string);
    const pct = contractAmt > 0 ? total / contractAmt : 0;
    let newStatus: "on_track" | "due_soon" | "overdue" | "completed" = col.status;
    if (pct >= 1) newStatus = "completed";
    await db.update(collections).set({ collectedAmount: total.toString(), status: newStatus, lastPaymentAt: new Date() }).where(eq(collections.id, data.collectionId));
    // تحقق من شرط Stage 1: 75% تحصيل → صرف 50% من الكوميشن
    await checkAndCreateCommissionStage(data.collectionId, total, contractAmt, pct);
  }
  return result;
}

/** تحقق وإنشاء كوميشن Stage 1 أو Stage 2 تلقائياً */
async function checkAndCreateCommissionStage(collectionId: number, totalPaid: number, contractAmt: number, pct: number) {
  const db = await getDb();
  if (!db) return;
  const [col] = await db.select().from(collections).where(eq(collections.id, collectionId)).limit(1);
  if (!col) return;
  // جلب المهندس المسؤول من أول دفعة
  const [firstPayment] = await db.select().from(payments).where(eq(payments.collectionId, collectionId)).limit(1);
  const engineerId = firstPayment?.engineerId;
  if (!engineerId) return;
  const totalCommission = calcProgressiveCommission(totalPaid);
  const halfCommission = totalCommission / 2;
  const existingComm = await db.select().from(commissionPayments).where(eq(commissionPayments.collectionId, collectionId));
  // Stage 1: عند 75% تحصيل
  if (pct >= 0.75 && !existingComm.find(c => c.stage === "stage1")) {
    await db.insert(commissionPayments).values({
      collectionId, engineerId, stage: "stage1",
      commissionAmount: halfCommission.toString(),
      status: "pending",
      triggerCondition: `تم تحصيل ${Math.round(pct * 100)}% من قيمة العقد (≥75%) — يستحق صرف 50% من الكوميشن`,
    });
  }
  // Stage 2: عند 100% تحصيل (أو استلام العميل)
  if (pct >= 1 && !existingComm.find(c => c.stage === "stage2")) {
    await db.insert(commissionPayments).values({
      collectionId, engineerId, stage: "stage2",
      commissionAmount: halfCommission.toString(),
      status: "pending",
      triggerCondition: `اكتمل التحصيل 100% — يستحق صرف 50% المتبقية من الكوميشن`,
    });
  }
}

/** إضافة وعد دفع */
export async function addPaymentPromise(data: InsertPaymentPromise) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(paymentPromises).values(data);
  return result;
}

/** تحديث حالة وعد الدفع */
export async function updatePromiseStatus(id: number, status: "pending" | "paid" | "overdue") {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (status === "paid") updateData.paidAt = new Date();
  await db.update(paymentPromises).set(updateData).where(eq(paymentPromises.id, id));
}

/** قائمة المتابعة اليومية */
export async function getDailyFollowUpList() {
  const db = await getDb();
  if (!db) return { dueToday: [], overdue: [], promisesDueToday: [], promisesOverdue: [] };
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().split("T")[0];
  // عقود مستحقة اليوم
  const dueToday = await db.select().from(collections).where(eq(collections.dueDate, todayStr as unknown as Date));
  // عقود متأخرة
  const overdue = await db.select().from(collections).where(eq(collections.status, "overdue"));
  // وعود دفع مستحقة اليوم
  const promisesDueToday = await db.select().from(paymentPromises).where(and(eq(paymentPromises.promiseDate, todayStr as unknown as Date), eq(paymentPromises.status, "pending")));
  // وعود دفع متأخرة
  const promisesOverdue = await db.select().from(paymentPromises).where(eq(paymentPromises.status, "overdue"));
  return { dueToday, overdue, promisesDueToday, promisesOverdue };
}

/** ملخص كوميشن المهندسين من التحصيل */
export async function getEngineersCollectionCommission() {
  const db = await getDb();
  if (!db) return [];
  const engs = await db.select().from(engineers).where(eq(engineers.status, "active"));
  const results = await Promise.all(engs.map(async (eng) => {
    const engPayments = await db.select().from(payments).where(eq(payments.engineerId, eng.id));
    const totalCollected = engPayments.reduce((s, p) => s + parseFloat(p.amount as string), 0);
    const totalCommission = calcProgressiveCommission(totalCollected);
    const commList = await db.select().from(commissionPayments).where(eq(commissionPayments.engineerId, eng.id));
    const commPaid = commList.filter(c => c.status === "paid").reduce((s, c) => s + parseFloat(c.commissionAmount as string), 0);
    const commPending = commList.filter(c => c.status === "pending").reduce((s, c) => s + parseFloat(c.commissionAmount as string), 0);
    const stage1 = commList.filter(c => c.stage === "stage1");
    const stage2 = commList.filter(c => c.stage === "stage2");
    return { engineer: eng, totalCollected, totalCommission, commPaid, commPending, stage1Count: stage1.length, stage2Count: stage2.length, stage1Pending: stage1.filter(c => c.status === "pending").length, stage2Pending: stage2.filter(c => c.status === "pending").length };
  }));
  return results;
}

/** تحديث حالة كوميشن (صرف) */
export async function markCommissionPaid(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(commissionPayments).set({ status: "paid", paidAt: new Date() }).where(eq(commissionPayments.id, id));
}

/** إضافة عقد جديد */
export async function addCollection(data: { clientName: string; contractAmount: number; dueDate?: string; dealId?: number; notes?: string }) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(collections).values({
    clientName: data.clientName,
    contractAmount: data.contractAmount.toString(),
    collectedAmount: "0",
    dueDate: data.dueDate as unknown as Date | undefined,
    dealId: data.dealId,
    notes: data.notes,
    status: "on_track",
  });
  return result;
}

/** تحديث حالة العقد */
export async function updateCollectionStatus(id: number, status: "on_track" | "due_soon" | "overdue" | "completed") {
  const db = await getDb();
  if (!db) return;
  await db.update(collections).set({ status }).where(eq(collections.id, id));
}

// ═══════════════════════════════════════════════════════════════════════
// Admin Sales Tasks
// ═══════════════════════════════════════════════════════════════════════

/** تعريف قوالب المهام اليومية لـ Admin Sales */
export const DAILY_TASK_TEMPLATES = [
  { key: 'crm_update',         title: 'متابعة تحديث CRM' },
  { key: 'task_distribution',  title: 'توزيع المهام اليومية على المهندسين' },
  { key: 'task_review',        title: 'مراجعة تنفيذ المهام' },
  { key: 'visit_data',         title: 'إدخال ومتابعة بيانات المعاينات' },
  { key: 'visit_collection',   title: 'متابعة تحصيلات المعاينات' },
  { key: 'lead_activity',      title: 'متابعة نشاط Lead Module' },
  { key: 'daily_target',       title: 'متابعة تحقيق Target المبيعات اليومي' },
];

/** قوالب المهام الأسبوعية حسب اليوم */
export const WEEKLY_TASK_TEMPLATES: { key: string; title: string; days: number[] }[] = [
  { key: 'lead_quality',         title: 'Testing جودة الـ Leads',                    days: [1, 4] }, // Mon, Thu
  { key: 'visit_collection_wed', title: 'متابعة تحصيلات المعاينات',                  days: [3] },    // Wed
  { key: 'contract_collection',  title: 'متابعة تحصيلات التعاقدات',                  days: [4] },    // Thu
  { key: 'delay_review',         title: 'مراجعة التأخيرات مع المهندسين',             days: [4] },    // Thu
  { key: 'accounting_coord',     title: 'التنسيق مع المحاسبة',                       days: [4] },    // Thu
  { key: 'timeline_update',      title: 'تحديث Timeline المشاريع',                   days: [6, 2] }, // Sat, Tue
  { key: 'delivery_review',      title: 'مراجعة مواعيد التسليم مع الإنتاج',         days: [6, 2] }, // Sat, Tue
];

/** قوالب المهام الشهرية حسب اليوم من الشهر */
export const MONTHLY_TASK_TEMPLATES: { key: string; title: string; dayOfMonth: number }[] = [
  { key: 'contract_review',   title: 'مراجعة العقود الورقية ورفعها على السيرفر', dayOfMonth: 15 },
  { key: 'market_share',      title: 'تحليل Market Share ومتابعة أسعار المنافسين', dayOfMonth: 22 },
  { key: 'kpi_export',        title: 'Export KPI Report من النظام',              dayOfMonth: 28 },
  { key: 'kpi_send',          title: 'إرسال التقرير للحسابات',                   dayOfMonth: 28 },
  { key: 'commission_review', title: 'مراجعة الكوميشن والحوافز',                dayOfMonth: 28 },
  { key: 'performance_notes', title: 'إضافة ملاحظات الأداء',                    dayOfMonth: 28 },
];

/** توليد مهام اليوم لـ Admin Sales */
export async function generateAdminSalesDailyTasks(engineerId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  // التحقق من وجود مهام لهذا اليوم
  const existing = await db.select().from(adminSalesTasks)
    .where(and(eq(adminSalesTasks.engineerId, engineerId), eq(adminSalesTasks.taskDate, new Date(date + 'T00:00:00')), eq(adminSalesTasks.taskType, 'daily')));
  if (existing.length > 0) return existing;
  // إنشاء المهام اليومية
  const toInsert: InsertAdminSalesTask[] = DAILY_TASK_TEMPLATES.map(t => ({
    engineerId, taskType: 'daily' as const, taskKey: t.key,
    taskTitle: t.title, taskDate: new Date(date + 'T00:00:00'), status: 'pending' as const,
  }));
  await db.insert(adminSalesTasks).values(toInsert);
  return db.select().from(adminSalesTasks)
    .where(and(eq(adminSalesTasks.engineerId, engineerId), eq(adminSalesTasks.taskDate, new Date(date + 'T00:00:00')), eq(adminSalesTasks.taskType, 'daily')));
}

/** توليد المهام الأسبوعية لـ Admin Sales بناءً على يوم الأسبوع */
export async function generateAdminSalesWeeklyTasks(engineerId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  const dayOfWeek = new Date(date).getDay(); // 0=Sun, 1=Mon, ...
  const templates = WEEKLY_TASK_TEMPLATES.filter(t => t.days.includes(dayOfWeek));
  if (templates.length === 0) return [];
  const existing = await db.select().from(adminSalesTasks)
    .where(and(eq(adminSalesTasks.engineerId, engineerId), eq(adminSalesTasks.taskDate, new Date(date + 'T00:00:00')), eq(adminSalesTasks.taskType, 'weekly')));
  if (existing.length > 0) return existing;
  const toInsert: InsertAdminSalesTask[] = templates.map(t => ({
    engineerId, taskType: 'weekly' as const, taskKey: t.key,
    taskTitle: t.title, taskDate: new Date(date + 'T00:00:00'), dayOfWeek, status: 'pending' as const,
  }));
  await db.insert(adminSalesTasks).values(toInsert);
  return db.select().from(adminSalesTasks)
    .where(and(eq(adminSalesTasks.engineerId, engineerId), eq(adminSalesTasks.taskDate, new Date(date + 'T00:00:00')), eq(adminSalesTasks.taskType, 'weekly')));
}

/** توليد المهام الشهرية لـ Admin Sales بناءً على يوم الشهر */
export async function generateAdminSalesMonthlyTasks(engineerId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  const dayOfMonth = new Date(date).getDate();
  const templates = MONTHLY_TASK_TEMPLATES.filter(t => t.dayOfMonth === dayOfMonth);
  if (templates.length === 0) return [];
  const existing = await db.select().from(adminSalesTasks)
    .where(and(eq(adminSalesTasks.engineerId, engineerId), eq(adminSalesTasks.taskDate, new Date(date + 'T00:00:00')), eq(adminSalesTasks.taskType, 'monthly')));
  if (existing.length > 0) return existing;
  const toInsert: InsertAdminSalesTask[] = templates.map(t => ({
    engineerId, taskType: 'monthly' as const, taskKey: t.key,
    taskTitle: t.title, taskDate: new Date(date + 'T00:00:00'), dayOfMonth, status: 'pending' as const,
  }));
  await db.insert(adminSalesTasks).values(toInsert);
  return db.select().from(adminSalesTasks)
    .where(and(eq(adminSalesTasks.engineerId, engineerId), eq(adminSalesTasks.taskDate, new Date(date + 'T00:00:00')), eq(adminSalesTasks.taskType, 'monthly')));
}

/** جلب مهام Admin Sales ليوم معين */
export async function getAdminSalesTasks(engineerId: number, date: string) {
  const db = await getDb();
  if (!db) return { daily: [], weekly: [], monthly: [] };
  // توليد المهام تلقائياً إذا لم تكن موجودة
  await generateAdminSalesDailyTasks(engineerId, date);
  await generateAdminSalesWeeklyTasks(engineerId, date);
  await generateAdminSalesMonthlyTasks(engineerId, date);
  const all = await db.select().from(adminSalesTasks)
    .where(and(eq(adminSalesTasks.engineerId, engineerId), eq(adminSalesTasks.taskDate, new Date(date + 'T00:00:00'))))
    .orderBy(adminSalesTasks.taskType);
  return {
    daily:   all.filter(t => t.taskType === 'daily'),
    weekly:  all.filter(t => t.taskType === 'weekly'),
    monthly: all.filter(t => t.taskType === 'monthly'),
  };
}

/** تحديث حالة مهمة Admin Sales */
export async function updateAdminSalesTaskStatus(
  taskId: number,
  status: 'pending' | 'done' | 'delayed' | 'not_done',
  notes?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminSalesTasks).set({
    status,
    completedAt: status === 'done' ? new Date() : null,
    notes: notes ?? null,
  }).where(eq(adminSalesTasks.id, taskId));
}

/** جلب أو إنشاء سجل الاجتماعات الأسبوعية */
export async function getOrCreateWeekMeeting(engineerId: number, weekStart: string) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(adminSalesMeetings)
    .where(and(eq(adminSalesMeetings.engineerId, engineerId), eq(adminSalesMeetings.weekStartDate, new Date(weekStart + 'T00:00:00'))));
  if (existing.length > 0) return existing[0];
  await db.insert(adminSalesMeetings).values({ engineerId, weekStartDate: new Date(weekStart + 'T00:00:00') });
  const created = await db.select().from(adminSalesMeetings)
    .where(and(eq(adminSalesMeetings.engineerId, engineerId), eq(adminSalesMeetings.weekStartDate, new Date(weekStart + 'T00:00:00'))));
  return created[0] ?? null;
}

/** تحديث سجل الاجتماعات الأسبوعية */
export async function updateWeekMeeting(
  id: number,
  data: Partial<{ weeklyTeamMeeting: 'done'|'not_done'|'pending'; managementMeeting: 'done'|'not_done'|'pending'; reportSubmitted: 'yes'|'no'|'pending'; meetingNotes: string }>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminSalesMeetings).set(data).where(eq(adminSalesMeetings.id, id));
}

/** إحصائيات Admin Sales للمدير */
export async function getAdminSalesStats(engineerId: number, month: string) {
  const db = await getDb();
  if (!db) return null;
  const [year, m] = month.split('-').map(Number);
  const startDate = `${year}-${String(m).padStart(2,'0')}-01`;
  const endDate = `${year}-${String(m).padStart(2,'0')}-31`;
  const tasks = await db.select().from(adminSalesTasks)
    .where(and(
      eq(adminSalesTasks.engineerId, engineerId),
      gte(adminSalesTasks.taskDate, new Date(startDate + 'T00:00:00')),
      lte(adminSalesTasks.taskDate, new Date(endDate + 'T00:00:00'))
    ));
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const delayed = tasks.filter(t => t.status === 'delayed').length;
  const notDone = tasks.filter(t => t.status === 'not_done').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  const byType = {
    daily:   { total: 0, done: 0, delayed: 0 },
    weekly:  { total: 0, done: 0, delayed: 0 },
    monthly: { total: 0, done: 0, delayed: 0 },
  };
  tasks.forEach(t => {
    if (t.taskType === 'daily' || t.taskType === 'weekly' || t.taskType === 'monthly') {
      byType[t.taskType].total++;
      if (t.status === 'done') byType[t.taskType].done++;
      if (t.status === 'delayed') byType[t.taskType].delayed++;
    }
  });
  return { total, done, delayed, notDone, pending, completionRate, byType };
}

// ─── Management Focus ─────────────────────────────────────────────────────────
export async function getManagementFocus(year: number, month: number) {
  const db = await getDb();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  // ── 1. Admin Sales Performance ────────────────────────────────────────────
  // جلب كل المهندسين من نوع admin_sales
  const adminSalesEngineers = db
    ? await db.select().from(engineers).where(eq(engineers.role, 'admin_sales' as any))
    : [];

  let adminSalesKPI = 0;
  let adminSalesErrors = 0;
  let adminSalesDelays = 0;
  let adminSalesTotal = 0;
  let adminSalesDone = 0;

  for (const eng of adminSalesEngineers) {
    const stats = await getAdminSalesStats(eng.id, monthStr);
    if (stats) {
      adminSalesTotal += stats.total;
      adminSalesDone += stats.done;
      adminSalesErrors += stats.notDone;
      adminSalesDelays += stats.delayed;
    }
  }
  adminSalesKPI = adminSalesTotal > 0 ? Math.round((adminSalesDone / adminSalesTotal) * 100) : 0;

  // Status تلقائي
  let adminSalesStatus: 'good' | 'needs_attention' | 'critical' = 'good';
  if (adminSalesKPI < 50 || adminSalesErrors > 5) adminSalesStatus = 'critical';
  else if (adminSalesKPI < 75 || adminSalesDelays > 3) adminSalesStatus = 'needs_attention';

  // ── 2. Campaign Performance (Leads) ──────────────────────────────────────
  const leadsStats = await getLeadsStats(year, month);
  const leadsTotal = leadsStats?.total ?? 0;
  const leadsQualified = leadsStats?.qualified ?? 0;
  const leadsConverted = leadsStats?.converted ?? 0;
  const leadsDelayedRate = leadsStats?.delayedRate ?? 0;
  const leadsQualityRate = leadsTotal > 0 ? Math.round((leadsQualified / leadsTotal) * 100) : 0;
  const leadsConversionRate = leadsTotal > 0 ? Math.round((leadsConverted / leadsTotal) * 100) : 0;

  let campaignStatus: 'strong' | 'medium' | 'weak' = 'strong';
  if (leadsTotal < 5 || leadsQualityRate < 20) campaignStatus = 'weak';
  else if (leadsQualityRate < 40 || leadsDelayedRate > 40) campaignStatus = 'medium';

  // ── 3. Smart Alerts ───────────────────────────────────────────────────────
  const alerts: { severity: 'critical' | 'warning' | 'info'; category: string; message: string }[] = [];

  // تأخير التحصيل
  const collectionsStats = await getCollectionsStats();
  if (collectionsStats && collectionsStats.overdue > 0) {
    alerts.push({
      severity: 'critical',
      category: 'تحصيل',
      message: `مبالغ متأخرة: ${collectionsStats.overdue.toLocaleString('ar-EG')} ج.م تحتاج متابعة فورية`,
    });
  }
  if (collectionsStats && collectionsStats.collectionRate < 60) {
    alerts.push({
      severity: 'warning',
      category: 'تحصيل',
      message: `معدل التحصيل منخفض: ${collectionsStats.collectionRate}% فقط`,
    });
  }

  // انخفاض KPI المهندسين
  const kpiData = await getEngineersKPI(year, month);
  if (kpiData) {
    const lowKPI = kpiData.filter((e: any) => e.kpiScore < 60);
    const medKPI = kpiData.filter((e: any) => e.kpiScore >= 60 && e.kpiScore < 75);
    if (lowKPI.length > 0) {
      alerts.push({
        severity: 'critical',
        category: 'KPI',
        message: `${lowKPI.length} مهندس KPI أقل من 60% — الكوميشن والحافز محجوب`,
      });
    }
    if (medKPI.length > 0) {
      alerts.push({
        severity: 'warning',
        category: 'KPI',
        message: `${medKPI.length} مهندس KPI بين 60-75% — الحافز غير متاح`,
      });
    }
  }

  // ضعف الـ Leads
  if (leadsTotal < 10) {
    alerts.push({
      severity: 'warning',
      category: 'Leads',
      message: `عدد الـ Leads هذا الشهر منخفض: ${leadsTotal} فقط`,
    });
  }
  if (leadsDelayedRate > 40) {
    alerts.push({
      severity: 'critical',
      category: 'Leads',
      message: `نسبة التأخير في الرد على العملاء المحتملين: ${leadsDelayedRate}% — يتجاوز الحد المقبول`,
    });
  }
  if (leadsQualityRate < 25 && leadsTotal > 0) {
    alerts.push({
      severity: 'warning',
      category: 'Leads',
      message: `جودة الـ Leads ضعيفة: ${leadsQualityRate}% فقط مؤهلة`,
    });
  }

  // مشاكل تنفيذ المهام
  const taskStats = await getDailyTasksStats(todayStr);
  if (taskStats && (taskStats as any).critical > 0) {
    alerts.push({
      severity: 'critical',
      category: 'مهام',
      message: `${(taskStats as any).critical} مهمة حرجة — تأخير أكثر من يومين`,
    });
  }
  if (taskStats && taskStats.not_done > 3) {
    alerts.push({
      severity: 'warning',
      category: 'مهام',
      message: `${taskStats.not_done} مهمة لم تُنفذ اليوم`,
    });
  }

  // Admin Sales أداء ضعيف
  if (adminSalesStatus === 'critical') {
    alerts.push({
      severity: 'critical',
      category: 'Admin Sales',
      message: `أداء Admin Sales ضعيف: KPI ${adminSalesKPI}% — ${adminSalesErrors} أخطاء هذا الشهر`,
    });
  } else if (adminSalesStatus === 'needs_attention') {
    alerts.push({
      severity: 'warning',
      category: 'Admin Sales',
      message: `Admin Sales يحتاج متابعة: ${adminSalesDelays} تأخيرات هذا الشهر`,
    });
  }

  return {
    adminSales: {
      kpi: adminSalesKPI,
      errors: adminSalesErrors,
      delays: adminSalesDelays,
      total: adminSalesTotal,
      done: adminSalesDone,
      status: adminSalesStatus,
      engineerCount: adminSalesEngineers.length,
    },
    campaign: {
      total: leadsTotal,
      qualified: leadsQualified,
      converted: leadsConverted,
      qualityRate: leadsQualityRate,
      conversionRate: leadsConversionRate,
      delayedRate: leadsDelayedRate,
      status: campaignStatus,
    },
    alerts: alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    }),
  };
}

// ─── Meeting Recording & Review ───────────────────────────────────────────────

/**
 * تقديم رابط تسجيل الميتينج لمهمة Closing/Meeting
 * يُحدّث الـ task بالرابط ووقت الإرسال
 */
export async function submitMeetingRecordingLink(taskId: number, link: string) {
  const db = await getDb();
  if (!db) return null;
  await db.update(dailyTasks)
    .set({ meetingRecordingLink: link, recordingSubmittedAt: new Date() })
    .where(eq(dailyTasks.id, taskId));
  const [task] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, taskId));
  // ─── Notification لـ Admin Sales ────────────────────────────────────────────────────────────────────────────────
  if (task) {
    await notifyOwner({
      title: 'تسجيل ميتينج جديد بحاجة مراجعة',
      content: `تم رفع رابط تسجيل لمهمة: "${task.title}"\nالرابط: ${link}\nيرجى مراجعة الميتينج وتقييمه.`,
    }).catch(() => {}); // لا يوقف التنفيذ عند فشل الإشعار
  }
  return task ?? null;
}

/**
 * إنشاء أو تحديث تقييم الميتينج (Admin Sales يقيّم)
 */
export async function upsertMeetingReview(data: {
  taskId: number;
  engineerId: number;
  reviewedBy?: number;
  openingScore: number;      // max 10
  understandingScore: number; // max 20
  presentationScore: number;  // max 20
  objectionScore: number;     // max 25
  closingScore: number;       // max 25
  comments?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const total = data.openingScore + data.understandingScore + data.presentationScore
    + data.objectionScore + data.closingScore;
  // Check if review already exists
  const [existing] = await db.select().from(meetingReviews).where(eq(meetingReviews.taskId, data.taskId));
  if (existing) {
    await db.update(meetingReviews).set({
      openingScore: data.openingScore,
      understandingScore: data.understandingScore,
      presentationScore: data.presentationScore,
      objectionScore: data.objectionScore,
      closingScore: data.closingScore,
      totalScore: total,
      comments: data.comments ?? null,
      reviewedBy: data.reviewedBy ?? null,
    }).where(eq(meetingReviews.taskId, data.taskId));
    const [updated] = await db.select().from(meetingReviews).where(eq(meetingReviews.taskId, data.taskId));
    return updated ?? null;
  } else {
    await db.insert(meetingReviews).values({
      taskId: data.taskId,
      engineerId: data.engineerId,
      reviewedBy: data.reviewedBy ?? null,
      openingScore: data.openingScore,
      understandingScore: data.understandingScore,
      presentationScore: data.presentationScore,
      objectionScore: data.objectionScore,
      closingScore: data.closingScore,
      totalScore: total,
      comments: data.comments ?? null,
    });
    const [created] = await db.select().from(meetingReviews).where(eq(meetingReviews.taskId, data.taskId));
    return created ?? null;
  }
}

/**
 * جلب تقييم الميتينج لمهمة معينة
 */
export async function getMeetingReview(taskId: number) {
  const db = await getDb();
  if (!db) return null;
  const [review] = await db.select().from(meetingReviews).where(eq(meetingReviews.taskId, taskId));
  return review ?? null;
}

/**
 * جلب متوسط Closing Quality Score لمهندس في شهر معين
 * يُستخدم في حساب KPI
 */
export async function getEngineerClosingQualityScore(engineerId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  // جلب المهام من نوع closing/meeting في هذا الشهر
  const tasks = await db.select().from(dailyTasks)
    .where(and(
      eq(dailyTasks.engineerId, engineerId),
      gte(dailyTasks.taskDate, startDate),
      lte(dailyTasks.taskDate, endDate),
      or(eq(dailyTasks.category, 'closing'), eq(dailyTasks.category, 'meeting'))
    ));
  if (tasks.length === 0) return null;
  const taskIds = tasks.map(t => t.id);
  // جلب التقييمات لهذه المهام
  const reviews = await db.select().from(meetingReviews)
    .where(and(
      eq(meetingReviews.engineerId, engineerId),
      sql`${meetingReviews.taskId} IN (${sql.join(taskIds.map(id => sql`${id}`), sql`, `)})`
    ));
  if (reviews.length === 0) return null;
  const avgScore = reviews.reduce((s, r) => s + r.totalScore, 0) / reviews.length;
  const missingRecordings = tasks.filter(t => !t.meetingRecordingLink).length;
  return {
    avgScore: Math.round(avgScore * 10) / 10,
    reviewCount: reviews.length,
    taskCount: tasks.length,
    missingRecordings,
    commissionBlocked: missingRecordings > 0,
  };
}

// ─── Lead Followup Tracking ────────────────────────────────────────────────────
// يسجل Admin Sales نتيجة مراجعة WhatsApp ومتابعة الـ Leads يومياً

/** تسجيل نتيجة متابعة Lead يومية */
export async function logLeadFollowup(data: {
  logDate: string;
  adminSalesId: number;
  telesalesId: number;
  followupStatus: 'followed_up' | 'delayed' | 'no_response';
  responseDelayHours?: number;
  followupQuality?: 'excellent' | 'good' | 'poor';
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const dateObj = new Date(data.logDate);
  await db.insert(leadFollowupLogs).values({
    logDate: dateObj,
    adminSalesId: data.adminSalesId,
    telesalesId: data.telesalesId,
    followupStatus: data.followupStatus,
    responseDelayHours: data.responseDelayHours ?? null,
    followupQuality: data.followupQuality ?? null,
    notes: data.notes ?? null,
  });
  return { success: true };
}

/** جلب سجلات المتابعة لتاريخ محدد أو نطاق */
export async function getLeadFollowupLogs(filters: {
  startDate?: string;
  endDate?: string;
  adminSalesId?: number;
  telesalesId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.startDate) conditions.push(gte(leadFollowupLogs.logDate, new Date(filters.startDate)));
  if (filters.endDate) conditions.push(lte(leadFollowupLogs.logDate, new Date(filters.endDate)));
  if (filters.adminSalesId) conditions.push(eq(leadFollowupLogs.adminSalesId, filters.adminSalesId));
  if (filters.telesalesId) conditions.push(eq(leadFollowupLogs.telesalesId, filters.telesalesId));
  return db.select().from(leadFollowupLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leadFollowupLogs.logDate));
}

/** إحصائيات KPI لـ Admin Sales (دقة المتابعة + اكتشاف التأخيرات) */
export async function getAdminSalesFollowupKPI(adminSalesId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;
  const logs = await db.select().from(leadFollowupLogs)
    .where(and(
      eq(leadFollowupLogs.adminSalesId, adminSalesId),
      gte(leadFollowupLogs.logDate, new Date(startDate)),
      lte(leadFollowupLogs.logDate, new Date(endDate))
    ));
  if (logs.length === 0) return { totalLogs: 0, followedUp: 0, delayed: 0, noResponse: 0, accuracyScore: 100, detectionScore: 100 };
  const followedUp = logs.filter(l => l.followupStatus === 'followed_up').length;
  const delayed = logs.filter(l => l.followupStatus === 'delayed').length;
  const noResponse = logs.filter(l => l.followupStatus === 'no_response').length;
  // دقة المتابعة: نسبة الـ logs المسجلة يومياً
  const accuracyScore = Math.round((followedUp / logs.length) * 100);
  // اكتشاف التأخيرات: نسبة الـ delayed التي تم اكتشافها (كلما زادت = أفضل)
  const detectionScore = logs.length > 0 ? Math.round(((followedUp + delayed) / logs.length) * 100) : 100;
  return { totalLogs: logs.length, followedUp, delayed, noResponse, accuracyScore, detectionScore };
}

/** إحصائيات KPI لـ Tele-sales (سرعة الرد + جودة المتابعة) */
export async function getTelesalesFollowupKPI(telesalesId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;
  const logs = await db.select().from(leadFollowupLogs)
    .where(and(
      eq(leadFollowupLogs.telesalesId, telesalesId),
      gte(leadFollowupLogs.logDate, new Date(startDate)),
      lte(leadFollowupLogs.logDate, new Date(endDate))
    ));
  if (logs.length === 0) return { totalLogs: 0, followedUp: 0, delayed: 0, noResponse: 0, responseScore: 100, qualityScore: 100, overallScore: 100 };
  const followedUp = logs.filter(l => l.followupStatus === 'followed_up').length;
  const delayed = logs.filter(l => l.followupStatus === 'delayed').length;
  const noResponse = logs.filter(l => l.followupStatus === 'no_response').length;
  // سرعة الرد: no_response = 0, delayed = 50, followed_up = 100
  const responseScore = Math.round(((followedUp * 100 + delayed * 50) / (logs.length * 100)) * 100);
  // جودة المتابعة: excellent=100, good=75, poor=25
  const qualityLogs = logs.filter(l => l.followupQuality !== null);
  const qualityScore = qualityLogs.length > 0
    ? Math.round(qualityLogs.reduce((s, l) => s + (l.followupQuality === 'excellent' ? 100 : l.followupQuality === 'good' ? 75 : 25), 0) / qualityLogs.length)
    : 100;
  const overallScore = Math.round(responseScore * 0.6 + qualityScore * 0.4);
  return { totalLogs: logs.length, followedUp, delayed, noResponse, responseScore, qualityScore, overallScore };
}

/** إحصائيات شاملة لجميع Tele-sales في فترة محددة */
export async function getAllTelesalesFollowupStats(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  const engList = await getEngineers();
  const logs = await db.select().from(leadFollowupLogs)
    .where(and(
      gte(leadFollowupLogs.logDate, new Date(startDate)),
      lte(leadFollowupLogs.logDate, new Date(endDate))
    ));
  // تجميع حسب telesalesId
  const grouped = engList.map(eng => {
    const engLogs = logs.filter(l => l.telesalesId === eng.id);
    if (engLogs.length === 0) return { engineerId: eng.id, engineerName: eng.name, totalLogs: 0, followedUp: 0, delayed: 0, noResponse: 0, responseScore: 100, qualityScore: 100, overallScore: 100 };
    const followedUp = engLogs.filter(l => l.followupStatus === 'followed_up').length;
    const delayed = engLogs.filter(l => l.followupStatus === 'delayed').length;
    const noResponse = engLogs.filter(l => l.followupStatus === 'no_response').length;
    const responseScore = Math.round(((followedUp * 100 + delayed * 50) / (engLogs.length * 100)) * 100);
    const qualityLogs = engLogs.filter(l => l.followupQuality !== null);
    const qualityScore = qualityLogs.length > 0
      ? Math.round(qualityLogs.reduce((s, l) => s + (l.followupQuality === 'excellent' ? 100 : l.followupQuality === 'good' ? 75 : 25), 0) / qualityLogs.length)
      : 100;
    const overallScore = Math.round(responseScore * 0.6 + qualityScore * 0.4);
    return { engineerId: eng.id, engineerName: eng.name, totalLogs: engLogs.length, followedUp, delayed, noResponse, responseScore, qualityScore, overallScore };
  });
  return grouped.filter(g => g.totalLogs > 0);
}

// ─── Visits Extended Functions ────────────────────────────────────────────────

/** Soft-delete a visit with reason */
export async function softDeleteVisit(id: number, reason: 'client_cancelled' | 'postponed' | 'data_entry_error') {
  const db = await getDb();
  if (!db) return;
  await db.update(visits).set({
    isDeleted: 1,
    deleteReason: reason,
    deletedAt: new Date(),
  }).where(eq(visits.id, id));
}

/** Get visits debt: completed visits with fee > 0 and not collected */
export async function getVisitsDebt() {
  const db = await getDb();
  if (!db) return [];
  const debtVisits = await db.select().from(visits).where(
    and(
      eq(visits.isDeleted, 0),
      eq(visits.status, 'completed'),
      eq(visits.feeCollected, 0),
      sql`${visits.feeAmount} > 0`
    )
  ).orderBy(desc(visits.scheduledAt));
  return debtVisits;
}

/** Get visits alerts: not confirmed, not uploaded, debt */
export async function getVisitsAlerts() {
  const db = await getDb();
  if (!db) return { notConfirmed: [], notUploaded: [], debt: [] };
  const activeVisits = await db.select().from(visits).where(
    and(eq(visits.isDeleted, 0), ne(visits.status, 'cancelled'))
  );
  const notConfirmed = activeVisits.filter(v =>
    v.status === 'completed' && v.confirmationStatus === 'not_confirmed'
  );
  const notUploaded = activeVisits.filter(v =>
    v.status === 'completed' && v.uploadStatus === 'not_uploaded'
  );
  const debt = activeVisits.filter(v =>
    v.status === 'completed' && v.feeCollected === 0 && parseFloat(v.feeAmount) > 0
  );
  return { notConfirmed, notUploaded, debt };
}

/** Get daily tracking status: visits updated today vs total active */
export async function getVisitsDailyTracking(date: string) {
  const db = await getDb();
  if (!db) return { totalActive: 0, updatedToday: 0, pendingUpdate: 0, missingUpdate: false };
  const dayStart = new Date(date + 'T00:00:00');
  const dayEnd = new Date(date + 'T23:59:59');
  const allActive = await db.select().from(visits).where(
    and(eq(visits.isDeleted, 0), ne(visits.status, 'cancelled'))
  );
  const updatedToday = allActive.filter(v =>
    v.lastUpdatedByAdminAt && v.lastUpdatedByAdminAt >= dayStart && v.lastUpdatedByAdminAt <= dayEnd
  ).length;
  const totalActive = allActive.length;
  const pendingUpdate = totalActive - updatedToday;
  return { totalActive, updatedToday, pendingUpdate, missingUpdate: pendingUpdate > 0 };
}

/** Update visit with admin tracking timestamp */
export async function updateVisitWithAdminTracking(id: number, data: {
  status?: string; quality?: string; delayMinutes?: number; notes?: string;
  confirmationStatus?: string; confirmationDelayHours?: number;
  uploadStatus?: string; deliveredToAdmin?: boolean; deliveryDelayHours?: number;
  groupStatus?: string; assignedToDesigner?: boolean;
  feeAmount?: number; feeCollected?: boolean;
  paymentScreenshotUrl?: string; paymentDate?: Date;
  bookingStatus?: string; adminSalesId?: number;
  debtFollowedUp?: boolean;
  scheduledAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { lastUpdatedByAdminAt: new Date() };
  if (data.scheduledAt) updateData.scheduledAt = data.scheduledAt;
  if (data.status) { updateData.status = data.status; if (['completed', 'delayed'].includes(data.status)) updateData.actualAt = new Date(); }
  if (data.quality) updateData.quality = data.quality;
  if (data.delayMinutes !== undefined) updateData.delayMinutes = data.delayMinutes;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.confirmationStatus) { updateData.confirmationStatus = data.confirmationStatus; updateData.confirmedAt = new Date(); }
  if (data.confirmationDelayHours !== undefined) updateData.confirmationDelayHours = data.confirmationDelayHours;
  if (data.uploadStatus) { updateData.uploadStatus = data.uploadStatus; updateData.uploadedAt = new Date(); }
  if (data.deliveredToAdmin !== undefined) updateData.deliveredToAdmin = data.deliveredToAdmin ? 1 : 0;
  if (data.deliveryDelayHours !== undefined) updateData.deliveryDelayHours = data.deliveryDelayHours;
  if (data.groupStatus) updateData.groupStatus = data.groupStatus;
  if (data.assignedToDesigner !== undefined) updateData.assignedToDesigner = data.assignedToDesigner ? 1 : 0;
  if (data.feeAmount !== undefined) updateData.feeAmount = String(data.feeAmount);
  if (data.feeCollected !== undefined) updateData.feeCollected = data.feeCollected ? 1 : 0;
  if (data.paymentScreenshotUrl) updateData.paymentScreenshotUrl = data.paymentScreenshotUrl;
  if (data.paymentDate) updateData.paymentDate = data.paymentDate;
  if (data.bookingStatus) updateData.bookingStatus = data.bookingStatus;
  if (data.adminSalesId !== undefined) updateData.adminSalesId = data.adminSalesId;
  if (data.debtFollowedUp !== undefined) updateData.debtFollowedUp = data.debtFollowedUp ? 1 : 0;
  await db.update(visits).set(updateData).where(eq(visits.id, id));
}

/** Get Admin Sales KPI for visits: daily update compliance, debt follow-up, distribution delay */
export async function getAdminSalesVisitsKPI(year: number, month: number) {
  const db = await getDb();
  if (!db) return { dailyUpdateScore: 100, debtFollowupScore: 100, distributionScore: 100, overallScore: 100 };
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const monthVisits = await db.select().from(visits).where(
    and(eq(visits.isDeleted, 0), between(visits.scheduledAt, startDate, endDate))
  );
  // Distribution delay score: visits with no delay = good
  const totalVisits = monthVisits.length;
  if (totalVisits === 0) return { dailyUpdateScore: 100, debtFollowupScore: 100, distributionScore: 100, overallScore: 100 };
  const delayedDistribution = monthVisits.filter(v => v.bookingStatus === 'distribution_delayed').length;
  const distributionScore = Math.round(((totalVisits - delayedDistribution) / totalVisits) * 100);
  // Debt follow-up score: completed visits with debt - how many were followed up
  const debtVisits = monthVisits.filter(v => v.status === 'completed' && v.feeCollected === 0 && parseFloat(v.feeAmount) > 0);
  const followedUpDebt = debtVisits.filter(v => v.debtFollowedUp === 1).length;
  const debtFollowupScore = debtVisits.length > 0 ? Math.round((followedUpDebt / debtVisits.length) * 100) : 100;
  // Daily update score: visits updated by admin (lastUpdatedByAdminAt set)
  const updatedVisits = monthVisits.filter(v => v.lastUpdatedByAdminAt !== null).length;
  const dailyUpdateScore = Math.round((updatedVisits / totalVisits) * 100);
  const overallScore = Math.round(dailyUpdateScore * 0.4 + debtFollowupScore * 0.35 + distributionScore * 0.25);
  return { dailyUpdateScore, debtFollowupScore, distributionScore, overallScore, totalVisits, debtVisits: debtVisits.length, followedUpDebt };
}

/** Get engineer visits KPI: confirmation, upload, execution scores */
export async function getEngineerVisitsKPI(engineerId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return { confirmationScore: 100, uploadScore: 100, executionScore: 100, overallScore: 100 };
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const engVisits = await db.select().from(visits).where(
    and(
      eq(visits.engineerId, engineerId),
      eq(visits.isDeleted, 0),
      between(visits.scheduledAt, startDate, endDate)
    )
  );
  const completed = engVisits.filter(v => v.status === 'completed');
  if (completed.length === 0) return { confirmationScore: 100, uploadScore: 100, executionScore: 100, overallScore: 100 };
  // Confirmation score
  const confirmedSameDay = completed.filter(v => v.confirmationStatus === 'confirmed_same_day').length;
  const confirmedLate = completed.filter(v => v.confirmationStatus === 'confirmed_late').length;
  const confirmationScore = Math.round(((confirmedSameDay * 100 + confirmedLate * 60) / (completed.length * 100)) * 100);
  // Upload score
  const uploadedSameDay = completed.filter(v => v.uploadStatus === 'uploaded_same_day').length;
  const uploadedLate = completed.filter(v => v.uploadStatus === 'uploaded_late').length;
  const uploadScore = Math.round(((uploadedSameDay * 100 + uploadedLate * 60) / (completed.length * 100)) * 100);
  // Execution score: delayed visits = penalty
  const delayed = engVisits.filter(v => v.status === 'delayed').length;
  const total = engVisits.filter(v => !['cancelled', 'rescheduled'].includes(v.status)).length;
  const executionScore = total > 0 ? Math.round(((total - delayed) / total) * 100) : 100;
  const overallScore = Math.round(confirmationScore * 0.35 + uploadScore * 0.35 + executionScore * 0.30);
  return { confirmationScore, uploadScore, executionScore, overallScore, totalVisits: engVisits.length, completedVisits: completed.length };
}

// ─── Soft Delete + Audit Log Functions ───────────────────────────────────────

/** تسجيل عملية حذف في Audit Log */
export async function logAuditAction(data: {
  entityType: 'engineer' | 'task' | 'lead' | 'visit' | 'deal';
  entityId: number;
  entityName?: string;
  action: 'soft_delete' | 'restore';
  reason: 'data_entry_error' | 'duplicate' | 'client_cancelled' | 'other';
  reasonCustom?: string;
  performedBy?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    entityType: data.entityType,
    entityId: data.entityId,
    entityName: data.entityName,
    action: data.action,
    reason: data.reason,
    reasonCustom: data.reasonCustom,
    performedBy: data.performedBy,
    notes: data.notes,
  });
}

/** جلب سجل الحذف مع فلترة */
export async function getAuditLogs(filters?: {
  entityType?: 'engineer' | 'task' | 'lead' | 'visit' | 'deal';
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  const query = db.select().from(auditLogs).orderBy(desc(auditLogs.performedAt));
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).limit(filters?.limit ?? 100);
  }
  return await query.limit(filters?.limit ?? 100);
}

/** Soft Delete مهندس (للمدير فقط) */
export async function softDeleteEngineer(id: number, reason: string, reasonCustom: string | undefined, performedBy: string) {
  const db = await getDb();
  if (!db) return;
  const [eng] = await db.select({ name: engineers.name }).from(engineers).where(eq(engineers.id, id));
  await db.update(engineers).set({
    isDeleted: 1,
    deletedAt: new Date(),
    deleteReason: reason as any,
    deleteReasonCustom: reasonCustom,
    deletedBy: performedBy,
  }).where(eq(engineers.id, id));
  await logAuditAction({ entityType: 'engineer', entityId: id, entityName: eng?.name, action: 'soft_delete', reason: reason as any, reasonCustom, performedBy });
}

/** Soft Delete مهمة يومية (للمدير وAdmin Sales) */
export async function softDeleteTask(id: number, reason: string, reasonCustom: string | undefined, performedBy: string) {
  const db = await getDb();
  if (!db) return;
  const [task] = await db.select({ title: dailyTasks.title }).from(dailyTasks).where(eq(dailyTasks.id, id));
  await db.update(dailyTasks).set({
    isDeleted: 1,
    deletedAt: new Date(),
    deleteReason: reason as any,
    deleteReasonCustom: reasonCustom,
    deletedBy: performedBy,
  }).where(eq(dailyTasks.id, id));
  await logAuditAction({ entityType: 'task', entityId: id, entityName: task?.title, action: 'soft_delete', reason: reason as any, reasonCustom, performedBy });
}

/** Soft Delete Lead (للمدير وAdmin Sales) */
export async function softDeleteLead(id: number, reason: string, reasonCustom: string | undefined, performedBy: string) {
  const db = await getDb();
  if (!db) return;
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, id));
  await db.update(leads).set({
    isDeleted: 1,
    deletedAt: new Date(),
    deleteReason: reason as any,
    deleteReasonCustom: reasonCustom,
    deletedBy: performedBy,
  }).where(eq(leads.id, id));
  await logAuditAction({ entityType: 'lead', entityId: id, entityName: lead?.name, action: 'soft_delete', reason: reason as any, reasonCustom, performedBy });
}

/** Soft Delete معاينة (للمدير وAdmin Sales) */
export async function softDeleteVisitFull(id: number, reason: string, reasonCustom: string | undefined, performedBy: string) {
  const db = await getDb();
  if (!db) return;
  const [visit] = await db.select({ clientName: visits.clientName }).from(visits).where(eq(visits.id, id));
  await db.update(visits).set({
    isDeleted: 1,
    deletedAt: new Date(),
    deleteReason: reason as any,
    deleteReasonCustom: reasonCustom,
    deletedBy: performedBy,
  }).where(eq(visits.id, id));
  await logAuditAction({ entityType: 'visit', entityId: id, entityName: visit?.clientName, action: 'soft_delete', reason: reason as any, reasonCustom, performedBy });
}

/** Soft Delete صفقة (للمدير فقط) */
export async function softDeleteDeal(id: number, reason: string, reasonCustom: string | undefined, performedBy: string) {
  const db = await getDb();
  if (!db) return;
  const [deal] = await db.select({ clientName: deals.clientName }).from(deals).where(eq(deals.id, id));
  await db.update(deals).set({
    isDeleted: 1,
    deletedAt: new Date(),
    deleteReason: reason as any,
    deleteReasonCustom: reasonCustom,
    deletedBy: performedBy,
  }).where(eq(deals.id, id));
  await logAuditAction({ entityType: 'deal', entityId: id, entityName: deal?.clientName, action: 'soft_delete', reason: reason as any, reasonCustom, performedBy });
}


// ─── Lead Daily Stats ─────────────────────────────────────────────────────────

/** إدخال أو تحديث أرقام الـ Leads اليومية */
export async function upsertLeadDailyStats(input: {
  date: string; // YYYY-MM-DD
  totalLeads: number;
  contacted: number;
  delayed: number;
  notContacted: number;
  qualified?: number;
  converted?: number;
  source?: string;
  notes?: string;
  enteredBy?: string;
}): Promise<LeadDailyStat> {
  const db = (await getDb())!;
  // تحقق إذا كان هناك سجل لهذا اليوم
  const [existing] = await db
    .select()
    .from(leadDailyStats)
    .where(eq(leadDailyStats.date, input.date as any));

  if (existing) {
    await db.update(leadDailyStats).set({
      totalLeads: input.totalLeads,
      contacted: input.contacted,
      delayed: input.delayed,
      notContacted: input.notContacted,
      qualified: input.qualified ?? 0,
      converted: input.converted ?? 0,
      source: input.source ?? null,
      notes: input.notes ?? null,
      enteredBy: input.enteredBy ?? null,
    }).where(eq(leadDailyStats.id, existing.id));
    const [updated] = await db.select().from(leadDailyStats).where(eq(leadDailyStats.id, existing.id));
    return updated;
  } else {
    await db.insert(leadDailyStats).values({
      date: input.date as any,
      totalLeads: input.totalLeads,
      contacted: input.contacted,
      delayed: input.delayed,
      notContacted: input.notContacted,
      qualified: input.qualified ?? 0,
      converted: input.converted ?? 0,
      source: input.source ?? null,
      notes: input.notes ?? null,
      enteredBy: input.enteredBy ?? null,
    });
    const [inserted] = await db
      .select()
      .from(leadDailyStats)
      .where(eq(leadDailyStats.date, input.date as any));
    return inserted;
  }
}

/** جلب سجلات الأيام مع فلترة بالفترة */
export async function getLeadDailyStatsList(input: {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  limit?: number;
}): Promise<LeadDailyStat[]> {
  const db = (await getDb())!;
  let query = db.select().from(leadDailyStats).$dynamic();

  if (input.from && input.to) {
    query = query.where(
      and(
        gte(leadDailyStats.date, input.from as any),
        lte(leadDailyStats.date, input.to as any)
      )
    );
  } else if (input.from) {
    query = query.where(gte(leadDailyStats.date, input.from as any));
  } else if (input.to) {
    query = query.where(lte(leadDailyStats.date, input.to as any));
  }

  return query.orderBy(desc(leadDailyStats.date)).limit(input.limit ?? 30);
}

/** إحصائيات إجمالية للفترة */
export async function getLeadSummaryStats(input: {
  from: string;
  to: string;
}): Promise<{
  totalLeads: number;
  contacted: number;
  delayed: number;
  notContacted: number;
  qualified: number;
  converted: number;
  contactRate: number;
  delayRate: number;
  conversionRate: number;
  daysCount: number;
}> {
  const db = (await getDb())!;
  const rows = await db
    .select()
    .from(leadDailyStats)
    .where(
      and(
        gte(leadDailyStats.date, input.from as any),
        lte(leadDailyStats.date, input.to as any)
      )
    );

  const totalLeads = rows.reduce((s, r) => s + r.totalLeads, 0);
  const contacted = rows.reduce((s, r) => s + r.contacted, 0);
  const delayed = rows.reduce((s, r) => s + r.delayed, 0);
  const notContacted = rows.reduce((s, r) => s + r.notContacted, 0);
  const qualified = rows.reduce((s, r) => s + r.qualified, 0);
  const converted = rows.reduce((s, r) => s + r.converted, 0);

  return {
    totalLeads,
    contacted,
    delayed,
    notContacted,
    qualified,
    converted,
    contactRate: totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0,
    delayRate: totalLeads > 0 ? Math.round((delayed / totalLeads) * 100) : 0,
    conversionRate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
    daysCount: rows.length,
  };
}

// ─── Discount System ──────────────────────────────────────────────────────────

/** شرائح الخصم بناءً على Total Volume */
export function getDiscountTierInfo(totalVolume: number): { tierLabel: string; discountPct: number } {
  if (totalVolume < 1_000_000)  return { tierLabel: 'أقل من 1M',        discountPct: 1  };
  if (totalVolume < 2_000_000)  return { tierLabel: '1M - 2M',           discountPct: 3  };
  if (totalVolume < 3_000_000)  return { tierLabel: '2M - 3M',           discountPct: 5  };
  if (totalVolume < 5_000_000)  return { tierLabel: '3M - 5M',           discountPct: 7  };
  return                               { tierLabel: 'أكثر من 5M',        discountPct: 10 };
}

/** ملخص الخصومات الكامل (Total Volume + Tier + Allowed + Used + Remaining) */
export async function getDiscountSummary() {
  const db = await getDb();
  if (!db) return null;

  const allDeals = await db.select().from(deals).where(eq(deals.isDeleted, 0));

  // Actual Sales = closed_won deals
  const actualSales = allDeals
    .filter(d => d.stage === 'closed_won')
    .reduce((s, d) => s + parseFloat(d.value as string), 0);

  // Pipeline = deals not closed (proposal, negotiation, contract_sent)
  const pipeline = allDeals
    .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
    .reduce((s, d) => s + parseFloat(d.value as string), 0);

  const totalVolume = actualSales + pipeline;
  const { tierLabel, discountPct } = getDiscountTierInfo(totalVolume);
  const allowedDiscount = totalVolume * (discountPct / 100);

  // Used Discount = مجموع الخصومات على الصفقات المغلقة (closed_won)
  const usedDiscount = allDeals
    .filter(d => d.stage === 'closed_won')
    .reduce((s, d) => s + parseFloat(d.discountValue as string || '0'), 0);

  const remainingDiscount = Math.max(0, allowedDiscount - usedDiscount);

  return {
    actualSales,
    pipeline,
    totalVolume,
    tierLabel,
    discountPct,
    allowedDiscount,
    usedDiscount,
    remainingDiscount,
  };
}

/** التحقق من أن خصم صفقة جديدة لا يتجاوز الحد المتبقي */
export async function validateDealDiscount(dealId: number | undefined, discountValue: number): Promise<{ valid: boolean; remaining: number; message?: string }> {
  const summary = await getDiscountSummary();
  if (!summary) return { valid: false, remaining: 0, message: 'خطأ في جلب بيانات الخصم' };

  // إذا كنا نعدّل صفقة موجودة، نستثني خصمها القديم من الحساب
  let currentDealDiscount = 0;
  if (dealId) {
    const db = await getDb();
    if (db) {
      const [existing] = await db.select().from(deals).where(eq(deals.id, dealId));
      if (existing) currentDealDiscount = parseFloat(existing.discountValue as string || '0');
    }
  }

  const effectiveRemaining = summary.remainingDiscount + currentDealDiscount;
  if (discountValue > effectiveRemaining) {
    return {
      valid: false,
      remaining: effectiveRemaining,
      message: `الخصم المطلوب (${discountValue.toLocaleString('ar-EG')} ج.م) يتجاوز الحد المتبقي (${effectiveRemaining.toLocaleString('ar-EG')} ج.م)`,
    };
  }
  return { valid: true, remaining: effectiveRemaining };
}

/** إنشاء صفقة مع حقول الخصم */
export async function createDealWithDiscount(data: {
  engineerId: number; clientName: string; value: number;
  visitId?: number; leadId?: number; nextAction?: string; nextActionDate?: string; notes?: string;
  discountPercent?: number; discountValue?: number; discountNote?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(deals).values({
    engineerId: data.engineerId,
    clientName: data.clientName,
    value: data.value.toString(),
    stage: 'proposal',
    visitId: data.visitId,
    leadId: data.leadId,
    nextAction: data.nextAction,
    nextActionDate: data.nextActionDate ? new Date(data.nextActionDate + 'T00:00:00') : undefined,
    notes: data.notes,
    discountPercent: (data.discountPercent ?? 0).toString(),
    discountValue: (data.discountValue ?? 0).toString(),
    discountNote: data.discountNote,
  });
}

/** تحديث صفقة (stage + discount) */
export async function updateDealFull(id: number, data: {
  stage?: string; nextAction?: string; nextActionDate?: string; notes?: string;
  discountPercent?: number; discountValue?: number; discountNote?: string; value?: number;
  lostReason?: string; lostReasonNote?: string; closedAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = {};
  if (data.stage !== undefined) updateData.stage = data.stage;
  if (data.nextAction !== undefined) updateData.nextAction = data.nextAction;
  if (data.nextActionDate !== undefined) updateData.nextActionDate = data.nextActionDate ? new Date(data.nextActionDate + 'T00:00:00') : null;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.value !== undefined) updateData.value = data.value.toString();
  if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent.toString();
  if (data.discountValue !== undefined) updateData.discountValue = data.discountValue.toString();
  if (data.discountNote !== undefined) updateData.discountNote = data.discountNote;
  if (data.lostReason !== undefined) updateData.lostReason = data.lostReason;
  if (data.lostReasonNote !== undefined) updateData.lostReasonNote = data.lostReasonNote;
  if (data.closedAt !== undefined) updateData.closedAt = data.closedAt;
  else if (data.stage === 'closed_won' || data.stage === 'closed_lost') updateData.closedAt = new Date();
  await db.update(deals).set(updateData).where(eq(deals.id, id));
  // إذا تغيرت المرحلة إلى closed_won ، أنشئ عقداً تلقائياً إذا لم يكن موجوداً
  if (data.stage === 'closed_won') {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
    if (deal) {
      const existing = await db.select().from(collections).where(eq(collections.dealId, id)).limit(1);
      if (existing.length === 0) {
        // إنشاء عقد جديد مرتبط بالصفقة
        await db.insert(collections).values({
          clientName: deal.clientName,
          contractAmount: (data.value !== undefined ? data.value : parseFloat(deal.value as string)).toString(),
          collectedAmount: '0',
          dealId: id,
          status: 'on_track',
          notes: `عقد تلقائي - صفقة #${id}`,
        });
      } else if (data.value !== undefined) {
        // تحديث قيمة العقد إذا تغيرت قيمة الصفقة
        await db.update(collections).set({ contractAmount: data.value.toString() }).where(eq(collections.dealId, id));
      }
    }
  }
  // إذا تغيرت القيمة فقط لصفقة closed_won موجودة بالفعل
  if (data.stage === undefined && data.value !== undefined) {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
    if (deal && deal.stage === 'closed_won') {
      await db.update(collections).set({ contractAmount: data.value.toString() }).where(eq(collections.dealId, id));
    }
  }
}

/** ملخص الخصم لكل مهندس (Pipeline + خصم مستخدم + خصم متاح) */
export async function getEngineerDiscountSummary() {
  const db = await getDb();
  if (!db) return [];

  const summary = await getDiscountSummary();
  if (!summary) return [];

  const allDeals = await db.select().from(deals).where(eq(deals.isDeleted, 0));
  const engList = await db.select().from(engineers).where(eq(engineers.isDeleted, 0));

  return engList.map(eng => {
    const engDeals = allDeals.filter(d => d.engineerId === eng.id);
    const engPipeline = engDeals
      .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
      .reduce((s, d) => s + parseFloat(d.value as string), 0);
    const engActual = engDeals
      .filter(d => d.stage === 'closed_won')
      .reduce((s, d) => s + parseFloat(d.value as string), 0);
    const engUsedDiscount = engDeals
      .filter(d => d.stage === 'closed_won')
      .reduce((s, d) => s + parseFloat(d.discountValue as string || '0'), 0);
    // نسبة المهندس من الـ Pipeline الكلي
    const pipelineShare = summary.totalVolume > 0 ? engPipeline / summary.totalVolume : 0;
    const allocatedDiscount = summary.remainingDiscount * pipelineShare;

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      pipeline: engPipeline,
      actualSales: engActual,
      usedDiscount: engUsedDiscount,
      allocatedDiscount,
    };
  });
}

// ─── Lost Deal Analysis ───────────────────────────────────────────────────────

export const LOST_REASON_LABELS: Record<string, string> = {
  price_high: "سعر أعلى من المنافس",
  competitor: "ذهب للمنافس",
  slow_response: "تأخير في الاستجابة",
  wrong_product: "منتج غير مناسب",
  not_serious: "عميل غير جاد",
  budget_cut: "تخفيض الميزانية",
  other: "أسباب أخرى",
};

export async function getLostDealsAnalysis() {
  const db = await getDb();
  if (!db) return null;

  const allEngineers = await db
    .select({ id: engineers.id, name: engineers.name })
    .from(engineers)
    .where(eq(engineers.isDeleted, 0));

  const lostDeals = await db
    .select()
    .from(deals)
    .where(
      and(
        eq(deals.stage, "closed_lost"),
        eq(deals.isDeleted, 0)
      )
    );

  // إجمالي الصفقات الخاسرة
  const totalLost = lostDeals.length;
  const totalLostValue = lostDeals.reduce((s, d) => s + parseFloat(d.value as string), 0);

  // توزيع الأسباب
  const reasonCounts: Record<string, number> = {};
  const reasonValues: Record<string, number> = {};
  for (const deal of lostDeals) {
    const reason = deal.lostReason || "other";
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    reasonValues[reason] = (reasonValues[reason] || 0) + parseFloat(deal.value as string);
  }

  const reasonBreakdown = Object.entries(reasonCounts).map(([reason, count]) => ({
    reason,
    label: LOST_REASON_LABELS[reason] || reason,
    count,
    value: reasonValues[reason] || 0,
    percent: totalLost > 0 ? Math.round((count / totalLost) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  const topReason = reasonBreakdown[0] || null;

  // خسائر كل مهندس
  const engineerBreakdown = allEngineers.map(eng => {
    const engLost = lostDeals.filter(d => d.engineerId === eng.id);
    const reasonMap: Record<string, number> = {};
    for (const d of engLost) {
      const r = d.lostReason || "other";
      reasonMap[r] = (reasonMap[r] || 0) + 1;
    }
    return {
      engineerId: eng.id,
      engineerName: eng.name,
      totalLost: engLost.length,
      totalLostValue: engLost.reduce((s, d) => s + parseFloat(d.value as string), 0),
      topReason: Object.entries(reasonMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      topReasonLabel: LOST_REASON_LABELS[Object.entries(reasonMap).sort((a, b) => b[1] - a[1])[0]?.[0]] || null,
      reasons: reasonMap,
    };
  }).filter(e => e.totalLost > 0).sort((a, b) => b.totalLost - a.totalLost);

  const worstEngineer = engineerBreakdown[0] || null;

  return {
    totalLost,
    totalLostValue,
    topReason,
    worstEngineer,
    reasonBreakdown,
    engineerBreakdown,
    deals: lostDeals.map(d => ({
      id: d.id,
      clientName: d.clientName,
      value: parseFloat(d.value as string),
      engineerId: d.engineerId,
      engineerName: allEngineers.find(e => e.id === d.engineerId)?.name || "غير معروف",
      lostReason: d.lostReason || "other",
      lostReasonLabel: LOST_REASON_LABELS[d.lostReason || "other"],
      lostReasonNote: d.lostReasonNote,
      closedAt: d.closedAt,
    })),
  };
}

// ─── Calendar View: MTD Tasks grouped by day ─────────────────────────────────
export async function getTasksCalendarView(engineerId?: number) {
  const db = await getDb();
  if (!db) return { days: [], summary: { total: 0, completed: 0, delayed: 0, not_done: 0, planned: 0, client_delay: 0 } };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const conditions: any[] = [
    gte(dailyTasks.taskDate, monthStart),
    lte(dailyTasks.taskDate, todayEnd),
    eq(dailyTasks.isDeleted, 0),
  ];
  if (engineerId) conditions.push(eq(dailyTasks.engineerId, engineerId));

  const tasks = await db
    .select({
      id: dailyTasks.id,
      title: dailyTasks.title,
      status: dailyTasks.status,
      priority: dailyTasks.priority,
      taskDate: dailyTasks.taskDate,
      engineerId: dailyTasks.engineerId,
      description: dailyTasks.description,
      plannedHours: dailyTasks.plannedHours,
      delayDays: dailyTasks.delayDays,
      notes: dailyTasks.notes,
      category: dailyTasks.category,
      isCritical: dailyTasks.isCritical,
      completedAt: dailyTasks.completedAt,
      meetingRecordingLink: dailyTasks.meetingRecordingLink,
    })
    .from(dailyTasks)
    .where(and(...conditions))
    .orderBy(dailyTasks.taskDate, dailyTasks.priority);

  // جلب أسماء المهندسين
  const allEngineers = await db.select({ id: engineers.id, name: engineers.name }).from(engineers).where(eq(engineers.isDeleted, 0));
  const engMap = new Map(allEngineers.map(e => [e.id, e.name]));

  // تجميع المهام حسب اليوم
  const dayMap = new Map<string, any[]>();

  // إنشاء أعمدة لكل يوم من بداية الشهر حتى اليوم
  const totalDays = now.getDate();
  for (let d = 1; d <= totalDays; d++) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), d);
    const key = dayDate.toISOString().split('T')[0];
    dayMap.set(key, []);
  }

  // توزيع المهام على الأيام
  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  for (const task of tasks) {
    const key = new Date(task.taskDate).toISOString().split('T')[0];
    if (dayMap.has(key)) {
      dayMap.get(key)!.push({
        ...task,
        engineerName: engMap.get(task.engineerId) || 'غير معروف',
        priorityOrder: PRIORITY_ORDER[task.priority ?? 'medium'] ?? 2,
      });
    }
  }

  // ترتيب المهام داخل كل يوم حسب Priority ثم completedAt
  const days = Array.from(dayMap.entries()).map(([date, dayTasks]) => ({
    date,
    dayNum: new Date(date).getDate(),
    dayName: new Date(date).toLocaleDateString('ar-EG', { weekday: 'short' }),
    isToday: date === now.toISOString().split('T')[0],
    tasks: dayTasks.sort((a, b) => a.priorityOrder - b.priorityOrder),
    summary: {
      total: dayTasks.length,
      completed: dayTasks.filter(t => t.status === 'completed').length,
      delayed: dayTasks.filter(t => t.status === 'delayed').length,
      not_done: dayTasks.filter(t => t.status === 'not_done').length,
      planned: dayTasks.filter(t => t.status === 'planned').length,
      client_delay: dayTasks.filter(t => t.status === 'client_delay').length,
    },
  }));

  // ملخص إجمالي MTD
  const summary = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    delayed: tasks.filter(t => t.status === 'delayed').length,
    not_done: tasks.filter(t => t.status === 'not_done').length,
    planned: tasks.filter(t => t.status === 'planned').length,
    client_delay: tasks.filter(t => t.status === 'client_delay').length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0,
  };

  return { days, summary };
}
