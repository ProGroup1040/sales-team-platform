import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { RequestActor, TrpcContext } from "./context";

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

export const protectedProcedure = t.procedure.use(requireActor);

export const adminProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    const actor = actorFromContext(ctx);
    if (!actor || !["admin", "manager"].includes(actor.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        actor,
      },
    });
  }),
);
