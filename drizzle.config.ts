import type { Config } from 'drizzle-kit';
import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  console.log('🔴 Cannot find database url');
}

export default {
  schema: './src/supabase/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
} satisfies Config;


// export default defineConfig({
//   schema: './src/supabase/schema.ts',
//   out: './migrations',
//   dialect: "postgresql",
//   dbCredentials: {
//     connectionString: process.env.DATABASE_URL || '',
//   }
// });

