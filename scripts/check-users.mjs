import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const [rows] = await connection.execute(
  'SELECT id, name, email, provider, providerId, role, subscriptionTier, createdAt FROM users'
);

console.log('=== USERS TABLE ===');
console.log(JSON.stringify(rows, null, 2));

// Also check if there are any config or settings tables
const [tables] = await connection.execute('SHOW TABLES');
console.log('\n=== ALL TABLES ===');
console.log(JSON.stringify(tables, null, 2));

await connection.end();
