#!/usr/bin/env node
// Script to find Matthew Brown and upgrade his role to 'creator'
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { like, or } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);
const db = drizzle(conn);

// Dynamic import of schema
const { users } = await import('../drizzle/schema.ts');

// Find Matthew
const results = await db.select({
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  subscriptionTier: users.subscriptionTier,
}).from(users).where(
  or(
    like(users.name, '%Matthew%'),
    like(users.email, '%matthew%'),
    like(users.email, '%youkre8%')
  )
);

console.log('Found users:', JSON.stringify(results, null, 2));

await conn.end();
