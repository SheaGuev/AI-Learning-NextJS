import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env' });

// Check for database URL
if (!process.env.DATABASE_URL) {
  console.error('🔴 CRITICAL ERROR: No database URL found in environment variables');
  throw new Error('DATABASE_URL environment variable is required');
}

// Global variable to store the persistent database connection
let dbInstance: ReturnType<typeof drizzle> | null = null;

// Create a singleton function to get or create the database connection
function getDbInstance() {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    console.log('🟢 Creating new database connection pool');
    
    // Create a connection pool with appropriate settings
    const client = postgres(process.env.DATABASE_URL as string, { 
      prepare: false,
      max: 10, // Maximum number of connections in the pool
      idle_timeout: 30,  // How long a connection can be idle before being closed
    });
    
    // Use schema for type-safe queries
    dbInstance = drizzle(client, { schema });
    console.log('🟢 Database connection pool initialized successfully');
    
    return dbInstance;
  } catch (error) {
    console.error('🔴 FATAL: Failed to initialize database connection:', error);
    throw error;
  }
}

// Get a reference to the database
const db = getDbInstance();

export default db;