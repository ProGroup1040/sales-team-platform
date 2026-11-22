# ProGroup WhatsApp CRM Integration

## Google Apps Script
1. Open the spreadsheet and choose Extensions → Apps Script (or script.google.com).
2. Create a script file and paste ProGroupWhatsAppCrm.gs from this folder.
3. In Project Settings → Script Properties, add WHATSAPP_CRM_WEBHOOK_SECRET. Use the same random secret as the Sales Platform server environment variable. At least 32 characters; never commit it.
4. Run installProGroupCrmTrigger once and approve Spreadsheet + external request permissions.
5. Run syncExistingProGroupCrm once for the initial import.
6. Edit a contact row and inspect Apps Script → Executions.

## Important real-time note
Installable onEdit covers edits made by people in Sheets. Google Sheets API writes made by n8n do not trigger onEdit. Therefore, after the WhatsApp workflow appends/updates a row, n8n must also POST that contact to https://salespro.bezaverse.com/api/integrations/whatsapp-crm/sync with Authorization: Bearer <same secret> and JSON body { records: [{ contact, phone, whatsapp_id, username, name, last_message, last_seen }] }.

## Data rules
Identity match is exact WhatsApp ID first, then normalized phone. Never merge by name. LID is stored separately from phone. Qualification fields map from Leads: client_name, client_email, client_phone, client_address, client_payment, client_day, kitchen_size, kitchen_model.

## Rollout
Set WHATSAPP_CRM_WEBHOOK_SECRET in the Sales Platform container environment, restart the app, apply migration 0081 on staging first, verify the CRM and task picker, then deploy through the normal release process. Do not run the migration on production before backup and staging validation.