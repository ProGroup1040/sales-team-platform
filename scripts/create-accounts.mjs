import { config } from "dotenv";
config();

import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";

const db = await createConnection(process.env.DATABASE_URL);

const accounts = [
  {
    name: "Pro Group Admin",
    username: "admin",
    password: "ProGroup@2025",
    role: "admin",
  },
  {
    name: "Admin Sales",
    username: "admin_sales",
    password: "AdminSales@2025",
    role: "admin_sales",
  },
];

try {
  for (const acc of accounts) {
    const passwordHash = await bcrypt.hash(acc.password, 12);

    // Check if username already exists
    const [rows] = await db.execute(
      "SELECT id, username FROM engineers WHERE username = ? LIMIT 1",
      [acc.username]
    );

    if (rows.length > 0) {
      // Update password
      await db.execute(
        "UPDATE engineers SET passwordHash = ?, name = ?, role = ?, status = 'active', isDeleted = 0 WHERE username = ?",
        [passwordHash, acc.name, acc.role, acc.username]
      );
      console.log(`✓ Updated account: ${acc.username} (role: ${acc.role})`);
    } else {
      // Insert new
      await db.execute(
        "INSERT INTO engineers (name, username, passwordHash, role, status, isDeleted, createdAt) VALUES (?, ?, ?, ?, 'active', 0, NOW())",
        [acc.name, acc.username, passwordHash, acc.role]
      );
      console.log(`✓ Created account: ${acc.username} (role: ${acc.role})`);
    }
  }

  console.log("\n=== Accounts Created ===");
  for (const acc of accounts) {
    console.log(`Username: ${acc.username} | Password: ${acc.password} | Role: ${acc.role}`);
  }
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
} finally {
  await db.end();
}
