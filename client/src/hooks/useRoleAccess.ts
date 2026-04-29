/**
 * useRoleAccess — Role-Based Access Control (Visibility Only)
 * 
 * الأقسام:
 * - sales_engineer / engineer: Sales Team (يرون كل شيء عدا إدارة الفريق)
 * - sales_specialist: Sales Team (نفس sales_engineer)
 * - admin_sales: Admin Sales (يرون المهام + المعاينات + KPI + Leads — لا يرون الصفقات/التفاوض/المبيعات)
 * - tele_sales: Tele Sales (يرون Leads + KPI + المهام فقط)
 * - interior_designer: Interior (يرون KPI + المهام فقط)
 * - site_engineer: Site Engineer (يرون المعاينات + KPI + المهام)
 * - manager / admin / system_user: Full Access
 */

export type AppRole =
  | "admin"
  | "engineer"
  | "admin_sales"
  | "sales_engineer"
  | "tele_sales"
  | "site_engineer"
  | "system_user"
  | "sales_specialist"
  | "interior_designer"
  | "manager";

export interface RoleAccess {
  // Navigation Modules
  canSeeOverview: boolean;
  canSeeTasks: boolean;
  canSeeLeads: boolean;
  canSeeVisits: boolean;
  canSeeClosing: boolean;         // الإغلاق والتفاوض — Sales Only
  canSeeSalesModule: boolean;     // المبيعات — Sales Only
  canSeeKPI: boolean;
  canSeeCollections: boolean;
  canSeePlanning: boolean;
  canSeeReports: boolean;
  canSeeSalesExecution: boolean;  // Sales Execution — Sales Only
  canSeePromotion: boolean;       // إدارة الفريق — Manager/Admin Only
  // Role info
  role: AppRole | null;
  isManager: boolean;
  isSalesTeam: boolean;
  isAdminSales: boolean;
  isTeleSales: boolean;
  isInterior: boolean;
}

const SALES_ROLES: AppRole[] = ["sales_engineer", "engineer", "sales_specialist"];
const MANAGER_ROLES: AppRole[] = ["manager", "admin", "system_user"];

export function getRoleAccess(role: string | null | undefined): RoleAccess {
  const r = (role ?? null) as AppRole | null;

  const isManager = MANAGER_ROLES.includes(r as AppRole);
  const isSalesTeam = SALES_ROLES.includes(r as AppRole);
  const isAdminSales = r === "admin_sales";
  const isTeleSales = r === "tele_sales";
  const isInterior = r === "interior_designer";
  const isSiteEngineer = r === "site_engineer";

  // Full access for Manager/Admin
  if (isManager) {
    return {
      canSeeOverview: true,
      canSeeTasks: true,
      canSeeLeads: true,
      canSeeVisits: true,
      canSeeClosing: true,
      canSeeSalesModule: true,
      canSeeKPI: true,
      canSeeCollections: true,
      canSeePlanning: true,
      canSeeReports: true,
      canSeeSalesExecution: true,
      canSeePromotion: true,
      role: r,
      isManager: true,
      isSalesTeam: false,
      isAdminSales: false,
      isTeleSales: false,
      isInterior: false,
    };
  }

  // Sales Team (sales_engineer, engineer, sales_specialist)
  if (isSalesTeam) {
    return {
      canSeeOverview: true,
      canSeeTasks: true,
      canSeeLeads: true,
      canSeeVisits: true,
      canSeeClosing: true,
      canSeeSalesModule: true,
      canSeeKPI: true,
      canSeeCollections: true,
      canSeePlanning: true,
      canSeeReports: true,
      canSeeSalesExecution: true,
      canSeePromotion: false,
      role: r,
      isManager: false,
      isSalesTeam: true,
      isAdminSales: false,
      isTeleSales: false,
      isInterior: false,
    };
  }

  // Admin Sales — يرى المهام + المعاينات + KPI + Leads — لا يرى الصفقات/المبيعات
  if (isAdminSales) {
    return {
      canSeeOverview: true,
      canSeeTasks: true,
      canSeeLeads: true,
      canSeeVisits: true,
      canSeeClosing: false,
      canSeeSalesModule: false,
      canSeeKPI: true,
      canSeeCollections: true,
      canSeePlanning: false,
      canSeeReports: true,
      canSeeSalesExecution: false,
      canSeePromotion: false,
      role: r,
      isManager: false,
      isSalesTeam: false,
      isAdminSales: true,
      isTeleSales: false,
      isInterior: false,
    };
  }

  // Tele Sales — يرى Leads + KPI + المهام فقط
  if (isTeleSales) {
    return {
      canSeeOverview: true,
      canSeeTasks: true,
      canSeeLeads: true,
      canSeeVisits: false,
      canSeeClosing: false,
      canSeeSalesModule: false,
      canSeeKPI: true,
      canSeeCollections: false,
      canSeePlanning: false,
      canSeeReports: false,
      canSeeSalesExecution: false,
      canSeePromotion: false,
      role: r,
      isManager: false,
      isSalesTeam: false,
      isAdminSales: false,
      isTeleSales: true,
      isInterior: false,
    };
  }

  // Interior Designer — يرى KPI + المهام فقط
  if (isInterior) {
    return {
      canSeeOverview: true,
      canSeeTasks: true,
      canSeeLeads: false,
      canSeeVisits: false,
      canSeeClosing: false,
      canSeeSalesModule: false,
      canSeeKPI: true,
      canSeeCollections: false,
      canSeePlanning: false,
      canSeeReports: false,
      canSeeSalesExecution: false,
      canSeePromotion: false,
      role: r,
      isManager: false,
      isSalesTeam: false,
      isAdminSales: false,
      isTeleSales: false,
      isInterior: true,
    };
  }

  // Site Engineer — يرى المعاينات + KPI + المهام
  if (isSiteEngineer) {
    return {
      canSeeOverview: true,
      canSeeTasks: true,
      canSeeLeads: false,
      canSeeVisits: true,
      canSeeClosing: false,
      canSeeSalesModule: false,
      canSeeKPI: true,
      canSeeCollections: false,
      canSeePlanning: false,
      canSeeReports: false,
      canSeeSalesExecution: false,
      canSeePromotion: false,
      role: r,
      isManager: false,
      isSalesTeam: false,
      isAdminSales: false,
      isTeleSales: false,
      isInterior: false,
    };
  }

  // Default: Full access (fallback for unknown roles)
  return {
    canSeeOverview: true,
    canSeeTasks: true,
    canSeeLeads: true,
    canSeeVisits: true,
    canSeeClosing: true,
    canSeeSalesModule: true,
    canSeeKPI: true,
    canSeeCollections: true,
    canSeePlanning: true,
    canSeeReports: true,
    canSeeSalesExecution: true,
    canSeePromotion: false,
    role: r,
    isManager: false,
    isSalesTeam: false,
    isAdminSales: false,
    isTeleSales: false,
    isInterior: false,
  };
}

export function useRoleAccess(role: string | null | undefined): RoleAccess {
  return getRoleAccess(role);
}
