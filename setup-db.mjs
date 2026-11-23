// Membuat tabel di Neon. Jalankan: npm run db:setup  (membaca DATABASE_URL dari .env.local)
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL belum diatur. Isi di .env.local lalu ulangi.');
  process.exit(1);
}

const sql = neon(url);
const text = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
const statements = text
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

for (const st of statements) {
  await sql.query(st);
}
console.log(`Selesai. ${statements.length} perintah SQL dijalankan.`);
