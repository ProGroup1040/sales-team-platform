import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { syncWhatsAppLead, type WhatsAppLeadSyncInput } from "../db";

function isAuthorized(req: Request): boolean {
  const expected = process.env.WHATSAPP_CRM_WEBHOOK_SECRET ?? "";
  if (expected.length < 32) return false;
  const bearer = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const supplied = req.header("x-crm-webhook-secret") ?? bearer ?? "";
  const left = Buffer.from(expected), right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

function mapRecord(value: unknown): WhatsAppLeadSyncInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const pick = (...keys: string[]) => { for (const key of keys) { const v = row[key]; if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim(); } return null; };
  return { whatsappId: pick("whatsappId", "whatsapp_id"), whatsappUsername: pick("whatsappUsername", "username"), whatsappContact: pick("whatsappContact", "contact"), name: pick("name", "client_name"), phone: pick("phone", "client_phone"), email: pick("email", "client_email"), lastMessage: pick("lastMessage", "last_message"), lastSeen: pick("lastSeen", "last_seen"), clientAddress: pick("clientAddress", "client_address"), clientPayment: pick("clientPayment", "client_payment"), clientDay: pick("clientDay", "client_day"), kitchenSize: pick("kitchenSize", "kitchen_size"), kitchenModel: pick("kitchenModel", "kitchen_model") };
}

export function registerWhatsAppCrmWebhook(app: Express): void {
  app.post("/api/integrations/whatsapp-crm/sync", async (req: Request, res: Response) => {
    if (!isAuthorized(req)) return res.status(401).json({ error: "Unauthorized integration request" });
    const body = req.body as Record<string, unknown>;
    const rows: unknown[] = Array.isArray(body?.records) ? body.records : Array.isArray(body?.contacts) ? body.contacts : [body];
    if (rows.length > 500) return res.status(413).json({ error: "Maximum batch size is 500 records" });
    let created = 0, updated = 0;
    const errors: Array<{ index: number; message: string }> = [];
    for (let i = 0; i < rows.length; i++) {
      const input = mapRecord(rows[i]);
      if (!input) { errors.push({ index: i, message: "Invalid record" }); continue; }
      try { const result = await syncWhatsAppLead(input); if (result.action === "created") created++; else updated++; }
      catch (error) { errors.push({ index: i, message: error instanceof Error ? error.message : "Sync failed" }); }
    }
    return res.status(errors.length ? 207 : 200).json({ success: errors.length === 0, received: rows.length, created, updated, errors });
  });
}