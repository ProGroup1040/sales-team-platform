import {
  int, mysqlEnum, mysqlTable, text, timestamp,
  varchar, decimal, date, float
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
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

// ─── Engineers ────────────────────────────────────────────────────────────────
export const engineers = mysqlTable("engineers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  department: varchar("department", { length: 80 }),
  role: mysqlEnum("role", ["admin", "engineer", "admin_sales"]).default("engineer").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Engineer = typeof engineers.$inferSelect;

// ─── Daily Tasks ──────────────────────────────────────────────────────────────
export const dailyTasks = mysqlTable("daily_tasks", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull(),
  taskDate: date("taskDate").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  plannedHours: float("plannedHours").default(1),
  status: mysqlEnum("status", ["planned", "completed", "delayed", "not_done", "client_delay"]).default("planned").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  delayDays: int("delayDays").default(0).notNull(),
  isClientDelay: int("isClientDelay").default(0).notNull(),
  rescheduledFromId: int("rescheduledFromId"),
  isRescheduled: int("isRescheduled").default(0).notNull(),
  isCritical: int("isCritical").default(0).notNull(),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  // ─── Meeting Recording ─────────────────────────────────────────────────────
  category: varchar("category", { length: 80 }), // e.g. 'closing', 'meeting', 'general'
  meetingRecordingLink: varchar("meetingRecordingLink", { length: 500 }),
  recordingSubmittedAt: timestamp("recordingSubmittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DailyTask = typeof dailyTasks.$inferSelect;

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  source: mysqlEnum("source", ["website", "referral", "social_media", "call", "walk_in", "other"]).default("other").notNull(),
  assignedEngineerId: int("assignedEngineerId"),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "unqualified", "converted"]).default("new").notNull(),
  firstContactAt: timestamp("firstContactAt"),
  responseTimeMinutes: int("responseTimeMinutes"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Lead = typeof leads.$inferSelect;

// ─── Visits ───────────────────────────────────────────────────────────────────
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId"),
  engineerId: int("engineerId").notNull(),
  clientName: varchar("clientName", { length: 120 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 30 }),
  address: text("address"),
  scheduledAt: timestamp("scheduledAt").notNull(),
  actualAt: timestamp("actualAt"),

  // ── 1. Booking & Assignment ──────────────────────────────────────────────────
  assignedDelay: int("assignedDelay").default(0).notNull(),        // تأخير التوزيع بالدقائق

  // ── 2. Confirmation ──────────────────────────────────────────────────────────
  confirmationStatus: mysqlEnum("confirmationStatus", ["confirmed_same_day", "confirmed_late", "not_confirmed"]).default("not_confirmed").notNull(),
  confirmedAt: timestamp("confirmedAt"),
  confirmationDelayHours: int("confirmationDelayHours").default(0).notNull(),

  // ── 3. Execution ─────────────────────────────────────────────────────────────
  status: mysqlEnum("status", ["scheduled", "completed", "delayed", "cancelled", "rescheduled"]).default("scheduled").notNull(),
  delayMinutes: int("delayMinutes").default(0),
  rescheduledFromId: int("rescheduledFromId"),

  // ── 4. Upload & Delivery ─────────────────────────────────────────────────────
  uploadStatus: mysqlEnum("uploadStatus", ["uploaded_same_day", "uploaded_late", "not_uploaded"]).default("not_uploaded").notNull(),
  uploadedAt: timestamp("uploadedAt"),
  deliveredToAdmin: int("deliveredToAdmin").default(0).notNull(),  // 1 = نعم
  deliveryDelayHours: int("deliveryDelayHours").default(0).notNull(),

  // ── 5. Quality ───────────────────────────────────────────────────────────────
  quality: mysqlEnum("quality", ["successful", "with_issues", "design_rejected", "repeated", "pending"]).default("pending").notNull(),

  // ── 6. Admin Handling ────────────────────────────────────────────────────────
  groupStatus: mysqlEnum("groupStatus", ["created_on_time", "created_late", "not_created"]).default("not_created").notNull(),
  assignedToDesigner: int("assignedToDesigner").default(0).notNull(), // 1 = نعم

  // ── 7. Financial ─────────────────────────────────────────────────────────────
  feeAmount: decimal("feeAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  feeCollected: int("feeCollected").default(0).notNull(),           // 1 = محصّل

  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Visit = typeof visits.$inferSelect;

// ─── Deals (Closing) ──────────────────────────────────────────────────────────
export const deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId"),
  leadId: int("leadId"),
  engineerId: int("engineerId").notNull(),
  clientName: varchar("clientName", { length: 120 }).notNull(),
  value: decimal("value", { precision: 14, scale: 2 }).notNull(),
  stage: mysqlEnum("stage", ["proposal", "negotiation", "contract_sent", "closed_won", "closed_lost"]).default("proposal").notNull(),
  nextAction: text("nextAction"),
  nextActionDate: date("nextActionDate"),
  closedAt: timestamp("closedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Deal = typeof deals.$inferSelect;

// ─── Monthly Targets ──────────────────────────────────────────────────────────
export const monthlyTargets = mysqlTable("monthly_targets", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  targetAmount: decimal("targetAmount", { precision: 14, scale: 2 }).notNull(),
  avgDealValue: decimal("avgDealValue", { precision: 14, scale: 2 }).default("50000"),
  closingRate: float("closingRate").default(0.3),
  visitToClosingRate: float("visitToClosingRate").default(0.4),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MonthlyTarget = typeof monthlyTargets.$inferSelect;

// ─── Collections ──────────────────────────────────────────────────────────────
export const collections = mysqlTable("collections", {
  id: int("id").autoincrement().primaryKey(),
  dealId: int("dealId"),
  clientName: varchar("clientName", { length: 120 }).notNull(),
  contractAmount: decimal("contractAmount", { precision: 14, scale: 2 }).notNull(),
  collectedAmount: decimal("collectedAmount", { precision: 14, scale: 2 }).default("0"),
  dueDate: date("dueDate"),
  status: mysqlEnum("status", ["on_track", "due_soon", "overdue", "completed"]).default("on_track").notNull(),
  lastPaymentAt: timestamp("lastPaymentAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Collection = typeof collections.$inferSelect;

// ─── Engineer Monthly Targets (هدف كل مهندس شهرياً) ─────────────────────────────
export const engineerTargets = mysqlTable("engineer_targets", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  targetAmount: decimal("targetAmount", { precision: 14, scale: 2 }).notNull(),
  manpower: float("manpower").default(1).notNull(), // عدد الأشخاص أو الوحدات
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EngineerTarget = typeof engineerTargets.$inferSelect;

// ─── Discount Tiers (شرائح الخصم) ────────────────────────────────────────────
export const discountTiers = mysqlTable("discount_tiers", {
  id: int("id").autoincrement().primaryKey(),
  minSales: decimal("minSales", { precision: 14, scale: 2 }).notNull(),
  maxSales: decimal("maxSales", { precision: 14, scale: 2 }),  // null = no upper limit
  maxDiscountPct: float("maxDiscountPct").notNull(),
  label: varchar("label", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DiscountTier = typeof discountTiers.$inferSelect;

// ─── Commission Tiers (شرائح الكوميشن) ──────────────────────────────────────
export const commissionTiers = mysqlTable("commission_tiers", {
  id: int("id").autoincrement().primaryKey(),
  minAchievementPct: float("minAchievementPct").notNull(),  // نسبة تحقيق الهدف الدنيا
  maxAchievementPct: float("maxAchievementPct"),             // null = no upper limit
  commissionPct: float("commissionPct").notNull(),           // نسبة الكوميشن
  label: varchar("label", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CommissionTier = typeof commissionTiers.$inferSelect;

// ─── Design Reviews (تقييم التصميم الأسبوعي) ────────────────────────────────
export const designReviews = mysqlTable("design_reviews", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull(),
  weekStart: date("weekStart").notNull(),          // بداية الأسبوع
  designQuality: float("designQuality").default(0).notNull(),   // 0-100
  revisionCount: int("revisionCount").default(0).notNull(),     // عدد التعديلات
  executionSpeed: float("executionSpeed").default(0).notNull(), // 0-100
  meetingNotes: text("meetingNotes"),
  reviewedBy: varchar("reviewedBy", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DesignReview = typeof designReviews.$inferSelect;

// ─── Incentive Tiers (شرائح الحوافز) ─────────────────────────────────────────
export const incentiveTiers = mysqlTable("incentive_tiers", {
  id: int("id").autoincrement().primaryKey(),
  minKpiPct: float("minKpiPct").notNull(),          // الحد الأدنى لـ KPI
  maxKpiPct: float("maxKpiPct"),                    // null = no upper limit
  incentiveAmount: decimal("incentiveAmount", { precision: 14, scale: 2 }).notNull(),
  label: varchar("label", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type IncentiveTier = typeof incentiveTiers.$inferSelect;

// ─── Legacy tables (kept for backward compat) ─────────────────────────────────
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  company: varchar("company", { length: 120 }),
  status: mysqlEnum("status", ["active", "inactive", "prospect"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 80 }),
  category: varchar("category", { length: 80 }),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  stock: int("stock").default(0),
  minStock: int("minStock").default(10),
  unit: varchar("unit", { length: 30 }).default("قطعة"),
  description: text("description"),
  status: mysqlEnum("status", ["active", "inactive", "out_of_stock"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
  finalAmount: decimal("finalAmount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "delivered", "cancelled", "returned"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "partial", "paid"]).default("unpaid").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Payments (تسجيل الدفعات الفعلية) ─────────────────────────────────────────
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),   // ربط بالعقد
  engineerId: int("engineerId"),                  // المهندس المسؤول
  clientName: varchar("clientName", { length: 120 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  paymentDate: date("paymentDate").notNull(),
  paymentType: mysqlEnum("paymentType", ["initial", "installment", "final", "visit_fee"]).default("installment").notNull(),
  addedBy: mysqlEnum("addedBy", ["engineer", "admin"]).default("admin").notNull(),
  receiptNumber: varchar("receiptNumber", { length: 80 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ─── Payment Promises (وعود الدفع) ────────────────────────────────────────────
export const paymentPromises = mysqlTable("payment_promises", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),
  engineerId: int("engineerId"),
  clientName: varchar("clientName", { length: 120 }).notNull(),
  promiseAmount: decimal("promiseAmount", { precision: 14, scale: 2 }).notNull(),
  promiseDate: date("promiseDate").notNull(),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PaymentPromise = typeof paymentPromises.$inferSelect;
export type InsertPaymentPromise = typeof paymentPromises.$inferInsert;

// ─── Commission Payments (صرف الكوميشن بالمراحل) ────────────────────────────
export const commissionPayments = mysqlTable("commission_payments", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),
  engineerId: int("engineerId").notNull(),
  stage: mysqlEnum("stage", ["stage1", "stage2"]).notNull(),  // stage1=50% عند 75% تحصيل, stage2=50% عند الاستلام
  commissionAmount: decimal("commissionAmount", { precision: 14, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  triggerCondition: text("triggerCondition"),  // وصف الشرط الذي أطلق الصرف
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CommissionPayment = typeof commissionPayments.$inferSelect;

// ─── Admin Sales Tasks ──────────────────────────────────────────────────────────────────────────
export const adminSalesTasks = mysqlTable("admin_sales_tasks", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull(),
  taskType: mysqlEnum("taskType", ["daily", "weekly", "monthly", "meeting"]).notNull(),
  taskKey: varchar("taskKey", { length: 80 }).notNull(),  // unique key like 'crm_update', 'lead_quality_mon_thu'
  taskTitle: varchar("taskTitle", { length: 255 }).notNull(),
  taskDate: date("taskDate").notNull(),
  dayOfWeek: int("dayOfWeek"),  // 0=Sun, 1=Mon, ... 6=Sat (for weekly)
  dayOfMonth: int("dayOfMonth"),  // 15, 22, 28 (for monthly)
  status: mysqlEnum("status", ["pending", "done", "delayed", "not_done"]).default("pending").notNull(),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdminSalesTask = typeof adminSalesTasks.$inferSelect;
export type InsertAdminSalesTask = typeof adminSalesTasks.$inferInsert;

// ─── Admin Sales Meetings ─────────────────────────────────────────────────────────────────────────
export const adminSalesMeetings = mysqlTable("admin_sales_meetings", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull(),
  weekStartDate: date("weekStartDate").notNull(),
  weeklyTeamMeeting: mysqlEnum("weeklyTeamMeeting", ["done", "not_done", "pending"]).default("pending").notNull(),
  managementMeeting: mysqlEnum("managementMeeting", ["done", "not_done", "pending"]).default("pending").notNull(),
  reportSubmitted: mysqlEnum("reportSubmitted", ["yes", "no", "pending"]).default("pending").notNull(),
  meetingNotes: text("meetingNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdminSalesMeeting = typeof adminSalesMeetings.$inferSelect;
export type InsertAdminSalesMeeting = typeof adminSalesMeetings.$inferInsert;

// ─── Meeting Reviews ────────────────────────────────────────────────────────────────────────────────
// تقييم جودة الميتينج بواسطة Admin Sales
export const meetingReviews = mysqlTable("meeting_reviews", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),          // FK → daily_tasks.id
  engineerId: int("engineerId").notNull(),  // المهندس صاحب المهمة
  reviewedBy: int("reviewedBy"),             // Admin Sales user id
  // ─── أبعاد التقييم ────────────────────────────────────────────────────────────────────────────────
  openingScore: int("openingScore").default(0).notNull(),          // من 10
  understandingScore: int("understandingScore").default(0).notNull(), // من 20
  presentationScore: int("presentationScore").default(0).notNull(),  // من 20
  objectionScore: int("objectionScore").default(0).notNull(),        // من 25
  closingScore: int("closingScore").default(0).notNull(),            // من 25
  totalScore: int("totalScore").default(0).notNull(),               // مجموع من 100
  comments: text("comments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MeetingReview = typeof meetingReviews.$inferSelect;
export type InsertMeetingReview = typeof meetingReviews.$inferInsert;

// ─── Lead Followup Logs ────────────────────────────────────────────────────────────────────────────────
// يسجل Admin Sales نتيجة مراجعة WhatsApp ومتابعة الـ Leads يومياً
export const leadFollowupLogs = mysqlTable("lead_followup_logs", {
  id: int("id").autoincrement().primaryKey(),
  logDate: date("logDate").notNull(),                    // تاريخ المتابعة
  adminSalesId: int("adminSalesId").notNull(),           // FK → engineers.id (الذي سجّل)
  telesalesId: int("telesalesId").notNull(),             // FK → engineers.id (الذي يتابع الـ Lead)
  // ─── حالة المتابعة ────────────────────────────────────────────────────────────────────────────────
  followupStatus: mysqlEnum("followupStatus", ["followed_up", "delayed", "no_response"]).notNull(),
  // ─── تفاصيل التأخير ────────────────────────────────────────────────────────────────────────────────
  responseDelayHours: int("responseDelayHours"),         // عدد ساعات التأخير (إن وجد)
  followupQuality: mysqlEnum("followupQuality", ["excellent", "good", "poor"]),  // جودة المتابعة
  // ─── ملاحظات ────────────────────────────────────────────────────────────────────────────────
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LeadFollowupLog = typeof leadFollowupLogs.$inferSelect;
export type InsertLeadFollowupLog = typeof leadFollowupLogs.$inferInsert;

export const saleItems = mysqlTable("sale_items", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
});
