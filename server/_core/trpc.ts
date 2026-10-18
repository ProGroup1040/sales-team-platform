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

const ROLE_GATED_NAMESPACES = new Set(["rolePermissions", "sectionPermissions"]);
const AUTHORIZATION_EXEMPT_NAMESPACES = new Set([
  "auth",
  "localAuth",
  "appUsers", // These procedures have dedicated account/role/target checks.
  "pushNotifications", // Must enforce actor ownership in each notification procedure.
]);

function operationPermission(path: string, type: "query" | "mutation" | "subscription"): "canView" | "canAdd" | "canEdit" | "canDelete" {
  if (type === "query" || type === "subscription") return "canView";
  const leaf = path.split(".").at(-1)?.toLowerCase() ?? "";
  if (/(delete|remove|purge|archive|cancel|softdelete)/.test(leaf)) return "canDelete";
  if (/(create|add|insert|import|log|upload|submit|record|generate|clone)/.test(leaf)) return "canAdd";
  return "canEdit";
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

  let module = MODULE_BY_NAMESPACE[namespace];
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
  if (permission?.[required] !== 1) {
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
