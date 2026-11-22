/** ProGroup CRM sync. Installable onEdit trigger for manual sheet edits. */
const CFG = { spreadsheetId: "1h2_sSDo7St11s3DN5qgYcI8mKXKYDZgVBYcdcte936M", endpoint: "https://salespro.bezaverse.com/api/integrations/whatsapp-crm/sync", contactsSheet: "ProGroup WhatsApp Leads", qualificationSheet: "Leads", secretProperty: "WHATSAPP_CRM_WEBHOOK_SECRET" };
function installProGroupCrmTrigger() {
  const ss = SpreadsheetApp.openById(CFG.spreadsheetId);
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "onProGroupCrmEdit").forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("onProGroupCrmEdit").forSpreadsheet(ss).onEdit().create();
  Logger.log("Installed trigger for " + ss.getName());
}
function onProGroupCrmEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet(), name = sheet.getName();
  if (name !== CFG.contactsSheet && name !== CFG.qualificationSheet) return;
  const rows = [];
  for (let r = Math.max(2, e.range.getRow()); r <= e.range.getLastRow(); r++) {
    const row = rowObject_(sheet, r);
    rows.push(name === CFG.contactsSheet ? { whatsappId: row.whatsapp_id, whatsappUsername: row.username, whatsappContact: row.contact, phone: row.phone, name: row.name, lastMessage: row.last_message, lastSeen: iso_(row.last_seen) } : { name: row.client_name, email: row.client_email, phone: row.client_phone, clientAddress: row.client_address, clientPayment: row.client_payment, clientDay: row.client_day, kitchenSize: row.kitchen_size, kitchenModel: row.kitchen_model });
  }
  post_(rows);
}
function syncExistingProGroupCrm() {
  const ss = SpreadsheetApp.openById(CFG.spreadsheetId);
  const rows = readObjects_(ss.getSheetByName(CFG.contactsSheet)).map(r => ({ whatsappId: r.whatsapp_id, whatsappUsername: r.username, whatsappContact: r.contact, phone: r.phone, name: r.name, lastMessage: r.last_message, lastSeen: iso_(r.last_seen) }));
  const qualified = readObjects_(ss.getSheetByName(CFG.qualificationSheet)).map(r => ({ name: r.client_name, email: r.client_email, phone: r.client_phone, clientAddress: r.client_address, clientPayment: r.client_payment, clientDay: r.client_day, kitchenSize: r.kitchen_size, kitchenModel: r.kitchen_model }));
  const all = rows.concat(qualified).filter(r => r.whatsappId || r.phone);
  for (let i = 0; i < all.length; i += 100) post_(all.slice(i, i + 100));
  Logger.log("Submitted " + all.length + " CRM rows");
}
function readObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues(), headers = values[0].map(v => String(v).trim());
  return values.slice(1).filter(row => row.some(v => v !== "" && v !== null)).map(row => headers.reduce((o, h, i) => (o[h] = iso_(row[i]), o), {}));
}
function rowObject_(sheet, row) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(v => String(v).trim());
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.reduce((o, h, i) => (o[h] = iso_(values[i]), o), {});
}
function iso_(v) { return v instanceof Date ? v.toISOString() : (v === "" || v === undefined ? null : v); }
function post_(records) {
  if (!records.length) return;
  const secret = PropertiesService.getScriptProperties().getProperty(CFG.secretProperty);
  if (!secret || secret.length < 32) throw new Error("Set Script Property " + CFG.secretProperty + " first.");
  const response = UrlFetchApp.fetch(CFG.endpoint, { method: "post", contentType: "application/json", headers: { Authorization: "Bearer " + secret }, payload: JSON.stringify({ records: records }), muteHttpExceptions: true });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error("CRM sync failed (" + code + "): " + response.getContentText());
  Logger.log(response.getContentText());
}