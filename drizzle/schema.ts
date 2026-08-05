import {
  int, tinyint, mysqlEnum, mysqlTable, text, timestamp,
  varchar, decimal, date, float, boolean
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
  department: mysqlEnum("department", ["sales_engineer", "sales_specialist", "interior_designer", "tele_sales", "site", "admin_sales", "manager"]).default("sales_engineer"),
  role: mysqlEnum("role", ["admin", "engineer", "admin_sales", "sales_engineer", "tele_sales", "site_engineer", "system_user", "sales_specialist", "interior_designer", "manager"]).default("sales_engineer").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // مستوى الخبرة - ينطبق فقط على sales_engineer
  seniority: mysqlEnum("seniority", ["senior", "junior"]).default("junior"),
  // ─── Soft Delete ───────────────────────────────────────────────────────────────────────────────────
  isDeleted: int("isDeleted").default(0).notNull(),
  deletedAt: timestamp("deletedAt"),
  deleteReason: mysqlEnum("deleteReason", ["data_entry_error", "duplicate", "client_cancelled", "other"]),
  deleteReasonCustom: varchar("deleteReasonCustom", { length: 255 }),
  deletedBy: varchar("deletedBy", { length: 120 }),
  // إجبار تغيير كلمة المرور عند أول دخول
  forcePasswordChange: int("forcePasswordChange").default(0).notNull(),
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
  // ─── Soft Delete ──────────────────────────────────────────────────────────
  isDeleted: int("isDeleted").default(0).notNull(),
  deletedAt: timestamp("deletedAt"),
  deleteReason: mysqlEnum("deleteReason", ["data_entry_error", "duplicate", "client_cancelled", "other"]),
  deleteReasonCustom: varchar("deleteReasonCustom", { length: 255 }),
  deletedBy: varchar("deletedBy", { length: 120 }),
  // ─── Time-based Calendar ─────────────────────────────────────────────────────
  startTime: varchar("startTime", { length: 5 }),  // HH:MM e.g. '09:00'
  endTime: varchar("endTime", { length: 5 }),      // HH:MM e.g. '10:30'
  taskType: mysqlEnum("taskType", [
    // 7 Standard Task Types
    "design_2d",             // 2D Design
    "design_3d",             // 3D Modeling
    "render",                // Render
    "quotation",             // Quotation
    "meeting_modeling",      // Meeting Modeling
    "meeting_presentation",  // Meeting Presentation
    "meeting_closing",       // Meeting Closing
    // New Task Types
    "contract",              // Contract Preparation (إعداد العقد)
    "work_order",            // Work Order Preparation (إعداد أمر الشغل)
    // Legacy (keep for backward compat)
    "meeting_2d", "meeting_3d", "meeting_quotation",
    // Legacy
    "closing", "negotiation", "other"
  ]).default("other"),
  // ─── Goal Linking ─────────────────────────────────────────────────────────
  goalType: mysqlEnum("goalType", [
    "design_2d", "design_3d", "render", "quotation",
    "meeting", "closing", "contract", "work_order"
  ]),
  // ─── Actual vs Planned ────────────────────────────────────────────────────
  actualHours: float("actualHours"),
  completionDate: date("completionDate"),
  // ─── Client / Deal Linking ────────────────────────────────────────────────
  clientName: varchar("clientName", { length: 120 }),
  dealId: int("dealId"),
  // ─── Meeting Recording ─────────────────────────────────────────────────────
  category: varchar("category", { length: 80 }), // e.g. 'closing', 'meeting', 'general'
  meetingRecordingLink: varchar("meetingRecordingLink", { length: 500 }),
  recordingSubmittedAt: timestamp("recordingSubmittedAt"),
  // ─── Reminder ─────────────────────────────────────────────────────────────
  reminderMinutes: int("reminderMinutes").default(0), // 0=none, 15, 30, 60
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
  // ─── Soft Delete ──────────────────────────────────────────────────────────
  isDeleted: int("isDeleted").default(0).notNull(),
  deletedAt: timestamp("deletedAt"),
  deleteReason: mysqlEnum("deleteReason", ["data_entry_error", "duplicate", "client_cancelled", "other"]),
  deleteReasonCustom: varchar("deleteReasonCustom", { length: 255 }),
  deletedBy: varchar("deletedBy", { length: 120 }),
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
  bookingMonth: int("bookingMonth"),                                 // شهر الحجز (1-12)
  bookingYear: int("bookingYear"),                                   // سنة الحجز
  actualAt: timestamp("actualAt"),

  // ── Admin Sales Tracking ────────────────────────────────────────────────────────────────────────────────
  adminSalesId: int("adminSalesId"),
  lastUpdatedByAdminAt: timestamp("lastUpdatedByAdminAt"),

  // ── 1. Booking & Assignment ────────────────────────────────────────────────────────────────────────────────
  bookingStatus: mysqlEnum("bookingStatus", ["booked", "distributed", "distribution_delayed"]).default("booked").notNull(),
  assignedDelay: int("assignedDelay").default(0).notNull(),

  // ── 2. Confirmation ────────────────────────────────────────────────────────────────────────────────
  confirmationStatus: mysqlEnum("confirmationStatus", ["confirmed_same_day", "confirmed_late", "not_confirmed"]).default("not_confirmed").notNull(),
  confirmedAt: timestamp("confirmedAt"),
  confirmationDelayHours: int("confirmationDelayHours").default(0).notNull(),

  // ── 3. Execution ─────────────────────────────────────────────────────────────
  status: mysqlEnum("status", ["scheduled", "completed", "delayed", "cancelled", "rescheduled"]).default("scheduled").notNull(),
  executedAt: timestamp("executedAt"),                              // تاريخ التنفيذ الفعلي
  executionMonth: int("executionMonth"),                             // شهر التنفيذ (1-12)
  executionYear: int("executionYear"),                               // سنة التنفيذ
  delayMinutes: int("delayMinutes").default(0),
  rescheduledFromId: int("rescheduledFromId"),

  // ── 4. Upload & Delivery ─────────────────────────────────────────────────────
  uploadStatus: mysqlEnum("uploadStatus", ["uploaded_same_day", "uploaded_late", "not_uploaded"]).default("not_uploaded").notNull(),
  uploadedAt: timestamp("uploadedAt"),
  uploadMonth: int("uploadMonth"),                                   // شهر الرفع (1-12)
  uploadYear: int("uploadYear"),                                     // سنة الرفع
  deliveredToAdmin: int("deliveredToAdmin").default(0).notNull(),  // 1 = نعم
  deliveryDelayHours: int("deliveryDelayHours").default(0).notNull(),

  // ── 5. Quality ───────────────────────────────────────────────────────────────
  quality: mysqlEnum("quality", ["successful", "with_issues", "design_rejected", "repeated", "pending"]).default("pending").notNull(),

  // ── 6. Admin Handling ────────────────────────────────────────────────────────
  groupStatus: mysqlEnum("groupStatus", ["created_on_time", "created_late", "not_created"]).default("not_created").notNull(),
  assignedToDesigner: int("assignedToDesigner").default(0).notNull(),

  // ── 7. Financial ────────────────────────────────────────────────────────────────────────────────
  feeAmount: decimal("feeAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  feeCollected: int("feeCollected").default(0).notNull(),
  paymentScreenshotUrl: varchar("paymentScreenshotUrl", { length: 500 }),
  paymentDate: timestamp("paymentDate"),
  collectedAt: timestamp("collectedAt"),                             // تاريخ التحصيل الفعلي
  collectionMonth: int("collectionMonth"),                           // شهر التحصيل (1-12)
  collectionYear: int("collectionYear"),                             // سنة التحصيل
  debtFollowedUp: int("debtFollowedUp").default(0).notNull(),       // 1 = تمت متابعة المديونية

  // ── 8. Soft Delete ────────────────────────────────────────────────────────────────────────────────
  isDeleted: int("isDeleted").default(0).notNull(),                 // 1 = محذوف
  deleteReason: mysqlEnum("deleteReason", ["client_cancelled", "postponed", "data_entry_error", "other"]),
  deleteReasonCustom: varchar("deleteReasonCustom", { length: 255 }),
  deletedBy: varchar("deletedBy", { length: 120 }),
  deletedAt: timestamp("deletedAt"),

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
  // ─── Gross / Net Value (CRITICAL: Revenue = netValue only) ─────────────────
  grossValue: decimal("grossValue", { precision: 14, scale: 2 }).default("0").notNull(),
  netValue: decimal("netValue", { precision: 14, scale: 2 }).default("0").notNull(),
  // ─── Source Task (Auto-created from Task) ─────────────────────────────────
  sourceTaskId: int("sourceTaskId"),
  isAutoCreated: int("isAutoCreated").default(0).notNull(), // 1 = created from Task
  isLocked: int("isLocked").default(0).notNull(),           // 1 = locked after closed
  stage: mysqlEnum("stage", ["proposal", "negotiation", "contract_sent", "closed_won", "closed_lost"]).default("proposal").notNull(),
  nextAction: text("nextAction"),
  nextActionDate: date("nextActionDate"),
  closedAt: timestamp("closedAt"),
  notes: text("notes"),
  // ─── Discount Fields ──────────────────────────────────────────────────────
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).default("0").notNull(),
  discountValue: decimal("discountValue", { precision: 14, scale: 2 }).default("0").notNull(),
  discountNote: text("discountNote"),
  // ─── Advanced Discount Fields ─────────────────────────────────────────────
  maxDiscountPct: decimal("maxDiscountPct", { precision: 5, scale: 2 }).default("0").notNull(),
  savedDiscountBonus: decimal("savedDiscountBonus", { precision: 14, scale: 2 }).default("0").notNull(),
  discountApprovalStatus: mysqlEnum("discountApprovalStatus", ["none", "pending", "approved", "rejected"]).default("none").notNull(),
  discountApprovedBy: varchar("discountApprovedBy", { length: 120 }),
  // ─── Closing Month Attribution (CRITICAL: deals attributed by closedAt month) ──
  closingMonth: int("closingMonth"),   // 1-12: month of closing (set when stage → closed_won/lost)
  closingYear: int("closingYear"),    // e.g. 2026
  // ─── Accounting Month Attribution (CRITICAL: financial accounting month, can differ from closing month) ──
  accountingMonth: int("accountingMonth"),  // 1-12: month for financial accounting (admin/manager only)
  accountingYear: int("accountingYear"),   // e.g. 2026
  accountingMonthSetBy: varchar("accountingMonthSetBy", { length: 120 }), // who set it
  accountingMonthSetAt: timestamp("accountingMonthSetAt"), // when it was set
  // ─── Lost Deal Analysis ─────────────────────────────────────────────────────
  lostReason: mysqlEnum("lostReason", ["price_high", "competitor", "slow_response", "wrong_product", "not_serious", "budget_cut", "other"]),
  lostReasonNote: varchar("lostReasonNote", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  // ─── Soft Delete ──────────────────────────────────────────────────────────
  isDeleted: int("isDeleted").default(0).notNull(),
  deletedAt: timestamp("deletedAt"),
  deleteReason: mysqlEnum("deleteReason", ["data_entry_error", "duplicate", "client_cancelled", "other"]),
  deleteReasonCustom: varchar("deleteReasonCustom", { length: 255 }),
  deletedBy: varchar("deletedBy", { length: 120 }),
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
  engineerId: int("engineerId"),                          // المهندس المسؤول عن العقد
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
  manpower: float("manpower").default(1).notNull(),
  // ─── Operational Targets (الطلب الجديد) ─────────────────────────────────────────────────────
  targetDeals: int("targetDeals").default(0),        // هدف عدد الصفقات
  targetMeetings: int("targetMeetings").default(0),   // هدف عدد الميتينجات
  targetDesigns: int("targetDesigns").default(0),     // هدف عدد التصاميم (2D+3D+Render)
  targetClosings: int("targetClosings").default(0),   // هدف عدد الإغلاقات
  targetQuotations: int("targetQuotations").default(0), // هدف عروض السعر
  targetPresentations: int("targetPresentations").default(0), // هدف عدد العروض التقديمية
  target2D: int("target2D").default(0),          // هدف 2D Design
  target3D: int("target3D").default(0),          // هدف 3D Modeling
  targetRender: int("targetRender").default(0),  // هدف Render
  targetContract: int("targetContract").default(0),   // هدف إعداد العقود
  targetWorkOrder: int("targetWorkOrder").default(0), // هدف أوامر الشغل
  // ─── Auto Distribution Fields ─────────────────────────────────────────────
  isAutoDistributed: tinyint("isAutoDistributed").default(0), // 1 = auto, 0 = manual override
  distributionWeight: decimal("distributionWeight", { precision: 5, scale: 4 }).default("1.0000"), // وزن التوزيع
  targetLeads: int("targetLeads").default(0),          // هدف عدد العملاء المحتملين
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
  receiptUrl: text("receiptUrl"),                          // رابط إيصال الدفع
  nextPaymentDate: date("nextPaymentDate"),               // تاريخ الدفعة القادمة
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
  // Admin Sales Category System
  category: mysqlEnum("category", ["crm_data", "financial_collection", "operations", "reporting", "coordination", "meetings"]),
  kpiWeight: int("kpiWeight").default(0),  // weight percentage (0-100)
  kpiImpact: varchar("kpiImpact", { length: 100 }),  // e.g. 'Pipeline Accuracy', 'Cash Flow'
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
  // ─── 4 عناصر التقييم الجديدة (كل عنصر من 10) ────────────────────────────────────────────────────
  playbookUsageScore: int("playbookUsageScore").default(0).notNull(),         // Playbook Usage (من 10)
  presentationQualityScore: int("presentationQualityScore").default(0).notNull(), // Presentation Quality (من 10)
  controlScore: int("controlScore").default(0).notNull(),                    // Control of Meeting (من 10)
  closingAttemptScore: int("closingAttemptScore").default(0).notNull(),       // Closing Attempt (من 10)
  totalScore: int("totalScore").default(0).notNull(),                        // مجموع من 40 → يتحول %
  // ─── Decision Tag ────────────────────────────────────────────────────────────────────────────────
  decisionTag: mysqlEnum("decisionTag", ["strong", "needs_improvement", "weak"]).notNull().default("needs_improvement"),
  // ─── Mandatory Feedback ──────────────────────────────────────────────────────────────────────────
  strengthPoint: text("strengthPoint"),     // نقطة قوة واحدة (إجبارية)
  improvementPoint: text("improvementPoint"), // نقطة تحسين واحدة (إجبارية)
  comments: text("comments"),               // ملاحظات إضافية اختيارية
  // ─── Legacy fields (kept for backward compat) ────────────────────────────────────────────────────
  openingScore: int("openingScore").default(0).notNull(),
  understandingScore: int("understandingScore").default(0).notNull(),
  presentationScore: int("presentationScore").default(0).notNull(),
  objectionScore: int("objectionScore").default(0).notNull(),
  closingScore: int("closingScore").default(0).notNull(),
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

// ─── Audit Logs ───────────────────────────────────────────────────────────────
// سجل تدقيق لجميع عمليات الحذف في النظام
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["engineer", "task", "lead", "visit", "deal"]).notNull(),
  entityId: int("entityId").notNull(),
  entityName: varchar("entityName", { length: 255 }),         // اسم العنصر المحذوف
  action: mysqlEnum("action", ["soft_delete", "restore"]).notNull(),
  reason: mysqlEnum("reason", ["data_entry_error", "duplicate", "client_cancelled", "other"]).notNull(),
  reasonCustom: varchar("reasonCustom", { length: 255 }),     // سبب مخصص عند اختيار "other"
  performedBy: varchar("performedBy", { length: 120 }),       // اسم المستخدم الذي نفّذ العملية
  performedAt: timestamp("performedAt").defaultNow().notNull(),
  notes: text("notes"),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── Lead Daily Stats ─────────────────────────────────────────────────────────
// إدخال أرقام الـ Leads اليومية (بدلاً من إدخال كل Lead بالتفاصيل)
export const leadDailyStats = mysqlTable("lead_daily_stats", {
  id: int("id").autoincrement().primaryKey(),
  date: date("date").notNull(),                                // تاريخ اليوم
  totalLeads: int("totalLeads").notNull().default(0),          // إجمالي الـ Leads الواردة
  contacted: int("contacted").notNull().default(0),            // تم التواصل
  delayed: int("delayed").notNull().default(0),                // تأخير في الرد
  notContacted: int("notContacted").notNull().default(0),      // لم يتم التواصل
  qualified: int("qualified").notNull().default(0),            // مؤهلة (Qualified)
  converted: int("converted").notNull().default(0),            // تحولت لصفقة
  source: varchar("source", { length: 100 }),                  // مصدر الـ Leads (Facebook / Instagram / إلخ)
  notes: text("notes"),                                        // ملاحظات
  enteredBy: varchar("enteredBy", { length: 120 }),            // من أدخل البيانات
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LeadDailyStat = typeof leadDailyStats.$inferSelect;
export type InsertLeadDailyStat = typeof leadDailyStats.$inferInsert;

// ─── Work Logs (Work Distribution System) ─────────────────────────────────────
// يسجل المهندس أنشطته اليومية لحساب توزيع وقته
export const workLogs = mysqlTable("work_logs", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull(),
  logDate: date("logDate").notNull(),
  // نوع النشاط - 7 أنواع تُصنَّف في 4 فئات
  activityType: mysqlEnum("activityType", [
    "meeting_2d",         // Meeting 2D       → Meetings (50%)
    "meeting_quotation",  // Meeting Quotation → Meetings (50%)
    "meeting_3d",         // Meeting 3D        → Meetings (50%)
    "meeting_closing",    // Meeting Closing   → Meetings (50%)
    "design_3d",          // 3D Design         → 3D Design (30%)
    "design_2d",          // 2D Design         → 2D Design (10%)
    "quotation",          // Quotation         → Quotations (10%)
  ]).notNull(),
  durationMinutes: int("durationMinutes").notNull().default(60), // مدة النشاط بالدقائق
  clientName: varchar("clientName", { length: 255 }),            // اسم العميل (اختياري)
  notes: text("notes"),
  weekNumber: int("weekNumber").notNull(),  // رقم الأسبوع في السنة
  month: int("month").notNull(),
  year: int("year").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WorkLog = typeof workLogs.$inferSelect;
export type InsertWorkLog = typeof workLogs.$inferInsert;

// ─── Playbook Items ────────────────────────────────────────────────────────────────────────────────
// مكتبة العناصر المستخدمة في عروض البيع - يتم استيرادها من Excel أو إدخالها يدوياً
export const playbookItems = mysqlTable("playbook_items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),          // تصنيف العنصر
  code: varchar("code", { length: 100 }),                   // كود المنتج
  price: decimal("price", { precision: 14, scale: 2 }).default("0"),
  unit: varchar("unit", { length: 50 }).default("وحدة"),    // وحدة القياس
  description: text("description"),                         // وصف العنصر
  script: text("script"),                                   // Script جاهز للمهندس
  keyPoints: text("keyPoints"),                             // أهم نقاط البيع (JSON array)
  usageLocations: text("usageLocations"),                   // أماكن الاستخدام
  alternatives: text("alternatives"),                       // البدائل (JSON array)
  specData: text("specData"),                               // بيانات المواصفات (JSON object)
  imageUrls: text("imageUrls"),                             // روابط الصور (JSON array)
  videoUrl: varchar("videoUrl", { length: 500 }),           // رابط الفيديو
  renderUrl: varchar("renderUrl", { length: 500 }),         // رابط صورة الـ Render
  isActive: int("isActive").default(1).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlaybookItem = typeof playbookItems.$inferSelect;
export type InsertPlaybookItem = typeof playbookItems.$inferInsert;

// ─── Playbook Quotations ────────────────────────────────────────────────────────────────────────────────
// عروض الأسعار المرتبطة بالصفقات - تحتوي على Items المختارة
export const playbookQuotations = mysqlTable("playbook_quotations", {
  id: int("id").autoincrement().primaryKey(),
  dealId: int("dealId"),                                    // FK → deals.id (اختياري)
  engineerId: int("engineerId").notNull(),
  clientName: varchar("clientName", { length: 255 }),
  itemsJson: text("itemsJson").notNull(),                   // JSON array of { itemId, qty, price, notes }
  totalValue: decimal("totalValue", { precision: 14, scale: 2 }).default("0"),
  recordingLink: varchar("recordingLink", { length: 500 }), // رابط تسجيل الاجتماع
  presentationStartedAt: timestamp("presentationStartedAt"),
  presentationEndedAt: timestamp("presentationEndedAt"),
  status: mysqlEnum("status", ["draft", "presented", "accepted", "rejected"]).default("draft"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlaybookQuotation = typeof playbookQuotations.$inferSelect;
export type InsertPlaybookQuotation = typeof playbookQuotations.$inferInsert;

// ─── Meeting Sessions (Sales Execution Tracking) ────────────────────────────────────────────────────────
// تتبع كل جلسة اجتماع / عرض مبيعات
export const meetingSessions = mysqlTable("meeting_sessions", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull(),
  quotationId: int("quotationId"),                          // FK → playbook_quotations.id (اختياري)
  dealId: int("dealId"),                                    // FK → deals.id (اختياري)
  clientName: varchar("clientName", { length: 255 }),
  sessionType: mysqlEnum("sessionType", ["presentation", "closing", "follow_up"]).default("presentation"),
  startTime: timestamp("startTime").defaultNow().notNull(),
  endTime: timestamp("endTime"),
  durationMinutes: int("durationMinutes"),                  // يُحسب عند الإنهاء
  recordingLink: varchar("recordingLink", { length: 500 }),
  // Scoring
  totalScore: int("totalScore").default(0),                 // 0-100
  itemsViewed: int("itemsViewed").default(0),               // عدد Items تم عرضها بالكامل
  itemsTotal: int("itemsTotal").default(0),                 // إجمالي Items في العرض
  videosPlayed: int("videosPlayed").default(0),
  scriptsUsed: int("scriptsUsed").default(0),
  rendersViewed: int("rendersViewed").default(0),
  pricesViewed: int("pricesViewed").default(0),
  // Status
  status: mysqlEnum("status", ["active", "completed", "abandoned"]).default("active"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MeetingSession = typeof meetingSessions.$inferSelect;
export type InsertMeetingSession = typeof meetingSessions.$inferInsert;

// ─── Session Actions (تتبع كل إجراء داخل الجلسة) ────────────────────────────────────────────────────────
export const sessionActions = mysqlTable("session_actions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),                    // FK → meeting_sessions.id
  itemId: int("itemId"),                                    // FK → playbook_items.id (اختياري)
  actionType: mysqlEnum("actionType", [
    "item_opened",        // فتح العنصر
    "video_started",      // بدء تشغيل الفيديو
    "video_completed",    // إكمال الفيديو
    "render_viewed",      // مشاهدة الـ Render
    "script_opened",      // فتح الـ Script
    "script_read",        // قراءة الـ Script (بعد 10 ثواني)
    "price_viewed",       // فتح تفاصيل السعر
    "quotation_opened",   // فتح عرض السعر الكامل
    "item_completed",     // إكمال عرض العنصر بالكامل
    "item_skipped",       // تخطي العنصر
  ]).notNull(),
  durationSeconds: int("durationSeconds").default(0),       // مدة التفاعل بالثواني
  metadata: text("metadata"),                               // JSON بيانات إضافية
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
export type SessionAction = typeof sessionActions.$inferSelect;
export type InsertSessionAction = typeof sessionActions.$inferInsert;

// ─── Engineer Evaluations (Promotion & A/B/C Player System) ──────────────────
// تقييم شهري لكل مهندس بناءً على 5 عناصر أداء
// Career Path: Sales Engineer → Senior Sales Engineer → Sales Consultant
export const engineerEvaluations = mysqlTable("engineer_evaluations", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull(),
  // ─── الفترة الزمنية ────────────────────────────────────────────────────────
  evaluationMonth: int("evaluationMonth").notNull(),   // 1-12
  evaluationYear: int("evaluationYear").notNull(),     // e.g. 2026
  // ─── 5 عناصر التقييم (كل عنصر من 100) ────────────────────────────────────
  salesAchievementScore: int("salesAchievementScore").default(0).notNull(),  // نسبة تحقيق الهدف %
  closingRateScore: int("closingRateScore").default(0).notNull(),            // Closing Rate %
  meetingScore: int("meetingScore").default(0).notNull(),                    // متوسط Meeting Reviews %
  playbookUsageScore: int("playbookUsageScore").default(0).notNull(),        // Playbook Usage %
  taskDisciplineScore: int("taskDisciplineScore").default(0).notNull(),      // Task Discipline % (Meeting + Recording 100%)
  // ─── الدرجة الإجمالية والمستوى ────────────────────────────────────────────
  overallScore: int("overallScore").default(0).notNull(),                    // متوسط الـ 5 عناصر
  performanceLevel: mysqlEnum("performanceLevel", ["a_player", "b_player", "c_player"]).notNull().default("b_player"),
  // ─── Career Path Level ────────────────────────────────────────────────────
  careerLevel: mysqlEnum("careerLevel", [
    "sales_engineer",       // المستوى الأول
    "senior_sales_engineer",// المستوى الثاني
    "sales_consultant",     // المستوى الثالث
  ]).notNull().default("sales_engineer"),
  // ─── Promotion Eligibility ────────────────────────────────────────────────
  promotionEligible: boolean("promotionEligible").default(false).notNull(),
  promotionReadinessScore: int("promotionReadinessScore").default(0).notNull(), // % من متطلبات الترقية
  consecutiveMonthsMeetingTarget: int("consecutiveMonthsMeetingTarget").default(0).notNull(), // أشهر متتالية تحقق الهدف
  // ─── القرار الإداري ────────────────────────────────────────────────────────
  decisionAction: mysqlEnum("decisionAction", [
    "promote",          // A Player → ترقية
    "bonus",            // A Player → Bonus
    "coaching",         // B Player → Coaching إجباري
    "warning",          // C Player → Warning
    "improvement_plan", // C Player → Plan 30 يوم
    "firing_risk",      // شهرين C Player → قرار إداري
    "none",
  ]).notNull().default("none"),
  // ─── Firing Logic ─────────────────────────────────────────────────────────
  consecutiveCMonths: int("consecutiveCMonths").default(0).notNull(),        // عدد أشهر C Player متتالية
  firingDecisionTriggered: boolean("firingDecisionTriggered").default(false).notNull(),
  // ─── ملاحظات ──────────────────────────────────────────────────────────────
  coachingNotes: text("coachingNotes"),
  improvementPlan: text("improvementPlan"),
  reviewedBy: int("reviewedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EngineerEvaluation = typeof engineerEvaluations.$inferSelect;
export type InsertEngineerEvaluation = typeof engineerEvaluations.$inferInsert;

// ─── Engineer Career Level (الحالة الحالية للمهندس في Career Path) ──────────
export const engineerCareerLevels = mysqlTable("engineer_career_levels", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull().unique(),
  currentLevel: mysqlEnum("currentLevel", [
    "sales_engineer",
    "senior_sales_engineer",
    "sales_consultant",
  ]).notNull().default("sales_engineer"),
  levelStartDate: timestamp("levelStartDate").defaultNow().notNull(),
  // ─── Benefits per Level ───────────────────────────────────────────────────
  commissionMultiplier: decimal("commissionMultiplier", { precision: 4, scale: 2 }).default("1.00").notNull(), // 1.00 / 1.15 / 1.30
  maxDiscountPct: decimal("maxDiscountPct", { precision: 5, scale: 2 }).default("5.00").notNull(),  // 5% / 10% / 15%
  leadsAccessLevel: mysqlEnum("leadsAccessLevel", ["standard", "premium", "vip"]).notNull().default("standard"),
  // ─── Promotion History ────────────────────────────────────────────────────
  promotionHistory: text("promotionHistory"),  // JSON array of promotion events
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EngineerCareerLevel = typeof engineerCareerLevels.$inferSelect;
export type InsertEngineerCareerLevel = typeof engineerCareerLevels.$inferInsert;

// ─── Deal Timeline (Auto-logged from Tasks) ───────────────────────────────────
export const dealTimeline = mysqlTable("deal_timeline", {
  id: int("id").autoincrement().primaryKey(),
  dealId: int("dealId").notNull(),
  taskId: int("taskId"),
  engineerId: int("engineerId").notNull(),
  activityType: mysqlEnum("activityType", [
    "deal_created",     // صفقة جديدة
    "quotation",        // عرض سعر
    "meeting_modeling", // ميتينج نمذجة
    "meeting_presentation", // ميتينج عرض
    "meeting_closing",  // ميتينج إغلاق
    "stage_changed",    // تغيير المرحلة
    "note_added",       // ملاحظة
    "won",              // صفقة ناجحة
    "lost",             // صفقة خسارة
  ]).notNull(),
  description: text("description"),
  stageFrom: varchar("stageFrom", { length: 50 }),
  stageTo: varchar("stageTo", { length: 50 }),
  grossValue: decimal("grossValue", { precision: 14, scale: 2 }),
  netValue: decimal("netValue", { precision: 14, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DealTimeline = typeof dealTimeline.$inferSelect;
export type InsertDealTimeline = typeof dealTimeline.$inferInsert;

// ─── Deal Discount Allocations (توزيع الخصم على الصفقات) ──────────────────────
// يحدد الحد الأقصى للخصم المخصص لكل صفقة بناءً على نسبة قيمتها من إجمالي الصفقات
export const dealDiscountAllocations = mysqlTable("deal_discount_allocations", {
  id: int("id").autoincrement().primaryKey(),
  dealId: int("dealId").notNull(),
  engineerId: int("engineerId").notNull(),
  // قيمة الصفقة وقت التخصيص
  dealValue: decimal("dealValue", { precision: 14, scale: 2 }).notNull(),
  // الحد الأقصى المخصص لهذه الصفقة (نسبي من إجمالي الخصم المتاح)
  allocatedDiscountMax: decimal("allocatedDiscountMax", { precision: 14, scale: 2 }).notNull(),
  // نسبة هذه الصفقة من إجمالي الصفقات (0-100)
  allocationPct: decimal("allocationPct", { precision: 5, scale: 2 }).notNull(),
  // الخصم الفعلي المستخدم في هذه الصفقة
  usedDiscount: decimal("usedDiscount", { precision: 14, scale: 2 }).default("0").notNull(),
  // نوع الصفقة: pipeline أو closed
  dealType: mysqlEnum("dealType", ["pipeline", "closed"]).notNull().default("pipeline"),
  // هل تم إغلاق الصفقة بسبب السعر (يمنع المكافأة)
  lostDueToPricing: int("lostDueToPricing").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DealDiscountAllocation = typeof dealDiscountAllocations.$inferSelect;
export type InsertDealDiscountAllocation = typeof dealDiscountAllocations.$inferInsert;

// ─── Discount Bonus Cap (حد أقصى لمكافأة الخصم الشهرية) ──────────────────────
export const discountBonusCaps = mysqlTable("discount_bonus_caps", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  // الحد الأقصى للمكافأة الشهرية (يمكن تعديله من الإدارة)
  monthlyCap: decimal("monthlyCap", { precision: 14, scale: 2 }).default("15000").notNull(),
  // المكافأة المحتسبة هذا الشهر
  earnedBonus: decimal("earnedBonus", { precision: 14, scale: 2 }).default("0").notNull(),
  // هل تم دفع المكافأة
  isPaid: int("isPaid").default(0).notNull(),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DiscountBonusCap = typeof discountBonusCaps.$inferSelect;
export type InsertDiscountBonusCap = typeof discountBonusCaps.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════
// Company Goals (أهداف الشركة الشهرية)
// ═══════════════════════════════════════════════════════════════════════
export const companyGoals = mysqlTable("company_goals", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  // الهدف المالي الشهري
  revenueTarget: decimal("revenueTarget", { precision: 14, scale: 2 }).notNull(),
  // متوسط قيمة الصفقة المتوقعة
  avgDealValue: decimal("avgDealValue", { precision: 14, scale: 2 }).notNull(),
  // نسبة الإغلاق المستهدفة (0-100)
  closingRateTarget: decimal("closingRateTarget", { precision: 5, scale: 2 }).notNull().default("60"),
  // فترة الهدف
  periodFrom: date("periodFrom"),
  periodTo: date("periodTo"),
  // أهداف محسوبة تلقائياً (يمكن override يدوي)
  requiredDeals: int("requiredDeals"),        // عدد الصفقات المطلوبة
  requiredVisits: int("requiredVisits"),      // عدد المعاينات المطلوبة
  requiredPipelineValue: decimal("requiredPipelineValue", { precision: 14, scale: 2 }), // حجم Pipeline المطلوب
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompanyGoal = typeof companyGoals.$inferSelect;
export type InsertCompanyGoal = typeof companyGoals.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════
// Engineer Personal Goals (الأهداف الشخصية للمهندسين)
// ═══════════════════════════════════════════════════════════════════════
export const engineerPersonalGoals = mysqlTable("engineer_personal_goals", {
  id: int("id").autoincrement().primaryKey(),
  engineerId: int("engineerId").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  // الهدف الشخصي التطويري
  objective: varchar("objective", { length: 255 }).notNull(),
  // مجال التطوير
  developmentArea: mysqlEnum("developmentArea", [
    "closing", "negotiation", "render_quality", "presentation",
    "design_quality", "client_communication", "time_management", "other"
  ]).notNull().default("other"),
  // طريقة التقييم
  evaluationMethod: mysqlEnum("evaluationMethod", [
    "meeting_review", "design_review", "render_review", "manager_review", "self_review"
  ]).notNull().default("manager_review"),
  // المراجع
  reviewerRole: mysqlEnum("reviewerRole", ["admin", "manager"]).notNull().default("manager"),
  // الدرجة (0-100)
  score: int("score"),
  // ملاحظات المراجع
  reviewNotes: text("reviewNotes"),
  // تاريخ التقييم
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EngineerPersonalGoal = typeof engineerPersonalGoals.$inferSelect;
export type InsertEngineerPersonalGoal = typeof engineerPersonalGoals.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════
// Internal App Users (نظام المستخدمين الداخلي - مستقل عن Manus OAuth)
// ═══════════════════════════════════════════════════════════════════════
export const appUsers = mysqlTable("app_users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", [
    "sales_engineer",    // مهندس مبيعات
    "sales_specialist",  // أخصائي مبيعات
    "admin_sales",       // مدير مبيعات إداري
    "manager",           // مدير / CEO
  ]).notNull().default("sales_engineer"),
  // ربط بجدول engineers (اختياري - لربط المستخدم بمهندس موجود)
  engineerId: int("engineerId"),
  email: varchar("email", { length: 320 }),
  status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
  // آخر دخول
  lastLoginAt: timestamp("lastLoginAt"),
  // رمز إعادة تعيين كلمة المرور
  resetToken: varchar("resetToken", { length: 255 }),
  resetTokenExpiresAt: timestamp("resetTokenExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = typeof appUsers.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════
// User Permissions (صلاحيات المستخدمين لكل Module)
// ═══════════════════════════════════════════════════════════════════════
export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // اسم الـ Module
  module: mysqlEnum("module", [
    "crm",        // العملاء المحتملون (CRM / Leads)
    "visits",     // المعاينات
    "deals",      // الإغلاق والتفاوض
    "kpi",        // مؤشرات الأداء
    "planning",   // تخطيط الأهداف
    "discounts",  // الخصومات
    "reports",    // التقارير
    "tasks",      // المهام اليومية
    "collections",// التحصيل المالي
    "users",      // إدارة المستخدمين (Admin only)
  ]).notNull(),
  // صلاحيات CRUD
  canView: int("canView").default(1).notNull(),    // 1 = يمكن المشاهدة
  canAdd: int("canAdd").default(0).notNull(),      // 1 = يمكن الإضافة
  canEdit: int("canEdit").default(0).notNull(),    // 1 = يمكن التعديل
  canDelete: int("canDelete").default(0).notNull(),// 1 = يمكن الحذف
  // نطاق البيانات
  dataScope: mysqlEnum("dataScope", [
    "own",  // يرى بياناته فقط
    "all",  // يرى كل البيانات
  ]).notNull().default("own"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════
// Activity Logs (سجل العمليات)
// ═══════════════════════════════════════════════════════════════════════
export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // نوع العملية
  action: mysqlEnum("action", [
    "login",        // تسجيل دخول
    "logout",       // تسجيل خروج
    "create",       // إنشاء سجل
    "update",       // تعديل سجل
    "delete",       // حذف سجل
    "view",         // مشاهدة
    "export",       // تصدير
    "permission_change", // تغيير صلاحية
  ]).notNull(),
  // الـ Module المتأثر
  module: varchar("module", { length: 50 }),
  // معرف السجل المتأثر (اختياري)
  recordId: int("recordId"),
  // تفاصيل العملية (JSON)
  details: text("details"),
  // عنوان IP
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════
// Role Permissions (صلاحيات على مستوى الـ Role - Dynamic)
// ═══════════════════════════════════════════════════════════════════════
// هذا الجدول يخزن الصلاحيات الافتراضية لكل Role
// يمكن للـ Admin تعديلها في أي وقت من خلال Permission Control Panel
// ═══════════════════════════════════════════════════════════════════════
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  // اسم الـ Role
  role: varchar("role", { length: 64 }).notNull(),
  // اسم الـ Module
  module: varchar("module", { length: 64 }).notNull(),
  // صلاحيات CRUD
  canView: int("canView").default(0).notNull(),    // 1 = يمكن المشاهدة
  canAdd: int("canAdd").default(0).notNull(),      // 1 = يمكن الإضافة
  canEdit: int("canEdit").default(0).notNull(),    // 1 = يمكن التعديل
  canDelete: int("canDelete").default(0).notNull(),// 1 = يمكن الحذف
  // نطاق البيانات
  dataScope: mysqlEnum("dataScope", [
    "own",   // يرى بياناته فقط
    "team",  // يرى بيانات فريقه
    "all",   // يرى كل البيانات
  ]).notNull().default("own"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

// ─── Section Permissions (Granular Permissions per Section inside Module) ──────
export const sectionPermissions = mysqlTable("section_permissions", {
  id: int("id").autoincrement().primaryKey(),
  // اسم الـ Role
  role: varchar("role", { length: 64 }).notNull(),
  // اسم الـ Module
  module: varchar("module", { length: 64 }).notNull(),
  // اسم الـ Section داخل الـ Module
  section: varchar("section", { length: 128 }).notNull(),
  // مستوى الصلاحية
  // "all"  = يرى كل البيانات
  // "self" = يرى بياناته فقط
  // "hidden" = مخفي تماماً
  visibility: mysqlEnum("visibility", ["all", "self", "hidden"]).notNull().default("all"),
  // هل يمكن التعديل على هذا الـ Section
  canEdit: int("canEdit").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SectionPermission = typeof sectionPermissions.$inferSelect;
export type InsertSectionPermission = typeof sectionPermissions.$inferInsert;

// ─── Deal Tasks (Next Step → Task System) ────────────────────────────────────
export const dealTasks = mysqlTable("deal_tasks", {
  id: int("id").autoincrement().primaryKey(),
  dealId: int("dealId").notNull(),
  engineerId: int("engineerId").notNull(),
  // محتوى المهمة
  title: varchar("title", { length: 255 }).notNull(),          // الخطوة التالية
  description: text("description"),                             // ملاحظات إضافية
  // التواريخ
  dueDate: date("dueDate").notNull(),                          // تاريخ الاستحقاق
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  // الحالة
  // pending = لم تُنفَّذ بعد
  // done    = تم تنفيذها
  // overdue = تجاوزت تاريخ الاستحقاق
  status: mysqlEnum("status", ["pending", "done", "overdue"]).notNull().default("pending"),
  // عدد أيام التأخير (يُحسب تلقائياً)
  delayDays: int("delayDays").default(0).notNull(),
  // من أنشأ المهمة
  createdBy: varchar("createdBy", { length: 128 }),
  // اسم العميل (للعرض السريع)
  clientName: varchar("clientName", { length: 255 }),
  // الصفقة المرتبطة (للعرض السريع)
  dealStage: varchar("dealStage", { length: 64 }),
  // هل تم تسجيلها في Activity Timeline
  loggedToTimeline: int("loggedToTimeline").default(0).notNull(),
});
export type DealTask = typeof dealTasks.$inferSelect;
export type InsertDealTask = typeof dealTasks.$inferInsert;
