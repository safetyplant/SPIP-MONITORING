import Link from 'next/link';
import KatBadge from '@/components/KatBadge';
import { db } from '@/lib/db';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const metadata = { title: 'Temuan' };

export default async function Page() {
  const rows = await db()`
    SELECT a.slug, a.kode_aset, a.distrik, a.kategori, a.jenis, a.detail_jenis, a.lokasi,
           a.last_inspection::text AS last_inspection, i.inspector_name, i.nrp, i.items
      FROM assets a
      LEFT JOIN LATERAL (
        SELECT inspector_name, nrp, items FROM inspections
         WHERE asset_id = a.id AND kind = 'inspeksi'
         ORDER BY inspected_on DESC, id DESC LIMIT 1
      ) i ON true
     WHERE a.is_active AND a.has_finding AND NOT a.followed_up
     ORDER BY a.last_inspection DESC NULLS LAST
     LIMIT 100`;

  return (
    <>
      <div className="page-h">
        <h1>Temuan menunggu tindak lanjut</h1>
        <p className="muted">{rows.length} aset. Buka link aset untuk mencatat tindakan perbaikan.</p>
      </div>
      {!rows.length && <div className="card empty"><p className="muted">Tidak ada temuan yang menunggu follow up.</p></div>}
      <div className="stack">
        {rows.map((r) => {
          const items = Array.isArray(r.items) ? r.items.filter((x) => x.r === 'tem') : [];
          return (
            <article className="card" key={r.slug}>
              <div className="row spread">
                <div>
                  <KatBadge kategori={r.kategori} />
                  <h3 className="mt">{r.kode_aset ? `${r.kode_aset} · ` : ''}{r.detail_jenis || r.jenis}</h3>
                  <p className="muted small">{r.lokasi} · {r.distrik} · inspeksi {fmtDate(r.last_inspection)} oleh {r.inspector_name} ({r.nrp})</p>
                </div>
                <Link className="btn primary" href={`/i/${r.slug}`} target="_blank">Buka link aset</Link>
              </div>
              {items.length > 0 && (
                <ul className="finding-list">
                  {items.map((x, i) => (
                    <li key={i}><b>{x.q}</b><span>{x.n || 'Tanpa keterangan'}</span></li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
