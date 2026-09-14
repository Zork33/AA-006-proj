import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://leads_user:leads_password@localhost:5432/leads_db';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
