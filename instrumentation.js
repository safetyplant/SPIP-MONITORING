// Dijalankan sekali saat server Next.js mulai. Memastikan kolom baru ada di database lama,
// sehingga pembaruan aplikasi tidak gagal bila migrasi SQL lupa dijalankan.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.DATABASE_URL) return;
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    await sql.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS kode_aset TEXT NOT NULL DEFAULT ''");
    await sql.query('CREATE INDEX IF NOT EXISTS assets_kode_idx ON assets (kode_aset)');
  } catch (e) {
    console.error('Migrasi otomatis gagal (jalankan db/migrations/002-kode-aset.sql manual):', e && e.message);
  }
}
