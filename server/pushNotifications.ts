import crypto from "node:crypto";
import webpush from "web-push";
import { and, eq, sql } from "drizzle-orm";
import { appUsers, dailyTasks, notificationDeliveries, pushSubscriptions } from "../drizzle/schema";
import { getDb } from "./db";

const REMINDER_KIND = "daily_tasks_missing";
const CAIRO_TIME_ZONE = "Africa/Cairo";
const REMINDER_HOUR = 9;
const REMINDER_MINUTE_START = 30;
const REMINDER_MINUTE_END = 34;

function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com";
  return publicKey && privateKey ? { publicKey, privateKey, subject } : null;
}

function configureWebPush() {
  const config = vapidConfig();
  if (!config) return null;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return config;
}

function endpointHash(endpoint: string) {
  return crypto.createHash("sha256").update(endpoint).digest("hex");
}

function cairoNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function getWebPushPublicKey() {
  return vapidConfig()?.publicKey ?? null;
}

export async function savePushSubscription(userId: number, input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const endpoint = input.endpoint.trim();
  if (!endpoint || !input.keys?.p256dh || !input.keys?.auth) throw new Error("Invalid push subscription");
  await db.insert(pushSubscriptions).values({
    userId,
    endpoint,
    endpointHash: endpointHash(endpoint),
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    userAgent: input.userAgent?.slice(0, 512) ?? null,
    lastUsedAt: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent?.slice(0, 512) ?? null,
      lastUsedAt: new Date(),
    },
  });
  return { success: true };
}

export async function removePushSubscription(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) return { success: false };
  await db.delete(pushSubscriptions).where(and(
    eq(pushSubscriptions.userId, userId),
    eq(pushSubscriptions.endpointHash, endpointHash(endpoint)),
  ));
  return { success: true };
}

async function claimReminder(db: Awaited<ReturnType<typeof getDb>>, userId: number, date: string) {
  if (!db) return false;
  try {
    await db.insert(notificationDeliveries).values({
      userId,
      kind: REMINDER_KIND,
      deliveryDate: new Date(`${date}T00:00:00.000Z`),
    });
    return true;
  } catch {
    // Unique(userId, kind, deliveryDate) makes retries and multiple instances safe.
    return false;
  }
}

async function sendToSubscription(subscription: typeof pushSubscriptions.$inferSelect, payload: string) {
  try {
    await webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, payload, { TTL: 3600 });
    return true;
  } catch (error: any) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      const db = await getDb();
      if (db) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
    }
    console.warn(`[WebPush] failed for subscription ${subscription.id}:`, error?.statusCode ?? error?.message ?? error);
    return false;
  }
}

export async function sendDailyTaskRemindersNow() {
  const config = configureWebPush();
  const db = await getDb();
  if (!config || !db) return { skipped: true, reason: !config ? "missing_vapid_config" : "database_unavailable", sent: 0 };

  const now = cairoNow();
  // Sunday–Thursday and Saturday are workdays. Friday is the only weekend day.
  if (now.weekday === "Fri") return { skipped: true, reason: "friday", sent: 0 };
  if (now.hour !== REMINDER_HOUR || now.minute < REMINDER_MINUTE_START || now.minute > REMINDER_MINUTE_END) {
    return { skipped: true, reason: "outside_reminder_window", sent: 0 };
  }

  const users = await db.select({ id: appUsers.id, engineerId: appUsers.engineerId })
    .from(appUsers)
    .where(and(eq(appUsers.status, "active"), sql`${appUsers.engineerId} IS NOT NULL`));
  let sent = 0;
  const payload = JSON.stringify({
    title: "تذكير المهام اليومية",
    body: "لم يتم إدخال مهام اليوم بعد. من فضلك أدخل مهامك اليومية.",
    url: "/tasks",
    tag: `daily-tasks-${now.date}`,
  });

  for (const user of users) {
    const tasks = await db.select({ id: dailyTasks.id }).from(dailyTasks).where(and(
      eq(dailyTasks.engineerId, user.engineerId!),
      eq(dailyTasks.isDeleted, 0),
      eq(dailyTasks.taskDate, sql`${now.date}`),
    )).limit(1);
    const subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id));
    if (tasks.length > 0 || subscriptions.length === 0 || !(await claimReminder(db, user.id, now.date))) continue;
    for (const subscription of subscriptions) {
      if (await sendToSubscription(subscription, payload)) sent += 1;
    }
  }
  return { skipped: false, sent, date: now.date };
}

export function startDailyTaskReminderScheduler() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await sendDailyTaskRemindersNow(); } finally { running = false; }
  };
  void tick();
  const timer = setInterval(() => void tick(), 60_000);
  timer.unref?.();
  console.log("[WebPush] Daily task reminder scheduler started (Cairo, 09:30, Friday excluded)");
  return timer;
}
