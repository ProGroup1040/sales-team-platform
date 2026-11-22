/**
 * ProGroup WhatsApp CRM -> Sales Platform
 * Source of truth for the current CRM rollout: "ProGroup WhatsApp Leads" only.
 *
 * Installable onEdit triggers cover manual edits in Google Sheets.
 * n8n/API writes do not fire onEdit; the WhatsApp workflow must call the same
 * platform endpoint after it upserts a contact in this sheet.
 */
const CONFIG = Object.freeze({
  spreadsheetId: "1h2_sSDo7St11s3DN5qgYcI8mKXKYDZgVBYcdcte936M",
  sheetName: "ProGroup WhatsApp Leads",
  endpoint: "https://salespro.bezaverse.com/api/integrations/whatsapp-crm/sync",
  secretProperty: "WHATSAPP_CRM_WEBHOOK_SECRET"
});

function installProGroupCrmTrigger() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error('Sheet "' + CONFIG.sheetName + '" was not found.');

  // Avoid duplicate installable triggers for this handler.
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === "onProGroupCrmEdit")
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("onProGroupCrmEdit")
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();

  Logger.log('Installed edit trigger for "' + CONFIG.sheetName + '".');
}

/** Trigger handler: sync only edited data rows from the approved CRM sheet. */
function onProGroupCrmEdit(event) {
  if (!event || !event.range) return;

  const sheet = event.range.getSheet();
  if (sheet.getName() !== CONFIG.sheetName) return;

  const firstDataRow = Math.max(2, event.range.getRow());
  const lastDataRow = event.range.getLastRow();
  if (firstDataRow > lastDataRow) return;

  const records = [];
  for (let rowNumber = firstDataRow; rowNumber <= lastDataRow; rowNumber++) {
    const record = readContactRow_(sheet, rowNumber);
    if (hasIdentity_(record)) records.push(record);
  }
  postRecords_(records);
}

/** One-time initial import from the approved CRM sheet only. */
function syncExistingProGroupCrm() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error('Sheet "' + CONFIG.sheetName + '" was not found.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("No contact rows to sync.");
    return;
  }

  const records = [];
  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    const record = readContactRow_(sheet, rowNumber);
    if (hasIdentity_(record)) records.push(record);
  }

  // Small batches avoid request-size limits and make failures easier to retry.
  for (let index = 0; index < records.length; index += 100) {
    postRecords_(records.slice(index, index + 100));
  }
  Logger.log("Submitted " + records.length + " contact records from " + CONFIG.sheetName + ".");
}

/**
 * Header matching is case/spacing/punctuation insensitive.
 * Aliases support common header variants without reading another worksheet.
 */
function readContactRow_(sheet, rowNumber) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) throw new Error("The CRM sheet has no header row.");

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const values = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  const row = {};
  headers.forEach((header, index) => {
    const key = normalizeHeader_(header);
    if (key) row[key] = values[index];
  });

  return {
    whatsappContact: value_(row, ["contact", "whatsappcontact", "contactid"]),
    phone: value_(row, ["phone", "phonenumber", "mobile", "mobilenumber"]),
    whatsappId: value_(row, ["whatsappid", "whatsapp_id", "lid", "whatsapplid"]),
    whatsappUsername: value_(row, ["username", "whatsappusername"]),
    name: value_(row, ["name", "contactname", "customername", "fullname"]),
    lastMessage: value_(row, ["lastmessage", "last_message", "message", "lasttext"]),
    lastSeen: dateValue_(value_(row, ["lastseen", "last_seen", "lastmessagedate"])),
    source: value_(row, ["source", "leadsource"]) || "WhatsApp"
  };
}

function normalizeHeader_(header) {
  return String(header || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function value_(row, aliases) {
  for (const alias of aliases) {
    const key = normalizeHeader_(alias);
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key];
      return value === "" || value === null || value === undefined ? null : value;
    }
  }
  return null;
}

function dateValue_(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function hasIdentity_(record) {
  return Boolean(record.whatsappId || record.whatsappContact || record.phone);
}

function postRecords_(records) {
  if (!records || records.length === 0) return;

  const secret = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.secretProperty);
  if (!secret || secret.length < 32) {
    throw new Error("Set Script Property " + CONFIG.secretProperty + " (minimum 32 characters) before syncing.");
  }

  const response = UrlFetchApp.fetch(CONFIG.endpoint, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + secret },
    payload: JSON.stringify({ records: records }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = response.getContentText();
  if (status < 200 || status >= 300) {
    throw new Error("Sales Platform CRM sync failed. HTTP " + status + ": " + body);
  }
  Logger.log(body);
}
