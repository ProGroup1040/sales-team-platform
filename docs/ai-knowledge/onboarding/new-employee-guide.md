# New Employee Guide

## 1. Platform
The platform is a React/Vite frontend backed by Express/tRPC and MySQL/Drizzle. You use modules rather than editing database records directly.

## 2. Identity and roles
You sign in through an OAuth or local/app-user path. Your role and linked engineer record determine what you can see and do. A system account may exist without an engineer link, but daily-task ownership requires one.

## 3. Main modules
Use Leads for prospects, Visits for consultations, Closing for deals, Collections for payments, KPI/Reports for performance, Daily Tasks for planned work, and Project Timeline for post-sale delivery.

## 4. Daily tasks
Select a date, open the add dialog, choose a title/type/priority, and save. A regular linked user creates a task for themselves; privileged users may create for an engineer within their scope. Status values include planned, completed, delayed, not_done, and client_delay.

## 5. Performance
KPI pages aggregate operational and sales data through backend helpers. A displayed number must be explained by its source query and filters; not every organizational formula is documented.

## 6. Safety
Do not share credentials. Treat UI permissions as a guide; backend procedures are the security boundary. Report mismatched counts, deleted records still visible, or financial discrepancies with the date, module, record ID, and screenshot/log.

## 7. What is not yet documented
Production policy, complete KPI formulas, timezone rules, data retention, and some ownership relationships require confirmation from system owners.
