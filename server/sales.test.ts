import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getDashboardStats: vi.fn().mockResolvedValue({
    totalSales: 150000,
    monthSales: 25000,
    salesGrowth: 12.5,
    totalOrders: 80,
    monthOrders: 12,
    ordersGrowth: 8.3,
    totalCustomers: 8,
    newCustomers: 2,
    avgOrderValue: 1875,
    topProducts: [],
  }),
  getMonthlySalesTrend: vi.fn().mockResolvedValue([
    { month: '2025-01', total: '15000', orderCount: 5 },
    { month: '2025-02', total: '22000', orderCount: 8 },
  ]),
  getSalesByStatus: vi.fn().mockResolvedValue([
    { status: 'delivered', count: 50, total: '120000' },
    { status: 'pending', count: 15, total: '30000' },
  ]),
  isSeeded: vi.fn().mockResolvedValue(true),
  getCustomers: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getCustomerById: vi.fn().mockResolvedValue(undefined),
  createCustomer: vi.fn().mockResolvedValue(undefined),
  updateCustomer: vi.fn().mockResolvedValue(undefined),
  deleteCustomer: vi.fn().mockResolvedValue(undefined),
  getProducts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getProductById: vi.fn().mockResolvedValue(undefined),
  createProduct: vi.fn().mockResolvedValue(undefined),
  updateProduct: vi.fn().mockResolvedValue(undefined),
  deleteProduct: vi.fn().mockResolvedValue(undefined),
  getProductCategories: vi.fn().mockResolvedValue(['أجهزة الحاسب', 'الشاشات']),
  getSales: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getSaleById: vi.fn().mockResolvedValue(undefined),
  createSale: vi.fn().mockResolvedValue({ id: 1, invoiceNumber: 'INV-001' }),
  updateSaleStatus: vi.fn().mockResolvedValue(undefined),
  deleteSale: vi.fn().mockResolvedValue(undefined),
}));

function createAuthContext(role: 'admin' | 'user' = 'user'): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      loginMethod: 'manus',
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext['res'],
  };
}

describe("dashboard router", () => {
  it("returns stats for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.dashboard.stats();
    expect(stats).toBeDefined();
    expect(stats?.totalSales).toBe(150000);
    expect(stats?.totalOrders).toBe(80);
  });

  it("returns monthly trend data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const trend = await caller.dashboard.monthlySalesTrend({ months: 12 });
    expect(Array.isArray(trend)).toBe(true);
    expect(trend.length).toBe(2);
  });

  it("returns sales by status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const byStatus = await caller.dashboard.salesByStatus();
    expect(Array.isArray(byStatus)).toBe(true);
    expect(byStatus[0]?.status).toBe('delivered');
  });

  it("reports seeded status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const seeded = await caller.dashboard.isSeeded();
    expect(seeded).toBe(true);
  });
});

describe("customers router", () => {
  it("lists customers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.customers.list({});
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
  });

  it("creates a customer", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.customers.create({
      name: 'شركة الاختبار',
      email: 'test@test.com',
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it("returns product categories", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const categories = await caller.products.categories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories).toContain('أجهزة الحاسب');
  });
});

describe("sales router", () => {
  it("lists sales", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sales.list({});
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
  });

  it("creates a sale", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sales.create({
      customerId: 1,
      discount: '0',
      tax: '0',
      items: [{ productId: 1, quantity: 2, unitPrice: '500' }],
    });
    expect(result.success).toBe(true);
    expect(result.invoiceNumber).toMatch(/^INV-/);
  });
});

describe("auth router", () => {
  it("returns current user when authenticated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.name).toBe('Test User');
    expect(user?.role).toBe('user');
  });
});
