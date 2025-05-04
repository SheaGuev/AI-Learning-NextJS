require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Create a pool for database connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function findExistingUserId(client) {
  try {
    const userQuery = 'SELECT id FROM users LIMIT 1';
    const userResult = await client.query(userQuery);
    
    if (userResult.rows.length > 0) {
      return userResult.rows[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding existing user:', error);
    return null;
  }
}

async function testDatabase() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('Testing database connection and knowledgeItems table...');
    
    // Test basic connection
    const testQuery = 'SELECT NOW() as time';
    const testResult = await client.query(testQuery);
    console.log('Database connection successful, server time:', testResult.rows[0].time);
    
    // Find an existing user to use for testing
    const existingUserId = await findExistingUserId(client);
    
    if (existingUserId) {
      console.log('Found existing user ID for testing:', existingUserId);
    } else {
      console.warn('No existing users found in the database - cannot test insertion');
    }
    
    // Check if the knowledge_items table exists and its structure
    const tableStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'knowledge_items'
      ORDER BY ordinal_position;
    `;
    
    const tableResult = await client.query(tableStructureQuery);
    
    if (tableResult.rows.length === 0) {
      console.error('knowledge_items table not found!');
    } else {
      console.log('knowledge_items table structure:');
      tableResult.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
      });
    }
    
    // Attempt a simple INSERT and DELETE to test write permissions
    if (existingUserId) {
      try {
        // Generate a proper UUID
        const testId = uuidv4();
        
        console.log('Attempting to insert with test ID:', testId);
        console.log('Using existing user ID:', existingUserId);
        
        const insertQuery = `
          INSERT INTO knowledge_items (
            id, created_at, updated_at, user_id, type, 
            content, tags, review_count, ease_factor, interval, performance
          ) VALUES (
            $1, NOW(), NOW(), $2, 'test', 
            $3, ARRAY[]::text[], 0, 250, 1, 0
          )
          RETURNING id;
        `;
        
        const insertResult = await client.query(insertQuery, [
          testId,
          existingUserId,
          JSON.stringify({test: 'content'})
        ]);
        
        console.log('Test insertion successful:', insertResult.rows[0]);
        
        // Delete the test record
        const deleteQuery = `DELETE FROM knowledge_items WHERE id = $1`;
        await client.query(deleteQuery, [testId]);
        console.log('Test deletion successful');
      } catch (writeError) {
        console.error('Error testing write operations:', writeError);
        // Detailed error information
        if (writeError.code) {
          console.error(`PostgreSQL Error Code: ${writeError.code}`);
          console.error(`PostgreSQL Error Detail: ${writeError.detail}`);
          console.error(`PostgreSQL Error Constraint: ${writeError.constraint}`);
        }
      }
    }
    
    // Rollback the transaction to clean up any remaining test data
    await client.query('ROLLBACK');
    console.log('Database test completed');
    
  } catch (error) {
    // Roll back the transaction in case of an error
    await client.query('ROLLBACK');
    console.error('Database test failed:', error);
    if (error.code) {
      console.error(`PostgreSQL Error Code: ${error.code}`);
      console.error(`PostgreSQL Error Detail: ${error.detail}`);
    }
  } finally {
    // Release the client back to the pool
    client.release();
    pool.end();
  }
}

// Run the test
testDatabase(); 
