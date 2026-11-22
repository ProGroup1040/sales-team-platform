# ProGroup WhatsApp CRM Integration

## Approved source of truth

For the current rollout, **only** the Google Sheets tab named `ProGroup WhatsApp Leads` is the CRM source of truth.

Spreadsheet ID: `1h2_sSDo7St11s3DN5qgYcI8mKXKYDZgVBYcdcte936M`

The `Leads` tab and all other tabs are intentionally ignored. Do not add them to this Apps Script trigger or initial import unless the CRM owner explicitly changes this decision.

## Apps Script setup

1. Open the spreadsheet and choose **Extensions → Apps Script**, or create a project at https://script.google.com.
2. Paste the complete contents of `ProGroupWhatsAppCrm.gs` into `Code.gs` and save.
3. In **Project Settings → Script Properties**, add:
   - Property: `WHATSAPP_CRM_WEBHOOK_SECRET`
   - Value: the same random secret configured as the Sales Platform server environment variable.
4. Run `installProGroupCrmTrigger` once and approve the requested Google permissions.
5. Do not run the initial import until the platform endpoint is deployed and verified.
6. After endpoint verification, run `syncExistingProGroupCrm` once.
7. Edit a contact row and inspect **Apps Script → Executions**.

## Real-time behavior

- Installable `onEdit` syncs manual edits to the approved sheet.
- Google Sheets API writes performed by n8n do **not** trigger `onEdit`. The WhatsApp n8n workflow must POST the upserted contact to the same endpoint after it writes the sheet row.
- Avoid creating a circular loop: platform-to-Sheets updates must not be sent back as new WhatsApp events.

## Identity rules

Use WhatsApp ID/LID as a distinct identifier from phone. Never treat a LID as a phone number. Match exact WhatsApp ID first, then normalized phone. Never merge contacts by name alone.

## Rollout safety

Do not run the initial import or enable triggers until the server endpoint, authentication secret, database migration, and task CRM search have been deployed and verified in a non-production/staging environment.