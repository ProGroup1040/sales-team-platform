import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// جدول العملاء
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).default("Saudi Arabia"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  totalPurchases: decimal("totalPurchases", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// جدول المنتجات
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }).unique(),
  category: varchar("category", { length: 100 }),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 15, scale: 2 }),
  stock: int("stock").default(0).notNull(),
  minStock: int("minStock").default(10),
  unit: varchar("unit", { length: 50 }).default("piece"),
  description: text("description"),
  status: mysqlEnum("status", ["active", "inactive", "out_of_stock"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// جدول المبيعات
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).unique().notNull(),
  customerId: int("customerId").notNull(),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 15, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 15, scale: 2 }).default("0"),
  netAmount: decimal("netAmount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "partial", "paid"]).default("unpaid").notNull(),
  notes: text("notes"),
  saleDate: timestamp("saleDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

// جدول تفاصيل المبيعات
export const saleItems = mysqlTable("sale_items", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = typeof saleItems.$inferInsert;
