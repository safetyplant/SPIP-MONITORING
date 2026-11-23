import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { templateFor, publicTemplates } from '@/lib/checklists';
import { resolveKategori, KATEGORI } from '@/lib/spip';
import { jakartaToday, addDays } from '@/lib/format';
import { SLUG_RE } from '@/lib/validate';
import Checklist from './Checklist';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

async function loadAsset(slug) {
  if (!SLUG_RE.test(slug)) return null;
  const rows = await db()`
    SELECT id, slug, distrik, dept, kategori, jenis, detail_jenis, lokasi, periode, is_active,
           last_inspection::text AS last_inspection, has_finding, followed_up
      FROM assets WHERE slug = ${slug}`;
  return rows[0] || null;
}

export async function generateMetadata({ params }) {
  const a = await loadAsset(params.slug);
  return { title: a ? `${a.detail_jenis || a.jenis} · ${a.lokasi || a.distrik}` : 'Aset tidak ditemukan' };
}

export default async function Page({ params }) {
  const asset = await loadAsset(params.slug);
  if (!asset) notFound();

  const sql = db();
  const [history, last] = await Promise.all([
    sql`SELECT inspected_on::text AS date, result FROM inspections
         WHERE asset_id = ${asset.id} AND kind = 'inspeksi'
         ORDER BY inspected_on DESC, id DESC LIMIT 3`,
    asset.has_finding && !asset.followed_up
      ? sql`SELECT items, inspected_on::text AS date FROM inspections
             WHERE asset_id = ${asset.id} AND kind = 'inspeksi'
             ORDER BY inspected_on DESC, id DESC LIMIT 1`
      : Promise.resolve([]),
  ]);

  const kategori = resolveKategori(asset.kategori, asset.jenis, asset.detail_jenis);
  const kat = KATEGORI[kategori];
  const tpl = templateFor(asset);
  const findings =
    last[0] && Array.isArray(last[0].items)
      ? last[0].items.filter((x) => x.r === 'tem').map((x) => ({ q: x.q, n: x.n }))
      : [];
  const today = jakartaToday();

  return (
    <Checklist
      asset={{
        slug: asset.slug,
        distrik: asset.distrik,
        dept: asset.dept,
        jenis: asset.jenis,
        detail: asset.detail_jenis,
        lokasi: asset.lokasi,
        periode: asset.periode,
        last: asset.last_inspection,
        active: asset.is_active,
      }}
      kat={{ key: kat.key, label: kat.label, short: kat.short, desc: kat.desc }}
      tplKey={tpl.k}
      templates={publicTemplates()}
      history={history}
      findings={findings}
      hasOpenFinding={asset.has_finding && !asset.followed_up}
      today={today}
      minDate={addDays(today, -90)}
    />
  );
}
