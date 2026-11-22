# ProGroup WhatsApp CRM Integration

## Approved source of truth

For this rollout, **only** the Google Sheets tab named `ProGroup WhatsApp Leads` is the CRM source of truth.

- Spreadsheet ID: `1h2_sSDo7St11s3DN5qgYcI8mKXKYDZgVBYcdcte936M`
- Approved tab: `ProGroup WhatsApp Leads`
- Webhook: `https://salespro.bezaverse.com/api/integrations/whatsapp-crm/sync`

The `Leads` tab and all other tabs are intentionally ignored. The script checks both spreadsheet ID and tab name before syncing.

## Clean reinitialization procedure

1. Open the approved spreadsheet and choose **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with the complete `ProGroupWhatsAppCrm.gs` file from this folder, then save.
3. In **Project Settings → Script Properties**, set:
   - Property: `WHATSAPP_CRM_WEBHOOK_SECRET`
   - Value: the same secret configured as the server's `WHATSAPP_CRM_WEBHOOK_SECRET` environment variable.
   - Never put the secret in source code, a cell, or a log.
4. Run `testProGroupCrmConnection` once. It sends an empty batch, creates/updates no leads, and must return `success: true`.
5. Run `resetProGroupCrmIntegration` once and approve the requested Google permissions. This removes only old triggers for `onProGroupCrmEdit`, validates the approved sheet and endpoint, then installs exactly one edit trigger. It does **not** import contacts or delete CRM data.
6. Run `syncExistingProGroupCrm` once for the initial import. It reads only the approved tab, skips rows without a WhatsApp ID/LID, Contact, or phone, and submits idempotent batches of 100.
7. Inspect **Apps Script → Executions** and verify the final submitted count and each batch result.
8. Edit one known test contact row and confirm a successful trigger execution and the corresponding lead in the platform.

## Re-running / reset behavior

- `resetProGroupCrmIntegration` is safe to run again; it replaces duplicate triggers owned by this integration only.
- `syncExistingProGroupCrm` is safe to rerun because the API upserts by exact WhatsApp ID first, then normalized phone. It does not delete leads.
- Do not delete or clear CRM rows to "reset" the integration. A reinitialization is a trigger/configuration reset plus an idempotent resync.
- If a batch fails, the function stops with an error. Review the execution log and rerun the full sync after fixing the cause; already-synced rows are upserts.

## Real-time behavior

- The installable `onEdit` trigger syncs manual edits to data rows in the approved tab.
- Google Sheets API writes performed by n8n do **not** fire Apps Script `onEdit`. The n8n workflow must POST the upserted contact to the same webhook after it writes the sheet row.
- Avoid circular sync: platform-originated updates must not be re-emitted as new WhatsApp events.

## Identity and data rules

- WhatsApp ID/LID is a distinct identifier from phone. Never treat a LID as a phone number.
- The API matches exact WhatsApp ID first, then normalized phone, and will not merge contacts by name alone.
- The script never uses a name as an identity key.
- Blank spreadsheet cells are sent as null; the current API intentionally does not overwrite stored values with blank/null input.
- The API sets new records to its normal social-media lead defaults; the script does not set assignment, ownership, or permissions.

## Required release checks before running the initial import

Do not run `syncExistingProGroupCrm` against production until all of these are confirmed:

- The platform webhook is deployed and returns HTTP 200 for an authorized empty-batch request.
- The production secret matches the Apps Script Script Property (without exposing either value).
- The database migration for WhatsApp CRM columns and unique identity indexes is applied.
- The CRM picker is deployed and its own/all scope behavior is verified with real signed-in accounts.
- A small, approved test batch has been validated before the full initial import.

## n8n webhook payload

After n8n successfully upserts a row in the approved tab, send:

```json
{
  "records": [
    {
      "whatsappId": "exact-whatsapp-id-or-lid",
      "whatsappContact": "contact-reference",
      "phone": "+201000000000",
      "name": "Contact name",
      "lastMessage": "Latest message",
      "lastSeen": "2026-11-22T10:00:00.000Z"
    }
  ]
}
```

Use the same `Authorization: Bearer <secret>` header. Maximum API batch size is 500; this Apps Script intentionally uses batches of 100.
