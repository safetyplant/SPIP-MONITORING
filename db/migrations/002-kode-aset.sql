-- Menambah kolom Kode aset / kode unit / kode alat. Aman dijalankan berulang.
-- Aplikasi juga menjalankan perintah ini otomatis saat server mulai (instrumentation.js).
ALTER TABLE assets ADD COLUMN IF NOT EXISTS kode_aset TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS assets_kode_idx ON assets (kode_aset);
