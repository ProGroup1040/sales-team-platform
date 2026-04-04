import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createCustomer, createProduct, createSale,
  deleteCustomer, deleteProduct, deleteSale,
  getCustomerById, getCustomers,
  getDashboardStats, getMonthlySalesTrend, getSalesByStatus,
  getProductById, getProductCategories, getProducts,
  getSaleById, getSales,
  isSeeded,
  updateCustomer, updateProduct, updateSaleStatus,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// Admin middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ====== Dashboard ======
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return await getDashboardStats();
    }),
    monthlySalesTrend: protectedProcedure
      .input(z.object({ months: z.number().min(1).max(24).default(12) }).optional())
      .query(async ({ input }) => {
        return await getMonthlySalesTrend(input?.months ?? 12);
      }),
    salesByStatus: protectedProcedure.query(async () => {
      return await getSalesByStatus();
    }),
    seedData: protectedProcedure.mutation(async () => {
      const seeded = await isSeeded();
      if (seeded) return { message: 'Data already seeded' };
      await seedDemoData();
      return { message: 'Demo data seeded successfully' };
    }),
    isSeeded: protectedProcedure.query(async () => {
      return await isSeeded();
    }),
  }),

  // ====== Customers ======
  customers: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        return await getCustomers(input);
      }),
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const customer = await getCustomerById(input.id);
        if (!customer) throw new TRPCError({ code: 'NOT_FOUND' });
        return customer;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        company: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        status: z.enum(['active', 'inactive']).default('active'),
      }))
      .mutation(async ({ input }) => {
        await createCustomer({
          ...input,
          email: input.email || undefined,
        });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        company: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        status: z.enum(['active', 'inactive']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCustomer(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCustomer(input.id);
        return { success: true };
      }),
  }),

  // ====== Products ======
  products: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        return await getProducts(input);
      }),
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const product = await getProductById(input.id);
        if (!product) throw new TRPCError({ code: 'NOT_FOUND' });
        return product;
      }),
    categories: protectedProcedure.query(async () => {
      return await getProductCategories();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        category: z.string().optional(),
        price: z.string(),
        cost: z.string().optional(),
        stock: z.number().min(0).default(0),
        minStock: z.number().min(0).default(10),
        unit: z.string().default('piece'),
        description: z.string().optional(),
        status: z.enum(['active', 'inactive', 'out_of_stock']).default('active'),
      }))
      .mutation(async ({ input }) => {
        await createProduct(input as any);
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        sku: z.string().optional(),
        category: z.string().optional(),
        price: z.string().optional(),
        cost: z.string().optional(),
        stock: z.number().min(0).optional(),
        minStock: z.number().min(0).optional(),
        unit: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['active', 'inactive', 'out_of_stock']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateProduct(id, data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProduct(input.id);
        return { success: true };
      }),
  }),

  // ====== Sales ======
  sales: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        paymentStatus: z.string().optional(),
        customerId: z.number().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        return await getSales(input);
      }),
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const sale = await getSaleById(input.id);
        if (!sale) throw new TRPCError({ code: 'NOT_FOUND' });
        return sale;
      }),
    create: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        discount: z.string().default('0'),
        tax: z.string().default('0'),
        notes: z.string().optional(),
        saleDate: z.date().optional(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number().min(1),
          unitPrice: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const totalAmount = input.items.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
        const discount = parseFloat(input.discount);
        const tax = parseFloat(input.tax);
        const netAmount = totalAmount - discount + tax;
        const invoiceNumber = `INV-${Date.now()}`;
        const saleData = {
          invoiceNumber,
          customerId: input.customerId,
          totalAmount: totalAmount.toFixed(2),
          discount: discount.toFixed(2),
          tax: tax.toFixed(2),
          netAmount: netAmount.toFixed(2),
          notes: input.notes,
          saleDate: input.saleDate ?? new Date(),
          status: 'pending' as const,
          paymentStatus: 'unpaid' as const,
        };
        const items = input.items.map(item => ({
          saleId: 0,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
        }));
        await createSale(saleData, items);
        return { success: true, invoiceNumber };
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
        paymentStatus: z.enum(['unpaid', 'partial', 'paid']).optional(),
      }))
      .mutation(async ({ input }) => {
        await updateSaleStatus(input.id, input.status ?? 'pending', input.paymentStatus);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSale(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ====== Seed Demo Data ======
async function seedDemoData() {
  const { getDb } = await import('./db');
  const { customers: customersTable, products: productsTable, sales: salesTable, saleItems: saleItemsTable } = await import('../drizzle/schema');
  const { sql } = await import('drizzle-orm');
  const db = await getDb();
  if (!db) return;

  // Insert customers
  const customerData = [
    { name: 'شركة الأفق للتقنية', email: 'info@ufuq-tech.com', phone: '+966501234567', company: 'الأفق للتقنية', city: 'الرياض', country: 'Saudi Arabia', status: 'active' as const, totalPurchases: '0' },
    { name: 'مؤسسة النجم الذهبي', email: 'contact@golden-star.com', phone: '+966512345678', company: 'النجم الذهبي', city: 'جدة', country: 'Saudi Arabia', status: 'active' as const, totalPurchases: '0' },
    { name: 'شركة الريادة للاستثمار', email: 'info@riyadah.com', phone: '+966523456789', company: 'الريادة للاستثمار', city: 'الدمام', country: 'Saudi Arabia', status: 'active' as const, totalPurchases: '0' },
    { name: 'مجموعة الواحة التجارية', email: 'sales@waha-group.com', phone: '+966534567890', company: 'الواحة التجارية', city: 'مكة المكرمة', country: 'Saudi Arabia', status: 'active' as const, totalPurchases: '0' },
    { name: 'شركة البناء الحديث', email: 'info@modern-build.com', phone: '+966545678901', company: 'البناء الحديث', city: 'المدينة المنورة', country: 'Saudi Arabia', status: 'active' as const, totalPurchases: '0' },
    { name: 'مؤسسة الإبداع الرقمي', email: 'hello@digital-ibda.com', phone: '+966556789012', company: 'الإبداع الرقمي', city: 'الرياض', country: 'Saudi Arabia', status: 'active' as const, totalPurchases: '0' },
    { name: 'شركة التقدم للخدمات', email: 'info@taqadum.com', phone: '+966567890123', company: 'التقدم للخدمات', city: 'جدة', country: 'Saudi Arabia', status: 'inactive' as const, totalPurchases: '0' },
    { name: 'مجموعة الأمانة التجارية', email: 'contact@amanah.com', phone: '+966578901234', company: 'الأمانة التجارية', city: 'الرياض', country: 'Saudi Arabia', status: 'active' as const, totalPurchases: '0' },
  ];
  await db.insert(customersTable).values(customerData);

  // Insert products
  const productData = [
    { name: 'لابتوب Dell XPS 15', sku: 'DELL-XPS-15', category: 'أجهزة الحاسب', price: '4500.00', cost: '3200.00', stock: 25, minStock: 5, unit: 'جهاز', description: 'لابتوب احترافي للأعمال', status: 'active' as const },
    { name: 'شاشة Samsung 27"', sku: 'SAM-MON-27', category: 'الشاشات', price: '1200.00', cost: '800.00', stock: 40, minStock: 10, unit: 'شاشة', description: 'شاشة 4K عالية الدقة', status: 'active' as const },
    { name: 'طابعة HP LaserJet', sku: 'HP-LJ-PRO', category: 'الطابعات', price: '850.00', cost: '550.00', stock: 15, minStock: 5, unit: 'طابعة', description: 'طابعة ليزر للمكاتب', status: 'active' as const },
    { name: 'كيبورد لاسلكي Logitech', sku: 'LOG-KB-WL', category: 'الملحقات', price: '280.00', cost: '150.00', stock: 60, minStock: 15, unit: 'قطعة', description: 'كيبورد لاسلكي مريح', status: 'active' as const },
    { name: 'ماوس Logitech MX Master', sku: 'LOG-MX-3', category: 'الملحقات', price: '350.00', cost: '200.00', stock: 55, minStock: 15, unit: 'قطعة', description: 'ماوس احترافي للإنتاجية', status: 'active' as const },
    { name: 'سماعات Sony WH-1000XM5', sku: 'SNY-WH-1000', category: 'الصوتيات', price: '1500.00', cost: '950.00', stock: 20, minStock: 5, unit: 'قطعة', description: 'سماعات بإلغاء الضوضاء', status: 'active' as const },
    { name: 'كاميرا ويب Logitech C920', sku: 'LOG-C920', category: 'الملحقات', price: '420.00', cost: '250.00', stock: 30, minStock: 8, unit: 'قطعة', description: 'كاميرا ويب HD للاجتماعات', status: 'active' as const },
    { name: 'هارد ديسك خارجي 2TB', sku: 'WD-EXT-2TB', category: 'التخزين', price: '380.00', cost: '220.00', stock: 45, minStock: 10, unit: 'قطعة', description: 'هارد ديسك خارجي USB 3.0', status: 'active' as const },
    { name: 'راوتر WiFi 6 ASUS', sku: 'ASUS-RT-AX88', category: 'الشبكات', price: '950.00', cost: '600.00', stock: 18, minStock: 5, unit: 'جهاز', description: 'راوتر WiFi 6 عالي الأداء', status: 'active' as const },
    { name: 'UPS APC 1500VA', sku: 'APC-UPS-1500', category: 'الطاقة', price: '750.00', cost: '480.00', stock: 8, minStock: 3, unit: 'جهاز', description: 'مزود طاقة احتياطي', status: 'active' as const },
  ];
  await db.insert(productsTable).values(productData);

  // Get inserted IDs
  const insertedCustomers = await db.select().from(customersTable);
  const insertedProducts = await db.select().from(productsTable);

  // Generate sales over the past 12 months
  const statuses = ['delivered', 'delivered', 'delivered', 'confirmed', 'pending', 'shipped', 'cancelled'] as const;
  const paymentStatuses = ['paid', 'paid', 'paid', 'partial', 'unpaid'] as const;

  const salesData = [];
  const saleItemsData: any[] = [];

  for (let i = 0; i < 80; i++) {
    const daysAgo = Math.floor(Math.random() * 365);
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - daysAgo);

    const customer = insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentStatus = status === 'delivered' ? paymentStatuses[Math.floor(Math.random() * 3)] : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

    const numItems = Math.floor(Math.random() * 3) + 1;
    const selectedProducts = [...insertedProducts].sort(() => 0.5 - Math.random()).slice(0, numItems);

    let totalAmount = 0;
    const items = selectedProducts.map(product => {
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unitPrice = parseFloat(product.price);
      const totalPrice = unitPrice * quantity;
      totalAmount += totalPrice;
      return { productId: product.id, quantity, unitPrice: unitPrice.toFixed(2), totalPrice: totalPrice.toFixed(2) };
    });

    const discount = Math.random() > 0.7 ? (totalAmount * 0.05).toFixed(2) : '0';
    const tax = (totalAmount * 0.15).toFixed(2);
    const netAmount = (totalAmount - parseFloat(discount) + parseFloat(tax)).toFixed(2);

    salesData.push({
      invoiceNumber: `INV-${String(i + 1).padStart(4, '0')}`,
      customerId: customer.id,
      totalAmount: totalAmount.toFixed(2),
      discount,
      tax,
      netAmount,
      status,
      paymentStatus,
      saleDate,
    });
    saleItemsData.push({ saleIndex: i, items });
  }

  // Insert sales in batches
  for (let i = 0; i < salesData.length; i++) {
    await db.insert(salesTable).values(salesData[i]);
  }

  const insertedSales = await db.select().from(salesTable);
  for (let i = 0; i < insertedSales.length; i++) {
    const saleItemGroup = saleItemsData.find(s => s.saleIndex === i);
    if (saleItemGroup) {
      await db.insert(saleItemsTable).values(
        saleItemGroup.items.map((item: any) => ({ ...item, saleId: insertedSales[i].id }))
      );
    }
  }

  // Update customer total purchases
  for (const customer of insertedCustomers) {
    const customerSales = insertedSales.filter(s => s.customerId === customer.id && s.status === 'delivered');
    const total = customerSales.reduce((sum, s) => sum + parseFloat(s.netAmount), 0);
    if (total > 0) {
      await db.update(customersTable).set({ totalPurchases: total.toFixed(2) }).where(sql`id = ${customer.id}`);
    }
  }
}
