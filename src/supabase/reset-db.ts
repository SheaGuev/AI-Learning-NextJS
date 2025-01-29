import db from "./db"; // Import your Drizzle database instance

async function resetDatabase() {
    try {
      console.log("Resetting database...");
      
      await db.execute(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
      
      console.log("Database reset successfully.");
    } catch (error) {
      console.error("Error resetting database:", error);
    } finally {
      process.exit();
    }
  }
  
  resetDatabase();