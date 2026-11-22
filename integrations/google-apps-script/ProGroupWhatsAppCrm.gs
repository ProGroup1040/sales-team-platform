/**
 * ProGroup WhatsApp CRM -> Sales Platform
 *
 * Authoritative source: the "ProGroup WhatsApp Leads" tab only.
 * This script never reads or writes any other worksheet.
 *
 * Setup / reinitialization:
 *   1. Set WHATSAPP_CRM_WEBHOOK_SECRET in Apps Script > Project Settings > Script properties.
 *   2. Run resetProGroupCrmIntegration() once and approve Google permissions.
 *   3. Run syncExistingProGroupCrm() once for the initial idempotent import.
 *
 * n8n writes through the Google Sheets API do not fire onEdit. The n8n
 * workflow must call the same webhook after it upserts a contact.
 */

const PROGROUP_CRM_CONFIG = Object.freeze({
  spreadsheetId: "1h2_sSDo7St11s3DN5qgYcI8mKXKYDZgVBYcdcte936M",
  sheetName: "ProGroup WhatsApp Leads",
  endpoint: "https://salespro.bezaverse.com/api/integrations/whatsapp-crm/sync",
  secretProperty: "WHATSAPP_CRM_WEBHOOK_SECRET",
  batchSize: 100,
  triggerHandler: "onProGroupCrmEdit"
});

const PROGROUP_CRM_FIELDS = Object.freeze({
  whatsappContact: ["contact", "whatsappcontact", "contactid", "جهة الاتصال", "معرف جهة الاتصال"],
  phone: ["phone", "phonenumber", "clientphone", "mobile", "mobilenumber", "رقم الهاتف", "رقم التليفون", "الموبايل", "الهاتف"],
  whatsappId: ["whatsappid", "whatsapplid", "whatsappidlid", "lid", "whatsapp_id", "معرف واتساب", "معرف الواتساب", "الليد"],
  whatsappUsername: ["username", "whatsappusername", "اسم المستخدم", "يوزر"],
  name: ["name", "contactname", "customername", "clientname", "fullname", "الاسم", "اسم العميل", "اسم جهة الاتصال"],
  email: ["email", "clientemail", "mail", "البريد الإلكتروني", "الايميل"],
  lastMessage: ["lastmessage", "message", "lasttext", "آخر رسالة", "اخر رسالة", "الرسالة الأخيرة"],
  lastSeen: ["lastseen", "lastmessagedate", "آخر ظهور", "اخر ظهور", "تاريخ آخر رسالة"],
  clientAddress: ["clientaddress", "address", "location", "العنوان", "الموقع"],
  clientPayment: ["clientpayment", "payment", "paymentmethod", "طريقة الدفع", "الدفع"],
  clientDay: ["clientday", "day", "preferredday", "اليوم المناسب", "اليوم"],
  kitchenSize: ["kitchensize", "kitchenspace", "space", "مساحة المطبخ", "مساحة المطبخ بالمتر"],
  kitchenModel: ["kitchenmodel", "model", "kitchentype", "موديل المطبخ", "نوع المطبخ"]
});

/**
 * Safe reset: validates the approved sheet and webhook, removes only this
 * integration's old triggers, then installs exactly one edit trigger.
 * It does not import contacts or delete CRM data.
 */
function resetProGroupCrmIntegration() {
  const sheet = getApprovedCrmSheet_();
  assertSecret_();
  const probe = postRecords_([]);
  if (probe.success !== true || probe.received !== 0) {
    throw new Error("Webhook readiness check returned an unexpected response.");
  }

  ScriptApp.getProjectTriggers()
    .filter(function (trigger) {
      return trigger.getHandlerFunction() === PROGROUP_CRM_CONFIG.triggerHandler;
    })
    .forEach(function (trigger) {
      ScriptApp.deleteTrigger(trigger);
    });

  ScriptApp.newTrigger(PROGROUP_CRM_CONFIG.triggerHandler)
    .forSpreadsheet(sheet.getParent())
    .onEdit()
    .create();

  Logger.log("CRM integration reset successfully. One edit trigger is installed; no contacts were imported.");
}

/** Optional connectivity check; sends an empty batch and changes no CRM rows. */
function testProGroupCrmConnection() {
  assertSecret_();
  const result = postRecords_([]);
  Logger.log("Webhook connection OK: " + JSON.stringify(result));
  return result;
}

/** Installable edit-trigger handler. Syncs only edited data rows. */
function onProGroupCrmEdit(event) {
  if (!event || !event.range) return;

  const sheet = event.range.getSheet();
  if (sheet.getName() !== PROGROUP_CRM_CONFIG.sheetName ||
      sheet.getParent().getId() !== PROGROUP_CRM_CONFIG.spreadsheetId) return;

  const firstRow = Math.max(2, event.range.getRow());
  const lastRow = event.range.getLastRow();
  if (firstRow > lastRow) return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error("Another CRM sync is running. Retry the edit or run the sync manually.");
  }

  try {
    const records = readContactRows_(sheet, firstRow, lastRow);
    if (records.length) {
      const result = postRecords_(records);
      Logger.log("Edited rows sync: " + JSON.stringify(result));
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * One-time / repeatable full sync. Safe to rerun: the API upserts by WhatsApp
 * ID first and normalized phone second; it never deletes leads.
 */
function syncExistingProGroupCrm() {
  const sheet = getApprovedCrmSheet_();
  assertSecret_();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error("Another CRM sync is running. Wait for it to finish, then retry.");
  }

  try {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      Logger.log("The approved CRM sheet contains no contact rows.");
      return { submitted: 0, batches: 0 };
    }

    const records = readContactRows_(sheet, 2, lastRow);
    let submitted = 0;
    let batches = 0;

    for (let offset = 0; offset < records.length; offset += PROGROUP_CRM_CONFIG.batchSize) {
      const batch = records.slice(offset, offset + PROGROUP_CRM_CONFIG.batchSize);
      const result = postRecords_(batch);
      submitted += result.received;
      batches += 1;
      Logger.log("CRM import batch " + batches + ": " + JSON.stringify(result));
    }

    const summary = { submitted: submitted, batches: batches };
    Logger.log("CRM initial sync completed: " + JSON.stringify(summary));
    return summary;
  } finally {
    lock.releaseLock();
  }
}

/** Read a contiguous row range, resolving columns by normalized header names. */
function readContactRows_(sheet, firstRow, lastRow) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) throw new Error("The approved CRM sheet has no header row.");

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const columnMap = buildColumnMap_(headers);
  const values = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, lastColumn).getValues();
  const records = [];

  values.forEach(function (row) {
    const record = {};
    Object.keys(PROGROUP_CRM_FIELDS).forEach(function (field) {
      const index = columnMap[field];
      record[field] = index === undefined ? null : cleanValue_(row[index], field);
    });
    if (hasIdentity_(record)) records.push(record);
  });

  return records;
}

function buildColumnMap_(headers) {
  const normalizedHeaders = headers.map(normalizeHeader_);
  const map = {};

  Object.keys(PROGROUP_CRM_FIELDS).forEach(function (field) {
    const aliases = PROGROUP_CRM_FIELDS[field].map(normalizeHeader_);
    const index = normalizedHeaders.findIndex(function (header) {
      return aliases.indexOf(header) !== -1;
    });
    if (index !== -1) map[field] = index;
  });

  if (map.phone === undefined && map.whatsappId === undefined &&
      map.whatsappContact === undefined) {
    throw new Error("No supported identity column was found. Check the CRM sheet headers (Phone, WhatsApp ID/LID, or Contact).");
  }
  return map;
}

function normalizeHeader_(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_\-().:/]+/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]/g, "");
}

function cleanValue_(value, field) {
  if (value === "" || value === null || value === undefined) return null;
  if (field === "lastSeen" && value instanceof Date) return value.toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function hasIdentity_(record) {
  return Boolean(record.whatsappId || record.whatsappContact || record.phone);
}

function getApprovedCrmSheet_() {
  const spreadsheet = SpreadsheetApp.openById(PROGROUP_CRM_CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(PROGROUP_CRM_CONFIG.sheetName);
  if (!sheet) {
    throw new Error('Approved CRM tab "' + PROGROUP_CRM_CONFIG.sheetName + '" was not found. No other tab will be used.');
  }
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) throw new Error("The approved CRM sheet has no header row.");
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  buildColumnMap_(headers);
  return sheet;
}

function assertSecret_() {
  const secret = PropertiesService.getScriptProperties()
    .getProperty(PROGROUP_CRM_CONFIG.secretProperty);
  if (!secret || secret.length < 32) {
    throw new Error("Set " + PROGROUP_CRM_CONFIG.secretProperty +
      " in Project Settings > Script properties (minimum 32 characters).");
  }
  return secret;
}

function postRecords_(records) {
  const secret = assertSecret_();
  const response = UrlFetchApp.fetch(PROGROUP_CRM_CONFIG.endpoint, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + secret },
    payload: JSON.stringify({ records: records || [] }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = response.getContentText();
  let result;
  try {
    result = JSON.parse(body);
  } catch (error) {
    throw new Error("Webhook returned non-JSON. HTTP " + status + ".");
  }

  if (status !== 200 || result.success !== true ||
      (Array.isArray(result.errors) && result.errors.length > 0)) {
    throw new Error("CRM sync failed. HTTP " + status + ": " + body);
  }
  return result;
}
