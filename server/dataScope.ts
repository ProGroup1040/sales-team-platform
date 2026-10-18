import { TRPCError } from "@trpc/server";

export type OperationalScopeAccess = {
  caller: { id: number; role: string; name: string; engineerId: number | null };
  scope: "own" | "all";
};

export function scopedEngineerId(access: OperationalScopeAccess, requestedEngineerId: number): number;
export function scopedEngineerId(access: OperationalScopeAccess, requestedEngineerId?: number): number | undefined;
export function scopedEngineerId(access: OperationalScopeAccess, requestedEngineerId?: number): number | undefined {
  if (access.scope === "all") return requestedEngineerId;
  if (!access.caller.engineerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يوجد مهندس مرتبط بهذا الحساب لعرض بياناته" });
  }
  // Never trust an engineer ID supplied by the client when the user's scope is own.
  return access.caller.engineerId;
}

/**
 * Prevent a caller from attributing a task-linked review to a different engineer.
 * The caller must compare against the engineer ID read from the task row, never
 * against another client-supplied field.
 */
export function assertTaskEngineerMatch(taskEngineerId: number, requestedEngineerId: number): void {
  if (taskEngineerId !== requestedEngineerId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "المهندس المحدد لا يطابق صاحب المهمة" });
  }
}


/**
 * List engineers without allowing an own-scope actor to enumerate the whole team.
 * The route passes scope resolved from the authenticated caller's grant, never
 * a scope or engineer ID supplied by the client.
 */
export async function getEngineersForScope<T>(
  access: OperationalScopeAccess,
  getAllEngineers: () => Promise<T[]>,
  getEngineerById: (engineerId: number) => Promise<T | null | undefined>,
): Promise<T[]> {
  if (access.scope === "all") return getAllEngineers();

  const engineerId = access.caller.engineerId;
  if (!engineerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "لا يوجد مهندس مرتبط بهذا الحساب لعرض بياناته",
    });
  }

  const engineer = await getEngineerById(engineerId);
  return engineer ? [engineer] : [];
}
