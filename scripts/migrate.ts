import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "../db/client";
// const migrationClient = db; // Not needed, using db directly

async function runMigrations() {
  console.log("Running migrations...");
  
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    // await migrationClient.end(); // Using db directly, no separate client
  }
}

runMigrations();
