import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jakartaToday } from '@/lib/format';
import { NRP_RE, SLUG_RE, cleanNrp, cleanText } from '@/lib/validate';

export const runtime = 'nodejs';

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// Mencatat tindak lanjut atas temuan terakhir sebuah aset.
export async function POST(req, { params }) {
  if (!SLUG_RE.test(params.slug)) return bad('Link tidak valid.', 404);
  const body = await req.json().catch(() => null);
  if (!body) return bad('Data tidak terbaca.');

  const nrp = cleanNrp(body.nrp);
  const name = cleanText(body.name, 80);
  const note = cleanText(body.note, 500);
  if (!NRP_RE.test(nrp)) return bad('NRP tidak valid. Gunakan 4 sampai 15 huruf atau angka.');
  if (name.length < 2) return bad('Nama pemeriksa wajib diisi.');
  if (note.length < 5) return bad('Jelaskan tindakan perbaikan yang sudah dilakukan.');

  const sql = db();
  const rows = await sql`SELECT id, has_finding, followed_up FROM assets WHERE slug = ${params.slug}`;
  const asset = rows[0];
  if (!asset) return bad('Aset tidak ditemukan.', 404);
  if (!asset.has_finding || asset.followed_up) return bad('Tidak ada temuan yang menunggu tindak lanjut.', 409);

  await sql.transaction([
    sql`INSERT INTO inspections (asset_id, kind, inspected_on, nrp, inspector_name, result, items, notes)
        VALUES (${asset.id}, 'followup', ${jakartaToday()}::date, ${nrp}, ${name}, 'followup', '[]'::jsonb, ${note})`,
    sql`UPDATE assets SET followed_up = true, updated_at = now() WHERE id = ${asset.id}`,
  ]);

  return NextResponse.json({ ok: true });
}
