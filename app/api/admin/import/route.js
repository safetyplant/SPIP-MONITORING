import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { keyOf } from '@/lib/assetKey';
import { db } from '@/lib/db';
import { resolveKategori } from '@/lib/spip';
import { isDate } from '@/lib/format';

export const runtime = 'nodejs';
export const maxDuration = 60;

const str = (v, n = 300) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const dt = (v) => (isDate(v) ? v : '');
const BATCH_RE = /^[0-9a-f-]{36}$/;

// Aturan saat baris sudah ada: data master selalu diperbarui, data inspeksi hanya dimajukan
// bila tanggal inspeksi di file sama atau lebih baru dari yang ada di database.
const NEWER = '(EXCLUDED.last_inspection IS NOT NULL AND (assets.last_inspection IS NULL OR EXCLUDED.last_inspection >= assets.last_inspection))';

const UPSERT = `
INSERT INTO assets (key_hash, distrik, dept, kategori, jenis, detail_jenis, lokasi, kode_aset, periode,
                    start_date, end_date, is_active, is_plan, first_inspection, last_inspection,
                    has_finding, followed_up, import_batch)
SELECT x.key_hash, x.distrik, x.dept, x.kategori, x.jenis, x.detail_jenis, x.lokasi, COALESCE(x.kode_aset, ''), x.periode,
       NULLIF(x.start_date, '')::date, NULLIF(x.end_date, '')::date, x.is_active, x.is_plan,
       NULLIF(x.first_inspection, '')::date, NULLIF(x.last_inspection, '')::date,
       x.has_finding, x.followed_up, $2::text
  FROM jsonb_to_recordset($1::jsonb) AS x(
       key_hash text, distrik text, dept text, kategori text, jenis text, detail_jenis text, lokasi text, kode_aset text,
       periode text, start_date text, end_date text, is_active boolean, is_plan boolean,
       first_inspection text, last_inspection text, has_finding boolean, followed_up boolean)
ON CONFLICT (key_hash) DO UPDATE SET
  dept = EXCLUDED.dept,
  kategori = EXCLUDED.kategori,
  jenis = EXCLUDED.jenis,
  detail_jenis = EXCLUDED.detail_jenis,
  lokasi = EXCLUDED.lokasi,
  kode_aset = EXCLUDED.kode_aset,
  periode = EXCLUDED.periode,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_active = EXCLUDED.is_active,
  is_plan = EXCLUDED.is_plan,
  first_inspection = CASE
    WHEN EXCLUDED.first_inspection IS NULL THEN assets.first_inspection
    WHEN assets.first_inspection IS NULL THEN EXCLUDED.first_inspection
    ELSE LEAST(EXCLUDED.first_inspection, assets.first_inspection) END,
  has_finding = CASE WHEN ${NEWER} THEN EXCLUDED.has_finding ELSE assets.has_finding END,
  followed_up = CASE WHEN ${NEWER} THEN EXCLUDED.followed_up ELSE assets.followed_up END,
  last_inspection = GREATEST(EXCLUDED.last_inspection, assets.last_inspection),
  import_batch = EXCLUDED.import_batch,
  updated_at = now()`;

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// Impor bertahap: start (buat batch) -> rows (maks 500 baris per panggilan) -> finish (mode replace menonaktifkan aset yang tidak ada di file).
export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return bad('Data tidak terbaca.');
  const sql = db();

  if (body.action === 'start') return NextResponse.json({ batch: randomUUID() });

  if (!BATCH_RE.test(String(body.batch || ''))) return bad('Batch impor tidak valid.');

  if (body.action === 'rows') {
    const input = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
    const map = new Map();
    for (const raw of input) {
      const r = {
        distrik: str(raw.distrik, 80),
        dept: str(raw.dept, 80),
        jenis: str(raw.jenis),
        detail_jenis: str(raw.detail_jenis),
        lokasi: str(raw.lokasi),
        kode_aset: str(raw.kode_aset, 60),
        periode: str(raw.periode, 40),
      };
      if (!r.jenis && !r.detail_jenis && !r.lokasi) continue;
      r.kategori = resolveKategori(raw.kategori, r.jenis, r.detail_jenis);
      const seq = Math.max(1, parseInt(raw.seq, 10) || 1);
      const lastInsp = dt(raw.last_inspection);
      map.set(keyOf(r, seq), {
        key_hash: keyOf(r, seq),
        ...r,
        start_date: dt(raw.start_date),
        end_date: dt(raw.end_date),
        is_active: raw.is_active !== false,
        is_plan: raw.is_plan !== false,
        first_inspection: dt(raw.first_inspection) || lastInsp,
        last_inspection: lastInsp,
        has_finding: !!lastInsp && !!raw.has_finding,
        followed_up: !!lastInsp && !!raw.has_finding && !!raw.followed_up,
      });
    }
    const payload = Array.from(map.values());
    if (payload.length) await sql.query(UPSERT, [JSON.stringify(payload), body.batch]);
    return NextResponse.json({ ok: true, count: payload.length });
  }

  if (body.action === 'finish') {
    let deactivated = 0;
    if (body.mode === 'replace') {
      const res = await sql.query(
        'UPDATE assets SET is_active = false, updated_at = now() WHERE is_active AND import_batch IS DISTINCT FROM $1 RETURNING id',
        [body.batch]
      );
      deactivated = res.length;
    }
    const total = await sql`SELECT COUNT(*)::int AS n FROM assets WHERE is_active`;
    return NextResponse.json({ ok: true, deactivated, active: total[0].n });
  }

  return bad('Aksi tidak dikenal.');
}
