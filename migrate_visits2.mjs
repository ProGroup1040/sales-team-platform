import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// First update existing NULL/old values to 'pending' before changing enum
await conn.execute(`UPDATE visits SET quality = 'pending' WHERE quality IS NULL OR quality NOT IN ('successful','with_issues','design_rejected','repeated','pending')`);
await conn.execute(`ALTER TABLE visits MODIFY COLUMN quality ENUM('successful','with_issues','design_rejected','repeated','pending') NOT NULL DEFAULT 'pending'`);

await conn.end();
console.log("✅ Quality enum migration complete!");
