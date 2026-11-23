import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { keyOf } from '@/lib/assetKey';
import { resolveKategori } from '@/lib/spip';
import { isDate, jakartaToday } from '@/lib/format';
import { SLUG_RE } from '@/lib/validate';

export const runtime = 'nodejs';

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const str = (v, n = 300) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

function cleanAsset(d) {
  const r = {
    distrik: str(d.distrik, 80),
    dept: str(d.dept, 80),
    jenis: str(d.jenis),
    detail_jenis: str(d.detail_jenis),
    lokasi: str(d.lokasi),
    kode_aset: str(d.kode_aset, 60),
    periode: str(d.periode, 40),
  };
  if (!r.jenis && !r.detail_jenis && !r.lokasi) return { error: 'Isi minimal Jenis, Detail jenis, atau Lokasi.' };
  r.kategori = resolveKategori(d.kategori, r.jenis, r.detail_jenis);
  for (const f of ['start_date', 'end_date', 'last_inspection']) {
    const v = str(d[f], 10);
    if (v && !isDate(v)) return { error: 'Format tanggal tidak valid.' };
    r[f] = v || null;
  }
  if (r.last_inspection && r.last_inspection > jakartaToday()) return { error: 'Tanggal inspeksi terakhir tidak boleh di masa depan.' };
  r.is_active = d.is_active !== false;
  r.is_plan = d.is_plan !== false;
  r.has_finding = !!r.last_inspection && !!d.has_finding;
  r.followed_up = r.has_finding && !!d.followed_up;
  return { r };
}

const DUP = 'Aset dengan Distrik, Kategori, Jenis, Detail jenis, Lokasi, dan Kode aset yang sama sudah ada. Beri kode aset yang berbeda.';

// Edit data langsung di aplikasi. Dilindungi middleware: hanya admin yang sudah login (/api/admin/*).
export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return bad('Data tidak terbaca.');

  const sql = db();

  if (body.action === 'save') {
    const { r, error } = cleanAsset(body.asset || {});
    if (error) return bad(error);
    const slug = body.slug ? String(body.slug) : '';

    try {
      if (!slug) {
        const rows = await sql`
          INSERT INTO assets (key_hash, distrik, dept, kategori, jenis, detail_jenis, lokasi, kode_aset, periode, start_date, end_date,
                              is_active, is_plan, first_inspection, last_inspection, has_finding, followed_up, import_batch)
          VALUES (${keyOf(r)}, ${r.distrik}, ${r.dept}, ${r.kategori}, ${r.jenis}, ${r.detail_jenis}, ${r.lokasi}, ${r.kode_aset}, ${r.periode},
                  ${r.start_date}::date, ${r.end_date}::date, ${r.is_active}, ${r.is_plan}, ${r.last_inspection}::date,
                  ${r.last_inspection}::date, ${r.has_finding}, ${r.followed_up}, 'manual')
          RETURNING slug`;
        return NextResponse.json({ ok: true, slug: rows[0].slug });
      }

      if (!SLUG_RE.test(slug)) return bad('Aset tidak valid.');
      const cur = await sql`SELECT key_hash FROM assets WHERE slug = ${slug}`;
      if (!cur[0]) return bad('Aset tidak ditemukan.', 404);
      const seq = parseInt((cur[0].key_hash.match(/#(\d+)$/) || [])[1], 10) || 1;
      await sql`
        UPDATE assets SET
          key_hash = ${keyOf(r, seq)}, distrik = ${r.distrik}, dept = ${r.dept}, kategori = ${r.kategori},
          jenis = ${r.jenis}, detail_jenis = ${r.detail_jenis}, lokasi = ${r.lokasi}, kode_aset = ${r.kode_aset}, periode = ${r.periode},
          start_date = ${r.start_date}::date, end_date = ${r.end_date}::date,
          is_active = ${r.is_active}, is_plan = ${r.is_plan},
          first_inspection = CASE WHEN ${r.last_inspection}::date IS NULL THEN NULL
                                  ELSE COALESCE(first_inspection, ${r.last_inspection}::date) END,
          last_inspection = ${r.last_inspection}::date,
          has_finding = ${r.has_finding}, followed_up = ${r.followed_up}, updated_at = now()
        WHERE slug = ${slug}`;
      return NextResponse.json({ ok: true, slug });
    } catch (e) {
      if (e && e.code === '23505') return bad(DUP, 409);
      throw e;
    }
  }

  if (body.action === 'delete') {
    const slug = String(body.slug || '');
    if (!SLUG_RE.test(slug)) return bad('Aset tidak valid.');
    await sql`DELETE FROM assets WHERE slug = ${slug}`;
    return NextResponse.json({ ok: true });
  }

  return bad('Aksi tidak dikenal.');
}
