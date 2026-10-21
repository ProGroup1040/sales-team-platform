import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { RequestActor, TrpcContext } from "./context";
import { getAppUserByEngineerId, getUserPermissions } from "../db";
import { resolveUserPermissions } from "../permissionResolution";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

function actorFromContext(ctx: TrpcContext): RequestActor | null {
  if (ctx.actor) return ctx.actor;
  // createCaller tests and a few framework integrations construct an older
  // context shape with only ctx.user. Preserve that contract while treating it
  // as an OAuth actor rather than bypassing authorization.
  if (ctx.user) {
    return {
      id: ctx.user.id,
      source: "oauth",
      role: ctx.user.role,
      name: ctx.user.name ?? ctx.user.email ?? "User",
      engineerId: null,
    };
  }
  return null;
}

const requireActor = t.middleware(async ({ ctx, next }) => {
  const actor = actorFromContext(ctx);
  if (!actor) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      actor,
    },
  });
});

const MODULE_BY_NAMESPACE: Record<string, string> = {
  engineers: "tasks",
  tasks: "tasks",
  leads: "crm",
  leadDailyStats: "crm",
  leadFollowup: "crm",
  visits: "visits",
  closing: "closing",
  dealTasks: "closing",
  pipeline: "closing",
  sales: "closing",
  projectTimeline: "tasks",
  kpi: "kpi",
  promotion: "kpi",
  planning: "planning",
  collections: "collections",
  financial: "collections",
  customers: "crm",
  products: "pricing_system",
  playbook: "pricing_system",
  management: "reports",
  reports: "reports",
  funnel: "reports",
  meetingReview: "tasks",
  adminSalesTasks: "tasks",
  workDist: "tasks",
  session: "tasks",
};

// Some legacy procedures live under a namespace that does not match the
// feature whose permission they consume. Keep these exceptions explicit and
// centralized instead of weakening the whole namespace.
const MODULE_BY_PATH: Record<string, string> = {
  "kpi.allowedTaskTypes": "tasks",
};

const ROLE_GATED_NAMESPACES = new Set(["rolePermissions"]);
const AUTHORIZATION_EXEMPT_NAMESPACES = new Set([
  "auth",
  "localAuth",
  "pricingSystemSso", // The launch-token procedure explicitly enforces pricing_system grants itself.
  "appUsers", // These procedures have dedicated account/role/target checks.
  "pushNotifications", // Must enforce actor ownership in each notification procedure.
  "system", // systemRouter has its own adminProcedure boundary.
  // myPermissions is a self-read for every authenticated actor; the
  // administrative section-permission procedures enforce manager/admin access
  // inside their handlers.
  "sectionPermissions",
]);

type OperationalPermission = "canView" | "canAdd" | "canEdit" | "canDelete";
type PermissionRequirement = OperationalPermission | readonly OperationalPermission[];

// Every mutation in an operational namespace must be classified explicitly.
// Upsert/synchronization operations that may create OR modify a record require
// both grants; a route name alone is not treated as an authorization contract.
const OPERATION_PERMISSION_OVERRIDES: Record<string, PermissionRequirement> = {
  "engineers.create": "canAdd",
  "tasks.create": "canAdd",
  "tasks.createMine": "canAdd",
  "tasks.updateStatus": "canEdit",
  "tasks.delete": "canDelete",
  "tasks.reschedule": "canEdit",
  "tasks.createEngineer": "canAdd",
  "tasks.deleteEngineer": "canDelete",
  "tasks.updateEngineerProfile": "canEdit",
  "tasks.submitRecording": "canEdit",
  "tasks.createWithTime": "canAdd",
  "tasks.moveTask": "canEdit",
  "tasks.updateFull": "canEdit",
  "leads.create": "canAdd",
  "leads.updateStatus": "canEdit",
  "visits.create": "canAdd",
  "visits.updateStatus": "canEdit",
  "visits.updateFull": "canEdit",
  "visits.softDelete": "canDelete",
  "closing.create": "canAdd",
  "closing.updateStage": "canEdit",
  "closing.setDiscountCap": "canEdit",
  "closing.updateDealStage": "canEdit",
  "closing.updateEngineer": "canEdit",
  "closing.reopen": "canEdit",
  "closing.setAccountingMonth": "canEdit",
  "closing.autoCreateFromTask": ["canAdd", "canEdit"],
  "projectTimeline.syncFromDeals": ["canAdd", "canEdit"],
  "projectTimeline.importHistorical": "canAdd",
  "projectTimeline.updatePreExecution": "canEdit",
  "projectTimeline.startExecution": "canEdit",
  "projectTimeline.transition": "canEdit",
  "projectTimeline.addDelay": "canAdd",
  "projectTimeline.update": "canEdit",
  "projectTimeline.close": "canEdit",
  "projectTimeline.setHold": "canEdit",
  "projectTimeline.updateStageConfig": "canEdit",
  "sales.setEngineerTarget": ["canAdd", "canEdit"],
  "sales.setOperationalTargets": ["canAdd", "canEdit"],
  "sales.upsertDiscountTier": ["canAdd", "canEdit"],
  "sales.deleteDiscountTier": "canDelete",
  "sales.upsertCommissionTier": ["canAdd", "canEdit"],
  "sales.deleteCommissionTier": "canDelete",
  "collections.create": "canAdd",
  "collections.update": "canEdit",
  "planning.setTarget": ["canAdd", "canEdit"],
  "planning.setCompanyGoal": ["canAdd", "canEdit"],
  "planning.setPersonalGoal": ["canAdd", "canEdit"],
  "planning.applyDistribution": ["canAdd", "canEdit"],
  "planning.manualOverride": "canEdit",
  "financial.addContract": "canAdd",
  "financial.addPayment": "canAdd",
  "financial.addPromise": "canAdd",
  "financial.updatePromise": "canEdit",
  "financial.confirmPromise": "canEdit",
  "financial.markCommissionPaid": "canEdit",
  "financial.updateContractStatus": "canEdit",
  "financial.autoCreateContract": "canAdd",
  "financial.addPaymentWithFollowUp": "canAdd",
  "financial.setCashBalance": "canEdit",
  "financial.addCommitment": "canAdd",
  "financial.settleCommitment": "canEdit",
  "financial.cancelCommitment": "canDelete",
  "customers.create": "canAdd",
  "customers.update": "canEdit",
  "customers.delete": "canDelete",
  "products.create": "canAdd",
  "products.update": "canEdit",
  "products.delete": "canDelete",
  "meetingReview.submitLink": "canEdit",
  "meetingReview.upsertReview": ["canAdd", "canEdit"],
  "adminSalesTasks.updateStatus": "canEdit",
  "adminSalesTasks.updateWeekMeeting": "canEdit",
  "adminSalesTasks.create": "canAdd",
  "adminSalesTasks.updateFull": "canEdit",
  "leadFollowup.log": "canAdd",
  "softDelete.engineer": "canDelete",
  "softDelete.task": "canDelete",
  "softDelete.lead": "canDelete",
  "softDelete.visit": "canDelete",
  "softDelete.deal": "canDelete",
  "leadDailyStats.upsert": ["canAdd", "canEdit"],
  "workDist.log": "canAdd",
  "pipeline.approveDiscount": "canEdit",
  "pipeline.computeBonus": ["canAdd", "canEdit"],
  "playbook.create": "canAdd",
  "playbook.update": "canEdit",
  "playbook.delete": "canDelete",
  "playbook.import": "canAdd",
  "playbook.createQuotation": "canAdd",
  "playbook.updateRecording": "canEdit",
  "playbook.updateStatus": "canEdit",
  "session.create": "canAdd",
  "session.end": "canEdit",
  "session.logAction": "canAdd",
  "session.updateRecording": "canEdit",
  "promotion.createMeetingReview": ["canAdd", "canEdit"],
  "promotion.createMonthlyEvaluation": ["canAdd", "canEdit"],
  "promotion.promoteEngineer": "canEdit",
  "dealTasks.create": "canAdd",
  "dealTasks.markDone": "canEdit",
};

export function operationPermission(
  path: string,
  type: "query" | "mutation" | "subscription",
): PermissionRequirement | null {
  if (type === "query" || type === "subscription") return "canView";
  return OPERATION_PERMISSION_OVERRIDES[path] ?? null;
}

async function requireOperationalPermission(path: string, type: "query" | "mutation" | "subscription", ctx: TrpcContext) {
  const namespace = path.split(".")[0] ?? "";
  const actor = actorFromContext(ctx);
  if (!actor) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });

  if (ROLE_GATED_NAMESPACES.has(namespace)) {
    if (!["admin", "manager"].includes(actor.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return;
  }
  if (AUTHORIZATION_EXEMPT_NAMESPACES.has(namespace)) return;

  if (namespace === "seed") {
    if (!["admin", "manager"].includes(actor.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return;
  }

  let module = MODULE_BY_PATH[path] ?? MODULE_BY_NAMESPACE[namespace];
  if (namespace === "softDelete") {
    const entity = path.split(".")[1] ?? "";
    module = entity.includes("lead") ? "crm"
      : entity.includes("visit") ? "visits"
      : entity.includes("deal") ? "closing"
      : entity.includes("task") ? "tasks"
      : entity.includes("engineer") ? "tasks"
      : "";
  }
  if (!module) {
    // Fail closed: adding a new protected router requires an explicit module
    // mapping rather than silently granting access by authentication alone.
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `لم يتم إعداد صلاحية API للوحدة: ${namespace}`,
    });
  }

  let appUserId: number | null = null;
  if (actor.source === "app_user") appUserId = actor.id;
  else if (actor.engineerId ?? (actor.source === "local" ? actor.id : null)) {
    const linkedUser = await getAppUserByEngineerId(actor.engineerId ?? actor.id);
    appUserId = linkedUser?.id ?? null;
  }
  if (!appUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا توجد صلاحيات تشغيلية مخصصة لهذا الحساب" });
  }

  const permissions = resolveUserPermissions(await getUserPermissions(appUserId));
  const permission = permissions.find((item) => item.module === module);
  const required = operationPermission(path, type);
  if (!required) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `لم يتم إعداد نوع صلاحية للعملية: ${path}`,
    });
  }
  const requiredPermissions: readonly OperationalPermission[] =
    Array.isArray(required) ? required : [required as OperationalPermission];
  if (requiredPermissions.some((action) => permission?.[action] !== 1)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتنفيذ هذه العملية" });
  }
}

export const protectedProcedure = t.procedure.use(requireActor).use(
  t.middleware(async ({ ctx, path, type, next }) => {
    await requireOperationalPermission(path, type, ctx);
    return next();
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async ({ ctx, path, type, next }) => {
    const actor = actorFromContext(ctx);
    if (!actor || !["admin", "manager"].includes(actor.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    const actorContext = { ...ctx, actor };
    await requireOperationalPermission(path, type, actorContext);
    return next({ ctx: actorContext });
  }),
);
