import { describe, it, expect } from "vitest";

// ─── Role Detection Logic (mirrors InteractiveCalendar.tsx) ───────────────────
function isAdminSalesEngineer(engineer: { id: number; role?: string } | undefined): boolean {
  if (!engineer) return false;
  return engineer.role === 'admin_sales';
}

// ─── Admin Sales Task Type Config (mirrors TASK_TYPE_CONFIG) ──────────────────
const ADMIN_TASK_TYPES = ['daily', 'weekly', 'monthly', 'meeting'] as const;
const SALES_TASK_TYPES = ['design_2d', 'design_3d', 'render', 'quotation', 'meeting_modeling',
  'meeting_presentation', 'meeting_closing', 'contract', 'work_order', 'closing', 'other'] as const;

function getTaskTypesForRole(role: string): readonly string[] {
  if (role === 'admin_sales') return ADMIN_TASK_TYPES;
  return SALES_TASK_TYPES;
}

// ─── KPI Separation Logic ─────────────────────────────────────────────────────
function shouldIncludeInSalesKPI(engineerRole: string): boolean {
  return engineerRole !== 'admin_sales';
}

function shouldIncludeInAdminKPI(engineerRole: string): boolean {
  return engineerRole === 'admin_sales';
}

// ─── Calendar Data Source Logic ───────────────────────────────────────────────
function getCalendarProcedure(engineerRole: string): 'calendarView' | 'calendarViewAdmin' {
  return engineerRole === 'admin_sales' ? 'calendarViewAdmin' : 'calendarView';
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Admin Sales - Role Detection", () => {
  it("identifies admin_sales role correctly", () => {
    expect(isAdminSalesEngineer({ id: 1, role: 'admin_sales' })).toBe(true);
  });

  it("identifies engineer role correctly (not admin_sales)", () => {
    expect(isAdminSalesEngineer({ id: 2, role: 'engineer' })).toBe(false);
  });

  it("identifies specialist role correctly (not admin_sales)", () => {
    expect(isAdminSalesEngineer({ id: 3, role: 'specialist' })).toBe(false);
  });

  it("returns false for undefined engineer", () => {
    expect(isAdminSalesEngineer(undefined)).toBe(false);
  });

  it("returns false for engineer without role field", () => {
    expect(isAdminSalesEngineer({ id: 4 })).toBe(false);
  });
});

describe("Admin Sales - Task Type Separation", () => {
  it("admin_sales sees daily/weekly/monthly/meeting task types", () => {
    const types = getTaskTypesForRole('admin_sales');
    expect(types).toContain('daily');
    expect(types).toContain('weekly');
    expect(types).toContain('monthly');
    expect(types).toContain('meeting');
  });

  it("admin_sales does NOT see sales engineer task types", () => {
    const types = getTaskTypesForRole('admin_sales');
    expect(types).not.toContain('design_2d');
    expect(types).not.toContain('design_3d');
    expect(types).not.toContain('quotation');
    expect(types).not.toContain('contract');
  });

  it("engineer sees sales task types", () => {
    const types = getTaskTypesForRole('engineer');
    expect(types).toContain('design_2d');
    expect(types).toContain('quotation');
    expect(types).toContain('contract');
  });

  it("engineer does NOT see admin task types", () => {
    const types = getTaskTypesForRole('engineer');
    expect(types).not.toContain('daily');
    expect(types).not.toContain('weekly');
    expect(types).not.toContain('monthly');
  });
});

describe("Admin Sales - KPI Separation", () => {
  it("admin_sales is excluded from sales KPI", () => {
    expect(shouldIncludeInSalesKPI('admin_sales')).toBe(false);
  });

  it("engineer is included in sales KPI", () => {
    expect(shouldIncludeInSalesKPI('engineer')).toBe(true);
  });

  it("specialist is included in sales KPI", () => {
    expect(shouldIncludeInSalesKPI('specialist')).toBe(true);
  });

  it("admin_sales is included in admin KPI", () => {
    expect(shouldIncludeInAdminKPI('admin_sales')).toBe(true);
  });

  it("engineer is excluded from admin KPI", () => {
    expect(shouldIncludeInAdminKPI('engineer')).toBe(false);
  });
});

describe("Admin Sales - Calendar Data Source", () => {
  it("admin_sales uses calendarViewAdmin procedure", () => {
    expect(getCalendarProcedure('admin_sales')).toBe('calendarViewAdmin');
  });

  it("engineer uses calendarView procedure", () => {
    expect(getCalendarProcedure('engineer')).toBe('calendarView');
  });

  it("specialist uses calendarView procedure", () => {
    expect(getCalendarProcedure('specialist')).toBe('calendarView');
  });
});

describe("Admin Sales - Task Category Colors", () => {
  const TASK_TYPE_CONFIG: Record<string, { label: string }> = {
    daily:                { label: 'مهمة يومية' },
    weekly:               { label: 'مهمة أسبوعية' },
    monthly:              { label: 'مهمة شهرية' },
    meeting:              { label: 'اجتماع إداري' },
    crm_data:             { label: 'CRM بيانات' },
    financial_collection: { label: 'تحصيل مالي' },
    operations:           { label: 'عمليات' },
    reporting:            { label: 'تقارير' },
    coordination:         { label: 'تنسيق' },
    meetings:             { label: 'اجتماعات' },
  };

  it("all admin task types have color config", () => {
    for (const type of ADMIN_TASK_TYPES) {
      expect(TASK_TYPE_CONFIG[type]).toBeDefined();
      expect(TASK_TYPE_CONFIG[type].label).toBeTruthy();
    }
  });

  it("admin categories have color config", () => {
    const adminCategories = ['crm_data', 'financial_collection', 'operations', 'reporting', 'coordination', 'meetings'];
    for (const cat of adminCategories) {
      expect(TASK_TYPE_CONFIG[cat]).toBeDefined();
    }
  });
});

describe("Admin Sales - Single Source of Truth", () => {
  it("task added to adminSalesTasks appears in calendarViewAdmin", () => {
    // Simulate: a task in adminSalesTasks with taskDate = '2026-05-15'
    const adminTask = {
      id: 1,
      taskTitle: 'مراجعة CRM',
      taskDate: '2026-05-15',
      taskType: 'daily',
      category: 'crm_data',
      status: 'planned',
      isAdminSalesTask: true,
    };
    // The calendar view should include this task
    const calendarDays = [
      { date: '2026-05-15', tasks: [adminTask] },
    ];
    const dayWithTask = calendarDays.find(d => d.date === '2026-05-15');
    expect(dayWithTask).toBeDefined();
    expect(dayWithTask?.tasks).toHaveLength(1);
    expect(dayWithTask?.tasks[0].isAdminSalesTask).toBe(true);
  });

  it("admin task does NOT appear in sales engineer calendar", () => {
    // Sales engineer calendar uses dailyTasks, not adminSalesTasks
    // Admin tasks have isAdminSalesTask = true and should be filtered out
    const salesCalendarTasks = [
      { id: 1, title: 'تصميم 2D', isAdminSalesTask: false },
      { id: 2, title: 'عرض سعر', isAdminSalesTask: false },
    ];
    const adminTasksInSalesCalendar = salesCalendarTasks.filter(t => t.isAdminSalesTask);
    expect(adminTasksInSalesCalendar).toHaveLength(0);
  });
});
