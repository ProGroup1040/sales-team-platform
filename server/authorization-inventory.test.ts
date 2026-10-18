import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { operationPermission } from "./_core/trpc";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const trpcSource = readFileSync(new URL("./_core/trpc.ts", import.meta.url), "utf8");

function procedureSource(namespace: string, procedure: string) {
  const namespaceMarker = routerSource.indexOf(`${namespace}: router({`);
  if (namespaceMarker < 0) throw new Error(`Could not locate router namespace ${namespace}`);
  const namespaceStart = routerSource.lastIndexOf("\n  ", namespaceMarker) + 1;
  const afterNamespace = routerSource.slice(namespaceStart + 1);
  const nextNamespaceOffset = afterNamespace.search(/^\s{2}[A-Za-z_$][\w$]*:\s*router\(\{/m);
  const namespaceEnd = nextNamespaceOffset < 0 ? routerSource.length : namespaceStart + 1 + nextNamespaceOffset;
  const namespaceBody = routerSource.slice(namespaceStart, namespaceEnd);
  const procedureMarker = namespaceBody.indexOf(`\n    ${procedure}:`);
  if (procedureMarker < 0) throw new Error(`Could not locate procedure ${namespace}.${procedure}`);
  const procedureStart = procedureMarker + 1;
  const afterProcedure = namespaceBody.slice(procedureStart + 1);
  const nextProcedureOffset = afterProcedure.search(/^\s{4}[A-Za-z_$][\w$]*:\s*(?:adminProcedure|protectedProcedure|publicProcedure)\b/m);
  const procedureEnd = nextProcedureOffset < 0 ? namespaceBody.length : procedureStart + 1 + nextProcedureOffset;
  return namespaceBody.slice(procedureStart, procedureEnd);
}

function declaredRouterNamespaces() {
  return Array.from(routerSource.matchAll(/^\s{2}([A-Za-z_$][\w$]*):\s*router\(\{/gm), (match) => match[1]);
}

function configuredKeys(constName: string) {
  const declaration = trpcSource.match(
    new RegExp(`const ${constName}[^=]*=\\s*(?:new Set\\()?\\s*\\{?([\\s\\S]*?)\\}\\)?;?`)
  );
  if (!declaration) throw new Error(`Could not locate ${constName} in server/_core/trpc.ts`);
  return Array.from(declaration[1].matchAll(/^\s*([A-Za-z_$][\w$]*):\s*["']/gm), (match) => match[1]);
}

function configuredSetValues(constName: string) {
  const declaration = trpcSource.match(new RegExp(`const ${constName} = new Set\\(\\[([\\s\\S]*?)\\]\\);`));
  if (!declaration) throw new Error(`Could not locate ${constName} in server/_core/trpc.ts`);
  return Array.from(declaration[1].matchAll(/["']([^"']+)["']/g), (match) => match[1]);
}

describe("authorization router inventory", () => {
  it("explicitly maps, gates, or exempts every top-level router namespace", () => {
    const namespaces = declaredRouterNamespaces();
    const mapped = configuredKeys("MODULE_BY_NAMESPACE");
    const roleGated = configuredSetValues("ROLE_GATED_NAMESPACES");
    const exempt = configuredSetValues("AUTHORIZATION_EXEMPT_NAMESPACES");
    // These namespaces have bespoke checks in requireOperationalPermission.
    const bespoke = ["seed", "softDelete"];
    const explicitlyHandled = new Set([...mapped, ...roleGated, ...exempt, ...bespoke]);
    const unclassified = namespaces.filter((namespace) => !explicitlyHandled.has(namespace));

    expect(namespaces.length).toBeGreaterThan(0);
    expect(unclassified).toEqual([]);
  });

  it("explicitly classifies every mutation in an operational namespace", () => {
    const namespaces = declaredRouterNamespaces();
    const mapped = new Set([...configuredKeys("MODULE_BY_NAMESPACE"), "softDelete"]);
    const unclassified: string[] = [];

    for (let index = 0; index < namespaces.length; index += 1) {
      const namespace = namespaces[index];
      if (!mapped.has(namespace)) continue;
      const start = routerSource.search(new RegExp(`^\\s{2}${namespace}:\\s*router\\(\\{`, "m"));
      const nextRouter = routerSource.slice(start + 1).search(/^\s{2}[A-Za-z_$][\w$]*:\s*router\(\{/m);
      const end = nextRouter < 0 ? routerSource.length : start + 1 + nextRouter;
      const segment = routerSource.slice(start, end);
      const declarations = Array.from(segment.matchAll(/^\s{4}([A-Za-z_$][\w$]*):\s*(protectedProcedure|adminProcedure|publicProcedure)\b/gm));

      for (let procedureIndex = 0; procedureIndex < declarations.length; procedureIndex += 1) {
        const declaration = declarations[procedureIndex];
        const procedureEnd = procedureIndex + 1 < declarations.length
          ? declarations[procedureIndex + 1].index!
          : segment.length;
        const body = segment.slice(declaration.index!, procedureEnd);
        if (!/\.mutation\s*\(/.test(body)) continue;
        const path = `${namespace}.${declaration[1]}`;
        if (operationPermission(path, "mutation") === null) unclassified.push(path);
      }
    }

    expect(unclassified).toEqual([]);
  });

  it("explicitly inventories every ID-bearing procedure without a record-scope guard", () => {
    const unguarded: string[] = [];
    const namespaces = declaredRouterNamespaces();

    for (const namespace of namespaces) {
      const marker = routerSource.indexOf(`${namespace}: router({`);
      if (marker < 0) continue;
      const start = routerSource.lastIndexOf("\n  ", marker) + 1;
      const after = routerSource.slice(start + 1);
      const nextNamespace = after.search(/^\s{2}[A-Za-z_$][\w$]*:\s*router\(\{/m);
      const end = nextNamespace < 0 ? routerSource.length : start + 1 + nextNamespace;
      const segment = routerSource.slice(start, end);
      const declarations = Array.from(segment.matchAll(/^\s{4}([A-Za-z_$][\w$]*):\s*(?:protectedProcedure|adminProcedure|publicProcedure)\b/gm));

      for (let index = 0; index < declarations.length; index += 1) {
        const declaration = declarations[index];
        const procedureEnd = index + 1 < declarations.length ? declarations[index + 1].index! : segment.length;
        const body = segment.slice(declaration.index!, procedureEnd);
        const hasRecordIdInput = /\b(?:id|taskId|dealId|visitId|leadId|engineerId|collectionId|sessionId|userId)\s*:\s*z\.number/.test(body);
        if (!hasRecordIdInput) continue;
        const hasScopeOrDedicatedGuard = /getOperationalScopeAccess|requireAllScope|scopedEngineerId|getEngineersForScope|taskEngineerFilter|require\w*(?:Scope|Access|Caller|Manager|Action)|assertCanAssignRole|assertTaskEngineerMatch|canManageFinancials/.test(body);
        if (!hasScopeOrDedicatedGuard) unguarded.push(`${namespace}.${declaration[1]}`);
      }
    }

    // These are intentionally shared catalog/config endpoints, or a legacy mutation
    // that always throws. They are not scoped CRM/task/financial records.
    expect(unguarded.sort()).toEqual([
      "collections.update",
      "playbook.delete",
      "playbook.getById",
      "playbook.update",
      "products.delete",
      "products.update",
    ]);
  });

  it("requires user-management authorization for the top-level engineer creation route", () => {
    const start = routerSource.indexOf("engineers: router({");
    const end = routerSource.indexOf("// ── Daily Tasks", start);
    const engineerRouter = routerSource.slice(start, end);
    const createStart = engineerRouter.indexOf("create: protectedProcedure");
    const createEnd = engineerRouter.indexOf("\n  }),", createStart);
    const createProcedure = engineerRouter.slice(createStart, createEnd);
    expect(createStart).toBeGreaterThanOrEqual(0);
    expect(createProcedure).toContain("requireUserManagementCaller(ctx");
  });


  it("keeps financial aggregate endpoints behind finance-role and all-scope checks", () => {
    for (const name of ["dailyFollowUp", "engineersCommission", "dashboard", "alerts", "contractsWithCommission", "periodAnalysis", "liquidityDashboard", "commitments"]) {
      const body = procedureSource("financial", name);
      expect(body, `financial.${name} must enforce finance role`).toContain("requireFinancialManager");
      expect(body, `financial.${name} must enforce all-scope`).toContain('requireAllScope(ctx, "collections"');
    }
  });

  it("binds financial record reads and writes to the authorized collection or promise", () => {
    for (const name of ["clientProfile", "addPayment", "addPromise", "addPaymentWithFollowUp"]) {
      expect(procedureSource("financial", name), `financial.${name}`).toContain("requireCollectionFinancialAccess");
    }
    for (const name of ["updatePromise", "confirmPromise"]) {
      expect(procedureSource("financial", name), `financial.${name}`).toContain("requirePromiseFinancialAccess");
    }
    expect(procedureSource("financial", "addPayment")).toContain("clientName: collection.clientName");
    expect(procedureSource("financial", "addPaymentWithFollowUp")).toContain("clientName: collection.clientName");
  });

  it("derives own-scope financial listings from the authenticated engineer, not the client filter", () => {
    const contracts = procedureSource("financial", "allContracts");
    expect(contracts).toContain('access.scope === "all"');
    expect(contracts).toContain("getAllCollectionsWithSummary(caller.engineerId)");
    const commission = procedureSource("financial", "collectionCommission");
    expect(commission).toContain('access.scope === "own" && caller.engineerId !== input.engineerId');
  });

  it("requires all-scope grants for team-wide KPI, distribution, and report aggregates", () => {
    const teamAggregates: Array<[string, string, string]> = [
      ["kpi", "operationalPerformance", "kpi"],
      ["kpi", "enhancedRanking", "kpi"],
      ["kpi", "teleSalesKPI", "kpi"],
      ["kpi", "siteEngineersKPI", "kpi"],
      ["kpi", "companyClosingKPI", "kpi"],
      ["kpi", "teamRewardStatus", "kpi"],
      ["kpi", "lostDealsImpact", "kpi"],
      ["kpi", "teamCompositeDiscountScore", "kpi"],
      ["kpi", "scoreBasedDiscountDistribution", "kpi"],
      ["kpi", "advancedDiscountDistribution", "kpi"],
      ["kpi", "adminSalesKPI", "kpi"],
      ["kpi", "teamPerformanceRanking", "kpi"],
      ["kpi", "allEngineersEarnings", "kpi"],
      ["kpi", "companyClosingBonus", "kpi"],
      ["workDist", "allEngineers", "tasks"],
      ["workDist", "criticalInsights", "tasks"],
      ["workDist", "fullRanking", "tasks"],
      ["reports", "weeklyFull", "reports"],
      ["reports", "monthlyKPI", "reports"],
      ["reports", "quarterly", "reports"],
      ["funnel", "comparison", "reports"],
    ];
    for (const [namespace, name, module] of teamAggregates) {
      expect(procedureSource(namespace, name), `${namespace}.${name}`)
        .toContain(`requireAllScope(ctx, "${module}"`);
    }
  });

  it("keeps user-permission management behind dedicated caller checks", () => {
    for (const name of ["list", "create", "update", "getPermissions", "updatePermissions", "activityLogs", "defaultPermissions", "listEngineers"]) {
      expect(procedureSource("appUsers", name), `appUsers.${name}`).toContain("requireUserManagementCaller");
    }
    expect(procedureSource("appUsers", "updatePermissions")).toContain("assertCanAssignRole(caller.role");
  });
});