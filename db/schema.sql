-- Skema database SPIP Monitor (Neon / PostgreSQL)
-- Jalankan sekali: tempel di Neon SQL Editor, atau jalankan `npm run db:setup`.

CREATE TABLE IF NOT EXISTS assets (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  key_hash TEXT NOT NULL UNIQUE,
  distrik TEXT NOT NULL DEFAULT '',
  dept TEXT NOT NULL DEFAULT '',
  kategori TEXT NOT NULL DEFAULT '',
  jenis TEXT NOT NULL DEFAULT '',
  detail_jenis TEXT NOT NULL DEFAULT '',
  lokasi TEXT NOT NULL DEFAULT '',
  kode_aset TEXT NOT NULL DEFAULT '',
  periode TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_plan BOOLEAN NOT NULL DEFAULT TRUE,
  first_inspection DATE,
  last_inspection DATE,
  has_finding BOOLEAN NOT NULL DEFAULT FALSE,
  followed_up BOOLEAN NOT NULL DEFAULT FALSE,
  import_batch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assets_filter_idx ON assets (is_active, is_plan, kategori, jenis);

CREATE INDEX IF NOT EXISTS assets_last_idx ON assets (last_inspection);

CREATE TABLE IF NOT EXISTS inspections (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'inspeksi',
  inspected_on DATE NOT NULL,
  nrp TEXT NOT NULL,
  inspector_name TEXT NOT NULL,
  template_key TEXT,
  result TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inspections_asset_idx ON inspections (asset_id, inspected_on DESC);

CREATE INDEX IF NOT EXISTS inspections_nrp_idx ON inspections (nrp);

-- Kode aset / kode unit / kode alat (untuk database lama yang dibuat sebelum kolom ini ada)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS kode_aset TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS assets_kode_idx ON assets (kode_aset);
