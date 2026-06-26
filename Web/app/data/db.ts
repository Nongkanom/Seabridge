import { Pool } from '@/node_modules/@types/pg';

const globalForPool = globalThis as unknown as { pool: Pool };

export const pool = globalForPool.pool || new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

if (process.env.NODE_ENV !== 'production') globalForPool.pool = pool;