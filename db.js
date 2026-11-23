import { neon } from '@neondatabase/serverless';

let client;

// Mengembalikan klien Neon (HTTP, cocok untuk serverless di Vercel).
// Pemakaian: const sql = db();  await sql`SELECT 1`  atau  await sql.query('SELECT $1', [x])
export function db() {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL belum diatur. Lihat README.');
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}
