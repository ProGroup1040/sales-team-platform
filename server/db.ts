import { and, between, count, desc, eq, gte, isNull, lte, or, sql, sum, avg, lt, ne, inArray, notInArray } from "drizzle-orm";
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
  leadDailyStats, LeadDailyStat, InsertLeadDailyStat,
  workLogs, WorkLog, InsertWorkLog,
  playbookItems, PlaybookItem, InsertPlaybookItem,
  playbookQuotations, PlaybookQuotation, InsertPlaybookQuotation,
  meetingSessions, MeetingSession, InsertMeetingSession,
  sessionActions, SessionAction, InsertSessionAction,
  engineerEvaluations, EngineerEvaluation, InsertEngineerEvaluation,
  engineerCareerLevels, EngineerCareerLevel, InsertEngineerCareerLevel,
  dealTimeline, DealTimeline, InsertDealTimeline,
  dealDiscountAllocations, DealDiscountAllocation, InsertDealDiscountAllocation,
  discountBonusCaps, DiscountBonusCap, InsertDiscountBonusCap,
  companyGoals, CompanyGoal, InsertCompanyGoal,
  engineerPersonalGoals, EngineerPersonalGoal, InsertEngineerPersonalGoal,
  appUsers, userPermissions, activityLogs,
  rolePermissions,
  type AppUser, type InsertAppUser, type UserPermission, type RolePermission
} from "../drizzle/schema";
import { ENV } from './_core/env';
import bcrypt from "bcryptjs";
import { TASK_TYPE_TO_ACTIVITY, ACTIVITY_KEYS, ACTIVITY_WEIGHTS, type ActivityKey } from '../shared/activityTypes';
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

export async function getEngineerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [eng] = await db.select().from(engineers).where(eq(engineers.id, id));
  return eng ?? null;
}
export async function updateEngineerProfile(id: number, data: { name?: string; department?: string; role?: string; phone?: string; email?: string }) {
  const db = await getDb();
  if (!db) return;
  const updates: Record<string, any> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.department !== undefined) updates.department = data.department as any;
  if (data.role !== undefined) updates.role = data.role as any;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.email !== undefined) updates.email = data.email;
  if (Object.keys(updates).length > 0) {
    await db.update(engineers).set(updates).where(eq(engineers.id, id));
  }
}
export async function createEngineer(data: { name: string; email?: string; phone?: string; department?: string; role?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(engineers).values({ ...data, department: (data.department as any) ?? 'sales_engineer', role: (data.role as any) ?? 'sales_engineer', status: 'active' });
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
  taskType?: string;
  // New fields
  goalType?: string;
  actualHours?: number;
  completionDate?: string;
  clientName?: string;
  dealId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  // Auto-set category from taskType if not provided
  let category = data.category ?? null;
  if (!category && data.taskType) {
    if (['meeting_modeling', 'meeting_presentation', 'meeting_closing'].includes(data.taskType)) {
      category = 'meeting';
    } else if (data.taskType === 'meeting_closing') {
      category = 'closing';
    } else {
      category = 'general';
    }
  }
  await db.insert(dailyTasks).values({
    engineerId: data.engineerId, taskDate: new Date(data.taskDate + 'T00:00:00'), title: data.title,
    description: data.description, plannedHours: data.plannedHours ?? 1,
    priority: (data.priority as any) ?? 'medium', status: 'planned',
    delayDays: 0, isClientDelay: 0, isRescheduled: 0, isCritical: 0,
    category: category,
    meetingRecordingLink: data.meetingRecordingLink ?? null,
    taskType: (data.taskType as any) ?? null,
    goalType: (data.goalType as any) ?? null,
    actualHours: data.actualHours ?? null,
    completionDate: data.completionDate ? new Date(data.completionDate + 'T00:00:00') : null,
    clientName: data.clientName ?? null,
    dealId: data.dealId ?? null,
  });
}

export async function updateTaskStatus(id: number, status: string, delayDays?: number, notes?: string) {
  const db = await getDb();
  if (!db) return null;
  // ─── شرط إغلاق Meeting Tasks (Recording Mandatory) ─────────────────────────────────────────────────────────────
  if (status === 'completed') {
    const [task] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, id)).limit(1);
    if (task) {
      const meetingTypes = ['meeting_presentation', 'meeting_closing', 'meeting_2d', 'meeting_3d', 'meeting_quotation'];
      const isMeetingTask = meetingTypes.includes(task.taskType ?? '') || task.category === 'closing' || task.category === 'meeting';
      if (isMeetingTask && !task.meetingRecordingLink) {
        return { success: false, error: 'RECORDING_REQUIRED', message: 'يجب إدخال رابط تسجيل الاجتماع (Recording Link) قبل إغلاق هذه المهمة' };
      }
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
  await db.insert(engineers).values({ ...data, department: (data.department as any) ?? 'sales_engineer', role: (data.role as any) ?? 'sales_engineer', status: 'active' });
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
  const closedValue = allDeals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + parseFloat((d.netValue as string) || d.value || '0'), 0);

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
      grossValue: data.value.toString(),
      netValue: data.value.toString(),
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
    const totalDealValue = engDeals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + parseFloat((d.netValue as string) || (d.value as string) || '0'), 0);
    const engTarget = engTargetsList.find(t => t.engineerId === eng.id);
    const targetAmount = engTarget ? parseFloat(engTarget.targetAmount) : 0;
    const achievementPct = targetAmount > 0 ? (totalDealValue / targetAmount) * 100 : 0;

    // ── Progressive Cumulative Commission System ─────────────────────────────────────────────
    // الحساب تراكمي: كل شريحة تُحسب على الجزء المقابل لها فقط
    // 0 → 1,000,000 = 1%
    // 1,000,000 → 1,250,000 = 1.25%
    // 1,250,000 → 1,500,000 = 1.5%
    // 1,500,000 → 1,750,000 = 1.75%
    // 1,750,000 → 2,000,000 = 2%
    // كل 250K فوق 2M = +0.25%
    const commissionTiersFixed = [
      { from: 0,         to: 1_000_000, rate: 1.0 },
      { from: 1_000_000, to: 1_250_000, rate: 1.25 },
      { from: 1_250_000, to: 1_500_000, rate: 1.5 },
      { from: 1_500_000, to: 1_750_000, rate: 1.75 },
      { from: 1_750_000, to: 2_000_000, rate: 2.0 },
    ];
    // حساب الكوميشن التراكمي مع Breakdown لكل شريحة
    let progressiveCommissionValue = 0;
    const commissionBreakdown: Array<{ label: string; amount: number; rate: number; portion: number }> = [];
    let remaining = totalDealValue;
    for (const tier of commissionTiersFixed) {
      if (remaining <= 0) break;
      const tierSize = tier.to - tier.from;
      const portion = Math.min(remaining, tierSize);
      const tierCommission = Math.round(portion * (tier.rate / 100));
      progressiveCommissionValue += tierCommission;
      if (portion > 0) {
        commissionBreakdown.push({
          label: `${(tier.from/1000).toFixed(0)}K → ${(tier.to/1000).toFixed(0)}K`,
          amount: tierCommission, rate: tier.rate, portion
        });
      }
      remaining -= portion;
    }
    // فوق 2M: شرائح إضافية +0.25% كل 250K
    if (remaining > 0) {
      let extraBase = 2.0;
      let extraRemaining = remaining;
      while (extraRemaining > 0) {
        const portion = Math.min(extraRemaining, 250_000);
        const tierCommission = Math.round(portion * (extraBase / 100));
        progressiveCommissionValue += tierCommission;
        commissionBreakdown.push({
          label: `+250K (${extraBase}%)`,
          amount: tierCommission, rate: extraBase, portion
        });
        extraRemaining -= portion;
        extraBase += 0.25;
      }
    }
    // للتوافق مع الكود القديم: نحسب effective rate كنسبة مئوية من الإجمالي
    const baseCommissionPct = totalDealValue > 0 ? (progressiveCommissionValue / totalDealValue) * 100 : 0;

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

     // Commission: كامل عند KPI ≥ 60%، ينخفض 50% عند KPI < 60%
     const commissionStatus: 'full' | 'half' = kpiScore >= 60 ? 'full' : 'half';
     const commissionMultiplier = kpiScore >= 60 ? 1.0 : 0.5;
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
       kpiStatusReason = 'KPI أقل من 60% — أداء منخفض — الكوميشن 50% فقط';
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
      commissionValue: commissionValue, commissionStatus,
      commissionBreakdown, progressiveCommissionValue,
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

/** تحديث الأهداف التشغيلية لمهندس */
export async function upsertEngineerOperationalTargets(data: {
  engineerId: number; year: number; month: number;
  targetMeetings?: number; target2D?: number; target3D?: number;
  targetRender?: number; targetQuotations?: number;
  targetPresentations?: number; targetClosings?: number; targetDeals?: number;
  targetContract?: number; targetWorkOrder?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(engineerTargets)
    .where(and(
      eq(engineerTargets.engineerId, data.engineerId),
      eq(engineerTargets.year, data.year),
      eq(engineerTargets.month, data.month)
    )).limit(1);
  const updateData: Record<string, number> = {};
  if (data.targetMeetings !== undefined) updateData.targetMeetings = data.targetMeetings;
  if (data.target2D !== undefined) updateData.target2D = data.target2D;
  if (data.target3D !== undefined) updateData.target3D = data.target3D;
  if (data.targetRender !== undefined) updateData.targetRender = data.targetRender;
  if (data.targetQuotations !== undefined) updateData.targetQuotations = data.targetQuotations;
  if (data.targetPresentations !== undefined) updateData.targetPresentations = data.targetPresentations;
  if (data.targetClosings !== undefined) updateData.targetClosings = data.targetClosings;
  if (data.targetDeals !== undefined) updateData.targetDeals = data.targetDeals;
  if (data.targetContract !== undefined) updateData.targetContract = data.targetContract;
  if (data.targetWorkOrder !== undefined) updateData.targetWorkOrder = data.targetWorkOrder;
  if (existing.length > 0) {
    await db.update(engineerTargets).set(updateData).where(eq(engineerTargets.id, existing[0].id));
  } else {
    await db.insert(engineerTargets).values({
      engineerId: data.engineerId, year: data.year, month: data.month,
      targetAmount: '0',
      ...updateData,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FINANCIAL MODULE — Payment Tracking + Promises + Commission Split
// ════════════════════════════════════════════════════════════════════════════

/** حساب الكوميشن التصاعدي على المبلغ المحصّل */
/**
 * Progressive Commission System:
 * 0 → 1,000,000         = 1%   (على كل المبلغ)
 * 1,000,000 → 1,250,000  = 1.25% (على الجزء فقط)
 * 1,250,000 → 1,500,000  = 1.5%
 * 1,500,000 → 1,750,000  = 1.75%
 * 1,750,000 → 2,000,000  = 2%
 * بعد 2,000,000: +0.25% لكل 250K زيادة (على كل المبلغ فوق 2M)
 */
export function calcProgressiveCommission(collected: number): number {
  if (collected <= 0) return 0;
  let commission = 0;
  // الشرائح التدريجية
  const tiers = [
    { from: 0,         to: 1_000_000, rate: 0.01   },
    { from: 1_000_000, to: 1_250_000, rate: 0.0125 },
    { from: 1_250_000, to: 1_500_000, rate: 0.015  },
    { from: 1_500_000, to: 1_750_000, rate: 0.0175 },
    { from: 1_750_000, to: 2_000_000, rate: 0.02   },
  ];
  for (const tier of tiers) {
    if (collected <= tier.from) break;
    const taxable = Math.min(collected, tier.to) - tier.from;
    commission += taxable * tier.rate;
  }
  // بعد 2M: كل 250K زيادة تضيف 0.25% على الجزء فوق 2M
  if (collected > 2_000_000) {
    const above2M = collected - 2_000_000;
    const extraSteps = Math.floor(above2M / 250_000);
    // لكل شريحة 250K فوق 2M يزداد المعدل 0.25%
    let remaining = above2M;
    for (let step = 0; step < extraSteps; step++) {
      const stepRate = 0.02 + (step + 1) * 0.0025;
      const stepAmount = Math.min(250_000, remaining);
      commission += stepAmount * stepRate;
      remaining -= stepAmount;
    }
    // الكسر المتبقي بعد آخر 250K كاملة
    if (remaining > 0) {
      const lastRate = 0.02 + (extraSteps + 1) * 0.0025;
      commission += remaining * lastRate;
    }
  }
  return Math.round(commission);
}

/**
 * تفاصيل حساب Progressive Commission (للعرض في الواجهة)
 */
export function calcProgressiveCommissionDetails(collected: number): Array<{ label: string; amount: number; rate: number; commission: number }> {
  if (collected <= 0) return [];
  const details: Array<{ label: string; amount: number; rate: number; commission: number }> = [];
  const tiers = [
    { from: 0,         to: 1_000_000, rate: 0.01,   label: 'أول 1,000,000' },
    { from: 1_000_000, to: 1_250_000, rate: 0.0125, label: '1,000,000 → 1,250,000' },
    { from: 1_250_000, to: 1_500_000, rate: 0.015,  label: '1,250,000 → 1,500,000' },
    { from: 1_500_000, to: 1_750_000, rate: 0.0175, label: '1,500,000 → 1,750,000' },
    { from: 1_750_000, to: 2_000_000, rate: 0.02,   label: '1,750,000 → 2,000,000' },
  ];
  for (const tier of tiers) {
    if (collected <= tier.from) break;
    const taxable = Math.min(collected, tier.to) - tier.from;
    details.push({ label: tier.label, amount: Math.round(taxable), rate: tier.rate * 100, commission: Math.round(taxable * tier.rate) });
  }
  if (collected > 2_000_000) {
    const above2M = collected - 2_000_000;
    const extraSteps = Math.floor(above2M / 250_000);
    let remaining = above2M;
    for (let step = 0; step < extraSteps; step++) {
      const stepRate = 0.02 + (step + 1) * 0.0025;
      const stepAmount = Math.min(250_000, remaining);
      details.push({ label: `فوق 2M - شريحة ${step + 1}`, amount: Math.round(stepAmount), rate: stepRate * 100, commission: Math.round(stepAmount * stepRate) });
      remaining -= stepAmount;
    }
    if (remaining > 0) {
      const lastRate = 0.02 + (extraSteps + 1) * 0.0025;
      details.push({ label: `فوق 2M - كسر`, amount: Math.round(remaining), rate: lastRate * 100, commission: Math.round(remaining * lastRate) });
    }
  }
  return details;
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
// Admin Sales Task Categories & KPI Weights
export const ADMIN_TASK_CATEGORY_LABELS: Record<string, string> = {
  crm_data:             'CRM & Data',
  financial_collection: 'Financial & Collection',
  operations:           'Operations',
  reporting:            'Reporting',
  coordination:         'Coordination',
};
export const ADMIN_TASK_CATEGORY_OBJECTIVES: Record<string, string> = {
  crm_data:             'دقة البيانات + تحسين Pipeline',
  financial_collection: 'زيادة التحصيل وتقليل التأخير',
  operations:           'رفع إنتاجية المهندسين',
  reporting:            'وضوح الأداء واتخاذ القرار',
  coordination:         'تقليل المشاكل التشغيلية',
};
export const DAILY_TASK_TEMPLATES: { key: string; title: string; category: 'crm_data'|'financial_collection'|'operations'|'reporting'|'coordination'; kpiWeight: number; kpiImpact: string }[] = [
  { key: 'crm_update',         title: 'متابعة تحديث CRM',                          category: 'crm_data',             kpiWeight: 15, kpiImpact: 'Pipeline Accuracy' },
  { key: 'task_distribution',  title: 'توزيع المهام اليومية على المهندسين',         category: 'operations',           kpiWeight: 20, kpiImpact: 'Execution Rate' },
  { key: 'task_review',        title: 'مراجعة تنفيذ المهام',                        category: 'operations',           kpiWeight: 20, kpiImpact: 'Execution Rate' },
  { key: 'visit_data',         title: 'إدخال ومتابعة بيانات المعاينات',             category: 'crm_data',             kpiWeight: 15, kpiImpact: 'Pipeline Accuracy' },
  { key: 'visit_collection',   title: 'متابعة تحصيلات المعاينات',                  category: 'financial_collection', kpiWeight: 25, kpiImpact: 'Cash Flow' },
  { key: 'lead_activity',      title: 'متابعة نشاط Lead Module',                   category: 'crm_data',             kpiWeight: 15, kpiImpact: 'Pipeline Accuracy' },
  { key: 'daily_target',       title: 'متابعة تحقيق Target المبيعات اليومي',       category: 'reporting',            kpiWeight: 15, kpiImpact: 'Performance Tracking' },
];

/** قوالب المهام الأسبوعية حسب اليوم */
export const WEEKLY_TASK_TEMPLATES: { key: string; title: string; days: number[]; category: 'crm_data'|'financial_collection'|'operations'|'reporting'|'coordination'|'meetings'; kpiWeight: number; kpiImpact: string }[] = [
  { key: 'lead_quality',         title: 'متابعة جودة الـ Leads',                     days: [1, 4], category: 'crm_data',             kpiWeight: 20, kpiImpact: 'Pipeline Quality' },    // Mon, Thu
  { key: 'visit_collection_wed', title: 'متابعة تحصيلات المعاينات',                  days: [3],    category: 'financial_collection', kpiWeight: 25, kpiImpact: 'Cash Flow' },              // Wed
  { key: 'contract_collection',  title: 'متابعة تحصيلات التعاقدات',                  days: [4],    category: 'financial_collection', kpiWeight: 25, kpiImpact: 'Cash Flow' },              // Thu
  { key: 'delay_review',         title: 'مراجعة التأخيرات مع المهندسين',             days: [4],    category: 'operations',           kpiWeight: 20, kpiImpact: 'Execution Rate' },         // Thu
  { key: 'management_meeting',   title: 'اجتماع إدارة أسبوعي',                       days: [4],    category: 'meetings',             kpiWeight: 30, kpiImpact: 'Team Alignment' },         // Thu
  { key: 'team_meeting',         title: 'اجتماع فريق أسبوعي',                        days: [4],    category: 'meetings',             kpiWeight: 30, kpiImpact: 'Team Alignment' },         // Thu
  { key: 'weekly_report',        title: 'تقرير أسبوعي للإدارة',                      days: [4],    category: 'reporting',            kpiWeight: 20, kpiImpact: 'Performance Tracking' },   // Thu
  { key: 'performance_notes',    title: 'تسجيل ملاحظات الأداء الأسبوعية',           days: [4],    category: 'reporting',            kpiWeight: 15, kpiImpact: 'Performance Tracking' },   // Thu
  { key: 'timeline_update',      title: 'تحديث Timeline المشاريع',                   days: [6, 2], category: 'operations',           kpiWeight: 20, kpiImpact: 'Execution Rate' },         // Sat, Tue
  { key: 'delivery_review',      title: 'مراجعة مواعيد التسليم مع الإنتاج',         days: [6, 2], category: 'coordination',         kpiWeight: 15, kpiImpact: 'Delivery Compliance' },   // Sat, Tue
];

/** قوالب المهام الشهرية حسب اليوم من الشهر */
export const MONTHLY_TASK_TEMPLATES: { key: string; title: string; dayOfMonth: number; category: 'crm_data'|'financial_collection'|'operations'|'reporting'|'coordination'|'meetings'; kpiWeight: number; kpiImpact: string }[] = [
  { key: 'contract_review',     title: 'مراجعة العقود الورقية ورفعها على السيرفر',    dayOfMonth: 15, category: 'financial_collection', kpiWeight: 25, kpiImpact: 'Cash Flow' },
  { key: 'photo_data_prep',     title: 'تجهيز Data التصوير للمشاريع المنتهية',        dayOfMonth: 16, category: 'operations',           kpiWeight: 15, kpiImpact: 'Execution Rate' },
  { key: 'market_survey',       title: 'Market Survey لتحديث قاعدة البيانات',         dayOfMonth: 22, category: 'coordination',         kpiWeight: 20, kpiImpact: 'Market Intelligence' },
  { key: 'competitor_prices',   title: 'متابعة أسعار المنافسين',                      dayOfMonth: 22, category: 'coordination',         kpiWeight: 15, kpiImpact: 'Market Intelligence' },
  { key: 'kpi_export',          title: 'Export KPI Report من النظام',                 dayOfMonth: 28, category: 'reporting',            kpiWeight: 20, kpiImpact: 'Performance Tracking' },
  { key: 'kpi_send',            title: 'إرسال التقرير للحسابات',                      dayOfMonth: 28, category: 'reporting',            kpiWeight: 20, kpiImpact: 'Performance Tracking' },
  { key: 'commission_review',   title: 'مراجعة الكوميشن والحوافز',                   dayOfMonth: 28, category: 'financial_collection', kpiWeight: 20, kpiImpact: 'Cash Flow' },
  { key: 'monthly_performance', title: 'إضافة ملاحظات الأداء الشهرية',               dayOfMonth: 28, category: 'reporting',            kpiWeight: 15, kpiImpact: 'Performance Tracking' },
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
    category: t.category, kpiWeight: t.kpiWeight, kpiImpact: t.kpiImpact,
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
    category: t.category, kpiWeight: t.kpiWeight, kpiImpact: t.kpiImpact,
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
    category: t.category, kpiWeight: t.kpiWeight, kpiImpact: t.kpiImpact,
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

/**
 * Stage-Based Visit Tracking:
 * تحديد المرحلة الحالية لكل معاينة وما يحتاج تحديث فعلاً
 * لا يتم إجبار التحديث على المعاينات المكتملة
 */
export function getVisitActiveStage(v: any): { stage: string; nextAction: string | null; isComplete: boolean; isDelayed: boolean } {
  // معاينة ملغاة أو مكتملة بالكامل
  if (v.isDeleted === 1) return { stage: 'deleted', nextAction: null, isComplete: true, isDelayed: false };
  if (v.status === 'cancelled') return { stage: 'cancelled', nextAction: null, isComplete: true, isDelayed: false };

  // مرحلة 1: الحجز والتوزيع
  if (v.bookingStatus === 'booked') return { stage: 'booking', nextAction: 'توزيع المعاينة على مهندس', isComplete: false, isDelayed: false };

  // مرحلة 2: التأكيد
  if (v.confirmationStatus === 'not_confirmed') return { stage: 'confirmation', nextAction: 'تأكيد الموعد مع العميل', isComplete: false, isDelayed: false };

  // مرحلة 3: التنفيذ
  if (v.status === 'scheduled' || v.status === 'rescheduled') {
    const now = new Date();
    const scheduled = new Date(v.scheduledAt);
    const isDelayed = scheduled < now;
    return { stage: 'execution', nextAction: 'تنفيذ المعاينة', isComplete: false, isDelayed };
  }
  if (v.status === 'delayed') return { stage: 'execution', nextAction: 'تحديث حالة التأخير', isComplete: false, isDelayed: true };

  // مرحلة 4: الرفع (بعد التنفيذ)
  if (v.status === 'completed' && v.uploadStatus === 'not_uploaded') {
    return { stage: 'upload', nextAction: 'رفع المعاينة', isComplete: false, isDelayed: false };
  }

  // مرحلة 5: الجودة
  if (v.status === 'completed' && v.uploadStatus !== 'not_uploaded' && v.quality === 'pending') {
    return { stage: 'quality', nextAction: 'تقييم جودة المعاينة', isComplete: false, isDelayed: false };
  }

  // مرحلة 6: التحصيل (إذا كان هناك رسوم)
  if (v.status === 'completed' && v.uploadStatus !== 'not_uploaded' && v.quality !== 'pending') {
    const hasFee = parseFloat(v.feeAmount ?? '0') > 0;
    if (hasFee && !v.feeCollected) {
      return { stage: 'financial', nextAction: 'تحصيل رسوم المعاينة', isComplete: false, isDelayed: false };
    }
  }

  // مكتملة بالكامل
  return { stage: 'complete', nextAction: null, isComplete: true, isDelayed: false };
}

/**
 * Stage-Based: جلب المعاينات التي تحتاج تحديث فعلي (Active Stage فقط)
 */
export async function getVisitsNeedingAction() {
  const db = await getDb();
  if (!db) return {
    needUpload: [], needConfirmation: [], needExecution: [], needCollection: [], needQuality: [],
    summary: { needUpload: 0, needConfirmation: 0, needExecution: 0, needCollection: 0, needQuality: 0, total: 0 }
  };

  const allVisits = await db.select().from(visits).where(
    and(eq(visits.isDeleted, 0), ne(visits.status, 'cancelled'))
  );

  const needUpload: any[] = [];
  const needConfirmation: any[] = [];
  const needExecution: any[] = [];
  const needCollection: any[] = [];
  const needQuality: any[] = [];

  for (const v of allVisits) {
    const { stage, isComplete } = getVisitActiveStage(v);
    if (isComplete) continue; // مكتملة — لا تحتاج تحديث
    if (stage === 'upload')       needUpload.push({ id: v.id, clientName: v.clientName, scheduledAt: v.scheduledAt });
    if (stage === 'confirmation') needConfirmation.push({ id: v.id, clientName: v.clientName, scheduledAt: v.scheduledAt });
    if (stage === 'execution')    needExecution.push({ id: v.id, clientName: v.clientName, scheduledAt: v.scheduledAt, isDelayed: new Date(v.scheduledAt) < new Date() });
    if (stage === 'financial')    needCollection.push({ id: v.id, clientName: v.clientName, feeAmount: v.feeAmount });
    if (stage === 'quality')      needQuality.push({ id: v.id, clientName: v.clientName });
  }

  return {
    needUpload,
    needConfirmation,
    needExecution,
    needCollection,
    needQuality,
    summary: {
      needUpload: needUpload.length,
      needConfirmation: needConfirmation.length,
      needExecution: needExecution.length,
      needCollection: needCollection.length,
      needQuality: needQuality.length,
      total: needUpload.length + needConfirmation.length + needExecution.length + needCollection.length + needQuality.length,
    }
  };
}

/** Get daily tracking status: visits updated today vs total active (legacy - kept for backward compat) */
export async function getVisitsDailyTracking(date: string) {
  const db = await getDb();
  if (!db) return { totalActive: 0, updatedToday: 0, pendingUpdate: 0, missingUpdate: false, stageAlerts: null };
  const dayStart = new Date(date + 'T00:00:00');
  const dayEnd = new Date(date + 'T23:59:59');
  const allActive = await db.select().from(visits).where(
    and(eq(visits.isDeleted, 0), ne(visits.status, 'cancelled'))
  );
  const updatedToday = allActive.filter(v =>
    v.lastUpdatedByAdminAt && v.lastUpdatedByAdminAt >= dayStart && v.lastUpdatedByAdminAt <= dayEnd
  ).length;
  const totalActive = allActive.length;
  // Stage-based counts
  let stageNeedUpload = 0, stageNeedConfirmation = 0, stageNeedExecution = 0, stageNeedCollection = 0;
  for (const v of allActive) {
    const { stage, isComplete } = getVisitActiveStage(v);
    if (isComplete) continue;
    if (stage === 'upload') stageNeedUpload++;
    if (stage === 'confirmation') stageNeedConfirmation++;
    if (stage === 'execution') stageNeedExecution++;
    if (stage === 'financial') stageNeedCollection++;
  }
  const stageTotal = stageNeedUpload + stageNeedConfirmation + stageNeedExecution + stageNeedCollection;
  return {
    totalActive,
    updatedToday,
    pendingUpdate: stageTotal,
    missingUpdate: stageTotal > 0,
    stageAlerts: {
      needUpload: stageNeedUpload,
      needConfirmation: stageNeedConfirmation,
      needExecution: stageNeedExecution,
      needCollection: stageNeedCollection,
    }
  };
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
  // Realized Discount = خصم مستخدم فعلياً على صفقات closed_won
  const realizedDiscount = usedDiscount;
  // Potential Discount = خصم محتمل على الـ Pipeline الحالي
  const potentialDiscount = allDeals
    .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
    .reduce((s, d) => s + parseFloat(d.discountValue as string || '0'), 0);
  return {
    actualSales,
    pipeline,
    totalVolume,
    tierLabel,
    discountPct,
    allowedDiscount,
    usedDiscount,
    remainingDiscount,
    realizedDiscount,
    potentialDiscount,
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
    grossValue: data.value.toString(),
    netValue: (data.value - (data.discountValue ?? 0)).toString(),
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
  // Auto-update grossValue and netValue
  if (data.value !== undefined) updateData.grossValue = data.value.toString();
  if (data.value !== undefined || data.discountValue !== undefined) {
    // Fetch current deal to get latest values if only one is being updated
    // netValue = grossValue - discountValue
    const gv = data.value;
    const dv = data.discountValue;
    if (gv !== undefined && dv !== undefined) updateData.netValue = (gv - dv).toString();
    else if (gv !== undefined) updateData.netValue = gv.toString(); // no discount info, use gross
  }
  // Lock deal after closing
  if (data.stage === 'closed_won' || data.stage === 'closed_lost') updateData.isLocked = 1;
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
    // Saved Discount = الخصم المتاح - الخصم المستخدم
    const savedDiscount = Math.max(0, allocatedDiscount - engUsedDiscount);
    // Bonus 50% للمهندس من الخصم الموفَّر
    const engineerBonus = Math.round(savedDiscount * 0.5);
    const companyProfit = Math.round(savedDiscount * 0.5);
    return {
      engineerId: eng.id,
      engineerName: eng.name,
      pipeline: engPipeline,
      actualSales: engActual,
      usedDiscount: engUsedDiscount,
      allocatedDiscount,
      savedDiscount,
      engineerBonus,
      companyProfit,
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

// ─── Engineers Trend Analysis (current vs previous month) ─────────────────────
export async function getEngineersTrend(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  // Current month
  const currStart = new Date(year, month - 1, 1);
  const currEnd   = new Date(year, month, 0, 23, 59, 59);

  // Previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd   = new Date(prevYear, prevMonth, 0, 23, 59, 59);

  const engList = await getEngineers();

  const [currDeals, prevDeals, currTasks, prevTasks, currTargets, prevTargets] = await Promise.all([
    db.select().from(deals).where(between(deals.createdAt, currStart, currEnd)),
    db.select().from(deals).where(between(deals.createdAt, prevStart, prevEnd)),
    db.select().from(dailyTasks).where(and(gte(dailyTasks.taskDate, currStart), lte(dailyTasks.taskDate, currEnd))),
    db.select().from(dailyTasks).where(and(gte(dailyTasks.taskDate, prevStart), lte(dailyTasks.taskDate, prevEnd))),
    db.select().from(engineerTargets).where(and(eq(engineerTargets.year, year), eq(engineerTargets.month, month))),
    db.select().from(engineerTargets).where(and(eq(engineerTargets.year, prevYear), eq(engineerTargets.month, prevMonth))),
  ]);

  return engList.map(eng => {
    const currSales = currDeals.filter(d => d.engineerId === eng.id && d.stage === 'closed_won').reduce((s, d) => s + parseFloat(d.value), 0);
    const prevSales = prevDeals.filter(d => d.engineerId === eng.id && d.stage === 'closed_won').reduce((s, d) => s + parseFloat(d.value), 0);

    const currCompleted = currTasks.filter(t => t.engineerId === eng.id && t.status === 'completed').length;
    const currPlanned   = currTasks.filter(t => t.engineerId === eng.id).length;
    const prevCompleted = prevTasks.filter(t => t.engineerId === eng.id && t.status === 'completed').length;
    const prevPlanned   = prevTasks.filter(t => t.engineerId === eng.id).length;

    const currExecRate = currPlanned > 0 ? Math.round((currCompleted / currPlanned) * 100) : 0;
    const prevExecRate = prevPlanned > 0 ? Math.round((prevCompleted / prevPlanned) * 100) : 0;

    const currTarget = currTargets.find(t => t.engineerId === eng.id);
    const currTargetAmt = currTarget ? parseFloat(currTarget.targetAmount) : 0;
    const prevTarget = prevTargets.find(t => t.engineerId === eng.id);
    const prevTargetAmt = prevTarget ? parseFloat(prevTarget.targetAmount) : 0;

    const currQuota = currTargetAmt > 0 ? Math.round((currSales / currTargetAmt) * 100) : 0;
    const prevQuota = prevTargetAmt > 0 ? Math.round((prevSales / prevTargetAmt) * 100) : 0;

    const salesDelta     = currSales - prevSales;
    const salesDeltaPct  = prevSales > 0 ? Math.round(((currSales - prevSales) / prevSales) * 100) : (currSales > 0 ? 100 : 0);
    const execDelta      = currExecRate - prevExecRate;
    const quotaDelta     = currQuota - prevQuota;

    const trend: 'up' | 'down' | 'stable' =
      salesDeltaPct > 5 ? 'up' : salesDeltaPct < -5 ? 'down' : 'stable';

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      department: eng.department,
      // Current month
      currSales, currTargetAmt, currQuota,
      currCompleted, currPlanned, currExecRate,
      // Previous month
      prevSales, prevTargetAmt, prevQuota,
      prevCompleted, prevPlanned, prevExecRate,
      // Deltas
      salesDelta, salesDeltaPct, execDelta, quotaDelta,
      trend,
    };
  });
}

// ─── Weekly Report ────────────────────────────────────────────────────────────
export async function getWeeklyReport() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  // Week: last 7 days
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);

  // Previous week
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekStart);
  prevWeekEnd.setDate(weekStart.getDate() - 1);
  prevWeekEnd.setHours(23, 59, 59, 999);

  const engList = await getEngineers();

  const [weekDeals, prevWeekDeals, weekTasks, prevWeekTasks, weekVisits, prevWeekVisits, weekLeads] = await Promise.all([
    db.select().from(deals).where(between(deals.createdAt, weekStart, weekEnd)),
    db.select().from(deals).where(between(deals.createdAt, prevWeekStart, prevWeekEnd)),
    db.select().from(dailyTasks).where(and(gte(dailyTasks.taskDate, weekStart), lte(dailyTasks.taskDate, weekEnd))),
    db.select().from(dailyTasks).where(and(gte(dailyTasks.taskDate, prevWeekStart), lte(dailyTasks.taskDate, prevWeekEnd))),
    db.select().from(visits).where(between(visits.scheduledAt, weekStart, weekEnd)),
    db.select().from(visits).where(between(visits.scheduledAt, prevWeekStart, prevWeekEnd)),
    db.select().from(leads).where(between(leads.createdAt, weekStart, weekEnd)),
  ]);

  // Totals
  const totalSales     = weekDeals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + parseFloat(d.value), 0);
  const prevTotalSales = prevWeekDeals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + parseFloat(d.value), 0);
  const salesGrowth    = prevTotalSales > 0 ? Math.round(((totalSales - prevTotalSales) / prevTotalSales) * 100) : (totalSales > 0 ? 100 : 0);

  const totalTasks     = weekTasks.length;
  const completedTasks = weekTasks.filter(t => t.status === 'completed').length;
  const delayedTasks   = weekTasks.filter(t => t.status === 'delayed').length;
  const execRate       = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalVisits    = weekVisits.length;
  const completedVisits = weekVisits.filter(v => v.status === 'completed').length;

  const newLeads       = weekLeads.length;
  const newDeals       = weekDeals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost').length;
  const closedWon      = weekDeals.filter(d => d.stage === 'closed_won').length;
  const closedLost     = weekDeals.filter(d => d.stage === 'closed_lost').length;

  // Per engineer summary
  const engineerSummary = engList.map(eng => {
    const engDeals    = weekDeals.filter(d => d.engineerId === eng.id);
    const engSales    = engDeals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + parseFloat(d.value), 0);
    const engTasks    = weekTasks.filter(t => t.engineerId === eng.id);
    const engDone     = engTasks.filter(t => t.status === 'completed').length;
    const engDelayed  = engTasks.filter(t => t.status === 'delayed').length;
    const engVisits   = weekVisits.filter(v => v.engineerId === eng.id).length;
    const engExecRate = engTasks.length > 0 ? Math.round((engDone / engTasks.length) * 100) : 0;
    return {
      engineerId: eng.id, engineerName: eng.name,
      sales: engSales, closedWon: engDeals.filter(d => d.stage === 'closed_won').length,
      tasks: engTasks.length, tasksDone: engDone, tasksDelayed: engDelayed,
      visits: engVisits, execRate: engExecRate,
    };
  }).sort((a, b) => b.sales - a.sales);

  // Top performer
  const topPerformer = engineerSummary[0] ?? null;

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    generatedAt: now.toISOString(),
    // Sales
    totalSales, prevTotalSales, salesGrowth, closedWon, closedLost,
    // Tasks
    totalTasks, completedTasks, delayedTasks, execRate,
    // Visits & Leads
    totalVisits, completedVisits, newLeads, newDeals,
    // Per engineer
    engineerSummary, topPerformer,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORK DISTRIBUTION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/** Target distribution percentages */
export const WORK_DISTRIBUTION_TARGETS = {
  meetings: 50,    // meeting_2d + meeting_quotation + meeting_3d + meeting_closing
  design_3d: 30,   // design_3d
  design_2d: 10,   // design_2d
  quotation: 10,   // quotation
} as const;

/** Activity type labels in Arabic */
export const ACTIVITY_LABELS: Record<string, string> = {
  meeting_2d: "ميتينج 2D",
  meeting_quotation: "ميتينج عرض سعر",
  meeting_3d: "ميتينج 3D",
  meeting_closing: "ميتينج إغلاق/تفاوض",
  design_3d: "تصميم 3D",
  design_2d: "تصميم 2D",
  quotation: "عرض سعر",
};

/** Category mapping */
export function getActivityCategory(activityType: string): "meetings" | "design_3d" | "design_2d" | "quotation" {
  if (activityType.startsWith("meeting_")) return "meetings";
  if (activityType === "design_3d") return "design_3d";
  if (activityType === "design_2d") return "design_2d";
  return "quotation";
}

/** Log a work activity */
export async function logWorkActivity(data: InsertWorkLog) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const d = new Date(data.logDate);
  // Calculate week number
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  await db.insert(workLogs).values({
    ...data,
    weekNumber,
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  });
}

/** Get work distribution for a single engineer (MTD or custom period) */
export async function getWorkDistribution(
  engineerId: number,
  year: number,
  month: number
) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select({
      activityType: workLogs.activityType,
      totalMinutes: sum(workLogs.durationMinutes),
      count: count(workLogs.id),
    })
    .from(workLogs)
    .where(and(
      eq(workLogs.engineerId, engineerId),
      eq(workLogs.year, year),
      eq(workLogs.month, month)
    ))
    .groupBy(workLogs.activityType);

  const totalMinutes = rows.reduce((s, r) => s + Number(r.totalMinutes || 0), 0);

  // Build per-activity breakdown
  const byActivity: Record<string, { minutes: number; count: number; pct: number }> = {};
  for (const r of rows) {
    const mins = Number(r.totalMinutes || 0);
    byActivity[r.activityType] = {
      minutes: mins,
      count: Number(r.count || 0),
      pct: totalMinutes > 0 ? Math.round((mins / totalMinutes) * 1000) / 10 : 0,
    };
  }

  // Build category totals
  const categories = {
    meetings: 0,
    design_3d: 0,
    design_2d: 0,
    quotation: 0,
  };
  for (const [type, data] of Object.entries(byActivity)) {
    const cat = getActivityCategory(type);
    categories[cat] += data.minutes;
  }
  const categoryPct = {
    meetings: totalMinutes > 0 ? Math.round((categories.meetings / totalMinutes) * 1000) / 10 : 0,
    design_3d: totalMinutes > 0 ? Math.round((categories.design_3d / totalMinutes) * 1000) / 10 : 0,
    design_2d: totalMinutes > 0 ? Math.round((categories.design_2d / totalMinutes) * 1000) / 10 : 0,
    quotation: totalMinutes > 0 ? Math.round((categories.quotation / totalMinutes) * 1000) / 10 : 0,
  };

  const distributionScore = calculateDistributionScore(categoryPct);

  return {
    engineerId,
    year,
    month,
    totalMinutes,
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    byActivity,
    categories: categoryPct,
    distributionScore,
    feedback: getDistributionFeedback(categoryPct),
  };
}

/** Calculate Distribution Score (0-100) based on deviation from targets */
export function calculateDistributionScore(
  actual: { meetings: number; design_3d: number; design_2d: number; quotation: number }
): number {
  if (actual.meetings === 0 && actual.design_3d === 0 && actual.design_2d === 0 && actual.quotation === 0) return 0;

  const targets = WORK_DISTRIBUTION_TARGETS;
  // Max deviation per category (weighted)
  const weights = { meetings: 0.4, design_3d: 0.3, design_2d: 0.15, quotation: 0.15 };
  let score = 100;

  for (const key of ["meetings", "design_3d", "design_2d", "quotation"] as const) {
    const deviation = Math.abs(actual[key] - targets[key]);
    // Each 10% deviation reduces score proportionally
    const penalty = (deviation / 10) * 15 * weights[key];
    score -= penalty;
  }

  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

/** Generate human-readable feedback about distribution */
export function getDistributionFeedback(
  actual: { meetings: number; design_3d: number; design_2d: number; quotation: number }
): { status: "balanced" | "focused" | "weak"; message: string; warnings: string[] } {
  const warnings: string[] = [];
  const targets = WORK_DISTRIBUTION_TARGETS;

  if (actual.meetings > targets.meetings + 20) warnings.push("ميتينجات كثيرة بدون إغلاق كافٍ");
  if (actual.meetings < targets.meetings - 20) warnings.push("نقص في الميتينجات مع العملاء");
  if (actual.design_3d > targets.design_3d + 20) warnings.push("تركيز زائد على التصميم 3D");
  if (actual.design_3d < targets.design_3d - 15) warnings.push("نقص في التصميم 3D");
  if (actual.design_2d < 3) warnings.push("لا يوجد تقريباً تصميم 2D");
  if (actual.quotation < 3) warnings.push("نقص في عروض الأسعار");

  const score = calculateDistributionScore(actual);
  const status = score >= 75 ? "balanced" : score >= 50 ? "focused" : "weak";
  const message = score >= 75
    ? "توزيع متوازن — أداء ممتاز"
    : score >= 50
    ? "توزيع مقبول — يحتاج تحسين في بعض المجالات"
    : "توزيع غير متوازن — يحتاج مراجعة عاجلة";

  return { status, message, warnings };
}

/** Get distribution for all engineers (Manager View) */
export async function getAllEngineersDistribution(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  const allEngineers = await db.select().from(engineers).where(eq(engineers.status, "active"));
  const results = await Promise.all(
    allEngineers.map(async (eng) => {
      const dist = await getWorkDistribution(eng.id, year, month);
      return {
        engineerId: eng.id,
        engineerName: eng.name,
        distribution: dist,
      };
    })
  );
  return results;
}

/** Get weekly distribution for an engineer */
export async function getWeeklyDistribution(engineerId: number, year: number, weekNumber: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select({
      activityType: workLogs.activityType,
      totalMinutes: sum(workLogs.durationMinutes),
      count: count(workLogs.id),
    })
    .from(workLogs)
    .where(and(
      eq(workLogs.engineerId, engineerId),
      eq(workLogs.year, year),
      eq(workLogs.weekNumber, weekNumber)
    ))
    .groupBy(workLogs.activityType);

  const totalMinutes = rows.reduce((s, r) => s + Number(r.totalMinutes || 0), 0);
  const categories = { meetings: 0, design_3d: 0, design_2d: 0, quotation: 0 };

  for (const r of rows) {
    const cat = getActivityCategory(r.activityType);
    categories[cat] += Number(r.totalMinutes || 0);
  }

  const categoryPct = {
    meetings: totalMinutes > 0 ? Math.round((categories.meetings / totalMinutes) * 1000) / 10 : 0,
    design_3d: totalMinutes > 0 ? Math.round((categories.design_3d / totalMinutes) * 1000) / 10 : 0,
    design_2d: totalMinutes > 0 ? Math.round((categories.design_2d / totalMinutes) * 1000) / 10 : 0,
    quotation: totalMinutes > 0 ? Math.round((categories.quotation / totalMinutes) * 1000) / 10 : 0,
  };

  return {
    engineerId, year, weekNumber, totalMinutes,
    categories: categoryPct,
    distributionScore: calculateDistributionScore(categoryPct),
    feedback: getDistributionFeedback(categoryPct),
  };
}

/** Get critical insights across all engineers */
export async function getCriticalInsights(year: number, month: number) {
  const allDist = await getAllEngineersDistribution(year, month);
  const insights: {
    engineerId: number;
    engineerName: string;
    type: string;
    severity: "high" | "medium" | "low";
    message: string;
  }[] = [];

  for (const { engineerId, engineerName, distribution } of allDist) {
    if (!distribution || distribution.totalMinutes === 0) continue;
    const { categories } = distribution;

    if (categories.meetings > 70)
      insights.push({ engineerId, engineerName, type: "meetings_overload", severity: "high", message: `${engineerName}: ميتينجات كثيرة (${categories.meetings}%) بدون إغلاق كافٍ` });

    if (categories.design_3d > 60)
      insights.push({ engineerId, engineerName, type: "design_overload", severity: "medium", message: `${engineerName}: تركيز زائد على التصميم 3D (${categories.design_3d}%)` });

    if (categories.quotation < 5)
      insights.push({ engineerId, engineerName, type: "no_quotations", severity: "high", message: `${engineerName}: لا يقوم بعروض الأسعار (${categories.quotation}%)` });

    if (categories.meetings < 20)
      insights.push({ engineerId, engineerName, type: "no_meetings", severity: "high", message: `${engineerName}: نقص شديد في الميتينجات (${categories.meetings}%)` });

    if (distribution.distributionScore < 40)
      insights.push({ engineerId, engineerName, type: "unbalanced", severity: "high", message: `${engineerName}: توزيع غير متوازن (Score: ${distribution.distributionScore})` });
  }

  return insights.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

/** Full ranking: Sales + Closing Rate + Distribution Score */
export async function getEngineerRankingFull(year: number, month: number) {
  const [kpiData, allDist] = await Promise.all([
    getEngineersKPI(year, month),
    getAllEngineersDistribution(year, month),
  ]);

  const distMap = new Map(allDist.map(d => [d.engineerId, d.distribution]));

  return kpiData.map(eng => {
    const dist = distMap.get(eng.engineerId);
    const distributionScore = dist?.distributionScore ?? 0;

    // Composite score: 40% Sales, 30% Closing, 30% Distribution
    const salesScore = Math.min(eng.achievementPct, 100);
    // closingRate = closedWon / dealsCount * 100
    const rawClosingRate = eng.dealsCount > 0 ? (eng.closedWon / eng.dealsCount) * 100 : 0;
    const closingScore = Math.min(rawClosingRate * 2, 100); // closing rate * 2 capped at 100
    const compositeScore = Math.round(
      salesScore * 0.4 + closingScore * 0.3 + distributionScore * 0.3
    );

    return {
      engineerId: eng.engineerId,
      engineerName: eng.engineerName,
      salesScore,
      closingScore: Math.round(closingScore),
      distributionScore,
      compositeScore,
      kpiRank: eng.kpiRank,
      closedWon: eng.closedWon,
      totalRevenue: eng.totalDealValue,
      closingRate: Math.round(rawClosingRate * 10) / 10,
      distributionFeedback: dist?.feedback?.status ?? "balanced",
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore)
    .map((eng, idx) => ({ ...eng, fullRank: idx + 1 }));
}

// ─── Time-based Calendar: Task Types & Colors ─────────────────────────────────
export const TASK_TYPE_LABELS: Record<string, string> = {
  meeting_2d:        "ميتينج 2D",
  meeting_3d:        "ميتينج 3D",
  meeting_quotation: "ميتينج عرض سعر",
  meeting_closing:   "ميتينج إغلاق",
  design_3d:         "تصميم 3D",
  design_2d:         "تصميم 2D",
  quotation:         "عرض سعر",
  negotiation:       "تفاوض/إغلاق",
  other:             "أخرى",
};

export const TASK_TYPE_CATEGORY: Record<string, "meetings" | "design_3d" | "design_2d" | "quotation" | "other"> = {
  meeting_2d:        "meetings",
  meeting_3d:        "meetings",
  meeting_quotation: "meetings",
  meeting_closing:   "meetings",
  design_3d:         "design_3d",
  design_2d:         "design_2d",
  quotation:         "quotation",
  negotiation:       "other",
  other:             "other",
};

/** حساب مدة المهمة بالدقائق من startTime/endTime */
function calcDurationMinutes(startTime?: string | null, endTime?: string | null): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end   = eh * 60 + em;
  return end > start ? end - start : 0;
}

/** التحقق من تداخل مهمتين زمنياً */
export function doTimesOverlap(
  s1: string, e1: string,
  s2: string, e2: string
): boolean {
  const [sh1, sm1] = s1.split(":").map(Number);
  const [eh1, em1] = e1.split(":").map(Number);
  const [sh2, sm2] = s2.split(":").map(Number);
  const [eh2, em2] = e2.split(":").map(Number);
  const start1 = sh1 * 60 + sm1, end1 = eh1 * 60 + em1;
  const start2 = sh2 * 60 + sm2, end2 = eh2 * 60 + em2;
  return start1 < end2 && start2 < end1;
}

/**
 * جلب المهام مع فلترة زمنية متقدمة
 * dateRange: 'today' | 'yesterday' | 'week' | 'month' | 'custom'
 */
export async function getTasksFiltered(params: {
  dateRange: "today" | "yesterday" | "week" | "month" | "custom";
  dateFrom?: string;
  dateTo?: string;
  engineerId?: number;
  taskType?: string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  let fromDate: Date;
  let toDate: Date;

  if (params.dateRange === "today") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    toDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (params.dateRange === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    fromDate = new Date(y.getFullYear(), y.getMonth(), y.getDate());
    toDate   = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
  } else if (params.dateRange === "week") {
    const day = now.getDay();
    fromDate = new Date(now); fromDate.setDate(now.getDate() - day);
    fromDate.setHours(0, 0, 0, 0);
    toDate = new Date(fromDate); toDate.setDate(fromDate.getDate() + 6);
    toDate.setHours(23, 59, 59, 999);
  } else if (params.dateRange === "month") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    toDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else {
    // custom
    fromDate = params.dateFrom ? new Date(params.dateFrom + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
    toDate   = params.dateTo   ? new Date(params.dateTo   + "T23:59:59") : new Date();
  }

  const conditions: any[] = [
    gte(dailyTasks.taskDate, fromDate),
    lte(dailyTasks.taskDate, toDate),
    eq(dailyTasks.isDeleted, 0),
  ];
  if (params.engineerId) conditions.push(eq(dailyTasks.engineerId, params.engineerId));
  if (params.taskType)   conditions.push(eq(dailyTasks.taskType, params.taskType as any));
  if (params.status)     conditions.push(eq(dailyTasks.status, params.status as any));

  const tasks = await db
    .select()
    .from(dailyTasks)
    .where(and(...conditions))
    .orderBy(dailyTasks.taskDate, dailyTasks.startTime as any);

  // جلب أسماء المهندسين
  const allEngineers = await db.select({ id: engineers.id, name: engineers.name }).from(engineers).where(eq(engineers.isDeleted, 0));
  const engMap = new Map(allEngineers.map(e => [e.id, e.name]));

  return tasks.map(t => ({
    ...t,
    engineerName: engMap.get(t.engineerId) ?? "غير معروف",
    durationMinutes: calcDurationMinutes(t.startTime, t.endTime),
    taskTypeLabel: TASK_TYPE_LABELS[t.taskType ?? "other"] ?? "أخرى",
    taskCategory: TASK_TYPE_CATEGORY[t.taskType ?? "other"] ?? "other",
  }));
}

/**
 * ملخص توزيع الوقت الفعلي لمهندس في فترة زمنية
 * يُستخدم في KPI وWeekly Report
 */
export async function getTasksTimeSummary(params: {
  engineerId?: number;
  dateFrom: string;
  dateTo: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const fromDate = new Date(params.dateFrom + "T00:00:00");
  const toDate   = new Date(params.dateTo   + "T23:59:59");

  const conditions: any[] = [
    gte(dailyTasks.taskDate, fromDate),
    lte(dailyTasks.taskDate, toDate),
    eq(dailyTasks.isDeleted, 0),
  ];
  if (params.engineerId) conditions.push(eq(dailyTasks.engineerId, params.engineerId));

  const tasks = await db.select().from(dailyTasks).where(and(...conditions));

  let totalMinutes = 0;
  const byCategory: Record<string, number> = { meetings: 0, design_3d: 0, design_2d: 0, quotation: 0, other: 0 };

  for (const t of tasks) {
    const dur = calcDurationMinutes(t.startTime, t.endTime);
    if (dur > 0) {
      totalMinutes += dur;
      const cat = TASK_TYPE_CATEGORY[t.taskType ?? "other"] ?? "other";
      byCategory[cat] = (byCategory[cat] ?? 0) + dur;
    }
  }

  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const pct = (cat: string) => totalMinutes > 0 ? Math.round((byCategory[cat] / totalMinutes) * 100) : 0;

  return {
    totalMinutes,
    totalHours,
    byCategory,
    percentages: {
      meetings:  pct("meetings"),
      design_3d: pct("design_3d"),
      design_2d: pct("design_2d"),
      quotation: pct("quotation"),
      other:     pct("other"),
    },
    taskCount: tasks.length,
  };
}

/**
 * التحقق من تداخل مهمة جديدة مع المهام الموجودة
 */
export async function checkTimeOverlap(params: {
  engineerId: number;
  taskDate: string;
  startTime: string;
  endTime: string;
  excludeTaskId?: number;
}): Promise<{ hasOverlap: boolean; conflictingTask?: { id: number; title: string; startTime: string; endTime: string } }> {
  const db = await getDb();
  if (!db) return { hasOverlap: false };

  const dateObj = new Date(params.taskDate + "T00:00:00");
  const conditions: any[] = [
    eq(dailyTasks.engineerId, params.engineerId),
    eq(dailyTasks.taskDate, dateObj),
    eq(dailyTasks.isDeleted, 0),
  ];
  if (params.excludeTaskId) {
    conditions.push(ne(dailyTasks.id, params.excludeTaskId));
  }

  const existingTasks = await db.select({
    id: dailyTasks.id,
    title: dailyTasks.title,
    startTime: dailyTasks.startTime,
    endTime: dailyTasks.endTime,
  }).from(dailyTasks).where(and(...conditions));

  for (const t of existingTasks) {
    if (!t.startTime || !t.endTime) continue;
    if (doTimesOverlap(params.startTime, params.endTime, t.startTime, t.endTime)) {
      return {
        hasOverlap: true,
        conflictingTask: { id: t.id, title: t.title, startTime: t.startTime, endTime: t.endTime },
      };
    }
  }
  return { hasOverlap: false };
}

/**
 * المهام الحرجة المحسّنة:
 * - متأخرة (isCritical=1)
 * - لم تُنفذ (not_done)
 * - مخططة ومر عليها أكثر من 24 ساعة بدون تحديث
 */
export async function getCriticalTasksEnhanced() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);

  // المهام الحرجة القديمة + not_done + planned قديمة
  const tasks = await db
    .select()
    .from(dailyTasks)
    .where(
      and(
        eq(dailyTasks.isDeleted, 0),
        or(
          eq(dailyTasks.isCritical, 1),
          eq(dailyTasks.status, "not_done"),
          and(
            eq(dailyTasks.status, "planned"),
            lte(dailyTasks.taskDate, yesterday),
          )
        )
      )
    )
    .orderBy(desc(dailyTasks.taskDate))
    .limit(100);

  const allEngineers = await db.select({ id: engineers.id, name: engineers.name }).from(engineers).where(eq(engineers.isDeleted, 0));
  const engMap = new Map(allEngineers.map(e => [e.id, e.name]));

  return tasks.map(t => {
    const ageHours = Math.round((now.getTime() - new Date(t.taskDate).getTime()) / 3600000);
    let alertType: "critical" | "not_done" | "stale_planned" = "critical";
    if (t.status === "not_done") alertType = "not_done";
    else if (t.status === "planned" && ageHours > 24) alertType = "stale_planned";

    return {
      ...t,
      engineerName: engMap.get(t.engineerId) ?? "غير معروف",
      ageHours,
      alertType,
      durationMinutes: calcDurationMinutes(t.startTime, t.endTime),
      taskTypeLabel: TASK_TYPE_LABELS[t.taskType ?? "other"] ?? "أخرى",
    };
  });
}

/**
 * جلب مهام يوم واحد مع بيانات الوقت للـ Timeline
 */
export async function getTasksForTimeline(dateStr: string, engineerId?: number) {
  const db = await getDb();
  if (!db) return [];

  const dateObj = new Date(dateStr + "T00:00:00");
  const conditions: any[] = [
    eq(dailyTasks.taskDate, dateObj),
    eq(dailyTasks.isDeleted, 0),
  ];
  if (engineerId) conditions.push(eq(dailyTasks.engineerId, engineerId));

  const tasks = await db
    .select()
    .from(dailyTasks)
    .where(and(...conditions))
    .orderBy(dailyTasks.startTime as any, dailyTasks.priority);

  const allEngineers = await db.select({ id: engineers.id, name: engineers.name }).from(engineers).where(eq(engineers.isDeleted, 0));
  const engMap = new Map(allEngineers.map(e => [e.id, e.name]));

  return tasks.map(t => ({
    ...t,
    engineerName: engMap.get(t.engineerId) ?? "غير معروف",
    durationMinutes: calcDurationMinutes(t.startTime, t.endTime),
    taskTypeLabel: TASK_TYPE_LABELS[t.taskType ?? "other"] ?? "أخرى",
    taskCategory: TASK_TYPE_CATEGORY[t.taskType ?? "other"] ?? "other",
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE ANALYSIS SYSTEM (Weekly Report Enhancement)
// ═══════════════════════════════════════════════════════════════════════════════

/** Standard target distribution (%) */
export const STANDARD_DISTRIBUTION = {
  meetings: 50,   // meeting_presentation + meeting_closing
  design_3d: 30,  // design_3d + render
  design_2d: 10,  // design_2d
  quotation: 10,  // quotation
} as const;

/** Map taskType → distribution category */
export function getDistributionCategory(taskType: string): keyof typeof STANDARD_DISTRIBUTION {
  if (taskType === "meeting_presentation" || taskType === "meeting_closing" ||
      taskType === "meeting_2d" || taskType === "meeting_3d" || taskType === "meeting_quotation") return "meetings";
  if (taskType === "design_3d" || taskType === "render") return "design_3d";
  if (taskType === "design_2d") return "design_2d";
  if (taskType === "quotation") return "quotation";
  return "meetings"; // default
}

/** Task type labels (new + legacy) */
export const TASK_TYPE_LABELS_V2: Record<string, string> = {
  // 7 Standard Task Types
  design_2d:            "2D Design",
  design_3d:            "3D Modeling",
  render:               "Render",
  quotation:            "Quotation",
  meeting_modeling:     "Meeting Modeling",
  meeting_presentation: "Meeting Presentation",
  meeting_closing:      "Meeting Closing",
  // Legacy
  meeting_2d:           "ميتينج 2D (قديم)",
  meeting_3d:           "ميتينج 3D (قديم)",
  meeting_quotation:    "ميتينج عرض سعر (قديم)",
  closing:              "إغلاق بيع",
  negotiation:          "تفاوض",
  other:                "أخرى",
};

/**
 * Calculate Distribution Score (0–100)
 * Based on how close actual distribution is to STANDARD_DISTRIBUTION
 */
export function calcDistributionScore(actual: {
  meetings: number; design_3d: number; design_2d: number; quotation: number;
}): number {
  const target = STANDARD_DISTRIBUTION;
  const total = actual.meetings + actual.design_3d + actual.design_2d + actual.quotation;
  if (total === 0) return 0;
  // Normalize to percentages
  const actualPct = {
    meetings:  (actual.meetings  / total) * 100,
    design_3d: (actual.design_3d / total) * 100,
    design_2d: (actual.design_2d / total) * 100,
    quotation: (actual.quotation / total) * 100,
  };
  // Calculate deviation for each category
  const deviations = [
    Math.abs(actualPct.meetings  - target.meetings),
    Math.abs(actualPct.design_3d - target.design_3d),
    Math.abs(actualPct.design_2d - target.design_2d),
    Math.abs(actualPct.quotation - target.quotation),
  ];
  const avgDeviation = deviations.reduce((s, d) => s + d, 0) / deviations.length;
  // Score: 100 = perfect, 0 = max deviation (50%)
  const score = Math.max(0, Math.round(100 - (avgDeviation / 50) * 100));
  return score;
}

/**
 * Generate Critical Insights for an engineer based on activity + sales
 */
export function generateCriticalInsights(params: {
  meetingsPct: number;
  design3dPct: number;
  design2dPct: number;
  quotationPct: number;
  sales: number;
  closedDeals: number;
  totalMeetings: number;
  totalQuotations: number;
  distributionScore: number;
}): Array<{ type: "warning" | "danger" | "info"; message: string; icon: string }> {
  const insights: Array<{ type: "warning" | "danger" | "info"; message: string; icon: string }> = [];
  const { meetingsPct, design3dPct, design2dPct, quotationPct, sales, closedDeals, totalMeetings, totalQuotations, distributionScore } = params;

  // Meeting high + Sales low
  if (meetingsPct > 65 && sales < 100000) {
    insights.push({ type: "danger", message: "اجتماعات عالية بدون مبيعات — مشكلة في التفاوض والإغلاق", icon: "🔴" });
  } else if (meetingsPct > 65) {
    insights.push({ type: "warning", message: "نسبة الاجتماعات مرتفعة جداً — تحقق من التوازن", icon: "⚠️" });
  }

  // 3D high + Sales low
  if (design3dPct > 45 && sales < 100000) {
    insights.push({ type: "warning", message: "وقت كبير في التصميم 3D بدون تحويل إلى مبيعات", icon: "⚠️" });
  }

  // 2D very low
  if (design2dPct < 5 && totalMeetings > 0) {
    insights.push({ type: "warning", message: "نقص في أعمال التصميم 2D — Bottleneck في بداية المشاريع", icon: "⚠️" });
  }

  // Quotation very low
  if (quotationPct < 5 && totalMeetings > 3) {
    insights.push({ type: "danger", message: "ضعف في عروض الأسعار — Funnel ضعيف", icon: "🔴" });
  }

  // Meetings high + Closings low
  if (totalMeetings > 5 && closedDeals === 0) {
    insights.push({ type: "danger", message: "اجتماعات كثيرة بدون إغلاق صفقات — راجع مهارات التفاوض", icon: "🔴" });
  }

  // Distribution score low
  if (distributionScore < 50) {
    insights.push({ type: "danger", message: "خلل كبير في توزيع الوقت — يحتاج إعادة ضبط", icon: "🔴" });
  } else if (distributionScore < 70) {
    insights.push({ type: "warning", message: "توزيع الوقت غير متوازن — انحراف متوسط عن المعيار", icon: "⚠️" });
  }

  // Good performance
  if (distributionScore >= 85 && sales > 0) {
    insights.push({ type: "info", message: "توزيع الوقت ممتاز — استمر على هذا المستوى", icon: "✅" });
  }

  return insights;
}

/**
 * Generate Smart Summary for an engineer
 */
export function generateSmartSummary(params: {
  engineerName: string;
  distributionScore: number;
  sales: number;
  closedDeals: number;
  targetAmount: number;
  achievementPct: number;
  insights: Array<{ type: string; message: string }>;
}): string {
  const { distributionScore, sales, closedDeals, achievementPct, insights } = params;
  const dangerInsights = insights.filter(i => i.type === "danger");
  const warningInsights = insights.filter(i => i.type === "warning");

  if (dangerInsights.length > 0) {
    return dangerInsights[0].message;
  }
  if (warningInsights.length > 0) {
    return warningInsights[0].message;
  }
  if (achievementPct >= 80) {
    return `أداء ممتاز — تحقق ${achievementPct}% من الهدف الشهري`;
  }
  if (achievementPct >= 50) {
    return `أداء جيد — ${achievementPct}% من الهدف، تحتاج تسريع الإغلاق`;
  }
  if (closedDeals === 0 && sales === 0) {
    return "لا توجد مبيعات مسجلة — تحقق من حالة الصفقات";
  }
  return `تحقق ${achievementPct}% من الهدف — ركز على تحسين معدل الإغلاق`;
}

/**
 * Main: Get full performance analysis for all engineers (MTD)
 */
export async function getEngineerPerformanceReport(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth   = new Date(year, month, 0, 23, 59, 59);

  // Get all engineers
  const engList = await db.select().from(engineers).where(eq(engineers.isDeleted, 0));

  // Get all tasks for this month
  const allTasks = await db.select().from(dailyTasks).where(
    and(
      eq(dailyTasks.isDeleted, 0),
      gte(dailyTasks.taskDate, startOfMonth),
      lte(dailyTasks.taskDate, endOfMonth),
    )
  );

  // Get all deals (closed_won) for this month
  const allDeals = await db.select().from(deals).where(
    and(
      gte(deals.closedAt, startOfMonth),
      lte(deals.closedAt, endOfMonth),
    )
  );

  // Get engineer targets for this month
  const allTargets = await db.select().from(engineerTargets).where(
    and(eq(engineerTargets.year, year), eq(engineerTargets.month, month))
  );

  return engList.map(eng => {
    const engTasks  = allTasks.filter(t => t.engineerId === eng.id);
    const engDeals  = allDeals.filter(d => d.engineerId === eng.id);
    const engTarget = allTargets.find(t => t.engineerId === eng.id);

    // ─── Activity Breakdown ───────────────────────────────────────────────────
    const activityCounts: Record<string, number> = {};
    const activityMinutes: Record<string, number> = {};
    let totalMinutes = 0;

    for (const t of engTasks) {
      const type = t.taskType ?? "other";
      activityCounts[type] = (activityCounts[type] ?? 0) + 1;
      const mins = calcDurationMinutes(t.startTime, t.endTime) ||
                   (t.plannedHours ? Math.round(parseFloat(String(t.plannedHours)) * 60) : 60);
      activityMinutes[type] = (activityMinutes[type] ?? 0) + mins;
      totalMinutes += mins;
    }

    // ─── Distribution categories ──────────────────────────────────────────────
    const catMinutes = { meetings: 0, design_3d: 0, design_2d: 0, quotation: 0 };
    for (const [type, mins] of Object.entries(activityMinutes)) {
      const cat = getDistributionCategory(type);
      catMinutes[cat] += mins;
    }
    const catPct = {
      meetings:  totalMinutes > 0 ? Math.round((catMinutes.meetings  / totalMinutes) * 100) : 0,
      design_3d: totalMinutes > 0 ? Math.round((catMinutes.design_3d / totalMinutes) * 100) : 0,
      design_2d: totalMinutes > 0 ? Math.round((catMinutes.design_2d / totalMinutes) * 100) : 0,
      quotation: totalMinutes > 0 ? Math.round((catMinutes.quotation / totalMinutes) * 100) : 0,
    };

    // ─── Distribution Score ───────────────────────────────────────────────────
    const distributionScore = calcDistributionScore(catMinutes);

    // ─── Sales ────────────────────────────────────────────────────────────────
    const closedWonDeals = engDeals.filter(d => d.stage === "closed_won");
    const sales = closedWonDeals.reduce((s, d) => s + parseFloat(String(d.value || 0)), 0);
    const closedDeals = closedWonDeals.length;
    const targetAmount = parseFloat(String(engTarget?.targetAmount ?? 0));
    const achievementPct = targetAmount > 0 ? Math.min(999, Math.round((sales / targetAmount) * 100)) : 0;

    // ─── Operational Target Achievement ──────────────────────────────────────
    const totalMeetings = (activityCounts["meeting_presentation"] ?? 0) +
                          (activityCounts["meeting_closing"] ?? 0) +
                          (activityCounts["meeting_2d"] ?? 0) +
                          (activityCounts["meeting_3d"] ?? 0) +
                          (activityCounts["meeting_quotation"] ?? 0);
    const totalDesigns  = (activityCounts["design_2d"] ?? 0) +
                          (activityCounts["design_3d"] ?? 0) +
                          (activityCounts["render"] ?? 0);
    const totalQuotations = activityCounts["quotation"] ?? 0;
    const totalClosings   = (activityCounts["closing"] ?? 0) + closedDeals;

    const opTargets = {
      meetings:   { actual: totalMeetings,  target: engTarget?.targetMeetings  ?? 0, pct: engTarget?.targetMeetings  ? Math.round((totalMeetings  / engTarget.targetMeetings)  * 100) : 0 },
      designs:    { actual: totalDesigns,   target: engTarget?.targetDesigns   ?? 0, pct: engTarget?.targetDesigns   ? Math.round((totalDesigns   / engTarget.targetDesigns)   * 100) : 0 },
      closings:   { actual: totalClosings,  target: engTarget?.targetClosings  ?? 0, pct: engTarget?.targetClosings  ? Math.round((totalClosings  / engTarget.targetClosings)  * 100) : 0 },
      quotations: { actual: totalQuotations, target: engTarget?.targetQuotations ?? 0, pct: engTarget?.targetQuotations ? Math.round((totalQuotations / engTarget.targetQuotations) * 100) : 0 },
      deals:      { actual: closedDeals,    target: engTarget?.targetDeals     ?? 0, pct: engTarget?.targetDeals     ? Math.round((closedDeals    / engTarget.targetDeals)     * 100) : 0 },
    };

    // ─── Critical Insights ────────────────────────────────────────────────────
    const insights = generateCriticalInsights({
      meetingsPct: catPct.meetings, design3dPct: catPct.design_3d,
      design2dPct: catPct.design_2d, quotationPct: catPct.quotation,
      sales, closedDeals, totalMeetings, totalQuotations, distributionScore,
    });

    // ─── Smart Summary ────────────────────────────────────────────────────────
    const smartSummary = generateSmartSummary({
      engineerName: eng.name, distributionScore, sales, closedDeals,
      targetAmount, achievementPct, insights,
    });

    // ─── Ranking Score (composite) ────────────────────────────────────────────
    const rankingScore = Math.round(
      (achievementPct * 0.5) +
      (distributionScore * 0.3) +
      (closedDeals > 0 ? Math.min(100, closedDeals * 10) * 0.2 : 0)
    );

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      // Sales
      sales, closedDeals, targetAmount, achievementPct,
      // Activity counts
      activityCounts,
      totalMeetings, totalDesigns, totalQuotations, totalClosings,
      // Time distribution
      totalMinutes,
      catMinutes, catPct,
      distributionScore,
      // Operational targets
      opTargets,
      // Analysis
      insights,
      smartSummary,
      rankingScore,
    };
  }).sort((a, b) => b.rankingScore - a.rankingScore);
}

/**
 * Get weekly performance analysis (last 7 days)
 */
export async function getWeeklyPerformanceAnalysis() {
  const now   = new Date();
  const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);

  const db = await getDb();
  if (!db) return null;

  const engList  = await db.select().from(engineers).where(eq(engineers.isDeleted, 0));
  const allTasks = await db.select().from(dailyTasks).where(
    and(eq(dailyTasks.isDeleted, 0), gte(dailyTasks.taskDate, start), lte(dailyTasks.taskDate, end))
  );
  const allDeals = await db.select().from(deals).where(
    and(gte(deals.closedAt, start), lte(deals.closedAt, end))
  );

  // Get current month targets
  const year = now.getFullYear(); const month = now.getMonth() + 1;
  const allTargets = await db.select().from(engineerTargets).where(
    and(eq(engineerTargets.year, year), eq(engineerTargets.month, month))
  );

  const engineerReports = engList.map(eng => {
    const engTasks = allTasks.filter(t => t.engineerId === eng.id);
    const engDeals = allDeals.filter(d => d.engineerId === eng.id);
    const engTarget = allTargets.find(t => t.engineerId === eng.id);

    const activityCounts: Record<string, number> = {};
    const activityMinutes: Record<string, number> = {};
    let totalMinutes = 0;

    for (const t of engTasks) {
      const type = t.taskType ?? "other";
      activityCounts[type] = (activityCounts[type] ?? 0) + 1;
      const mins = calcDurationMinutes(t.startTime, t.endTime) ||
                   (t.plannedHours ? Math.round(parseFloat(String(t.plannedHours)) * 60) : 60);
      activityMinutes[type] = (activityMinutes[type] ?? 0) + mins;
      totalMinutes += mins;
    }

    const catMinutes = { meetings: 0, design_3d: 0, design_2d: 0, quotation: 0 };
    for (const [type, mins] of Object.entries(activityMinutes)) {
      catMinutes[getDistributionCategory(type)] += mins;
    }
    const catPct = {
      meetings:  totalMinutes > 0 ? Math.round((catMinutes.meetings  / totalMinutes) * 100) : 0,
      design_3d: totalMinutes > 0 ? Math.round((catMinutes.design_3d / totalMinutes) * 100) : 0,
      design_2d: totalMinutes > 0 ? Math.round((catMinutes.design_2d / totalMinutes) * 100) : 0,
      quotation: totalMinutes > 0 ? Math.round((catMinutes.quotation / totalMinutes) * 100) : 0,
    };

    const distributionScore = calcDistributionScore(catMinutes);
    const closedWon = engDeals.filter(d => d.stage === "closed_won");
    const sales = closedWon.reduce((s, d) => s + parseFloat(String(d.value || 0)), 0);
    const closedDeals = closedWon.length;
    const targetAmount = parseFloat(String(engTarget?.targetAmount ?? 0));
    const achievementPct = targetAmount > 0 ? Math.min(999, Math.round((sales / targetAmount) * 100)) : 0;

    const totalMeetings = Object.entries(activityCounts)
      .filter(([k]) => k.startsWith("meeting_")).reduce((s, [, v]) => s + v, 0);
    const totalDesigns = (activityCounts["design_2d"] ?? 0) + (activityCounts["design_3d"] ?? 0) + (activityCounts["render"] ?? 0);
    const totalQuotations = activityCounts["quotation"] ?? 0;

    const insights = generateCriticalInsights({
      meetingsPct: catPct.meetings, design3dPct: catPct.design_3d,
      design2dPct: catPct.design_2d, quotationPct: catPct.quotation,
      sales, closedDeals, totalMeetings, totalQuotations, distributionScore,
    });

    const smartSummary = generateSmartSummary({
      engineerName: eng.name, distributionScore, sales, closedDeals,
      targetAmount, achievementPct, insights,
    });

    return {
      engineerId: eng.id, engineerName: eng.name,
      sales, closedDeals, targetAmount, achievementPct,
      activityCounts, totalMinutes, catMinutes, catPct,
      distributionScore, insights, smartSummary,
      totalMeetings, totalDesigns, totalQuotations,
      tasksDone: engTasks.filter(t => t.status === "completed").length,
      tasksTotal: engTasks.length,
    };
  }).sort((a, b) => {
    // Rank by: sales (50%) + distributionScore (30%) + closedDeals (20%)
    const scoreA = (a.achievementPct * 0.5) + (a.distributionScore * 0.3) + (Math.min(100, a.closedDeals * 10) * 0.2);
    const scoreB = (b.achievementPct * 0.5) + (b.distributionScore * 0.3) + (Math.min(100, b.closedDeals * 10) * 0.2);
    return scoreB - scoreA;
  });

  // Team summary
  const totalSales = engineerReports.reduce((s, e) => s + e.sales, 0);
  const avgDistScore = engineerReports.length > 0
    ? Math.round(engineerReports.reduce((s, e) => s + e.distributionScore, 0) / engineerReports.length)
    : 0;

  return {
    weekStart: start.toISOString(),
    weekEnd:   end.toISOString(),
    generatedAt: now.toISOString(),
    standardDistribution: STANDARD_DISTRIBUTION,
    engineerReports,
    teamSummary: {
      totalSales,
      avgDistributionScore: avgDistScore,
      totalClosedDeals: engineerReports.reduce((s, e) => s + e.closedDeals, 0),
      topPerformer: engineerReports[0] ?? null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED DISCOUNT & PIPELINE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/** حساب نسبة الخصم المتاحة بناءً على Closing Rate (Performance-Based) */
export function getPerformanceBasedDiscountPct(closingRate: number, basePct: number): number {
  // Closing Rate > 60% → +2% bonus
  // Closing Rate 40-60% → base
  // Closing Rate < 40% → -2% penalty
  if (closingRate >= 0.6) return basePct + 2;
  if (closingRate < 0.4) return Math.max(0, basePct - 2);
  return basePct;
}

/** حساب Saved Discount Bonus لصفقة مغلقة */
export function calcSavedDiscountBonus(dealValue: number, maxDiscountPct: number, usedDiscountPct: number): {
  maxDiscountValue: number;
  usedDiscountValue: number;
  savedDiscountValue: number;
  engineerBonus: number;
  companyProfit: number;
} {
  const maxDiscountValue = dealValue * (maxDiscountPct / 100);
  const usedDiscountValue = dealValue * (usedDiscountPct / 100);
  const savedDiscountValue = Math.max(0, maxDiscountValue - usedDiscountValue);
  const engineerBonus = savedDiscountValue * 0.5;  // 50% للمهندس
  const companyProfit = savedDiscountValue * 0.5;  // 50% للشركة
  return { maxDiscountValue, usedDiscountValue, savedDiscountValue, engineerBonus, companyProfit };
}

/** Pipeline Stats لكل مهندس (آخر 60 يوم) */
export async function getEngineerPipelineStats(engineerId?: number) {
  const db = await getDb();
  if (!db) return [];

  const since60 = new Date();
  since60.setDate(since60.getDate() - 60);

  const engList = await db.select({ id: engineers.id, name: engineers.name, role: engineers.role })
    .from(engineers)
    .where(and(eq(engineers.isDeleted, 0)));

  const allDeals = await db.select().from(deals)
    .where(and(eq(deals.isDeleted, 0), gte(deals.createdAt, since60)));

  const targetEngineers = engineerId
    ? engList.filter(e => e.id === engineerId)
    : engList.filter(e => !['admin_sales', 'group_admin'].includes(e.role ?? ''));

  return targetEngineers.map(eng => {
    const engDeals = allDeals.filter(d => d.engineerId === eng.id);

    const closedWon = engDeals.filter(d => d.stage === 'closed_won');
    const negotiation = engDeals.filter(d => d.stage === 'negotiation');
    const proposal = engDeals.filter(d => d.stage === 'proposal' || d.stage === 'contract_sent');
    const closedLost = engDeals.filter(d => d.stage === 'closed_lost');

    const closedWonValue = closedWon.reduce((s, d) => s + parseFloat(d.value as string), 0);
    const negotiationValue = negotiation.reduce((s, d) => s + parseFloat(d.value as string), 0);
    const proposalValue = proposal.reduce((s, d) => s + parseFloat(d.value as string), 0);
    const closedLostValue = closedLost.reduce((s, d) => s + parseFloat(d.value as string), 0);

    const totalDeals = engDeals.length;
    const closingRate = totalDeals > 0 ? closedWon.length / totalDeals : 0;

    // Pipeline Value = Negotiation + Proposal
    const pipelineValue = negotiationValue + proposalValue;

    // Discount Pool = (Actual Sales × base%) + (Negotiation × bonus%)
    const { tierLabel, discountPct } = getDiscountTierInfo(closedWonValue + negotiationValue);
    const performancePct = getPerformanceBasedDiscountPct(closingRate, discountPct);
    const discountPool = (closedWonValue * (performancePct / 100)) + (negotiationValue * (performancePct / 2 / 100));

    // Used Discount
    const usedDiscount = closedWon.reduce((s, d) => s + parseFloat(d.discountValue as string || '0'), 0);
    const savedDiscount = Math.max(0, discountPool - usedDiscount);

    // Saved Bonus = 50% of saved discount
    const engineerBonus = savedDiscount * 0.5;

    // Pending Approval
    const pendingApproval = engDeals.filter(d => d.discountApprovalStatus === 'pending');

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      role: eng.role,
      // Pipeline breakdown
      closedWon: { count: closedWon.length, value: closedWonValue },
      negotiation: { count: negotiation.length, value: negotiationValue },
      proposal: { count: proposal.length, value: proposalValue },
      closedLost: { count: closedLost.length, value: closedLostValue },
      // KPIs
      totalDeals,
      closingRate,
      closingRatePct: Math.round(closingRate * 100),
      pipelineValue,
      // Discount System
      discountPct: performancePct,
      tierLabel,
      discountPool,
      usedDiscount,
      remainingDiscount: Math.max(0, discountPool - usedDiscount),
      savedDiscount,
      engineerBonus,
      companyProfit: savedDiscount * 0.5,
      // Pending approvals
      pendingApprovalCount: pendingApproval.length,
    };
  });
}

/** نظرة عامة على الـ Pipeline الكلي */
export async function getPipelineOverview() {
  const db = await getDb();
  if (!db) return null;

  const since60 = new Date();
  since60.setDate(since60.getDate() - 60);

  const allDeals = await db.select().from(deals)
    .where(and(eq(deals.isDeleted, 0), gte(deals.createdAt, since60)));

  const closedWonValue = allDeals.filter(d => d.stage === 'closed_won')
    .reduce((s, d) => s + parseFloat(d.value as string), 0);
  const negotiationValue = allDeals.filter(d => d.stage === 'negotiation')
    .reduce((s, d) => s + parseFloat(d.value as string), 0);
  const proposalValue = allDeals.filter(d => d.stage === 'proposal' || d.stage === 'contract_sent')
    .reduce((s, d) => s + parseFloat(d.value as string), 0);
  const closedLostValue = allDeals.filter(d => d.stage === 'closed_lost')
    .reduce((s, d) => s + parseFloat(d.value as string), 0);

  const totalPipeline = negotiationValue + proposalValue;
  const { tierLabel, discountPct } = getDiscountTierInfo(closedWonValue + totalPipeline);
  const totalDiscountPool = (closedWonValue + totalPipeline) * (discountPct / 100);
  const totalUsedDiscount = allDeals.filter(d => d.stage === 'closed_won')
    .reduce((s, d) => s + parseFloat(d.discountValue as string || '0'), 0);
  const totalSavedBonus = allDeals.filter(d => d.stage === 'closed_won')
    .reduce((s, d) => s + parseFloat(d.savedDiscountBonus as string || '0'), 0);

  const pendingApprovals = allDeals.filter(d => d.discountApprovalStatus === 'pending');

  return {
    closedWonValue,
    negotiationValue,
    proposalValue,
    closedLostValue,
    totalPipeline,
    tierLabel,
    discountPct,
    totalDiscountPool,
    totalUsedDiscount,
    remainingDiscount: Math.max(0, totalDiscountPool - totalUsedDiscount),
    totalSavedBonus,
    pendingApprovals: pendingApprovals.map(d => ({
      id: d.id,
      clientName: d.clientName,
      value: parseFloat(d.value as string),
      discountValue: parseFloat(d.discountValue as string || '0'),
      discountPercent: parseFloat(d.discountPercent as string || '0'),
    })),
  };
}

/** تحديث حالة موافقة الخصم */
export async function updateDiscountApproval(dealId: number, status: 'approved' | 'rejected', approvedBy?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(deals).set({
    discountApprovalStatus: status,
    discountApprovedBy: approvedBy,
  }).where(eq(deals.id, dealId));
}

/** حساب وحفظ Saved Discount Bonus عند إغلاق صفقة */
export async function computeAndSaveDealBonus(dealId: number) {
  const db = await getDb();
  if (!db) return;
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal || deal.stage !== 'closed_won') return;

  const dealValue = parseFloat(deal.value as string);
  const maxPct = parseFloat(deal.maxDiscountPct as string || '0');
  const usedPct = parseFloat(deal.discountPercent as string || '0');

  const { engineerBonus } = calcSavedDiscountBonus(dealValue, maxPct, usedPct);
  await db.update(deals).set({ savedDiscountBonus: String(engineerBonus) }).where(eq(deals.id, dealId));
  return engineerBonus;
}

/** إجمالي Bonus لكل مهندس */
export async function getEngineerBonusSummary() {
  const db = await getDb();
  if (!db) return [];

  const engList = await db.select({ id: engineers.id, name: engineers.name })
    .from(engineers).where(eq(engineers.isDeleted, 0));

  const closedDeals = await db.select().from(deals)
    .where(and(eq(deals.stage, 'closed_won'), eq(deals.isDeleted, 0)));

  return engList.map(eng => {
    const engDeals = closedDeals.filter(d => d.engineerId === eng.id);
    const totalBonus = engDeals.reduce((s, d) => s + parseFloat(d.savedDiscountBonus as string || '0'), 0);
    const totalSaved = engDeals.reduce((s, d) => {
      const v = parseFloat(d.value as string);
      const maxPct = parseFloat(d.maxDiscountPct as string || '0');
      const usedPct = parseFloat(d.discountPercent as string || '0');
      return s + Math.max(0, v * (maxPct - usedPct) / 100);
    }, 0);
    return {
      engineerId: eng.id,
      engineerName: eng.name,
      totalBonus,
      totalSaved,
      dealsCount: engDeals.length,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT-BASED KPI + DISTRIBUTION SCORE + BEHAVIOR CONTROL + SMART RANKING
// ═══════════════════════════════════════════════════════════════════════════════

/** التوزيع المثالي للوقت */
export const IDEAL_DISTRIBUTION = {
  meetings: 0.50,    // 50% Meetings (عرض + Closing)
  design3d: 0.30,    // 30% 3D Modeling + Render
  design2d: 0.10,    // 10% 2D
  quotation: 0.10,   // 10% Quotations
};

/** تصنيف Task Type إلى فئة رئيسية */
export function classifyTaskType(taskType: string | null): 'meetings' | 'design3d' | 'design2d' | 'quotation' | 'other' {
  if (!taskType) return 'other';
  if (['meeting_modeling', 'meeting_closing', 'meeting_2d', 'meeting_3d', 'meeting_quotation', 'negotiation'].includes(taskType)) return 'meetings';
  if (['design_3d', '3d_modeling', 'render'].includes(taskType)) return 'design3d';
  if (['design_2d', '2d'].includes(taskType)) return 'design2d';
  if (['quotation'].includes(taskType)) return 'quotation';
  return 'other';
}

/** حساب Distribution Score (0-100) */
export function calcDistributionScoreFromHours(hoursMap: { meetings: number; design3d: number; design2d: number; quotation: number; other: number }): {
  score: number;
  actualPct: { meetings: number; design3d: number; design2d: number; quotation: number };
  deviations: { meetings: number; design3d: number; design2d: number; quotation: number };
  level: 'excellent' | 'good' | 'fair' | 'poor';
} {
  const total = hoursMap.meetings + hoursMap.design3d + hoursMap.design2d + hoursMap.quotation + hoursMap.other;
  if (total === 0) return {
    score: 0,
    actualPct: { meetings: 0, design3d: 0, design2d: 0, quotation: 0 },
    deviations: { meetings: 0, design3d: 0, design2d: 0, quotation: 0 },
    level: 'poor',
  };

  const actualPct = {
    meetings: hoursMap.meetings / total,
    design3d: hoursMap.design3d / total,
    design2d: hoursMap.design2d / total,
    quotation: hoursMap.quotation / total,
  };

  // الانحراف عن المثالي (بالقيمة المطلقة)
  const deviations = {
    meetings: Math.abs(actualPct.meetings - IDEAL_DISTRIBUTION.meetings),
    design3d: Math.abs(actualPct.design3d - IDEAL_DISTRIBUTION.design3d),
    design2d: Math.abs(actualPct.design2d - IDEAL_DISTRIBUTION.design2d),
    quotation: Math.abs(actualPct.quotation - IDEAL_DISTRIBUTION.quotation),
  };

  // متوسط الانحراف الكلي (0 = مثالي، 1 = أسوأ)
  const avgDeviation = (deviations.meetings + deviations.design3d + deviations.design2d + deviations.quotation) / 4;
  const score = Math.round(Math.max(0, 100 - avgDeviation * 200));

  const level: 'excellent' | 'good' | 'fair' | 'poor' =
    score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor';

  return {
    score,
    actualPct: {
      meetings: Math.round(actualPct.meetings * 100),
      design3d: Math.round(actualPct.design3d * 100),
      design2d: Math.round(actualPct.design2d * 100),
      quotation: Math.round(actualPct.quotation * 100),
    },
    deviations: {
      meetings: Math.round(deviations.meetings * 100),
      design3d: Math.round(deviations.design3d * 100),
      design2d: Math.round(deviations.design2d * 100),
      quotation: Math.round(deviations.quotation * 100),
    },
    level,
  };
}

/** توليد Behavior Alerts بناءً على الأداء الفعلي */
export function generateBehaviorAlerts(params: {
  actualPct: { meetings: number; design3d: number; design2d: number; quotation: number };
  closingRate: number;
  salesAchievement: number;
  closedDeals: number;
  totalTasks: number;
}): Array<{ type: 'warning' | 'danger' | 'info'; message: string; code: string }> {
  const alerts: Array<{ type: 'warning' | 'danger' | 'info'; message: string; code: string }> = [];
  const { actualPct, closingRate, salesAchievement, closedDeals, totalTasks } = params;

  // High Meetings + Low Closing
  if (actualPct.meetings > 60 && closingRate < 0.3) {
    alerts.push({ type: 'danger', message: 'اجتماعات كثيرة بدون إغلاق صفقات — مشكلة في مهارة التفاوض', code: 'HIGH_MEETINGS_LOW_CLOSING' });
  }

  // High 3D + Low Sales
  if (actualPct.design3d > 45 && salesAchievement < 0.4) {
    alerts.push({ type: 'warning', message: 'تصميم 3D مرتفع بدون مبيعات — شغل بدون عائد', code: 'HIGH_3D_LOW_SALES' });
  }

  // Low Quotations
  if (actualPct.quotation < 5 && totalTasks > 5) {
    alerts.push({ type: 'warning', message: 'نقص في عروض الأسعار — Funnel ضعيف', code: 'LOW_QUOTATIONS' });
  }

  // Low 2D
  if (actualPct.design2d < 5 && totalTasks > 5) {
    alerts.push({ type: 'info', message: 'نقص في أعمال التصميم 2D — Bottleneck في البداية', code: 'LOW_2D' });
  }

  // High Activity + Low Output
  if (totalTasks >= 20 && closedDeals <= 1) {
    alerts.push({ type: 'danger', message: 'نشاط عالي بدون نتائج — عدد المهام لا يعكس الأداء الحقيقي', code: 'HIGH_ACTIVITY_LOW_OUTPUT' });
  }

  // Avoiding Closing
  if (actualPct.meetings > 40 && closingRate < 0.2) {
    alerts.push({ type: 'danger', message: 'المهندس يتجنب مرحلة الإغلاق', code: 'AVOIDING_CLOSING' });
  }

  return alerts;
}

/** توليد Critical Insights نصية */
export function generateCriticalInsightsV2(params: {
  actualPct: { meetings: number; design3d: number; design2d: number; quotation: number };
  closingRate: number;
  salesAchievement: number;
  distributionScore: number;
}): string[] {
  const insights: string[] = [];
  const { actualPct, closingRate, salesAchievement, distributionScore } = params;

  if (actualPct.meetings > 60 && closingRate < 0.3) insights.push('High Meetings - Low Sales');
  if (actualPct.design3d > 40 && salesAchievement < 0.4) insights.push('Strong Design - Weak Closing');
  if (actualPct.quotation < 8) insights.push('Low Quotations Activity');
  if (distributionScore < 50) insights.push('Unbalanced Workload');
  if (closingRate < 0.2 && salesAchievement < 0.3) insights.push('Critical: Low Performance Across All Metrics');
  if (actualPct.meetings > 50 && actualPct.design3d < 15) insights.push('Neglecting Design Work');

  return insights;
}

/** Output-Based KPI الكامل لكل مهندس (آخر 60 يوم) */
export async function getOutputBasedKPI(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  // تحديد نطاق الشهر
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const engList = await db.select().from(engineers).where(eq(engineers.isDeleted, 0));

   // جلب المهام
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  const tasks = await db.select().from(dailyTasks)
    .where(and(
      sql`${dailyTasks.taskDate} >= ${startStr}`,
      sql`${dailyTasks.taskDate} <= ${endStr}`,
      eq(dailyTasks.isDeleted, 0),
    ));
  // جلب الصفقات
  const allDeals = await db.select().from(deals)
    .where(and(eq(deals.isDeleted, 0), sql`${deals.createdAt} >= ${startDate}`, sql`${deals.createdAt} <= ${endDate}`));
  // جلب الأهداف
  const targets = await db.select().from(engineerTargets)
    .where(and(eq(engineerTargets.year, year), eq(engineerTargets.month, month)));
  return engList
    .filter(eng => !['admin_sales', 'group_admin'].includes(eng.role ?? ''))
    .map(eng => {
      const engTasks = tasks.filter(t => t.engineerId === eng.id);
      const engDeals = allDeals.filter(d => d.engineerId === eng.id);
      const target = targets.find(t => t.engineerId === eng.id);

      // حساب ساعات لكل نوع
      const hoursMap = { meetings: 0, design3d: 0, design2d: 0, quotation: 0, other: 0 };
      const countMap = { meetings: 0, design3d: 0, design2d: 0, quotation: 0, other: 0 };

      for (const task of engTasks) {
        const cat = classifyTaskType(task.taskType ?? null);
         const hours = task.plannedHours ?? 1;
        hoursMap[cat] += hours;
        countMap[cat]++;
      }
      const distribution = calcDistributionScoreFromHours(hoursMap);
      // Output Metricss
      const closedDeals = engDeals.filter(d => d.stage === 'closed_won');
      const closedDealsCount = closedDeals.length;
      const totalSales = closedDeals.reduce((s, d) => s + parseFloat(d.value as string), 0);
      const totalDeals = engDeals.length;
      const closingRate = totalDeals > 0 ? closedDealsCount / totalDeals : 0;

      // Design output
      const designsCount = countMap.design3d + countMap.design2d;

      // Target Achievement
      const targetAmount = target ? parseFloat(target.targetAmount as string) : 0;
      const salesAchievement = targetAmount > 0 ? totalSales / targetAmount : 0;
      const targetDesigns = target?.targetDesigns ?? 0;
      const designsAchievement = targetDesigns > 0 ? designsCount / targetDesigns : 0;
      const targetMeetings = target?.targetMeetings ?? 0;
      const meetingsAchievement = targetMeetings > 0 ? countMap.meetings / targetMeetings : 0;
      const targetClosings = target?.targetClosings ?? 0;
      const closingsAchievement = targetClosings > 0 ? closedDealsCount / targetClosings : 0;

      // Behavior Alerts
      const behaviorAlerts = generateBehaviorAlerts({
        actualPct: distribution.actualPct,
        closingRate,
        salesAchievement,
        closedDeals: closedDealsCount,
        totalTasks: engTasks.length,
      });

      // Critical Insights
      const criticalInsights = generateCriticalInsightsV2({
        actualPct: distribution.actualPct,
        closingRate,
        salesAchievement,
        distributionScore: distribution.score,
      });

      // Smart Ranking Score (0-100)
      const rankingScore = Math.round(
        (salesAchievement * 40) +          // 40% Sales Achievement
        (closingRate * 30) +               // 30% Closing Rate
        (distribution.score / 100 * 20) + // 20% Distribution Balance
        (designsAchievement * 10)          // 10% Design Output
      );

      return {
        engineerId: eng.id,
        engineerName: eng.name,
        role: eng.role,
        // Task Counts
        totalTasks: engTasks.length,
        taskCounts: countMap,
        taskHours: hoursMap,
        // Distribution
        distribution,
        // Output
        closedDealsCount,
        totalSales,
        totalDeals,
        closingRate: Math.round(closingRate * 100),
        designsCount,
        // Target Achievement
        target: {
          amount: targetAmount,
          deals: target?.targetDeals ?? 0,
          meetings: targetMeetings,
          designs: targetDesigns,
          closings: targetClosings,
          quotations: target?.targetQuotations ?? 0,
        },
        achievement: {
          sales: Math.round(salesAchievement * 100),
          designs: Math.round(designsAchievement * 100),
          meetings: Math.round(meetingsAchievement * 100),
          closings: Math.round(closingsAchievement * 100),
        },
        // Behavior & Insights
        behaviorAlerts,
        criticalInsights,
        // Smart Ranking
        rankingScore,
      };
    })
    .sort((a, b) => b.rankingScore - a.rankingScore);
}

/** Weekly Performance Analysis (آخر 7 أيام) */
export async function getWeeklyPerformanceFull() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = now.toISOString().split('T')[0];

  const engList = await db.select().from(engineers).where(eq(engineers.isDeleted, 0));

   const tasks = await db.select().from(dailyTasks)
    .where(and(
      sql`${dailyTasks.taskDate} >= ${weekStartStr}`,
      sql`${dailyTasks.taskDate} <= ${weekEndStr}`,
      eq(dailyTasks.isDeleted, 0),
    ));
  const allDeals = await db.select().from(deals)
    .where(and(eq(deals.isDeleted, 0), sql`${deals.createdAt} >= ${weekStart}`));

  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const targets = await db.select().from(engineerTargets)
    .where(and(eq(engineerTargets.year, year), eq(engineerTargets.month, month)));

  return engList
    .filter(eng => !['admin_sales', 'group_admin'].includes(eng.role ?? ''))
    .map(eng => {
      const engTasks = tasks.filter(t => t.engineerId === eng.id);
      const engDeals = allDeals.filter(d => d.engineerId === eng.id);
      const target = targets.find(t => t.engineerId === eng.id);

      const hoursMap = { meetings: 0, design3d: 0, design2d: 0, quotation: 0, other: 0 };
      const countMap = { meetings: 0, design3d: 0, design2d: 0, quotation: 0, other: 0 };

      for (const task of engTasks) {
        const cat = classifyTaskType(task.taskType ?? null);
        const hours = task.plannedHours ?? 1;
        hoursMap[cat] += hours;
        countMap[cat]++;
      }
      const distribution = calcDistributionScoreFromHours(hoursMap);
      const closedDeals = engDeals.filter(d => d.stage === 'closed_won');
      const totalSales = closedDeals.reduce((s: number, d: typeof closedDeals[0]) => s + parseFloat(d.value as string), 0);
      const closingRate = engDeals.length > 0 ? closedDeals.length / engDeals.length : 0;
      const targetAmount = target ? parseFloat(target.targetAmount as string) : 0;
      const salesAchievement = targetAmount > 0 ? totalSales / targetAmount : 0;

      const behaviorAlerts = generateBehaviorAlerts({
        actualPct: distribution.actualPct,
        closingRate,
        salesAchievement,
        closedDeals: closedDeals.length,
        totalTasks: engTasks.length,
      });

      const criticalInsights = generateCriticalInsightsV2({
        actualPct: distribution.actualPct,
        closingRate,
        salesAchievement,
        distributionScore: distribution.score,
      });

      // هل المهندس Balanced؟
      const isBalanced = distribution.score >= 70;
      const dominantActivity = Object.entries(distribution.actualPct)
        .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'other';

      return {
        engineerId: eng.id,
        engineerName: eng.name,
        weekRange: { start: weekStartStr, end: weekEndStr },
        totalTasks: engTasks.length,
        taskCounts: countMap,
        taskHours: hoursMap,
        distribution,
        isBalanced,
        dominantActivity,
        closedDealsCount: closedDeals.length,
        totalSales,
        closingRate: Math.round(closingRate * 100),
        salesAchievement: Math.round(salesAchievement * 100),
        behaviorAlerts,
        criticalInsights,
        summary: isBalanced
          ? `أداء متوازن هذا الأسبوع — Distribution Score: ${distribution.score}%`
          : `توزيع غير متوازن — تركيز زائد على ${dominantActivity === 'meetings' ? 'الاجتماعات' : dominantActivity === 'design3d' ? '3D' : dominantActivity === 'design2d' ? '2D' : 'عروض الأسعار'}`,
      };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBOOK SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/** جلب كل عناصر الـ Playbook */
export async function getPlaybookItems(category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(playbookItems.isActive, 1)];
  if (category) conditions.push(eq(playbookItems.category, category));
  return db.select().from(playbookItems)
    .where(and(...conditions))
    .orderBy(playbookItems.sortOrder, playbookItems.name);
}

/** جلب عنصر واحد من الـ Playbook */
export async function getPlaybookItemById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(playbookItems).where(eq(playbookItems.id, id));
  return rows[0] ?? null;
}

/** إنشاء عنصر جديد في الـ Playbook */
export async function createPlaybookItem(data: Omit<InsertPlaybookItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const result = await db.insert(playbookItems).values(data);
  return result;
}

/** تحديث عنصر في الـ Playbook */
export async function updatePlaybookItem(id: number, data: Partial<Omit<InsertPlaybookItem, 'id' | 'createdAt' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.update(playbookItems).set(data).where(eq(playbookItems.id, id));
  return { success: true };
}

/** حذف عنصر من الـ Playbook (soft delete) */
export async function deletePlaybookItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.update(playbookItems).set({ isActive: 0 }).where(eq(playbookItems.id, id));
  return { success: true };
}

/** استيراد عناصر من Excel (batch insert) */
export async function importPlaybookItems(items: Array<Omit<InsertPlaybookItem, 'id' | 'createdAt' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  if (items.length === 0) return { inserted: 0 };
  await db.insert(playbookItems).values(items);
  return { inserted: items.length };
}

/** جلب تصنيفات الـ Playbook */
export async function getPlaybookCategories() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.selectDistinct({ category: playbookItems.category })
    .from(playbookItems)
    .where(and(eq(playbookItems.isActive, 1)));
  return rows.map(r => r.category).filter(Boolean) as string[];
}

/** إنشاء عرض سعر جديد */
export async function createPlaybookQuotation(data: {
  engineerId: number;
  dealId?: number;
  clientName?: string;
  items: Array<{ itemId: number; qty: number; price: number; notes?: string }>;
  totalValue: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const result = await db.insert(playbookQuotations).values({
    engineerId: data.engineerId,
    dealId: data.dealId,
    clientName: data.clientName,
    itemsJson: JSON.stringify(data.items),
    totalValue: data.totalValue.toString(),
    notes: data.notes,
    status: 'draft',
  });
  return result;
}

/** جلب عروض الأسعار لمهندس */
export async function getPlaybookQuotations(engineerId?: number, dealId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (engineerId) conditions.push(eq(playbookQuotations.engineerId, engineerId));
  if (dealId) conditions.push(eq(playbookQuotations.dealId, dealId));
  const rows = await db.select().from(playbookQuotations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(playbookQuotations.createdAt));
  return rows;
}

/** تحديث رابط التسجيل */
export async function updatePlaybookRecordingLink(quotationId: number, recordingLink: string) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.update(playbookQuotations)
    .set({ recordingLink, status: 'presented' })
    .where(eq(playbookQuotations.id, quotationId));
  return { success: true };
}

/** تحديث حالة العرض */
export async function updatePlaybookQuotationStatus(quotationId: number, status: 'draft' | 'presented' | 'accepted' | 'rejected') {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.update(playbookQuotations).set({ status }).where(eq(playbookQuotations.id, quotationId));
  return { success: true };
}

/** جلب Funnel Analysis الكامل */
export async function getFunnelAnalysis(engineerId?: number) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  // Leads
  const allLeads = await db.select({ id: leads.id, engineerId: leads.assignedEngineerId, status: leads.status })
    .from(leads)
    .where(and(eq(leads.isDeleted, 0), gte(leads.createdAt, monthStart)));
  // Visits (Meetings)
  const allVisits = await db.select({ id: visits.id, engineerId: visits.engineerId, status: visits.status })
    .from(visits)
    .where(and(eq(visits.isDeleted, 0), gte(visits.createdAt, monthStart)));
  // Deals
  const allDeals = await db.select({ id: deals.id, engineerId: deals.engineerId, stage: deals.stage, lostReason: deals.lostReason, value: deals.value })
    .from(deals)
    .where(and(eq(deals.isDeleted, 0), gte(deals.createdAt, monthStart)));
  const filterByEng = (arr: any[]) => engineerId ? arr.filter(x => x.engineerId === engineerId) : arr;
  const engLeads = filterByEng(allLeads);
  const engVisits = filterByEng(allVisits);
  const engDeals = filterByEng(allDeals);
  const closedWon = engDeals.filter(d => d.stage === 'closed_won');
  const closedLost = engDeals.filter(d => d.stage === 'closed_lost');
  const proposals = engDeals.filter(d => ['proposal', 'contract_sent', 'negotiation'].includes(d.stage));
  // Conversion Rates
  const leadToMeeting = engLeads.length > 0 ? engVisits.length / engLeads.length : 0;
  const meetingToProposal = engVisits.length > 0 ? proposals.length / engVisits.length : 0;
  const proposalToClose = proposals.length > 0 ? closedWon.length / proposals.length : 0;
  const overallConversion = engLeads.length > 0 ? closedWon.length / engLeads.length : 0;
  // Lost Deals Analysis
  const lostReasons: Record<string, number> = {};
  for (const d of closedLost) {
    const reason = d.lostReason ?? 'غير محدد';
    lostReasons[reason] = (lostReasons[reason] ?? 0) + 1;
  }
  const lostReasonsArray = Object.entries(lostReasons)
    .map(([reason, count]) => ({ reason, count, pct: closedLost.length > 0 ? Math.round(count / closedLost.length * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
  return {
    period: { start: monthStart.toISOString().split('T')[0], end: now.toISOString().split('T')[0] },
    funnel: {
      leads: engLeads.length,
      meetings: engVisits.length,
      proposals: proposals.length,
      closedWon: closedWon.length,
      closedLost: closedLost.length,
    },
    conversionRates: {
      leadToMeeting: Math.round(leadToMeeting * 100),
      meetingToProposal: Math.round(meetingToProposal * 100),
      proposalToClose: Math.round(proposalToClose * 100),
      overall: Math.round(overallConversion * 100),
    },
    lostReasonsArray,
    totalLostValue: closedLost.reduce((s, d) => s + parseFloat(d.value as string || '0'), 0),
    totalWonValue: closedWon.reduce((s, d) => s + parseFloat(d.value as string || '0'), 0),
  };
}

/** جلب Meeting Reviews لمهندس */
export async function getMeetingReviewsList(engineerId?: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (engineerId) conditions.push(eq(meetingReviews.engineerId, engineerId));
  return db.select().from(meetingReviews)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(meetingReviews.createdAt))
    .limit(limit);
}

/** Weekly Coaching Summary لمهندس */
export async function getWeeklyCoachingSummary(engineerId: number) {
  const db = await getDb();
  if (!db) return null;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const reviews = await db.select().from(meetingReviews)
    .where(and(
      eq(meetingReviews.engineerId, engineerId),
      gte(meetingReviews.createdAt, weekStart),
    ));
  if (reviews.length === 0) return null;
  const avgScore = reviews.reduce((s, r) => s + r.totalScore, 0) / reviews.length;
  const avgOpening = reviews.reduce((s, r) => s + r.openingScore, 0) / reviews.length;
  const avgUnderstanding = reviews.reduce((s, r) => s + r.understandingScore, 0) / reviews.length;
  const avgPresentation = reviews.reduce((s, r) => s + r.presentationScore, 0) / reviews.length;
  const avgObjection = reviews.reduce((s, r) => s + r.objectionScore, 0) / reviews.length;
  const avgClosing = reviews.reduce((s, r) => s + r.closingScore, 0) / reviews.length;
  // نقاط القوة والضعف
  const scores = [
    { name: 'الافتتاح', score: avgOpening, max: 10 },
    { name: 'فهم الاحتياج', score: avgUnderstanding, max: 20 },
    { name: 'العرض', score: avgPresentation, max: 20 },
    { name: 'التعامل مع الاعتراضات', score: avgObjection, max: 25 },
    { name: 'الإغلاق', score: avgClosing, max: 25 },
  ];
  const strengths = scores.filter(s => s.score / s.max >= 0.75).map(s => s.name);
  const improvements = scores.filter(s => s.score / s.max < 0.6).map(s => s.name);
  return {
    reviewsCount: reviews.length,
    avgScore: Math.round(avgScore),
    strengths,
    improvements,
    scores,
    rating: avgScore >= 85 ? 'ممتاز' : avgScore >= 70 ? 'جيد' : avgScore >= 55 ? 'مقبول' : 'يحتاج تحسين',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES EXECUTION TRACKING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Session Management ───────────────────────────────────────────────────────

/** إنشاء جلسة اجتماع جديدة */
export async function createMeetingSession(input: {
  engineerId: number;
  quotationId?: number;
  dealId?: number;
  clientName?: string;
  sessionType?: 'presentation' | 'closing' | 'follow_up';
  itemsTotal?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const [result] = await db.insert(meetingSessions).values({
    engineerId: input.engineerId,
    quotationId: input.quotationId,
    dealId: input.dealId,
    clientName: input.clientName,
    sessionType: input.sessionType ?? 'presentation',
    itemsTotal: input.itemsTotal ?? 0,
    status: 'active',
  });
  return (result as any).insertId as number;
}

/** إنهاء جلسة وحساب الـ Score */
export async function endMeetingSession(sessionId: number, recordingLink?: string): Promise<{
  score: number; itemsViewed: number; videosPlayed: number; scriptsUsed: number;
}> {
  const db = await getDb();
  if (!db) throw new Error('DB not available');

  // جلب كل الـ actions لهذه الجلسة
  const actions = await db.select().from(sessionActions).where(eq(sessionActions.sessionId, sessionId));

  // حساب الإحصائيات
  const itemsCompleted = actions.filter(a => a.actionType === 'item_completed').length;
  const videosPlayed = actions.filter(a => a.actionType === 'video_completed').length;
  const scriptsUsed = actions.filter(a => a.actionType === 'script_read').length;
  const rendersViewed = actions.filter(a => a.actionType === 'render_viewed').length;
  const pricesViewed = actions.filter(a => a.actionType === 'price_viewed').length;

  // جلب إجمالي Items من الجلسة
  const [session] = await db.select().from(meetingSessions).where(eq(meetingSessions.id, sessionId));
  const totalItems = session?.itemsTotal ?? 1;

  // حساب الـ Score (0-100)
  // Video Completed = 25 نقطة من الإجمالي
  // Script Read = 25 نقطة
  // Items Completed = 30 نقطة
  // Render + Price = 20 نقطة
  const videoScore = Math.min(25, Math.round((videosPlayed / Math.max(totalItems, 1)) * 25));
  const scriptScore = Math.min(25, Math.round((scriptsUsed / Math.max(totalItems, 1)) * 25));
  const itemScore = Math.min(30, Math.round((itemsCompleted / Math.max(totalItems, 1)) * 30));
  const engagementScore = Math.min(20, Math.round(((rendersViewed + pricesViewed) / Math.max(totalItems * 2, 1)) * 20));
  const totalScore = videoScore + scriptScore + itemScore + engagementScore;

  // حساب المدة
  const now = new Date();
  const startTime = session?.startTime ?? now;
  const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000);

  // تحديث الجلسة
  await db.update(meetingSessions).set({
    endTime: now,
    durationMinutes,
    totalScore,
    itemsViewed: itemsCompleted,
    videosPlayed,
    scriptsUsed,
    rendersViewed,
    pricesViewed,
    status: 'completed',
    recordingLink: recordingLink ?? session?.recordingLink ?? undefined,
  }).where(eq(meetingSessions.id, sessionId));

  return { score: totalScore, itemsViewed: itemsCompleted, videosPlayed, scriptsUsed };
}

/** تسجيل إجراء داخل الجلسة */
export async function logSessionAction(input: {
  sessionId: number;
  itemId?: number;
  actionType: 'item_opened' | 'video_started' | 'video_completed' | 'render_viewed' |
              'script_opened' | 'script_read' | 'price_viewed' | 'quotation_opened' |
              'item_completed' | 'item_skipped';
  durationSeconds?: number;
  metadata?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(sessionActions).values({
    sessionId: input.sessionId,
    itemId: input.itemId,
    actionType: input.actionType,
    durationSeconds: input.durationSeconds ?? 0,
    metadata: input.metadata,
  });
}

/** جلب تفاصيل جلسة كاملة (للـ Admin Review) */
export async function getSessionDetails(sessionId: number) {
  const db = await getDb();
  if (!db) return null;
  const [session] = await db.select().from(meetingSessions).where(eq(meetingSessions.id, sessionId));
  if (!session) return null;

  const actions = await db.select().from(sessionActions)
    .where(eq(sessionActions.sessionId, sessionId))
    .orderBy(sessionActions.timestamp);

  // تجميع actions حسب Item
  const itemMap: Record<number, {
    itemId: number; opened: boolean; videoPlayed: boolean; videoCompleted: boolean;
    renderViewed: boolean; scriptOpened: boolean; scriptRead: boolean; priceViewed: boolean;
    completed: boolean; skipped: boolean; totalSeconds: number;
  }> = {};

  for (const action of actions) {
    const id = action.itemId ?? 0;
    if (!itemMap[id]) {
      itemMap[id] = { itemId: id, opened: false, videoPlayed: false, videoCompleted: false,
        renderViewed: false, scriptOpened: false, scriptRead: false, priceViewed: false,
        completed: false, skipped: false, totalSeconds: 0 };
    }
    const item = itemMap[id];
    if (action.actionType === 'item_opened') item.opened = true;
    if (action.actionType === 'video_started') item.videoPlayed = true;
    if (action.actionType === 'video_completed') item.videoCompleted = true;
    if (action.actionType === 'render_viewed') item.renderViewed = true;
    if (action.actionType === 'script_opened') item.scriptOpened = true;
    if (action.actionType === 'script_read') item.scriptRead = true;
    if (action.actionType === 'price_viewed') item.priceViewed = true;
    if (action.actionType === 'item_completed') item.completed = true;
    if (action.actionType === 'item_skipped') item.skipped = true;
    item.totalSeconds += action.durationSeconds ?? 0;
  }

  // تحليل الـ Alerts
  const alerts: string[] = [];
  const itemDetails = Object.values(itemMap);
  const skippedItems = itemDetails.filter(i => i.skipped).length;
  const noVideoItems = itemDetails.filter(i => i.opened && !i.videoCompleted).length;
  const noScriptItems = itemDetails.filter(i => i.opened && !i.scriptRead).length;

  if (skippedItems > 0) alerts.push(`تم تخطي ${skippedItems} عنصر بدون عرض كامل`);
  if (noVideoItems > 0) alerts.push(`${noVideoItems} عنصر لم يُشغَّل فيديوه`);
  if (noScriptItems > 0) alerts.push(`${noScriptItems} عنصر لم يُستخدم Script له`);
  if (session.totalScore !== null && session.totalScore < 50) alerts.push('جودة العرض منخفضة - يحتاج مراجعة');

  return { session, actions, itemDetails, alerts };
}

/** إحصائيات أداء مهندس في الـ Sessions */
export async function getEngineerMeetingStats(engineerId: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sessions = await db.select().from(meetingSessions)
    .where(and(
      eq(meetingSessions.engineerId, engineerId),
      eq(meetingSessions.status, 'completed'),
      gte(meetingSessions.startTime, monthStart)
    ));

  if (sessions.length === 0) {
    return {
      totalSessions: 0, avgScore: 0, playbookUsagePct: 0,
      avgItemsViewedPct: 0, avgVideosPlayedPct: 0, avgScriptsUsedPct: 0,
      alerts: ['لا توجد جلسات مسجلة هذا الشهر'],
    };
  }

  const avgScore = Math.round(sessions.reduce((s, x) => s + (x.totalScore ?? 0), 0) / sessions.length);
  const avgItemsViewedPct = Math.round(
    sessions.reduce((s, x) => s + (x.itemsTotal ? (x.itemsViewed ?? 0) / x.itemsTotal * 100 : 0), 0) / sessions.length
  );
  const avgVideosPlayedPct = Math.round(
    sessions.reduce((s, x) => s + (x.itemsTotal ? (x.videosPlayed ?? 0) / x.itemsTotal * 100 : 0), 0) / sessions.length
  );
  const avgScriptsUsedPct = Math.round(
    sessions.reduce((s, x) => s + (x.itemsTotal ? (x.scriptsUsed ?? 0) / x.itemsTotal * 100 : 0), 0) / sessions.length
  );

  // Playbook Usage = جلسات استخدمت الـ Playbook فعلاً (score > 30)
  const playbookUsedSessions = sessions.filter(s => (s.totalScore ?? 0) > 30).length;
  const playbookUsagePct = Math.round((playbookUsedSessions / sessions.length) * 100);

  const alerts: string[] = [];
  if (avgScore < 50) alerts.push('متوسط جودة العروض منخفض');
  if (playbookUsagePct < 60) alerts.push('نسبة استخدام الـ Playbook ضعيفة');
  if (avgVideosPlayedPct < 50) alerts.push('أغلب الاجتماعات بدون تشغيل الفيديو');
  if (avgScriptsUsedPct < 40) alerts.push('ضعف في استخدام Script المبيعات');

  return {
    totalSessions: sessions.length,
    avgScore,
    playbookUsagePct,
    avgItemsViewedPct,
    avgVideosPlayedPct,
    avgScriptsUsedPct,
    alerts,
    sessions: sessions.map(s => ({
      id: s.id, clientName: s.clientName, startTime: s.startTime,
      durationMinutes: s.durationMinutes, totalScore: s.totalScore,
      recordingLink: s.recordingLink, status: s.status,
    })),
  };
}

/** قائمة جلسات كل المهندسين (للـ Admin) */
export async function getAllMeetingSessionsAdmin(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: meetingSessions.id,
    engineerId: meetingSessions.engineerId,
    clientName: meetingSessions.clientName,
    sessionType: meetingSessions.sessionType,
    startTime: meetingSessions.startTime,
    durationMinutes: meetingSessions.durationMinutes,
    totalScore: meetingSessions.totalScore,
    itemsViewed: meetingSessions.itemsViewed,
    itemsTotal: meetingSessions.itemsTotal,
    videosPlayed: meetingSessions.videosPlayed,
    scriptsUsed: meetingSessions.scriptsUsed,
    recordingLink: meetingSessions.recordingLink,
    status: meetingSessions.status,
  }).from(meetingSessions)
    .orderBy(desc(meetingSessions.startTime))
    .limit(limit);
}

/** تحديث Recording Link لجلسة */
export async function updateSessionRecordingLink(sessionId: number, recordingLink: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(meetingSessions).set({ recordingLink }).where(eq(meetingSessions.id, sessionId));
}

/** Weekly Coaching Summary لمهندس */
export async function getEngineerWeeklyCoaching(engineerId: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const sessions = await db.select().from(meetingSessions)
    .where(and(
      eq(meetingSessions.engineerId, engineerId),
      eq(meetingSessions.status, 'completed'),
      gte(meetingSessions.startTime, weekStart)
    ));

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (sessions.length === 0) {
    return { sessions: 0, strengths: [], improvements: ['لا توجد جلسات هذا الأسبوع'], avgScore: 0 };
  }

  const avgScore = Math.round(sessions.reduce((s, x) => s + (x.totalScore ?? 0), 0) / sessions.length);
  const avgVideoPct = sessions.reduce((s, x) => s + (x.itemsTotal ? (x.videosPlayed ?? 0) / x.itemsTotal : 0), 0) / sessions.length;
  const avgScriptPct = sessions.reduce((s, x) => s + (x.itemsTotal ? (x.scriptsUsed ?? 0) / x.itemsTotal : 0), 0) / sessions.length;
  const avgItemPct = sessions.reduce((s, x) => s + (x.itemsTotal ? (x.itemsViewed ?? 0) / x.itemsTotal : 0), 0) / sessions.length;

  if (avgScore >= 75) strengths.push('جودة عروض ممتازة هذا الأسبوع');
  if (avgVideoPct >= 0.7) strengths.push('التزام جيد بتشغيل الفيديوهات');
  if (avgScriptPct >= 0.7) strengths.push('استخدام فعّال لـ Script المبيعات');
  if (avgItemPct >= 0.8) strengths.push('تغطية شاملة لعناصر العرض');

  if (avgScore < 50) improvements.push('تحسين جودة العرض الكلية - راجع Playbook');
  if (avgVideoPct < 0.5) improvements.push('تشغيل الفيديو إلزامي لكل عنصر');
  if (avgScriptPct < 0.4) improvements.push('استخدام Script يحسن Closing Rate بشكل كبير');
  if (avgItemPct < 0.6) improvements.push('لا تتخطى العناصر - كل عنصر له قيمة بيعية');

  return { sessions: sessions.length, strengths, improvements, avgScore };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNNEL ANALYSIS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/** تحليل Funnel كامل لمهندس أو للكل */
export async function getFullFunnelAnalysis(engineerId?: number, period: 'week' | 'month' | 'quarter' = 'month') {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  let startDate: Date;
  if (period === 'week') {
    startDate = new Date(now); startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  }

  // Leads
  const leadsQuery = db.select().from(leads).where(
    and(
      eq(leads.isDeleted, 0),
      gte(leads.createdAt, startDate),
      ...(engineerId ? [eq(leads.assignedEngineerId, engineerId)] : [])
    )
  );
  const allLeads = await leadsQuery;

  // Deals
  const dealsQuery = db.select().from(deals).where(
    and(
      eq(deals.isDeleted, 0),
      gte(deals.createdAt, startDate),
      ...(engineerId ? [eq(deals.engineerId, engineerId)] : [])
    )
  );
  const allDeals = await dealsQuery;

  // حساب مراحل الـ Funnel
  const totalLeads = allLeads.length;
  const contactedLeads = allLeads.filter(l => l.status !== 'new').length;
  const qualifiedLeads = allLeads.filter(l => l.status === 'qualified' || l.status === 'converted').length;
  const totalDeals = allDeals.length;
  const proposals = allDeals.filter(d => d.stage === 'proposal').length;
  const negotiations = allDeals.filter(d => d.stage === 'negotiation' || d.stage === 'contract_sent').length;
  const closedWon = allDeals.filter(d => d.stage === 'closed_won').length;
  const closedLost = allDeals.filter(d => d.stage === 'closed_lost').length;

  // Conversion Rates
  const leadToMeeting = totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0;
  const meetingToQuotation = contactedLeads > 0 ? Math.round((totalDeals / Math.max(contactedLeads, 1)) * 100) : 0;
  const quotationToClosing = totalDeals > 0 ? Math.round((closedWon / Math.max(totalDeals, 1)) * 100) : 0;
  const overallConversion = totalLeads > 0 ? Math.round((closedWon / Math.max(totalLeads, 1)) * 100) : 0;

  // Lost Deals Analysis
  const lostDeals = allDeals.filter(d => d.stage === 'closed_lost');
  const lostByReason: Record<string, number> = {};
  for (const deal of lostDeals) {
    const reason = deal.lostReason ?? 'other';
    lostByReason[reason] = (lostByReason[reason] ?? 0) + 1;
  }

  // Total Revenue
  const totalRevenue = allDeals
    .filter(d => d.stage === 'closed_won')
    .reduce((s, d) => s + parseFloat((d.netValue as string) || (d.value as string) || '0'), 0);

  // Pipeline Value
  const pipelineValue = allDeals
    .filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
    .reduce((s, d) => s + parseFloat(d.value as string || '0'), 0);

  // Funnel Insights
  const insights: string[] = [];
  if (leadToMeeting < 30) insights.push('نسبة تحويل Leads إلى اجتماعات منخفضة - يحتاج تحسين Qualification');
  if (meetingToQuotation < 40) insights.push('كثير من الاجتماعات لا تتحول لعروض أسعار - راجع جودة الاجتماعات');
  if (quotationToClosing < 25) insights.push('ضعف في إغلاق الصفقات بعد تقديم العرض - تحسين مهارات التفاوض');
  if (lostDeals.length > closedWon) insights.push('عدد الصفقات المفقودة أكبر من المغلقة - مراجعة استراتيجية البيع');
  if (lostByReason['price_high'] && lostByReason['price_high'] > lostDeals.length * 0.4) {
    insights.push('أكثر من 40% من الخسائر بسبب السعر - مراجعة سياسة التسعير');
  }
  if (lostByReason['competitor'] && lostByReason['competitor'] > lostDeals.length * 0.3) {
    insights.push('المنافسون يأخذون 30%+ من الصفقات - تحسين عرض القيمة');
  }

  return {
    period,
    funnel: {
      totalLeads,
      contactedLeads,
      qualifiedLeads,
      proposals,
      negotiations,
      closedWon,
      closedLost,
      totalDeals,
    },
    conversionRates: {
      leadToMeeting,
      meetingToQuotation,
      quotationToClosing,
      overallConversion,
    },
    lostDealsAnalysis: {
      total: lostDeals.length,
      byReason: lostByReason,
      topReason: Object.entries(lostByReason).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    },
    revenue: {
      totalRevenue,
      pipelineValue,
      avgDealValue: closedWon > 0 ? Math.round(totalRevenue / closedWon) : 0,
    },
    insights,
  };
}

/** مقارنة Funnel بين كل المهندسين */
export async function getEngineersFunnelComparison() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const allEngineers = await db.select().from(engineers).where(and(eq(engineers.status, 'active'), eq(engineers.isDeleted, 0)));

  const results = await Promise.all(allEngineers.map(async (eng) => {
    const engLeads = await db.select().from(leads).where(
      and(eq(leads.assignedEngineerId, eng.id), eq(leads.isDeleted, 0), gte(leads.createdAt, monthStart))
    );
    const engDeals = await db.select().from(deals).where(
      and(eq(deals.engineerId, eng.id), eq(deals.isDeleted, 0), gte(deals.createdAt, monthStart))
    );

    const closedWon = engDeals.filter(d => d.stage === 'closed_won').length;
    const totalDeals = engDeals.length;
    const closingRate = totalDeals > 0 ? Math.round((closedWon / totalDeals) * 100) : 0;
    const totalRevenue = engDeals
      .filter(d => d.stage === 'closed_won')
      .reduce((s, d) => s + parseFloat((d.netValue as string) || (d.value as string) || '0'), 0);

    // Meeting Stats
    const engSessions = await db.select().from(meetingSessions).where(
      and(eq(meetingSessions.engineerId, eng.id), eq(meetingSessions.status, 'completed'), gte(meetingSessions.startTime, monthStart))
    );
    const avgMeetingScore = engSessions.length > 0
      ? Math.round(engSessions.reduce((s, x) => s + (x.totalScore ?? 0), 0) / engSessions.length)
      : 0;

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      totalLeads: engLeads.length,
      totalDeals,
      closedWon,
      closingRate,
      totalRevenue,
      totalMeetings: engSessions.length,
      avgMeetingScore,
    };
  }));

  return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/** تحليل Funnel + Playbook Score مجمّع لمهندس */
export async function getEngineerFunnelPlaybookInsights(engineerId: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Funnel
  const funnel = await getFullFunnelAnalysis(engineerId, 'month');

  // Meeting Sessions
  const sessions = await db.select().from(meetingSessions).where(
    and(eq(meetingSessions.engineerId, engineerId), eq(meetingSessions.status, 'completed'), gte(meetingSessions.startTime, monthStart))
  );
  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((s, x) => s + (x.totalScore ?? 0), 0) / sessions.length)
    : 0;
  const playbookUsagePct = sessions.length > 0
    ? Math.round(sessions.filter(s => (s.totalScore ?? 0) > 30).length / sessions.length * 100)
    : 0;

  // Cross Analysis Insights
  const crossInsights: string[] = [];
  if (avgScore >= 70 && (funnel?.conversionRates.quotationToClosing ?? 0) < 25) {
    crossInsights.push('عرض جيد لكن لا يتحول لإغلاق - مشكلة في التفاوض أو السعر');
  }
  if (avgScore < 40 && (funnel?.conversionRates.quotationToClosing ?? 0) > 40) {
    crossInsights.push('إغلاق جيد رغم ضعف الـ Playbook - مهارة شخصية قوية');
  }
  if ((funnel?.funnel.totalLeads ?? 0) > 10 && (funnel?.funnel.closedWon ?? 0) < 2) {
    crossInsights.push('Leads كثيرة بدون تحويل - مراجعة جودة Qualification');
  }
  if (playbookUsagePct < 50) {
    crossInsights.push('نسبة استخدام Playbook منخفضة - إلزامي لتحسين الأداء');
  }

  return {
    funnel,
    meetingStats: { totalSessions: sessions.length, avgScore, playbookUsagePct },
    crossInsights: [...(funnel?.insights ?? []), ...crossInsights],
  };
}

// ─── Meeting Recording Rule + Auto Review Task + SLA ──────────────────────────────────────────────

const MEETING_TASK_TYPES = [
  "meeting_presentation", "meeting_closing",
  "meeting_2d", "meeting_3d", "meeting_quotation"
] as const;

/** Check if a task type requires a recording link before completion */
export function isMeetingTaskType(taskType: string | null | undefined): boolean {
  return MEETING_TASK_TYPES.includes(taskType as typeof MEETING_TASK_TYPES[number]);
}

/** Validate meeting task completion: returns error message or null if OK */
export function validateMeetingTaskCompletion(task: {
  taskType: string | null | undefined;
  meetingRecordingLink: string | null | undefined;
  category: string | null | undefined;
}): string | null {
  const isMeeting = isMeetingTaskType(task.taskType) || task.category === "meeting";
  if (!isMeeting) return null; // Not a meeting task, no restriction
  if (!task.meetingRecordingLink || task.meetingRecordingLink.trim() === "") {
    return "لا يمكن إغلاق مهمة اجتماع بدون رابط التسجيل (Recording Link)";
  }
  return null;
}

/** Get meeting tasks missing recording (for admin alerts) */
export async function getMeetingTasksMissingRecording(engineerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago

  const conditions = [
    eq(dailyTasks.isDeleted, 0),
    sql`${dailyTasks.taskType} IN ('meeting_presentation','meeting_closing','meeting_2d','meeting_3d','meeting_quotation')`,
    isNull(dailyTasks.meetingRecordingLink),
    lte(dailyTasks.taskDate, cutoff),
  ];
  if (engineerId) conditions.push(eq(dailyTasks.engineerId, engineerId));

  const tasks = await db
    .select({
      id: dailyTasks.id,
      engineerId: dailyTasks.engineerId,
      title: dailyTasks.title,
      taskDate: dailyTasks.taskDate,
      taskType: dailyTasks.taskType,
      status: dailyTasks.status,
      engineerName: engineers.name,
    })
    .from(dailyTasks)
    .leftJoin(engineers, eq(dailyTasks.engineerId, engineers.id))
    .where(and(...conditions))
    .orderBy(dailyTasks.taskDate);

  return tasks.map(t => {
    const taskDateMs = t.taskDate instanceof Date ? t.taskDate.getTime() : new Date(String(t.taskDate)).getTime();
    const hoursElapsed = Math.floor((now.getTime() - taskDateMs) / (1000 * 60 * 60));
    return { ...t, hoursElapsed, isSlaBreached: hoursElapsed > 24 };
  });
}

/** Auto-create admin review task when a recording is submitted */
export async function autoCreateReviewTask(params: {
  meetingTaskId: number;
  engineerId: number;
  engineerName: string;
  meetingDate: string;
  recordingLink: string;
}) {
  const db = await getDb();
  if (!db) return null;

  // Find admin/manager engineer to assign review
  const adminEngineers = await db
    .select({ id: engineers.id, name: engineers.name })
    .from(engineers)
    .where(inArray(engineers.role as any, ["admin", "admin_sales"]))
    .limit(1);

  const adminId = adminEngineers[0]?.id ?? params.engineerId; // fallback to same engineer

  const reviewDeadline = new Date();
  reviewDeadline.setHours(reviewDeadline.getHours() + 24);

  const [result] = await db.insert(dailyTasks).values({
    engineerId: adminId,
    taskDate: new Date() as unknown as Date,
    title: `مراجعة اجتماع: ${params.engineerName}`,
    description: `مراجعة تسجيل اجتماع المهندس ${params.engineerName} بتاريخ ${params.meetingDate}\nرابط التسجيل: ${params.recordingLink}\nالمهمة الأصلية ID: ${params.meetingTaskId}`,
    taskType: "other" as any,
    category: "meeting_review",
    status: "planned",
    priority: "high",
    plannedHours: 0.5,
    meetingRecordingLink: params.recordingLink,
  });

  return result;
}

/** Get pending meeting reviews for admin (SLA tracking) */
export async function getPendingMeetingReviews() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();

  const tasks = await db
    .select({
      id: dailyTasks.id,
      engineerId: dailyTasks.engineerId,
      title: dailyTasks.title,
      taskDate: dailyTasks.taskDate,
      status: dailyTasks.status,
      priority: dailyTasks.priority,
      meetingRecordingLink: dailyTasks.meetingRecordingLink,
      description: dailyTasks.description,
      engineerName: engineers.name,
    })
    .from(dailyTasks)
    .leftJoin(engineers, eq(dailyTasks.engineerId, engineers.id))
    .where(
      and(
        eq(dailyTasks.isDeleted, 0),
        eq(dailyTasks.category as any, "meeting_review"),
        inArray(dailyTasks.status, ["planned", "delayed"])
      )
    )
    .orderBy(dailyTasks.taskDate);

  return tasks.map(t => {
    const taskDateMs = t.taskDate instanceof Date ? t.taskDate.getTime() : new Date(String(t.taskDate)).getTime();
    const hoursElapsed = Math.floor((now.getTime() - taskDateMs) / (1000 * 60 * 60));
    return {
      ...t,
      hoursElapsed,
      isSlaBreached: hoursElapsed > 24,
      slaStatus: hoursElapsed > 24 ? "breached" : hoursElapsed > 18 ? "warning" : "ok",
    };
  });
}

/** Get meeting review stats for admin KPI */
export async function getMeetingReviewAdminStats() {
  const db = await getDb();
  if (!db) return { pending: 0, completed: 0, delayed: 0, slaBreached: 0 };

  const allReviews = await db
    .select({
      id: dailyTasks.id,
      status: dailyTasks.status,
      taskDate: dailyTasks.taskDate,
    })
    .from(dailyTasks)
    .where(
      and(
        eq(dailyTasks.isDeleted, 0),
        eq(dailyTasks.category as any, "meeting_review")
      )
    );

  const now = new Date();
  let pending = 0, completed = 0, delayed = 0, slaBreached = 0;

  for (const r of allReviews) {
    const taskDateMs = r.taskDate instanceof Date ? r.taskDate.getTime() : new Date(String(r.taskDate)).getTime();
    const hoursElapsed = Math.floor((now.getTime() - taskDateMs) / (1000 * 60 * 60));
    if (r.status === "completed") completed++;
    else if (r.status === "delayed") { delayed++; slaBreached++; }
    else { pending++; if (hoursElapsed > 24) slaBreached++; }
  }

  return { pending, completed, delayed, slaBreached, total: allReviews.length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Meeting Review System (أداة تقييم حقيقية) ────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** إنشاء أو تحديث Meeting Review - 4 عناصر + Decision Tag + Mandatory Feedback */
export async function createOrUpdateMeetingReview(input: {
  taskId: number;
  engineerId: number;
  reviewedBy?: number;
  playbookUsageScore: number;       // من 10
  presentationQualityScore: number; // من 10
  controlScore: number;             // من 10
  closingAttemptScore: number;      // من 10
  decisionTag: "strong" | "needs_improvement" | "weak";
  strengthPoint: string;            // إجباري
  improvementPoint: string;         // إجباري
  comments?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // التحقق من وجود Recording + Task مكتملة
  const task = await db.select().from(dailyTasks).where(eq(dailyTasks.id, input.taskId)).limit(1);
  if (!task[0]) throw new Error("المهمة غير موجودة");
  if (task[0].status !== "completed") throw new Error("لا يمكن إضافة Review إلا إذا كانت المهمة مكتملة");
  if (!task[0].meetingRecordingLink) throw new Error("لا يمكن إضافة Review بدون Recording Link");

  // حساب الإجمالي (من 40 → %)
  const totalScore = input.playbookUsageScore + input.presentationQualityScore +
    input.controlScore + input.closingAttemptScore;

  // التحقق من وجود Review سابق
  const existing = await db.select().from(meetingReviews)
    .where(eq(meetingReviews.taskId, input.taskId)).limit(1);

  if (existing[0]) {
    await db.update(meetingReviews).set({
      playbookUsageScore: input.playbookUsageScore,
      presentationQualityScore: input.presentationQualityScore,
      controlScore: input.controlScore,
      closingAttemptScore: input.closingAttemptScore,
      totalScore,
      decisionTag: input.decisionTag,
      strengthPoint: input.strengthPoint,
      improvementPoint: input.improvementPoint,
      comments: input.comments,
      reviewedBy: input.reviewedBy,
    }).where(eq(meetingReviews.id, existing[0].id));
    return { id: existing[0].id, updated: true };
  } else {
    const [result] = await db.insert(meetingReviews).values({
      taskId: input.taskId,
      engineerId: input.engineerId,
      reviewedBy: input.reviewedBy,
      playbookUsageScore: input.playbookUsageScore,
      presentationQualityScore: input.presentationQualityScore,
      controlScore: input.controlScore,
      closingAttemptScore: input.closingAttemptScore,
      totalScore,
      decisionTag: input.decisionTag,
      strengthPoint: input.strengthPoint,
      improvementPoint: input.improvementPoint,
      comments: input.comments,
      // Legacy fields default
      openingScore: 0, understandingScore: 0, presentationScore: 0,
      objectionScore: 0, closingScore: 0,
    });
    return { id: (result as any).insertId, updated: false };
  }
}

/** جلب Meeting Review بـ taskId */
export async function getMeetingReviewByTask(taskId: number) {
  const db = await getDb();
  if (!db) return null;
  const reviews = await db.select().from(meetingReviews)
    .where(eq(meetingReviews.taskId, taskId)).limit(1);
  if (!reviews[0]) return null;
  const r = reviews[0];
  return {
    ...r,
    totalScorePct: Math.round((r.totalScore / 40) * 100),
    decisionTagLabel: r.decisionTag === "strong" ? "Strong Performer" :
      r.decisionTag === "needs_improvement" ? "يحتاج تحسين" : "ضعيف",
  };
}

/** Weekly Summary لكل مهندس: Average Score + عدد Reviews + Trend */
export async function getEngineerMeetingReviewSummary(engineerId?: number) {
  const db = await getDb();
  if (!db) return [];

  const engList = await db.select({ id: engineers.id, name: engineers.name, role: engineers.role })
    .from(engineers).where(eq(engineers.isDeleted, 0));

  const targetEngineers = engineerId
    ? engList.filter(e => e.id === engineerId)
    : engList.filter(e => !["admin_sales", "group_admin"].includes(e.role ?? ""));

  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const allReviews = await db.select().from(meetingReviews);

  return targetEngineers.map(eng => {
    const engReviews = allReviews.filter(r => r.engineerId === eng.id);
    const thisWeekReviews = engReviews.filter(r => new Date(r.createdAt) >= thisWeekStart);
    const lastWeekReviews = engReviews.filter(r =>
      new Date(r.createdAt) >= lastWeekStart && new Date(r.createdAt) < thisWeekStart);

    const avgScore = engReviews.length > 0
      ? Math.round(engReviews.reduce((s, r) => s + r.totalScore, 0) / engReviews.length)
      : 0;
    const avgScorePct = Math.round((avgScore / 40) * 100);

    const thisWeekAvg = thisWeekReviews.length > 0
      ? Math.round(thisWeekReviews.reduce((s, r) => s + r.totalScore, 0) / thisWeekReviews.length)
      : 0;
    const lastWeekAvg = lastWeekReviews.length > 0
      ? Math.round(lastWeekReviews.reduce((s, r) => s + r.totalScore, 0) / lastWeekReviews.length)
      : 0;

    const trend: "up" | "down" | "stable" =
      thisWeekAvg > lastWeekAvg ? "up" :
      thisWeekAvg < lastWeekAvg ? "down" : "stable";

    const strongCount = engReviews.filter(r => r.decisionTag === "strong").length;
    const needsImprovementCount = engReviews.filter(r => r.decisionTag === "needs_improvement").length;
    const weakCount = engReviews.filter(r => r.decisionTag === "weak").length;

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      totalReviews: engReviews.length,
      thisWeekReviews: thisWeekReviews.length,
      avgScore,
      avgScorePct,
      thisWeekAvgPct: Math.round((thisWeekAvg / 40) * 100),
      lastWeekAvgPct: Math.round((lastWeekAvg / 40) * 100),
      trend,
      decisionBreakdown: { strong: strongCount, needsImprovement: needsImprovementCount, weak: weakCount },
      recentReviews: engReviews.slice(-3).map(r => ({
        id: r.id, taskId: r.taskId,
        totalScore: r.totalScore,
        totalScorePct: Math.round((r.totalScore / 40) * 100),
        decisionTag: r.decisionTag,
        createdAt: r.createdAt,
      })),
    };
  });
}

/** قائمة Meeting Tasks التي تحتاج Review */
export async function getMeetingTasksPendingReview() {
  const db = await getDb();
  if (!db) return [];

  const meetingTypes = ["meeting_2d", "meeting_3d", "meeting_quotation", "meeting_closing", "meeting_presentation"];
    const dt = dailyTasks as any;
  const completedMeetings = await db.select().from(dailyTasks)
    .where(and(
      eq(dailyTasks.status, "completed"),
      eq(dailyTasks.isDeleted, 0),
      inArray(dt.taskType, meetingTypes)
    ));
  const reviewedTaskIds = new Set(
    (await db.select({ taskId: meetingReviews.taskId }).from(meetingReviews))
      .map(r => r.taskId)
  );
  return completedMeetings
    .filter(t => t.meetingRecordingLink && !reviewedTaskIds.has(t.id))
    .map(t => ({
      id: t.id, title: t.title, engineerId: t.engineerId,
      taskType: (t as any).taskType, recordingLink: t.meetingRecordingLink,
      completedAt: t.createdAt,
    }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Promotion & Evaluation System ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** حساب Performance Level بناءً على الدرجة الإجمالية */
function calcPerformanceLevel(overallScore: number): "a_player" | "b_player" | "c_player" {
  if (overallScore >= 80) return "a_player";
  if (overallScore >= 60) return "b_player";
  return "c_player";
}

/** حساب Decision Action بناءً على Performance Level + تاريخ C Player */
function calcDecisionAction(
  level: "a_player" | "b_player" | "c_player",
  consecutiveCMonths: number
): "promote" | "bonus" | "coaching" | "warning" | "improvement_plan" | "firing_risk" | "none" {
  if (level === "a_player") return "promote";
  if (level === "b_player") return "coaching";
  if (level === "c_player") {
    if (consecutiveCMonths >= 2) return "firing_risk";
    if (consecutiveCMonths >= 1) return "improvement_plan";
    return "warning";
  }
  return "none";
}

/** حساب Promotion Readiness Score للمهندس */
function calcPromotionReadiness(
  careerLevel: "sales_engineer" | "senior_sales_engineer" | "sales_consultant",
  scores: {
    salesAchievementScore: number;
    meetingScore: number;
    playbookUsageScore: number;
    taskDisciplineScore: number;
    closingRateScore: number;
  },
  consecutiveMonthsMeetingTarget: number
): { eligible: boolean; readinessScore: number; missingCriteria: string[] } {
  const missing: string[] = [];
  let totalPoints = 0;
  let maxPoints = 0;

  if (careerLevel === "sales_engineer") {
    // Sales Engineer → Senior: شهرين متتاليين ≥ 80% + Meeting ≥ 70% + Playbook ≥ 70% + Task 100%
    maxPoints = 5;
    if (scores.salesAchievementScore >= 80) totalPoints++; else missing.push("Sales Target ≥ 80%");
    if (consecutiveMonthsMeetingTarget >= 2) totalPoints++; else missing.push("شهرين متتاليين تحقيق الهدف");
    if (scores.meetingScore >= 70) totalPoints++; else missing.push("Meeting Score ≥ 70%");
    if (scores.playbookUsageScore >= 70) totalPoints++; else missing.push("Playbook Usage ≥ 70%");
    if (scores.taskDisciplineScore >= 100) totalPoints++; else missing.push("Task Completion 100%");
  } else if (careerLevel === "senior_sales_engineer") {
    // Senior → Consultant: 3 شهور ≥ 100% + Closing Rate عالي + Meeting ≥ 80% + Playbook ≥ 85%
    maxPoints = 5;
    if (scores.salesAchievementScore >= 100) totalPoints++; else missing.push("Sales Target ≥ 100%");
    if (consecutiveMonthsMeetingTarget >= 3) totalPoints++; else missing.push("3 شهور متتالية تحقيق الهدف");
    if (scores.meetingScore >= 80) totalPoints++; else missing.push("Meeting Score ≥ 80%");
    if (scores.playbookUsageScore >= 85) totalPoints++; else missing.push("Playbook Usage ≥ 85%");
    if (scores.closingRateScore >= 70) totalPoints++; else missing.push("Closing Rate عالي");
  } else {
    // Sales Consultant - أعلى مستوى
    return { eligible: false, readinessScore: 100, missingCriteria: ["أعلى مستوى في المسار الوظيفي"] };
  }

  const readinessScore = Math.round((totalPoints / maxPoints) * 100);
  const eligible = missing.length === 0;
  return { eligible, readinessScore, missingCriteria: missing };
}

/** إنشاء أو تحديث التقييم الشهري للمهندس */
export async function createOrUpdateMonthlyEvaluation(input: {
  engineerId: number;
  evaluationMonth: number;
  evaluationYear: number;
  salesAchievementScore: number;
  closingRateScore: number;
  meetingScore: number;
  playbookUsageScore: number;
  taskDisciplineScore: number;
  reviewedBy?: number;
  coachingNotes?: string;
  improvementPlan?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // حساب الدرجة الإجمالية (متوسط 5 عناصر)
  const overallScore = Math.round((
    input.salesAchievementScore +
    input.closingRateScore +
    input.meetingScore +
    input.playbookUsageScore +
    input.taskDisciplineScore
  ) / 5);

  const performanceLevel = calcPerformanceLevel(overallScore);

  // جلب التقييم السابق لحساب consecutiveCMonths
  const prevMonth = input.evaluationMonth === 1 ? 12 : input.evaluationMonth - 1;
  const prevYear = input.evaluationMonth === 1 ? input.evaluationYear - 1 : input.evaluationYear;
  const prevEval = await db.select().from(engineerEvaluations)
    .where(and(
      eq(engineerEvaluations.engineerId, input.engineerId),
      eq(engineerEvaluations.evaluationMonth, prevMonth),
      eq(engineerEvaluations.evaluationYear, prevYear)
    )).limit(1);

  let consecutiveCMonths = 0;
  if (performanceLevel === "c_player") {
    consecutiveCMonths = prevEval[0]?.performanceLevel === "c_player"
      ? (prevEval[0].consecutiveCMonths ?? 0) + 1
      : 1;
  }

  const firingDecisionTriggered = consecutiveCMonths >= 2;
  const decisionAction = calcDecisionAction(performanceLevel, consecutiveCMonths);

  // جلب Career Level الحالي للمهندس
  const careerLevelRecord = await db.select().from(engineerCareerLevels)
    .where(eq(engineerCareerLevels.engineerId, input.engineerId)).limit(1);
  const careerLevel = (careerLevelRecord[0]?.currentLevel ?? "sales_engineer") as
    "sales_engineer" | "senior_sales_engineer" | "sales_consultant";

  // حساب Promotion Readiness
  const prevEvalForConsecutive = await db.select().from(engineerEvaluations)
    .where(eq(engineerEvaluations.engineerId, input.engineerId))
    .orderBy(desc(engineerEvaluations.evaluationYear), desc(engineerEvaluations.evaluationMonth))
    .limit(1);
  const consecutiveMonthsMeetingTarget = (prevEvalForConsecutive[0]?.salesAchievementScore ?? 0) >= 80
    ? (prevEvalForConsecutive[0]?.consecutiveMonthsMeetingTarget ?? 0) + 1
    : (input.salesAchievementScore >= 80 ? 1 : 0);

  const { eligible, readinessScore, missingCriteria } = calcPromotionReadiness(careerLevel, {
    salesAchievementScore: input.salesAchievementScore,
    meetingScore: input.meetingScore,
    playbookUsageScore: input.playbookUsageScore,
    taskDisciplineScore: input.taskDisciplineScore,
    closingRateScore: input.closingRateScore,
  }, consecutiveMonthsMeetingTarget);

  // التحقق من وجود تقييم سابق لنفس الشهر
  const existing = await db.select().from(engineerEvaluations)
    .where(and(
      eq(engineerEvaluations.engineerId, input.engineerId),
      eq(engineerEvaluations.evaluationMonth, input.evaluationMonth),
      eq(engineerEvaluations.evaluationYear, input.evaluationYear)
    )).limit(1);

  const evalData = {
    salesAchievementScore: input.salesAchievementScore,
    closingRateScore: input.closingRateScore,
    meetingScore: input.meetingScore,
    playbookUsageScore: input.playbookUsageScore,
    taskDisciplineScore: input.taskDisciplineScore,
    overallScore,
    performanceLevel,
    careerLevel,
    promotionEligible: eligible,
    promotionReadinessScore: readinessScore,
    consecutiveMonthsMeetingTarget,
    decisionAction,
    consecutiveCMonths,
    firingDecisionTriggered,
    coachingNotes: input.coachingNotes,
    improvementPlan: input.improvementPlan,
    reviewedBy: input.reviewedBy,
  };

  if (existing[0]) {
    await db.update(engineerEvaluations).set(evalData)
      .where(eq(engineerEvaluations.id, existing[0].id));
    return { id: existing[0].id, updated: true, overallScore, performanceLevel, decisionAction, promotionEligible: eligible, missingCriteria };
  } else {
    const [result] = await db.insert(engineerEvaluations).values({
      ...evalData,
      engineerId: input.engineerId,
      evaluationMonth: input.evaluationMonth,
      evaluationYear: input.evaluationYear,
    });
    return { id: (result as any).insertId, updated: false, overallScore, performanceLevel, decisionAction, promotionEligible: eligible, missingCriteria };
  }
}

/** جلب تاريخ تقييمات المهندس */
export async function getEngineerEvaluationHistory(engineerId: number) {
  const db = await getDb();
  if (!db) return [];

  const evals = await db.select().from(engineerEvaluations)
    .where(eq(engineerEvaluations.engineerId, engineerId))
    .orderBy(desc(engineerEvaluations.evaluationYear), desc(engineerEvaluations.evaluationMonth));

  return evals.map((e, i) => {
    const prev = evals[i + 1];
    const trend: "up" | "down" | "stable" =
      prev ? (e.overallScore > prev.overallScore ? "up" :
              e.overallScore < prev.overallScore ? "down" : "stable") : "stable";
    return {
      ...e,
      trend,
      overallScorePct: e.overallScore,
      performanceLevelLabel: e.performanceLevel === "a_player" ? "A Player" :
        e.performanceLevel === "b_player" ? "B Player" : "C Player",
      careerLevelLabel: e.careerLevel === "sales_engineer" ? "Sales Engineer" :
        e.careerLevel === "senior_sales_engineer" ? "Senior Sales Engineer" : "Sales Consultant",
    };
  });
}

/** جلب Dashboard الكامل لكل المهندسين (للإدارة) */
export async function getAllEngineersEvaluationDashboard() {
  const db = await getDb();
  if (!db) return [];

  const engList = await db.select().from(engineers)
    .where(and(eq(engineers.isDeleted, 0)));

  const salesEngineers = engList.filter(e =>
    !["admin_sales", "group_admin"].includes(e.role ?? ""));

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const allEvals = await db.select().from(engineerEvaluations)
    .where(and(
      eq(engineerEvaluations.evaluationMonth, currentMonth),
      eq(engineerEvaluations.evaluationYear, currentYear)
    ));

  const allCareerLevels = await db.select().from(engineerCareerLevels);

  return salesEngineers.map(eng => {
    const currentEval = allEvals.find(e => e.engineerId === eng.id);
    const careerLevel = allCareerLevels.find(c => c.engineerId === eng.id);

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      role: eng.role,
      careerLevel: careerLevel?.currentLevel ?? "sales_engineer",
      careerLevelLabel: careerLevel?.currentLevel === "senior_sales_engineer" ? "Senior Sales Engineer" :
        careerLevel?.currentLevel === "sales_consultant" ? "Sales Consultant" : "Sales Engineer",
      currentEval: currentEval ? {
        overallScore: currentEval.overallScore,
        performanceLevel: currentEval.performanceLevel,
        performanceLevelLabel: currentEval.performanceLevel === "a_player" ? "A Player" :
          currentEval.performanceLevel === "b_player" ? "B Player" : "C Player",
        decisionAction: currentEval.decisionAction,
        promotionEligible: currentEval.promotionEligible,
        promotionReadinessScore: currentEval.promotionReadinessScore,
        firingDecisionTriggered: currentEval.firingDecisionTriggered,
        consecutiveCMonths: currentEval.consecutiveCMonths,
        salesAchievementScore: currentEval.salesAchievementScore,
        meetingScore: currentEval.meetingScore,
        playbookUsageScore: currentEval.playbookUsageScore,
        taskDisciplineScore: currentEval.taskDisciplineScore,
        closingRateScore: currentEval.closingRateScore,
      } : null,
      benefits: {
        commissionMultiplier: parseFloat(careerLevel?.commissionMultiplier as string ?? "1.00"),
        maxDiscountPct: parseFloat(careerLevel?.maxDiscountPct as string ?? "5.00"),
        leadsAccessLevel: careerLevel?.leadsAccessLevel ?? "standard",
      },
    };
  });
}

/** تنفيذ ترقية المهندس */
export async function promoteEngineer(engineerId: number, promotedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const careerLevelRecord = await db.select().from(engineerCareerLevels)
    .where(eq(engineerCareerLevels.engineerId, engineerId)).limit(1);

  const currentLevel = careerLevelRecord[0]?.currentLevel ?? "sales_engineer";

  const nextLevel: Record<string, string> = {
    "sales_engineer": "senior_sales_engineer",
    "senior_sales_engineer": "sales_consultant",
    "sales_consultant": "sales_consultant", // أعلى مستوى
  };

  const newLevel = nextLevel[currentLevel] as "sales_engineer" | "senior_sales_engineer" | "sales_consultant";
  if (newLevel === currentLevel) throw new Error("المهندس في أعلى مستوى بالفعل");

  // Benefits per Level
  const levelBenefits: Record<string, { commissionMultiplier: string; maxDiscountPct: string; leadsAccessLevel: "standard" | "premium" | "vip" }> = {
    "sales_engineer": { commissionMultiplier: "1.00", maxDiscountPct: "5.00", leadsAccessLevel: "standard" },
    "senior_sales_engineer": { commissionMultiplier: "1.15", maxDiscountPct: "10.00", leadsAccessLevel: "premium" },
    "sales_consultant": { commissionMultiplier: "1.30", maxDiscountPct: "15.00", leadsAccessLevel: "vip" },
  };

  const benefits = levelBenefits[newLevel];
  const promotionEvent = {
    from: currentLevel, to: newLevel,
    date: new Date().toISOString(),
    promotedBy,
  };

  if (careerLevelRecord[0]) {
    const existingHistory = JSON.parse(careerLevelRecord[0].promotionHistory ?? "[]");
    existingHistory.push(promotionEvent);
    await db.update(engineerCareerLevels).set({
      currentLevel: newLevel,
      levelStartDate: new Date(),
      ...benefits,
      promotionHistory: JSON.stringify(existingHistory),
    }).where(eq(engineerCareerLevels.engineerId, engineerId));
  } else {
    await db.insert(engineerCareerLevels).values({
      engineerId,
      currentLevel: newLevel,
      levelStartDate: new Date(),
      ...benefits,
      promotionHistory: JSON.stringify([promotionEvent]),
    });
  }

  return { success: true, newLevel, benefits };
}

/** جلب أو إنشاء Career Level للمهندس */
export async function getOrCreateEngineerCareerLevel(engineerId: number) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db.select().from(engineerCareerLevels)
    .where(eq(engineerCareerLevels.engineerId, engineerId)).limit(1);

  if (existing[0]) return existing[0];

  // إنشاء مستوى افتراضي
  await db.insert(engineerCareerLevels).values({
    engineerId,
    currentLevel: "sales_engineer",
    commissionMultiplier: "1.00",
    maxDiscountPct: "5.00",
    leadsAccessLevel: "standard",
  });

  return (await db.select().from(engineerCareerLevels)
    .where(eq(engineerCareerLevels.engineerId, engineerId)).limit(1))[0];
}

/** Dashboard القرار للإدارة: Performance + Execution + Decision + Alerts */
export async function getManagementDecisionDashboard() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const since60 = new Date();
  since60.setDate(since60.getDate() - 60);

  // جلب المهندسين
  const engList = await db.select().from(engineers).where(eq(engineers.isDeleted, 0));
  const salesEngineers = engList.filter(e => !["admin_sales", "group_admin"].includes(e.role ?? ""));

  // جلب الأهداف
  const targets = await db.select().from(engineerTargets)
    .where(and(eq(engineerTargets.month, currentMonth), eq(engineerTargets.year, currentYear)));

  // جلب الصفقات
  const allDeals = await db.select().from(deals)
    .where(and(eq(deals.isDeleted, 0), gte(deals.createdAt, since60)));

  // جلب المهام
  const allTasks = await db.select().from(dailyTasks)
    .where(and(eq(dailyTasks.isDeleted, 0), gte(dailyTasks.createdAt, monthStart)));

  // جلب Reviews
  const allReviews = await db.select().from(meetingReviews);

  // جلب التقييمات الشهرية
  const allEvals = await db.select().from(engineerEvaluations)
    .where(and(eq(engineerEvaluations.evaluationMonth, currentMonth), eq(engineerEvaluations.evaluationYear, currentYear)));

  // جلب Career Levels
  const allCareerLevels = await db.select().from(engineerCareerLevels);

  const meetingTypes = ["meeting_2d", "meeting_3d", "meeting_quotation", "meeting_closing", "meeting_presentation"];

  const engineerCards = salesEngineers.map(eng => {
    const target = targets.find(t => t.engineerId === eng.id);
    const targetSales = parseFloat(target?.targetAmount as string ?? "0");

    const engDeals = allDeals.filter(d => d.engineerId === eng.id);
    const closedWon = engDeals.filter(d => d.stage === "closed_won");
    const actualSales = closedWon.reduce((s, d) => s + parseFloat(d.value as string), 0);
    const salesAchievementPct = targetSales > 0 ? Math.round((actualSales / targetSales) * 100) : 0;
    const closingRate = engDeals.length > 0 ? Math.round((closedWon.length / engDeals.length) * 100) : 0;

    const engTasks = allTasks.filter(t => t.engineerId === eng.id);
    const meetingTasks = engTasks.filter(t => meetingTypes.includes((t as any).taskType ?? ""));
    const completedMeetings = meetingTasks.filter(t => t.status === "completed");
    const meetingsWithRecording = completedMeetings.filter(t => t.meetingRecordingLink);
    const missingRecordings = completedMeetings.filter(t => !t.meetingRecordingLink).length;
    const taskCompletionPct = engTasks.length > 0
      ? Math.round((engTasks.filter(t => t.status === "completed").length / engTasks.length) * 100) : 0;

    const engReviews = allReviews.filter(r => r.engineerId === eng.id);
    const avgMeetingScore = engReviews.length > 0
      ? Math.round(engReviews.reduce((s, r) => s + r.totalScore, 0) / engReviews.length / 40 * 100) : 0;
    const playbookUsagePct = meetingTasks.length > 0
      ? Math.round((engReviews.length / meetingTasks.length) * 100) : 0;

    const currentEval = allEvals.find(e => e.engineerId === eng.id);
    const careerLevel = allCareerLevels.find(c => c.engineerId === eng.id);

    // Promotion Status
    let promotionStatus: "eligible" | "needs_improvement" | "at_risk" = "needs_improvement";
    if (currentEval?.promotionEligible) promotionStatus = "eligible";
    else if (currentEval?.firingDecisionTriggered || (currentEval?.consecutiveCMonths ?? 0) >= 2) promotionStatus = "at_risk";

    // Alerts
    const alerts: string[] = [];
    if (missingRecordings > 0) alerts.push(`${missingRecordings} اجتماع بدون Recording`);
    if (taskCompletionPct < 70) alerts.push(`إكمال المهام ${taskCompletionPct}% (أقل من 70%)`);
    if (avgMeetingScore < 50) alerts.push(`Meeting Score ضعيف (${avgMeetingScore}%)`);
    if (playbookUsagePct < 50) alerts.push(`Playbook Usage منخفض (${playbookUsagePct}%)`);
    if (currentEval?.firingDecisionTriggered) alerts.push("⚠️ شهرين C Player - قرار إداري مطلوب");

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      careerLevel: careerLevel?.currentLevel ?? "sales_engineer",
      careerLevelLabel: careerLevel?.currentLevel === "senior_sales_engineer" ? "Senior" :
        careerLevel?.currentLevel === "sales_consultant" ? "Consultant" : "Sales Eng.",
      // Performance
      actualSales, targetSales, salesAchievementPct,
      closingRate,
      // Execution
      meetingsCount: meetingTasks.length,
      completedMeetings: completedMeetings.length,
      missingRecordings,
      taskCompletionPct,
      playbookUsagePct,
      avgMeetingScore,
      // Decision
      performanceLevel: currentEval?.performanceLevel ?? null,
      performanceLevelLabel: currentEval?.performanceLevel === "a_player" ? "A Player" :
        currentEval?.performanceLevel === "b_player" ? "B Player" :
        currentEval?.performanceLevel === "c_player" ? "C Player" : "غير مقيّم",
      promotionStatus,
      promotionReadinessScore: currentEval?.promotionReadinessScore ?? 0,
      firingRisk: currentEval?.firingDecisionTriggered ?? false,
      // Alerts
      alerts,
      alertsCount: alerts.length,
    };
  });

  // إحصائيات إجمالية
  const totalAlerts = engineerCards.reduce((s, e) => s + e.alertsCount, 0);
  const aPlayers = engineerCards.filter(e => e.performanceLevel === "a_player").length;
  const bPlayers = engineerCards.filter(e => e.performanceLevel === "b_player").length;
  const cPlayers = engineerCards.filter(e => e.performanceLevel === "c_player").length;
  const firingRiskCount = engineerCards.filter(e => e.firingRisk).length;
  const promotionEligibleCount = engineerCards.filter(e => e.promotionStatus === "eligible").length;

  return {
    engineerCards,
    summary: {
      totalEngineers: salesEngineers.length,
      totalAlerts,
      aPlayers, bPlayers, cPlayers,
      firingRiskCount,
      promotionEligibleCount,
      avgSalesAchievement: salesEngineers.length > 0
        ? Math.round(engineerCards.reduce((s, e) => s + e.salesAchievementPct, 0) / salesEngineers.length) : 0,
      avgMeetingScore: salesEngineers.length > 0
        ? Math.round(engineerCards.reduce((s, e) => s + e.avgMeetingScore, 0) / salesEngineers.length) : 0,
    },
  };
}

// ─── Promotion Progress per Engineer (كل تفاصيل الترقية لمهندس واحد) ──────────
export async function getEngineerPromotionProgress(engineerId: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthStart = new Date(currentYear, currentMonth - 1, 1);

  // جلب بيانات المهندس
  const engList = await db.select().from(engineers)
    .where(eq(engineers.id, engineerId)).limit(1);
  const eng = engList[0];
  if (!eng) return null;

  // جلب Career Level
  const careerLevelRec = await db.select().from(engineerCareerLevels)
    .where(eq(engineerCareerLevels.engineerId, engineerId)).limit(1);
  const careerLevel = (careerLevelRec[0]?.currentLevel ?? "sales_engineer") as
    "sales_engineer" | "senior_sales_engineer" | "sales_consultant";

  // جلب آخر 3 تقييمات شهرية
  const recentEvals = await db.select().from(engineerEvaluations)
    .where(eq(engineerEvaluations.engineerId, engineerId))
    .orderBy(desc(engineerEvaluations.evaluationYear), desc(engineerEvaluations.evaluationMonth))
    .limit(3);

  const currentEval = recentEvals.find(
    e => e.evaluationMonth === currentMonth && e.evaluationYear === currentYear
  ) ?? recentEvals[0] ?? null;

  // ─── Mandatory Conditions Check ───────────────────────────────────────────
  const meetingTypes = ["meeting_2d", "meeting_3d", "meeting_quotation", "meeting_closing", "meeting_presentation"];
  const engTasks = await db.select().from(dailyTasks)
    .where(and(eq(dailyTasks.engineerId, engineerId), eq(dailyTasks.isDeleted, 0), gte(dailyTasks.createdAt, monthStart)));
  const meetingTasks = engTasks.filter(t => meetingTypes.includes(t.taskType ?? ""));
  const completedMeetings = meetingTasks.filter(t => t.status === "completed");
  const meetingsWithRecording = completedMeetings.filter(t => t.meetingRecordingLink);
  const engReviews = await db.select().from(meetingReviews)
    .where(eq(meetingReviews.engineerId, engineerId));

  const hasAllRecordings = completedMeetings.length === 0 || meetingsWithRecording.length === completedMeetings.length;
  const hasAllReviews = completedMeetings.length === 0 || engReviews.length >= completedMeetings.length;
  const playbookUsagePct = meetingTasks.length > 0
    ? Math.round((engReviews.length / meetingTasks.length) * 100) : 0;
  const hasPlaybookUsage = playbookUsagePct >= (careerLevel === "senior_sales_engineer" ? 85 : 70);

  const mandatoryConditions = {
    hasAllRecordings,
    hasAllReviews,
    hasPlaybookUsage,
    recordingsStatus: `${meetingsWithRecording.length}/${completedMeetings.length} اجتماع مسجّل`,
    reviewsStatus: `${engReviews.length}/${completedMeetings.length} اجتماع مراجَع`,
    playbookStatus: `${playbookUsagePct}% استخدام Playbook`,
    allMet: hasAllRecordings && hasAllReviews && hasPlaybookUsage,
  };

  // ─── Promotion Rules per Level ────────────────────────────────────────────
  const consecutiveMonths = currentEval?.consecutiveMonthsMeetingTarget ?? 0;
  const scores = {
    salesAchievementScore: currentEval?.salesAchievementScore ?? 0,
    closingRateScore: currentEval?.closingRateScore ?? 0,
    meetingScore: currentEval?.meetingScore ?? 0,
    playbookUsageScore: currentEval?.playbookUsageScore ?? 0,
    taskDisciplineScore: currentEval?.taskDisciplineScore ?? 0,
  };

  let promotionRules: Array<{
    criterion: string;
    required: string;
    current: string | number;
    met: boolean;
    weight: "critical" | "important" | "standard";
  }> = [];

  if (careerLevel === "sales_engineer") {
    promotionRules = [
      {
        criterion: "Sales Target",
        required: "≥ 80% لشهرين متتاليين",
        current: `${scores.salesAchievementScore}% (${consecutiveMonths} شهر متتالي)`,
        met: scores.salesAchievementScore >= 80 && consecutiveMonths >= 2,
        weight: "critical",
      },
      {
        criterion: "Meeting Score",
        required: "≥ 70%",
        current: `${scores.meetingScore}%`,
        met: scores.meetingScore >= 70,
        weight: "critical",
      },
      {
        criterion: "Playbook Usage",
        required: "≥ 70%",
        current: `${scores.playbookUsageScore}%`,
        met: scores.playbookUsageScore >= 70,
        weight: "critical",
      },
      {
        criterion: "Task Completion (Meeting + Recording)",
        required: "100%",
        current: `${scores.taskDisciplineScore}%`,
        met: scores.taskDisciplineScore >= 100,
        weight: "critical",
      },
      {
        criterion: "لا يوجد تأخير في Tasks",
        required: "صفر تأخيرات",
        current: scores.taskDisciplineScore >= 90 ? "ملتزم" : "يوجد تأخيرات",
        met: scores.taskDisciplineScore >= 90,
        weight: "important",
      },
      {
        criterion: "Meeting Recordings كاملة",
        required: "100% مسجّلة",
        current: mandatoryConditions.recordingsStatus,
        met: hasAllRecordings,
        weight: "critical",
      },
      {
        criterion: "Meeting Reviews موجودة",
        required: "كل اجتماع مراجَع",
        current: mandatoryConditions.reviewsStatus,
        met: hasAllReviews,
        weight: "critical",
      },
    ];
  } else if (careerLevel === "senior_sales_engineer") {
    promotionRules = [
      {
        criterion: "Sales Target",
        required: "≥ 100% لـ 3 شهور متتالية",
        current: `${scores.salesAchievementScore}% (${consecutiveMonths} شهر متتالي)`,
        met: scores.salesAchievementScore >= 100 && consecutiveMonths >= 3,
        weight: "critical",
      },
      {
        criterion: "Closing Rate",
        required: "عالي (≥ 70%)",
        current: `${scores.closingRateScore}%`,
        met: scores.closingRateScore >= 70,
        weight: "critical",
      },
      {
        criterion: "Meeting Score",
        required: "≥ 80%",
        current: `${scores.meetingScore}%`,
        met: scores.meetingScore >= 80,
        weight: "critical",
      },
      {
        criterion: "Playbook Usage",
        required: "≥ 85%",
        current: `${scores.playbookUsageScore}%`,
        met: scores.playbookUsageScore >= 85,
        weight: "critical",
      },
      {
        criterion: "تقليل استخدام الخصومات",
        required: "خصومات محدودة",
        current: scores.closingRateScore >= 70 ? "ملتزم" : "يستخدم خصومات كثيرة",
        met: scores.closingRateScore >= 70,
        weight: "important",
      },
      {
        criterion: "التعامل مع Clients High Value",
        required: "قادر على التعامل",
        current: scores.meetingScore >= 80 ? "مؤهل" : "يحتاج تطوير",
        met: scores.meetingScore >= 80,
        weight: "important",
      },
      {
        criterion: "Meeting Recordings كاملة",
        required: "100% مسجّلة",
        current: mandatoryConditions.recordingsStatus,
        met: hasAllRecordings,
        weight: "critical",
      },
      {
        criterion: "Meeting Reviews موجودة",
        required: "كل اجتماع مراجَع",
        current: mandatoryConditions.reviewsStatus,
        met: hasAllReviews,
        weight: "critical",
      },
      {
        criterion: "استخدام Playbook فعلي",
        required: "≥ 85%",
        current: mandatoryConditions.playbookStatus,
        met: hasPlaybookUsage,
        weight: "critical",
      },
    ];
  }

  const metCount = promotionRules.filter(r => r.met).length;
  const totalRules = promotionRules.length;
  const overallReadiness = totalRules > 0 ? Math.round((metCount / totalRules) * 100) : 0;
  const criticalMet = promotionRules.filter(r => r.weight === "critical" && r.met).length;
  const criticalTotal = promotionRules.filter(r => r.weight === "critical").length;
  const allCriticalMet = criticalMet === criticalTotal;
  const promotionEligible = allCriticalMet && mandatoryConditions.allMet;

  // ─── نقاط القوة والتحسين ──────────────────────────────────────────────────
  const strengthPoints: string[] = [];
  const improvementPoints: string[] = [];

  if (scores.salesAchievementScore >= 80) strengthPoints.push(`Sales Achievement قوي (${scores.salesAchievementScore}%)`);
  else improvementPoints.push(`تحسين Sales Achievement من ${scores.salesAchievementScore}% إلى ≥ 80%`);

  if (scores.meetingScore >= 70) strengthPoints.push(`Meeting Score ممتاز (${scores.meetingScore}%)`);
  else improvementPoints.push(`رفع Meeting Score من ${scores.meetingScore}% إلى ≥ 70%`);

  if (scores.playbookUsageScore >= 70) strengthPoints.push(`Playbook Usage منتظم (${scores.playbookUsageScore}%)`);
  else improvementPoints.push(`زيادة Playbook Usage من ${scores.playbookUsageScore}% إلى ≥ 70%`);

  if (scores.closingRateScore >= 60) strengthPoints.push(`Closing Rate جيد (${scores.closingRateScore}%)`);
  else improvementPoints.push(`تحسين Closing Rate من ${scores.closingRateScore}% إلى ≥ 60%`);

  if (hasAllRecordings) strengthPoints.push("كل الاجتماعات مسجّلة");
  else improvementPoints.push(`تسجيل الاجتماعات الناقصة (${mandatoryConditions.recordingsStatus})`);

  if (hasAllReviews) strengthPoints.push("كل الاجتماعات مراجَعة");
  else improvementPoints.push(`إضافة Reviews للاجتماعات (${mandatoryConditions.reviewsStatus})`);

  if (consecutiveMonths >= 2) strengthPoints.push(`${consecutiveMonths} أشهر متتالية تحقيق الهدف`);
  else improvementPoints.push(`الاستمرار في تحقيق الهدف (${consecutiveMonths} شهر حتى الآن)`);

  // ─── Demotion / Warning Logic ─────────────────────────────────────────────
  const consecutiveCMonths = currentEval?.consecutiveCMonths ?? 0;
  const performanceLevel = currentEval?.performanceLevel ?? null;

  let warningStatus: "none" | "warning" | "improvement_plan" | "firing_risk" = "none";
  let warningMessage = "";
  if (performanceLevel === "c_player") {
    if (consecutiveCMonths >= 2) {
      warningStatus = "firing_risk";
      warningMessage = `⚠️ شهرين متتاليين C Player — يجب اتخاذ قرار إداري فوري`;
    } else if (consecutiveCMonths === 1) {
      warningStatus = "improvement_plan";
      warningMessage = `تحذير: شهر C Player — خطة تحسين 30 يوم مطلوبة`;
    } else {
      warningStatus = "warning";
      warningMessage = `تحذير: أداء ضعيف هذا الشهر — يجب التحسين`;
    }
  }

  // ─── Benefits per Level ───────────────────────────────────────────────────
  const BENEFITS_TABLE = {
    sales_engineer: {
      label: "Sales Engineer",
      commission: "Commission أساسي (×1.0)",
      discount: "Discount محدود (5%)",
      leads: "Standard Leads",
      clients: "عملاء عاديون",
      extras: [],
    },
    senior_sales_engineer: {
      label: "Senior Sales Engineer",
      commission: "Commission أعلى (×1.15)",
      discount: "Discount صلاحيات أعلى (10%)",
      leads: "Premium Leads",
      clients: "عملاء متميزون",
      extras: ["أولوية في توزيع Leads الجديدة"],
    },
    sales_consultant: {
      label: "Sales Consultant",
      commission: "أعلى Commission (×1.30)",
      discount: "أعلى Discount Range (15%)",
      leads: "VIP Leads — أولوية قصوى",
      clients: "Clients VIP فقط",
      extras: ["Priority في كل Leads الجديدة", "صلاحية التفاوض المستقل", "Bonus إضافي على الصفقات الكبيرة"],
    },
  };

  const nextLevel = careerLevel === "sales_engineer" ? "senior_sales_engineer" :
    careerLevel === "senior_sales_engineer" ? "sales_consultant" : null;

  return {
    engineerId,
    engineerName: eng.name,
    careerLevel,
    careerLevelLabel: careerLevel === "senior_sales_engineer" ? "Senior Sales Engineer" :
      careerLevel === "sales_consultant" ? "Sales Consultant" : "Sales Engineer",
    nextLevel,
    nextLevelLabel: nextLevel === "senior_sales_engineer" ? "Senior Sales Engineer" :
      nextLevel === "sales_consultant" ? "Sales Consultant" : null,
    currentEval: currentEval ? {
      overallScore: currentEval.overallScore,
      performanceLevel: currentEval.performanceLevel,
      salesAchievementScore: currentEval.salesAchievementScore,
      closingRateScore: currentEval.closingRateScore,
      meetingScore: currentEval.meetingScore,
      playbookUsageScore: currentEval.playbookUsageScore,
      taskDisciplineScore: currentEval.taskDisciplineScore,
      consecutiveMonthsMeetingTarget: currentEval.consecutiveMonthsMeetingTarget,
      consecutiveCMonths: currentEval.consecutiveCMonths,
      decisionAction: currentEval.decisionAction,
      coachingNotes: currentEval.coachingNotes,
      improvementPlan: currentEval.improvementPlan,
    } : null,
    promotionRules,
    overallReadiness,
    criticalMet,
    criticalTotal,
    promotionEligible,
    mandatoryConditions,
    strengthPoints,
    improvementPoints,
    warningStatus,
    warningMessage,
    currentBenefits: BENEFITS_TABLE[careerLevel],
    nextBenefits: nextLevel ? BENEFITS_TABLE[nextLevel] : null,
    recentHistory: recentEvals.map(e => ({
      month: e.evaluationMonth,
      year: e.evaluationYear,
      overallScore: e.overallScore,
      performanceLevel: e.performanceLevel,
      decisionAction: e.decisionAction,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Operational Performance Analysis (from Tasks Module) ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Target distribution percentages
const TASK_TYPE_TARGETS = {
  '2d_design':            10, // 10% of total tasks
  '3d_modeling':          15, // 30% combined with render
  'render':               15, // 30% combined with 3d_modeling
  'quotation':            10, // 10%
  'meeting_modeling':      8, // part of 50% meetings
  'meeting_presentation': 14, // part of 50% meetings
  'meeting_closing':      28, // part of 50% meetings
};

export async function getOperationalPerformance(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const allEngineers = await db.select().from(engineers).where(and(eq(engineers.isDeleted, 0), eq(engineers.status, 'active')));
  // فلترة: Sales Engineers فقط (بدون admin_sales, group_admin, pro_group, tele_sales, site_engineer)
  const EXCLUDED_ROLES = ['admin_sales', 'group_admin', 'pro_group', 'admin', 'tele_sales', 'site_engineer', 'system_user'];
  const engList = allEngineers.filter((e: any) => !EXCLUDED_ROLES.includes(e.role ?? '') && !EXCLUDED_ROLES.includes(e.department ?? ''));
  const allTasks = await db.select().from(dailyTasks).where(
    and(
      gte(dailyTasks.taskDate, startDate),
      lte(dailyTasks.taskDate, endDate),
      eq(dailyTasks.isDeleted, 0)
    )
  );

  const allDeals = await db.select().from(deals).where(
    and(
      between(deals.createdAt, startDate, endDate),
      eq(deals.stage, 'closed_won')
    )
  );

  const taskTypes = ['design_2d', 'design_3d', 'render', 'quotation', 'meeting_modeling', 'meeting_presentation', 'meeting_closing'] as const;

  const results = engList.map((eng: any) => {
    const engTasks = allTasks.filter((t: any) => t.engineerId === eng.id);
    const totalTasks = engTasks.length;
    const completedTasks = engTasks.filter(t => t.status === 'completed').length;

    // Count by task type
    const typeCounts: Record<string, number> = {};
    const typeCompleted: Record<string, number> = {};
    for (const type of taskTypes) {
      typeCounts[type] = engTasks.filter((t: any) => t.taskType === type).length;
      typeCompleted[type] = engTasks.filter((t: any) => t.taskType === type && t.status === 'completed').length;
    }

    // Meeting types combined
    const totalMeetings = (typeCounts['meeting_modeling'] || 0) + (typeCounts['meeting_presentation'] || 0) + (typeCounts['meeting_closing'] || 0);
    const total3DRender = (typeCounts['design_3d'] || 0) + (typeCounts['render'] || 0);
    const total2D = typeCounts['design_2d'] || 0;
    const totalQuotations = typeCounts['quotation'] || 0;

    // Actual distribution percentages
    const meetingsPct = totalTasks > 0 ? (totalMeetings / totalTasks) * 100 : 0;
    const threeDRenderPct = totalTasks > 0 ? (total3DRender / totalTasks) * 100 : 0;
    const twoDPct = totalTasks > 0 ? (total2D / totalTasks) * 100 : 0;
    const quotationsPct = totalTasks > 0 ? (totalQuotations / totalTasks) * 100 : 0;

    // Target distribution: 50% Meetings, 30% 3D+Render, 10% 2D, 10% Quotations
    const distributionScore = Math.max(0, 100 - (
      Math.abs(meetingsPct - 50) * 0.5 +
      Math.abs(threeDRenderPct - 30) * 0.5 +
      Math.abs(twoDPct - 10) * 0.5 +
      Math.abs(quotationsPct - 10) * 0.5
    ));

    // Conversion rates
    const engDeals = allDeals.filter(d => d.engineerId === eng.id);
    const closingMeetings = typeCounts['meeting_closing'] || 0;
    const meetingToClosingRate = closingMeetings > 0 ? (engDeals.length / closingMeetings) * 100 : 0;
    const totalDesigns = total2D + total3DRender;
    const designToSalesRate = totalDesigns > 0 ? (engDeals.length / totalDesigns) * 100 : 0;

    // Task efficiency: planned hours vs actual
    const plannedHours = engTasks.reduce((s: number, t: any) => s + (t.plannedHours || 0), 0);
    const taskEfficiency = completedTasks > 0 && totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Alerts
    const alerts: string[] = [];
    if (meetingsPct < 30) alerts.push('عدد الاجتماعات منخفض جداً (أقل من 30%)');
    if (meetingsPct > 70) alerts.push('تركيز مفرط على الاجتماعات بدون مخرجات كافية');
    if (closingMeetings > 0 && engDeals.length === 0) alerts.push('اجتماعات Closing بدون صفقات مغلقة');
    if (totalDesigns > 0 && engDeals.length === 0) alerts.push('تصميمات كثيرة بدون تحويل لمبيعات');
    if (taskEfficiency < 50) alerts.push('نسبة إتمام المهام منخفضة');

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      totalTasks,
      completedTasks,
      taskEfficiency: Math.round(taskEfficiency * 10) / 10,
      plannedHours,
      // Task type counts
      count2D: total2D,
      count3D: typeCounts['design_3d'] || 0,
      countRender: typeCounts['render'] || 0,
      countQuotation: totalQuotations,
      countMeetingModeling: typeCounts['meeting_modeling'] || 0,
      countMeetingPresentation: typeCounts['meeting_presentation'] || 0,
      countMeetingClosing: closingMeetings,
      countTotalMeetings: totalMeetings,
      count3DRender: total3DRender,
      // Distribution percentages (Actual)
      meetingsPct: Math.round(meetingsPct * 10) / 10,
      threeDRenderPct: Math.round(threeDRenderPct * 10) / 10,
      twoDPct: Math.round(twoDPct * 10) / 10,
      quotationsPct: Math.round(quotationsPct * 10) / 10,
      // Target distribution
      targetMeetingsPct: 50,
      targetThreeDRenderPct: 30,
      targetTwoDPct: 10,
      targetQuotationsPct: 10,
      // Distribution score
      distributionScore: Math.round(distributionScore * 10) / 10,
      // Conversion rates
      closedDeals: engDeals.length,
      meetingToClosingRate: Math.round(meetingToClosingRate * 10) / 10,
      designToSalesRate: Math.round(designToSalesRate * 10) / 10,
      // Alerts
      alerts,
    };
  });

  // Ranking by task efficiency
  const sorted = [...results].sort((a, b) => (b as any).taskEfficiency - (a as any).taskEfficiency);
  return results.map((r) => ({
    ...(r as any),
    efficiencyRank: sorted.findIndex((s) => (s as any).engineerId === (r as any).engineerId) + 1,
  }));
}

// ─── Enhanced Ranking (4 criteria) ────────────────────────────────────────────
export async function getEnhancedRanking(year: number, month: number) {
  // db not needed - uses other functions
  const kpiData = await getEngineersKPI(year, month);
  const opData = await getOperationalPerformance(year, month);

  return kpiData.map((eng: any) => {
    const op = opData.find((o: any) => o.engineerId === eng.engineerId);
    const targetAmount = eng.targetAmount || 0;
    const achievementPct = eng.achievementPct || 0;

    // Composite ranking score (4 criteria)
    const revenueScore = Math.min(100, achievementPct);
    const closingRateScore = op ? Math.min(100, op.meetingToClosingRate) : 0;
    const taskEfficiencyScore = op ? op.taskEfficiency : 0;
    const targetAchievementScore = Math.min(100, achievementPct);

    const compositeScore = Math.round(
      revenueScore * 0.35 +
      closingRateScore * 0.25 +
      taskEfficiencyScore * 0.20 +
      targetAchievementScore * 0.20
    );

    return {
      engineerId: eng.engineerId,
      engineerName: eng.engineerName,
      compositeScore,
      revenueScore: Math.round(revenueScore * 10) / 10,
      closingRateScore: Math.round(closingRateScore * 10) / 10,
      taskEfficiencyScore: Math.round(taskEfficiencyScore * 10) / 10,
      targetAchievementScore: Math.round(targetAchievementScore * 10) / 10,
      totalRevenue: eng.totalDealValue,
      kpiScore: eng.kpiScore,
      kpiRank: eng.kpiRank,
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore)
    .map((r, i) => ({ ...r, compositeRank: i + 1 }));
}

// ════════════════════════════════════════════════════════════════════════════
// ROLE-BASED KPI SYSTEM — كل دور له KPI مستقل
// ════════════════════════════════════════════════════════════════════════════

/** الأدوار التي تُعتبر Sales Engineers (لـ KPI المبيعات) */
export const SALES_ENGINEER_ROLES = ['engineer', 'sales_engineer'] as const;
/** الأدوار التي يجب استثناؤها من KPI المبيعات */
export const NON_SALES_ROLES = ['admin', 'admin_sales', 'tele_sales', 'site_engineer', 'system_user', 'group_admin'] as const;

/** أقسام البيع الفعلية (Sales Engineer + Sales Specialist) */
export const SALES_DEPARTMENTS = ['sales_engineer', 'sales_specialist'] as const;
/** أقسام لا تدخل في KPI البيع */
export const NON_SALES_DEPARTMENTS = ['interior_designer', 'tele_sales', 'site', 'admin_sales', 'manager'] as const;
/** أسماء الأقسام بالعربية */
export const DEPARTMENT_LABELS: Record<string, string> = {
  sales_engineer: 'مهندس مبيعات',
  sales_specialist: 'أخصائي مبيعات',
  interior_designer: 'مصمم داخلي',
  tele_sales: 'تيلي سيلز',
  site: 'مهندس معاينات',
  admin_sales: 'أدمن مبيعات',
  manager: 'مدير',
};

/** أنواع المهام المسموحة لكل قسم */
export const ALLOWED_TASK_TYPES_BY_DEPARTMENT: Record<string, string[]> = {
  sales_engineer:    ['design_2d', 'design_3d', 'render', 'quotation', 'meeting_modeling', 'meeting_presentation', 'meeting_closing', 'contract', 'work_order'],
  sales_specialist:  ['design_2d', 'design_3d', 'render', 'quotation', 'meeting_modeling', 'meeting_presentation', 'meeting_closing', 'contract', 'work_order'],
  interior_designer: ['design_2d', 'design_3d', 'render'],
  tele_sales:        ['quotation', 'meeting_modeling', 'meeting_presentation'],
  site:              ['meeting_modeling', 'meeting_presentation', 'meeting_closing'],
  admin_sales:       ['quotation', 'meeting_modeling', 'contract', 'work_order'],
  manager:           ['design_2d', 'design_3d', 'render', 'quotation', 'meeting_modeling', 'meeting_presentation', 'meeting_closing', 'contract', 'work_order'],
};

/** فلترة المهندسين حسب الدور (legacy) */
export function filterByRole(engList: any[], roles: readonly string[]): any[] {
  return engList.filter(e => roles.includes(e.role ?? 'sales_engineer'));
}
/** فلترة المهندسين حسب القسم (الجديد) */
export function filterByDepartment(engList: any[], depts: readonly string[]): any[] {
  return engList.filter(e => {
    const dept = e.department ?? e.role ?? 'sales_engineer';
    return depts.includes(dept);
  });
}
/** هل المهندس ينتمي لقسم البيع؟ */
export function isSalesDepartment(eng: { department?: string | null; role?: string }): boolean {
  const dept = eng.department ?? eng.role ?? 'sales_engineer';
  return (SALES_DEPARTMENTS as readonly string[]).includes(dept);
}

// ─── Tele Sales KPI ───────────────────────────────────────────────────────────
/**
 * KPI خاص بـ Tele Sales:
 * - عدد الـ Leads المعالجة
 * - Conversion Rate (Lead → Meeting)
 * - سرعة الاستجابة
 * - عدد المكالمات (من Tasks)
 */
export async function getTeleSalesKPI(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const allEngineers = await getEngineers();
  const teleSalesEngineers = allEngineers.filter(e => e.role === 'tele_sales');
  if (teleSalesEngineers.length === 0) return [];
  const allLeads = await db.select().from(leads)
    .where(between(leads.createdAt, startDate, endDate));
  const allTasks = await db.select().from(dailyTasks)
    .where(and(gte(dailyTasks.taskDate, startDate), lte(dailyTasks.taskDate, endDate)));
  const allVisits = await db.select().from(visits)
    .where(between(visits.scheduledAt, startDate, endDate));
  return teleSalesEngineers.map(eng => {
    const engLeads = allLeads.filter(l => l.assignedEngineerId === eng.id);
    const totalLeads = engLeads.length;
    const contactedLeads = engLeads.filter(l => l.status !== 'new').length;
    const convertedToMeeting = allVisits.filter(v => v.engineerId === eng.id).length;
    const conversionRate = totalLeads > 0 ? Math.round((convertedToMeeting / totalLeads) * 100) : 0;
    // سرعة الاستجابة
    const respondedLeads = engLeads.filter(l => l.responseTimeMinutes != null);
    const avgResponseTime = respondedLeads.length > 0
      ? Math.round(respondedLeads.reduce((s: number, l: any) => s + (l.responseTimeMinutes ?? 0), 0) / respondedLeads.length)
      : null;
    const responseScore = avgResponseTime == null ? 0
      : avgResponseTime <= 30 ? 100 : avgResponseTime <= 60 ? 80
      : avgResponseTime <= 120 ? 60 : avgResponseTime <= 240 ? 40 : 20;
    // عدد المكالمات من Tasks
    const callTasks = allTasks.filter(t => t.engineerId === eng.id);
    const completedCalls = callTasks.filter(t => t.status === 'completed').length;
    const totalCalls = callTasks.length;
    const callCompletionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
    // KPI Score: Leads 30% + Conversion 30% + Response 20% + Calls 20%
    const leadsScore = Math.min(100, totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0);
    const kpiScore = Math.round(
      leadsScore * 0.30 +
      conversionRate * 0.30 +
      responseScore * 0.20 +
      callCompletionRate * 0.20
    );
    return {
      engineerId: eng.id,
      engineerName: eng.name,
      role: eng.role,
      totalLeads,
      contactedLeads,
      convertedToMeeting,
      conversionRate,
      avgResponseTime,
      responseScore,
      totalCalls,
      completedCalls,
      callCompletionRate,
      kpiScore,
      kpiStatus: kpiScore >= 90 ? 'excellent' : kpiScore >= 75 ? 'good' : kpiScore >= 60 ? 'average' : 'poor',
    };
  });
}

// ─── Site Engineers KPI ───────────────────────────────────────────────────────
/**
 * KPI خاص بـ Site Engineers (المعاينات):
 * - عدد المعاينات
 * - الالتزام بالمواعيد
 * - جودة البيانات المدخلة
 * - نسبة التحويل من معاينة → تصميم
 */
export async function getSiteEngineersKPI(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const allEngineers = await getEngineers();
  const siteEngineers = allEngineers.filter(e => e.role === 'site_engineer');
  if (siteEngineers.length === 0) return [];
  const allVisits = await db.select().from(visits)
    .where(between(visits.scheduledAt, startDate, endDate));
  const allTasks = await db.select().from(dailyTasks)
    .where(and(gte(dailyTasks.taskDate, startDate), lte(dailyTasks.taskDate, endDate)));
  return siteEngineers.map(eng => {
    const engVisits = allVisits.filter(v => v.engineerId === eng.id);
    const totalVisits = engVisits.length;
    const completedVisits = engVisits.filter(v => v.status === 'completed').length;
    const cancelledVisits = engVisits.filter(v => v.status === 'cancelled').length;
    const confirmedSameDay = engVisits.filter(v => (v as any).confirmedSameDay).length;
    const uploadedSameDay = engVisits.filter(v => (v as any).uploadedSameDay).length;
    // الالتزام بالمواعيد: نسبة التأكيد في نفس اليوم
    const punctualityScore = totalVisits > 0 ? Math.round((confirmedSameDay / totalVisits) * 100) : 0;
    // جودة البيانات: نسبة الرفع في نفس اليوم
    const dataQualityScore = completedVisits > 0 ? Math.round((uploadedSameDay / completedVisits) * 100) : 0;
    // نسبة التحويل من معاينة → تصميم (من Tasks)
    const designTasks = allTasks.filter(t => t.engineerId === eng.id &&
      ['design_2d', 'design_3d', 'render'].includes(t.taskType ?? ''));
    const conversionRate = completedVisits > 0 ? Math.round((designTasks.length / completedVisits) * 100) : 0;
    // معدل الإلغاء
    const cancellationRate = totalVisits > 0 ? Math.round((cancelledVisits / totalVisits) * 100) : 0;
    // KPI Score: Visits 30% + Punctuality 25% + DataQuality 25% + Conversion 20%
    const visitsScore = Math.min(100, totalVisits * 5); // 20 معاينة = 100%
    const kpiScore = Math.round(
      visitsScore * 0.30 +
      punctualityScore * 0.25 +
      dataQualityScore * 0.25 +
      conversionRate * 0.20
    );
    return {
      engineerId: eng.id,
      engineerName: eng.name,
      role: eng.role,
      totalVisits,
      completedVisits,
      cancelledVisits,
      cancellationRate,
      confirmedSameDay,
      uploadedSameDay,
      punctualityScore,
      dataQualityScore,
      conversionRate,
      designTasksCount: designTasks.length,
      kpiScore,
      kpiStatus: kpiScore >= 90 ? 'excellent' : kpiScore >= 75 ? 'good' : kpiScore >= 60 ? 'average' : 'poor',
    };
  });
}

// ─── Admin Sales KPI ──────────────────────────────────────────────────────────
/**
 * KPI خاص بـ Admin Sales من admin_sales_tasks:
 * - 40% Daily Tasks Completion Rate
 * - 30% Weekly Tasks Completion Rate
 * - 20% Monthly Tasks Completion Rate
 * - 10% Meetings Completion Rate
 * Task بدون category لا تدخل في KPI
 */
export async function getAdminSalesKPI(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const allEngineers = await getEngineers();
  const adminSalesEngineers = allEngineers.filter(e => e.role === 'admin_sales');
  if (adminSalesEngineers.length === 0) return [];

  // جلب admin_sales_tasks للشهر
  const allAdminTasks = await db.select().from(adminSalesTasks)
    .where(and(
      gte(adminSalesTasks.taskDate, startDate),
      lte(adminSalesTasks.taskDate, endDate)
    ));

  // جلب admin_sales_meetings للشهر
  const allMeetings = await db.select().from(adminSalesMeetings)
    .where(and(
      gte(adminSalesMeetings.weekStartDate, startDate),
      lte(adminSalesMeetings.weekStartDate, endDate)
    ));

  return adminSalesEngineers.map(eng => {
    const engTasks = allAdminTasks.filter(t => t.engineerId === eng.id);
    // فقط Tasks ذات category (Tasks بدون category لا تدخل KPI)
    const kpiTasks = engTasks.filter(t => t.category !== null && t.category !== undefined);

    // Daily Tasks
    const dailyTasks_ = kpiTasks.filter(t => t.taskType === 'daily');
    const dailyDone = dailyTasks_.filter(t => t.status === 'done').length;
    const dailyRate = dailyTasks_.length > 0 ? Math.round((dailyDone / dailyTasks_.length) * 100) : 0;

    // Weekly Tasks
    const weeklyTasks_ = kpiTasks.filter(t => t.taskType === 'weekly');
    const weeklyDone = weeklyTasks_.filter(t => t.status === 'done').length;
    const weeklyRate = weeklyTasks_.length > 0 ? Math.round((weeklyDone / weeklyTasks_.length) * 100) : 0;

    // Monthly Tasks
    const monthlyTasks_ = kpiTasks.filter(t => t.taskType === 'monthly');
    const monthlyDone = monthlyTasks_.filter(t => t.status === 'done').length;
    const monthlyRate = monthlyTasks_.length > 0 ? Math.round((monthlyDone / monthlyTasks_.length) * 100) : 0;

    // Meetings (from adminSalesMeetings)
    const engMeetings = allMeetings.filter(m => m.engineerId === eng.id);
    const totalMeetingSlots = engMeetings.length * 2; // weeklyTeam + management per week
    const doneMeetings = engMeetings.reduce((acc, m) => {
      if (m.weeklyTeamMeeting === 'done') acc++;
      if (m.managementMeeting === 'done') acc++;
      return acc;
    }, 0);
    const meetingsRate = totalMeetingSlots > 0 ? Math.round((doneMeetings / totalMeetingSlots) * 100) : 0;

    // KPI = 40% Daily + 30% Weekly + 20% Monthly + 10% Meetings
    const kpiScore = Math.round(
      dailyRate * 0.40 +
      weeklyRate * 0.30 +
      monthlyRate * 0.20 +
      meetingsRate * 0.10
    );

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      role: eng.role,
      totalKpiTasks: kpiTasks.length,
      dailyTotal: dailyTasks_.length,
      dailyDone,
      dailyRate,
      weeklyTotal: weeklyTasks_.length,
      weeklyDone,
      weeklyRate,
      monthlyTotal: monthlyTasks_.length,
      monthlyDone,
      monthlyRate,
      meetingsTotal: totalMeetingSlots,
      meetingsDone: doneMeetings,
      meetingsRate,
      kpiScore,
      kpiStatus: kpiScore >= 90 ? 'excellent' : kpiScore >= 75 ? 'good' : kpiScore >= 60 ? 'average' : 'poor',
    };
  });
}

/**
 * تحليل Admin Sales حسب Category:
 * - نسبة تنفيذ كل category
 * - Weak Point (Category الأضعف)
 * - Overall Score
 */
export async function getAdminSalesCategoryAnalysis(engineerId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const tasks = await db.select().from(adminSalesTasks)
    .where(and(
      eq(adminSalesTasks.engineerId, engineerId),
      gte(adminSalesTasks.taskDate, startDate),
      lte(adminSalesTasks.taskDate, endDate)
    ));

  // فقط Tasks ذات category
  const kpiTasks = tasks.filter(t => t.category !== null && t.category !== undefined);

  const CATEGORY_LABELS: Record<string, string> = {
    crm_data: 'CRM & Data',
    financial_collection: 'Financial & Collection',
    operations: 'Operations',
    reporting: 'Reporting',
    coordination: 'Coordination',
    meetings: 'Meetings',
  };

  const categories = ['crm_data', 'financial_collection', 'operations', 'reporting', 'coordination', 'meetings'] as const;
  const breakdown = categories.map(cat => {
    const catTasks = kpiTasks.filter(t => t.category === cat);
    const done = catTasks.filter(t => t.status === 'done').length;
    const total = catTasks.length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    const avgWeight = total > 0 ? Math.round(catTasks.reduce((s, t) => s + (t.kpiWeight ?? 0), 0) / total) : 0;
    return { category: cat, label: CATEGORY_LABELS[cat], total, done, rate, avgWeight };
  }).filter(c => c.total > 0);

  const daily = kpiTasks.filter(t => t.taskType === 'daily');
  const weekly = kpiTasks.filter(t => t.taskType === 'weekly');
  const monthly = kpiTasks.filter(t => t.taskType === 'monthly');

  const dailyRate = daily.length > 0 ? Math.round((daily.filter(t => t.status === 'done').length / daily.length) * 100) : 0;
  const weeklyRate = weekly.length > 0 ? Math.round((weekly.filter(t => t.status === 'done').length / weekly.length) * 100) : 0;
  const monthlyRate = monthly.length > 0 ? Math.round((monthly.filter(t => t.status === 'done').length / monthly.length) * 100) : 0;

  const overallScore = Math.round(dailyRate * 0.40 + weeklyRate * 0.30 + monthlyRate * 0.20);

  const weakestCategory = breakdown.length > 0
    ? breakdown.reduce((min, c) => c.rate < min.rate ? c : min, breakdown[0])
    : null;

  return {
    breakdown,
    dailyRate,
    weeklyRate,
    monthlyRate,
    overallScore,
    weakestCategory: weakestCategory ? { category: weakestCategory.category, label: weakestCategory.label, rate: weakestCategory.rate } : null,
    totalKpiTasks: kpiTasks.length,
    totalDone: kpiTasks.filter(t => t.status === 'done').length,
  };
}

/** تحديث getEngineersKPI لفلترة Sales Engineers فقط (استثناء Non-Sales Roles) */
export async function getSalesEngineersOnly(): Promise<any[]> {
  const allEngineers = await getEngineers();
  return allEngineers.filter(e => SALES_ENGINEER_ROLES.includes(e.role as any));
}

// ════════════════════════════════════════════════════════════════════════════
// DEAL AUTOMATION — Auto-create/update Deal from Tasks
// ════════════════════════════════════════════════════════════════════════════

/** الأدوار المسموح لها بامتلاك صفقة (Sales Engineers فقط) */
export const DEAL_OWNER_ROLES = ['engineer', 'sales_engineer'] as const;

/** جلب Sales Engineers فقط (للـ Assign Engineer dropdown) */
export async function getSalesEngineers() {
  const allEngineers = await getEngineers();
  return allEngineers.filter(e => DEAL_OWNER_ROLES.includes(e.role as any));
}

/** تسجيل نشاط في deal_timeline */
export async function addDealTimelineEntry(entry: {
  dealId: number;
  taskId?: number;
  engineerId: number;
  activityType: InsertDealTimeline['activityType'];
  description?: string;
  stageFrom?: string;
  stageTo?: string;
  grossValue?: number;
  netValue?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(dealTimeline).values({
    dealId: entry.dealId,
    taskId: entry.taskId,
    engineerId: entry.engineerId,
    activityType: entry.activityType,
    description: entry.description,
    stageFrom: entry.stageFrom,
    stageTo: entry.stageTo,
    grossValue: entry.grossValue?.toString(),
    netValue: entry.netValue?.toString(),
  });
}

/** جلب timeline الصفقة */
export async function getDealTimeline(dealId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dealTimeline)
    .where(eq(dealTimeline.dealId, dealId))
    .orderBy(dealTimeline.createdAt);
}

/**
 * Auto-create أو Update صفقة من Task
 * - Quotation → stage: proposal
 * - Meeting Presentation → stage: negotiation
 * - Meeting Closing → stage: contract_sent
 */
export async function autoCreateOrUpdateDealFromTask(task: {
  id: number;
  engineerId: number;
  clientName?: string | null;
  taskType: string;
  notes?: string | null;
  grossValue?: number;
  discountValue?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  if (!task.clientName) return null;
  // Map taskType → deal stage
  const stageMap: Record<string, string> = {
    'quotation': 'proposal',
    'meeting_presentation': 'negotiation',
    'meeting_closing': 'contract_sent',
  };
  const newStage = stageMap[task.taskType];
  if (!newStage) return null; // Not a deal-triggering task type
  // Map taskType → timeline activity
  const activityMap: Record<string, InsertDealTimeline['activityType']> = {
    'quotation': 'quotation',
    'meeting_presentation': 'meeting_presentation',
    'meeting_closing': 'meeting_closing',
  };
  const activityType = activityMap[task.taskType];
  const grossValue = task.grossValue ?? 0;
  const discountValue = task.discountValue ?? 0;
  const netValue = grossValue - discountValue;
  // Check if open deal exists for same client + engineer
  const existingDeals = await db.select().from(deals)
    .where(and(
      eq(deals.clientName, task.clientName),
      eq(deals.engineerId, task.engineerId),
      eq(deals.isDeleted, 0),
    ))
    .orderBy(desc(deals.createdAt))
    .limit(1);
  const openDeal = existingDeals.find(d => !['closed_won', 'closed_lost'].includes(d.stage));
  if (!openDeal) {
    // Create new deal
    const insertResult = await db.insert(deals).values({
      engineerId: task.engineerId,
      clientName: task.clientName,
      value: grossValue.toString(),
      grossValue: grossValue.toString(),
      netValue: netValue.toString(),
      stage: newStage as any,
      sourceTaskId: task.id,
      isAutoCreated: 1,
      notes: task.notes ?? undefined,
    });
    const newDealId = (insertResult as any).insertId as number;
    // Log timeline
    await addDealTimelineEntry({
      dealId: newDealId,
      taskId: task.id,
      engineerId: task.engineerId,
      activityType: 'deal_created',
      description: `صفقة جديدة من ${task.taskType === 'quotation' ? 'عرض سعر' : task.taskType === 'meeting_presentation' ? 'ميتينج عرض' : 'ميتينج إغلاق'}`,
      stageTo: newStage,
      grossValue,
      netValue,
    });
    await addDealTimelineEntry({
      dealId: newDealId,
      taskId: task.id,
      engineerId: task.engineerId,
      activityType,
      description: task.notes ?? undefined,
      grossValue,
      netValue,
    });
    return { action: 'created', dealId: newDealId };
  } else {
    // Update existing deal
    const stageOrder = ['proposal', 'negotiation', 'contract_sent', 'closed_won', 'closed_lost'];
    const currentIdx = stageOrder.indexOf(openDeal.stage);
    const newIdx = stageOrder.indexOf(newStage);
    const shouldAdvanceStage = newIdx > currentIdx;
    const updateData: any = {
      nextAction: task.notes ?? undefined,
    };
    if (shouldAdvanceStage) {
      updateData.stage = newStage;
    }
    if (grossValue > 0) {
      updateData.value = grossValue.toString();
      updateData.grossValue = grossValue.toString();
      updateData.netValue = netValue.toString();
    }
    await db.update(deals).set(updateData).where(eq(deals.id, openDeal.id));
    // Log timeline
    await addDealTimelineEntry({
      dealId: openDeal.id,
      taskId: task.id,
      engineerId: task.engineerId,
      activityType,
      description: task.notes ?? undefined,
      stageFrom: shouldAdvanceStage ? openDeal.stage : undefined,
      stageTo: shouldAdvanceStage ? newStage : undefined,
      grossValue: grossValue > 0 ? grossValue : undefined,
      netValue: grossValue > 0 ? netValue : undefined,
    });
    return { action: 'updated', dealId: openDeal.id };
  }
}

/**
 * تغيير مهندس الصفقة مع Audit Log
 */
export async function updateDealEngineer(params: {
  dealId: number;
  newEngineerId: number;
  modifiedBy: string;
  forceIfWon?: boolean;
}) {
  const db = await getDb();
  if (!db) return { success: false, error: 'DB not available' };
  // Get current deal
  const [deal] = await db.select().from(deals).where(eq(deals.id, params.dealId)).limit(1);
  if (!deal) return { success: false, error: 'Deal not found' };
  if (deal.isLocked && !params.forceIfWon) {
    return { success: false, requiresConfirmation: true, dealStage: deal.stage };
  }
  const oldEngineerId = deal.engineerId;
  // Get engineer names for audit
  const allEngineers = await getEngineers();
  const oldEng = allEngineers.find(e => e.id === oldEngineerId);
  const newEng = allEngineers.find(e => e.id === params.newEngineerId);
  if (!newEng) return { success: false, error: 'New engineer not found' };
  // Validate new engineer is Sales Engineer
  if (!DEAL_OWNER_ROLES.includes(newEng.role as any)) {
    return { success: false, error: 'Engineer must be a Sales Engineer' };
  }
  // Update deal ownership
  await db.update(deals).set({ engineerId: params.newEngineerId }).where(eq(deals.id, params.dealId));
  // Log audit in deal_timeline
  await addDealTimelineEntry({
    dealId: params.dealId,
    engineerId: params.newEngineerId,
    activityType: 'stage_changed',
    description: `تغيير المهندس من "${oldEng?.name ?? oldEngineerId}" إلى "${newEng.name}" بواسطة ${params.modifiedBy}`,
  });
  // Log in audit_logs
  await db.insert(auditLogs).values({
    action: 'deal_engineer_changed',
    entityType: 'deal',
    entityId: params.dealId,
    oldValue: JSON.stringify({ engineerId: oldEngineerId, engineerName: oldEng?.name }),
    newValue: JSON.stringify({ engineerId: params.newEngineerId, engineerName: newEng.name }),
    performedBy: params.modifiedBy,
  } as any);
  return { success: true, oldEngineerId, newEngineerId: params.newEngineerId };
}

// ─── Advanced Discount System (v2) ───────────────────────────────────────────
/**
 * نظام الخصومات المتقدم:
 * 1. شريحة الخصم = Actual Sales + Pipeline
 * 2. Realized Discount = Actual × %
 * 3. Potential Discount = Pipeline × %
 * 4. توزيع Potential على المهندسين بالوزن (مبيعات 60d + pipeline + closing rate + ranking)
 * 5. تقسيم نصيب المهندس على صفقاته بالوزن (حسب قيمة كل صفقة)
 * 6. Bonus = 50% مهندس + 15% Admin Sales + 35% شركة
 */

/**
 * حساب ملخص الخصومات المتقدم
 */
export async function getAdvancedDiscountSummary() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const allDeals = await db.select().from(deals).where(eq(deals.isDeleted, 0));
  const allEngineers = await getEngineers();
  const salesEngineers = allEngineers.filter(e =>
    SALES_ENGINEER_ROLES.includes(e.role as any)
  );

  // ── 1. حساب Actual Sales + Pipeline ──────────────────────────────────────
  const wonDeals = allDeals.filter(d => d.stage === 'closed_won');
  const pipelineDeals = allDeals.filter(d =>
    !['closed_won', 'closed_lost'].includes(d.stage)
  );

  const actualSales = wonDeals.reduce((s, d) => {
    const v = parseFloat((d.netValue ?? d.value) as string || '0');
    return s + (isNaN(v) ? 0 : v);
  }, 0);

  const pipelineValue = pipelineDeals.reduce((s, d) => {
    const v = parseFloat(d.value as string || '0');
    return s + (isNaN(v) ? 0 : v);
  }, 0);

  const totalVolume = actualSales + pipelineValue;
  const { tierLabel, discountPct } = getDiscountTierInfo(totalVolume);

  // ── 2. Realized vs Potential Discount ────────────────────────────────────
  const realizedDiscount = actualSales * (discountPct / 100);
  const potentialDiscount = pipelineValue * (discountPct / 100);
  const allowedDiscount = totalVolume * (discountPct / 100);

  // الخصم المستخدم فعلياً على الصفقات المغلقة
  const usedDiscount = wonDeals.reduce((s, d) => {
    const v = parseFloat(d.discountValue as string || '0');
    return s + (isNaN(v) ? 0 : v);
  }, 0);

  // ── 3. حساب وزن كل مهندس ─────────────────────────────────────────────────
  // مبيعات آخر 60 يوم
  const recentWonDeals = wonDeals.filter(d => {
    const updatedAt = d.updatedAt ? new Date(d.updatedAt) : null;
    return updatedAt && updatedAt >= sixtyDaysAgo;
  });

  const engWeights = salesEngineers.map(eng => {
    const engRecentSales = recentWonDeals
      .filter(d => d.engineerId === eng.id)
      .reduce((s, d) => {
        const v = parseFloat((d.netValue ?? d.value) as string || '0');
        return s + (isNaN(v) ? 0 : v);
      }, 0);

    const engPipeline = pipelineDeals
      .filter(d => d.engineerId === eng.id)
      .reduce((s, d) => {
        const v = parseFloat(d.value as string || '0');
        return s + (isNaN(v) ? 0 : v);
      }, 0);

    const engAllDeals = allDeals.filter(d => d.engineerId === eng.id);
    const engWon = engAllDeals.filter(d => d.stage === 'closed_won').length;
    const engClosed = engAllDeals.filter(d =>
      ['closed_won', 'closed_lost'].includes(d.stage)
    ).length;
    const closingRate = engClosed > 0 ? engWon / engClosed : 0;

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      role: eng.role,
      recentSales: engRecentSales,
      pipeline: engPipeline,
      closingRate,
      // وزن مركب: 40% مبيعات + 40% pipeline + 20% closing rate
      rawWeight: engRecentSales * 0.4 + engPipeline * 0.4 + closingRate * 100000 * 0.2,
    };
  });

  const totalRawWeight = engWeights.reduce((s, e) => s + e.rawWeight, 0);

  // ── 4. توزيع Potential Discount على المهندسين ────────────────────────────
  const engineerAllocations = engWeights.map(eng => {
    const shareRatio = totalRawWeight > 0 ? eng.rawWeight / totalRawWeight : 0;
    const allocatedDiscount = potentialDiscount * shareRatio;

    // صفقات المهندس في التفاوض
    const engPipelineDeals = pipelineDeals.filter(d => d.engineerId === eng.engineerId);
    const engPipelineTotal = eng.pipeline;

    // ── 5. توزيع نصيب المهندس على صفقاته بالوزن ─────────────────────────
    const dealAllocations = engPipelineDeals.map(deal => {
      const dealValue = parseFloat(deal.value as string || '0');
      const dealWeight = engPipelineTotal > 0 ? dealValue / engPipelineTotal : 0;
      const dealAllocated = allocatedDiscount * dealWeight;
      const dealUsed = parseFloat(deal.discountValue as string || '0');
      const dealUnused = Math.max(0, dealAllocated - dealUsed);

      return {
        dealId: deal.id,
        clientName: deal.clientName,
        dealValue,
        stage: deal.stage,
        allocatedDiscount: Math.round(dealAllocated),
        usedDiscount: Math.round(dealUsed),
        unusedDiscount: Math.round(dealUnused),
        isLocked: deal.isLocked ?? false,
      };
    });

    // صفقات مغلقة (won) لحساب الـ Bonus
    const engWonDeals = wonDeals.filter(d => d.engineerId === eng.engineerId);
    const totalSavingBonus = engWonDeals.reduce((s, d) => {
      const allocated = parseFloat((d as any).allocatedDiscount as string || '0');
      const used = parseFloat(d.discountValue as string || '0');
      const unused = Math.max(0, allocated - used);
      return s + unused;
    }, 0);

    const engineerBonus = Math.round(totalSavingBonus * 0.50);
    const adminSalesBonus = Math.round(totalSavingBonus * 0.15);
    const companySaving = Math.round(totalSavingBonus * 0.35);

    const engUsedDiscount = engWonDeals.reduce((s, d) => {
      const v = parseFloat(d.discountValue as string || '0');
      return s + (isNaN(v) ? 0 : v);
    }, 0);

    return {
      engineerId: eng.engineerId,
      engineerName: eng.engineerName,
      role: eng.role,
      recentSales: Math.round(eng.recentSales),
      pipeline: Math.round(eng.pipeline),
      closingRate: Math.round(eng.closingRate * 100),
      shareRatio: Math.round(shareRatio * 100),
      allocatedDiscount: Math.round(allocatedDiscount),
      usedDiscount: Math.round(engUsedDiscount),
      unusedDiscount: Math.round(Math.max(0, allocatedDiscount - engUsedDiscount)),
      engineerBonus,
      adminSalesBonus,
      companySaving,
      dealAllocations,
    };
  });

  // ── 6. Admin Sales Dashboard ──────────────────────────────────────────────
  const adminSalesEngineers = allEngineers.filter(e => e.role === 'admin_sales');
  const totalAdminBonus = engineerAllocations.reduce((s, e) => s + e.adminSalesBonus, 0);

  // صفقات أُغلقت بدون استخدام كامل الخصم
  const dealsWithSaving = wonDeals.filter(d => {
    const used = parseFloat(d.discountValue as string || '0');
    const allocated = parseFloat((d as any).allocatedDiscount as string || '0');
    return allocated > 0 && used < allocated;
  });

  const adminSalesDashboard = {
    totalAdminBonus,
    dealsWithSavingCount: dealsWithSaving.length,
    dealsWithSavingValue: dealsWithSaving.reduce((s, d) => {
      const v = parseFloat((d.netValue ?? d.value) as string || '0');
      return s + (isNaN(v) ? 0 : v);
    }, 0),
    savingRate: allowedDiscount > 0
      ? Math.round(((allowedDiscount - usedDiscount) / allowedDiscount) * 100)
      : 0,
    adminSalesNames: adminSalesEngineers.map(e => e.name),
  };

  return {
    // ملخص عام
    actualSales: Math.round(actualSales),
    pipelineValue: Math.round(pipelineValue),
    totalVolume: Math.round(totalVolume),
    tierLabel,
    discountPct,
    allowedDiscount: Math.round(allowedDiscount),
    realizedDiscount: Math.round(realizedDiscount),
    potentialDiscount: Math.round(potentialDiscount),
    usedDiscount: Math.round(usedDiscount),
    remainingDiscount: Math.round(Math.max(0, allowedDiscount - usedDiscount)),
    // توزيع على المهندسين
    engineerAllocations,
    // Admin Sales Dashboard
    adminSalesDashboard,
  };
}

/**
 * التحقق من صحة خصم صفقة بناءً على النظام الجديد
 */
export async function validateAdvancedDealDiscount(
  dealId: number,
  newDiscountValue: number
): Promise<{ valid: boolean; maxAllowed: number; message?: string }> {
  const db = await getDb();
  if (!db) return { valid: false, maxAllowed: 0, message: 'خطأ في الاتصال بقاعدة البيانات' };

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) return { valid: false, maxAllowed: 0, message: 'الصفقة غير موجودة' };

  // لا يمكن تعديل الخصم بعد الإغلاق
  if (deal.isLocked) {
    return { valid: false, maxAllowed: 0, message: 'لا يمكن تعديل الخصم بعد إغلاق الصفقة' };
  }

  // حساب الخصم المخصص لهذه الصفقة من النظام الجديد
  const summary = await getAdvancedDiscountSummary();
  if (!summary) return { valid: false, maxAllowed: 0, message: 'خطأ في حساب الخصومات' };

  const engAllocation = summary.engineerAllocations.find(e => e.engineerId === deal.engineerId);
  if (!engAllocation) return { valid: false, maxAllowed: 0, message: 'المهندس غير موجود في نظام الخصومات' };

  const dealAllocation = engAllocation.dealAllocations.find(d => d.dealId === dealId);
  const maxAllowed = dealAllocation ? dealAllocation.allocatedDiscount : 0;

  if (newDiscountValue > maxAllowed) {
    return {
      valid: false,
      maxAllowed,
      message: `الخصم المطلوب (${newDiscountValue.toLocaleString('ar-EG')} ج.م) يتجاوز الحد المخصص لهذه الصفقة (${maxAllowed.toLocaleString('ar-EG')} ج.م)`,
    };
  }

  return { valid: true, maxAllowed };
}

/**
 * حساب Bonus الخصم غير المستخدم عند إغلاق صفقة
 */
export async function calcDealSavingBonus(dealId: number): Promise<{
  unusedDiscount: number;
  engineerBonus: number;
  adminSalesBonus: number;
  companySaving: number;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal || deal.stage !== 'closed_won') return null;

  const summary = await getAdvancedDiscountSummary();
  if (!summary) return null;

  const engAllocation = summary.engineerAllocations.find(e => e.engineerId === deal.engineerId);
  if (!engAllocation) return null;

  const dealAllocation = engAllocation.dealAllocations.find(d => d.dealId === dealId);
  if (!dealAllocation) return null;

  const unusedDiscount = dealAllocation.unusedDiscount;
  return {
    unusedDiscount,
    engineerBonus: Math.round(unusedDiscount * 0.50),
    adminSalesBonus: Math.round(unusedDiscount * 0.15),
    companySaving: Math.round(unusedDiscount * 0.35),
  };
}

// ─── Score-Based Discount Distribution System ─────────────────────────────────
/**
 * نظام توزيع الخصومات المتقدم المبني على الأداء:
 * Score = Performance(40%) + Pipeline(30%) + ClosingSkill(30%)
 * مع Ranking Multiplier + Boost لأعلى 2 مهندسين
 * Minimum Threshold: Performance < 20% → لا خصم
 */
export async function calcScoreBasedDiscountDistribution(
  year: number,
  month: number
): Promise<{
  totalDiscountPool: number;
  discountPct: number;
  tierLabel: string;
  engineers: Array<{
    engineerId: number;
    engineerName: string;
    department: string;
    performanceScore: number;
    pipelineScore: number;
    closingSkillScore: number;
    rawScore: number;
    rankingMultiplier: number;
    finalScore: number;
    boostApplied: boolean;
    meetsThreshold: boolean;
    discountShare: number;
    sharePercent: number;
    dealsCount: number;
    avgDiscountPerDeal: number;
    rank: number;
  }>;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const allEngineers = await getEngineers();
  // فلترة Sales فقط (department أو role)
  const salesEngineers = allEngineers.filter(isSalesDepartment);
  if (salesEngineers.length === 0) return null;

  const allDeals = await db.select().from(deals).where(eq(deals.isDeleted, 0));
  const wonDeals = allDeals.filter(d => d.stage === 'closed_won');
  const pipelineDeals = allDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage));

  // ── حساب إجمالي الحجم لتحديد شريحة الخصم ────────────────────────────────
  const actualSales = wonDeals.reduce((s, d) => {
    const v = parseFloat((d.netValue ?? d.value) as string || '0');
    return s + (isNaN(v) ? 0 : v);
  }, 0);
  const pipelineValue = pipelineDeals.reduce((s, d) => {
    const v = parseFloat(d.value as string || '0');
    return s + (isNaN(v) ? 0 : v);
  }, 0);
  const totalVolume = actualSales + pipelineValue;
  const { tierLabel, discountPct } = getDiscountTierInfo(totalVolume);
  const totalDiscountPool = pipelineValue * (discountPct / 100);

  // ── حساب أقصى مبيعات ومحفظة لـ Normalization ─────────────────────────────
  const engStats = salesEngineers.map(eng => {
    // Performance: مبيعات آخر 60 يوم
    const recentSales = wonDeals
      .filter(d => {
        const updatedAt = d.updatedAt ? new Date(d.updatedAt) : null;
        return d.engineerId === eng.id && updatedAt && updatedAt >= sixtyDaysAgo;
      })
      .reduce((s, d) => {
        const v = parseFloat((d.netValue ?? d.value) as string || '0');
        return s + (isNaN(v) ? 0 : v);
      }, 0);

    // Pipeline Score
    const engPipeline = pipelineDeals
      .filter(d => d.engineerId === eng.id)
      .reduce((s, d) => {
        const v = parseFloat(d.value as string || '0');
        return s + (isNaN(v) ? 0 : v);
      }, 0);

    // Closing Skill: closing rate × 100 + عدد صفقات مغلقة × 5
    const engAllDeals = allDeals.filter(d => d.engineerId === eng.id);
    const engWon = engAllDeals.filter(d => d.stage === 'closed_won').length;
    const engClosed = engAllDeals.filter(d => ['closed_won', 'closed_lost'].includes(d.stage)).length;
    const closingRate = engClosed > 0 ? engWon / engClosed : 0;
    const closingSkillRaw = closingRate * 80 + Math.min(engWon * 5, 20);

    return {
      eng,
      recentSales,
      engPipeline,
      closingSkillRaw,
      closingRate,
      engWon,
      dealsCount: engAllDeals.filter(d => !['closed_lost'].includes(d.stage)).length,
    };
  });

  // Normalize
  const maxSales = Math.max(...engStats.map(e => e.recentSales), 1);
  const maxPipeline = Math.max(...engStats.map(e => e.engPipeline), 1);
  const maxClosing = Math.max(...engStats.map(e => e.closingSkillRaw), 1);

  // ── حساب الـ Score لكل مهندس ─────────────────────────────────────────────
  const PERFORMANCE_THRESHOLD = 20; // أقل من 20% = لا خصم
  const scored = engStats.map(e => {
    const performanceScore = (e.recentSales / maxSales) * 100;
    const pipelineScore = (e.engPipeline / maxPipeline) * 100;
    const closingSkillScore = (e.closingSkillRaw / maxClosing) * 100;
    const rawScore = performanceScore * 0.4 + pipelineScore * 0.3 + closingSkillScore * 0.3;
    const meetsThreshold = performanceScore >= PERFORMANCE_THRESHOLD;
    return {
      eng: e.eng,
      performanceScore: Math.round(performanceScore),
      pipelineScore: Math.round(pipelineScore),
      closingSkillScore: Math.round(closingSkillScore),
      rawScore,
      meetsThreshold,
      dealsCount: e.dealsCount,
      engPipeline: e.engPipeline,
    };
  });

  // ── ترتيب لتحديد Ranking Multiplier ──────────────────────────────────────
  const sorted = [...scored].sort((a, b) => b.rawScore - a.rawScore);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.33));
  const midCount = Math.max(1, Math.ceil(sorted.length * 0.33));

  const withMultiplier = scored.map(e => {
    const rank = sorted.findIndex(s => s.eng.id === e.eng.id) + 1;
    let rankingMultiplier = 1.0;
    if (rank <= topCount) rankingMultiplier = 1.1;
    else if (rank > topCount + midCount) rankingMultiplier = 0.8;
    const finalScore = e.meetsThreshold ? e.rawScore * rankingMultiplier : 0;
    return { ...e, rank, rankingMultiplier, finalScore };
  });

  // ── Boost +10% لأعلى 2 مهندسين ───────────────────────────────────────────
  const sortedFinal = [...withMultiplier].sort((a, b) => b.finalScore - a.finalScore);
  const top2Ids = sortedFinal.slice(0, 2).map(e => e.eng.id);

  const withBoost = withMultiplier.map(e => ({
    ...e,
    boostApplied: top2Ids.includes(e.eng.id),
    finalScore: top2Ids.includes(e.eng.id) ? e.finalScore * 1.1 : e.finalScore,
  }));

  // ── توزيع الـ Discount Pool ───────────────────────────────────────────────
  const totalFinalScore = withBoost.reduce((s, e) => s + e.finalScore, 0);

  const result = withBoost.map(e => {
    const shareRatio = totalFinalScore > 0 ? e.finalScore / totalFinalScore : 0;
    const discountShare = Math.round(totalDiscountPool * shareRatio);
    const avgDiscountPerDeal = e.dealsCount > 0 ? Math.round(discountShare / e.dealsCount) : 0;
    return {
      engineerId: e.eng.id,
      engineerName: e.eng.name,
      department: (e.eng as any).department ?? e.eng.role ?? 'sales_engineer',
      performanceScore: e.performanceScore,
      pipelineScore: e.pipelineScore,
      closingSkillScore: e.closingSkillScore,
      rawScore: Math.round(e.rawScore),
      rankingMultiplier: e.rankingMultiplier,
      finalScore: Math.round(e.finalScore),
      boostApplied: e.boostApplied,
      meetsThreshold: e.meetsThreshold,
      discountShare,
      sharePercent: Math.round(shareRatio * 100),
      dealsCount: e.dealsCount,
      avgDiscountPerDeal,
      rank: e.rank,
    };
  }).sort((a, b) => a.rank - b.rank);

  return {
    totalDiscountPool: Math.round(totalDiscountPool),
    discountPct,
    tierLabel,
    engineers: result,
  };
}

// ─── Company Closing KPI + Team Reward System ─────────────────────────────────
const COMPANY_CLOSING_TARGET = 60; // 60% target

export async function getCompanyClosingKPI(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const prevSixtyStart = new Date(sixtyDaysAgo.getTime() - 60 * 24 * 60 * 60 * 1000);

  const allDeals = await db.select().from(deals).where(eq(deals.isDeleted, 0));

  // Current period (last 60 days)
  const currentDeals = allDeals.filter(d => {
    const updatedAt = d.updatedAt ? new Date(d.updatedAt) : null;
    return updatedAt && updatedAt >= sixtyDaysAgo;
  });
  const wonCurrent = currentDeals.filter(d => d.stage === 'closed_won').length;
  const lostCurrent = currentDeals.filter(d => d.stage === 'closed_lost').length;
  const openCurrent = currentDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).length;
  const totalCurrent = wonCurrent + lostCurrent + openCurrent;
  const currentRate = totalCurrent > 0 ? Math.round((wonCurrent / totalCurrent) * 100) : 0;

  // Previous period (60-120 days ago)
  const prevDeals = allDeals.filter(d => {
    const updatedAt = d.updatedAt ? new Date(d.updatedAt) : null;
    return updatedAt && updatedAt >= prevSixtyStart && updatedAt < sixtyDaysAgo;
  });
  const wonPrev = prevDeals.filter(d => d.stage === 'closed_won').length;
  const totalPrev = prevDeals.length;
  const prevRate = totalPrev > 0 ? Math.round((wonPrev / totalPrev) * 100) : 0;

  // Monthly stats for trend
  const monthlyStats = [];
  for (let i = 5; i >= 0; i--) {
    const mDate = new Date(year, month - 1 - i, 1);
    const mEnd = new Date(year, month - i, 0, 23, 59, 59);
    const mDeals = allDeals.filter(d => {
      const updatedAt = d.updatedAt ? new Date(d.updatedAt) : null;
      return updatedAt && updatedAt >= mDate && updatedAt <= mEnd;
    });
    const mWon = mDeals.filter(d => d.stage === 'closed_won').length;
    const mTotal = mDeals.length;
    monthlyStats.push({
      month: mDate.toLocaleString('ar-EG', { month: 'short', year: 'numeric' }),
      rate: mTotal > 0 ? Math.round((mWon / mTotal) * 100) : 0,
      won: mWon,
      total: mTotal,
    });
  }

  // Per-engineer closing rates (Sales only)
  const allEngineers = await getEngineers();
  const salesEngList = allEngineers.filter(isSalesDepartment);
  const engineerRates = salesEngList.map(eng => {
    const engDeals = currentDeals.filter(d => d.engineerId === eng.id);
    const engWon = engDeals.filter(d => d.stage === 'closed_won').length;
    const engLost = engDeals.filter(d => d.stage === 'closed_lost').length;
    const engTotal = engDeals.length;
    const rate = engTotal > 0 ? Math.round((engWon / engTotal) * 100) : 0;
    return {
      engineerId: eng.id,
      engineerName: eng.name,
      closingRate: rate,
      won: engWon,
      lost: engLost,
      total: engTotal,
      vsCompany: rate - currentRate,
    };
  }).sort((a, b) => b.closingRate - a.closingRate);

  // Funnel analysis: Meeting → Quotation → Closing
  const meetingTasks = await db.select().from(dailyTasks)
    .where(and(
      gte(dailyTasks.taskDate, sixtyDaysAgo),
      eq(dailyTasks.isDeleted, 0)
    ));
  const meetingCount = meetingTasks.filter(t => ['meeting_modeling', 'meeting_presentation', 'meeting_closing'].includes(t.taskType ?? '')).length;
  const quotationCount = meetingTasks.filter(t => t.taskType === 'quotation').length;
  const closingCount = wonCurrent;

  const targetMet = currentRate >= COMPANY_CLOSING_TARGET;
  const gap = currentRate - COMPANY_CLOSING_TARGET;

  return {
    currentRate,
    prevRate,
    target: COMPANY_CLOSING_TARGET,
    gap,
    targetMet,
    trend: currentRate - prevRate,
    totalDeals: totalCurrent,
    wonDeals: wonCurrent,
    lostDeals: lostCurrent,
    openDeals: openCurrent,
    monthlyTrend: monthlyStats,
    engineerRates,
    funnel: {
      meetings: meetingCount,
      quotations: quotationCount,
      closings: closingCount,
      meetingToQuotation: meetingCount > 0 ? Math.round((quotationCount / meetingCount) * 100) : 0,
      quotationToClosing: quotationCount > 0 ? Math.round((closingCount / quotationCount) * 100) : 0,
    },
  };
}

/**
 * نظام الحافز الجماعي:
 * - يُفعَّل عند Closing Rate ≥ 60%
 * - يشمل: Commission Boost + Team Bonus + Discount Pool Boost + Saving Bonus Boost
 */
export async function getTeamRewardStatus(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;

  const closingKPI = await getCompanyClosingKPI(year, month);
  if (!closingKPI) return null;

  const targetMet = closingKPI.targetMet;
  const rate = closingKPI.currentRate;

  // Commission Structure لكل مهندس
  const allEngineers = await getEngineers();
  const salesEngList = allEngineers.filter(isSalesDepartment);

  const allDeals = await db.select().from(deals).where(eq(deals.isDeleted, 0));
  const wonDeals = allDeals.filter(d => d.stage === 'closed_won');

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const engineerEarnings = await Promise.all(salesEngList.map(async eng => {
    const engWonDeals = wonDeals.filter(d => {
      const updatedAt = d.updatedAt ? new Date(d.updatedAt) : null;
      return d.engineerId === eng.id && updatedAt && updatedAt >= startDate && updatedAt <= endDate;
    });
    const totalRevenue = engWonDeals.reduce((s, d) => {
      const v = parseFloat((d.netValue ?? d.value) as string || '0');
      return s + (isNaN(v) ? 0 : v);
    }, 0);

    // Base Commission (Progressive)
    const baseCommission = calcProgressiveCommission(totalRevenue);

    // Individual Bonus (10% of base commission as performance bonus)
    const individualBonus = Math.round(baseCommission * 0.1);

    // Saving Discount Bonus
    const allBonusSummaries = await getEngineerBonusSummary();
    const discountBonus = allBonusSummaries.find(b => b.engineerId === eng.id);
    const savingDiscountBonus = discountBonus?.totalBonus ?? 0;

    // Team Closing Bonus (only if target met)
    const teamBonus = targetMet ? Math.round(totalRevenue * 0.005) : 0; // 0.5% of revenue as team bonus

    // Commission Boost (only if target met: +5% on base commission)
    const commissionBoost = targetMet ? Math.round(baseCommission * 0.05) : 0;

    const totalEarnings = baseCommission + commissionBoost + individualBonus + savingDiscountBonus + teamBonus;

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      totalRevenue: Math.round(totalRevenue),
      baseCommission: Math.round(baseCommission),
      commissionBoost: Math.round(commissionBoost),
      individualBonus: Math.round(individualBonus),
      savingDiscountBonus: Math.round(savingDiscountBonus),
      teamBonus: Math.round(teamBonus),
      totalEarnings: Math.round(totalEarnings),
    };
  }));

  // Discount Pool Adjustment
  const discountAdjustmentFactor = targetMet
    ? 1 + (rate - COMPANY_CLOSING_TARGET) / 100  // رفع Pool بنسبة الزيادة
    : 1 - (COMPANY_CLOSING_TARGET - rate) / 200; // تقليل Pool بنصف نسبة النقص

  // Saving Bonus Rate Adjustment
  const savingBonusRate = targetMet ? 60 : 50; // 60% للمهندس عند تحقيق الهدف، 50% بدونه

  return {
    targetMet,
    currentRate: rate,
    target: COMPANY_CLOSING_TARGET,
    gap: closingKPI.gap,
    rewards: {
      commissionBoostPct: targetMet ? 5 : 0,
      teamBonusRate: targetMet ? 0.5 : 0, // 0.5% of revenue
      discountPoolAdjustmentFactor: Math.round(discountAdjustmentFactor * 100) / 100,
      savingBonusRate,
      rankingBoost: targetMet ? 10 : 0,
    },
    engineerEarnings,
    totalTeamBonus: engineerEarnings.reduce((s, e) => s + e.teamBonus, 0),
    totalTeamEarnings: engineerEarnings.reduce((s, e) => s + e.totalEarnings, 0),
    alert: !targetMet ? `تحذير: معدل الإغلاق ${rate}% أقل من الهدف ${COMPANY_CLOSING_TARGET}% - لا يوجد حافز جماعي` : null,
  };
}

// ─── Lost Deals Impact System ─────────────────────────────────────────────────
const LOST_RATE_THRESHOLD_HIGH = 30;      // > 30% → -20% KPI
const LOST_RATE_THRESHOLD_VERY_HIGH = 50; // > 50% → -35% KPI
const BIG_DEAL_THRESHOLD = 500_000;       // صفقة كبيرة = أكثر من 500K

export async function getLostDealsImpact(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;

  const allEngineers = await getEngineers();
  const salesEngList = allEngineers.filter(isSalesDepartment);

  const allDeals = await db.select().from(deals).where(eq(deals.isDeleted, 0));
  const wonDeals = allDeals.filter(d => d.stage === 'closed_won');
  const lostDeals = allDeals.filter(d => d.stage === 'closed_lost');
  const allClosedDeals = [...wonDeals, ...lostDeals];

  // Company-level stats
  const companyTotalValue = allClosedDeals.reduce((s, d) => {
    const v = parseFloat((d.netValue ?? d.value) as string || '0');
    return s + (isNaN(v) ? 0 : v);
  }, 0);
  const companyLostValue = lostDeals.reduce((s, d) => {
    const v = parseFloat((d.netValue ?? d.value) as string || '0');
    return s + (isNaN(v) ? 0 : v);
  }, 0);
  const companyLostRate = allClosedDeals.length > 0
    ? Math.round((lostDeals.length / allClosedDeals.length) * 100)
    : 0;
  const companyLostValueImpact = companyTotalValue > 0
    ? Math.round((companyLostValue / companyTotalValue) * 100)
    : 0;

  // Lost Reason Analysis
  const lostReasonCounts: Record<string, number> = {};
  for (const d of lostDeals) {
    const reason = (d as any).lostReason ?? 'unknown';
    lostReasonCounts[reason] = (lostReasonCounts[reason] ?? 0) + 1;
  }
  const topLostReasons = Object.entries(lostReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({
      reason,
      label: LOST_REASON_LABELS[reason as keyof typeof LOST_REASON_LABELS] ?? reason,
      count,
      pct: lostDeals.length > 0 ? Math.round((count / lostDeals.length) * 100) : 0,
    }));

  // Per-engineer analysis
  const engineerImpacts = salesEngList.map(eng => {
    const engWon = wonDeals.filter(d => d.engineerId === eng.id);
    const engLost = lostDeals.filter(d => d.engineerId === eng.id);
    const engClosed = [...engWon, ...engLost];

    const lostCount = engLost.length;
    const lostValue = engLost.reduce((s, d) => {
      const v = parseFloat((d.netValue ?? d.value) as string || '0');
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    const totalValue = engClosed.reduce((s, d) => {
      const v = parseFloat((d.netValue ?? d.value) as string || '0');
      return s + (isNaN(v) ? 0 : v);
    }, 0);

    const lostRate = engClosed.length > 0
      ? Math.round((lostCount / engClosed.length) * 100)
      : 0;
    const lostValueImpact = totalValue > 0
      ? Math.round((lostValue / totalValue) * 100)
      : 0;

    // KPI Penalty
    let kpiPenalty = 0;
    if (lostRate > LOST_RATE_THRESHOLD_VERY_HIGH) kpiPenalty = 35;
    else if (lostRate > LOST_RATE_THRESHOLD_HIGH) kpiPenalty = 20;
    else if (lostRate > 20) kpiPenalty = 10;

    // Discount Allocation Factor
    let discountFactor = 1.0;
    if (lostRate > LOST_RATE_THRESHOLD_VERY_HIGH) discountFactor = 0.5;
    else if (lostRate > LOST_RATE_THRESHOLD_HIGH) discountFactor = 0.7;
    else if (lostRate > 20) discountFactor = 0.85;

    // Big Deal Alert (2+ صفقات كبيرة خاسرة)
    const bigLostDeals = engLost.filter(d => {
      const v = parseFloat((d.netValue ?? d.value) as string || '0');
      return v >= BIG_DEAL_THRESHOLD;
    });
    const highLossAlert = bigLostDeals.length >= 2;

    // Lost Reasons for this engineer
    const engLostReasons: Record<string, number> = {};
    for (const d of engLost) {
      const reason = (d as any).lostReason ?? 'unknown';
      engLostReasons[reason] = (engLostReasons[reason] ?? 0) + 1;
    }

    // Commission Boost Reduction
    const commissionBoostReduction = lostRate > LOST_RATE_THRESHOLD_HIGH ? 50 : lostRate > 20 ? 25 : 0;

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      lostCount,
      lostValue: Math.round(lostValue),
      lostRate,
      lostValueImpact,
      wonCount: engWon.length,
      totalClosed: engClosed.length,
      kpiPenalty,
      discountFactor,
      commissionBoostReduction,
      highLossAlert,
      bigLostDealsCount: bigLostDeals.length,
      lostReasons: Object.entries(engLostReasons).map(([reason, count]) => ({
        reason,
        label: LOST_REASON_LABELS[reason as keyof typeof LOST_REASON_LABELS] ?? reason,
        count,
      })).sort((a, b) => b.count - a.count),
      riskLevel: lostRate > LOST_RATE_THRESHOLD_VERY_HIGH ? 'critical' :
                 lostRate > LOST_RATE_THRESHOLD_HIGH ? 'high' :
                 lostRate > 20 ? 'medium' : 'low',
    };
  }).sort((a, b) => b.lostRate - a.lostRate);

  // Company-level closing rate impact
  const closingRateImpact = companyLostRate;

  return {
    company: {
      totalDeals: allClosedDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      lostRate: companyLostRate,
      lostValue: Math.round(companyLostValue),
      lostValueImpact: companyLostValueImpact,
      closingRateImpact,
    },
    topLostReasons,
    engineerImpacts,
    alerts: engineerImpacts
      .filter(e => e.highLossAlert)
      .map(e => ({
        engineerId: e.engineerId,
        engineerName: e.engineerName,
        message: `تحذير: ${e.engineerName} خسر ${e.bigLostDealsCount} صفقة كبيرة - High Loss Risk Engineer`,
        riskLevel: e.riskLevel,
      })),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Collections Module - Full Financial Collection System
// ═══════════════════════════════════════════════════════════════════════

/** إنشاء Contract تلقائي عند إغلاق صفقة (WON/CLOSED) */
export async function autoCreateContractFromDeal(dealId: number): Promise<{ collectionId: number; isNew: boolean } | null> {
  const db = await getDb();
  if (!db) return null;

  // التحقق من وجود contract مسبق لنفس الصفقة
  const existing = await db.select({ id: collections.id })
    .from(collections)
    .where(eq(collections.dealId, dealId))
    .limit(1);

  if (existing.length > 0) {
    return { collectionId: existing[0].id, isNew: false };
  }

  // جلب بيانات الصفقة
  const dealRows = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!dealRows.length) return null;
  const deal = dealRows[0];

  // حساب قيمة العقد (Net Value أو Value)
  const contractValue = deal.netValue ?? deal.value ?? "0";
  const engineerId = deal.engineerId ?? undefined;

  const [result] = await db.insert(collections).values({
    dealId,
    engineerId: engineerId ?? null,
    clientName: deal.clientName || "عميل غير محدد",
    contractAmount: contractValue.toString(),
    collectedAmount: "0",
    status: "on_track",
    notes: `تم إنشاؤه تلقائياً من صفقة #${dealId}`,
  });

  return { collectionId: (result as any).insertId, isNew: true };
}

/** إضافة دفعة مع تحديث المبلغ المحصّل + إنشاء Follow-up Task إذا كان nextPaymentDate محدداً */
export async function addPaymentWithFollowUp(data: {
  collectionId: number;
  engineerId?: number;
  clientName: string;
  amount: number;
  paymentDate: string;
  paymentType: "initial" | "installment" | "final" | "visit_fee";
  addedBy: "engineer" | "admin";
  receiptNumber?: string;
  receiptUrl?: string;
  nextPaymentDate?: string;
  notes?: string;
}): Promise<{ paymentId: number; taskCreated: boolean }> {
  const db = await getDb();
  if (!db) return { paymentId: 0, taskCreated: false };

  // إضافة الدفعة
  const [payResult] = await db.insert(payments).values({
    collectionId: data.collectionId,
    engineerId: data.engineerId ?? null,
    clientName: data.clientName,
    amount: data.amount.toString(),
    paymentDate: data.paymentDate as unknown as Date,
    paymentType: data.paymentType,
    addedBy: data.addedBy,
    receiptNumber: data.receiptNumber,
    receiptUrl: data.receiptUrl,
    nextPaymentDate: data.nextPaymentDate as unknown as Date | undefined,
    notes: data.notes,
  });

  const paymentId = (payResult as any).insertId;

  // تحديث collectedAmount في collections
  const collRows = await db.select({ collectedAmount: collections.collectedAmount, contractAmount: collections.contractAmount })
    .from(collections)
    .where(eq(collections.id, data.collectionId))
    .limit(1);

  if (collRows.length > 0) {
    const newCollected = parseFloat(collRows[0].collectedAmount ?? "0") + data.amount;
    const contractAmt = parseFloat(collRows[0].contractAmount ?? "0");
    const newStatus: "on_track" | "due_soon" | "overdue" | "completed" =
      newCollected >= contractAmt ? "completed" : "on_track";

    await db.update(collections)
      .set({
        collectedAmount: newCollected.toString(),
        lastPaymentAt: new Date(),
        status: newStatus,
      })
      .where(eq(collections.id, data.collectionId));
  }

  // إنشاء Follow-up Task إذا كان nextPaymentDate محدداً
  let taskCreated = false;
  if (data.nextPaymentDate && data.engineerId) {
    try {
      await db.insert(dailyTasks).values({
        engineerId: data.engineerId,
        taskType: "follow_up_payment" as any,
        title: `متابعة دفعة: ${data.clientName}`,
        description: `دفعة متوقعة بتاريخ ${data.nextPaymentDate} - مبلغ العقد: ${data.amount}`,
        status: "pending",
        taskDate: data.nextPaymentDate as unknown as Date,
        priority: "high" as any,
        notes: `Collection ID: ${data.collectionId}`,
      } as any);
      taskCreated = true;
    } catch {
      // ignore if taskType not in enum
    }
  }

  return { paymentId, taskCreated };
}

/** حساب Commission على المبلغ المحصّل فقط */
export async function getCollectionBasedCommission(engineerId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return null;

  // جلب إجمالي التحصيل للمهندس في الشهر
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const paymentRows = await db.select({
    totalCollected: sql<string>`SUM(${payments.amount})`,
  })
    .from(payments)
    .where(
      and(
        eq(payments.engineerId, engineerId),
        gte(payments.paymentDate, startDate as unknown as Date),
        lte(payments.paymentDate, endDate as unknown as Date),
      )
    );

  const totalCollected = parseFloat(paymentRows[0]?.totalCollected ?? "0");

  // جلب إجمالي قيمة العقود للمهندس
  const contractRows = await db.select({
    totalContract: sql<string>`SUM(${collections.contractAmount})`,
  })
    .from(collections)
    .where(eq(collections.engineerId, engineerId));

  const totalContract = parseFloat(contractRows[0]?.totalContract ?? "0");

  // حساب Commission على المحصّل فقط (Progressive)
  const commissionRate = totalCollected <= 1_000_000 ? 0.01
    : totalCollected <= 1_250_000 ? 0.0125
    : totalCollected <= 1_500_000 ? 0.015
    : totalCollected <= 2_000_000 ? 0.02
    : 0.025;

  const commissionEarned = totalCollected * commissionRate;
  const remainingToCollect = Math.max(0, totalContract - totalCollected);
  const potentialCommission = remainingToCollect * commissionRate;

  return {
    engineerId,
    totalContract,
    totalCollected,
    collectionRate: totalContract > 0 ? (totalCollected / totalContract) * 100 : 0,
    commissionRate: commissionRate * 100,
    commissionEarned,
    potentialCommission,
    remainingToCollect,
  };
}

/** Dashboard التحصيل - ملخص شامل */
export async function getCollectionDashboard(month: number, year: number) {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // إجمالي التحصيل اليوم
  const todayPayments = await db.select({
    total: sql<string>`SUM(${payments.amount})`,
    count: sql<number>`COUNT(*)`,
  })
    .from(payments)
    .where(eq(payments.paymentDate, todayStr as unknown as Date));

  // إجمالي التحصيل هذا الشهر
  const monthPayments = await db.select({
    total: sql<string>`SUM(${payments.amount})`,
    count: sql<number>`COUNT(*)`,
  })
    .from(payments)
    .where(
      and(
        gte(payments.paymentDate, startDate as unknown as Date),
        lte(payments.paymentDate, endDate as unknown as Date),
      )
    );

  // العقود المتأخرة
  const overdueContracts = await db.select({
    count: sql<number>`COUNT(*)`,
    total: sql<string>`SUM(${collections.contractAmount} - ${collections.collectedAmount})`,
  })
    .from(collections)
    .where(eq(collections.status, "overdue"));

  // الدفعات القادمة (خلال 7 أيام)
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const upcomingPayments = await db.select({
    count: sql<number>`COUNT(*)`,
    total: sql<string>`SUM(${paymentPromises.promiseAmount})`,
  })
    .from(paymentPromises)
    .where(
      and(
        eq(paymentPromises.status, "pending"),
        gte(paymentPromises.promiseDate, today as unknown as Date),
        lte(paymentPromises.promiseDate, nextWeek as unknown as Date),
      )
    );

  return {
    today: {
      collected: parseFloat(todayPayments[0]?.total ?? "0"),
      count: todayPayments[0]?.count ?? 0,
    },
    month: {
      collected: parseFloat(monthPayments[0]?.total ?? "0"),
      count: monthPayments[0]?.count ?? 0,
    },
    overdue: {
      count: overdueContracts[0]?.count ?? 0,
      remaining: parseFloat(overdueContracts[0]?.total ?? "0"),
    },
    upcoming: {
      count: upcomingPayments[0]?.count ?? 0,
      total: parseFloat(upcomingPayments[0]?.total ?? "0"),
    },
  };
}

/** Alerts التحصيل (Due Today + Overdue + Upcoming) */
export async function getCollectionAlerts() {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  // جلب جميع الوعود المعلقة
  const promises = await db.select({
    id: paymentPromises.id,
    collectionId: paymentPromises.collectionId,
    clientName: paymentPromises.clientName,
    amount: paymentPromises.promiseAmount,
    date: paymentPromises.promiseDate,
    status: paymentPromises.status,
    engineerId: paymentPromises.engineerId,
  })
    .from(paymentPromises)
    .where(eq(paymentPromises.status, "pending"))
    .orderBy(paymentPromises.promiseDate);

  const alerts: Array<{
    type: "due_today" | "overdue" | "upcoming";
    id: number;
    collectionId: number;
    clientName: string;
    amount: number;
    date: Date | null;
    engineerId: number | null;
  }> = [];

  for (const p of promises) {
    const promDate = p.date ? new Date(p.date as unknown as string) : null;
    if (!promDate) continue;

    const promDateStr = promDate.toISOString().split("T")[0];
    if (promDateStr === todayStr) {
      alerts.push({ type: "due_today", id: p.id, collectionId: p.collectionId, clientName: p.clientName, amount: parseFloat(p.amount), date: promDate, engineerId: p.engineerId ?? null });
    } else if (promDate < today) {
      alerts.push({ type: "overdue", id: p.id, collectionId: p.collectionId, clientName: p.clientName, amount: parseFloat(p.amount), date: promDate, engineerId: p.engineerId ?? null });
    } else if (promDate <= nextWeek) {
      alerts.push({ type: "upcoming", id: p.id, collectionId: p.collectionId, clientName: p.clientName, amount: parseFloat(p.amount), date: promDate, engineerId: p.engineerId ?? null });
    }
  }

  return alerts;
}

/** جلب قائمة العقود مع بيانات المهندس والكومشن */
export async function getCollectionsWithCommission(engineerId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = engineerId ? [eq(collections.engineerId, engineerId)] : [];

  const rows = await db.select({
    id: collections.id,
    dealId: collections.dealId,
    engineerId: collections.engineerId,
    clientName: collections.clientName,
    contractAmount: collections.contractAmount,
    collectedAmount: collections.collectedAmount,
    status: collections.status,
    dueDate: collections.dueDate,
    lastPaymentAt: collections.lastPaymentAt,
    notes: collections.notes,
    engineerName: engineers.name,
    engineerDepartment: engineers.department,
  })
    .from(collections)
    .leftJoin(engineers, eq(collections.engineerId, engineers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(collections.createdAt));

  return rows.map(r => {
    const collected = parseFloat(r.collectedAmount ?? "0");
    const contract = parseFloat(r.contractAmount ?? "0");
    const rate = collected <= 1_000_000 ? 0.01
      : collected <= 1_250_000 ? 0.0125
      : collected <= 1_500_000 ? 0.015
      : collected <= 2_000_000 ? 0.02
      : 0.025;

    return {
      ...r,
      contractAmount: contract,
      collectedAmount: collected,
      collectionRate: contract > 0 ? (collected / contract) * 100 : 0,
      commissionEarned: collected * rate,
      commissionRate: rate * 100,
      remainingAmount: Math.max(0, contract - collected),
    };
  });
}

// ── Advanced Discount Distribution (Score-Based) ──────────────────────────
export async function getAdvancedDiscountDistribution(month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  const { engineers, deals, dailyTasks } = await import("../drizzle/schema");
  const { eq, and, gte, lte, sum, count, inArray } = await import("drizzle-orm");

  const SALES_DEPTS = ["sales_engineer", "sales_specialist"];
  const PERFORMANCE_THRESHOLD = 20; // minimum performance % to qualify for discount
  const BOOST_TOP_N = 2; // top N engineers get +10% boost

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  // 60-day window for performance
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Get sales engineers
  const salesEngineers = await db.select().from(engineers)
    .where(inArray(engineers.department as any, SALES_DEPTS));
  if (!salesEngineers.length) return [];

  const engineerIds = salesEngineers.map((e: any) => e.id);

  // Performance Score: actual sales last 60 days
  const wonDeals = await db.select({
    engineerId: deals.engineerId,
    totalValue: sum(deals.netValue),
    dealCount: count(deals.id),
  }).from(deals)
    .where(and(
      inArray(deals.engineerId as any, engineerIds),
      eq(deals.stage as any, "closed_won"),
      gte(deals.updatedAt as any, sixtyDaysAgo),
    ))
    .groupBy(deals.engineerId);

  // Pipeline Score: open deals in negotiation
  const pipelineDeals = await db.select({
    engineerId: deals.engineerId,
    pipelineValue: sum(deals.netValue),
  }).from(deals)
    .where(and(
      inArray(deals.engineerId as any, engineerIds),
      inArray(deals.stage as any, ["negotiation", "proposal", "contract_sent"]),
    ))
    .groupBy(deals.engineerId);

  // Closing Skill Score: closing rate (won / total)
  const allDeals = await db.select({
    engineerId: deals.engineerId,
    totalDeals: count(deals.id),
  }).from(deals)
    .where(and(
      inArray(deals.engineerId as any, engineerIds),
      gte(deals.updatedAt as any, sixtyDaysAgo),
    ))
    .groupBy(deals.engineerId);

  // Build maps
  const wonMap = new Map(wonDeals.map((d: any) => [d.engineerId, { value: parseFloat(d.totalValue ?? "0"), count: d.dealCount }]));
  const pipelineMap = new Map(pipelineDeals.map((d: any) => [d.engineerId, parseFloat(d.pipelineValue ?? "0")]));
  const totalMap = new Map(allDeals.map((d: any) => [d.engineerId, d.totalDeals]));

  // Normalize scores
  const maxSales = Math.max(...salesEngineers.map((e: any) => wonMap.get(e.id)?.value ?? 0), 1);
  const maxPipeline = Math.max(...salesEngineers.map((e: any) => pipelineMap.get(e.id) ?? 0), 1);

  const engineerScores = salesEngineers.map((e: any) => {
    const salesValue = wonMap.get(e.id)?.value ?? 0;
    const pipelineValue = pipelineMap.get(e.id) ?? 0;
    const totalDeals = totalMap.get(e.id) ?? 0;
    const wonCount = wonMap.get(e.id)?.count ?? 0;
    const closingRate = totalDeals > 0 ? (wonCount / totalDeals) * 100 : 0;

    const performanceScore = (salesValue / maxSales) * 100;
    const pipelineScore = (pipelineValue / maxPipeline) * 100;
    const closingSkillScore = Math.min(closingRate * 1.5, 100); // scale closing rate

    const totalScore = (performanceScore * 0.4) + (pipelineScore * 0.3) + (closingSkillScore * 0.3);

    return {
      engineerId: e.id,
      engineerName: e.name,
      department: e.department,
      performanceScore: Math.round(performanceScore),
      pipelineScore: Math.round(pipelineScore),
      closingSkillScore: Math.round(closingSkillScore),
      totalScore: Math.round(totalScore),
      salesValue,
      pipelineValue,
      closingRate: Math.round(closingRate),
      wonDeals: wonCount,
      totalDeals,
      qualifies: performanceScore >= PERFORMANCE_THRESHOLD,
    };
  });

  // Sort by score
  engineerScores.sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks
  engineerScores.forEach((e, i) => { (e as any).rank = i + 1; });

  // Get total discount pool from discount tiers
  const { discountTiers } = await import("../drizzle/schema");
  const tiers = await db.select().from(discountTiers).orderBy(discountTiers.minSales);
  const totalSales = wonDeals.reduce((s: number, d: any) => s + parseFloat(d.totalValue ?? "0"), 0);
  const totalPipeline = pipelineDeals.reduce((s: number, d: any) => s + parseFloat(d.pipelineValue ?? "0"), 0);
  const effectiveVolume = totalSales + totalPipeline;
  const activeTier = tiers.filter((t: any) => effectiveVolume >= parseFloat(t.minSales ?? "0")).pop();
  const discountRate = activeTier ? (activeTier.maxDiscountPct ?? 5) / 100 : 0.05;
  const totalDiscountPool = effectiveVolume * discountRate;

  // Distribute discount only to qualifying engineers
  const qualifying = engineerScores.filter(e => e.qualifies);
  const totalQualifyingScore = qualifying.reduce((s, e) => s + e.totalScore, 0) || 1;

  return engineerScores.map((e, i) => {
    if (!e.qualifies) {
      return { ...e, discountShare: 0, discountBoost: 0, finalDiscountShare: 0, discountPool: totalDiscountPool, avgDiscountPerDeal: 0 };
    }
    const baseShare = (e.totalScore / totalQualifyingScore) * totalDiscountPool;
    const isTopN = i < BOOST_TOP_N;
    const boost = isTopN ? baseShare * 0.1 : 0;
    const finalShare = baseShare + boost;
    const avgPerDeal = e.wonDeals > 0 ? finalShare / e.wonDeals : 0;

    return {
      ...e,
      discountShare: Math.round(baseShare),
      discountBoost: Math.round(boost),
      finalDiscountShare: Math.round(finalShare),
      discountPool: Math.round(totalDiscountPool),
      avgDiscountPerDeal: Math.round(avgPerDeal),
      discountRate: Math.round(discountRate * 100),
    };
  });
}

// ─── Deal-Level Discount Distribution System ──────────────────────────────────
// نظام توزيع الخصم على مستوى الصفقات (Core Logic)

/**
 * توزيع الخصم المتاح للمهندس على صفقاته بشكل نسبي حسب قيمة كل صفقة
 * مثال: مهندس معاه 60,000 خصم + صفقة 300,000 وصفقة 100,000
 * → الصفقة الكبيرة تأخذ 75% = 45,000 والصغيرة 25% = 15,000
 */
export async function distributeDiscountToDeals(engineerId: number): Promise<{
  dealId: number; clientName: string; dealValue: number; dealType: 'pipeline' | 'closed';
  allocatedDiscountMax: number; allocationPct: number; usedDiscount: number;
  remainingDiscount: number; discountPct: number; grossValue: number; netValue: number;
  lostDueToPricing: boolean;
}[]> {
  const db = await getDb();
  if (!db) return [];

  // جلب الخصم المتاح للمهندس
  const summary = await getDiscountSummaryForEngineer(engineerId);
  if (!summary) return [];

  const totalAllowedDiscount = summary.allowedDiscount;

  // جلب كل الصفقات النشطة (pipeline + closed_won فقط، ليس closed_lost)
  const activeDeals = await db.select().from(deals)
    .where(and(
      eq(deals.engineerId, engineerId),
      eq(deals.isDeleted, 0),
      or(
        ne(deals.stage, 'closed_lost'),
      )
    ))
    .orderBy(desc(deals.value));

  if (activeDeals.length === 0) return [];

  // حساب إجمالي قيم الصفقات
  const totalDealValue = activeDeals.reduce((s, d) => s + parseFloat(d.value as string || '0'), 0);
  if (totalDealValue === 0) return [];

  // جلب التخصيصات الحالية من قاعدة البيانات
  const existingAllocations = await db.select().from(dealDiscountAllocations)
    .where(eq(dealDiscountAllocations.engineerId, engineerId));
  const allocationMap = new Map(existingAllocations.map(a => [a.dealId, a]));

  const result = [];
  for (const deal of activeDeals) {
    const dealValue = parseFloat(deal.value as string || '0');
    const allocationPct = totalDealValue > 0 ? (dealValue / totalDealValue) * 100 : 0;
    const allocatedMax = totalAllowedDiscount * (allocationPct / 100);
    const usedDiscount = parseFloat(deal.discountValue as string || '0');
    const dealType: 'pipeline' | 'closed' = deal.stage === 'closed_won' ? 'closed' : 'pipeline';
    const lostDueToPricing = deal.lostReason === 'price_high';

    // تحديث أو إنشاء التخصيص في قاعدة البيانات
    const existing = allocationMap.get(deal.id);
    if (existing) {
      await db.update(dealDiscountAllocations)
        .set({
          dealValue: dealValue.toString(),
          allocatedDiscountMax: allocatedMax.toString(),
          allocationPct: allocationPct.toFixed(2),
          usedDiscount: usedDiscount.toString(),
          dealType,
          lostDueToPricing: lostDueToPricing ? 1 : 0,
        })
        .where(eq(dealDiscountAllocations.id, existing.id));
    } else {
      await db.insert(dealDiscountAllocations).values({
        dealId: deal.id,
        engineerId,
        dealValue: dealValue.toString(),
        allocatedDiscountMax: allocatedMax.toString(),
        allocationPct: allocationPct.toFixed(2),
        usedDiscount: usedDiscount.toString(),
        dealType,
        lostDueToPricing: lostDueToPricing ? 1 : 0,
      });
    }

    result.push({
      dealId: deal.id,
      clientName: deal.clientName,
      dealValue,
      dealType,
      allocatedDiscountMax: Math.round(allocatedMax),
      allocationPct: Math.round(allocationPct * 10) / 10,
      usedDiscount,
      remainingDiscount: Math.max(0, Math.round(allocatedMax - usedDiscount)),
      discountPct: dealValue > 0 ? Math.round((usedDiscount / dealValue) * 1000) / 10 : 0,
      grossValue: parseFloat(deal.grossValue as string || dealValue.toString()),
      netValue: parseFloat(deal.netValue as string || (dealValue - usedDiscount).toString()),
      lostDueToPricing,
    });
  }

  return result;
}

/**
 * جلب ملخص الخصم للمهندس (مشابه لـ getDiscountSummary لكن لمهندس واحد)
 */
export async function getDiscountSummaryForEngineer(engineerId: number) {
  const db = await getDb();
  if (!db) return null;

  // جلب الصفقات المغلقة (closed_won) في آخر 60 يوم
  const since60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const closedDeals = await db.select().from(deals)
    .where(and(
      eq(deals.engineerId, engineerId),
      eq(deals.stage, 'closed_won'),
      eq(deals.isDeleted, 0),
      gte(deals.closedAt, since60)
    ));

  const actualSales = closedDeals.reduce((s, d) => s + parseFloat(d.netValue as string || d.value as string || '0'), 0);

  // جلب الصفقات في Pipeline
  const pipelineDeals = await db.select().from(deals)
    .where(and(
      eq(deals.engineerId, engineerId),
      eq(deals.isDeleted, 0),
      or(
        eq(deals.stage, 'proposal'),
        eq(deals.stage, 'negotiation'),
        eq(deals.stage, 'contract_sent'),
      )
    ));
  const pipeline = pipelineDeals.reduce((s, d) => s + parseFloat(d.value as string || '0'), 0);

  // جلب شرائح الخصم
  const discTiers = await db.select().from(discountTiers).orderBy(discountTiers.minSales);
  const totalVolume = actualSales + pipeline;
  const tier = getDiscountTier(totalVolume, discTiers.map(t => ({
    minSales: t.minSales as string,
    maxSales: t.maxSales as string | null,
    maxDiscountPct: t.maxDiscountPct,
    label: t.label,
  })));

  const discountPct = tier?.maxDiscountPct ?? getDiscountTierInfo(totalVolume).discountPct;
  const allowedDiscount = totalVolume * (discountPct / 100);

  // الخصم المستخدم على الصفقات المغلقة
  const usedDiscount = closedDeals.reduce((s, d) => s + parseFloat(d.discountValue as string || '0'), 0);
  // الخصم المحتمل على الـ Pipeline
  const potentialDiscount = pipelineDeals.reduce((s, d) => s + parseFloat(d.discountValue as string || '0'), 0);
  const remainingDiscount = Math.max(0, allowedDiscount - usedDiscount - potentialDiscount);

  return {
    engineerId,
    actualSales,
    pipeline,
    totalVolume,
    discountPct,
    allowedDiscount: Math.round(allowedDiscount),
    usedDiscount: Math.round(usedDiscount),
    potentialDiscount: Math.round(potentialDiscount),
    remainingDiscount: Math.round(remainingDiscount),
    realizedDiscount: Math.round(usedDiscount),
    closedDealsCount: closedDeals.length,
    pipelineDealsCount: pipelineDeals.length,
  };
}

/**
 * حساب مكافأة الخصم لصفقة مغلقة (closed_won)
 * الحالة 1: خصم ≤ كومشن → مكافأة = 50% من الخصم
 * الحالة 2: خصم > كومشن → مكافأة = الكومشن فقط
 * قيود: لا مكافأة إذا خسرت الصفقة بسبب السعر، ولا تتجاوز الـ Cap الشهري
 */
export async function calculateDiscountBonus(dealId: number): Promise<{
  eligible: boolean; reason?: string;
  discountUsed: number; commissionAmount: number;
  bonusAmount: number; bonusCase: 1 | 2 | null;
  monthlyCap: number; earnedThisMonth: number; remainingCap: number;
}> {
  const db = await getDb();
  if (!db) return { eligible: false, reason: 'خطأ في قاعدة البيانات', discountUsed: 0, commissionAmount: 0, bonusAmount: 0, bonusCase: null, monthlyCap: 0, earnedThisMonth: 0, remainingCap: 0 };

  // جلب الصفقة
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) return { eligible: false, reason: 'الصفقة غير موجودة', discountUsed: 0, commissionAmount: 0, bonusAmount: 0, bonusCase: null, monthlyCap: 0, earnedThisMonth: 0, remainingCap: 0 };

  // شرط 1: الصفقة يجب أن تكون closed_won
  if (deal.stage !== 'closed_won') {
    return { eligible: false, reason: 'الصفقة ليست مغلقة بنجاح', discountUsed: 0, commissionAmount: 0, bonusAmount: 0, bonusCase: null, monthlyCap: 0, earnedThisMonth: 0, remainingCap: 0 };
  }

  // شرط 2: لا مكافأة إذا خسرت بسبب السعر
  if (deal.lostReason === 'price_high') {
    return { eligible: false, reason: 'الصفقة خُسرت بسبب السعر', discountUsed: 0, commissionAmount: 0, bonusAmount: 0, bonusCase: null, monthlyCap: 0, earnedThisMonth: 0, remainingCap: 0 };
  }

  const discountUsed = parseFloat(deal.discountValue as string || '0');
  const netValue = parseFloat(deal.netValue as string || deal.value as string || '0');

  // حساب الكومشن على هذه الصفقة
  const commissionTiersData = await db.select().from(commissionTiers).orderBy(commissionTiers.minAchievementPct);
  // نستخدم نسبة كومشن افتراضية 3% إذا لم تكن هناك شرائح
  const commissionPct = commissionTiersData.length > 0 ? commissionTiersData[0].commissionPct : 3;
  const commissionAmount = netValue * (commissionPct / 100);

  // حساب المكافأة
  let bonusAmount = 0;
  let bonusCase: 1 | 2 | null = null;

  if (discountUsed > 0) {
    if (discountUsed <= commissionAmount) {
      // الحالة 1: خصم ≤ كومشن → مكافأة = 50% من الخصم
      bonusAmount = discountUsed * 0.5;
      bonusCase = 1;
    } else {
      // الحالة 2: خصم > كومشن → مكافأة = الكومشن فقط
      bonusAmount = commissionAmount;
      bonusCase = 2;
    }
  }

  // التحقق من الـ Cap الشهري
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [capRecord] = await db.select().from(discountBonusCaps)
    .where(and(
      eq(discountBonusCaps.engineerId, deal.engineerId),
      eq(discountBonusCaps.year, year),
      eq(discountBonusCaps.month, month),
    )).limit(1);

  const monthlyCap = parseFloat(capRecord?.monthlyCap as string || '15000');
  const earnedThisMonth = parseFloat(capRecord?.earnedBonus as string || '0');
  const remainingCap = Math.max(0, monthlyCap - earnedThisMonth);

  // تطبيق الـ Cap
  bonusAmount = Math.min(bonusAmount, remainingCap);

  return {
    eligible: bonusAmount > 0,
    discountUsed: Math.round(discountUsed),
    commissionAmount: Math.round(commissionAmount),
    bonusAmount: Math.round(bonusAmount),
    bonusCase,
    monthlyCap,
    earnedThisMonth: Math.round(earnedThisMonth),
    remainingCap: Math.round(remainingCap),
  };
}

/**
 * جلب ملخص مكافأة الخصم للمهندس (شهري)
 */
export async function getDiscountBonusSummary(engineerId: number, year?: number, month?: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? (now.getMonth() + 1);

  // جلب الصفقات المغلقة في هذا الشهر
  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59);

  const closedDeals = await db.select().from(deals)
    .where(and(
      eq(deals.engineerId, engineerId),
      eq(deals.stage, 'closed_won'),
      eq(deals.isDeleted, 0),
      gte(deals.closedAt, startOfMonth),
      lte(deals.closedAt, endOfMonth),
    ));

  // حساب المكافأة لكل صفقة
  const dealBonuses = await Promise.all(closedDeals.map(async (deal) => {
    const bonus = await calculateDiscountBonus(deal.id);
    return {
      dealId: deal.id,
      clientName: deal.clientName,
      dealValue: parseFloat(deal.value as string || '0'),
      discountUsed: bonus.discountUsed,
      commissionAmount: bonus.commissionAmount,
      bonusAmount: bonus.bonusAmount,
      bonusCase: bonus.bonusCase,
      eligible: bonus.eligible,
      reason: bonus.reason,
    };
  }));

  const totalBonus = dealBonuses.reduce((s, d) => s + (d.eligible ? d.bonusAmount : 0), 0);

  // جلب الـ Cap
  const [capRecord] = await db.select().from(discountBonusCaps)
    .where(and(
      eq(discountBonusCaps.engineerId, engineerId),
      eq(discountBonusCaps.year, y),
      eq(discountBonusCaps.month, m),
    )).limit(1);

  const monthlyCap = parseFloat(capRecord?.monthlyCap as string || '15000');
  const cappedBonus = Math.min(totalBonus, monthlyCap);

  return {
    engineerId,
    year: y,
    month: m,
    dealBonuses,
    totalBonusBeforeCap: Math.round(totalBonus),
    monthlyCap,
    cappedBonus: Math.round(cappedBonus),
    isPaid: capRecord?.isPaid === 1,
    eligibleDealsCount: dealBonuses.filter(d => d.eligible).length,
    ineligibleDealsCount: dealBonuses.filter(d => !d.eligible).length,
  };
}

/**
 * جلب شاشة الخصومات الكاملة لمهندس (Dashboard)
 */
export async function getDiscountDashboard(engineerId: number) {
  const db = await getDb();
  if (!db) return null;

  const [summary, dealAllocations, bonusSummary] = await Promise.all([
    getDiscountSummaryForEngineer(engineerId),
    distributeDiscountToDeals(engineerId),
    getDiscountBonusSummary(engineerId),
  ]);

  if (!summary) return null;

  // فصل الصفقات: Closed vs Pipeline
  const closedDeals = dealAllocations.filter(d => d.dealType === 'closed');
  const pipelineDeals = dealAllocations.filter(d => d.dealType === 'pipeline');

  return {
    summary,
    closedDeals,
    pipelineDeals,
    bonusSummary,
    // إجماليات
    totalAllocated: dealAllocations.reduce((s, d) => s + d.allocatedDiscountMax, 0),
    totalUsed: dealAllocations.reduce((s, d) => s + d.usedDiscount, 0),
    totalRemaining: dealAllocations.reduce((s, d) => s + d.remainingDiscount, 0),
  };
}

/**
 * تحديث الـ Cap الشهري لمهندس (من الإدارة)
 */
export async function setDiscountBonusCap(engineerId: number, year: number, month: number, monthlyCap: number) {
  const db = await getDb();
  if (!db) return;

  const [existing] = await db.select().from(discountBonusCaps)
    .where(and(
      eq(discountBonusCaps.engineerId, engineerId),
      eq(discountBonusCaps.year, year),
      eq(discountBonusCaps.month, month),
    )).limit(1);

  if (existing) {
    await db.update(discountBonusCaps)
      .set({ monthlyCap: monthlyCap.toString() })
      .where(eq(discountBonusCaps.id, existing.id));
  } else {
    await db.insert(discountBonusCaps).values({
      engineerId,
      year,
      month,
      monthlyCap: monthlyCap.toString(),
      earnedBonus: '0',
    });
  }
}

// ─── Operational Targets Performance (الأهداف التشغيلية لمهندس محدد) ──────────────────
export async function getEngineerOperationalTargets(engineerId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return null;

  // جلب الأهداف التشغيلية
  const targetRows = await db.select().from(engineerTargets)
    .where(and(eq(engineerTargets.engineerId, engineerId), eq(engineerTargets.year, year), eq(engineerTargets.month, month)))
    .limit(1);
  const target = targetRows[0];

  // تحديد نطاق الشهر
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // عدد الاجتماعات الفعلية
  const meetingRows = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(dailyTasks)
    .where(and(
      eq(dailyTasks.engineerId, engineerId),
      sql`${dailyTasks.taskType} IN ('meeting_modeling','meeting_presentation','meeting_closing','meeting_2d','meeting_3d','meeting_quotation')`,
      eq(dailyTasks.status, 'completed'),
      sql`${dailyTasks.taskDate} >= ${startDate.toISOString().slice(0,10)}`,
      sql`${dailyTasks.taskDate} <= ${endDate.toISOString().slice(0,10)}`,
    ));
  const actualMeetings = Number(meetingRows[0]?.cnt ?? 0);

  // عدد الـ 2D Design الفعلي
  const design2DRows = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(dailyTasks)
    .where(and(
      eq(dailyTasks.engineerId, engineerId),
      eq(dailyTasks.taskType, 'design_2d'),
      eq(dailyTasks.status, 'completed'),
      sql`${dailyTasks.taskDate} >= ${startDate.toISOString().slice(0,10)}`,
      sql`${dailyTasks.taskDate} <= ${endDate.toISOString().slice(0,10)}`,
    ));
  const actual2D = Number(design2DRows[0]?.cnt ?? 0);

  // عدد الـ 3D Modeling الفعلي
  const design3DRows = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(dailyTasks)
    .where(and(
      eq(dailyTasks.engineerId, engineerId),
      eq(dailyTasks.taskType, 'design_3d'),
      eq(dailyTasks.status, 'completed'),
      sql`${dailyTasks.taskDate} >= ${startDate.toISOString().slice(0,10)}`,
      sql`${dailyTasks.taskDate} <= ${endDate.toISOString().slice(0,10)}`,
    ));
  const actual3D = Number(design3DRows[0]?.cnt ?? 0);

  // عدد الـ Render الفعلي
  const renderRows = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(dailyTasks)
    .where(and(
      eq(dailyTasks.engineerId, engineerId),
      eq(dailyTasks.taskType, 'render'),
      eq(dailyTasks.status, 'completed'),
      sql`${dailyTasks.taskDate} >= ${startDate.toISOString().slice(0,10)}`,
      sql`${dailyTasks.taskDate} <= ${endDate.toISOString().slice(0,10)}`,
    ));
  const actualRender = Number(renderRows[0]?.cnt ?? 0);

  // عدد الـ Quotation الفعلي
  const quotationRows = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(dailyTasks)
    .where(and(
      eq(dailyTasks.engineerId, engineerId),
      eq(dailyTasks.taskType, 'quotation'),
      eq(dailyTasks.status, 'completed'),
      sql`${dailyTasks.taskDate} >= ${startDate.toISOString().slice(0,10)}`,
      sql`${dailyTasks.taskDate} <= ${endDate.toISOString().slice(0,10)}`,
    ));
  const actualQuotations = Number(quotationRows[0]?.cnt ?? 0);

  // عدد الـ Presentation الفعلي
  const presentationRows = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(dailyTasks)
    .where(and(
      eq(dailyTasks.engineerId, engineerId),
      eq(dailyTasks.taskType, 'meeting_presentation'),
      eq(dailyTasks.status, 'completed'),
      sql`${dailyTasks.taskDate} >= ${startDate.toISOString().slice(0,10)}`,
      sql`${dailyTasks.taskDate} <= ${endDate.toISOString().slice(0,10)}`,
    ));
  const actualPresentations = Number(presentationRows[0]?.cnt ?? 0);

  // عدد الـ Closing الفعلي (صفقات مغلقة)
  const closingRows = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(deals)
    .where(and(
      eq(deals.engineerId, engineerId),
      eq(deals.stage, 'closed_won'),
      eq(deals.isDeleted, 0),
      gte(deals.createdAt, startDate),
      lte(deals.createdAt, endDate),
    ));
  const actualClosings = Number(closingRows[0]?.cnt ?? 0);

  // حساب نسبة الإنجاز لكل عنصر
  const calcPct = (actual: number, target: number) => target > 0 ? Math.round((actual / target) * 100) : null;

  // تحديد المشكلة: هل في النشاط أم في الإغلاق؟
  const meetingPct = calcPct(actualMeetings, target?.targetMeetings ?? 0);
  const closingPct = calcPct(actualClosings, target?.targetClosings ?? 0);
  let diagnosis: 'activity' | 'closing' | 'both' | 'on_track' | 'no_data' = 'no_data';
  if (meetingPct !== null && closingPct !== null) {
    if (meetingPct >= 80 && closingPct < 60) diagnosis = 'closing'; // النشاط كافٍ لكن الإغلاق ضعيف
    else if (meetingPct < 60 && closingPct < 60) diagnosis = 'both';
    else if (meetingPct < 60) diagnosis = 'activity';
    else diagnosis = 'on_track';
  }

  return {
    engineerId,
    year,
    month,
    targets: {
      meetings: target?.targetMeetings ?? 0,
      design2D: target?.target2D ?? 0,
      design3D: target?.target3D ?? 0,
      render: target?.targetRender ?? 0,
      quotations: target?.targetQuotations ?? 0,
      presentations: target?.targetPresentations ?? 0,
      closings: target?.targetClosings ?? 0,
      deals: target?.targetDeals ?? 0,
    },
    actuals: {
      meetings: actualMeetings,
      design2D: actual2D,
      design3D: actual3D,
      render: actualRender,
      quotations: actualQuotations,
      presentations: actualPresentations,
      closings: actualClosings,
    },
    percentages: {
      meetings: calcPct(actualMeetings, target?.targetMeetings ?? 0),
      design2D: calcPct(actual2D, target?.target2D ?? 0),
      design3D: calcPct(actual3D, target?.target3D ?? 0),
      render: calcPct(actualRender, target?.targetRender ?? 0),
      quotations: calcPct(actualQuotations, target?.targetQuotations ?? 0),
      presentations: calcPct(actualPresentations, target?.targetPresentations ?? 0),
      closings: calcPct(actualClosings, target?.targetClosings ?? 0),
    },
    diagnosis, // 'activity' | 'closing' | 'both' | 'on_track' | 'no_data'
  };
}

// ─── Team Performance Ranking (Sales Engineer + Sales Specialist فقط) ─────────
export async function getTeamPerformanceRanking(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  // جلب المهندسين من نوع sales_engineer و sales_specialist فقط
  const salesEngineers = await db.select({ id: engineers.id, name: engineers.name, role: engineers.role })
    .from(engineers)
    .where(and(
      sql`${engineers.role} IN ('sales_engineer', 'sales_specialist')`,
      eq(engineers.status, 'active'),
      eq(engineers.isDeleted, 0),
    ));

  if (salesEngineers.length === 0) return [];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const results = await Promise.all(salesEngineers.map(async (eng) => {
    // الهدف الشهري
    const targetRows = await db.select().from(engineerTargets)
      .where(and(eq(engineerTargets.engineerId, eng.id), eq(engineerTargets.year, year), eq(engineerTargets.month, month)))
      .limit(1);
    const target = targetRows[0];

    // المبيعات الفعلية
    const salesRows = await db.select({ total: sql<string>`SUM(${deals.netValue})`, cnt: sql<number>`COUNT(*)`, won: sql<number>`SUM(CASE WHEN ${deals.stage}='closed_won' THEN 1 ELSE 0 END)` })
      .from(deals)
      .where(and(
        eq(deals.engineerId, eng.id),
        sql`${deals.stage} IN ('closed_won','closed_lost')`,
        eq(deals.isDeleted, 0),
        gte(deals.createdAt, startDate),
        lte(deals.createdAt, endDate),
      ));
    const actualSales = parseFloat(salesRows[0]?.total ?? '0');
    const totalDeals = Number(salesRows[0]?.cnt ?? 0);
    const closedWon = Number(salesRows[0]?.won ?? 0);
    const closingRate = totalDeals > 0 ? Math.round((closedWon / totalDeals) * 100) : 0;

    // عدد الاجتماعات
    const meetingRows = await db.select({ cnt: sql<number>`COUNT(*)` })
      .from(dailyTasks)
      .where(and(
        eq(dailyTasks.engineerId, eng.id),
        sql`${dailyTasks.taskType} IN ('meeting_modeling','meeting_presentation','meeting_closing','meeting_2d','meeting_3d','meeting_quotation')`,
        eq(dailyTasks.status, 'completed'),
        gte(dailyTasks.taskDate, startDate as unknown as Date),
        lte(dailyTasks.taskDate, endDate as unknown as Date),
      ));
    const actualMeetings = Number(meetingRows[0]?.cnt ?? 0);

    const targetAmount = parseFloat(target?.targetAmount ?? '0');
    const achievementPct = targetAmount > 0 ? Math.round((actualSales / targetAmount) * 100) : 0;
    const targetMeetings = target?.targetMeetings ?? 0;
    const meetingPct = targetMeetings > 0 ? Math.round((actualMeetings / targetMeetings) * 100) : 0;

    // حساب Performance Score (مجمّع)
    // 50% مبيعات + 30% نشاط (اجتماعات) + 20% Closing Rate
    const salesScore = Math.min(achievementPct, 150); // max 150
    const activityScore = Math.min(meetingPct, 150);
    const closingScore = closingRate;
    const compositeScore = Math.round(salesScore * 0.5 + activityScore * 0.3 + closingScore * 0.2);

    // تحديد المستوى
    let level: 'A' | 'B' | 'C' = 'C';
    if (compositeScore >= 80) level = 'A';
    else if (compositeScore >= 50) level = 'B';

    // تحديد الحالة
    let performanceGroup: 'top' | 'needs_support' = 'needs_support';
    if (compositeScore >= 70) performanceGroup = 'top';

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      role: eng.role,
      targetAmount,
      actualSales,
      achievementPct,
      closingRate,
      actualMeetings,
      targetMeetings,
      meetingPct,
      totalDeals,
      closedWon,
      compositeScore,
      level,
      performanceGroup,
    };
  }));

  // ترتيب تنازلي حسب compositeScore
  return results.sort((a, b) => b.compositeScore - a.compositeScore);
}

// ─── Progressive Commission + KPI Share + Closing Rate Incentive ─────────────

/**
 * حساب حافز Closing Rate لمهندس واحد
 * الشرائح:
 * < 40%  → لا حافز
 * 40-50% → 2,000 ج.م
 * 50-60% → 4,000 ج.م
 * ≥ 60%  → 6,000 ج.م
 */
export function calcClosingRateIncentive(closingRate: number): { amount: number; label: string; threshold: string } {
  if (closingRate >= 60) return { amount: 6_000, label: 'حافز ممتاز', threshold: '≥ 60%' };
  if (closingRate >= 50) return { amount: 4_000, label: 'حافز جيد جداً', threshold: '50-60%' };
  if (closingRate >= 40) return { amount: 2_000, label: 'حافز جيد', threshold: '40-50%' };
  return { amount: 0, label: 'لا يوجد حافز', threshold: '< 40%' };
}

/**
 * حساب KPI Share لمهندس واحد بناءً على نسبة تحقيقه من إجمالي KPI الفريق
 * @param achievementPct نسبة تحقيق المهندس (0-100+)
 * @param teamKPIPool إجمالي قيمة KPI المتاحة للفريق
 */
export function calcKPIShare(achievementPct: number, teamKPIPool: number): number {
  if (achievementPct <= 0 || teamKPIPool <= 0) return 0;
  // KPI Share = نسبة التحقيق × قيمة KPI الفريق
  // مثال: 94% تحقيق × 2000 = 1880 ج.م
  const share = (Math.min(achievementPct, 100) / 100) * teamKPIPool;
  return Math.round(share);
}

/**
 * حساب الحافز التشغيلي (Incentive) بناءً على حجم المبيعات
 * الشرائح:
 * < 500,000   → لا حافز
 * 500k-750k   → 2,500
 * 750k-1M     → 5,000
 * 1M-1.25M    → 7,500
 * 1.25M-1.5M  → 10,000
 * 1.5M-1.75M  → 12,500
 * 1.75M-2M    → 15,000
 * ≥ 2M        → 20,000
 */
export function calcSalesIncentive(salesAmount: number): { amount: number; label: string } {
  if (salesAmount >= 2_000_000) return { amount: 20_000, label: 'حافز استثنائي' };
  if (salesAmount >= 1_750_000) return { amount: 15_000, label: 'حافز ممتاز' };
  if (salesAmount >= 1_500_000) return { amount: 12_500, label: 'حافز عالي' };
  if (salesAmount >= 1_250_000) return { amount: 10_000, label: 'حافز جيد جداً' };
  if (salesAmount >= 1_000_000) return { amount: 7_500, label: 'حافز جيد' };
  if (salesAmount >= 750_000)   return { amount: 5_000, label: 'حافز متوسط' };
  if (salesAmount >= 500_000)   return { amount: 2_500, label: 'حافز أساسي' };
  return { amount: 0, label: 'لا يوجد حافز' };
}

/**
 * تفاصيل استحقاقات مهندس واحد (Commission + KPI Share + Incentive)
 * يعرض فقط Sales Engineer + Sales Specialist
 */
export async function getEngineerEarningsBreakdown(engineerId: number, year: number, month: number, teamKPIPool: number = 2_000) {
  const db = await getDb();
  if (!db) return null;

  const [eng] = await db.select().from(engineers).where(eq(engineers.id, engineerId)).limit(1);
  if (!eng) return null;

  // فلترة الأدوار البيعية فقط
  const salesRoles = ['sales_engineer', 'sales_specialist'];
  if (!salesRoles.includes(eng.role ?? '')) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // المبيعات الفعلية (closed_won)
  const wonDeals = await db.select().from(deals)
    .where(and(
      eq(deals.engineerId, engineerId),
      eq(deals.stage, 'closed_won'),
      eq(deals.isDeleted, 0),
      between(deals.closedAt as any, startDate, endDate)
    ));
  const actualSales = wonDeals.reduce((s, d) => s + parseFloat(d.value as string || '0'), 0);

  // الهدف
  const [targetRow] = await db.select().from(engineerTargets)
    .where(and(eq(engineerTargets.engineerId, engineerId), eq(engineerTargets.year, year), eq(engineerTargets.month, month)))
    .limit(1);
  const targetAmount = targetRow ? parseFloat(targetRow.targetAmount) : 0;
  const achievementPct = targetAmount > 0 ? Math.round((actualSales / targetAmount) * 100) : 0;

  // Closing Rate
  const allDeals = await db.select().from(deals)
    .where(and(eq(deals.engineerId, engineerId), eq(deals.isDeleted, 0)));
  const closedDeals = allDeals.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost');
  const closingRate = closedDeals.length > 0
    ? Math.round((allDeals.filter(d => d.stage === 'closed_won').length / closedDeals.length) * 100)
    : 0;

  // حساب الاستحقاقات
  const commission = calcProgressiveCommission(actualSales);
  const commissionDetails = calcProgressiveCommissionDetails(actualSales);
  const kpiShare = calcKPIShare(achievementPct, teamKPIPool);
  const incentive = calcSalesIncentive(actualSales);
  const closingIncentive = calcClosingRateIncentive(closingRate);
  const totalEarned = commission + kpiShare + incentive.amount + closingIncentive.amount;

  return {
    engineerId: eng.id,
    engineerName: eng.name,
    role: eng.role,
    actualSales: Math.round(actualSales),
    targetAmount: Math.round(targetAmount),
    achievementPct,
    closingRate,
    // Commission
    commission,
    commissionDetails,
    commissionStatus: commission > 0 ? 'متاح' : 'غير مستحق',
    // KPI Share
    kpiShare,
    kpiShareStatus: achievementPct > 0 ? 'متاح' : 'غير مستحق',
    teamKPIPool,
    // Sales Incentive
    incentive: incentive.amount,
    incentiveLabel: incentive.label,
    incentiveStatus: incentive.amount > 0 ? 'متاح' : 'غير مستحق',
    // Closing Rate Incentive
    closingIncentive: closingIncentive.amount,
    closingIncentiveLabel: closingIncentive.label,
    closingIncentiveThreshold: closingIncentive.threshold,
    closingIncentiveStatus: closingIncentive.amount > 0 ? 'متاح' : 'غير مستحق',
    // Total
    totalEarned,
  };
}

/**
 * تفاصيل استحقاقات كل الفريق البيعي (Sales Engineer + Sales Specialist فقط)
 */
export async function getAllEngineersEarningsBreakdown(year: number, month: number, teamKPIPool: number = 2_000) {
  const allEngineers = await getEngineers();
  const salesRoles = ['sales_engineer', 'sales_specialist'];
  const salesEngList = allEngineers.filter(e => salesRoles.includes(e.role ?? ''));

  const results = await Promise.all(
    salesEngList.map(eng => getEngineerEarningsBreakdown(eng.id, year, month, teamKPIPool))
  );
  return results.filter(Boolean);
}

// ─── Company Closing Incentive System ────────────────────────────────────────
/**
 * حساب Bonus Multiplier بناءً على Company Closing Rate
 * الشرائح:
 * < 40%   → 0% (لا بونص)
 * 40-50%  → +15%
 * 50-60%  → +30%
 * 60-70%  → +50%
 * 70-80%  → +75%
 * > 80%   → +100%
 */
export function calcCompanyClosingBonus(companyClosingRate: number): {
  multiplier: number;
  bonusPct: number;
  tier: string;
  label: string;
  nextTier: string | null;
  nextTierPct: number | null;
} {
  if (companyClosingRate >= 80) return {
    multiplier: 2.0, bonusPct: 100,
    tier: '> 80%', label: 'بونص استثنائي +100%',
    nextTier: null, nextTierPct: null,
  };
  if (companyClosingRate >= 70) return {
    multiplier: 1.75, bonusPct: 75,
    tier: '70-80%', label: 'بونص ممتاز +75%',
    nextTier: '> 80%', nextTierPct: 100,
  };
  if (companyClosingRate >= 60) return {
    multiplier: 1.5, bonusPct: 50,
    tier: '60-70%', label: 'بونص عالي +50%',
    nextTier: '70-80%', nextTierPct: 75,
  };
  if (companyClosingRate >= 50) return {
    multiplier: 1.3, bonusPct: 30,
    tier: '50-60%', label: 'بونص جيد +30%',
    nextTier: '60-70%', nextTierPct: 50,
  };
  if (companyClosingRate >= 40) return {
    multiplier: 1.15, bonusPct: 15,
    tier: '40-50%', label: 'بونص أساسي +15%',
    nextTier: '50-60%', nextTierPct: 30,
  };
  return {
    multiplier: 1.0, bonusPct: 0,
    tier: '< 40%', label: 'لا يوجد بونص',
    nextTier: '40-50%', nextTierPct: 15,
  };
}

/**
 * تحديد تأهيل المهندس الفردي للبونص الكامل
 * Gate Condition:
 * - تحقيق ≥ 70% من Target → بونص كامل
 * - أقل من 70% → 50% من البونص فقط
 */
export function calcEngineerBonusEligibility(
  achievementPct: number
): { eligible: boolean; bonusMultiplier: number; label: string } {
  if (achievementPct >= 70) {
    return { eligible: true, bonusMultiplier: 1.0, label: 'مؤهل للبونص الكامل' };
  }
  return { eligible: false, bonusMultiplier: 0.5, label: 'مؤهل لنصف البونص فقط (أقل من 70% من الهدف)' };
}

/**
 * حساب Company Closing Bonus لكل المهندسين
 * يجمع Company Closing Rate + Gate Condition فردي
 */
export async function getCompanyClosingBonusForAllEngineers(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;

  // 1. حساب Company Closing Rate
  const closingKPI = await getCompanyClosingKPI(year, month);
  if (!closingKPI) return null;
  const companyRate = closingKPI.currentRate;
  const companyBonus = calcCompanyClosingBonus(companyRate);

  // 2. قائمة المهندسين البيعيين
  const allEngList = await getEngineers();
  const salesEngList = allEngList.filter(isSalesDepartment);

  // 3. لكل مهندس: حساب نسبة تحقيق الهدف + تأهيل البونص
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const engineerBonuses = await Promise.all(salesEngList.map(async (eng) => {
    // جلب target
    const [target] = await db.select().from(engineerTargets)
      .where(and(eq(engineerTargets.engineerId, eng.id), eq(engineerTargets.year, year), eq(engineerTargets.month, month)))
      .limit(1);
     const targetSales = target?.targetAmount ? parseFloat(target.targetAmount) : 0;
    // جلب مبيعات فعلية
    const engDeals = await db.select().from(deals).where(
      and(
        eq(deals.engineerId, eng.id),
        eq(deals.stage, 'closed_won'),
        eq(deals.isDeleted, 0),
        gte(deals.updatedAt, startDate),
        lte(deals.updatedAt, endDate)
      )
    );
    const actualSales = engDeals.reduce((sum, d) => sum + parseFloat(d.grossValue ?? '0'), 0);
    const achievementPct = targetSales > 0 ? Math.round((actualSales / targetSales) * 100) : 0;

    // Progressive Commission
    const baseCommission = calcProgressiveCommission(actualSales);

    // Gate Condition
    const eligibility = calcEngineerBonusEligibility(achievementPct);

    // حساب البونص الفعلي
    const effectiveMultiplier = companyBonus.multiplier === 1.0
      ? 1.0  // لا بونص
      : 1 + ((companyBonus.multiplier - 1) * eligibility.bonusMultiplier);
    const bonusAmount = Math.round(baseCommission * (effectiveMultiplier - 1));
    const finalCommission = Math.round(baseCommission * effectiveMultiplier);

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      actualSales,
      targetSales,
      achievementPct,
      baseCommission,
      bonusAmount,
      finalCommission,
      eligible: eligibility.eligible,
      eligibilityLabel: eligibility.label,
      bonusMultiplier: effectiveMultiplier,
    };
  }));

  return {
    companyClosingRate: companyRate,
    companyBonus,
    target: closingKPI.target,
    totalDeals: closingKPI.totalDeals,
    wonDeals: closingKPI.wonDeals,
    engineers: engineerBonuses,
    // 3 سيناريوهات للاختبار
    scenarios: [35, 50, 65].map(rate => ({
      rate,
      bonus: calcCompanyClosingBonus(rate),
    })),
  };
}


// ═══════════════════════════════════════════════════════════════════════
// Planning Module - Company Goals
// ═══════════════════════════════════════════════════════════════════════

/** جلب هدف الشركة لشهر معين */
export async function getCompanyGoal(year: number, month: number): Promise<CompanyGoal | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(companyGoals)
    .where(and(eq(companyGoals.year, year), eq(companyGoals.month, month)))
    .limit(1);
  return rows[0] ?? null;
}

/** حفظ / تحديث هدف الشركة مع الحساب التلقائي */
export async function setCompanyGoal(data: {
  year: number;
  month: number;
  revenueTarget: number;
  avgDealValue: number;
  closingRateTarget: number;
  periodFrom?: string;
  periodTo?: string;
  notes?: string;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) return { id: 0 };

  // الحساب التلقائي
  const closingRate = data.closingRateTarget / 100;
  const requiredDeals = closingRate > 0 ? Math.ceil(data.revenueTarget / data.avgDealValue) : 0;
  const requiredVisits = closingRate > 0 ? Math.ceil(requiredDeals / closingRate) : 0;
  const requiredPipelineValue = requiredDeals * data.avgDealValue * (1 / closingRate);

  const existing = await getCompanyGoal(data.year, data.month);
  if (existing) {
    await db.update(companyGoals).set({
      revenueTarget: data.revenueTarget.toString(),
      avgDealValue: data.avgDealValue.toString(),
      closingRateTarget: data.closingRateTarget.toString(),
      periodFrom: data.periodFrom as unknown as Date | undefined,
      periodTo: data.periodTo as unknown as Date | undefined,
      requiredDeals,
      requiredVisits,
      requiredPipelineValue: requiredPipelineValue.toFixed(2),
      notes: data.notes,
    }).where(eq(companyGoals.id, existing.id));
    return { id: existing.id };
  }

  const [result] = await db.insert(companyGoals).values({
    year: data.year,
    month: data.month,
    revenueTarget: data.revenueTarget.toString(),
    avgDealValue: data.avgDealValue.toString(),
    closingRateTarget: data.closingRateTarget.toString(),
    periodFrom: data.periodFrom as unknown as Date | undefined,
    periodTo: data.periodTo as unknown as Date | undefined,
    requiredDeals,
    requiredVisits,
    requiredPipelineValue: requiredPipelineValue.toFixed(2),
    notes: data.notes,
  });
  return { id: (result as any).insertId };
}

/** تقدم تحقيق هدف الشركة */
export async function getCompanyGoalProgress(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;

  const goal = await getCompanyGoal(year, month);
  if (!goal) return null;

  // المبيعات الفعلية هذا الشهر
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const salesRows = await db.select({ total: sum(deals.value) })
    .from(deals)
    .where(and(
      eq(deals.stage, 'closed_won'),
      gte(deals.createdAt, new Date(startDate)),
      lte(deals.createdAt, new Date(endDate))
    ));
  const actualRevenue = parseFloat(salesRows[0]?.total ?? '0');
  const revenueTarget = parseFloat(goal.revenueTarget);

  // عدد الصفقات المغلقة
  const dealsRows = await db.select({ cnt: count() })
    .from(deals)
    .where(and(
      eq(deals.stage, 'closed_won'),
      gte(deals.createdAt, new Date(startDate)),
      lte(deals.createdAt, new Date(endDate))
    ));
  const actualDeals = dealsRows[0]?.cnt ?? 0;

  // عدد المعاينات
  const visitsRows = await db.select({ cnt: count() })
    .from(visits)
    .where(and(
      gte(visits.scheduledAt, new Date(startDate)),
      lte(visits.scheduledAt, new Date(endDate))
    ));
  const actualVisits = visitsRows[0]?.cnt ?? 0;

  // Closing Rate الفعلي
  const totalDealsRows = await db.select({ cnt: count() })
    .from(deals)
    .where(and(
      gte(deals.createdAt, new Date(startDate)),
      lte(deals.createdAt, new Date(endDate))
    ));
  const totalDeals = totalDealsRows[0]?.cnt ?? 0;
  const actualClosingRate = totalDeals > 0 ? (actualDeals / totalDeals) * 100 : 0;

  return {
    goal,
    actual: {
      revenue: actualRevenue,
      deals: actualDeals,
      visits: actualVisits,
      closingRate: Math.round(actualClosingRate * 10) / 10,
    },
    progress: {
      revenueProgress: revenueTarget > 0 ? Math.round((actualRevenue / revenueTarget) * 100) : 0,
      dealsProgress: (goal.requiredDeals ?? 0) > 0 ? Math.round((actualDeals / (goal.requiredDeals ?? 1)) * 100) : 0,
      visitsProgress: (goal.requiredVisits ?? 0) > 0 ? Math.round((actualVisits / (goal.requiredVisits ?? 1)) * 100) : 0,
      closingRateProgress: parseFloat(goal.closingRateTarget) > 0
        ? Math.round((actualClosingRate / parseFloat(goal.closingRateTarget)) * 100) : 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Planning Module - Engineer Personal Goals
// ═══════════════════════════════════════════════════════════════════════

/** جلب الأهداف الشخصية لمهندس */
export async function getEngineerPersonalGoals(engineerId: number, year: number, month: number): Promise<EngineerPersonalGoal[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(engineerPersonalGoals)
    .where(and(
      eq(engineerPersonalGoals.engineerId, engineerId),
      eq(engineerPersonalGoals.year, year),
      eq(engineerPersonalGoals.month, month)
    ));
}

/** إضافة / تحديث هدف شخصي */
export async function setPersonalGoal(data: {
  id?: number;
  engineerId: number;
  year: number;
  month: number;
  objective: string;
  developmentArea: EngineerPersonalGoal['developmentArea'];
  evaluationMethod: EngineerPersonalGoal['evaluationMethod'];
  reviewerRole: EngineerPersonalGoal['reviewerRole'];
  score?: number;
  reviewNotes?: string;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) return { id: 0 };

  if (data.id) {
    await db.update(engineerPersonalGoals).set({
      objective: data.objective,
      developmentArea: data.developmentArea,
      evaluationMethod: data.evaluationMethod,
      reviewerRole: data.reviewerRole,
      score: data.score,
      reviewNotes: data.reviewNotes,
      reviewedAt: data.score !== undefined ? new Date() : undefined,
    }).where(eq(engineerPersonalGoals.id, data.id));
    return { id: data.id };
  }

  const [result] = await db.insert(engineerPersonalGoals).values({
    engineerId: data.engineerId,
    year: data.year,
    month: data.month,
    objective: data.objective,
    developmentArea: data.developmentArea,
    evaluationMethod: data.evaluationMethod,
    reviewerRole: data.reviewerRole,
    score: data.score,
    reviewNotes: data.reviewNotes,
    reviewedAt: data.score !== undefined ? new Date() : undefined,
  });
  return { id: (result as any).insertId };
}

/** حساب Personal Score لمهندس */
export async function calcPersonalScore(engineerId: number, year: number, month: number): Promise<number> {
  const goals = await getEngineerPersonalGoals(engineerId, year, month);
  if (!goals.length) return 0;
  const scored = goals.filter(g => g.score !== null && g.score !== undefined);
  if (!scored.length) return 0;
  const avg = scored.reduce((sum, g) => sum + (g.score ?? 0), 0) / scored.length;
  return Math.round(avg);
}

// ═══════════════════════════════════════════════════════════════════════
// Planning Module - Total Performance Score
// ═══════════════════════════════════════════════════════════════════════

/** حساب Total Performance Score لمهندس (Financial 40% + Operational 40% + Personal 20%) */
export async function calcTotalPerformanceScore(engineerId: number, year: number, month: number): Promise<{
  financialScore: number;
  operationalScore: number;
  personalScore: number;
  totalScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
  financialDetails: { actual: number; target: number; progress: number };
  operationalDetails: { activities: { name: string; actual: number; target: number; progress: number }[] };
}> {
  const db = await getDb();
  const defaultResult = {
    financialScore: 0, operationalScore: 0, personalScore: 0, totalScore: 0, grade: 'C' as const,
    financialDetails: { actual: 0, target: 0, progress: 0 },
    operationalDetails: { activities: [] },
  };
  if (!db) return defaultResult;

  // 1) Financial Score (40%)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const targetRows = await db.select().from(engineerTargets)
    .where(and(
      eq(engineerTargets.engineerId, engineerId),
      eq(engineerTargets.year, year),
      eq(engineerTargets.month, month)
    )).limit(1);
  const target = targetRows[0];
  const financialTarget = parseFloat(target?.targetAmount ?? '0');

  const salesRows = await db.select({ total: sum(deals.value) })
    .from(deals)
    .where(and(
      eq(deals.engineerId, engineerId),
      eq(deals.stage, 'closed_won'),
      gte(deals.createdAt, new Date(startDate)),
      lte(deals.createdAt, new Date(endDate))
    ));
  const actualSales = parseFloat(salesRows[0]?.total ?? '0');
  const financialProgress = financialTarget > 0 ? Math.min(100, Math.round((actualSales / financialTarget) * 100)) : 0;
  const financialScore = Math.round(financialProgress * 0.4);

  // 2) Operational Score (40%)
  const activities = [
    { name: '2D Design', target: target?.target2D ?? 0, taskType: '2d_design' },
    { name: '3D Modeling', target: target?.target3D ?? 0, taskType: '3d_modeling' },
    { name: 'Render', target: target?.targetRender ?? 0, taskType: 'render' },
    { name: 'Quotation', target: target?.targetQuotations ?? 0, taskType: 'quotation' },
    { name: 'Meeting', target: target?.targetMeetings ?? 0, taskType: 'meeting' },
    { name: 'Presentation', target: target?.targetPresentations ?? 0, taskType: 'presentation' },
    { name: 'Closing', target: target?.targetClosings ?? 0, taskType: 'closing' },
  ];

  const activityResults = await Promise.all(activities.map(async (act) => {
    if (!act.target) return { name: act.name, actual: 0, target: 0, progress: 0 };
    const rows = await db.select({ cnt: count() })
      .from(dailyTasks)
      .where(and(
        eq(dailyTasks.engineerId, engineerId),
        eq(dailyTasks.taskType, act.taskType as any),
        eq(dailyTasks.status, 'completed'),
        gte(dailyTasks.taskDate, startDate as unknown as Date),
        lte(dailyTasks.taskDate, endDate as unknown as Date)
      ));
    const actual = rows[0]?.cnt ?? 0;
    const progress = act.target > 0 ? Math.min(100, Math.round((actual / act.target) * 100)) : 0;
    return { name: act.name, actual, target: act.target, progress };
  }));

  const withTargets = activityResults.filter(a => a.target > 0);
  const avgOperational = withTargets.length > 0
    ? withTargets.reduce((s, a) => s + a.progress, 0) / withTargets.length : 0;
  const operationalScore = Math.round(avgOperational * 0.4);

  // 3) Personal Score (20%)
  const personalRaw = await calcPersonalScore(engineerId, year, month);
  const personalScore = Math.round(personalRaw * 0.2);

  // Total
  const totalScore = financialScore + operationalScore + personalScore;
  const grade: 'A' | 'B' | 'C' | 'D' =
    totalScore >= 80 ? 'A' : totalScore >= 60 ? 'B' : totalScore >= 40 ? 'C' : 'D';

  return {
    financialScore,
    operationalScore,
    personalScore,
    totalScore,
    grade,
    financialDetails: { actual: actualSales, target: financialTarget, progress: financialProgress },
    operationalDetails: { activities: activityResults },
  };
}

/** حساب Total Performance Score لكل المهندسين */
export async function getAllEngineersPerformanceScores(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const salesEngineers = await db.select({ id: engineers.id, name: engineers.name, role: engineers.role })
    .from(engineers)
    .where(eq(engineers.status, 'active'))
    .orderBy(engineers.name);

  const results = await Promise.all(salesEngineers.map(async (eng) => {
    const score = await calcTotalPerformanceScore(eng.id, year, month);
    return { engineerId: eng.id, engineerName: eng.name, role: eng.role, ...score };
  }));

  return results.sort((a, b) => b.totalScore - a.totalScore);
}

// ═══════════════════════════════════════════════════════════════════════
// Activity Types Integration - Unified Tasks → Goals → KPI
// ═══════════════════════════════════════════════════════════════════════

/**
 * حساب Actual Count لكل نوع نشاط من Tasks المكتملة لمهندس في شهر/سنة محددة
 * يُستخدم لربط Tasks → Goals → KPI تلقائياً
 */
export async function getEngineerActualCounts(
  engineerId: number,
  year: number,
  month: number
): Promise<Partial<Record<ActivityKey, number>>> {
  const db = await getDb();
  if (!db) return {};

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // جلب كل المهام المكتملة للمهندس في الشهر المحدد
  const tasks = await db
    .select({ taskType: dailyTasks.taskType, status: dailyTasks.status })
    .from(dailyTasks)
    .where(
      and(
        eq(dailyTasks.engineerId, engineerId),
        eq(dailyTasks.status, 'completed'),
        between(dailyTasks.createdAt, startDate, endDate)
      )
    );

  // تجميع العدد لكل نوع نشاط
  const counts: Partial<Record<ActivityKey, number>> = {};
  for (const task of tasks) {
    const activityKey = TASK_TYPE_TO_ACTIVITY[task.taskType ?? ''];
    if (activityKey) {
      counts[activityKey] = (counts[activityKey] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * حساب Operational Score لمهندس بناءً على Tasks المكتملة مقارنةً بالأهداف
 * يُستخدم في KPI Module
 */
export async function calcOperationalScoreFromTasks(
  engineerId: number,
  year: number,
  month: number
): Promise<{
  score: number;
  actuals: Partial<Record<ActivityKey, number>>;
  targets: Partial<Record<ActivityKey, number>>;
  breakdown: Array<{
    key: ActivityKey;
    label: string;
    target: number;
    actual: number;
    achievementPct: number;
    weight: number;
    weightedScore: number;
  }>;
}> {
  const db = await getDb();
  if (!db) return { score: 0, actuals: {}, targets: {}, breakdown: [] };

  // جلب الأهداف التشغيلية للمهندس
  const targetRows = await db
    .select()
    .from(engineerTargets)
    .where(
      and(
        eq(engineerTargets.engineerId, engineerId),
        eq(engineerTargets.year, year),
        eq(engineerTargets.month, month)
      )
    )
    .limit(1);

  const targetRow = targetRows[0];
  const targets: Partial<Record<ActivityKey, number>> = targetRow ? {
    meeting:      targetRow.targetMeetings ?? 0,
    presentation: targetRow.targetPresentations ?? 0,
    closing:      targetRow.targetClosings ?? 0,
    design_3d:    targetRow.target3D ?? 0,
    render:       targetRow.targetRender ?? 0,
    design_2d:    targetRow.target2D ?? 0,
    quotation:    targetRow.targetQuotations ?? 0,
    work_order:   targetRow.targetWorkOrder ?? 0,
    contract:     targetRow.targetContract ?? 0,
  } : {};

  // جلب Actual Counts من Tasks
  const actuals = await getEngineerActualCounts(engineerId, year, month);

  // حساب Breakdown
  const breakdown = ACTIVITY_KEYS.map(key => {
    const target = targets[key] ?? 0;
    const actual = actuals[key] ?? 0;
    const weight = ACTIVITY_WEIGHTS[key];
    const achievementPct = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;
    const weightedScore = target > 0 ? (achievementPct / 100) * weight : 0;
    return { key, label: key, target, actual, achievementPct, weight, weightedScore };
  });

  // حساب الـ Score الكلي (فقط للأنشطة التي لها target > 0)
  const activeBreakdown = breakdown.filter(b => b.target > 0);
  const totalWeight = activeBreakdown.reduce((sum, b) => sum + b.weight, 0);
  const weightedSum = activeBreakdown.reduce((sum, b) => sum + b.weightedScore, 0);
  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

  return { score, actuals, targets, breakdown };
}

/**
 * جلب ملخص أداء مهندس لكل الأنشطة (للعرض في KPI + Planning)
 */
export async function getEngineerActivitySummary(
  engineerId: number,
  year: number,
  month: number
): Promise<{
  engineerId: number;
  year: number;
  month: number;
  operationalScore: number;
  topActivity: ActivityKey | null;
  bottomActivity: ActivityKey | null;
  breakdown: Array<{
    key: ActivityKey;
    label: string;
    target: number;
    actual: number;
    achievementPct: number;
    weight: number;
  }>;
}> {
  const result = await calcOperationalScoreFromTasks(engineerId, year, month);
  const activeBreakdown = result.breakdown.filter(b => b.target > 0 || b.actual > 0);

  // أعلى وأقل نشاط
  const sorted = [...activeBreakdown].sort((a, b) => b.achievementPct - a.achievementPct);
  const topActivity = sorted[0]?.key ?? null;
  const bottomActivity = sorted[sorted.length - 1]?.key ?? null;

  return {
    engineerId,
    year,
    month,
    operationalScore: result.score,
    topActivity,
    bottomActivity,
    breakdown: result.breakdown,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal App Users System (نظام المستخدمين الداخلي)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Default Permissions per Role ────────────────────────────────────────────
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, {
  canView: number; canAdd: number; canEdit: number; canDelete: number; dataScope: "own" | "all";
}>> = {
  sales_engineer: {
    crm:         { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "own" },
    visits:      { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "own" },
    deals:       { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "own" },
    kpi:         { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    planning:    { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    discounts:   { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    reports:     { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    tasks:       { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "own" },
    collections: { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    users:       { canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
  },
  sales_specialist: {
    crm:         { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "own" },
    visits:      { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "own" },
    deals:       { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "own" },
    kpi:         { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    planning:    { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    discounts:   { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    reports:     { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    tasks:       { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "own" },
    collections: { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    users:       { canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
  },
  admin_sales: {
    crm:         { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    visits:      { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    deals:       { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    kpi:         { canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "all" }, // KPI مخفي لـ Admin Sales
    planning:    { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "all" },
    discounts:   { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "all" },
    reports:     { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "all" },
    tasks:       { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    collections: { canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "all" },
    users:       { canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
  },
  manager: {
    crm:         { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    visits:      { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    deals:       { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    kpi:         { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    planning:    { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    discounts:   { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    reports:     { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    tasks:       { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    collections: { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    users:       { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
  },
};

// ─── Create App User ──────────────────────────────────────────────────────────
export async function createAppUser(data: {
  name: string;
  username: string;
  password: string;
  role: "sales_engineer" | "sales_specialist" | "admin_sales" | "manager";
  engineerId?: number;
}): Promise<AppUser> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const passwordHash = await bcrypt.hash(data.password, 10);
  const [result] = await db.insert(appUsers).values({
    name: data.name,
    username: data.username.toLowerCase().trim(),
    passwordHash,
    role: data.role,
    engineerId: data.engineerId ?? null,
    status: "active",
  });
  const userId = (result as any).insertId as number;
  // إنشاء الصلاحيات الافتراضية حسب الدور
  await createDefaultPermissions(userId, data.role);
  const [user] = await db.select().from(appUsers).where(eq(appUsers.id, userId));
  return user;
}

// ─── Create Default Permissions ──────────────────────────────────────────────
export async function createDefaultPermissions(
  userId: number,
  role: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? DEFAULT_ROLE_PERMISSIONS.sales_engineer;
  const modules = Object.keys(defaults) as Array<keyof typeof defaults>;
  for (const module of modules) {
    const perm = defaults[module];
    await db.insert(userPermissions).values({
      userId,
      module: module as any,
      canView: perm.canView,
      canAdd: perm.canAdd,
      canEdit: perm.canEdit,
      canDelete: perm.canDelete,
      dataScope: perm.dataScope,
    });
  }
}
// ─── Login App User ────────────────────────────────────────────────────────────────
export async function loginAppUser(
  username: string,
  password: string
): Promise<{ user: AppUser; token: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db
    .select()
    .from(appUsers)
    .where(and(
      eq(appUsers.username, username.toLowerCase().trim()),
      eq(appUsers.status, "active")
    ));
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  // تحديث lastLoginAt
  await db.update(appUsers).set({ lastLoginAt: new Date() }).where(eq(appUsers.id, user.id));  // إنشاء JWT token
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "fallback-secret");
  const token = await new SignJWT({
    sub: String(user.id),
    username: user.username,
    role: user.role,
    name: user.name,
    engineerId: user.engineerId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  return { user, token };
}

// ─── Verify JWT Token ─────────────────────────────────────────────────────────
export async function verifyAppUserToken(token: string): Promise<{
  id: number;
  username: string;
  role: string;
  name: string;
  engineerId: number | null;
} | null> {
  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    return {
      id: parseInt(payload.sub as string),
      username: payload.username as string,
      role: payload.role as string,
      name: payload.name as string,
      engineerId: payload.engineerId as number | null,
    };
  } catch {
    return null;
  }
}
// ─── Get App Users List ────────────────────────────────────────────────────────────────
export async function getAppUsers(): Promise<AppUser[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(appUsers)
    .where(eq(appUsers.status, "active"))
    .orderBy(appUsers.createdAt);
}
// ─── Get User Permissions ────────────────────────────────────────────────────────────────
export async function getUserPermissions(userId: number): Promise<UserPermission[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));
}
// ─── Update User Permissions ──────────────────────────────────────────────────
export async function updateUserPermissions(
  userId: number,
  permissions: Array<{
    module: string;
    canView: number;
    canAdd: number;
    canEdit: number;
    canDelete: number;
    dataScope: "own" | "all";
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // حذف الصلاحيات القديمة وإعادة إنشائها
  await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
  for (const perm of permissions) {
    await db.insert(userPermissions).values({
      userId,
      module: perm.module as any,
      canView: perm.canView,
      canAdd: perm.canAdd,
      canEdit: perm.canEdit,
      canDelete: perm.canDelete,
      dataScope: perm.dataScope,
    });
  }
}

// ─── Update App User ──────────────────────────────────────────────────────────
export async function updateAppUser(
  userId: number,
  data: Partial<{
    name: string;
    role: "sales_engineer" | "sales_specialist" | "admin_sales" | "manager";
    engineerId: number | null;
    status: "active" | "inactive";
    password: string;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateData: Partial<InsertAppUser> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.engineerId !== undefined) updateData.engineerId = data.engineerId;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }
  if (Object.keys(updateData).length > 0) {
    await db.update(appUsers).set(updateData).where(eq(appUsers.id, userId));
  }
}

// ─── Log Activity ─────────────────────────────────────────────────────────────
export async function logActivity(data: {
  userId: number;
  action: "login" | "logout" | "create" | "update" | "delete" | "view" | "export" | "permission_change";
  module?: string;
  recordId?: number;
  details?: string;
  ipAddress?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLogs).values({
    userId: data.userId,
    action: data.action,
    module: data.module,
    recordId: data.recordId,
    details: data.details,
    ipAddress: data.ipAddress,
  });
}

// ─── Get Activity Logs ────────────────────────────────────────────────────────
export async function getActivityLogs(filters?: {
  userId?: number;
  module?: string;
  limit?: number;
}): Promise<typeof activityLogs.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.userId) conditions.push(eq(activityLogs.userId, filters.userId));
  if (filters?.module) conditions.push(eq(activityLogs.module, filters.module));
  const query = db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(filters?.limit ?? 100);
  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

// ═══════════════════════════════════════════════════════════════════════
// Role Permissions - Dynamic Permissions System
// ═══════════════════════════════════════════════════════════════════════

/** جلب كل صلاحيات Role معين */
export async function getRolePermissions(role: string): Promise<RolePermission[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
}

/** جلب كل الصلاحيات لكل الـ Roles (للـ Matrix) */
export async function getAllRolePermissions(): Promise<RolePermission[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rolePermissions).orderBy(rolePermissions.role, rolePermissions.module);
}

/** تحديث صلاحية محددة لـ Role + Module */
export async function updateRolePermission(
  role: string,
  module: string,
  data: {
    canView?: number;
    canAdd?: number;
    canEdit?: number;
    canDelete?: number;
    dataScope?: "own" | "team" | "all";
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Check if exists
  const [existing] = await db
    .select()
    .from(rolePermissions)
    .where(and(eq(rolePermissions.role, role), eq(rolePermissions.module, module)));
  if (existing) {
    await db
      .update(rolePermissions)
      .set(data)
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.module, module)));
  } else {
    await db.insert(rolePermissions).values({
      role,
      module,
      canView: data.canView ?? 0,
      canAdd: data.canAdd ?? 0,
      canEdit: data.canEdit ?? 0,
      canDelete: data.canDelete ?? 0,
      dataScope: data.dataScope ?? "own",
    });
  }
}

/** تحديث صلاحيات Role كاملة دفعة واحدة */
export async function updateAllRolePermissions(
  role: string,
  permissions: Array<{
    module: string;
    canView: number;
    canAdd: number;
    canEdit: number;
    canDelete: number;
    dataScope: "own" | "team" | "all";
  }>
): Promise<void> {
  for (const perm of permissions) {
    await updateRolePermission(role, perm.module, perm);
  }
}

/** جلب صلاحية مستخدم لـ module معين (من role_permissions) */
export async function getRoleModulePermission(
  role: string,
  module: string
): Promise<RolePermission | null> {
  const db = await getDb();
  if (!db) return null;
  const [perm] = await db
    .select()
    .from(rolePermissions)
    .where(and(eq(rolePermissions.role, role), eq(rolePermissions.module, module)));
  return perm ?? null;
}

/** الـ Modules الكاملة في النظام */
export const SYSTEM_MODULES = [
  { key: "overview",        label: "نظرة عامة" },
  { key: "tasks",           label: "المهام اليومية" },
  { key: "crm",             label: "العملاء المحتملون" },
  { key: "visits",          label: "المعاينات" },
  { key: "closing",         label: "الإغلاق والتفاوض" },
  { key: "sales",           label: "المبيعات" },
  { key: "kpi",             label: "مؤشرات الأداء" },
  { key: "collections",     label: "التحصيل المالي" },
  { key: "planning",        label: "تخطيط الأهداف" },
  { key: "reports",         label: "التقارير" },
  { key: "sales_execution", label: "تنفيذ المبيعات" },
  { key: "promotion",       label: "التقييم والترقية" },
  { key: "users",           label: "إدارة المستخدمين" },
  { key: "permissions",     label: "لوحة الصلاحيات" },
] as const;

/** الـ Roles الكاملة في النظام */
export const SYSTEM_ROLES = [
  { key: "manager",         label: "مدير / CEO" },
  { key: "admin_sales",     label: "Admin Sales" },
  { key: "sales_engineer",  label: "مهندس مبيعات" },
  { key: "sales_specialist",label: "أخصائي مبيعات" },
] as const;
