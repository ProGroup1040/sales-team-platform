import { randomUUID } from "node:crypto";
import { z } from "zod";
import { SignJWT } from "jose";
import { COOKIE_NAME, LOCAL_AUTH_COOKIE, ONE_YEAR_MS } from "@shared/const";
import { localLogin, getLocalSessionFromRequest } from "./localAuth";
import { getSessionCookieOptions } from "./_core/cookies";
import { assertLoginAttemptAllowed, clearLoginAttempts, LoginRateLimitError, recordFailedLoginAttempt } from "./_core/loginRateLimit";
import { systemRouter } from "./_core/systemRouter";
import { getRequestCookie, setResponseCookie, clearResponseCookie } from "./_core/httpCookies";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getWebPushPublicKey, savePushSubscription, removePushSubscription } from "./pushNotifications";
import { resolveUserPermissions } from "./permissionResolution";
import {
  getEngineers, getEngineerById, updateEngineerProfile, createEngineer,
  getDailyTasksStats, getTasksList, createTask, updateTaskStatus, rescheduleTask,
  getCriticalTasks, getEngineersWithRole, createEngineerWithRole, deleteEngineer,
  getLeadsStats, getLeadsList, createLead, updateLeadStatus,
  getVisitsStats, getVisitsList, createVisit, updateVisitStatus, updateVisitFull,
  getDealsStats, getDealsList, createDeal, updateDealStage,
  getMonthlySalesStats, getMonthlySalesTrend,
  getEngineersKPI,
  getCollectionsStats, getCollectionsList, createCollection, updateCollection,
  getAdminSalesTasks, updateAdminSalesTaskStatus, createAdminSalesTask, updateAdminSalesTaskFull, getOrCreateWeekMeeting, updateWeekMeeting, getAdminSalesStats,
  logLeadFollowup, getLeadFollowupLogs, getAdminSalesFollowupKPI, getTelesalesFollowupKPI, getAllTelesalesFollowupStats,
  getMonthlyTarget, upsertMonthlyTarget,
  getSalesControlStats, getEngineersSalesPerformance,
  getDiscountTiers, upsertDiscountTier, deleteDiscountTier,
  getCommissionTiers, upsertCommissionTier, deleteCommissionTier,
  upsertEngineerTarget,
  upsertEngineerOperationalTargets,
  isSeeded,
  getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer,
  getProducts, getProductById, createProduct, updateProduct, deleteProduct, getProductCategories,
  getSales, getSaleById, createSale, updateSaleStatus, deleteSale,
  getAllCollectionsWithSummary, getCollectionAccessById, getPaymentPromiseAccessById, addPayment, addPaymentPromise, updatePromiseStatus,
  setPaymentPromiseConfirmation, setFinancialCashBalance, addFinancialCommitment,
  settleFinancialCommitment, cancelFinancialCommitment, getFinancialCommitments,
  getFinancialLiquidityDashboard,
  getDailyFollowUpList, getEngineersCollectionCommission, markCommissionPaid,
  addCollection, updateCollectionStatus, calcProgressiveCommission,
  autoCreateContractFromDeal, addPaymentWithFollowUp, getCollectionBasedCommission,
  getCollectionDashboard, getCollectionAlerts, getCollectionsWithCommission,
  getClientFinancialProfile,
  getManagementFocus,
  submitMeetingRecordingLink, upsertMeetingReview, getMeetingReview, getEngineerClosingQualityScore,
  softDeleteVisit, getVisitsDebt, getVisitsAlerts, getVisitsDailyTracking, getVisitsNeedingAction,
  updateVisitWithAdminTracking, getAdminSalesVisitsKPI, getEngineerVisitsKPI,
  softDeleteEngineer, softDeleteTask, softDeleteLead, softDeleteVisitFull, softDeleteDeal,
  getAuditLogs,
  upsertLeadDailyStats, getLeadDailyStatsList, getLeadSummaryStats,
  getDiscountSummary, validateDealDiscount, createDealWithDiscount, updateDealFull, getEngineerDiscountSummary,
  distributeDiscountToDeals, getDiscountSummaryForEngineer, calculateDiscountBonus, getDiscountBonusSummary, getDiscountDashboard, setDiscountBonusCap,
  getTeamCompositeDiscountScore, getEngineerCompositeDiscountScore, PERFORMANCE_DISCOUNT_TIERS,
  getLostDealsAnalysis, getTasksCalendarView, getAdminSalesCalendarView, LOST_REASON_LABELS,
  getEngineersTrend, getWeeklyReport,
  logWorkActivity, getWorkDistribution, getAllEngineersDistribution,
  getWeeklyDistribution, getCriticalInsights, getEngineerRankingFull,
  ACTIVITY_LABELS, WORK_DISTRIBUTION_TARGETS,
  getTasksFiltered, getTasksTimeSummary, checkTimeOverlap, getCriticalTasksEnhanced, getTasksForTimeline,
  getEngineerPerformanceReport, getWeeklyPerformanceAnalysis,
  STANDARD_DISTRIBUTION, TASK_TYPE_LABELS_V2,
  getOutputBasedKPI, getWeeklyPerformanceFull,
  getEngineerPipelineStats, getPipelineOverview, updateDiscountApproval, computeAndSaveDealBonus, getEngineerBonusSummary,
  generateCriticalInsightsV2, generateSmartSummary, generateBehaviorAlerts,
  getPlaybookItems, getPlaybookItemById, createPlaybookItem, updatePlaybookItem, deletePlaybookItem,
  importPlaybookItems, getPlaybookCategories,
  createPlaybookQuotation, getPlaybookQuotations, updatePlaybookRecordingLink, updatePlaybookQuotationStatus,
  getFunnelAnalysis, getMeetingReviewsList, getWeeklyCoachingSummary,
  createMeetingSession, endMeetingSession, logSessionAction,
  getSessionDetails, getEngineerMeetingStats, getAllMeetingSessionsAdmin,
  updateSessionRecordingLink, getEngineerWeeklyCoaching,
  getFullFunnelAnalysis, getEngineersFunnelComparison, getEngineerFunnelPlaybookInsights,
  autoCreateReviewTask, getMeetingTasksMissingRecording, getPendingMeetingReviews, getMeetingReviewAdminStats,
  isMeetingTaskType, validateMeetingTaskCompletion,
  // Promotion & Evaluation System
  createOrUpdateMeetingReview, getMeetingReviewByTask, getEngineerMeetingReviewSummary,
  getMeetingTasksPendingReview, createOrUpdateMonthlyEvaluation, getEngineerEvaluationHistory,
  getAllEngineersEvaluationDashboard, promoteEngineer, getOrCreateEngineerCareerLevel,
  getManagementDecisionDashboard, getEngineerPromotionProgress,
  getOperationalPerformance, getEnhancedRanking,
  autoCreateOrUpdateDealFromTask, addDealTimelineEntry, getDealTimeline,
  updateDealEngineer, reopenDeal, getSalesEngineers,
  // Department & Advanced Discount System
  DEPARTMENT_LABELS, SALES_DEPARTMENTS, ALLOWED_TASK_TYPES_BY_DEPARTMENT, filterByDepartment, isSalesDepartment,
  getAdvancedDiscountSummary, validateAdvancedDealDiscount, calcDealSavingBonus,
  calcScoreBasedDiscountDistribution,
  // Tele Sales & Site Engineer KPI
  getTeleSalesKPI, getSiteEngineersKPI,
  // Company Closing KPI + Reward System + Lost Deals Impact
  getCompanyClosingKPI, getTeamRewardStatus, getLostDealsImpact,
  getAdvancedDiscountDistribution, getAdminSalesKPI, getAdminSalesCategoryAnalysis,
  getEngineerOperationalTargets, getTeamPerformanceRanking,
  // Progressive Commission + KPI Share + Closing Rate Incentive
  calcProgressiveCommissionDetails,
  calcClosingRateIncentive, calcKPIShare, calcSalesIncentive,
  getEngineerEarningsBreakdown, getAllEngineersEarningsBreakdown,
  // Company Closing Incentive
  calcCompanyClosingBonus, getCompanyClosingBonusForAllEngineers,
  // Planning Module
  getCompanyGoal, setCompanyGoal, getCompanyGoalProgress,
  getEngineerPersonalGoals, setPersonalGoal, calcPersonalScore,
  calcTotalPerformanceScore, getAllEngineersPerformanceScores,
  // Activity Types Integration
  getEngineerActualCounts, calcOperationalScoreFromTasks, getEngineerActivitySummary,
  // Internal App Users System
  createAppUser, loginAppUser, verifyAppUserToken, getAppUsers, getAppUserById, getAppUserByEngineerId, getUserPermissions,
  updateUserPermissions, updateAppUser, logActivity, getActivityLogs,
  DEFAULT_ROLE_PERMISSIONS,
  getRolePermissions, getAllRolePermissions, updateRolePermission, updateAllRolePermissions,
  getSectionPermissions, getAllSectionPermissions, updateSectionPermission, bulkUpdateSectionPermissions, MODULE_SECTIONS,
  SYSTEM_MODULES, SYSTEM_ROLES,
  // Auto Distribution Engine
  calcAutoDistribution, applyAutoDistribution, manualOverrideEngineerTarget, getEngineerFullTarget,
  // User Management
  listEngineersWithAccountStatus, bulkCreateEngineersAccounts, changeEngineerPassword,
  resetEngineerPassword, toggleEngineerAccountStatus, createEngineerAccount,
  // Accounting Month
  setDealAccountingMonth, getDb,
  getCollectionPeriodAnalysis,
  // Deal Tasks (Next Step → Task System)
  createDealTask, getOverdueDealTasks, getPendingDealTasks, markDealTaskDone,
  getFollowupKPI, getFollowupComplianceReport,
  // Project Timeline Control System
  PROJECT_DELAY_OWNERS, PROJECT_STATUS_META,
  getProjectTimelineConfig, getProjectTimelineList, getProjectTimelineDashboard, getProjectTimelineAnalytics, importHistoricalProjectTimeline,
  getProjectTimelineDetail, syncProjectsFromClosedDeals, transitionProjectStage,
  addProjectDelay, updateProjectReview, setProjectHold, updateProjectStageConfig, updateProjectPreExecution, startProjectExecution, closeProject,
} from "./db";
import { ACTIVITY_KEYS, ACTIVITY_LABELS as ACT_LABELS_EN, ACTIVITY_LABELS_AR, ACTIVITY_WEIGHTS, ACTIVITY_ICONS, ACTIVITY_COLORS } from '../shared/activityTypes';
import { canAccessAssignedCollection, canAssignUserRole, canManageEngineerAccount, canManageFinancials, canManagePrivilegedRoles, canManageUsers, MIN_ACCOUNT_PASSWORD_LENGTH } from '../shared/authorization';
import { assertTaskEngineerMatch, getEngineersForScope, scopedEngineerId, type OperationalScopeAccess } from "./dataScope";

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
    { name: 'فاطمة الزهراني', email: 'fatima@company.com', phone: '0504567890', department: 'sales_engineer' as const, status: 'active' as const },
    { name: 'خالد العتيبي', email: 'khalid@company.com', phone: '0505678901', department: 'sales_engineer' as const, status: 'active' as const },
    { name: 'نورة القحطاني', email: 'noura@company.com', phone: '0506789012', department: 'sales_specialist' as const, status: 'active' as const },
  ];
  await db.insert(engineers).values(engData as any[]).onDuplicateKeyUpdate({ set: { name: sql`VALUES(name)` } });
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
// ─── Helper: get admin/manager caller from either local_session or app_user_token ─
export async function getAdminCallerFromRequest(req: any): Promise<{ id: number; role: string; name: string; engineerId: number | null } | null> {
  // Try app_user_token first
  const appToken = req ? getRequestCookie(req, "app_user_token") : undefined;
  if (appToken) {
    const caller = await verifyAppUserToken(appToken);
    if (caller) return { id: caller.id, role: caller.role, name: caller.name, engineerId: caller.engineerId };
  }
  // Fallback to local_session (engineers table)
  const localSession = await getLocalSessionFromRequest(req);
  if (localSession) {
    // Map local session roles to app user roles
    const roleMap: Record<string, string> = {
      admin: 'admin',
      manager: 'manager',
      admin_sales: 'admin_sales',
      engineer: 'sales_engineer',
      sales_engineer: 'sales_engineer',
      sales_specialist: 'sales_specialist',
    };
    return {
      id: localSession.engineerId,
      role: roleMap[localSession.role] ?? localSession.role,
      name: localSession.name,
      engineerId: localSession.engineerId,
    };
  }
  return null;
}

async function getCallerFromContext(ctx: any): Promise<{ id: number; role: string; name: string; engineerId: number | null } | null> {
  if (ctx?.actor) return { id: ctx.actor.id, role: ctx.actor.role, name: ctx.actor.name, engineerId: ctx.actor.engineerId ?? null };
  if (ctx?.user?.role === "admin") {
    return { id: ctx.user.id, role: "admin", name: ctx.user.name ?? ctx.user.email ?? "Admin", engineerId: null };
  }
  return ctx?.req ? getAdminCallerFromRequest(ctx.req) : null;
}

type TaskAction = "view" | "add" | "edit" | "delete";
const TASK_ROLE_ALIASES: Record<string, string> = {
  engineer: "sales_engineer",
  sales_engineer: "sales_engineer",
  sales_specialist: "sales_specialist",
  admin_sales: "admin_sales",
  manager: "manager",
  admin: "admin",
};
type TaskAccess = {
  caller: { id: number; role: string; name: string; engineerId: number | null };
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  scope: "own" | "team" | "all";
};

const taskTimeSchema = z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/, "الوقت يجب أن يكون بصيغة HH:MM");
function assertTaskTimeRange(startTime?: string, endTime?: string) {
  if (startTime === undefined && endTime === undefined) return;
  if (!startTime || !endTime || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(startTime) || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(endTime)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "يجب إدخال وقت بداية ونهاية صحيحين" });
  }
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "وقت النهاية يجب أن يكون بعد وقت البداية" });
  }
}

async function assertFollowUpAllowedForEngineer(engineerId: number, taskType?: string) {
  if (!taskType || taskType === "other") return;
  const engineer = await getEngineerById(engineerId);
  const department = engineer?.department ?? engineer?.role ?? "sales_engineer";
  const allowed = ALLOWED_TASK_TYPES_BY_DEPARTMENT[department as keyof typeof ALLOWED_TASK_TYPES_BY_DEPARTMENT];
  const constrainedTypes = new Set(Object.values(ALLOWED_TASK_TYPES_BY_DEPARTMENT).flat());
  if (allowed && constrainedTypes.has(taskType) && !allowed.includes(taskType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `نوع المهمة ${taskType === "follow_up" ? "Follow Up" : taskType} غير مسموح لقسم ${department}` });
  }
}

type ScopePermissionAction = "canView" | "canAdd" | "canEdit" | "canDelete";

async function getOperationalScopeAccess(
  ctx: any,
  module: string,
  requiredAction: ScopePermissionAction = "canView",
): Promise<OperationalScopeAccess> {
  const caller = await getCallerFromContext(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });

  const linkedAppUser = caller.engineerId ? await getAppUserByEngineerId(caller.engineerId) : null;
  const permissionUserId = ctx?.actor?.source === "app_user" ? caller.id : linkedAppUser?.id;
  const permission = permissionUserId
    ? (await getUserPermissions(permissionUserId)).find((item) => item.module === module)
    : undefined;
  if (!permission || permission[requiredAction] !== 1) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا توجد صلاحية مخصصة لهذه العملية في الوحدة" });
  }

  return {
    caller,
    scope: permission.dataScope === "all" ? "all" : "own",
  };
}

async function requireAllScope(
  ctx: any,
  module: string,
  action: ScopePermissionAction = "canView",
) {
  const access = await getOperationalScopeAccess(ctx, module, action);
  if (access.scope !== "all") {
    throw new TRPCError({ code: "FORBIDDEN", message: "هذه البيانات تتطلب نطاق الصلاحية all" });
  }
  return access;
}

async function requireVisitRecordScope(
  ctx: any,
  visitId: number,
  action: ScopePermissionAction,
) {
  const access = await getOperationalScopeAccess(ctx, "visits", action);
  if (access.scope === "all") return access;
  if (!access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يوجد مهندس مرتبط بهذا الحساب" });
  }
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const { visits } = await import("../drizzle/schema");
  const { and, eq } = await import("drizzle-orm");
  const [visit] = await db.select({ engineerId: visits.engineerId }).from(visits).where(and(
    eq(visits.id, visitId),
    eq(visits.isDeleted, 0),
  )).limit(1);
  if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "المعاينة غير موجودة" });
  if (visit.engineerId !== access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى معاينة مستخدم آخر" });
  }
  return access;
}

async function requireLeadRecordScope(
  ctx: any,
  leadId: number,
  action: ScopePermissionAction,
) {
  const access = await getOperationalScopeAccess(ctx, "crm", action);
  if (access.scope === "all") return access;
  if (!access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يوجد مهندس مرتبط بهذا الحساب" });
  }
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const { leads } = await import("../drizzle/schema");
  const { and, eq } = await import("drizzle-orm");
  const [lead] = await db.select({ assignedEngineerId: leads.assignedEngineerId }).from(leads).where(and(
    eq(leads.id, leadId),
    eq(leads.isDeleted, 0),
  )).limit(1);
  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل المحتمل غير موجود" });
  if (lead.assignedEngineerId !== access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى عميل محتمل غير مخصص لك" });
  }
  return access;
}

async function requireDealRecordScope(
  ctx: any,
  dealId: number,
  action: "canView" | "canEdit" | "canDelete",
) {
  const access = await getOperationalScopeAccess(ctx, "closing", action);
  if (access.scope === "all") return access;
  if (!access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يوجد مهندس مرتبط بهذا الحساب" });
  }
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const { deals } = await import("../drizzle/schema");
  const { and, eq } = await import("drizzle-orm");
  const [deal] = await db.select({ engineerId: deals.engineerId }).from(deals).where(and(
    eq(deals.id, dealId),
    eq(deals.isDeleted, 0),
  )).limit(1);
  if (!deal) throw new TRPCError({ code: "NOT_FOUND", message: "الصفقة غير موجودة" });
  if (deal.engineerId !== access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى صفقة مستخدم آخر" });
  }
  return access;
}

async function requireDealTaskRecordScope(
  ctx: any,
  taskId: number,
  action: "canView" | "canEdit" | "canDelete",
) {
  const access = await getOperationalScopeAccess(ctx, "closing", action);
  if (access.scope === "all") return access;
  if (!access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يوجد مهندس مرتبط بهذا الحساب" });
  }
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const { dealTasks } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const [task] = await db.select({ engineerId: dealTasks.engineerId, dealId: dealTasks.dealId })
    .from(dealTasks).where(eq(dealTasks.id, taskId)).limit(1);
  if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "مهمة الصفقة غير موجودة" });
  if (task.engineerId !== access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى مهمة صفقة مستخدم آخر" });
  }
  await requireDealRecordScope(ctx, task.dealId, action);
  return access;
}

async function requireMeetingSessionScope(
  ctx: any,
  sessionId: number,
  action: ScopePermissionAction,
) {
  const access = await getOperationalScopeAccess(ctx, "tasks", action);
  if (access.scope === "all") return access;
  if (!access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يوجد مهندس مرتبط بهذا الحساب" });
  }
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const { meetingSessions } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const [session] = await db.select({ engineerId: meetingSessions.engineerId })
    .from(meetingSessions).where(eq(meetingSessions.id, sessionId)).limit(1);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة" });
  if (session.engineerId !== access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى جلسة مستخدم آخر" });
  }
  return access;
}

async function requirePlaybookQuotationScope(
  ctx: any,
  quotationId: number,
  action: "canView" | "canEdit" | "canDelete",
) {
  const access = await getOperationalScopeAccess(ctx, "pricing_system", action);
  if (access.scope === "all") return access;
  if (!access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يوجد مهندس مرتبط بهذا الحساب" });
  }
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const { playbookQuotations } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const [quotation] = await db.select({ engineerId: playbookQuotations.engineerId })
    .from(playbookQuotations).where(eq(playbookQuotations.id, quotationId)).limit(1);
  if (!quotation) throw new TRPCError({ code: "NOT_FOUND", message: "عرض السعر غير موجود" });
  if (quotation.engineerId !== access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى عرض سعر مستخدم آخر" });
  }
  return access;
}








async function getTaskAccess(ctx: any): Promise<TaskAccess> {
  const caller = await getCallerFromContext(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
  const linkedAppUser = caller.engineerId ? await getAppUserByEngineerId(caller.engineerId) : null;
  const permissionUserId = ctx?.actor?.source === "app_user" ? caller.id : linkedAppUser?.id;
  const direct = permissionUserId
    ? (await getUserPermissions(permissionUserId)).find((p) => p.module === "tasks")
    : undefined;
  // Operational access comes only from the explicit user row. Role defaults
  // remain configuration data and cannot grant task access at runtime.
  const configured = direct;
  const configuredScope = direct?.dataScope;
  return {
    caller,
    canView: configured?.canView === 1,
    canAdd: configured?.canAdd === 1,
    canEdit: configured?.canEdit === 1,
    canDelete: configured?.canDelete === 1,
    scope: configuredScope === "all" ? "all" : "own",
  };
}

async function requireTaskAction(ctx: any, action: TaskAction, taskId?: number) {
  const access = await getTaskAccess(ctx);
  const allowed = action === "view" ? access.canView : action === "add" ? access.canAdd : action === "edit" ? access.canEdit : access.canDelete;
  if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تنفيذ هذه العملية على المهام" });
  if (taskId !== undefined && access.scope !== "all") {
    const db = await getDb();
    const { dailyTasks } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const [task] = db ? await db.select({ engineerId: dailyTasks.engineerId }).from(dailyTasks).where(eq(dailyTasks.id, taskId)).limit(1) : [];
    if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "المهمة غير موجودة" });
    if (!access.caller.engineerId || task.engineerId !== access.caller.engineerId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى مهمة مستخدم آخر" });
    }
  }
  return access;
}

function taskEngineerFilter(access: TaskAccess, requestedEngineerId?: number) {
  // Team membership is not modeled yet; fail closed instead of exposing all rows.
  if (access.scope === "all") return requestedEngineerId;
  if (!access.caller.engineerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "صلاحية المهام لهذا الحساب محددة على own لكن الحساب غير مرتبط بمهندس. اربط الحساب بمهندس أو غيّر نطاق صلاحية المهام إلى all إذا كان ذلك مصرحًا.",
    });
  }
  return access.caller.engineerId;
}

async function requireUserManagementCaller(ctx: any, message: string) {
  const caller = await getCallerFromContext(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
  if (!canManageUsers(caller.role)) throw new TRPCError({ code: "FORBIDDEN", message });
  return caller;
}

async function requirePrivilegedRoleManagementCaller(ctx: any, message: string) {
  const caller = await getCallerFromContext(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
  if (!canManagePrivilegedRoles(caller.role)) throw new TRPCError({ code: "FORBIDDEN", message });
  return caller;
}

async function requireAdminSalesTaskCaller(
  ctx: any,
  engineerId?: number,
  taskId?: number,
  action: ScopePermissionAction = "canView",
) {
  const caller = await getCallerFromContext(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
  const scopeAccess = await getOperationalScopeAccess(ctx, "tasks", action);
  if (!["admin", "manager", "admin_sales"].includes(caller.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "مهام Admin Sales متاحة للإدارة أو حساب Admin Sales المرتبط فقط" });
  }
  if (caller.role === "admin_sales" && !caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "حساب Admin Sales غير مرتبط بمهندس" });
  }
  let targetEngineerId = engineerId;
  if (taskId !== undefined) {
    const db = await getDb();
    const { adminSalesTasks } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const [task] = db ? await db.select({ engineerId: adminSalesTasks.engineerId }).from(adminSalesTasks).where(eq(adminSalesTasks.id, taskId)).limit(1) : [];
    if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "المهمة غير موجودة" });
    targetEngineerId = task.engineerId;
  }
  if (scopeAccess.scope === "own" && (!caller.engineerId || targetEngineerId !== caller.engineerId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى مهام خارج نطاقك" });
  }
  if (caller.role === "admin_sales" && targetEngineerId !== undefined && targetEngineerId !== caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى مهام Admin Sales لمستخدم آخر" });
  }
  return caller;
}

async function requireAdminSalesMeetingCaller(
  ctx: any,
  meetingId: number,
  action: ScopePermissionAction = "canEdit",
) {
  const caller = await getCallerFromContext(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
  const scopeAccess = await getOperationalScopeAccess(ctx, "tasks", action);
  if (!["admin", "manager", "admin_sales"].includes(caller.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "سجل الاجتماعات متاح للإدارة أو Admin Sales المرتبط فقط" });
  }
  if (caller.role === "admin_sales" && !caller.engineerId) throw new TRPCError({ code: "FORBIDDEN", message: "حساب Admin Sales غير مرتبط بمهندس" });
  const db = await getDb();
  const { adminSalesMeetings } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const [meeting] = db ? await db.select({ engineerId: adminSalesMeetings.engineerId }).from(adminSalesMeetings).where(eq(adminSalesMeetings.id, meetingId)).limit(1) : [];
  if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "سجل الاجتماع غير موجود" });
  if (scopeAccess.scope === "own" && (!caller.engineerId || meeting.engineerId !== caller.engineerId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك تعديل سجل خارج نطاقك" });
  }
  if (caller.role === "admin_sales" && meeting.engineerId !== caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك تعديل سجل مستخدم آخر" });
  }
  return caller;
}

async function requireMeetingReviewManager(ctx: any, taskId: number, action: TaskAction = "view") {
  const caller = await getCallerFromContext(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
  if (!["admin", "manager", "admin_sales"].includes(caller.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "مراجعات الاجتماعات متاحة للإدارة فقط" });
  }
  await requireTaskAction(ctx, action, taskId);
  return caller;
}

function assertCanAssignRole(actorRole: string, targetRole: string | undefined) {
  if (targetRole !== undefined && !canAssignUserRole(actorRole, targetRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية تعيين هذا الدور" });
  }
}
const ENGINEER_LINK_REQUIRED_ROLES = new Set(["sales_engineer", "sales_specialist", "admin_sales"]);

async function validateAppUserEngineerLink(userId: number | undefined, role: string, engineerId: number | null | undefined) {
  if (ENGINEER_LINK_REQUIRED_ROLES.has(role) && !engineerId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "يجب ربط هذا المستخدم بحساب مهندس قبل تفعيل صلاحيات التشغيل" });
  }
  if (!engineerId) return;
  const engineer = await getEngineerById(engineerId);
  if (!engineer || engineer.isDeleted || engineer.status !== "active") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "حساب المهندس غير موجود أو غير نشط" });
  }
  const linkedUser = await getAppUserByEngineerId(engineerId);
  if (linkedUser && linkedUser.id !== userId) {
    throw new TRPCError({ code: "CONFLICT", message: "هذا المهندس مرتبط بالفعل بمستخدم نظام آخر" });
  }
}
async function requireEngineerAccountManagementCaller(ctx: any, engineerId: number, message: string) {
  const caller = await requireUserManagementCaller(ctx, message);
  const target = await getEngineerById(engineerId);
  if (!target || target.isDeleted) {
    throw new TRPCError({ code: "NOT_FOUND", message: "حساب المهندس غير موجود" });
  }
  if (!canManageEngineerAccount(caller.role, target.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية إدارة هذا الحساب" });
  }
  return { caller, target };
}

async function requireFinancialManager(ctx: any, message: string) {
  const caller = await getCallerFromContext(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
  if (!canManageFinancials(caller.role)) throw new TRPCError({ code: "FORBIDDEN", message });
  return caller;
}

async function requireAccountingMonthManager(ctx: any) {
  const caller = await getCallerFromContext(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (!["admin", "manager"].includes(caller.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "تعديل شهر احتساب الصفقة متاح للمدير والمسؤول فقط" });
  }
  const access = await getOperationalScopeAccess(ctx, "closing", "canEdit");
  if (access.scope !== "all") {
    throw new TRPCError({ code: "FORBIDDEN", message: "تغيير شهر الاحتساب يتطلب نطاق الصلاحية all" });
  }
  return caller;
}

async function requireCollectionFinancialAccess(
  ctx: any,
  collectionId: number,
  message: string,
  action: ScopePermissionAction = "canView",
) {
  const caller = await getCallerFromContext(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
  const scopeAccess = await getOperationalScopeAccess(ctx, "collections", action);
  const collection = await getCollectionAccessById(collectionId);
  if (!collection) throw new TRPCError({ code: "NOT_FOUND", message: "العقد غير موجود" });
  if (scopeAccess.scope === "own" && (!caller.engineerId || collection.engineerId !== caller.engineerId)) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
  if (!canAccessAssignedCollection(caller.role, caller.engineerId, collection.engineerId)) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
  return {
    caller,
    collection,
    isFinancialManager: canManageFinancials(caller.role),
    scope: scopeAccess.scope,
  };
}

async function requirePromiseFinancialAccess(
  ctx: any,
  promiseId: number,
  message: string,
  action: ScopePermissionAction = "canView",
) {
  const promise = await getPaymentPromiseAccessById(promiseId);
  if (!promise) throw new TRPCError({ code: "NOT_FOUND", message: "وعد الدفع غير موجود" });
  return requireCollectionFinancialAccess(ctx, promise.collectionId, message, action);
}

const PROJECT_TIMELINE_MANAGER_ROLES = new Set(["manager", "admin", "admin_sales"]);
// local admin is represented as "manager" by getAdminCallerFromRequest.
const PROJECT_TIMELINE_EDIT_ROLES = new Set(["manager", "admin", "admin_sales"]);

export function canEditProjectTimeline(role: string | null | undefined) {
  return Boolean(role && PROJECT_TIMELINE_EDIT_ROLES.has(role));
}

export function canManageProjectTimeline(role: string | null | undefined) {
  return Boolean(role && PROJECT_TIMELINE_MANAGER_ROLES.has(role));
}

async function getProjectTimelineCaller(ctx: any): Promise<{ id: number; role: string; name: string } | null> {
  const caller = await getCallerFromContext(ctx);
  if (caller) {
    // App-user IDs and engineer IDs are different domains. Project ownership
    // is stored against engineer IDs, so normalize the ID before comparing.
    const engineerId = ctx?.actor?.source === "app_user" ? caller.engineerId : (caller.engineerId ?? caller.id);
    return { id: engineerId ?? 0, role: caller.role, name: caller.name };
  }
  if (ctx.user) return { id: 0, role: "manager", name: ctx.user.name ?? ctx.user.email ?? "Admin" };
  return null;
}

async function assertProjectTimelineAccess(ctx: any, projectId?: number, managerOnly = false) {
  const caller = await getProjectTimelineCaller(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "سجّل الدخول للوصول إلى تايم لاين المشاريع" });
  if (canManageProjectTimeline(caller.role)) return caller;
  if (managerOnly) throw new TRPCError({ code: "FORBIDDEN", message: "هذه العملية متاحة للإدارة فقط" });
  if (projectId !== undefined) {
    // Authorization prechecks must be read-only. getProjectTimelineDetail recalculates
    // and persists runtime fields, so calling it before ownership validation would
    // let a denied direct-ID request mutate another engineer's project.
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
    const { projects } = await import("../drizzle/schema");
    const [project] = await db.select({
      salesEngineerId: projects.salesEngineerId,
      currentResponsibleId: projects.currentResponsibleId,
    }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project || (project.salesEngineerId !== caller.id && project.currentResponsibleId !== caller.id)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية تعديل هذا المشروع" });
    }
  }
  return caller;
}

async function assertProjectTimelineEditAccess(ctx: any, projectId?: number) {
  const caller = await getProjectTimelineCaller(ctx);
  if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "سجّل الدخول لتعديل تايم لاين المشاريع" });
  if (!canEditProjectTimeline(caller.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "تعديل بيانات المشاريع متاح فقط لـ Admin وAdmin Sales" });
  }
  return caller;
}

async function requireProjectTimelineRecordScope(
  ctx: any,
  projectId: number,
  action: ScopePermissionAction,
) {
  const access = await getOperationalScopeAccess(ctx, "tasks", action);
  if (access.scope === "all") return access;
  const caller = await getCallerFromContext(ctx);
  const engineerId = ctx?.actor?.source === "app_user" ? caller?.engineerId : (caller?.engineerId ?? caller?.id);
  if (!engineerId) throw new TRPCError({ code: "FORBIDDEN", message: "لا يوجد مهندس مرتبط بهذا الحساب" });
  const detail = await getProjectTimelineDetail(projectId);
  const project = detail?.project;
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "المشروع غير موجود" });
  if (project.salesEngineerId !== engineerId && project.currentResponsibleId !== engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى مشروع خارج نطاقك" });
  }
  return access;
}
/**
 * Accept the Date produced by the normal superjson path and an ISO string as
 * a compatibility fallback. The fallback is intentional: if a deployment
 * ever misses the tRPC transformer, a valid datetime-local value must not be
 * converted to null before validation. Empty and invalid values still fail
 * validation because the final schema remains z.date().
 */
export const visitScheduledAtSchema = z.preprocess((value) => {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.trim() !== "") return new Date(value);
  return value;
}, z.date());

export const visitCreateInputSchema = z.object({
  engineerId: z.number(), clientName: z.string().min(1), clientPhone: z.string().optional(),
  address: z.string().optional(), scheduledAt: visitScheduledAtSchema, leadId: z.number().optional(), notes: z.string().optional(),
  assignedDelay: z.number().optional(),
  confirmationStatus: z.enum(['confirmed_same_day', 'confirmed_late', 'not_confirmed']).optional(),
  confirmationDelayHours: z.number().optional(),
  feeAmount: z.number().optional(), feeCollected: z.boolean().optional(),
});

export const appRouter = router({
  pricingSystemSso: router({
    issueLaunchToken: publicProcedure.mutation(async ({ ctx }) => {
      const secretText = "c9e6f14a72b08d3f5a1c9e4b6d2f8071a3c5e9b2d4f6087c1a5e3d9b7f2046c8";
      if (new TextEncoder().encode(secretText).length < 32) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تكامل التسعير غير مُعدّ على الخادم" });
      }

      const access = await getOperationalScopeAccess(ctx, "pricing_system", "canView");
      const can = async (action: ScopePermissionAction) => {
        try {
          await getOperationalScopeAccess(ctx, "pricing_system", action);
          return true;
        } catch (error) {
          if (error instanceof TRPCError && (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")) return false;
          throw error;
        }
      };
      const permissions = {
        canView: true,
        canAdd: await can("canAdd"),
        canEdit: await can("canEdit"),
        canDelete: await can("canDelete"),
      };
      const canManageSharedCatalog =
        access.scope === "all" &&
        ["manager", "admin_sales", "admin"].includes(access.caller.role);
      const catalogPermissions = {
        canView: true,
        // Shared catalog mutations must match the platform's financial-manager + all-scope rule.
        canAdd: canManageSharedCatalog && permissions.canAdd,
        canEdit: canManageSharedCatalog && permissions.canEdit,
        canDelete: canManageSharedCatalog && permissions.canDelete,
      };
      const token = await new SignJWT({
        displayName: access.caller.name,
        role: access.caller.role,
        engineerId: access.caller.engineerId,
        scope: access.scope,
        permissions,
        catalogPermissions,
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer("sales-team-platform")
        .setAudience("professor-kitchens")
        .setSubject(String(access.caller.id))
        .setIssuedAt()
        .setJti(randomUUID())
        .setExpirationTime("60s")
        .sign(new TextEncoder().encode(secretText));

      return { token, expiresInSeconds: 60 };
    }),
  }),
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      clearResponseCookie(ctx.res, COOKIE_NAME, cookieOptions);
      return { success: true } as const;
    }),
  }),
  // ── Seed ──────────────────────────────────────────────────────────────────────────────
  seed: router({
    isSeeded: protectedProcedure.query(async () => isSeeded()),
    run: adminProcedure.mutation(async () => {
      await seedData();
      return { success: true };
    }),
    reset: adminProcedure.mutation(async () => {
      if (process.env.NODE_ENV !== "development") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Seed reset is available only in development" });
      }
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
    list: protectedProcedure.query(async ({ ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "tasks");
      return getEngineersForScope(access, getEngineers, getEngineerById);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1), email: z.string().email().optional(),
      phone: z.string().optional(), department: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireUserManagementCaller(ctx, "إنشاء المهندسين متاح للإدارة فقط");
      await createEngineer(input);
      return { success: true };
    }),
  }),

  // ── Daily Tasks ───────────────────────────────────────────────────────────
  tasks: router({
    stats: protectedProcedure.input(z.object({ date: z.string() }))
      .query(async ({ input, ctx }) => {
        const access = await requireTaskAction(ctx, "view");
        return getDailyTasksStats(input.date, taskEngineerFilter(access));
      }),
    list: protectedProcedure.input(z.object({ date: z.string(), engineerId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await requireTaskAction(ctx, "view");
        return getTasksList(input.date, taskEngineerFilter(access, input.engineerId));
      }),
    create: protectedProcedure.input(z.object({
      engineerId: z.number(), taskDate: z.string(), title: z.string().min(1),
      description: z.string().optional(), plannedHours: z.number().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      category: z.string().optional(), // 'closing' | 'meeting' | 'general'
      meetingRecordingLink: z.string().optional(),
      taskType: z.enum(['design_2d','design_3d','render','quotation','meeting_modeling','meeting_presentation','meeting_closing','contract','work_order','follow_up','other']).optional(),
    })).mutation(async ({ input, ctx }) => {
      const access = await requireTaskAction(ctx, "add");
      const engineerId = taskEngineerFilter(access, input.engineerId);
      if (!engineerId) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب تحديد المهندس المسؤول عن المهمة" });
      await assertFollowUpAllowedForEngineer(engineerId, input.taskType);
      await createTask({ ...input, engineerId }); return { success: true };
    }),
    createMine: protectedProcedure.input(z.object({
      taskDate: z.string(), title: z.string().min(1),
      description: z.string().optional(), plannedHours: z.number().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      category: z.string().optional(),
      meetingRecordingLink: z.string().optional(),
      taskType: z.enum(['design_2d','design_3d','render','quotation','meeting_modeling','meeting_presentation','meeting_closing','contract','work_order','follow_up','other']).optional(),
    })).mutation(async ({ input, ctx }) => {
      const access = await requireTaskAction(ctx, "add");
      const engineerId = access.caller.engineerId;
      if (!engineerId) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يوجد مهندس مرتبط بهذا الحساب" });
      await assertFollowUpAllowedForEngineer(engineerId, input.taskType);
      await createTask({ ...input, engineerId });
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.number(), status: z.enum(['planned', 'completed', 'delayed', 'not_done', 'client_delay']),
      delayDays: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireTaskAction(ctx, "edit", input.id);
      return await updateTaskStatus(input.id, input.status, input.delayDays, input.notes);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']).optional(), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const access = await requireTaskAction(ctx, "delete", input.id);
        return await softDeleteTask(input.id, input.reason ?? "other", input.reasonCustom, access.caller.name || "user");
      }),
    reschedule: protectedProcedure.input(z.object({ id: z.number(), newDate: z.string() }))
      .mutation(async ({ input, ctx }) => { await requireTaskAction(ctx, "edit", input.id); await rescheduleTask(input.id, input.newDate); return { success: true }; }),
    critical: protectedProcedure.query(async ({ ctx }) => {
      const access = await requireTaskAction(ctx, "view");
      return getCriticalTasks(taskEngineerFilter(access));
    }),
    calendarView: protectedProcedure.input(z.object({ engineerId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await requireTaskAction(ctx, "view");
        return getTasksCalendarView(taskEngineerFilter(access, input.engineerId));
      }),
    // جلب مهام Admin Sales للتقويم الزمني
    calendarViewAdmin: protectedProcedure
      .input(z.object({ engineerId: z.number().optional(), month: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await requireTaskAction(ctx, "view");
        return getAdminSalesCalendarView(taskEngineerFilter(access, input.engineerId), input.month);
      }),
    engineers: protectedProcedure.query(async ({ ctx }) => {
      const access = await requireTaskAction(ctx, "view");
      if (access.scope === "all") return getEngineersWithRole();
      const engineer = access.caller.engineerId ? await getEngineerById(access.caller.engineerId) : null;
      return engineer ? [engineer] : [];
    }),
    createEngineer: protectedProcedure.input(z.object({
      name: z.string().min(1), email: z.string().optional(), phone: z.string().optional(),
      department: z.string().optional(), role: z.enum(['admin', 'engineer']).optional(),
      seniority: z.enum(['senior', 'junior']).optional(),
    })).mutation(async ({ input, ctx }) => { await requireUserManagementCaller(ctx, "إنشاء المهندسين متاح للإدارة فقط"); await createEngineerWithRole(input); return { success: true }; }),
    deleteEngineer: protectedProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => { await requireUserManagementCaller(ctx, "حذف المهندسين متاح للإدارة فقط"); await deleteEngineer(input.id); return { success: true }; }),
    updateEngineerProfile: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      department: z.string().optional(),
      role: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      seniority: z.enum(['senior', 'junior']).optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireUserManagementCaller(ctx, "تعديل ملفات المهندسين متاح للإدارة فقط");
      const { id, ...data } = input;
      await updateEngineerProfile(id, data);
      return { success: true };
    }),
    // ── New time-based endpoints ──
    filtered: protectedProcedure.input(z.object({
      dateRange: z.enum(['today', 'yesterday', 'week', 'month', 'custom']),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      engineerId: z.number().optional(),
      taskType: z.string().optional(),
      status: z.string().optional(),
    })).query(async ({ input, ctx }) => {
      const access = await requireTaskAction(ctx, "view");
      return getTasksFiltered({ ...input, engineerId: taskEngineerFilter(access, input.engineerId) });
    }),
    timeSummary: protectedProcedure.input(z.object({
      engineerId: z.number().optional(),
      dateFrom: z.string(),
      dateTo: z.string(),
    })).query(async ({ input, ctx }) => {
      const access = await requireTaskAction(ctx, "view");
      return getTasksTimeSummary({ ...input, engineerId: taskEngineerFilter(access, input.engineerId) });
    }),
    checkOverlap: protectedProcedure.input(z.object({
      engineerId: z.number(),
      taskDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      excludeTaskId: z.number().optional(),
    })).query(async ({ input, ctx }) => {
      const access = await requireTaskAction(ctx, "view");
      const engineerId = taskEngineerFilter(access, input.engineerId);
      if (!engineerId) throw new TRPCError({ code: "FORBIDDEN", message: "لا يوجد مهندس مرتبط بهذا الحساب" });
      return checkTimeOverlap({ ...input, engineerId });
    }),
    criticalEnhanced: protectedProcedure.query(async ({ ctx }) => {
      const access = await requireTaskAction(ctx, "view");
      return getCriticalTasksEnhanced(taskEngineerFilter(access));
    }),
    timeline: protectedProcedure.input(z.object({
      date: z.string(),
      engineerId: z.number().optional(),
    })).query(async ({ input, ctx }) => {
      const access = await requireTaskAction(ctx, "view");
      return getTasksForTimeline(input.date, taskEngineerFilter(access, input.engineerId));
    }),
    // Meeting Recording Rule endpoints
    submitRecording: protectedProcedure.input(z.object({
      taskId: z.number(),
      recordingLink: z.string().url(),
      engineerName: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireTaskAction(ctx, "edit", input.taskId);
      const { getDb } = await import('./db');
      const db = await getDb();
      if (!db) return { success: false };
      const { dailyTasks: dt } = await import('../drizzle/schema.js');
      const { and: andFn, eq: eqFn } = await import('drizzle-orm');
      // Update the task with recording link
      await db.update(dt).set({
        meetingRecordingLink: input.recordingLink,
        recordingSubmittedAt: new Date(),
      }).where(andFn(eqFn(dt.id, input.taskId), eqFn(dt.isDeleted, 0)));
      // Auto-create admin review task
      const [task] = await db.select().from(dt).where(andFn(eqFn(dt.id, input.taskId), eqFn(dt.isDeleted, 0))).limit(1);
      if (task) {
        await autoCreateReviewTask({
          meetingTaskId: input.taskId,
          engineerId: task.engineerId,
          engineerName: input.engineerName ?? 'مهندس',
          meetingDate: String(task.taskDate),
          recordingLink: input.recordingLink,
        });
      }
      return { success: true };
    }),
    missingRecordings: protectedProcedure.input(z.object({ engineerId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await requireTaskAction(ctx, "view");
        return getMeetingTasksMissingRecording(taskEngineerFilter(access, input.engineerId));
      }),
    pendingReviews: protectedProcedure.query(async ({ ctx }) => {
      const access = await requireTaskAction(ctx, "view");
      if (access.scope !== "all") throw new TRPCError({ code: "FORBIDDEN", message: "مراجعات الاجتماعات متاحة للإدارة فقط" });
      return getPendingMeetingReviews();
    }),
    reviewStats: protectedProcedure.query(async ({ ctx }) => {
      const access = await requireTaskAction(ctx, "view");
      if (access.scope !== "all") throw new TRPCError({ code: "FORBIDDEN", message: "إحصاءات المراجعات متاحة للإدارة فقط" });
      return getMeetingReviewAdminStats();
    }),
    createWithTime: protectedProcedure.input(z.object({
      engineerId: z.number(), taskDate: z.string(), title: z.string().min(1),
      description: z.string().optional(), plannedHours: z.number().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      category: z.string().optional(),
      meetingRecordingLink: z.string().optional(),
      startTime: taskTimeSchema.optional(),
      endTime: taskTimeSchema.optional(),
      taskType: z.enum(['design_2d','design_3d','render','quotation','meeting_modeling','meeting_presentation','meeting_closing','contract','work_order','meeting_2d','meeting_3d','meeting_quotation','closing','negotiation','follow_up','other']).optional(),
      clientName: z.string().optional(),
      notes: z.string().optional(),
      reminderMinutes: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const access = await requireTaskAction(ctx, "add");
      const engineerId = taskEngineerFilter(access, input.engineerId);
      if (!engineerId) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب تحديد المهندس المسؤول عن المهمة" });
      const { startTime, endTime, taskType, clientName, notes, reminderMinutes, ...rest } = input;
      assertTaskTimeRange(startTime, endTime);
      await assertFollowUpAllowedForEngineer(engineerId, taskType);
      // Check overlap if times provided
      if (startTime && endTime) {
        const overlap = await checkTimeOverlap({ engineerId, taskDate: input.taskDate, startTime, endTime });
        if (overlap.hasOverlap) {
          throw new Error(`تداخل زمني مع مهمة: ${overlap.conflictingTask?.title} (${overlap.conflictingTask?.startTime} - ${overlap.conflictingTask?.endTime})`);
        }
      }
      await createTask({ ...rest, engineerId, startTime, endTime, taskType, clientName, notes, reminderMinutes });
      return { success: true };
    }),
    // ─── Move Task (Drag & Drop) ─────────────────────────────────────────────────────────────────
    moveTask: protectedProcedure.input(z.object({
      id: z.number(),
      newDate: z.string().optional(),
      newStartTime: taskTimeSchema.optional(),
      newEndTime: taskTimeSchema.optional(),
      newEngineerId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const access = await requireTaskAction(ctx, "edit", input.id);
      const { id, newDate, newStartTime, newEndTime, newEngineerId } = input;
      const updates: Record<string, unknown> = {};
      assertTaskTimeRange(newStartTime, newEndTime);
      if (newStartTime && newEndTime) {
        const overlap = await checkTimeOverlap({ engineerId: newEngineerId ?? access.caller.engineerId ?? 0, taskDate: newDate ?? new Date().toISOString().slice(0, 10), startTime: newStartTime, endTime: newEndTime, excludeTaskId: id });
        if (overlap.hasOverlap) throw new TRPCError({ code: "CONFLICT", message: `تداخل زمني مع مهمة: ${overlap.conflictingTask?.title}` });
      }
      if (newDate) updates.taskDate = newDate;
      if (newStartTime !== undefined) updates.startTime = newStartTime;
      if (newEndTime !== undefined) updates.endTime = newEndTime;
      if (newEngineerId) {
        if (access.scope !== "all") throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك إعادة إسناد المهمة" });
        updates.engineerId = newEngineerId;
      }
      if (Object.keys(updates).length > 0) {
        const { getDb } = await import('./db');
        const { dailyTasks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return { success: false };
        await db.update(dailyTasks).set(updates).where(eq(dailyTasks.id, id));
      }
      return { success: true };
    }),
    // ─── Update Full Task (Edit from Calendar) ─────────────────────────────────────────────────────────
    updateFull: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      taskDate: z.string().optional(),
      startTime: taskTimeSchema.optional(),
      endTime: taskTimeSchema.optional(),
      taskType: z.enum(['design_2d','design_3d','render','quotation','meeting_modeling','meeting_presentation','meeting_closing','contract','work_order','meeting_2d','meeting_3d','meeting_quotation','closing','negotiation','follow_up','other']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      status: z.enum(['planned', 'completed', 'delayed', 'not_done', 'client_delay']).optional(),
      clientName: z.string().optional(),
      notes: z.string().optional(),
      reminderMinutes: z.number().optional(),
      engineerId: z.number().optional(),
      plannedHours: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const access = await requireTaskAction(ctx, "edit", input.id);
      const { id, ...updates } = input;
      if (updates.engineerId !== undefined && access.scope !== "all") {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك تغيير مالك المهمة" });
      }
      if (updates.taskType) {
        const { dailyTasks } = await import("../drizzle/schema");
        const db = await getDb();
        const [currentTask] = db ? await db.select({ engineerId: dailyTasks.engineerId }).from(dailyTasks).where(eq(dailyTasks.id, id)).limit(1) : [];
        const effectiveEngineerId = updates.engineerId ?? currentTask?.engineerId;
        if (!effectiveEngineerId) throw new TRPCError({ code: "NOT_FOUND", message: "المهمة غير موجودة" });
        await assertFollowUpAllowedForEngineer(effectiveEngineerId, updates.taskType);
      }
      assertTaskTimeRange(updates.startTime, updates.endTime);
      if (updates.startTime && updates.endTime) {
        const overlap = await checkTimeOverlap({
          engineerId: updates.engineerId ?? access.caller.engineerId ?? 0,
          taskDate: updates.taskDate ?? new Date().toISOString().slice(0, 10),
          startTime: updates.startTime,
          endTime: updates.endTime,
          excludeTaskId: id,
        });
        if (overlap.hasOverlap) throw new TRPCError({ code: "CONFLICT", message: `تداخل زمني مع مهمة: ${overlap.conflictingTask?.title}` });
      }
      const { status: requestedStatus, ...fieldUpdates } = updates;
      const cleanUpdates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fieldUpdates)) {
        if (v !== undefined) cleanUpdates[k] = v;
      }
      if (requestedStatus !== undefined) {
        const statusResult = await updateTaskStatus(id, requestedStatus);
        if (statusResult && statusResult.success === false) return statusResult;
      }
      if (Object.keys(cleanUpdates).length > 0) {
        const { getDb } = await import('./db');
        const { dailyTasks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return { success: false };
        await db.update(dailyTasks).set(cleanUpdates).where(eq(dailyTasks.id, id));
      }
      return { success: true };
    }),
  }),

  // ── Leads ─────────────────────────────────────────────────────────────────
  leads: router({
    stats: protectedProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "crm");
        return getLeadsStats(input.year, input.month, scopedEngineerId(access));
      }),
    list: protectedProcedure.input(z.object({ limit: z.number().optional(), offset: z.number().optional(), status: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "crm");
        return getLeadsList(input.limit, input.offset, input.status, scopedEngineerId(access));
      }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1), phone: z.string().optional(), email: z.string().optional(),
      source: z.string().optional(), assignedEngineerId: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "crm", "canAdd");
      await createLead({ ...input, assignedEngineerId: scopedEngineerId(access, input.assignedEngineerId) });
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.number(), status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted']),
      responseTimeMinutes: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireLeadRecordScope(ctx, input.id, "canEdit");
      await updateLeadStatus(input.id, input.status, input.responseTimeMinutes);
      return { success: true };
    }),
  }),

  // ── Visits ────────────────────────────────────────────────────────────────
  visits: router({
    stats: protectedProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "visits");
        return getVisitsStats(input.year, input.month, scopedEngineerId(access));
      }),
    list: protectedProcedure.input(z.object({
      limit: z.number().optional(), offset: z.number().optional(), status: z.string().optional(),
      year: z.number().optional(), month: z.number().optional(),
      filterType: z.enum(['booking', 'execution', 'upload', 'collection']).optional(),
      engineerId: z.number().optional(),
    })).query(async ({ input, ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "visits");
      return getVisitsList(
        input.limit, input.offset, input.status,
        input.year, input.month,
        input.filterType ?? 'booking',
        scopedEngineerId(access, input.engineerId)
      );
    }),
    create: protectedProcedure.input(visitCreateInputSchema)
      .mutation(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "visits", "canAdd");
        const engineerId = scopedEngineerId(access, input.engineerId);
        if (input.leadId !== undefined) await requireLeadRecordScope(ctx, input.leadId, "canView");
        await createVisit({ ...input, engineerId });
        return { success: true };
      }),
    updateStatus: protectedProcedure.input(z.object({
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
    })).mutation(async ({ input, ctx }) => {
      await requireVisitRecordScope(ctx, input.id, "canEdit");
      await updateVisitFull(input.id, input);
      return { success: true };
    }),
    // Extended endpoints
    updateFull: protectedProcedure.input(z.object({
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
    })).mutation(async ({ input, ctx }) => {
      await requireVisitRecordScope(ctx, input.id, "canEdit");
      const { id, ...data } = input;
      await updateVisitWithAdminTracking(id, data);
      return { success: true };
    }),
    softDelete: protectedProcedure.input(z.object({
      id: z.number(),
      reason: z.enum(['client_cancelled', 'postponed', 'data_entry_error']),
    })).mutation(async ({ input, ctx }) => {
      await requireVisitRecordScope(ctx, input.id, "canDelete");
      await softDeleteVisit(input.id, input.reason);
      return { success: true };
    }),
    debt: protectedProcedure.input(z.object({ year: z.number().optional(), month: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "visits");
        return getVisitsDebt(input?.year, input?.month, scopedEngineerId(access));
      }),
    alerts: protectedProcedure.input(z.object({ year: z.number().optional(), month: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "visits");
        return getVisitsAlerts(input?.year, input?.month, scopedEngineerId(access));
      }),
    dailyTracking: protectedProcedure.input(z.object({ date: z.string() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "visits");
        return getVisitsDailyTracking(input.date, scopedEngineerId(access));
      }),
    adminSalesKPI: protectedProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "visits");
        return getAdminSalesVisitsKPI(input.year, input.month, scopedEngineerId(access));
      }),
    engineerKPI: protectedProcedure.input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "visits");
        return getEngineerVisitsKPI(scopedEngineerId(access, input.engineerId), input.year, input.month);
      }),
    needingAction: protectedProcedure.input(z.object({ year: z.number().optional(), month: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "visits");
        return getVisitsNeedingAction(input?.year, input?.month, scopedEngineerId(access));
      }),
  }),

  // ── Closing / Deals ───────────────────────────────────────────────────────
  closing: router({
    stats: protectedProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing");
        return getDealsStats(input.year, input.month, scopedEngineerId(access));
      }),
    list: protectedProcedure.input(z.object({ limit: z.number().optional(), offset: z.number().optional(), stage: z.string().optional(), year: z.number().optional(), month: z.number().optional(), engineerId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing");
        return getDealsList(input.limit, input.offset, input.stage, input.year, input.month, scopedEngineerId(access, input.engineerId));
      }),
    create: protectedProcedure.input(z.object({
      engineerId: z.number(), clientName: z.string().min(1), value: z.number().positive(),
      visitId: z.number().optional(), leadId: z.number().optional(),
      nextAction: z.string().optional(), nextActionDate: z.string().optional(), notes: z.string().optional(),
      discountPercent: z.number().min(0).max(100).optional(),
      discountValue: z.number().min(0).optional(),
      discountNote: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "closing", "canAdd");
      const engineerId = scopedEngineerId(access, input.engineerId);
      if (input.visitId !== undefined) await requireVisitRecordScope(ctx, input.visitId, "canView");
      if (input.leadId !== undefined) await requireLeadRecordScope(ctx, input.leadId, "canView");
      await createDealWithDiscount({ ...input, engineerId });
      return { success: true };
    }),
    updateStage: protectedProcedure.input(z.object({
      id: z.number(), stage: z.enum(['proposal', 'negotiation', 'contract_sent', 'closed_won', 'closed_lost']).optional(),
      nextAction: z.string().optional(), nextActionDate: z.string().optional(), notes: z.string().optional(),
      value: z.number().min(0).optional(),
      discountPercent: z.number().min(0).max(100).optional(),
      discountValue: z.number().min(0).optional(),
      discountNote: z.string().optional(),
      lostReason: z.string().optional(),
      lostReasonNote: z.string().optional(),
      accountingMonth: z.number().min(1).max(12).optional(), // شهر احتساب الصفقة
      accountingYear: z.number().min(2020).max(2030).optional(),  // سنة احتساب الصفقة
      engineerId: z.string().optional(), // لإنشاء Task تلقائياً
      clientName: z.string().optional(), // لإنشاء Task تلقائياً
    })).mutation(async ({ input, ctx }) => {
      const changesAccountingPeriod = input.accountingMonth !== undefined || input.accountingYear !== undefined;
      if (changesAccountingPeriod) {
        if (input.accountingMonth === undefined || input.accountingYear === undefined) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "يجب تحديد شهر وسنة الاحتساب معاً" });
        }
        const caller = await requireAccountingMonthManager(ctx);
        await requireDealRecordScope(ctx, input.id, "canEdit");
        return setDealAccountingMonth({
          dealId: input.id,
          accountingMonth: input.accountingMonth,
          accountingYear: input.accountingYear,
          setBy: caller.name,
          setByRole: caller.role,
        });
      }
      await requireDealRecordScope(ctx, input.id, "canEdit");
      await updateDealFull(input.id, input);
      return { success: true };
    }),
    // ─── Discount System ────────────────────────────────────────────────────────────────────────────────────────
    discountSummary: protectedProcedure.input(z.object({
      year: z.number().optional(),
      month: z.number().optional(),
      startDate: z.string().optional(), // ISO date string
      endDate: z.string().optional(),   // ISO date string
    })).query(async ({ input, ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "closing");
      const start = input.startDate ? new Date(input.startDate) : undefined;
      const end = input.endDate ? new Date(input.endDate) : undefined;
      return getDiscountSummary(input.year, input.month, start, end, scopedEngineerId(access));
    }),
    validateDiscount: protectedProcedure.input(z.object({
      dealId: z.number().optional(),
      discountValue: z.number().min(0),
    })).query(async ({ input, ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "closing");
      if (input.dealId !== undefined) await requireDealRecordScope(ctx, input.dealId, "canView");
      return validateDealDiscount(input.dealId, input.discountValue, scopedEngineerId(access));
    }),
    engineerDiscountSummary: protectedProcedure.input(z.object({
      year: z.number().optional(),
      month: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })).query(async ({ input, ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "closing");
      const start = input.startDate ? new Date(input.startDate) : undefined;
      const end = input.endDate ? new Date(input.endDate) : undefined;
      return getEngineerDiscountSummary(input.year, input.month, start, end, scopedEngineerId(access));
    }),
    // ─── New Deal-Level Discount Distribution ──────────────────────────────────────
    dealAllocations: protectedProcedure.input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing");
        return distributeDiscountToDeals(scopedEngineerId(access, input.engineerId));
      }),
    discountSummaryForEngineer: protectedProcedure.input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing");
        return getDiscountSummaryForEngineer(scopedEngineerId(access, input.engineerId));
      }),
    discountDashboard: protectedProcedure.input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing");
        return getDiscountDashboard(scopedEngineerId(access, input.engineerId));
      }),
    discountBonusSummary: protectedProcedure.input(z.object({
      engineerId: z.number(),
      year: z.number().optional(),
      month: z.number().optional(),
    })).query(async ({ input, ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "closing");
      return getDiscountBonusSummary(scopedEngineerId(access, input.engineerId), input.year, input.month);
    }),
    calculateDealBonus: protectedProcedure.input(z.object({ dealId: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireDealRecordScope(ctx, input.dealId, "canView");
        return calculateDiscountBonus(input.dealId);
      }),
    setDiscountCap: protectedProcedure.input(z.object({
      engineerId: z.number(),
      year: z.number(),
      month: z.number(),
      monthlyCap: z.number().positive(),
    })).mutation(async ({ input, ctx }) => {
      await requireFinancialManager(ctx, "تعديل حد الخصم متاح للإدارة المالية فقط");
      const access = await requireAllScope(ctx, "closing", "canEdit");
      await setDiscountBonusCap(scopedEngineerId(access, input.engineerId), input.year, input.month, input.monthlyCap);
      return { success: true };
    }),
    // ─── Lost Deal Analysis ─────────────────────────────────────────────────────
    lostDealsAnalysis: protectedProcedure.input(z.object({ year: z.number().optional(), month: z.number().optional() })).query(async ({ input, ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "closing");
      return getLostDealsAnalysis(input.year, input.month, scopedEngineerId(access));
    }),
    lostReasonLabels: protectedProcedure.query(async () => LOST_REASON_LABELS),
    // ─── Update deal with lostReason ────────────────────────────────────────────
    updateDealStage: protectedProcedure.input(z.object({
      id: z.number(),
      stage: z.enum(["proposal", "negotiation", "contract_sent", "closed_won", "closed_lost"]),
      lostReason: z.enum(["price_high", "competitor", "slow_response", "wrong_product", "not_serious", "budget_cut", "other"]).optional(),
      lostReasonNote: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireDealRecordScope(ctx, input.id, "canEdit");
      await updateDealFull(input.id, {
        stage: input.stage,
        lostReason: input.lostReason,
        lostReasonNote: input.lostReasonNote,
        closedAt: (input.stage === 'closed_won' || input.stage === 'closed_lost') ? new Date() : undefined,
      });
      return { success: true };
    }),
    // ─── Sales Engineers list (for Assign Engineer dropdown) ────────────────────────
    salesEngineers: protectedProcedure.query(async ({ ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "closing");
      if (access.scope === "all") return getSalesEngineers();
      const engineerId = scopedEngineerId(access);
      return [{ id: engineerId, name: access.caller.name }];
    }),
    // ─── Deal Timeline ───────────────────────────────────────────────────────────────
    timeline: protectedProcedure.input(z.object({ dealId: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireDealRecordScope(ctx, input.dealId, "canView");
        return getDealTimeline(input.dealId);
      }),
    // ─── Update Deal Engineer (Deal Ownership) ──────────────────────────────────────
    updateEngineer: protectedProcedure.input(z.object({
      dealId: z.number(),
      newEngineerId: z.number(),
      forceIfWon: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "closing", "canEdit");
      if (access.scope !== "all") {
        throw new TRPCError({ code: "FORBIDDEN", message: "إعادة تعيين مالك الصفقة متاحة لنطاق الصلاحية all فقط" });
      }
      await requireDealRecordScope(ctx, input.dealId, "canEdit");
      const result = await updateDealEngineer({
        dealId: input.dealId,
        newEngineerId: input.newEngineerId,
        modifiedBy: ctx.actor?.name ?? ctx.user?.name ?? ctx.user?.openId ?? "system",
        forceIfWon: input.forceIfWon,
      });
      return result;
    }),
    // ─── Reopen Deal ─────────────────────────────────────────────────────────────
    reopen: protectedProcedure.input(z.object({
      dealId: z.number(),
      reason: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireDealRecordScope(ctx, input.dealId, "canEdit");
      const result = await reopenDeal({
        dealId: input.dealId,
        modifiedBy: ctx.actor?.name ?? ctx.user?.name ?? ctx.user?.openId ?? "system",
        reason: input.reason,
      });
      return result;
    }),
    // ─── Set Accounting Month (Admin/Manager only) ─────────────────────────────────────────────────────────────────────────────────────
    setAccountingMonth: protectedProcedure.input(z.object({
      dealId: z.number(),
      accountingMonth: z.number().min(1).max(12),
      accountingYear: z.number().min(2020).max(2100),
    })).mutation(async ({ input, ctx }) => {
      const caller = await requireAccountingMonthManager(ctx);
      await requireDealRecordScope(ctx, input.dealId, "canEdit");
      const result = await setDealAccountingMonth({
        dealId: input.dealId,
        accountingMonth: input.accountingMonth,
        accountingYear: input.accountingYear,
        setBy: caller.name,
        setByRole: caller.role,
      });
      return result;
    }),
    // ─── Auto-create Deal from Task ──────────────────────────────────────────────────────────────────────────────────────
    autoCreateFromTask: protectedProcedure.input(z.object({ engineerId: z.number(),
      taskId: z.number().optional(),
      clientName: z.string().optional(),
      taskType: z.string(),
      notes: z.string().optional(),
      grossValue: z.number().optional(),
      discountValue: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const access = await getOperationalScopeAccess(ctx, "closing", "canAdd");
      const engineerId = scopedEngineerId(access, input.engineerId);
      if (input.taskId !== undefined) await requireTaskAction(ctx, "view", input.taskId);
      const result = await autoCreateOrUpdateDealFromTask({
        id: input.taskId ?? 0,
        engineerId,
        clientName: input.clientName,
        taskType: input.taskType,
        notes: input.notes,
        grossValue: input.grossValue,
        discountValue: input.discountValue,
      });
      return result ?? { action: 'skipped', dealId: null };
    }),
  }),

  // ── Project Timeline Control System ─────────────────────────────────────────
  projectTimeline: router({
    config: protectedProcedure.query(async () => ({
      ...(await getProjectTimelineConfig()),
      statuses: PROJECT_STATUS_META,
      delayOwners: PROJECT_DELAY_OWNERS,
    })),
    list: protectedProcedure.input(z.object({
      search: z.string().optional(),
      engineerId: z.number().optional(),
      department: z.string().optional(),
      stageKey: z.string().optional(),
      status: z.string().optional(),
      delayOwnerCode: z.string().optional(),
      delayReasonCode: z.string().optional(),
      contractFrom: z.string().optional(),
      contractTo: z.string().optional(),
      deliveryFrom: z.string().optional(),
      deliveryTo: z.string().optional(),
      onHoldOnly: z.boolean().optional(),
      delayedOnly: z.boolean().optional(),
      criticalOnly: z.boolean().optional(),
      missingUpdateOnly: z.boolean().optional(),
      preExecutionOnly: z.boolean().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      await assertProjectTimelineAccess(ctx);
      const access = await getOperationalScopeAccess(ctx, "tasks");
      const scopedInput = { ...(input ?? {}) } as any;
      scopedInput.engineerId = scopedEngineerId(access, input?.engineerId);
      return getProjectTimelineList(scopedInput);
    }),
    dashboard: protectedProcedure.input(z.object({
      engineerId: z.number().optional(),
      department: z.string().optional(),
      stageKey: z.string().optional(),
      status: z.string().optional(),
      delayedOnly: z.boolean().optional(),
      criticalOnly: z.boolean().optional(),
      missingUpdateOnly: z.boolean().optional(),
      preExecutionOnly: z.boolean().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      await assertProjectTimelineAccess(ctx);
      const access = await getOperationalScopeAccess(ctx, "tasks");
      const scopedInput = { ...(input ?? {}) } as any;
      scopedInput.engineerId = scopedEngineerId(access, input?.engineerId);
      return getProjectTimelineDashboard(scopedInput);
    }),
    analytics: protectedProcedure.input(z.object({
      engineerId: z.number().optional(), department: z.string().optional(), stageKey: z.string().optional(),
      status: z.string().optional(), delayedOnly: z.boolean().optional(), criticalOnly: z.boolean().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      await assertProjectTimelineAccess(ctx, undefined, true);
      await requireAllScope(ctx, "tasks");
      return getProjectTimelineAnalytics(input ?? {});
    }),
    detail: protectedProcedure.input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await assertProjectTimelineAccess(ctx, input.projectId);
        await requireProjectTimelineRecordScope(ctx, input.projectId, "canView");
        return getProjectTimelineDetail(input.projectId);
      }),
    syncFromDeals: protectedProcedure.input(z.object({ updatedBy: z.string().min(1).default("system") }).optional())
      .mutation(async ({ ctx }) => {
        const caller = await assertProjectTimelineAccess(ctx, undefined, true);
        await requireAllScope(ctx, "tasks", "canAdd");
        return syncProjectsFromClosedDeals(caller.name);
      }),
    importHistorical: protectedProcedure.input(z.object({
      rows: z.array(z.object({
        projectCode: z.string().optional(), contractNumber: z.string().optional(), stageKey: z.string().min(1),
        stageName: z.string().optional(), department: z.string().optional(), previousStageKey: z.string().optional(), previousDepartment: z.string().optional(),
        enteredAt: z.string().optional(), plannedCompletionDate: z.string().optional(), actualCompletionDate: z.string().optional(),
        plannedHandoverDate: z.string().optional(), actualHandoverDate: z.string().optional(), actualReceiptDate: z.string().optional(),
        slaDays: z.number().int().min(0).optional(), delayDays: z.number().int().min(0).optional(), delayOwnerCode: z.string().optional(),
        delayReasonCode: z.string().optional(), notes: z.string().optional(), isCurrent: z.boolean().optional(),
      })).min(1).max(2000),
    })).mutation(async ({ input, ctx }) => {
      const caller = await assertProjectTimelineAccess(ctx, undefined, true);
      await requireAllScope(ctx, "tasks", "canAdd");
      return importHistoricalProjectTimeline(input.rows, caller.name);
    }),
    updatePreExecution: protectedProcedure.input(z.object({
      projectId: z.number(),
      preExecutionStatus: z.enum(["waiting_site_readiness", "execution_survey_scheduled", "waiting_financial_requirement", "other"]).optional(),
      waitingOwnerCode: z.enum(["client", "sales_engineer", "sales_department", "other"]).optional(),
      waitingReasonCode: z.string().optional(),
      notes: z.string().optional(),
      expectedSiteReadyDate: z.string().optional(),
      siteReadyDate: z.string().optional(),
      siteReadySource: z.string().optional(),
      siteReadyNotes: z.string().optional(),
      surveyRequestedDate: z.string().optional(),
      surveyScheduledDate: z.string().optional(),
      surveyActualDate: z.string().optional(),
      surveyStatus: z.enum(["unspecified", "scheduled", "completed", "not_done", "resurvey_required"]).optional(),
      surveyEngineerId: z.number().optional(),
      surveyNotes: z.string().optional(),
      updatedBy: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const caller = await assertProjectTimelineEditAccess(ctx, input.projectId);
      await requireProjectTimelineRecordScope(ctx, input.projectId, "canEdit");
      return updateProjectPreExecution({ ...input, updatedBy: caller.name, actorRole: caller.role });
    }),
    startExecution: protectedProcedure.input(z.object({
      projectId: z.number(),
      executionStartDate: z.string().optional(),
      responsibleId: z.number().optional(),
      notes: z.string().optional(),
      updatedBy: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const caller = await assertProjectTimelineEditAccess(ctx, input.projectId);
      await requireProjectTimelineRecordScope(ctx, input.projectId, "canEdit");
      return startProjectExecution({ ...input, updatedBy: caller.name, actorRole: caller.role });
    }),
    transition: protectedProcedure.input(z.object({
      projectId: z.number(),
      nextStageKey: z.string().min(1),
      responsibleId: z.number().optional(),
      notes: z.string().optional(),
      delayOwnerCode: z.string().optional(),
      delayReasonCode: z.string().optional(),
      delayNotes: z.string().optional(),
      updatedBy: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const caller = await assertProjectTimelineEditAccess(ctx, input.projectId);
      await requireProjectTimelineRecordScope(ctx, input.projectId, "canEdit");
      return transitionProjectStage({ ...input, updatedBy: caller.name, actorRole: caller.role });
    }),
    addDelay: protectedProcedure.input(z.object({
      projectId: z.number(),
      movementId: z.number().optional(),
      delayDate: z.string().optional(),
      delayDays: z.number().int().positive(),
      ownerCode: z.string().min(1),
      responsibleId: z.number().optional(),
      reasonCode: z.string().min(1),
      notes: z.string().optional(),
      isHoldPeriod: z.boolean().optional(),
      createdBy: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const caller = await assertProjectTimelineEditAccess(ctx, input.projectId);
      await requireProjectTimelineRecordScope(ctx, input.projectId, "canAdd");
      return addProjectDelay({ ...input, createdBy: caller.name, actorRole: caller.role });
    }),
    update: protectedProcedure.input(z.object({
      projectId: z.number(),
      updateType: z.enum(["status_update", "monday_review", "wednesday_review"]).optional(),
      currentStatus: z.string().optional(),
      nextAction: z.string().optional(),
      expectedCompletionDate: z.string().optional(),
      hasBlocker: z.boolean().optional(),
      blockerDescription: z.string().optional(),
      delayOwnerCode: z.string().optional(),
      delayReasonCode: z.string().optional(),
      notes: z.string().optional(),
      updatedBy: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const caller = await assertProjectTimelineEditAccess(ctx, input.projectId);
      await requireProjectTimelineRecordScope(ctx, input.projectId, "canEdit");
      return updateProjectReview({ ...input, updatedBy: caller.name, actorRole: caller.role });
    }),
    close: protectedProcedure.input(z.object({
      projectId: z.number(),
      closingStatus: z.enum(["installed", "delivered", "execution_completed", "final_closed", "other"]),
      closingOtherDescription: z.string().optional(),
      closingDate: z.string().min(1),
      closingNotes: z.string().optional(),
      updatedBy: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const caller = await assertProjectTimelineEditAccess(ctx, input.projectId);
      await requireProjectTimelineRecordScope(ctx, input.projectId, "canEdit");
      return closeProject({ ...input, closedBy: caller.name, actorRole: caller.role });
    }),
    setHold: protectedProcedure.input(z.object({
      projectId: z.number(),
      isOnHold: z.boolean(),
      holdOwnerCode: z.string().optional(),
      holdReasonCode: z.string().optional(),
      expectedResumeDate: z.string().optional(),
      notes: z.string().optional(),
      updatedBy: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const caller = await assertProjectTimelineEditAccess(ctx, input.projectId);
      await requireProjectTimelineRecordScope(ctx, input.projectId, "canEdit");
      return setProjectHold({ ...input, updatedBy: caller.name, actorRole: caller.role });
    }),
    updateStageConfig: protectedProcedure.input(z.object({
      id: z.number(),
      nameAr: z.string().min(1).optional(),
      nameEn: z.string().optional(),
      department: z.string().min(1).optional(),
      sequence: z.number().int().positive().optional(),
      defaultSlaDays: z.number().int().min(0).optional(),
      defaultHandoverDays: z.number().int().min(0).optional(),
      color: z.string().optional(),
      isActive: z.number().int().min(0).max(1).optional(),
      updatedBy: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const caller = await assertProjectTimelineAccess(ctx, undefined, true);
      await requireAllScope(ctx, "tasks", "canEdit");
      const { id, updatedBy, ...data } = input;
      return updateProjectStageConfig(id, data, caller.name);
    }),
  }),

  // ── Sales Control Tower ───────────────────────────────────────────────────────────────────────────────────────
  sales: router({
    // الإحصاءات الشاملة للشهر
    controlStats: protectedProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "closing");
        return getSalesControlStats(input.year, input.month);
      }),
    // أداء كل مهندس مع الكوميشن
    engineersPerformance: protectedProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "closing");
        return getEngineersSalesPerformance(input.year, input.month);
      }),
    // الإحصاءات الشهرية (للتوافق مع الكود القديم)
    monthlyStats: protectedProcedure.input(z.object({
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
    }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "closing");
        return getMonthlySalesStats(input.year, input.month);
      }),
    trend: protectedProcedure.input(z.object({
      months: z.number().int().min(1).max(24).optional(),
    }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing");
        if (access.scope === "all") return getMonthlySalesTrend(input.months ?? 6);
        if (!access.caller.engineerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا يوجد مهندس مرتبط بهذا الحساب" });
        }
        return getMonthlySalesTrend(input.months ?? 6, access.caller.engineerId);
      }),
    // إدارة أهداف المهندسين
    setEngineerTarget: protectedProcedure.input(z.object({
      engineerId: z.number(), year: z.number(), month: z.number(),
      targetAmount: z.number().positive(), manpower: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireFinancialManager(ctx, "تعديل أهداف المبيعات متاح للإدارة المالية فقط");
      const access = await requireAllScope(ctx, "closing", "canEdit");
      await upsertEngineerTarget({ ...input, engineerId: scopedEngineerId(access, input.engineerId) });
      return { success: true };
    }),
    setOperationalTargets: protectedProcedure.input(z.object({
      engineerId: z.number(), year: z.number(), month: z.number(),
      targetMeetings: z.number().optional(), target2D: z.number().optional(),
      target3D: z.number().optional(), targetRender: z.number().optional(),
      targetQuotations: z.number().optional(), targetPresentations: z.number().optional(),
      targetClosings: z.number().optional(), targetDeals: z.number().optional(),
      targetContract: z.number().optional(), targetWorkOrder: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireFinancialManager(ctx, "تعديل الأهداف التشغيلية متاح للإدارة المالية فقط");
      const access = await requireAllScope(ctx, "closing", "canEdit");
      await upsertEngineerOperationalTargets({ ...input, engineerId: scopedEngineerId(access, input.engineerId) });
      return { success: true };
    }),
    // شرائح الخصم
    discountTiers: protectedProcedure.query(async () => getDiscountTiers()),
    upsertDiscountTier: protectedProcedure.input(z.object({
      id: z.number().optional(), minSales: z.number(), maxSales: z.number().optional(),
      maxDiscountPct: z.number(), label: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireFinancialManager(ctx, "تعديل شرائح الخصم متاح للإدارة المالية فقط");
      await requireAllScope(ctx, "closing", "canAdd");
      await upsertDiscountTier(input);
      return { success: true };
    }),
    deleteDiscountTier: protectedProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "حذف شرائح الخصم متاح للإدارة المالية فقط");
        await requireAllScope(ctx, "closing", "canDelete");
        await deleteDiscountTier(input.id);
        return { success: true };
      }),
    // شرائح الكوميشن
    commissionTiers: protectedProcedure.query(async () => getCommissionTiers()),
    upsertCommissionTier: protectedProcedure.input(z.object({
      id: z.number().optional(), minAchievementPct: z.number(), maxAchievementPct: z.number().optional(),
      commissionPct: z.number(), label: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireFinancialManager(ctx, "تعديل شرائح الكوميشن متاح للإدارة المالية فقط");
      await requireAllScope(ctx, "closing", "canAdd");
      await upsertCommissionTier(input);
      return { success: true };
    }),
    deleteCommissionTier: protectedProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "حذف شرائح الكوميشن متاح للإدارة المالية فقط");
        await requireAllScope(ctx, "closing", "canDelete");
        await deleteCommissionTier(input.id);
        return { success: true };
      }),
  }),

  // ── KPI ───────────────────────────────────────────────────────────────────────────────────────
  kpi: router({
    engineers: protectedProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getEngineersKPI(input.year, input.month); }),
    trend: protectedProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getEngineersTrend(input.year, input.month); }),
    weeklyReport: protectedProcedure.query(async ({ ctx }) => { await requireAllScope(ctx, "kpi"); return getWeeklyReport(); }),
    // ─── Performance Analysis System ───────────────────────────────────────
    weeklyPerformance: protectedProcedure.query(async ({ ctx }) => { await requireAllScope(ctx, "kpi"); return getWeeklyPerformanceAnalysis(); }),
    engineerPerformance: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getEngineerPerformanceReport(input.year, input.month); }),
    standardDistribution: protectedProcedure.query(async () => STANDARD_DISTRIBUTION),
    taskTypeLabels: protectedProcedure.query(async () => TASK_TYPE_LABELS_V2),
    // تحليل الأداء التشغيلي من Tasks Module
    operationalPerformance: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getOperationalPerformance(input.year, input.month); }),
    // Ranking بـ 4 معايير: Revenue + Closing Rate + Task Efficiency + Target Achievement
    enhancedRanking: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getEnhancedRanking(input.year, input.month); }),
    // ─── Role-Based KPI Endpoints ──────────────────────────────────────────────
    teleSalesKPI: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getTeleSalesKPI(input.year, input.month); }),
    siteEngineersKPI: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getSiteEngineersKPI(input.year, input.month); }),
    // ─── Department Labels ─────────────────────────────────────────────────────
    departmentLabels: protectedProcedure.query(async () => DEPARTMENT_LABELS),
    salesDepartments: protectedProcedure.query(async () => SALES_DEPARTMENTS),
    allowedTaskTypes: protectedProcedure.query(async () => ALLOWED_TASK_TYPES_BY_DEPARTMENT),
    // ─── Company Closing KPI + Reward System ──────────────────────────────────
    companyClosingKPI: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getCompanyClosingKPI(input.year, input.month); }),
    teamRewardStatus: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getTeamRewardStatus(input.year, input.month); }),
    // ─── Lost Deals Impact System ─────────────────────────────────────────────
    lostDealsImpact: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getLostDealsImpact(input.year, input.month); }),
    // ─── Performance-Based Composite Discount Score (NEW) ──────────────────────
    // جلب الـ Composite Discount Score للفريق (شرائح مبنية على أداء فعلي)
    teamCompositeDiscountScore: protectedProcedure
      .input(z.object({
        year: z.number().optional(),
        month: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getTeamCompositeDiscountScore(input.year, input.month); }),
    // جلب الـ Composite Discount Score لمهندس محدد
    engineerCompositeDiscountScore: protectedProcedure
      .input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => { const access = await getOperationalScopeAccess(ctx, "kpi"); return getEngineerCompositeDiscountScore(scopedEngineerId(access, input.engineerId)); }),
    // جلب تعريفات شرائح الخصوم الجديدة
    performanceDiscountTiers: protectedProcedure
      .query(async () => PERFORMANCE_DISCOUNT_TIERS),
    // ─── Score-Based Discount Distribution ────────────────────────────────────────────
    scoreBasedDiscountDistribution: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return calcScoreBasedDiscountDistribution(input.year, input.month); }),
    // ─── Advanced Discount Distribution (Performance + Pipeline + Closing Skill) ──
    advancedDiscountDistribution: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getAdvancedDiscountDistribution(input.year, input.month); }),
      // ─── Admin Sales KPI ──────────────────────────────────────────
    adminSalesKPI: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getAdminSalesKPI(input.year, input.month); }),
    // ─── Admin Sales Category Analysis ──────────────────────────────
    adminSalesCategoryAnalysis: protectedProcedure
      .input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { const access = await getOperationalScopeAccess(ctx, "kpi"); return getAdminSalesCategoryAnalysis(scopedEngineerId(access, input.engineerId), input.year, input.month); }),
    // الأهداف التشغيلية لمهندس محدد
    engineerOperationalTargets: protectedProcedure
      .input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { const access = await getOperationalScopeAccess(ctx, "kpi"); return getEngineerOperationalTargets(scopedEngineerId(access, input.engineerId), input.year, input.month); }),
    // ترتيب الفريق (Sales Engineer + Sales Specialist فقط)
    teamPerformanceRanking: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getTeamPerformanceRanking(input.year, input.month); }),
    // Progressive Commission + KPI Share + Closing Rate Incentive
    engineerEarnings: protectedProcedure
      .input(z.object({ engineerId: z.number(), year: z.number(), month: z.number(), teamKPIPool: z.number().optional() }))
      .query(async ({ input, ctx }) => { const access = await getOperationalScopeAccess(ctx, "kpi"); return getEngineerEarningsBreakdown(scopedEngineerId(access, input.engineerId), input.year, input.month, input.teamKPIPool ?? 2_000); }),
    allEngineersEarnings: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number(), teamKPIPool: z.number().optional() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getAllEngineersEarningsBreakdown(input.year, input.month, input.teamKPIPool ?? 2_000); }),
    commissionDetails: protectedProcedure
      .input(z.object({ salesAmount: z.number() }))
      .query(async ({ input }) => ({
        commission: calcProgressiveCommission(input.salesAmount),
        details: calcProgressiveCommissionDetails(input.salesAmount),
      })),
    companyClosingBonus: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => { await requireAllScope(ctx, "kpi"); return getCompanyClosingBonusForAllEngineers(input.year, input.month); }),
    closingBonusTiers: protectedProcedure
      .input(z.object({ rate: z.number() }))
      .query(async ({ input }) => calcCompanyClosingBonus(input.rate)),
  }),

  // ── Collections ───────────────────────────────────────────────────────────
  collections: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const caller = await getCallerFromContext(ctx);
      if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
      const access = await getOperationalScopeAccess(ctx, "collections");
      if (canManageFinancials(caller.role) && access.scope === "all") return getCollectionsStats();
      if (!caller.engineerId) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية الاطلاع على التحصيلات" });
      return getCollectionsStats(caller.engineerId);
    }),
    list: protectedProcedure.input(z.object({ limit: z.number().optional(), offset: z.number().optional(), status: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const caller = await getCallerFromContext(ctx);
        if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
        const access = await getOperationalScopeAccess(ctx, "collections");
        if (canManageFinancials(caller.role) && access.scope === "all") return getCollectionsList(input.limit, input.offset, input.status);
        if (!caller.engineerId) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية الاطلاع على التحصيلات" });
        return getCollectionsList(input.limit, input.offset, input.status, caller.engineerId);
      }),
    create: adminProcedure.input(z.object({
      clientName: z.string().min(1), contractAmount: z.number().positive(),
      collectedAmount: z.number().optional(), dueDate: z.string().optional(),
      dealId: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireAllScope(ctx, "collections", "canAdd");
      if ((input.collectedAmount ?? 0) > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "سجل الدفعات عبر financial.addPayment حتى يُحدّث دفتر السيولة" });
      }
      await createCollection(input);
      return { success: true };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(), collectedAmount: z.number(), status: z.string().optional(), notes: z.string().optional(),
    })).mutation(async () => {
      throw new TRPCError({ code: "BAD_REQUEST", message: "تحديث المحصّل المباشر متوقف؛ استخدم financial.addPayment لتسجيل دفعة موثقة" });
    }),
  }),

  // ── Planning ──────────────────────────────────────────────────────────────
  planning: router({
    getTarget: protectedProcedure.input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getMonthlyTarget(input.year, input.month)),
    setTarget: protectedProcedure.input(z.object({
      year: z.number(), month: z.number(), targetAmount: z.number().positive(),
      avgDealValue: z.number().optional(), closingRate: z.number().optional(),
      visitToClosingRate: z.number().optional(), notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireAllScope(ctx, "planning", "canAdd");
      await requirePrivilegedRoleManagementCaller(ctx, "تعديل الهدف الشهري متاح للإدارة فقط");
      await upsertMonthlyTarget(input);
      return { success: true };
    }),
    calculate: protectedProcedure.input(z.object({
      targetAmount: z.number(), avgDealValue: z.number(), closingRate: z.number(), visitToClosingRate: z.number(),
    })).query(async ({ input }) => {
      const { targetAmount, avgDealValue, closingRate, visitToClosingRate } = input;
      const dealsNeeded = Math.ceil(targetAmount / avgDealValue);
      const visitsNeeded = Math.ceil(dealsNeeded / closingRate);
      const leadsNeeded = Math.ceil(visitsNeeded / visitToClosingRate);
      return { dealsNeeded, visitsNeeded, leadsNeeded, avgDealValue, closingRate, visitToClosingRate };
    }),
    // ── Company Goals ──────────────────────────────────────────────────────
    getCompanyGoal: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getCompanyGoal(input.year, input.month)),
    setCompanyGoal: protectedProcedure
      .input(z.object({
        year: z.number(), month: z.number(),
        revenueTarget: z.number().positive(),
        avgDealValue: z.number().positive(),
        closingRateTarget: z.number().min(1).max(100),
        periodFrom: z.string().optional(),
        periodTo: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "planning", "canEdit");
        await requirePrivilegedRoleManagementCaller(ctx, "تعديل أهداف الشركة متاح للإدارة فقط");
        return setCompanyGoal(input);
      }),
    getCompanyGoalProgress: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "planning");
        return getCompanyGoalProgress(input.year, input.month);
      }),
    // ── Personal Goals ─────────────────────────────────────────────────────
    getPersonalGoals: protectedProcedure
      .input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "planning");
        return getEngineerPersonalGoals(scopedEngineerId(access, input.engineerId), input.year, input.month);
      }),
    setPersonalGoal: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        engineerId: z.number(),
        year: z.number(), month: z.number(),
        objective: z.string().min(1),
        developmentArea: z.enum(['closing','negotiation','render_quality','presentation','design_quality','client_communication','time_management','other']),
        evaluationMethod: z.enum(['meeting_review','design_review','render_review','manager_review','self_review']),
        reviewerRole: z.enum(['admin','manager']),
        score: z.number().min(0).max(100).optional(),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "planning", "canAdd");
        await requirePrivilegedRoleManagementCaller(ctx, "إدارة الأهداف الشخصية متاحة للإدارة فقط");
        return setPersonalGoal(input);
      }),
    // ── Total Performance Score ────────────────────────────────────────────
    engineerPerformanceScore: protectedProcedure
      .input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "planning");
        return calcTotalPerformanceScore(scopedEngineerId(access, input.engineerId), input.year, input.month);
      }),
    allEngineersPerformanceScores: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "planning");
        return getAllEngineersPerformanceScores(input.year, input.month);
      }),
    // ── Operational Breakdown (Tasks → Goals → KPI) ────────────────────────
    getOperationalBreakdown: protectedProcedure
      .input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "planning");
        return calcOperationalScoreFromTasks(scopedEngineerId(access, input.engineerId), input.year, input.month);
      }),
    getActivitySummary: protectedProcedure
      .input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "planning");
        return getEngineerActivitySummary(scopedEngineerId(access, input.engineerId), input.year, input.month);
      }),
    getActivityTypes: protectedProcedure
      .query(() => ({
        keys: ACTIVITY_KEYS,
        labelsEn: ACT_LABELS_EN,
        labelsAr: ACTIVITY_LABELS_AR,
        weights: ACTIVITY_WEIGHTS,
        icons: ACTIVITY_ICONS,
        colors: ACTIVITY_COLORS,
      })),
    // ── Auto Distribution Engine ───────────────────────────────────────────────────────────────────────────────────────────
    /** معاينة التوزيع التلقائي قبل التطبيق */
    previewDistribution: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "planning");
        return calcAutoDistribution(input.year, input.month);
      }),
    /** تطبيق التوزيع التلقائي على جميع المهندسين */
    applyDistribution: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "planning", "canAdd");
        await requirePrivilegedRoleManagementCaller(ctx, "تطبيق التوزيع التلقائي متاح للإدارة فقط");
        return applyAutoDistribution(input.year, input.month);
      }),
    /** تعديل يدوي (Manual Override) لمهندس */
    manualOverride: protectedProcedure
      .input(z.object({
        engineerId: z.number().int().positive(),
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
        targetAmount: z.number().finite().min(0).max(1_000_000_000).optional(),
        targetDeals: z.number().int().min(0).max(1_000_000).optional(),
        targetLeads: z.number().int().min(0).max(1_000_000).optional(),
        targetMeetings: z.number().int().min(0).max(1_000_000).optional(),
        targetQuotations: z.number().int().min(0).max(1_000_000).optional(),
        targetPresentations: z.number().int().min(0).max(1_000_000).optional(),
        targetRender: z.number().int().min(0).max(1_000_000).optional(),
        target2D: z.number().int().min(0).max(1_000_000).optional(),
        target3D: z.number().int().min(0).max(1_000_000).optional(),
        targetClosings: z.number().int().min(0).max(1_000_000).optional(),
        notes: z.string().trim().max(1_000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireUserManagementCaller(ctx, "تعديل أهداف المهندسين متاح للإدارة فقط");
        await requireAllScope(ctx, "planning", "canEdit");
        await manualOverrideEngineerTarget(input);
        return { success: true };
      }),
    /** جلب هدف مهندس كامل (مالي + تشغيلي + شخصي) */
    getEngineerFullTarget: protectedProcedure
      .input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "planning");
        return getEngineerFullTarget(scopedEngineerId(access, input.engineerId), input.year, input.month);
      }),
  }),

  // ── Financial Module ───────────────────────────────────────────────────────────────────────────────
  financial: router({
    // جلب كل العقود مع ملخص التحصيل
    allContracts: protectedProcedure.input(z.object({ engineerId: z.number().int().positive().optional() }))
      .query(async ({ input, ctx }) => {
        const caller = await getCallerFromContext(ctx);
        if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
        const access = await getOperationalScopeAccess(ctx, "collections");
        if (canManageFinancials(caller.role) && access.scope === "all") return getAllCollectionsWithSummary(input.engineerId);
        if (!caller.engineerId) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية الاطلاع على التحصيلات" });
        return getAllCollectionsWithSummary(caller.engineerId);
      }),
    // ملف عميل مالي كامل
    clientProfile: protectedProcedure.input(z.object({ collectionId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requireCollectionFinancialAccess(ctx, input.collectionId, "لا تملك صلاحية الاطلاع على هذا العقد");
        return getClientFinancialProfile(input.collectionId);
      }),
    // إضافة عقد جديد
    addContract: adminProcedure.input(z.object({
      clientName: z.string().min(1),
      contractAmount: z.number().finite().positive().max(1_000_000_000),
      dueDate: z.string().date().optional(),
      dealId: z.number().optional(),
      notes: z.string().trim().max(2_000).optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireAllScope(ctx, "collections", "canAdd");
      if (input.dealId !== undefined) await requireDealRecordScope(ctx, input.dealId, "canView");
      const result = await addCollection(input);
      return { success: true, id: (result as { insertId?: number })?.insertId };
    }),
    // تسجيل دفعة
    addPayment: protectedProcedure.input(z.object({
      collectionId: z.number().int().positive(),
      engineerId: z.number().int().positive().optional(),
      clientName: z.string().min(1),
      amount: z.number().finite().positive().max(1_000_000_000),
      paymentDate: z.string().date(),
      paymentType: z.enum(["initial", "installment", "final", "visit_fee"]).default("installment"),
      addedBy: z.enum(["engineer", "admin"]).default("admin"),
      receiptNumber: z.string().trim().max(80).optional(),
      notes: z.string().trim().max(2_000).optional(),
      promiseId: z.number().int().positive().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { caller, collection, isFinancialManager, scope } = await requireCollectionFinancialAccess(ctx, input.collectionId, "لا تملك صلاحية تسجيل دفعة لهذا العقد", "canAdd");
      const result = await addPayment({
        ...input,
        engineerId: isFinancialManager && scope === "all" ? input.engineerId : caller.engineerId!,
        clientName: collection.clientName,
        addedBy: isFinancialManager && scope === "all" ? "admin" : "engineer",
        amount: String(input.amount),
        paymentDate: input.paymentDate as unknown as Date,
      });
      return { success: true };
    }),
    // إضافة وعد دفع
    addPromise: protectedProcedure.input(z.object({
      collectionId: z.number().int().positive(),
      engineerId: z.number().int().positive().optional(),
      clientName: z.string().min(1),
      promiseAmount: z.number().finite().positive().max(1_000_000_000),
      promiseDate: z.string().date(),
      notes: z.string().trim().max(2_000).optional(),
      isConfirmed: z.boolean().optional().default(false),
    })).mutation(async ({ input, ctx }) => {
      const { caller, collection, isFinancialManager, scope } = await requireCollectionFinancialAccess(ctx, input.collectionId, "لا تملك صلاحية تسجيل وعد دفع لهذا العقد", "canAdd");
      await addPaymentPromise({
        ...input,
        engineerId: isFinancialManager && scope === "all" ? input.engineerId : caller.engineerId!,
        clientName: collection.clientName,
        promiseAmount: String(input.promiseAmount),
        promiseDate: input.promiseDate as unknown as Date,
        isConfirmed: isFinancialManager && scope === "all" && input.isConfirmed ? 1 : 0,
      });
      return { success: true };
    }),
    // تحديث حالة وعد الدفع
    updatePromise: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["pending", "overdue"]),
    })).mutation(async ({ input, ctx }) => {
      await requirePromiseFinancialAccess(ctx, input.id, "لا تملك صلاحية تحديث وعد الدفع", "canEdit");
      await updatePromiseStatus(input.id, input.status);
      return { success: true };
    }),
    confirmPromise: protectedProcedure.input(z.object({ id: z.number().int().positive(), isConfirmed: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "اعتماد وعود الدفع محصور بالإدارة المالية");
        await requirePromiseFinancialAccess(ctx, input.id, "لا تملك صلاحية اعتماد وعد الدفع", "canEdit");
        await setPaymentPromiseConfirmation(input.id, input.isConfirmed);
        return { success: true };
      }),
    // قائمة المتابعة اليومية
    dailyFollowUp: protectedProcedure.query(async ({ ctx }) => {
      await requireFinancialManager(ctx, "قائمة المتابعة اليومية محصورة بالإدارة المالية");
      await requireAllScope(ctx, "collections");
      return getDailyFollowUpList();
    }),
    // كوميشن المهندسين من التحصيل
    engineersCommission: protectedProcedure.query(async ({ ctx }) => {
      await requireFinancialManager(ctx, "بيانات الكوميشن محصورة بالإدارة المالية");
      await requireAllScope(ctx, "collections");
      return getEngineersCollectionCommission();
    }),
    // صرف كوميشن
    markCommissionPaid: adminProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "collections", "canEdit");
        await markCommissionPaid(input.id);
        return { success: true };
      }),
    // تحديث حالة العقد
    updateContractStatus: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["on_track", "due_soon", "overdue", "completed"]),
    })).mutation(async ({ input, ctx }) => { await requireCollectionFinancialAccess(ctx, input.id, "لا تملك صلاحية تعديل حالة هذا العقد", "canEdit");
        await updateCollectionStatus(input.id, input.status);
        return { success: true }; }),
    // حساب الكوميشن التصاعدي
    calcCommission: protectedProcedure.input(z.object({ amount: z.number() }))
      .query(async ({ input }) => ({
        commission: calcProgressiveCommission(input.amount),
        amount: input.amount,
      })),
    // إنشاء Contract تلقائي من صفقة WON
    autoCreateContract: protectedProcedure.input(z.object({ dealId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "إنشاء العقود المالية محصور بالإدارة");
        await requireAllScope(ctx, "collections", "canAdd");
        await requireDealRecordScope(ctx, input.dealId, "canView");
        return autoCreateContractFromDeal(input.dealId);
      }),
    // إضافة دفعة مع Follow-up Task
    addPaymentWithFollowUp: protectedProcedure.input(z.object({
      collectionId: z.number(),
      engineerId: z.number().optional(),
      clientName: z.string().min(1),
      amount: z.number().positive(),
      paymentDate: z.string(),
      paymentType: z.enum(["initial", "installment", "final", "visit_fee"]).default("installment"),
      addedBy: z.enum(["engineer", "admin"]).default("admin"),
      receiptNumber: z.string().optional(),
      receiptUrl: z.string().optional(),
      nextPaymentDate: z.string().optional(),
      notes: z.string().optional(),
      promiseId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { caller, collection, isFinancialManager, scope } = await requireCollectionFinancialAccess(ctx, input.collectionId, "لا تملك صلاحية تسجيل دفعة لهذا العقد", "canAdd");
      return addPaymentWithFollowUp({
        ...input,
        engineerId: isFinancialManager && scope === "all" ? input.engineerId : caller.engineerId!,
        clientName: collection.clientName,
        addedBy: isFinancialManager && scope === "all" ? "admin" : "engineer",
      });
    }),
    // Commission على المحصّل فقط
    collectionCommission: protectedProcedure.input(z.object({
      engineerId: z.number(), month: z.number(), year: z.number(),
    })).query(async ({ input, ctx }) => {
      const caller = await getCallerFromContext(ctx);
      if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
      const access = await getOperationalScopeAccess(ctx, "collections");
      if (access.scope === "own" && caller.engineerId !== input.engineerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية الاطلاع على كوميشن مهندس آخر" });
      }
      if (!canManageFinancials(caller.role) && caller.engineerId !== input.engineerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية الاطلاع على كوميشن مهندس آخر" });
      }
      return getCollectionBasedCommission(input.engineerId, input.month, input.year);
    }),
    // Dashboard التحصيل
    dashboard: protectedProcedure.input(z.object({ month: z.number(), year: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "لوحة التحصيل العامة محصورة بالإدارة المالية");
        await requireAllScope(ctx, "collections");
        return getCollectionDashboard(input.month, input.year);
      }),
    // Alerts التحصيل
    alerts: protectedProcedure.query(async ({ ctx }) => {
      await requireFinancialManager(ctx, "تنبيهات التحصيل العامة محصورة بالإدارة المالية");
      await requireAllScope(ctx, "collections");
      return getCollectionAlerts();
    }),
    // قائمة العقود مع الكومشن
    contractsWithCommission: protectedProcedure.input(z.object({ engineerId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "بيانات الكوميشن العامة محصورة بالإدارة المالية");
        await requireAllScope(ctx, "collections");
        return getCollectionsWithCommission(input.engineerId);
      }),
    periodAnalysis: protectedProcedure.input(z.object({
      startDate: z.string().date(),
      endDate: z.string().date(),
    })).query(async ({ input, ctx }) => {
      await requireFinancialManager(ctx, "تحليل التحصيل المالي محصور بالإدارة المالية");
      await requireAllScope(ctx, "collections");
      return getCollectionPeriodAnalysis(input.startDate, input.endDate);
    }),
    // السيولة والتوقعات: مصدران منفصلان بصورة صريحة.
    liquidityDashboard: protectedProcedure.input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "السيولة المتاحة محصورة بالإدارة المالية");
        await requireAllScope(ctx, "collections");
        return getFinancialLiquidityDashboard(input.startDate, input.endDate);
      }),
    commitments: protectedProcedure.input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "الالتزامات المالية محصورة بالإدارة المالية");
        await requireAllScope(ctx, "collections");
        return getFinancialCommitments(input.startDate, input.endDate);
      }),
    setCashBalance: adminProcedure.input(z.object({
      asOfDate: z.string(), amount: z.number().min(0), notes: z.string().optional(), updatedBy: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireAllScope(ctx, "collections", "canEdit");
      await setFinancialCashBalance(input);
      return { success: true };
    }),
    addCommitment: adminProcedure.input(z.object({
      description: z.string().min(1).max(255), amount: z.number().positive(), dueDate: z.string(),
      projectId: z.number().int().positive().optional(), collectionId: z.number().int().positive().optional(),
      dealId: z.number().int().positive().optional(), notes: z.string().optional(), createdBy: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireAllScope(ctx, "collections", "canAdd");
      if (input.dealId !== undefined) await requireDealRecordScope(ctx, input.dealId, "canView");
      if (input.collectionId !== undefined) await requireCollectionFinancialAccess(ctx, input.collectionId, "لا تملك صلاحية إضافة التزام لهذا العقد", "canView");
      return { id: await addFinancialCommitment(input) };
    }),
    settleCommitment: adminProcedure.input(z.object({ id: z.number().int().positive(), settledBy: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "collections", "canEdit");
        await settleFinancialCommitment(input.id, input.settledBy);
        return { success: true };
      }),
    cancelCommitment: adminProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "collections", "canDelete");
        await cancelFinancialCommitment(input.id);
        return { success: true };
      }),
  }),
  // ── Legacy: Customers / Products ───────────────────────────────────────────────────────────────────────────────
  customers: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm");
        return getCustomers(input);
      }),
    create: protectedProcedure.input(z.object({ name: z.string().min(1), email: z.string().optional(), phone: z.string().optional(), company: z.string().optional(), status: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm", "canAdd");
        await createCustomer({ ...input, status: input.status ?? 'active' });
        return { success: true };
      }),
    update: protectedProcedure.input(z.object({ id: z.number(), name: z.string().optional(), email: z.string().optional(), phone: z.string().optional(), company: z.string().optional(), status: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm", "canEdit");
        const { id, ...data } = input;
        await updateCustomer(id, data);
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm", "canDelete");
        await deleteCustomer(input.id);
        return { success: true };
      }),
  }),
  products: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), category: z.string().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => getProducts(input)),
    categories: protectedProcedure.query(async () => getProductCategories()),
    create: protectedProcedure.input(z.object({ name: z.string().min(1), sku: z.string().optional(), category: z.string().optional(), price: z.string(), cost: z.string().optional(), stock: z.number().optional(), minStock: z.number().optional(), unit: z.string().optional(), description: z.string().optional(), status: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "إدارة كتالوج المنتجات متاحة للإدارة المالية فقط");
        await requireAllScope(ctx, "pricing_system", "canAdd");
        await createProduct({ ...input, status: input.status ?? 'active' });
        return { success: true };
      }),
    update: protectedProcedure.input(z.object({ id: z.number(), name: z.string().optional(), sku: z.string().optional(), category: z.string().optional(), price: z.string().optional(), cost: z.string().optional(), stock: z.number().optional(), minStock: z.number().optional(), unit: z.string().optional(), description: z.string().optional(), status: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "تعديل كتالوج المنتجات متاح للإدارة المالية فقط");
        await requireAllScope(ctx, "pricing_system", "canEdit");
        const { id, ...data } = input;
        await updateProduct(id, data);
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "حذف منتجات الكتالوج متاح للإدارة المالية فقط");
        await requireAllScope(ctx, "pricing_system", "canDelete");
        await deleteProduct(input.id);
        return { success: true };
      }),
  }),

  // ─── Admin Sales Tasks ────────────────────────────────────────────────────
  // ── Management Focus ─────────────────────────────────────────────────────
  management: router({
    focus: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "reports");
        return getManagementFocus(input.year, input.month);
      }),
  }),
  // ─── Meeting Recording & Review ────────────────────────────────────────────────────────────────────────────────
  meetingReview: router({
    // تقديم رابط تسجيل الميتينج
    submitLink: protectedProcedure
      .input(z.object({ taskId: z.number(), link: z.string().url('رابط غير صحيح') }))
      .mutation(async ({ input, ctx }) => {
        await requireMeetingReviewManager(ctx, input.taskId, "edit");
        const task = await submitMeetingRecordingLink(input.taskId, input.link);
        if (!task) throw new Error('المهمة غير موجودة');
        return { success: true, task };
      }),
    // جلب تقييم مهمة معينة
    getReview: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input, ctx }) => { await requireMeetingReviewManager(ctx, input.taskId, "view"); return getMeetingReview(input.taskId); }),
    // إنشاء أو تحديث تقييم الميتينج
    upsertReview: protectedProcedure
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
      .mutation(async ({ input, ctx }) => {
        await requireMeetingReviewManager(ctx, input.taskId, "edit");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
        const { dailyTasks } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [task] = await db.select({ engineerId: dailyTasks.engineerId })
          .from(dailyTasks).where(eq(dailyTasks.id, input.taskId)).limit(1);
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "المهمة غير موجودة" });
        assertTaskEngineerMatch(task.engineerId, input.engineerId);
        const review = await upsertMeetingReview({ ...input, engineerId: task.engineerId });
        return { success: true, review };
      }),
    // جلب Closing Quality Score لمهندس
    getClosingQuality: protectedProcedure
      .input(z.object({ engineerId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const caller = await getCallerFromContext(ctx);
        if (!caller) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
        if (!["admin", "manager", "admin_sales"].includes(caller.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "تقييمات الإغلاق متاحة للإدارة فقط" });
        }
        const access = await getOperationalScopeAccess(ctx, "kpi");
        const engineerId = scopedEngineerId(access, input.engineerId);
        return getEngineerClosingQualityScore(engineerId, input.year, input.month);
      }),
  }),
  adminSalesTasks: router({
    // جلب مهام يوم معين لـ Admin Sales
    getByDate: protectedProcedure
      .input(z.object({ engineerId: z.number(), date: z.string() }))
      .query(async ({ input, ctx }) => { await requireAdminSalesTaskCaller(ctx, input.engineerId, undefined, "canView"); return getAdminSalesTasks(input.engineerId, input.date); }),
    // تحديث حالة مهمة
    updateStatus: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        status: z.enum(['pending', 'done', 'delayed', 'not_done']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSalesTaskCaller(ctx, undefined, input.taskId, "canEdit");
        await updateAdminSalesTaskStatus(input.taskId, input.status, input.notes);
        return { success: true };
      }),
    // جلب أو إنشاء سجل الاجتماعات الأسبوعية
    getWeekMeeting: protectedProcedure
      .input(z.object({ engineerId: z.number(), weekStart: z.string() }))
      .query(async ({ input, ctx }) => {
        await getOperationalScopeAccess(ctx, "tasks", "canAdd");
        await getOperationalScopeAccess(ctx, "tasks", "canEdit");
        await requireAdminSalesTaskCaller(ctx, input.engineerId, undefined, "canView");
        return getOrCreateWeekMeeting(input.engineerId, input.weekStart);
      }),
    // تحديث سجل الاجتماعات
    updateWeekMeeting: protectedProcedure
      .input(z.object({
        id: z.number(),
        weeklyTeamMeeting: z.enum(['done', 'not_done', 'pending']).optional(),
        managementMeeting: z.enum(['done', 'not_done', 'pending']).optional(),
        reportSubmitted: z.enum(['yes', 'no', 'pending']).optional(),
        meetingNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSalesMeetingCaller(ctx, input.id, "canEdit");
        const { id, ...data } = input;
        await updateWeekMeeting(id, data);
        return { success: true };
      }),
     // إحصائيات للمدير
    getStats: protectedProcedure
      .input(z.object({ engineerId: z.number(), month: z.string() }))
      .query(async ({ input, ctx }) => { await requireAdminSalesTaskCaller(ctx, input.engineerId, undefined, "canView"); return getAdminSalesStats(input.engineerId, input.month); }),
    // إضافة مهمة يدوية لـ Admin Sales
    create: protectedProcedure
      .input(z.object({
        engineerId: z.number(),
        taskTitle: z.string().min(1),
        taskType: z.enum(['daily', 'weekly', 'monthly', 'meeting']),
        taskDate: z.string(),
        category: z.enum(['crm_data', 'financial_collection', 'operations', 'reporting', 'coordination', 'meetings']).optional(),
        notes: z.string().optional(),
        kpiWeight: z.number().optional(),
        kpiImpact: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSalesTaskCaller(ctx, input.engineerId, undefined, "canAdd");
        await createAdminSalesTask(input);
        return { success: true };
      }),
    // تحديث مهمة Admin Sales بالكامل
    updateFull: protectedProcedure
      .input(z.object({
        id: z.number(),
        taskTitle: z.string().optional(),
        taskType: z.enum(['daily', 'weekly', 'monthly', 'meeting']).optional(),
        taskDate: z.string().optional(),
        category: z.enum(['crm_data', 'financial_collection', 'operations', 'reporting', 'coordination', 'meetings']).optional(),
        notes: z.string().optional(),
        kpiWeight: z.number().optional(),
        kpiImpact: z.string().optional(),
        status: z.enum(['pending', 'done', 'delayed', 'not_done']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAdminSalesTaskCaller(ctx, undefined, input.id, "canEdit");
        const { id, ...data } = input;
        await updateAdminSalesTaskFull(id, data);
        return { success: true };
      }),
  }),

  // ─── Lead Followup Tracking ────────────────────────────────────────────────────────────────────────────────
  leadFollowup: router({
    // تسجيل نتيجة متابعة Lead يومية
    log: protectedProcedure
      .input(z.object({
        logDate: z.string(),
        adminSalesId: z.number(),
        telesalesId: z.number(),
        followupStatus: z.enum(['followed_up', 'delayed', 'no_response']),
        responseDelayHours: z.number().optional(),
        followupQuality: z.enum(['excellent', 'good', 'poor']).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm", "canAdd");
        return logLeadFollowup(input);
      }),

    // جلب سجلات المتابعة
    getLogs: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        adminSalesId: z.number().optional(),
        telesalesId: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm");
        return getLeadFollowupLogs(input);
      }),

    // KPI لـ Admin Sales
    adminSalesKPI: protectedProcedure
      .input(z.object({ adminSalesId: z.number(), startDate: z.string(), endDate: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm");
        return getAdminSalesFollowupKPI(input.adminSalesId, input.startDate, input.endDate);
      }),

    // KPI لـ Tele-sales
    telesalesKPI: protectedProcedure
      .input(z.object({ telesalesId: z.number(), startDate: z.string(), endDate: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm");
        return getTelesalesFollowupKPI(input.telesalesId, input.startDate, input.endDate);
      }),

    // إحصائيات جميع Tele-sales
    allTelesalesStats: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm");
        return getAllTelesalesFollowupStats(input.startDate, input.endDate);
      }),
  }),
  // Soft Delete + Audit Log
  softDelete: router({
    engineer: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const caller = await requireUserManagementCaller(ctx, "حذف المهندسين متاح للإدارة فقط");
        await softDeleteEngineer(input.id, input.reason, input.reasonCustom, caller.name);
        return { success: true };
      }),
    task: adminProcedure
      .input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const access = await requireTaskAction(ctx, "delete", input.id);
        return await softDeleteTask(input.id, input.reason, input.reasonCustom, access.caller.name);
      }),
    lead: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const access = await requireLeadRecordScope(ctx, input.id, "canDelete");
        await softDeleteLead(input.id, input.reason, input.reasonCustom, access.caller.name);
        return { success: true };
      }),
    visit: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const access = await requireVisitRecordScope(ctx, input.id, "canDelete");
        await softDeleteVisitFull(input.id, input.reason, input.reasonCustom, access.caller.name);
        return { success: true };
      }),
    deal: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.enum(['data_entry_error','duplicate','client_cancelled','other']), reasonCustom: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const access = await requireDealRecordScope(ctx, input.id, "canDelete");
        await softDeleteDeal(input.id, input.reason, input.reasonCustom, access.caller.name);
        return { success: true };
      }),
    getAuditLogs: protectedProcedure
      .input(z.object({ entityType: z.enum(['engineer','task','lead','visit','deal']).optional(), limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "tasks");
        await requirePrivilegedRoleManagementCaller(ctx, "سجل الحذف متاح للإدارة فقط");
        return getAuditLogs(input);
      }),
  }),
  // ─── Lead Daily Stats ─────────────────────────────────────────────────────────
  pushNotifications: router({
    publicKey: protectedProcedure.query(async () => ({ publicKey: await getWebPushPublicKey() })),
    subscribe: protectedProcedure.input(z.object({
      endpoint: z.string().url().max(2048),
      keys: z.object({ p256dh: z.string().min(1).max(255), auth: z.string().min(1).max(255) }),
    })).mutation(async ({ input, ctx }) => {
      if (!ctx.actor) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
      return savePushSubscription(ctx.actor.id, { ...input, userAgent: ctx.req.headers["user-agent"] });
    }),
    unsubscribe: protectedProcedure.input(z.object({ endpoint: z.string().url().max(2048) }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.actor) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
        return removePushSubscription(ctx.actor.id, input.endpoint);
      }),
  }),

  localAuth: router({
    // تسجيل الدخول بيوزرنيم وباسورد
    login: publicProcedure
      .input(z.object({
        username: z.string().trim().min(1).max(64),
        password: z.string().min(1).max(128),
      }))
      .mutation(async ({ input, ctx }) => {
        let rateLimitKey: string;
        try {
          rateLimitKey = await assertLoginAttemptAllowed(ctx.req, input.username);
        } catch (error) {
          if (error instanceof LoginRateLimitError) {
            throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "محاولات دخول كثيرة، حاول لاحقاً" });
          }
          throw error;
        }
        // User Management creates login identities in app_users. Keep the
        // legacy engineers lookup below so existing engineer accounts continue
        // to work without creating duplicate identities.
        const appUserResult = await loginAppUser(input.username, input.password);
        if (appUserResult) {
          await clearLoginAttempts(rateLimitKey);
          const res = (ctx as any).res;
          if (res) {
            setResponseCookie(res, "app_user_token", appUserResult.token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 7 * 24 * 60 * 60 * 1000,
              path: "/",
            });
          }
          await logActivity({ userId: appUserResult.user.id, action: 'login', details: 'تسجيل دخول ناجح' });
          return {
            ok: true,
            role: appUserResult.user.role,
            name: appUserResult.user.name,
            engineerId: appUserResult.user.engineerId ?? 0,
            forcePasswordChange: false,
          };
        }

        const result = await localLogin(input.username, input.password);
        if (!result) {
          await recordFailedLoginAttempt(rateLimitKey);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }
        await clearLoginAttempts(rateLimitKey);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        setResponseCookie(ctx.res, LOCAL_AUTH_COOKIE, result.token, {
          ...cookieOptions,
          // `setResponseCookie` follows Express semantics: duration is milliseconds.
          maxAge: ONE_YEAR_MS,
        });
        return {
          ok: true,
          role: result.session.role,
          name: result.session.name,
          engineerId: result.session.engineerId,
          forcePasswordChange: result.session.forcePasswordChange ?? false,
        };
      }),
    // جلب بيانات الجلسة الحالية
    me: publicProcedure
      .query(async ({ ctx }) => {
        // 1) Try local session (username/password login)
        const session = await getLocalSessionFromRequest(ctx.req);
        if (session) {
          return { engineerId: session.engineerId, username: session.username, role: session.role, name: session.name };
        }
        if (ctx.actor?.source === "app_user") {
          return { engineerId: ctx.actor.engineerId ?? 0, username: ctx.actor.name, role: ctx.actor.role, name: ctx.actor.name };
        }
        // OAuth users are admitted to the internal dashboard only when the
        // server-side identity is explicitly an admin.
        if (ctx.user?.role === "admin") {
          return { engineerId: 0, username: ctx.user.email ?? ctx.user.name ?? "admin", role: "admin", name: ctx.user.name ?? "Admin" };
        }
        return null;
      }),
    // تسجيل الخروج
    logout: publicProcedure
      .mutation(async ({ ctx }) => {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        clearResponseCookie(ctx.res, LOCAL_AUTH_COOKIE, cookieOptions);
        clearResponseCookie(ctx.res, "app_user_token", { httpOnly: true, sameSite: "lax", path: "/" });
        return { ok: true };
      }),
    // جلب صلاحيات الـ role الحالي (للـ DashboardLayout)
    myPermissions: publicProcedure
      .query(async ({ ctx }) => {
        // UI visibility is based only on explicit per-user grants. Role-based
        // admin checks remain separate for security-sensitive management APIs.
        const session = await getLocalSessionFromRequest(ctx.req);
        if (session) {
          const linkedUser = await getAppUserByEngineerId(session.engineerId);
          if (!linkedUser) return [];
          return resolveUserPermissions(await getUserPermissions(linkedUser.id));
        }
        if (ctx.actor?.source === "app_user") {
          return resolveUserPermissions(await getUserPermissions(ctx.actor.id));
        }
        // OAuth identities without a matching app_users row have no direct
        // operational grants; authentication alone never grants module access.
        return [];
      }),
  }),

  leadDailyStats: router({
    // إدخال أو تحديث أرقام يوم معين
    upsert: protectedProcedure
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
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm", "canAdd");
        return upsertLeadDailyStats(input);
      }),
    // جلب سجلات الأيام
    list: protectedProcedure
      .input(z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm");
        return getLeadDailyStatsList(input);
      }),
    // إحصائيات إجمالية للفترة
    summary: protectedProcedure
      .input(z.object({
        from: z.string(),
        to: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "crm");
        return getLeadSummaryStats(input);
      }),
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
          "design_3d", "render", "design_2d", "quotation"
        ]),
        durationMinutes: z.number().min(5).max(480).default(60),
        clientName: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "tasks", "canAdd");
        const engineerId = scopedEngineerId(access, input.engineerId);
        const d = new Date(input.logDate);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNumber = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
        await logWorkActivity({
          engineerId,
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
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "tasks");
        return getWorkDistribution(scopedEngineerId(access, input.engineerId), input.year, input.month);
      }),

    // توزيع كل المهندسين (admin فقط)
    allEngineers: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "tasks");
        return getAllEngineersDistribution(input.year, input.month);
      }),

    // تحليل أسبوعي
    weeklyAnalysis: protectedProcedure
      .input(z.object({
        engineerId: z.number(),
        year: z.number(),
        weekNumber: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "tasks");
        return getWeeklyDistribution(scopedEngineerId(access, input.engineerId), input.year, input.weekNumber);
      }),

    // تحليل نقاط الضعف (Critical Insights)
    criticalInsights: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "tasks");
        return getCriticalInsights(input.year, input.month);
      }),

    // ترتيب شامل (Sales + Closing + Distribution)
    fullRanking: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "tasks");
        return getEngineerRankingFull(input.year, input.month);
      }),

    // ثوابت (labels + targets)
    config: protectedProcedure.query(() => ({
      activityLabels: ACTIVITY_LABELS,
      targets: WORK_DISTRIBUTION_TARGETS,
    })),
  }),
  // ── Reports Module ──────────────────────────────────────────────────────────
  reports: router({
    // تقرير أسبوعي كامل مع Distribution Score + Behavior Alerts + Insights
    weeklyFull: protectedProcedure.query(async ({ ctx }) => {
      await requireAllScope(ctx, "reports");
      return getWeeklyPerformanceFull();
    }),
    // تقرير شهري مبني على Output الفعلي
    monthlyKPI: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "reports");
        return getOutputBasedKPI(input.year, input.month);
      }),
    // تقرير ربع سنوي (مقارنة 3 أشهر)
    quarterly: protectedProcedure
      .input(z.object({ year: z.number(), quarter: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "reports");
        const { year, quarter } = input;
        const months = [quarter * 3 - 2, quarter * 3 - 1, quarter * 3];
        const results = await Promise.all(months.map(m => getOutputBasedKPI(year, m)));
        return { year, quarter, months: results };
      }),
  }),
  // ── Pipeline & Discount ─────────────────────────────────────────────────────
  pipeline: router({
    engineerStats: protectedProcedure
      .input(z.object({ engineerId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing");
        return getEngineerPipelineStats(scopedEngineerId(access, input.engineerId));
      }),
    overview: protectedProcedure.query(async ({ ctx }) => {
      await requireAllScope(ctx, "closing");
      return getPipelineOverview();
    }),
    approveDiscount: protectedProcedure
      .input(z.object({ dealId: z.number(), status: z.enum(['approved', 'rejected']), approvedBy: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireDealRecordScope(ctx, input.dealId, "canEdit");
        await updateDiscountApproval(input.dealId, input.status, input.approvedBy);
        return { success: true };
      }),
    computeBonus: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireDealRecordScope(ctx, input.dealId, "canEdit");
        await computeAndSaveDealBonus(input.dealId);
        return { success: true };
      }),
    bonusSummary: protectedProcedure.query(async ({ ctx }) => {
      await requireAllScope(ctx, "closing");
      return getEngineerBonusSummary();
    }),
  }),
  // ── Playbook & Sales Execution ───────────────────────────────────────────────
  playbook: router({
    // عناصر الـ Playbook
    list: protectedProcedure
      .input(z.object({ category: z.string().optional() }))
      .query(async ({ input }) => getPlaybookItems(input.category)),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getPlaybookItemById(input.id)),
    categories: protectedProcedure.query(async () => getPlaybookCategories()),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        category: z.string().optional(),
        code: z.string().optional(),
        price: z.number().optional(),
        unit: z.string().optional(),
        description: z.string().optional(),
        script: z.string().optional(),
        keyPoints: z.string().optional(),
        usageLocations: z.string().optional(),
        alternatives: z.string().optional(),
        specData: z.string().optional(),
        imageUrls: z.string().optional(),
        videoUrl: z.string().optional(),
        renderUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "إدارة كتالوج الـ Playbook متاحة للإدارة المالية فقط");
        await requireAllScope(ctx, "pricing_system", "canAdd");
        await createPlaybookItem({ ...input, price: input.price?.toString() });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        category: z.string().optional(),
        code: z.string().optional(),
        price: z.number().optional(),
        unit: z.string().optional(),
        description: z.string().optional(),
        script: z.string().optional(),
        keyPoints: z.string().optional(),
        usageLocations: z.string().optional(),
        alternatives: z.string().optional(),
        specData: z.string().optional(),
        imageUrls: z.string().optional(),
        videoUrl: z.string().optional(),
        renderUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "تعديل كتالوج الـ Playbook متاح للإدارة المالية فقط");
        await requireAllScope(ctx, "pricing_system", "canEdit");
        const { id, price, ...rest } = input;
        await updatePlaybookItem(id, { ...rest, price: price?.toString() });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "حذف عناصر الـ Playbook متاح للإدارة المالية فقط");
        await requireAllScope(ctx, "pricing_system", "canDelete");
        return deletePlaybookItem(input.id);
      }),
    import: protectedProcedure
      .input(z.object({
        items: z.array(z.object({
          name: z.string(),
          category: z.string().optional(),
          code: z.string().optional(),
          price: z.number().optional(),
          unit: z.string().optional(),
          description: z.string().optional(),
          script: z.string().optional(),
          keyPoints: z.string().optional(),
          usageLocations: z.string().optional(),
          imageUrls: z.string().optional(),
          videoUrl: z.string().optional(),
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        await requireFinancialManager(ctx, "استيراد كتالوج الـ Playbook متاح للإدارة المالية فقط");
        await requireAllScope(ctx, "pricing_system", "canAdd");
        const items = input.items.map(i => ({ ...i, price: i.price?.toString() }));
        return importPlaybookItems(items);
      }),
    // عروض الأسعار
    createQuotation: protectedProcedure
      .input(z.object({
        engineerId: z.number(),
        dealId: z.number().optional(),
        clientName: z.string().optional(),
        items: z.array(z.object({ itemId: z.number(), qty: z.number(), price: z.number(), notes: z.string().optional() })),
        totalValue: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "pricing_system", "canAdd");
        const engineerId = scopedEngineerId(access, input.engineerId);
        if (input.dealId !== undefined) await requireDealRecordScope(ctx, input.dealId, "canView");
        await createPlaybookQuotation({ ...input, engineerId });
        return { success: true };
      }),
    listQuotations: protectedProcedure
      .input(z.object({ engineerId: z.number().optional(), dealId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "pricing_system");
        const engineerId = scopedEngineerId(access, input.engineerId);
        if (input.dealId !== undefined) await requireDealRecordScope(ctx, input.dealId, "canView");
        return getPlaybookQuotations(engineerId, input.dealId);
      }),
    updateRecording: protectedProcedure
      .input(z.object({ quotationId: z.number(), recordingLink: z.string().url() }))
      .mutation(async ({ input, ctx }) => {
        await requirePlaybookQuotationScope(ctx, input.quotationId, "canEdit");
        return updatePlaybookRecordingLink(input.quotationId, input.recordingLink);
      }),
    updateStatus: protectedProcedure
      .input(z.object({ quotationId: z.number(), status: z.enum(['draft', 'presented', 'accepted', 'rejected']) }))
      .mutation(async ({ input, ctx }) => {
        await requirePlaybookQuotationScope(ctx, input.quotationId, "canEdit");
        return updatePlaybookQuotationStatus(input.quotationId, input.status);
      }),
    // Funnel Analysis
    funnelAnalysis: protectedProcedure
      .input(z.object({ engineerId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "reports");
        return getFunnelAnalysis(scopedEngineerId(access, input.engineerId));
      }),
    // Meeting Reviews
    reviewsList: protectedProcedure
      .input(z.object({ engineerId: z.number().optional(), limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "kpi");
        return getMeetingReviewsList(scopedEngineerId(access, input.engineerId), input.limit);
      }),
    weeklyCoaching: protectedProcedure
      .input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "kpi");
        return getWeeklyCoachingSummary(scopedEngineerId(access, input.engineerId));
      }),
  }),
  // ── Meeting Session Tracking ───────────────────────────────────────────────
  session: router({
    create: protectedProcedure
      .input(z.object({
        engineerId: z.number(),
        quotationId: z.number().optional(),
        dealId: z.number().optional(),
        clientName: z.string().optional(),
        sessionType: z.enum(['presentation', 'closing', 'follow_up']).optional(),
        itemsTotal: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "tasks", "canAdd");
        const engineerId = scopedEngineerId(access, input.engineerId);
        if (input.dealId !== undefined) {
          await requireDealRecordScope(ctx, input.dealId, "canView");
        }
        if (input.quotationId !== undefined) {
          await requirePlaybookQuotationScope(ctx, input.quotationId, "canView");
        }
        const id = await createMeetingSession({ ...input, engineerId });
        return { success: true, sessionId: id };
      }),
    end: protectedProcedure
      .input(z.object({ sessionId: z.number(), recordingLink: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireMeetingSessionScope(ctx, input.sessionId, "canEdit");
        return endMeetingSession(input.sessionId, input.recordingLink);
      }),
    logAction: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        itemId: z.number().optional(),
        actionType: z.enum(['item_opened','video_started','video_completed','render_viewed',
          'script_opened','script_read','price_viewed','quotation_opened','item_completed','item_skipped']),
        durationSeconds: z.number().optional(),
        metadata: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireMeetingSessionScope(ctx, input.sessionId, "canAdd");
        await logSessionAction(input);
        return { success: true };
      }),
    details: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireMeetingSessionScope(ctx, input.sessionId, "canView");
        return getSessionDetails(input.sessionId);
      }),
    engineerStats: protectedProcedure
      .input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "tasks");
        return getEngineerMeetingStats(scopedEngineerId(access, input.engineerId));
      }),
    adminList: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "tasks");
        await requirePrivilegedRoleManagementCaller(ctx, "قائمة الجلسات متاحة للإدارة فقط");
        return getAllMeetingSessionsAdmin(input.limit);
      }),
    updateRecording: protectedProcedure
      .input(z.object({ sessionId: z.number(), recordingLink: z.string().url() }))
      .mutation(async ({ input, ctx }) => {
        await requireMeetingSessionScope(ctx, input.sessionId, "canEdit");
        await updateSessionRecordingLink(input.sessionId, input.recordingLink);
        return { success: true };
      }),
    weeklyCoaching: protectedProcedure
      .input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "tasks");
        return getEngineerWeeklyCoaching(scopedEngineerId(access, input.engineerId));
      }),
  }),
  // ── Promotion & Evaluation System ─────────────────────────────────────────
  promotion: router({
    // Meeting Review (أداة تقييم حقيقية)
    createMeetingReview: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        engineerId: z.number(),
        reviewedBy: z.number().optional(),
        playbookUsageScore: z.number().min(0).max(10),
        presentationQualityScore: z.number().min(0).max(10),
        controlScore: z.number().min(0).max(10),
        closingAttemptScore: z.number().min(0).max(10),
        decisionTag: z.enum(['strong', 'needs_improvement', 'weak']),
        strengthPoint: z.string().min(1),
        improvementPoint: z.string().min(1),
        comments: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "kpi", "canAdd");
        await requireMeetingReviewManager(ctx, input.taskId, "edit");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
        const { dailyTasks } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [task] = await db.select({ engineerId: dailyTasks.engineerId }).from(dailyTasks).where(eq(dailyTasks.id, input.taskId)).limit(1);
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "المهمة غير موجودة" });
        assertTaskEngineerMatch(task.engineerId, input.engineerId);
        return createOrUpdateMeetingReview(input);
      }),

    getMeetingReviewByTask: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireMeetingReviewManager(ctx, input.taskId, "view");
        return getMeetingReviewByTask(input.taskId);
      }),

    getMeetingReviewSummary: protectedProcedure
      .input(z.object({ engineerId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "kpi");
        return getEngineerMeetingReviewSummary(scopedEngineerId(access, input.engineerId));
      }),

    getMeetingTasksPendingReview: protectedProcedure
      .query(async ({ ctx }) => {
        const caller = await getCallerFromContext(ctx);
        if (!caller || !["admin", "manager", "admin_sales"].includes(caller.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "مراجعات الاجتماعات متاحة للإدارة فقط" });
        }
        await requireAllScope(ctx, "kpi");
        return getMeetingTasksPendingReview();
      }),

    // Monthly Evaluation
    createMonthlyEvaluation: protectedProcedure
      .input(z.object({
        engineerId: z.number(),
        evaluationMonth: z.number().min(1).max(12),
        evaluationYear: z.number(),
        salesAchievementScore: z.number().min(0).max(100),
        closingRateScore: z.number().min(0).max(100),
        meetingScore: z.number().min(0).max(100),
        playbookUsageScore: z.number().min(0).max(100),
        taskDisciplineScore: z.number().min(0).max(100),
        reviewedBy: z.number().optional(),
        coachingNotes: z.string().optional(),
        improvementPlan: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "kpi", "canAdd");
        await requirePrivilegedRoleManagementCaller(ctx, "التقييم الشهري متاح للإدارة فقط");
        return createOrUpdateMonthlyEvaluation(input);
      }),

    getEvaluationHistory: protectedProcedure
      .input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "kpi");
        return getEngineerEvaluationHistory(scopedEngineerId(access, input.engineerId));
      }),

    getAllEngineersDashboard: protectedProcedure
      .query(async ({ ctx }) => {
        await requireAllScope(ctx, "kpi");
        await requirePrivilegedRoleManagementCaller(ctx, "لوحة تقييم جميع المهندسين متاحة للإدارة فقط");
        return getAllEngineersEvaluationDashboard();
      }),

    // Career Path
    promoteEngineer: protectedProcedure
      .input(z.object({ engineerId: z.number(), promotedBy: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        await requireAllScope(ctx, "kpi", "canEdit");
        await requirePrivilegedRoleManagementCaller(ctx, "ترقية المهندسين متاحة للإدارة فقط");
        return promoteEngineer(input.engineerId, input.promotedBy);
      }),

    getCareerLevel: protectedProcedure
      .input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => {
        // This legacy query may create the career-level row when missing, so it
        // must not be authorized by canView alone.
        await getOperationalScopeAccess(ctx, "kpi", "canAdd");
        await getOperationalScopeAccess(ctx, "kpi", "canEdit");
        const access = await getOperationalScopeAccess(ctx, "kpi");
        return getOrCreateEngineerCareerLevel(scopedEngineerId(access, input.engineerId));
      }),

    // Management Decision Dashboard
    getManagementDashboard: protectedProcedure
      .query(async ({ ctx }) => {
        await requireAllScope(ctx, "kpi");
        await requirePrivilegedRoleManagementCaller(ctx, "لوحة قرارات الإدارة متاحة للإدارة فقط");
        return getManagementDecisionDashboard();
      }),
    // Engineer Promotion Progress (تفاصيل الترقية لمهندس واحد)
    getEngineerPromotionProgress: protectedProcedure
      .input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "kpi");
        return getEngineerPromotionProgress(scopedEngineerId(access, input.engineerId));
      }),
  }),

  // ── Funnel Analysis ───────────────────────────────────────────────────────
  funnel: router({
    full: protectedProcedure
      .input(z.object({
        engineerId: z.number().optional(),
        period: z.enum(['week', 'month', 'quarter']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "reports");
        return getFullFunnelAnalysis(scopedEngineerId(access, input.engineerId), input.period);
      }),
    comparison: protectedProcedure
      .query(async ({ ctx }) => {
        await requireAllScope(ctx, "reports");
        return getEngineersFunnelComparison();
      }),
    playbookInsights: protectedProcedure
      .input(z.object({ engineerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "reports");
        return getEngineerFunnelPlaybookInsights(scopedEngineerId(access, input.engineerId));
      }),
  }),
  // ── Internal Users System (نظام المستخدمين الداخلي) ───────────────────────

  appUsers: router({
    // Login
    login: publicProcedure
      .input(z.object({
        username: z.string().trim().min(1).max(64),
        password: z.string().min(1).max(128),
      }))
      .mutation(async ({ input, ctx }) => {
        let rateLimitKey: string;
        try {
          rateLimitKey = await assertLoginAttemptAllowed(ctx.req, input.username);
        } catch (error) {
          if (error instanceof LoginRateLimitError) {
            throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "محاولات دخول كثيرة، حاول لاحقاً" });
          }
          throw error;
        }
        const result = await loginAppUser(input.username, input.password);
        if (!result) {
          await recordFailedLoginAttempt(rateLimitKey);
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        await clearLoginAttempts(rateLimitKey);
        // تسجيل النشاط
        await logActivity({ userId: result.user.id, action: 'login', details: 'تسجيل دخول ناجح' });
        // حفظ token في cookie
        const res = (ctx as any).res;
        if (res) {
          setResponseCookie(res, "app_user_token", result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
          });
        }
        return { success: true, user: { id: result.user.id, name: result.user.name, username: result.user.username, role: result.user.role, engineerId: result.user.engineerId } };
      }),
    // Logout
    logout: publicProcedure
      .mutation(async ({ ctx }) => {
        const res = (ctx as any).res;
        if (res) clearResponseCookie(res, "app_user_token", { httpOnly: true, sameSite: "lax", path: "/" });
        return { success: true };
      }),
    // Get current user from token
    me: publicProcedure
      .query(async ({ ctx }) => {
        const req = (ctx as any).req;
        const token = req ? getRequestCookie(req, "app_user_token") : undefined;
        if (!token) return null;
        const user = await verifyAppUserToken(token);
        if (!user) return null;
        const permissions = await getUserPermissions(user.id);
        return { ...user, permissions };
      }),
    // List all users (manager/admin only)
    list: protectedProcedure
      .query(async ({ ctx }) => {
        await requireUserManagementCaller(ctx, 'ليس لديك صلاحية الوصول');
        return getAppUsers();
      }),
    // Create user (manager only)
    create: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(120),
        username: z.string().trim().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل').max(64).regex(/^[a-zA-Z0-9._-]+$/, 'اسم المستخدم يجب أن يحتوي على حروف وأرقام فقط'),
        password: z.string().min(MIN_ACCOUNT_PASSWORD_LENGTH, `كلمة المرور يجب أن تكون ${MIN_ACCOUNT_PASSWORD_LENGTH} حرفاً على الأقل`).max(128),
        role: z.enum(['sales_engineer', 'sales_specialist', 'admin_sales', 'manager', 'admin']),
        engineerId: z.number().int().positive().optional(),
        email: z.string().email('صيغة البريد الإلكتروني غير صحيحة').optional().or(z.literal('')).transform(v => v || undefined),
      }))
      .mutation(async ({ input, ctx }) => {
        const caller = await requireUserManagementCaller(ctx, 'ليس لديك صلاحية إنشاء مستخدمين');
        assertCanAssignRole(caller.role, input.role);
        // A new operational user may intentionally have no selected engineer:
        // createAppUser will create or safely reuse the matching legacy record.
        if (input.engineerId) await validateAppUserEngineerLink(undefined, input.role, input.engineerId);
        try {
          const newUser = await createAppUser(input);
          await logActivity({ userId: caller.id, action: 'create', module: 'users', details: `إنشاء مستخدم: ${input.username}` });
          return newUser;
        } catch (err: any) {
          if (err.message === 'USERNAME_EXISTS') {
            throw new TRPCError({ code: 'CONFLICT', message: 'اسم المستخدم موجود بالفعل، يرجى اختيار اسم آخر' });
          }
          if (err.message === 'EMAIL_EXISTS') {
            throw new TRPCError({ code: 'CONFLICT', message: 'البريد الإلكتروني مستخدم بالفعل' });
          }
          if (err.message === 'ENGINEER_LINK_EXISTS') {
            throw new TRPCError({ code: 'CONFLICT', message: 'هذا المهندس لديه حساب نظام بالفعل؛ استخدم تعديل المستخدم أو أنشئ حسابًا ببيانات جديدة' });
          }
          console.error('[appUsers.create] Error:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'حدث خطأ في الخادم، يرجى المحاولة مرة أخرى' });
        }
      }),
    // Update user (manager only)
    update: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        name: z.string().trim().min(2).max(120).optional(),
        role: z.enum(['sales_engineer', 'sales_specialist', 'admin_sales', 'manager', 'admin']).optional(),
        engineerId: z.number().int().positive().nullable().optional(),
        status: z.enum(['active', 'inactive']).optional(),
        password: z.string().min(MIN_ACCOUNT_PASSWORD_LENGTH).max(128).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const caller = await requireUserManagementCaller(ctx, 'ليس لديك صلاحية تعديل المستخدمين');
        const target = await getAppUserById(input.userId);
        if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
        const { userId, ...data } = input;
        assertCanAssignRole(caller.role, data.role ?? target.role);
        await validateAppUserEngineerLink(userId, data.role ?? target.role, data.engineerId === undefined ? target.engineerId : data.engineerId);
        try {
          await updateAppUser(userId, data);
        } catch (err: any) {
          if (err.message === "USERNAME_EXISTS") {
            throw new TRPCError({ code: "CONFLICT", message: "اسم المستخدم مستخدم في حساب مهندس آخر" });
          }
          throw err;
        }
        await logActivity({ userId: caller.id, action: 'update', module: 'users', recordId: userId, details: `تحديث مستخدم #${userId}` });
        return { success: true };
      }),
    // Get permissions for a user
    getPermissions: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requireUserManagementCaller(ctx, 'ليس لديك صلاحية الوصول');
        return getUserPermissions(input.userId);
      }),
    // Update permissions for a user
    updatePermissions: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        permissions: z.array(z.object({
          module: z.enum([
            'crm', 'visits', 'closing', 'deals', 'kpi', 'planning',
            'discounts', 'reports', 'tasks', 'collections', 'users', 'pricing_system',
          ]),
          canView: z.union([z.literal(0), z.literal(1)]),
          canAdd: z.union([z.literal(0), z.literal(1)]),
          canEdit: z.union([z.literal(0), z.literal(1)]),
          canDelete: z.union([z.literal(0), z.literal(1)]),
          dataScope: z.enum(['own', 'all']),
        })).superRefine((permissions, ctx) => {
          const canonicalModules = permissions.map((permission) =>
            permission.module === 'deals' ? 'closing' : permission.module
          );
          if (new Set(canonicalModules).size !== canonicalModules.length) {
            ctx.addIssue({
              code: "custom",
              message: 'لا يمكن إرسال أكثر من سجل صلاحية لنفس الوحدة',
            });
          }
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        const caller = await requireUserManagementCaller(ctx, 'ليس لديك صلاحية تعديل الصلاحيات');
        const target = await getAppUserById(input.userId);
        if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
        assertCanAssignRole(caller.role, target.role);
        const taskPermission = input.permissions.find((permission) => permission.module === "tasks");
        if (taskPermission?.dataScope === "own" && !target.engineerId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "نطاق صلاحية المهام own يتطلب ربط المستخدم بمهندس. اربط الحساب بمهندس أو اختر all فقط إذا كانت صلاحية عرض بيانات الفريق معتمدة لهذا المستخدم.",
          });
        }
        await updateUserPermissions(input.userId, input.permissions);
        await logActivity({ userId: caller.id, action: 'permission_change', module: 'users', recordId: input.userId, details: `تحديث صلاحيات مستخدم #${input.userId}` });
        return { success: true };
      }),
    // Activity Logs
    activityLogs: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        module: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        await requireUserManagementCaller(ctx, 'ليس لديك صلاحية الوصول إلى سجل النشاط');
        return getActivityLogs(input);
      }),
     // Default permissions per role
    defaultPermissions: protectedProcedure
      .query(async ({ ctx }) => {
        await requireUserManagementCaller(ctx, 'ليس لديك صلاحية الوصول');
        return DEFAULT_ROLE_PERMISSIONS;
      }),
    // ─── Engineer Account Management ─────────────────────────────────────────
    // قراءة كل المهندسين مع حالة الـ account
    listEngineers: protectedProcedure
      .query(async ({ ctx }) => {
        await requireUserManagementCaller(ctx, 'ليس لديك صلاحية الوصول');
        return listEngineersWithAccountStatus();
      }),
    // إنشاء حسابات تلقائياً لكل المهندسين
    bulkCreateAccounts: protectedProcedure
      .input(z.object({ defaultPassword: z.string().min(MIN_ACCOUNT_PASSWORD_LENGTH).max(128) }))
      .mutation(async ({ input, ctx }) => {
        const caller = await requirePrivilegedRoleManagementCaller(ctx, 'إنشاء الحسابات الجماعي متاح للإدارة فقط');
        const result = await bulkCreateEngineersAccounts(input.defaultPassword);
        await logActivity({ userId: caller.id, action: 'create', module: 'users', details: `إنشاء حسابات تلقائية: ${result.created.length} حساب` });
        return result;
      }),
    // إنشاء حساب لمهندس واحد
    createEngineerAccount: protectedProcedure
      .input(z.object({
        engineerId: z.number().int().positive(),
        username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/),
        password: z.string().min(MIN_ACCOUNT_PASSWORD_LENGTH).max(128),
        forceChange: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { caller } = await requireEngineerAccountManagementCaller(ctx, input.engineerId, 'ليس لديك صلاحية إنشاء الحسابات');
        const result = await createEngineerAccount(input.engineerId, input.username, input.password, input.forceChange ?? true);
        if (!result.success) throw new TRPCError({ code: 'CONFLICT', message: result.error });
        await logActivity({ userId: caller.id, action: 'create', module: 'users', details: `إنشاء حساب للمهندس #${input.engineerId}: ${input.username}` });
        return { success: true };
      }),
    // إعادة تعيين كلمة مرور (Admin)
    resetPassword: protectedProcedure
      .input(z.object({ engineerId: z.number().int().positive(), newPassword: z.string().min(MIN_ACCOUNT_PASSWORD_LENGTH).max(128) }))
      .mutation(async ({ input, ctx }) => {
        const { caller } = await requireEngineerAccountManagementCaller(ctx, input.engineerId, 'ليس لديك صلاحية تعديل كلمات المرور');
        await resetEngineerPassword(input.engineerId, input.newPassword);
        await logActivity({ userId: caller.id, action: 'update', module: 'users', recordId: input.engineerId, details: `إعادة تعيين كلمة مرور المهندس #${input.engineerId}` });
        return { success: true };
      }),
    // تغيير كلمة المرور (المهندس نفسه)
    changePassword: protectedProcedure
      .input(z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(MIN_ACCOUNT_PASSWORD_LENGTH).max(128) }))
      .mutation(async ({ input, ctx }) => {
        const req = (ctx as any).req;
        let engineerId: number | null = null;
        const { getLocalSessionFromRequest } = await import('./localAuth');
        const session = await getLocalSessionFromRequest(req);
        if (session) engineerId = session.engineerId;
        if (!engineerId) {
          const token = req ? getRequestCookie(req, "app_user_token") : undefined;
          if (token) {
            const user = await verifyAppUserToken(token);
            if (user?.engineerId) engineerId = user.engineerId;
          }
        }
        if (!engineerId) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول أولاً' });
        const result = await changeEngineerPassword(engineerId, input.oldPassword, input.newPassword);
        if (!result.success) throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
        return { success: true };
      }),
    // تفعيل / تعطيل حساب
    toggleStatus: protectedProcedure
      .input(z.object({ engineerId: z.number().int().positive(), status: z.enum(['active', 'inactive']) }))
      .mutation(async ({ input, ctx }) => {
        const { caller } = await requireEngineerAccountManagementCaller(ctx, input.engineerId, 'ليس لديك صلاحية تعديل حالة الحساب');
        await toggleEngineerAccountStatus(input.engineerId, input.status);
        await logActivity({ userId: caller.id, action: 'update', module: 'users', recordId: input.engineerId, details: `تغيير حالة المهندس #${input.engineerId}: ${input.status}` });
        return { success: true };
      }),
  }),
  // ─── Role Permissions (Dynamic Permissions Control Panel) ─────────────────
  rolePermissions: router({
    // جلب كل الصلاحيات لكل الـ Roles (للـ Matrix)
    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        await requirePrivilegedRoleManagementCaller(ctx, "ليس لديك صلاحية الوصول إلى صلاحيات الأدوار");
        const perms = await getAllRolePermissions();
        return { permissions: perms, modules: SYSTEM_MODULES, roles: SYSTEM_ROLES };
      }),

    // جلب صلاحيات Role معين
    getByRole: protectedProcedure
      .input(z.object({ role: z.string() }))
      .query(async ({ input, ctx }) => {
        await requirePrivilegedRoleManagementCaller(ctx, "ليس لديك صلاحية الوصول إلى صلاحيات الأدوار");
        return getRolePermissions(input.role);
      }),

    // تحديث صلاحية واحدة
    update: protectedProcedure
      .input(z.object({
        role: z.string(),
        module: z.string(),
        canView: z.number().min(0).max(1),
        canAdd: z.number().min(0).max(1),
        canEdit: z.number().min(0).max(1),
        canDelete: z.number().min(0).max(1),
        dataScope: z.enum(['own', 'team', 'all']),
      }))
      .mutation(async ({ input, ctx }) => {
        const caller = await requirePrivilegedRoleManagementCaller(ctx, "ليس لديك صلاحية تعديل صلاحيات الأدوار");
        const { role, module, ...data } = input;
        await updateRolePermission(role, module, data);
        await logActivity({
          userId: caller.id,
          action: 'permission_change',
          module: 'permissions',
          details: `تحديث صلاحية Role: ${role} - Module: ${module}`,
        });
        return { success: true };
      }),

    // تحديث صلاحيات Role كاملة دفعة واحدة
    updateAll: protectedProcedure
      .input(z.object({
        role: z.string(),
        permissions: z.array(z.object({
          module: z.string(),
          canView: z.number().min(0).max(1),
          canAdd: z.number().min(0).max(1),
          canEdit: z.number().min(0).max(1),
          canDelete: z.number().min(0).max(1),
          dataScope: z.enum(['own', 'team', 'all']),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const caller = await requirePrivilegedRoleManagementCaller(ctx, "ليس لديك صلاحية تعديل صلاحيات الأدوار");
        await updateAllRolePermissions(input.role, input.permissions);
        await logActivity({
          userId: caller.id,
          action: 'permission_change',
          module: 'permissions',
          details: `تحديث صلاحيات Role كاملة: ${input.role}`,
        });
        return { success: true };
      }),

    // جلب الـ Modules وRoles المتاحة
    meta: protectedProcedure
      .query(async ({ ctx }) => {
        await requirePrivilegedRoleManagementCaller(ctx, "ليس لديك صلاحية الوصول إلى صلاحيات الأدوار");
        return {
          modules: SYSTEM_MODULES,
          roles: SYSTEM_ROLES,
          moduleSections: MODULE_SECTIONS,
        };
      }),
  }),
  // ─── Section Permissions Router ──────────────────────────────────────────
  sectionPermissions: router({
    // جلب صلاحيات الـ Sections للـ Role الحالي (من local_session)
    myPermissions: protectedProcedure
      .query(async ({ ctx }) => {
        const role = ctx.actor?.role;
        if (!role) throw new TRPCError({ code: "UNAUTHORIZED" });
        const perms = await getSectionPermissions(role);
        // Build map: module.section → { visibility, canEdit }
        const map: Record<string, { visibility: string; canEdit: boolean }> = {};
        for (const p of perms) {
          map[`${p.module}.${p.section}`] = {
            visibility: p.visibility,
            canEdit: p.canEdit === 1,
          };
        }
        return map;
      }),

    // جلب كل صلاحيات الـ Sections لكل الـ Roles (للـ Admin Panel)
    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        const req = (ctx as any).req;
        const caller = await getCallerFromContext(ctx);
        if (!caller) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (!['manager', 'admin'].includes(caller.role)) throw new TRPCError({ code: 'FORBIDDEN' });
        const perms = await getAllSectionPermissions();
        return { permissions: perms, roles: SYSTEM_ROLES, modules: SYSTEM_MODULES };
      }),
    // تهيئة البيانات الافتراضية لـ Section Permissions
    initDefaults: protectedProcedure
      .mutation(async ({ ctx }) => {
        const req = (ctx as any).req;
        const caller = await getCallerFromContext(ctx);
        if (!caller) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (!['manager', 'admin'].includes(caller.role)) throw new TRPCError({ code: 'FORBIDDEN' });
        // Default permissions per role
        const defaults: Array<{ role: string; module: string; section: string; visibility: 'all' | 'self' | 'hidden'; canEdit: number }> = [];
        for (const roleObj of SYSTEM_ROLES) {
          const role = roleObj.key;
          for (const [moduleKey, sections] of Object.entries(MODULE_SECTIONS)) {
            for (const sec of sections) {
              let visibility: 'all' | 'self' | 'hidden' = 'all';
              let canEdit = 0;
              // KPI: engineer_details → manager/admin_sales only
              if (moduleKey === 'kpi' && sec.section === 'engineer_details') {
                visibility = ['manager', 'admin_sales'].includes(role) ? 'all' : 'hidden';
              }
              // KPI: overall_evaluation → manager only
              if (moduleKey === 'kpi' && sec.section === 'overall_evaluation') {
                visibility = role === 'manager' ? 'all' : 'hidden';
              }
              // Planning: engineer_goals → admin sees all, engineer sees self
              if (moduleKey === 'planning' && sec.section === 'engineer_goals') {
                visibility = ['manager', 'admin_sales'].includes(role) ? 'all' : 'self';
              }
              // Planning: personal_goals → admin + self only
              if (moduleKey === 'planning' && sec.section === 'personal_goals') {
                visibility = ['manager', 'admin_sales'].includes(role) ? 'all' : 'self';
              }
              // canEdit: manager/admin_sales can edit
              canEdit = ['manager', 'admin_sales'].includes(role) ? 1 : 0;
              defaults.push({ role, module: moduleKey, section: sec.section, visibility, canEdit });
            }
          }
        }
        await bulkUpdateSectionPermissions(defaults);
        await logActivity({
          userId: caller.id ?? 0,
          action: 'permission_change',
          module: 'permissions',
          details: `تهيئة ${defaults.length} Section Permission افتراضي`,
        });
        return { success: true, count: defaults.length };
      }),

    // جلب صلاحيات Role معين
    getByRole: protectedProcedure
      .input(z.object({ role: z.string() }))
      .query(async ({ input, ctx }) => {
        const req = (ctx as any).req;
        const caller = await getCallerFromContext(ctx);
        if (!caller) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (!['manager', 'admin'].includes(caller.role)) throw new TRPCError({ code: 'FORBIDDEN' });
        return getSectionPermissions(input.role);
      }),

    // تحديث صلاحية Section معين
    update: protectedProcedure
      .input(z.object({
        role: z.string(),
        module: z.string(),
        section: z.string(),
        visibility: z.enum(['all', 'self', 'hidden']),
        canEdit: z.number().min(0).max(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const req = (ctx as any).req;
        const caller = await getCallerFromContext(ctx);
        if (!caller) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (!['manager', 'admin'].includes(caller.role)) throw new TRPCError({ code: 'FORBIDDEN' });
        await updateSectionPermission(input.role, input.module, input.section, input.visibility, input.canEdit);
        await logActivity({
          userId: caller.id ?? 0,
          action: 'permission_change',
          module: 'permissions',
          details: `تحديث Section Permission: ${input.role} → ${input.module}.${input.section} = ${input.visibility}`,
        });
        return { success: true };
      }),

    // تحديث صلاحيات متعددة دفعة واحدة
    bulkUpdate: protectedProcedure
      .input(z.object({
        updates: z.array(z.object({
          role: z.string(),
          module: z.string(),
          section: z.string(),
          visibility: z.enum(['all', 'self', 'hidden']),
          canEdit: z.number().min(0).max(1),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const req = (ctx as any).req;
        const caller = await getCallerFromContext(ctx);
        if (!caller) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (!['manager', 'admin'].includes(caller.role)) throw new TRPCError({ code: 'FORBIDDEN' });
        await bulkUpdateSectionPermissions(input.updates);
        await logActivity({
          userId: caller.id ?? 0,
          action: 'permission_change',
          module: 'permissions',
          details: `تحديث ${input.updates.length} Section Permissions دفعة واحدة`,
        });
        return { success: true };
      }),

    // جلب الـ Module Sections المتاحة
    moduleSections: protectedProcedure
      .query(async () => MODULE_SECTIONS),
  }),

  // ─── Deal Tasks (Next Step → Task System) ─────────────────────────────────────────────
  dealTasks: router({
    // إنشاء task جديدة مرتبطة بصفقة
    create: protectedProcedure
      .input(z.object({
        dealId: z.number(),
        engineerId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string(), // YYYY-MM-DD
        createdBy: z.string().optional(),
        clientName: z.string().optional(),
        dealStage: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing", "canAdd");
        const engineerId = scopedEngineerId(access, input.engineerId);
        await requireDealRecordScope(ctx, input.dealId, "canView");
        await createDealTask({ ...input, engineerId });
        return { success: true };
      }),
    // جلب المهام المتأخرة (overdue)
    listOverdue: protectedProcedure
      .input(z.object({ engineerId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing");
        return getOverdueDealTasks(scopedEngineerId(access, input.engineerId));
      }),
    // جلب المهام المعلقة (pending)
    listPending: protectedProcedure
      .input(z.object({ engineerId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing");
        return getPendingDealTasks(scopedEngineerId(access, input.engineerId));
      }),
    // تحديد task كـ Done
    markDone: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireDealTaskRecordScope(ctx, input.taskId, "canEdit");
        await markDealTaskDone(input.taskId);
        return { success: true };
      }),
    // Follow-up KPI لمهندس
    followupKPI: protectedProcedure
      .input(z.object({
        engineerId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const access = await getOperationalScopeAccess(ctx, "closing");
        return getFollowupKPI(scopedEngineerId(access, input.engineerId), input.startDate, input.endDate);
      }),
    // تقرير Follow-up Compliance لجميع المهندسين
    complianceReport: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        await requireAllScope(ctx, "closing");
        return getFollowupComplianceReport(input.startDate, input.endDate);
      }),
  }),
});
export type AppRouter = typeof appRouter;
