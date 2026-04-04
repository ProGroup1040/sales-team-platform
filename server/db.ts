import { and, asc, count, desc, eq, gte, ilike, like, lte, or, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { customers, InsertCustomer, InsertProduct, InsertSale, InsertSaleItem, InsertUser, products, saleItems, sales, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ====== Users ======
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ====== Customers ======
export async function getCustomers(opts?: { search?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const conditions = [];
  if (opts?.search) {
    conditions.push(or(
      like(customers.name, `%${opts.search}%`),
      like(customers.email, `%${opts.search}%`),
      like(customers.company, `%${opts.search}%`),
      like(customers.phone, `%${opts.search}%`)
    ));
  }
  if (opts?.status && opts.status !== 'all') {
    conditions.push(eq(customers.status, opts.status as "active" | "inactive"));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, totalResult] = await Promise.all([
    db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0),
    db.select({ count: count() }).from(customers).where(where)
  ]);
  return { data, total: totalResult[0]?.count ?? 0 };
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(customers).values(data);
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customers).where(eq(customers.id, id));
}

// ====== Products ======
export async function getProducts(opts?: { search?: string; category?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const conditions = [];
  if (opts?.search) {
    conditions.push(or(
      like(products.name, `%${opts.search}%`),
      like(products.sku, `%${opts.search}%`),
      like(products.category, `%${opts.search}%`)
    ));
  }
  if (opts?.category && opts.category !== 'all') conditions.push(eq(products.category, opts.category));
  if (opts?.status && opts.status !== 'all') conditions.push(eq(products.status, opts.status as "active" | "inactive" | "out_of_stock"));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, totalResult] = await Promise.all([
    db.select().from(products).where(where).orderBy(asc(products.name)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0),
    db.select({ count: count() }).from(products).where(where)
  ]);
  return { data, total: totalResult[0]?.count ?? 0 };
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(products).values(data);
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(products).where(eq(products.id, id));
}

export async function getProductCategories() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ category: products.category }).from(products).where(sql`${products.category} IS NOT NULL`);
  return result.map(r => r.category).filter(Boolean) as string[];
}

// ====== Sales ======
export async function getSales(opts?: {
  search?: string; status?: string; paymentStatus?: string;
  customerId?: number; dateFrom?: Date; dateTo?: Date;
  limit?: number; offset?: number;
}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const conditions = [];
  if (opts?.search) {
    conditions.push(or(
      like(sales.invoiceNumber, `%${opts.search}%`),
      like(sales.notes, `%${opts.search}%`)
    ));
  }
  if (opts?.status && opts.status !== 'all') conditions.push(eq(sales.status, opts.status as any));
  if (opts?.paymentStatus && opts.paymentStatus !== 'all') conditions.push(eq(sales.paymentStatus, opts.paymentStatus as any));
  if (opts?.customerId) conditions.push(eq(sales.customerId, opts.customerId));
  if (opts?.dateFrom) conditions.push(gte(sales.saleDate, opts.dateFrom));
  if (opts?.dateTo) conditions.push(lte(sales.saleDate, opts.dateTo));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db.select({
      id: sales.id,
      invoiceNumber: sales.invoiceNumber,
      customerId: sales.customerId,
      customerName: customers.name,
      totalAmount: sales.totalAmount,
      discount: sales.discount,
      tax: sales.tax,
      netAmount: sales.netAmount,
      status: sales.status,
      paymentStatus: sales.paymentStatus,
      notes: sales.notes,
      saleDate: sales.saleDate,
      createdAt: sales.createdAt,
    }).from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(where)
      .orderBy(desc(sales.saleDate))
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0),
    db.select({ count: count() }).from(sales).where(where)
  ]);
  return { data, total: totalResult[0]?.count ?? 0 };
}

export async function getSaleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [saleResult, items] = await Promise.all([
    db.select({
      id: sales.id,
      invoiceNumber: sales.invoiceNumber,
      customerId: sales.customerId,
      customerName: customers.name,
      totalAmount: sales.totalAmount,
      discount: sales.discount,
      tax: sales.tax,
      netAmount: sales.netAmount,
      status: sales.status,
      paymentStatus: sales.paymentStatus,
      notes: sales.notes,
      saleDate: sales.saleDate,
      createdAt: sales.createdAt,
    }).from(sales).leftJoin(customers, eq(sales.customerId, customers.id)).where(eq(sales.id, id)).limit(1),
    db.select({
      id: saleItems.id,
      saleId: saleItems.saleId,
      productId: saleItems.productId,
      productName: products.name,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      totalPrice: saleItems.totalPrice,
    }).from(saleItems).leftJoin(products, eq(saleItems.productId, products.id)).where(eq(saleItems.saleId, id))
  ]);
  if (!saleResult[0]) return undefined;
  return { ...saleResult[0], items };
}

export async function createSale(saleData: InsertSale, items: InsertSaleItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(sales).values(saleData);
  const [inserted] = await db.select().from(sales).where(eq(sales.invoiceNumber, saleData.invoiceNumber)).limit(1);
  if (inserted && items.length > 0) {
    await db.insert(saleItems).values(items.map(item => ({ ...item, saleId: inserted.id })));
    // Update customer total purchases
    await db.update(customers)
      .set({ totalPurchases: sql`totalPurchases + ${saleData.netAmount}` })
      .where(eq(customers.id, saleData.customerId));
    // Update product stock
    for (const item of items) {
      await db.update(products)
        .set({ stock: sql`stock - ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }
  }
  return inserted;
}

export async function updateSaleStatus(id: number, status: string, paymentStatus?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (paymentStatus) updateData.paymentStatus = paymentStatus;
  await db.update(sales).set(updateData).where(eq(sales.id, id));
}

export async function deleteSale(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(saleItems).where(eq(saleItems.saleId, id));
  await db.delete(sales).where(eq(sales.id, id));
}

// ====== Dashboard Stats ======
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalSalesResult,
    monthSalesResult,
    lastMonthSalesResult,
    totalOrdersResult,
    monthOrdersResult,
    totalCustomersResult,
    newCustomersResult,
    topProductsResult,
  ] = await Promise.all([
    db.select({ total: sum(sales.netAmount) }).from(sales).where(eq(sales.status, 'delivered')),
    db.select({ total: sum(sales.netAmount), count: count() }).from(sales)
      .where(and(gte(sales.saleDate, startOfMonth), eq(sales.status, 'delivered'))),
    db.select({ total: sum(sales.netAmount), count: count() }).from(sales)
      .where(and(gte(sales.saleDate, startOfLastMonth), lte(sales.saleDate, endOfLastMonth), eq(sales.status, 'delivered'))),
    db.select({ count: count() }).from(sales),
    db.select({ count: count() }).from(sales).where(gte(sales.saleDate, startOfMonth)),
    db.select({ count: count() }).from(customers),
    db.select({ count: count() }).from(customers).where(gte(customers.createdAt, startOfMonth)),
    db.select({
      productId: saleItems.productId,
      productName: products.name,
      totalQty: sum(saleItems.quantity),
      totalRevenue: sum(saleItems.totalPrice),
    }).from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .groupBy(saleItems.productId, products.name)
      .orderBy(desc(sum(saleItems.totalPrice)))
      .limit(5),
  ]);

  const totalSales = parseFloat(totalSalesResult[0]?.total ?? '0');
  const monthSales = parseFloat(monthSalesResult[0]?.total ?? '0');
  const lastMonthSales = parseFloat(lastMonthSalesResult[0]?.total ?? '0');
  const monthOrders = monthOrdersResult[0]?.count ?? 0;
  const lastMonthOrders = lastMonthSalesResult[0]?.count ?? 0;
  const totalOrders = totalOrdersResult[0]?.count ?? 0;
  const totalCustomers = totalCustomersResult[0]?.count ?? 0;
  const newCustomers = newCustomersResult[0]?.count ?? 0;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  return {
    totalSales,
    monthSales,
    salesGrowth: lastMonthSales > 0 ? ((monthSales - lastMonthSales) / lastMonthSales) * 100 : 0,
    totalOrders,
    monthOrders,
    ordersGrowth: lastMonthOrders > 0 ? ((monthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0,
    totalCustomers,
    newCustomers,
    avgOrderValue,
    topProducts: topProductsResult,
  };
}

export async function getMonthlySalesTrend(months: number = 12) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const result = await db.select({
    month: sql<string>`DATE_FORMAT(${sales.saleDate}, '%Y-%m')`,
    total: sum(sales.netAmount),
    orderCount: count(),
  }).from(sales)
    .where(and(gte(sales.saleDate, startDate), eq(sales.status, 'delivered')))
    .groupBy(sql`DATE_FORMAT(${sales.saleDate}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${sales.saleDate}, '%Y-%m')`);

  return result;
}

export async function getSalesByStatus() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    status: sales.status,
    count: count(),
    total: sum(sales.netAmount),
  }).from(sales).groupBy(sales.status);
  return result;
}

// ====== Seed Data Check ======
export async function isSeeded() {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ count: count() }).from(customers);
  return (result[0]?.count ?? 0) > 0;
}
