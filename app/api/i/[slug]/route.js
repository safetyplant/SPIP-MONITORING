import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTemplate } from '@/lib/checklists';
import { addDays, isDate, jakartaToday } from '@/lib/format';
import { NRP_RE, SLUG_RE, cleanNrp, cleanText } from '@/lib/validate';

export const runtime = 'nodejs';

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// Menyimpan hasil checklist untuk satu aset (diakses lewat link/QR aset).
export async function POST(req, { params }) {
  if (!SLUG_RE.test(params.slug)) return bad('Link tidak valid.', 404);
  const body = await req.json().catch(() => null);
  if (!body) return bad('Data tidak terbaca.');

  const nrp = cleanNrp(body.nrp);
  const name = cleanText(body.name, 80);
  const notes = cleanText(body.notes, 500);
  const date = String(body.date || '');
  if (!NRP_RE.test(nrp)) return bad('NRP tidak valid. Gunakan 4 sampai 15 huruf atau angka.');
  if (name.length < 2) return bad('Nama pemeriksa wajib diisi.');

  const today = jakartaToday();
  if (!isDate(date) || date > today || date < addDays(today, -90)) {
    return bad('Tanggal inspeksi harus hari ini atau maksimal 90 hari ke belakang.');
  }

  const tpl = getTemplate(body.tpl);
  if (!tpl) return bad('Jenis checklist tidak dikenal.');
  if (!Array.isArray(body.items) || body.items.length !== tpl.q.length) return bad('Jumlah poin checklist tidak sesuai.');

  const items = [];
  for (let i = 0; i < tpl.q.length; i++) {
    const it = body.items[i] || {};
    if (!['ok', 'tem', 'na'].includes(it.r)) return bad(`Poin ${i + 1} belum dijawab.`);
    const n = cleanText(it.n, 500);
    if (it.r === 'tem' && n.length < 3) return bad(`Jelaskan temuan pada poin ${i + 1}.`);
    items.push({ q: tpl.q[i], r: it.r, n: it.r === 'tem' ? n : '' });
  }
  const temuan = items.filter((x) => x.r === 'tem').length;
  const hasil = temuan ? 'temuan' : 'sesuai';

  const sql = db();
  const rows = await sql`SELECT id, is_active FROM assets WHERE slug = ${params.slug}`;
  const asset = rows[0];
  if (!asset) return bad('Aset tidak ditemukan.', 404);
  if (!asset.is_active) return bad('Aset ini tidak aktif.', 409);

  // Cegah kiriman ganda akibat dobel klik.
  const dup = await sql`SELECT 1 FROM inspections
    WHERE asset_id = ${asset.id} AND nrp = ${nrp} AND kind = 'inspeksi' AND created_at > now() - interval '30 seconds'`;
  if (dup.length) return bad('Inspeksi yang sama baru saja tersimpan.', 429);

  await sql.transaction([
    sql`INSERT INTO inspections (asset_id, kind, inspected_on, nrp, inspector_name, template_key, result, items, notes)
        VALUES (${asset.id}, 'inspeksi', ${date}::date, ${nrp}, ${name}, ${tpl.k}, ${hasil}, ${JSON.stringify(items)}::jsonb, ${notes})`,
    sql`UPDATE assets SET
          first_inspection = LEAST(COALESCE(first_inspection, ${date}::date), ${date}::date),
          has_finding = CASE WHEN last_inspection IS NULL OR ${date}::date >= last_inspection THEN ${temuan > 0} ELSE has_finding END,
          followed_up = CASE WHEN last_inspection IS NULL OR ${date}::date >= last_inspection THEN false ELSE followed_up END,
          last_inspection = GREATEST(COALESCE(last_inspection, ${date}::date), ${date}::date),
          updated_at = now()
        WHERE id = ${asset.id}`,
  ]);

  return NextResponse.json({ ok: true, hasil, temuan });
}
