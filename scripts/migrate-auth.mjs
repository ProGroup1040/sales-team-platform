import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const db = await createConnection(process.env.DATABASE_URL);

try {
  console.log("Applying migration: add username & passwordHash to engineers...");
  
  // Check if columns already exist
  const [cols] = await db.execute(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'engineers' 
    AND COLUMN_NAME IN ('username', 'passwordHash')
  `);
  
  const existing = cols.map(c => c.COLUMN_NAME);
  
  if (!existing.includes('username')) {
    await db.execute("ALTER TABLE `engineers` ADD `username` varchar(64)");
    console.log("✓ Added username column");
  } else {
    console.log("- username column already exists");
  }
  
  if (!existing.includes('passwordHash')) {
    await db.execute("ALTER TABLE `engineers` ADD `passwordHash` varchar(255)");
    console.log("✓ Added passwordHash column");
  } else {
    console.log("- passwordHash column already exists");
  }
  
  // Add unique constraint if not exists
  try {
    await db.execute("ALTER TABLE `engineers` ADD CONSTRAINT `engineers_username_unique` UNIQUE(`username`)");
    console.log("✓ Added unique constraint on username");
  } catch (e) {
    if (e.message.includes('Duplicate') || e.message.includes('already exists')) {
      console.log("- unique constraint already exists");
    } else {
      throw e;
    }
  }
  
  console.log("Migration completed successfully!");
} catch (err) {
  console.error("Migration error:", err.message);
  process.exit(1);
} finally {
  await db.end();
}
